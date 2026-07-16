const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Attendance = require('../models/Attendance');
const { sendRegistrationEmail, sendApprovalEmail } = require('../utils/email');
const crypto = require('crypto');

// @desc    Get all events (public / with filters)
// @route   GET /api/events
// @access  Public
const getEvents = async (req, res, next) => {
  try {
    const now = new Date();

    // 1. Auto-close completed/past events
    if (typeof Event.updateMany === 'function') {
      await Event.updateMany(
        { status: { $in: ['Approved', 'Upcoming'] }, dateTime: { $lt: now } },
        { status: 'Closed' }
      );
    }

    // 2. Determine caller role by inspecting JWT (if present)
    const jwt = require('jsonwebtoken');
    const User = require('../models/User');
    const authHeader = req.headers.authorization;
    let isStaff = false;
    if (authHeader && authHeader.startsWith('Bearer')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (user && (user.role === 'admin' || user.role === 'faculty')) {
          isStaff = true;
        }
      } catch (err) {
        // ignore invalid token / guest
      }
    }

    let query = {};
    if (!isStaff) {
      // Students / Public visitors should only see active, Approved events in the future
      query.status = 'Approved';
      query.dateTime = { $gte: now };
    } else {
      // Faculty / Admin can view everything, filter status if explicitly requested
      if (req.query.status) {
        query.status = req.query.status;
      } else if (req.query.includeDeleted !== 'true') {
        query.status = { $ne: 'Deleted' };
      }
    }

    const events = await Event.find(query)
      .populate('createdBy', 'name email role clubName')
      .populate('requestedFaculty', 'name email role deptYear mobileNumber')
      .populate('rejectedBy', 'name email role mobileNumber')
      .populate('deletedBy', 'name email role mobileNumber')
      .sort({ dateTime: !isStaff ? 1 : -1 });

    const eventsWithCount = await Promise.all(events.map(async (event) => {
      const regCount = await Registration.countDocuments({ 
        eventId: event._id,
        status: { $in: ['Registered', 'Checked-in'] }
      });
      return {
        ...event.toObject(),
        registrationsCount: regCount
      };
    }));

    res.status(200).json(eventsWithCount);
  } catch (error) {
    next(error);
  }
};

// @desc    Get event by ID
// @route   GET /api/events/:id
// @access  Public
const getEventById = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('createdBy', 'name email role clubName')
      .populate('requestedFaculty', 'name email role deptYear mobileNumber')
      .populate('rejectedBy', 'name email role mobileNumber')
      .populate('deletedBy', 'name email role mobileNumber');
    if (event) {
      const regCount = await Registration.countDocuments({ 
        eventId: event._id,
        status: { $in: ['Registered', 'Checked-in'] }
      });
      res.status(200).json({
        ...event.toObject(),
        registrationsCount: regCount
      });
    } else {
      res.status(404);
      throw new Error('Event not found');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Create an event
// @route   POST /api/events
// @access  Private/Organizer/Faculty/Admin
const createEvent = async (req, res, next) => {
  const { 
    title, 
    category, 
    organizerDept, 
    dateTime, 
    venue, 
    maxParticipants, 
    posterUrl, 
    description, 
    requestedFaculty, 
    clubName,
    mode,
    registrationType,
    priceType,
    upiNumber,
    entryFee,
    fromDate,
    toDate,
    studentCoordinators,
    facultyContact
  } = req.body;

  try {
    if (!title || !category || !organizerDept || !dateTime || !venue || !maxParticipants) {
      res.status(400);
      throw new Error('Please provide all required fields');
    }

    if (priceType === 'paid' && entryFee >= 1500) {
      res.status(400);
      throw new Error('Amount per person must be less than 1500');
    }

    const event = new Event({
      title,
      category,
      organizerDept,
      clubName: clubName || category,
      dateTime,
      venue,
      maxParticipants,
      posterUrl,
      description,
      createdBy: req.user._id,
      status: 'Approved',
      coordinationStatus: 'Accepted',
      requestedFaculty,
      mode,
      registrationType,
      priceType,
      upiNumber,
      entryFee: entryFee || 0,
      fromDate,
      toDate,
      studentCoordinators,
      facultyContact
    });

    const createdEvent = await event.save();
    res.status(201).json(createdEvent);
  } catch (error) {
    next(error);
  }
};

// @desc    Register for an event
// @route   POST /api/events/:id/register
// @access  Private/Student
const registerForEvent = async (req, res, next) => {
  try {
    const { collegeName, teamDetails, paymentScreenshot } = req.body;
    const event = await Event.findById(req.params.id);
    if (!event) {
      res.status(404);
      throw new Error('Event not found');
    }

    // Check if event is approved or upcoming
    if (!['Approved', 'Upcoming'].includes(event.status)) {
      res.status(400);
      throw new Error('Registration is not open for this event');
    }

    const alreadyRegistered = await Registration.findOne({
      eventId: event._id,
      studentId: req.user._id,
    });

    if (alreadyRegistered) {
      res.status(400);
      throw new Error('Already registered for this event');
    }

    const activeRegistrations = await Registration.countDocuments({ 
      eventId: event._id,
      status: { $nin: ['Rejected', 'Cancelled'] }
    });
    if (activeRegistrations >= event.maxParticipants) {
      res.status(400);
      throw new Error('Event capacity reached');
    }

    // Paid event check
    const isPaid = event.priceType === 'paid';
    if (isPaid && !paymentScreenshot) {
      res.status(400);
      throw new Error('Payment screenshot is required for paid events');
    }

    const regStatus = isPaid ? 'Pending' : 'Registered';

    // Generate unique secure UUID for qrCodeId
    const qrCodeId = crypto.randomUUID();

    // Generate unique 6-digit ticket ID
    let sixDigitId;
    let isUnique = false;
    while (!isUnique) {
      sixDigitId = Math.floor(100000 + Math.random() * 900000).toString();
      const existingId = await Registration.findOne({ sixDigitId });
      if (!existingId) {
        isUnique = true;
      }
    }

    const registration = new Registration({
      eventId: event._id,
      studentId: req.user._id,
      status: regStatus,
      qrCodeId,
      sixDigitId,
      collegeName: collegeName || undefined,
      teamDetails: teamDetails || undefined,
      paymentScreenshot: paymentScreenshot || undefined,
      paymentVerified: !isPaid
    });

    const savedRegistration = await registration.save();

    // Send confirmation email asynchronously ONLY if free
    if (regStatus === 'Registered') {
      try {
        await sendRegistrationEmail(
          req.user.email,
          req.user.name,
          event.title,
          event.dateTime,
          event.venue,
          sixDigitId
        );
      } catch (emailErr) {
        console.error('Failed to send registration confirmation email:', emailErr.message);
      }
    } else if (regStatus === 'Pending') {
      try {
        const { sendPendingApprovalEmail, sendFacultyPendingApprovalEmail } = require('../utils/email');
        await sendPendingApprovalEmail(
          req.user.email,
          req.user.name,
          event.title
        );

        // Notify respective faculty coordinator/creator
        const eventWithFaculty = await Event.findById(event._id)
          .populate('requestedFaculty')
          .populate('createdBy');
        
        let targetFaculty = null;
        if (eventWithFaculty) {
          if (eventWithFaculty.requestedFaculty && (eventWithFaculty.requestedFaculty.role === 'faculty' || eventWithFaculty.requestedFaculty.role === 'admin')) {
            targetFaculty = eventWithFaculty.requestedFaculty;
          } else if (eventWithFaculty.createdBy && (eventWithFaculty.createdBy.role === 'faculty' || eventWithFaculty.createdBy.role === 'admin')) {
            targetFaculty = eventWithFaculty.createdBy;
          }
        }

        if (targetFaculty && targetFaculty.email) {
          await sendFacultyPendingApprovalEmail(
            targetFaculty.email,
            targetFaculty.name,
            req.user.name,
            event.title
          );
        }
      } catch (emailErr) {
        console.error('Failed to send registration pending email notifications:', emailErr.message);
      }
    }

    res.status(201).json(savedRegistration);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all events awaiting approval
// @route   GET /api/events/pending
// @access  Private/Faculty/Admin
const getPendingEvents = async (req, res, next) => {
  try {
    const pendingEvents = await Event.find({ status: 'Pending' }).populate('createdBy', 'name email role clubName');
    res.status(200).json(pendingEvents);
  } catch (error) {
    next(error);
  }
};

// @desc    Update event status (Approval workflow)
// @route   PUT /api/events/:id/status
// @access  Private/Faculty/Admin
const updateEventStatus = async (req, res, next) => {
  const { status } = req.body;
  
  try {
    if (!status || !['Approved', 'Rejected', 'Closed'].includes(status)) {
      res.status(400);
      throw new Error('Invalid event status');
    }

    const event = await Event.findById(req.params.id);
    if (!event) {
      res.status(404);
      throw new Error('Event not found');
    }

    event.status = status;
    if (status === 'Approved') {
      event.coordinationStatus = 'Accepted';
    }
    const updatedEvent = await event.save();

    if (status === 'Approved') {
      try {
        await updatedEvent.populate('createdBy', 'name email');
        if (updatedEvent.createdBy && updatedEvent.createdBy.email) {
          await sendApprovalEmail(updatedEvent.createdBy.email, updatedEvent.createdBy.name, updatedEvent.title);
        }
      } catch (emailErr) {
        console.error('Failed to send event approval email notification:', emailErr);
      }
    }

    res.status(200).json(updatedEvent);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all registered students for a specific event
// @route   GET /api/events/:eventId/registrations
// @access  Private/Organizer/Faculty/Admin
const getEventRegistrations = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) {
      res.status(404);
      throw new Error('Event not found');
    }

    let query = { eventId: req.params.eventId };
    if (req.query.status) {
      let statusParam = req.query.status;
      if (statusParam === 'Present') {
        statusParam = 'Checked-in';
      }
      query.status = statusParam;
    }

    const registrations = await Registration.find(query)
      .populate('studentId', 'name email regNo deptYear mobileNumber')
      .sort({ createdAt: -1 });

    res.status(200).json(registrations);
  } catch (error) {
    next(error);
  }
};

// @desc    Get event leaderboard (sort students by points descending)
// @route   GET /api/events/:eventId/leaderboard
// @access  Public
const getEventLeaderboard = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) {
      res.status(404);
      throw new Error('Event not found');
    }

    const registrations = await Registration.find({ eventId: req.params.eventId })
      .populate('studentId', 'name regNo deptYear')
      .sort({ points: -1, scanTime: 1 });

    const topThree = registrations.slice(0, 3);
    const others = registrations.slice(3);

    res.status(200).json({
      success: true,
      topThree,
      others,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Finalize event attendance (compile present & absent lists)
// @route   POST /api/events/:eventId/attendance/finalize
// @access  Private/Organizer/Faculty/Admin
const finalizeEventAttendance = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) {
      res.status(404);
      throw new Error('Event not found');
    }

    const registrations = await Registration.find({ eventId: event._id });

    const presentStudents = [];
    const absentStudents = [];

    registrations.forEach((reg) => {
      if (reg.status === 'Checked-in') {
        presentStudents.push({
          studentId: reg.studentId,
          scanTime: reg.scanTime || new Date(),
        });
      } else {
        absentStudents.push(reg.studentId);
      }
    });

    const attendance = await Attendance.findOneAndUpdate(
      { eventId: event._id },
      {
        eventId: event._id,
        presentStudents,
        absentStudents,
        markedBy: req.user._id,
        takenAt: new Date(),
      },
      { new: true, upsert: true }
    ).populate([
      { path: 'presentStudents.studentId', select: 'name email regNo deptYear mobileNumber' },
      { path: 'absentStudents', select: 'name email regNo deptYear mobileNumber' }
    ]);

    res.status(200).json({
      success: true,
      message: 'Attendance successfully finalized',
      attendance,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getEvents,
  getEventById,
  createEvent,
  registerForEvent,
  getPendingEvents,
  updateEventStatus,
  getEventRegistrations,
  getEventLeaderboard,
  finalizeEventAttendance,
};
