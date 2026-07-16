const Registration = require('../models/Registration');

// @desc    Update registration status (Manual Override)
// @route   PUT /api/registrations/:id
// @access  Private/Organizer/Faculty/Admin
const updateRegistrationStatus = async (req, res, next) => {
  let { status, points, certificateApproved } = req.body;

  try {
    const registration = await Registration.findById(req.id || req.params.id);
    if (!registration) {
      res.status(404);
      throw new Error('Registration record not found');
    }

    const wasPending = registration.status === 'Pending';

    if (status) {
      if (status === 'Present') {
        status = 'Checked-in';
      }

      if (!['Registered', 'Checked-in', 'Pending', 'Cancelled', 'Absent'].includes(status)) {
        res.status(400);
        throw new Error('Invalid registration status');
      }

      registration.status = status;
      if (status === 'Checked-in') {
        registration.scanTime = registration.scanTime || new Date();
        // Default points to 10 on check-in if points not specified and current points is 0
        if (points === undefined && registration.points === 0) {
          registration.points = 10;
        }
      }
      if (status === 'Registered') {
        registration.paymentVerified = true;
      }
    }

    if (points !== undefined) {
      registration.points = Number(points);
    }

    if (certificateApproved !== undefined) {
      registration.certificateApproved = !!certificateApproved;
    }

    const updatedRegistration = await registration.save();

    // Store attendance separately in the attendance collection if status changed
    if (status) {
      const { recordAttendance } = require('../utils/attendanceHelper');
      const isPresent = status === 'Checked-in';
      await recordAttendance(
        updatedRegistration.eventId,
        updatedRegistration.studentId._id || updatedRegistration.studentId,
        isPresent,
        req.user ? req.user._id : (updatedRegistration.studentId._id || updatedRegistration.studentId)
      );
    }
    
    // Populate student data
    await updatedRegistration.populate('studentId', 'name email regNo deptYear mobileNumber');

    // Trigger confirmation email if transitioned from Pending to Registered
    if (wasPending && status === 'Registered') {
      const { sendRegistrationEmail } = require('../utils/email');
      const Event = require('../models/Event');
      const User = require('../models/User');
      try {
        const ev = await Event.findById(updatedRegistration.eventId);
        const studentUser = await User.findById(updatedRegistration.studentId);
        if (ev && studentUser) {
          await sendRegistrationEmail(
            studentUser.email,
            studentUser.name,
            ev.title,
            ev.dateTime,
            ev.venue,
            updatedRegistration.sixDigitId
          );
        }
      } catch (emailErr) {
        console.error('Failed to send registration confirmation email on approval:', emailErr.message);
      }
    }

    res.status(200).json({
      success: true,
      message: `Registration status successfully updated to ${registration.status}`,
      registration: updatedRegistration,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  updateRegistrationStatus,
};
