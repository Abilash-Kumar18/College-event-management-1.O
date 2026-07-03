const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Certificate = require('../models/Certificate');
const { sendRegistrationEmail } = require('../utils/email');
const crypto = require('crypto');

// @desc    Get student dashboard counts
// @route   GET /api/student/dashboard
// @access  Private/Student
const getStudentDashboard = async (req, res, next) => {
  try {
    const studentId = req.user._id;

    const registeredCount = await Registration.countDocuments({
      studentId,
      status: 'Registered',
    });

    const checkedInCount = await Registration.countDocuments({
      studentId,
      status: 'Checked-in',
    });

    const pendingCount = await Registration.countDocuments({
      studentId,
      status: 'Pending',
    });

    // Upcoming approved/upcoming events in the system
    const upcomingCount = await Event.countDocuments({
      status: { $in: ['Approved', 'Upcoming'] },
      dateTime: { $gte: new Date() },
    });

    res.status(200).json({
      success: true,
      stats: {
        registered: registeredCount,
        attendance: checkedInCount,
        pending: pendingCount,
        upcoming: upcomingCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Browse approved and upcoming events
// @route   GET /api/student/events
// @access  Private/Student
const getBrowseEvents = async (req, res, next) => {
  try {
    const events = await Event.find({
      status: { $in: ['Approved', 'Upcoming'] },
      dateTime: { $gte: new Date() },
    }).populate('createdBy', 'name email role clubName').sort({ dateTime: 1 });

    res.status(200).json(events);
  } catch (error) {
    next(error);
  }
};

// @desc    Register for an event
// @route   POST /api/student/events/:eventId/register
// @access  Private/Student
const registerForEvent = async (req, res, next) => {
  const { eventId } = req.params;
  const { collegeName, teamDetails, paymentScreenshot } = req.body;
  const studentId = req.user._id;

  try {
    const event = await Event.findById(eventId);
    if (!event) {
      res.status(404);
      throw new Error('Event not found');
    }

    if (!['Approved', 'Upcoming'].includes(event.status)) {
      res.status(400);
      throw new Error('Event is not open for registration');
    }

    const alreadyRegistered = await Registration.findOne({
      studentId,
      eventId,
    });

    if (alreadyRegistered) {
      res.status(400);
      throw new Error('Already registered for this event');
    }

    const totalRegistrations = await Registration.countDocuments({ eventId });
    if (totalRegistrations >= event.maxParticipants) {
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
      studentId,
      eventId,
      status: regStatus,
      qrCodeId,
      sixDigitId,
      collegeName: collegeName || undefined,
      teamDetails: teamDetails || undefined,
      paymentScreenshot: paymentScreenshot || undefined,
      paymentVerified: !isPaid
    });

    await registration.save();

    // Send confirmation email asynchronously ONLY if registered instantly (free events)
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
    }

    res.status(201).json({
      success: true,
      message: regStatus === 'Pending' 
        ? 'Registration request submitted. Awaiting payment verification by the organizer.' 
        : 'Successfully registered for event. Confirmation email sent.',
      sixDigitId,
      status: regStatus
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get student's registered events (omits qrCodeId for students)
// @route   GET /api/student/registrations
// @access  Private/Student
const getStudentRegistrations = async (req, res, next) => {
  try {
    const registrations = await Registration.find({ studentId: req.user._id })
      .populate({
        path: 'eventId',
        populate: { path: 'createdBy', select: 'name email role clubName' }
      })
      .sort({ createdAt: -1 });

    // Omit qrCodeId before returning (students shouldn't see/download it directly)
    const sanitizedRegistrations = registrations.map((reg) => {
      const obj = reg.toObject();
      delete obj.qrCodeId;
      return obj;
    });

    res.status(200).json(sanitizedRegistrations);
  } catch (error) {
    next(error);
  }
};

// @desc    Self-scan attendance (strictly same-day check-in validation)
// @route   POST /api/student/attendance/self-scan
// @access  Private/Student
const selfScanAttendance = async (req, res, next) => {
  const { eventId } = req.body;
  const studentId = req.user._id;

  try {
    if (!eventId) {
      res.status(400);
      throw new Error('Event ID is required');
    }

    const event = await Event.findById(eventId);
    if (!event) {
      res.status(404);
      throw new Error('Event not found');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const start = new Date(event.fromDate || event.dateTime);
    start.setHours(0, 0, 0, 0);

    const end = new Date(event.toDate || event.dateTime || event.fromDate);
    end.setHours(23, 59, 59, 999);

    if (today < start || today > end) {
      res.status(400);
      throw new Error('Attendance check-in is only allowed on the scheduled event day(s)');
    }

    const registration = await Registration.findOne({
      studentId,
      eventId,
    });

    if (!registration) {
      res.status(404);
      throw new Error('You are not registered for this event');
    }

    if (registration.status === 'Checked-in') {
      res.status(400);
      throw new Error('You are already checked in');
    }

    registration.status = 'Checked-in';
    registration.scanTime = new Date();
    if (registration.points === 0) {
      registration.points = 10;
    }
    await registration.save();

    res.status(200).json({
      success: true,
      message: 'Successfully checked-in for event',
      scanTime: registration.scanTime,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get student certificates
// @route   GET /api/student/certificates
// @access  Private/Student
const getCertificates = async (req, res, next) => {
  try {
    const certificates = await Certificate.find({ studentId: req.user._id })
      .populate('eventId')
      .sort({ issueDate: -1 });

    res.status(200).json(certificates);
  } catch (error) {
    next(error);
  }
};

// @desc    Get upcoming events for student calendar
// @route   GET /api/student/calendar
// @access  Private/Student
const getCalendarEvents = async (req, res, next) => {
  try {
    const events = await Event.find({
      status: { $in: ['Approved', 'Upcoming'] },
      dateTime: { $gte: new Date() },
    }).select('title dateTime venue category');

    res.status(200).json(events);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStudentDashboard,
  getBrowseEvents,
  registerForEvent,
  getStudentRegistrations,
  selfScanAttendance,
  getCertificates,
  getCalendarEvents,
};
