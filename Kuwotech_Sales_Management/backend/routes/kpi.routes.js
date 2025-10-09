/**
 * ============================================
 * KUWOTECH 영업관리 시스템 - KPI API Routes (캐시 버전)
 * 파일: backend/routes/kpi.routes.new.js
 * Created by: Daniel.K
 * Date: 2025-01-28
 * 설명: KPI 캐시 테이블 기반 API 라우트
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
 * 영업담당 개인 KPI 조회 (캐시 테이블에서)
 */
router.get('/sales/:employeeId', kpiController.getSalesKPI);

/**
 * POST /api/kpi/sales/:employeeId/refresh
 * 영업담당 KPI 강제 갱신
 */
router.post('/sales/:employeeId/refresh', kpiController.refreshSalesKPIEndpoint);

// ============================================
// [관리자 KPI]
// ============================================

/**
 * GET /api/kpi/admin
 * 전사 KPI 조회 (캐시 테이블에서)
 */
router.get('/admin', kpiController.getAdminKPI);

/**
 * POST /api/kpi/admin/refresh
 * 전사 KPI 강제 갱신
 */
router.post('/admin/refresh', kpiController.refreshAdminKPIEndpoint);

/**
 * GET /api/kpi/admin/ranking/total
 * 전체매출 기여도 순위 조회
 */
router.get('/admin/ranking/total', kpiController.getTotalSalesRanking);

/**
 * GET /api/kpi/admin/ranking/main
 * 주요제품매출 기여도 순위 조회
 */
router.get('/admin/ranking/main', kpiController.getMainProductRanking);

// ============================================
// [전체 KPI 관리]
// ============================================

/**
 * POST /api/kpi/refresh-all
 * 전체 KPI 일괄 갱신 (모든 영업담당 + 전사 KPI)
 */
router.post('/refresh-all', kpiController.refreshAllKPIEndpoint);

export default router;
