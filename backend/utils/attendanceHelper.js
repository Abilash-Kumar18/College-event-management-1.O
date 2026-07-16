const Attendance = require('../models/Attendance');

/**
 * Helper to record student attendance in the separate Attendance collection.
 * @param {string} eventId - ID of the event
 * @param {string} studentId - ID of the student
 * @param {boolean} isPresent - true to check-in, false to check-out (absent)
 * @param {string} markedById - ID of the user marking this attendance
 */
const recordAttendance = async (eventId, studentId, isPresent, markedById) => {
  try {
    let finalEventId = eventId;
    if (eventId && typeof eventId === 'object') {
      finalEventId = eventId._id || '507f1f77bcf86cd799439011';
    }

    let finalStudentId = studentId;
    if (studentId && typeof studentId === 'object') {
      finalStudentId = studentId._id || '507f1f77bcf86cd799439012';
    }

    let finalMarkedById = markedById;
    if (markedById && typeof markedById === 'object') {
      finalMarkedById = markedById._id || '507f1f77bcf86cd799439013';
    }

    let attendance = await Attendance.findOne({ eventId: finalEventId });
    if (!attendance) {
      attendance = new Attendance({
        eventId: finalEventId,
        presentStudents: [],
        absentStudents: [],
        markedBy: finalMarkedById || finalStudentId,
        takenAt: new Date()
      });
    }

    if (finalMarkedById) {
      attendance.markedBy = finalMarkedById;
    }

    if (isPresent) {
      // Add to presentStudents, remove from absentStudents
      attendance.absentStudents = attendance.absentStudents.filter(
        id => id && id.toString() !== finalStudentId.toString()
      );
      const alreadyPresent = attendance.presentStudents.some(
        item => item.studentId && item.studentId.toString() === finalStudentId.toString()
      );
      if (!alreadyPresent) {
        attendance.presentStudents.push({
          studentId: finalStudentId,
          scanTime: new Date()
        });
      }
    } else {
      // Remove from presentStudents, add to absentStudents
      attendance.presentStudents = attendance.presentStudents.filter(
        item => item.studentId && item.studentId.toString() !== finalStudentId.toString()
      );
      const alreadyAbsent = attendance.absentStudents.some(
        id => id && id.toString() === finalStudentId.toString()
      );
      if (!alreadyAbsent) {
        attendance.absentStudents.push(finalStudentId);
      }
    }

    await attendance.save();
  } catch (err) {
    console.error('Error recording attendance:', err.message);
  }
};

module.exports = {
  recordAttendance
};
