/**
 * 임시 순위 확인 API - 기여도 순위 문제 디버깅
 */
import express from 'express';
import { getDB } from '../config/database.js';

const router = express.Router();

// 전체매출 기여도 순위 문제 확인
router.get('/check-total-ranking', async (req, res) => {
    let connection;

    try {
        connection = await getDB();

        const result = {
            timestamp: new Date().toISOString(),
            step1: {},
            step2: {},
            step3: {},
            analysis: {}
        };

        // Step 1: kpi_sales 전체 데이터 확인
        const [allKpi] = await connection.execute(`
            SELECT
                k.id,
                k.employeeName,
                k.totalSalesContributionRank,
                k.accumulatedSales,
                k.totalSalesContribution,
                e.status as employeeStatus,
                e.role1,
                e.role2
            FROM kpi_sales k
            LEFT JOIN employees e ON k.id = e.id
            ORDER BY k.totalSalesContributionRank ASC
        `);

        result.step1 = {
            description: 'kpi_sales 테이블 전체 데이터',
            totalRecords: allKpi.length,
            data: allKpi.map(r => ({
                rank: r.totalSalesContributionRank,
                name: r.employeeName,
                status: r.employeeStatus,
                role1: r.role1,
                role2: r.role2,
                sales: parseFloat(r.accumulatedSales) || 0,
                contribution: parseFloat(r.totalSalesContribution) || 0
            }))
        };

        // Step 2: 영업담당 & 재직자만 필터링 (현재 API 로직)
        const [filteredKpi] = await connection.execute(`
            SELECT
                k.id,
                k.employeeName,
                k.totalSalesContributionRank,
                k.accumulatedSales,
                k.totalSalesContribution
            FROM kpi_sales k
            INNER JOIN employees e ON k.id = e.id
            WHERE (e.role1 = '영업담당' OR e.role2 = '영업담당')
                AND e.status = '재직'
            ORDER BY k.totalSalesContributionRank ASC
        `);

        result.step2 = {
            description: '영업담당 & 재직자만 필터링',
            totalRecords: filteredKpi.length,
            maxRank: filteredKpi.length > 0 ? Math.max(...filteredKpi.map(r => r.totalSalesContributionRank)) : 0,
            data: filteredKpi.map(r => ({
                rank: r.totalSalesContributionRank,
                name: r.employeeName,
                sales: parseFloat(r.accumulatedSales) || 0,
                contribution: parseFloat(r.totalSalesContribution) || 0
            }))
        };

        // Step 3: 영업담당 전체 (재직 + 퇴사)
        const [allSales] = await connection.execute(`
            SELECT
                e.id,
                e.name,
                e.status,
                k.totalSalesContributionRank
            FROM employees e
            LEFT JOIN kpi_sales k ON e.id = k.id
            WHERE (e.role1 = '영업담당' OR e.role2 = '영업담당')
            ORDER BY e.status DESC, k.totalSalesContributionRank ASC
        `);

        result.step3 = {
            description: '영업담당 전체 (재직 + 퇴사)',
            total: allSales.length,
            active: allSales.filter(e => e.status === '재직').length,
            retired: allSales.filter(e => e.status === '퇴사').length,
            data: allSales.map(e => ({
                name: e.name,
                status: e.status,
                rank: e.totalSalesContributionRank,
                hasKpiData: e.totalSalesContributionRank !== null
            }))
        };

        // Analysis
        result.analysis = {
            problem: filteredKpi.length !== result.step2.maxRank
                ? '순위 불일치 발견'
                : '순위 일치',
            expectedEmployees: result.step3.active,
            actualRecords: filteredKpi.length,
            highestRank: result.step2.maxRank,
            missingRanks: []
        };

        // 빠진 순위 찾기
        const ranks = filteredKpi.map(r => r.totalSalesContributionRank).sort((a, b) => a - b);
        for (let i = 1; i <= result.step2.maxRank; i++) {
            if (!ranks.includes(i)) {
                result.analysis.missingRanks.push(i);
            }
        }

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('순위 확인 오류:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 주요제품 기여도 순위 문제 확인
router.get('/check-main-ranking', async (req, res) => {
    let connection;

    try {
        connection = await getDB();

        const result = {
            timestamp: new Date().toISOString(),
            step1: {},
            step2: {},
            analysis: {}
        };

        // Step 1: kpi_sales 전체 데이터 확인
        const [allKpi] = await connection.execute(`
            SELECT
                k.id,
                k.employeeName,
                k.mainProductContributionRank,
                k.mainProductSales,
                k.mainProductContribution,
                e.status as employeeStatus,
                e.role1,
                e.role2
            FROM kpi_sales k
            LEFT JOIN employees e ON k.id = e.id
            ORDER BY k.mainProductContributionRank ASC
        `);

        result.step1 = {
            description: 'kpi_sales 테이블 전체 데이터 (주요제품)',
            totalRecords: allKpi.length,
            data: allKpi.map(r => ({
                rank: r.mainProductContributionRank,
                name: r.employeeName,
                status: r.employeeStatus,
                role1: r.role1,
                role2: r.role2,
                sales: parseFloat(r.mainProductSales) || 0,
                contribution: parseFloat(r.mainProductContribution) || 0
            }))
        };

        // Step 2: 영업담당 & 재직자만 필터링
        const [filteredKpi] = await connection.execute(`
            SELECT
                k.id,
                k.employeeName,
                k.mainProductContributionRank,
                k.mainProductSales,
                k.mainProductContribution
            FROM kpi_sales k
            INNER JOIN employees e ON k.id = e.id
            WHERE (e.role1 = '영업담당' OR e.role2 = '영업담당')
                AND e.status = '재직'
            ORDER BY k.mainProductContributionRank ASC
        `);

        result.step2 = {
            description: '영업담당 & 재직자만 필터링 (주요제품)',
            totalRecords: filteredKpi.length,
            maxRank: filteredKpi.length > 0 ? Math.max(...filteredKpi.map(r => r.mainProductContributionRank)) : 0,
            data: filteredKpi.map(r => ({
                rank: r.mainProductContributionRank,
                name: r.employeeName,
                sales: parseFloat(r.mainProductSales) || 0,
                contribution: parseFloat(r.mainProductContribution) || 0
            }))
        };

        // Analysis
        result.analysis = {
            problem: filteredKpi.length !== result.step2.maxRank
                ? '순위 불일치 발견'
                : '순위 일치',
            actualRecords: filteredKpi.length,
            highestRank: result.step2.maxRank,
            missingRanks: []
        };

        // 빠진 순위 찾기
        const ranks = filteredKpi.map(r => r.mainProductContributionRank).sort((a, b) => a - b);
        for (let i = 1; i <= result.step2.maxRank; i++) {
            if (!ranks.includes(i)) {
                result.analysis.missingRanks.push(i);
            }
        }

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('주요제품 순위 확인 오류:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

export default router;
