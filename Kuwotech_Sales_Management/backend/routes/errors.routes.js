// ============================================
// 에러 로그 라우트
// ============================================

import express from 'express';
import { logError, getErrors, markAsResolved } from '../controllers/errors.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// POST /api/errors/log - 에러 로그 저장 (인증 불필요 - 에러 발생 시 항상 로그 가능)
router.post('/log', logError);

// GET /api/errors - 에러 로그 조회 (인증 필요 - 관리자만)
router.get('/', authenticate, getErrors);

// PATCH /api/errors/:id/resolve - 에러 해결 처리 (인증 필요 - 관리자만)
router.patch('/:id/resolve', authenticate, markAsResolved);

export default router;
