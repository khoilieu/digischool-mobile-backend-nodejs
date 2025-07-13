const studentEvaluationService = require("../services/student-evaluation.service");

class StudentEvaluationController {
  async createEvaluation(req, res, next) {
    try {
      const result = await studentEvaluationService.createEvaluation({
        user: req.user,
        params: req.params,
        body: req.body,
      });
      res.status(result.status).json(result.body);
    } catch (error) {
      next(error);
    }
  }

  async updateEvaluation(req, res, next) {
    try {
      const result = await studentEvaluationService.updateEvaluation({
        user: req.user,
        params: req.params,
        body: req.body,
      });
      res.status(result.status).json(result.body);
    } catch (error) {
      next(error);
    }
  }

  async getStudentEvaluations(req, res, next) {
    try {
      const result = await studentEvaluationService.getStudentEvaluations({
        user: req.user,
        query: req.query,
      });
      res.status(result.status).json(result.body);
    } catch (error) {
      next(error);
    }
  }

  async getEvaluationDetail(req, res, next) {
    try {
      const result = await studentEvaluationService.getEvaluationDetail({
        user: req.user,
        params: req.params,
      });
      res.status(result.status).json(result.body);
    } catch (error) {
      next(error);
    }
  }

  async checkCanEvaluate(req, res, next) {
    try {
      const result = await studentEvaluationService.checkCanEvaluate({
        user: req.user,
        params: req.params,
      });
      res.status(result.status).json(result.body);
    } catch (error) {
      next(error);
    }
  }

  async getEvaluableLessons(req, res, next) {
    try {
      const result = await studentEvaluationService.getEvaluableLessons({
        user: req.user,
        query: req.query,
      });
      res.status(result.status).json(result.body);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new StudentEvaluationController();
