const express = require("express");
const router = express.Router();
const testInfoController = require("../controllers/test-info.controller");
const authMiddleware = require("../../auth/middleware/auth.middleware");
const testInfoValidation = require("../middleware/test-info.validation");

// ===================== ROUTES QUẢN LÝ THÔNG TIN KIỂM TRA TIẾT HỌC =====================

// Áp dụng middleware xác thực cho tất cả route
router.use(authMiddleware.protect);
router.use(authMiddleware.authorize("teacher", "homeroom_teacher"));

// Tạo thông tin kiểm tra cho tiết học
router.post(
  "/lessons/:lessonId",
  testInfoValidation.createTestInfoValidation,
  testInfoController.createTestInfo
);

// Lấy danh sách thông tin kiểm tra của giáo viên
// Query params: status, priority, testType, startDate, endDate, page, limit
router.get(
  "/",
  testInfoValidation.queryValidation,
  testInfoController.getTeacherTestInfos
);

// Lấy thông tin kiểm tra sắp đến hạn
// Query params: days (default: 7)
router.get(
  "/upcoming",
  testInfoValidation.queryValidation,
  testInfoController.getUpcomingTestInfos
);

// Lấy thống kê thông tin kiểm tra
// Query params: startDate, endDate
router.get(
  "/stats",
  testInfoValidation.queryValidation,
  testInfoController.getTestInfoStats
);

// Lấy chi tiết thông tin kiểm tra
router.get(
  "/:testInfoId",
  testInfoValidation.paramIdValidation,
  testInfoController.getTestInfoDetail
);

// Cập nhật thông tin kiểm tra
router.put(
  "/:testInfoId",
  testInfoValidation.updateTestInfoValidation,
  testInfoController.updateTestInfo
);

// Xóa thông tin kiểm tra
router.delete(
  "/:testInfoId",
  testInfoValidation.paramIdValidation,
  testInfoController.deleteTestInfo
);

// Đánh dấu hoàn thành
router.post(
  "/:testInfoId/complete",
  testInfoValidation.paramIdValidation,
  testInfoController.markTestInfoCompleted
);

// Gửi lại email thông tin kiểm tra
router.post(
  "/:testInfoId/resend-email",
  testInfoValidation.paramIdValidation,
  testInfoController.resendTestInfoEmail
);

// Test gửi email
router.post(
  "/:testInfoId/test-email",
  testInfoValidation.paramIdValidation,
  testInfoController.testTestInfoEmail
);

module.exports = router;
