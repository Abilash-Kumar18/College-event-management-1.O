const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Event = require('./models/Event');
const User = require('./models/User');
const Registration = require('./models/Registration');
const Attendance = require('./models/Attendance');

dotenv.config();

const clean = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    // Delete test events
    const eventRes = await Event.deleteMany({ title: { $in: ['Node Integration BootCamp', 'Excel Masterclass Test'] } });
    console.log(`Deleted ${eventRes.deletedCount} test events`);

    // Delete test registrations
    const regRes = await Registration.deleteMany({
      $or: [
        { eventTitle: 'Node Integration BootCamp' },
        { eventTitle: 'Excel Masterclass Test' }
      ]
    });
    console.log(`Deleted ${regRes.deletedCount} test registrations`);

    // Delete test users
    const userRes = await User.deleteMany({
      email: { $regex: /test/i }
    });
    console.log(`Deleted ${userRes.deletedCount} test users`);

    console.log('Cleanup completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Cleanup failed:', err);
    process.exit(1);
  }
};

clean();
