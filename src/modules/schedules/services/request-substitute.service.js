const mongoose = require("mongoose");
const LessonRequest = require("../models/lesson-request.model");
const Lesson = require("../models/lesson.model");
const Class = require("../../classes/models/class.model");
const Subject = require("../../subjects/models/subject.model");
const User = require("../../auth/models/user.model");
const AcademicYear = require("../models/academic-year.model");
const TimeSlot = require("../models/time-slot.model");
const emailService = require("../../auth/services/email.service");

class SubstituteRequestService {
  // Create a new substitute request
  async createSubstituteRequest(
    lessonId,
    requestingTeacherId,
    candidateTeacherIds,
    reason
  ) {
    try {
      // Get lesson information
      const lesson = await Lesson.findById(lessonId)
        .populate("class", "className")
        .populate("subject", "subjectName")
        .populate("timeSlot", "period startTime endTime")
        .populate("teacher", "name email");

      // Get candidate teachers information
      const candidateTeachers = await User.find({
        _id: { $in: candidateTeacherIds },
        role: { $in: ["teacher"] },
      });

      // Create substitute request
      const lessonRequest = new LessonRequest({
        requestType: "substitute",
        lesson: lessonId,
        requestingTeacher: requestingTeacherId,
        candidateTeachers: candidateTeacherIds.map((id) => ({
          teacher: id,
          status: "pending",
        })),
        reason: reason,
        createdBy: requestingTeacherId,
      });

      await lessonRequest.save();

      // Send email notifications
      await this.sendRequestEmails(lessonRequest._id);

      return await this.getSubstituteRequestById(lessonRequest._id);
    } catch (error) {
      console.error("Error creating substitute request:", error);
      throw error;
    }
  }

  async getSubstituteRequestById(requestId) {
    const request = await LessonRequest.findById(requestId)
      .populate({
        path: "lesson",
        populate: [
          { path: "class", select: "className" },
          { path: "subject", select: "subjectName" },
          { path: "timeSlot", select: "period startTime endTime" },
          { path: "teacher", select: "name email" },
        ],
      })
      .populate("requestingTeacher", "name email")
      .populate("candidateTeachers.teacher", "name email")
      .populate("approvedTeacher", "name email");

    if (!request) {
      throw new Error("Substitute request not found");
    }

    return request;
  }

  // Get teacher's substitute requests
  async getTeacherRequests(teacherId, status = null) {
    const query = {
      requestType: "substitute",
      $or: [
        { requestingTeacher: teacherId },
        { "candidateTeachers.teacher": teacherId },
      ],
    };
    if (status) query.status = status;
    return await LessonRequest.find(query)
      .populate({
        path: "lesson",
        select: "lessonId scheduledDate topic status",
        populate: [
          { path: "class", select: "className" },
          { path: "subject", select: "subjectName" },
          { path: "timeSlot", select: "period startTime endTime" },
        ],
      })
      .populate("requestingTeacher", "name email")
      .populate("candidateTeachers.teacher", "name email")
      .populate("approvedTeacher", "name email")
      .sort({ createdAt: -1 });
  }

  // Approve substitute request by teacher
  async approveRequest(requestId, teacherId) {
    try {
      const request = await this.getSubstituteRequestById(requestId);
      // Approve the request
      await request.approveByTeacher(teacherId);
      // Update the lesson by replacing the original teacher with substitute teacher
      await Lesson.findByIdAndUpdate(request.lesson._id, {
        teacher: teacherId, // Thay thế giáo viên gốc
        substituteTeacher: request.lesson.teacher, // Lưu giáo viên gốc vào substituteTeacher để backup
      });
      // Cancel other pending requests from this teacher
      await this.cancelOtherTeacherRequests(teacherId, requestId);
      // Send approval emails
      await this.sendApprovalEmails(requestId);
      // Send notification to students about teacher change
      await this.sendStudentNotificationEmails(requestId);
      return await this.getSubstituteRequestById(requestId);
    } catch (error) {
      console.error("Error approving substitute request:", error);
      throw error;
    }
  }

  // Reject substitute request by teacher
  async rejectRequest(requestId, teacherId) {
    try {
      const request = await this.getSubstituteRequestById(requestId);
      // Reject the request
      await request.rejectByTeacher(teacherId);
      // Send rejection emails
      await this.sendRejectionEmails(requestId, teacherId);
      return await this.getSubstituteRequestById(requestId);
    } catch (error) {
      console.error("Error rejecting substitute request:", error);
      throw error;
    }
  }

  // Cancel substitute request
  async cancelRequest(requestId, teacherId) {
    try {
      const request = await this.getSubstituteRequestById(requestId);
      await request.cancel();
      return await this.getSubstituteRequestById(requestId);
    } catch (error) {
      console.error("Error cancelling substitute request:", error);
      throw error;
    }
  }

  // Get available substitute teachers for a lesson
  async getAvailableTeachers(lessonId) {
    // Sử dụng static của LessonRequest để lấy danh sách giáo viên có sẵn
    const availableTeachers = await LessonRequest.findAvailableTeachers(
      lessonId
    );

    // Bổ sung thông tin pending requests cho các giáo viên available
    for (const teacher of availableTeachers) {
      const pendingRequests = await LessonRequest.find({
        requestType: "substitute",
        status: "pending",
        "candidateTeachers.teacher": teacher._id,
        "candidateTeachers.status": "pending",
      });

      teacher.pendingRequestsCount = pendingRequests.length;
      teacher.hasPendingRequests = pendingRequests.length > 0;
    }

    // Lấy thêm thông tin về những giáo viên không có sẵn để hiển thị lý do
    const Lesson = mongoose.model("Lesson");
    const User = mongoose.model("User");

    const lesson = await Lesson.findById(lessonId)
      .populate("subject", "subjectName")
      .populate("timeSlot", "period startTime endTime");

    if (!lesson) throw new Error("Lesson not found");

    // Lấy tất cả giáo viên có thể dạy môn học này
    const allTeachers = await User.find({
      role: { $in: ["teacher"] },
      $or: [{ subject: lesson.subject._id }, { subjects: lesson.subject._id }],
      _id: { $ne: lesson.teacher },
    }).select("name email subject subjects");

    // Tìm những giáo viên không có sẵn
    const unavailableTeachers = [];

    for (const teacher of allTeachers) {
      // Kiểm tra xung đột thời gian
      const conflictLesson = await Lesson.findOne({
        teacher: teacher._id,
        scheduledDate: lesson.scheduledDate,
        timeSlot: lesson.timeSlot._id,
        status: { $nin: ["cancelled", "absent"] },
      })
        .populate("class", "className")
        .populate("subject", "subjectName");

      // Kiểm tra pending substitute requests
      const pendingRequests = await LessonRequest.find({
        requestType: "substitute",
        status: "pending",
        "candidateTeachers.teacher": teacher._id,
        "candidateTeachers.status": "pending",
      });

      // Nếu giáo viên không có trong danh sách available, thêm vào unavailable
      const isAvailable = availableTeachers.some(
        (available) => available._id.toString() === teacher._id.toString()
      );

      // Chỉ loại bỏ giáo viên khi có xung đột thời gian thực sự
      if (conflictLesson) {
        const reasons = [];
        reasons.push(
          `Xung đột thời gian với tiết ${conflictLesson.class.className} - ${conflictLesson.subject.subjectName}`
        );

        unavailableTeachers.push({
          ...teacher.toObject(),
          reasons: reasons,
          hasConflict: true,
          hasPendingRequests: pendingRequests.length > 0,
        });
      }
    }

    return {
      availableTeachers,
      unavailableTeachers,
      totalChecked: allTeachers.length,
      lessonInfo: {
        subjectName: lesson.subject.subjectName,
        scheduledDate: lesson.scheduledDate,
        timeSlot: lesson.timeSlot,
      },
    };
  }

  // Cancel other pending requests from the same teacher (when they approve one request)
  async cancelOtherTeacherRequests(teacherId, excludeRequestId) {
    try {
      // Find all pending requests where this teacher is a candidate
      const otherRequests = await LessonRequest.find({
        _id: { $ne: excludeRequestId },
        requestType: "substitute",
        status: "pending",
        "candidateTeachers.teacher": teacherId,
        "candidateTeachers.status": "pending",
      });

      // Update each request to remove this teacher from candidates or cancel if no other candidates
      for (const request of otherRequests) {
        // Remove this teacher from candidate list
        request.candidateTeachers = request.candidateTeachers.filter(
          (c) => c.teacher.toString() !== teacherId.toString()
        );

        // If no candidates left, cancel the request
        if (request.candidateTeachers.length === 0) {
          request.status = "cancelled";
          request.notes = "Automatically cancelled - no available candidates";
        }

        await request.save();
      }

      console.log(
        `Cancelled/updated ${otherRequests.length} other requests for teacher ${teacherId}`
      );
    } catch (error) {
      console.error("Error cancelling other teacher requests:", error);
      // Don't throw error to avoid breaking the main approve flow
    }
  }

  // Send initial request emails
  async sendRequestEmails(requestId) {
    try {
      const request = await this.getSubstituteRequestById(requestId);

      // Get manager emails
      const managers = await User.find({
        role: { $in: ["manager", "admin"] },
      }).select("email");

      const managerEmails = managers.map((m) => m.email);

      // Email to candidate teachers
      const candidateEmails = request.candidateTeachers.map(
        (c) => c.teacher.email
      );

      const lessonDate = new Date(
        request.lesson.scheduledDate
      ).toLocaleDateString("vi-VN");
      const lessonTime = `${request.lesson.timeSlot.startTime} - ${request.lesson.timeSlot.endTime}`;

      const candidateEmailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">Yêu cầu dạy thay - DigiSchool</h2>
          <p>Xin chào,</p>
          <p>Bạn đã được đề xuất để dạy thay cho tiết học sau:</p>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #e74c3c; margin-top: 0;">Thông tin tiết học</h3>
            <p><strong>Môn học:</strong> ${request.lesson.subject.subjectName}</p>
            <p><strong>Lớp:</strong> ${request.lesson.class.className}</p>
            <p><strong>Ngày:</strong> ${lessonDate}</p>
            <p><strong>Tiết:</strong> ${request.lesson.timeSlot.period}</p>
            <p><strong>Thời gian:</strong> ${lessonTime}</p>
            <p><strong>Giáo viên yêu cầu:</strong> ${request.requestingTeacher.name}</p>
            <p><strong>Lý do:</strong> ${request.reason}</p>
          </div>
          <p>Vui lòng phản hồi yêu cầu này bằng cách truy cập hệ thống DigiSchool.</p>
          <p><strong>Lưu ý:</strong> Bạn sẽ thay thế giáo viên chính để dạy tiết học này.</p>
          <hr style="margin: 30px 0;">
          <p style="color: #7f8c8d; font-size: 12px;">Email này được gửi tự động từ hệ thống DigiSchool.</p>
        </div>
      `;

      // Email to managers
      const managerEmailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">Thông báo yêu cầu dạy thay - DigiSchool</h2>
          <p>Có yêu cầu dạy thay mới từ giáo viên:</p>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #e74c3c; margin-top: 0;">Thông tin yêu cầu</h3>
            <p><strong>Mã yêu cầu:</strong> ${request.requestId}</p>
            <p><strong>Giáo viên yêu cầu:</strong> ${
              request.requestingTeacher.name
            }</p>
            <p><strong>Môn học:</strong> ${
              request.lesson.subject.subjectName
            }</p>
            <p><strong>Lớp:</strong> ${request.lesson.class.className}</p>
            <p><strong>Ngày:</strong> ${lessonDate}</p>
            <p><strong>Tiết:</strong> ${request.lesson.timeSlot.period}</p>
            <p><strong>Thời gian:</strong> ${lessonTime}</p>
            <p><strong>Lý do:</strong> ${request.reason}</p>
            <p><strong>Giáo viên được đề xuất:</strong> ${request.candidateTeachers
              .map((c) => c.teacher.name)
              .join(", ")}</p>
          </div>
          <hr style="margin: 30px 0;">
          <p style="color: #7f8c8d; font-size: 12px;">Email này được gửi tự động từ hệ thống DigiSchool.</p>
        </div>
      `;

      // Send emails
      await Promise.all([
        ...candidateEmails.map((email) =>
          emailService.sendEmail(
            email,
            "Yêu cầu dạy thay - DigiSchool",
            candidateEmailHtml
          )
        ),
        ...managerEmails.map((email) =>
          emailService.sendEmail(
            email,
            "Thông báo yêu cầu dạy thay - DigiSchool",
            managerEmailHtml
          )
        ),
      ]);

      // Record sent emails
      await LessonRequest.findByIdAndUpdate(requestId, {
        $push: {
          emailsSent: {
            type: "request",
            recipients: [...candidateEmails, ...managerEmails],
            subject: "Yêu cầu dạy thay - DigiSchool",
          },
        },
      });
    } catch (error) {
      console.error("Error sending request emails:", error);
      // Don't throw error to avoid breaking the main flow
    }
  }

  // Send approval emails
  async sendApprovalEmails(requestId) {
    try {
      const request = await this.getSubstituteRequestById(requestId);

      // Get manager emails
      const managers = await User.find({
        role: { $in: ["manager", "admin"] },
      }).select("email");

      const managerEmails = managers.map((m) => m.email);

      const lessonDate = new Date(
        request.lesson.scheduledDate
      ).toLocaleDateString("vi-VN");
      const lessonTime = `${request.lesson.timeSlot.startTime} - ${request.lesson.timeSlot.endTime}`;

      // Email to requesting teacher
      const requestingTeacherEmailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #27ae60;">Yêu cầu dạy thay đã được chấp nhận - DigiSchool</h2>
          <p>Xin chào ${request.requestingTeacher.name},</p>
          <p>Yêu cầu dạy thay của bạn đã được chấp nhận:</p>
          <div style="background-color: #d4edda; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #27ae60;">
            <h3 style="color: #155724; margin-top: 0;">Thông tin tiết học</h3>
            <p><strong>Môn học:</strong> ${request.lesson.subject.subjectName}</p>
            <p><strong>Lớp:</strong> ${request.lesson.class.className}</p>
            <p><strong>Ngày:</strong> ${lessonDate}</p>
            <p><strong>Tiết:</strong> ${request.lesson.timeSlot.period}</p>
            <p><strong>Thời gian:</strong> ${lessonTime}</p>
            <p><strong>Giáo viên dạy thay:</strong> ${request.approvedTeacher.name}</p>
            <p><strong>Lưu ý:</strong> Bạn vẫn là giáo viên chính, ${request.approvedTeacher.name} sẽ hỗ trợ dạy thay.</p>
          </div>
          <hr style="margin: 30px 0;">
          <p style="color: #7f8c8d; font-size: 12px;">Email này được gửi tự động từ hệ thống DigiSchool.</p>
        </div>
      `;

      // Email to managers and remaining candidates
      const otherCandidates = request.candidateTeachers.filter(
        (c) =>
          c.teacher._id.toString() !== request.approvedTeacher._id.toString()
      );

      const notificationEmailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">Thông báo yêu cầu dạy thay đã được chấp nhận - DigiSchool</h2>
          <p>Yêu cầu dạy thay sau đã được chấp nhận:</p>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #e74c3c; margin-top: 0;">Thông tin</h3>
            <p><strong>Mã yêu cầu:</strong> ${request.requestId}</p>
            <p><strong>Giáo viên yêu cầu:</strong> ${request.requestingTeacher.name}</p>
            <p><strong>Môn học:</strong> ${request.lesson.subject.subjectName}</p>
            <p><strong>Lớp:</strong> ${request.lesson.class.className}</p>
            <p><strong>Ngày:</strong> ${lessonDate}</p>
            <p><strong>Tiết:</strong> ${request.lesson.timeSlot.period}</p>
            <p><strong>Giáo viên dạy thay:</strong> ${request.approvedTeacher.name}</p>
            <p><strong>Lưu ý:</strong> Giáo viên ${request.requestingTeacher.name} vẫn là giáo viên chính, ${request.approvedTeacher.name} sẽ hỗ trợ dạy thay.</p>
          </div>
          <hr style="margin: 30px 0;">
          <p style="color: #7f8c8d; font-size: 12px;">Email này được gửi tự động từ hệ thống DigiSchool.</p>
        </div>
      `;

      // Send emails
      const allRecipients = [
        request.requestingTeacher.email,
        ...managerEmails,
        ...otherCandidates.map((c) => c.teacher.email),
      ];

      await Promise.all(
        allRecipients.map((email) =>
          emailService.sendEmail(
            email,
            "Yêu cầu dạy thay đã được chấp nhận - DigiSchool",
            email === request.requestingTeacher.email
              ? requestingTeacherEmailHtml
              : notificationEmailHtml
          )
        )
      );

      // Record sent emails
      await LessonRequest.findByIdAndUpdate(requestId, {
        $push: {
          emailsSent: {
            type: "approval",
            recipients: allRecipients,
            subject: "Yêu cầu dạy thay đã được chấp nhận - DigiSchool",
          },
        },
      });
    } catch (error) {
      console.error("Error sending approval emails:", error);
    }
  }

  // Send rejection emails
  async sendRejectionEmails(requestId, rejectingTeacherId) {
    try {
      const request = await this.getSubstituteRequestById(requestId);
      const rejectingTeacher = await User.findById(rejectingTeacherId).select(
        "name"
      );

      const lessonDate = new Date(
        request.lesson.scheduledDate
      ).toLocaleDateString("vi-VN");
      const lessonTime = `${request.lesson.timeSlot.startTime} - ${request.lesson.timeSlot.endTime}`;

      // Email to requesting teacher
      const rejectionEmailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #e74c3c;">Yêu cầu dạy thay bị từ chối - DigiSchool</h2>
          <p>Xin chào ${request.requestingTeacher.name},</p>
          <p>Giáo viên ${
            rejectingTeacher.name
          } đã từ chối yêu cầu dạy thay của bạn:</p>
          <div style="background-color: #f8d7da; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #e74c3c;">
            <h3 style="color: #721c24; margin-top: 0;">Thông tin tiết học</h3>
            <p><strong>Môn học:</strong> ${
              request.lesson.subject.subjectName
            }</p>
            <p><strong>Lớp:</strong> ${request.lesson.class.className}</p>
            <p><strong>Ngày:</strong> ${lessonDate}</p>
            <p><strong>Tiết:</strong> ${request.lesson.timeSlot.period}</p>
            <p><strong>Thời gian:</strong> ${lessonTime}</p>
            <p><strong>Lý do từ chối:</strong> Không có lý do cụ thể</p>
          </div>
          ${
            request.status === "pending"
              ? "<p>Yêu cầu vẫn đang chờ phản hồi từ các giáo viên khác.</p>"
              : "<p><strong>Lưu ý:</strong> Tất cả giáo viên đều đã từ chối yêu cầu này.</p>"
          }
          <hr style="margin: 30px 0;">
          <p style="color: #7f8c8d; font-size: 12px;">Email này được gửi tự động từ hệ thống DigiSchool.</p>
        </div>
      `;

      await emailService.sendEmail(
        request.requestingTeacher.email,
        "Yêu cầu dạy thay bị từ chối - DigiSchool",
        rejectionEmailHtml
      );

      // Record sent email
      await LessonRequest.findByIdAndUpdate(requestId, {
        $push: {
          emailsSent: {
            type: "rejection",
            recipients: [request.requestingTeacher.email],
            subject: "Yêu cầu dạy thay bị từ chối - DigiSchool",
          },
        },
      });
    } catch (error) {
      console.error("Error sending rejection emails:", error);
    }
  }

  // Send notification emails to students about teacher change
  async sendStudentNotificationEmails(requestId) {
    try {
      const request = await this.getSubstituteRequestById(requestId);

      // Get students in the class
      const Class = require("../../classes/models/class.model");
      const classInfo = await Class.findById(request.lesson.class._id);

      if (!classInfo) {
        console.log("Class not found");
        return;
      }

      // Get students using the class method
      const students = await classInfo.getStudents();

      if (!students || students.length === 0) {
        console.log("No students found for class");
        return;
      }

      const studentEmails = students
        .filter((student) => student.email)
        .map((student) => student.email);

      if (studentEmails.length === 0) {
        console.log("No student emails found");
        return;
      }

      const lessonDate = new Date(
        request.lesson.scheduledDate
      ).toLocaleDateString("vi-VN");
      const lessonTime = `${request.lesson.timeSlot.startTime} - ${request.lesson.timeSlot.endTime}`;

      const studentEmailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">Thông báo có giáo viên dạy thay - DigiSchool</h2>
          <p>Xin chào các em học sinh lớp ${request.lesson.class.className},</p>
          <p>Có giáo viên dạy thay cho tiết học sau:</p>
          <div style="background-color: #e8f4fd; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #3498db;">
            <h3 style="color: #2980b9; margin-top: 0;">Thông tin tiết học</h3>
            <p><strong>Môn học:</strong> ${request.lesson.subject.subjectName}</p>
            <p><strong>Lớp:</strong> ${request.lesson.class.className}</p>
            <p><strong>Ngày:</strong> ${lessonDate}</p>
            <p><strong>Tiết:</strong> ${request.lesson.timeSlot.period}</p>
            <p><strong>Thời gian:</strong> ${lessonTime}</p>
                      <p><strong>Giáo viên gốc:</strong> ${request.requestingTeacher.name}</p>
          <p><strong>Giáo viên dạy thay:</strong> ${request.approvedTeacher.name}</p>
          </div>
          <p>Các em vui lòng chuẩn bị bài học và đến lớp đúng giờ như thường lệ.</p>
          <p><strong>Lưu ý:</strong> Giáo viên ${request.approvedTeacher.name} sẽ thay thế giáo viên ${request.requestingTeacher.name} để dạy tiết học này.</p>
          <hr style="margin: 30px 0;">
          <p style="color: #7f8c8d; font-size: 12px;">Email này được gửi tự động từ hệ thống DigiSchool.</p>
        </div>
      `;

      // Send emails to all students
      await Promise.all(
        studentEmails.map((email) =>
          emailService.sendEmail(
            email,
            "Thông báo thay đổi giáo viên - DigiSchool",
            studentEmailHtml
          )
        )
      );

      // Record sent emails
      await LessonRequest.findByIdAndUpdate(requestId, {
        $push: {
          emailsSent: {
            type: "notification",
            recipients: studentEmails,
            subject: "Thông báo thay đổi giáo viên - DigiSchool",
          },
        },
      });

      console.log(
        `Sent teacher change notification to ${studentEmails.length} students`
      );
    } catch (error) {
      console.error("Error sending student notification emails:", error);
      // Don't throw error to avoid breaking the main approve flow
    }
  }

  // Get all substitute requests for admin/manager
  async getAllRequests(status = null, page = 1, limit = 20) {
    const query = { requestType: "substitute" };
    if (status) query.status = status;
    const skip = (page - 1) * limit;

    const requests = await LessonRequest.find(query)
      .populate({
        path: "lesson",
        populate: [
          { path: "class", select: "className" },
          { path: "subject", select: "subjectName" },
          { path: "timeSlot", select: "period startTime endTime" },
        ],
      })
      .populate("requestingTeacher", "name email")
      .populate("candidateTeachers.teacher", "name email")
      .populate("approvedTeacher", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await LessonRequest.countDocuments(query);

    return {
      requests,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }
}

module.exports = new SubstituteRequestService();
