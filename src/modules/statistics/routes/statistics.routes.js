const express = require("express");
const router = express.Router();
const statisticsController = require("../controllers/statistics.controller");
const authMiddleware = require("../../auth/middleware/auth.middleware");
const teachingProgressValidation = require("../middleware/teaching-progress.validation");

// Tất cả routes đều yêu cầu authentication
router.use(authMiddleware.protect);

// Thống kê sĩ số toàn trường theo ngày
//API: /api/statistics/daily
router.get('/daily', 
  authMiddleware.authorize("admin", "manager"), 
  statisticsController.getDailySchoolStatistics
);

// Thống kê sĩ số toàn trường theo tuần
router.get('/weekly', 
  authMiddleware.authorize("admin", "manager"), 
  statisticsController.getWeeklySchoolStatistics
);

// Thống kê điểm danh giáo viên
router.get('/teacher-attendance', 
  authMiddleware.authorize("admin", "manager"), 
  statisticsController.getTeacherAttendanceStatistics
);

// Thống kê sĩ số giáo viên điểm danh cho UI
router.get('/teacher-rollcall-summary', 
  authMiddleware.authorize("admin", "manager"), 
  statisticsController.getTeacherRollcallSummary
);

// Biểu đồ học sinh theo buổi
router.get('/student-chart', 
  authMiddleware.authorize("admin", "manager"), 
  statisticsController.getStudentChartData
);

// Tỷ lệ hoàn thành
router.get('/completion-rates', 
  authMiddleware.authorize("admin", "manager"), 
  statisticsController.getCompletionRates
);

// Điểm danh giáo viên theo ngày - trả về tiết học đã hoàn thành đầu tiên
router.get('/teacher-rollcall', 
  authMiddleware.authorize("admin", "manager"), 
  statisticsController.getTeacherRollcall
);

// Lấy danh sách ngày trong tuần dựa trên TKB
router.get('/week-days', 
  authMiddleware.authorize("admin", "manager"), 
  statisticsController.getWeekDays
);

// ===== API QUẢN LÝ TIẾN TRÌNH DẠY HỌC =====

// Lấy dữ liệu tiến trình dạy học
router.get('/teaching-progress', 
  authMiddleware.authorize("admin", "manager"),
  teachingProgressValidation.getTeachingProgress,
  statisticsController.getTeachingProgress
);

// Lấy cấu hình số tiết yêu cầu
router.get('/lesson-requirements', 
  authMiddleware.authorize("admin", "manager"),
  teachingProgressValidation.getLessonRequirements,
  statisticsController.getLessonRequirements
);

// Khởi tạo cấu hình mặc định
router.post('/lesson-requirements/initialize', 
  authMiddleware.authorize("admin", "manager"),
  teachingProgressValidation.getLessonRequirements,
  statisticsController.initializeDefaultRequirements
);

// Cập nhật cấu hình số tiết yêu cầu
router.put('/lesson-requirements', 
  authMiddleware.authorize("admin", "manager"),
  teachingProgressValidation.updateLessonRequirements,
  statisticsController.updateLessonRequirements
);

// Lấy danh sách lớp theo khối
router.get('/classes-by-grade', 
  authMiddleware.authorize("admin", "manager"),
  teachingProgressValidation.getClassesByGrade,
  statisticsController.getClassesByGrade
);

module.exports = router;