// ============================================
// 에러 로그 컨트롤러
// ============================================

import { getDB } from '../config/database.js';

// POST /api/errors/log - 에러 로그 저장
export const logError = async (req, res) => {
  try {
    const { userName, userRole, errorMessage, errorStack, pageUrl, browserInfo } = req.body;

    // 입력 검증 (errorMessage는 필수)
    if (!errorMessage) {
      return res.status(400).json({
        error: 'Bad Request',
        message: '에러 메시지가 필요합니다.'
      });
    }

    const db = await getDB();

    // 에러 로그 저장
    const [result] = await db.execute(
      `INSERT INTO error_logs (userName, userRole, errorMessage, errorStack, pageUrl, browserInfo, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [
        userName || null,
        userRole || null,
        errorMessage,
        errorStack || null,
        pageUrl || null,
        browserInfo || null
      ]
    );

    console.log('📝 에러 로그 저장 완료:', result.insertId);

    res.status(201).json({
      success: true,
      message: '에러 로그가 저장되었습니다.',
      data: {
        logId: result.insertId
      }
    });

  } catch (error) {
    console.error('❌ 에러 로그 저장 실패:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '에러 로그 저장 중 오류가 발생했습니다.'
    });
  }
};

// GET /api/errors - 에러 로그 조회 (관리자 전용)
export const getErrors = async (req, res) => {
  try {
    // 파라미터 안전하게 파싱 (NaN 방지)
    const limitParam = parseInt(req.query.limit);
    const offsetParam = parseInt(req.query.offset);

    const limit = Number.isInteger(limitParam) ? limitParam : 100;
    const offset = Number.isInteger(offsetParam) ? offsetParam : 0;

    const db = await getDB();

    // 총 에러 로그 개수 조회
    const [countResult] = await db.execute(
      'SELECT COUNT(*) as total FROM error_logs'
    );
    const total = countResult[0].total;

    // 에러 로그 조회 (최신순)
    const [errors] = await db.execute(
      `SELECT id, userName, userRole, errorMessage, errorStack, pageUrl, browserInfo, timestamp
       FROM error_logs
       ORDER BY timestamp DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    console.log(`📊 에러 로그 조회: ${errors.length}건 (전체 ${total}건)`);

    res.json({
      success: true,
      data: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        errors
      }
    });

  } catch (error) {
    console.error('❌ 에러 로그 조회 실패:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '에러 로그 조회 중 오류가 발생했습니다.'
    });
  }
};
