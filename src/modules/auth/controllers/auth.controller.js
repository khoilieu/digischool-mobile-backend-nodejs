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
          // Nếu cả 2 đều thất bại, trả về lỗi
          return res.status(401).json({
            success: false,
            message: 'Invalid email or password'
          });
        }
      }
    } catch (error) {
      next(error);
    }
  }

  // Lấy thông tin user từ token
  async getCurrentUser(req, res, next) {
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
      const user = await authService.getCurrentUserFromToken(token);
      
      res.status(200).json({
        success: true,
        data: user
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
}

module.exports = new AuthController(); 