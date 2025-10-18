// ============================================
// 인증 라우트
// ============================================

import express from 'express';
import { login, logout, getCurrentUser, getEmployeesByRole, forceLogin } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// POST /api/auth/login - 로그인
router.post('/login', login);

// POST /api/auth/force-login - 강제 로그인 (기존 세션 종료)
router.post('/force-login', forceLogin);

// POST /api/auth/logout - 로그아웃 (인증 필요)
router.post('/logout', authenticate, logout);

// GET /api/auth/me - 현재 사용자 정보 (인증 필요)
router.get('/me', authenticate, getCurrentUser);

// GET /api/auth/employees-by-role/:role - 역할별 직원 목록 조회
router.get('/employees-by-role/:role', getEmployeesByRole);

export default router;
