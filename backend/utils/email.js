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

  const frontendUrl = process.env.FRONTEND_URL || 'https://team2-event-management.vercel.app';
  const attendanceLink = `${frontendUrl}/login`;

  const mailOptions = {
    from: `"${fromName}" <${fromEmail}>`,
    to: email,
    subject: `Event Registration Confirmed: ${eventTitle}`,
    text: `Hello ${studentName},\n\nYour registration for the event "${eventTitle}" is confirmed.\n\nDetails:\n- Date: ${formattedDate}\n- Venue: ${eventVenue}\n- Your Unique Ticket ID: ${sixDigitId}\n\nTo scan the attendance on the event day, log in and use our scanning portal: ${attendanceLink}\n\nThank you for registering!`,
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

        <p>To record your attendance on the event day, log in and use our scanning portal:</p>
        <div style="margin: 15px 0;">
          <a href="${attendanceLink}" style="padding: 10px 15px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">Go to Attendance Scanner</a>
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
  console.log(`Attendance Scanner Link: ${attendanceLink}`);
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

const sendFacultyAccountEmail = async (email, facultyName, password, loginLink) => {
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
    subject: `Faculty Account Created - College Event Management`,
    text: `Hello ${facultyName},\n\nYour faculty account has been created successfully.\n\nCredentials:\n- Email: ${email}\n- Password: ${password}\n\nYou can log in here: ${loginLink}\n\nBest regards,\nCollege Event Management`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 5px; max-width: 600px; margin: auto;">
        <h2 style="color: #2196F3; border-bottom: 2px solid #2196F3; padding-bottom: 10px;">Faculty Account Created</h2>
        <p>Hello <strong>${facultyName}</strong>,</p>
        <p>Your faculty account has been created successfully. You can log in using the credentials below:</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
          <p style="margin: 5px 0;"><strong>Password:</strong> ${password}</p>
        </div>

        <p>Login to your portal here:</p>
        <div style="margin: 20px 0;">
          <a href="${loginLink}" style="padding: 10px 20px; background-color: #2196F3; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">Login to Portal</a>
        </div>

        <p style="color: #777; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 15px;">
          This is an automated notification. Please change your password after logging in.
        </p>
      </div>
    `,
  };

  console.log(`\n--- [SIMULATED FACULTY ACCOUNT EMAIL SENT] ---`);
  console.log(`To: ${email}`);
  console.log(`Faculty: ${facultyName}`);
  console.log(`Password: ${password}`);
  console.log(`Login Link: ${loginLink}`);
  console.log(`----------------------------------------------\n`);

  try {
    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (error) {
    console.warn(`Nodemailer connection warning: ${error.message}. Faculty email logged to console.`);
    return { messageId: 'simulated-faculty-acct-id' };
  }
};

const sendPendingApprovalEmail = async (email, studentName, eventTitle) => {
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
    subject: `Event Registration Pending Approval: ${eventTitle}`,
    text: `Hello ${studentName},\n\nYour registration for the event "${eventTitle}" has been received and is waiting for approval.\n\nOnce the host/faculty approves your registration, we will send you a confirmation email with your ticket and attendance details.\n\nBest regards,\nCollege Event Management`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 5px; max-width: 600px; margin: auto;">
        <h2 style="color: #FF9800; border-bottom: 2px solid #FF9800; padding-bottom: 10px;">Registration Pending Approval</h2>
        <p>Hello <strong>${studentName}</strong>,</p>
        <p>Your registration for the event <strong>${eventTitle}</strong> is currently pending approval.</p>
        <p>Once the host/faculty verifies your details and payment (if applicable), you will receive a confirmation email with your ticket and attendance scanning details.</p>
        <p style="color: #777; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 15px;">
          This is an automated notification. Please do not reply directly to this email.
        </p>
      </div>
    `,
  };

  console.log(`\n--- [SIMULATED PENDING REGISTRATION EMAIL SENT] ---`);
  console.log(`To: ${email}`);
  console.log(`Student: ${studentName}`);
  console.log(`Event: ${eventTitle}`);
  console.log(`--------------------------------------------------\n`);

  try {
    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (error) {
    console.warn(`Nodemailer connection warning: ${error.message}. Pending registration email logged to console.`);
    return { messageId: 'simulated-pending-reg-id' };
  }
};

const sendFacultyPendingApprovalEmail = async (facultyEmail, facultyName, studentName, eventTitle) => {
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
    to: facultyEmail,
    subject: `Pending Student Registration Approval: ${eventTitle}`,
    text: `Hello ${facultyName},\n\nA student registration is pending approval for your event "${eventTitle}".\n\nStudent Name: ${studentName}\n\nPlease log in to the dashboard to review and approve the registration.\n\nBest regards,\nCollege Event Management`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px;">
        <h2 style="color: #2b6cb0; margin-top: 0;">Registration Approval Pending</h2>
        <p>Dear ${facultyName},</p>
        <p>A student registration for your event is currently pending approval.</p>
        <div style="background-color: #f7fafc; border-left: 4px solid #2b6cb0; padding: 16px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; font-weight: bold;">Student Name: ${studentName}</p>
          <p style="margin: 4px 0 0 0; font-weight: bold;">Event: ${eventTitle}</p>
        </div>
        <p>Please log in to the Event Management portal to review the registration details.</p>
        <a href="${process.env.FRONTEND_URL || 'https://team2-event-management.vercel.app'}/login" 
           style="display: inline-block; background-color: #2b6cb0; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 5px; font-weight: bold; margin-top: 10px;">
          Log In to Dashboard
        </a>
        <p style="margin-top: 24px; font-size: 12px; color: #718096; border-top: 1px solid #e2e8f0; padding-top: 16px;">
          This is an automated notification from K.S.R College Of Engineering Event Management.
        </p>
      </div>
    `,
  };

  console.log(`\n--- [SIMULATED PENDING FACULTY EMAIL SENT] ---`);
  console.log(`To: ${facultyEmail}`);
  console.log(`Faculty: ${facultyName}`);
  console.log(`Student: ${studentName}`);
  console.log(`Event: ${eventTitle}`);
  console.log(`----------------------------------------------\n`);

  try {
    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (error) {
    console.warn(`Nodemailer connection warning: ${error.message}. Faculty pending email logged to console.`);
    return { messageId: 'simulated-faculty-pending-id' };
  }
};

module.exports = {
  sendRegistrationEmail,
  sendApprovalEmail,
  sendFacultyAccountEmail,
  sendPendingApprovalEmail,
  sendFacultyPendingApprovalEmail,
};
