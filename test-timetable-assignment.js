const mongoose = require("mongoose");
const Lesson = require("./src/modules/schedules/models/lesson.model");
const Class = require("./src/modules/classes/models/class.model");
const Subject = require("./src/modules/subjects/models/subject.model");
const User = require("./src/modules/auth/models/user.model");

async function testLessonAssignment() {
  await mongoose.connect(
    "mongodb+srv://ecoschool:BvhOtsaE9nHpklfQ@ecoschool.5nmurmb.mongodb.net/ecoschool-app-dev"
  ); // Sửa lại DB nếu cần

  // Thông số test
  const academicYear = "2025-2026";
  const gradeLevel = 12;
  const weekNumber = 1;

  // Lấy danh sách lớp khối 12 năm học 2025-2026
  const classes = await Class.find({ academicYear, gradeLevel });
  const classIds = classes.map((cls) => cls._id);
  const classIdToName = new Map(
    classes.map((cls) => [cls._id.toString(), cls.className])
  );

  // Lấy tất cả lesson của các lớp này trong tuần này
  // Giả định lesson có trường scheduledDate và weekNumber
  // Nếu không có weekNumber, lọc theo scheduledDate nằm trong tuần
  const lessons = await Lesson.find({
    class: { $in: classIds },
    // Nếu lesson có weekNumber:
    // weekNumber,
    // Nếu không, lọc theo scheduledDate:
    // scheduledDate: { $gte: new Date('2025-08-11'), $lte: new Date('2025-08-17') }
  })
    .populate("class", "className")
    .populate("subject", "subjectName")
    .populate("teacher", "name role");

  // Gom nhóm: môn -> giáo viên -> lớp
  const assignmentMap = new Map();
  for (const lesson of lessons) {
    if (!lesson.subject || !lesson.teacher) continue;
    const subjectName = lesson.subject.subjectName;
    const teacherName = lesson.teacher.name;
    const teacherRole = lesson.teacher.role.join(", ");
    const className =
      lesson.class.className || classIdToName.get(lesson.class._id.toString());

    if (!assignmentMap.has(subjectName))
      assignmentMap.set(subjectName, new Map());
    const teacherMap = assignmentMap.get(subjectName);
    const key = `${teacherName} (${teacherRole})`;
    if (!teacherMap.has(key)) teacherMap.set(key, new Set());
    teacherMap.get(key).add(className);
  }

  // In ra bảng
  for (const [subject, teacherMap] of assignmentMap) {
    console.log(`\nMôn: ${subject}`);
    for (const [teacher, classSet] of teacherMap) {
      console.log(`- ${teacher}: ${Array.from(classSet).join(", ")}`);
    }
  }

  await mongoose.disconnect();
}

testLessonAssignment();
