const mongoose = require('mongoose');

const lessonTemplateSchema = new mongoose.Schema({
  // Tên template
  name: {
    type: String,
    required: true,
    trim: true
  },
  
  // Mô tả template
  description: {
    type: String,
    maxlength: 500
  },
  
  // References
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  
  gradeLevel: {
    type: Number,
    required: true,
    min: 10,
    max: 12
  },
  
  // Template configuration
  configuration: {
    // Số tiết mỗi tuần
    periodsPerWeek: {
      type: Number,
      required: true,
      min: 1,
      max: 10
    },
    
    // Thời lượng mỗi tiết (phút)
    periodDuration: {
      type: Number,
      default: 45,
      min: 30,
      max: 90
    },
    
    // Loại tiết học ưu tiên
    preferredTimeSlots: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TimeSlot'
    }],
    
    // Ngày ưu tiên trong tuần
    preferredDays: [{
      type: Number,
      min: 1,
      max: 7 // 1 = Sunday, 7 = Saturday
    }],
    
    // Có thể dạy liên tiếp không
    allowConsecutive: {
      type: Boolean,
      default: true
    },
    
    // Số tiết tối đa liên tiếp
    maxConsecutive: {
      type: Number,
      default: 2,
      min: 1,
      max: 4
    }
  },
  
  // Cấu hình assessment
  assessment: {
    // Có assessment không
    hasAssessment: {
      type: Boolean,
      default: false
    },
    
    // Loại assessment
    assessmentTypes: [{
      type: String,
      enum: ['quiz', 'test', 'assignment', 'project', 'presentation', 'other']
    }],
    
    // Tần suất assessment (weeks)
    frequency: {
      type: Number,
      min: 1,
      max: 10
    }
  },
  
  // Resources cần thiết
  resources: {
    // Thiết bị cần thiết
    equipment: [{
      name: String,
      required: Boolean,
      alternative: String
    }],
    
    // Phòng học đặc biệt
    specialRoom: {
      type: String,
      enum: ['lab', 'computer_room', 'gym', 'library', 'art_room', 'music_room', 'regular']
    },
    
    // Tài liệu tham khảo
    materials: [{
      name: String,
      type: {
        type: String,
        enum: ['textbook', 'workbook', 'handout', 'digital', 'other']
      },
      required: Boolean
    }]
  },
  
  // Teacher requirements
  teacherRequirements: {
    // Chuyên môn cần thiết
    specialization: [{
      type: String
    }],
    
    // Kinh nghiệm tối thiểu (years)
    minExperience: {
      type: Number,
      default: 0,
      min: 0
    },
    
    // Certifications cần thiết
    certifications: [{
      type: String
    }]
  },
  
  // Lesson structure template
  lessonStructure: {
    // Phần mở đầu (phút)
    warmup: {
      duration: {
        type: Number,
        default: 5,
        min: 0,
        max: 15
      },
      activities: [String]
    },
    
    // Phần chính (phút)
    main: {
      duration: {
        type: Number,
        default: 30,
        min: 15,
        max: 60
      },
      activities: [String]
    },
    
    // Phần kết thúc (phút)
    conclusion: {
      duration: {
        type: Number,
        default: 10,
        min: 0,
        max: 15
      },
      activities: [String]
    }
  },
  
  // Flags
  isActive: {
    type: Boolean,
    default: true
  },
  
  isDefault: {
    type: Boolean,
    default: false
  },
  
  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Usage statistics
  usageStats: {
    timesUsed: {
      type: Number,
      default: 0
    },
    lastUsed: {
      type: Date
    },
    classes: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class'
    }]
  }
}, {
  timestamps: true
});

// Indexes
lessonTemplateSchema.index({ name: 1 });
lessonTemplateSchema.index({ subject: 1, gradeLevel: 1 });
lessonTemplateSchema.index({ isActive: 1, isDefault: 1 });
lessonTemplateSchema.index({ 'configuration.periodsPerWeek': 1 });
lessonTemplateSchema.index({ createdBy: 1 });

// Virtual để tính tổng thời gian lesson
lessonTemplateSchema.virtual('totalDuration').get(function() {
  if (!this.lessonStructure) return this.configuration.periodDuration;
  
  return (this.lessonStructure.warmup?.duration || 0) +
         (this.lessonStructure.main?.duration || 0) +
         (this.lessonStructure.conclusion?.duration || 0);
});

// Virtual để kiểm tra template có hợp lệ không
lessonTemplateSchema.virtual('isValid').get(function() {
  const totalStructureDuration = this.totalDuration;
  const configDuration = this.configuration.periodDuration;
  
  // Cho phép sai lệch 5 phút
  return Math.abs(totalStructureDuration - configDuration) <= 5;
});

// Method để clone template
lessonTemplateSchema.methods.clone = function(newName, userId) {
  const clonedData = this.toObject();
  delete clonedData._id;
  delete clonedData.createdAt;
  delete clonedData.updatedAt;
  delete clonedData.usageStats;
  
  clonedData.name = newName;
  clonedData.isDefault = false;
  clonedData.createdBy = userId;
  clonedData.lastModifiedBy = userId;
  
  return new this.constructor(clonedData);
};

// Method để cập nhật usage stats
lessonTemplateSchema.methods.incrementUsage = function(classId) {
  this.usageStats.timesUsed += 1;
  this.usageStats.lastUsed = new Date();
  
  if (classId && !this.usageStats.classes.includes(classId)) {
    this.usageStats.classes.push(classId);
  }
  
  return this.save();
};

// Static method để tìm template theo subject và grade
lessonTemplateSchema.statics.findBySubjectAndGrade = function(subjectId, gradeLevel) {
  return this.find({
    subject: subjectId,
    gradeLevel: gradeLevel,
    isActive: true
  }).sort({ isDefault: -1, 'usageStats.timesUsed': -1 });
};

// Static method để lấy default template
lessonTemplateSchema.statics.getDefault = function(subjectId, gradeLevel) {
  return this.findOne({
    subject: subjectId,
    gradeLevel: gradeLevel,
    isDefault: true,
    isActive: true
  });
};

// Static method để tạo template mặc định
lessonTemplateSchema.statics.createDefaultTemplate = async function(subjectId, gradeLevel, createdBy) {
  const Subject = mongoose.model('Subject');
  const subject = await Subject.findById(subjectId);
  
  if (!subject) throw new Error('Subject not found');
  
  const defaultTemplate = new this({
    name: `${subject.subjectName} - Grade ${gradeLevel} - Default`,
    description: `Default lesson template for ${subject.subjectName} grade ${gradeLevel}`,
    subject: subjectId,
    gradeLevel: gradeLevel,
    configuration: {
      periodsPerWeek: subject.weeklyHours || 3,
      periodDuration: 45,
      preferredTimeSlots: [],
      preferredDays: [2, 3, 4, 5], // Monday to Thursday
      allowConsecutive: true,
      maxConsecutive: 2
    },
    assessment: {
      hasAssessment: true,
      assessmentTypes: ['quiz', 'test'],
      frequency: 4 // Every 4 weeks
    },
    resources: {
      equipment: [
        { name: 'Whiteboard', required: true, alternative: 'Blackboard' },
        { name: 'Projector', required: false, alternative: 'Charts' }
      ],
      specialRoom: 'regular',
      materials: [
        { name: 'Textbook', type: 'textbook', required: true },
        { name: 'Notebook', type: 'workbook', required: true }
      ]
    },
    teacherRequirements: {
      specialization: [subject.department],
      minExperience: 0,
      certifications: []
    },
    lessonStructure: {
      warmup: {
        duration: 5,
        activities: ['Review previous lesson', 'Check homework']
      },
      main: {
        duration: 35,
        activities: ['Introduce new topic', 'Explanation', 'Practice exercises']
      },
      conclusion: {
        duration: 5,
        activities: ['Summary', 'Assign homework', 'Q&A']
      }
    },
    isActive: true,
    isDefault: true,
    createdBy: createdBy
  });
  
  return defaultTemplate.save();
};

// Static method để validate template compatibility
lessonTemplateSchema.statics.validateCompatibility = function(templateId, classId, timeSlotId) {
  // This method would check if the template is compatible with the class schedule
  // Implementation would involve checking against existing schedules, room availability, etc.
  return Promise.resolve(true);
};

// Pre-save validation
lessonTemplateSchema.pre('save', function(next) {
  // Validate lesson structure duration
  if (this.lessonStructure && !this.isValid) {
    next(new Error('Lesson structure duration does not match configured period duration'));
  } else {
    next();
  }
});

// Middleware để đảm bảo chỉ có 1 default template per subject/grade
lessonTemplateSchema.pre('save', async function(next) {
  if (this.isDefault && this.isModified('isDefault')) {
    await this.constructor.updateMany(
      { 
        subject: this.subject,
        gradeLevel: this.gradeLevel,
        _id: { $ne: this._id }
      },
      { isDefault: false }
    );
  }
  next();
});

const LessonTemplate = mongoose.model('LessonTemplate', lessonTemplateSchema);

module.exports = LessonTemplate; 