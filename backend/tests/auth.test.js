process.env.JWT_SECRET = process.env.JWT_SECRET || 'testsecretkey123';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Define realistic 24-character hex MongoDB ObjectIds
const mockAdminId = '507f1f77bcf86cd799439011';
const mockFacultyId = '507f1f77bcf86cd799439012';
const mockStudentId = '507f1f77bcf86cd799439013';
const mockOrganizerId = '507f1f77bcf86cd799439014';

jest.mock('mongoose', () => {
  const actualMongoose = jest.requireActual('mongoose');
  actualMongoose.set('autoIndex', false);
  actualMongoose.connect = jest.fn().mockResolvedValue(actualMongoose);
  actualMongoose.connection.close = jest.fn().mockResolvedValue(true);
  return actualMongoose;
});

// Mock the User model specifically so that DB queries are intercepted
jest.mock('../models/User', () => {
  const createQueryMock = (val) => ({
    select: jest.fn().mockReturnValue({
      then: (onFulfilled) => Promise.resolve(val).then(onFulfilled),
    }),
    then: (onFulfilled) => Promise.resolve(val).then(onFulfilled),
  });

  const mockSave = jest.fn().mockResolvedValue(true);
  const mockMatchPassword = jest.fn();

  const MockUserModel = jest.fn().mockImplementation((data) => {
    return {
      ...data,
      save: mockSave,
      matchPassword: mockMatchPassword,
    };
  });

  MockUserModel.findOne = jest.fn();
  MockUserModel.create = jest.fn();
  
  // Default mock findById returning correct roles based on Mock IDs
  MockUserModel.findById = jest.fn().mockImplementation((id) => {
    const userObj = {
      _id: id,
      role: id === '507f1f77bcf86cd799439011' ? 'admin' : (id === '507f1f77bcf86cd799439012' ? 'faculty' : 'student'),
      name: 'Mock User',
      email: 'mock@college.edu',
      isApproved: true,
    };
    return createQueryMock(userObj);
  });
  
  MockUserModel.schema = { paths: {} };
  MockUserModel.createQueryMock = createQueryMock;

  return MockUserModel;
});

// Mock nodemailer to make sendMail return immediately
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'mock-message-id' }),
  }),
}));

// Import app and User model after mocking Mongoose connection
const app = require('../server');
const User = require('../models/User');

// Mock bcryptjs to verify timing comparison behaviors
jest.mock('bcryptjs', () => ({
  compare: jest.fn().mockImplementation((entered, hashed) => {
    if (entered === 'studentPassword123' && hashed === 'hashed_pwd') {
      return Promise.resolve(true);
    }
    return Promise.resolve(false);
  }),
  genSalt: jest.fn().mockResolvedValue('mock_salt'),
  hash: jest.fn().mockResolvedValue('mock_hash'),
}));

// Generate valid JWT tokens for tests
const jwtSecret = process.env.JWT_SECRET || 'fallbacksecret';
const adminToken = jwt.sign({ id: mockAdminId, role: 'admin' }, jwtSecret);
const facultyToken = jwt.sign({ id: mockFacultyId, role: 'faculty' }, jwtSecret);
const studentToken = jwt.sign({ id: mockStudentId, role: 'student' }, jwtSecret);

describe('College Event Management Auth System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Student Registration', () => {
    it('should successfully register a student with correct details and automatically approve', async () => {
      User.findOne.mockResolvedValue(null);
      User.create.mockResolvedValue({
        _id: mockStudentId,
        role: 'student',
        name: 'John Doe',
        email: 'student@gmail.com',
        mobileNumber: '9876543210',
        regNo: 'STU12345',
        deptYear: 'CSE-3rd',
        isApproved: true,
      });

      const res = await request(app)
        .post('/api/auth/register/student')
        .send({
          name: 'John Doe',
          regNo: 'STU12345',
          deptYear: 'CSE-3rd',
          email: 'student@gmail.com',
          mobileNumber: '9876543210',
          password: 'SecurePassword@123'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.role).toBe('student');
      expect(res.body.user.isApproved).toBe(true);
      expect(User.findOne).toHaveBeenCalledWith({ email: 'student@gmail.com' });
      expect(User.create).toHaveBeenCalledWith(expect.objectContaining({
        role: 'student',
        email: 'student@gmail.com',
        regNo: 'STU12345',
      }));
    });

    it('should fail registration if required student fields are missing', async () => {
      const res = await request(app)
        .post('/api/auth/register/student')
        .send({
          name: 'John Doe',
          email: 'student@gmail.com',
          password: 'SecurePassword@123'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('Please fill in all required fields');
    });

    it('should fail registration if name contains digits', async () => {
      const res = await request(app)
        .post('/api/auth/register/student')
        .send({
          name: 'John Doe123',
          regNo: 'STU12345',
          deptYear: 'CSE-3rd',
          email: 'student@gmail.com',
          mobileNumber: '9876543210',
          password: 'SecurePassword@123'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('Name must contain only alphabets and spaces.');
    });

    it('should fail registration if email domain is not allowed', async () => {
      const res = await request(app)
        .post('/api/auth/register/student')
        .send({
          name: 'John Doe',
          regNo: 'STU12345',
          deptYear: 'CSE-3rd',
          email: 'student@invalid.com',
          mobileNumber: '9876543210',
          password: 'SecurePassword@123'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('Email address must end with @gmail.com or @ksrce.ac.in.');
    });

    it('should fail registration if password does not meet advanced requirements', async () => {
      const res = await request(app)
        .post('/api/auth/register/student')
        .send({
          name: 'John Doe',
          regNo: 'STU12345',
          deptYear: 'CSE-3rd',
          email: 'student@gmail.com',
          mobileNumber: '9876543210',
          password: 'weak'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('Password must be at least 8 characters long');
    });

    it('should fail registration if mobile is not 10 digits', async () => {
      const res = await request(app)
        .post('/api/auth/register/student')
        .send({
          name: 'John Doe',
          regNo: 'STU12345',
          deptYear: 'CSE-3rd',
          email: 'student@gmail.com',
          mobileNumber: '98765432',
          password: 'SecurePassword@123'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('Mobile number must be a valid 10-digit number with optional +91 prefix.');
    });
  });

  

  describe('NoSQL Injection Prevention', () => {
    it('should reject requests with object query injection attempts in email/password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: { $gt: '' },
          password: 'SecurePassword@123',
          role: 'student'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('Invalid input types');
    });
  });

  describe('Unified Login & Password Timing Attack Prevention', () => {
    it('should login student and return token', async () => {
      User.findOne.mockResolvedValue({
        _id: mockStudentId,
        role: 'student',
        email: 'john@college.edu',
        password: 'hashed_pwd',
        name: 'John Student',
        isApproved: true,
        matchPassword: jest.fn().mockResolvedValue(true),
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'john@college.edu',
          password: 'studentPassword123',
          role: 'student'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
    });

    

    it('should trigger dummy comparison and return 401 when user is not found', async () => {
      User.findOne.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@college.edu',
          password: 'somePassword',
          role: 'student'
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toContain('Invalid email, password, or role');
      
      // Verify bcrypt.compare was called to match the timing
      expect(bcrypt.compare).toHaveBeenCalled();
    });
  });

  describe('Faculty & Admin Management Flow', () => {
    it('should allow admin to create a faculty account', async () => {
      User.findById.mockReturnValue(User.createQueryMock({
        _id: mockAdminId,
        role: 'admin',
        name: 'System Admin',
      }));

      User.findOne.mockResolvedValue(null);
      User.create.mockResolvedValue({
        _id: mockFacultyId,
        role: 'faculty',
        email: 'smith@college.edu',
        name: 'Dr. Smith',
        isApproved: true,
      });

      const res = await request(app)
        .post('/api/admin/create-faculty')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Dr. Smith',
          email: 'smith@college.edu',
          password: 'FacultyPassword@123'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.user.role).toBe('faculty');
    });

    it('should prevent non-admins from creating a faculty account', async () => {
      User.findById.mockReturnValue(User.createQueryMock({
        _id: mockStudentId,
        role: 'student',
        name: 'John Student',
      }));

      const res = await request(app)
        .post('/api/admin/create-faculty')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          name: 'Dr. Smith',
          email: 'smith@college.edu',
          password: 'FacultyPassword@123'
        });

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toContain('is not authorized to access this resource');
    });

    
  });

  describe('Forgot Password Flow', () => {
    it('should run full forgot-password, verify-otp, and reset-password flow', async () => {
      const mockSave = jest.fn().mockResolvedValue(true);
      const mockUser = {
        _id: 'forgot_user_id',
        role: 'student',
        email: 'forgot@college.edu',
        resetPasswordOtp: '1234',
        resetPasswordExpires: Date.now() + 100000,
        save: mockSave,
      };

      User.findOne.mockResolvedValue(mockUser);

      // 1. Forgot password
      const forgotRes = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'forgot@college.edu' });

      expect(forgotRes.statusCode).toBe(200);
      expect(forgotRes.body.success).toBe(true);
      expect(mockUser.resetPasswordOtp).toBeDefined();
      expect(mockUser.resetPasswordExpires).toBeDefined();
      expect(mockSave).toHaveBeenCalled();

      // 2. Verify OTP
      const verifyRes = await request(app)
        .post('/api/auth/verify-otp')
        .send({
          email: 'forgot@college.edu',
          otp: mockUser.resetPasswordOtp,
        });

      expect(verifyRes.statusCode).toBe(200);
      expect(verifyRes.body.success).toBe(true);
      expect(verifyRes.body.tempToken).toBeDefined();

      // 3. Reset password
      const resetRes = await request(app)
        .post('/api/auth/reset-password')
        .send({
          email: 'forgot@college.edu',
          otp: mockUser.resetPasswordOtp,
          newPassword: 'NewShinyPassword@123'
        });

      expect(resetRes.statusCode).toBe(200);
      expect(resetRes.body.success).toBe(true);
      expect(mockUser.password).toBe('NewShinyPassword@123');
      expect(mockUser.resetPasswordOtp).toBeUndefined();
      expect(mockUser.resetPasswordExpires).toBeUndefined();
    });
  });
});
