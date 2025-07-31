const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  role: { 
    type: [String], 
    enum: ['student', 'teacher', 'homeroom_teacher', 'admin', 'manager', 'parent'], 
    required: true,
    default: ['manager']
  },
  name: { 
    type: String, 
    required: function() {
      // Name không bắt buộc cho user mới tạo qua OTP
      return !this.isNewUser;
    }
  },
  email: { type: String, unique: true, required: true },
  passwordHash: { type: String, required: true },
  
  // Thông tin cá nhân chung
  dateOfBirth: {
    type: Date,
    required: false,
    default: undefined
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    required: false,
    default: undefined
  },
  phone: {
    type: String,
    required: false,
    default: undefined
  },
  address: {
    type: String,
    required: false,
    default: undefined
  },
  
  // Thông tin trường học
  school: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: false,
    default: undefined
  },
  
  // Thông tin học sinh
  studentId: {
    type: String,
    unique: true,
    sparse: true,
    required: function() {
      return this.role.includes('student') && !this.isNewUser;
    },
    default: undefined
  },
  class_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Class',
    required: function() {
      return this.role.includes('student') && !this.isNewUser;
    },
    default: undefined
  },
  academicYear: {
    type: String,
    required: function() {
      return this.role.includes('student') && !this.isNewUser;
    },
    validate: {
      validator: function(v) {
        return /^\d{4}-\d{4}$/.test(v);
      },
      message: 'Academic year must be in format YYYY-YYYY (e.g., 2024-2025)'
    },
    default: undefined
  },
  
  // Thông tin giáo viên
  teacherId: {
    type: String,
    unique: true,
    sparse: true,
    required: function() {
      return this.role.includes('teacher') && !this.isNewUser;
    },
    default: undefined
  },
  subject: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Subject',
    required: function() {
      return this.role.includes('teacher') && !this.isNewUser;
    },
    default: undefined
  },
  homeroomClass: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: function() {
      return this.role.includes('homeroom_teacher') && !this.isNewUser;
    },
    default: undefined
  },
  
  // Thông tin quản lý
  managerId: {
    type: String,
    unique: true,
    sparse: true,
    required: function() {
      return this.role.includes('manager') && !this.isNewUser;
    },
    default: undefined
  },
  
  // Thông tin phụ huynh
  parentId: {
    type: String,
    unique: true,
    sparse: true,
    required: function() {
      return this.role.includes('parent') && !this.isNewUser;
    },
    default: undefined
  },
  children: {
    type: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    required: function() {
      return this.role.includes('parent') && !this.isNewUser;
    },
    default: undefined
  },
  
  // Trạng thái tài khoản
  isNewUser: {
    type: Boolean,
    default: true
  },
  isPending: {
    type: Boolean,
    default: false
  },
  tempPassword: {
    type: String,
    required: false,
    default: undefined
  },
  resetPasswordToken: {
    type: String,
    required: false,
    default: undefined
  },
  resetPasswordExpires: {
    type: Date,
    required: false,
    default: undefined
  },
  active: { type: Boolean, default: true }
}, { timestamps: true });

// Virtual field for classId alias
userSchema.virtual('classId').get(function() {
  return this.class_id;
});

userSchema.virtual('classId').set(function(value) {
  this.class_id = value;
});

// Ensure virtual fields are included in JSON output
userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.passwordHash);
};

// Method to generate reset password token (1pwd như create user)
userSchema.methods.generateResetPasswordToken = function() {
  // Tạo 1pwd phức tạp giống create user
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const specialChars = '!@#$%^&*?';
  
  // Kết hợp tất cả ký tự
  const allChars = uppercase + lowercase + numbers + specialChars;
  
  let resetToken = '';
  
  // Đảm bảo có ít nhất 1 ký tự từ mỗi loại
  resetToken += uppercase[Math.floor(Math.random() * uppercase.length)];
  resetToken += lowercase[Math.floor(Math.random() * lowercase.length)];
  resetToken += numbers[Math.floor(Math.random() * numbers.length)];
  resetToken += specialChars[Math.floor(Math.random() * specialChars.length)];
  
  // Tạo thêm 8 ký tự ngẫu nhiên (tổng cộng 12 ký tự)
  for (let i = 4; i < 12; i++) {
    resetToken += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Trộn lại thứ tự các ký tự
  const finalToken = resetToken.split('').sort(() => Math.random() - 0.5).join('');
  
  // Hash token and set to resetPasswordToken field
  this.resetPasswordToken = bcrypt.hashSync(finalToken, 10);
  
  // Set expire time (15 minutes from now)
  this.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 minutes
  
  return finalToken;
};

// Method to verify reset password token
userSchema.methods.verifyResetPasswordToken = function(token) {
  // Check if token has expired
  if (this.resetPasswordExpires < Date.now()) {
    return false;
  }
  
  // Compare token with stored hash
  return bcrypt.compareSync(token, this.resetPasswordToken);
};

// Middleware để loại bỏ các trường undefined và children cho role không phải parent
userSchema.pre('save', function(next) {
  const doc = this.toObject();
  Object.keys(doc).forEach(key => {
    if (doc[key] === undefined) {
      this.unset(key);
    }
  });
  
  // Loại bỏ trường children cho role không phải parent
  if (!this.role.includes('parent') && this.hasOwnProperty('children')) {
    this.unset('children');
  }
  
  next();
});

userSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate();
  if (update) {
    Object.keys(update).forEach(key => {
      if (update[key] === undefined) {
        delete update[key];
      }
    });
  }
  next();
});

userSchema.pre('updateOne', function(next) {
  const update = this.getUpdate();
  if (update) {
    Object.keys(update).forEach(key => {
      if (update[key] === undefined) {
        delete update[key];
      }
    });
  }
  next();
});

const User = mongoose.model('User', userSchema);

module.exports = User;
