const express = require('express');
const router = express.Router();
const courseRoutes = require('../modules/courses/routes/course.routes');
const authRoutes = require('../modules/auth/routes/auth.routes');
const userRoutes = require('../modules/user/routes/user.routes');
const subjectRoutes = require('../modules/subjects/routes/subject.routes');
const classRoutes = require('../modules/classes/routes/class.routes');
const scheduleRoutes = require('../modules/schedules/routes/schedule.routes');
const leaveRequestRoutes = require('../modules/leave-requests/routes/leave-request.routes');

// Health check route
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is healthy' });
});

// Auth routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
// Course routes
router.use('/courses', courseRoutes);
// Subject routes
router.use('/subjects', subjectRoutes);
// Class routes
router.use('/classes', classRoutes);
// Schedule routes
router.use('/schedules', scheduleRoutes);
// Leave request routes
router.use('/leave-requests', leaveRequestRoutes);

// Import and use other route modules here
// Example: router.use('/users', require('./userRoutes'));

module.exports = router; 