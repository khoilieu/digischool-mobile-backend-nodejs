const User = require('../../auth/models/user.model');
const Feedback = require('../models/feedback.model');
const scheduleService = require('../../schedules/services/schedule.service');

class ParentService {
  // Lấy danh sách con của phụ huynh
  async getChildren(parentId) {
    try {
      const parent = await User.findById(parentId)
        .populate({
          path: 'children',
          select: 'name studentId email class_id dateOfBirth gender',
          populate: {
            path: 'class_id',
            select: 'className gradeLevel academicYear',
            populate: {
              path: 'homeroomTeacher',
              select: 'name email'
            }
          }
        });

      if (!parent) {
        throw new Error('Phụ huynh không tồn tại');
      }

      if (!parent.role.includes('parents')) {
        throw new Error('Người dùng không phải là phụ huynh');
      }

      return {
        success: true,
        data: parent.children || []
      };
    } catch (error) {
      throw new Error(`Lỗi khi lấy danh sách con: ${error.message}`);
    }
  }

  // Xem thời khóa biểu của con
  async getChildSchedule(parentId, childId, academicYear, startOfWeek, endOfWeek, token) {
    try {
      // Kiểm tra phụ huynh có quyền xem thời khóa biểu của con này không
      const parent = await User.findById(parentId);
      if (!parent) {
        throw new Error('Phụ huynh không tồn tại');
      }

      if (!parent.role.includes('parents')) {
        throw new Error('Người dùng không phải là phụ huynh');
      }

      // Kiểm tra con có thuộc về phụ huynh này không
      if (!parent.children.includes(childId)) {
        throw new Error('Bạn không có quyền xem thời khóa biểu của học sinh này');
      }

      // Lấy thông tin con
      const child = await User.findById(childId)
        .populate('class_id', 'className gradeLevel academicYear');

      if (!child) {
        throw new Error('Học sinh không tồn tại');
      }

      if (!child.class_id) {
        throw new Error('Học sinh chưa được phân lớp');
      }

      // Sử dụng service schedule để lấy thời khóa biểu với custom dates
      const scheduleResult = await scheduleService.getWeeklyScheduleByClassAndWeek(
        child.class_id.className,
        child.class_id.academicYear,
        1, // weekNumber không quan trọng khi có custom dates
        token, // truyền token vào đây
        {
          startDate: startOfWeek,
          endDate: endOfWeek
        }
      );

      return {
        success: true,
        data: {
          child: {
            _id: child._id,
            name: child.name,
            studentId: child.studentId,
            class: child.class_id
          },
          schedule: scheduleResult,
          dateRange: {
            startOfWeek: startOfWeek,
            endOfWeek: endOfWeek
          }
        }
      };
    } catch (error) {
      throw new Error(`Lỗi khi lấy thời khóa biểu: ${error.message}`);
    }
  }

  // Gửi feedback
  async sendFeedback(parentId, feedbackData) {
    try {
      const { rating, description } = feedbackData;

      // Kiểm tra phụ huynh
      const parent = await User.findById(parentId);
      if (!parent) {
        throw new Error('Phụ huynh không tồn tại');
      }

      if (!parent.role.includes('parents')) {
        throw new Error('Người dùng không phải là phụ huynh');
      }

      // Tạo feedback mới
      const feedback = new Feedback({
        user: parentId,
        rating,
        description
      });

      await feedback.save();

      return {
        success: true,
        message: 'Góp ý đã được gửi thành công',
        data: feedback
      };
    } catch (error) {
      throw new Error(`Lỗi khi gửi góp ý: ${error.message}`);
    }
  }

  // Lấy danh sách feedback của phụ huynh
  async getMyFeedbacks(parentId, page = 1, limit = 10) {
    try {
      const parent = await User.findById(parentId);
      if (!parent) {
        throw new Error('Phụ huynh không tồn tại');
      }

      if (!parent.role.includes('parents')) {
        throw new Error('Người dùng không phải là phụ huynh');
      }

      const skip = (page - 1) * limit;

      const feedbacks = await Feedback.find({ user: parentId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('respondedBy', 'name email');

      const total = await Feedback.countDocuments({ user: parentId });

      return {
        success: true,
        data: {
          feedbacks,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        }
      };
    } catch (error) {
      throw new Error(`Lỗi khi lấy danh sách góp ý: ${error.message}`);
    }
  }
}

module.exports = new ParentService(); 