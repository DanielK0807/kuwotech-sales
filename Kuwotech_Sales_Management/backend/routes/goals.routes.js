// ============================================
// 목표/실적 조회 라우트
// ============================================

import express from 'express';
import {
  getEmployeeMonthlyGoals,
  getEmployeeAnnualGoals,
  getCompanyMonthlyGoals,
  getDepartmentMonthlyGoals,
  getTotalMonthlyGoals
} from '../controllers/goals.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// GET /api/goals/employee/:id/monthly - 담당자 월간 실적
router.get('/employee/:id/monthly', authenticate, getEmployeeMonthlyGoals);

// GET /api/goals/employee/:id/annual - 담당자 연간 실적
router.get('/employee/:id/annual', authenticate, getEmployeeAnnualGoals);

// GET /api/goals/company/:id/monthly - 거래처 월간 실적
router.get('/company/:id/monthly', authenticate, getCompanyMonthlyGoals);

// GET /api/goals/department/:id/monthly - 부서 월간 실적
router.get('/department/:id/monthly', authenticate, getDepartmentMonthlyGoals);

// GET /api/goals/total/monthly - 전체 월간 실적
router.get('/total/monthly', authenticate, getTotalMonthlyGoals);

export default router;
