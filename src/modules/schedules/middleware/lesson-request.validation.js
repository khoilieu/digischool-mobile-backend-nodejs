const { body, param, query } = require("express-validator");
const mongoose = require("mongoose");

class LessonRequestValidation {
  // ================================ SWAP VALIDATION ================================

  // Validation cho việc tạo yêu cầu đổi tiết
  createSwapRequest() {
    return [
      body("originalLessonId")
        .notEmpty()
        .withMessage("Original lesson ID is required")
        .custom((value) => {
          if (!mongoose.Types.ObjectId.isValid(value)) {
            throw new Error("Invalid original lesson ID format");
          }
          return true;
        }),

      body("replacementLessonId")
        .notEmpty()
        .withMessage("Replacement lesson ID is required")
        .custom((value) => {
          if (!mongoose.Types.ObjectId.isValid(value)) {
            throw new Error("Invalid replacement lesson ID format");
          }
          return true;
        }),

      body("reason")
        .notEmpty()
        .withMessage("Reason is required")
        .isLength({ min: 1, max: 300 })
        .withMessage("Reason must be between 1 and 300 characters")
        .trim(),

      // Custom validation để kiểm tra xung đột khi tạo yêu cầu
      body().custom(async (value, { req }) => {
        const Lesson = require("../models/lesson.model");
        const LessonRequest = require("../models/lesson-request.model");

        const { originalLessonId, replacementLessonId } = value;
        const requestingTeacherId = req.user.id;

        // Kiểm tra original lesson tồn tại và thuộc về giáo viên
        const originalLesson = await Lesson.findById(originalLessonId)
          .populate("teacher", "name email fullName")
          .populate("class", "className gradeLevel")
          .populate("subject", "subjectName subjectCode")
          .populate("timeSlot", "period startTime endTime");

        if (!originalLesson) {
          throw new Error("Original lesson not found");
        }

        if (originalLesson.teacher._id.toString() !== requestingTeacherId) {
          throw new Error("Original lesson does not belong to this teacher");
        }

        if (originalLesson.status !== "scheduled") {
          throw new Error("Original lesson must be scheduled for swap request");
        }

        // Kiểm tra replacement lesson tồn tại và có giáo viên dạy
        const replacementLesson = await Lesson.findById(replacementLessonId)
          .populate("teacher", "name email fullName")
          .populate("class", "className gradeLevel")
          .populate("subject", "subjectName subjectCode")
          .populate("timeSlot", "period startTime endTime");

        if (!replacementLesson) {
          throw new Error("Replacement lesson not found");
        }

        if (replacementLesson.type === "empty") {
          throw new Error(
            "Replacement lesson cannot be empty for swap request"
          );
        }

        if (!replacementLesson.teacher) {
          throw new Error("Replacement lesson must have a teacher");
        }

        if (replacementLesson.status !== "scheduled") {
          throw new Error("Replacement lesson must be scheduled");
        }

        // Kiểm tra cùng lớp
        if (
          originalLesson.class._id.toString() !==
          replacementLesson.class._id.toString()
        ) {
          throw new Error(
            "Original and replacement lessons must be in the same class"
          );
        }

        // BỎ kiểm tra cùng tuần
        // const originalWeek = this.getWeekRange(originalLesson.scheduledDate);
        // const replacementWeek = this.getWeekRange(
        //   replacementLesson.scheduledDate
        // );
        // if (
        //   originalWeek.startOfWeek.getTime() !==
        //   replacementWeek.startOfWeek.getTime()
        // ) {
        //   throw new Error(
        //     "Original and replacement lessons must be in the same week"
        //   );
        // }

        // Kiểm tra không có request đang pending cho lesson này
        const existingRequest = await LessonRequest.findOne({
          originalLesson: originalLessonId,
          status: "pending",
          requestType: "swap",
        });

        if (existingRequest) {
          throw new Error(
            "There is already a pending swap request for this lesson"
          );
        }

        // Kiểm tra xung đột thời gian cho giáo viên original
        const originalTeacherConflicts = await Lesson.find({
          teacher: originalLesson.teacher._id,
          scheduledDate: replacementLesson.scheduledDate,
          _id: { $ne: originalLesson._id },
          status: "scheduled",
        }).populate("timeSlot", "period startTime endTime");

        // Kiểm tra xung đột thời gian cho giáo viên replacement
        const replacementTeacherConflicts = await Lesson.find({
          teacher: replacementLesson.teacher._id,
          scheduledDate: originalLesson.scheduledDate,
          _id: { $ne: replacementLesson._id },
          status: "scheduled",
        }).populate("timeSlot", "period startTime endTime");

        // Lấy thông tin timeSlot của 2 lessons
        const originalTimeSlot = originalLesson.timeSlot;
        const replacementTimeSlot = replacementLesson.timeSlot;

        // Kiểm tra xung đột cho giáo viên original (khi đổi sang thời gian của replacement)
        const originalTeacherSameTimeConflicts =
          originalTeacherConflicts.filter((lesson) => {
            return lesson.timeSlot.period === replacementTimeSlot.period;
          });

        if (originalTeacherSameTimeConflicts.length > 0) {
          throw new Error(
            `Bạn đã có tiết ${
              originalTeacherSameTimeConflicts[0].timeSlot.period
            } vào thời gian này (${new Date(
              replacementLesson.scheduledDate
            ).toLocaleDateString("vi-VN")})`
          );
        }

        // Kiểm tra xung đột cho giáo viên replacement (khi đổi sang thời gian của original)
        const replacementTeacherSameTimeConflicts =
          replacementTeacherConflicts.filter((lesson) => {
            return lesson.timeSlot.period === originalTimeSlot.period;
          });

        if (replacementTeacherSameTimeConflicts.length > 0) {
          throw new Error(
            `Giáo viên ${
              replacementLesson.teacher.name ||
              replacementLesson.teacher.fullName
            } đã có tiết ${
              replacementTeacherSameTimeConflicts[0].timeSlot.period
            } vào thời gian này (${new Date(
              originalLesson.scheduledDate
            ).toLocaleDateString("vi-VN")})`
          );
        }

        // Kiểm tra xung đột với các yêu cầu khác
        const pendingRequests = await LessonRequest.find({
          $or: [
            { originalLesson: originalLessonId },
            { originalLesson: replacementLessonId },
            { replacementLesson: originalLessonId },
            { replacementLesson: replacementLessonId },
          ],
          status: "pending",
          requestType: { $in: ["substitute", "makeup", "swap"] },
        });

        if (pendingRequests.length > 0) {
          const requestTypes = [
            ...new Set(pendingRequests.map((req) => req.requestType)),
          ];
          throw new Error(
            `Có ${pendingRequests.length} yêu cầu ${requestTypes.join(
              ", "
            )} đang chờ xử lý cho các tiết học này`
          );
        }

        return true;
      }),
    ];
  }

  // Helper function để tính tuần
  getWeekRange(date) {
    const startOfWeek = new Date(date);
    // getDay() trả về 0-6 (0 = Chủ nhật, 1 = Thứ 2, ..., 6 = Thứ 7)
    // Để tính thứ 2 đầu tuần: nếu hôm nay là chủ nhật (0) thì lùi 6 ngày, nếu là thứ 2 (1) thì lùi 0 ngày, v.v.
    const dayOfWeek = startOfWeek.getDay();
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    startOfWeek.setDate(startOfWeek.getDate() - daysToSubtract);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    return { startOfWeek, endOfWeek };
  }

  // ================================ MAKEUP VALIDATION ================================

  // Validation cho việc tạo yêu cầu dạy bù
  createMakeupRequest() {
    return [
      body("originalLessonId")
        .notEmpty()
        .withMessage("Original lesson ID is required")
        .custom((value) => {
          if (!mongoose.Types.ObjectId.isValid(value)) {
            throw new Error("Invalid original lesson ID format");
          }
          return true;
        }),

      body("replacementLessonId")
        .notEmpty()
        .withMessage("Replacement lesson ID is required")
        .custom((value) => {
          if (!mongoose.Types.ObjectId.isValid(value)) {
            throw new Error("Invalid replacement lesson ID format");
          }
          return true;
        }),

      body("reason")
        .notEmpty()
        .withMessage("Reason is required")
        .isLength({ min: 1, max: 300 })
        .withMessage("Reason must be between 1 and 300 characters")
        .trim(),

      // Custom validation để kiểm tra makeup request
      body().custom(async (value, { req }) => {
        const Lesson = require("../models/lesson.model");
        const LessonRequest = require("../models/lesson-request.model");

        const { originalLessonId, replacementLessonId } = value;
        const requestingTeacherId = req.user.id;

        // Kiểm tra original lesson tồn tại và thuộc về giáo viên
        const originalLesson = await Lesson.findById(originalLessonId)
          .populate("teacher", "name email fullName")
          .populate("class", "className gradeLevel")
          .populate("subject", "subjectName subjectCode")
          .populate("timeSlot", "period startTime endTime");

        if (!originalLesson) {
          throw new Error("Original lesson not found");
        }

        if (originalLesson.teacher._id.toString() !== requestingTeacherId) {
          throw new Error("Original lesson does not belong to this teacher");
        }

        if (originalLesson.status !== "scheduled") {
          throw new Error(
            "Original lesson must be scheduled for makeup request"
          );
        }

        // Kiểm tra replacement lesson tồn tại và là tiết trống
        const replacementLesson = await Lesson.findById(replacementLessonId)
          .populate("class", "className gradeLevel")
          .populate("timeSlot", "period startTime endTime");

        if (!replacementLesson) {
          throw new Error("Replacement lesson not found");
        }

        if (replacementLesson.type !== "empty") {
          throw new Error(
            "Replacement lesson must be empty for makeup request"
          );
        }

        if (replacementLesson.status !== "scheduled") {
          throw new Error("Replacement lesson must be scheduled");
        }

        // Kiểm tra cùng lớp
        if (
          originalLesson.class._id.toString() !==
          replacementLesson.class._id.toString()
        ) {
          throw new Error(
            "Original and replacement lessons must be in the same class"
          );
        }

        // Kiểm tra xung đột thời gian cho giáo viên
        const teacherConflicts = await Lesson.find({
          teacher: originalLesson.teacher._id,
          scheduledDate: replacementLesson.scheduledDate,
          _id: { $ne: originalLesson._id },
          status: "scheduled",
        }).populate("timeSlot", "period startTime endTime");

        const replacementTimeSlot = replacementLesson.timeSlot;
        const sameTimeConflicts = teacherConflicts.filter((lesson) => {
          return lesson.timeSlot.period === replacementTimeSlot.period;
        });

        if (sameTimeConflicts.length > 0) {
          throw new Error(
            `Bạn đã có tiết ${
              sameTimeConflicts[0].timeSlot.period
            } vào thời gian này (${new Date(
              replacementLesson.scheduledDate
            ).toLocaleDateString("vi-VN")})`
          );
        }

        // BỎ kiểm tra cùng tuần
        // const originalWeek = this.getWeekRange(originalLesson.scheduledDate);
        // const replacementWeek = this.getWeekRange(
        //   replacementLesson.scheduledDate
        // );
        // if (
        //   originalWeek.startOfWeek.getTime() !==
        //   replacementWeek.startOfWeek.getTime()
        // ) {
        //   throw new Error(
        //     "Original and replacement lessons must be in the same week"
        //   );
        // }

        // Kiểm tra không có request đang pending cho lesson này
        const existingRequest = await LessonRequest.findOne({
          originalLesson: originalLessonId,
          status: "pending",
          requestType: "makeup",
        });

        if (existingRequest) {
          throw new Error(
            "There is already a pending makeup request for this lesson"
          );
        }

        // Kiểm tra xung đột với các yêu cầu khác
        const pendingRequests = await LessonRequest.find({
          $or: [
            { originalLesson: originalLessonId },
            { originalLesson: replacementLessonId },
            { replacementLesson: originalLessonId },
            { replacementLesson: replacementLessonId },
          ],
          status: "pending",
          requestType: { $in: ["substitute", "makeup", "swap"] },
        });

        if (pendingRequests.length > 0) {
          const requestTypes = [
            ...new Set(pendingRequests.map((req) => req.requestType)),
          ];
          throw new Error(
            `Có ${pendingRequests.length} yêu cầu ${requestTypes.join(
              ", "
            )} đang chờ xử lý cho các tiết học này`
          );
        }

        return true;
      }),
    ];
  }

  // ================================ SUBSTITUTE VALIDATION ================================

  // Validation for creating substitute request
  validateCreateSubstituteRequest() {
    return [
      body("lessonId")
        .notEmpty()
        .withMessage("Lesson ID is required")
        .custom(async (value, { req }) => {
          if (!mongoose.Types.ObjectId.isValid(value)) {
            throw new Error("Invalid lesson ID format");
          }

          const Lesson = require("../models/lesson.model");
          const LessonRequest = require("../models/lesson-request.model");

          const lesson = await Lesson.findById(value);

          if (!lesson) {
            throw new Error("Lesson not found");
          }

          // Kiểm tra lesson thuộc về giáo viên đang request
          if (lesson.teacher._id.toString() !== req.user.id) {
            throw new Error(
              "Only the assigned teacher can request substitution"
            );
          }

          // Kiểm tra lesson có status phù hợp
          if (lesson.status !== "scheduled") {
            throw new Error("Lesson must be scheduled for substitute request");
          }

          // Kiểm tra lesson type
          if (lesson.type !== "regular" && lesson.type !== "makeup") {
            throw new Error(
              "Chỉ cho phép dạy thay cho tiết học thường hoặc tiết bù"
            );
          }

          // Kiểm tra không có substitute request pending cho lesson này
          const pendingSubstitute = await LessonRequest.findOne({
            lesson: value,
            requestType: "substitute",
            status: "pending",
          });
          if (pendingSubstitute) {
            throw new Error(
              "Đã có yêu cầu dạy thay đang chờ xử lý cho tiết này"
            );
          }

          return true;
        }),

      body("candidateTeacherIds")
        .isArray({ min: 1 })
        .withMessage("At least one candidate teacher is required")
        .custom((value) => {
          if (!Array.isArray(value)) {
            throw new Error("Candidate teachers must be an array");
          }

          // Check if all IDs are valid ObjectIds
          for (const teacherId of value) {
            if (!mongoose.Types.ObjectId.isValid(teacherId)) {
              throw new Error(
                "Invalid teacher ID format in candidate teachers"
              );
            }
          }

          // Check for duplicates
          const uniqueIds = [...new Set(value)];
          if (uniqueIds.length !== value.length) {
            throw new Error("Duplicate teacher IDs in candidate teachers");
          }

          return true;
        }),

      body("reason")
        .notEmpty()
        .withMessage("Reason is required")
        .isLength({ min: 1, max: 300 })
        .withMessage("Reason must be between 1 and 300 characters")
        .trim(),

      // Custom validation để kiểm tra substitute request
      body().custom(async (value, { req }) => {
        const Lesson = require("../models/lesson.model");
        const User = require("../../auth/models/user.model");

        const { lessonId, candidateTeacherIds } = value;
        const requestingTeacherId = req.user.id;

        // Kiểm tra lesson tồn tại
        const lesson = await Lesson.findById(lessonId)
          .populate("teacher", "name email fullName")
          .populate("class", "className gradeLevel")
          .populate("subject", "subjectName subjectCode")
          .populate("timeSlot", "period startTime endTime");

        if (!lesson) {
          throw new Error("Lesson not found");
        }

        // Kiểm tra lesson thuộc về giáo viên đang request
        if (lesson.teacher._id.toString() !== requestingTeacherId) {
          throw new Error("Only the assigned teacher can request substitution");
        }

        // Kiểm tra lesson có status phù hợp
        if (lesson.status !== "scheduled") {
          throw new Error("Lesson must be scheduled for substitute request");
        }

        // Kiểm tra candidate teachers tồn tại và là giáo viên
        for (const teacherId of candidateTeacherIds) {
          const teacher = await User.findById(teacherId);
          if (!teacher) {
            throw new Error(`Candidate teacher ${teacherId} not found`);
          }

          if (!teacher.role.includes("teacher")) {
            throw new Error(`User ${teacherId} is not a teacher`);
          }

          // Không được chọn chính mình
          if (teacherId === requestingTeacherId) {
            throw new Error("Cannot select yourself as a candidate teacher");
          }
        }

        return true;
      }),
    ];
  }

  // Validation for rejecting substitute request
  validateRejectSubstituteRequest() {
    return [
      param("requestId")
        .notEmpty()
        .withMessage("Request ID is required")
        .custom((value) => {
          if (!mongoose.Types.ObjectId.isValid(value)) {
            throw new Error("Invalid request ID format");
          }
          return true;
        }),

      // Custom validation để kiểm tra quyền và trạng thái
      body().custom(async (value, { req }) => {
        const LessonRequest = require("../models/lesson-request.model");

        const lessonRequest = await LessonRequest.findById(
          req.params.requestId
        ).populate("candidateTeachers.teacher", "name email fullName");

        if (!lessonRequest) {
          throw new Error("Substitute request not found");
        }

        if (lessonRequest.requestType !== "substitute") {
          throw new Error("Not a substitute request");
        }

        if (lessonRequest.status !== "pending") {
          throw new Error("Request has already been processed");
        }

        // Kiểm tra quyền - chỉ candidate teacher mới được reject
        const candidateTeacherIds = lessonRequest.candidateTeachers.map(
          (candidate) => candidate.teacher._id.toString()
        );

        if (!candidateTeacherIds.includes(req.user.id)) {
          throw new Error("Teacher not authorized to reject this request");
        }

        return true;
      }),
    ];
  }

  // ================================ COMMON VALIDATION ================================

  // Validation cho việc approve/reject yêu cầu (swap & makeup)
  processRequest() {
    return [
      param("requestId")
        .notEmpty()
        .withMessage("Request ID is required")
        .custom((value) => {
          if (!mongoose.Types.ObjectId.isValid(value)) {
            throw new Error("Invalid request ID format");
          }
          return true;
        }),
    ];
  }

  // Validation cho việc approve swap request
  validateSwapApproval() {
    return [
      param("requestId")
        .notEmpty()
        .withMessage("Request ID is required")
        .custom((value) => {
          if (!mongoose.Types.ObjectId.isValid(value)) {
            throw new Error("Invalid request ID format");
          }
          return true;
        }),

      // body("comment")
      //   .optional()
      //   .isLength({ max: 500 })
      //   .withMessage("Comment cannot exceed 500 characters")
      //   .trim(),

      // Custom validation để kiểm tra quyền và trạng thái
      body().custom(async (value, { req }) => {
        const LessonRequest = require("../models/lesson-request.model");

        // Tìm swap request
        const lessonRequest = await LessonRequest.findById(
          req.params.requestId
        ).populate("swapInfo.replacementTeacher", "name email fullName");

        if (!lessonRequest) {
          throw new Error("Swap request not found");
        }

        if (lessonRequest.requestType !== "swap") {
          throw new Error("Not a swap request");
        }

        if (lessonRequest.status !== "pending") {
          throw new Error("Request has already been processed");
        }

        // Kiểm tra quyền - chỉ replacement teacher mới được approve
        if (
          lessonRequest.swapInfo.replacementTeacher._id.toString() !==
          req.user.id
        ) {
          throw new Error(
            "Only the replacement teacher can approve this swap request"
          );
        }

        return true;
      }),
    ];
  }

  // Validation cho request ID parameter
  validateRequestId() {
    return [
      param("requestId")
        .notEmpty()
        .withMessage("Request ID is required")
        .custom((value) => {
          if (!mongoose.Types.ObjectId.isValid(value)) {
            throw new Error("Invalid request ID format");
          }
          return true;
        }),
    ];
  }

  // Validation cho teacher requests query
  validateTeacherRequestsQuery() {
    return [
      query("teacherId")
        .optional()
        .custom((value) => {
          if (value && !mongoose.Types.ObjectId.isValid(value)) {
            throw new Error("Invalid teacher ID format");
          }
          return true;
        }),

      query("status")
        .optional()
        .isIn(["pending", "approved", "rejected", "cancelled"])
        .withMessage(
          "Status must be one of: pending, approved, rejected, cancelled"
        ),

      query("requestType")
        .optional()
        .isIn(["swap", "makeup", "substitute"])
        .withMessage("Request type must be one of: swap, makeup, substitute"),

      query("startDate")
        .optional()
        .isISO8601()
        .withMessage("Start date must be a valid date"),

      query("endDate")
        .optional()
        .isISO8601()
        .withMessage("End date must be a valid date")
        .custom((value, { req }) => {
          if (value && req.query.startDate) {
            const startDate = new Date(req.query.startDate);
            const endDate = new Date(value);

            if (endDate <= startDate) {
              throw new Error("End date must be after start date");
            }
          }

          return true;
        }),
    ];
  }

  // Validation for lesson ID parameter
  validateLessonId() {
    return [
      param("lessonId")
        .notEmpty()
        .withMessage("Lesson ID is required")
        .custom((value) => {
          if (!mongoose.Types.ObjectId.isValid(value)) {
            throw new Error("Invalid lesson ID format");
          }
          return true;
        }),
    ];
  }
}

module.exports = new LessonRequestValidation();
