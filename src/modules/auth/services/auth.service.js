const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

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
}

module.exports = new AuthService(); 