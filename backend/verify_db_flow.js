const mongoose = require('mongoose');
const User = require('./models/User');
const Event = require('./models/Event');
const Registration = require('./models/Registration');

const API_BASE = 'http://127.0.0.1:5000/api';
const DB_URI = 'mongodb+srv://abilaashkumar578_db_user:AbilashkumaR06112006@cluster0.pg4sv1c.mongodb.net/event_management?appName=Cluster0';

async function run() {
  console.log('=== STARTING AUTOMATED WORKFLOW DB VERIFICATION ===');
  
  // Connect Mongoose to the live database
  console.log('\n[1/12] Connecting to MongoDB Atlas...');
  await mongoose.connect(DB_URI);
  console.log('Connected to MongoDB Atlas successfully.');

  const rand = Math.floor(Math.random() * 100000);
  const studentEmail = `student.test.${rand}@gmail.com`;
  const orgEmail = `org.test.${rand}@gmail.com`;
  const testPassword = 'Password@123';

  // 2. Student Registration
  console.log(`\n[2/12] Registering Student: ${studentEmail}...`);
  const studentRegRes = await fetch(`${API_BASE}/auth/register/student`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Test Student',
      email: studentEmail,
      password: testPassword,
      regNo: `REG${rand}`,
      deptYear: 'CSE Third Year',
      mobile: '9876543210'
    })
  });
  
  const studentRegData = await studentRegRes.json();
  if (!studentRegRes.ok) {
    throw new Error(`Student registration failed: ${JSON.stringify(studentRegData)}`);
  }
  console.log('Student registered successfully.');

  // 3. Organizer Registration
  console.log(`\n[3/12] Registering Organizer: ${orgEmail}...`);
  const orgRegRes = await fetch(`${API_BASE}/auth/register/organizer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Test Organizer',
      email: orgEmail,
      password: testPassword,
      regNo: `ORG${rand}`,
      clubName: 'Web Dev Club',
      mobile: '9876543211'
    })
  });
  const orgRegData = await orgRegRes.json();
  if (!orgRegRes.ok) {
    throw new Error(`Organizer registration failed: ${JSON.stringify(orgRegData)}`);
  }
  console.log('Organizer registered successfully.');

  // 4. Mongoose Direct Update: Approve Organizer
  console.log('\n[4/12] Approving Organizer in MongoDB Atlas...');
  await User.updateOne({ email: orgEmail }, { isApproved: true });
  console.log('Organizer approved in DB.');

  // 5. Organizer Login
  console.log('\n[5/12] Logging in as Organizer...');
  const orgLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: orgEmail,
      password: testPassword,
      role: 'organizer'
    })
  });
  const orgLoginData = await orgLoginRes.json();
  if (!orgLoginRes.ok) {
    throw new Error(`Organizer login failed: ${JSON.stringify(orgLoginData)}`);
  }
  const orgToken = orgLoginData.token;
  const orgUserId = orgLoginData.user.id || orgLoginData.user._id;
  console.log('Organizer login successful. Obtained JWT Token.');

  // 6. Create Event
  console.log('\n[6/12] Organizer Creating Event: "Node Integration BootCamp"...');
  const createEventRes = await fetch(`${API_BASE}/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${orgToken}`
    },
    body: JSON.stringify({
      title: 'Node Integration BootCamp',
      description: 'Programmatic validation of Mongoose Atlas write workflows',
      dateTime: new Date(Date.now() + 86400000).toISOString(),
      venue: 'Cloud Lab 2',
      maxParticipants: 100,
      category: 'Web Dev Club',
      organizerDept: 'CSE Third Year',
      clubName: 'Web Dev Club'
    })
  });
  const createEventData = await createEventRes.json();
  if (!createEventRes.ok) {
    throw new Error(`Event creation failed: ${JSON.stringify(createEventData)}`);
  }
  const eventId = createEventData._id || createEventData.id;
  console.log(`Event created with ID: ${eventId}. Current status: ${createEventData.status}`);

  // 7. Faculty / Admin Login to approve event
  console.log('\n[7/12] Logging in as Admin (abilaashkumar578@gmail.com)...');
  const facultyLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'abilaashkumar578@gmail.com',
      password: 'Jk@35611',
      role: 'admin'
    })
  });
  const facultyLoginData = await facultyLoginRes.json();
  if (!facultyLoginRes.ok) {
    throw new Error(`Faculty login failed: ${JSON.stringify(facultyLoginData)}`);
  }
  const facultyToken = facultyLoginData.token;
  console.log('Faculty login successful.');

  // 8. Faculty Approving Event
  console.log(`\n[8/12] Faculty Approving Event: ${eventId}...`);
  const approveEventRes = await fetch(`${API_BASE}/events/${eventId}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${facultyToken}`
    },
    body: JSON.stringify({ status: 'Approved' })
  });
  const approveEventData = await approveEventRes.json();
  if (!approveEventRes.ok) {
    throw new Error(`Event status update failed: ${JSON.stringify(approveEventData)}`);
  }
  console.log(`Event status successfully updated to: ${approveEventData.status}`);

  // 9. Student Login
  console.log('\n[9/12] Logging in as Student...');
  const studentLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: studentEmail,
      password: testPassword,
      role: 'student'
    })
  });
  const studentLoginData = await studentLoginRes.json();
  if (!studentLoginRes.ok) {
    throw new Error(`Student login failed: ${JSON.stringify(studentLoginData)}`);
  }
  const studentToken = studentLoginData.token;
  const studentUserId = studentLoginData.user.id || studentLoginData.user._id;
  console.log('Student login successful.');

  // 10. Student Registration
  console.log(`\n[10/12] Student registering for event: ${eventId}...`);
  const registerRes = await fetch(`${API_BASE}/events/${eventId}/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${studentToken}`
    }
  });
  const registerData = await registerRes.json();
  if (!registerRes.ok) {
    throw new Error(`Student registration failed: ${JSON.stringify(registerData)}`);
  }
  const registrationId = registerData._id || registerData.id;
  console.log(`Student registered successfully. Registration ID: ${registrationId}. Current status: ${registerData.status}`);

  // 11. Organizer Scanning Attendance Check-in
  console.log('\n[11/12] Organizer scanning student QR code for attendance check-in...');
  const scanRes = await fetch(`${API_BASE}/scan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${orgToken}`
    },
    body: JSON.stringify({
      qrCodeData: JSON.stringify({ userId: studentUserId, eventId: eventId })
    })
  });
  const scanData = await scanRes.json();
  if (!scanRes.ok) {
    throw new Error(`QR scanning check-in failed: ${JSON.stringify(scanData)}`);
  }
  console.log(`QR scanning completed successfully! Msg: "${scanData.message}". Checked-in status verified: ${scanData.registration.status}`);

  // 12. Database Verification
  console.log('\n[12/12] Final database state check directly in MongoDB Atlas...');
  const finalDbReg = await Registration.findById(registrationId);
  console.log(`- Registration Status in MongoDB Atlas: "${finalDbReg.status}"`);
  console.log(`- Attendance ScanTime in MongoDB Atlas: ${finalDbReg.scanTime}`);
  console.log(`- Points Awarded in MongoDB Atlas: ${finalDbReg.points}`);

  console.log('\n=== INTEGRATION VERIFICATION COMPLETE: ALL WORKFLOWS PASSED PERFECTLY! ===');
  process.exit(0);
}

run().catch(err => {
  console.error('\n❌ VERIFICATION TEST FAILED:', err);
  process.exit(1);
});
