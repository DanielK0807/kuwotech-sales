// ============================================
// 고객소식 관리 라우터
// ============================================

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  // 고객소식 CRUD
  getAllCustomerNews,
  getCustomerNewsById,
  createCustomerNews,
  updateCustomerNews,
  deleteCustomerNews,

  // 카테고리별 조회
  getNewsByCategory,
  getNewsByCompany,
  getNewsByEmployee,
  getMyNewsWithComments,

  // 알림 관련
  getNotificationsForUser,
  markNotificationAsViewed,
  dismissNotification,

  // 의견 관련
  getCommentsByNewsId,
  createComment,
  deleteComment,
  markCommentAsRead,

  // 통계
  getNewsStatistics,
  getUpcomingEvents
} from '../controllers/customer-news.controller.js';

const router = express.Router();

// ============================================
// 고객소식 기본 CRUD
// ============================================

// GET /api/customer-news - 전체 고객소식 조회 (필터링 지원)
router.get('/', authenticate, getAllCustomerNews);

// ============================================
// 특수 경로 (MUST BE BEFORE /:id)
// ============================================

// GET /api/customer-news/my-news-with-comments - 내 고객소식과 의견 조회
router.get('/my-news-with-comments', authenticate, getMyNewsWithComments);

// ============================================
// 고객소식 기본 CRUD (계속)
// ============================================

// GET /api/customer-news/:id - 특정 고객소식 조회
router.get('/:id', authenticate, getCustomerNewsById);

// POST /api/customer-news - 고객소식 작성
router.post('/', authenticate, createCustomerNews);

// PUT /api/customer-news/:id - 고객소식 수정
router.put('/:id', authenticate, updateCustomerNews);

// DELETE /api/customer-news/:id - 고객소식 삭제
router.delete('/:id', authenticate, deleteCustomerNews);

// ============================================
// 카테고리별 조회
// ============================================

// GET /api/customer-news/category/:category - 카테고리별 조회
router.get('/category/:category', authenticate, getNewsByCategory);

// GET /api/customer-news/company/:companyId - 거래처별 조회
router.get('/company/:companyId', authenticate, getNewsByCompany);

// GET /api/customer-news/employee/:employeeName - 작성자별 조회
router.get('/employee/:employeeName', authenticate, getNewsByEmployee);

// ============================================
// 알림 관련
// ============================================

// GET /api/customer-news/notifications/me - 내 알림 조회
router.get('/notifications/me', authenticate, getNotificationsForUser);

// POST /api/customer-news/notifications/:newsId/view - 알림 조회 카운트 증가
router.post('/notifications/:newsId/view', authenticate, markNotificationAsViewed);

// POST /api/customer-news/notifications/:newsId/dismiss - 더이상 보지 않기
router.post('/notifications/:newsId/dismiss', authenticate, dismissNotification);

// ============================================
// 의견 (Comments) 관련
// ============================================

// GET /api/customer-news/:newsId/comments - 특정 소식의 의견 조회
router.get('/:newsId/comments', authenticate, getCommentsByNewsId);

// POST /api/customer-news/:newsId/comments - 의견 작성
router.post('/:newsId/comments', authenticate, createComment);

// DELETE /api/customer-news/comments/:commentId - 의견 삭제
router.delete('/comments/:commentId', authenticate, deleteComment);

// PUT /api/customer-news/comments/:commentId/read - 의견 읽음 처리
router.put('/comments/:commentId/read', authenticate, markCommentAsRead);

// ============================================
// 통계 및 기타
// ============================================

// GET /api/customer-news/statistics/overview - 통계 요약
router.get('/statistics/overview', authenticate, getNewsStatistics);

// GET /api/customer-news/events/upcoming - 다가오는 이벤트 (생일, 기념일 등)
router.get('/events/upcoming', authenticate, getUpcomingEvents);

export default router;
