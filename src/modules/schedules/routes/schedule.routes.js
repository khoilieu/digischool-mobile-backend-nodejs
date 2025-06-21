const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/schedule.controller');
const authMiddleware = require('../../auth/middleware/auth.middleware');
const scheduleValidation = require('../middleware/schedule.validation');

// Routes cho quản lý thời khóa biểu

// POST /api/schedules/initialize - Khởi tạo thời khóa biểu cho tất cả lớp trong năm học
router.post('/initialize', 
  authMiddleware.protect,
  (req, res, next) => {
    console.log('🔍 Initialize route for all classes - User:', req.user.role);
    next();
  },
  authMiddleware.authorize('admin', 'manager'),
  scheduleValidation.validateInitializeSchedule,
  scheduleController.initializeSchedulesForAcademicYear
);

// POST /api/schedules/initialize-class - Khởi tạo thời khóa biểu cho một lớp cụ thể
router.post('/initialize-class', 
  authMiddleware.protect,
  (req, res, next) => {
    console.log('🔍 Initialize class route - User:', req.user.role);
    next();
  },
  authMiddleware.authorize('admin', 'manager'),
  scheduleValidation.validateInitializeClassSchedule,
  scheduleController.initializeScheduleForClass
);

// POST /api/schedules/initialize-optimized - Khởi tạo thời khóa biểu tối ưu với thuật toán Heuristic/Greedy
router.post('/initialize-optimized', 
  authMiddleware.protect,
  (req, res, next) => {
    console.log('🚀 Initialize optimized route - User:', req.user.role);
    next();
  },
  authMiddleware.authorize('admin', 'manager'),
  scheduleValidation.validateInitializeSchedule,
  scheduleController.initializeOptimizedSchedules
);

// Test route để kiểm tra auth
router.get('/test-auth', 
  authMiddleware.protect,
  (req, res) => {
    res.json({
      success: true,
      message: 'Auth working',
      user: {
        id: req.user._id,
        role: req.user.role,
        email: req.user.email
      }
    });
  }
);

// GET /api/schedules/class - Xem thời khóa biểu của một lớp cụ thể
// Query params: className, academicYear, weekNumber (optional) OR startOfWeek, endOfWeek
// Ví dụ: /api/schedules/class?className=12A4&academicYear=2023-2024&startOfWeek=2024-12-16&endOfWeek=2024-12-22
router.get('/class',
  authMiddleware.protect,
  scheduleValidation.validateGetClassSchedule,
  scheduleController.getClassSchedule
);

// GET /api/schedules/available - Xem tất cả schedules có sẵn (debugging)
router.get('/available',
  authMiddleware.protect,
  scheduleController.getAvailableSchedules
);

// GET /api/schedules/check-class - Kiểm tra lớp có tồn tại không
router.get('/check-class',
  authMiddleware.protect,
  scheduleController.checkClassExists
);

// GET /api/schedules/progress - Lấy tiến độ học tập của lớp
router.get('/progress',
  authMiddleware.protect,
  scheduleController.getLearningProgress
);

// GET /api/schedules/attendance-report - Lấy báo cáo điểm danh
router.get('/attendance-report',
  authMiddleware.protect,
  scheduleController.getAttendanceReport
);

// GET /api/schedules/stats - Lấy thống kê thời khóa biểu (đặt trước /:id để tránh conflict)
router.get('/stats',
  authMiddleware.protect,
  scheduleController.getScheduleStats
);

// GET /api/schedules - Lấy danh sách thời khóa biểu với filter
router.get('/',
  authMiddleware.protect,
  scheduleController.getSchedules
);

// GET /api/schedules/:id - Lấy chi tiết thời khóa biểu
router.get('/:id',
  authMiddleware.protect,
  scheduleController.getScheduleById
);

// PUT /api/schedules/:id/status - Cập nhật trạng thái thời khóa biểu (đặt trước /:id để tránh conflict)
router.put('/:id/status',
  authMiddleware.protect,
  authMiddleware.authorize('admin', 'manager'),
  scheduleValidation.validateUpdateStatus,
  scheduleController.updateScheduleStatus
);

// PUT /api/schedules/:id - Cập nhật thời khóa biểu
router.put('/:id',
  authMiddleware.protect,
  authMiddleware.authorize('admin', 'manager', 'teacher'),
  scheduleController.updateSchedule
);

// DELETE /api/schedules/:id - Xóa thời khóa biểu
router.delete('/:id',
  authMiddleware.protect,
  authMiddleware.authorize('admin', 'manager'),
  scheduleController.deleteSchedule
);

// Routes helper cho frontend

// GET /api/schedules/helper/classes - Lấy danh sách lớp theo khối và năm học
router.get('/helper/classes',
  authMiddleware.protect,
  scheduleController.getClassesByGrade
);

// GET /api/schedules/helper/preview - Preview tạo thời khóa biểu
router.post('/helper/preview',
  authMiddleware.protect,
  authMiddleware.authorize('admin', 'manager'),
  scheduleController.previewScheduleCreation
);

// GET /api/schedules/helper/academic-years - Lấy danh sách năm học
router.get('/helper/academic-years',
  authMiddleware.protect,
  scheduleController.getAcademicYearOptions
);

// GET /api/schedules/helper/time-slots - Lấy danh sách khung giờ
router.get('/helper/time-slots',
  authMiddleware.protect,
  scheduleController.getTimeSlots
);

// Legacy routes (giữ lại để tương thích)
router.post('/grade',
  authMiddleware.protect,
  authMiddleware.authorize('admin', 'manager'),
  scheduleController.createScheduleForGrade
);

// Routes cho quản lý trạng thái tiết học

// PATCH /api/schedules/:scheduleId/period-status - Cập nhật trạng thái tiết học
router.patch('/:scheduleId/period-status',
  authMiddleware.protect,
  authMiddleware.authorize('admin', 'manager', 'teacher'),
  scheduleController.updatePeriodStatus
);

// PATCH /api/schedules/:scheduleId/bulk-period-status - Bulk update trạng thái nhiều tiết
router.patch('/:scheduleId/bulk-period-status',
  authMiddleware.protect,
  authMiddleware.authorize('admin', 'manager', 'teacher'),
  scheduleController.bulkUpdatePeriodStatus
);

// PATCH /api/schedules/:scheduleId/mark-completed - Mark tiết học đã hoàn thành
router.patch('/:scheduleId/mark-completed',
  authMiddleware.protect,
  authMiddleware.authorize('admin', 'manager', 'teacher'),
  scheduleController.markPeriodCompleted
);

// PATCH /api/schedules/:scheduleId/mark-absent - Mark tiết học vắng mặt
router.patch('/:scheduleId/mark-absent',
  authMiddleware.protect,
  authMiddleware.authorize('admin', 'manager', 'teacher'),
  scheduleController.markPeriodAbsent
);

module.exports = router; 