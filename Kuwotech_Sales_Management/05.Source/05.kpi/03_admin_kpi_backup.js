/**
 * KUWOTECH 영업관리 시스템 - 관리자 KPI 계산
 * Created by: Daniel.K
 * Date: 2025-09-27
 * Owner: Kang Jung Hwan
 * 
 * 전사 KPI 11개:
 * 1-4: 전사 거래처 관련
 * 5-6: 전사 달성율 관련
 * 7-10: 전사 매출 관련
 * 11: 전사 수금 관련
 */

// ============================================
// [섹션: Import]
// ============================================

import dbManager from '../06.database/01_database_manager.js';
import { formatNumber, formatCurrency } from '../01.common/03_format.js';
import { 
    calculateMainProducts, 
    calculateSalesConcentration,
    isActiveCompany,
    isMainProduct,
    calculateAchievementRate,
    getSalesPersonCount
} from './01_kpi_calculator.js';

// ============================================
// [섹션: 관리자 KPI 11개 계산]
// ============================================

/**
 * 관리자(전사) KPI 계산 (11개)
 * @returns {object} 전사 KPI 결과
 */
export async function calculateAdminKPI() {
    console.log('=== 전사 KPI 계산 시작 ===');
    
    try {
        // 전체 거래처 조회 (관리자 권한)
        const allCompanies = await getAllCompanies();
        console.log(`[전체 거래처] 총 ${allCompanies.length}개`);
        
        // ============================================
        // 전사 거래처 관련 KPI (4개)
        // ============================================
        
        // 1. 전체거래처 (불용 제외)
        const totalCompanies = allCompanies.filter(c => c.businessStatus !== '불용').length;
        console.log(`[KPI 1] 전체거래처: ${totalCompanies}개`);
        
        // 2. 활성거래처
        const activeCompanies = allCompanies.filter(c => isActiveCompany(c)).length;
        console.log(`[KPI 2] 활성거래처: ${activeCompanies}개`);
        
        // 3. 활성화율
        const activationRate = totalCompanies > 0 ? 
            (activeCompanies / totalCompanies * 100).toFixed(2) : '0.00';
        console.log(`[KPI 3] 활성화율: ${activationRate}%`);
        
        // 4. 주요제품판매거래처 (3단계 우선순위)
        const mainProductCompanies = calculateMainProducts(allCompanies);
        console.log(`[KPI 4] 주요제품판매거래처: ${mainProductCompanies}개`);
        
        // ============================================
        // 전사 달성율 관련 KPI (2개)
        // ============================================
        
        // 5. 회사배정기준대비 달성율 (기준: 80개 × 영업사원 수)
        const salesCount = await getSalesPersonCount();
        const targetBase = 80 * salesCount;
        const achievementRate = calculateAchievementRate(totalCompanies, targetBase);
        console.log(`[KPI 5] 회사배정기준대비 달성율: ${achievementRate.toFixed(2)}% (기준: ${targetBase}개)`);
        
        // 6. 주요고객처목표달성율 (목표: 40개 × 영업사원 수)
        const mainTarget = 40 * salesCount;
        const mainAchievementRate = (mainProductCompanies / mainTarget) * 100;
        console.log(`[KPI 6] 주요고객처목표달성율: ${mainAchievementRate.toFixed(2)}% (목표: ${mainTarget}개)`);
        
        // ============================================
        // 전사 매출 관련 KPI (4개)
        // ============================================
        
        // 7. 누적매출금액
        const totalSales = allCompanies.reduce((sum, c) => sum + (c.accumulatedSales || 0), 0);
        console.log(`[KPI 7] 누적매출금액: ${totalSales.toLocaleString()}원`);
        
        // 8. 주요제품매출액
        const mainProductSales = allCompanies
            .filter(c => isMainProduct(c.salesProduct))
            .reduce((sum, c) => sum + (c.accumulatedSales || 0), 0);
        console.log(`[KPI 8] 주요제품매출액: ${mainProductSales.toLocaleString()}원`);
        
        // 9. 주요제품매출비율
        const mainProductRatio = totalSales > 0 ? 
            (mainProductSales / totalSales * 100).toFixed(2) : '0.00';
        console.log(`[KPI 9] 주요제품매출비율: ${mainProductRatio}%`);
        
        // 10. 매출집중도 (전사 기준 - 현재 월 사용)
        const currentMonth = new Date().getMonth() + 1; // 1-12월
        const salesConcentration = calculateSalesConcentration(totalSales, totalCompanies, currentMonth);
        console.log(`[KPI 10] 매출집중도: ${Math.round(salesConcentration).toLocaleString()}원 (${currentMonth}개월 기준)`);
        
        // ============================================
        // 전사 수금 관련 KPI (1개)
        // ============================================
        
        // 11. 누적수금금액
        const totalCollection = allCompanies.reduce((sum, c) => sum + (c.accumulatedCollection || 0), 0);
        console.log(`[KPI 11] 누적수금금액: ${totalCollection.toLocaleString()}원`);
        
        // ============================================
        // 추가 기여도 분석 (모달용)
        // ============================================
        
        // 12. 전체매출기여도 순위 (모달 팝업용)
        const salesContributions = await calculateSalesContributions();
        
        // 13. 주요제품매출기여도 순위 (모달 팝업용)
        const mainProductContributions = await calculateMainProductContributions();
        
        console.log('=== 전사 KPI 계산 완료 ===');
        
        return {
            // 전사 거래처 관련 (4개)
            totalCompanies,
            activeCompanies,
            activationRate,
            mainProductCompanies,
            
            // 전사 달성율 관련 (2개)
            achievementRate,
            mainAchievementRate,
            targetBase,
            mainTarget,
            
            // 전사 매출 관련 (4개)
            totalSales,
            mainProductSales,
            mainProductRatio,
            salesConcentration,
            
            // 전사 수금 관련 (1개)
            totalCollection,
            
            // 추가 정보
            salesPersonCount: salesCount,
            currentMonth,
            
            // 기여도 순위 (모달용)
            salesContributions,
            mainProductContributions
        };
        
    } catch (error) {
        console.error('[전사 KPI 계산 실패]', error);
        throw error; // 에러를 상위로 전달
    }
}

// ============================================
// [섹션: 헬퍼 함수 - 전체 거래처]
// ============================================

async function getAllCompanies() {
    // dbManager의 getAll 메서드 사용 - clients 스토어 조회
    const companies = await dbManager.getAll('clients');
    return companies;
}

// ============================================
// [섹션: 기여도 계산 - 전체매출]
// ============================================

async function calculateSalesContributions() {
    const employees = await getEmployeeContributions();
    
    // 매출액 기준 정렬
    employees.sort((a, b) => b.sales - a.sales);
    
    // 순위 부여
    return employees.map((emp, index) => ({
        rank: index + 1,
        name: emp.name,
        companies: emp.companies,
        activeCompanies: emp.activeCompanies,
        sales: emp.sales,
        contribution: emp.contribution
    }));
}

// ============================================
// [섹션: 기여도 계산 - 주요제품매출]
// ============================================

async function calculateMainProductContributions() {
    const employees = await getEmployeeMainProductContributions();
    
    // 주요제품 매출액 기준 정렬
    employees.sort((a, b) => b.mainSales - a.mainSales);
    
    // 순위 부여
    return employees.map((emp, index) => ({
        rank: index + 1,
        name: emp.name,
        mainProductCompanies: emp.mainProductCompanies,
        mainSales: emp.mainSales,
        mainContribution: emp.mainContribution
    }));
}

// ============================================
// [섹션: 직원별 기여도 조회]
// ============================================

async function getEmployeeContributions() {
    const allEmployees = await dbManager.getAll('employees');
    const allCompanies = await dbManager.getAll('companies');
    
    const salesEmployees = allEmployees.filter(emp => emp.role === 'sales');
    const totalSales = allCompanies.reduce((sum, c) => sum + (c.accumulatedSales || 0), 0);
    
    return salesEmployees.map(emp => {
        const empCompanies = allCompanies.filter(c => c.internalManager === emp.name);
        const empSales = empCompanies.reduce((sum, c) => sum + (c.accumulatedSales || 0), 0);
        
        return {
            name: emp.name,
            companies: empCompanies.filter(c => c.businessStatus !== '불용').length,
            activeCompanies: empCompanies.filter(c => isActiveCompany(c)).length,
            sales: empSales,
            contribution: totalSales > 0 ? ((empSales / totalSales) * 100).toFixed(2) : '0.00'
        };
    });
}

async function getEmployeeMainProductContributions() {
    const allEmployees = await dbManager.getAll('employees');
    const allCompanies = await dbManager.getAll('companies');
    
    const salesEmployees = allEmployees.filter(emp => emp.role === 'sales');
    const totalMainSales = allCompanies
        .filter(c => isMainProduct(c.salesProduct))
        .reduce((sum, c) => sum + (c.accumulatedSales || 0), 0);
    
    return salesEmployees.map(emp => {
        const empCompanies = allCompanies.filter(c => c.internalManager === emp.name);
        const empMainCompanies = empCompanies.filter(c => isMainProduct(c.salesProduct));
        const empMainSales = empMainCompanies.reduce((sum, c) => sum + (c.accumulatedSales || 0), 0);
        
        return {
            name: emp.name,
            mainProductCompanies: calculateMainProducts(empCompanies),
            mainSales: empMainSales,
            mainContribution: totalMainSales > 0 ? ((empMainSales / totalMainSales) * 100).toFixed(2) : '0.00'
        };
    });
}

// ============================================
// [섹션: 샘플 KPI 데이터]
// ============================================

export function getSampleAdminKPI() {
    console.log('[샘플 관리자 KPI 데이터 사용]');
    
    return {
        // 전사 거래처 관련
        totalCompanies: 247,
        activeCompanies: 193,
        activationRate: '78.14',
        mainProductCompanies: 118,
        
        // 전사 달성율 관련
        achievementRate: '2.92',
        mainAchievementRate: '98.33',
        targetBase: 240,
        mainTarget: 120,
        
        // 전사 매출 관련
        totalSales: 850000000,
        mainProductSales: 470000000,
        mainProductRatio: '55.29',
        salesConcentration: 382166,
        
        // 전사 수금 관련
        totalCollection: 800000000,
        
        // 추가 정보
        salesPersonCount: 3,
        currentMonth: 9,
        
        // 기여도 순위
        salesContributions: getSampleSalesContributions(),
        mainProductContributions: getSampleMainProductContributions()
    };
}

export function getSampleSalesContributions() {
    return [
        { rank: 1, name: '이영업', companies: 90, activeCompanies: 70, sales: 320000000, contribution: '37.65' },
        { rank: 2, name: '김영업', companies: 82, activeCompanies: 65, sales: 280000000, contribution: '32.94' },
        { rank: 3, name: '박영업', companies: 75, activeCompanies: 58, sales: 250000000, contribution: '29.41' }
    ];
}

export function getSampleMainProductContributions() {
    return [
        { rank: 1, name: '이영업', mainProductCompanies: 45, mainSales: 180000000, mainContribution: '38.30' },
        { rank: 2, name: '김영업', mainProductCompanies: 38, mainSales: 150000000, mainContribution: '31.91' },
        { rank: 3, name: '박영업', mainProductCompanies: 35, mainSales: 140000000, mainContribution: '29.79' }
    ];
}

// ============================================
// [섹션: KPI 포맷터]
// ============================================

export function formatAdminKPI(kpi) {
    return {
        전사거래처관련: {
            전체거래처: `${kpi.totalCompanies}개`,
            활성거래처: `${kpi.activeCompanies}개`,
            활성화율: `${kpi.activationRate}%`,
            주요제품판매거래처: `${kpi.mainProductCompanies}개`
        },
        전사달성율관련: {
            회사배정기준대비달성율: `${kpi.achievementRate}% (기준: ${kpi.targetBase}개)`,
            주요고객처목표달성율: `${kpi.mainAchievementRate}% (목표: ${kpi.mainTarget}개)`
        },
        전사매출관련: {
            누적매출금액: `${kpi.totalSales.toLocaleString()}원`,
            주요제품매출액: `${kpi.mainProductSales.toLocaleString()}원`,
            주요제품매출비율: `${kpi.mainProductRatio}%`,
            매출집중도: `${Math.round(kpi.salesConcentration).toLocaleString()}원`
        },
        전사수금관련: {
            누적수금금액: `${kpi.totalCollection.toLocaleString()}원`
        },
        기타정보: {
            영업사원수: `${kpi.salesPersonCount}명`,
            기준월: `${kpi.currentMonth}개월`
        }
    };
}

// ============================================
// [섹션: Export 함수 - 대시보드용]
// ============================================

/**
 * 기여도 순위 계산
 * @param {string} type - 'total' 또는 'main'
 * @returns {Array} 순위 배열
 */
export async function calculateContributionRanking(type = 'total') {
    console.log(`[기여도 순위] ${type} 계산 시작`);
    
    try {
        if (type === 'main') {
            // 주요제품 기여도
            const contributions = await calculateMainProductContributions();
            return contributions.map(item => ({
                name: item.name,
                mainProductCompanies: item.mainProductCompanies,
                mainProductSales: item.mainSales,
                contribution: item.mainContribution
            }));
        } else {
            // 전체매출 기여도
            const contributions = await calculateSalesContributions();
            return contributions.map(item => ({
                name: item.name,
                companies: item.companies,
                activeCompanies: item.activeCompanies,
                totalSales: item.sales,
                contribution: item.contribution
            }));
        }
    } catch (error) {
        console.error('[기여도 순위 계산 실패]', error);
        return type === 'main' ? getSampleMainProductContributions() : getSampleSalesContributions();
    }
}

/**
 * 최근 보고서 조회
 * @param {number} limit - 조회할 개수 (기본값: 5)
 * @returns {Array} 최근 보고서 배열
 */
export async function getRecentReports(limit = 5) {
    console.log(`[최근 보고서] ${limit}개 조회 시작`);
    
    try {
        // dbManager를 사용하여 보고서 조회
        const reports = await dbManager.getAll('reports');
        
        // 날짜순 정렬 (최신순)
        const sortedReports = reports
            .sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate))
            .slice(0, limit);
        
        return sortedReports.map(report => ({
            id: report.reportId,
            title: report.title || `${report.reportType} 보고서`,
            date: report.createdDate,
            author: report.employeeName || report.employeeId,
            company: report.companyName || '-'
        }));
    } catch (error) {
        console.log('[DB 접근 실패] 샘플 보고서 데이터 사용');
        return getSampleRecentReports(limit);
    }
}

/**
 * 신규 거래처 조회
 * @param {number} limit - 조회할 개수 (기본값: 5)
 * @returns {Array} 신규 거래처 배열
 */
export async function getNewCompanies(limit = 5) {
    console.log(`[신규 거래처] ${limit}개 조회 시작`);
    
    try {
        // dbManager를 사용하여 거래처 조회
        const companies = await dbManager.getAll('clients');
        
        // 등록일순 정렬 (최신순)
        const sortedCompanies = companies
            .filter(c => c.registeredDate) // 등록일이 있는 것만
            .sort((a, b) => new Date(b.registeredDate) - new Date(a.registeredDate))
            .slice(0, limit);
        
        return sortedCompanies.map(company => ({
            id: company.keyValue,
            name: company.companyNameERP,
            registeredDate: company.registeredDate,
            salesPerson: company.internalManager || '-',
            category: company.businessCategory || '일반'
        }));
    } catch (error) {
        console.log('[DB 접근 실패] 샘플 거래처 데이터 사용');
        return getSampleNewCompanies(limit);
    }
}

// ============================================
// [섹션: 샘플 데이터 - 대시보드용]
// ============================================

function getSampleRecentReports(limit = 5) {
    const sampleReports = [
        {
            id: 'RPT001',
            title: '주간 영업활동 보고서',
            date: new Date().toISOString(),
            author: '김영업',
            company: '서울치과'
        },
        {
            id: 'RPT002',
            title: '월간 실적 보고서',
            date: new Date(Date.now() - 86400000).toISOString(),
            author: '이영업',
            company: '부산치과'
        },
        {
            id: 'RPT003',
            title: '거래처 방문 보고서',
            date: new Date(Date.now() - 172800000).toISOString(),
            author: '박영업',
            company: '인천치과'
        },
        {
            id: 'RPT004',
            title: '분기 실적 보고서',
            date: new Date(Date.now() - 259200000).toISOString(),
            author: '김영업',
            company: '강남치과'
        },
        {
            id: 'RPT005',
            title: '신규 거래처 개척 보고서',
            date: new Date(Date.now() - 345600000).toISOString(),
            author: '이영업',
            company: '대구치과'
        }
    ];
    
    return sampleReports.slice(0, limit);
}

function getSampleNewCompanies(limit = 5) {
    const sampleCompanies = [
        {
            id: 'COM006',
            name: '신규치과의원',
            registeredDate: new Date().toISOString(),
            salesPerson: '김영업',
            category: '일반'
        },
        {
            id: 'COM007',
            name: '서울스마일치과',
            registeredDate: new Date(Date.now() - 86400000).toISOString(),
            salesPerson: '이영업',
            category: '일반'
        },
        {
            id: 'COM008',
            name: '부산프리미엄치과',
            registeredDate: new Date(Date.now() - 172800000).toISOString(),
            salesPerson: '박영업',
            category: '프리미엄'
        },
        {
            id: 'COM009',
            name: '강남디지털치과',
            registeredDate: new Date(Date.now() - 259200000).toISOString(),
            salesPerson: '김영업',
            category: '일반'
        },
        {
            id: 'COM010',
            name: '인천임플란트센터',
            registeredDate: new Date(Date.now() - 345600000).toISOString(),
            salesPerson: '이영업',
            category: '전문'
        }
    ];
    
    return sampleCompanies.slice(0, limit);
}

// [내용: 관리자 KPI 11개 + 기여도 2개 + 대시보드용 함수]
// 테스트: 전사 거래처, 달성율, 매출, 수금, 기여도, 최근활동
// #관리자KPI #전사통계 #대시보드