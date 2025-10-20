/**
 * 임시 계산 API - 정이권 누적매출금액 검증
 */
import express from 'express';
import { getDB } from '../config/database.js';

const router = express.Router();

// 정이권 누적매출금액 계산 및 검증
router.get('/calculate-jung', async (req, res) => {
    let connection;

    try {
        connection = await getDB();

        const result = {
            timestamp: new Date().toISOString(),
            employee: '정이권',
            step1: {},
            step2: {},
            step3: {},
            verification: {}
        };

        // Step 1: 정이권이 담당하는 거래처 조회 (불용 제외)
        const [companies] = await connection.execute(`
            SELECT
                keyValue,
                finalCompanyName,
                businessStatus,
                accumulatedSales,
                accumulatedCollection,
                salesProduct
            FROM companies
            WHERE internalManager = '정이권'
            AND businessStatus != '불용'
            ORDER BY accumulatedSales DESC
        `);

        result.step1 = {
            description: '정이권이 담당하는 거래처 조회 (불용 제외)',
            totalCompanies: companies.length,
            companies: companies.map(c => ({
                name: c.finalCompanyName,
                status: c.businessStatus,
                sales: parseFloat(c.accumulatedSales) || 0,
                collection: parseFloat(c.accumulatedCollection) || 0,
                product: c.salesProduct
            }))
        };

        // Step 2: 누적 금액 직접 계산
        let calculatedSales = 0;
        let calculatedCollection = 0;

        companies.forEach(c => {
            calculatedSales += parseFloat(c.accumulatedSales) || 0;
            calculatedCollection += parseFloat(c.accumulatedCollection) || 0;
        });

        result.step2 = {
            description: '거래처 누적 금액 합산',
            calculatedSales: calculatedSales,
            calculatedCollection: calculatedCollection,
            calculation: `SUM(accumulatedSales) from ${companies.length} companies`
        };

        // Step 3: KPI 테이블의 저장값 조회
        const [kpiRows] = await connection.execute(`
            SELECT
                employeeName,
                accumulatedSales,
                accumulatedCollection,
                assignedCompanies,
                activeCompanies,
                lastUpdated
            FROM kpi_sales
            WHERE employeeName = '정이권'
        `);

        if (kpiRows.length > 0) {
            const kpi = kpiRows[0];
            result.step3 = {
                description: 'KPI 테이블 저장값',
                kpiSales: parseFloat(kpi.accumulatedSales) || 0,
                kpiCollection: parseFloat(kpi.accumulatedCollection) || 0,
                assignedCompanies: kpi.assignedCompanies,
                activeCompanies: kpi.activeCompanies,
                lastUpdated: kpi.lastUpdated
            };

            // Verification
            const salesDiff = calculatedSales - (parseFloat(kpi.accumulatedSales) || 0);
            const collectionDiff = calculatedCollection - (parseFloat(kpi.accumulatedCollection) || 0);

            result.verification = {
                salesMatch: salesDiff === 0,
                collectionMatch: collectionDiff === 0,
                salesDifference: salesDiff,
                collectionDifference: collectionDiff,
                message: (salesDiff === 0 && collectionDiff === 0)
                    ? '✅ 완벽하게 일치합니다!'
                    : '⚠️ 불일치 발견! KPI 재계산 필요'
            };
        } else {
            result.step3 = {
                description: 'KPI 테이블 저장값',
                error: 'KPI 데이터 없음'
            };
            result.verification = {
                message: '❌ KPI 테이블에 정이권 데이터가 없습니다.'
            };
        }

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('계산 오류:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

export default router;
