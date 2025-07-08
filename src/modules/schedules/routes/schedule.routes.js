const express = require("express");
const router = express.Router();
const scheduleController = require("../controllers/schedule.controller");
const authMiddleware = require("../../auth/middleware/auth.middleware");
const scheduleValidation = require("../middleware/schedule.validation");
const lessonRequestRoutes = require("./lesson-request.routes");

// Apply authentication middleware to all routes
router.use(authMiddleware.protect);

// Các route cho quản lý thời khóa biểu
router.use("/lesson-request", lessonRequestRoutes);

// POST /api/schedules/initialize - Khởi tạo thời khóa biểu cho tất cả lớp trong năm học ✅
router.post(
  "/initialize",
  (req, res, next) => {
    console.log(
      "🔍 Route khởi tạo cho tất cả lớp - Người dùng:",
      req.user.role
    );
    next();
  },
  authMiddleware.authorize("admin", "manager"),
  scheduleValidation.validateInitializeSchedule,
  scheduleController.initializeSchedulesForAcademicYear
);

// GET /api/schedules/class - Xem thời khóa biểu của một lớp cụ thể ✅
// Tham số truy vấn: className, academicYear, weekNumber (tùy chọn) HOẶC startOfWeek, endOfWeek
// Ví dụ: /api/schedules/class?className=12A4&academicYear=2023-2024&startOfWeek=2024-12-16&endOfWeek=2024-12-22
router.get(
  "/class",
  scheduleValidation.validateGetClassSchedule,
  scheduleController.getClassSchedule
);

// GET /api/schedules/teacher - Xem lịch dạy của giáo viên ✅
// Ví dụ: /api/schedules/teacher?teacherId=64f8b9c123456789abcdef07&academicYear=2024-2025&startOfWeek=2024-12-19&endOfWeek=2024-12-25
router.get(
  "/teacher",
  authMiddleware.authorize("teacher", "manager"),
  scheduleController.getTeacherSchedule
);

// GET /api/schedules/lesson/:lessonId - Xem chi tiết tiết học ✅
// Ví dụ: /api/schedules/lesson/675a1b2c3d4e5f6789012345
router.get(
  "/lesson/:lessonId",
  authMiddleware.authorize("teacher", "manager", "student"),
  scheduleController.getLessonDetail
);

// GET /api/schedules/lesson/:lessonId/students - Lấy danh sách học sinh của tiết học ✅
// Ví dụ: /api/schedules/lesson/675a1b2c3d4e5f6789012345/students
router.get(
  "/lesson/:lessonId/students",
  authMiddleware.authorize("teacher"),
  scheduleController.getLessonStudents
);

// GET /api/schedules/check-class - Kiểm tra lớp có tồn tại không ✅
// Ví dụ: /api/schedules/check-class?className=12A1&academicYear=2024-2025
router.get(
  "/check-class",
  scheduleController.checkClassExists
);

// PATCH /api/schedules/lesson/:lessonId/complete - Hoàn thành tiết học ✅
// Ví dụ: /api/schedules/lesson/675a1b2c3d4e5f6789012345/complete
router.patch(
  "/lesson/:lessonId/complete",
  authMiddleware.authorize("teacher"),
  scheduleController.completeLessonById
);

// Cập nhật mô tả thêm cho tiết học ✅
// Ví dụ: /api/schedules/lessons/675a1b2c3d4e5f6789012345/description
router.patch(
  "/lessons/:lessonId/description",
  authMiddleware.authorize("teacher", "manager", "admin"),
  scheduleController.updateLessonDescription
);

// Xóa mô tả thêm cho tiết học ✅
// Ví dụ: /api/schedules/lessons/675a1b2c3d4e5f6789012345/description
router.delete(
  "/lessons/:lessonId/description",
  authMiddleware.authorize("teacher", "manager", "admin"),
  scheduleController.deleteLessonDescription
);

module.exports = router;
