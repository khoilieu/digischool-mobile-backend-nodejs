const express = require("express");
const router = express.Router();
const personalActivityController = require("../controllers/personal-activity.controller");
const authMiddleware = require("../../auth/middleware/auth.middleware");
const personalActivityValidation = require("../middleware/personal-activity.validation");

router.use(authMiddleware.protect);

// Tạo hoạt động cá nhân
router.post(
  "/create",
  personalActivityValidation.validateCreate(),
  personalActivityController.create
);  

// Lấy hoạt động cá nhân của user theo date, period
router.get(
  "/",
  personalActivityValidation.validateGet(),
  personalActivityController.get
);

// Cập nhật hoạt động cá nhân
router.patch(
  "/:activityId",
  personalActivityValidation.validateUpdate(),
  personalActivityController.update
);

// Xóa hoạt động cá nhân
router.delete(
  "/:activityId",
  personalActivityValidation.validateDelete(),
  personalActivityController.delete
);

module.exports = router;
