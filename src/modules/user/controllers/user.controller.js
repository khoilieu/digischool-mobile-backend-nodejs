const userService = require('../services/user.service');
const { protect, authorize } = require('../../auth/middleware/auth.middleware');

class UserController {
  // Tạo user mới với OTP (chỉ manager)
  async createUser(req, res) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'No token provided'
        });
      }

      const result = await userService.createUserWithOTP(req.body, token);
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Đăng nhập với email và 1password (OTP)
  async loginWithOTP(req, res) {
    try {
      const { email, password } = req.body;
      const result = await userService.loginWithOTP(email, password);
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Xác thực OTP
  async verifyOTP(req, res) {
    try {
      const { email, otp } = req.body;
      const result = await userService.verifyOTP(email, otp);
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Set password mới - handle cả OTP flow và existing user flow
  async setPassword(req, res, next) {
    try {
      // Lấy token từ header hoặc body
      const token = req.headers.authorization?.split(' ')[1] || req.body.tempToken;
      
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'No token provided'
        });
      }

      const { password, confirmPassword } = req.body;
      const result = await userService.setPassword(token, password, confirmPassword);
      
      res.status(200).json({
        success: true,
        message: result.message,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // Lấy danh sách users
  async getUsers(req, res, next) {
    try {
      const { page = 1, limit = 20, role, search } = req.query;
      const result = await userService.getUsers({ page, limit, role, search });
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // Lấy thông tin user theo ID
  async getUserById(req, res, next) {
    try {
      const { id } = req.params;
      const result = await userService.getUserById(id);
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // Cập nhật thông tin user
  async updateUser(req, res, next) {
    try {
      const { id } = req.params;
      const result = await userService.updateUser(id, req.body);
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // Xóa user
  async deleteUser(req, res, next) {
    try {
      const { id } = req.params;
      await userService.deleteUser(id);
      res.status(200).json({
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // Cập nhật trạng thái active của user
  async updateUserStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { active } = req.body;
      const result = await userService.updateUserStatus(id, active);
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // Import teachers từ file Excel
  async importTeachers(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'No token provided'
        });
      }

      const result = await userService.importTeachers(req.file.path, token);
      
      res.status(200).json({
        success: true,
        message: 'Import completed',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }



  // Import students từ file Excel
  async importStudents(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'No token provided'
        });
      }

      const result = await userService.importStudents(req.file.path, token);
      
      res.status(200).json({
        success: true,
        message: 'Student import completed',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }



  // Tạo student mới (chỉ manager)
  async createStudent(req, res, next) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'No token provided'
        });
      }

      const result = await userService.createStudent(req.body, token);
      
      res.status(201).json({
        success: true,
        message: 'Student created successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // Tạo teacher mới (chỉ manager)
  async createTeacher(req, res, next) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'No token provided'
        });
      }

      const result = await userService.createTeacher(req.body, token);
      
      res.status(201).json({
        success: true,
        message: 'Teacher created successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // Import parents từ file Excel (chỉ manager)
  async importParents(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'No token provided'
        });
      }

      const result = await userService.importParents(req.file.path, token);
      
      res.status(200).json({
        success: true,
        message: 'Parent import completed',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }



  // Tạo parent mới (chỉ manager)
  async createParent(req, res, next) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'No token provided'
        });
      }

      const result = await userService.createParent(req.body, token);
      
      res.status(201).json({
        success: true,
        message: 'Parent created successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // Lấy danh sách tài khoản cho trang quản lý
  async getAccountsForManagement(req, res, next) {
    try {
      const { role, search, gradeLevel, className, page, limit } = req.query;
      
      const result = await userService.getAccountsForManagement({
        role,
        search,
        gradeLevel,
        className,
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20
      });
      
      res.status(200).json({
        success: true,
        message: 'Lấy danh sách tài khoản thành công',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // Lấy danh sách lớp theo khối
  async getClassesByGrade(req, res, next) {
    try {
      const { gradeLevel } = req.query;
      
      if (!gradeLevel) {
        return res.status(400).json({
          success: false,
          message: 'Khối học là bắt buộc'
        });
      }

      const result = await userService.getClassesByGrade(gradeLevel);
      
      res.status(200).json({
        success: true,
        message: 'Lấy danh sách lớp thành công',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // Lấy thông tin chi tiết tài khoản
  async getAccountDetail(req, res, next) {
    try {
      const { id } = req.params;
      
      const result = await userService.getAccountDetail(id);
      
      res.status(200).json({
        success: true,
        message: 'Lấy thông tin tài khoản thành công',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // Cập nhật thông tin cá nhân của user hiện tại
  async updatePersonalInfo(req, res, next) {
    try {
      const userId = req.user._id;
      const updateData = req.body;
      
      const result = await userService.updatePersonalInfo(userId, updateData);
      
      res.status(200).json({
        success: true,
        message: 'Cập nhật thông tin cá nhân thành công',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

}

module.exports = new UserController(); 