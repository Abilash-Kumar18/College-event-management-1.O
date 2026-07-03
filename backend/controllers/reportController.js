const Event = require('../models/Event');
const Registration = require('../models/Registration');

// @desc    Get reports summary
// @route   GET /api/reports/summary
// @access  Private/Organizer/Faculty/Admin
const getSummary = async (req, res, next) => {
  const { eventId, dateRange } = req.query;

  try {
    let eventQuery = {};

    // If organizer, restrict to their own events
    if (req.user.role === 'organizer') {
      eventQuery.createdBy = req.user._id;
    }

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

    // Find all matching events
    const events = await Event.find(eventQuery).select('_id');
    const eventIds = events.map(e => e._id);

    // Calculate counts
    const totalRegistered = await Registration.countDocuments({
      eventId: { $in: eventIds },
    });

    const totalAttended = await Registration.countDocuments({
      eventId: { $in: eventIds },
      status: 'Checked-in',
    });

    const averageAttendanceRate = totalRegistered > 0
      ? parseFloat(((totalAttended / totalRegistered) * 100).toFixed(2))
      : 0;

    res.status(200).json({
      success: true,
      summary: {
        totalRegistered,
        totalAttended,
        averageAttendanceRate,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSummary,
};
