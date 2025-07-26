const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  role: { 
    type: [String], 
    enum: ['student', 'teacher', 'homeroom_teacher', 'admin', 'manager', 'parents'], 
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
  dateOfBirth: {
    type: Date,
    required: false
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    required: false
  },
  studentId: {
    type: String,
    unique: true,
    sparse: true, // Cho phép null values và chỉ enforce unique cho non-null values
    required: function() {
      // Mã số học sinh chỉ bắt buộc cho học sinh
      return this.role.includes('student') && !this.isNewUser;
    }
  },
  class_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Class',
    default: null
  },
  subject: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Subject',
    required: function() {
      // subject không bắt buộc cho manager hoặc user mới tạo qua OTP
      return this.role.includes('teacher') && !this.isNewUser;
    }
  },
  subjects: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Subject'
  }],
  // New fields for parents
  children: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() {
      // children chỉ bắt buộc cho parents
      return this.role.includes('parents') && !this.isNewUser;
    }
  }],
  address: {
    type: String,
    required: false
  },
  phone: {
    type: String,
    required: false
  },
  isNewUser: {
    type: Boolean,
    default: true
  },
  isPending: {
    type: Boolean,
    default: false // Trạng thái chờ hoàn thành setup (chỉ dành cho teacher import)
  },
  tempPassword: {
    type: String,
    required: false // Mật khẩu tạm thời cho teacher mới import
  },
  // Forgot password fields
  resetPasswordToken: {
    type: String,
    required: false
  },
  resetPasswordExpires: {
    type: Date,
    required: false
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

const User = mongoose.model('User', userSchema);

module.exports = User;
