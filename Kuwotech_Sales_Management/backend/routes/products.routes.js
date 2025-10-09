// ============================================
// 제품 라우트
// ============================================

import express from 'express';
import { getProducts, addProduct } from '../controllers/products.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// 제품 목록 조회
router.get('/', authenticate, getProducts);

// 새 제품 추가
router.post('/', authenticate, addProduct);

export default router;
