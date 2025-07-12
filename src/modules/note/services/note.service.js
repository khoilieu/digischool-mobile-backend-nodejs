const Note = require('../models/note.model');

async function createNote({ title, content, user, lesson, remindAt, time }) {
  return await Note.create({ title, content, user, lesson, remindAt, time });
}

async function getNotesByUserAndLesson(user, lesson) {
  return await Note.find({ user, lesson })
    .sort({ createdAt: -1 })
    .select('+time'); // đảm bảo luôn trả về trường time
}

async function updateNote(noteId, user, updateData) {
  // Only allow update if note belongs to user
  return await Note.findOneAndUpdate(
    { _id: noteId, user },
    updateData,
    { new: true }
  );
}

async function deleteNote(noteId, user) {
  // Only allow delete if note belongs to user
  return await Note.findOneAndDelete({ _id: noteId, user });
}

module.exports = {
  createNote,
  getNotesByUserAndLesson,
  updateNote,
  deleteNote,
}; 