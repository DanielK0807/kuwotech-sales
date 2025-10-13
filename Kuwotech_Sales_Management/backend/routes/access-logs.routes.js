// ============================================
// 웹사용기록 (Access Logs) 라우트
// ============================================

import express from 'express';
import { getAccessLogs, getAccessStats, deleteAccessLog } from '../controllers/access-logs.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// GET /api/access-logs - 접속 로그 조회 (인증 필요 - 관리자만)
router.get('/', authenticate, getAccessLogs);

// GET /api/access-logs/stats - 접속 통계 조회 (인증 필요 - 관리자만)
router.get('/stats', authenticate, getAccessStats);

// DELETE /api/access-logs/:id - 접속 로그 삭제 (인증 필요 - 관리자만)
router.delete('/:id', authenticate, deleteAccessLog);

export default router;
