const XLSX = require("xlsx");

// Homeroom teachers for each class
const homeroomTeachers = {
  // Khối 10
  "10A1": "Nguyễn Thị Mai Anh",
  "10A2": "Trần Văn Bình",
  "10A3": "Lê Thị Cẩm Tú",
  "10A4": "Phạm Hoàng Dũng",
  
  // Khối 11
  "11A1": "Võ Thị Thanh Hà",
  "11A2": "Nguyễn Văn Hùng",
  "11A3": "Trần Thị Kim Liên",
  "11A4": "Lê Văn Minh",
  
  // Khối 12
  "12A1": "Trần Thị Nga",
  "12A2": "Nguyễn Thị Kim Huệ",
  "12A3": "Võ Thu Hương",
  "12B": "Nguyễn Thị Tuyết Nga",
};

// Teacher assignments for each subject and class
const teacherAssignments = {
  GDQP: {
    // Khối 10
    "10A1": "Cao Văn Ngại",
    "10A2": "Cao Văn Ngại",
    "10A3": "Cao Văn Ngại",
    "10A4": "Cao Văn Ngại",
    // Khối 11
    "11A1": "Cao Văn Ngại",
    "11A2": "Cao Văn Ngại",
    "11A3": "Cao Văn Ngại",
    "11A4": "Cao Văn Ngại",
    // Khối 12
    "12A1": "Cao Văn Ngại",
    "12A2": "Cao Văn Ngại",
    "12A3": "Cao Văn Ngại",
    "12B": "Cao Văn Ngại",
  },
  Toán: {
    // Khối 10
    "10A1": "Phạm Thanh Tâm",
    "10A2": "Nguyễn Huy Hoàng",
    "10A3": "Trần Thị Linh Thảo",
    "10A4": "Lê Văn Sơn",
    // Khối 11
    "11A1": "Nguyễn Thị Thu Hà",
    "11A2": "Phạm Văn Đức",
    "11A3": "Trần Hoàng Nam",
    "11A4": "Lê Thị Thanh Thúy",
    // Khối 12
    "12A1": "Phạm Thanh Tâm",
    "12A2": "Phạm Huy Hoàng",
    "12A3": "Nguyễn Thị Linh Thảo",
    "12B": "Nguyễn Thị Tuyết Nga",
  },
  "Vật lý": {
    // Khối 10
    "10A1": "Bùi Quốc Việt",
    "10A2": "Nguyễn Thị Kim Huệ",
    "10A3": "Võ Thu Hương",
    "10A4": "Lê Thị Huyền Trang",
    // Khối 11
    "11A1": "Trần Văn An",
    "11A2": "Nguyễn Thị Bích Ngọc",
    "11A3": "Lê Hoàng Cường",
    "11A4": "Phạm Thị Diễm",
    // Khối 12
    "12A1": "Bùi Quốc Việt",
    "12A2": "Nguyễn Thị Kim Huệ",
    "12A3": "Võ Thu Hương",
    "12B": "Lê Thị Huyền Trang",
  },
  "Tin học": {
    // Khối 10
    "10A1": "Trần Đức Chiến",
    "10A2": "Nguyễn Thị Vui",
    "10A3": "Lê Hữu Điền",
    "10A4": "Phạm Thị Hương",
    // Khối 11
    "11A1": "Trần Văn Dũng",
    "11A2": "Nguyễn Thị Lan",
    "11A3": "Lê Hoàng Minh",
    "11A4": "Phạm Văn Phúc",
    // Khối 12
    "12A1": "Trần Đức Chiến",
    "12A2": "Trần Đức Chiến",
    "12A3": "Trần Hữu Điền",
    "12B": "Nguyễn Thị Vui",
  },
  "Hóa học": {
    // Khối 10
    "10A1": "Đặng Nguyễn Huỳnh Lệ",
    "10A2": "Nguyễn Thị Thanh Tuyền",
    "10A3": "Bùi Phước Trường An",
    "10A4": "Lê Thị Mỹ Duyên",
    // Khối 11
    "11A1": "Trần Thị Hồng Nhung",
    "11A2": "Nguyễn Văn Phát",
    "11A3": "Lê Thị Quỳnh",
    "11A4": "Phạm Hoàng Sinh",
    // Khối 12
    "12A1": "Đặng Nguyễn Huỳnh Lệ",
    "12A2": "Nguyễn Thị Thanh Tuyền",
    "12A3": "Bùi Phước Trường An",
    "12B": "Đặng Nguyễn Huỳnh Lệ",
  },
  "Sinh học": {
    // Khối 10
    "10A1": "Lê Thị Mỹ Xuyên",
    "10A2": "Ngô Thị Ngàn",
    "10A3": "Trần Thị Phương",
    "10A4": "Nguyễn Văn Quang",
    // Khối 11
    "11A1": "Võ Thị Thanh",
    "11A2": "Lê Văn Thành",
    "11A3": "Trần Thị Uyên",
    "11A4": "Phạm Thị Vân",
    // Khối 12
    "12A1": "Lê Thị Mỹ Xuyên",
    "12A2": "Lê Thị Mỹ Xuyên",
    "12A3": "Ngô Thị Ngàn",
    "12B": "Ngô Thị Ngàn",
  },
  "Ngữ văn": {
    // Khối 10
    "10A1": "Trần Thị Mai Anh",
    "10A2": "Nguyễn Thị Thu Hương",
    "10A3": "Lê Ngọc Hà",
    "10A4": "Phạm Kim Huệ",
    // Khối 11
    "11A1": "Võ Thị Thanh Hà",
    "11A2": "Nguyễn Thị Bích",
    "11A3": "Trần Thị Kim Liên",
    "11A4": "Lê Thị Ngọc",
    // Khối 12
    "12A1": "Trần Thị Nga",
    "12A2": "Nguyễn Thị Thu Hương",
    "12A3": "Ngô Ngọc Hà",
    "12B": "Nguyễn Kim Huệ",
  },
  "Lịch sử": {
    // Khối 10
    "10A1": "Phạm Hoài Đạt",
    "10A2": "Trần Tấn Nhã",
    "10A3": "Lê Văn Phúc",
    "10A4": "Nguyễn Thị Quỳnh",
    // Khối 11
    "11A1": "Võ Văn Sơn",
    "11A2": "Lê Thị Tâm",
    "11A3": "Trần Hoàng Uyên",
    "11A4": "Phạm Văn Vinh",
    // Khối 12
    "12A1": "Phạm Hoài Đạt",
    "12A2": "Trần Tấn Nhã",
    "12A3": "Trần Tấn Nhã",
    "12B": "Trần Tấn Nhã",
  },
  "Ngoại ngữ": {
    // Khối 10
    "10A1": "Bùi Quốc Duy",
    "10A2": "Nguyễn Thị Mỹ Duyên",
    "10A3": "Trần Quốc Việt",
    "10A4": "Hoàng Thị Minh Vương",
    // Khối 11
    "11A1": "Võ Thị Xuân",
    "11A2": "Lê Văn Yên",
    "11A3": "Trần Thị Zương",
    "11A4": "Phạm Hoàng An",
    // Khối 12
    "12A1": "Bùi Quốc Duy",
    "12A2": "Nguyễn Thị Mỹ Duyên",
    "12A3": "Trần Quốc Việt",
    "12B": "Hoàng Thị Minh Vương",
  },
  "Thể dục": {
    // Khối 10
    "10A1": "Nguyễn Ngọc Tây",
    "10A2": "Lê Phước Sang",
    "10A3": "Trần Văn Bình",
    "10A4": "Phạm Hoàng Dũng",
    // Khối 11
    "11A1": "Võ Thị Thanh Hà",
    "11A2": "Nguyễn Văn Hùng",
    "11A3": "Lê Văn Minh",
    "11A4": "Trần Thị Kim Liên",
    // Khối 12
    "12A1": "Nguyễn Ngọc Tây",
    "12A2": "Lê Phước Sang",
    "12A3": "Nguyễn Ngọc Tây",
    "12B": "Lê Phước Sang",
  },
};

// Improved timetable data for 12 classes
const timetableData = {
  // Khối 10
  "10A1": {
    Sáng: {
      "Thứ 2": ["Chào cờ", "Sinh hoạt lớp", "Toán", "Vật lý", "Vật lý"],
      "Thứ 3": ["Ngữ văn", "Ngữ văn", "Hóa học", "Sinh học", "Sinh học"],
      "Thứ 4": ["Toán", "Toán", "Tin học", "Tin học", "Lịch sử"],
      "Thứ 5": ["Ngoại ngữ", "Ngoại ngữ", "Toán", "Ngữ văn", "Ngữ văn"],
      "Thứ 6": ["Vật lý", "Hóa học", "Hóa học", "Sinh học", "Lịch sử"],
      "Thứ 7": ["Tin học", "Ngoại ngữ", "Toán", "Ngữ văn", "Vật lý"],
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
  "10A2": {
    Sáng: {
      "Thứ 2": ["Chào cờ", "Sinh hoạt lớp", "Ngữ văn", "Toán", "Toán"],
      "Thứ 3": ["Vật lý", "Vật lý", "Hóa học", "Sinh học", "Sinh học"],
      "Thứ 4": ["Toán", "Toán", "Tin học", "Tin học", "Lịch sử"],
      "Thứ 5": ["Ngoại ngữ", "Ngoại ngữ", "Ngữ văn", "Ngữ văn", "Toán"],
      "Thứ 6": ["Vật lý", "Hóa học", "Hóa học", "Sinh học", "Lịch sử"],
      "Thứ 7": ["Tin học", "Ngoại ngữ", "Toán", "Vật lý", "Ngữ văn"],
      "Chủ nhật": ["", "", "", "", ""],
    },
    Chiều: {
      "Thứ 2": ["", "", "", "", ""],
      "Thứ 3": ["", "", "", "", ""],
      "Thứ 4": ["", "", "", "", ""],
      "Thứ 5": ["", "", "", "Thể dục", "Thể dục"],
      "Thứ 6": ["", "", "", "Thể dục", ""],
      "Thứ 7": ["", "GDQP", "GDQP", "", ""],
      "Chủ nhật": ["", "", "", "", ""],
    },
  },
  "10A3": {
    Sáng: {
      "Thứ 2": ["Chào cờ", "Sinh hoạt lớp", "Hóa học", "Hóa học", "Sinh học"],
      "Thứ 3": ["Toán", "Toán", "Ngữ văn", "Ngữ văn", "Vật lý"],
      "Thứ 4": ["Vật lý", "Vật lý", "Tin học", "Tin học", "Toán"],
      "Thứ 5": ["Sinh học", "Sinh học", "Lịch sử", "Lịch sử", "Ngoại ngữ"],
      "Thứ 6": ["Toán", "Toán", "Ngữ văn", "Ngữ văn", "Hóa học"],
      "Thứ 7": ["Tin học", "Ngoại ngữ", "Toán", "Vật lý", "Sinh học"],
      "Chủ nhật": ["", "", "", "", ""],
    },
    Chiều: {
      "Thứ 2": ["", "", "", "", ""],
      "Thứ 3": ["", "", "", "", ""],
      "Thứ 4": ["", "", "", "", ""],
      "Thứ 5": ["", "", "", "Thể dục", "Thể dục"],
      "Thứ 6": ["", "", "", "Thể dục", ""],
      "Thứ 7": ["", "GDQP", "GDQP", "", ""],
      "Chủ nhật": ["", "", "", "", ""],
    },
  },
  "10A4": {
    Sáng: {
      "Thứ 2": ["Chào cờ", "Sinh hoạt lớp", "Sinh học", "Sinh học", "Hóa học"],
      "Thứ 3": ["Toán", "Toán", "Ngữ văn", "Ngữ văn", "Vật lý"],
      "Thứ 4": ["Vật lý", "Vật lý", "Tin học", "Tin học", "Toán"],
      "Thứ 5": ["Hóa học", "Hóa học", "Lịch sử", "Lịch sử", "Ngoại ngữ"],
      "Thứ 6": ["Toán", "Toán", "Ngữ văn", "Ngữ văn", "Sinh học"],
      "Thứ 7": ["Tin học", "Ngoại ngữ", "Toán", "Vật lý", "Hóa học"],
      "Chủ nhật": ["", "", "", "", ""],
    },
    Chiều: {
      "Thứ 2": ["", "", "", "", ""],
      "Thứ 3": ["", "", "", "", ""],
      "Thứ 4": ["", "", "", "", ""],
      "Thứ 5": ["", "", "", "Thể dục", "Thể dục"],
      "Thứ 6": ["", "", "", "Thể dục", ""],
      "Thứ 7": ["", "GDQP", "GDQP", "", ""],
      "Chủ nhật": ["", "", "", "", ""],
    },
  },

  // Khối 11
  "11A1": {
    Sáng: {
      "Thứ 2": ["Chào cờ", "Sinh hoạt lớp", "Toán", "Toán", "Vật lý"],
      "Thứ 3": ["Ngữ văn", "Ngữ văn", "Hóa học", "Sinh học", "Sinh học"],
      "Thứ 4": ["Vật lý", "Vật lý", "Tin học", "Tin học", "Lịch sử"],
      "Thứ 5": ["Toán", "Toán", "Ngoại ngữ", "Ngoại ngữ", "Ngữ văn"],
      "Thứ 6": ["Hóa học", "Hóa học", "Toán", "Vật lý", "Sinh học"],
      "Thứ 7": ["Tin học", "Lịch sử", "Lịch sử", "Ngữ văn", "Ngoại ngữ"],
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
  "11A2": {
    Sáng: {
      "Thứ 2": ["Chào cờ", "Sinh hoạt lớp", "Vật lý", "Vật lý", "Toán"],
      "Thứ 3": ["Toán", "Toán", "Ngữ văn", "Ngữ văn", "Hóa học"],
      "Thứ 4": ["Hóa học", "Hóa học", "Sinh học", "Sinh học", "Lịch sử"],
      "Thứ 5": ["Ngữ văn", "Ngữ văn", "Tin học", "Tin học", "Toán"],
      "Thứ 6": ["Toán", "Vật lý", "Vật lý", "Sinh học", "Ngoại ngữ"],
      "Thứ 7": ["Tin học", "Ngoại ngữ", "Ngoại ngữ", "Lịch sử", "Ngữ văn"],
      "Chủ nhật": ["", "", "", "", ""],
    },
    Chiều: {
      "Thứ 2": ["", "", "", "", ""],
      "Thứ 3": ["", "", "", "", ""],
      "Thứ 4": ["", "", "", "", ""],
      "Thứ 5": ["", "", "", "Thể dục", "Thể dục"],
      "Thứ 6": ["", "", "", "Thể dục", ""],
      "Thứ 7": ["", "GDQP", "GDQP", "", ""],
      "Chủ nhật": ["", "", "", "", ""],
    },
  },
  "11A3": {
    Sáng: {
      "Thứ 2": ["Chào cờ", "Sinh hoạt lớp", "Hóa học", "Hóa học", "Sinh học"],
      "Thứ 3": ["Toán", "Toán", "Vật lý", "Vật lý", "Ngữ văn"],
      "Thứ 4": ["Ngữ văn", "Ngữ văn", "Tin học", "Tin học", "Toán"],
      "Thứ 5": ["Vật lý", "Sinh học", "Sinh học", "Lịch sử", "Lịch sử"],
      "Thứ 6": ["Toán", "Toán", "Hóa học", "Ngữ văn", "Ngoại ngữ"],
      "Thứ 7": ["Tin học", "Ngoại ngữ", "Toán", "Vật lý", "Ngữ văn"],
      "Chủ nhật": ["", "", "", "", ""],
    },
    Chiều: {
      "Thứ 2": ["", "", "", "", ""],
      "Thứ 3": ["", "", "", "", ""],
      "Thứ 4": ["", "", "", "", ""],
      "Thứ 5": ["", "", "", "Thể dục", "Thể dục"],
      "Thứ 6": ["", "", "", "Thể dục", ""],
      "Thứ 7": ["", "GDQP", "GDQP", "", ""],
      "Chủ nhật": ["", "", "", "", ""],
    },
  },
  "11A4": {
    Sáng: {
      "Thứ 2": ["Chào cờ", "Sinh hoạt lớp", "Sinh học", "Sinh học", "Toán"],
      "Thứ 3": ["Toán", "Toán", "Vật lý", "Vật lý", "Hóa học"],
      "Thứ 4": ["Hóa học", "Hóa học", "Ngữ văn", "Ngữ văn", "Tin học"],
      "Thứ 5": ["Tin học", "Tin học", "Lịch sử", "Lịch sử", "Toán"],
      "Thứ 6": ["Vật lý", "Ngữ văn", "Ngữ văn", "Sinh học", "Ngoại ngữ"],
      "Thứ 7": ["Toán", "Ngoại ngữ", "Vật lý", "Hóa học", "Lịch sử"],
      "Chủ nhật": ["", "", "", "", ""],
    },
    Chiều: {
      "Thứ 2": ["", "", "", "", ""],
      "Thứ 3": ["", "", "", "", ""],
      "Thứ 4": ["", "", "", "", ""],
      "Thứ 5": ["", "", "", "Thể dục", "Thể dục"],
      "Thứ 6": ["", "", "", "Thể dục", ""],
      "Thứ 7": ["", "GDQP", "GDQP", "", ""],
      "Chủ nhật": ["", "", "", "", ""],
    },
  },

  // Khối 12
  "12A1": {
    Sáng: {
      "Thứ 2": ["Chào cờ", "Sinh hoạt lớp", "Ngữ văn", "Toán", "Toán"],
      "Thứ 3": ["Ngữ văn", "Ngữ văn", "Toán", "Vật lý", "Vật lý"],
      "Thứ 4": ["Vật lý", "Hóa học", "Hóa học", "Sinh học", "Sinh học"],
      "Thứ 5": ["Ngoại ngữ", "Ngoại ngữ", "Sinh học", "Lịch sử", "Lịch sử"],
      "Thứ 6": ["Toán", "Toán", "Vật lý", "Tin học", "Tin học"],
      "Thứ 7": ["Tin học", "Hóa học", "Hóa học", "Ngữ văn", "Ngoại ngữ"],
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
      "Thứ 4": ["Toán", "Lịch sử", "Lịch sử", "Vật lý", "Vật lý"],
      "Thứ 5": ["Ngữ văn", "Sinh học", "Sinh học", "Toán", "Toán"],
      "Thứ 6": ["Hóa học", "Hóa học", "Tin học", "Tin học", "Lịch sử"],
      "Thứ 7": ["Tin học", "Vật lý", "Ngoại ngữ", "Ngữ văn", "Sinh học"],
      "Chủ nhật": ["", "", "", "", ""],
    },
    Chiều: {
      "Thứ 2": ["", "", "", "", ""],
      "Thứ 3": ["", "", "", "", ""],
      "Thứ 4": ["", "", "", "", ""],
      "Thứ 5": ["", "", "", "Thể dục", "Thể dục"],
      "Thứ 6": ["", "", "", "Thể dục", ""],
      "Thứ 7": ["", "GDQP", "GDQP", "", ""],
      "Chủ nhật": ["", "", "", "", ""],
    },
  },
  "12A3": {
    Sáng: {
      "Thứ 2": ["Chào cờ", "Sinh hoạt lớp", "Ngữ văn", "Toán", "Toán"],
      "Thứ 3": ["Sinh học", "Sinh học", "Toán", "Vật lý", "Tin học"],
      "Thứ 4": ["Vật lý", "Vật lý", "Toán", "Hóa học", "Hóa học"],
      "Thứ 5": ["Ngữ văn", "Ngữ văn", "Tin học", "Tin học", "Lịch sử"],
      "Thứ 6": ["Vật lý", "Sinh học", "Hóa học", "Hóa học", "Toán"],
      "Thứ 7": ["Ngoại ngữ", "Ngoại ngữ", "Toán", "Lịch sử", "Ngữ văn"],
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
      "Thứ 3": ["Tin học", "Tin học", "Ngữ văn", "Toán", "Toán"],
      "Thứ 4": ["Vật lý", "Lịch sử", "Tin học", "Sinh học", "Hóa học"],
      "Thứ 5": ["Vật lý", "Vật lý", "Sinh học", "Hóa học", "Hóa học"],
      "Thứ 6": ["Sinh học", "Sinh học", "Lịch sử", "Toán", "Toán"],
      "Thứ 7": ["Toán", "Hóa học", "Ngữ văn", "Ngữ văn", "Vật lý"],
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

// Hàm tạo email từ tên giáo viên (để sử dụng khi không có email sẵn)
const generateEmailFromName = (name) => {
  if (!name) return "";
  const normalizedName = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '.');
  return `${normalizedName}@yopmail.com`;
};

// Hàm kiểm tra và tạo email duy nhất
const generateUniqueEmail = (name, existingEmails = new Set()) => {
  if (!name) return "";
  
  let baseEmail = generateEmailFromName(name);
  let uniqueEmail = baseEmail;
  let counter = 1;
  
  while (existingEmails.has(uniqueEmail)) {
    const [localPart] = baseEmail.split('@');
    uniqueEmail = `${localPart}${counter}@yopmail.com`;
    counter++;
  }
  
  existingEmails.add(uniqueEmail);
  return uniqueEmail;
};

// Danh sách email thực tế của giáo viên (nếu có)
const teacherEmails = {
  // Khối 10
  "Nguyễn Thị Mai Anh": "mai.anh.nguyen@yopmail.com",
  "Trần Văn Bình": "binh.tran@yopmail.com",
  "Lê Thị Cẩm Tú": "cam.tu.le@yopmail.com",
  "Phạm Hoàng Dũng": "dung.pham@yopmail.com",
  
  // Khối 11
  "Võ Thị Thanh Hà": "thanh.ha.vo@yopmail.com",
  "Nguyễn Văn Hùng": "hung.nguyen@yopmail.com",
  "Trần Thị Kim Liên": "kim.lien.tran@yopmail.com",
  "Lê Văn Minh": "minh.le@yopmail.com",
  
  // Khối 12
  "Trần Thị Nga": "nga.tran@yopmail.com",
  "Nguyễn Thị Kim Huệ": "kim.hue.nguyen@yopmail.com",
  "Võ Thu Hương": "thu.huong.vo@yopmail.com",
  "Nguyễn Thị Tuyết Nga": "tuyet.nga.nguyen@yopmail.com",
  
  // Các giáo viên bộ môn
  "Cao Văn Ngại": "ngai.cao@yopmail.com",
  "Phạm Thanh Tâm": "thanh.tam.pham@yopmail.com",
  "Nguyễn Huy Hoàng": "huy.hoang.nguyen@yopmail.com",
  "Trần Thị Linh Thảo": "linh.thao.tran@yopmail.com",
  "Lê Văn Sơn": "son.le@yopmail.com",
  "Nguyễn Thị Thu Hà": "thu.ha.nguyen@yopmail.com",
  "Phạm Văn Đức": "duc.pham@yopmail.com",
  "Trần Hoàng Nam": "hoang.nam.tran@yopmail.com",
  "Lê Thị Thanh Thúy": "thanh.thuy.le@yopmail.com",
  "Phạm Huy Hoàng": "huy.hoang.pham@yopmail.com",
  "Bùi Quốc Việt": "quoc.viet.bui@yopmail.com",
  "Võ Thu Hương": "thu.huong.vo@yopmail.com",
  "Lê Thị Huyền Trang": "huyen.trang.le@yopmail.com",
  "Trần Văn An": "an.tran@yopmail.com",
  "Nguyễn Thị Bích Ngọc": "bich.ngoc.nguyen@yopmail.com",
  "Lê Hoàng Cường": "hoang.cuong.le@yopmail.com",
  "Phạm Thị Diễm": "diem.pham@yopmail.com",
  "Trần Đức Chiến": "duc.chien.tran@yopmail.com",
  "Nguyễn Thị Vui": "vui.nguyen@yopmail.com",
  "Lê Hữu Điền": "huu.dien.le@yopmail.com",
  "Phạm Thị Hương": "huong.pham@yopmail.com",
  "Trần Văn Dũng": "dung.tran@yopmail.com",
  "Nguyễn Thị Lan": "lan.nguyen@yopmail.com",
  "Lê Hoàng Minh": "hoang.minh.le@yopmail.com",
  "Phạm Văn Phúc": "phuc.pham@yopmail.com",
  "Đặng Nguyễn Huỳnh Lệ": "huynh.le.dang@yopmail.com",
  "Nguyễn Thị Thanh Tuyền": "thanh.tuyen.nguyen@yopmail.com",
  "Bùi Phước Trường An": "phuoc.truong.an.bui@yopmail.com",
  "Lê Thị Mỹ Duyên": "my.duyen.le@yopmail.com",
  "Trần Thị Hồng Nhung": "hong.nhung.tran@yopmail.com",
  "Nguyễn Văn Phát": "phat.nguyen@yopmail.com",
  "Lê Thị Quỳnh": "quynh.le@yopmail.com",
  "Phạm Hoàng Sinh": "hoang.sinh.pham@yopmail.com",
  "Lê Thị Mỹ Xuyên": "my.xuyen.le@yopmail.com",
  "Ngô Thị Ngàn": "ngan.ngo@yopmail.com",
  "Trần Thị Phương": "phuong.tran@yopmail.com",
  "Nguyễn Văn Quang": "quang.nguyen@yopmail.com",
  "Võ Thị Thanh": "thanh.vo@yopmail.com",
  "Lê Văn Thành": "thanh.le@yopmail.com",
  "Trần Thị Uyên": "uyen.tran@yopmail.com",
  "Phạm Thị Vân": "van.pham@yopmail.com",
  "Trần Thị Mai Anh": "mai.anh.tran@yopmail.com",
  "Nguyễn Thị Thu Hương": "thu.huong.nguyen@yopmail.com",
  "Lê Ngọc Hà": "ngoc.ha.le@yopmail.com",
  "Phạm Kim Huệ": "kim.hue.pham@yopmail.com",
  "Nguyễn Thị Bích": "bich.nguyen@yopmail.com",
  "Lê Thị Ngọc": "ngoc.le@yopmail.com",
  "Ngô Ngọc Hà": "ngoc.ha.ngo@yopmail.com",
  "Nguyễn Kim Huệ": "kim.hue.nguyen2@yopmail.com",
  "Phạm Hoài Đạt": "hoai.dat.pham@yopmail.com",
  "Trần Tấn Nhã": "tan.nha.tran@yopmail.com",
  "Lê Văn Phúc": "phuc.le@yopmail.com",
  "Nguyễn Thị Quỳnh": "quynh.nguyen@yopmail.com",
  "Võ Văn Sơn": "son.vo@yopmail.com",
  "Lê Thị Tâm": "tam.le@yopmail.com",
  "Trần Hoàng Uyên": "hoang.uyen.tran@yopmail.com",
  "Phạm Văn Vinh": "vinh.pham@yopmail.com",
  "Bùi Quốc Duy": "quoc.duy.bui@yopmail.com",
  "Nguyễn Thị Mỹ Duyên": "my.duyen.nguyen@yopmail.com",
  "Trần Quốc Việt": "quoc.viet.tran@yopmail.com",
  "Hoàng Thị Minh Vương": "minh.vuong.hoang@yopmail.com",
  "Võ Thị Xuân": "xuan.vo@yopmail.com",
  "Lê Văn Yên": "yen.le@yopmail.com",
  "Trần Thị Zương": "zuong.tran@yopmail.com",
  "Phạm Hoàng An": "hoang.an.pham@yopmail.com",
  "Nguyễn Ngọc Tây": "ngoc.tay.nguyen@yopmail.com",
  "Lê Phước Sang": "phuoc.sang.le@yopmail.com",
  "Trần Văn Bình": "binh.tran@yopmail.com",
  "Phạm Hoàng Dũng": "dung.pham@yopmail.com",
  "Võ Thị Thanh Hà": "thanh.ha.vo@yopmail.com",
  "Nguyễn Văn Hùng": "hung.nguyen@yopmail.com",
  "Lê Văn Minh": "minh.le@yopmail.com",
  "Trần Thị Kim Liên": "kim.lien.tran@yopmail.com"
};

// Prepare data for Excel
const data = [];
const days = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];
const allClasses = [
  "10A1", "10A2", "10A3", "10A4",
  "11A1", "11A2", "11A3", "11A4", 
  "12A1", "12A2", "12A3", "12B"
];

for (const className of allClasses) {
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
          
          // Lấy email của giáo viên (nếu có) hoặc để trống để tự động tạo
          let teacherEmail = "";
          if (teacher) {
            if (teacherEmails[teacher]) {
              teacherEmail = teacherEmails[teacher];
            } else {
              // Tự động tạo email duy nhất nếu không có trong danh sách
              teacherEmail = generateUniqueEmail(teacher, new Set(Object.values(teacherEmails)));
            }
          }
          
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
            "Email giáo viên": teacherEmail,
            Tuần: 3,
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
    "Email giáo viên",
    "Tuần",
    "Bài học",
  ],
});

// Append worksheet to workbook
XLSX.utils.book_append_sheet(wb, ws, "Timetable Summary");

// Write to file
XLSX.writeFile(wb, "timetable_12_classes_week_3.xlsx");

// Validate email uniqueness
const emailSet = new Set();
const duplicateEmails = [];

for (const [teacherName, email] of Object.entries(teacherEmails)) {
  if (emailSet.has(email)) {
    duplicateEmails.push({ teacher: teacherName, email: email });
  } else {
    emailSet.add(email);
  }
}

if (duplicateEmails.length > 0) {
  console.log("⚠️  Cảnh báo: Phát hiện email trùng lặp:");
  duplicateEmails.forEach(dup => {
    console.log(`   - ${dup.teacher}: ${dup.email}`);
  });
} else {
  console.log("✅ Tất cả email đều duy nhất!");
}

console.log("✅ Đã tạo thành công TKB cho 12 lớp!");
console.log("📊 Tổng số tiết học: " + data.length);
console.log("📁 File output: timetable_12_classes_week_3.xlsx");
