const Event = require('../models/Event');
const Registration = require('../models/Registration');

// @desc    Get aggregate stats for dashboard
// @route   GET /api/dashboard/stats
// @access  Private (Organizer, Faculty, Admin)
const getStats = async (req, res, next) => {
  try {
    let eventQuery = {};
    
    // If the logged-in user is a faculty member, they should only see their own stats. Admins see all.
    if (req.user.role === 'faculty') {
      eventQuery.createdBy = req.user._id;
    }

    const totalEvents = await Event.countDocuments(eventQuery);
    const pendingApprovals = await Event.countDocuments({ ...eventQuery, status: 'Pending' });

    let registrationQuery = {};
    if (req.user.role === 'faculty') {
      const facultyEvents = await Event.find({ createdBy: req.user._id }).select('_id');
      const eventIds = facultyEvents.map(e => e._id);
      registrationQuery.eventId = { $in: eventIds };
    }

    const totalRegistrations = await Registration.countDocuments(registrationQuery);
    const totalCheckIns = await Registration.countDocuments({ ...registrationQuery, status: 'Checked-in' });

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

module.exports = {
  getStats,
};
