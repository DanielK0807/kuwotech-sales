// ============================================
// 에러 로그 컨트롤러
// 버전: 1.1 - parseInt NaN 문제 해결
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

    // resolved 파라미터 확인 (0: 미해결만, 1: 해결만, undefined/null: 전체)
    const resolvedParam = req.query.resolved;
    let resolvedFilter = '';

    if (resolvedParam === '0') {
      resolvedFilter = 'WHERE resolved = 0';
    } else if (resolvedParam === '1') {
      resolvedFilter = 'WHERE resolved = 1';
    }

    // 에러 로그 조회 (최신순)
    // LIMIT/OFFSET은 prepared statement placeholder를 사용할 수 없으므로 query() 사용
    // limit과 offset은 Number.isInteger()로 검증되었으므로 SQL Injection 안전
    const [errors] = await db.query(
      `SELECT id, userName, userRole, errorMessage, errorStack, pageUrl, browserInfo, timestamp,
              resolved, resolvedBy, resolvedAt, resolutionNote
       FROM error_logs
       ${resolvedFilter}
       ORDER BY timestamp DESC
       LIMIT ${limit} OFFSET ${offset}`
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

// PATCH /api/errors/:id/resolve - 에러 해결 처리
export const markAsResolved = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolvedBy, resolutionNote } = req.body;

    // 입력 검증
    if (!resolvedBy) {
      return res.status(400).json({
        error: 'Bad Request',
        message: '해결자 정보가 필요합니다.'
      });
    }

    const db = await getDB();

    // 에러 로그가 존재하는지 확인
    const [existing] = await db.execute(
      'SELECT id, resolved FROM error_logs WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: '해당 에러 로그를 찾을 수 없습니다.'
      });
    }

    if (existing[0].resolved === 1) {
      return res.status(400).json({
        error: 'Bad Request',
        message: '이미 해결된 에러입니다.'
      });
    }

    // 해결 상태로 업데이트
    await db.execute(
      `UPDATE error_logs
       SET resolved = 1, resolvedBy = ?, resolvedAt = NOW(), resolutionNote = ?
       WHERE id = ?`,
      [resolvedBy, resolutionNote || null, id]
    );

    console.log(`✅ 에러 로그 해결 처리: ID ${id}, 해결자: ${resolvedBy}`);

    res.json({
      success: true,
      message: '에러가 해결 처리되었습니다.',
      data: {
        id: parseInt(id),
        resolved: true,
        resolvedBy,
        resolutionNote
      }
    });

  } catch (error) {
    console.error('❌ 에러 해결 처리 실패:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '에러 해결 처리 중 오류가 발생했습니다.'
    });
  }
};

// DELETE /api/errors/:id - 에러 로그 삭제
export const deleteError = async (req, res) => {
  try {
    const { id } = req.params;

    const db = await getDB();

    // 에러 로그가 존재하는지 확인
    const [existing] = await db.execute(
      'SELECT id, errorMessage FROM error_logs WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: '해당 에러 로그를 찾을 수 없습니다.'
      });
    }

    // 에러 로그 삭제
    await db.execute('DELETE FROM error_logs WHERE id = ?', [id]);

    console.log(`🗑️ 에러 로그 삭제 완료: ID ${id}`);

    res.json({
      success: true,
      message: '에러 로그가 삭제되었습니다.',
      data: {
        id: parseInt(id)
      }
    });

  } catch (error) {
    console.error('❌ 에러 로그 삭제 실패:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '에러 로그 삭제 중 오류가 발생했습니다.'
    });
  }
};
