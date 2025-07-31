const ConstraintSchedulerService = require("./constraint-scheduler.service");
const User = require("../../auth/models/user.model");
const School = require("../../classes/models/school.model");
const userService = require("../../user/services/user.service");

class MultiClassSchedulerService {
  constructor() {
    this.constraintScheduler = new ConstraintSchedulerService();

    // Teacher assignment strategy
    this.teacherAssignments = new Map(); // subjectId -> { teachers: [], assignments: Map(teacherId -> [classIds]) }
    this.classScheduleOffsets = new Map(); // classId -> dayOffset for schedule variation
    this.assignmentByClassAndSubject = new Map(); // subjectId -> Map<classId, teacher>
  }

  /**
   * MAIN METHOD: Create schedules for multiple classes with proper teacher distribution
   */
  async createMultiClassSchedules(
    weeklyScheduleIds,
    classIds,
    academicYearId,
    weekNum,
    weekStartDate,
    timeSlots,
    subjects,
    homeroomTeachers,
    createdBy
  ) {
    console.log(`\n🎯 BẮT ĐẦU TẠO THỜI KHÓA BIỂU ĐA LỚP - Tuần ${weekNum}`);
    console.log(`📋 Số lớp: ${classIds.length}`);
    console.log("=".repeat(60));

    // Step 1: Initialize teacher assignments for all subjects
    const homeroomTeachersMap = new Map();
    for (let i = 0; i < classIds.length; i++) {
      const classId = classIds[i];
      const homeroomTeacher = homeroomTeachers[i];
      homeroomTeachersMap.set(classId.toString(), homeroomTeacher);
    }
    await this.initializeTeacherAssignments(
      subjects,
      classIds,
      homeroomTeachersMap
    );

    // Step 2: Create schedule variations for each class
    this.initializeClassScheduleVariations(classIds);

    // Step 3: Create schedules for each class with different patterns
    const allLessons = [];

    for (let i = 0; i < classIds.length; i++) {
      const classId = classIds[i];
      const weeklyScheduleId = weeklyScheduleIds[i];
      const homeroomTeacher = homeroomTeachersMap.get(classId.toString());

      console.log(
        `\n📚 Tạo lịch cho lớp ${i + 1}/${classIds.length}: ${classId}`
      );

      // Get assigned teachers for this class
      const classTeachers = this.getTeachersForClass(classId, subjects);

      // Create modified constraint scheduler for this specific class
      const lessons = await this.createClassScheduleWithVariation(
        weeklyScheduleId,
        classId,
        academicYearId,
        weekNum,
        weekStartDate,
        timeSlots,
        subjects,
        homeroomTeacher,
        createdBy,
        classTeachers,
        i
      );

      allLessons.push(...lessons);
    }

    // Step 4: Print comprehensive teacher assignment report
    this.printTeacherAssignmentReport();

    // In bảng phân công giáo viên cho từng môn/lớp giống file test
    this.printAssignmentTable(classIds, subjects);
    // Ghi ra file text
    this.writeAssignmentTableToFile(classIds, subjects);

    console.log(`\n🎉 HOÀN THÀNH TẠO ${classIds.length} THỜI KHÓA BIỂU`);
    console.log("=".repeat(60));

    return allLessons;
  }

  /**
   * Step 1: Initialize teacher assignments for optimal distribution
   */
  async initializeTeacherAssignments(subjects, classIds, homeroomTeachersMap) {
    console.log("👥 Khởi tạo phân công giáo viên...");
    this.assignmentByClassAndSubject = new Map(); // reset
    for (const subject of subjects) {
      const teachers = await User.find({
        subject: subject._id,
        role: { $in: ["teacher", "homeroom_teacher"] },
        active: true,
      });
      if (teachers.length === 0) {
        console.log(
          `⚠️ Không tìm thấy giáo viên cho môn ${subject.subjectName}`
        );
        continue;
      }
      const assignments = new Map();
      const assignedClassIds = new Set();
      const homeroomTeacherIds = new Set();
      // Map lớp chủ nhiệm -> giáo viên chủ nhiệm nếu dạy đúng môn
      for (const classId of classIds) {
        let homeroomTeacher = homeroomTeachersMap.get(classId.toString());
        // Nếu chưa populate đủ, truy vấn lại
        if (
          homeroomTeacher &&
          (!homeroomTeacher.role || !homeroomTeacher.subject)
        ) {
          homeroomTeacher = await User.findById(homeroomTeacher._id).select(
            "name role subject subjects"
          );
        }
        // Kiểm tra cả subject (single) và subjects (array)
        const isHomeroomTeacherForSubject =
          homeroomTeacher &&
          Array.isArray(homeroomTeacher.role) &&
          homeroomTeacher.role.includes("teacher") &&
          homeroomTeacher.role.includes("homeroom_teacher") &&
          ((homeroomTeacher.subject &&
            homeroomTeacher.subject.toString() === subject._id.toString()) ||
            (Array.isArray(homeroomTeacher.subjects) &&
              homeroomTeacher.subjects
                .map((s) => s.toString())
                .includes(subject._id.toString())));
        if (isHomeroomTeacherForSubject) {
          if (!assignments.has(homeroomTeacher._id.toString())) {
            assignments.set(homeroomTeacher._id.toString(), []);
          }
          assignments.get(homeroomTeacher._id.toString()).push(classId);
          assignedClassIds.add(classId.toString());
          homeroomTeacherIds.add(homeroomTeacher._id.toString());
          // Gán vào assignmentByClassAndSubject
          if (!this.assignmentByClassAndSubject.has(subject._id.toString())) {
            this.assignmentByClassAndSubject.set(
              subject._id.toString(),
              new Map()
            );
          }
          this.assignmentByClassAndSubject
            .get(subject._id.toString())
            .set(classId.toString(), homeroomTeacher);
        }
      }
      // Các lớp còn lại chia đều cho các giáo viên bộ môn còn lại (loại giáo viên chủ nhiệm đã gán lớp chủ nhiệm)
      const otherTeachers = teachers.filter(
        (t) => !Array.from(homeroomTeacherIds).includes(t._id.toString())
      );
      const unassignedClassIds = classIds.filter(
        (cid) => !assignedClassIds.has(cid.toString())
      );
      if (otherTeachers.length > 0) {
        const classesPerTeacher = Math.ceil(
          unassignedClassIds.length / otherTeachers.length
        );
        unassignedClassIds.forEach((classId, index) => {
          const teacherIndex =
            Math.floor(index / classesPerTeacher) % otherTeachers.length;
          const teacher = otherTeachers[teacherIndex];
          if (!assignments.has(teacher._id.toString())) {
            assignments.set(teacher._id.toString(), []);
          }
          assignments.get(teacher._id.toString()).push(classId);
          // Gán vào assignmentByClassAndSubject
          if (!this.assignmentByClassAndSubject.has(subject._id.toString())) {
            this.assignmentByClassAndSubject.set(
              subject._id.toString(),
              new Map()
            );
          }
          this.assignmentByClassAndSubject
            .get(subject._id.toString())
            .set(classId.toString(), teacher);
        });
      }
      this.teacherAssignments.set(subject._id.toString(), {
        subject: subject,
        teachers: teachers,
        assignments: assignments,
      });
      console.log(
        `✅ ${subject.subjectName}: ${teachers.length} GV cho ${classIds.length} lớp`
      );
      for (const [teacherId, assignedClasses] of assignments) {
        const teacher = teachers.find((t) => t._id.toString() === teacherId);
        console.log(
          `   - ${teacher.name}: ${
            assignedClasses.length
          } lớp (${assignedClasses
            .map((c) => c.toString().slice(-3))
            .join(", ")})`
        );
      }
    }
  }

  /**
   * Distribute classes among teachers optimally
   */
  distributeClassesAmongTeachers(teachers, classIds) {
    const assignments = new Map();

    // Initialize assignments
    teachers.forEach((teacher) => {
      assignments.set(teacher._id.toString(), []);
    });

    // Distribute classes evenly
    const classesPerTeacher = Math.ceil(classIds.length / teachers.length);

    classIds.forEach((classId, index) => {
      const teacherIndex =
        Math.floor(index / classesPerTeacher) % teachers.length;
      const teacher = teachers[teacherIndex];
      assignments.get(teacher._id.toString()).push(classId);
    });

    return assignments;
  }

  /**
   * Step 2: Initialize different schedule patterns for each class
   */
  initializeClassScheduleVariations(classIds) {
    console.log("🔄 Khởi tạo biến thể lịch học...");

    classIds.forEach((classId, index) => {
      // Create different starting patterns for each class
      this.classScheduleOffsets.set(classId, {
        dayOffset: index % 3, // Rotate through 3 different day patterns
        priorityOffset: index % 2, // Alternate priority subject placement
        doubleSlotOffset: index, // Different double period placement
      });
    });
  }

  /**
   * Get assigned teachers for a specific class
   */
  getTeachersForClass(classId, subjects) {
    const classTeachers = new Map();

    subjects.forEach((subject) => {
      const subjectAssignment = this.teacherAssignments.get(
        subject._id.toString()
      );
      if (subjectAssignment) {
        // Find which teacher is assigned to this class for this subject
        for (const [
          teacherId,
          assignedClasses,
        ] of subjectAssignment.assignments) {
          if (assignedClasses.includes(classId)) {
            const teacher = subjectAssignment.teachers.find(
              (t) => t._id.toString() === teacherId
            );
            classTeachers.set(subject._id.toString(), teacher);
            break;
          }
        }
      }
    });

    return classTeachers;
  }

  /**
   * Step 3: Create schedule for a specific class with variations
   */
  async createClassScheduleWithVariation(
    weeklyScheduleId,
    classId,
    academicYearId,
    weekNum,
    weekStartDate,
    timeSlots,
    subjects,
    homeroomTeacher,
    createdBy,
    classTeachers,
    classIndex
  ) {
    // Truyền assignmentByClassAndSubject vào ModifiedConstraintScheduler
    const modifiedScheduler = new ModifiedConstraintScheduler(
      this.classScheduleOffsets.get(classId),
      classTeachers,
      classIndex,
      homeroomTeacher,
      classId,
      this.assignmentByClassAndSubject // truyền map phân công
    );

    return await modifiedScheduler.createConstraintBasedSchedule(
      weeklyScheduleId,
      classId,
      academicYearId,
      weekNum,
      weekStartDate,
      timeSlots,
      subjects,
      homeroomTeacher,
      createdBy
    );
  }

  /**
   * Print comprehensive teacher assignment report
   */
  printTeacherAssignmentReport() {
    console.log(`\n📊 BÁO CÁO PHÂN CÔNG GIÁO VIÊN`);
    console.log("=".repeat(50));

    for (const [subjectId, assignment] of this.teacherAssignments) {
      console.log(`\n📚 ${assignment.subject.subjectName}:`);

      for (const [teacherId, assignedClasses] of assignment.assignments) {
        const teacher = assignment.teachers.find(
          (t) => t._id.toString() === teacherId
        );
        const workload = assignedClasses.length;
        const classNames = assignedClasses
          .map((c) => c.toString().slice(-3))
          .join(", ");

        console.log(`  👨‍🏫 ${teacher.name}:`);
        console.log(`     - Số lớp: ${workload}`);
        console.log(`     - Lớp dạy: ${classNames}`);
        console.log(
          `     - Khối lượng/tuần: ${
            workload * (assignment.subject.weeklyHours || 3)
          } tiết`
        );
      }
    }
  }

  // In bảng phân công giáo viên cho từng môn/lớp giống file test
  printAssignmentTable(classIds, subjects) {
    for (const subject of subjects) {
      const assignment = this.teacherAssignments.get(subject._id.toString());
      if (!assignment) continue;
      const { teachers, assignments } = assignment;
      console.log(`\nMôn: ${subject.subjectName}`);
      for (const [teacherId, assignedClasses] of assignments) {
        const teacher = teachers.find((t) => t._id.toString() === teacherId);
        const classNames = assignedClasses.map((cid) => {
          // Lấy tên lớp từ allLessons nếu có, hoặc in id
          return cid.toString().slice(-3);
        });
        console.log(
          `- ${teacher.name} (${teacher.role.join(", ")}): ${classNames.join(
            ", "
          )}`
        );
      }
    }
  }

  writeAssignmentTableToFile(classIds, subjects) {
    let output = "";
    for (const subject of subjects) {
      const assignment = this.teacherAssignments.get(subject._id.toString());
      if (!assignment) continue;
      const { teachers, assignments } = assignment;
      output += `\nMôn: ${subject.subjectName}\n`;
      for (const [teacherId, assignedClasses] of assignments) {
        const teacher = teachers.find((t) => t._id.toString() === teacherId);
        const classNames = assignedClasses.map((cid) => {
          return cid.toString().slice(-3);
        });
        output += `- ${teacher.name} (${teacher.role.join(
          ", "
        )}): ${classNames.join(", ")}\n`;
      }
    }
  }
}

/**
 * Modified Constraint Scheduler with class-specific variations
 */
class ModifiedConstraintScheduler extends ConstraintSchedulerService {
  constructor(
    scheduleOffset,
    classTeachers,
    classIndex,
    homeroomTeacher,
    classId,
    assignmentByClassAndSubject
  ) {
    super();
    this.scheduleOffset = scheduleOffset;
    this.classTeachers = classTeachers;
    this.classIndex = classIndex;
    this.homeroomTeacher = homeroomTeacher;
    this.classId = classId;
    this.assignmentByClassAndSubject = assignmentByClassAndSubject;

    // Define priority subjects
    this.PRIORITY_SUBJECTS = [
      "Mathematics",
      "Literature",
      "English",
      "Physics",
      "Chemistry",
    ];
  }

  // Ghi đè hàm phân công giáo viên: ưu tiên giáo viên chủ nhiệm dạy môn chuyên môn cho lớp chủ nhiệm
  async findSpecializedTeacher(subjectId, classId) {
    // Nếu là lớp chủ nhiệm và giáo viên chủ nhiệm có dạy môn này thì ưu tiên tuyệt đối
    if (
      this.homeroomTeacher &&
      Array.isArray(this.homeroomTeacher.role) &&
      this.homeroomTeacher.role.includes("teacher") &&
      this.homeroomTeacher.role.includes("homeroom_teacher") &&
      this.homeroomTeacher.subject &&
      this.homeroomTeacher.subject.toString() === subjectId.toString()
    ) {
      return this.homeroomTeacher;
    }
    // Nếu đã phân công giáo viên cho lớp này thì lấy
    if (
      this.assignmentByClassAndSubject &&
      this.assignmentByClassAndSubject.has(subjectId.toString())
    ) {
      const classMap = this.assignmentByClassAndSubject.get(
        subjectId.toString()
      );
      if (classMap && classMap.has((classId || this.classId).toString())) {
        return classMap.get((classId || this.classId).toString());
      }
    }
    // Fallback - sử dụng method từ parent class để tạo giáo viên tự động
    return await super.findSpecializedTeacher(subjectId, classId);
  }

  // Ghi đè hàm tìm slot tốt nhất để áp dụng ràng buộc phân loại môn học
  findBestSingleSlot(constraints, subject, teacher) {
    const scheduleConfig = constraints.scheduleConfig;
    let bestSlot = null;
    let bestScore = -1;
    for (const dayIndex of scheduleConfig.days) {
      // Tránh lặp môn trong ngày
      if (this.checkSubjectInDay(constraints, subject._id.toString(), dayIndex))
        continue;
      for (let period = 0; period < 10; period++) {
        // Kiểm tra slot hợp lý cho loại môn
        if (!this.checkSubjectSlotConstraint(subject.subjectName, period))
          continue;
        // Kiểm tra conflict giáo viên toàn trường
        if (
          this.checkTeacherConflict(
            constraints,
            teacher?._id?.toString(),
            dayIndex,
            period
          )
        )
          continue;
        if (
          this.canScheduleSingleSlot(
            constraints,
            subject,
            teacher?._id?.toString(),
            dayIndex,
            period
          )
        ) {
          const score = this.calculateSlotScore(
            constraints,
            subject,
            teacher,
            dayIndex,
            period
          );
          if (score > bestScore) {
            bestScore = score;
            bestSlot = { dayIndex, period };
          }
        }
      }
    }
    return bestSlot;
  }

  // Ghi đè hàm tìm slot tiết đôi tương tự (ưu tiên slot hợp lý, tránh conflict, tránh lặp môn trong ngày)
  findBestDoubleSlot(constraints, subject, teacher) {
    const scheduleConfig = constraints.scheduleConfig;
    let bestSlot = null;
    let bestScore = -1;
    for (const dayIndex of scheduleConfig.days) {
      if (this.checkSubjectInDay(constraints, subject._id.toString(), dayIndex))
        continue;
      for (let period = 0; period < 9; period++) {
        if (!this.checkSubjectSlotConstraint(subject.subjectName, period))
          continue;
        if (!this.checkSubjectSlotConstraint(subject.subjectName, period + 1))
          continue;
        if (
          this.checkTeacherConflict(
            constraints,
            teacher?._id?.toString(),
            dayIndex,
            period
          )
        )
          continue;
        if (
          this.checkTeacherConflict(
            constraints,
            teacher?._id?.toString(),
            dayIndex,
            period + 1
          )
        )
          continue;
        if (
          this.canScheduleDoubleSlot(
            constraints,
            teacher?._id?.toString(),
            dayIndex,
            period,
            period + 1
          )
        ) {
          const score = this.calculateDoubleSlotScore(
            constraints,
            dayIndex,
            period,
            subject
          );
          if (score > bestScore) {
            bestScore = score;
            bestSlot = { dayIndex, startPeriod: period };
          }
        }
      }
    }
    return bestSlot;
  }

  /**
   * Tính điểm cho slot tiết đôi với biến thể lớp
   */
  calculateDoubleSlotScoreWithVariation(
    constraints,
    dayIndex,
    period,
    subject
  ) {
    let score = 0;

    // Đếm số tiết đã có trong ngày này
    let lessonsThisDay = 0;
    for (let p = 0; p < 10; p++) {
      if (constraints.schedule[dayIndex][p] !== null) {
        lessonsThisDay++;
      }
    }

    // Ưu tiên ngày có ít tiết hơn (để rãi đều)
    score += (10 - lessonsThisDay) * 20;

    // Ưu tiên buổi sáng cho môn quan trọng
    if (this.PRIORITY_SUBJECTS.includes(subject.subjectName) && period <= 5) {
      score += 30;
    }

    // Tạo biến thể cho từng lớp
    const classVariation = this.classIndex % 3;
    if (classVariation === 0 && [0, 2].includes(dayIndex)) score += 20; // Lớp A: T2, T4
    if (classVariation === 1 && [1, 3].includes(dayIndex)) score += 20; // Lớp B: T3, T5
    if (classVariation === 2 && [2, 4].includes(dayIndex)) score += 20; // Lớp C: T4, T6

    // Tránh tiết đầu và cuối ngày
    if (period === 1 || period >= 9) {
      score -= 10;
    }

    return score;
  }

  /**
   * Apply slot offset for class variation
   */
  applySlotOffset(slots) {
    const offset = this.scheduleOffset.doubleSlotOffset % slots.length;
    return [...slots.slice(offset), ...slots.slice(0, offset)];
  }

  /**
   * Kiểm tra xem ngày đã có tiết đôi chưa
   */
  hasDoublePeriodInDay(constraints, dayIndex) {
    // Kiểm tra các cặp tiết liên tiếp có cùng môn không
    for (let period = 1; period <= 9; period++) {
      const lesson1 = constraints.schedule[dayIndex][period - 1];
      const lesson2 = constraints.schedule[dayIndex][period];

      if (
        lesson1 &&
        lesson2 &&
        lesson1.subject &&
        lesson2.subject &&
        lesson1.subject.toString() === lesson2.subject.toString()
      ) {
        return true; // Đã có tiết đôi
      }
    }
    return false;
  }

  /**
   * Override: Calculate slot score with class-specific preferences
   */
  calculateSlotScore(constraints, subject, teacher, dayIndex, period) {
    let score = super.calculateSlotScore(
      constraints,
      subject,
      teacher,
      dayIndex,
      period
    );

    // Add class-specific variation
    if (this.classIndex % 2 === 0) {
      // Even classes prefer earlier periods
      score += (11 - period) * 2;
    } else {
      // Odd classes prefer later periods
      score += period * 2;
    }

    // Encourage different patterns for different classes
    const dayPreference = (dayIndex + this.scheduleOffset.dayOffset) % 3;
    if (dayPreference === 0) score += 10;

    return score;
  }

  /**
   * Override: Print class-specific report
   */
  printSchedulingReport(constraints, validationResult) {
    console.log(`\n📊 BÁO CÁO LỚP ${this.classIndex + 1}`);
    console.log("-".repeat(40));

    super.printSchedulingReport(constraints, validationResult);
  }
}

module.exports = MultiClassSchedulerService;
