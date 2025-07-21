const mongoose = require("mongoose");

const subjectSchema = new mongoose.Schema(
  {
    subjectName: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    subjectCode: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      uppercase: true,
      validate: {
        validator: function (v) {
          // Mã môn học phải có 2-6 ký tự, chỉ chữ và số
          return /^[A-Z0-9]{2,6}$/.test(v);
        },
        message:
          "Subject code must be 2-6 characters long and contain only letters and numbers",
      },
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    gradeLevels: {
      type: [Number],
      required: true,
      validate: {
        validator: function (v) {
          // Kiểm tra các cấp lớp hợp lệ (1-12)
          return v.length > 0 && v.every((grade) => grade >= 1 && grade <= 12);
        },
        message:
          "Grade levels must be between 1 and 12, and at least one grade level is required",
      },
    },
    credits: {
      type: Number,
      min: 0,
      max: 10,
      default: 1,
    },
    weeklyHours: {
      type: Number,
      min: 0,
      max: 20,
      default: 1,
      validate: {
        validator: function (v) {
          // Số tiết/tuần phải là số nguyên hoặc số thập phân 0.5
          return v % 0.5 === 0;
        },
        message: "Weekly hours must be in increments of 0.5",
      },
    },
    category: {
      type: String,
      enum: [
        "core", // Môn cốt lõi
        "elective", // Môn tự chọn
        "extra_curricular", // Ngoại khóa
        "vocational", // Hướng nghiệp
        "special", // Đặc biệt
      ],
      required: true,
      default: "core",
    },
    department: {
      type: String,
      trim: true,
      enum: [
        "mathematics",
        "literature",
        "english",
        "science",
        "physics",
        "chemistry",
        "biology",
        "history",
        "geography",
        "civic_education",
        "physical_education",
        "arts",
        "music",
        "technology",
        "informatics",
        "foreign_language",
        "other",
      ],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes để tối ưu hóa tìm kiếm
subjectSchema.index({ subjectName: 1 });
subjectSchema.index({ subjectCode: 1 });
subjectSchema.index({ gradeLevels: 1 });
subjectSchema.index({ category: 1 });
subjectSchema.index({ department: 1 });
subjectSchema.index({ isActive: 1 });

// Virtual để lấy số lượng giáo viên dạy môn này
subjectSchema.virtual("teacherCount", {
  ref: "User",
  localField: "_id",
  foreignField: "subjects",
  count: true,
  match: {
    role: { $in: ["teacher", "homeroom_teacher"] },
    active: true,
  },
});

// Method để lấy danh sách giáo viên dạy môn này
subjectSchema.methods.getTeachers = function () {
  return mongoose
    .model("User")
    .find({
      $or: [
        { subjects: this._id }, // Tìm trong field subjects (array)
        { subject: this._id }, // Tìm trong field subject (single)
      ],
      role: { $in: ["teacher", "homeroom_teacher"] },
      active: true,
    })
    .select("name email role");
};

// Method để kiểm tra môn học có phù hợp với cấp lớp không
subjectSchema.methods.isValidForGrade = function (grade) {
  return this.gradeLevels.includes(grade);
};

// Static method để tìm môn học theo cấp lớp
subjectSchema.statics.findByGradeLevel = function (grade) {
  return this.find({
    gradeLevels: grade,
    isActive: true,
  });
};

// Static method để tìm môn học theo khoa/bộ môn
subjectSchema.statics.findByDepartment = function (department) {
  return this.find({
    department: department,
    isActive: true,
  });
};

const Subject = mongoose.model("Subject", subjectSchema);

module.exports = Subject;
