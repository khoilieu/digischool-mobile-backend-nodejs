const PersonalActivityService = require("../services/personal-activity.service");
const TimeSlot = require("../models/time-slot.model");

class PersonalActivityController {
  async create(req, res, next) {
    try {
      const { title, content, remindMinutes, date, period } = req.body;
      const user = req.user._id;
      if (!title || !content || !date || !period) {
        return res
          .status(400)
          .json({ success: false, message: "Missing required fields" });
      }
      let remindAt, time;
      if (remindMinutes && remindMinutes > 0) {
        // Lấy startTime từ TimeSlot
        const timeSlot = await TimeSlot.findOne({ period: Number(period) });
        if (timeSlot && timeSlot.startTime) {
          const [hour, minute] = timeSlot.startTime.split(":").map(Number);
          const scheduledDate = new Date(date);
          scheduledDate.setHours(hour, minute, 0, 0);
          remindAt = new Date(scheduledDate.getTime() - remindMinutes * 60000);
          time = remindMinutes;
          if (isNaN(remindAt.getTime())) remindAt = undefined;
        } else {
          remindAt = undefined;
          time = remindMinutes;
        }
      }
      const activity = await PersonalActivityService.createPersonalActivity({
        title,
        content,
        user,
        date: new Date(date),
        period,
        ...(remindAt && { remindAt }),
        ...(time && { time }),
      });
      return res.status(201).json({
        success: true,
        message: "Tạo hoạt động cá nhân thành công",
        data: activity,
      });
    } catch (error) {
      next(error);
    }
  }

  async get(req, res, next) {
    try {
      const user = req.user._id;
      const { date, period } = req.query;
      if (!date || !period) {
        return res
          .status(400)
          .json({ success: false, message: "Missing date or period" });
      }
      const activity = await PersonalActivityService.getByUserDatePeriod(
        user,
        new Date(date),
        Number(period)
      );
      return res.status(200).json({ success: true, data: activity });
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const user = req.user._id;
      const { activityId } = req.params;
      const updateData = req.body;
      let setData = { ...updateData };
      let unsetData = {};
      // Nếu PATCH có remindMinutes thì tính lại remindAt/time
      if (updateData.remindMinutes !== undefined) {
        // Luôn lấy period và date từ DB
        const currentActivity = await PersonalActivityService.getByIdAndUser(
          activityId,
          user
        );
        if (!currentActivity) {
          return res
            .status(404)
            .json({ success: false, message: "Personal activity not found" });
        }
        const period = currentActivity.period;
        const date = currentActivity.date;
        if (updateData.remindMinutes && updateData.remindMinutes > 0) {
          // Lấy startTime từ TimeSlot
          const timeSlot = await TimeSlot.findOne({ period: Number(period) });
          if (timeSlot && timeSlot.startTime && date) {
            const [hour, minute] = timeSlot.startTime.split(":").map(Number);
            const scheduledDate = new Date(date);
            scheduledDate.setHours(hour, minute, 0, 0);
            setData.remindAt = new Date(
              scheduledDate.getTime() - updateData.remindMinutes * 60000
            );
            setData.time = updateData.remindMinutes;
            if (isNaN(setData.remindAt.getTime())) setData.remindAt = undefined;
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
      let updatePayload = {};
      if (Object.keys(unsetData).length > 0) {
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
      const updated = await PersonalActivityService.updatePersonalActivity(
        activityId,
        user,
        updatePayload
      );
      if (!updated) {
        return res
          .status(404)
          .json({ success: false, message: "Personal activity not found" });
      }
      return res.status(200).json({
        success: true,
        message: "Cập nhật hoạt động cá nhân thành công",
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const user = req.user._id;
      const { activityId } = req.params;
      const deleted = await PersonalActivityService.deletePersonalActivity(
        activityId,
        user
      );
      if (!deleted) {
        return res
          .status(404)
          .json({ success: false, message: "Personal activity not found" });
      }
      return res
        .status(200)
        .json({ success: true, message: "Xóa hoạt động cá nhân thành công" });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PersonalActivityController();
