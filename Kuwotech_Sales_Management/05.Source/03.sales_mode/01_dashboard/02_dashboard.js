/**
 * ============================================
 * KUWOTECH 영업관리 시스템 - 대시보드
 * 파일: 02_dashboard.js
 * Created by: Daniel.K
 * Date: 2025-01-27
 * 
 * [NAVIGATION: 파일 개요]
 * - KPI 카드를 표시하는 대시보드 페이지
 * - 글래스모피즘 3D 효과를 적용한 KPI 카드 컴포넌트 사용
 * - displayKPICardsWithGlass() 함수로 KPI 카드 생성
 * - KPIGrid 컴포넌트 사용 (05_kpi_card.js)
 * 
 * [NAVIGATION: 주요 함수]
 * - initDashboard(): 대시보드 초기화
 * - loadDashboardData(): 데이터 로드
 * - displayKPICardsWithGlass(): KPI 카드 표시 (글래스모피즘 적용)
 * - displayCharts(): 차트 표시
 * - displayRecentActivity(): 최근 활동 표시
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

import logger from '../../01.common/23_logger.js';

// ErrorHandler 임포트
import errorHandler, { DatabaseError, AuthError, NotFoundError } from '../../01.common/24_error_handler.js';

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
        return;
    }

    try {
        showLoading('대시보드 데이터를 불러오는 중...');

        // 글래스모피즘 시스템 초기화
        if (glassmorphism && typeof glassmorphism.init === 'function') {
            glassmorphism.init();
        }

        // 새로고침 버튼 이벤트 리스너 등록
        const btnRefresh = document.getElementById('btnRefreshKPI');
        if (btnRefresh) {
            btnRefresh.addEventListener('click', refreshDashboard);
        }

        // 대시보드 데이터 로드
        try {
            await loadDashboardData();
        } catch (error) {
            await errorHandler.handle(
                new DatabaseError('대시보드 데이터 로드 실패', error, {
                    userMessage: 'KPI 데이터를 불러올 수 없습니다. 빈 데이터로 표시합니다.',
                    context: {
                        module: 'sales_dashboard',
                        action: 'initDashboard',
                        fallback: 'emptyData'
                    },
                    severity: 'MEDIUM'
                }),
                { showToUser: false }
            );
            // 데이터 로드 실패 시 빈 객체로 초기화
            dashboardData = createEmptyKPIData();
        }

        // KPI 카드 표시 (글래스모피즘 적용) - 데이터 유무와 관계없이 표시
        displayKPICardsWithGlass();

        // 자동 새로고침 설정 (5분마다) - 타이머 ID 저장
        refreshTimer = setInterval(refreshDashboard, 300000);

        hideLoading();
        isInitialized = true;

    } catch (error) {
        await errorHandler.handle(
            new DatabaseError('대시보드 초기화 실패', error, {
                userMessage: '대시보드 로드 중 오류가 발생했습니다.',
                context: {
                    module: 'sales_dashboard',
                    action: 'initDashboard',
                    user: user?.name
                },
                severity: 'HIGH'
            }),
            { showToUser: true }
        );
        hideLoading();

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
        담당거래처: 0,
        활성거래처: 0,
        활성화율: 0,
        주요제품판매거래처: 0,
        회사배정기준대비달성율: 0,
        주요고객처목표달성율: 0,
        누적매출금액: 0,
        주요제품매출액: 0,
        매출집중도: 0,
        누적수금금액: 0,
        매출채권잔액: 0,
        주요제품매출비율: 0,
        전체매출기여도: 0,
        주요제품매출기여도: 0
    };
}
// ============================================
// [SECTION: 대시보드 데이터 로드]
// ============================================

async function loadDashboardData() {
    try {
        // 사용자 정보 확인 (데이터베이스 스키마 기준 id 필드 사용)
        if (!user || !user.id) {
            const authError = new AuthError('사용자 정보 없음', null, {
                userMessage: '사용자 정보를 찾을 수 없습니다.',
                context: {
                    module: 'sales_dashboard',
                    action: 'loadDashboardData',
                    user
                },
                severity: 'HIGH'
            });
            await errorHandler.handle(authError, { showToUser: false });
            throw authError;
        }

        // 영업담당 KPI 조회 (데이터베이스 id 필드 사용)
        const empId = user.id;
        const response = await dbManager.request(`/kpi/sales/${encodeURIComponent(empId)}`);

        if (response.success) {
            dashboardData = response.data;
        } else {
            throw new Error(response.message || 'KPI 데이터 로드 실패');
        }

    } catch (error) {
        if (!(error instanceof AuthError)) {
            const dbError = new DatabaseError('KPI 데이터 로드 실패', error, {
                userMessage: 'KPI 데이터를 불러오는 중 오류가 발생했습니다.',
                context: {
                    module: 'sales_dashboard',
                    action: 'loadDashboardData',
                    empId: user?.id,
                    endpoint: `/kpi/sales/${user?.id}`
                },
                severity: 'HIGH'
            });
            await errorHandler.handle(dbError, { showToUser: true });
            throw dbError;
        }
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
        logger.warn('[KPI 카드] 데이터가 없습니다. 빈 데이터로 표시합니다.');
        dashboardData = createEmptyKPIData();
    }


    // 섹션 1: 거래처 관리 지표 (4개)
    const section1Config = [
        {
            title: '담당거래처',
            value: dashboardData.담당거래처 || 0,
            unit: '개사',
            icon: '🏢',
            formula: '불용제외 배정된 거래처 수',
            style: { color: 'primary', size: 'md', animated: true }
        },
        {
            title: '활성거래처',
            value: dashboardData.활성거래처 || 0,
            unit: '개사',
            icon: '✅',
            formula: '거래상태가 활성인 거래처',
            style: { color: 'success', size: 'md', animated: true }
        },
        {
            title: '활성화율',
            value: dashboardData.활성화율 || 0,
            unit: '%',
            icon: '📊',
            formula: '활성거래처 ÷ 담당거래처 × 100',
            style: { color: 'info', size: 'md', animated: true }
        },
        {
            title: '주요제품판매거래처',
            value: dashboardData.주요제품판매거래처 || 0,
            unit: '개사',
            icon: '⭐',
            formula: '주요제품을 구매한 거래처 수',
            style: { color: 'warning', size: 'md', animated: true, highlighted: true }
        }
    ];

    // 섹션 2: 목표 달성 지표 (2개)
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
            formula: '((담당거래처 ÷ 80) - 1) × 100',
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
            formula: '((주요제품판매거래처 ÷ 40) - 1) × 100',
            style: {
                color: (dashboardData.주요고객처목표달성율 || 0) >= 0 ? 'success' : 'danger',
                size: 'md',
                animated: true
            }
        }
    ];

    // 섹션 3: 매출 성과 지표 (4개)
    const section3Config = [
        {
            title: '누적매출금액',
            value: dashboardData.누적매출금액 || 0,
            unit: '원',
            icon: '💰',
            formula: '∑(기간별 전체 매출액)',
            style: { color: 'primary', size: 'lg', animated: true, highlighted: true }
        },
        {
            title: '주요제품매출액',
            value: dashboardData.주요제품매출액 || 0,
            unit: '원',
            icon: '💎',
            formula: '∑(주요제품 매출액)',
            style: { color: 'info', size: 'md', animated: true }
        },
        {
            title: '매출집중도',
            value: dashboardData.매출집중도 || 0,
            unit: '원',
            icon: '📈',
            formula: '(누적매출금액 ÷ 담당거래처) ÷ 현재월수',
            style: { color: 'success', size: 'md', animated: true, highlighted: true }
        },
        {
            title: '주요제품매출비율',
            value: dashboardData.주요제품매출비율 || 0,
            unit: '%',
            icon: '📊',
            formula: '주요제품매출액 ÷ 누적매출금액 × 100',
            style: { color: 'info', size: 'md', animated: true }
        }
    ];

    // 섹션 4: 재무 및 기여도 지표 (4개)
    const section4Config = [
        {
            title: '누적수금금액',
            value: dashboardData.누적수금금액 || 0,
            unit: '원',
            icon: '💳',
            formula: '∑(기간별 수금액)',
            style: { color: 'success', size: 'md', animated: true }
        },
        {
            title: '매출채권잔액',
            value: dashboardData.매출채권잔액 || 0,
            unit: '원',
            icon: '📋',
            formula: '누적매출금액 - 누적수금금액',
            style: { color: 'warning', size: 'md', animated: true }
        },
        {
            title: '전체매출기여도',
            value: dashboardData.전체매출기여도 || 0,
            unit: '%',
            icon: '🌟',
            formula: '개인 누적매출 ÷ 전사 누적매출 × 100',
            style: { color: 'primary', size: 'md', animated: true }
        },
        {
            title: '주요제품매출기여도',
            value: dashboardData.주요제품매출기여도 || 0,
            unit: '%',
            icon: '⭐',
            formula: '개인 주요제품매출 ÷ 전사 주요제품매출 × 100',
            style: { color: 'success', size: 'md', animated: true }
        }
    ];

    // 각 섹션 렌더링
    renderKPISection('kpiSection1', section1Config);
    renderKPISection('kpiSection2', section2Config);
    renderKPISection('kpiSection3', section3Config);
    renderKPISection('kpiSection4', section4Config);

}

/**
 * KPI 섹션 렌더링 헬퍼
 */
function renderKPISection(sectionId, kpiConfig) {
    const container = document.getElementById(sectionId);
    if (!container) {
        // UI 요소 누락은 로그만 남기고 계속 진행
        logger.warn(`[KPI 섹션] ${sectionId} 컨테이너를 찾을 수 없습니다.`);
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
    } catch (error) {
        errorHandler.handle(
            new NotFoundError(`KPI 섹션 렌더링 실패: ${sectionId}`, error, {
                userMessage: '카드를 표시할 수 없습니다.',
                context: {
                    module: 'sales_dashboard',
                    action: 'renderKPISection',
                    sectionId,
                    cardCount: kpiConfig?.length
                },
                severity: 'MEDIUM'
            }),
            { showToUser: false }
        );
        container.innerHTML = '<p style="color: red;">카드 렌더링 실패</p>';
    }
}

// 기존 함수 유지 (호환성)
function displayKPICards() {
    displayKPICardsWithGlass();
}
// ============================================
// [SECTION: 대시보드 새로고침]
// ============================================

async function refreshDashboard() {
    try {
        // DOM이 존재하는지 확인 (다른 페이지로 이동했을 수 있음)
        const section1 = document.getElementById('kpiSection1');
        if (!section1) {
            return;
        }

        showLoading('데이터를 새로고침하는 중...');
        await loadDashboardData();
        displayKPICardsWithGlass();
        hideLoading();
        showToast('데이터가 새로고침되었습니다.', 'success');
    } catch (error) {
        await errorHandler.handle(
            new DatabaseError('대시보드 새로고침 실패', error, {
                userMessage: '새로고침 중 오류가 발생했습니다.',
                context: {
                    module: 'sales_dashboard',
                    action: 'refreshDashboard'
                },
                severity: 'LOW'
            }),
            { showToUser: true }
        );
        hideLoading();
    }
}

// 타이머 정리 함수
function cleanupDashboard() {
    if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
    }
    isInitialized = false;
}

// ============================================
// [SECTION: 이벤트 리스너]
// ============================================

// 페이지 로드 이벤트 리스닝 (sales_layout.js에서 발생)
window.addEventListener('pageLoaded', (e) => {
    if (e.detail && e.detail.page === 'dashboard') {
        initDashboard();
    }
});

// DOM이 이미 로드되었고 pageLoaded 이벤트가 발생하지 않은 경우에만 직접 초기화
if (document.readyState !== 'loading') {
    // 100ms 대기 후 초기화되지 않았으면 실행
    setTimeout(() => {
        if (!isInitialized) {
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

