// ============================================
// 디버그 라우트 (개발용)
// ============================================

import express from 'express';
import { getDB } from '../config/database.js';

const router = express.Router();

// GET /api/debug/reports/강민 - 강민의 보고서 조회 (디버그용)
router.get('/reports/:employeeName', async (req, res) => {
  try {
    const { employeeName } = req.params;
    const connection = await getDB();

    const [rows] = await connection.execute(
      `SELECT
        r.reportId,
        r.reportType,
        r.companyId,
        c.finalCompanyName as companyName,
        r.submittedBy,
        DATE_FORMAT(r.submittedDate, '%Y-%m-%d') as submittedDate,
        r.status,
        r.targetCollectionAmount,
        r.targetSalesAmount,
        r.targetProducts,
        r.activityNotes
      FROM reports r
      LEFT JOIN companies c ON r.companyId = c.keyValue
      WHERE r.submittedBy = ?
      ORDER BY r.submittedDate DESC`,
      [employeeName]
    );

    res.json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (error) {
    console.error('[Debug] 보고서 조회 에러:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// GET /api/debug/reports-count - 전체 보고서 수 확인
router.get('/reports-count', async (req, res) => {
  try {
    const connection = await getDB();
    const [result] = await connection.execute('SELECT COUNT(*) as total FROM reports');

    res.json({
      success: true,
      totalReports: result[0].total
    });
  } catch (error) {
    console.error('[Debug] 보고서 수 조회 에러:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;
