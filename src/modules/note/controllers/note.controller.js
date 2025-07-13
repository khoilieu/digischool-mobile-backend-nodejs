
const noteService = require("../services/note.service");
const LessonModel = require("../../schedules/models/lesson.model");
const NoteModel = require("../models/note.model");

class NoteController {
  // Tạo ghi chú mới
  async createNote(req, res, next) {
    try {
      const { title, content, lesson, remindMinutes } = req.body;
      const user = req.user._id;
      if (!title || !content || !lesson || remindMinutes === undefined) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const lessonDoc = await LessonModel.findById(lesson).populate("timeSlot");
      if (!lessonDoc)
        return res.status(404).json({ message: "Lesson not found" });
      if (
        !lessonDoc.scheduledDate ||
        !lessonDoc.timeSlot ||
        !lessonDoc.timeSlot.startTime
      ) {
        return res.status(400).json({
          message: "Lesson missing scheduledDate or timeSlot.startTime",
        });
      }

      const [hour, minute] = lessonDoc.timeSlot.startTime
        .split(":")
        .map(Number);
      const scheduledDate = new Date(lessonDoc.scheduledDate);
      scheduledDate.setHours(hour, minute, 0, 0);
      const remindAt = new Date(
        scheduledDate.getTime() + remindMinutes * 60000
      );
      if (isNaN(remindAt.getTime())) {
        return res.status(400).json({ message: "Invalid remindAt date" });
      }

      const note = await noteService.createNote({
        title,
        content,
        user,
        lesson,
        remindAt,
        time: remindMinutes,
      });
      res.status(201).json(note);
    } catch (err) {
      next(err);
    }
  }

  // Lấy danh sách ghi chú của user tại 1 tiết học
  async getNotesByLesson(req, res, next) {
    try {
      const user = req.user._id;
      const { lesson } = req.query;
      if (!lesson)
        return res.status(400).json({ message: "Missing lesson id" });
      const notes = await noteService.getNotesByUserAndLesson(user, lesson);
      res.json(notes);
    } catch (err) {
      next(err);
    }
  }

  // Cập nhật ghi chú (PATCH)
  async updateNote(req, res, next) {
    try {
      const user = req.user._id;
      const { id } = req.params;
      const updateData = req.body;
      if (updateData.remindMinutes !== undefined) {
        const note = await NoteModel.findById(id);
        if (!note || String(note.user) !== String(user))
          return res.status(404).json({ message: "Note not found" });
        const lessonDoc = await LessonModel.findById(note.lesson);
        if (!lessonDoc)
          return res.status(404).json({ message: "Lesson not found" });
        updateData.remindAt = new Date(
          new Date(lessonDoc.startTime).getTime() +
            updateData.remindMinutes * 60000
        );
        delete updateData.remindMinutes;
      }
      const updated = await noteService.updateNote(id, user, updateData);
      if (!updated) return res.status(404).json({ message: "Note not found" });
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }

  // Xóa ghi chú
  async deleteNote(req, res, next) {
    try {
      const user = req.user._id;
      const { id } = req.params;
      const deleted = await noteService.deleteNote(id, user);
      if (!deleted) return res.status(404).json({ message: "Note not found" });
      res.json({ message: "Deleted successfully" });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new NoteController();
