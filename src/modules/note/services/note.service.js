const Note = require("../models/note.model");

class NoteService {
  async createNote({ title, content, user, lesson, remindAt, time }) {
    try {
      console.log(
        "📝 Creating new note:",
        JSON.stringify(
          { title, content, user, lesson, remindAt, time },
          null,
          2
        )
      );

      const noteData = {
        title,
        content,
        user,
        lesson,
      };
      if (remindAt !== undefined) noteData.remindAt = remindAt;
      if (time !== undefined) noteData.time = time;

      const note = await Note.create(noteData);

      console.log("✅ Note created successfully:", note._id);

      return note;
    } catch (error) {
      console.error("❌ Error creating note:", error.message);
      throw error;
    }
  }

  async getNotesByUserAndLesson(user, lesson) {
    try {
      console.log("📋 Getting notes for user:", user, "lesson:", lesson);

      const notes = await Note.find({ user, lesson })
        .sort({ createdAt: -1 })
        .select("+time"); // đảm bảo luôn trả về trường time

      console.log(
        `✅ Found ${notes.length} notes for user ${user} and lesson ${lesson}`
      );

      return notes;
    } catch (error) {
      console.error(
        "❌ Error getting notes by user and lesson:",
        error.message
      );
      throw error;
    }
  }

  async updateNote(noteId, user, updateData) {
    try {
      console.log("✏️ Updating note:", noteId, "for user:", user);
      console.log("📝 Update data:", JSON.stringify(updateData, null, 2));

      // Chỉ cho phép cập nhật nếu ghi chú thuộc về người dùng
      const updatedNote = await Note.findOneAndUpdate(
        { _id: noteId, user },
        updateData,
        { new: true, strict: false }
      );

      if (updatedNote) {
        console.log("✅ Note updated successfully");
      } else {
        console.log("❌ Note not found or access denied");
      }

      return updatedNote;
    } catch (error) {
      console.error("❌ Error updating note:", error.message);
      throw error;
    }
  }

  async deleteNote(noteId, user) {
    try {
      console.log("🗑️ Deleting note:", noteId, "for user:", user);

      // Chỉ cho phép xóa nếu ghi chú thuộc về người dùng
      const deletedNote = await Note.findOneAndDelete({ _id: noteId, user });

      if (deletedNote) {
        console.log("✅ Note deleted successfully");
      } else {
        console.log("❌ Note not found or access denied");
      }

      return deletedNote;
    } catch (error) {
      console.error("❌ Error deleting note:", error.message);
      throw error;
    }
  }
}

module.exports = new NoteService();
