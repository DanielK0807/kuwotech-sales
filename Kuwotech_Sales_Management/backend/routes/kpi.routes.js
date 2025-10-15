/**
 * ============================================
 * KUWOTECH 영업관리 시스템 - KPI 라우트
 * 파일: backend/routes/kpi.routes.js
 * ============================================
 */
import express from "express";
import {
  refreshAllSalesKPI,
  refreshAdminKPI,
  refreshSalesKPI,
  getAdminKPI, // ✅ NEW: 전사 KPI 조회 서비스 임포트
  getSalesConcentrationDetail, // ✅ NEW: 매출집중도 상세 조회 임포트
  getRankingData, // ✅ NEW: 기여도 순위 조회 임포트
} from "../services/kpi.service.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = express.Router();

// ✅ NEW: GET /api/kpi/admin - 전사 KPI 데이터 조회
router.get("/admin", authenticate, async (req, res) => {
  try {
    const result = await getAdminKPI();
    if (result.success) {
      res.json(result);
    } else {
      res
        .status(404)
        .json({ success: false, message: "KPI 데이터를 찾을 수 없습니다." });
    }
  } catch (error) {
    console.error("Error fetching admin KPI:", error);
    res
      .status(500)
      .json({ success: false, message: "서버 오류가 발생했습니다." });
  }
});

// ✅ NEW: GET /api/kpi/admin/sales-concentration/detail - 매출집중도 상세 데이터 조회
router.get("/admin/sales-concentration/detail", authenticate, async (req, res) => {
  try {
    const result = await getSalesConcentrationDetail();
    if (result.success) {
      res.json(result);
    } else {
      res
        .status(404)
        .json({ success: false, message: "매출집중도 데이터를 찾을 수 없습니다." });
    }
  } catch (error) {
    console.error("Error fetching sales concentration detail:", error);
    console.error("Error stack:", error.stack);
    res
      .status(500)
      .json({ success: false, message: "서버 오류가 발생했습니다.", error: error.message });
  }
});

// ✅ NEW: GET /api/kpi/admin/ranking/:type - 기여도 순위 조회
router.get("/admin/ranking/:type", authenticate, async (req, res) => {
  try {
    const { type } = req.params;

    if (type !== "total" && type !== "main") {
      return res.status(400).json({
        success: false,
        message: "Invalid ranking type. Use 'total' or 'main'."
      });
    }

    const result = await getRankingData(type);
    if (result.success) {
      res.json(result);
    } else {
      res
        .status(404)
        .json({ success: false, message: "순위 데이터를 찾을 수 없습니다." });
    }
  } catch (error) {
    console.error("Error fetching ranking data:", error);
    console.error("Error stack:", error.stack);
    res
      .status(500)
      .json({ success: false, message: "서버 오류가 발생했습니다.", error: error.message });
  }
});

// POST /api/kpi/refresh-all - 모든 KPI 재계산
router.post("/refresh-all", authenticate, async (req, res) => {
  try {
    await refreshAllSalesKPI();
    await refreshAdminKPI();
    res.json({
      success: true,
      message: "모든 KPI가 성공적으로 갱신되었습니다.",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "KPI 갱신 중 오류 발생" });
  }
});

// GET /api/kpi/sales/:employeeId - 특정 영업담당 KPI 조회
router.get("/sales/:employeeId", authenticate, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const result = await refreshSalesKPI(employeeId);
    res.json(result);
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "영업담당 KPI 조회 중 오류 발생" });
  }
});

export default router;
