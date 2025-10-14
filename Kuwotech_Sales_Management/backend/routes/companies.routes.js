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
  deleteCompany,
  checkCompanyNameDuplicate,
  checkBusinessNumberDuplicate,
  getDataCompleteness,
  getIncompleteCompanies,
  bulkUpdateCompanies,
  patchCompany
} from '../controllers/companies.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// GET /api/companies - 전체 거래처 조회 (필터링 지원)
router.get('/', authenticate, getAllCompanies);

// GET /api/companies/data-completeness - 데이터 완성도 조회
router.get('/data-completeness', authenticate, getDataCompleteness);

// GET /api/companies/incomplete - 미완성 데이터 조회
router.get('/incomplete', authenticate, getIncompleteCompanies);

// GET /api/companies/check-duplicate/name - 거래처명 중복 체크
router.get('/check-duplicate/name', authenticate, checkCompanyNameDuplicate);

// GET /api/companies/check-duplicate/business-number - 사업자등록번호 중복 체크
router.get('/check-duplicate/business-number', authenticate, checkBusinessNumberDuplicate);

// GET /api/companies/manager/:managerName - 담당자별 거래처 조회
router.get('/manager/:managerName', authenticate, getCompaniesByManager);

// GET /api/companies/:keyValue - 특정 거래처 조회 (UUID)
router.get('/:keyValue', authenticate, getCompanyByKey);

// POST /api/companies - 거래처 생성
router.post('/', authenticate, createCompany);

// POST /api/companies/bulk-update - 다중 거래처 업데이트
router.post('/bulk-update', authenticate, bulkUpdateCompanies);

// PUT /api/companies/:keyValue - 거래처 수정
router.put('/:keyValue', authenticate, updateCompany);

// PATCH /api/companies/:keyValue - 거래처 부분 업데이트
router.patch('/:keyValue', authenticate, patchCompany);

// DELETE /api/companies/:keyValue - 거래처 삭제
router.delete('/:keyValue', authenticate, deleteCompany);

export default router;
