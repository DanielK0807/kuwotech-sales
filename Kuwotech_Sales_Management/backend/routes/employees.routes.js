// ============================================
// 직원 라우트
// ============================================

import express from 'express';
import {
  getAllEmployees,
  getEmployeeByName,
  preCheckEmployeeForLogin,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  updatePassword,
  getEmployeeStatistics,
  resetEmployeePassword
} from '../controllers/employees.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';

const router = express.Router();

// GET /api/employees/statistics - 직원 통계 조회 (인증된 사용자)
router.get('/statistics', authenticate, getEmployeeStatistics);

// GET /api/employees - 전체 직원 조회 (인증된 사용자)
router.get('/', authenticate, getAllEmployees);

// GET /api/employees/precheck/:name - 로그인 전 직원 프리체크 (공개 엔드포인트, 인증 불필요)
router.get('/precheck/:name', preCheckEmployeeForLogin);

// GET /api/employees/:name - 특정 직원 조회 (인증된 사용자)
router.get('/:name', authenticate, getEmployeeByName);

// POST /api/employees - 직원 추가 (관리자만)
router.post('/', authenticate, requireRole('관리자'), createEmployee);

// PUT /api/employees/:id - 직원 정보 수정 (인증된 사용자)
router.put('/:id', authenticate, updateEmployee);

// DELETE /api/employees/:id - 직원 삭제 (관리자만)
router.delete('/:id', authenticate, requireRole('관리자'), deleteEmployee);

// PUT /api/employees/:id/password - 비밀번호 변경 (인증된 사용자)
router.put('/:id/password', authenticate, updatePassword);

// POST /api/employees/:id/reset-password - 비밀번호 초기화 (관리자만)
router.post('/:id/reset-password', authenticate, requireRole('관리자'), resetEmployeePassword);

export default router;
