const testInfoService = require("../services/test-info.service");

class TestInfoController {
  async createTestInfo(req, res, next) {
    try {
      const result = await testInfoService.createTestInfo({
        user: req.user,
        params: req.params,
        body: req.body,
      });
      res.status(result.status).json(result.body);
    } catch (error) {
      next(error);
    }
  }
  async getTeacherTestInfos(req, res, next) {
    try {
      const result = await testInfoService.getTeacherTestInfos({
        user: req.user,
        query: req.query,
      });
      res.status(result.status).json(result.body);
    } catch (error) {
      next(error);
    }
  }
  async updateTestInfo(req, res, next) {
    try {
      const result = await testInfoService.updateTestInfo({
        user: req.user,
        params: req.params,
        body: req.body,
      });
      res.status(result.status).json(result.body);
    } catch (error) {
      next(error);
    }
  }
  async deleteTestInfo(req, res, next) {
    try {
      const result = await testInfoService.deleteTestInfo({
        user: req.user,
        params: req.params,
      });
      res.status(result.status).json(result.body);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TestInfoController();
