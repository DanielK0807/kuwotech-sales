/**
 * ============================================
 * KUWOTECH 영업관리 시스템 - KPI API Routes
 * 파일: backend/routes/kpi.routes.js
 * Created by: Daniel.K
 * Date: 2025-01-28
 * 설명: KPI 조회 API 라우트 (ES6 모듈)
 * ============================================
 */

import express from 'express';
import * as kpiController from '../controllers/kpi.controller.js';

const router = express.Router();

// ============================================
// [영업담당 KPI]
// ============================================

/**
 * GET /api/kpi/sales/:employeeId
 * 영업담당 개인 KPI 조회 (14개 지표)
 */
router.get('/sales/:employeeId', kpiController.getSalesKPI);

/**
 * GET /api/kpi/sales/:employeeId/companies
 * 영업담당 담당 거래처 목록 조회 (KPI 계산용)
 */
router.get('/sales/:employeeId/companies', kpiController.getSalesCompanies);

// ============================================
// [관리자 KPI]
// ============================================

/**
 * GET /api/kpi/admin
 * 전사 KPI 조회 (14개 지표)
 */
router.get('/admin', kpiController.getAdminKPI);

/**
 * GET /api/kpi/admin/ranking
 * 영업사원별 매출 순위 조회
 * - 전체매출기여도 순위
 * - 주요제품매출기여도 순위
 */
router.get('/admin/ranking', kpiController.getRanking);

/**
 * GET /api/kpi/admin/ranking/:type
 * 특정 타입의 순위 조회
 * @param type - 'total' (전체매출) | 'main' (주요제품매출)
 */
router.get('/admin/ranking/:type', kpiController.getRankingByType);

// ============================================
// [공통 KPI]
// ============================================

/**
 * GET /api/kpi/totals
 * 전사 집계 데이터 조회 (기여도 계산용)
 * - 전사 누적매출
 * - 전사 주요제품매출
 */
router.get('/totals', kpiController.getTotals);

export default router;
