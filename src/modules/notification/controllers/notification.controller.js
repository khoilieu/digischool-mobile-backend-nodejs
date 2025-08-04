const notificationService = require("../services/notification.service");
const User = require("../../auth/models/user.model");
const Class = require("../../classes/models/class.model");
const Subject = require("../../subjects/models/subject.model");

class NotificationController {
  // Tạo thông báo mới (tự động)
  async createNotification(req, res, next) {
    try {
      const { type, title, content, receiverScope, relatedObject } = req.body;
      const user = req.user._id;
      if (!type || !title || !content || !receiverScope) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields",
        });
      }
      const notification = await notificationService.createNotification({
        type,
        title,
        content,
        sender: user,
        receiverScope,
        relatedObject,
      });
      res.status(201).json({
        success: true,
        message: "Notification created successfully",
        data: notification,
      });
    } catch (error) {
      console.error("\u274C Error in createNotification:", error.message);
      next(error);
    }
  }

  // Tạo thông báo thủ công
  async createManualNotification(req, res, next) {
    try {
      const { title, content, scopeType, department, grade, selectedClass } = req.body;
      const user = req.user._id;
      
      if (!title || !content) {
        return res.status(400).json({
          success: false,
          message: "Title and content are required",
        });
      }

      // Xác định receiverScope dựa trên role và scopeType
      let receiverScope;
      
      // Kiểm tra role của user (role có thể là array)
      const userRoles = Array.isArray(req.user.role) ? req.user.role : [req.user.role];
      const isTeacher = userRoles.some(role => role === "teacher" || role === "homeroom_teacher");
      const isManager = userRoles.some(role => role === "manager");
      
      if (isTeacher) {
        // Giáo viên chỉ gửi cho lớp chủ nhiệm
        const teacherClasses = await Class.find({ homeroomTeacher: user });
        if (!teacherClasses || teacherClasses.length === 0) {
          // Nếu không có lớp chủ nhiệm, vẫn cho phép tạo notification nhưng không gửi cho ai
          receiverScope = {
            type: "class",
            ids: []
          };
        } else {
          const classIds = teacherClasses.map(cls => cls._id);
          receiverScope = {
            type: "class",
            ids: classIds
          };
        }
      } else if (isManager) {
        // Manager có thể gửi cho nhiều phạm vi
        if (!scopeType) {
          return res.status(400).json({
            success: false,
            message: "Scope type is required for manager",
          });
        }

        switch (scopeType) {
          case "Toàn trường":
            receiverScope = {
              type: "school",
              ids: []
            };
            break;
          case "Bộ môn":
            if (!department) {
              return res.status(400).json({
                success: false,
                message: "Department is required for department scope",
              });
            }
            receiverScope = {
              type: "department",
              ids: [department]
            };
            break;
          case "Khối":
            if (!grade) {
              return res.status(400).json({
                success: false,
                message: "Grade is required for grade scope",
              });
            }
            receiverScope = {
              type: "grade",
              ids: [grade]
            };
            break;
          case "Lớp":
            if (!selectedClass) {
              return res.status(400).json({
                success: false,
                message: "Class is required for class scope",
              });
            }
            receiverScope = {
              type: "class",
              ids: [selectedClass]
            };
            break;
          default:
            return res.status(400).json({
              success: false,
              message: "Invalid scope type",
            });
        }
      } else {
        return res.status(403).json({
          success: false,
          message: "Unauthorized role for creating manual notifications",
        });
      }

      const notification = await notificationService.createManualNotification({
        title,
        content,
        sender: user,
        receiverScope,
      });

      res.status(201).json({
        success: true,
        message: "Manual notification created successfully",
        data: notification,
      });
    } catch (error) {
      console.error("\u274C Error in createManualNotification:", error.message);
      next(error);
    }
  }

  // Lấy danh sách bộ môn
  async getDepartments(req, res, next) {
    try {
      const subjects = await Subject.find({}, 'name');
      const departments = subjects.map(subject => subject.name);
      
      res.status(200).json({
        success: true,
        message: "Departments retrieved successfully",
        data: departments,
      });
    } catch (error) {
      console.error("\u274C Error in getDepartments:", error.message);
      next(error);
    }
  }

  // Lấy danh sách khối
  async getGrades(req, res, next) {
    try {
      const grades = await Class.distinct('gradeLevel');
      
      res.status(200).json({
        success: true,
        message: "Grades retrieved successfully",
        data: grades,
      });
    } catch (error) {
      console.error("\u274C Error in getGrades:", error.message);
      next(error);
    }
  }

  // Lấy danh sách lớp
  async getClasses(req, res, next) {
    try {
      const classes = await Class.find({}, 'className gradeLevel');
      const classList = classes.map(cls => ({
        id: cls._id,
        name: cls.className,
        grade: cls.gradeLevel
      }));
      
      res.status(200).json({
        success: true,
        message: "Classes retrieved successfully",
        data: classList,
      });
    } catch (error) {
      console.error("\u274C Error in getClasses:", error.message);
      next(error);
    }
  }

  // Lấy danh sách thông báo của user
  async getUserNotifications(req, res, next) {
    try {
      const user = req.user._id;
      const { type, page = 1, limit = 20 } = req.query;
      const notifications = await notificationService.getUserNotifications(
        user,
        type,
        parseInt(page),
        parseInt(limit)
      );
      res.status(200).json({
        success: true,
        message: "Notifications retrieved successfully",
        data: notifications,
      });
    } catch (error) {
      console.error("\u274C Error in getUserNotifications:", error.message);
      next(error);
    }
  }

  // Đánh dấu đã đọc
  async markAsRead(req, res, next) {
    try {
      const user = req.user._id;
      const { id } = req.params;
      const notification = await notificationService.markAsRead(id, user);
      if (!notification) {
        return res.status(404).json({
          success: false,
          message: "Notification not found",
        });
      }
      res.status(200).json({
        success: true,
        message: "Notification marked as read",
        data: notification,
      });
    } catch (error) {
      console.error("\u274C Error in markAsRead:", error.message);
      next(error);
    }
  }

  // Đánh dấu tất cả đã đọc
  async markAllAsRead(req, res, next) {
    try {
      const user = req.user._id;
      await notificationService.markAllAsRead(user);
      res.status(200).json({
        success: true,
        message: "All notifications marked as read",
      });
    } catch (error) {
      console.error("\u274C Error in markAllAsRead:", error.message);
      next(error);
    }
  }
}

module.exports = new NotificationController();
