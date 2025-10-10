/**
 * ============================================
 * KUWOTECH 영업관리 시스템 - 관리자 대시보드
 * 파일: 02_dashboard.js
 * Created by: Daniel.K
 * Date: 2025-01-28
 *
 * [NAVIGATION: 파일 개요]
 * - 관리자 KPI 카드를 표시하는 대시보드 페이지
 * - 글래스모피즘 3D 효과를 적용한 KPI 카드 컴포넌트 사용
 * - 14개 KPI를 4개 섹션으로 그룹화
 * - 순위 모달 팝업 (전체매출기여도, 주요제품매출기여도)
 * ============================================
 */

// ============================================
// [SECTION: 공통 모듈 임포트]
// ============================================

import {
    GlobalConfig,
    formatNumber,
    formatCurrency,
    formatPercent,
    formatDate,
    formatDateTime,
    formatTime,
    showToast,
    showLoading,
    hideLoading,
    translateToKorean
} from '../../01.common/20_common_index.js';

// 글래스모피즘 매니저 추가
import {
    glassmorphism,
    applyGlassmorphism,
    createGlassCard,
    createKPICard as createGlassKPICard,
    createGlassButton
} from '../../01.common/07_design.js';

// KPI 카드 컴포넌트 추가
import { KPICard, KPIGrid } from '../../08.components/05_kpi_card.js';

// DatabaseManager 추가
import { DatabaseManager } from '../../06.database/01_database_manager.js';

// KPI Calculator 추가
import {
    formatKPIValue,
    formatAchievementRate
} from '../../01.common/21_kpi_calculator.js';

// ============================================
// [SECTION: 전역 변수]
// ============================================

const user = JSON.parse(sessionStorage.getItem('user') || '{}');
const dbManager = new DatabaseManager();
let dashboardData = null;
let refreshTimer = null; // 자동 새로고침 타이머 ID

// ============================================
// [SECTION: 유틸리티 함수]
// ============================================

// formatTime과 formatDateTime은 03_format.js에서 import하여 사용

// ============================================
// [SECTION: 초기화]
// ============================================

// 초기화 플래그
let isInitialized = false;

async function initDashboard() {
    // 중복 초기화 방지
    if (isInitialized) {
        console.log('[관리자 대시보드] 이미 초기화됨 - 스킵');
        return;
    }

    try {
        console.log('[관리자 대시보드] 초기화 시작');
        showLoading('대시보드 데이터를 불러오는 중...');

        // 글래스모피즘 시스템 초기화
        if (glassmorphism && typeof glassmorphism.init === 'function') {
            glassmorphism.init();
            console.log('[글래스모피즘] 시스템 초기화 완료');
        }

        // 새로고침 버튼 이벤트 리스너 등록
        const btnRefresh = document.getElementById('btnRefreshKPI');
        if (btnRefresh) {
            btnRefresh.addEventListener('click', refreshDashboard);
            console.log('[관리자 대시보드] 새로고침 버튼 이벤트 등록 완료');
        }

        // 대시보드 데이터 로드
        try {
            await loadDashboardData();
        } catch (error) {
            console.error('[관리자 대시보드] 데이터 로드 실패, 빈 데이터로 표시:', error);
            // 데이터 로드 실패 시 빈 객체로 초기화
            dashboardData = createEmptyKPIData();
        }

        // KPI 카드 표시 (글래스모피즘 적용) - 데이터 유무와 관계없이 표시
        displayKPICardsWithGlass();

        // 자동 새로고침 설정 (5분마다) - 타이머 ID 저장
        refreshTimer = setInterval(refreshDashboard, 300000);

        hideLoading();
        isInitialized = true;
        console.log('[관리자 대시보드] 초기화 완료 - 자동 새로고침 활성화');

    } catch (error) {
        console.error('[관리자 대시보드] 초기화 실패:', error);
        hideLoading();
        showToast('대시보드 로드 중 오류가 발생했습니다.', 'error');

        // 초기화 실패해도 빈 카드는 표시
        dashboardData = createEmptyKPIData();
        displayKPICardsWithGlass();
    }
}

/**
 * 빈 KPI 데이터 생성
 */
function createEmptyKPIData() {
    return {
        전체거래처: 0,
        활성거래처: 0,
        활성화율: 0,
        주요제품판매거래처: 0,
        회사배정기준대비달성율: 0,
        주요고객처목표달성율: 0,
        누적매출금액: 0,
        누적수금금액: 0,
        매출채권잔액: 0,
        주요제품매출액: 0,
        매출집중도: 0,
        주요제품매출비율: 0
    };
}

// ============================================
// [SECTION: 대시보드 데이터 로드]
// ============================================

async function loadDashboardData() {
    try {
        // 관리자 KPI 조회
        const response = await dbManager.request('/kpi/admin');

        if (response.success) {
            dashboardData = response.data;
            console.log('[관리자 대시보드] KPI 데이터 로드 완료:', dashboardData);
        } else {
            throw new Error(response.message || 'KPI 데이터 로드 실패');
        }

    } catch (error) {
        console.error('[관리자 대시보드] 데이터 로드 실패:', error);
        showToast('KPI 데이터를 불러오는 중 오류가 발생했습니다.', 'error');
        throw error;
    }
}

// ============================================
// [SECTION: KPI 카드 표시 헬퍼]
// ============================================

// ============================================
// [SECTION: KPI 카드 표시 - 4개 섹션으로 그룹화]
// ============================================

function displayKPICardsWithGlass() {
    if (!dashboardData) {
        console.warn('[KPI 카드] 데이터가 없습니다. 빈 데이터로 표시합니다.');
        dashboardData = createEmptyKPIData();
    }

    console.log('[KPI 카드] 렌더링 시작, 데이터:', dashboardData);

    // 섹션 1: 전사 거래처 지표 (4개)
    const section1Config = [
        {
            title: '전체거래처',
            value: dashboardData.전체거래처 || 0,
            unit: '개사',
            icon: '🏢',
            formula: '전체 영업담당 불용제외 거래처 종합',
            style: { color: 'primary', size: 'md', animated: true }
        },
        {
            title: '활성거래처',
            value: dashboardData.활성거래처 || 0,
            unit: '개사',
            icon: '✅',
            formula: '거래상태가 활성인 거래처 총합',
            style: { color: 'success', size: 'md', animated: true }
        },
        {
            title: '활성화율',
            value: dashboardData.활성화율 || 0,
            unit: '%',
            icon: '📊',
            formula: '활성거래처 ÷ 전체거래처 × 100',
            style: { color: 'info', size: 'md', animated: true }
        },
        {
            title: '주요제품판매거래처',
            value: dashboardData.주요제품판매거래처 || 0,
            unit: '개사',
            icon: '⭐',
            formula: '주요제품을 구매한 거래처 총합',
            style: { color: 'warning', size: 'md', animated: true, highlighted: true }
        }
    ];

    // 섹션 2: 전사 목표 달성 (2개)
    const section2Config = [
        {
            title: '회사배정기준대비달성율',
            value: (() => {
                const val = dashboardData.회사배정기준대비달성율 || 0;
                const formatted = formatPercent(Math.abs(val) / 100, 2, false);
                return val >= 0
                    ? `${formatted} 초과배정`
                    : `(${formatted}) 미달배정`;
            })(),
            unit: '',
            icon: '🎯',
            formula: '((전체거래처 ÷ (80 × 영업담당자수)) - 1) × 100',
            style: {
                color: (dashboardData.회사배정기준대비달성율 || 0) >= 0 ? 'success' : 'danger',
                size: 'md',
                animated: true
            }
        },
        {
            title: '주요고객처목표달성율',
            value: (() => {
                const val = dashboardData.주요고객처목표달성율 || 0;
                const formatted = formatPercent(Math.abs(val) / 100, 2, false);
                return val >= 0
                    ? `${formatted} 목표 초과`
                    : `(${formatted}) 목표 미달`;
            })(),
            unit: '',
            icon: '🏆',
            formula: '((주요제품판매거래처 ÷ (40 × 영업담당자수)) - 1) × 100',
            style: {
                color: (dashboardData.주요고객처목표달성율 || 0) >= 0 ? 'success' : 'danger',
                size: 'md',
                animated: true
            }
        }
    ];

    // 섹션 3: 전사 매출 지표 (6개)
    const section3Config = [
        {
            title: '누적매출금액',
            value: dashboardData.누적매출금액 || 0,
            unit: '원',
            icon: '💰',
            formula: '∑(전체 영업담당 누적매출)',
            style: { color: 'primary', size: 'lg', animated: true, highlighted: true }
        },
        {
            title: '누적수금금액',
            value: dashboardData.누적수금금액 || 0,
            unit: '원',
            icon: '💳',
            formula: '∑(전체 영업담당 누적수금)',
            style: { color: 'success', size: 'md', animated: true }
        },
        {
            title: '매출채권잔액',
            value: dashboardData.매출채권잔액 || 0,
            unit: '원',
            icon: '📋',
            formula: '전사 누적매출 - 전사 누적수금',
            style: { color: 'warning', size: 'md', animated: true }
        },
        {
            title: '주요제품매출액',
            value: dashboardData.주요제품매출액 || 0,
            unit: '원',
            icon: '💎',
            formula: '∑(전체 영업담당 주요제품매출)',
            style: { color: 'info', size: 'md', animated: true }
        },
        {
            title: '매출집중도',
            value: dashboardData.매출집중도 || 0,
            unit: '원',
            icon: '📈',
            formula: '(전사 누적매출금액 ÷ 전사 담당거래처) ÷ 현재월수',
            style: { color: 'success', size: 'md', animated: true, highlighted: true }
        },
        {
            title: '주요제품매출비율',
            value: dashboardData.주요제품매출비율 || 0,
            unit: '%',
            icon: '📊',
            formula: '전사 주요제품매출 ÷ 전사 누적매출 × 100',
            style: { color: 'info', size: 'md', animated: true }
        }
    ];

    // 섹션 4: 전사 기여도 지표 (2개)
    const section4Config = [
        {
            title: '전체매출기여도',
            value: '상세보기',
            unit: '',
            icon: '🌟',
            description: '영업담당자별 순위 보기',
            style: { color: 'primary', size: 'md', animated: true, clickable: true },
            onClick: () => showRankingModal('total')
        },
        {
            title: '주요제품매출기여도',
            value: '상세보기',
            unit: '',
            icon: '⭐',
            description: '영업담당자별 순위 보기',
            style: { color: 'success', size: 'md', animated: true, clickable: true },
            onClick: () => showRankingModal('main')
        }
    ];

    // 각 섹션 렌더링
    renderKPISection('kpiSection1', section1Config);
    renderKPISection('kpiSection2', section2Config);
    renderKPISection('kpiSection3', section3Config);
    renderKPISection('kpiSection4', section4Config);

    console.log('[KPI 카드] 14개 지표 4개 섹션 렌더링 완료');
}

/**
 * KPI 섹션 렌더링 헬퍼
 */
function renderKPISection(sectionId, kpiConfig) {
    const container = document.getElementById(sectionId);
    if (!container) {
        console.error(`[KPI 섹션] ${sectionId} 컨테이너를 찾을 수 없습니다.`);
        return;
    }

    try {
        // 섹션별 정확한 컬럼 수 설정 (한 줄 배치를 위해)
        const kpiGrid = new KPIGrid({
            cards: kpiConfig,
            columns: kpiConfig.length,  // ✅ 카드 개수만큼 컬럼 생성
            minWidth: '0px',            // ✅ 최소 너비 제거 (균등 분할 우선)
            gap: 'clamp(8px, 1.5vw, 20px)',
            responsive: false            // ✅ 반응형 비활성화 (CSS가 제어)
        });

        container.innerHTML = '';
        container.appendChild(kpiGrid.render());
        console.log(`[KPI 섹션] ${sectionId} 렌더링 완료 (${kpiConfig.length}개 카드, ${kpiConfig.length}컬럼)`);
    } catch (error) {
        console.error(`[KPI 섹션] ${sectionId} 렌더링 실패:`, error);
        container.innerHTML = '<p class="error-message">카드 렌더링 실패</p>';
    }
}

// ============================================
// [SECTION: 순위 모달]
// ============================================

/**
 * 영업담당자별 순위 모달 표시
 * @param {string} type - 'total' (전체매출) | 'main' (주요제품매출)
 */
async function showRankingModal(type) {
    try {
        showLoading('순위 데이터를 불러오는 중...');

        // 순위 데이터 조회
        const response = await dbManager.request(`/kpi/admin/ranking/${type}`);

        if (!response.success) {
            throw new Error(response.message || '순위 데이터 로드 실패');
        }

        const rankings = response.data;

        // 모달 HTML 생성
        const title = type === 'total' ? '전체매출기여도 순위' : '주요제품매출기여도 순위';

        // 순위 데이터 매핑 (API 응답 구조에 맞춤, 음수 규칙 적용)
        // 누적기여도 계산을 위한 running sum
        let cumulativeContribution = 0;

        const tableRows = rankings.map(rank => {
            const salesAmount = type === 'total' ? rank.누적매출금액 : rank.주요제품매출액;
            const contributionRate = type === 'total' ? rank.전체매출기여도 : rank.주요제품매출기여도;

            // 누적기여도 계산 (1등부터 현재 순위까지의 합산)
            cumulativeContribution += contributionRate;

            // 음수 규칙 적용 - 매출액
            const currencyResult = formatCurrency(salesAmount, true);
            let salesFormatted, salesClass = '';
            if (typeof currencyResult === 'object') {
                salesFormatted = currencyResult.text;
                salesClass = currencyResult.isNegative ? currencyResult.className : '';
            } else {
                salesFormatted = currencyResult;
            }

            // 음수 규칙 적용 - 기여도
            const contributionResult = formatPercent(contributionRate / 100, 2, true);
            let contributionFormatted, contributionClass = '';
            if (typeof contributionResult === 'object') {
                contributionFormatted = contributionResult.text;
                contributionClass = contributionResult.isNegative ? contributionResult.className : '';
            } else {
                contributionFormatted = contributionResult;
            }

            // 음수 규칙 적용 - 누적기여도
            const cumulativeResult = formatPercent(cumulativeContribution / 100, 2, true);
            let cumulativeFormatted, cumulativeClass = '';
            if (typeof cumulativeResult === 'object') {
                cumulativeFormatted = cumulativeResult.text;
                cumulativeClass = cumulativeResult.isNegative ? cumulativeResult.className : '';
            } else {
                cumulativeFormatted = cumulativeResult;
            }

            return `
                <tr class="rank-${rank.rank}">
                    <td class="rank-number">${getRankBadge(rank.rank)}</td>
                    <td class="employee-name">${rank.employeeName}</td>
                    <td class="sales-amount ${salesClass}">${salesFormatted}</td>
                    <td class="contribution-rate ${contributionClass}">${contributionFormatted}</td>
                    <td class="cumulative-contribution ${cumulativeClass}">${cumulativeFormatted}</td>
                </tr>
            `;
        }).join('');

        const modalHTML = `
            <div class="ranking-modal-overlay" id="rankingModal">
                <div class="ranking-modal-content glass-modal glass-layered glass-shimmer">
                    <div class="ranking-modal-header bg-layer-2">
                        <h2 class="text-on-layer-2">${title}</h2>
                        <button class="ranking-modal-close glass-button" onclick="closeRankingModal()">✕</button>
                    </div>
                    <div class="ranking-modal-body">
                        <table class="ranking-table glass-panel">
                            <thead>
                                <tr class="bg-layer-3">
                                    <th class="text-on-layer-3 text-center">순위</th>
                                    <th class="text-on-layer-3 text-left">영업담당</th>
                                    <th class="text-on-layer-3 text-right">매출액</th>
                                    <th class="text-on-layer-3 text-right">기여도</th>
                                    <th class="text-on-layer-3 text-right">누적기여도</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${tableRows}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        // 모달 DOM에 추가
        const modalDiv = document.createElement('div');
        modalDiv.innerHTML = modalHTML;
        document.body.appendChild(modalDiv.firstElementChild);

        hideLoading();

    } catch (error) {
        console.error('[순위 모달] 로드 실패:', error);
        hideLoading();
        showToast('순위 데이터를 불러오는 중 오류가 발생했습니다.', 'error');
    }
}

/**
 * 순위 배지 생성
 */
function getRankBadge(rank) {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `${rank}위`;
}

/**
 * 순위 모달 닫기
 */
function closeRankingModal() {
    const modal = document.getElementById('rankingModal');
    if (modal) {
        modal.remove();
    }
}

// 전역 노출 (클릭 이벤트용)
window.showRankingModal = showRankingModal;
window.closeRankingModal = closeRankingModal;

// ============================================
// [SECTION: 대시보드 새로고침]
// ============================================

async function refreshDashboard() {
    try {
        // DOM이 존재하는지 확인 (다른 페이지로 이동했을 수 있음)
        const section1 = document.getElementById('kpiSection1');
        if (!section1) {
            console.log('[관리자 대시보드] DOM이 존재하지 않음 - 새로고침 스킵');
            return;
        }

        console.log('[관리자 대시보드] 자동 새로고침');
        showLoading('데이터를 새로고침하는 중...');
        await loadDashboardData();
        displayKPICardsWithGlass();
        hideLoading();
        showToast('데이터가 새로고침되었습니다.', 'success');
    } catch (error) {
        console.error('[관리자 대시보드] 새로고침 실패:', error);
        hideLoading();
        showToast('새로고침 중 오류가 발생했습니다.', 'error');
    }
}

// 타이머 정리 함수
function cleanupDashboard() {
    if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
        console.log('[관리자 대시보드] 자동 새로고침 타이머 정리됨');
    }
    isInitialized = false;
}

// ============================================
// [SECTION: 이벤트 리스너]
// ============================================

// 페이지 로드 이벤트 리스닝 (admin_layout.js에서 발생)
window.addEventListener('pageLoaded', (e) => {
    if (e.detail && e.detail.page === 'dashboard') {
        console.log('[관리자 대시보드] pageLoaded 이벤트 수신');
        initDashboard();
    }
});

// DOM이 이미 로드되었고 pageLoaded 이벤트가 발생하지 않은 경우에만 직접 초기화
if (document.readyState !== 'loading') {
    // 100ms 대기 후 초기화되지 않았으면 실행
    setTimeout(() => {
        if (!isInitialized) {
            console.log('[관리자 대시보드] 직접 초기화 실행');
            initDashboard();
        }
    }, 100);
}

// ============================================
// [SECTION: 전역 노출 (필요시 사용)]
// ============================================

// 전역으로 노출 (디버깅 및 외부 접근용)
window.dashboardModule = {
    initDashboard,
    refreshDashboard,
    cleanupDashboard,
    getDashboardData: () => dashboardData
};

// 페이지 언로드 시 타이머 정리 (다른 페이지로 이동할 때)
window.addEventListener('beforePageChange', cleanupDashboard);
window.addEventListener('beforeunload', cleanupDashboard);

console.log('[관리자 대시보드] 모듈 전역 노출 완료');
