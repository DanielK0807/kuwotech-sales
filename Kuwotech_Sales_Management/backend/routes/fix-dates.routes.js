// 날짜 데이터 수정 API
import express from 'express';
import { getDB } from '../config/database.js';

const router = express.Router();

router.post('/fix-invalid-dates', async (req, res) => {
  try {
    const db = await getDB();

    // SQL 모드 임시 변경 (strict mode 비활성화)
    await db.execute("SET SESSION sql_mode = 'NO_ENGINE_SUBSTITUTION'");

    // '0000-00-00' 날짜를 NULL로 변경
    const [result] = await db.execute(`
      UPDATE companies
      SET lastPaymentDate = NULL
      WHERE lastPaymentDate = '0000-00-00' OR lastPaymentDate < '1970-01-01'
    `);

    // SQL 모드 복원
    await db.execute("SET SESSION sql_mode = 'STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION'");

    res.json({
      success: true,
      message: '잘못된 날짜 수정 완료',
      affected: result.affectedRows
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      code: error.code
    });
  }
});

export default router;
