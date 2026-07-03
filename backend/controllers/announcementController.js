const Announcement = require('../models/Announcement');

// @desc    Create a new announcement
// @route   POST /api/announcements
// @access  Private/Organizer/Faculty/Admin
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

    const savedAnnouncement = await announcement.save();
    res.status(201).json(savedAnnouncement);
  } catch (error) {
    next(error);
  }
};

// @desc    Retrieve past announcements
// @route   GET /api/announcements
// @access  Private (All Roles)
const getAnnouncements = async (req, res, next) => {
  try {
    let query = {};
    
    // Filter announcements based on user role to show only relevant ones
    if (req.user.role === 'student') {
      query.audience = { $in: ['student', 'all'] };
    } else if (req.user.role === 'organizer') {
      query.audience = { $in: ['organizer', 'all'] };
    } else if (req.user.role === 'faculty') {
      query.audience = { $in: ['faculty', 'all'] };
    }

    const announcements = await Announcement.find(query).sort({ sentAt: -1 });
    res.status(200).json(announcements);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createAnnouncement,
  getAnnouncements,
};
