/**
 * ============================================
 * 영업담당모드 - 관리자의견 확인
 * ============================================
 * 관리자가 작성한 의견이 포함된 보고서를 조회하고 읽기 전용으로 표시
 *
 * 기능:
 * 1. 관리자 의견이 작성된 보고서 목록 조회 (본인 보고서만)
 * 2. 보고서 상세 내용 표시 (읽기 전용)
 * 3. 관리자 의견 표시 (읽기 전용)
 */

import ApiManager from '../../01.common/13_api_manager.js';
import { formatDate, formatCurrency } from '../../01.common/03_format.js';

// ============================================
// 전역 변수
// ============================================
const apiManager = new ApiManager();

let allReportsWithFeedback = [];  // 관리자 의견이 있는 보고서 목록
let selectedReportId = null;      // 현재 선택된 보고서 ID
let currentUserName = null;       // 현재 로그인한 사용자 이름

// ============================================
// 초기화
// ============================================
async function init() {
    console.log('📝 관리자의견 확인 페이지 초기화...');

    // 사용자 정보 가져오기
    const userJson = localStorage.getItem('user');
    if (userJson) {
        try {
            const user = JSON.parse(userJson);
            currentUserName = user.name;
            console.log('현재 사용자:', currentUserName);
        } catch (e) {
            console.error('❌ 사용자 정보 파싱 실패:', e);
            alert('로그인 정보를 읽을 수 없습니다. 다시 로그인해주세요.');
            return;
        }
    } else {
        console.error('❌ 사용자 정보 없음');
        alert('로그인 정보를 찾을 수 없습니다. 다시 로그인해주세요.');
        return;
    }

    // 새로고침 버튼 이벤트
    const btnRefresh = document.getElementById('btnRefresh');
    if (btnRefresh) {
        btnRefresh.addEventListener('click', async () => {
            console.log('🔄 데이터 새로고침...');
            await loadReportsWithFeedback();
        });
    }

    // 데이터 로드
    await loadReportsWithFeedback();
}

// ============================================
// 데이터 로드
// ============================================

/**
 * 관리자 의견이 있는 보고서 목록 로드
 */
async function loadReportsWithFeedback() {
    try {
        console.log('📋 관리자 의견이 있는 보고서 로드 중...');
        console.log('현재 사용자:', currentUserName);

        // 본인의 전체 보고서 조회
        const response = await apiManager.getReports({
            employeeName: currentUserName
        });

        console.log('📦 보고서 API 원본 응답:', response);
        console.log('📦 응답 타입:', typeof response);
        console.log('📦 Array.isArray(response):', Array.isArray(response));
        console.log('📦 response.data 존재:', !!response?.data);
        console.log('📦 response.data 타입:', typeof response?.data);
        console.log('📦 Array.isArray(response.data):', Array.isArray(response?.data));
        console.log('📦 response 키들:', response ? Object.keys(response) : 'null');

        let reports = [];
        if (Array.isArray(response)) {
            reports = response;
            console.log('✅ 직접 배열 형태');
        } else if (response && Array.isArray(response.data)) {
            reports = response.data;
            console.log('✅ response.data 배열 형태');
        } else if (response && response.data && Array.isArray(response.data.reports)) {
            // ✅ 실제 구조: response.data.reports
            reports = response.data.reports;
            console.log('✅ response.data.reports 배열 형태');
        } else if (response && response.success && Array.isArray(response.reports)) {
            reports = response.reports;
            console.log('✅ response.reports 배열 형태');
        } else {
            console.error('❌ 알 수 없는 응답 형태:', response);
            console.error('❌ response.data:', response?.data);
        }

        console.log(`📊 전체 보고서 수: ${reports.length}`);

        if (reports.length > 0) {
            console.log('📋 첫 번째 보고서 샘플:', reports[0]);
            console.log('📋 adminComment 필드들:', reports.map(r => ({
                reportId: r.reportId,
                adminComment: r.adminComment,
                hasComment: !!r.adminComment
            })));
        }

        // 관리자 의견이 있는 보고서만 필터링 (adminComment 필드 사용)
        allReportsWithFeedback = reports.filter(report => {
            const hasComment = report.adminComment && report.adminComment.trim().length > 0;
            if (hasComment) {
                console.log(`✅ 의견 있음: ${report.reportId}`, report.adminComment);
            }
            return hasComment;
        });

        console.log(`✅ 관리자 의견이 있는 보고서: ${allReportsWithFeedback.length}건`);

        // 통계 카드 업데이트
        updateStatistics(reports.length, allReportsWithFeedback.length);

        // UI 렌더링
        renderReportList();

    } catch (error) {
        console.error('❌ 보고서 로드 실패:', error);
        console.error('❌ 에러 스택:', error.stack);
        alert('보고서 목록을 불러오는데 실패했습니다.');
    }
}

// ============================================
// 통계 업데이트
// ============================================

/**
 * 통계 카드 업데이트
 */
function updateStatistics(totalCount, feedbackCount) {
    console.log(`📊 통계 업데이트 함수 호출: 전체 ${totalCount}건, 의견 ${feedbackCount}건`);

    const totalReportsEl = document.getElementById('totalReports');
    const feedbackReportsEl = document.getElementById('feedbackReports');

    console.log('📊 totalReportsEl:', totalReportsEl);
    console.log('📊 feedbackReportsEl:', feedbackReportsEl);

    if (totalReportsEl) {
        totalReportsEl.textContent = totalCount;
        console.log('✅ 전체 보고서 수 업데이트:', totalCount);
    } else {
        console.error('❌ totalReports 요소를 찾을 수 없음');
    }

    if (feedbackReportsEl) {
        feedbackReportsEl.textContent = feedbackCount;
        console.log('✅ 의견 작성됨 수 업데이트:', feedbackCount);
    } else {
        console.error('❌ feedbackReports 요소를 찾을 수 없음');
    }
}

// ============================================
// UI 렌더링
// ============================================

/**
 * 보고서 리스트 렌더링
 */
function renderReportList() {
    const reportListEl = document.getElementById('reportList');
    const feedbackCountEl = document.getElementById('feedbackCount');

    if (!reportListEl || !feedbackCountEl) {
        console.error('❌ 리스트 요소를 찾을 수 없음');
        return;
    }

    // 카운트 업데이트
    feedbackCountEl.textContent = allReportsWithFeedback.length;

    // 리스트가 비어있는 경우
    if (allReportsWithFeedback.length === 0) {
        reportListEl.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📭</div>
                <div class="empty-state-text">의견이 작성된 보고서가 없습니다</div>
            </div>
        `;
        return;
    }

    // 날짜순 정렬 (최신순)
    const sortedReports = [...allReportsWithFeedback].sort((a, b) =>
        new Date(b.submittedDate) - new Date(a.submittedDate)
    );

    // 리스트 HTML 생성
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
        console.error('❌ 상세 영역을 찾을 수 없거나 보고서 데이터 없음');
        return;
    }

    // 🔍 디버깅: processedBy 필드 확인
    console.log('=== 보고서 상세 렌더링 디버깅 ===');
    console.log('📋 전체 보고서 객체:', report);
    console.log('👤 submittedBy (영업담당):', report.submittedBy);
    console.log('👔 processedBy (관리자):', report.processedBy);
    console.log('📅 processedDate:', report.processedDate);
    console.log('💬 adminComment:', report.adminComment);
    console.log('===============================');

    // 데이터 파싱
    const activityNotes = parseJSON(report.activityNotes, []);
    const targetProducts = parseJSON(report.targetProducts, []);
    const soldProducts = parseJSON(report.soldProducts, []);

    detailContentEl.innerHTML = `
        <!-- 헤더 -->
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

        <!-- 실적 정보 -->
        <div class="report-section">
            <div class="section-title">
                💰 실적 정보
            </div>
            <div class="report-grid">
                <div class="report-field">
                    <div class="field-label">목표 수금액</div>
                    <div class="field-value highlight">
                        ${formatCurrency(report.targetCollectionAmount)}
                    </div>
                </div>
                <div class="report-field">
                    <div class="field-label">실제 수금액</div>
                    <div class="field-value ${report.actualCollectionAmount > 0 ? 'success' : ''}">
                        ${formatCurrency(report.actualCollectionAmount)}
                    </div>
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
                    <div class="field-value highlight">
                        ${formatCurrency(report.targetSalesAmount)}
                    </div>
                </div>
                <div class="report-field">
                    <div class="field-label">실제 매출액</div>
                    <div class="field-value ${report.actualSalesAmount > 0 ? 'success' : ''}">
                        ${formatCurrency(report.actualSalesAmount)}
                    </div>
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
                        ${targetProducts.length > 0
                            ? targetProducts.map(p => p.name).join(', ')
                            : '-'}
                        ${soldProducts.length > 0
                            ? `<br><span class="success" style="font-size: 0.9em;">실제: ${soldProducts.map(p => p.name || p).join(', ')}</span>`
                            : ''}
                    </div>
                </div>
            </div>
        </div>

        <!-- 영업활동 내역 -->
        <div class="report-section">
            <div class="section-title">
                📝 영업활동 내역
            </div>
            ${activityNotes.length > 0 ? `
                <div class="activity-list">
                    ${activityNotes.map(activity => `
                        <div class="activity-item">
                            <div class="activity-company">${activity.companyName || '회사명 없음'}</div>
                            <div class="activity-content">${activity.content || '-'}</div>
                        </div>
                    `).join('')}
                </div>
            ` : `
                <div class="opinion-empty">영업활동 내역이 없습니다</div>
            `}
        </div>

        <!-- 관리자 의견 -->
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

// ============================================
// 이벤트 핸들러
// ============================================

/**
 * 보고서 클릭 핸들러
 */
window.handleReportClick = function(reportId) {
    console.log('보고서 클릭:', reportId);

    selectedReportId = reportId;
    const report = allReportsWithFeedback.find(r => r.reportId === reportId);

    if (!report) {
        console.error('❌ 보고서를 찾을 수 없음:', reportId);
        return;
    }

    // UI 업데이트
    renderReportList();  // 선택 상태 업데이트
    renderReportDetail(report);
};

// ============================================
// 유틸리티 함수
// ============================================

/**
 * JSON 문자열 파싱 (에러 처리 포함)
 */
function parseJSON(jsonString, defaultValue = null) {
    if (!jsonString) return defaultValue;

    try {
        if (typeof jsonString === 'string') {
            return JSON.parse(jsonString);
        }
        return jsonString;
    } catch (e) {
        console.warn('JSON 파싱 실패:', e);
        return defaultValue;
    }
}

/**
 * 미이행 금액 계산 (목표 - 실제)
 */
function calculateUnachieved(target, actual) {
    const targetAmount = Number(target) || 0;
    const actualAmount = Number(actual) || 0;
    const unachieved = targetAmount - actualAmount;
    return unachieved > 0 ? unachieved : 0;
}

/**
 * 달성률 계산 (실제 / 목표 * 100)
 */
function calculateAchievementRate(actual, target) {
    const targetAmount = Number(target) || 0;
    const actualAmount = Number(actual) || 0;

    if (targetAmount === 0) return 0;

    const rate = (actualAmount / targetAmount) * 100;
    return Math.round(rate * 10) / 10; // 소수점 첫째자리까지
}

// ============================================
// 페이지 로드 시 초기화
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOMContentLoaded 이벤트 발생');
    init();
});

// 즉시 실행도 시도 (레이아웃에서 동적 로드되는 경우 대비)
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    console.log('🚀 페이지 이미 로드됨 - 즉시 초기화');
    setTimeout(() => init(), 100);
}
