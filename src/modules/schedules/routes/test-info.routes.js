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
// Body: { testType, content, reminder }
router.post(
  "/lessons/:lessonId",
  testInfoValidation.createTestInfoValidation(),
  testInfoController.createTestInfo
);

// Lấy danh sách thông tin kiểm tra của giáo viên ✅
// Query params: testType, page, limit
router.get(
  "/",
  testInfoValidation.queryValidation(),
  testInfoController.getTeacherTestInfos
);

// Cập nhật thông tin kiểm tra ✅
// Body: { testType?, content?, reminder? }
router.put(
  "/:testInfoId",
  testInfoValidation.updateTestInfoValidation(),
  testInfoController.updateTestInfo
);

// Xóa thông tin kiểm tra ✅
router.delete(
  "/:testInfoId",
  testInfoValidation.paramIdValidation(),
  testInfoController.deleteTestInfo
);

module.exports = router;
