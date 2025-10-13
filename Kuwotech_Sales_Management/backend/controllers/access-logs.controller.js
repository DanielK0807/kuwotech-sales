// ============================================
// 웹사용기록 (Access Logs) 컨트롤러
// ============================================

import { getDB } from '../config/database.js';

// GET /api/access-logs - 접속 로그 조회 (관리자 전용)
export const getAccessLogs = async (req, res) => {
  try {
    // 쿼리 파라미터 파싱
    const limitParam = parseInt(req.query.limit);
    const offsetParam = parseInt(req.query.offset);
    const startDate = req.query.startDate; // YYYY-MM-DD
    const endDate = req.query.endDate; // YYYY-MM-DD
    const userName = req.query.userName; // 특정 사용자 필터
    const userRole = req.query.userRole; // 역할별 필터

    const limit = Number.isInteger(limitParam) ? limitParam : 100;
    const offset = Number.isInteger(offsetParam) ? offsetParam : 0;

    const db = await getDB();

    // WHERE 조건 동적 생성
    const conditions = [];
    const params = [];

    if (startDate) {
      conditions.push('loginTime >= ?');
      params.push(`${startDate} 00:00:00`);
    }

    if (endDate) {
      conditions.push('loginTime <= ?');
      params.push(`${endDate} 23:59:59`);
    }

    if (userName) {
      conditions.push('userName = ?');
      params.push(userName);
    }

    if (userRole) {
      conditions.push('userRole = ?');
      params.push(userRole);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 총 개수 조회
    const [countResult] = await db.execute(
      `SELECT COUNT(*) as total FROM access_logs ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    // 접속 로그 조회 (최신순)
    const [logs] = await db.query(
      `SELECT id, userId, userName, userRole, loginTime, logoutTime, sessionDuration, ipAddress, userAgent, createdAt
       FROM access_logs
       ${whereClause}
       ORDER BY loginTime DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    console.log(`📊 접속 로그 조회: ${logs.length}건 (전체 ${total}건)`);

    res.json({
      success: true,
      data: {
        total,
        limit,
        offset,
        logs
      }
    });

  } catch (error) {
    console.error('❌ 접속 로그 조회 실패:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '접속 로그 조회 중 오류가 발생했습니다.'
    });
  }
};

// GET /api/access-logs/stats - 접속 통계 조회 (관리자 전용)
export const getAccessStats = async (req, res) => {
  try {
    const startDate = req.query.startDate; // YYYY-MM-DD
    const endDate = req.query.endDate; // YYYY-MM-DD

    const db = await getDB();

    // 날짜 필터 조건
    const conditions = [];
    const params = [];

    if (startDate) {
      conditions.push('loginTime >= ?');
      params.push(`${startDate} 00:00:00`);
    }

    if (endDate) {
      conditions.push('loginTime <= ?');
      params.push(`${endDate} 23:59:59`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 통계 데이터 조회
    const [stats] = await db.query(
      `SELECT
        COUNT(*) as totalAccesses,
        COUNT(DISTINCT userName) as uniqueUsers,
        AVG(sessionDuration) as avgSessionDuration,
        MAX(sessionDuration) as maxSessionDuration,
        MIN(sessionDuration) as minSessionDuration
       FROM access_logs
       ${whereClause}`,
      params
    );

    // 사용자별 접속 횟수
    const [userStats] = await db.query(
      `SELECT userName, userRole, COUNT(*) as accessCount
       FROM access_logs
       ${whereClause}
       GROUP BY userName, userRole
       ORDER BY accessCount DESC
       LIMIT 10`,
      params
    );

    // 일별 접속 추이
    const [dailyStats] = await db.query(
      `SELECT
        DATE(loginTime) as date,
        COUNT(*) as accessCount,
        COUNT(DISTINCT userName) as uniqueUsers
       FROM access_logs
       ${whereClause}
       GROUP BY DATE(loginTime)
       ORDER BY date DESC
       LIMIT 30`,
      params
    );

    console.log('📊 접속 통계 조회 완료');

    res.json({
      success: true,
      data: {
        overall: stats[0],
        topUsers: userStats,
        daily: dailyStats
      }
    });

  } catch (error) {
    console.error('❌ 접속 통계 조회 실패:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '접속 통계 조회 중 오류가 발생했습니다.'
    });
  }
};

// DELETE /api/access-logs/:id - 접속 로그 삭제 (관리자 전용)
export const deleteAccessLog = async (req, res) => {
  try {
    const { id } = req.params;

    const db = await getDB();

    // 로그가 존재하는지 확인
    const [existing] = await db.execute(
      'SELECT id, userName FROM access_logs WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: '해당 접속 로그를 찾을 수 없습니다.'
      });
    }

    // 로그 삭제
    await db.execute('DELETE FROM access_logs WHERE id = ?', [id]);

    console.log(`🗑️ 접속 로그 삭제 완료: ID ${id}`);

    res.json({
      success: true,
      message: '접속 로그가 삭제되었습니다.',
      data: {
        id: parseInt(id)
      }
    });

  } catch (error) {
    console.error('❌ 접속 로그 삭제 실패:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '접속 로그 삭제 중 오류가 발생했습니다.'
    });
  }
};
