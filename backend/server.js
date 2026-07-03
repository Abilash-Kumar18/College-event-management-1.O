// Load environment variables FIRST before any other imports
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');

// ──────────────────────────────────────────────
// Guard: JWT_SECRET must be set in production
// ──────────────────────────────────────────────
if (!process.env.JWT_SECRET && process.env.NODE_ENV !== 'test') {
  console.error('FATAL ERROR: JWT_SECRET environment variable is not defined!');
  process.exit(1);
}

// ──────────────────────────────────────────────
// Database connection
// ──────────────────────────────────────────────
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(
      process.env.MONGO_URI || 'mongodb://localhost:27017/event_management'
    );
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const eventRoutes = require('./routes/eventRoutes');
const scanRoutes = require('./routes/scanRoutes');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const facultyRoutes = require('./routes/facultyRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const registrationRoutes = require('./routes/registrationRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const announcementRoutes = require('./routes/announcementRoutes');
const reportRoutes = require('./routes/reportRoutes');
const userRoutes = require('./routes/userRoutes');
const studentRoutes = require('./routes/studentRoutes');


// ──────────────────────────────────────────────
// App setup
// ──────────────────────────────────────────────
const app = express();

// Security headers
app.use(helmet());

// CORS — allow local dev on any port + production frontend
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5174',
  'https://team-2-frontend-pink.vercel.app',
];
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. curl, mobile apps)
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:')
      ) {
        return callback(null, true);
      }
      return callback(new Error(`CORS: Origin "${origin}" is not allowed.`));
    },
    credentials: true,
  })
);

// Body parsing
app.use(express.json());

// ──────────────────────────────────────────────
// Rate limiting (auth routes only)
// ──────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    message: 'Too many attempts from this IP, please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ──────────────────────────────────────────────
// API Routes
// ──────────────────────────────────────────────
app.use('/api/auth',    authLimiter, authRoutes);
app.use('/api/events',  eventRoutes);
app.use('/api/scan',    scanRoutes);
app.use('/api/admin',   adminRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);
app.use('/api/profile', userRoutes);
app.use('/api/student', studentRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'Event Management API is running.', status: 'ok' });
});

// ──────────────────────────────────────────────
// Error handling middlewares (must be last)
// ──────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ──────────────────────────────────────────────
// Start server
// ──────────────────────────────────────────────
if (require.main === module) {
  connectDB().then(() => {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(
        `Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`
      );
    });
  });
} else {
  // For test environments, connect separately
  connectDB();
}

module.exports = app;
