const teacherEvaluationService = require("../services/teacher-evaluation.service");

class TeacherEvaluationController {
  async createEvaluation(req, res, next) {
    try {
      const result = await teacherEvaluationService.createEvaluation({
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
      const result = await teacherEvaluationService.updateEvaluation({
        user: req.user,
        params: req.params,
        body: req.body,
      });
      res.status(result.status).json(result.body);
    } catch (error) {
      next(error);
    }
  }

  async getTeacherEvaluations(req, res, next) {
    try {
      const result = await teacherEvaluationService.getTeacherEvaluations({
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
      const result = await teacherEvaluationService.getEvaluationDetail({
        user: req.user,
        params: req.params,
      });
      res.status(result.status).json(result.body);
    } catch (error) {
      next(error);
    }
  }

  async completeEvaluation(req, res, next) {
    try {
      const result = await teacherEvaluationService.completeEvaluation({
        user: req.user,
        params: req.params,
      });
      res.status(result.status).json(result.body);
    } catch (error) {
      next(error);
    }
  }

  async submitEvaluation(req, res, next) {
    try {
      const result = await teacherEvaluationService.submitEvaluation({
        user: req.user,
        params: req.params,
      });
      res.status(result.status).json(result.body);
    } catch (error) {
      next(error);
    }
  }

  async addAbsentStudent(req, res, next) {
    try {
      const result = await teacherEvaluationService.addAbsentStudent({
        user: req.user,
        params: req.params,
        body: req.body,
      });
      res.status(result.status).json(result.body);
    } catch (error) {
      next(error);
    }
  }

  async addOralTest(req, res, next) {
    try {
      const result = await teacherEvaluationService.addOralTest({
        user: req.user,
        params: req.params,
        body: req.body,
      });
      res.status(result.status).json(result.body);
    } catch (error) {
      next(error);
    }
  }

  async addViolation(req, res, next) {
    try {
      const result = await teacherEvaluationService.addViolation({
        user: req.user,
        params: req.params,
        body: req.body,
      });
      res.status(result.status).json(result.body);
    } catch (error) {
      next(error);
    }
  }

  async getEvaluationStats(req, res, next) {
    try {
      const result = await teacherEvaluationService.getEvaluationStats({
        user: req.user,
        query: req.query,
      });
      res.status(result.status).json(result.body);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TeacherEvaluationController();
