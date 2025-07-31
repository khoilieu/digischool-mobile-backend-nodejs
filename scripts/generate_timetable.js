const XLSX = require("xlsx");

// Homeroom teachers for each class
const homeroomTeachers = {
  "12A1": "Trần Thị Nga",
  "12A2": "Nguyễn Thị Kim Huệ",
  "12A3": "Võ Thu Hương",
  "12B": "Nguyễn Thị Tuyết Nga",
};

// Teacher assignments from Phân_cong_giao_vien.txt
const teacherAssignments = {
  GDQP: {
    "12A1": "Cao Văn Ngại",
    "12A2": "Cao Văn Ngại",
    "12A3": "Cao Văn Ngại",
    "12B": "Cao Văn Ngại",
  },
  Toán: {
    "12A1": "Phạm Thanh Tâm",
    "12A2": "Phạm Huy Hoàng",
    "12A3": "Nguyễn Thị Linh Thảo",
    "12B": "Nguyễn Thị Tuyết Nga",
  },
  "Vật lý": {
    "12A1": "Bùi Quốc Việt",
    "12A2": "Nguyễn Thị Kim Huệ",
    "12A3": "Võ Thu Hương",
    "12B": "Lê Thị Huyền Trang",
  },
  "Tin học": {
    "12A1": "Trần Đức Chiến",
    "12A2": "Trần Đức Chiến",
    "12A3": "Trần Hữu Điền",
    "12B": "Nguyễn Thị Vui",
  },
  "Hóa học": {
    "12A1": "Đặng Nguyễn Huỳnh Lệ",
    "12A2": "Nguyễn Thị Thanh Tuyền",
    "12A3": "Bùi Phước Trường An",
    "12B": "Đặng Nguyễn Huỳnh Lệ",
  },
  "Sinh học": {
    "12A1": "Lê Thị Mỹ Xuyên",
    "12A2": "Lê Thị Mỹ Xuyên",
    "12A3": "Ngô Thị Ngàn",
    "12B": "Ngô Thị Ngàn",
  },
  "Ngữ văn": {
    "12A1": "Trần Thị Nga",
    "12A2": "Nguyễn Thị Thu Hương",
    "12A3": "Ngô Ngọc Hà",
    "12B": "Nguyễn Kim Huệ",
  },
  "Lịch sử": {
    "12A1": "Phạm Hoài Đạt",
    "12A2": "Trần Tấn Nhã",
    "12A3": "Trần Tấn Nhã",
    "12B": "Trần Tấn Nhã",
  },
  "Ngoại ngữ": {
    "12A1": "Bùi Quốc Duy",
    "12A2": "Nguyễn Thị Mỹ Duyên",
    "12A3": "Trần Quốc Việt",
    "12B": "Hoàng Thị Minh Vương",
  },
  "Thể dục": {
    "12A1": "Nguyễn Ngọc Tây",
    "12A2": "Lê Phước Sang",
    "12A3": "Nguyễn Ngọc Tây",
    "12B": "Lê Phước Sang",
  },
};

// Timetable data from TKB.xlsx
const timetableData = {
  "12A1": {
    Sáng: {
      "Thứ 2": ["Chào cờ", "Sinh hoạt lớp", "Ngữ văn", "Toán", "Toán"],
      "Thứ 3": ["Ngữ văn", "Ngữ văn", "Toán", "", ""],
      "Thứ 4": ["", "", "Sinh học", "Sinh học", "Hóa học"],
      "Thứ 5": ["Ngoại ngữ", "Ngoại ngữ", "Sinh học", "Lịch sử", "Lịch sử"],
      "Thứ 6": ["Toán", "Toán", "Vật lý", "Tin học", "Tin học"],
      "Thứ 7": ["Vật lý", "Vật lý", "Tin học", "Hóa học", "Hóa học"],
      "Chủ nhật": ["", "", "", "", ""],
    },
    Chiều: {
      "Thứ 2": ["", "GDQP", "GDQP", "", ""],
      "Thứ 3": ["", "", "", "", ""],
      "Thứ 4": ["", "", "", "", ""],
      "Thứ 5": ["", "", "", "Thể dục", "Thể dục"],
      "Thứ 6": ["", "", "", "Thể dục", ""],
      "Thứ 7": ["", "", "", "", ""],
      "Chủ nhật": ["", "", "", "", ""],
    },
  },
  "12A2": {
    Sáng: {
      "Thứ 2": ["Chào cờ", "Sinh hoạt lớp", "Vật lý", "Sinh học", "Hóa học"],
      "Thứ 3": ["Ngữ văn", "Ngữ văn", "Toán", "Toán", "Ngoại ngữ"],
      "Thứ 4": ["", "", "Lịch sử", "Toán", "Lịch sử"],
      "Thứ 5": ["", "", "Ngữ văn", "Sinh học", "Sinh học"],
      "Thứ 6": ["Hóa học", "Hóa học", "Tin học", "Toán", "Toán"],
      "Thứ 7": ["Tin học", "Tin học", "Vật lý", "Vật lý", "Ngoại ngữ"],
      "Chủ nhật": ["", "", "", "", ""],
    },
    Chiều: {
      "Thứ 2": ["", "", "", "", ""],
      "Thứ 3": ["", "", "", "", ""],
      "Thứ 4": ["", "", "", "", ""],
      "Thứ 5": ["", "", "", "Thể dục", "Thể dục"],
      "Thứ 6": ["", "", "", "Thể dục", ""],
      "Thứ 7": ["", "", "", "", ""],
      "Chủ nhật": ["", "", "", "", ""],
    },
  },
  "12A3": {
    Sáng: {
      "Thứ 2": ["Chào cờ", "Sinh hoạt lớp", "Ngữ văn", "", ""],
      "Thứ 3": ["Sinh học", "Sinh học", "Toán", "Vật lý", "Tin học"],
      "Thứ 4": ["", "", "Toán", "Toán", "Hóa học"],
      "Thứ 5": ["Ngữ văn", "Ngữ văn", "Tin học", "Tin học", "Lịch sử"],
      "Thứ 6": ["Vật lý", "Vật lý", "Sinh học", "Hóa học", "Hóa học"],
      "Thứ 7": ["Ngoại ngữ", "Ngoại ngữ", "Toán", "Toán", "Lịch sử"],
      "Chủ nhật": ["", "", "", "", ""],
    },
    Chiều: {
      "Thứ 2": ["", "", "", "", ""],
      "Thứ 3": ["", "", "", "", ""],
      "Thứ 4": ["", "Thể dục", "Thể dục", "Thể dục", ""],
      "Thứ 5": ["", "GDQP", "GDQP", "", ""],
      "Thứ 6": ["", "", "", "", ""],
      "Thứ 7": ["", "", "", "", ""],
      "Chủ nhật": ["", "", "", "", ""],
    },
  },
  "12B": {
    Sáng: {
      "Thứ 2": ["Chào cờ", "Sinh hoạt lớp", "Toán", "Ngoại ngữ", "Ngoại ngữ"],
      "Thứ 3": ["Tin học", "Tin học", "Ngữ văn", "", ""],
      "Thứ 4": ["", "", "Tin học", "Lịch sử", "Vật lý"],
      "Thứ 5": ["Vật lý", "Vật lý", "Sinh học", "Hóa học", "Hóa học"],
      "Thứ 6": ["Sinh học", "Sinh học", "Lịch sử", "Toán", "Toán"],
      "Thứ 7": ["Toán", "Toán", "Hóa học", "Ngữ văn", "Ngữ văn"],
      "Chủ nhật": ["", "", "", "", ""],
    },
    Chiều: {
      "Thứ 2": ["", "", "", "", ""],
      "Thứ 3": ["", "", "", "", ""],
      "Thứ 4": ["", "", "", "", ""],
      "Thứ 5": ["", "Thể dục", "Thể dục", "Thể dục", ""],
      "Thứ 6": ["", "GDQP", "GDQP", "", ""],
      "Thứ 7": ["", "", "", "", ""],
      "Chủ nhật": ["", "", "", "", ""],
    },
  },
};

// Prepare data for Excel
const data = [];
const days = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];

for (const className of ["12A1", "12A2", "12A3", "12B"]) {
  for (const session of ["Sáng", "Chiều"]) {
    for (const [dayIdx, day] of days.entries()) {
      const periods = timetableData[className][session][day];
      for (let periodIdx = 0; periodIdx < periods.length; periodIdx++) {
        const subject = periods[periodIdx];
        if (subject) {
          // Include all non-empty periods
          const teacher =
            subject === "Chào cờ" || subject === "Sinh hoạt lớp"
              ? homeroomTeachers[className] // Assign homeroom teacher
              : teacherAssignments[subject]
              ? teacherAssignments[subject][className] || ""
              : "";
          // Adjust period numbering: 1-5 for Sáng, 6-10 for Chiều
          const periodNumber =
            session === "Sáng" ? periodIdx + 1 : periodIdx + 6;
          // Tự động set giá trị cho cột Bài học
          let baiHoc = "";
          if (subject === "Chào cờ") {
            baiHoc = "Chào cờ đầu tuần";
          } else if (subject === "Sinh hoạt lớp") {
            baiHoc = "Sinh hoạt cuối tuần";
          } else {
            baiHoc = `Bài học môn ${subject}`;
          }
          data.push({
            Lớp: className,
            Buổi: session,
            Ngày: day,
            Tiết: periodNumber,
            "Môn học": subject,
            "Giáo viên": teacher,
            Tuần: 1,
            "Bài học": baiHoc,
          });
        }
      }
    }
  }
}

// Create a new workbook and worksheet
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet(data, {
  header: [
    "Lớp",
    "Buổi",
    "Ngày",
    "Tiết",
    "Môn học",
    "Giáo viên",
    "Tuần",
    "Bài học",
  ],
});

// Append worksheet to workbook
XLSX.utils.book_append_sheet(wb, ws, "Timetable Summary");

// Write to file
XLSX.writeFile(wb, "timetable_summary.xlsx");
