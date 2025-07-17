const subjectService = require('../services/subject.service');

class SubjectController {

  // Import subjects from Excel file
  async importFromExcel(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No Excel file provided'
        });
      }

      // Check file type
      const allowedMimeTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
      ];
      
      if (!allowedMimeTypes.includes(req.file.mimetype)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid file type. Please upload an Excel file (.xlsx or .xls)'
        });
      }

      // Process the Excel file
      const results = await subjectService.importFromExcel(req.file.buffer);
      
      const responseStatus = results.failed > 0 ? 207 : 200; // 207 for partial success
      
      res.status(responseStatus).json({
        success: true,
        message: `Import completed. ${results.success} subjects processed successfully, ${results.failed} failed.`,
        data: {
          summary: {
            total: results.total,
            success: results.success,
            failed: results.failed
          },
          successfulSubjects: results.successfulSubjects,
          errors: results.errors.length > 0 ? results.errors : undefined
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Download Excel template for import
  async downloadTemplate(req, res, next) {
    try {
      const excelBuffer = subjectService.generateExcelTemplate();
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=subjects_import_template.xlsx');
      res.setHeader('Content-Length', excelBuffer.length);
      
      res.send(excelBuffer);
    } catch (error) {
      next(error);
    }
  }

  // Get all subjects with pagination and filters
  async getAllSubjects(req, res, next) {
    try {
      const { page = 1, limit = 20, ...filters } = req.query;
      const result = await subjectService.getAllSubjects(page, limit, filters);
      
      res.status(200).json({
        success: true,
        message: 'Subjects retrieved successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // Get subject by ID
  async getSubjectById(req, res, next) {
    try {
      const { id } = req.params;
      const subject = await subjectService.getSubjectById(id);
      
      res.status(200).json({
        success: true,
        message: 'Subject retrieved successfully',
        data: subject
      });
    } catch (error) {
      next(error);
    }
  }

  // Create new subject
  async createSubject(req, res, next) {
    try {
      const subject = await subjectService.createSubject(req.body);
      
      res.status(201).json({
        success: true,
        message: 'Subject created successfully',
        data: subject
      });
    } catch (error) {
      next(error);
    }
  }

  // Update subject
  async updateSubject(req, res, next) {
    try {
      const { id } = req.params;
      const subject = await subjectService.updateSubject(id, req.body);
      
      res.status(200).json({
        success: true,
        message: 'Subject updated successfully',
        data: subject
      });
    } catch (error) {
      next(error);
    }
  }

  // Delete subject (soft delete)
  async deleteSubject(req, res, next) {
    try {
      const { id } = req.params;
      const subject = await subjectService.deleteSubject(id);
      
      res.status(200).json({
        success: true,
        message: 'Subject deleted successfully',
        data: subject
      });
    } catch (error) {
      next(error);
    }
  }

  // Get subject statistics
  async getSubjectStats(req, res, next) {
    try {
      const stats = await subjectService.getSubjectStats();
      
      res.status(200).json({
        success: true,
        message: 'Subject statistics retrieved successfully',
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SubjectController(); 