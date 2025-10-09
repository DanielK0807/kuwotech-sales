/**
 * ============================================
 * KUWOTECH 영업관리 시스템 - KPI Controller
 * 파일: backend/controllers/kpi.controller.js
 * Created by: Daniel.K
 * Date: 2025-01-28
 * 설명: KPI 계산 및 조회 로직 (ES6 모듈)
 * ============================================
 */

import { getDB } from '../config/database.js';

// ============================================
// [영업담당 KPI]
// ============================================

/**
 * 영업담당 개인 KPI 조회
 * GET /api/kpi/sales/:employeeId
 */
export const getSalesKPI = async (req, res) => {
    let connection;

    try {
        const { employeeId } = req.params;
        const db = await getDB();
        connection = await db.getConnection();

        console.log('[KPI API] 영업담당 KPI 조회:', employeeId);

        // 1. 직원 정보 조회 (id 또는 name으로 조회)
        const [employees] = await connection.execute(
            'SELECT * FROM employees WHERE (id = ? OR name = ?) AND status = ?',
            [employeeId, employeeId, '재직']
        );

        if (employees.length === 0) {
            return res.status(404).json({
                success: false,
                message: '직원 정보를 찾을 수 없습니다.'
            });
        }

        const employee = employees[0];

        // 2. 담당 거래처 조회 (거래상태≠'불용')
        const [companies] = await connection.execute(
            `SELECT * FROM companies
             WHERE internalManager = ?
             AND tradeStatus != ?`,
            [employee.name, '불용']
        );

        // 3. 전사 집계 데이터 조회 (기여도 계산용)
        const [totals] = await connection.execute(
            `SELECT
                COALESCE(SUM(cumulativeSales), 0) as totalSales,
                COALESCE(SUM(COALESCE(implant, 0) + COALESCE(zirconia, 0) + COALESCE(abutment, 0)), 0) as totalMainProductSales
             FROM companies
             WHERE tradeStatus != ?`,
            ['불용']
        );

        const totalsData = {
            전사누적매출: parseFloat(totals[0].totalSales) || 0,
            전사주요제품매출: parseFloat(totals[0].totalMainProductSales) || 0
        };

        // 4. KPI 계산
        const kpi = calculateSalesKPI(employee, companies, totalsData);

        res.json({
            success: true,
            data: kpi
        });

    } catch (error) {
        console.error('[KPI API] 영업담당 KPI 조회 실패:', error);
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.',
            error: error.message
        });
    } finally {
        if (connection) connection.release();
    }
};

/**
 * 영업담당 담당 거래처 목록 조회
 * GET /api/kpi/sales/:employeeId/companies
 */
export const getSalesCompanies = async (req, res) => {
    let connection;

    try {
        const { employeeId } = req.params;
        const db = await getDB();
        connection = await db.getConnection();

        // 직원 정보 조회
        const [employees] = await connection.execute(
            'SELECT name FROM employees WHERE id = ?',
            [employeeId]
        );

        if (employees.length === 0) {
            return res.status(404).json({
                success: false,
                message: '직원 정보를 찾을 수 없습니다.'
            });
        }

        const employeeName = employees[0].name;

        // 담당 거래처 조회
        const [companies] = await connection.execute(
            `SELECT * FROM companies
             WHERE internalManager = ?
             AND tradeStatus != ?
             ORDER BY companyName`,
            [employeeName, '불용']
        );

        res.json({
            success: true,
            data: {
                companies: companies,
                count: companies.length
            }
        });

    } catch (error) {
        console.error('[KPI API] 거래처 조회 실패:', error);
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.',
            error: error.message
        });
    } finally {
        if (connection) connection.release();
    }
};

// ============================================
// [관리자 KPI]
// ============================================

/**
 * 전사 KPI 조회
 * GET /api/kpi/admin
 */
export const getAdminKPI = async (req, res) => {
    let connection;

    try {
        const db = await getDB();
        connection = await db.getConnection();

        console.log('[KPI API] 전사 KPI 조회');

        // 1. 전체 거래처 조회
        const [allCompanies] = await connection.execute(
            'SELECT * FROM companies WHERE tradeStatus != ?',
            ['불용']
        );

        // 2. 영업담당자 수 조회
        const [employees] = await connection.execute(
            `SELECT * FROM employees
             WHERE role = ?
             AND status = ?`,
            ['영업담당', '재직']
        );

        // 3. KPI 계산
        const kpi = calculateAdminKPI(allCompanies, employees);

        res.json({
            success: true,
            data: kpi
        });

    } catch (error) {
        console.error('[KPI API] 전사 KPI 조회 실패:', error);
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.',
            error: error.message
        });
    } finally {
        if (connection) connection.release();
    }
};

/**
 * 영업사원별 매출 순위 조회
 * GET /api/kpi/admin/ranking
 */
export const getRanking = async (req, res) => {
    let connection;

    try {
        const db = await getDB();
        connection = await db.getConnection();

        console.log('[KPI API] 매출 순위 조회');

        // 영업담당자별 매출 집계
        const [rankings] = await connection.execute(
            `SELECT
                e.id,
                e.name,
                e.department,
                e.joinDate,
                COALESCE(SUM(c.cumulativeSales), 0) as totalSales,
                COALESCE(SUM(COALESCE(c.implant, 0) + COALESCE(c.zirconia, 0) + COALESCE(c.abutment, 0)), 0) as mainProductSales,
                COUNT(c.id) as companyCount
             FROM employees e
             LEFT JOIN companies c ON e.name = c.internalManager AND c.tradeStatus != '불용'
             WHERE e.role = '영업담당' AND e.status = '재직'
             GROUP BY e.id, e.name, e.department, e.joinDate
             ORDER BY totalSales DESC`
        );

        // 전사 총 매출 계산
        const totalSales = rankings.reduce((sum, r) => sum + parseFloat(r.totalSales), 0);
        const totalMainProductSales = rankings.reduce((sum, r) => sum + parseFloat(r.mainProductSales), 0);

        // 기여도 계산
        const rankingsWithContribution = rankings.map((r, index) => ({
            rank: index + 1,
            employeeId: r.id,
            employeeName: r.name,
            department: r.department,
            joinDate: r.joinDate,
            companyCount: r.companyCount,
            totalSales: parseFloat(r.totalSales),
            mainProductSales: parseFloat(r.mainProductSales),
            totalContribution: totalSales > 0 ? (parseFloat(r.totalSales) / totalSales * 100) : 0,
            mainProductContribution: totalMainProductSales > 0 ? (parseFloat(r.mainProductSales) / totalMainProductSales * 100) : 0
        }));

        res.json({
            success: true,
            data: {
                rankings: rankingsWithContribution,
                totals: {
                    totalSales,
                    totalMainProductSales
                }
            }
        });

    } catch (error) {
        console.error('[KPI API] 순위 조회 실패:', error);
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.',
            error: error.message
        });
    } finally {
        if (connection) connection.release();
    }
};

/**
 * 특정 타입의 순위 조회
 * GET /api/kpi/admin/ranking/:type
 */
export const getRankingByType = async (req, res) => {
    let connection;

    try {
        const { type } = req.params; // 'total' or 'main'
        const db = await getDB();
        connection = await db.getConnection();

        console.log('[KPI API] 순위 조회 (타입:', type, ')');

        const orderBy = type === 'main' ? 'mainProductSales' : 'totalSales';

        const [rankings] = await connection.execute(
            `SELECT
                e.id,
                e.name,
                e.department,
                e.joinDate,
                COALESCE(SUM(c.cumulativeSales), 0) as totalSales,
                COALESCE(SUM(COALESCE(c.implant, 0) + COALESCE(c.zirconia, 0) + COALESCE(c.abutment, 0)), 0) as mainProductSales
             FROM employees e
             LEFT JOIN companies c ON e.name = c.internalManager AND c.tradeStatus != '불용'
             WHERE e.role = '영업담당' AND e.status = '재직'
             GROUP BY e.id, e.name, e.department, e.joinDate
             ORDER BY ${orderBy} DESC`
        );

        res.json({
            success: true,
            data: rankings
        });

    } catch (error) {
        console.error('[KPI API] 타입별 순위 조회 실패:', error);
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.',
            error: error.message
        });
    } finally {
        if (connection) connection.release();
    }
};

// ============================================
// [공통 함수]
// ============================================

/**
 * 전사 집계 데이터 조회
 * GET /api/kpi/totals
 */
export const getTotals = async (req, res) => {
    let connection;

    try {
        const db = await getDB();
        connection = await db.getConnection();

        const [totals] = await connection.execute(
            `SELECT
                COALESCE(SUM(cumulativeSales), 0) as totalSales,
                COALESCE(SUM(COALESCE(implant, 0) + COALESCE(zirconia, 0) + COALESCE(abutment, 0)), 0) as totalMainProductSales,
                COUNT(*) as totalCompanies
             FROM companies
             WHERE tradeStatus != ?`,
            ['불용']
        );

        res.json({
            success: true,
            data: {
                전사누적매출: parseFloat(totals[0].totalSales) || 0,
                전사주요제품매출: parseFloat(totals[0].totalMainProductSales) || 0,
                전체거래처수: totals[0].totalCompanies || 0
            }
        });

    } catch (error) {
        console.error('[KPI API] 전사 집계 조회 실패:', error);
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.',
            error: error.message
        });
    } finally {
        if (connection) connection.release();
    }
};

// ============================================
// [KPI 계산 로직 - 내부 함수]
// ============================================

/**
 * 영업담당 KPI 계산
 */
function calculateSalesKPI(employee, companies, totals) {
    const kpi = {};

    // 거래처 관리 지표 (4개)
    kpi.담당거래처 = companies.length;
    kpi.활성거래처 = companies.filter(c => c.tradeStatus === '활성').length;
    kpi.활성화율 = kpi.담당거래처 > 0 ? (kpi.활성거래처 / kpi.담당거래처) * 100 : 0;
    kpi.주요제품판매거래처 = calculateMainProductCompanies(companies);

    // 목표 달성 지표 (2개)
    kpi.회사배정기준대비달성율 = ((kpi.담당거래처 / 80) - 1) * 100;
    kpi.주요고객처목표달성율 = (kpi.주요제품판매거래처 / 40) * 100;

    // 매출 성과 지표 (3개)
    kpi.누적매출금액 = companies.reduce((sum, c) => sum + (parseFloat(c.cumulativeSales) || 0), 0);
    kpi.주요제품매출액 = calculateMainProductSales(companies);

    const 현재월수 = calculateCurrentMonths(employee.joinDate);
    kpi.매출집중도 = kpi.담당거래처 > 0 && 현재월수 > 0
        ? (kpi.누적매출금액 / kpi.담당거래처) / 현재월수
        : 0;

    // 재무 및 기여도 지표 (5개)
    kpi.누적수금금액 = companies.reduce((sum, c) => sum + (parseFloat(c.cumulativeCollection) || 0), 0);
    kpi.매출채권잔액 = companies.reduce((sum, c) => sum + (parseFloat(c.accountsReceivable) || 0), 0);
    kpi.주요제품매출비율 = kpi.누적매출금액 > 0
        ? (kpi.주요제품매출액 / kpi.누적매출금액) * 100
        : 0;
    kpi.전체매출기여도 = totals.전사누적매출 > 0
        ? (kpi.누적매출금액 / totals.전사누적매출) * 100
        : 0;
    kpi.주요제품매출기여도 = totals.전사주요제품매출 > 0
        ? (kpi.주요제품매출액 / totals.전사주요제품매출) * 100
        : 0;

    // 추가 정보
    kpi.현재월수 = 현재월수;
    kpi.담당자명 = `${employee.name}(입사일자: ${employee.joinDate})`;

    return kpi;
}

/**
 * 관리자 KPI 계산
 */
function calculateAdminKPI(allCompanies, employees) {
    const kpi = {};
    const 영업담당자수 = employees.length;

    // 전사 거래처 지표 (4개)
    kpi.전체거래처 = allCompanies.length;
    kpi.활성거래처 = allCompanies.filter(c => c.tradeStatus === '활성').length;
    kpi.활성화율 = kpi.전체거래처 > 0 ? (kpi.활성거래처 / kpi.전체거래처) * 100 : 0;
    kpi.주요제품판매거래처 = calculateMainProductCompanies(allCompanies);

    // 전사 목표 달성 (2개)
    const 목표거래처수 = 80 * 영업담당자수;
    kpi.회사배정기준대비달성율 = 목표거래처수 > 0
        ? ((kpi.전체거래처 / 목표거래처수) - 1) * 100
        : 0;

    const 주요고객목표 = 40 * 영업담당자수;
    kpi.주요고객처목표달성율 = 주요고객목표 > 0
        ? (kpi.주요제품판매거래처 / 주요고객목표) * 100
        : 0;

    // 전사 매출 지표 (5개)
    kpi.누적매출금액 = allCompanies.reduce((sum, c) => sum + (parseFloat(c.cumulativeSales) || 0), 0);
    kpi.누적수금금액 = allCompanies.reduce((sum, c) => sum + (parseFloat(c.cumulativeCollection) || 0), 0);
    kpi.매출채권잔액 = allCompanies.reduce((sum, c) => sum + (parseFloat(c.accountsReceivable) || 0), 0);
    kpi.주요제품매출액 = calculateMainProductSales(allCompanies);

    const 현재월수 = new Date().getMonth(); // 0-11
    kpi.매출집중도 = kpi.전체거래처 > 0 && 현재월수 > 0
        ? (kpi.누적매출금액 / kpi.전체거래처) / 현재월수
        : 0;

    // 전사 기여도 지표 (3개)
    kpi.주요제품매출비율 = kpi.누적매출금액 > 0
        ? (kpi.주요제품매출액 / kpi.누적매출금액) * 100
        : 0;
    kpi.전체매출기여도 = '클릭하여 상세 확인';
    kpi.주요제품매출기여도 = '클릭하여 상세 확인';

    // 추가 정보
    kpi.현재월수 = 현재월수;
    kpi.영업담당자수 = 영업담당자수;

    return kpi;
}

/**
 * 주요제품 판매 거래처 계산 (3단계 우선순위)
 */
function calculateMainProductCompanies(companies) {
    // 1단계: 임플란트
    const implantCompanies = companies.filter(c =>
        c.implant && parseFloat(c.implant) > 0
    );

    // 2단계: 지르코니아 (1단계 제외)
    const implantIds = new Set(implantCompanies.map(c => c.id));
    const zirconiaCompanies = companies.filter(c =>
        !implantIds.has(c.id) &&
        c.zirconia && parseFloat(c.zirconia) > 0
    );

    // 3단계: Abutment (1,2단계 제외)
    const zirconiaIds = new Set(zirconiaCompanies.map(c => c.id));
    const abutmentCompanies = companies.filter(c =>
        !implantIds.has(c.id) &&
        !zirconiaIds.has(c.id) &&
        c.abutment && parseFloat(c.abutment) > 0
    );

    return implantCompanies.length + zirconiaCompanies.length + abutmentCompanies.length;
}

/**
 * 주요제품 매출액 계산
 */
function calculateMainProductSales(companies) {
    return companies.reduce((sum, c) => {
        const implantSales = parseFloat(c.implant) || 0;
        const zirconiaSales = parseFloat(c.zirconia) || 0;
        const abutmentSales = parseFloat(c.abutment) || 0;
        return sum + implantSales + zirconiaSales + abutmentSales;
    }, 0);
}

/**
 * 현재월수 계산
 */
function calculateCurrentMonths(joinDate) {
    if (!joinDate) return 1;

    const today = new Date();
    const join = new Date(joinDate);
    const daysSinceJoin = Math.floor((today - join) / (1000 * 60 * 60 * 24));

    if (daysSinceJoin >= 365) {
        // 1년 이상: 올해 1월 1일부터
        const yearStart = new Date(today.getFullYear(), 0, 1);
        const daysSinceYearStart = Math.floor((today - yearStart) / (1000 * 60 * 60 * 24));
        return Math.max(1, Math.floor(daysSinceYearStart / 30));
    } else {
        // 1년 미만: 입사일부터
        return Math.max(1, Math.floor(daysSinceJoin / 30));
    }
}
