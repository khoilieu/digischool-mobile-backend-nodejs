const express = require("express");
const router = express.Router();
const lessonRequestRoutes = require("../modules/schedules/routes/lesson-request.routes");
const authRoutes = require("../modules/auth/routes/auth.routes");
const userRoutes = require("../modules/user/routes/user.routes");
const subjectRoutes = require("../modules/subjects/routes/subject.routes");
const classRoutes = require("../modules/classes/routes/class.routes");
const scheduleRoutes = require("../modules/schedules/routes/schedule.routes");
const studentEvaluationRoutes = require("../modules/schedules/routes/student-evaluation.routes");
const teacherEvaluationRoutes = require("../modules/schedules/routes/teacher-evaluation.routes");
const testInfoRoutes = require("../modules/schedules/routes/test-info.routes");
const studentLeaveRequestRoutes = require("../modules/leave-requests/routes/student-leave-request.routes");
const teacherLeaveRequestRoutes = require("../modules/leave-requests/routes/teacher-leave-request.routes");

const noteRoutes = require("../modules/note/routes/note.routes");
const newsRoutes = require("../modules/news/routes/news.routes");
const chatRoutes = require("../modules/chat/routes/chat.routes");
const notificationRoutes = require("../modules/notification/routes/notification.routes");
const personalActivityRoutes = require("../modules/schedules/routes/personal-activity.routes");
const parentRoutes = require("../modules/parents/routes/parent.routes");
const statisticsRoutes = require("../modules/statistics/routes/statistics.routes");
const pushRoutes = require("../modules/push/routes/push.routes");

// Health check route
router.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", message: "Server is healthy" });
});

// /api/auth
router.use("/auth", authRoutes);
// /api/users
router.use("/users", userRoutes);
// /api/subjects
router.use("/subjects", subjectRoutes);
// /api/classes
router.use("/classes", classRoutes);
// /api/schedules
router.use("/schedules", scheduleRoutes);
// /api/student-evaluations
router.use("/student-evaluations", studentEvaluationRoutes);
// /api/teacher-evaluations
router.use("/teacher-evaluations", teacherEvaluationRoutes);
// /api/test-infos
router.use("/test-infos", testInfoRoutes);
// /api/student-leave-requests
router.use("/student-leave-requests", studentLeaveRequestRoutes);
// /api/teacher-leave-requests
router.use("/teacher-leave-requests", teacherLeaveRequestRoutes);
// /api/notes
router.use("/notes", noteRoutes);
// /api/news
router.use("/news", newsRoutes);
router.use("/chat", chatRoutes);
// /api/notifications
router.use("/notifications", notificationRoutes);
// /api/personal-activities
router.use("/personal-activity", personalActivityRoutes);
// /api/parents
router.use("/parents", parentRoutes);
// /api/statistics
router.use("/statistics", statisticsRoutes);
// /api/push
router.use("/push", pushRoutes);

module.exports = router;
