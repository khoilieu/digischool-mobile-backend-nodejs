const express = require("express");
const router = express.Router();
const scheduleController = require("../controllers/schedule.controller");
const authMiddleware = require("../../auth/middleware/auth.middleware");
const scheduleValidation = require("../middleware/schedule.validation");
const lessonRequestRoutes = require("./lesson-request.routes");
const multer = require("multer");
const upload = multer({ dest: "/tmp/" }); // Thư mục tạm lưu file

router.use("/lesson-request", lessonRequestRoutes);

// Lấy danh sách năm học và tuần có sẵn trong database
router.get(
  "/available-academic-years-weeks",
  scheduleController.getAvailableAcademicYearsAndWeeks
);

router.use(authMiddleware.protect);

// Tạo thời khóa biểu tuần
router.post(
  "/create-weekly",
  authMiddleware.authorize("admin", "manager"),
  scheduleValidation.validateCreateSchedule(),
  scheduleController.createWeeklySchedule
);

// Lấy thời khóa biểu tuần cho học sinh
router.get(
  "/class/:className/:academicYear/:weekNumber",
  scheduleValidation.validateGetWeeklySchedule(),
  scheduleController.getWeeklySchedule
);

// Lấy thời khóa biểu tuần cho giáo viên
router.get(
  "/teacher/:teacherId/:academicYear/:weekNumber",
  authMiddleware.authorize("admin", "manager", "teacher"),
  scheduleValidation.validateGetTeacherSchedule(),
  scheduleController.getTeacherWeeklySchedule
);

// Lấy chi tiết tiết học
router.get(
  "/lesson/:lessonId",
  authMiddleware.authorize("admin", "manager", "teacher", "student"),
  scheduleValidation.validateGetLessonDetail(),
  scheduleController.getLessonDetail
);

// Lấy danh sách học sinh trong tiết học
router.get(
  "/lesson/:lessonId/students",
  authMiddleware.authorize("admin", "manager", "teacher"),
  scheduleValidation.validateGetLessonDetail(),
  scheduleController.getLessonStudents
);

// Gắn personal-activity routes
// router.use("/lesson/:lessonId/personal-activity", personalActivityRoutes);

// Cập nhật mô tả tiết học
router.patch(
  "/lessons/:lessonId/description",
  authMiddleware.authorize("admin", "manager", "teacher"),
  scheduleValidation.validateUpdateLessonDescription(),
  scheduleController.updateLessonDescription
);

// Xóa mô tả tiết học
router.delete(
  "/lessons/:lessonId/description",
  authMiddleware.authorize("admin", "manager", "teacher"),
  scheduleValidation.validateGetLessonDetail(),
  scheduleController.deleteLessonDescription
);

// Hoàn thành tiết học
router.patch(
  "/lesson/:lessonId/complete",
  authMiddleware.authorize("admin", "manager", "teacher"),
  scheduleValidation.validateGetLessonDetail(),
  scheduleController.completeLesson
);

router.post(
  "/import-excel",
  authMiddleware.authorize("admin", "manager"),
  upload.single("file"),
  scheduleValidation.validateImportExcel(),
  scheduleController.importScheduleFromExcel
);

module.exports = router;
