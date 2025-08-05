const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { validateUser } = require('../middleware/user.validation');
const upload = require('../middleware/user.upload');

// Tạo user mới (chỉ admin và manager)
router.post(
  '/',
  validateUser.createUser,
  userController.createUser
);

// Lấy danh sách users (chỉ admin và manager)
router.get(
  '/',
  // protect,
  // authorize('admin', 'manager'),
  userController.getUsers
);

// Cập nhật thông tin cá nhân của user hiện tại
router.put('/personal-info', 
  validateUser.updatePersonalInfo,
  userController.updatePersonalInfo
);

// Lấy thông tin user theo ID (chỉ admin và manager)
router.get(
  '/:id',
  //  protect,
  // authorize('admin', 'manager'),
  userController.getUserById
);

// Cập nhật thông tin user (chỉ admin và manager)
router.put(
  '/:id',
  // protect,
  // authorize('admin', 'manager'),
  validateUser.updateUser,
  userController.updateUser
);

// Xóa user (chỉ admin)
router.delete(
  '/:id',
  // protect,
  // authorize('admin'),
  userController.deleteUser
);

// Cập nhật trạng thái active của user (chỉ admin và manager)
router.patch(
  '/:id/status',
  validateUser.updateUserStatus,
  userController.updateUserStatus
);

// Tạo user mới với OTP (chỉ manager)
router.post('/create', validateUser.createUserWithOTP, userController.createUser);

// Đăng nhập với email và 1password
router.post('/login-otp', userController.loginWithOTP);

// Xác thực OTP
router.post('/verify-otp', userController.verifyOTP);

// Set password mới
router.post('/set-password', 
  validateUser.setPassword,
  userController.setPassword
);

// Import teachers từ file Excel (chỉ manager)
router.post('/import-teachers', 
  // protect,
  // authorize('manager'),
  upload.single('file'),
  userController.importTeachers
);



// Import students từ file Excel (chỉ manager)
router.post('/import-students', 
  // protect,
  // authorize('manager'),
  upload.single('file'),
  userController.importStudents
);



// Tạo student mới (chỉ manager)
router.post('/create-student', 
  validateUser.createStudent,
  userController.createStudent
);

// Tạo teacher mới (chỉ manager)
router.post('/create-teacher', 
  validateUser.createTeacher,
  userController.createTeacher
);

// Tạo parent mới (chỉ manager)
router.post('/create-parent', 
  validateUser.createParent,
  userController.createParent
);

// Import parents từ file Excel (chỉ manager)
router.post('/import-parents', 
  // protect,
  // authorize('manager'),
  upload.single('file'),
  userController.importParents
);



// ===== API QUẢN LÝ TÀI KHOẢN =====

// Lấy danh sách tài khoản cho trang quản lý
router.get('/management/accounts', 
  validateUser.getAccountsForManagement,
  userController.getAccountsForManagement
);

// Lấy danh sách lớp theo khối
router.get('/management/classes', 
  validateUser.getClassesByGrade,
  userController.getClassesByGrade
);

// Lấy thông tin chi tiết tài khoản
router.get('/management/accounts/:id', 
  validateUser.getAccountDetail,
  userController.getAccountDetail
);

module.exports = router; 