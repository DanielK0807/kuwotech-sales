// ============================================
// 마스터 데이터 라우트 (제품, 지역 등)
// ============================================

import express from 'express';
import {
  getAllProducts,
  getActiveProducts,
  getRegions,
  getDepartments
} from '../controllers/master.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// GET /api/master/products - 전체 제품 목록 조회
router.get('/products', authenticate, getAllProducts);

// GET /api/master/products/active - 활성 제품만 조회
router.get('/products/active', authenticate, getActiveProducts);

// GET /api/master/regions - 시/도 지역 목록 조회
router.get('/regions', authenticate, getRegions);

// GET /api/master/departments - 부서 목록 조회
router.get('/departments', authenticate, getDepartments);

export default router;
