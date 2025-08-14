const authService = require('../services/auth.service');
const userService = require('../../user/services/user.service');
const bcrypt = require('bcryptjs');

class AuthController {
  // Đăng ký
  async register(req, res, next) {
    try {
      const { email, password } = req.body;

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      // Set default values
      const userData = {
        email,
        passwordHash,
        role: 'manager',
        name: email.split('@')[0], // Set name as email username
        class_id: null,
        subjects: []
      };
      
      const result = await authService.register(userData);
      res.status(201).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // Đăng nhập (xử lý cả login bình thường và OTP)
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      
      // Đăng nhập bình thường
      try {
        const result = await authService.login(email, password);
        
        // Kiểm tra trạng thái user để quyết định redirect
        const redirectTo = result.user.isNewUser ? 'set-password' : 'home';
        
        return res.status(200).json({
          success: true,
          data: {
            ...result,
            redirectTo: redirectTo
          }
        });
      } catch (loginError) {
        // Kiểm tra nếu lỗi là do tài khoản không active
        if (loginError.message === 'Tài khoản đã ngừng hoạt động') {
          return res.status(401).json({
            success: false,
            message: loginError.message
          });
        }
        
        // Nếu login thất bại, thử OTP login (cho trường hợp tạo tài khoản mới bằng OTP)
        try {
          const otpResult = await userService.loginWithOTP(email, password);
          
          return res.status(200).json({
            success: true,
            data: {
              ...otpResult,
              loginType: 'otp'
            }
          });
        } catch (otpError) {
          // Thử login với reset token (1pwd)
          try {
            const resetTokenResult = await authService.loginWithResetToken(email, password);
            
            return res.status(200).json({
              success: true,
              data: resetTokenResult
            });
          } catch (resetTokenError) {
            // Kiểm tra nếu lỗi là do tài khoản không active
            if (resetTokenError.message === 'Tài khoản đã ngừng hoạt động') {
              return res.status(401).json({
                success: false,
                message: resetTokenError.message
              });
            }
            
            // Nếu tất cả đều thất bại, trả về lỗi
            return res.status(401).json({
              success: false,
              message: 'Email hoặc mật khẩu không đúng'
            });
          }
        }
      }
    } catch (error) {
      next(error);
    }
  }

  // Lấy thông tin user từ token
  async getCurrentUser(req, res, next) {
    try {
      // User đã được xác thực bởi middleware protect
      // Lấy thông tin chi tiết từ service
      const authHeader = req.headers.authorization;
      const token = authHeader.split(' ')[1];
      
      const userDetail = await authService.getCurrentUserFromToken(token);
      
      res.status(200).json({
        success: true,
        message: 'Lấy thông tin user thành công',
        data: userDetail
      });
    } catch (error) {
      console.error('❌ Error in getCurrentUser:', error.message);
      if (error.message === 'Invalid token' || error.message === 'Token expired') {
        return res.status(401).json({
          success: false,
          message: error.message
        });
      }
      next(error);
    }
  }

  // Logout
  async logout(req, res, next) {
    try {
      // Lấy token từ header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          message: 'No token provided'
        });
      }

      const token = authHeader.split(' ')[1];
      const result = await authService.logout(token);
      
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      if (error.message === 'Invalid token' || error.message === 'Token expired') {
        return res.status(401).json({
          success: false,
          message: error.message
        });
      }
      next(error);
    }
  }

  // Set password sau khi đăng nhập với OTP
  async setPassword(req, res, next) {
    try {
      const { tempToken, password, confirmPassword } = req.body;
      const result = await userService.setPassword(tempToken, password, confirmPassword);
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // Change password - Đổi mật khẩu
  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword, confirmPassword } = req.body;
      const userId = req.user.id; // Lấy từ middleware protect

      // Lấy thông tin user hiện tại
      const User = require('../models/user.model');
      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy người dùng'
        });
      }

      // Kiểm tra mật khẩu hiện tại
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'Mật khẩu hiện tại không đúng'
        });
      }

      // Kiểm tra mật khẩu mới có khác mật khẩu cũ không
      const isNewPasswordSameAsOld = await bcrypt.compare(newPassword, user.passwordHash);
      if (isNewPasswordSameAsOld) {
        return res.status(400).json({
          success: false,
          message: 'Mật khẩu mới không được trùng mật khẩu cũ'
        });
      }

      // Hash mật khẩu mới
      const salt = await bcrypt.genSalt(12);
      const newPasswordHash = await bcrypt.hash(newPassword, salt);

      // Cập nhật mật khẩu
      user.passwordHash = newPasswordHash;
      await user.save();

      res.status(200).json({
        success: true,
        message: 'Đổi mật khẩu thành công'
      });
    } catch (error) {
      next(error);
    }
  }

  // Forgot Password - Gửi mã reset password qua email
  async forgotPassword(req, res, next) {
    try {
      const { email } = req.body;
      
      const result = await authService.forgotPassword(email);
      
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }


}

module.exports = new AuthController(); 