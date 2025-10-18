/**
 * ============================================
 * 고객소식 알림 매니저
 * ============================================
 *
 * 기능:
 * - 로그인 시 사용자 알림 자동 조회
 * - 알림 모달 표시 (최대 3회)
 * - 알림 조회 카운트 증가
 * - "다시 보지 않기" 기능
 */

import { GlobalConfig } from './01_global_config.js';
import { showToast } from './14_toast.js';
import logger from './23_logger.js';

class NotificationManager {
    constructor() {
        this.notifications = [];
        this.currentNotificationIndex = 0;
        this.modalElement = null;
        this.isInitialized = false;
    }

    /**
     * 초기화 및 알림 체크
     */
    async initialize() {
        if (this.isInitialized) {
            logger.warn('⚠️ [알림매니저] 이미 초기화됨');
            return;
        }

        logger.info('🔔 [알림매니저] 초기화 시작');

        // 모달 HTML 생성
        this.createModalElement();

        // 알림 조회
        await this.checkNotifications();

        this.isInitialized = true;
    }

    /**
     * 알림 조회 API 호출
     */
    async checkNotifications() {
        try {
            const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

            if (!token) {
                logger.warn('⚠️ [알림매니저] 인증 토큰 없음');
                return;
            }

            const response = await fetch(`${GlobalConfig.API_BASE_URL}/api/customer-news/notifications/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            this.notifications = result.data.notifications || [];

            logger.info(`🔔 [알림매니저] ${this.notifications.length}개의 알림 조회됨`);

            // 알림이 있으면 첫 번째 알림 표시
            if (this.notifications.length > 0) {
                this.currentNotificationIndex = 0;
                this.showNotification(this.notifications[0]);
            }

        } catch (error) {
            logger.error('❌ [알림매니저] 알림 조회 실패:', error);
            // 알림 조회 실패는 치명적이지 않으므로 사용자에게 에러 표시하지 않음
        }
    }

    /**
     * 알림 모달 HTML 요소 생성
     */
    createModalElement() {
        // 이미 존재하면 제거
        const existingModal = document.getElementById('customer-news-notification-modal');
        if (existingModal) {
            existingModal.remove();
        }

        const modalHTML = `
            <div id="customer-news-notification-modal" class="notification-modal hidden">
                <div class="notification-overlay"></div>
                <div class="notification-content glass-panel glass-3d-element">
                    <div class="notification-header">
                        <h2 class="notification-title">📢 고객소식 알림</h2>
                        <button class="notification-close" id="notification-close-btn">✕</button>
                    </div>

                    <div class="notification-body">
                        <div class="notification-meta">
                            <span class="notification-category"></span>
                            <span class="notification-priority"></span>
                        </div>
                        <div class="notification-company"></div>
                        <div class="notification-news-title"></div>
                        <div class="notification-date"></div>
                        <div class="notification-content-text"></div>
                    </div>

                    <div class="notification-footer">
                        <div class="notification-counter"></div>
                        <div class="notification-actions">
                            <button class="btn-notification btn-dismiss" id="notification-dismiss-btn">
                                🚫 다시 보지 않기
                            </button>
                            <button class="btn-notification btn-confirm" id="notification-confirm-btn">
                                ✅ 확인
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.modalElement = document.getElementById('customer-news-notification-modal');

        // 이벤트 리스너 등록
        this.attachEventListeners();

        // 스타일 추가
        this.injectStyles();
    }

    /**
     * 이벤트 리스너 등록
     */
    attachEventListeners() {
        const closeBtn = document.getElementById('notification-close-btn');
        const dismissBtn = document.getElementById('notification-dismiss-btn');
        const confirmBtn = document.getElementById('notification-confirm-btn');
        const overlay = this.modalElement.querySelector('.notification-overlay');

        closeBtn?.addEventListener('click', () => this.closeModal());
        overlay?.addEventListener('click', () => this.closeModal());
        dismissBtn?.addEventListener('click', () => this.dismissNotification());
        confirmBtn?.addEventListener('click', () => this.confirmNotification());
    }

    /**
     * 알림 모달 표시
     */
    showNotification(notification) {
        if (!notification) return;

        logger.info(`📢 [알림매니저] 알림 표시:`, notification.title);

        // 모달 내용 채우기
        const categoryBadge = this.modalElement.querySelector('.notification-category');
        const priorityBadge = this.modalElement.querySelector('.notification-priority');
        const companyEl = this.modalElement.querySelector('.notification-company');
        const titleEl = this.modalElement.querySelector('.notification-news-title');
        const dateEl = this.modalElement.querySelector('.notification-date');
        const contentEl = this.modalElement.querySelector('.notification-content-text');
        const counterEl = this.modalElement.querySelector('.notification-counter');

        if (categoryBadge) categoryBadge.textContent = notification.category;
        if (priorityBadge) {
            priorityBadge.textContent = notification.priority;
            priorityBadge.className = `notification-priority priority-${notification.priority}`;
        }
        if (companyEl) companyEl.textContent = `🏢 ${notification.companyName}`;
        if (titleEl) titleEl.textContent = notification.title;
        if (dateEl) dateEl.textContent = `📅 ${this.formatDate(notification.newsDate)}`;
        if (contentEl) contentEl.textContent = notification.content;
        if (counterEl) {
            const current = this.currentNotificationIndex + 1;
            const total = this.notifications.length;
            counterEl.textContent = `${current} / ${total}`;
        }

        // 모달 표시
        this.modalElement.classList.remove('hidden');
        this.modalElement.classList.add('active');

        // 조회 카운트 증가
        this.markAsViewed(notification.id);
    }

    /**
     * 알림 조회 카운트 증가
     */
    async markAsViewed(newsId) {
        try {
            const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

            const response = await fetch(`${GlobalConfig.API_BASE_URL}/api/customer-news/notifications/${newsId}/view`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                logger.info(`👁️ [알림매니저] 조회 카운트 증가: ${newsId}`);
            }

        } catch (error) {
            logger.error('❌ [알림매니저] 조회 카운트 증가 실패:', error);
        }
    }

    /**
     * "다시 보지 않기" 처리
     */
    async dismissNotification() {
        const currentNotification = this.notifications[this.currentNotificationIndex];

        if (!currentNotification) return;

        try {
            const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

            const response = await fetch(`${GlobalConfig.API_BASE_URL}/api/customer-news/notifications/${currentNotification.id}/dismiss`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                logger.info(`🚫 [알림매니저] 알림 해제: ${currentNotification.id}`);
                showToast('다시 보지 않기로 설정되었습니다.', 'info');

                // 다음 알림 표시 또는 모달 닫기
                this.showNextOrClose();
            } else {
                throw new Error('알림 해제 실패');
            }

        } catch (error) {
            logger.error('❌ [알림매니저] 알림 해제 실패:', error);
            showToast('알림 해제 중 오류가 발생했습니다.', 'error');
        }
    }

    /**
     * "확인" 버튼 처리
     */
    confirmNotification() {
        logger.info('✅ [알림매니저] 알림 확인');

        // 다음 알림 표시 또는 모달 닫기
        this.showNextOrClose();
    }

    /**
     * 다음 알림 표시 또는 모달 닫기
     */
    showNextOrClose() {
        this.currentNotificationIndex++;

        if (this.currentNotificationIndex < this.notifications.length) {
            // 다음 알림 표시
            this.showNotification(this.notifications[this.currentNotificationIndex]);
        } else {
            // 모든 알림 확인 완료
            this.closeModal();
        }
    }

    /**
     * 모달 닫기
     */
    closeModal() {
        if (this.modalElement) {
            this.modalElement.classList.remove('active');
            this.modalElement.classList.add('hidden');
            logger.info('🔔 [알림매니저] 모달 닫기');
        }
    }

    /**
     * 날짜 포맷팅
     */
    formatDate(dateString) {
        if (!dateString) return '';

        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        return `${year}년 ${month}월 ${day}일`;
    }

    /**
     * 스타일 주입
     */
    injectStyles() {
        const styleId = 'notification-manager-styles';

        // 이미 존재하면 제거
        const existingStyle = document.getElementById(styleId);
        if (existingStyle) {
            existingStyle.remove();
        }

        const styles = `
            <style id="${styleId}">
                .notification-modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    z-index: 10000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    opacity: 0;
                    pointer-events: none;
                    transition: opacity 0.3s ease;
                }

                .notification-modal.active {
                    opacity: 1;
                    pointer-events: all;
                }

                .notification-modal.hidden {
                    display: none;
                }

                .notification-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.6);
                    backdrop-filter: blur(8px);
                }

                .notification-content {
                    position: relative;
                    width: 90%;
                    max-width: 600px;
                    max-height: 80vh;
                    overflow-y: auto;
                    background: rgba(255, 255, 255, 0.95);
                    border-radius: 20px;
                    padding: 0;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                    animation: slideIn 0.3s ease-out;
                }

                @keyframes slideIn {
                    from {
                        transform: translateY(-50px);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }

                .notification-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 24px 28px;
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                    border-radius: 20px 20px 0 0;
                    color: white;
                }

                .notification-title {
                    margin: 0;
                    font-size: 22px;
                    font-weight: 700;
                }

                .notification-close {
                    background: rgba(255, 255, 255, 0.2);
                    border: none;
                    color: white;
                    font-size: 24px;
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s ease;
                }

                .notification-close:hover {
                    background: rgba(255, 255, 255, 0.3);
                    transform: rotate(90deg);
                }

                .notification-body {
                    padding: 28px;
                }

                .notification-meta {
                    display: flex;
                    gap: 12px;
                    margin-bottom: 16px;
                }

                .notification-category {
                    display: inline-block;
                    padding: 6px 14px;
                    background: rgba(59, 130, 246, 0.15);
                    color: #2563eb;
                    border-radius: 20px;
                    font-size: 13px;
                    font-weight: 600;
                }

                .notification-priority {
                    display: inline-block;
                    padding: 6px 14px;
                    border-radius: 20px;
                    font-size: 13px;
                    font-weight: 600;
                }

                .notification-priority.priority-보통 {
                    background: rgba(107, 114, 128, 0.15);
                    color: #4b5563;
                }

                .notification-priority.priority-낮음 {
                    background: rgba(34, 197, 94, 0.15);
                    color: #16a34a;
                }

                .notification-priority.priority-높음 {
                    background: rgba(249, 115, 22, 0.15);
                    color: #ea580c;
                }

                .notification-priority.priority-긴급 {
                    background: rgba(239, 68, 68, 0.15);
                    color: #dc2626;
                    animation: pulse 2s ease-in-out infinite;
                }

                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.7; }
                }

                .notification-company {
                    font-size: 16px;
                    font-weight: 600;
                    color: #1f2937;
                    margin-bottom: 12px;
                }

                .notification-news-title {
                    font-size: 20px;
                    font-weight: 700;
                    color: #111827;
                    margin-bottom: 12px;
                    line-height: 1.4;
                }

                .notification-date {
                    font-size: 14px;
                    color: #6b7280;
                    margin-bottom: 20px;
                }

                .notification-content-text {
                    font-size: 15px;
                    line-height: 1.7;
                    color: #374151;
                    white-space: pre-wrap;
                    background: rgba(249, 250, 251, 0.8);
                    padding: 16px;
                    border-radius: 12px;
                    border-left: 4px solid #10b981;
                }

                .notification-footer {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 20px 28px;
                    background: rgba(249, 250, 251, 0.5);
                    border-radius: 0 0 20px 20px;
                    border-top: 1px solid rgba(0, 0, 0, 0.05);
                }

                .notification-counter {
                    font-size: 14px;
                    font-weight: 600;
                    color: #6b7280;
                }

                .notification-actions {
                    display: flex;
                    gap: 12px;
                }

                .btn-notification {
                    padding: 10px 20px;
                    border: none;
                    border-radius: 10px;
                    font-size: 15px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .btn-dismiss {
                    background: rgba(239, 68, 68, 0.1);
                    color: #dc2626;
                }

                .btn-dismiss:hover {
                    background: rgba(239, 68, 68, 0.2);
                    transform: translateY(-2px);
                }

                .btn-confirm {
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                    color: white;
                }

                .btn-confirm:hover {
                    background: linear-gradient(135deg, #059669 0%, #047857 100%);
                    transform: translateY(-2px);
                    box-shadow: 0 8px 20px rgba(16, 185, 129, 0.4);
                }

                /* 반응형 */
                @media (max-width: 768px) {
                    .notification-content {
                        width: 95%;
                        max-height: 90vh;
                    }

                    .notification-header {
                        padding: 20px 24px;
                    }

                    .notification-title {
                        font-size: 18px;
                    }

                    .notification-body {
                        padding: 24px;
                    }

                    .notification-footer {
                        flex-direction: column;
                        gap: 16px;
                        align-items: stretch;
                    }

                    .notification-actions {
                        width: 100%;
                        flex-direction: column;
                    }

                    .btn-notification {
                        width: 100%;
                    }
                }
            </style>
        `;

        document.head.insertAdjacentHTML('beforeend', styles);
    }
}

// 싱글톤 인스턴스 생성
const notificationManager = new NotificationManager();

export default notificationManager;
