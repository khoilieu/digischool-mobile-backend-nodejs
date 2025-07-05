const express = require("express");
const router = express.Router();
const lessonRequestRoutes = require('../modules/schedules/routes/lesson-request.routes');
const courseRoutes = require("../modules/courses/routes/course.routes");
const authRoutes = require("../modules/auth/routes/auth.routes");
const userRoutes = require("../modules/user/routes/user.routes");
const subjectRoutes = require("../modules/subjects/routes/subject.routes");
const classRoutes = require("../modules/classes/routes/class.routes");
const scheduleRoutes = require("../modules/schedules/routes/schedule.routes");
const studentEvaluationRoutes = require("../modules/schedules/routes/student-evaluation.routes");
const teacherEvaluationRoutes = require("../modules/schedules/routes/teacher-evaluation.routes");
const testInfoRoutes = require("../modules/schedules/routes/test-info.routes");
const leaveRequestRoutes = require("../modules/leave-requests/routes/leave-request.routes");
const teacherLeaveRequestRoutes = require("../modules/leave-requests/routes/teacher-leave-request.routes");


// Health check route
router.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", message: "Server is healthy" });
});

// Auth routes
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
// Course routes
router.use("/courses", courseRoutes);
// Subject routes
router.use("/subjects", subjectRoutes);
// Class routes
router.use("/classes", classRoutes);
// Schedule routes
router.use("/schedules", scheduleRoutes);
// Student evaluation routes
router.use("/student-evaluations", studentEvaluationRoutes);
// Teacher evaluation routes
router.use("/teacher-evaluations", teacherEvaluationRoutes);
// Test info routes
router.use("/test-infos", testInfoRoutes);
// Leave request routes
router.use("/leave-requests", leaveRequestRoutes);
// Teacher leave request routes

router.use('/teacher-leave-requests', teacherLeaveRequestRoutes);
// Lesson request routes (swap/makeup)
router.use('/lesson-requests', lessonRequestRoutes);


// Import and use other route modules here
// Example: router.use('/users', require('./userRoutes'));

module.exports = router;
