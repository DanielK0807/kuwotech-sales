// ============================================
// 보고서 라우트
// ============================================

import express from 'express';
import {
  getAllReports,
  getReportById,
  getReportsByEmployee,
  createReport,
  updateReport,
  deleteReport
} from '../controllers/reports.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// GET /api/reports - 전체 보고서 조회 (필터링 지원)
router.get('/', authenticate, getAllReports);

// GET /api/reports/employee/:employeeName - 직원별 보고서 조회
router.get('/employee/:employeeName', authenticate, getReportsByEmployee);

// GET /api/reports/:reportId - 특정 보고서 조회
router.get('/:reportId', authenticate, getReportById);

// POST /api/reports - 보고서 생성
router.post('/', authenticate, createReport);

// PUT /api/reports/:reportId - 보고서 수정
router.put('/:reportId', authenticate, updateReport);

// DELETE /api/reports/:reportId - 보고서 삭제
router.delete('/:reportId', authenticate, deleteReport);

export default router;
