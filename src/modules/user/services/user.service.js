const User = require('../../auth/models/user.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const Subject = require('../../subjects/models/subject.model');

class UserService {
  // Tạo one-time password với chữ hoa, chữ thường, số và ký tự đặc biệt
  generateOTP() {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const specialChars = '!@#$%^&*?';
    
    // Kết hợp tất cả ký tự
    const allChars = uppercase + lowercase + numbers + specialChars;
    
    let password = '';
    
    // Đảm bảo có ít nhất 1 ký tự từ mỗi loại
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += specialChars[Math.floor(Math.random() * specialChars.length)];
    
    // Tạo thêm 8 ký tự ngẫu nhiên (tổng cộng 12 ký tự)
    for (let i = 4; i < 12; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Trộn lại thứ tự các ký tự
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  // Gửi email với OTP
  async sendOTPEmail(email, otp) {
    try {
      // Kiểm tra cấu hình email
      if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.log(`📧 [NO EMAIL CONFIG] OTP for ${email}: ${otp}`);
        console.log('⚠️  Please configure EMAIL_HOST, EMAIL_USER, EMAIL_PASS in .env file to send real emails');
        return;
      }

      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT || 587,
        secure: process.env.EMAIL_PORT == 465, // true for 465, false for other ports
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });

      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: email,
        subject: 'Your One-Time Password for Account Creation - EcoSchool',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2c3e50;">EcoSchool - Account Creation</h1>
            <p>Hello,</p>
            <p>Your account has been created by an administrator. Please use the following one-time password to set up your account:</p>
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; text-align: center; margin: 20px 0;">
              <h2 style="color: #e74c3c; font-size: 24px; letter-spacing: 2px;">${otp}</h2>
            </div>
            <p><strong>Important:</strong></p>
            <ul>
              <li>This password will expire in 24 hours</li>
              <li>Use this password to log in and set your permanent password</li>
              <li>Do not share this password with anyone</li>
            </ul>
            <p>If you did not request this account, please contact your administrator.</p>
            <hr style="margin: 30px 0;">
            <p style="color: #7f8c8d; font-size: 12px;">This is an automated message from EcoSchool system.</p>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);
      console.log(`📧 Email successfully sent to ${email}`);
    } catch (error) {
      console.error('❌ Email sending failed:', error.message);
      // Vẫn log OTP để admin có thể thông báo cho user
      console.log(`📧 [FALLBACK] OTP for ${email}: ${otp}`);
      // Không throw error để không làm gián đoạn quá trình tạo user
    }
  }

  // Gửi email chào mừng cho teacher mới import
  async sendTeacherWelcomeEmail(email, name, tempPassword, subjectName) {
    try {
      // Kiểm tra cấu hình email
      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.log(`📧 [NO EMAIL CONFIG] Temp password for ${email}: ${tempPassword}`);
        console.log('⚠️  Please configure EMAIL_USER, EMAIL_PASS in .env file to send real emails');
        return;
      }

      // Cấu hình transporter (sử dụng Gmail)
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });

      // Nội dung email
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Chào mừng giáo viên mới - EcoSchool',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4CAF50;">Chào mừng ${name} đến với EcoSchool!</h2>
            <p>Bạn đã được thêm vào hệ thống với vai trò <strong>Giáo viên</strong> môn <strong>${subjectName || 'chưa xác định'}</strong>.</p>
            
            <div style="background-color: #f0f8fe; padding: 20px; border-left: 4px solid #4CAF50; margin: 20px 0;">
              <h3 style="margin-top: 0;">Thông tin đăng nhập lần đầu:</h3>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Mật khẩu tạm thời:</strong> <code style="background: #e8e8e8; padding: 4px 8px; border-radius: 4px; font-size: 16px;">${tempPassword}</code></p>
            </div>

            <div style="background-color: #fff3cd; padding: 15px; border: 1px solid #ffeaa7; border-radius: 5px; margin: 20px 0;">
              <h4 style="margin-top: 0; color: #856404;">📋 Hướng dẫn đăng nhập:</h4>
              <ol style="margin: 0; color: #856404;">
                <li>Truy cập trang đăng nhập hệ thống</li>
                <li>Sử dụng email và mật khẩu tạm thời ở trên</li>
                <li>Hệ thống sẽ tự động chuyển đến trang thiết lập mật khẩu mới</li>
                <li>Nhập mật khẩu mới theo yêu cầu</li>
                <li>Hoàn tất và bắt đầu sử dụng hệ thống</li>
              </ol>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" 
                 style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                🚀 Đăng nhập ngay
              </a>
            </div>

            <hr>
            <p style="color: #666; font-size: 12px;">
              Email này được gửi tự động từ hệ thống EcoSchool. Vui lòng không phản hồi email này.<br>
              Nếu bạn gặp vấn đề, vui lòng liên hệ quản trị viên hệ thống.
            </p>
          </div>
        `
      };

      // Gửi email
      await transporter.sendMail(mailOptions);
      console.log(`📧 Teacher welcome email sent to ${email}`);
      
    } catch (error) {
      console.error('❌ Teacher welcome email failed:', error.message);
      // Log mật khẩu tạm thời để admin có thể thông báo cho teacher
      console.log(`📧 [FALLBACK] Temp password for ${email}: ${tempPassword}`);
      // Không throw error để không làm gián đoạn quá trình import
    }
  }

  // Tạo user mới với OTP
  async createUserWithOTP(userData, token) {
    try {
      // Verify token và kiểm tra role manager
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const currentUser = await User.findById(decoded.id);
      
      if (!currentUser || !currentUser.role.includes('manager')) {
        throw new Error('Only managers can create users');
      }

      // Validate role
      if (!userData.role || !['student', 'teacher'].includes(userData.role)) {
        throw new Error('Invalid role. Must be student or teacher');
      }

      // Kiểm tra email đã tồn tại
      const existingUser = await User.findOne({ email: userData.email });
      if (existingUser) {
        throw new Error('Email already exists');
      }

      // Nếu là teacher, validate subject
      if (userData.role === 'teacher' && userData.subjectId) {
        const Subject = require('../../subjects/models/subject.model');
        const subject = await Subject.findById(userData.subjectId);
        if (!subject) {
          throw new Error('Subject not found');
        }
      }

      // Tạo OTP
      const otp = this.generateOTP();
      const otpExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Lưu thông tin đầy đủ vào storage
      global.otpStorage = global.otpStorage || {};
      global.otpStorage[userData.email] = {
        otp,
        otpExpiry,
        userData: userData // Lưu toàn bộ thông tin user
      };

      // Gửi OTP qua email
      await this.sendOTPEmail(userData.email, otp);

      return {
        message: 'OTP sent to email',
        email: userData.email,
        role: userData.role,
        otpExpiry,
        // Tạm thời trả về OTP để test (trong production không nên trả về)
        otp: otp
      };
    } catch (error) {
      throw error;
    }
  }

  // Đăng nhập với email và 1password (OTP)
  async loginWithOTP(email, password) {
    try {
      // Lấy OTP từ storage
      const otpData = global.otpStorage?.[email];
      if (!otpData) {
        throw new Error('No OTP found for this email. Please contact admin to create your account.');
      }

      // Kiểm tra OTP
      if (otpData.otp !== password) {
        throw new Error('Invalid one-time password');
      }

      // Kiểm tra OTP hết hạn
      if (new Date() > new Date(otpData.otpExpiry)) {
        throw new Error('One-time password expired');
      }

      // Tạo token tạm thời để set password
      const tempToken = jwt.sign(
        { email, role: otpData.userData.role },
        process.env.JWT_SECRET,
        { expiresIn: '15m' } // Token hết hạn sau 15 phút
      );

      return {
        message: 'Login successful. Please set your password.',
        tempToken,
        email,
        role: otpData.userData.role,
        redirectTo: 'set-password' // Frontend có thể dùng để redirect
      };
    } catch (error) {
      throw error;
    }
  }

  // Xác thực OTP
  async verifyOTP(email, otp) {
    try {
      // Lấy OTP từ Redis hoặc database
      // TODO: Implement OTP retrieval
      // const storedData = await redis.get(`otp:${email}`);
      // const { otp: storedOTP, otpExpiry, role } = JSON.parse(storedData);

      // Kiểm tra OTP
      // if (!storedOTP || storedOTP !== otp) {
      //   throw new Error('Invalid OTP');
      // }

      // Kiểm tra OTP hết hạn
      // if (new Date() > new Date(otpExpiry)) {
      //   throw new Error('OTP expired');
      // }

      // Tạo token tạm thời để set password
      const tempToken = jwt.sign(
        { email, role: 'student' }, // hoặc role từ storedData
        process.env.JWT_SECRET,
        { expiresIn: '15m' } // Token hết hạn sau 15 phút
      );

      return {
        message: 'OTP verified successfully',
        tempToken
      };
    } catch (error) {
      throw error;
    }
  }

  // Set password mới - handle cả OTP flow và existing user flow
  async setPassword(tokenOrTempToken, password, confirmPassword) {
    try {
      // Verify token
      const decoded = jwt.verify(tokenOrTempToken, process.env.JWT_SECRET);
      
      // Kiểm tra password và confirm password
      if (password !== confirmPassword) {
        throw new Error('Passwords do not match');
      }

      // Validate password strength
      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters long');
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);

      // Kiểm tra xem đây là tempToken (có email + role) hay JWT token (có id)
      if (decoded.id) {
        // Đây là JWT token của user đã tồn tại (student/teacher được tạo bởi manager hoặc reset password)
        const userId = decoded.id;
        
        // Tìm user
        const user = await User.findById(userId);
        if (!user) {
          throw new Error('User not found');
        }

        // Kiểm tra user có phải là new user không hoặc đang trong quá trình reset password
        const isResetPassword = user.resetPasswordToken && user.resetPasswordExpires;
        if (!user.isNewUser && !isResetPassword) {
          throw new Error('This user has already set up their password');
        }

        // Cập nhật user
        const updateData = { 
          passwordHash,
          isNewUser: false // Đánh dấu user đã setup password
        };

        // Nếu đang reset password, xóa reset token
        if (isResetPassword) {
          updateData.resetPasswordToken = undefined;
          updateData.resetPasswordExpires = undefined;
        }

        const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true });

        // Tạo token mới cho user
        const newToken = jwt.sign(
          { id: updatedUser._id, email: updatedUser.email, role: updatedUser.role },
          process.env.JWT_SECRET,
          { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        console.log(`✅ Password set successfully for user: ${user.email} ${isResetPassword ? '(via reset)' : '(new user)'}`);

        return {
          message: 'Password set successfully',
          user: {
            id: updatedUser._id,
            email: updatedUser.email,
            name: updatedUser.name,
            role: updatedUser.role,
            class_id: updatedUser.class_id,
            subject: updatedUser.subject,
            isNewUser: updatedUser.isNewUser
          },
          token: newToken,
          redirectTo: 'home'
        };

      } else if (decoded.email && decoded.role) {
        // Đây là tempToken từ OTP flow (tạo user mới)
        const { email, role } = decoded;

        // Lấy thông tin đầy đủ từ OTP storage
        const otpData = global.otpStorage?.[email];
        if (!otpData || !otpData.userData) {
          throw new Error('User data not found. Please restart the registration process.');
        }

        const userData = otpData.userData;
        const Subject = require('../../subjects/models/subject.model');

        // Tạo user với thông tin đầy đủ
        const newUserData = {
          email: userData.email,
          passwordHash,
          name: userData.name,
          role: [userData.role],
          dateOfBirth: userData.dateOfBirth ? new Date(userData.dateOfBirth) : null,
          gender: userData.gender || 'other',
          isNewUser: false, // User đã hoàn thành setup
          active: true
        };

        // Nếu là teacher, thêm subject
        if (userData.role === 'teacher' && userData.subjectId) {
          newUserData.subject = userData.subjectId;
        }

        const user = await User.create(newUserData);

        // Populate subject cho response nếu là teacher
        if (userData.role === 'teacher' && user.subject) {
          await user.populate('subject', 'subjectName subjectCode');
        }

        // Xóa OTP đã sử dụng
        if (global.otpStorage && global.otpStorage[email]) {
          delete global.otpStorage[email];
        }

        // Vô hiệu hóa tempToken
        global.invalidTokens = global.invalidTokens || new Set();
        global.invalidTokens.add(tokenOrTempToken);

        // Tạo response theo format mong muốn
        const response = {
          message: 'Teacher created successfully',
          data: {
            id: user._id,
            name: user.name,
            email: user.email,
            dateOfBirth: user.dateOfBirth,
            gender: user.gender,
            role: user.role,
            isNewUser: user.isNewUser,
            active: user.active,
            status: 'active',
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
          }
        };

        // Thêm subject info nếu là teacher
        if (userData.role === 'teacher' && user.subject) {
          response.data.subject = {
            id: user.subject._id,
            subjectName: user.subject.subjectName,
            subjectCode: user.subject.subjectCode
          };
        }

        return response;

      } else {
        throw new Error('Invalid token format');
      }

    } catch (error) {
      throw error;
    }
  }

  // Lấy danh sách users
  async getUsers({ page = 1, limit = 10, role, search }) {
    try {
      const query = {};
      
      if (role) {
        query.role = role;
      }

      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ];
      }

      const users = await User.find(query)
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ createdAt: -1 });

      const total = await User.countDocuments(query);

      return {
        users: users.map(user => ({
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
          subject: user.subject,
          isNewUser: user.isNewUser,
          active: user.active,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        })),
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw error;
    }
  }

  // Lấy danh sách tài khoản cho trang quản lý
  async getAccountsForManagement({ role, search, gradeLevel, className, page = 1, limit = 20 }) {
    try {
      const query = { active: true };
      
      // Filter theo role (student hoặc teacher/homeroom_teacher)
      if (role === 'student') {
        query.role = 'student';
      } else if (role === 'teacher') {
        query.role = { $in: ['teacher', 'homeroom_teacher'] };
      }

      // Tìm kiếm - sẽ được xử lý trong aggregation pipeline
      let searchQuery = null;
      if (search) {
        searchQuery = [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { studentId: { $regex: search, $options: 'i' } },
          { teacherId: { $regex: search, $options: 'i' } }
        ];
      }

      // Sử dụng aggregation để filter theo khối và lớp
      let pipeline = [
        { $match: query },
        {
          $lookup: {
            from: 'classes',
            localField: 'class_id',
            foreignField: '_id',
            as: 'classInfo'
          }
        },
        { $unwind: { path: '$classInfo', preserveNullAndEmptyArrays: true } }
      ];



      // Filter theo khối (có thể từ class_id hoặc gradeLevel trực tiếp)
      if (gradeLevel) {
        const gradeLevelInt = parseInt(gradeLevel);
        pipeline.push({
          $match: {
            $or: [
              { gradeLevel: gradeLevelInt },
              { 'classInfo.gradeLevel': gradeLevelInt }
            ]
          }
        });
      }

      // Filter theo lớp (có thể từ class_id hoặc className trực tiếp)
      if (className) {
        pipeline.push({
          $match: {
            $or: [
              { className: className },
              { 'classInfo.className': className }
            ]
          }
        });
      }

      // Thêm populate cho subject
      pipeline.push({
        $lookup: {
          from: 'subjects',
          localField: 'subject',
          foreignField: '_id',
          as: 'subjectInfo'
        }
      });
      pipeline.push({ $unwind: { path: '$subjectInfo', preserveNullAndEmptyArrays: true } });

      // Thêm tìm kiếm theo tên môn học sau khi đã lookup subject
      if (search) {
        pipeline.push({
          $match: {
            $or: [
              { name: { $regex: search, $options: 'i' } },
              { email: { $regex: search, $options: 'i' } },
              { studentId: { $regex: search, $options: 'i' } },
              { teacherId: { $regex: search, $options: 'i' } },
              { 'subjectInfo.subjectName': { $regex: search, $options: 'i' } }
            ]
          }
        });
      }

      // Thêm pagination và sorting
      pipeline.push(
        { $sort: { name: 1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit }
      );

      const users = await User.aggregate(pipeline);

      // Đếm tổng số kết quả (không có pagination)
      const countPipeline = [
        { $match: query },
        {
          $lookup: {
            from: 'classes',
            localField: 'class_id',
            foreignField: '_id',
            as: 'classInfo'
          }
        },
        { $unwind: { path: '$classInfo', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'subjects',
            localField: 'subject',
            foreignField: '_id',
            as: 'subjectInfo'
          }
        },
        { $unwind: { path: '$subjectInfo', preserveNullAndEmptyArrays: true } }
      ];

      if (gradeLevel) {
        const gradeLevelInt = parseInt(gradeLevel);
        countPipeline.push({
          $match: {
            $or: [
              { gradeLevel: gradeLevelInt },
              { 'classInfo.gradeLevel': gradeLevelInt }
            ]
          }
        });
      }

      if (className) {
        countPipeline.push({
          $match: {
            $or: [
              { className: className },
              { 'classInfo.className': className }
            ]
          }
        });
      }

      // Thêm tìm kiếm theo môn học cho count pipeline
      if (search) {
        countPipeline.push({
          $match: {
            $or: [
              { name: { $regex: search, $options: 'i' } },
              { email: { $regex: search, $options: 'i' } },
              { studentId: { $regex: search, $options: 'i' } },
              { teacherId: { $regex: search, $options: 'i' } },
              { 'subjectInfo.subjectName': { $regex: search, $options: 'i' } }
            ]
          }
        });
      }

      countPipeline.push({ $count: 'total' });
      const countResult = await User.aggregate(countPipeline);
      const total = countResult.length > 0 ? countResult[0].total : 0;

      // Format dữ liệu theo yêu cầu UI
      const formattedUsers = users.map(user => {
        const baseData = {
          id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar || null,
          active: user.active,
          createdAt: user.createdAt
        };

        if (user.role == 'student') {
          return {
            ...baseData,
            type: 'student',
            code: user.studentId || `HS-${user._id.toString().slice(-6)}`,
            class: user.classInfo?.className || user.className || 'Chưa phân lớp',
            gradeLevel: user.classInfo?.gradeLevel || user.gradeLevel
          };
        } else {
          return {
            ...baseData,
            type: 'teacher',
            code: user.teacherId || `GV-${user._id.toString().slice(-6)}`,
            subject: user.subjectInfo?.subjectName || 'Chưa phân môn',
            subjectCode: user.subjectInfo?.subjectCode
          };
        }
      });

      return {
        accounts: formattedUsers,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw error;
    }
  }



  // Lấy danh sách lớp theo khối
  async getClassesByGrade(gradeLevel) {
    try {
      const gradeLevelInt = parseInt(gradeLevel);
      
      const classes = await User.aggregate([
        {
          $match: {
            role: 'student',
            active: true
          }
        },
        {
          $lookup: {
            from: 'classes',
            localField: 'class_id',
            foreignField: '_id',
            as: 'classInfo'
          }
        },
        { $unwind: { path: '$classInfo', preserveNullAndEmptyArrays: true } },
        {
          $match: {
            $or: [
              { gradeLevel: gradeLevelInt },
              { 'classInfo.gradeLevel': gradeLevelInt }
            ]
          }
        },
        {
          $group: {
            _id: {
              $ifNull: ['$classInfo.className', '$className']
            },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ]);

      return classes.map(cls => ({
        className: cls._id,
        studentCount: cls.count
      }));
    } catch (error) {
      throw error;
    }
  }

  // Lấy thông tin chi tiết tài khoản
  async getAccountDetail(id) {
    try {
      const user = await User.findById(id)
        .populate([
          { path: 'class_id', select: 'className gradeLevel academicYear' },
          { path: 'subject', select: 'subjectName subjectCode' }
        ]);

      if (!user) {
        throw new Error('Tài khoản không tồn tại');
      }

      // Format dữ liệu chi tiết
      const accountDetail = {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        address: user.address || '',
        dateOfBirth: user.dateOfBirth || null,
        gender: user.gender || '',
        avatar: user.avatar || null,
        active: user.active,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };

      if (user.role == 'student') {
        return {
          ...accountDetail,
          studentId: user.studentId || `HS-${user._id.toString().slice(-6)}`,
          class: {
            name: user.class_id?.className || user.className || 'Chưa phân lớp',
            gradeLevel: user.class_id?.gradeLevel || user.gradeLevel,
            academicYear: user.class_id?.academicYear || user.academicYear
          },
          subjects: [],
          roleInfo: { type: 'student' }
        };
      } else {
        // Kiểm tra xem teacher có là giáo viên chủ nhiệm lớp nào không
        let homeroomClass = null;
        if (user.role.includes('homeroom_teacher') || user.role.includes('teacher')) {
          const Class = require('../../classes/models/class.model');
          homeroomClass = await Class.findOne({ 
            homeroomTeacher: user._id,
            active: true 
          }).select('className gradeLevel academicYear');
        }

        return {
          ...accountDetail,
          teacherId: user.teacherId || `GV-${user._id.toString().slice(-6)}`,
          subject: user.subject?.subjectName || 'Chưa phân môn',
          subjectCode: user.subject?.subjectCode,
          subject: user.subject?.subjectName || 'Chưa phân môn',
          homeroomClass: homeroomClass ? {
            id: homeroomClass._id,
            name: homeroomClass.className,
            gradeLevel: homeroomClass.gradeLevel,
            academicYear: homeroomClass.academicYear
          } : null,
          roleInfo: { 
            type: 'teacher',
            isHomeroom: user.role.includes('homeroom_teacher'),
            isHomeroomTeacher: homeroomClass !== null
          }
        };
      }
    } catch (error) {
      throw error;
    }
  }

  // Lấy thông tin user theo ID
  async getUserById(id) {
    try {
      const user = await User.findById(id);
      if (!user) {
        throw new Error('User not found');
      }

      return {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        class_id: user.class_id,
        subject: user.subject,
        isNewUser: user.isNewUser,
        active: user.active,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };
    } catch (error) {
      throw error;
    }
  }

  // Cập nhật thông tin user
  async updateUser(id, updateData) {
    try {
      const user = await User.findById(id);
      if (!user) {
        throw new Error('User not found');
      }

      if (updateData.password) {
        const salt = await bcrypt.genSalt(10);
        updateData.passwordHash = await bcrypt.hash(updateData.password, salt);
        delete updateData.password;
      }

      const updatedUser = await User.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true }
      );

      return {
        id: updatedUser._id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
        subject: updatedUser.subject,
        isNewUser: updatedUser.isNewUser,
        active: updatedUser.active,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt
      };
    } catch (error) {
      throw error;
    }
  }

  // Cập nhật thông tin cá nhân của user hiện tại
  async updatePersonalInfo(userId, updateData) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Chỉ cho phép update các trường thông tin cá nhân
      const allowedFields = ['name', 'dateOfBirth', 'gender', 'phone', 'address'];
      const filteredData = {};
      
      for (const field of allowedFields) {
        if (updateData.hasOwnProperty(field)) {
          filteredData[field] = updateData[field];
        }
      }

      // Nếu không có dữ liệu để update
      if (Object.keys(filteredData).length === 0) {
        throw new Error('No valid fields to update');
      }

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $set: filteredData },
        { new: true }
      ).populate([
        { path: 'subject', select: 'subjectName subjectCode' },
        { path: 'class_id', select: 'className' },
        { path: 'school', select: 'schoolName' }
      ]);

      return {
        id: updatedUser._id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
        roleInfo: {
          type: updatedUser.role[0],
          role: updatedUser.role
        },
        dateOfBirth: updatedUser.dateOfBirth,
        gender: updatedUser.gender,
        phone: updatedUser.phone,
        address: updatedUser.address,
        subject: updatedUser.subject,
        class: updatedUser.class_id,
        school: updatedUser.school,
        isNewUser: updatedUser.isNewUser,
        active: updatedUser.active,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt
      };
    } catch (error) {
      throw error;
    }
  }

  // Xóa user
  async deleteUser(id) {
    try {
      const user = await User.findById(id);
      if (!user) {
        throw new Error('User not found');
      }

      await User.findByIdAndDelete(id);
    } catch (error) {
      throw error;
    }
  }

  // Cập nhật trạng thái active của user
  async updateUserStatus(id, active) {
    try {
      const user = await User.findById(id);
      if (!user) {
        throw new Error('User not found');
      }

      const updatedUser = await User.findByIdAndUpdate(
        id,
        { $set: { active } },
        { new: true }
      );

      return {
        id: updatedUser._id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
        isNewUser: updatedUser.isNewUser,
        active: updatedUser.active,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt
      };
    } catch (error) {
      throw error;
    }
  }

  // Import teachers từ file Excel
  async importTeachers(filePath, token) {
    const XLSX = require('xlsx');
    const fs = require('fs');
    
    try {
      // Verify token và kiểm tra role manager
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const currentUser = await User.findById(decoded.id);
      
      if (!currentUser || !currentUser.role.includes('manager')) {
        throw new Error('Only managers can import teachers');
      }

      // Đọc file Excel
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const teachers = XLSX.utils.sheet_to_json(worksheet);

      if (!teachers || teachers.length === 0) {
        throw new Error('No data found in Excel file');
      }

      const results = {
        success: [],
        failed: [],
        total: teachers.length
      };

      // Xử lý từng teacher
      for (let i = 0; i < teachers.length; i++) {
        const teacher = teachers[i];
        
        try {
          // Validate dữ liệu
          if (!teacher.name || !teacher.email || !teacher.subjectId) {
            results.failed.push({
              row: i + 2, // +2 vì hàng 1 là header, index bắt đầu từ 0
              data: teacher,
              error: 'Missing required fields: name, email, or subjectId'
            });
            continue;
          }

          // Kiểm tra email đã tồn tại
          const existingUser = await User.findOne({ email: teacher.email });
          if (existingUser) {
            results.failed.push({
              row: i + 2,
              data: teacher,
              error: 'Email already exists'
            });
            continue;
          }

          // Tạo mật khẩu tạm thời và hash
          const tempPassword = this.generateOTP();
          const passwordHash = await bcrypt.hash(tempPassword, 12);

          // Tạo user mới với isNewUser = true (sẽ redirect tới set-password)
          const newUser = new User({
            name: teacher.name,
            email: teacher.email,
            passwordHash,
            dateOfBirth: teacher.dateOfBirth ? new Date(teacher.dateOfBirth) : null,
            gender: teacher.gender || 'other',
            role: ['teacher'],
            subject: teacher.subjectId,
            isNewUser: true, // Sẽ redirect tới set-password khi login
            active: teacher.active !== false
          });

          await newUser.save();

          // Gửi email với mật khẩu tạm thời
          await this.sendTeacherWelcomeEmail(teacher.email, teacher.name, tempPassword, teacher.subjectName);

          results.success.push({
            row: i + 2,
            email: teacher.email,
            name: teacher.name,
            status: 'awaiting_first_login',
            tempPassword: tempPassword // Tạm thời để test, production nên bỏ
          });

        } catch (error) {
          results.failed.push({
            row: i + 2,
            data: teacher,
            error: error.message
          });
        }
      }

      // Xóa file tạm sau khi xử lý
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      return results;

    } catch (error) {
      // Xóa file tạm nếu có lỗi
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      throw error;
    }
  }

  // Import teachers từ base64 string
  async importTeachersBase64(fileData, token) {
    const XLSX = require('xlsx');
    const fs = require('fs');
    
    try {
      // Verify token và kiểm tra role manager
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const currentUser = await User.findById(decoded.id);
      
      if (!currentUser || !currentUser.role.includes('manager')) {
        throw new Error('Only managers can import teachers');
      }

      // Decode base64 và tạo buffer
      const buffer = Buffer.from(fileData, 'base64');
      
      // Đọc Excel từ buffer
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const teachers = XLSX.utils.sheet_to_json(worksheet);

      if (!teachers || teachers.length === 0) {
        throw new Error('No data found in Excel file');
      }

      const results = {
        success: [],
        failed: [],
        total: teachers.length
      };

      // Xử lý từng teacher
      for (let i = 0; i < teachers.length; i++) {
        const teacher = teachers[i];
        
        try {
          // Validate dữ liệu
          if (!teacher.name || !teacher.email || !teacher.subjectId) {
            results.failed.push({
              row: i + 2, // +2 vì hàng 1 là header, index bắt đầu từ 0
              data: teacher,
              error: 'Missing required fields: name, email, or subjectId'
            });
            continue;
          }

          // Kiểm tra email đã tồn tại
          const existingUser = await User.findOne({ email: teacher.email });
          if (existingUser) {
            results.failed.push({
              row: i + 2,
              data: teacher,
              error: 'Email already exists'
            });
            continue;
          }

          // Tạo mật khẩu tạm thời và hash
          const tempPassword = this.generateOTP();
          const passwordHash = await bcrypt.hash(tempPassword, 12);

          // Tạo user mới với isNewUser = true (sẽ redirect tới set-password)
          const newUser = new User({
            name: teacher.name,
            email: teacher.email,
            passwordHash,
            dateOfBirth: teacher.dateOfBirth ? new Date(teacher.dateOfBirth) : null,
            gender: teacher.gender || 'other',
            role: ['teacher'],
            subject: teacher.subjectId,
            isNewUser: true, // Sẽ redirect tới set-password khi login
            active: teacher.active !== false
          });

          await newUser.save();

          // Gửi email với mật khẩu tạm thời
          await this.sendTeacherWelcomeEmail(teacher.email, teacher.name, tempPassword, teacher.subjectName);

          results.success.push({
            row: i + 2,
            email: teacher.email,
            name: teacher.name,
            status: 'awaiting_first_login',
            tempPassword: tempPassword // Tạm thời để test, production nên bỏ
          });

        } catch (error) {
          results.failed.push({
            row: i + 2,
            data: teacher,
            error: error.message
          });
        }
      }

      return results;

    } catch (error) {
      throw error;
    }
  }

  // Gửi email chào mừng cho student mới import
  async sendStudentWelcomeEmail(email, name, tempPassword, className) {
    try {
      // Kiểm tra cấu hình email
      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.log(`📧 [NO EMAIL CONFIG] Temp password for ${email}: ${tempPassword}`);
        console.log('⚠️  Please configure EMAIL_USER, EMAIL_PASS in .env file to send real emails');
        return;
      }

      // Cấu hình transporter (sử dụng Gmail)
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });

      // Nội dung email
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Chào mừng học sinh mới - EcoSchool',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4CAF50;">Chào mừng ${name} đến với EcoSchool! 🎓</h2>
            <p>Bạn đã được thêm vào hệ thống với vai trò <strong>Học sinh</strong> lớp <strong>${className || 'chưa xác định'}</strong>.</p>
            
            <div style="background-color: #f0f8fe; padding: 20px; border-left: 4px solid #4CAF50; margin: 20px 0;">
              <h3 style="margin-top: 0;">Thông tin đăng nhập lần đầu:</h3>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Mật khẩu tạm thời:</strong> <code style="background: #e8e8e8; padding: 4px 8px; border-radius: 4px; font-size: 16px;">${tempPassword}</code></p>
            </div>

            <div style="background-color: #fff3cd; padding: 15px; border: 1px solid #ffeaa7; border-radius: 5px; margin: 20px 0;">
              <h4 style="margin-top: 0; color: #856404;">📋 Hướng dẫn đăng nhập:</h4>
              <ol style="margin: 0; color: #856404;">
                <li>Truy cập trang đăng nhập hệ thống</li>
                <li>Sử dụng email và mật khẩu tạm thời ở trên</li>
                <li>Hệ thống sẽ tự động chuyển đến trang thiết lập mật khẩu mới</li>
                <li>Nhập mật khẩu mới theo yêu cầu</li>
                <li>Hoàn tất và bắt đầu sử dụng hệ thống</li>
              </ol>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" 
                 style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                🚀 Đăng nhập ngay
              </a>
            </div>

            <div style="background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h4 style="margin-top: 0; color: #2e7d32;">📚 Thông tin lớp học:</h4>
              <p style="margin: 0; color: #2e7d32;">Lớp: <strong>${className}</strong></p>
              <p style="margin: 0; color: #2e7d32;">Năm học: <strong>2024-2025</strong></p>
            </div>

            <hr>
            <p style="color: #666; font-size: 12px;">
              Email này được gửi tự động từ hệ thống EcoSchool. Vui lòng không phản hồi email này.<br>
              Nếu bạn gặp vấn đề, vui lòng liên hệ giáo viên chủ nhiệm hoặc quản trị viên hệ thống.
            </p>
          </div>
        `
      };

      // Gửi email
      await transporter.sendMail(mailOptions);
      console.log(`📧 Student welcome email sent to ${email}`);
      
    } catch (error) {
      console.error('❌ Student welcome email failed:', error.message);
      // Log mật khẩu tạm thời để admin có thể thông báo cho student
      console.log(`📧 [FALLBACK] Temp password for ${email}: ${tempPassword}`);
      // Không throw error để không làm gián đoạn quá trình import
    }
  }

  // Import students từ file xlsx
  async importStudents(filePath, token) {
    const XLSX = require('xlsx');
    const fs = require('fs');
    const Class = require('../../classes/models/class.model');
    
    try {
      // Verify token và kiểm tra role manager
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const currentUser = await User.findById(decoded.id);
      
      if (!currentUser || !currentUser.role.includes('manager')) {
        throw new Error('Only managers can import students');
      }

      // Đọc file Excel
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const students = XLSX.utils.sheet_to_json(worksheet);

      if (!students || students.length === 0) {
        throw new Error('No data found in Excel file');
      }

      const results = {
        success: [],
        failed: [],
        total: students.length
      };

      // Xử lý từng student
      for (let i = 0; i < students.length; i++) {
        const student = students[i];
        
        try {
          // Validate dữ liệu
          if (!student.name || !student.email || !student.studentId || !student.className) {
            results.failed.push({
              row: i + 2, // +2 vì hàng 1 là header, index bắt đầu từ 0
              data: student,
              error: 'Missing required fields: name, email, studentId, or className'
            });
            continue;
          }

          // Kiểm tra email đã tồn tại
          const existingUser = await User.findOne({ email: student.email });
          if (existingUser) {
            results.failed.push({
              row: i + 2,
              data: student,
              error: 'Email already exists'
            });
            continue;
          }

          // Kiểm tra studentId đã tồn tại
          const existingStudentId = await User.findOne({ studentId: student.studentId });
          if (existingStudentId) {
            results.failed.push({
              row: i + 2,
              data: student,
              error: 'Student ID already exists'
            });
            continue;
          }

          // Tìm lớp học theo tên
          const classInfo = await Class.findOne({ 
            className: student.className,
            academicYear: student.schoolYear || '2024-2025',
            active: true
          });

          if (!classInfo) {
            results.failed.push({
              row: i + 2,
              data: student,
              error: `Class ${student.className} not found for academic year ${student.schoolYear || '2024-2025'}`
            });
            continue;
          }

          // Tạo mật khẩu tạm thời và hash
          const tempPassword = this.generateOTP();
          const passwordHash = await bcrypt.hash(tempPassword, 12);

          // Tạo user mới với isNewUser = true (sẽ redirect tới set-password)
          const newUser = new User({
            name: student.name,
            email: student.email,
            passwordHash,
            dateOfBirth: student.dateOfBirth ? new Date(student.dateOfBirth) : null,
            gender: student.gender || 'other',
            studentId: student.studentId,
            class_id: classInfo._id,
            role: ['student'],
            isNewUser: true, // Sẽ redirect tới set-password khi login
            active: student.active !== false
          });

          await newUser.save();

          // Gửi email với mật khẩu tạm thời
          await this.sendStudentWelcomeEmail(student.email, student.name, tempPassword, student.className);

          results.success.push({
            row: i + 2,
            email: student.email,
            name: student.name,
            studentId: student.studentId,
            className: student.className,
            status: 'awaiting_first_login',
            tempPassword: tempPassword // Tạm thời để test, production nên bỏ
          });

        } catch (error) {
          results.failed.push({
            row: i + 2,
            data: student,
            error: error.message
          });
        }
      }

      // Xóa file tạm sau khi xử lý
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      return results;

    } catch (error) {
      // Xóa file tạm nếu có lỗi
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      throw error;
    }
  }

  // Import students từ base64 string
  async importStudentsBase64(fileData, token) {
    const XLSX = require('xlsx');
    const Class = require('../../classes/models/class.model');
    
    try {
      // Verify token và kiểm tra role manager
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const currentUser = await User.findById(decoded.id);
      
      if (!currentUser || !currentUser.role.includes('manager')) {
        throw new Error('Only managers can import students');
      }

      // Decode base64 và tạo buffer
      const buffer = Buffer.from(fileData, 'base64');
      
      // Đọc Excel từ buffer
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const students = XLSX.utils.sheet_to_json(worksheet);

      if (!students || students.length === 0) {
        throw new Error('No data found in Excel file');
      }

      const results = {
        success: [],
        failed: [],
        total: students.length
      };

      // Xử lý từng student
      for (let i = 0; i < students.length; i++) {
        const student = students[i];
        
        try {
          // Validate dữ liệu
          if (!student.name || !student.email || !student.studentId || !student.className) {
            results.failed.push({
              row: i + 2, // +2 vì hàng 1 là header, index bắt đầu từ 0
              data: student,
              error: 'Missing required fields: name, email, studentId, or className'
            });
            continue;
          }

          // Kiểm tra email đã tồn tại
          const existingUser = await User.findOne({ email: student.email });
          if (existingUser) {
            results.failed.push({
              row: i + 2,
              data: student,
              error: 'Email already exists'
            });
            continue;
          }

          // Kiểm tra studentId đã tồn tại
          const existingStudentId = await User.findOne({ studentId: student.studentId });
          if (existingStudentId) {
            results.failed.push({
              row: i + 2,
              data: student,
              error: 'Student ID already exists'
            });
            continue;
          }

          // Tìm lớp học theo tên
          const classInfo = await Class.findOne({ 
            className: student.className,
            academicYear: student.schoolYear || '2024-2025',
            active: true
          });

          if (!classInfo) {
            results.failed.push({
              row: i + 2,
              data: student,
              error: `Class ${student.className} not found for academic year ${student.schoolYear || '2024-2025'}`
            });
            continue;
          }

          // Tạo mật khẩu tạm thời và hash
          const tempPassword = this.generateOTP();
          const passwordHash = await bcrypt.hash(tempPassword, 12);

          // Tạo user mới với isNewUser = true (sẽ redirect tới set-password)
          const newUser = new User({
            name: student.name,
            email: student.email,
            passwordHash,
            dateOfBirth: student.dateOfBirth ? new Date(student.dateOfBirth) : null,
            gender: student.gender || 'other',
            studentId: student.studentId,
            class_id: classInfo._id,
            role: ['student'],
            isNewUser: true, // Sẽ redirect tới set-password khi login
            active: student.active !== false
          });

          await newUser.save();

          // Gửi email với mật khẩu tạm thời
          await this.sendStudentWelcomeEmail(student.email, student.name, tempPassword, student.className);

          results.success.push({
            row: i + 2,
            email: student.email,
            name: student.name,
            studentId: student.studentId,
            className: student.className,
            status: 'awaiting_first_login',
            tempPassword: tempPassword // Tạm thời để test, production nên bỏ
          });

        } catch (error) {
          results.failed.push({
            row: i + 2,
            data: student,
            error: error.message
          });
        }
      }

      return results;

    } catch (error) {
      throw error;
    }
  }

  // Tạo student mới với thông tin đầy đủ (chỉ manager)
  async createStudent(studentData, token) {
    const Class = require('../../classes/models/class.model');

    try {
      // Verify token và kiểm tra role manager
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const currentUser = await User.findById(decoded.id);
      
      if (!currentUser || !currentUser.role.includes('manager')) {
        throw new Error('Only managers can create students');
      }

      // Validate dữ liệu bắt buộc
      const { name, email, studentId, className, academicYear, dateOfBirth, gender } = studentData;
      
      if (!name || !email || !studentId || !className) {
        throw new Error('Missing required fields: name, email, studentId, or className');
      }

      // Kiểm tra email đã tồn tại
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        throw new Error('Email already exists');
      }

      // Kiểm tra studentId đã tồn tại
      const existingStudentId = await User.findOne({ studentId });
      if (existingStudentId) {
        throw new Error('Student ID already exists');
      }

      // Tìm lớp học theo tên và năm học
      const classInfo = await Class.findOne({ 
        className,
        academicYear: academicYear || '2024-2025',
        active: true
      });

      if (!classInfo) {
        throw new Error(`Class ${className} not found for academic year ${academicYear || '2024-2025'}`);
      }

      // Tạo mật khẩu tạm thời và hash
      const tempPassword = this.generateOTP();
      const passwordHash = await bcrypt.hash(tempPassword, 12);

      // Tạo student mới
      const newStudent = new User({
        name,
        email,
        passwordHash,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        gender: gender || 'other',
        studentId,
        class_id: classInfo._id,
        role: ['student'],
        isNewUser: true, // Sẽ redirect tới set-password khi login
        active: true
      });

      await newStudent.save();

      // Gửi email với mật khẩu tạm thời
      await this.sendStudentWelcomeEmail(email, name, tempPassword, className);

      // Populate class info cho response
      await newStudent.populate('class_id', 'className academicYear');

      return {
        id: newStudent._id,
        name: newStudent.name,
        email: newStudent.email,
        studentId: newStudent.studentId,
        class: {
          id: newStudent.class_id._id,
          className: newStudent.class_id.className,
          academicYear: newStudent.class_id.academicYear
        },
        dateOfBirth: newStudent.dateOfBirth,
        gender: newStudent.gender,
        role: newStudent.role,
        isNewUser: newStudent.isNewUser,
        active: newStudent.active,
        tempPassword: tempPassword, // Tạm thời để test, production nên bỏ
        status: 'awaiting_first_login',
        createdAt: newStudent.createdAt,
        updatedAt: newStudent.updatedAt
      };

    } catch (error) {
      throw error;
    }
  }

  // Tạo teacher mới với thông tin đầy đủ (chỉ manager)
  async createTeacher(teacherData, token) {
    const Subject = require('../../subjects/models/subject.model');

    try {
      // Verify token và kiểm tra role manager
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const currentUser = await User.findById(decoded.id);
      
      if (!currentUser || !currentUser.role.includes('manager')) {
        throw new Error('Only managers can create teachers');
      }

      // Validate dữ liệu bắt buộc
      const { name, email, subjectId, role, dateOfBirth, gender } = teacherData;
      
      if (!name || !email || !subjectId) {
        throw new Error('Missing required fields: name, email, or subjectId');
      }

      // Kiểm tra email đã tồn tại
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        throw new Error('Email already exists');
      }

      // Kiểm tra subject có tồn tại không
      const subject = await Subject.findById(subjectId);
      if (!subject) {
        throw new Error('Subject not found');
      }

      // Xác định role - mặc định là 'teacher' nếu không được cung cấp
      const teacherRole = role && ['teacher', 'homeroom_teacher'].includes(role) ? role : 'teacher';

      // Tạo mật khẩu tạm thời và hash
      const tempPassword = this.generateOTP();
      const passwordHash = await bcrypt.hash(tempPassword, 12);

      // Tạo teacher mới
      const newTeacher = new User({
        name,
        email,
        passwordHash,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        gender: gender || 'other',
        role: [teacherRole],
        subject: subjectId,
        isNewUser: true, // Sẽ redirect tới set-password khi login
        active: true
      });

      await newTeacher.save();

      // Populate subject cho response
      await newTeacher.populate('subject', 'subjectName subjectCode');

      // Gửi email với mật khẩu tạm thời
      await this.sendTeacherWelcomeEmail(email, name, tempPassword, subject.subjectName);

      return {
        id: newTeacher._id,
        name: newTeacher.name,
        email: newTeacher.email,
        subject: {
          id: newTeacher.subject._id,
          subjectName: newTeacher.subject.subjectName,
          subjectCode: newTeacher.subject.subjectCode
        },
        dateOfBirth: newTeacher.dateOfBirth,
        gender: newTeacher.gender,
        role: newTeacher.role,
        isNewUser: newTeacher.isNewUser,
        active: newTeacher.active,
        tempPassword: tempPassword, // Tạm thời để test, production nên bỏ
        status: 'awaiting_first_login',
        createdAt: newTeacher.createdAt,
        updatedAt: newTeacher.updatedAt
      };

    } catch (error) {
      throw error;
    }
  }

  // Tạo parent mới với thông tin đầy đủ (chỉ manager)
  async createParent(parentData, token) {
    try {
      // Verify token và kiểm tra role manager
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const currentUser = await User.findById(decoded.id);
      
      if (!currentUser || !currentUser.role.includes('manager')) {
        throw new Error('Only managers can create parents');
      }

      // Validate dữ liệu bắt buộc
      const { name, email, phone, childrenIds, dateOfBirth, gender, address } = parentData;
      
      if (!name || !phone || !childrenIds || !Array.isArray(childrenIds) || childrenIds.length === 0) {
        throw new Error('Missing required fields: name, phone, or childrenIds (must be a non-empty array)');
      }

      // Generate email if not provided
      const parentEmail = email || this.generateParentEmail(name);

      // Kiểm tra email đã tồn tại (nếu được cung cấp)
      if (email) {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
          throw new Error('Email already exists');
        }
      }

      // Kiểm tra phone đã tồn tại
      const existingPhone = await User.findOne({ phone });
      if (existingPhone) {
        throw new Error('Phone number already exists');
      }

      // Kiểm tra tất cả children có tồn tại và là student không
      const children = await User.find({ 
        _id: { $in: childrenIds },
        role: { $in: ['student'] }
      });

      if (children.length !== childrenIds.length) {
        throw new Error('Some children not found or are not students');
      }

      // Tạo mật khẩu tạm thời và hash
      const tempPassword = this.generateOTP();
      const passwordHash = await bcrypt.hash(tempPassword, 12);

      // Tạo parent mới
      const newParent = new User({
        name,
        email: parentEmail,
        passwordHash,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        gender: gender || 'other',
        role: ['parents'],
        children: childrenIds,
        phone,
        address: address || '',
        isNewUser: true, // Sẽ redirect tới set-password khi login
        active: true
      });

      await newParent.save();

      // Populate children info cho response
      await newParent.populate('children', 'name studentId class_id');

      // Gửi email với mật khẩu tạm thời
      const childrenNames = children.map(child => child.name);
      await this.sendParentWelcomeEmail(parentEmail, name, tempPassword, childrenNames);

      return {
        id: newParent._id,
        name: newParent.name,
        email: newParent.email,
        phone: newParent.phone,
        address: newParent.address,
        children: newParent.children.map(child => ({
          id: child._id,
          name: child.name,
          studentId: child.studentId,
          class_id: child.class_id
        })),
        dateOfBirth: newParent.dateOfBirth,
        gender: newParent.gender,
        role: newParent.role,
        isNewUser: newParent.isNewUser,
        active: newParent.active,
        tempPassword: tempPassword, // Tạm thời để test, production nên bỏ
        status: 'awaiting_first_login',
        createdAt: newParent.createdAt,
        updatedAt: newParent.updatedAt
      };

    } catch (error) {
      throw error;
    }
  }

  // Gửi email chào mừng cho parent mới import
  async sendParentWelcomeEmail(email, name, tempPassword, childrenNames) {
    try {
      // Kiểm tra cấu hình email
      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.log(`📧 [NO EMAIL CONFIG] Temp password for ${email}: ${tempPassword}`);
        console.log('⚠️  Please configure EMAIL_USER, EMAIL_PASS in .env file to send real emails');
        return;
      }

      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT || 587,
        secure: process.env.EMAIL_PORT == 465,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });

      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: email,
        subject: 'Welcome to EcoSchool - Parent Account Created',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2c3e50;">EcoSchool - Parent Account</h1>
            <p>Hello ${name},</p>
            <p>Your parent account has been created successfully. You can now access information about your children's education.</p>
            <p><strong>Children:</strong> ${childrenNames.join(', ')}</p>
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; text-align: center; margin: 20px 0;">
              <h2 style="color: #e74c3c; font-size: 24px; letter-spacing: 2px;">${tempPassword}</h2>
              <p style="margin: 0; color: #7f8c8d;">Your temporary password</p>
            </div>
            <p><strong>Important:</strong></p>
            <ul>
              <li>Use this temporary password to log in for the first time</li>
              <li>You will be prompted to set a new password on first login</li>
              <li>Do not share this password with anyone</li>
            </ul>
            <p>If you have any questions, please contact the school administration.</p>
            <hr style="margin: 30px 0;">
            <p style="color: #7f8c8d; font-size: 12px;">This is an automated message from EcoSchool system.</p>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);
      console.log(`📧 Parent welcome email successfully sent to ${email}`);
    } catch (error) {
      console.error('❌ Parent welcome email sending failed:', error.message);
      console.log(`📧 [FALLBACK] Temp password for ${email}: ${tempPassword}`);
    }
  }

  // Import parents từ file Excel
  async importParents(filePath, token) {
    const XLSX = require('xlsx');
    const fs = require('fs');
    
    try {
      // Verify token và kiểm tra role manager
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const currentUser = await User.findById(decoded.id);
      
      if (!currentUser || !currentUser.role.includes('manager')) {
        throw new Error('Only managers can import parents');
      }

      // Đọc file Excel
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const parentsData = XLSX.utils.sheet_to_json(worksheet);

      if (!parentsData || parentsData.length === 0) {
        throw new Error('No data found in Excel file');
      }

      const results = {
        success: [],
        failed: [],
        total: parentsData.length
      };

      // Group parents by email to handle multiple children
      const parentsByEmail = {};
      
      // Process each row
      for (let i = 0; i < parentsData.length; i++) {
        const parentRow = parentsData[i];
        
        try {
          // Validate dữ liệu
          if (!parentRow.name || !parentRow.childId || !parentRow.phone) {
            results.failed.push({
              row: i + 2,
              data: parentRow,
              error: 'Missing required fields: name, childId, or phone'
            });
            continue;
          }

          // Generate email if not provided
          const email = parentRow.email || this.generateParentEmail(parentRow.name);
          
          // Find child by _id
          const child = await User.findById(parentRow.childId);
          
          if (!child || !child.role.includes('student')) {
            results.failed.push({
              row: i + 2,
              data: parentRow,
              error: `Child with ID '${parentRow.childId}' not found or is not a student`
            });
            continue;
          }

          // Group by email to handle multiple children
          if (!parentsByEmail[email]) {
            parentsByEmail[email] = {
              name: parentRow.name,
              email: email,
              dateOfBirth: parentRow.dateOfBirth ? new Date(parentRow.dateOfBirth) : null,
              gender: parentRow.gender || 'other',
              phone: parentRow.phone,
              address: parentRow.address || '',
              children: [],
              row: i + 2
            };
          }
          
          parentsByEmail[email].children.push(child._id);

        } catch (error) {
          results.failed.push({
            row: i + 2,
            data: parentRow,
            error: error.message
          });
        }
      }

      // Process unique parents
      for (const [email, parentInfo] of Object.entries(parentsByEmail)) {
        try {
          // Kiểm tra email đã tồn tại
          const existingUser = await User.findOne({ email });
          if (existingUser) {
            results.failed.push({
              row: parentInfo.row,
              data: { email, name: parentInfo.name },
              error: 'Email already exists'
            });
            continue;
          }

          // Tạo mật khẩu tạm thời và hash
          const tempPassword = this.generateOTP();
          const passwordHash = await bcrypt.hash(tempPassword, 12);

          // Get children names for email
          const children = await User.find({ _id: { $in: parentInfo.children } });
          const childrenNames = children.map(child => child.name);

          // Tạo parent mới
          const newParent = new User({
            name: parentInfo.name,
            email: parentInfo.email,
            passwordHash,
            dateOfBirth: parentInfo.dateOfBirth,
            gender: parentInfo.gender,
            role: ['parents'],
            children: parentInfo.children,
            phone: parentInfo.phone,
            address: parentInfo.address,
            isNewUser: true,
            active: true
          });

          await newParent.save();

          // Gửi email với mật khẩu tạm thời
          await this.sendParentWelcomeEmail(parentInfo.email, parentInfo.name, tempPassword, childrenNames);

          results.success.push({
            row: parentInfo.row,
            email: parentInfo.email,
            name: parentInfo.name,
            childrenCount: parentInfo.children.length,
            childrenNames: childrenNames,
            status: 'awaiting_first_login',
            tempPassword: tempPassword // Tạm thời để test, production nên bỏ
          });

        } catch (error) {
          results.failed.push({
            row: parentInfo.row,
            data: { email: parentInfo.email, name: parentInfo.name },
            error: error.message
          });
        }
      }

      // Xóa file tạm sau khi xử lý
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      return results;

    } catch (error) {
      // Xóa file tạm nếu có lỗi
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      throw error;
    }
  }

  // Import parents từ base64
  async importParentsBase64(fileData, token) {
    const XLSX = require('xlsx');
    
    try {
      // Verify token và kiểm tra role manager
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const currentUser = await User.findById(decoded.id);
      
      if (!currentUser || !currentUser.role.includes('manager')) {
        throw new Error('Only managers can import parents');
      }

      // Decode base64 data
      const buffer = Buffer.from(fileData, 'base64');
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const parentsData = XLSX.utils.sheet_to_json(worksheet);

      if (!parentsData || parentsData.length === 0) {
        throw new Error('No data found in Excel file');
      }

      const results = {
        success: [],
        failed: [],
        total: parentsData.length
      };

      // Group parents by email to handle multiple children
      const parentsByEmail = {};
      
      // Process each row
      for (let i = 0; i < parentsData.length; i++) {
        const parentRow = parentsData[i];
        
        try {
          // Validate dữ liệu
          if (!parentRow.name || !parentRow.childId || !parentRow.phone) {
            results.failed.push({
              row: i + 2,
              data: parentRow,
              error: 'Missing required fields: name, childId, or phone'
            });
            continue;
          }

          // Generate email if not provided
          const email = parentRow.email || this.generateParentEmail(parentRow.name);
          
          // Find child by _id
          const child = await User.findById(parentRow.childId);
          
          if (!child || !child.role.includes('student')) {
            results.failed.push({
              row: i + 2,
              data: parentRow,
              error: `Child with ID '${parentRow.childId}' not found or is not a student`
            });
            continue;
          }

          // Group by email to handle multiple children
          if (!parentsByEmail[email]) {
            parentsByEmail[email] = {
              name: parentRow.name,
              email: email,
              dateOfBirth: parentRow.dateOfBirth ? new Date(parentRow.dateOfBirth) : null,
              gender: parentRow.gender || 'other',
              phone: parentRow.phone,
              address: parentRow.address || '',
              children: [],
              row: i + 2
            };
          }
          
          parentsByEmail[email].children.push(child._id);

        } catch (error) {
          results.failed.push({
            row: i + 2,
            data: parentRow,
            error: error.message
          });
        }
      }

      // Process unique parents
      for (const [email, parentInfo] of Object.entries(parentsByEmail)) {
        try {
          // Kiểm tra email đã tồn tại
          const existingUser = await User.findOne({ email });
          if (existingUser) {
            results.failed.push({
              row: parentInfo.row,
              data: { email, name: parentInfo.name },
              error: 'Email already exists'
            });
            continue;
          }

          // Tạo mật khẩu tạm thời và hash
          const tempPassword = this.generateOTP();
          const passwordHash = await bcrypt.hash(tempPassword, 12);

          // Get children names for email
          const children = await User.find({ _id: { $in: parentInfo.children } });
          const childrenNames = children.map(child => child.name);

          // Tạo parent mới
          const newParent = new User({
            name: parentInfo.name,
            email: parentInfo.email,
            passwordHash,
            dateOfBirth: parentInfo.dateOfBirth,
            gender: parentInfo.gender,
            role: ['parents'],
            children: parentInfo.children,
            phone: parentInfo.phone,
            address: parentInfo.address,
            isNewUser: true,
            active: true
          });

          await newParent.save();

          // Gửi email với mật khẩu tạm thời
          await this.sendParentWelcomeEmail(parentInfo.email, parentInfo.name, tempPassword, childrenNames);

          results.success.push({
            row: parentInfo.row,
            email: parentInfo.email,
            name: parentInfo.name,
            childrenCount: parentInfo.children.length,
            childrenNames: childrenNames,
            status: 'awaiting_first_login',
            tempPassword: tempPassword // Tạm thời để test, production nên bỏ
          });

        } catch (error) {
          results.failed.push({
            row: parentInfo.row,
            data: { email: parentInfo.email, name: parentInfo.name },
            error: error.message
          });
        }
      }

      return results;

    } catch (error) {
      throw error;
    }
  }

  // Generate parent email from name
  generateParentEmail(name) {
    // Remove diacritics and convert to lowercase
    const normalizedName = name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z\s]/g, '')
      .replace(/\s+/g, '')
      .substring(0, 20); // Limit length
    
    return `${normalizedName}.parents@yopmail.com`;
  }

  // Tạo giáo viên tự động khi import TKB
  async createTeacherFromSchedule(teacherName, subjectName, schoolId) {
    try {
      // Kiểm tra giáo viên đã tồn tại
      const existingTeacher = await User.findOne({ 
        name: teacherName,
        role: { $in: ['teacher', 'homeroom_teacher'] }
      });

      if (existingTeacher) {
        return existingTeacher;
      }

      // Tìm môn học với mapping tên môn học
      const subjectMapping = {
        'Toán': 'Mathematics',
        'Ngữ văn': 'Literature', 
        'Ngoại ngữ': 'English',
        'Vật lý': 'Physics',
        'Hóa học': 'Chemistry',
        'Sinh học': 'Biology',
        'Lịch sử': 'History',
        'Địa lý': 'Geography',
        'Tin học': 'Informatics',
        'GDQP': 'Defense Education',
        'GDCD': 'Civic Education',
        'Thể dục': 'Physical Education',
        'Chào cờ': 'Flag Ceremony',
        'Sinh hoạt lớp': 'Class Activity'
      };

      let subject = null;
      const mappedSubjectName = subjectMapping[subjectName] || subjectName;
      
      // Tìm môn học theo tên đã map hoặc tên gốc
      subject = await Subject.findOne({ 
        $or: [
          { subjectName: { $regex: new RegExp(mappedSubjectName, 'i') } },
          { subjectName: { $regex: new RegExp(subjectName, 'i') } }
        ]
      });

      if (!subject) {
        console.log(`⚠️ Không tìm thấy môn học: ${subjectName}, sẽ tạo giáo viên không có môn học`);
      }

      // Tạo email và password theo format yêu cầu
      const email = this.generateTeacherEmail(teacherName);
      const password = this.generateTeacherPassword();
      const passwordHash = await bcrypt.hash(password, 12);

      // Tạo mã giáo viên
      const teacherCount = await User.countDocuments({ role: { $in: ['teacher', 'homeroom_teacher'] } });
      const teacherId = `TCH${String(teacherCount + 1).padStart(3, '0')}`;

      // Tạo giáo viên mới với đầy đủ thông tin
      const newTeacher = new User({
        name: teacherName,
        email: email,
        passwordHash: passwordHash,
        teacherId: teacherId,
        role: ['teacher'],
        subject: subject ? subject._id : undefined,
        dateOfBirth: this.generateRandomDate(25, 60),
        gender: Math.random() > 0.5 ? 'male' : 'female',
        phone: this.generateRandomPhone(),
        address: this.generateRandomAddress(),
        school: schoolId,
        isNewUser: true,
        active: true
      });

      await newTeacher.save();

      // Gửi email chào mừng
      if (subject) {
        await this.sendTeacherWelcomeEmail(email, teacherName, password, subject.subjectName);
      }

      console.log(`✅ Đã tạo giáo viên mới: ${teacherName} (${email}) - Môn: ${subject ? subject.subjectName : 'Chưa phân môn'}`);
      return newTeacher;

    } catch (error) {
      console.error(`❌ Lỗi tạo giáo viên ${teacherName}:`, error.message);
      throw error;
    }
  }

  // Generate teacher email
  generateTeacherEmail(name) {
    const normalizedName = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '.');
    return `${normalizedName}.teacher@yopmail.com`;
  }

  // Generate teacher password
  generateTeacherPassword() {
    return 'Teacher@123';
  }

  // Generate random date
  generateRandomDate(minAge, maxAge) {
    const today = new Date();
    const minDate = new Date(today.getFullYear() - maxAge, today.getMonth(), today.getDate());
    const maxDate = new Date(today.getFullYear() - minAge, today.getMonth(), today.getDate());
    return new Date(minDate.getTime() + Math.random() * (maxDate.getTime() - minDate.getTime()));
  }

  // Generate random phone
  generateRandomPhone() {
    const prefixes = ['032', '033', '034', '035', '036', '037', '038', '039'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const number = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
    return `${prefix}${number}`;
  }

  // Generate random address
  generateRandomAddress() {
    const streets = ['Nguyễn Văn Linh', 'Lê Văn Việt', 'Mai Chí Thọ', 'Võ Văn Ngân', 'Phạm Văn Đồng'];
    const districts = ['Quận 1', 'Quận 2', 'Quận 3', 'Quận 7', 'Quận 9'];
    const street = streets[Math.floor(Math.random() * streets.length)];
    const district = districts[Math.floor(Math.random() * districts.length)];
    const number = Math.floor(Math.random() * 200) + 1;
    return `${number} ${street}, ${district}, TP.HCM`;
  }
}

module.exports = new UserService(); 