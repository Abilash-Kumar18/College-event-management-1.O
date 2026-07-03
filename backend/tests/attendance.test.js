process.env.JWT_SECRET = process.env.JWT_SECRET || 'testsecretkey123';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const jwt = require('jsonwebtoken');

// Define realistic ObjectIds
const mockFacultyId = '507f1f77bcf86cd799439012';
const mockStudentId = '507f1f77bcf86cd799439013';
const mockEventId = '507f1f77bcf86cd799439015';
const mockRegistrationId = '507f1f77bcf86cd799439016';

jest.mock('mongoose', () => {
  const actualMongoose = jest.requireActual('mongoose');
  actualMongoose.set('autoIndex', false);
  actualMongoose.connect = jest.fn().mockResolvedValue(actualMongoose);
  actualMongoose.connection.close = jest.fn().mockResolvedValue(true);
  return actualMongoose;
});

jest.mock('../models/User', () => {
  const mockFindById = jest.fn();
  const MockUserModel = jest.fn();
  MockUserModel.findById = mockFindById;
  return MockUserModel;
});

jest.mock('../models/Event', () => {
  const mockFindById = jest.fn();
  const MockEventModel = jest.fn();
  MockEventModel.findById = mockFindById;
  return MockEventModel;
});

jest.mock('../models/Registration', () => {
  const mockFind = jest.fn();
  const mockFindOne = jest.fn();
  const MockRegistrationModel = jest.fn();
  MockRegistrationModel.find = mockFind;
  MockRegistrationModel.findOne = mockFindOne;
  return MockRegistrationModel;
});

const User = require('../models/User');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const app = require('../server');

const createQueryMock = (val) => ({
  select: jest.fn().mockReturnThis(),
  populate: jest.fn().mockReturnThis(),
  then: (onFulfilled) => Promise.resolve(val).then(onFulfilled),
});

const jwtSecret = process.env.JWT_SECRET || 'fallbacksecret';
const facultyToken = jwt.sign({ id: mockFacultyId, role: 'faculty' }, jwtSecret);
const studentToken = jwt.sign({ id: mockStudentId, role: 'student' }, jwtSecret);

describe('Attendance Check-in Scan APIs', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    User.findById.mockImplementation((id) => {
      const role = id === mockFacultyId ? 'faculty' : 'student';
      return createQueryMock({
        _id: id,
        name: 'John Doe',
        role,
        isApproved: true,
      });
    });
  });

  describe('Faculty QR Pass Scanner', () => {
    it('POST /api/faculty/attendance/scan should check-in student via qrCodeId', async () => {
      const mockReg = {
        _id: mockRegistrationId,
        studentId: {
          name: 'Scanned Student',
          regNo: 'STU111',
          deptYear: 'CSE-3rd'
        },
        eventId: {
          title: 'Symposium 2026',
          dateTime: new Date()
        },
        status: 'Registered',
        points: 0,
        save: jest.fn().mockImplementation(function() { return Promise.resolve(this); })
      };

      Registration.findOne.mockReturnValue(createQueryMock(mockReg));

      const res = await request(app)
        .post('/api/faculty/attendance/scan')
        .set('Authorization', `Bearer ${facultyToken}`)
        .send({ qrCodeId: 'mock-uuid-1234' });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.student.name).toBe('Scanned Student');
      expect(mockReg.status).toBe('Checked-in');
      expect(mockReg.save).toHaveBeenCalled();
    });

    it('POST /api/faculty/attendance/scan should return 404 if qrCodeId is invalid', async () => {
      Registration.findOne.mockReturnValue(createQueryMock(null));

      const res = await request(app)
        .post('/api/faculty/attendance/scan')
        .set('Authorization', `Bearer ${facultyToken}`)
        .send({ qrCodeId: 'nonexistent-uuid' });

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toContain('Invalid QR code');
    });

    it('POST /api/faculty/attendance/scan should fail check-in if event date is not today', async () => {
      const mockReg = {
        _id: mockRegistrationId,
        studentId: { name: 'Scanned Student' },
        eventId: {
          title: 'Symposium 2026',
          dateTime: new Date(Date.now() + 86400000) // tomorrow!
        },
        status: 'Registered',
        points: 0,
      };

      Registration.findOne.mockReturnValue(createQueryMock(mockReg));

      const res = await request(app)
        .post('/api/faculty/attendance/scan')
        .set('Authorization', `Bearer ${facultyToken}`)
        .send({ qrCodeId: 'mock-uuid-1234' });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('Attendance check-in is only allowed on the day of the event');
    });
  });

  describe('Student Self Check-in', () => {
    it('POST /api/student/attendance/self-scan should allow self check-in by eventId', async () => {
      const mockReg = {
        _id: mockRegistrationId,
        studentId: mockStudentId,
        eventId: mockEventId,
        status: 'Registered',
        points: 0,
        save: jest.fn().mockImplementation(function() { return Promise.resolve(this); })
      };

      Event.findById.mockResolvedValue({
        _id: mockEventId,
        title: 'Symposium 2026',
        dateTime: new Date() // today!
      });

      Registration.findOne.mockResolvedValue(mockReg);

      const res = await request(app)
        .post('/api/student/attendance/self-scan')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ eventId: mockEventId });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Successfully checked-in');
      expect(mockReg.status).toBe('Checked-in');
      expect(mockReg.save).toHaveBeenCalled();
    });
  });
});
