// ============================================
// 지역 라우트
// ============================================

import express from 'express';
import {
  getAllRegions,
  getRegionById
} from '../controllers/regions.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// GET /api/regions - 전체 지역 조회
router.get('/', authenticate, getAllRegions);

// GET /api/regions/:id - 특정 지역 조회
router.get('/:id', authenticate, getRegionById);

export default router;
