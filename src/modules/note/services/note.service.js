const Note = require("../models/note.model");

class NoteService {
  async createNote({ title, content, user, lesson, remindAt, time }) {
    return await Note.create({ title, content, user, lesson, remindAt, time });
  }

  async getNotesByUserAndLesson(user, lesson) {
    return await Note.find({ user, lesson })
      .sort({ createdAt: -1 })
      .select("+time"); // đảm bảo luôn trả về trường time
  }

  async updateNote(noteId, user, updateData) {
    // Chỉ cho phép cập nhật nếu ghi chú thuộc về người dùng
    return await Note.findOneAndUpdate({ _id: noteId, user }, updateData, {
      new: true,
    });
  }

  async deleteNote(noteId, user) {
    // Chỉ cho phép xóa nếu ghi chú thuộc về người dùng
    return await Note.findOneAndDelete({ _id: noteId, user });
  }
}

module.exports = new NoteService();
