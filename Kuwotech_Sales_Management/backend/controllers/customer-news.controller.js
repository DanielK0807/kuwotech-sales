// ============================================
// 고객소식 관리 컨트롤러
// ============================================

import { getDB } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

// ============================================
// 고객소식 CRUD
// ============================================

// GET /api/customer-news - 전체 고객소식 조회 (필터링 지원)
export const getAllCustomerNews = async (req, res) => {
  try {
    const {
      companyId,      // 거래처 ID
      companyName,    // 거래처명 (LIKE 검색)
      category,       // 카테고리
      createdBy,      // 작성자
      startDate,      // 시작일
      endDate,        // 종료일
      priority,       // 중요도
      status = '활성', // 상태
      limit = 50,
      offset = 0
    } = req.query;

    console.log('📰 [고객소식 조회] 요청 파라미터:', req.query);

    const db = await getDB();

    let query = `
      SELECT
        cn.*,
        c.finalCompanyName as companyFullName
      FROM customer_news cn
      LEFT JOIN companies c ON cn.companyId = c.keyValue
      WHERE cn.status = ?
    `;
    const params = [status];

    // 필터 적용
    if (companyId) {
      query += ' AND cn.companyId = ?';
      params.push(companyId);
    }

    if (companyName) {
      query += ' AND cn.companyName LIKE ?';
      params.push(`%${companyName}%`);
    }

    if (category) {
      query += ' AND cn.category = ?';
      params.push(category);
    }

    if (createdBy) {
      query += ' AND cn.createdBy = ?';
      params.push(createdBy);
    }

    if (startDate) {
      query += ' AND cn.newsDate >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND cn.newsDate <= ?';
      params.push(endDate);
    }

    if (priority) {
      query += ' AND cn.priority = ?';
      params.push(priority);
    }

    // 정렬: 우선순위 높은 순 → 최신 순
    query += ' ORDER BY FIELD(cn.priority, "긴급", "높음", "보통", "낮음"), cn.newsDate DESC, cn.createdAt DESC';

    // 페이지네이션
    const limitNum = parseInt(limit) || 50;
    const offsetNum = parseInt(offset) || 0;
    query += ` LIMIT ${limitNum} OFFSET ${offsetNum}`;

    const [news] = await db.execute(query, params);

    // 총 개수 조회
    let countQuery = 'SELECT COUNT(*) as total FROM customer_news cn WHERE cn.status = ?';
    const countParams = [status];

    if (companyId) {
      countQuery += ' AND cn.companyId = ?';
      countParams.push(companyId);
    }
    if (companyName) {
      countQuery += ' AND cn.companyName LIKE ?';
      countParams.push(`%${companyName}%`);
    }
    if (category) {
      countQuery += ' AND cn.category = ?';
      countParams.push(category);
    }
    if (createdBy) {
      countQuery += ' AND cn.createdBy = ?';
      countParams.push(createdBy);
    }
    if (startDate) {
      countQuery += ' AND cn.newsDate >= ?';
      countParams.push(startDate);
    }
    if (endDate) {
      countQuery += ' AND cn.newsDate <= ?';
      countParams.push(endDate);
    }
    if (priority) {
      countQuery += ' AND cn.priority = ?';
      countParams.push(priority);
    }

    const [countResult] = await db.execute(countQuery, countParams);

    console.log(`📊 [고객소식 조회] 결과: ${news.length}건 / 총 ${countResult[0].total}건`);

    res.json({
      success: true,
      count: news.length,
      total: countResult[0].total,
      limit: limitNum,
      offset: offsetNum,
      data: { news }
    });

  } catch (error) {
    console.error('고객소식 조회 오류:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '고객소식 조회 중 오류가 발생했습니다.'
    });
  }
};

// GET /api/customer-news/:id - 특정 고객소식 조회
export const getCustomerNewsById = async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDB();

    const [news] = await db.execute(`
      SELECT
        cn.*,
        c.finalCompanyName as companyFullName,
        c.internalManager
      FROM customer_news cn
      LEFT JOIN companies c ON cn.companyId = c.keyValue
      WHERE cn.id = ?
    `, [id]);

    if (news.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: '고객소식을 찾을 수 없습니다.'
      });
    }

    // 조회수 증가
    await db.execute('UPDATE customer_news SET viewCount = viewCount + 1 WHERE id = ?', [id]);

    console.log(`📰 [고객소식 조회] ID: ${id} | 제목: ${news[0].title}`);

    res.json({
      success: true,
      data: { news: news[0] }
    });

  } catch (error) {
    console.error('고객소식 조회 오류:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '고객소식 조회 중 오류가 발생했습니다.'
    });
  }
};

// POST /api/customer-news - 고객소식 작성
export const createCustomerNews = async (req, res) => {
  try {
    const {
      companyId,
      companyName,
      category,
      title,
      content,
      newsDate,
      isYearlyRecurring = false,
      priority = '보통',
      showAsNotification = false
    } = req.body;

    // 필수 필드 검증
    if (!companyId || !companyName || !category || !title || !content || !newsDate) {
      return res.status(400).json({
        error: 'Bad Request',
        message: '필수 필드가 누락되었습니다.'
      });
    }

    const db = await getDB();
    const newsId = uuidv4();
    const createdBy = req.user.name; // JWT에서 가져옴
    const department = req.user.department;

    await db.execute(`
      INSERT INTO customer_news (
        id, companyId, companyName, createdBy, department,
        category, title, content, newsDate, isYearlyRecurring,
        priority, showAsNotification
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      newsId, companyId, companyName, createdBy, department,
      category, title, content, newsDate, isYearlyRecurring,
      priority, showAsNotification
    ]);

    console.log(`✅ [고객소식 작성] ID: ${newsId} | 작성자: ${createdBy} | 제목: ${title}`);

    // 알림 설정이 활성화된 경우, 모든 직원에게 알림 레코드 생성
    if (showAsNotification) {
      const [employees] = await db.execute(`
        SELECT name FROM employees WHERE status = '재직'
      `);

      if (employees.length > 0) {
        const notificationValues = employees.map(emp =>
          `('${newsId}', '${emp.name}')`
        ).join(', ');

        await db.execute(`
          INSERT INTO customer_news_notifications (newsId, employeeName)
          VALUES ${notificationValues}
        `);

        console.log(`🔔 [알림 생성] ${employees.length}명의 직원에게 알림 설정`);
      }
    }

    res.status(201).json({
      success: true,
      message: '고객소식이 작성되었습니다.',
      data: { newsId }
    });

  } catch (error) {
    console.error('고객소식 작성 오류:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '고객소식 작성 중 오류가 발생했습니다.'
    });
  }
};

// PUT /api/customer-news/:id - 고객소식 수정
export const updateCustomerNews = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      category,
      title,
      content,
      newsDate,
      isYearlyRecurring,
      priority,
      showAsNotification,
      status
    } = req.body;

    const db = await getDB();

    // 고객소식 존재 확인
    const [existing] = await db.execute('SELECT id, createdBy FROM customer_news WHERE id = ?', [id]);

    if (existing.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: '고객소식을 찾을 수 없습니다.'
      });
    }

    // 권한 확인 (작성자 또는 관리자만 수정 가능)
    if (existing[0].createdBy !== req.user.name && req.user.role !== '관리자') {
      return res.status(403).json({
        error: 'Forbidden',
        message: '수정 권한이 없습니다.'
      });
    }

    // 업데이트할 필드만 동적으로 구성
    const updates = [];
    const params = [];

    if (category !== undefined) {
      updates.push('category = ?');
      params.push(category);
    }
    if (title !== undefined) {
      updates.push('title = ?');
      params.push(title);
    }
    if (content !== undefined) {
      updates.push('content = ?');
      params.push(content);
    }
    if (newsDate !== undefined) {
      updates.push('newsDate = ?');
      params.push(newsDate);
    }
    if (isYearlyRecurring !== undefined) {
      updates.push('isYearlyRecurring = ?');
      params.push(isYearlyRecurring);
    }
    if (priority !== undefined) {
      updates.push('priority = ?');
      params.push(priority);
    }
    if (showAsNotification !== undefined) {
      updates.push('showAsNotification = ?');
      params.push(showAsNotification);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: '업데이트할 필드가 없습니다.'
      });
    }

    params.push(id);
    const query = `UPDATE customer_news SET ${updates.join(', ')} WHERE id = ?`;

    await db.execute(query, params);

    console.log(`✅ [고객소식 수정] ID: ${id}`);

    res.json({
      success: true,
      message: '고객소식이 수정되었습니다.'
    });

  } catch (error) {
    console.error('고객소식 수정 오류:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '고객소식 수정 중 오류가 발생했습니다.'
    });
  }
};

// DELETE /api/customer-news/:id - 고객소식 삭제 (soft delete)
export const deleteCustomerNews = async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDB();

    // 고객소식 존재 확인
    const [existing] = await db.execute('SELECT id, createdBy FROM customer_news WHERE id = ?', [id]);

    if (existing.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: '고객소식을 찾을 수 없습니다.'
      });
    }

    // 권한 확인 (작성자 또는 관리자만 삭제 가능)
    if (existing[0].createdBy !== req.user.name && req.user.role !== '관리자') {
      return res.status(403).json({
        error: 'Forbidden',
        message: '삭제 권한이 없습니다.'
      });
    }

    // Soft delete (status를 '삭제됨'으로 변경)
    await db.execute('UPDATE customer_news SET status = ? WHERE id = ?', ['삭제됨', id]);

    console.log(`🗑️ [고객소식 삭제] ID: ${id}`);

    res.json({
      success: true,
      message: '고객소식이 삭제되었습니다.'
    });

  } catch (error) {
    console.error('고객소식 삭제 오류:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '고객소식 삭제 중 오류가 발생했습니다.'
    });
  }
};

// ============================================
// 카테고리별 조회
// ============================================

// GET /api/customer-news/category/:category
export const getNewsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const db = await getDB();

    const [news] = await db.execute(`
      SELECT * FROM customer_news
      WHERE category = ? AND status = '활성'
      ORDER BY newsDate DESC, createdAt DESC
      LIMIT ? OFFSET ?
    `, [category, parseInt(limit), parseInt(offset)]);

    res.json({
      success: true,
      count: news.length,
      data: { news }
    });

  } catch (error) {
    console.error('카테고리별 조회 오류:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '카테고리별 조회 중 오류가 발생했습니다.'
    });
  }
};

// GET /api/customer-news/company/:companyId
export const getNewsByCompany = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const db = await getDB();

    const [news] = await db.execute(`
      SELECT * FROM customer_news
      WHERE companyId = ? AND status = '활성'
      ORDER BY newsDate DESC, createdAt DESC
      LIMIT ? OFFSET ?
    `, [companyId, parseInt(limit), parseInt(offset)]);

    res.json({
      success: true,
      count: news.length,
      data: { news }
    });

  } catch (error) {
    console.error('거래처별 조회 오류:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '거래처별 조회 중 오류가 발생했습니다.'
    });
  }
};

// GET /api/customer-news/employee/:employeeName
export const getNewsByEmployee = async (req, res) => {
  try {
    const { employeeName } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const db = await getDB();

    const [news] = await db.execute(`
      SELECT * FROM customer_news
      WHERE createdBy = ? AND status = '활성'
      ORDER BY newsDate DESC, createdAt DESC
      LIMIT ? OFFSET ?
    `, [employeeName, parseInt(limit), parseInt(offset)]);

    res.json({
      success: true,
      count: news.length,
      data: { news }
    });

  } catch (error) {
    console.error('작성자별 조회 오류:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '작성자별 조회 중 오류가 발생했습니다.'
    });
  }
};

// ============================================
// 알림 관련
// ============================================

// GET /api/customer-news/notifications/me - 내 알림 조회
export const getNotificationsForUser = async (req, res) => {
  try {
    const employeeName = req.user.name;
    const db = await getDB();

    // 알림 설정된 고객소식 중 표시해야 하는 것들 조회
    const [notifications] = await db.execute(`
      SELECT
        cn.id, cn.companyName, cn.category, cn.title,
        cn.newsDate, cn.priority, cn.content,
        cnn.viewCount, cnn.isDismissed
      FROM customer_news cn
      INNER JOIN customer_news_notifications cnn
        ON cn.id = cnn.newsId
      WHERE cnn.employeeName = ?
        AND cn.showAsNotification = TRUE
        AND cn.status = '활성'
        AND cnn.viewCount < 3
        AND cnn.isDismissed = FALSE
      ORDER BY FIELD(cn.priority, '긴급', '높음', '보통', '낮음'), cn.newsDate ASC
      LIMIT 10
    `, [employeeName]);

    console.log(`🔔 [알림 조회] ${employeeName}: ${notifications.length}건`);

    res.json({
      success: true,
      count: notifications.length,
      data: { notifications }
    });

  } catch (error) {
    console.error('알림 조회 오류:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '알림 조회 중 오류가 발생했습니다.'
    });
  }
};

// POST /api/customer-news/notifications/:newsId/view - 알림 조회 카운트 증가
export const markNotificationAsViewed = async (req, res) => {
  try {
    const { newsId } = req.params;
    const employeeName = req.user.name;
    const db = await getDB();

    // 조회수 증가
    const [result] = await db.execute(`
      UPDATE customer_news_notifications
      SET
        viewCount = viewCount + 1,
        firstViewedAt = COALESCE(firstViewedAt, NOW()),
        lastViewedAt = NOW()
      WHERE newsId = ? AND employeeName = ?
    `, [newsId, employeeName]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: '알림을 찾을 수 없습니다.'
      });
    }

    console.log(`👁️ [알림 조회] ${employeeName} | 소식 ID: ${newsId}`);

    res.json({
      success: true,
      message: '알림이 조회되었습니다.'
    });

  } catch (error) {
    console.error('알림 조회 처리 오류:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '알림 조회 처리 중 오류가 발생했습니다.'
    });
  }
};

// POST /api/customer-news/notifications/:newsId/dismiss - 더이상 보지 않기
export const dismissNotification = async (req, res) => {
  try {
    const { newsId } = req.params;
    const employeeName = req.user.name;
    const db = await getDB();

    const [result] = await db.execute(`
      UPDATE customer_news_notifications
      SET isDismissed = TRUE, dismissedAt = NOW()
      WHERE newsId = ? AND employeeName = ?
    `, [newsId, employeeName]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: '알림을 찾을 수 없습니다.'
      });
    }

    console.log(`🚫 [알림 해제] ${employeeName} | 소식 ID: ${newsId}`);

    res.json({
      success: true,
      message: '알림이 해제되었습니다.'
    });

  } catch (error) {
    console.error('알림 해제 오류:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '알림 해제 중 오류가 발생했습니다.'
    });
  }
};

// ============================================
// 의견 관련
// ============================================

// GET /api/customer-news/:newsId/comments - 특정 소식의 의견 조회
export const getCommentsByNewsId = async (req, res) => {
  try {
    const { newsId } = req.params;
    const db = await getDB();

    const [comments] = await db.execute(`
      SELECT * FROM customer_news_comments
      WHERE newsId = ?
      ORDER BY createdAt DESC
    `, [newsId]);

    res.json({
      success: true,
      count: comments.length,
      data: { comments }
    });

  } catch (error) {
    console.error('의견 조회 오류:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '의견 조회 중 오류가 발생했습니다.'
    });
  }
};

// POST /api/customer-news/:newsId/comments - 의견 작성
export const createComment = async (req, res) => {
  try {
    const { newsId } = req.params;
    const { comment, commentType = '일반' } = req.body;

    if (!comment) {
      return res.status(400).json({
        error: 'Bad Request',
        message: '의견 내용이 필요합니다.'
      });
    }

    const db = await getDB();
    const commentId = uuidv4();
    const commentBy = req.user.name;
    const commentByRole = req.user.role;

    await db.execute(`
      INSERT INTO customer_news_comments (
        id, newsId, commentBy, commentByRole, comment, commentType
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [commentId, newsId, commentBy, commentByRole, comment, commentType]);

    console.log(`💬 [의견 작성] ${commentBy} → 소식 ID: ${newsId}`);

    res.status(201).json({
      success: true,
      message: '의견이 작성되었습니다.',
      data: { commentId }
    });

  } catch (error) {
    console.error('의견 작성 오류:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '의견 작성 중 오류가 발생했습니다.'
    });
  }
};

// DELETE /api/customer-news/comments/:commentId - 의견 삭제
export const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const db = await getDB();

    // 의견 존재 확인 및 권한 체크
    const [existing] = await db.execute('SELECT commentBy FROM customer_news_comments WHERE id = ?', [commentId]);

    if (existing.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: '의견을 찾을 수 없습니다.'
      });
    }

    // 작성자 또는 관리자만 삭제 가능
    if (existing[0].commentBy !== req.user.name && req.user.role !== '관리자') {
      return res.status(403).json({
        error: 'Forbidden',
        message: '삭제 권한이 없습니다.'
      });
    }

    await db.execute('DELETE FROM customer_news_comments WHERE id = ?', [commentId]);

    console.log(`🗑️ [의견 삭제] ID: ${commentId}`);

    res.json({
      success: true,
      message: '의견이 삭제되었습니다.'
    });

  } catch (error) {
    console.error('의견 삭제 오류:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '의견 삭제 중 오류가 발생했습니다.'
    });
  }
};

// PUT /api/customer-news/comments/:commentId/read - 의견 읽음 처리
export const markCommentAsRead = async (req, res) => {
  try {
    const { commentId } = req.params;
    const db = await getDB();

    await db.execute(`
      UPDATE customer_news_comments
      SET isRead = TRUE, readAt = NOW()
      WHERE id = ?
    `, [commentId]);

    res.json({
      success: true,
      message: '의견이 읽음 처리되었습니다.'
    });

  } catch (error) {
    console.error('의견 읽음 처리 오류:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '의견 읽음 처리 중 오류가 발생했습니다.'
    });
  }
};

// ============================================
// 통계 및 기타
// ============================================

// GET /api/customer-news/statistics/overview - 통계 요약
export const getNewsStatistics = async (req, res) => {
  try {
    const db = await getDB();

    // 카테고리별 통계
    const [categoryStats] = await db.execute(`
      SELECT
        category,
        COUNT(*) as count
      FROM customer_news
      WHERE status = '활성'
      GROUP BY category
    `);

    // 월별 작성 추이 (최근 12개월)
    const [monthlyStats] = await db.execute(`
      SELECT
        DATE_FORMAT(createdAt, '%Y-%m') as month,
        COUNT(*) as count
      FROM customer_news
      WHERE status = '활성'
        AND createdAt >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
      GROUP BY month
      ORDER BY month DESC
    `);

    // 작성자별 통계 (Top 10)
    const [employeeStats] = await db.execute(`
      SELECT
        createdBy,
        COUNT(*) as count,
        MAX(createdAt) as lastCreated
      FROM customer_news
      WHERE status = '활성'
      GROUP BY createdBy
      ORDER BY count DESC
      LIMIT 10
    `);

    // 총계
    const [totals] = await db.execute(`
      SELECT
        COUNT(*) as totalNews,
        SUM(viewCount) as totalViews,
        SUM(commentCount) as totalComments
      FROM customer_news
      WHERE status = '활성'
    `);

    res.json({
      success: true,
      data: {
        categoryStats,
        monthlyStats,
        employeeStats,
        totals: totals[0]
      }
    });

  } catch (error) {
    console.error('통계 조회 오류:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '통계 조회 중 오류가 발생했습니다.'
    });
  }
};

// GET /api/customer-news/events/upcoming - 다가오는 이벤트 (생일, 기념일 등)
export const getUpcomingEvents = async (req, res) => {
  try {
    const { days = 30 } = req.query; // 앞으로 며칠간의 이벤트
    const db = await getDB();

    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + parseInt(days));

    const todayStr = today.toISOString().split('T')[0];
    const futureDateStr = futureDate.toISOString().split('T')[0];

    // 일반 이벤트 (특정 날짜)
    const [regularEvents] = await db.execute(`
      SELECT * FROM customer_news
      WHERE status = '활성'
        AND isYearlyRecurring = FALSE
        AND newsDate >= ?
        AND newsDate <= ?
      ORDER BY newsDate ASC
    `, [todayStr, futureDateStr]);

    // 매년 반복 이벤트 (월-일만 비교)
    const [recurringEvents] = await db.execute(`
      SELECT * FROM customer_news
      WHERE status = '활성'
        AND isYearlyRecurring = TRUE
        AND (
          (MONTH(newsDate) = MONTH(?) AND DAY(newsDate) >= DAY(?))
          OR MONTH(newsDate) > MONTH(?)
        )
      ORDER BY MONTH(newsDate), DAY(newsDate)
    `, [todayStr, todayStr, todayStr]);

    const allEvents = [...regularEvents, ...recurringEvents];

    res.json({
      success: true,
      count: allEvents.length,
      data: { events: allEvents }
    });

  } catch (error) {
    console.error('다가오는 이벤트 조회 오류:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '다가오는 이벤트 조회 중 오류가 발생했습니다.'
    });
  }
};

// GET /api/customer-news/my-news-with-comments - 내가 작성한 고객소식과 의견 조회
export const getMyNewsWithComments = async (req, res) => {
  try {
    const employeeName = req.user.name;
    const db = await getDB();

    console.log(`📰 [내 고객소식 조회] 요청자: ${employeeName}`);

    // 내가 작성한 고객소식 조회
    const [news] = await db.execute(`
      SELECT * FROM customer_news
      WHERE createdBy = ? AND status = '활성'
      ORDER BY newsDate DESC, createdAt DESC
    `, [employeeName]);

    // 각 고객소식에 대한 의견 조회
    const newsWithComments = await Promise.all(
      news.map(async (newsItem) => {
        const [comments] = await db.execute(`
          SELECT
            id,
            newsId,
            commentBy,
            commentByRole,
            comment,
            commentType,
            isRead,
            createdAt,
            CASE
              WHEN commentBy = ? THEN TRUE
              ELSE isRead
            END as is_read_by_writer
          FROM customer_news_comments
          WHERE newsId = ?
          ORDER BY createdAt DESC
        `, [employeeName, newsItem.id]);

        return {
          ...newsItem,
          comments: comments || []
        };
      })
    );

    console.log(`📊 [내 고객소식 조회] 결과: ${newsWithComments.length}건`);

    res.json({
      success: true,
      count: newsWithComments.length,
      news: newsWithComments
    });

  } catch (error) {
    console.error('내 고객소식 조회 오류:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '내 고객소식 조회 중 오류가 발생했습니다.'
    });
  }
};

// ============================================
// 관리자 전용 - 데이터 마이그레이션
// ============================================

// POST /api/customer-news/admin/migrate-activitynotes
// companies.activityNotes → customer_news 일괄 마이그레이션
export const migrateActivityNotesToCustomerNews = async (req, res) => {
  try {
    // 관리자 권한 확인
    if (req.user.role2 !== '관리자') {
      return res.status(403).json({
        error: 'Forbidden',
        message: '관리자만 실행할 수 있습니다.'
      });
    }

    const db = await getDB();
    console.log('🔄 [마이그레이션] companies.activityNotes → customer_news 시작\n');

    // 1. activityNotes가 있는 거래처 조회
    const [companies] = await db.execute(`
      SELECT keyValue, finalCompanyName, activityNotes
      FROM companies
      WHERE activityNotes IS NOT NULL
        AND activityNotes != ''
    `);

    console.log(`📊 activityNotes가 있는 거래처: ${companies.length}개`);

    if (companies.length === 0) {
      return res.json({
        success: true,
        message: '마이그레이션할 데이터가 없습니다.',
        data: { inserted: 0, skipped: 0, errors: 0, total: 0 }
      });
    }

    let insertedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors = [];

    // 2. 각 거래처의 activityNotes를 customer_news에 삽입
    for (const company of companies) {
      try {
        // 이미 해당 거래처의 시스템 생성 고객소식이 있는지 확인
        const [existing] = await db.execute(`
          SELECT id FROM customer_news
          WHERE companyId = ?
            AND createdBy = '시스템'
            AND category = '일반소식'
            AND content = ?
          LIMIT 1
        `, [company.keyValue, company.activityNotes]);

        if (existing.length > 0) {
          console.log(`⏭️  ${company.finalCompanyName} - 이미 존재함 (건너뜀)`);
          skippedCount++;
          continue;
        }

        // customer_news에 삽입
        const newsId = uuidv4();
        const today = new Date().toISOString().split('T')[0];

        await db.execute(`
          INSERT INTO customer_news (
            id, companyId, companyName, createdBy, department,
            category, title, content, newsDate, priority, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          newsId,
          company.keyValue,
          company.finalCompanyName,
          '시스템',
          '시스템',
          '일반소식',
          `[마이그레이션] ${company.finalCompanyName} 영업활동`,
          company.activityNotes,
          today,
          '보통',
          '활성'
        ]);

        console.log(`✅ ${company.finalCompanyName} - 고객소식 생성 완료`);
        insertedCount++;

      } catch (error) {
        console.error(`❌ ${company.finalCompanyName} - 실패: ${error.message}`);
        errorCount++;
        errors.push({
          companyName: company.finalCompanyName,
          error: error.message
        });
      }
    }

    console.log('\n=== 마이그레이션 결과 ===');
    console.log(`✅ 성공: ${insertedCount}개`);
    console.log(`⏭️  건너뜀: ${skippedCount}개`);
    console.log(`❌ 실패: ${errorCount}개`);
    console.log(`📋 전체: ${companies.length}개`);

    res.json({
      success: true,
      message: '마이그레이션이 완료되었습니다.',
      data: {
        inserted: insertedCount,
        skipped: skippedCount,
        errors: errorCount,
        total: companies.length,
        errorDetails: errors
      }
    });

  } catch (error) {
    console.error('❌ 마이그레이션 실패:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '마이그레이션 중 오류가 발생했습니다.',
      details: error.message
    });
  }
};
