// ============================================
// 거래처 라우트
// ============================================

import express from 'express';
import {
  getAllCompanies,
  getCompanyByKey,
  getCompaniesByManager,
  createCompany,
  updateCompany,
  deleteCompany
} from '../controllers/companies.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// GET /api/companies - 전체 거래처 조회 (필터링 지원)
router.get('/', authenticate, getAllCompanies);

// GET /api/companies/manager/:managerName - 담당자별 거래처 조회
router.get('/manager/:managerName', authenticate, getCompaniesByManager);

// GET /api/companies/:keyValue - 특정 거래처 조회 (UUID)
router.get('/:keyValue', authenticate, getCompanyByKey);

// POST /api/companies - 거래처 생성
router.post('/', authenticate, createCompany);

// PUT /api/companies/:keyValue - 거래처 수정
router.put('/:keyValue', authenticate, updateCompany);

// DELETE /api/companies/:keyValue - 거래처 삭제
router.delete('/:keyValue', authenticate, deleteCompany);

export default router;
