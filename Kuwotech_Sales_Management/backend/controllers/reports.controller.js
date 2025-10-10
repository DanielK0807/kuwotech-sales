// ============================================
// 보고서 컨트롤러
// ============================================

import { getDB } from '../config/database.js';

// GET /api/reports - 전체 보고서 조회 (필터링 지원)
export const getAllReports = async (req, res) => {
  try {
    const {
      status,          // 상태 (임시저장/제출완료/승인/반려)
      submittedBy,     // 작성자명
      companyId,       // 거래처ID
      reportType,      // 보고서유형
      startDate,       // 시작일
      endDate,         // 종료일
      processedBy,     // 처리자
      limit = 100,     // 페이지당 개수
      offset = 0       // 오프셋
    } = req.query;

    console.log('📋 [보고서 조회] 요청 파라미터:', {
      status, submittedBy, companyId, reportType,
      startDate, endDate, processedBy, limit, offset
    });

    const db = await getDB();

    let query = `
      SELECT
        r.reportId, r.submittedBy, r.submittedDate, r.companyId,
        r.reportType, r.targetCollectionAmount, r.targetSalesAmount,
        r.actualCollectionAmount, r.actualSalesAmount,
        r.targetProducts, r.soldProducts, r.activityNotes, r.status, r.processedBy,
        r.processedDate, r.adminComment, r.createdAt, r.updatedAt,
        c.finalCompanyName, c.erpCompanyName,
        c.finalCompanyName as companyName
      FROM reports r
      LEFT JOIN companies c ON r.companyId = c.keyValue
      WHERE 1=1
    `;

    const params = [];

    // 필터 적용
    if (status) {
      query += ' AND r.status = ?';
      params.push(status);
    }

    if (submittedBy) {
      query += ' AND r.submittedBy = ?';
      params.push(submittedBy);
    }

    if (companyId) {
      query += ' AND r.companyId = ?';
      params.push(companyId);
    }

    if (reportType) {
      query += ' AND r.reportType = ?';
      params.push(reportType);
    }

    if (startDate) {
      query += ' AND r.submittedDate >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND r.submittedDate <= ?';
      params.push(endDate);
    }

    if (processedBy) {
      query += ' AND r.processedBy = ?';
      params.push(processedBy);
    }

    // 정렬 및 페이지네이션 (최신순)
    const limitNum = parseInt(limit) || 100;
    const offsetNum = parseInt(offset) || 0;
    query += ` ORDER BY r.submittedDate DESC, r.createdAt DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;

    const [reports] = await db.execute(query, params);

    console.log(`📊 [보고서 조회] 결과: ${reports.length}건`);
    if (reports.length > 0) {
      const submitterCounts = {};
      reports.forEach(r => {
        const submitter = r.submittedBy || '미상';
        submitterCounts[submitter] = (submitterCounts[submitter] || 0) + 1;
      });
      console.log('👥 [작성자별]', submitterCounts);
    }

    // 총 개수 조회
    let countQuery = 'SELECT COUNT(*) as total FROM reports r WHERE 1=1';
    const countParams = [];

    if (status) {
      countQuery += ' AND r.status = ?';
      countParams.push(status);
    }
    if (submittedBy) {
      countQuery += ' AND r.submittedBy = ?';
      countParams.push(submittedBy);
    }
    if (companyId) {
      countQuery += ' AND r.companyId = ?';
      countParams.push(companyId);
    }
    if (reportType) {
      countQuery += ' AND r.reportType = ?';
      countParams.push(reportType);
    }
    if (startDate) {
      countQuery += ' AND r.submittedDate >= ?';
      countParams.push(startDate);
    }
    if (endDate) {
      countQuery += ' AND r.submittedDate <= ?';
      countParams.push(endDate);
    }
    if (processedBy) {
      countQuery += ' AND r.processedBy = ?';
      countParams.push(processedBy);
    }

    const [countResult] = await db.execute(countQuery, countParams);
    console.log(`📈 [보고서 총계] 필터 적용 후: ${countResult[0].total}건`);

    // 디버깅: 전체 보고서 수 및 상세 정보 확인
    const [totalReports] = await db.execute('SELECT COUNT(*) as total FROM reports');
    console.log(`📊 [데이터베이스] 전체 보고서: ${totalReports[0].total}건`);

    // 전체 보고서의 기본 정보 조회
    const [allReports] = await db.execute(`
      SELECT reportId, submittedBy, submittedDate, status, createdAt
      FROM reports
      ORDER BY submittedDate DESC
      LIMIT 10
    `);
    console.log('📝 [전체 보고서 목록]:');
    allReports.forEach(r => {
      console.log(`  - ${r.reportId} | ${r.submittedBy} | ${r.submittedDate} | ${r.status} | 생성: ${r.createdAt}`);
    });

    res.json({
      success: true,
      count: reports.length,
      total: countResult[0].total,
      limit: parseInt(limit),
      offset: parseInt(offset),
      data: {
        reports
      }
    });

  } catch (error) {
    console.error('보고서 목록 조회 오류:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '보고서 목록 조회 중 오류가 발생했습니다.'
    });
  }
};

// GET /api/reports/:reportId - 특정 보고서 조회
export const getReportById = async (req, res) => {
  try {
    const { reportId } = req.params;
    const db = await getDB();

    const [reports] = await db.execute(`
      SELECT
        r.reportId, r.submittedBy, r.submittedDate, r.companyId,
        r.reportType, r.targetCollectionAmount, r.targetSalesAmount,
        r.actualCollectionAmount, r.actualSalesAmount,
        r.targetProducts, r.soldProducts, r.activityNotes, r.status, r.processedBy,
        r.processedDate, r.adminComment, r.createdAt, r.updatedAt,
        c.finalCompanyName, c.erpCompanyName,
        c.finalCompanyName as companyName,
        c.internalManager as companyManager
      FROM reports r
      LEFT JOIN companies c ON r.companyId = c.keyValue
      WHERE r.reportId = ?
    `, [reportId]);

    if (reports.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: '보고서를 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      data: {
        report: reports[0]
      }
    });

  } catch (error) {
    console.error('보고서 조회 오류:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '보고서 조회 중 오류가 발생했습니다.'
    });
  }
};

// GET /api/reports/employee/:employeeName - 직원별 보고서 조회
export const getReportsByEmployee = async (req, res) => {
  try {
    const { employeeName } = req.params;
    const { status, limit = 50, offset = 0 } = req.query;
    const db = await getDB();

    let query = `
      SELECT
        r.reportId, r.submittedBy, r.submittedDate, r.companyId,
        r.reportType, r.targetCollectionAmount, r.targetSalesAmount,
        r.actualCollectionAmount, r.actualSalesAmount,
        r.targetProducts, r.soldProducts,
        r.status, r.processedBy, r.processedDate, r.adminComment,
        c.finalCompanyName, c.erpCompanyName,
        c.finalCompanyName as companyName
      FROM reports r
      LEFT JOIN companies c ON r.companyId = c.keyValue
      WHERE r.submittedBy = ?
    `;

    const params = [employeeName];

    if (status) {
      query += ' AND r.status = ?';
      params.push(status);
    }

    const limitNum = parseInt(limit) || 50;
    const offsetNum = parseInt(offset) || 0;
    query += ` ORDER BY r.submittedDate DESC, r.createdAt DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;

    const [reports] = await db.execute(query, params);

    res.json({
      success: true,
      count: reports.length,
      employee: employeeName,
      data: {
        reports
      }
    });

  } catch (error) {
    console.error('직원별 보고서 조회 오류:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '직원별 보고서 조회 중 오류가 발생했습니다.'
    });
  }
};

// POST /api/reports - 보고서 생성
export const createReport = async (req, res) => {
  try {
    const {
      reportId,
      submittedBy,
      submittedDate,
      companyId,
      reportType,
      targetCollectionAmount,
      targetSalesAmount,
      targetProducts,
      activityNotes,
      status = '임시저장'
    } = req.body;

    // 필수 필드 검증
    if (!reportId || !submittedBy || !submittedDate || !companyId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: '필수 필드가 누락되었습니다. (reportId, submittedBy, submittedDate, companyId)'
      });
    }

    const db = await getDB();

    await db.execute(`
      INSERT INTO reports (
        reportId, submittedBy, submittedDate, companyId, reportType,
        targetCollectionAmount, targetSalesAmount, targetProducts,
        activityNotes, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      reportId, submittedBy, submittedDate, companyId, reportType,
      targetCollectionAmount || 0, targetSalesAmount || 0, targetProducts,
      activityNotes, status
    ]);

    res.status(201).json({
      success: true,
      message: '보고서가 생성되었습니다.',
      data: {
        reportId
      }
    });

  } catch (error) {
    console.error('❌ 보고서 생성 오류 상세:');
    console.error('  - Error Code:', error.code);
    console.error('  - SQL State:', error.sqlState);
    console.error('  - SQL Message:', error.sqlMessage);
    console.error('  - Error Number:', error.errno);
    console.error('  - Full Error:', error);

    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        error: 'Conflict',
        message: '이미 존재하는 보고서 ID입니다.',
        details: error.sqlMessage
      });
    }

    // ⚠️ CRITICAL: 에러 상세 정보를 클라이언트에게도 전송 (디버깅용)
    res.status(500).json({
      error: 'Internal Server Error',
      message: '보고서 생성 중 오류가 발생했습니다.',
      errorCode: error.code,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage,
      errno: error.errno,
      stack: error.stack
    });
  }
};

// PUT /api/reports/:reportId - 보고서 수정
export const updateReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const {
      reportType,
      targetCollectionAmount,
      targetSalesAmount,
      actualCollectionAmount,
      actualSalesAmount,
      targetProducts,
      activityNotes,
      status,
      adminComment,
      processedBy,
      confirmationData,  // ✅ 추가: 확인 데이터 (entries 상세 정보)
      processedDate      // ✅ 추가: 처리 날짜
    } = req.body;

    const db = await getDB();

    // 보고서 존재 확인
    const [existing] = await db.execute(
      'SELECT reportId FROM reports WHERE reportId = ?',
      [reportId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: '보고서를 찾을 수 없습니다.'
      });
    }

    // 업데이트할 필드만 동적으로 구성
    const updates = [];
    const params = [];

    if (reportType !== undefined) {
      updates.push('reportType = ?');
      params.push(reportType);
    }
    if (targetCollectionAmount !== undefined) {
      updates.push('targetCollectionAmount = ?');
      params.push(targetCollectionAmount);
    }
    if (targetSalesAmount !== undefined) {
      updates.push('targetSalesAmount = ?');
      params.push(targetSalesAmount);
    }
    if (actualCollectionAmount !== undefined) {
      updates.push('actualCollectionAmount = ?');
      params.push(actualCollectionAmount);
    }
    if (actualSalesAmount !== undefined) {
      updates.push('actualSalesAmount = ?');
      params.push(actualSalesAmount);
    }
    if (targetProducts !== undefined) {
      updates.push('targetProducts = ?');
      params.push(targetProducts);
    }
    if (activityNotes !== undefined) {
      updates.push('activityNotes = ?');
      params.push(activityNotes);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }
    if (adminComment !== undefined) {
      updates.push('adminComment = ?');
      params.push(adminComment);
    }
    if (processedBy !== undefined) {
      updates.push('processedBy = ?');
      params.push(processedBy);
      // processedBy가 있고 processedDate가 없으면 현재 시간으로
      if (processedDate === undefined) {
        updates.push('processedDate = NOW()');
      }
    }
    if (processedDate !== undefined) {
      updates.push('processedDate = ?');
      params.push(processedDate);
    }
    if (confirmationData !== undefined) {
      updates.push('confirmationData = ?');
      params.push(confirmationData);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: '업데이트할 필드가 없습니다.'
      });
    }

    params.push(reportId);
    const query = `UPDATE reports SET ${updates.join(', ')} WHERE reportId = ?`;

    await db.execute(query, params);

    res.json({
      success: true,
      message: '보고서가 수정되었습니다.',
      data: {
        reportId
      }
    });

  } catch (error) {
    console.error('보고서 수정 오류:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '보고서 수정 중 오류가 발생했습니다.'
    });
  }
};

// DELETE /api/reports/:reportId - 보고서 삭제
export const deleteReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const db = await getDB();

    // 보고서 존재 확인
    const [existing] = await db.execute(
      'SELECT reportId, status FROM reports WHERE reportId = ?',
      [reportId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: '보고서를 찾을 수 없습니다.'
      });
    }

    // 승인된 보고서는 삭제 불가
    if (existing[0].status === '승인') {
      return res.status(403).json({
        error: 'Forbidden',
        message: '승인된 보고서는 삭제할 수 없습니다.'
      });
    }

    await db.execute('DELETE FROM reports WHERE reportId = ?', [reportId]);

    res.json({
      success: true,
      message: '보고서가 삭제되었습니다.'
    });

  } catch (error) {
    console.error('보고서 삭제 오류:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '보고서 삭제 중 오류가 발생했습니다.'
    });
  }
};
