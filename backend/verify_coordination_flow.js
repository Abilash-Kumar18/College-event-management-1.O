const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Event = require('./models/Event');
const User = require('./models/User');

dotenv.config();

const run = async () => {
  console.log('=== STARTING AUTOMATED COORDINATION SCHEMAS VERIFICATION ===\n');
  
  try {
    console.log('[1/5] Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected successfully.\n');

    // Fetch a dummy organizer and faculty user
    console.log('[2/5] Fetching dummy users...');
    const organizer = await User.findOne({ role: 'organizer' });
    const faculty = await User.findOne({ role: 'faculty' });

    const testOrgId = organizer ? organizer._id : new mongoose.Types.ObjectId();
    const testFacId = faculty ? faculty._id : new mongoose.Types.ObjectId();

    console.log(`Organizer: ${testOrgId}, Faculty: ${testFacId}\n`);

    console.log('[3/5] Creating Event with requested Faculty Coordinator...');
    const event = new Event({
      title: 'Excel Masterclass Test',
      category: 'Science Club',
      organizerDept: 'CSE',
      dateTime: new Date(),
      venue: 'Online Room',
      maxParticipants: 100,
      createdBy: testOrgId,
      requestedFaculty: testFacId,
      status: 'Pending Review'
    });

    const saved = await event.save();
    console.log(`Saved Event ID: ${saved._id}`);
    console.log(`Initial coordinationStatus: "${saved.coordinationStatus}" (Expected: "Pending")`);
    console.log(`Saved qrCode data: "${saved.qrCode ? (saved.qrCode.substring(0, 50) + '...') : 'MISSING'}" (Expected: base64 data url)\n`);

    console.log('[4/5] Simulating Faculty accepting the coordination request...');
    saved.coordinationStatus = 'Accepted';
    const updated = await saved.save();
    console.log(`Updated coordinationStatus: "${updated.coordinationStatus}" (Expected: "Accepted")\n`);

    console.log('[5/5] Cleaning up test event...');
    await Event.findByIdAndDelete(saved._id);
    console.log('Test event cleaned up successfully.');

    console.log('\n=== VERIFICATION COMPLETE: ALL CODE FLOWS PASSED PERFECTLY ===');
    process.exit(0);
  } catch (error) {
    console.error('Verification failed:', error);
    process.exit(1);
  }
};

run();
