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
        throw new Error('Email không tồn tại');
      }

      // Kiểm tra trạng thái active của tài khoản
      if (user.active === false) {
        throw new Error('Tài khoản đã ngừng hoạt động');
      }

      // Kiểm tra mật khẩu
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        throw new Error('Email hoặc mật khẩu không đúng');
      }

      // Invalidate previous session if exists
      if (user.currentSessionToken) {
        // Add old token to blacklist
        if (!global.invalidTokens) {
          global.invalidTokens = new Set();
        }
        global.invalidTokens.add(user.currentSessionToken);
      }

      // Tạo token mới
      const token = this.generateToken(user._id);

      // Cập nhật session token và thời gian login
      user.currentSessionToken = token;
      user.lastLoginAt = new Date();
      await user.save();

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
      
      // Lấy thông tin user từ token với populate đầy đủ
      const user = await User.findById(decoded.id)
        .populate('class_id', 'className classCode description gradeLevel')
        .populate('subject', 'subjectName subjectCode description')
        .populate('school', 'name address phone email website principal')
        .populate('children', 'name studentId class_id')
        .select('-passwordHash -resetPasswordToken -resetPasswordExpires');

      if (!user) {
        throw new Error('User not found');
      }

      // Chuẩn bị response data theo role của user
      const userData = {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone || null,
        address: user.address || null,
        dateOfBirth: user.dateOfBirth || null,
        gender: user.gender || null,
        avatar: user.avatar || null,
        isNewUser: user.isNewUser,
        active: user.active,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        
        // School information (cho tất cả)
        school: user.school ? {
          id: user.school._id,
          name: user.school.name,
          address: user.school.address,
          phone: user.school.phone,
          email: user.school.email,
          website: user.school.website,
          principal: user.school.principal
        } : null,
        
        // Role-specific information
        roleInfo: this.getRoleSpecificInfo(user)
      };

      // Thêm thông tin theo role
      if (user.role.includes('student')) {
        userData.studentId = user.studentId || null;
        userData.academicYear = user.academicYear || null;
        userData.class = user.class_id ? {
          id: user.class_id._id,
          className: user.class_id.className,
          classCode: user.class_id.classCode,
          description: user.class_id.description,
          gradeLevel: user.class_id.gradeLevel
        } : null;
      }

      if (user.role.includes('teacher') || user.role.includes('homeroom_teacher')) {
        userData.teacherId = user.teacherId || null;
        userData.subject = user.subject ? {
          id: user.subject._id,
          subjectName: user.subject.subjectName,
          subjectCode: user.subject.subjectCode,
          description: user.subject.description
        } : null;
        
        // Nếu là giáo viên chủ nhiệm, tìm lớp chủ nhiệm từ Class model
        if (user.role.includes('homeroom_teacher')) {
          const Class = require('../../classes/models/class.model');
          const homeroomClass = await Class.findOne({
            homeroomTeacher: user._id
          }).select('className classCode description gradeLevel');
          
          if (homeroomClass) {
            userData.homeroomClass = {
              id: homeroomClass._id,
              className: homeroomClass.className,
              classCode: homeroomClass.classCode,
              description: homeroomClass.description,
              gradeLevel: homeroomClass.gradeLevel
            };
            
            // Cập nhật homeroomClassId trong roleInfo
            userData.roleInfo.homeroomClassId = homeroomClass._id;
          }
        }
      }

      if (user.role.includes('manager')) {
        userData.managerId = user.managerId || null;
      }

      if (user.role.includes('parent')) {
        userData.parentId = user.parentId || null;
        userData.children = user.children ? user.children.map(child => ({
          id: child._id,
          name: child.name,
          studentId: child.studentId,
          class: child.class_id ? {
            id: child.class_id._id,
            className: child.class_id.className,
            classCode: child.class_id.classCode
          } : null
        })) : [];
      }

      return userData;
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

  // Helper method để lấy thông tin cụ thể theo role
  getRoleSpecificInfo(user) {
    const roleInfo = {
      role: user.role,
      permissions: []
    };

    if (user.role.includes('student')) {
      roleInfo.type = 'student';
      roleInfo.studentId = user.studentId;
      roleInfo.classId = user.class_id ? user.class_id._id : null;
      roleInfo.academicYear = user.academicYear;
      roleInfo.permissions = [
        'view_schedule',
        'view_grades',
        'submit_assignments',
        'view_announcements'
      ];
    }

    if (user.role.includes('teacher')) {
      roleInfo.type = 'teacher';
      roleInfo.teacherId = user.teacherId;
      roleInfo.subjectId = user.subject ? user.subject._id : null;
      roleInfo.homeroomClassId = user.homeroomClass ? user.homeroomClass._id : null;
      roleInfo.permissions = [
        'manage_lessons',
        'create_reminders',
        'grade_students',
        'view_class_schedule',
        'create_announcements'
      ];
    }

          if (user.role.includes('homeroom_teacher')) {
        roleInfo.type = 'homeroom_teacher';
        roleInfo.teacherId = user.teacherId;
        roleInfo.subjectId = user.subject ? user.subject._id : null;
        roleInfo.homeroomClassId = null; // Sẽ được cập nhật sau
        roleInfo.permissions = [
          'manage_lessons',
          'create_reminders',
          'grade_students',
          'view_class_schedule',
          'create_announcements',
          'manage_class'
        ];
      }

    if (user.role.includes('manager')) {
      roleInfo.type = 'manager';
      roleInfo.managerId = user.managerId;
      roleInfo.permissions = [
        'manage_users',
        'manage_classes',
        'manage_subjects',
        'manage_schedules',
        'view_reports',
        'system_admin'
      ];
    }

    if (user.role.includes('parent')) {
      roleInfo.type = 'parent';
      roleInfo.parentId = user.parentId;
      roleInfo.childrenCount = user.children ? user.children.length : 0;
      roleInfo.permissions = [
        'view_children_schedule',
        'view_children_grades',
        'view_announcements'
      ];
    }

    return roleInfo;
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

      // Clear session token
      user.currentSessionToken = undefined;
      await user.save();

      // Thêm token vào blacklist
      if (!global.invalidTokens) {
        global.invalidTokens = new Set();
      }
      global.invalidTokens.add(token);
      
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
      
      // Kiểm tra email có tồn tại trong database hay không
      const user = await User.findOne({ email });
      
      if (!user) {
        throw new Error('Email không tồn tại, liên hệ nhà trường để được hỗ trợ');
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
      throw new Error(`${error.message}`);
    }
  }

  // Login với reset password token (1pwd)
  async loginWithResetToken(email, resetToken) {
    try {
      console.log(`🔑 Login attempt with reset token for email: ${email}`);
      
      const user = await User.findOne({ email });
      
      if (!user) {
        throw new Error('Email không tồn tại');
      }
      
      // Kiểm tra trạng thái active của tài khoản
      if (user.active === false) {
        throw new Error('Tài khoản đã ngừng hoạt động');
      }
      
      // Verify reset token
      if (!user.verifyResetPasswordToken(resetToken)) {
        throw new Error('Mã reset không hợp lệ');
      }
      
      // Invalidate previous session if exists
      if (user.currentSessionToken) {
        if (!global.invalidTokens) {
          global.invalidTokens = new Set();
        }
        global.invalidTokens.add(user.currentSessionToken);
      }
      
      // Tạo temporary token để sử dụng với API set-password
      const tempToken = this.generateToken(user._id);
      
      // Cập nhật session token
      user.currentSessionToken = tempToken;
      user.lastLoginAt = new Date();
      await user.save();
      
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