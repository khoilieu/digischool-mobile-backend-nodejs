const LessonReminder = require('../models/lesson-reminder.model');
const lessonReminderEmailService = require('../services/lesson-reminder-email.service');

class LessonReminderController {
  
  // API để tạo nhắc nhở kiểm tra cho tiết học
  async createReminder(req, res, next) {
    try {
      const { lessonId } = req.params;
      const {
        testType,
        title,
        content,
        chapters,
        references,
        expectedTestDate,
        reminderDate,
        priority,
        notes
      } = req.body;
      
      const teacherId = req.user._id;
      
      // Import models để lấy thông tin
      const Lesson = require('../models/lesson.model');
      const User = require('../../auth/models/user.model');
      
      // Tìm lesson và populate thông tin cần thiết
      const lesson = await Lesson.findById(lessonId)
        .populate('class', '_id className')
        .populate('subject', '_id subjectName subjectCode');
      
      if (!lesson) {
        return res.status(404).json({
          success: false,
          message: 'Lesson not found'
        });
      }
      
      // Kiểm tra lesson có status 'scheduled'
      if (lesson.status !== 'scheduled') {
        return res.status(400).json({
          success: false,
          message: 'Can only create reminders for scheduled lessons'
        });
      }
      
      // Kiểm tra quyền sở hữu lesson
      if (lesson.teacher.toString() !== teacherId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only create reminders for your own lessons'
        });
      }
      
      // Kiểm tra đã có reminder cho lesson này chưa
      const existingReminder = await LessonReminder.findOne({ lesson: lessonId });
      if (existingReminder) {
        return res.status(409).json({
          success: false,
          message: 'Reminder already exists for this lesson'
        });
      }
      
      // Tạo reminder mới
      // Nếu không có expectedTestDate, tạo mặc định là 7 ngày sau
      const defaultTestDate = new Date();
      defaultTestDate.setDate(defaultTestDate.getDate() + 7);
      
      const reminder = new LessonReminder({
        lesson: lessonId,
        teacher: teacherId,
        class: lesson.class._id,
        subject: lesson.subject._id,
        testType: testType || 'kiemtra15',
        title,
        content,
        chapters: chapters || [],
        references: references || [],
        expectedTestDate: expectedTestDate ? new Date(expectedTestDate) : defaultTestDate,
        reminderDate: reminderDate ? new Date(reminderDate) : new Date(),
        priority: priority || 'medium',
        notes: notes || ''
      });
      
      await reminder.save();
      
      // Populate để trả về và gửi email
      await reminder.populate([
        { path: 'lesson', select: 'lessonId scheduledDate topic' },
        { path: 'class', select: 'className' },
        { path: 'subject', select: 'subjectName subjectCode' },
        { path: 'teacher', select: 'name' }
      ]);
      
      // Lấy danh sách học sinh trong lớp để gửi email
      console.log('📧 Finding students in class:', lesson.class._id);
      const students = await User.find({
        class_id: lesson.class._id,
        role: { $in: ['student'] },
        email: { $exists: true, $ne: null, $ne: '' }
      }).select('_id name email studentId');
      
      console.log(`📧 Found ${students.length} students with email in class ${lesson.class.className}`);
      
      // Chuẩn bị dữ liệu cho email
      const reminderEmailData = {
        lesson: {
          lessonId: reminder.lesson.lessonId,
          scheduledDate: reminder.lesson.scheduledDate,
          topic: reminder.lesson.topic
        },
        class: {
          className: reminder.class.className
        },
        subject: {
          name: reminder.subject.subjectName,
          code: reminder.subject.subjectCode
        },
        testType: reminder.testType,
        title: reminder.title,
        content: reminder.content,
        chapters: reminder.chapters,
        references: reminder.references,
        expectedTestDate: reminder.expectedTestDate,
        priority: reminder.priority,
        notes: reminder.notes
      };
      
      // Gửi email cho học sinh (async, không chờ kết quả)
      if (students.length > 0) {
        lessonReminderEmailService.sendReminderToStudents(reminderEmailData, students)
          .then(emailResults => {
            console.log(`📧 Email sending completed: ${emailResults.successCount}/${emailResults.totalStudents} successful`);
          })
          .catch(error => {
            console.error('❌ Error sending reminder emails:', error.message);
          });
      } else {
        console.log('⚠️  No students with email found in class, skipping email sending');
      }
      
      res.status(201).json({
        success: true,
        message: 'Tạo nhắc nhở kiểm tra thành công',
        data: {
          reminderId: reminder._id,
          lesson: {
            lessonId: reminder.lesson.lessonId,
            scheduledDate: reminder.lesson.scheduledDate,
            topic: reminder.lesson.topic
          },
          class: reminder.class.className,
          subject: {
            name: reminder.subject.subjectName,
            code: reminder.subject.subjectCode
          },
          teacher: reminder.teacher.name,
          testType: reminder.testType,
          title: reminder.title,
          content: reminder.content,
          chapters: reminder.chapters,
          references: reminder.references,
          expectedTestDate: reminder.expectedTestDate,
          reminderDate: reminder.reminderDate,
          priority: reminder.priority,
          status: reminder.status,
          notes: reminder.notes,
          createdAt: reminder.createdAt,
          emailInfo: {
            studentsFound: students.length,
            emailsSent: students.length > 0 ? 'Đang gửi email...' : 'Không có học sinh nào có email'
          }
        }
      });
      
    } catch (error) {
      console.error('❌ Error in createReminder:', error.message);
      next(error);
    }
  }
  
  // API để lấy danh sách nhắc nhở của giáo viên
  async getTeacherReminders(req, res, next) {
    try {
      const teacherId = req.user._id;
      const {
        status,
        priority,
        testType,
        startDate,
        endDate,
        page = 1,
        limit = 20
      } = req.query;
      
      const options = {};
      if (status) options.status = status;
      if (priority) options.priority = priority;
      if (testType) options.testType = testType;
      if (startDate) options.startDate = new Date(startDate);
      if (endDate) options.endDate = new Date(endDate);
      
      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      // Lấy reminders với pagination
      const reminders = await LessonReminder.getTeacherReminders(teacherId, options)
        .skip(skip)
        .limit(parseInt(limit));
      
      // Đếm tổng số reminders
      const total = await LessonReminder.countDocuments({
        teacher: teacherId,
        ...(options.status && { status: options.status }),
        ...(options.priority && { priority: options.priority }),
        ...(options.testType && { testType: options.testType }),
        ...(options.startDate && { expectedTestDate: { $gte: options.startDate } }),
        ...(options.endDate && { expectedTestDate: { ...{}, $lte: options.endDate } })
      });
      
      const totalPages = Math.ceil(total / parseInt(limit));
      
      res.status(200).json({
        success: true,
        message: 'Lấy danh sách nhắc nhở thành công',
        data: {
          reminders: reminders.map(reminder => ({
            reminderId: reminder._id,
            lesson: {
              lessonId: reminder.lesson.lessonId,
              scheduledDate: reminder.lesson.scheduledDate,
              topic: reminder.lesson.topic
            },
            class: reminder.class.className,
            subject: {
              name: reminder.subject.subjectName,
              code: reminder.subject.subjectCode
            },
            testType: reminder.testType,
            title: reminder.title,
            content: reminder.content,
            expectedTestDate: reminder.expectedTestDate,
            reminderDate: reminder.reminderDate,
            priority: reminder.priority,
            status: reminder.status,
            notes: reminder.notes,
            createdAt: reminder.createdAt,
            updatedAt: reminder.updatedAt
          })),
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalItems: total,
            itemsPerPage: parseInt(limit)
          }
        }
      });
      
    } catch (error) {
      console.error('❌ Error in getTeacherReminders:', error.message);
      next(error);
    }
  }
  
  // API để lấy chi tiết nhắc nhở
  async getReminderDetail(req, res, next) {
    try {
      const { reminderId } = req.params;
      const teacherId = req.user._id;
      
      const reminder = await LessonReminder.findById(reminderId)
        .populate('lesson', 'lessonId scheduledDate topic')
        .populate('class', 'className')
        .populate('subject', 'subjectName subjectCode')
        .populate('teacher', 'name');
      
      if (!reminder) {
        return res.status(404).json({
          success: false,
          message: 'Reminder not found'
        });
      }
      
      // Kiểm tra quyền sở hữu
      if (reminder.teacher._id.toString() !== teacherId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only view your own reminders'
        });
      }
      
      res.status(200).json({
        success: true,
        message: 'Lấy chi tiết nhắc nhở thành công',
        data: {
          reminderId: reminder._id,
          lesson: {
            lessonId: reminder.lesson.lessonId,
            scheduledDate: reminder.lesson.scheduledDate,
            topic: reminder.lesson.topic
          },
          class: reminder.class.className,
          subject: {
            name: reminder.subject.subjectName,
            code: reminder.subject.subjectCode
          },
          teacher: reminder.teacher.name,
          testType: reminder.testType,
          title: reminder.title,
          content: reminder.content,
          chapters: reminder.chapters,
          references: reminder.references,
          expectedTestDate: reminder.expectedTestDate,
          reminderDate: reminder.reminderDate,
          priority: reminder.priority,
          status: reminder.status,
          notes: reminder.notes,
          isVisible: reminder.isVisible,
          createdAt: reminder.createdAt,
          updatedAt: reminder.updatedAt
        }
      });
      
    } catch (error) {
      console.error('❌ Error in getReminderDetail:', error.message);
      next(error);
    }
  }
  
  // API để cập nhật nhắc nhở
  async updateReminder(req, res, next) {
    try {
      const { reminderId } = req.params;
      const {
        testType,
        title,
        content,
        chapters,
        references,
        expectedTestDate,
        reminderDate,
        priority,
        notes
      } = req.body;
      
      const teacherId = req.user._id;
      
      // Tìm reminder
      const reminder = await LessonReminder.findById(reminderId);
      if (!reminder) {
        return res.status(404).json({
          success: false,
          message: 'Reminder not found'
        });
      }
      
      // Kiểm tra quyền sở hữu
      if (reminder.teacher.toString() !== teacherId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only update your own reminders'
        });
      }
      
      // Kiểm tra trạng thái có thể sửa không
      if (reminder.status === 'completed') {
        return res.status(400).json({
          success: false,
          message: 'Cannot update completed reminder'
        });
      }
      
      // Cập nhật thông tin
      if (testType) reminder.testType = testType;
      if (title) reminder.title = title;
      if (content) reminder.content = content;
      if (chapters !== undefined) reminder.chapters = chapters;
      if (references !== undefined) reminder.references = references;
      if (expectedTestDate) reminder.expectedTestDate = new Date(expectedTestDate);
      if (reminderDate) reminder.reminderDate = new Date(reminderDate);
      if (priority) reminder.priority = priority;
      if (notes !== undefined) reminder.notes = notes;
      
      await reminder.save();
      
      // Populate để trả về
      await reminder.populate([
        { path: 'lesson', select: 'lessonId scheduledDate topic' },
        { path: 'class', select: 'className' },
        { path: 'subject', select: 'subjectName subjectCode' }
      ]);
      
      res.status(200).json({
        success: true,
        message: 'Cập nhật nhắc nhở thành công',
        data: {
          reminderId: reminder._id,
          testType: reminder.testType,
          title: reminder.title,
          content: reminder.content,
          chapters: reminder.chapters,
          references: reminder.references,
          expectedTestDate: reminder.expectedTestDate,
          reminderDate: reminder.reminderDate,
          priority: reminder.priority,
          status: reminder.status,
          notes: reminder.notes,
          updatedAt: reminder.updatedAt
        }
      });
      
    } catch (error) {
      console.error('❌ Error in updateReminder:', error.message);
      next(error);
    }
  }
  
  // API để xóa nhắc nhở
  async deleteReminder(req, res, next) {
    try {
      const { reminderId } = req.params;
      const teacherId = req.user._id;
      
      // Tìm reminder với populate để lấy thông tin đầy đủ cho email
      const reminder = await LessonReminder.findById(reminderId)
        .populate('lesson', 'lessonId scheduledDate topic')
        .populate('class', '_id className')
        .populate('subject', 'subjectName subjectCode')
        .populate('teacher', 'name');
        
      if (!reminder) {
        return res.status(404).json({
          success: false,
          message: 'Reminder not found'
        });
      }
      
      // Kiểm tra quyền sở hữu
      if (reminder.teacher._id.toString() !== teacherId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only delete your own reminders'
        });
      }
      
      // Lấy danh sách học sinh trong lớp để gửi email hủy
      const User = require('../../auth/models/user.model');
      const students = await User.find({
        class_id: reminder.class._id,
        role: { $in: ['student'] },
        email: { $exists: true, $ne: null, $ne: '' }
      }).select('_id name email studentId');
      
      console.log(`📧 Found ${students.length} students with email for cancellation notification`);
      
      // Chuẩn bị dữ liệu cho email hủy
      const reminderEmailData = {
        lesson: {
          lessonId: reminder.lesson.lessonId,
          scheduledDate: reminder.lesson.scheduledDate,
          topic: reminder.lesson.topic
        },
        class: {
          className: reminder.class.className
        },
        subject: {
          name: reminder.subject.subjectName,
          code: reminder.subject.subjectCode
        },
        testType: reminder.testType,
        title: reminder.title,
        content: reminder.content,
        chapters: reminder.chapters,
        references: reminder.references,
        expectedTestDate: reminder.expectedTestDate,
        priority: reminder.priority,
        notes: reminder.notes
      };
      
      // Xóa reminder trước
      await LessonReminder.findByIdAndDelete(reminderId);
      
      // Gửi email hủy cho học sinh (async, không chờ kết quả)
      if (students.length > 0) {
        lessonReminderEmailService.sendCancelReminderToStudents(reminderEmailData, students)
          .then(emailResults => {
            console.log(`📧 Cancellation email sending completed: ${emailResults.successCount}/${emailResults.totalStudents} successful`);
          })
          .catch(error => {
            console.error('❌ Error sending cancellation emails:', error.message);
          });
      } else {
        console.log('⚠️  No students with email found in class, skipping cancellation email sending');
      }
      
      res.status(200).json({
        success: true,
        message: 'Xóa nhắc nhở thành công và đã gửi thông báo hủy cho học sinh',
        data: {
          deletedReminder: {
            reminderId: reminder._id,
            title: reminder.title,
            testType: reminder.testType,
            class: reminder.class.className,
            subject: reminder.subject.subjectName
          },
          emailInfo: {
            studentsFound: students.length,
            cancellationEmailsSent: students.length > 0 ? 'Đang gửi email hủy...' : 'Không có học sinh nào có email'
          }
        }
      });
      
    } catch (error) {
      console.error('❌ Error in deleteReminder:', error.message);
      next(error);
    }
  }
  
  // API để lấy nhắc nhở sắp đến hạn
  async getUpcomingReminders(req, res, next) {
    try {
      const teacherId = req.user._id;
      const { days = 7 } = req.query;
      
      const upcomingReminders = await LessonReminder.getUpcomingReminders(teacherId, parseInt(days));
      
      res.status(200).json({
        success: true,
        message: `Lấy nhắc nhở ${days} ngày tới thành công`,
        data: {
          upcomingReminders: upcomingReminders.map(reminder => ({
            reminderId: reminder._id,
            lesson: {
              lessonId: reminder.lesson.lessonId,
              scheduledDate: reminder.lesson.scheduledDate,
              topic: reminder.lesson.topic
            },
            class: reminder.class.className,
            subject: {
              name: reminder.subject.subjectName,
              code: reminder.subject.subjectCode
            },
            testType: reminder.testType,
            title: reminder.title,
            expectedTestDate: reminder.expectedTestDate,
            priority: reminder.priority,
            daysUntilTest: Math.ceil((new Date(reminder.expectedTestDate) - new Date()) / (1000 * 60 * 60 * 24))
          })),
          totalUpcoming: upcomingReminders.length
        }
      });
      
    } catch (error) {
      console.error('❌ Error in getUpcomingReminders:', error.message);
      next(error);
    }
  }
  
  // API để đánh dấu hoàn thành nhắc nhở
  async markCompleted(req, res, next) {
    try {
      const { reminderId } = req.params;
      const teacherId = req.user._id;
      
      const reminder = await LessonReminder.findById(reminderId);
      if (!reminder) {
        return res.status(404).json({
          success: false,
          message: 'Reminder not found'
        });
      }
      
      // Kiểm tra quyền sở hữu
      if (reminder.teacher.toString() !== teacherId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only update your own reminders'
        });
      }
      
      await reminder.markCompleted();
      
      res.status(200).json({
        success: true,
        message: 'Đánh dấu hoàn thành nhắc nhở thành công',
        data: {
          reminderId: reminder._id,
          status: reminder.status,
          updatedAt: reminder.updatedAt
        }
      });
      
    } catch (error) {
      console.error('❌ Error in markCompleted:', error.message);
      next(error);
    }
  }
  
  // API để lấy thống kê nhắc nhở
  async getReminderStats(req, res, next) {
    try {
      const teacherId = req.user._id;
      const { startDate, endDate } = req.query;
      
      const options = {};
      if (startDate) options.startDate = new Date(startDate);
      if (endDate) options.endDate = new Date(endDate);
      
      const stats = await LessonReminder.getReminderStats(teacherId, options);
      
      res.status(200).json({
        success: true,
        message: 'Lấy thống kê nhắc nhở thành công',
        data: stats
      });
      
    } catch (error) {
      console.error('❌ Error in getReminderStats:', error.message);
      next(error);
    }
  }
  
  // API để gửi lại email reminder cho học sinh
  async resendReminderEmail(req, res, next) {
    try {
      const { reminderId } = req.params;
      const teacherId = req.user._id;
      
      // Tìm reminder
      const reminder = await LessonReminder.findById(reminderId)
        .populate('lesson', 'lessonId scheduledDate topic')
        .populate('class', '_id className')
        .populate('subject', 'subjectName subjectCode')
        .populate('teacher', 'name');
      
      if (!reminder) {
        return res.status(404).json({
          success: false,
          message: 'Reminder not found'
        });
      }
      
      // Kiểm tra quyền sở hữu
      if (reminder.teacher._id.toString() !== teacherId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only resend emails for your own reminders'
        });
      }
      
      // Lấy danh sách học sinh trong lớp
      const User = require('../../auth/models/user.model');
      const students = await User.find({
        class_id: reminder.class._id,
        role: { $in: ['student'] },
        email: { $exists: true, $ne: null, $ne: '' }
      }).select('_id name email studentId');
      
      if (students.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No students with email found in this class'
        });
      }
      
      // Chuẩn bị dữ liệu cho email
      const reminderEmailData = {
        lesson: {
          lessonId: reminder.lesson.lessonId,
          scheduledDate: reminder.lesson.scheduledDate,
          topic: reminder.lesson.topic
        },
        class: {
          className: reminder.class.className
        },
        subject: {
          name: reminder.subject.subjectName,
          code: reminder.subject.subjectCode
        },
        testType: reminder.testType,
        title: reminder.title,
        content: reminder.content,
        chapters: reminder.chapters,
        references: reminder.references,
        expectedTestDate: reminder.expectedTestDate,
        priority: reminder.priority,
        notes: reminder.notes
      };
      
      // Gửi email
      try {
        const emailResults = await lessonReminderEmailService.sendReminderToStudents(reminderEmailData, students);
        
        res.status(200).json({
          success: true,
          message: 'Gửi lại email nhắc nhở thành công',
          data: {
            reminderId: reminder._id,
            title: reminder.title,
            class: reminder.class.className,
            emailResults: {
              totalStudents: emailResults.totalStudents,
              successCount: emailResults.successCount,
              failCount: emailResults.failCount,
              details: emailResults.results.map(result => ({
                studentName: result.studentName,
                email: result.email,
                success: result.success,
                message: result.message || result.error
              }))
            }
          }
        });
        
      } catch (error) {
        console.error('❌ Error sending reminder emails:', error);
        res.status(500).json({
          success: false,
          message: 'Error sending reminder emails',
          error: error.message
        });
      }
      
    } catch (error) {
      console.error('❌ Error in resendReminderEmail:', error.message);
      next(error);
    }
  }
  
  // API để test gửi email reminder
  async testReminderEmail(req, res, next) {
    try {
      const { reminderId } = req.params;
      const { testEmail } = req.body;
      const teacherId = req.user._id;
      
      if (!testEmail) {
        return res.status(400).json({
          success: false,
          message: 'Test email is required'
        });
      }
      
      // Tìm reminder
      const reminder = await LessonReminder.findById(reminderId)
        .populate('lesson', 'lessonId scheduledDate topic')
        .populate('class', 'className')
        .populate('subject', 'subjectName subjectCode')
        .populate('teacher', 'name');
      
      if (!reminder) {
        return res.status(404).json({
          success: false,
          message: 'Reminder not found'
        });
      }
      
      // Kiểm tra quyền sở hữu
      if (reminder.teacher._id.toString() !== teacherId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only test emails for your own reminders'
        });
      }
      
      // Chuẩn bị dữ liệu cho email
      const reminderEmailData = {
        lesson: {
          lessonId: reminder.lesson.lessonId,
          scheduledDate: reminder.lesson.scheduledDate,
          topic: reminder.lesson.topic
        },
        class: {
          className: reminder.class.className
        },
        subject: {
          name: reminder.subject.subjectName,
          code: reminder.subject.subjectCode
        },
        testType: reminder.testType,
        title: reminder.title,
        content: reminder.content,
        chapters: reminder.chapters,
        references: reminder.references,
        expectedTestDate: reminder.expectedTestDate,
        priority: reminder.priority,
        notes: reminder.notes
      };
      
      // Gửi test email
      try {
        const result = await lessonReminderEmailService.sendTestReminderEmail(testEmail, reminderEmailData);
        
        res.status(200).json({
          success: true,
          message: 'Gửi test email thành công',
          data: {
            reminderId: reminder._id,
            title: reminder.title,
            testEmail: testEmail,
            messageId: result.messageId,
            message: result.message
          }
        });
        
      } catch (error) {
        console.error('❌ Error sending test email:', error);
        res.status(500).json({
          success: false,
          message: 'Error sending test email',
          error: error.message
        });
      }
      
    } catch (error) {
      console.error('❌ Error in testReminderEmail:', error.message);
      next(error);
    }
  }
}

module.exports = new LessonReminderController(); 