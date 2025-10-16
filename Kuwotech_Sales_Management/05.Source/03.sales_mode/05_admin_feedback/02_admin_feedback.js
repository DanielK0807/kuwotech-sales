/**
 * ============================================
 * 영업담당모드 - 관리자 의견 확인
 * ============================================
 * 보고서 및 고객소식에 대한 관리자 의견을 탭으로 구분하여 확인
 *
 * 기능:
 * 1. 탭 전환 (보고서 의견 / 고객소식 의견)
 * 2. 보고서 의견 조회 및 표시
 * 3. 고객소식 의견 조회 및 표시
 */

import ApiManager from '../../01.common/13_api_manager.js';
import { formatDate, formatCurrency } from '../../01.common/03_format.js';
import { parseJSON } from '../../01.common/02_utils.js';
import logger from '../../01.common/23_logger.js';
import { GlobalConfig } from '../../01.common/20_common_index.js';

// ============================================
// 전역 변수
// ============================================
const apiManager = ApiManager.getInstance();

// 보고서 관련
let allReportsWithFeedback = [];
let selectedReportId = null;

// 고객소식 관련
let allNewsWithComments = [];
let selectedNewsId = null;

let currentUserName = null;
let currentTab = 'reports'; // 기본 탭

// ============================================
// 초기화
// ============================================
async function init() {
    // 사용자 정보 가져오기
    const userJson = sessionStorage.getItem('user') || localStorage.getItem('user');
    if (userJson) {
        try {
            const user = JSON.parse(userJson);
            currentUserName = user.name;
        } catch (e) {
            logger.error('❌ 사용자 정보 파싱 실패:', e);
            alert('로그인 정보를 읽을 수 없습니다. 다시 로그인해주세요.');
            return;
        }
    } else {
        logger.error('❌ 사용자 정보 없음');
        alert('로그인 정보를 찾을 수 없습니다. 다시 로그인해주세요.');
        return;
    }

    // 탭 버튼 이벤트
    setupTabButtons();

    // 새로고침 버튼 이벤트
    const btnRefresh = document.getElementById('btnRefresh');
    if (btnRefresh) {
        btnRefresh.addEventListener('click', async () => {
            await loadCurrentTabData();
        });
    }

    // 데이터 로드
    await loadCurrentTabData();
}

// ============================================
// 탭 관리
// ============================================

/**
 * 탭 버튼 이벤트 설정
 */
function setupTabButtons() {
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tab = button.dataset.tab;
            switchTab(tab);
        });
    });
}

/**
 * 탭 전환
 */
async function switchTab(tab) {
    currentTab = tab;

    // 탭 버튼 활성화 상태 변경
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    // 탭 컨텐츠 표시/숨김
    document.getElementById('reportsTab').classList.toggle('active', tab === 'reports');
    document.getElementById('newsTab').classList.toggle('active', tab === 'news');

    // 현재 탭 데이터 로드
    await loadCurrentTabData();
}

/**
 * 현재 탭 데이터 로드
 */
async function loadCurrentTabData() {
    if (currentTab === 'reports') {
        await loadReportsWithFeedback();
    } else {
        await loadNewsWithComments();
    }
}

// ============================================
// 보고서 의견 관련
// ============================================

/**
 * 관리자 의견이 있는 보고서 목록 로드
 */
async function loadReportsWithFeedback() {
    try {
        // 본인의 전체 보고서 조회
        const response = await apiManager.getReports({
            employeeName: currentUserName
        });

        let reports = [];
        if (Array.isArray(response)) {
            reports = response;
        } else if (response && Array.isArray(response.data)) {
            reports = response.data;
        } else if (response && response.data && Array.isArray(response.data.reports)) {
            reports = response.data.reports;
        } else if (response && response.success && Array.isArray(response.reports)) {
            reports = response.reports;
        }

        // 관리자 의견이 있는 보고서만 필터링
        allReportsWithFeedback = reports.filter(report => {
            return report.adminComment && report.adminComment.trim().length > 0;
        });

        // 통계 카드 업데이트
        updateReportStatistics(reports.length, allReportsWithFeedback.length);

        // UI 렌더링
        renderReportList();

    } catch (error) {
        logger.error('❌ 보고서 로드 실패:', error);
        alert('보고서 목록을 불러오는데 실패했습니다.');
    }
}

/**
 * 보고서 통계 업데이트
 */
function updateReportStatistics(totalCount, feedbackCount) {
    const totalReportsEl = document.getElementById('totalReports');
    const feedbackReportsEl = document.getElementById('feedbackReports');

    if (totalReportsEl) {
        totalReportsEl.textContent = totalCount;
    }

    if (feedbackReportsEl) {
        feedbackReportsEl.textContent = feedbackCount;
    }
}

/**
 * 보고서 리스트 렌더링
 */
function renderReportList() {
    const reportListEl = document.getElementById('reportList');
    const feedbackCountEl = document.getElementById('feedbackCount');

    if (!reportListEl || !feedbackCountEl) {
        logger.error('❌ 리스트 요소를 찾을 수 없음');
        return;
    }

    feedbackCountEl.textContent = allReportsWithFeedback.length;

    if (allReportsWithFeedback.length === 0) {
        reportListEl.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📭</div>
                <div class="empty-state-text">의견이 작성된 보고서가 없습니다</div>
            </div>
        `;
        return;
    }

    const sortedReports = [...allReportsWithFeedback].sort((a, b) =>
        new Date(b.submittedDate) - new Date(a.submittedDate)
    );

    reportListEl.innerHTML = sortedReports.map(report => `
        <div class="report-item ${selectedReportId === report.reportId ? 'active' : ''}"
             onclick="handleReportClick('${report.reportId}')">
            <div class="report-date">📅 ${formatDate(report.submittedDate)}</div>
            <div class="report-company">🏢 ${report.companyName || '회사명 없음'}</div>
            <span class="feedback-badge">💬 의견 확인</span>
        </div>
    `).join('');
}

/**
 * 보고서 상세 렌더링
 */
function renderReportDetail(report) {
    const detailContentEl = document.getElementById('detailContent');

    if (!detailContentEl || !report) {
        return;
    }

    const activityNotes = parseJSON(report.activityNotes, []);
    const targetProducts = parseJSON(report.targetProducts, []);
    const soldProducts = parseJSON(report.soldProducts, []);

    detailContentEl.innerHTML = `
        <div class="content-header">
            <h2>📋 실적보고서 상세</h2>
            <div class="report-meta">
                <div class="report-meta-item">
                    <span>📅 제출일:</span>
                    <strong>${formatDate(report.submittedDate)}</strong>
                </div>
                <div class="report-meta-item">
                    <span>🏢 거래처:</span>
                    <strong>${report.companyName || '-'}</strong>
                </div>
                <div class="report-meta-item">
                    <span>👤 작성자:</span>
                    <strong>${report.submittedBy || '-'}</strong>
                </div>
            </div>
        </div>

        <div class="report-section">
            <div class="section-title">💰 실적 정보</div>
            <div class="report-grid">
                <div class="report-field">
                    <div class="field-label">목표 수금액</div>
                    <div class="field-value highlight">${formatCurrency(report.targetCollectionAmount)}</div>
                </div>
                <div class="report-field">
                    <div class="field-label">실제 수금액</div>
                    <div class="field-value ${report.actualCollectionAmount > 0 ? 'success' : ''}">${formatCurrency(report.actualCollectionAmount)}</div>
                </div>
                <div class="report-field">
                    <div class="field-label">미이행 수금액</div>
                    <div class="field-value ${calculateUnachieved(report.targetCollectionAmount, report.actualCollectionAmount) > 0 ? 'warning' : 'success'}">
                        ${formatCurrency(calculateUnachieved(report.targetCollectionAmount, report.actualCollectionAmount))}
                        ${report.targetCollectionAmount > 0 ? ` (${calculateAchievementRate(report.actualCollectionAmount, report.targetCollectionAmount)}%)` : ''}
                    </div>
                </div>
                <div class="report-field">
                    <div class="field-label">목표 매출액</div>
                    <div class="field-value highlight">${formatCurrency(report.targetSalesAmount)}</div>
                </div>
                <div class="report-field">
                    <div class="field-label">실제 매출액</div>
                    <div class="field-value ${report.actualSalesAmount > 0 ? 'success' : ''}">${formatCurrency(report.actualSalesAmount)}</div>
                </div>
                <div class="report-field">
                    <div class="field-label">미이행 매출액</div>
                    <div class="field-value ${calculateUnachieved(report.targetSalesAmount, report.actualSalesAmount) > 0 ? 'warning' : 'success'}">
                        ${formatCurrency(calculateUnachieved(report.targetSalesAmount, report.actualSalesAmount))}
                        ${report.targetSalesAmount > 0 ? ` (${calculateAchievementRate(report.actualSalesAmount, report.targetSalesAmount)}%)` : ''}
                    </div>
                </div>
                <div class="report-field">
                    <div class="field-label">목표 상품</div>
                    <div class="field-value">
                        ${targetProducts.length > 0 ? targetProducts.map(p => p.name).join(', ') : '-'}
                        ${soldProducts.length > 0 ? `<br><span class="success" style="font-size: 0.9em;">실제: ${soldProducts.map(p => p.name || p).join(', ')}</span>` : ''}
                    </div>
                </div>
            </div>
        </div>

        <div class="report-section">
            <div class="section-title">📝 영업활동 내역</div>
            ${activityNotes.length > 0 ? `
                <div class="activity-list">
                    ${activityNotes.map(activity => `
                        <div class="activity-item">
                            <div class="activity-company">${activity.companyName || '회사명 없음'}</div>
                            <div class="activity-content">${activity.content || '-'}</div>
                        </div>
                    `).join('')}
                </div>
            ` : `<div class="opinion-empty">영업활동 내역이 없습니다</div>`}
        </div>

        <div class="admin-opinion-section">
            <div class="opinion-header">
                <h3>💬 관리자 의견</h3>
                <span class="opinion-badge">READ ONLY</span>
            </div>
            <div class="opinion-content">
                ${report.adminComment || '의견이 작성되지 않았습니다.'}
            </div>
            <div class="opinion-footer">
                <span>작성자: ${report.processedBy || '-'}</span>
                <span>작성일: ${report.processedDate ? formatDate(report.processedDate) : '-'}</span>
            </div>
        </div>
    `;
}

/**
 * 보고서 클릭 핸들러
 */
window.handleReportClick = function(reportId) {
    selectedReportId = reportId;
    const report = allReportsWithFeedback.find(r => r.reportId === reportId);

    if (!report) {
        logger.error('❌ 보고서를 찾을 수 없음:', reportId);
        return;
    }

    renderReportList();
    renderReportDetail(report);
};

// ============================================
// 고객소식 의견 관련
// ============================================

/**
 * 관리자 의견이 있는 고객소식 목록 로드
 */
async function loadNewsWithComments() {
    try {
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        if (!token) {
            logger.warn('[고객소식 의견] 토큰이 없습니다.');
            return;
        }

        const API_BASE_URL = GlobalConfig.API_BASE_URL || 'https://kuwotech-sales-production-aa64.up.railway.app';
        const response = await fetch(`${API_BASE_URL}/api/customer-news/my-news-with-comments`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`API 호출 실패: ${response.status}`);
        }

        const data = await response.json();
        const newsData = data.news || [];

        // 관리자 의견이 있는 고객소식만 필터링
        allNewsWithComments = newsData.filter(news => {
            const comments = news.comments || [];
            return comments.some(c => c.commentByRole === '관리자');
        });

        // 통계 카드 업데이트
        updateNewsStatistics(newsData.length, allNewsWithComments.length);

        // UI 렌더링
        renderNewsList();

    } catch (error) {
        logger.error('❌ 고객소식 로드 실패:', error);
        alert('고객소식 목록을 불러오는데 실패했습니다.');
    }
}

/**
 * 고객소식 통계 업데이트
 */
function updateNewsStatistics(totalCount, feedbackCount) {
    const totalNewsEl = document.getElementById('totalNews');
    const feedbackNewsEl = document.getElementById('feedbackNews');

    if (totalNewsEl) {
        totalNewsEl.textContent = totalCount;
    }

    if (feedbackNewsEl) {
        feedbackNewsEl.textContent = feedbackCount;
    }
}

/**
 * 고객소식 리스트 렌더링
 */
function renderNewsList() {
    const newsListEl = document.getElementById('newsList');
    const newsCountEl = document.getElementById('newsCount');

    if (!newsListEl || !newsCountEl) {
        logger.error('❌ 고객소식 리스트 요소를 찾을 수 없음');
        return;
    }

    newsCountEl.textContent = allNewsWithComments.length;

    if (allNewsWithComments.length === 0) {
        newsListEl.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📭</div>
                <div class="empty-state-text">의견이 작성된 고객소식이 없습니다</div>
            </div>
        `;
        return;
    }

    const sortedNews = [...allNewsWithComments].sort((a, b) =>
        new Date(b.newsDate) - new Date(a.newsDate)
    );

    newsListEl.innerHTML = sortedNews.map(news => {
        const adminComments = (news.comments || []).filter(c => c.commentByRole === '관리자');
        return `
            <div class="report-item ${selectedNewsId === news.id ? 'active' : ''}"
                 onclick="handleNewsClick('${news.id}')">
                <div class="report-date">📅 ${formatDate(news.newsDate)}</div>
                <div class="report-company">🏢 ${news.companyName || '회사명 없음'}</div>
                <span class="feedback-badge">💭 의견 ${adminComments.length}개</span>
            </div>
        `;
    }).join('');
}

/**
 * 고객소식 상세 렌더링
 */
function renderNewsDetail(news) {
    const detailContentEl = document.getElementById('newsDetailContent');

    if (!detailContentEl || !news) {
        return;
    }

    const adminComments = (news.comments || []).filter(c => c.commentByRole === '관리자');

    detailContentEl.innerHTML = `
        <div class="content-header">
            <h2>📰 고객소식 상세</h2>
            <div class="report-meta">
                <div class="report-meta-item">
                    <span>📅 날짜:</span>
                    <strong>${formatDate(news.newsDate)}</strong>
                </div>
                <div class="report-meta-item">
                    <span>🏢 거래처:</span>
                    <strong>${news.companyName || '-'}</strong>
                </div>
                <div class="report-meta-item">
                    <span>👤 작성자:</span>
                    <strong>${news.createdBy || '-'}</strong>
                </div>
            </div>
        </div>

        <div class="report-section">
            <div class="section-title">📝 카테고리</div>
            <div class="report-field">
                <div class="field-value">${news.category || '-'}</div>
            </div>
        </div>

        <div class="report-section">
            <div class="section-title">📋 내용</div>
            <div class="opinion-content" style="background: white;">
                ${news.newsContent || '내용이 없습니다.'}
            </div>
        </div>

        ${adminComments.length > 0 ? adminComments.map(comment => `
            <div class="admin-opinion-section">
                <div class="opinion-header">
                    <h3>💬 관리자 의견</h3>
                    <span class="opinion-badge">READ ONLY</span>
                </div>
                <div class="opinion-content">
                    ${comment.comment || '의견이 작성되지 않았습니다.'}
                </div>
                <div class="opinion-footer">
                    <span>작성자: ${comment.commentBy || '-'}</span>
                    <span>작성일: ${formatDate(comment.createdAt)}</span>
                </div>
            </div>
        `).join('') : `
            <div class="admin-opinion-section">
                <div class="opinion-empty">관리자 의견이 없습니다</div>
            </div>
        `}
    `;
}

/**
 * 고객소식 클릭 핸들러
 */
window.handleNewsClick = function(newsId) {
    selectedNewsId = newsId;
    const news = allNewsWithComments.find(n => n.id === Number(newsId));

    if (!news) {
        logger.error('❌ 고객소식을 찾을 수 없음:', newsId);
        return;
    }

    renderNewsList();
    renderNewsDetail(news);
};

// ============================================
// 유틸리티 함수
// ============================================

function calculateUnachieved(target, actual) {
    const targetAmount = Number(target) || 0;
    const actualAmount = Number(actual) || 0;
    const unachieved = targetAmount - actualAmount;
    return unachieved > 0 ? unachieved : 0;
}

function calculateAchievementRate(actual, target) {
    const targetAmount = Number(target) || 0;
    const actualAmount = Number(actual) || 0;

    if (targetAmount === 0) return 0;

    const rate = (actualAmount / targetAmount) * 100;
    return Math.round(rate * 10) / 10;
}

// ============================================
// 페이지 로드 시 초기화
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    init();
});

if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(() => init(), 100);
}
