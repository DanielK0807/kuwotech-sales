// ============================================
// 직원 라우트
// ============================================

import express from 'express';
import {
  getAllEmployees,
  getEmployeeByName,
  updateEmployee,
  updatePassword
} from '../controllers/employees.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';

const router = express.Router();

// GET /api/employees - 전체 직원 조회 (인증된 사용자)
router.get('/', authenticate, getAllEmployees);

// GET /api/employees/:name - 특정 직원 조회
router.get('/:name', authenticate, getEmployeeByName);

// PUT /api/employees/:id - 직원 정보 수정 (인증된 사용자)
router.put('/:id', authenticate, updateEmployee);

// PUT /api/employees/:id/password - 비밀번호 변경 (인증된 사용자)
router.put('/:id/password', authenticate, updatePassword);

export default router;
