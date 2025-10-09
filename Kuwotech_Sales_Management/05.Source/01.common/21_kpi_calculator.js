/**
 * ============================================
 * KUWOTECH 영업관리 시스템 - KPI 계산 모듈
 * 파일: 01.common/21_kpi_calculator.js
 * Created by: Daniel.K
 * Date: 2025-01-28
 * 설명: 영업담당/관리자 KPI 계산 공통 함수
 * ============================================
 */

// ============================================
// [영업담당 KPI 계산 - 14개 지표]
// ============================================

/**
 * 영업담당 개인 KPI 계산
 * @param {Object} employee - 직원 정보 (name, joinDate 등)
 * @param {Array} companies - 담당 거래처 배열
 * @param {Object} totals - 전사 집계 데이터 (기여도 계산용)
 * @returns {Object} 14개 KPI 지표
 */
export function calculateSalesKPI(employee, companies, totals = {}) {
    const kpi = {};

    // ============================================
    // 거래처 관리 지표 (4개)
    // ============================================

    // 1. 담당거래처: 거래상태≠'불용'인 거래처 수
    kpi.담당거래처 = companies.filter(c => c.거래상태 !== '불용').length;

    // 2. 활성거래처: 거래상태='활성'인 거래처 수
    kpi.활성거래처 = companies.filter(c => c.거래상태 === '활성').length;

    // 3. 활성화율: (활성거래처/담당거래처) × 100
    kpi.활성화율 = kpi.담당거래처 > 0
        ? (kpi.활성거래처 / kpi.담당거래처) * 100
        : 0;

    // 4. 주요제품판매거래처: 3단계 우선순위 계산
    kpi.주요제품판매거래처 = calculateMainProductCompanies(companies);

    // ============================================
    // 목표 달성 지표 (2개)
    // ============================================

    // 5. 회사배정기준대비 달성율: ((담당거래처/80) - 1) × 100
    kpi.회사배정기준대비달성율 = ((kpi.담당거래처 / 80) - 1) * 100;

    // 6. 주요고객처목표달성율: (주요제품거래처/40) × 100
    kpi.주요고객처목표달성율 = (kpi.주요제품판매거래처 / 40) * 100;

    // ============================================
    // 매출 성과 지표 (3개)
    // ============================================

    // 7. 누적매출금액: SUM(누적매출금액)
    kpi.누적매출금액 = companies.reduce((sum, c) => sum + (parseFloat(c.누적매출금액) || 0), 0);

    // 8. 주요제품매출액: SUM(누적매출금액) WHERE 주요제품
    kpi.주요제품매출액 = calculateMainProductSales(companies);

    // 9. 매출집중도: (누적매출/담당거래처)/현재월수
    const 현재월수 = calculateCurrentMonths(employee.joinDate || employee.입사일자);
    kpi.매출집중도 = kpi.담당거래처 > 0 && 현재월수 > 0
        ? (kpi.누적매출금액 / kpi.담당거래처) / 현재월수
        : 0;

    // ============================================
    // 재무 및 기여도 지표 (5개)
    // ============================================

    // 10. 누적수금금액: SUM(누적수금금액)
    kpi.누적수금금액 = companies.reduce((sum, c) => sum + (parseFloat(c.누적수금금액) || 0), 0);

    // 11. 매출채권잔액: SUM(매출채권잔액)
    kpi.매출채권잔액 = companies.reduce((sum, c) => sum + (parseFloat(c.매출채권잔액) || 0), 0);

    // 12. 주요제품매출비율: (주요제품매출/누적매출) × 100
    kpi.주요제품매출비율 = kpi.누적매출금액 > 0
        ? (kpi.주요제품매출액 / kpi.누적매출금액) * 100
        : 0;

    // 13. 전체매출기여도: (개인 누적매출/전사 누적매출) × 100
    kpi.전체매출기여도 = totals.전사누적매출 > 0
        ? (kpi.누적매출금액 / totals.전사누적매출) * 100
        : 0;

    // 14. 주요제품매출기여도: (개인 주요제품매출/전사 주요제품매출) × 100
    kpi.주요제품매출기여도 = totals.전사주요제품매출 > 0
        ? (kpi.주요제품매출액 / totals.전사주요제품매출) * 100
        : 0;

    // 현재월수 정보 추가 (화면 표시용)
    kpi.현재월수 = 현재월수;
    kpi.담당자명 = `${employee.name || employee.userName}(입사일자: ${employee.joinDate || employee.입사일자 || '미상'})`;

    return kpi;
}

// ============================================
// [관리자 KPI 계산 - 14개 지표]
// ============================================

/**
 * 관리자 전사 KPI 계산
 * @param {Array} allCompanies - 전체 거래처 배열
 * @param {Array} employees - 전체 직원 배열 (영업담당자 수 계산용)
 * @returns {Object} 14개 KPI 지표
 */
export function calculateAdminKPI(allCompanies, employees) {
    const kpi = {};

    // 영업담당자 수 계산 (역할='영업담당')
    const 영업담당자수 = employees.filter(e => e.role === '영업담당' || e.역할 === '영업담당').length;

    // ============================================
    // 전사 거래처 지표 (4개)
    // ============================================

    // 1. 전체거래처: 거래상태≠'불용'인 거래처 수
    kpi.전체거래처 = allCompanies.filter(c => c.거래상태 !== '불용').length;

    // 2. 활성거래처: 거래상태='활성'인 거래처 수
    kpi.활성거래처 = allCompanies.filter(c => c.거래상태 === '활성').length;

    // 3. 활성화율: (활성거래처/전체거래처) × 100
    kpi.활성화율 = kpi.전체거래처 > 0
        ? (kpi.활성거래처 / kpi.전체거래처) * 100
        : 0;

    // 4. 주요제품판매거래처: 3단계 우선순위 계산
    kpi.주요제품판매거래처 = calculateMainProductCompanies(allCompanies);

    // ============================================
    // 전사 목표 달성 (2개)
    // ============================================

    // 5. 회사배정기준대비 달성율: ((전체거래처/(80×영업담당자수)) - 1) × 100
    const 목표거래처수 = 80 * 영업담당자수;
    kpi.회사배정기준대비달성율 = 목표거래처수 > 0
        ? ((kpi.전체거래처 / 목표거래처수) - 1) * 100
        : 0;

    // 6. 주요고객처목표달성율: (주요제품거래처/(40×영업담당자수)) × 100
    const 주요고객목표 = 40 * 영업담당자수;
    kpi.주요고객처목표달성율 = 주요고객목표 > 0
        ? (kpi.주요제품판매거래처 / 주요고객목표) * 100
        : 0;

    // ============================================
    // 전사 매출 지표 (5개)
    // ============================================

    // 7. 누적매출금액: SUM(누적매출금액) 전체
    kpi.누적매출금액 = allCompanies.reduce((sum, c) => sum + (parseFloat(c.누적매출금액) || 0), 0);

    // 8. 누적수금금액: SUM(누적수금금액) 전체
    kpi.누적수금금액 = allCompanies.reduce((sum, c) => sum + (parseFloat(c.누적수금금액) || 0), 0);

    // 9. 매출채권잔액: SUM(매출채권잔액) 전체
    kpi.매출채권잔액 = allCompanies.reduce((sum, c) => sum + (parseFloat(c.매출채권잔액) || 0), 0);

    // 10. 주요제품매출액: SUM(누적매출금액) WHERE 주요제품
    kpi.주요제품매출액 = calculateMainProductSales(allCompanies);

    // 11. 매출집중도: (누적매출/전체거래처)/현재월수
    const 현재월수 = new Date().getMonth(); // 0-11 (관리자는 현재월-1)
    kpi.매출집중도 = kpi.전체거래처 > 0 && 현재월수 > 0
        ? (kpi.누적매출금액 / kpi.전체거래처) / 현재월수
        : 0;

    // ============================================
    // 전사 기여도 지표 (3개)
    // ============================================

    // 12. 주요제품 매출비율: (전사 주요제품매출/전사 누적매출) × 100
    kpi.주요제품매출비율 = kpi.누적매출금액 > 0
        ? (kpi.주요제품매출액 / kpi.누적매출금액) * 100
        : 0;

    // 13. 전체매출기여도: 클릭시 상세 순위 보기 (영업담당자별)
    kpi.전체매출기여도 = '클릭하여 상세 확인'; // 별도 모달에서 표시

    // 14. 주요제품매출기여도: 클릭시 상세 순위 보기 (영업담당자별)
    kpi.주요제품매출기여도 = '클릭하여 상세 확인'; // 별도 모달에서 표시

    // 현재월수 정보 추가
    kpi.현재월수 = 현재월수;
    kpi.영업담당자수 = 영업담당자수;

    return kpi;
}

// ============================================
// [주요제품 3단계 우선순위 계산]
// ============================================

/**
 * 주요제품 판매 거래처 계산 (중복 제거)
 * 1단계: 임플란트 거래처
 * 2단계: 지르코니아 거래처 (1단계 제외)
 * 3단계: Abutment 거래처 (1,2단계 제외)
 *
 * @param {Array} companies - 거래처 배열
 * @returns {number} 주요제품 판매 거래처 수
 */
export function calculateMainProductCompanies(companies) {
    // 1단계: 임플란트 취급 거래처
    const implantCompanies = companies.filter(c =>
        (c.IMPLANT || c.임플란트 || c.implant) &&
        (parseFloat(c.IMPLANT) > 0 || parseFloat(c.임플란트) > 0 || parseFloat(c.implant) > 0)
    );

    // 2단계: 지르코니아 취급 거래처 (1단계 제외)
    const zirconiaCompanies = companies.filter(c => {
        const hasImplant = implantCompanies.some(ic => ic.id === c.id || ic.거래처명 === c.거래처명);
        const hasZirconia = (c.ZIRCONIA || c.지르코니아 || c.zirconia) &&
                           (parseFloat(c.ZIRCONIA) > 0 || parseFloat(c.지르코니아) > 0 || parseFloat(c.zirconia) > 0);
        return !hasImplant && hasZirconia;
    });

    // 3단계: Abutment만 취급 거래처 (1,2단계 제외)
    const abutmentCompanies = companies.filter(c => {
        const hasImplant = implantCompanies.some(ic => ic.id === c.id || ic.거래처명 === c.거래처명);
        const hasZirconia = zirconiaCompanies.some(zc => zc.id === c.id || zc.거래처명 === c.거래처명);
        const hasAbutment = (c.ABUTMENT || c.Abutment || c.abutment) &&
                           (parseFloat(c.ABUTMENT) > 0 || parseFloat(c.Abutment) > 0 || parseFloat(c.abutment) > 0);
        return !hasImplant && !hasZirconia && hasAbutment;
    });

    // 총 주요제품 거래처 수 (중복 제거됨)
    return implantCompanies.length + zirconiaCompanies.length + abutmentCompanies.length;
}

/**
 * 주요제품 매출액 계산
 * @param {Array} companies - 거래처 배열
 * @returns {number} 주요제품 매출 합계
 */
export function calculateMainProductSales(companies) {
    return companies.reduce((sum, c) => {
        let sales = 0;

        // 임플란트 매출
        if (c.IMPLANT || c.임플란트 || c.implant) {
            sales += parseFloat(c.IMPLANT) || parseFloat(c.임플란트) || parseFloat(c.implant) || 0;
        }

        // 지르코니아 매출
        if (c.ZIRCONIA || c.지르코니아 || c.zirconia) {
            sales += parseFloat(c.ZIRCONIA) || parseFloat(c.지르코니아) || parseFloat(c.zirconia) || 0;
        }

        // Abutment 매출
        if (c.ABUTMENT || c.Abutment || c.abutment) {
            sales += parseFloat(c.ABUTMENT) || parseFloat(c.Abutment) || parseFloat(c.abutment) || 0;
        }

        return sum + sales;
    }, 0);
}

// ============================================
// [현재월수 계산]
// ============================================

/**
 * 현재월수 계산 (영업담당 개인용)
 * - 1년 이상 근무: 올해 1월 1일 ~ 현재
 * - 1년 미만 근무: 입사일 ~ 현재
 *
 * @param {string|Date} joinDate - 입사일
 * @returns {number} 현재월수
 */
export function calculateCurrentMonths(joinDate) {
    if (!joinDate) return 1; // 기본값

    const today = new Date();
    const join = new Date(joinDate);

    // 입사일부터 현재까지 경과 일수
    const daysSinceJoin = Math.floor((today - join) / (1000 * 60 * 60 * 24));

    // 1년 이상 근무자 (365일 이상)
    if (daysSinceJoin >= 365) {
        // 올해 1월 1일부터 현재까지
        const yearStart = new Date(today.getFullYear(), 0, 1);
        const daysSinceYearStart = Math.floor((today - yearStart) / (1000 * 60 * 60 * 24));
        return Math.max(1, Math.floor(daysSinceYearStart / 30));
    } else {
        // 1년 미만: 입사일부터 현재까지
        return Math.max(1, Math.floor(daysSinceJoin / 30));
    }
}

// ============================================
// [KPI 값 포맷팅]
// ============================================

/**
 * KPI 값을 화면 표시용으로 포맷팅
 * @param {number} value - 숫자 값
 * @param {string} type - 타입 ('number', 'currency', 'percent')
 * @returns {string} 포맷된 문자열
 */
export function formatKPIValue(value, type = 'number') {
    if (value === null || value === undefined || isNaN(value)) {
        return '-';
    }

    switch (type) {
        case 'currency':
            // 금액: 1,000,000원
            return `${Math.round(value).toLocaleString('ko-KR')}원`;

        case 'percent':
            // 퍼센트: 75.25%
            return `${value.toFixed(2)}%`;

        case 'count':
            // 개수: 82개
            return `${Math.round(value).toLocaleString('ko-KR')}개`;

        case 'number':
        default:
            // 일반 숫자: 1,234,567
            return Math.round(value).toLocaleString('ko-KR');
    }
}

/**
 * 달성율 포맷팅 (초과/미달 표시)
 * @param {number} value - 달성율 (%)
 * @returns {string} 포맷된 문자열
 */
export function formatAchievementRate(value) {
    if (value === null || value === undefined || isNaN(value)) {
        return '-';
    }

    if (value >= 0) {
        return `${value.toFixed(2)}% 초과배정`;
    } else {
        return `(${Math.abs(value).toFixed(2)}) % 미달배정`;
    }
}

// ============================================
// [내보내기]
// ============================================

export default {
    calculateSalesKPI,
    calculateAdminKPI,
    calculateMainProductCompanies,
    calculateMainProductSales,
    calculateCurrentMonths,
    formatKPIValue,
    formatAchievementRate
};
