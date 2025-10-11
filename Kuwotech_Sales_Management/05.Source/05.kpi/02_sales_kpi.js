/**
 * KUWOTECH 영업관리 시스템 - 영업담당 KPI 계산
 * Created by: Daniel.K
 * Date: 2025-09-27
 * Owner: Kang Jung Hwan
 * 
 * KPI 14개:
 * 1-4: 거래처 관련
 * 5-6: 달성율 관련
 * 7-11: 매출 관련
 * 12-14: 기여도 관련
 */

// ============================================
// [섹션: Import]
// ============================================

import dbManager from '../06.database/01_database_manager.js';
import { formatNumber, formatCurrency, formatPercent } from '../01.common/03_format.js';
import logger from '../01.common/23_logger.js';
import {
    calculateMainProducts,
    calculateCurrentMonth,
    calculateCurrentMonthDetailed,
    calculateSalesConcentration,
    isActiveCompany,
    isMainProduct,
    calculateAchievementRate,
    getEmployees
} from './01_kpi_calculator.js';

// ============================================
// [섹션: 영업담당 KPI 14개 계산]
// ============================================

/**
 * 영업담당 KPI 계산 (14개)
 * @param {string} userId - 사용자 ID
 * @returns {object} KPI 결과
 */
export async function calculateSalesKPI(userId) {
    logger.debug(`=== 영업담당 KPI 계산 시작 (userId: ${userId}) ===`);

    try {
        // 사용자 정보 조회
        const user = await getUserInfo(userId);
        if (!user) {
            throw new Error(`사용자 정보 없음: ${userId}`);
        }
        logger.debug(`[사용자] ${user.name} (입사일: ${user.hireDate})`);

        // 본인 담당 거래처만 조회
        const companies = await getCompaniesByManager(user.name);
        logger.debug(`[담당 거래처] 총 ${companies.length}개`);
        
        // ============================================
        // 거래처 관련 KPI (4개)
        // ============================================
        
        // 1. 담당거래처 (불용 제외)
        const totalCompanies = companies.filter(c => c.businessStatus !== '불용').length;
        logger.debug(`[KPI 1] 담당거래처: ${totalCompanies}개`);

        // 2. 활성거래처
        const activeCompanies = companies.filter(c => isActiveCompany(c)).length;
        logger.debug(`[KPI 2] 활성거래처: ${activeCompanies}개`);

        // 3. 활성화율
        const activationRate = totalCompanies > 0 ?
            (activeCompanies / totalCompanies * 100).toFixed(2) : '0.00';
        logger.debug(`[KPI 3] 활성화율: ${activationRate}%`);

        // 4. 주요제품판매거래처 (3단계 우선순위)
        const mainProductCompanies = calculateMainProducts(companies);
        logger.debug(`[KPI 4] 주요제품판매거래처: ${mainProductCompanies}개`);
        
        // ============================================
        // 달성율 관련 KPI (2개)
        // ============================================
        
        // 5. 회사배정기준대비 달성율 (기준: 80개)
        const targetBase = 80;
        const achievementRate = calculateAchievementRate(totalCompanies, targetBase);
        logger.debug(`[KPI 5] 회사배정기준대비 달성율: ${achievementRate.toFixed(2)}%`);

        // 6. 주요고객처목표달성율 (목표: 40개)
        const mainTarget = 40;
        const mainAchievementRate = (mainProductCompanies / mainTarget) * 100;
        logger.debug(`[KPI 6] 주요고객처목표달성율: ${mainAchievementRate.toFixed(2)}%`);
        
        // ============================================
        // 매출 관련 KPI (5개)
        // ============================================
        
        // 7. 누적매출금액
        const totalSales = companies.reduce((sum, c) => sum + (c.accumulatedSales || 0), 0);
        logger.debug(`[KPI 7] 누적매출금액: ${totalSales.toLocaleString()}원`);

        // 8. 주요제품매출액
        const mainProductSales = companies
            .filter(c => isMainProduct(c.salesProduct))
            .reduce((sum, c) => sum + (c.accumulatedSales || 0), 0);
        logger.debug(`[KPI 8] 주요제품매출액: ${mainProductSales.toLocaleString()}원`);

        // 9. 주요제품매출비율
        const mainProductRatio = totalSales > 0 ?
            (mainProductSales / totalSales * 100).toFixed(2) : '0.00';
        logger.debug(`[KPI 9] 주요제품매출비율: ${mainProductRatio}%`);

        // 10. 매출집중도
        const currentMonth = calculateCurrentMonth(user.hireDate);
        const salesConcentration = calculateSalesConcentration(totalSales, totalCompanies, currentMonth);
        logger.debug(`[KPI 10] 매출집중도: ${Math.round(salesConcentration).toLocaleString()}원`);

        // 11. 누적수금금액
        const totalCollection = companies.reduce((sum, c) => sum + (c.accumulatedCollection || 0), 0);
        logger.debug(`[KPI 11] 누적수금금액: ${totalCollection.toLocaleString()}원`);
        
        // ============================================
        // 기여도 관련 KPI (3개)
        // ============================================
        
        // 12. 매출채권잔액
        const receivables = companies.reduce((sum, c) => sum + (c.accountsReceivable || 0), 0);
        logger.debug(`[KPI 12] 매출채권잔액: ${receivables.toLocaleString()}원`);

        // 13. 전체매출기여도 (전사 대비)
        const allSales = await getTotalSales();
        const salesContribution = allSales > 0 ?
            (totalSales / allSales * 100).toFixed(2) : '0.00';
        logger.debug(`[KPI 13] 전체매출기여도: ${salesContribution}%`);

        // 14. 주요제품매출기여도 (전사 주요제품 대비)
        const allMainSales = await getTotalMainProductSales();
        const mainContribution = allMainSales > 0 ?
            (mainProductSales / allMainSales * 100).toFixed(2) : '0.00';
        logger.debug(`[KPI 14] 주요제품매출기여도: ${mainContribution}%`);

        logger.debug('=== 영업담당 KPI 계산 완료 ===');
        
        return {
            // 거래처 관련 (4개)
            totalCompanies,
            activeCompanies,
            activationRate,
            mainProductCompanies,
            
            // 달성율 관련 (2개)
            achievementRate,
            mainAchievementRate,
            
            // 매출 관련 (5개)
            totalSales,
            mainProductSales,
            mainProductRatio,
            salesConcentration,
            totalCollection,
            
            // 기여도 관련 (3개)
            receivables,
            salesContribution,
            mainContribution,
            
            // 추가 정보
            currentMonth,
            userName: user.name
        };
        
    } catch (error) {
        logger.error('[영업담당 KPI 계산 실패]', error);
        throw error; // 에러를 상위로 전달
    }
}

// ============================================
// [섹션: 헬퍼 함수 - 사용자 정보]
// ============================================

async function getUserInfo(userId) {
    // Use dbManager - get method for single data
    const user = await dbManager.get('employees', userId);
    if (!user) {
        throw new Error(`사용자를 찾을 수 없습니다: ${userId}`);
    }
    return user;
}

// ============================================
// [섹션: 헬퍼 함수 - 담당 거래처]
// ============================================

async function getCompaniesByManager(managerName) {
    // Use dbManager - getAll method and filter by manager
    const allCompanies = await dbManager.getAll('companies');
    return allCompanies.filter(c => c.internalManager === managerName);
}

// ============================================
// [섹션: 헬퍼 함수 - 전사 매출]
// ============================================

async function getTotalSales() {
    // Use dbManager - getAll method for all companies
    const allCompanies = await dbManager.getAll('companies');
    return allCompanies.reduce((sum, c) => sum + (c.accumulatedSales || 0), 0);
}

// ============================================
// [섹션: 헬퍼 함수 - 전사 주요제품 매출]
// ============================================

async function getTotalMainProductSales() {
    // Use dbManager - getAll method and filter main products
    const allCompanies = await dbManager.getAll('companies');
    return allCompanies
        .filter(c => isMainProduct(c.salesProduct))
        .reduce((sum, c) => sum + (c.accumulatedSales || 0), 0);
}



// ============================================
// [섹션: KPI 포맷터]
// ============================================

export function formatSalesKPI(kpi) {
    return {
        거래처관련: {
            담당거래처: `${formatNumber(kpi.totalCompanies)}개`,
            활성거래처: `${formatNumber(kpi.activeCompanies)}개`,
            활성화율: `${kpi.activationRate}%`,
            주요제품판매거래처: `${formatNumber(kpi.mainProductCompanies)}개`
        },
        달성율관련: {
            회사배정기준대비달성율: kpi.achievementRate >= 0 
                ? `${kpi.achievementRate}% 초과배정` 
                : `(${Math.abs(kpi.achievementRate)}%) 미달배정`,
            주요고객처목표달성율: `${kpi.mainAchievementRate}% 달성`
        },
        매출관련: {
            누적매출금액: `${formatNumber(kpi.totalSales)}원`,
            주요제품매출액: `${formatNumber(kpi.mainProductSales)}원`,
            주요제품매출비율: `${kpi.mainProductRatio}%`,
            매출집중도: `${formatNumber(Math.round(kpi.salesConcentration))}원`,
            누적수금금액: `${formatNumber(kpi.totalCollection)}원`
        },
        기여도관련: {
            매출채권잔액: `${formatNumber(kpi.receivables)}원`,
            전체매출기여도: `${kpi.salesContribution}%`,
            주요제품매출기여도: `${kpi.mainContribution}%`
        }
    };
}

// [내용: 영업담당 KPI 14개]
// 테스트: 거래처, 달성율, 매출, 기여도
// #영업KPI #14개