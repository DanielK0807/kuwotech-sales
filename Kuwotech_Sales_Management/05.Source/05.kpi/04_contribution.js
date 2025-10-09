/**
 * KUWOTECH 영업관리 시스템 - 기여도 계산
 * Created by: Daniel.K
 * Date: 2025-09-27
 * Owner: Kang Jung Hwan
 * 
 * 기능:
 * - 전체매출 기여도 순위
 * - 주요제품매출 기여도 순위
 * - 부서별/팀별 기여도
 */

// ============================================
// [섹션: Import]
// ============================================

import { getEmployees } from './01_kpi_calculator.js';
import { calculateSalesKPI } from './02_sales_kpi.js';
import { formatNumber } from '../01.common/03_format.js';

// ============================================
// [섹션: 영업사원별 기여도 순위]
// ============================================

/**
 * 기여도 순위 계산
 * @param {string} type - 'total' (전체매출) or 'main' (주요제품매출)
 * @returns {array} 순위 배열
 */
export async function calculateContributionRanking(type = 'total') {
    console.log(`=== 기여도 순위 계산 시작 (${type}) ===`);
    
    try {
        // 영업사원 목록 조회
        const employees = await getEmployees();
        const salesEmployees = employees.filter(emp => emp.role === 'sales');
        
        console.log(`[영업사원] ${salesEmployees.length}명`);
        
        const rankings = [];
        
        // 각 영업사원별 KPI 계산
        for (const emp of salesEmployees) {
            const kpi = await calculateSalesKPI(emp.id);
            
            if (type === 'total') {
                // 전체매출 기여도
                rankings.push({
                    rank: 0, // 나중에 정렬 후 부여
                    employeeId: emp.id,
                    name: emp.name,
                    totalCompanies: kpi.totalCompanies,
                    activeCompanies: kpi.activeCompanies,
                    sales: kpi.totalSales,
                    contribution: parseFloat(kpi.salesContribution),
                    
                    // 추가 정보
                    achievementRate: kpi.achievementRate,
                    activationRate: kpi.activationRate
                });
            } else if (type === 'main') {
                // 주요제품매출 기여도
                rankings.push({
                    rank: 0,
                    employeeId: emp.id,
                    name: emp.name,
                    mainProductCompanies: kpi.mainProductCompanies,
                    mainSales: kpi.mainProductSales,
                    mainContribution: parseFloat(kpi.mainContribution),
                    mainProductRatio: kpi.mainProductRatio
                });
            }
        }
        
        // 매출액 기준 정렬 (내림차순)
        if (type === 'total') {
            rankings.sort((a, b) => b.sales - a.sales);
        } else {
            rankings.sort((a, b) => b.mainSales - a.mainSales);
        }
        
        // 순위 부여
        rankings.forEach((item, index) => {
            item.rank = index + 1;
            
            // 순위 변동 계산 (이전 데이터가 있다면)
            item.rankChange = getRankChange(item.employeeId, index + 1, type);
        });
        
        // 합계 계산
        const totals = calculateTotals(rankings, type);
        
        console.log('=== 기여도 순위 계산 완료 ===');
        console.table(rankings);
        
        return {
            rankings,
            totals,
            type,
            timestamp: new Date().toISOString()
        };
        
    } catch (error) {
        console.error('[기여도 순위 계산 실패]', error);
        throw error; // 에러를 상위로 전달
    }
}

// ============================================
// [섹션: 부서별 기여도]
// ============================================

/**
 * 부서별 기여도 계산
 * @returns {object} 부서별 기여도
 */
export async function calculateDepartmentContribution() {
    console.log('=== 부서별 기여도 계산 시작 ===');
    
    try {
        // 부서별 집계 (향후 부서 정보 추가 시 구현)
        const departments = await getDepartments();
        const contributions = [];
        
        for (const dept of departments) {
            const deptEmployees = await getEmployeesByDepartment(dept.id);
            const deptSales = await calculateDepartmentSales(dept.id);
            const deptMainSales = await calculateDepartmentMainSales(dept.id);
            
            contributions.push({
                departmentId: dept.id,
                departmentName: dept.name,
                employeeCount: deptEmployees.length,
                totalSales: deptSales,
                mainProductSales: deptMainSales,
                contribution: 0 // 전사 대비 계산 필요
            });
        }
        
        // 전사 매출 대비 기여도 계산
        const totalCompanySales = contributions.reduce((sum, dept) => sum + dept.totalSales, 0);
        
        contributions.forEach(dept => {
            dept.contribution = totalCompanySales > 0 
                ? ((dept.totalSales / totalCompanySales) * 100).toFixed(2)
                : '0.00';
        });
        
        // 매출액 기준 정렬
        contributions.sort((a, b) => b.totalSales - a.totalSales);
        
        console.log('=== 부서별 기여도 계산 완료 ===');
        console.table(contributions);
        
        return contributions;
        
    } catch (error) {
        console.log('[부서별 기여도] 향후 구현 예정');
        return getSampleDepartmentContribution();
    }
}

// ============================================
// [섹션: 순위 변동 계산]
// ============================================

/**
 * 이전 순위 대비 변동 계산
 * @param {string} employeeId - 직원 ID
 * @param {number} currentRank - 현재 순위
 * @param {string} type - 기여도 유형
 * @returns {string} 순위 변동 (↑2, ↓1, -)
 */
function getRankChange(employeeId, currentRank, type) {
    // 이전 순위 데이터 조회 (localStorage 또는 DB)
    const previousData = getPreviousRankingData(type);
    
    if (!previousData) {
        return 'NEW';
    }
    
    const previousRank = previousData.find(item => item.employeeId === employeeId)?.rank;
    
    if (!previousRank) {
        return 'NEW';
    }
    
    const change = previousRank - currentRank;
    
    if (change > 0) {
        return `↑${change}`;
    } else if (change < 0) {
        return `↓${Math.abs(change)}`;
    } else {
        return '-';
    }
}

// ============================================
// [섹션: 이전 순위 데이터]
// ============================================

/**
 * 이전 순위 데이터 조회
 */
function getPreviousRankingData(type) {
    try {
        const stored = localStorage.getItem(`contribution_ranking_${type}_previous`);
        return stored ? JSON.parse(stored) : null;
    } catch (error) {
        return null;
    }
}

/**
 * 현재 순위 데이터 저장
 */
export function saveCurrentRankingData(type, data) {
    try {
        // 현재 데이터를 이전 데이터로 이동
        const current = localStorage.getItem(`contribution_ranking_${type}_current`);
        if (current) {
            localStorage.setItem(`contribution_ranking_${type}_previous`, current);
        }
        
        // 새 데이터를 현재 데이터로 저장
        localStorage.setItem(`contribution_ranking_${type}_current`, JSON.stringify(data));
    } catch (error) {
        console.error('[순위 데이터 저장 실패]', error);
    }
}

// ============================================
// [섹션: 합계 계산]
// ============================================

/**
 * 순위 데이터 합계 계산
 */
function calculateTotals(rankings, type) {
    if (type === 'total') {
        return {
            totalCompanies: rankings.reduce((sum, r) => sum + r.totalCompanies, 0),
            activeCompanies: rankings.reduce((sum, r) => sum + r.activeCompanies, 0),
            totalSales: rankings.reduce((sum, r) => sum + r.sales, 0),
            averageContribution: (100 / rankings.length).toFixed(2)
        };
    } else {
        return {
            mainProductCompanies: rankings.reduce((sum, r) => sum + r.mainProductCompanies, 0),
            mainProductSales: rankings.reduce((sum, r) => sum + r.mainSales, 0),
            averageContribution: (100 / rankings.length).toFixed(2)
        };
    }
}

// ============================================
// [섹션: 헬퍼 함수]
// ============================================

async function getDepartments() {
    // 향후 부서 테이블 추가 시 구현
    return [
        { id: 'dept01', name: '영업1팀' },
        { id: 'dept02', name: '영업2팀' }
    ];
}

async function getEmployeesByDepartment(deptId) {
    const employees = await getEmployees();
    // 향후 부서 정보 추가 시 필터링
    return employees.filter(emp => emp.departmentId === deptId);
}

async function calculateDepartmentSales(deptId) {
    // 부서별 매출 집계
    return 0;
}

async function calculateDepartmentMainSales(deptId) {
    // 부서별 주요제품 매출 집계
    return 0;
}

// ============================================
// [섹션: 샘플 데이터]
// ============================================

/**
 * 샘플 기여도 순위 데이터
 */
export function getSampleContributionRanking(type) {
    console.log('[샘플 기여도 순위 데이터 사용]');
    
    if (type === 'total') {
        return {
            rankings: [
                {
                    rank: 1,
                    employeeId: 'emp003',
                    name: '이영업',
                    totalCompanies: 90,
                    activeCompanies: 70,
                    sales: 320000000,
                    contribution: 37.65,
                    achievementRate: '12.50',
                    activationRate: '77.78',
                    rankChange: '↑1'
                },
                {
                    rank: 2,
                    employeeId: 'emp001',
                    name: '김영업',
                    totalCompanies: 82,
                    activeCompanies: 65,
                    sales: 280000000,
                    contribution: 32.94,
                    achievementRate: '2.50',
                    activationRate: '79.27',
                    rankChange: '↓1'
                },
                {
                    rank: 3,
                    employeeId: 'emp002',
                    name: '박영업',
                    totalCompanies: 75,
                    activeCompanies: 58,
                    sales: 250000000,
                    contribution: 29.41,
                    achievementRate: '-6.25',
                    activationRate: '77.33',
                    rankChange: '-'
                }
            ],
            totals: {
                totalCompanies: 247,
                activeCompanies: 193,
                totalSales: 850000000,
                averageContribution: '33.33'
            },
            type: 'total',
            timestamp: new Date().toISOString()
        };
    } else {
        return {
            rankings: [
                {
                    rank: 1,
                    employeeId: 'emp003',
                    name: '이영업',
                    mainProductCompanies: 45,
                    mainSales: 180000000,
                    mainContribution: 38.30,
                    mainProductRatio: '56.25',
                    rankChange: '-'
                },
                {
                    rank: 2,
                    employeeId: 'emp001',
                    name: '김영업',
                    mainProductCompanies: 38,
                    mainSales: 150000000,
                    mainContribution: 31.91,
                    mainProductRatio: '53.57',
                    rankChange: '↑1'
                },
                {
                    rank: 3,
                    employeeId: 'emp002',
                    name: '박영업',
                    mainProductCompanies: 35,
                    mainSales: 140000000,
                    mainContribution: 29.79,
                    mainProductRatio: '56.00',
                    rankChange: '↓1'
                }
            ],
            totals: {
                mainProductCompanies: 118,
                mainProductSales: 470000000,
                averageContribution: '33.33'
            },
            type: 'main',
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * 샘플 부서별 기여도 데이터
 */
export function getSampleDepartmentContribution() {
    return [
        {
            departmentId: 'dept01',
            departmentName: '영업1팀',
            employeeCount: 2,
            totalSales: 530000000,
            mainProductSales: 290000000,
            contribution: '62.35'
        },
        {
            departmentId: 'dept02',
            departmentName: '영업2팀',
            employeeCount: 1,
            totalSales: 320000000,
            mainProductSales: 180000000,
            contribution: '37.65'
        }
    ];
}

// ============================================
// [섹션: 기여도 차트 데이터]
// ============================================

/**
 * 차트용 데이터 변환
 */
export function formatContributionForChart(data) {
    if (data.type === 'total') {
        return {
            labels: data.rankings.map(r => r.name),
            datasets: [{
                label: '매출액',
                data: data.rankings.map(r => r.sales),
                backgroundColor: '#2563eb'
            }, {
                label: '기여도(%)',
                data: data.rankings.map(r => r.contribution),
                backgroundColor: '#8b5cf6',
                yAxisID: 'percentage'
            }]
        };
    } else {
        return {
            labels: data.rankings.map(r => r.name),
            datasets: [{
                label: '주요제품 매출액',
                data: data.rankings.map(r => r.mainSales),
                backgroundColor: '#2563eb'
            }, {
                label: '주요제품 기여도(%)',
                data: data.rankings.map(r => r.mainContribution),
                backgroundColor: '#8b5cf6',
                yAxisID: 'percentage'
            }]
        };
    }
}

// [내용: 기여도 계산]
// 테스트: 전체매출 기여도, 주요제품 기여도, 부서별 기여도
// #기여도 #순위