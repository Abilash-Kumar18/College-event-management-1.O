const Event = require('../models/Event');
const Registration = require('../models/Registration');
const User = require('../models/User');

const sendUpcomingEventReports = async () => {
  try {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Find events starting tomorrow that haven't had reports sent
    const upcomingEvents = await Event.find({
      dateTime: { $gte: new Date(now.getTime() - 2 * 60 * 60 * 1000), $lte: tomorrow },
      reportSent: { $ne: true },
      status: 'Approved'
    }).populate('requestedFaculty').populate('createdBy');

    if (upcomingEvents.length > 0) {
      console.log(`[Scheduler] Checking for upcoming events reports. Found ${upcomingEvents.length} events starting within 24h.`);
    }

    for (const event of upcomingEvents) {
      // Find all completed registrations (status is Registered or Checked-in)
      const regs = await Registration.find({
        eventId: event._id,
        status: { $in: ['Registered', 'Checked-in'] }
      }).populate('studentId');

      if (regs.length === 0) {
        console.log(`[Scheduler] No registered students for event "${event.title}". Skipping report email.`);
        event.reportSent = true;
        await event.save();
        continue;
      }

      // Generate CSV content
      let csvContent = '\uFEFF'; // UTF-8 BOM for Excel compatibility
      csvContent += 'Student Name,Registration Number,Ticket ID,Event Name,Venue,Date & Time\n';
      
      for (const reg of regs) {
        const studentName = reg.studentId?.name || 'N/A';
        const regNo = reg.studentId?.regNo || 'N/A';
        const ticketId = reg.sixDigitId || 'N/A';
        const eventTitle = event.title;
        const venue = event.venue;
        const dateTime = new Date(event.dateTime).toLocaleString();

        csvContent += `"${studentName.replace(/"/g, '""')}","${regNo.replace(/"/g, '""')}","${ticketId.replace(/"/g, '""')}","${eventTitle.replace(/"/g, '""')}","${venue.replace(/"/g, '""')}","${dateTime.replace(/"/g, '""')}"\n`;
      }

      // Get target faculty coordinator or creator
      let facultyEmail = '';
      let facultyName = '';
      if (event.requestedFaculty && (event.requestedFaculty.role === 'faculty' || event.requestedFaculty.role === 'admin')) {
        facultyEmail = event.requestedFaculty.email;
        facultyName = event.requestedFaculty.name;
      } else if (event.createdBy && (event.createdBy.role === 'faculty' || event.createdBy.role === 'admin')) {
        facultyEmail = event.createdBy.email;
        facultyName = event.createdBy.name;
      }

      // Get all admin emails
      const admins = await User.find({ role: 'admin' });
      const adminEmails = admins.map(a => a.email).filter(Boolean);

      // Recipients list
      const recipients = [];
      if (facultyEmail) recipients.push(facultyEmail);
      recipients.push(...adminEmails);

      // Deduplicate recipients
      const uniqueRecipients = [...new Set(recipients)];

      if (uniqueRecipients.length === 0) {
        console.log(`[Scheduler] No recipients found for event "${event.title}" report email.`);
        continue;
      }

      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.ethereal.email',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.SMTP_USER || 'ethereal.user@ethereal.email',
          pass: process.env.SMTP_PASS || 'ethereal.pass',
        },
      });

      const fromName = process.env.SMTP_FROM_NAME || 'College Event Management';
      const fromEmail = process.env.SMTP_FROM_EMAIL || 'noreply@collegeevents.com';

      const mailOptions = {
        from: `"${fromName}" <${fromEmail}>`,
        to: uniqueRecipients.join(','),
        subject: `Upcoming Event Student Registrations Report: ${event.title}`,
        text: `Hello,\n\nPlease find attached the student registrations report for the upcoming event "${event.title}" scheduled on ${new Date(event.dateTime).toLocaleString()}.\n\nBest regards,\nCollege Event Management`,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px;">
            <h2 style="color: #2b6cb0; margin-top: 0;">Event Registrations Report</h2>
            <p>Hello,</p>
            <p>Please find attached the student registrations report (CSV Excel sheet) for the upcoming event:</p>
            <div style="background-color: #f7fafc; border-left: 4px solid #2b6cb0; padding: 16px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; font-weight: bold;">Event Name: ${event.title}</p>
              <p style="margin: 4px 0 0 0;"><strong>Date & Time:</strong> ${new Date(event.dateTime).toLocaleString()}</p>
              <p style="margin: 4px 0 0 0;"><strong>Venue:</strong> ${event.venue}</p>
            </div>
            <p>Total Registered Students: <strong>${regs.length}</strong></p>
            <p style="margin-top: 24px; font-size: 12px; color: #718096; border-top: 1px solid #e2e8f0; padding-top: 16px;">
              This is an automated notification from K.S.R College Of Engineering Event Management.
            </p>
          </div>
        `,
        attachments: [
          {
            filename: `${event.title.replace(/[^a-zA-Z0-9]/g, '_')}_registrations.csv`,
            content: csvContent,
            contentType: 'text/csv'
          }
        ]
      };

      console.log(`\n--- [SIMULATED REPORT EMAIL SENT] ---`);
      console.log(`To: ${uniqueRecipients.join(', ')}`);
      console.log(`Event: ${event.title}`);
      console.log(`Registered Students: ${regs.length}`);
      console.log(`--------------------------------------\n`);

      try {
        await transporter.sendMail(mailOptions);
        event.reportSent = true;
        await event.save();
      } catch (err) {
        console.error(`Failed to send report email for event "${event.title}":`, err.message);
      }
    }
  } catch (err) {
    console.error('[Scheduler] Error in sendUpcomingEventReports:', err.message);
  }
};

const startScheduler = () => {
  // Run on startup
  sendUpcomingEventReports();

  // Run every 1 hour to check for upcoming events
  setInterval(sendUpcomingEventReports, 60 * 60 * 1000);
};

module.exports = {
  startScheduler,
  sendUpcomingEventReports
};
