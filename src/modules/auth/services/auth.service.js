const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const emailService = require('./email.service');

class AuthService {
  // Tạo JWT token
  generateToken(userId) {
    return jwt.sign(
      { id: userId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
  }

  // Đăng ký người dùng mới
  async register(userData) {
    try {
      // Kiểm tra email đã tồn tại
      const existingUser = await User.findOne({ email: userData.email });
      if (existingUser) {
        throw new Error('Email already exists');
      }

      // Tạo user mới
      const user = await User.create(userData);
      
      return {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
          isNewUser: user.isNewUser,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      };
    } catch (error) {
      throw error;
    }
  }

  // Đăng nhập
  async login(email, password) {
    try {
      // Tìm user và lấy cả password
      const user = await User.findOne({ email }).select('+password');
      
      if (!user) {
        throw new Error('Invalid email or password');
      }

      // Kiểm tra mật khẩu
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        throw new Error('Invalid email or password');
      }

      // Tạo token
      const token = this.generateToken(user._id);

      return {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
          isNewUser: user.isNewUser
        },
        token
      };
    } catch (error) {
      throw error;
    }
  }

  // Lấy thông tin user từ token
  async getCurrentUserFromToken(token) {
    try {
      if (!token) {
        throw new Error('No token provided');
      }

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Lấy thông tin user từ token
      const user = await User.findById(decoded.id);

      if (!user) {
        throw new Error('User not found');
      }

      // Chuyển đổi ObjectId thành string nếu có
      const classId = user.class_id ? user.class_id.toString() : null;
      const subjects = user.subjects ? user.subjects.map(subject => subject.toString()) : [];

      return {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        class_id: classId,
        subjects: subjects,
        isNewUser: user.isNewUser,
        active: user.active,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      }
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token expired');
      }
      throw error;
    }
  }

  // Logout - blacklist token
  async logout(token) {
    try {
      if (!token) {
        throw new Error('No token provided');
      }

      // Verify token trước khi blacklist
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Lấy thông tin user trước khi logout
      const user = await User.findById(decoded.id);
      if (!user) {
        throw new Error('User not found');
      }

      // Thêm token vào blacklist (có thể lưu vào Redis hoặc database)
      // TODO: Implement token blacklist storage
      
      return {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
          isNewUser: user.isNewUser,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        },
        message: 'Logged out successfully'
      };
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      }
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token expired');
      }
      throw error;
    }
  }

  // Forgot Password - Gửi mã reset password qua email
  async forgotPassword(email) {
    try {
      console.log(`🔐 Forgot password request for email: ${email}`);
      
      // Theo yêu cầu: không cần kiểm tra email có tồn tại trong database hay không
      // Cứ gửi mã reset password cho email đó
      
      // Tạo user tạm thời nếu không tồn tại (để lưu reset token)
      let user = await User.findOne({ email });
      
      if (!user) {
        // Tạo user tạm thời với thông tin tối thiểu
        user = new User({
          email: email,
          passwordHash: 'temp_hash', // Sẽ được thay thế khi set password
          name: email.split('@')[0],
          role: ['manager'],
          isNewUser: true
        });
      }
      
      // Tạo reset token (6 số ngẫu nhiên)
      const resetToken = user.generateResetPasswordToken();
      
      // Lưu user với reset token
      await user.save();
      
      // Gửi email với reset token
      await emailService.sendResetPasswordEmail(email, resetToken);
      
      console.log(`✅ Reset password email sent to: ${email}`);
      
      return {
        success: true,
        message: 'Reset password email has been sent',
        email: email
      };
      
    } catch (error) {
      console.error('❌ Error in forgotPassword:', error.message);
      throw new Error(`Failed to process forgot password request: ${error.message}`);
    }
  }

  // Login với reset password token (1pwd)
  async loginWithResetToken(email, resetToken) {
    try {
      console.log(`🔑 Login attempt with reset token for email: ${email}`);
      
      const user = await User.findOne({ email });
      
      if (!user) {
        throw new Error('Invalid email or reset token');
      }
      
      // Verify reset token
      if (!user.verifyResetPasswordToken(resetToken)) {
        throw new Error('Invalid or expired reset token');
      }
      
      // Tạo temporary token để sử dụng với API set-password
      const tempToken = this.generateToken(user._id);
      
      console.log(`✅ Login successful with reset token for user: ${user.email}`);
      
      return {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
          isNewUser: true // Luôn redirect đến set-password
        },
        tempToken, // Sử dụng tempToken thay vì token
        loginType: 'reset_token',
        redirectTo: 'set-password'
      };
      
    } catch (error) {
      console.error('❌ Error in loginWithResetToken:', error.message);
      throw new Error(`Failed to login with reset token: ${error.message}`);
    }
  }


}

module.exports = new AuthService(); 