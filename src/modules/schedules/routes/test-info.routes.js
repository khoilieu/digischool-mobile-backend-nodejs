const express = require("express");
const router = express.Router();
const testInfoController = require("../controllers/test-info.controller");
const authMiddleware = require("../../auth/middleware/auth.middleware");
const testInfoValidation = require("../middleware/test-info.validation");

// ===================== ROUTES QUẢN LÝ THÔNG TIN KIỂM TRA TIẾT HỌC =====================

// Áp dụng middleware xác thực cho tất cả route
router.use(authMiddleware.protect);
router.use(authMiddleware.authorize("teacher", "homeroom_teacher"));

// Tạo thông tin kiểm tra cho tiết học ✅
router.post(
  "/lessons/:lessonId",
  testInfoValidation.createTestInfoValidation,
  testInfoController.createTestInfo
);

// Lấy danh sách thông tin kiểm tra của giáo viên ✅
// Query params: status, priority, testType, startDate, endDate, page, limit
router.get(
  "/",
  testInfoValidation.queryValidation,
  testInfoController.getTeacherTestInfos
);

// Cập nhật thông tin kiểm tra ✅
router.put(
  "/:testInfoId",
  testInfoValidation.updateTestInfoValidation,
  testInfoController.updateTestInfo
);

// Xóa thông tin kiểm tra ✅
router.delete(
  "/:testInfoId",
  testInfoValidation.paramIdValidation,
  testInfoController.deleteTestInfo
);

// Gửi lại email thông tin kiểm tra ✅
router.post(
  "/:testInfoId/resend-email",
  testInfoValidation.paramIdValidation,
  testInfoController.resendTestInfoEmail
);

// Test gửi email ✅
router.post(
  "/:testInfoId/test-email",
  testInfoValidation.paramIdValidation,
  testInfoController.testTestInfoEmail
);

module.exports = router;
