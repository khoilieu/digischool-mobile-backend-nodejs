const express = require("express");
const router = express.Router();
const scheduleController = require("../controllers/schedule.controller");
const authMiddleware = require("../../auth/middleware/auth.middleware");
const scheduleValidation = require("../middleware/schedule.validation");

// Import lesson request routes
const lessonRequestRoutes = require('./lesson-request.routes');
const substituteRequestRoutes = require('./substitute-request.routes');

// Routes cho quản lý thời khóa biểu

// Mount lesson request routes
router.use('/lesson-request', lessonRequestRoutes);

// Mount substitute request routes
router.use('/substitute-request', substituteRequestRoutes);

// POST /api/schedules/initialize - Khởi tạo thời khóa biểu cho tất cả lớp trong năm học
router.post(
  "/initialize",
  authMiddleware.protect,
  (req, res, next) => {
    console.log("🔍 Initialize route for all classes - User:", req.user.role);
    next();
  },
  authMiddleware.authorize("admin", "manager"),
  scheduleValidation.validateInitializeSchedule,
  scheduleController.initializeSchedulesForAcademicYear
);



// Test route để kiểm tra auth
router.get("/test-auth", authMiddleware.protect, (req, res) => {
  res.json({
    success: true,
    message: "Auth working",
    user: {
      id: req.user._id,
      role: req.user.role,
      email: req.user.email,
    },
  });
});

// GET /api/schedules/class - Xem thời khóa biểu của một lớp cụ thể
// Query params: className, academicYear, weekNumber (optional) OR startOfWeek, endOfWeek
// Ví dụ: /api/schedules/class?className=12A4&academicYear=2023-2024&startOfWeek=2024-12-16&endOfWeek=2024-12-22
router.get(
  "/class",
  authMiddleware.protect,
  scheduleValidation.validateGetClassSchedule,
  scheduleController.getClassSchedule
);

// GET /api/schedules/teacher - Xem lịch dạy của giáo viên
// Query params: teacherId, academicYear, startOfWeek, endOfWeek
// Ví dụ: /api/schedules/teacher?teacherId=64f8b9c123456789abcdef07&academicYear=2024-2025&startOfWeek=2024-12-19&endOfWeek=2024-12-25
router.get(
  "/teacher",
  authMiddleware.protect,
  authMiddleware.authorize("teacher", "manager"),
  scheduleController.getTeacherSchedule
);

// GET /api/schedules/lesson/:lessonId - Xem chi tiết tiết học
// Params: lessonId
// Ví dụ: /api/schedules/lesson/675a1b2c3d4e5f6789012345
router.get(
  "/lesson/:lessonId",
  authMiddleware.protect,
  authMiddleware.authorize("teacher", "manager", "student"),
  scheduleController.getLessonDetail
);

// GET /api/schedules/lesson/:lessonId/students - Lấy danh sách học sinh của lesson
// Params: lessonId
// Chỉ giáo viên dạy tiết đó mới được xem
// Ví dụ: /api/schedules/lesson/675a1b2c3d4e5f6789012345/students
router.get(
  "/lesson/:lessonId/students",
  authMiddleware.protect,
  authMiddleware.authorize("teacher"),
  scheduleController.getLessonStudents
);

// GET /api/schedules/available - Xem tất cả schedules có sẵn (debugging)
router.get(
  "/available",
  authMiddleware.protect,
  scheduleController.getAvailableSchedules
);

// GET /api/schedules/check-class - Kiểm tra lớp có tồn tại không
router.get(
  "/check-class",
  authMiddleware.protect,
  scheduleController.checkClassExists
);

// GET /api/schedules/progress - Lấy tiến độ học tập của lớp
router.get(
  "/progress",
  authMiddleware.protect,
  scheduleController.getLearningProgress
);

// GET /api/schedules/attendance-report - Lấy báo cáo điểm danh
router.get(
  "/attendance-report",
  authMiddleware.protect,
  scheduleController.getAttendanceReport
);

// GET /api/schedules/stats - Lấy thống kê thời khóa biểu (đặt trước /:id để tránh conflict)
router.get(
  "/stats",
  authMiddleware.protect,
  scheduleController.getScheduleStats
);

// GET /api/schedules/period-details - Xem chi tiết tiết học (đặt trước /:id để tránh conflict)
router.get(
  "/period-details",
  authMiddleware.protect,
  scheduleController.getPeriodDetails
);

// GET /api/schedules - Lấy danh sách thời khóa biểu với filter
router.get("/", authMiddleware.protect, scheduleController.getSchedules);

// GET /api/schedules/:id - Lấy chi tiết thời khóa biểu với filter options
router.get("/:id", authMiddleware.protect, scheduleController.getScheduleById);

// PUT /api/schedules/:id/status - Cập nhật trạng thái thời khóa biểu (đặt trước /:id để tránh conflict)
router.put(
  "/:id/status",
  authMiddleware.protect,
  authMiddleware.authorize("admin", "manager"),
  scheduleValidation.validateUpdateStatus,
  scheduleController.updateScheduleStatus
);

// PUT /api/schedules/:id - Cập nhật thời khóa biểu
router.put(
  "/:id",
  authMiddleware.protect,
  authMiddleware.authorize("admin", "manager", "teacher"),
  scheduleController.updateSchedule
);

// DELETE /api/schedules/:id - Xóa thời khóa biểu
router.delete(
  "/:id",
  authMiddleware.protect,
  authMiddleware.authorize("admin", "manager"),
  scheduleController.deleteSchedule
);

// Routes helper cho frontend

// GET /api/schedules/helper/classes - Lấy danh sách lớp theo khối và năm học
router.get(
  "/helper/classes",
  authMiddleware.protect,
  scheduleController.getClassesByGrade
);

// GET /api/schedules/helper/preview - Preview tạo thời khóa biểu
router.post(
  "/helper/preview",
  authMiddleware.protect,
  authMiddleware.authorize("admin", "manager"),
  scheduleController.previewScheduleCreation
);

// GET /api/schedules/helper/academic-years - Lấy danh sách năm học
router.get(
  "/helper/academic-years",
  authMiddleware.protect,
  scheduleController.getAcademicYearOptions
);

// GET /api/schedules/helper/time-slots - Lấy danh sách khung giờ
router.get(
  "/helper/time-slots",
  authMiddleware.protect,
  scheduleController.getTimeSlots
);

// Legacy routes (giữ lại để tương thích)
router.post(
  "/grade",
  authMiddleware.protect,
  authMiddleware.authorize("admin", "manager"),
  scheduleController.createScheduleForGrade
);

// PATCH /api/schedules/lesson/:lessonId/complete - Complete lesson
// Params: lessonId
// Chỉ giáo viên đảm nhiệm hoặc giáo viên dạy thay mới có thể complete
router.patch(
  "/lesson/:lessonId/complete",
  authMiddleware.protect,
  authMiddleware.authorize("teacher"),
  scheduleController.completeLessonById
);

// Routes cho quản lý trạng thái tiết học

// PATCH /api/schedules/:scheduleId/period-status - Cập nhật trạng thái tiết học
router.patch(
  "/:scheduleId/period-status",
  authMiddleware.protect,
  authMiddleware.authorize("admin", "manager", "teacher"),
  scheduleController.updatePeriodStatus
);

// PATCH /api/schedules/:scheduleId/bulk-period-status - Bulk update trạng thái nhiều tiết
router.patch(
  "/:scheduleId/bulk-period-status",
  authMiddleware.protect,
  authMiddleware.authorize("admin", "manager", "teacher"),
  scheduleController.bulkUpdatePeriodStatus
);

// PATCH /api/schedules/:scheduleId/mark-completed - Mark tiết học đã hoàn thành
router.patch(
  "/:scheduleId/mark-completed",
  authMiddleware.protect,
  authMiddleware.authorize("admin", "manager", "teacher"),
  scheduleController.markPeriodCompleted
);

// PATCH /api/schedules/:scheduleId/mark-absent - Mark tiết học vắng mặt
router.patch(
  "/:scheduleId/mark-absent",
  authMiddleware.protect,
  authMiddleware.authorize("admin", "manager", "teacher"),
  scheduleController.markPeriodAbsent
);

// Routes cho quản lý loại tiết học (Period Type Management)

// GET /api/schedules/period-type-statistics - Lấy thống kê theo loại tiết học
router.get(
  "/period-type-statistics",
  authMiddleware.protect,
  scheduleController.getPeriodTypeStatistics
);

// GET /api/schedules/periods-by-type - Lấy danh sách tiết học theo loại
router.get(
  "/periods-by-type",
  authMiddleware.protect,
  scheduleController.getPeriodsByType
);

// GET /api/schedules/identify-period-type - Nhận biết loại tiết học
router.get(
  "/identify-period-type",
  authMiddleware.protect,
  scheduleController.identifyPeriodType
);

// GET /api/schedules/available-slots - Kiểm tra slot trống để thêm tiết học
router.get(
  "/available-slots",
  authMiddleware.protect,
  scheduleController.checkAvailableSlots
);

// POST /api/schedules/:scheduleId/periods/makeup - Thêm tiết dạy bù
router.post(
  "/:scheduleId/periods/makeup",
  authMiddleware.protect,
  authMiddleware.authorize("admin", "manager", "teacher"),
  scheduleController.addMakeupPeriod
);

// POST /api/schedules/:scheduleId/periods/extracurricular - Thêm hoạt động ngoại khóa
router.post(
  "/:scheduleId/periods/extracurricular",
  authMiddleware.protect,
  authMiddleware.authorize("admin", "manager", "teacher"),
  scheduleController.addExtracurricularPeriod
);

// Routes cho đánh giá tiết học

// POST /api/schedules/:scheduleId/evaluate - Đánh giá tiết học
router.post(
  "/:scheduleId/evaluate",
  authMiddleware.protect,
  authMiddleware.authorize(
    "admin",
    "manager",
    "principal",
    "head_teacher",
    "teacher"
  ),
  scheduleController.evaluatePeriod
);

// GET /api/schedules/:scheduleId/evaluation - Lấy đánh giá tiết học
router.get(
  "/:scheduleId/evaluation",
  authMiddleware.protect,
  scheduleController.getPeriodEvaluation
);

// ========== API MỚI CHO SCHEMA TUẦN-NGÀY-TIẾT ==========

// GET /api/schedules/:scheduleId/periods/:periodId - Lấy chi tiết tiết học theo ID
router.get(
  "/:scheduleId/periods/:periodId",
  authMiddleware.protect,
  scheduleController.getPeriodById
);

// GET /api/schedules/:scheduleId/empty-slots - Lấy danh sách tiết rỗng
router.get(
  "/:scheduleId/empty-slots",
  authMiddleware.protect,
  scheduleController.getEmptySlots
);

// GET /api/schedules/:scheduleId/weeks - Lấy thời khóa biểu theo tuần
router.get(
  "/:scheduleId/weeks",
  authMiddleware.protect,
  scheduleController.getScheduleByWeek
);

// PUT /api/schedules/:scheduleId/periods/:periodId/status - Cập nhật trạng thái tiết học theo ID
router.put(
  "/:scheduleId/periods/:periodId/status",
  authMiddleware.protect,
  authMiddleware.authorize("admin", "manager", "teacher"),
  scheduleController.updatePeriodStatusById
);

// POST /api/schedules/:scheduleId/periods/:periodId/makeup - Thêm tiết dạy bù vào slot rỗng
router.post(
  "/:scheduleId/periods/:periodId/makeup",
  authMiddleware.protect,
  authMiddleware.authorize("admin", "manager", "teacher"),
  scheduleController.addMakeupToEmptySlot
);

// POST /api/schedules/:scheduleId/periods/:periodId/extracurricular - Thêm hoạt động ngoại khóa vào slot rỗng
router.post(
  "/:scheduleId/periods/:periodId/extracurricular",
  authMiddleware.protect,
  authMiddleware.authorize("admin", "manager", "teacher"),
  scheduleController.addExtracurricularToEmptySlot
);

// API MỚI: Lấy lịch học theo ngày cụ thể
// GET /api/schedules/day-schedule?className=12A1&academicYear=2024-2025&date=2024-12-16
router.get(
  "/day-schedule",
  authMiddleware.protect,
  scheduleController.getDaySchedule
);

// API MỚI: Search periods với filter phức tạp
// GET /api/schedules/search-periods?teacher=xxx&subject=xxx&status=completed
router.get(
  "/search-periods",
  authMiddleware.protect,
  scheduleController.searchPeriods
);

// API MỚI: Lấy lịch giảng dạy của giáo viên theo tuần
// GET /api/schedules/teacher-weekly?teacherId=xxx&weekNumber=1&academicYear=2024-2025
router.get(
  "/teacher-weekly",
  authMiddleware.protect,
  scheduleController.getTeacherWeeklySchedule
);

// GET /api/schedules/periods/:periodId/detailed - Lấy chi tiết tiết học với metadata đầy đủ
router.get(
  "/periods/:periodId/detailed",
  authMiddleware.protect,
  scheduleController.getDetailedPeriodInfo
);

// PUT /api/schedules/bulk-update-periods - Bulk update nhiều tiết học
router.put(
  "/bulk-update-periods",
  authMiddleware.protect,
  authMiddleware.authorize("admin", "manager", "teacher"),
  scheduleController.bulkUpdatePeriods
);

// Cập nhật mô tả thêm cho lesson
router.patch(
  "/lessons/:lessonId/description",
  authMiddleware.protect,
  authMiddleware.authorize("teacher", "manager", "admin"),
  scheduleController.updateLessonDescription
);

// Xóa mô tả thêm cho lesson
router.delete(
  "/lessons/:lessonId/description",
  authMiddleware.protect,
  authMiddleware.authorize("teacher", "manager", "admin"),
  scheduleController.deleteLessonDescription
);


module.exports = router;
