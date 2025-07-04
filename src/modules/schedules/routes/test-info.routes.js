const express = require("express");
const router = express.Router();
const testInfoController = require("../controllers/test-info.controller");
const authMiddleware = require("../../auth/middleware/auth.middleware");
const {
  createTestInfoValidation,
  updateTestInfoValidation,
  queryValidation,
  paramIdValidation,
} = require("../middleware/test-info.validation");

// Routes cho quản lý thông tin kiểm tra tiết học

// POST /api/test-infos/lessons/:lessonId - Tạo thông tin kiểm tra cho tiết học
router.post(
  "/lessons/:lessonId",
  authMiddleware.protect,
  authMiddleware.authorize("teacher"),
  createTestInfoValidation,
  testInfoController.createTestInfo
);

// GET /api/test-infos - Lấy danh sách thông tin kiểm tra của giáo viên
// Query params: status, priority, testType, startDate, endDate, page, limit
router.get(
  "/",
  authMiddleware.protect,
  authMiddleware.authorize("teacher"),
  queryValidation,
  testInfoController.getTeacherTestInfos
);

// GET /api/test-infos/upcoming - Lấy thông tin kiểm tra sắp đến hạn
// Query params: days (default: 7)
router.get(
  "/upcoming",
  authMiddleware.protect,
  authMiddleware.authorize("teacher"),
  queryValidation,
  testInfoController.getUpcomingTestInfos
);

// GET /api/test-infos/stats - Lấy thống kê thông tin kiểm tra
// Query params: startDate, endDate
router.get(
  "/stats",
  authMiddleware.protect,
  authMiddleware.authorize("teacher"),
  queryValidation,
  testInfoController.getTestInfoStats
);

// GET /api/test-infos/:testInfoId - Lấy chi tiết thông tin kiểm tra
router.get(
  "/:testInfoId",
  authMiddleware.protect,
  authMiddleware.authorize("teacher"),
  paramIdValidation,
  testInfoController.getTestInfoDetail
);

// PUT /api/test-infos/:testInfoId - Cập nhật thông tin kiểm tra
router.put(
  "/:testInfoId",
  authMiddleware.protect,
  authMiddleware.authorize("teacher"),
  updateTestInfoValidation,
  testInfoController.updateTestInfo
);

// DELETE /api/test-infos/:testInfoId - Xóa thông tin kiểm tra
router.delete(
  "/:testInfoId",
  authMiddleware.protect,
  authMiddleware.authorize("teacher"),
  paramIdValidation,
  testInfoController.deleteTestInfo
);

// POST /api/test-infos/:testInfoId/complete - Đánh dấu hoàn thành
router.post(
  "/:testInfoId/complete",
  authMiddleware.protect,
  authMiddleware.authorize("teacher"),
  paramIdValidation,
  testInfoController.markTestInfoCompleted
);

// POST /api/test-infos/:testInfoId/resend-email - Gửi lại email thông tin kiểm tra
router.post(
  "/:testInfoId/resend-email",
  authMiddleware.protect,
  authMiddleware.authorize("teacher"),
  paramIdValidation,
  testInfoController.resendTestInfoEmail
);

// POST /api/test-infos/:testInfoId/test-email - Test gửi email
router.post(
  "/:testInfoId/test-email",
  authMiddleware.protect,
  authMiddleware.authorize("teacher"),
  paramIdValidation,
  testInfoController.testTestInfoEmail
);

module.exports = router;
