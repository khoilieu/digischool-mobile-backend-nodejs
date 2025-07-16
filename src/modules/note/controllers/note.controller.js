const noteService = require("../services/note.service");
const LessonModel = require("../../schedules/models/lesson.model");
const NoteModel = require("../models/note.model");

class NoteController {
  // Tạo ghi chú mới
  async createNote(req, res, next) {
    try {
      const { title, content, lesson, remindMinutes } = req.body;
      const user = req.user._id;

      if (!title || !content || !lesson) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields",
        });
      }

      const lessonDoc = await LessonModel.findById(lesson).populate("timeSlot");
      if (!lessonDoc) {
        return res.status(404).json({
          success: false,
          message: "Lesson not found",
        });
      }

      if (
        !lessonDoc.scheduledDate ||
        !lessonDoc.timeSlot ||
        !lessonDoc.timeSlot.startTime
      ) {
        return res.status(400).json({
          success: false,
          message: "Lesson missing scheduledDate or timeSlot.startTime",
        });
      }

      let remindAt;
      let time;
      // Nếu có remindMinutes, tính remindAt trước lesson
      if (
        remindMinutes !== undefined &&
        remindMinutes !== null &&
        remindMinutes > 0
      ) {
        const [hour, minute] = lessonDoc.timeSlot.startTime
          .split(":")
          .map(Number);
        const scheduledDate = new Date(lessonDoc.scheduledDate);
        scheduledDate.setHours(hour, minute, 0, 0);
        remindAt = new Date(scheduledDate.getTime() - remindMinutes * 60000);
        time = remindMinutes;
        if (isNaN(remindAt.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid remindAt date",
          });
        }
      }
      // Gọi service, chỉ truyền remindAt và time nếu có remindMinutes
      const note = await noteService.createNote({
        title,
        content,
        user,
        lesson,
        ...(remindAt && { remindAt }),
        ...(time && { time }),
      });

      res.status(201).json({
        success: true,
        message: "Note created successfully",
        data: note,
      });
    } catch (error) {
      console.error("❌ Error in createNote:", error.message);
      next(error);
    }
  }

  // Lấy danh sách ghi chú của user tại 1 tiết học
  async getNotesByLesson(req, res, next) {
    try {
      const user = req.user._id;
      const { lesson } = req.query;

      if (!lesson) {
        return res.status(400).json({
          success: false,
          message: "Missing lesson id",
        });
      }

      const notes = await noteService.getNotesByUserAndLesson(user, lesson);

      res.status(200).json({
        success: true,
        message: "Notes retrieved successfully",
        data: notes,
      });
    } catch (error) {
      console.error("❌ Error in getNotesByLesson:", error.message);
      next(error);
    }
  }

  // Cập nhật ghi chú (PATCH)
  async updateNote(req, res, next) {
    try {
      const user = req.user._id;
      const { id } = req.params;
      const updateData = req.body;

      let updatePayload = {};
      let unsetData = {};
      let setData = {};
      Object.assign(setData, updateData); // copy các trường update

      if (updateData.remindMinutes !== undefined) {
        const note = await NoteModel.findById(id);
        if (!note || String(note.user) !== String(user)) {
          return res.status(404).json({
            success: false,
            message: "Note not found",
          });
        }

        const lessonDoc = await LessonModel.findById(note.lesson).populate(
          "timeSlot"
        );
        if (!lessonDoc) {
          return res.status(404).json({
            success: false,
            message: "Lesson not found",
          });
        }

        if (updateData.remindMinutes && updateData.remindMinutes > 0) {
          // Tính remindAt trước lesson
          const [hour, minute] = lessonDoc.timeSlot.startTime
            .split(":")
            .map(Number);
          const scheduledDate = new Date(lessonDoc.scheduledDate);
          scheduledDate.setHours(hour, minute, 0, 0);
          setData.remindAt = new Date(
            scheduledDate.getTime() - updateData.remindMinutes * 60000
          );
          setData.time = updateData.remindMinutes;
          if (isNaN(setData.remindAt.getTime())) {
            return res.status(400).json({
              success: false,
              message: "Invalid remindAt date",
            });
          }
        } else {
          // Nếu remindMinutes = 0 hoặc null, xóa remindAt và time
          unsetData.remindAt = "";
          unsetData.time = "";
          delete setData.remindAt;
          delete setData.time;
        }
        delete setData.remindMinutes;
      } else {
        // Nếu không gửi remindMinutes, xóa remindAt và time
        unsetData.remindAt = "";
        unsetData.time = "";
      }

      // Chỉ truyền $unset nếu có trường cần xóa
      if (Object.keys(unsetData).length > 0) {
        // Nếu có trường khác ngoài remindAt/time thì truyền $set
        const setFields = { ...setData };
        delete setFields.remindAt;
        delete setFields.time;
        if (Object.keys(setFields).length > 0) {
          updatePayload = { $set: setFields, $unset: unsetData };
        } else {
          updatePayload = { $unset: unsetData };
        }
      } else {
        updatePayload = setData;
      }
      
      const updated = await noteService.updateNote(id, user, updatePayload);
      if (!updated) {
        return res.status(404).json({
          success: false,
          message: "Note not found",
        });
      }

      res.status(200).json({
        success: true,
        message: "Note updated successfully",
        data: updated,
      });
    } catch (error) {
      console.error("❌ Error in updateNote:", error.message);
      next(error);
    }
  }

  // Xóa ghi chú
  async deleteNote(req, res, next) {
    try {
      const user = req.user._id;
      const { id } = req.params;

      const deleted = await noteService.deleteNote(id, user);
      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: "Note not found",
        });
      }

      res.status(200).json({
        success: true,
        message: "Note deleted successfully",
      });
    } catch (error) {
      console.error("❌ Error in deleteNote:", error.message);
      next(error);
    }
  }
}

module.exports = new NoteController();
