const PersonalActivity = require("../models/personal-activity.model");

class PersonalActivityService {
  async createPersonalActivity({
    title,
    content,
    user,
    date,
    period,
    remindAt,
    time,
  }) {
    try {
      const activityData = { title, content, user, date, period };
      if (remindAt !== undefined) activityData.remindAt = remindAt;
      if (time !== undefined) activityData.time = time;
      const activity = await PersonalActivity.create(activityData);
      return activity;
    } catch (error) {
      throw error;
    }
  }

  async getByUserDatePeriod(user, date, period) {
    try {
      return await PersonalActivity.findOne({ user, date, period });
    } catch (error) {
      throw error;
    }
  }

  async getByIdAndUser(id, user) {
    try {
      return await PersonalActivity.findOne({ _id: id, user });
    } catch (error) {
      throw error;
    }
  }

  async updatePersonalActivity(id, user, updateData) {
    try {
      return await PersonalActivity.findOneAndUpdate(
        { _id: id, user },
        updateData,
        { new: true, strict: false }
      );
    } catch (error) {
      throw error;
    }
  }

  async deletePersonalActivity(id, user) {
    try {
      return await PersonalActivity.findOneAndDelete({ _id: id, user });
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new PersonalActivityService();
