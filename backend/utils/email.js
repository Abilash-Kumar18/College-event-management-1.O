const nodemailer = require('nodemailer');

/**
 * Sends a registration confirmation email to the student.
 * 
 * @param {string} email Student's email address
 * @param {string} studentName Name of the student
 * @param {string} eventTitle Title of the event
 * @param {Date|string} eventDate Date and time of the event
 * @param {string} eventVenue Venue of the event
 * @param {string} sixDigitId Unique 6-digit registration ID
 */
const sendRegistrationEmail = async (email, studentName, eventTitle, eventDate, eventVenue, sixDigitId) => {
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

  const formattedDate = new Date(eventDate).toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const mailOptions = {
    from: `"${fromName}" <${fromEmail}>`,
    to: email,
    subject: `Event Registration Confirmed: ${eventTitle}`,
    text: `Hello ${studentName},\n\nYour registration for the event "${eventTitle}" is confirmed.\n\nDetails:\n- Date: ${formattedDate}\n- Venue: ${eventVenue}\n- Your Unique Ticket ID: ${sixDigitId}\n\nThank you for registering!`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 5px; max-width: 600px; margin: auto;">
        <h2 style="color: #4CAF50; border-bottom: 2px solid #4CAF50; padding-bottom: 10px;">Registration Confirmed!</h2>
        <p>Hello <strong>${studentName}</strong>,</p>
        <p>You have successfully registered for the following event:</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #333;">${eventTitle}</h3>
          <p style="margin: 5px 0;"><strong>Date:</strong> ${formattedDate}</p>
          <p style="margin: 5px 0;"><strong>Venue:</strong> ${eventVenue}</p>
        </div>

        <p>Please present your unique 6-digit ID at the check-in desk:</p>
        <div style="font-size: 24px; font-weight: bold; padding: 15px; background-color: #e8f5e9; color: #2e7d32; display: inline-block; border-radius: 5px; letter-spacing: 3px; margin: 10px 0;">
          ${sixDigitId}
        </div>

        <p style="color: #777; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 15px;">
          This is an automated notification. Please do not reply directly to this email.
        </p>
      </div>
    `,
  };

  // Always log to console for development and test validation
  console.log(`\n--- [SIMULATED REGISTRATION EMAIL SENT] ---`);
  console.log(`To: ${email}`);
  console.log(`Student: ${studentName}`);
  console.log(`Event: ${eventTitle}`);
  console.log(`Date: ${formattedDate}`);
  console.log(`Venue: ${eventVenue}`);
  console.log(`Ticket ID (6-digit): ${sixDigitId}`);
  console.log(`-----------------------------------------\n`);

  try {
    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (error) {
    console.warn(`Nodemailer connection warning: ${error.message}. Registration email logged to console.`);
    return { messageId: 'simulated-reg-id' };
  }
};

const sendApprovalEmail = async (email, organizerName, eventTitle) => {
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
    to: email,
    subject: `Event Approved: ${eventTitle}`,
    text: `Hello ${organizerName},\n\nWe are pleased to inform you that your proposed event "${eventTitle}" has been approved by the Faculty.\n\nStudents can now register for the event on the website.\n\nBest regards,\nCollege Event Management`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 5px; max-width: 600px; margin: auto;">
        <h2 style="color: #4CAF50; border-bottom: 2px solid #4CAF50; padding-bottom: 10px;">Event Approved!</h2>
        <p>Hello <strong>${organizerName}</strong>,</p>
        <p>We are pleased to inform you that your proposed event <strong>${eventTitle}</strong> has been approved by the Faculty.</p>
        <p>Students can now register for the event on the portal.</p>
        <p style="color: #777; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 15px;">
          This is an automated notification. Please do not reply directly to this email.
        </p>
      </div>
    `,
  };

  console.log(`\n--- [SIMULATED APPROVAL EMAIL SENT] ---`);
  console.log(`To: ${email}`);
  console.log(`Organizer: ${organizerName}`);
  console.log(`Event: ${eventTitle}`);
  console.log(`---------------------------------------\n`);

  try {
    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (error) {
    console.warn(`Nodemailer connection warning: ${error.message}. Approval email logged to console.`);
    return { messageId: 'simulated-approval-id' };
  }
};

module.exports = {
  sendRegistrationEmail,
  sendApprovalEmail,
};
