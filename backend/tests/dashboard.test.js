process.env.JWT_SECRET = process.env.JWT_SECRET || 'testsecretkey123';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const jwt = require('jsonwebtoken');

// Define realistic 24-character hex MongoDB ObjectIds
const mockAdminId = '507f1f77bcf86cd799439011';
const mockFacultyId = '507f1f77bcf86cd799439012';
const mockStudentId = '507f1f77bcf86cd799439013';
const mockOrganizerId = '507f1f77bcf86cd799439014';
const mockEventId = '507f1f77bcf86cd799439015';
const mockRegistrationId = '507f1f77bcf86cd799439016';
const mockCertificateId = '507f1f77bcf86cd799439017';

jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'mock-message-id' }),
  }),
}));

jest.mock('mongoose', () => {
  const actualMongoose = jest.requireActual('mongoose');
  actualMongoose.set('autoIndex', false);
  actualMongoose.connect = jest.fn().mockResolvedValue(actualMongoose);
  actualMongoose.connection.close = jest.fn().mockResolvedValue(true);
  return actualMongoose;
});

// Mock the models
jest.mock('../models/User', () => {
  const mockFindById = jest.fn();
  const mockFindOne = jest.fn();
  const mockFind = jest.fn();
  
  const MockUserModel = jest.fn().mockImplementation((data) => ({
    ...data,
    save: jest.fn().mockResolvedValue({ ...data, _id: mockStudentId }),
  }));

  MockUserModel.findById = mockFindById;
  MockUserModel.findOne = mockFindOne;
  MockUserModel.find = mockFind;

  return MockUserModel;
});

jest.mock('../models/Event', () => {
  const mockFind = jest.fn();
  const mockFindById = jest.fn();
  const mockCountDocuments = jest.fn();

  const MockEventModel = jest.fn().mockImplementation((data) => ({
    ...data,
    save: jest.fn().mockResolvedValue({ ...data, _id: mockEventId }),
  }));

  MockEventModel.find = mockFind;
  MockEventModel.findById = mockFindById;
  MockEventModel.countDocuments = mockCountDocuments;

  return MockEventModel;
});

jest.mock('../models/Registration', () => {
  const mockFind = jest.fn();
  const mockFindOne = jest.fn();
  const mockCountDocuments = jest.fn();
  const mockFindById = jest.fn();

  const MockRegistrationModel = jest.fn().mockImplementation((data) => ({
    ...data,
    save: jest.fn().mockResolvedValue({ ...data, _id: mockRegistrationId }),
  }));

  MockRegistrationModel.find = mockFind;
  MockRegistrationModel.findOne = mockFindOne;
  MockRegistrationModel.countDocuments = mockCountDocuments;
  MockRegistrationModel.findById = mockFindById;

  return MockRegistrationModel;
});

jest.mock('../models/Announcement', () => {
  const mockFind = jest.fn();
  const MockAnnouncementModel = jest.fn().mockImplementation((data) => ({
    ...data,
    save: jest.fn().mockResolvedValue({ ...data, _id: 'mockAnnId' }),
  }));

  MockAnnouncementModel.find = mockFind;

  return MockAnnouncementModel;
});

jest.mock('../models/Certificate', () => {
  const mockFind = jest.fn();
  const MockCertificateModel = jest.fn().mockImplementation((data) => ({
    ...data,
    save: jest.fn().mockResolvedValue({ ...data, _id: mockCertificateId }),
  }));

  MockCertificateModel.find = mockFind;

  return MockCertificateModel;
});

const User = require('../models/User');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Announcement = require('../models/Announcement');
const Certificate = require('../models/Certificate');
const app = require('../server');

const createQueryMock = (val) => ({
  select: jest.fn().mockReturnThis(),
  populate: jest.fn().mockReturnThis(),
  sort: jest.fn().mockImplementation(function() { return this; }),
  then: (onFulfilled) => Promise.resolve(val).then(onFulfilled),
});

const jwtSecret = process.env.JWT_SECRET || 'fallbacksecret';
const adminToken = jwt.sign({ id: mockAdminId, role: 'admin' }, jwtSecret);
const facultyToken = jwt.sign({ id: mockFacultyId, role: 'faculty' }, jwtSecret);
const studentToken = jwt.sign({ id: mockStudentId, role: 'student' }, jwtSecret);
const organizerToken = jwt.sign({ id: mockOrganizerId, role: 'organizer' }, jwtSecret);

describe('Dashboard Integration Test Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    User.findById.mockImplementation((id) => {
      const role = id === mockAdminId ? 'admin' : (id === mockFacultyId ? 'faculty' : (id === mockOrganizerId ? 'organizer' : 'student'));
      return createQueryMock({
        _id: id,
        name: 'Test User',
        email: 'test@college.edu',
        role,
        isApproved: true,
      });
    });
  });

  describe('Student Dashboard APIs', () => {
    it('GET /api/student/dashboard should return student stats counts', async () => {
      Registration.countDocuments.mockResolvedValueOnce(3); // registered
      Registration.countDocuments.mockResolvedValueOnce(1); // checked-in
      Registration.countDocuments.mockResolvedValueOnce(0); // pending
      Event.countDocuments.mockResolvedValueOnce(5); // upcoming events

      const res = await request(app)
        .get('/api/student/dashboard')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.stats.registered).toBe(3);
      expect(res.body.stats.attendance).toBe(1);
      expect(res.body.stats.pending).toBe(0);
      expect(res.body.stats.upcoming).toBe(5);
    });

    it('GET /api/student/events should return approved and upcoming events', async () => {
      Event.find.mockReturnValue(createQueryMock([
        { _id: mockEventId, title: 'Verve 2026', status: 'Approved' }
      ]));

      const res = await request(app)
        .get('/api/student/events')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].title).toBe('Verve 2026');
    });

    it('POST /api/student/events/:eventId/register should generate unique qrCodeId UUID', async () => {
      Event.findById.mockResolvedValue({
        _id: mockEventId,
        status: 'Approved',
        maxParticipants: 100,
      });
      Registration.findOne.mockResolvedValue(null);
      Registration.countDocuments.mockResolvedValue(10);

      const res = await request(app)
        .post(`/api/student/events/${mockEventId}/register`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.sixDigitId).toBeDefined();
      expect(res.body.sixDigitId).toMatch(/^\d{6}$/);
    });

    it('GET /api/student/registrations should return registrations with populated events', async () => {
      Registration.find.mockReturnValue(createQueryMock([
        {
          _id: mockRegistrationId,
          studentId: mockStudentId,
          qrCodeId: 'test-uuid-pass',
          toObject: function() { return this; }
        }
      ]));

      const res = await request(app)
        .get('/api/student/registrations')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].qrCodeId).toBeUndefined();
    });

    it('GET /api/student/certificates should fetch student certificates', async () => {
      Certificate.find.mockReturnValue(createQueryMock([
        { _id: mockCertificateId, studentId: mockStudentId, type: 'Participation' }
      ]));

      const res = await request(app)
        .get('/api/student/certificates')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].type).toBe('Participation');
    });

    it('GET /api/student/calendar should return upcoming calendar events', async () => {
      Event.find.mockReturnValue(createQueryMock([
        { title: 'Tech Expo', dateTime: new Date() }
      ]));

      const res = await request(app)
        .get('/api/student/calendar')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].title).toBe('Tech Expo');
    });
  });

  describe('Faculty Dashboard APIs', () => {
    it('GET /api/faculty/dashboard should return aggregate faculty metrics', async () => {
      Event.countDocuments.mockResolvedValueOnce(10); // totalEvents
      Registration.countDocuments.mockResolvedValueOnce(45); // totalRegistrations
      Event.countDocuments.mockResolvedValueOnce(3); // pendingApprovals
      Registration.countDocuments.mockResolvedValueOnce(20); // totalCheckIns

      const res = await request(app)
        .get('/api/faculty/dashboard')
        .set('Authorization', `Bearer ${facultyToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.stats.totalEvents).toBe(10);
      expect(res.body.stats.totalRegistrations).toBe(45);
      expect(res.body.stats.pendingApprovals).toBe(3);
      expect(res.body.stats.totalCheckIns).toBe(20);
    });

    it('GET /api/faculty/events/pending should fetch events awaiting approval', async () => {
      Event.find.mockReturnValue(createQueryMock([
        { _id: mockEventId, title: 'Verve 2026', status: 'Pending Review' }
      ]));

      const res = await request(app)
        .get('/api/faculty/events/pending')
        .set('Authorization', `Bearer ${facultyToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].status).toBe('Pending Review');
    });

    it('PUT /api/faculty/events/:eventId/status should update status to Approved or Rejected', async () => {
      const mockEvent = {
        _id: mockEventId,
        requestedFaculty: mockFacultyId,
        status: 'Pending Review',
        save: jest.fn().mockImplementation(function() { return Promise.resolve(this); })
      };
      Event.findById.mockResolvedValue(mockEvent);

      const res = await request(app)
        .put(`/api/faculty/events/${mockEventId}/status`)
        .set('Authorization', `Bearer ${facultyToken}`)
        .send({ status: 'Approved' });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.event.status).toBe('Approved');
    });

    it('GET /api/faculty/events/:eventId/registrations should retrieve list of registered students', async () => {
      Event.findById.mockResolvedValue({ _id: mockEventId });
      Registration.find.mockReturnValue(createQueryMock([
        { studentId: mockStudentId, eventId: mockEventId }
      ]));

      const res = await request(app)
        .get(`/api/faculty/events/${mockEventId}/registrations`)
        .set('Authorization', `Bearer ${facultyToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.length).toBe(1);
    });

    it('GET /api/faculty/reports should return attendance percentages', async () => {
      Event.find.mockReturnValue(createQueryMock([{ _id: mockEventId }]));
      Registration.countDocuments.mockResolvedValueOnce(50); // totalRegistrations
      Registration.countDocuments.mockResolvedValueOnce(40); // totalPresent

      const res = await request(app)
        .get('/api/faculty/reports')
        .set('Authorization', `Bearer ${facultyToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.reports.totalRegistrations).toBe(50);
      expect(res.body.reports.totalPresent).toBe(40);
      expect(res.body.reports.attendanceRate).toBe(80.00);
    });
  });
});
