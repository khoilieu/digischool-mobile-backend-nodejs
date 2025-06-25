const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  role: { 
    type: [String], 
    enum: ['student', 'teacher', 'homeroom_teacher', 'admin', 'manager'], 
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

const User = mongoose.model('User', userSchema);

module.exports = User;
