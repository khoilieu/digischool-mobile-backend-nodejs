const mongoose = require("mongoose");

const classSchema = new mongoose.Schema(
  {
    className: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    academicYear: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AcademicYear",
      required: true,
    },
    gradeLevel: {
      type: Number,
      required: false,
      min: 10,
      max: 12,
    },
    homeroomTeacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      validate: {
        validator: async function (teacherId) {
          if (!teacherId) return false;

          const teacher = await mongoose.model("User").findById(teacherId);
          if (!teacher) return false;

          // Kiểm tra user có role teacher, homeroom_teacher, hoặc admin
          return teacher.role.some((role) =>
            ["teacher", "homeroom_teacher", "admin"].includes(role)
          );
        },
        message:
          "Homeroom teacher must be a user with teacher, homeroom_teacher, or admin role",
      },
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index để tối ưu hóa tìm kiếm
classSchema.index({ className: 1 });
classSchema.index({ academicYear: 1 });
classSchema.index({ homeroomTeacher: 1 });

// Virtual để lấy số lượng học sinh trong lớp
classSchema.virtual("studentCount", {
  ref: "User",
  localField: "_id",
  foreignField: "class_id",
  count: true,
  match: { role: "student", active: true },
});

// Virtual field for academicYearName to maintain backward compatibility
classSchema.virtual("academicYearName").get(function() {
  if (this.academicYear && typeof this.academicYear === 'object') {
    return this.academicYear.name;
  }
  return this.academicYear;
});

// Method để lấy danh sách học sinh trong lớp
classSchema.methods.getStudents = function () {
  return mongoose
    .model("User")
    .find({
      class_id: this._id,
      role: "student",
      active: true,
    })
    .select("name email studentId dateOfBirth gender");
};

// Ensure virtual fields are included in JSON output
classSchema.set('toJSON', { virtuals: true });
classSchema.set('toObject', { virtuals: true });

const Class = mongoose.model("Class", classSchema);

module.exports = Class;
