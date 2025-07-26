const parentService = require('../services/parent.service');

class ParentController {
  // Lấy danh sách con của phụ huynh
  getChildren = async (req, res) => {
    try {
      const parentId = req.user._id;
      const result = await parentService.getChildren(parentId);

      res.status(200).json({
        success: true,
        message: 'Lấy danh sách con thành công',
        data: result.data
      });
    } catch (error) {
      console.error('❌ Error in getChildren:', error.message);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  };

  // Xem thời khóa biểu của con
  getChildSchedule = async (req, res) => {
    try {
      const parentId = req.user._id;
      const { childId } = req.params;
      const { academicYear, startOfWeek, endOfWeek } = req.query;
      const token = req.headers.authorization?.split(' ')[1];

      if (!academicYear || !startOfWeek || !endOfWeek) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu thông tin năm học, ngày bắt đầu tuần hoặc ngày kết thúc tuần'
        });
      }

      const result = await parentService.getChildSchedule(
        parentId,
        childId,
        academicYear,
        startOfWeek,
        endOfWeek,
        token
      );

      res.status(200).json({
        success: true,
        message: 'Lấy thời khóa biểu thành công',
        data: result.data
      });
    } catch (error) {
      console.error('❌ Error in getChildSchedule:', error.message);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  };

  // Gửi feedback
  sendFeedback = async (req, res) => {
    try {
      const parentId = req.user._id;
      const { rating, description } = req.body;

      const result = await parentService.sendFeedback(parentId, {
        rating,
        description
      });

      res.status(201).json({
        success: true,
        message: result.message,
        data: result.data
      });
    } catch (error) {
      console.error('❌ Error in sendFeedback:', error.message);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  };

  // Lấy danh sách feedback của phụ huynh
  getMyFeedbacks = async (req, res) => {
    try {
      const parentId = req.user._id;
      const { page = 1, limit = 10 } = req.query;

      const result = await parentService.getMyFeedbacks(
        parentId,
        parseInt(page),
        parseInt(limit)
      );

      res.status(200).json({
        success: true,
        message: 'Lấy danh sách góp ý thành công',
        data: result.data
      });
    } catch (error) {
      console.error('❌ Error in getMyFeedbacks:', error.message);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  };
}

module.exports = new ParentController(); 