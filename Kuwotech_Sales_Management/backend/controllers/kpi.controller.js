/**
 * ============================================
 * KUWOTECH 영업관리 시스템 - KPI Controller (캐시 테이블 버전)
 * 파일: backend/controllers/kpi.controller.new.js
 * Created by: Daniel.K
 * Date: 2025-01-28
 * 설명: KPI 캐시 테이블에서 조회만 수행 (빠른 응답)
 * ============================================
 */

import { getDB } from '../config/database.js';
import {
    refreshSalesKPI,
    refreshAllSalesKPI,
    refreshAdminKPI
} from '../services/kpi.service.js';

// ============================================
// [영업담당 KPI 조회]
// ============================================

/**
 * 영업담당 개인 KPI 조회 (캐시 테이블에서)
 * GET /api/kpi/sales/:employeeId
 */
export const getSalesKPI = async (req, res) => {
    let connection;

    try {
        const { employeeId } = req.params;
        connection = await getDB();

        console.log('[KPI API] 영업담당 KPI 조회 (캐시):', employeeId);

        // 1. KPI 캐시 테이블에서 조회
        const [kpiData] = await connection.execute(
            `SELECT * FROM kpi_sales
             WHERE id = ? OR employeeName = ?
             LIMIT 1`,
            [employeeId, employeeId]
        );

        if (kpiData.length === 0) {
            // 캐시에 없으면 즉시 생성
            console.log('[KPI API] 캐시 없음 - 즉시 생성:', employeeId);
            const refreshResult = await refreshSalesKPI(employeeId);

            if (!refreshResult.success) {
                return res.status(404).json({
                    success: false,
                    message: refreshResult.message || 'KPI 데이터를 찾을 수 없습니다.'
                });
            }

            // 생성된 데이터 재조회
            const [newKpiData] = await connection.execute(
                `SELECT * FROM kpi_sales
                 WHERE id = ? OR employeeName = ?
                 LIMIT 1`,
                [employeeId, employeeId]
            );

            // 직원 정보 조회 (internalManager 확인용)
            const [employeeData] = await connection.execute(
                `SELECT name FROM employees WHERE id = ? OR name = ? LIMIT 1`,
                [employeeId, employeeId]
            );

            if (employeeData.length > 0) {
                // 불용 거래처 수 계산 (동적 추가)
                const [inactiveResult1] = await connection.execute(
                    `SELECT COUNT(*) as count FROM companies
                     WHERE internalManager = ? AND businessStatus = ?`,
                    [employeeData[0].name, "불용"]
                );
                const inactiveCount1 = inactiveResult1[0].count;

                const responseData1 = formatKPIResponse(newKpiData[0]);
                responseData1.inactiveCompanies = inactiveCount1;

                return res.json({
                    success: true,
                    data: responseData1,
                    cached: false
                });
            }

            return res.json({
                success: true,
                data: formatKPIResponse(newKpiData[0]),
                cached: false
            });
        }

        // 2. 직원 정보 조회 (internalManager 확인용)
        const [employeeData] = await connection.execute(
            `SELECT name FROM employees WHERE id = ? OR name = ? LIMIT 1`,
            [employeeId, employeeId]
        );

        if (employeeData.length > 0) {
            // 불용 거래처 수 계산 (동적 추가)
            const [inactiveCompaniesResult] = await connection.execute(
                `SELECT COUNT(*) as count FROM companies
                 WHERE internalManager = ? AND businessStatus = ?`,
                [employeeData[0].name, "불용"]
            );
            const inactiveCompaniesCount = inactiveCompaniesResult[0].count;

            // 3. 캐시된 데이터에 불용 거래처 수 추가하여 반환
            const responseData = formatKPIResponse(kpiData[0]);
            responseData.inactiveCompanies = inactiveCompaniesCount;

            res.json({
                success: true,
                data: responseData,
                cached: true,
                lastUpdated: kpiData[0].lastUpdated
            });
        } else {
            // 직원 정보 없으면 불용 거래처 수 없이 반환
            res.json({
                success: true,
                data: formatKPIResponse(kpiData[0]),
                cached: true,
                lastUpdated: kpiData[0].lastUpdated
            });
        }

    } catch (error) {
        console.error('[KPI API] 영업담당 KPI 조회 실패:', error);
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.',
            error: error.message
        });
    } finally {
        // Connection is shared, no need to release
    }
};

/**
 * 영업담당 KPI 강제 갱신
 * POST /api/kpi/sales/:employeeId/refresh
 */
export const refreshSalesKPIEndpoint = async (req, res) => {
    try {
        const { employeeId } = req.params;
        console.log('[KPI API] 영업담당 KPI 강제 갱신:', employeeId);

        const result = await refreshSalesKPI(employeeId);

        if (!result.success) {
            return res.status(404).json(result);
        }

        res.json({
            success: true,
            message: 'KPI가 갱신되었습니다.',
            data: result.data
        });

    } catch (error) {
        console.error('[KPI API] 영업담당 KPI 갱신 실패:', error);
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.',
            error: error.message
        });
    }
};

// ============================================
// [관리자 KPI 조회]
// ============================================

/**
 * 전사 KPI 조회 (캐시 테이블에서)
 * GET /api/kpi/admin
 */
export const getAdminKPI = async (req, res) => {
    let connection;

    try {
        connection = await getDB();

        console.log('[KPI API] 전사 KPI 조회 (캐시)');

        // 1. KPI 캐시 테이블에서 조회
        const [kpiData] = await connection.execute(
            `SELECT * FROM kpi_admin WHERE id = ?`,
            ['admin-kpi-singleton']
        );

        if (kpiData.length === 0) {
            // 캐시에 없으면 즉시 생성
            console.log('[KPI API] 캐시 없음 - 즉시 생성');
            await refreshAdminKPI();

            // 생성된 데이터 재조회
            const [newKpiData] = await connection.execute(
                `SELECT * FROM kpi_admin WHERE id = ?`,
                ['admin-kpi-singleton']
            );

            // 불용 거래처 수 계산 (동적 추가)
            console.log('[KPI API] 🔍 [캐시 미스] 불용 거래처 COUNT 쿼리 실행 시작...');
            const [inactiveResult1] = await connection.execute(
                "SELECT COUNT(*) as count FROM companies WHERE businessStatus = ?",
                ["불용"]
            );
            console.log('[KPI API] 🔍 [캐시 미스] COUNT 쿼리 결과:', inactiveResult1[0]);
            const inactiveCount1 = inactiveResult1[0].count;
            console.log('[KPI API] 🔍 [캐시 미스] inactiveCount1:', inactiveCount1, typeof inactiveCount1);

            const responseData1 = formatKPIResponse(newKpiData[0]);
            responseData1.inactiveCompanies = inactiveCount1;
            console.log('[KPI API] 🔍 [캐시 미스] 최종 응답 data.inactiveCompanies:', responseData1.inactiveCompanies);

            return res.json({
                success: true,
                data: responseData1,
                cached: false
            });
        }

        // 2. 불용 거래처 수 계산 (동적 추가)
        console.log('[KPI API] 🔍 불용 거래처 COUNT 쿼리 실행 시작...');
        const [inactiveCompaniesResult] = await connection.execute(
            "SELECT COUNT(*) as count FROM companies WHERE businessStatus = ?",
            ["불용"]
        );
        console.log('[KPI API] 🔍 COUNT 쿼리 결과:', {
            result: inactiveCompaniesResult,
            firstRow: inactiveCompaniesResult[0],
            count: inactiveCompaniesResult[0]?.count,
            countType: typeof inactiveCompaniesResult[0]?.count
        });
        const inactiveCompaniesCount = inactiveCompaniesResult[0].count;
        console.log('[KPI API] 🔍 inactiveCompaniesCount 값:', inactiveCompaniesCount, typeof inactiveCompaniesCount);

        // 3. 캐시된 데이터에 불용 거래처 수 추가하여 반환
        const responseData = formatKPIResponse(kpiData[0]);
        console.log('[KPI API] 🔍 responseData 생성 후:', responseData);
        responseData.inactiveCompanies = inactiveCompaniesCount;
        console.log('[KPI API] 🔍 inactiveCompanies 추가 후:', responseData.inactiveCompanies);

        // 🐛 DEBUG: 응답 데이터 확인
        console.log('[KPI API] 전사 KPI 응답:', {
            totalCompanies: responseData.totalCompanies,
            inactiveCompanies: responseData.inactiveCompanies,
            cached: true
        });

        res.json({
            success: true,
            data: responseData,
            cached: true,
            lastUpdated: kpiData[0].lastUpdated
        });

    } catch (error) {
        console.error('[KPI API] 전사 KPI 조회 실패:', error);
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.',
            error: error.message
        });
    } finally {
        // Connection is shared, no need to release
    }
};

/**
 * 전사 KPI 강제 갱신
 * POST /api/kpi/admin/refresh
 */
export const refreshAdminKPIEndpoint = async (req, res) => {
    try {
        console.log('[KPI API] 전사 KPI 강제 갱신');

        const result = await refreshAdminKPI();

        res.json({
            success: true,
            message: 'KPI가 갱신되었습니다.',
            data: result.data
        });

    } catch (error) {
        console.error('[KPI API] 전사 KPI 갱신 실패:', error);
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.',
            error: error.message
        });
    }
};

/**
 * 전체 영업담당 KPI 일괄 갱신
 * POST /api/kpi/refresh-all
 */
export const refreshAllKPIEndpoint = async (req, res) => {
    try {
        console.log('[KPI API] 전체 KPI 일괄 갱신 시작');

        // 1. 모든 영업담당 KPI 갱신
        const salesResult = await refreshAllSalesKPI();

        // 2. 전사 KPI 갱신
        const adminResult = await refreshAdminKPI();

        res.json({
            success: true,
            message: 'KPI가 갱신되었습니다.',
            salesCount: salesResult.count,
            results: salesResult.results,
            admin: adminResult.data
        });

    } catch (error) {
        console.error('[KPI API] 전체 KPI 갱신 실패:', error);
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.',
            error: error.message
        });
    }
};

// ============================================
// [순위 조회 - 관리자 모드용]
// ============================================

/**
 * 전체매출 기여도 순위 조회
 * GET /api/kpi/admin/ranking/total
 */
export const getTotalSalesRanking = async (req, res) => {
    let connection;

    try {
        connection = await getDB();

        console.log('[KPI API] 전체매출 기여도 순위 조회');

        // employees 테이블과 JOIN하여 영업담당만 필터링 (role1 또는 role2가 '영업담당')
        const [rankings] = await connection.execute(
            `SELECT
                k.id,
                k.employeeName,
                k.assignedCompanies,
                k.accumulatedSales,
                k.totalSalesContribution,
                k.totalSalesContributionRank as \`rank\`,
                k.lastUpdated
            FROM kpi_sales k
            INNER JOIN employees e ON k.id = e.id
            WHERE (e.role1 = '영업담당' OR e.role2 = '영업담당')
                AND e.status = '재직'
            ORDER BY k.totalSalesContributionRank ASC`
        );

        res.json({
            success: true,
            data: rankings.map(r => {
                const sales = parseFloat(r.accumulatedSales);
                const contribution = parseFloat(r.totalSalesContribution);
                return {
                    rank: r.rank,
                    employeeId: r.id,
                    employeeName: r.employeeName,
                    assignedCompanies: r.assignedCompanies,
                    accumulatedSales: isNaN(sales) ? 0 : sales,
                    totalSalesContribution: isNaN(contribution) ? 0 : contribution,
                    lastUpdated: r.lastUpdated
                };
            })
        });

    } catch (error) {
        console.error('[KPI API] 전체매출 순위 조회 실패:', error);
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.',
            error: error.message
        });
    } finally {
        // Connection is shared, no need to release
    }
};

/**
 * 주요제품매출 기여도 순위 조회
 * GET /api/kpi/admin/ranking/main
 */
export const getMainProductRanking = async (req, res) => {
    let connection;

    try {
        connection = await getDB();

        console.log('[KPI API] 주요제품매출 기여도 순위 조회');

        // employees 테이블과 JOIN하여 영업담당만 필터링 (role1 또는 role2가 '영업담당')
        const [rankings] = await connection.execute(
            `SELECT
                k.id,
                k.employeeName,
                k.mainProductCompanies,
                k.mainProductSales,
                k.mainProductContribution,
                k.mainProductContributionRank as \`rank\`,
                k.lastUpdated
            FROM kpi_sales k
            INNER JOIN employees e ON k.id = e.id
            WHERE (e.role1 = '영업담당' OR e.role2 = '영업담당')
                AND e.status = '재직'
            ORDER BY k.mainProductContributionRank ASC`
        );

        res.json({
            success: true,
            data: rankings.map(r => {
                const sales = parseFloat(r.mainProductSales);
                const contribution = parseFloat(r.mainProductContribution);
                return {
                    rank: r.rank,
                    employeeId: r.id,
                    employeeName: r.employeeName,
                    mainProductCompanies: r.mainProductCompanies,
                    mainProductSales: isNaN(sales) ? 0 : sales,
                    mainProductContribution: isNaN(contribution) ? 0 : contribution,
                    lastUpdated: r.lastUpdated
                };
            })
        });

    } catch (error) {
        console.error('[KPI API] 주요제품매출 순위 조회 실패:', error);
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.',
            error: error.message
        });
    } finally {
        // Connection is shared, no need to release
    }
};

/**
 * 매출집중도 상세 데이터 조회
 * GET /api/kpi/admin/sales-concentration/detail
 */
export const getSalesConcentrationDetail = async (req, res) => {
    let connection;

    try {
        connection = await getDB();

        console.log('[KPI API] 매출집중도 상세 데이터 조회');

        // 거래처별 누적매출 및 월수 집계 조회 (영업담당자가 확인한 보고서만)
        const [concentrationData] = await connection.execute(
            `SELECT
                c.keyValue as id,
                c.finalCompanyName as companyName,
                COALESCE(SUM(r.actualSalesAmount), 0) as salesAmount,
                COUNT(DISTINCT DATE_FORMAT(r.submittedDate, '%Y-%m')) as monthCount
            FROM companies c
            INNER JOIN reports r ON c.keyValue = r.companyId
            WHERE r.status = '확인'
                AND r.submittedDate >= DATE_SUB(CURDATE(), INTERVAL 1 YEAR)
                AND c.businessStatus = '활성'
            GROUP BY c.keyValue, c.finalCompanyName
            HAVING salesAmount > 0
            ORDER BY salesAmount DESC
            LIMIT 100`
        );

        res.json({
            success: true,
            data: concentrationData.map(row => ({
                companyId: row.id,
                companyName: row.companyName,
                salesAmount: parseFloat(row.salesAmount) || 0,
                monthCount: parseInt(row.monthCount) || 0
            }))
        });

    } catch (error) {
        console.error('[KPI API] 매출집중도 상세 데이터 조회 실패:', error);
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.',
            error: error.message
        });
    } finally {
        // Connection is shared, no need to release
    }
};

// ============================================
// [헬퍼 함수]
// ============================================

/**
 * KPI 응답 포맷팅 (id, createdAt, lastUpdated 제거, employeeId/employeeName은 유지)
 */
function formatKPIResponse(kpiData) {
    if (!kpiData) return null;

    const { id, createdAt, lastUpdated, ...kpi } = kpiData;

    // 숫자 타입 변환
    return Object.keys(kpi).reduce((acc, key) => {
        const value = kpi[key];

        // DECIMAL 타입을 숫자로 변환
        if (typeof value === 'string' && !isNaN(value)) {
            acc[key] = parseFloat(value);
        } else {
            acc[key] = value;
        }

        return acc;
    }, {});
}
