const mongoose = require('mongoose');

const timeSlotSchema = new mongoose.Schema({
  period: {
    type: Number,
    required: true,
    min: 1,
    max: 10
  },
  startTime: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^([01]\d|2[0-3]):([0-5]\d)$/.test(v);
      },
      message: 'Start time must be in HH:MM format'
    }
  },
  endTime: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^([01]\d|2[0-3]):([0-5]\d)$/.test(v);
      },
      message: 'End time must be in HH:MM format'
    }
  },
  type: {
    type: String,
    enum: ['morning', 'afternoon', 'evening'],
    required: true
  },
  name: {
    type: String,
    required: true // "Tiết 1", "Tiết 2", etc.
  },
  description: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Compound index để đảm bảo không trùng period
timeSlotSchema.index({ period: 1 }, { unique: true });
timeSlotSchema.index({ type: 1, period: 1 });
timeSlotSchema.index({ startTime: 1 });
timeSlotSchema.index({ isActive: 1 });

// Virtual để tính thời lượng tiết học
timeSlotSchema.virtual('duration').get(function() {
  const start = new Date(`2000-01-01T${this.startTime}:00`);
  const end = new Date(`2000-01-01T${this.endTime}:00`);
  const diffMinutes = (end - start) / (1000 * 60);
  return diffMinutes;
});

// Virtual để lấy thông tin đầy đủ
timeSlotSchema.virtual('fullInfo').get(function() {
  return {
    period: this.period,
    name: this.name,
    time: `${this.startTime} - ${this.endTime}`,
    duration: this.duration,
    type: this.type,
    typeVN: this.type === 'morning' ? 'Sáng' : this.type === 'afternoon' ? 'Chiều' : 'Tối'
  };
});

// Static method để lấy time slots theo type
timeSlotSchema.statics.getByType = function(type) {
  return this.find({ type, isActive: true }).sort({ period: 1 });
};

// Static method để lấy tất cả time slots active
timeSlotSchema.statics.getAllActive = function() {
  return this.find({ isActive: true }).sort({ period: 1 });
};

// Static method để tạo time slots mặc định
timeSlotSchema.statics.createDefaultTimeSlots = async function() {
  const defaultSlots = [
    // Morning slots
    { period: 1, startTime: '07:00', endTime: '07:45', type: 'morning', name: 'Tiết 1' },
    { period: 2, startTime: '07:50', endTime: '08:35', type: 'morning', name: 'Tiết 2' },
    { period: 3, startTime: '08:40', endTime: '09:25', type: 'morning', name: 'Tiết 3' },
    { period: 4, startTime: '09:45', endTime: '10:30', type: 'morning', name: 'Tiết 4' },
    { period: 5, startTime: '10:35', endTime: '11:20', type: 'morning', name: 'Tiết 5' },
    
    // Afternoon slots
    { period: 6, startTime: '13:30', endTime: '14:15', type: 'afternoon', name: 'Tiết 6' },
    { period: 7, startTime: '14:20', endTime: '15:05', type: 'afternoon', name: 'Tiết 7' },
    { period: 8, startTime: '15:10', endTime: '15:55', type: 'afternoon', name: 'Tiết 8' },
    { period: 9, startTime: '16:00', endTime: '16:45', type: 'afternoon', name: 'Tiết 9' },
    { period: 10, startTime: '16:50', endTime: '17:35', type: 'afternoon', name: 'Tiết 10' }
  ];

  try {
    // Check if time slots already exist
    const existingSlots = await this.countDocuments();
    if (existingSlots === 0) {
      await this.insertMany(defaultSlots);
      console.log('✅ Created default time slots');
      return true;
    } else {
      console.log('⚠️ Time slots already exist');
      return false;
    }
  } catch (error) {
    console.error('❌ Error creating default time slots:', error.message);
    throw error;
  }
};

// Method để kiểm tra thời gian có hợp lệ không
timeSlotSchema.methods.isValidTimeRange = function() {
  const start = new Date(`2000-01-01T${this.startTime}:00`);
  const end = new Date(`2000-01-01T${this.endTime}:00`);
  return end > start;
};

// Pre-save validation
timeSlotSchema.pre('save', function(next) {
  if (!this.isValidTimeRange()) {
    next(new Error('End time must be after start time'));
  } else {
    next();
  }
});

const TimeSlot = mongoose.model('TimeSlot', timeSlotSchema);

module.exports = TimeSlot; 