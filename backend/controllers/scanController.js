const Registration = require('../models/Registration');
const Event = require('../models/Event');

// @desc    Scan QR and check-in attendee
// @route   POST /api/scan
// @access  Private/Admin
const checkInAttendee = async (req, res, next) => {
  const { qrCodeData } = req.body;

  try {
    let parsedData;
    try {
      parsedData = JSON.parse(qrCodeData);
    } catch (e) {
      res.status(400);
      throw new Error('Invalid QR code format');
    }

    const { userId, eventId } = parsedData;

    const registration = await Registration.findOne({
      eventId: eventId,
      studentId: userId,
    }).populate('studentId', 'name email').populate('eventId', 'title dateTime fromDate toDate');

    if (!registration) {
      res.status(404);
      throw new Error('No registration found for this event and user');
    }

    const event = registration.eventId;
    if (event) {
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
    }

    if (registration.status === 'Checked-in') {
      res.status(400);
      return res.json({
        success: false,
        message: 'Attendee is already checked in',
        registration,
      });
    }

    registration.status = 'Checked-in';
    registration.scanTime = new Date();
    if (registration.points === 0) {
      registration.points = 10;
    }
    await registration.save();

    res.json({
      success: true,
      message: 'Attendee successfully checked in',
      registration,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  checkInAttendee,
};
