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

            return res.json({
                success: true,
                data: formatKPIResponse(newKpiData[0]),
                cached: false
            });
        }

        // 2. 캐시된 데이터 반환
        res.json({
            success: true,
            data: formatKPIResponse(kpiData[0]),
            cached: true,
            lastUpdated: kpiData[0].lastUpdated
        });

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

            return res.json({
                success: true,
                data: formatKPIResponse(newKpiData[0]),
                cached: false
            });
        }

        // 2. 캐시된 데이터 반환
        res.json({
            success: true,
            data: formatKPIResponse(kpiData[0]),
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
                k.담당거래처,
                k.누적매출금액,
                k.전체매출기여도,
                k.전체매출기여도순위 as \`rank\`,
                k.lastUpdated
            FROM kpi_sales k
            INNER JOIN employees e ON k.id = e.id
            WHERE (e.role1 = '영업담당' OR e.role2 = '영업담당')
                AND e.status = '재직'
            ORDER BY k.전체매출기여도순위 ASC`
        );

        res.json({
            success: true,
            data: rankings.map(r => {
                const sales = parseFloat(r.누적매출금액);
                const contribution = parseFloat(r.전체매출기여도);
                return {
                    rank: r.rank,
                    employeeId: r.id,
                    employeeName: r.employeeName,
                    담당거래처: r.담당거래처,
                    누적매출금액: isNaN(sales) ? 0 : sales,
                    전체매출기여도: isNaN(contribution) ? 0 : contribution,
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
                k.주요제품판매거래처,
                k.주요제품매출액,
                k.주요제품매출기여도,
                k.주요제품매출기여도순위 as \`rank\`,
                k.lastUpdated
            FROM kpi_sales k
            INNER JOIN employees e ON k.id = e.id
            WHERE (e.role1 = '영업담당' OR e.role2 = '영업담당')
                AND e.status = '재직'
            ORDER BY k.주요제품매출기여도순위 ASC`
        );

        res.json({
            success: true,
            data: rankings.map(r => {
                const sales = parseFloat(r.주요제품매출액);
                const contribution = parseFloat(r.주요제품매출기여도);
                return {
                    rank: r.rank,
                    employeeId: r.id,
                    employeeName: r.employeeName,
                    주요제품판매거래처: r.주요제품판매거래처,
                    주요제품매출액: isNaN(sales) ? 0 : sales,
                    주요제품매출기여도: isNaN(contribution) ? 0 : contribution,
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

// ============================================
// [헬퍼 함수]
// ============================================

/**
 * KPI 응답 포맷팅 (id, createdAt, lastUpdated 제거)
 */
function formatKPIResponse(kpiData) {
    if (!kpiData) return null;

    const { id, createdAt, lastUpdated, employeeId, employeeName, ...kpi } = kpiData;

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
