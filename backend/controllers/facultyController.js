const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Announcement = require('../models/Announcement');
const User = require('../models/User');
const mongoose = require('mongoose');
const { sendApprovalEmail } = require('../utils/email');

// @desc    Get faculty dashboard statistics
// @route   GET /api/faculty/dashboard
// @access  Private/Faculty/Admin
const getFacultyDashboard = async (req, res, next) => {
  try {
    const totalEvents = await Event.countDocuments();
    const totalRegistrations = await Registration.countDocuments();
    
    let pendingQuery = { status: 'Pending Review' };
    if (req.user.role !== 'admin') {
      pendingQuery.requestedFaculty = req.user._id;
    }
    const pendingApprovals = await Event.countDocuments(pendingQuery);
    const totalCheckIns = await Registration.countDocuments({ status: 'Checked-in' });

    res.status(200).json({
      success: true,
      stats: {
        totalEvents,
        totalRegistrations,
        pendingApprovals,
        totalCheckIns,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Fetch all events awaiting approval (filtered by requestedFaculty if not Admin)
// @route   GET /api/faculty/events/pending
// @access  Private/Faculty/Admin
const getPendingEvents = async (req, res, next) => {
  try {
    let query = { status: 'Pending Review' };
    
    // Any faculty or admin can review pending events
    if (req.user.role !== 'admin' && req.user.role !== 'faculty') {
      query.requestedFaculty = req.user._id;
    }

    const events = await Event.find(query)
      .populate('createdBy', 'name email role clubName')
      .populate('requestedFaculty', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json(events);
  } catch (error) {
    next(error);
  }
};

// @desc    Approve or Reject an event
// @route   PUT /api/faculty/events/:eventId/status
// @access  Private/Faculty/Admin
const updateEventStatus = async (req, res, next) => {
  const { eventId } = req.params;
  const { status } = req.body;

  try {
    if (!status || !['Approved', 'Rejected'].includes(status)) {
      res.status(400);
      throw new Error('Invalid event status. Status must be Approved or Rejected');
    }

    const event = await Event.findById(eventId);
    if (!event) {
      res.status(404);
      throw new Error('Event not found');
    }

    // Verify authorized faculty/admin
    if (req.user.role !== 'admin' && req.user.role !== 'faculty') {
      res.status(403);
      throw new Error('You are not authorized to review this event request');
    }

    event.status = status;
    if (status === 'Rejected') {
      event.rejectedBy = req.user._id;
    }
    await event.save();
    await event.populate('rejectedBy', 'name email role mobileNumber');

    res.status(200).json({
      success: true,
      message: `Event status successfully updated to ${status}`,
      event,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all students registered for an event
// @route   GET /api/faculty/events/:eventId/registrations
// @access  Private/Faculty/Admin
const getEventRegistrations = async (req, res, next) => {
  const { eventId } = req.params;

  try {
    const event = await Event.findById(eventId);
    if (!event) {
      res.status(404);
      throw new Error('Event not found');
    }

    const registrations = await Registration.find({ eventId })
      .populate('studentId', 'name email regNo deptYear mobileNumber')
      .sort({ createdAt: -1 });

    const sanitized = registrations.map(r => {
      const obj = typeof r.toObject === 'function' ? r.toObject() : { ...r };
      if (req.user.role !== 'admin' && obj.studentId) {
        if (obj.studentId.mobileNumber) {
          obj.studentId.mobileNumber = '********' + obj.studentId.mobileNumber.slice(-2);
        }
      }
      return obj;
    });

    res.status(200).json(sanitized);
  } catch (error) {
    next(error);
  }
};

// @desc    Scan student QR code pass to check-in (strictly same-day validation)
// @route   POST /api/faculty/attendance/scan
// @access  Private/Faculty/Admin
const scanStudentQRPass = async (req, res, next) => {
  const { qrCodeId } = req.body;

  try {
    if (!qrCodeId) {
      res.status(400);
      throw new Error('qrCodeId is required');
    }

    const registration = await Registration.findOne({ qrCodeId })
      .populate('studentId', 'name regNo deptYear mobileNumber')
      .populate('eventId', 'title dateTime');

    if (!registration) {
      res.status(404);
      throw new Error('Invalid QR code. No registration found.');
    }

    // Strictly validate event date matches today
    const eventDate = new Date(registration.eventId.dateTime);
    const today = new Date();
    if (
      eventDate.getFullYear() !== today.getFullYear() ||
      eventDate.getMonth() !== today.getMonth() ||
      eventDate.getDate() !== today.getDate()
    ) {
      res.status(400);
      throw new Error('Attendance check-in is only allowed on the day of the event');
    }

    if (registration.status === 'Checked-in') {
      return res.status(200).json({
        success: true,
        message: 'Student already checked in',
        student: {
          name: registration.studentId.name,
          regNo: registration.studentId.regNo,
          deptYear: registration.studentId.deptYear,
          scanTime: registration.scanTime || new Date(),
          eventTitle: registration.eventId.title,
        },
      });
    }

    registration.status = 'Checked-in';
    registration.scanTime = new Date();
    if (registration.points === 0) {
      registration.points = 10;
    }
    await registration.save();

    // Store attendance separately in the attendance collection
    const { recordAttendance } = require('../utils/attendanceHelper');
    await recordAttendance(registration.eventId._id || registration.eventId, registration.studentId._id || registration.studentId, true, req.user._id);

    res.status(200).json({
      success: true,
      message: 'Attendee successfully checked in',
      student: {
        name: registration.studentId.name,
        regNo: registration.studentId.regNo,
        deptYear: registration.studentId.deptYear,
        scanTime: registration.scanTime,
        eventTitle: registration.eventId.title,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create and broadcast an announcement
// @route   POST /api/faculty/announcements
// @access  Private/Faculty/Admin
const createAnnouncement = async (req, res, next) => {
  const { title, message, audience } = req.body;

  try {
    if (!title || !message) {
      res.status(400);
      throw new Error('Please provide title and message');
    }

    const announcement = new Announcement({
      title,
      message,
      audience: audience || 'all',
      sentAt: new Date(),
    });

    await announcement.save();

    res.status(201).json({
      success: true,
      message: 'Announcement broadcasted successfully',
      announcement,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get reports summary for faculty
// @route   GET /api/faculty/reports
// @access  Private/Faculty/Admin
const getFacultyReports = async (req, res, next) => {
  const { eventId, dateRange } = req.query;

  try {
    let eventQuery = {};

    if (eventId) {
      eventQuery._id = eventId;
    } else if (dateRange) {
      const now = new Date();
      if (dateRange === '7days') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(now.getDate() - 7);
        eventQuery.dateTime = { $gte: sevenDaysAgo };
      } else if (dateRange === '30days') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 30);
        eventQuery.dateTime = { $gte: thirtyDaysAgo };
      }
    }

    const events = await Event.find(eventQuery).select('_id');
    const eventIds = events.map(e => e._id);

    const totalRegistrations = await Registration.countDocuments({
      eventId: { $in: eventIds },
    });

    const totalPresent = await Registration.countDocuments({
      eventId: { $in: eventIds },
      status: 'Checked-in',
    });

    const attendanceRate = totalRegistrations > 0
      ? parseFloat(((totalPresent / totalRegistrations) * 100).toFixed(2))
      : 0;

    res.status(200).json({
      success: true,
      reports: {
        totalRegistrations,
        totalPresent,
        attendanceRate,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve Organizer Account
// @route   PUT /api/faculty/approve-organizer/:id
// @access  Private/Faculty/Admin
const approveOrganizer = async (req, res, next) => {
  const { id } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400);
      throw new Error('Invalid organizer ID format');
    }

    const organizer = await User.findById(id);
    if (!organizer) {
      res.status(404);
      throw new Error('Organizer not found');
    }

    if (organizer.role !== 'organizer') {
      res.status(400);
      throw new Error('User is not an organizer');
    }

    organizer.isApproved = true;
    await organizer.save();

    res.status(200).json({
      success: true,
      message: 'Organizer approved successfully',
      user: {
        _id: organizer._id,
        role: organizer.role,
        name: organizer.name,
        email: organizer.email,
        isApproved: organizer.isApproved,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a user (student/organizer) access
// @route   DELETE /api/faculty/users/:id
// @access  Private/Faculty/Admin
const deleteUser = async (req, res, next) => {
  const { id } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400);
      throw new Error('Invalid user ID format');
    }

    const userToDelete = await User.findById(id);
    if (!userToDelete) {
      res.status(404);
      throw new Error('User not found');
    }

    if (userToDelete.role === 'admin') {
      res.status(403);
      throw new Error('Cannot delete an administrator account');
    }

    await User.findByIdAndDelete(id);

    if (userToDelete.role === 'student') {
      await Registration.deleteMany({ studentId: id });
    }
    if (userToDelete.role === 'faculty') {
      await Event.deleteMany({ createdBy: id });
    }

    res.status(200).json({
      success: true,
      message: 'User account and associated records deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete an event
// @route   DELETE /api/faculty/events/:id
// @access  Private/Faculty/Admin
const deleteEvent = async (req, res, next) => {
  const { id } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400);
      throw new Error('Invalid event ID format');
    }

    const eventToDelete = await Event.findById(id);
    if (!eventToDelete) {
      res.status(404);
      throw new Error('Event not found');
    }

    // Verify authorized faculty/admin
    if (req.user.role !== 'admin' && String(eventToDelete.createdBy) !== String(req.user._id)) {
      res.status(403);
      throw new Error('You are not authorized to delete this event');
    }

    if (eventToDelete.status === 'Deleted') {
      // If already soft-deleted, perform a permanent deletion
      await Event.findByIdAndDelete(id);
      
      // Clean up associated registrations and attendance records
      const Registration = require('../models/Registration');
      const Attendance = require('../models/Attendance');
      await Registration.deleteMany({ eventId: id });
      await Attendance.deleteMany({ eventId: id });

      res.status(200).json({
        success: true,
        message: 'Event permanently deleted from the database',
        permanent: true,
      });
      return;
    }

    eventToDelete.status = 'Deleted';
    eventToDelete.deletedBy = req.user._id;
    await eventToDelete.save();
    await eventToDelete.populate('deletedBy', 'name email role mobileNumber');

    res.status(200).json({
      success: true,
      message: 'Event deleted successfully (soft-deleted)',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a registration
// @route   DELETE /api/faculty/registrations/:id
// @access  Private/Faculty/Admin
const deleteRegistration = async (req, res, next) => {
  const { id } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400);
      throw new Error('Invalid registration ID format');
    }

    const reg = await Registration.findById(id).populate('eventId');
    if (!reg) {
      res.status(404);
      throw new Error('Registration not found');
    }

    // Verify authorized faculty/admin
    if (req.user.role !== 'admin') {
      const event = reg.eventId;
      if (!event || String(event.createdBy) !== String(req.user._id)) {
        res.status(403);
        throw new Error('You are not authorized to delete this registration');
      }
    }

    await Registration.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Registration deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Accept or Deny event coordination request
// @route   PUT /api/faculty/events/:eventId/coordination
// @access  Private/Faculty/Admin
const updateEventCoordinationStatus = async (req, res, next) => {
  const { eventId } = req.params;
  const { status } = req.body;

  try {
    if (!status || !['Accepted', 'Denied'].includes(status)) {
      res.status(400);
      throw new Error('Invalid coordination status. Must be Accepted or Denied');
    }

    const event = await Event.findById(eventId);
    if (!event) {
      res.status(404);
      throw new Error('Event not found');
    }

    if (req.user.role !== 'admin' && String(event.requestedFaculty) !== String(req.user._id)) {
      res.status(403);
      throw new Error('You are not authorized to coordinate this event');
    }

    event.coordinationStatus = status;
    if (status === 'Accepted') {
      event.status = 'Approved';
    } else if (status === 'Denied') {
      event.status = 'Rejected';
      event.rejectedBy = req.user._id;
    }
    await event.save();

    if (status === 'Accepted') {
      try {
        await event.populate('createdBy', 'name email');
        if (event.createdBy && event.createdBy.email) {
          await sendApprovalEmail(event.createdBy.email, event.createdBy.name, event.title);
        }
      } catch (emailErr) {
        console.error('Failed to send coordination approval email notification:', emailErr);
      }
    }

    res.status(200).json({
      success: true,
      message: `Event coordination request ${status.toLowerCase()} successfully`,
      event
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all registrations
// @route   GET /api/faculty/registrations
// @access  Private/Faculty/Admin
const getAllRegistrations = async (req, res, next) => {
  try {
    const registrations = await Registration.find()
      .populate('studentId', 'name email regNo deptYear mobileNumber')
      .populate('eventId', 'title dateTime fromDate toDate priceType entryFee')
      .sort({ createdAt: -1 });

    const sanitized = registrations.map(r => {
      const obj = typeof r.toObject === 'function' ? r.toObject() : { ...r };
      if (req.user.role !== 'admin' && obj.studentId) {
        if (obj.studentId.mobileNumber) {
          obj.studentId.mobileNumber = '********' + obj.studentId.mobileNumber.slice(-2);
        }
      }
      return obj;
    });

    res.status(200).json(sanitized);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getFacultyDashboard,
  getPendingEvents,
  updateEventStatus,
  getEventRegistrations,
  getAllRegistrations,
  scanStudentQRPass,
  createAnnouncement,
  getFacultyReports,
  approveOrganizer,
  deleteUser,
  deleteEvent,
  deleteRegistration,
  updateEventCoordinationStatus,
};
