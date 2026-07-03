const Registration = require('../models/Registration');
const mongoose = require('mongoose');

// @desc    Scan QR and check-in student
// @route   POST /api/attendance/scan
// @access  Private/Organizer/Faculty/Admin
const scanAttendance = async (req, res, next) => {
  const { eventId, studentQRData } = req.body;

  try {
    if (!eventId || !studentQRData) {
      res.status(400);
      throw new Error('Please provide eventId and studentQRData');
    }

    // studentQRData contains the registrationId
    if (!mongoose.Types.ObjectId.isValid(studentQRData)) {
      res.status(400);
      throw new Error('Invalid QR Code data format');
    }

    const registration = await Registration.findOne({
      _id: studentQRData,
      eventId: eventId,
    }).populate('studentId', 'name regNo deptYear mobileNumber');

    if (!registration) {
      res.status(404);
      throw new Error('No registration found for this student and event');
    }

    // If student is already checked in, we update scanTime if not set and return success
    if (registration.status === 'Checked-in') {
      return res.status(200).json({
        success: true,
        message: 'Student already checked in',
        student: {
          name: registration.studentId.name,
          regNo: registration.studentId.regNo,
          deptYear: registration.studentId.deptYear,
          scanTime: registration.scanTime || new Date(),
        },
      });
    }

    registration.status = 'Checked-in';
    registration.scanTime = new Date();
    if (registration.points === 0) {
      registration.points = 10; // default 10 points for check-in
    }
    await registration.save();

    res.status(200).json({
      success: true,
      message: 'Student successfully checked in',
      student: {
        name: registration.studentId.name,
        regNo: registration.studentId.regNo,
        deptYear: registration.studentId.deptYear,
        scanTime: registration.scanTime,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  scanAttendance,
};
