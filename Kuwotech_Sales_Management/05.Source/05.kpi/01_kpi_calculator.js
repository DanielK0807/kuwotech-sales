/**
 * KUWOTECH 영업관리 시스템 - KPI 계산 엔진
 * Created by: Daniel.K
 * Date: 2025-09-27
 * Owner: Kang Jung Hwan
 * 
 * 주요 기능:
 * - 주요제품 3단계 우선순위
 * - 현재월수 계산 (1년 미만/이상)
 * - 매출집중도 계산
 * - 달성율 계산
 */

// ============================================
// [섹션: Import]
// ============================================

import dbManager from '../06.database/01_database_manager.js';

// ============================================
// [섹션: 주요제품 3단계 우선순위]
// ============================================

/**
 * 주요제품 판매 거래처 계산
 * 1단계: 임플란트
 * 2단계: 지르코니아 (1단계 제외)
 * 3단계: Abutment (1,2단계 제외)
 */
export function calculateMainProducts(companies) {
    const mainProducts = ['임플란트', '지르코니아', 'Abutment'];
    const results = new Set();
    
    // 1단계: 임플란트 포함
    companies.forEach(company => {
        if (company.salesProduct && company.salesProduct.includes('임플란트')) {
            results.add(company.keyValue);
        }
    });
    
    const step1Count = results.size;
    console.log(`[주요제품 1단계: 임플란트] ${step1Count}개`);
    
    // 2단계: 지르코니아 포함 (1단계 제외)
    companies.forEach(company => {
        if (!results.has(company.keyValue) && 
            company.salesProduct && 
            company.salesProduct.includes('지르코니아')) {
            results.add(company.keyValue);
        }
    });
    
    const step2Count = results.size - step1Count;
    console.log(`[주요제품 2단계: 지르코니아] ${step2Count}개 (누적: ${results.size}개)`);
    
    // 3단계: Abutment 포함 (1,2단계 제외)
    companies.forEach(company => {
        if (!results.has(company.keyValue) && 
            company.salesProduct && 
            company.salesProduct.includes('Abutment')) {
            results.add(company.keyValue);
        }
    });
    
    const step3Count = results.size - step1Count - step2Count;
    console.log(`[주요제품 3단계: Abutment] ${step3Count}개 (총: ${results.size}개)`);
    
    return results.size;
}

/**
 * 주요제품 우선순위 상세 정보 반환
 */
export function calculateMainProductsDetailed(companies) {
    const results = {
        step1: new Set(), // 임플란트
        step2: new Set(), // 지르코니아 (1단계 제외)
        step3: new Set(), // Abutment (1,2단계 제외)
        total: new Set()
    };
    
    // 1단계: 임플란트 포함 거래처
    companies.forEach(company => {
        if (company.salesProduct && company.salesProduct.includes('임플란트')) {
            results.step1.add(company.keyValue);
            results.total.add(company.keyValue);
        }
    });
    
    console.log(`[1단계: 임플란트] ${results.step1.size}개`);
    
    // 2단계: 지르코니아 포함 (1단계 제외)
    companies.forEach(company => {
        if (!results.total.has(company.keyValue) && 
            company.salesProduct && 
            company.salesProduct.includes('지르코니아')) {
            results.step2.add(company.keyValue);
            results.total.add(company.keyValue);
        }
    });
    
    console.log(`[2단계: 지르코니아] ${results.step2.size}개 (누적: ${results.total.size}개)`);
    
    // 3단계: Abutment 포함 (1,2단계 제외)
    companies.forEach(company => {
        if (!results.total.has(company.keyValue) && 
            company.salesProduct && 
            company.salesProduct.includes('Abutment')) {
            results.step3.add(company.keyValue);
            results.total.add(company.keyValue);
        }
    });
    
    console.log(`[3단계: Abutment] ${results.step3.size}개 (누적: ${results.total.size}개)`);
    
    return {
        step1Count: results.step1.size,
        step2Count: results.step2.size,
        step3Count: results.step3.size,
        totalCount: results.total.size,
        step1Companies: Array.from(results.step1),
        step2Companies: Array.from(results.step2),
        step3Companies: Array.from(results.step3)
    };
}

// ============================================
// [섹션: 현재월수 계산]
// ============================================

/**
 * 현재월수 계산
 * 1년 이상: 올해 1월 1일 기준
 * 1년 미만: 입사일 기준
 */
export function calculateCurrentMonth(hireDate) {
    const hire = new Date(hireDate);
    const now = new Date();
    
    // 근무 기간 계산 (년 단위)
    const yearsDiff = (now - hire) / (1000 * 60 * 60 * 24 * 365);
    
    if (yearsDiff > 1) {
        // 1년 이상 근무: 올해 1월 1일부터 현재까지
        const yearStart = new Date(now.getFullYear(), 0, 1);
        const monthsSinceYearStart = Math.floor((now - yearStart) / (1000 * 60 * 60 * 24 * 30));
        
        console.log(`[현재월수] 1년 이상 근무자 → 올해 1월 1일부터 ${monthsSinceYearStart}개월`);
        return monthsSinceYearStart;
        
    } else {
        // 1년 미만: 입사일부터 현재까지
        const monthsSinceHire = Math.floor((now - hire) / (1000 * 60 * 60 * 24 * 30));
        
        console.log(`[현재월수] 1년 미만 근무자 → 입사일부터 ${monthsSinceHire}개월`);
        return monthsSinceHire;
    }
}

/**
 * 현재월수 상세 계산
 */
export function calculateCurrentMonthDetailed(hireDate) {
    const hire = new Date(hireDate);
    const now = new Date();
    
    // 근무 일수
    const daysDiff = (now - hire) / (1000 * 60 * 60 * 24);
    const yearsDiff = daysDiff / 365;
    
    console.log(`[입사일] ${hire.toLocaleDateString()}`);
    console.log(`[현재일] ${now.toLocaleDateString()}`);
    console.log(`[근무기간] ${daysDiff.toFixed(0)}일 (${yearsDiff.toFixed(2)}년)`);
    
    if (yearsDiff > 1) {
        // 1년 이상: 올해 1월 1일 기준
        const yearStart = new Date(now.getFullYear(), 0, 1);
        const daysFromYearStart = (now - yearStart) / (1000 * 60 * 60 * 24);
        const monthsFromYearStart = Math.floor(daysFromYearStart / 30);
        
        console.log(`[판단] 1년 이상 근무 → 올해 1월 1일 기준`);
        console.log(`[계산] ${now.getFullYear()}년 1월 1일부터 ${daysFromYearStart.toFixed(0)}일 = ${monthsFromYearStart}개월`);
        
        return {
            currentMonth: monthsFromYearStart,
            calculationType: '1년 이상',
            baseDate: yearStart,
            days: Math.floor(daysFromYearStart)
        };
        
    } else {
        // 1년 미만: 입사일 기준
        const monthsFromHire = Math.floor(daysDiff / 30);
        
        console.log(`[판단] 1년 미만 근무 → 입사일 기준`);
        console.log(`[계산] 입사일부터 ${daysDiff.toFixed(0)}일 = ${monthsFromHire}개월`);
        
        return {
            currentMonth: monthsFromHire,
            calculationType: '1년 미만',
            baseDate: hire,
            days: Math.floor(daysDiff)
        };
    }
}

// ============================================
// [섹션: 매출집중도 계산]
// ============================================

/**
 * 매출집중도 = 누적매출금액 / 담당거래처 / 현재월수
 */
export function calculateSalesConcentration(totalSales, totalCompanies, currentMonth) {
    if (totalCompanies === 0 || currentMonth === 0) {
        console.log('[매출집중도] 거래처 또는 월수가 0 → 0 반환');
        return 0;
    }
    
    // 매출집중도 = 누적매출금액 / 담당거래처 / 현재월수
    const concentration = totalSales / totalCompanies / currentMonth;
    
    console.log(`[매출집중도] ${totalSales.toLocaleString()} / ${totalCompanies} / ${currentMonth} = ${Math.round(concentration).toLocaleString()}`);
    
    return concentration;
}

/**
 * 매출집중도 상세 계산
 */
export function calculateSalesConcentrationDetailed(totalSales, totalCompanies, currentMonth) {
    console.log('=== 매출집중도 계산 ===');
    console.log(`누적매출금액: ${totalSales.toLocaleString()}원`);
    console.log(`담당거래처: ${totalCompanies}개`);
    console.log(`현재월수: ${currentMonth}개월`);
    
    // 예외 처리
    if (totalCompanies === 0) {
        console.log('[결과] 거래처 0개 → 매출집중도 0');
        return { concentration: 0, interpretation: '거래처 없음' };
    }
    
    if (currentMonth === 0) {
        console.log('[결과] 월수 0개월 → 매출집중도 0');
        return { concentration: 0, interpretation: '신입사원' };
    }
    
    // 매출집중도 = 누적매출금액 / 담당거래처 / 현재월수
    const concentration = totalSales / totalCompanies / currentMonth;
    
    console.log(`[계산] ${totalSales.toLocaleString()} ÷ ${totalCompanies} ÷ ${currentMonth}`);
    console.log(`[결과] 매출집중도: ${concentration.toLocaleString()}원`);
    console.log(`[의미] 거래처 1개당 월 평균 ${Math.round(concentration).toLocaleString()}원`);
    
    return {
        concentration: concentration,
        perCompany: totalSales / totalCompanies,
        perMonth: totalSales / currentMonth,
        interpretation: `거래처당 월평균 ${Math.round(concentration).toLocaleString()}원`
    };
}

// ============================================
// [섹션: 활성 거래처 판단]
// ============================================

/**
 * 활성 거래처 판단
 * 조건: 사업현황이 '활성' 또는 누적매출금액 > 0
 */
export function isActiveCompany(company) {
    return company.businessStatus === '활성' || 
           (company.accumulatedSales && company.accumulatedSales > 0);
}

// ============================================
// [섹션: 주요제품 판단]
// ============================================

/**
 * 주요제품 판단
 */
export function isMainProduct(salesProduct) {
    if (!salesProduct) return false;
    
    const mainProducts = ['임플란트', '지르코니아', 'Abutment'];
    return mainProducts.some(product => salesProduct.includes(product));
}

// ============================================
// [섹션: 달성율 계산]
// ============================================

/**
 * 달성율 계산
 * 공식: (실제 / 목표 - 1) × 100
 */
export function calculateAchievementRate(actual, target) {
    if (target === 0) return 0;
    
    // (실제 / 목표 - 1) × 100
    const rate = ((actual / target) - 1) * 100;
    
    if (rate >= 0) {
        console.log(`[달성율] ${actual} / ${target} = ${rate.toFixed(2)}% 초과`);
    } else {
        console.log(`[달성율] ${actual} / ${target} = (${Math.abs(rate).toFixed(2)})% 미달`);
    }
    
    return rate;
}

// ============================================
// [섹션: 헬퍼 함수 - 직원 관련]
// ============================================

/**
 * 직원 목록 조회
 */
export async function getEmployees() {
    try {
        // dbManager 사용 - getAll 메서드로 데이터 조회
        const employees = await dbManager.getAll('employees');
        return employees || [];
    } catch (error) {
        console.error('[직원 조회 실패]', error);
        return [];
    }
}

/**
 * 영업사원 수 조회
 */
export async function getSalesPersonCount() {
    const employees = await getEmployees();
    const salesCount = employees.filter(emp => emp.role === 'sales').length;
    console.log(`[영업사원 수] ${salesCount}명`);
    return salesCount;
}



// [내용: KPI 계산 엔진]
// 테스트: 주요제품 3단계, 현재월수, 매출집중도, 달성율
// #KPI #계산엔진