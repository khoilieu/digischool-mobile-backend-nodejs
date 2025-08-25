const User = require('../../auth/models/user.model');
const Feedback = require('../models/feedback.model');
const scheduleService = require('../../schedules/services/schedule.service');
const NotificationService = require('../../notification/services/notification.service');

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

      if (!parent.role.includes('parent')) {
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

      if (!parent.role.includes('parent')) {
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

      // Tính toán weekNumber từ startOfWeek và endOfWeek
      const startDate = new Date(startOfWeek);
      const endDate = new Date(endOfWeek);
      
      // Validate dates
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error('Ngày bắt đầu hoặc kết thúc tuần không hợp lệ');
      }
      
      if (endDate < startDate) {
        throw new Error('Ngày kết thúc tuần phải sau ngày bắt đầu tuần');
      }
      
      // Tính weekNumber dựa trên ngày bắt đầu tuần
      // Sử dụng logic tương tự như trong schedule service
      let academicYearName = academicYear;
      if (typeof academicYear === 'object' && academicYear.name) {
        academicYearName = academicYear.name;
      }
      const academicYearStart = new Date(academicYearName.split('-')[0] + '-09-01'); // Giả sử năm học bắt đầu từ tháng 9
      const weekNumber = Math.ceil((startDate - academicYearStart) / (7 * 24 * 60 * 60 * 1000)) + 1;
      
      // Đảm bảo weekNumber không âm và hợp lý
      const validatedWeekNumber = Math.max(1, Math.min(52, weekNumber));

      // Sử dụng service schedule để lấy thời khóa biểu với cấu trúc mới (không bao gồm personal activities)
      console.log(`📅 Parent requesting schedule for child ${child.name} (${child.studentId})`);
      console.log(`📚 Class: ${child.class_id.className}, Academic Year: ${academicYearName}, Week: ${validatedWeekNumber}`);
      
      const scheduleResult = await scheduleService.getWeeklyScheduleByClassAndWeek(
        child.class_id.className,
        academicYear,
        validatedWeekNumber,
        token,
        null // Không truyền thông tin học sinh để không lấy personal activities (bảo vệ quyền riêng tư)
      );
      
      console.log(`✅ Successfully retrieved schedule with ${scheduleResult.weeklySchedule?.lessons?.length || 0} lessons`);

      // Loại bỏ studentPersonalActivities khỏi response để bảo vệ quyền riêng tư
      const { studentPersonalActivities, ...scheduleDataWithoutPersonalActivities } = scheduleResult;
      
      return {
        success: true,
        data: {
          child: {
            _id: child._id,
            name: child.name,
            studentId: child.studentId,
            class: child.class_id
          },
          schedule: scheduleDataWithoutPersonalActivities,
          dateRange: {
            startOfWeek: startOfWeek,
            endOfWeek: endOfWeek,
            weekNumber: validatedWeekNumber
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
      const { rating, type, targetTeacher, description } = feedbackData;

      // Kiểm tra phụ huynh
      const parent = await User.findById(parentId);
      if (!parent) {
        throw new Error('Phụ huynh không tồn tại');
      }

      if (!parent.role.includes('parent')) {
        throw new Error('Người dùng không phải là phụ huynh');
      }

      // Kiểm tra targetTeacher nếu type là giao_vien
      if (type === 'giao_vien' && targetTeacher) {
        const teacher = await User.findById(targetTeacher);
        if (!teacher || !teacher.role.includes('teacher')) {
          throw new Error('Giáo viên không tồn tại hoặc không hợp lệ');
        }
      }

      // Tạo feedback mới
      const feedback = new Feedback({
        user: parentId,
        rating,
        type,
        targetTeacher: type === 'giao_vien' ? targetTeacher : undefined,
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

      if (!parent.role.includes('parent')) {
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

  // Lấy tất cả feedback (cho admin/manager)
  async getAllFeedbacks(filters = {}) {
    try {
      const { status, rating, type, page = 1, limit = 10 } = filters;
      
      const query = {};
      
      // Filter theo status
      if (status && status !== 'all') {
        query.status = status;
      }
      
      // Filter theo rating
      if (rating && rating > 0) {
        query.rating = rating;
      }

      // Filter theo type
      if (type && type !== 'all') {
        query.type = type;
      }

      const skip = (page - 1) * limit;

      const feedbacks = await Feedback.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'name email')
        .populate('targetTeacher', 'name teacherId')
        .populate('respondedBy', 'name email');

      const total = await Feedback.countDocuments(query);

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
      throw new Error(`Lỗi khi lấy danh sách feedback: ${error.message}`);
    }
  }

  // Lấy thống kê feedback
  async getFeedbackStats() {
    try {
      const total = await Feedback.countDocuments();
      const pending = await Feedback.countDocuments({ status: 'pending' });
      const reviewed = await Feedback.countDocuments({ status: 'reviewed' });
      const resolved = await Feedback.countDocuments({ status: 'resolved' });
      
      // Tính điểm trung bình
      const ratingStats = await Feedback.aggregate([
        {
          $group: {
            _id: null,
            averageRating: { $avg: '$rating' },
            totalRatings: { $sum: 1 }
          }
        }
      ]);

      const averageRating = ratingStats.length > 0 ? ratingStats[0].averageRating : 0;

      // Thống kê theo type
      const typeStats = await Feedback.aggregate([
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            averageRating: { $avg: '$rating' }
          }
        },
        {
          $sort: { count: -1 }
        }
      ]);

      return {
        success: true,
        data: {
          total,
          pending,
          reviewed,
          resolved,
          averageRating: Math.round(averageRating * 10) / 10, // Làm tròn 1 chữ số thập phân
          typeStats
        }
      };
    } catch (error) {
      throw new Error(`Lỗi khi lấy thống kê feedback: ${error.message}`);
    }
  }

  // Cập nhật trạng thái feedback
  async updateFeedbackStatus(feedbackId, status, adminResponse, adminId) {
    try {
      const feedback = await Feedback.findById(feedbackId)
        .populate('user', 'name email')
        .populate('respondedBy', 'name email');
      
      if (!feedback) {
        throw new Error('Feedback không tồn tại');
      }

      const updateData = {
        status,
        respondedAt: new Date()
      };

      if (adminResponse) {
        updateData.adminResponse = adminResponse;
      }

      if (adminId) {
        updateData.respondedBy = adminId;
      }

      const updatedFeedback = await Feedback.findByIdAndUpdate(
        feedbackId,
        updateData,
        { new: true }
      ).populate('user', 'name email')
       .populate('respondedBy', 'name email');

      // Gửi notification cho phụ huynh khi admin phản hồi
      if (adminResponse && feedback.user) {
        const admin = await User.findById(adminId, 'name');
        const adminName = admin ? admin.name : 'Admin';
        
        let notificationTitle = '';
        let notificationContent = '';
        
        switch (status) {
          case 'reviewed':
            notificationTitle = 'Feedback đã được xem xét';
            notificationContent = `Feedback của bạn đã được ${adminName} xem xét.`;
            break;
          case 'resolved':
            notificationTitle = 'Feedback đã được giải quyết';
            notificationContent = `Feedback của bạn đã được ${adminName} giải quyết với phản hồi: "${adminResponse}"`;
            break;
          default:
            notificationTitle = 'Cập nhật trạng thái feedback';
            notificationContent = `Trạng thái feedback của bạn đã được cập nhật thành "${status}".`;
        }

        await NotificationService.createNotification({
          type: 'activity',
          title: notificationTitle,
          content: notificationContent,
          sender: adminId,
          receiverScope: { type: 'user', ids: [feedback.user._id.toString()] },
          relatedObject: { id: feedbackId, requestType: 'feedback' },
        });
      }

      return {
        success: true,
        message: 'Cập nhật trạng thái feedback thành công',
        data: updatedFeedback
      };
    } catch (error) {
      throw new Error(`Lỗi khi cập nhật trạng thái feedback: ${error.message}`);
    }
  }

  // Lấy chi tiết feedback
  async getFeedbackDetail(feedbackId) {
    try {
      const feedback = await Feedback.findById(feedbackId)
        .populate('user', 'name email')
        .populate('respondedBy', 'name email');

      if (!feedback) {
        throw new Error('Feedback không tồn tại');
      }

      return {
        success: true,
        data: feedback
      };
    } catch (error) {
      throw new Error(`Lỗi khi lấy chi tiết feedback: ${error.message}`);
    }
  }
}

module.exports = new ParentService(); 