// ============================================
// 마이그레이션 실행 API (임시 - 개발용)
// ============================================
import express from 'express';
import { getDB } from '../config/database.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// POST /api/migration/regions - regions 테이블 마이그레이션 실행
router.post('/regions', async (req, res) => {
  try {
    const db = await getDB();
    const results = [];

    // 005: regions 테이블 생성
    console.log('Step 1: Creating regions table...');
    const sql005 = await fs.readFile(
      path.join(__dirname, '../migrations/005_create_regions_table.sql'),
      'utf-8'
    );

    const statements005 = sql005
      .split(';')
      .map(s => s.trim())
      .filter(s => {
        if (!s) return false;
        if (s.startsWith('--')) return false;
        // 확인 쿼리는 제외 (SELECT, DESCRIBE)
        const upperStmt = s.toUpperCase();
        if (upperStmt.startsWith('SELECT') || upperStmt.startsWith('DESCRIBE')) return false;
        return true;
      });

    for (const stmt of statements005) {
      if (stmt) {
        try {
          await db.execute(stmt);
          results.push({ step: '005', statement: stmt.substring(0, 100), status: 'success' });
        } catch (err) {
          if (err.code === 'ER_DUP_FIELDNAME' || err.code === 'ER_TABLE_EXISTS_ERROR') {
            results.push({ step: '005', statement: stmt.substring(0, 100), status: 'already_exists' });
          } else {
            throw err;
          }
        }
      }
    }

    // 006: region_id 업데이트
    console.log('Step 2: Populating region_id...');
    const sql006 = await fs.readFile(
      path.join(__dirname, '../migrations/006_populate_region_ids.sql'),
      'utf-8'
    );

    const statements006 = sql006
      .split(';')
      .map(s => s.trim())
      .filter(s => {
        if (!s) return false;
        if (s.startsWith('--')) return false;
        // UPDATE 문만 실행 (SELECT는 제외)
        const upperStmt = s.toUpperCase();
        if (upperStmt.startsWith('UPDATE')) return true;
        return false;
      });

    for (const stmt of statements006) {
      if (stmt) {
        const [result] = await db.execute(stmt);
        results.push({
          step: '006',
          statement: stmt.substring(0, 100),
          affected: result.affectedRows,
          status: 'success'
        });
      }
    }

    // 결과 확인
    const [regions] = await db.execute('SELECT * FROM regions ORDER BY display_order');

    const [stats] = await db.execute(`
      SELECT
        r.region_name,
        COUNT(c.keyValue) as count
      FROM regions r
      LEFT JOIN companies c ON c.region_id = r.id
      GROUP BY r.id, r.region_name
      ORDER BY r.display_order
    `);

    const [[totalStats]] = await db.execute(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN region_id IS NOT NULL THEN 1 ELSE 0 END) as mapped,
        SUM(CASE WHEN region_id IS NULL AND customerRegion IS NOT NULL AND customerRegion != '' THEN 1 ELSE 0 END) as failed
      FROM companies
    `);

    res.json({
      success: true,
      message: 'Migration completed successfully',
      execution: results,
      regions: regions,
      stats: stats,
      summary: totalStats
    });

  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: error.code
    });
  }
});

// GET /api/migration/status - 마이그레이션 상태 확인
router.get('/status', async (req, res) => {
  try {
    const db = await getDB();

    // regions 테이블 존재 여부 확인
    const [tables] = await db.execute(`
      SELECT COUNT(*) as count
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'regions'
    `);

    const regionsExists = tables[0].count > 0;

    if (!regionsExists) {
      return res.json({
        success: true,
        migrated: false,
        message: 'regions 테이블이 아직 생성되지 않았습니다.'
      });
    }

    // regions 테이블 데이터 확인
    const [regions] = await db.execute('SELECT COUNT(*) as count FROM regions');

    // companies.region_id 컬럼 존재 여부
    const [columns] = await db.execute(`
      SELECT COUNT(*) as count
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'companies'
        AND COLUMN_NAME = 'region_id'
    `);

    const regionIdExists = columns[0].count > 0;

    // 통계
    let stats = null;
    if (regionIdExists) {
      const [[result]] = await db.execute(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN region_id IS NOT NULL THEN 1 ELSE 0 END) as mapped,
          SUM(CASE WHEN region_id IS NULL AND customerRegion IS NOT NULL AND customerRegion != '' THEN 1 ELSE 0 END) as failed
        FROM companies
      `);
      stats = result;
    }

    res.json({
      success: true,
      migrated: true,
      regionsTable: {
        exists: regionsExists,
        count: regions[0].count
      },
      regionIdColumn: {
        exists: regionIdExists
      },
      stats: stats
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/migration/check-regions - 실제 customerRegion 값 확인
router.get('/check-regions', async (req, res) => {
    try {
        const db = await getDB();

        // 1. 현재 사용 중인 customerRegion 값 조회 (앞 부분만 추출)
        const [rawRegions] = await db.execute(`
            SELECT customerRegion, COUNT(*) as count
            FROM companies
            WHERE customerRegion IS NOT NULL
              AND customerRegion != ''
            GROUP BY customerRegion
            ORDER BY customerRegion
        `);

        // customerRegion에서 첫 번째 공백 이전 값만 추출 (예: "서울 강남구" -> "서울")
        const regionMap = new Map();
        rawRegions.forEach(row => {
            const fullRegion = row.customerRegion;
            const mainRegion = fullRegion.split(' ')[0].trim(); // 첫 번째 공백 이전 값

            if (regionMap.has(mainRegion)) {
                regionMap.set(mainRegion, regionMap.get(mainRegion) + row.count);
            } else {
                regionMap.set(mainRegion, row.count);
            }
        });

        // Map을 배열로 변환하고 정렬
        const regions = Array.from(regionMap.entries())
            .map(([customerRegion, count]) => ({ customerRegion, count }))
            .sort((a, b) => a.customerRegion.localeCompare(b.customerRegion, 'ko'));

        // 2. regions 마스터 테이블 현재 데이터 조회
        const [masterRegions] = await db.execute(`
            SELECT id, region_name, region_code, display_order, is_active
            FROM regions
            ORDER BY display_order
        `);

        // 3. 불일치 확인
        const actualRegionNames = new Set(regions.map(r => r.customerRegion));
        const masterRegionNames = new Set(masterRegions.map(r => r.region_name));

        const onlyInActual = [...actualRegionNames].filter(r => !masterRegionNames.has(r));
        const onlyInMaster = [...masterRegionNames].filter(r => !actualRegionNames.has(r));

        // 4. UPDATE SQL 생성
        const insertValues = regions.map((row, i) => {
            const regionName = row.customerRegion;
            const regionCode = regionName.toUpperCase().replace(/\s+/g, '_');
            return `('${regionName}', '${regionCode}', ${i + 1}, TRUE)`;
        });

        const updateSQL = `-- Step 1: 기존 데이터 삭제
TRUNCATE TABLE regions;

-- Step 2: 실제 데이터 기반으로 INSERT
INSERT INTO regions (region_name, region_code, display_order, is_active) VALUES
${insertValues.join(',\n')};`;

        res.json({
            success: true,
            actualRegions: regions,
            masterRegions: masterRegions,
            onlyInActual: onlyInActual,
            onlyInMaster: onlyInMaster,
            updateSQL: updateSQL
        });

    } catch (error) {
        console.error('지역 확인 오류:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: '지역 확인 중 오류가 발생했습니다.',
            details: error.message
        });
    }
});

// POST /api/migration/update-regions - regions 테이블 업데이트 및 구/군 분리
router.post('/update-regions', async (req, res) => {
    try {
        const db = await getDB();

        // Step 1: region_district 컬럼 추가 (있으면 스킵)
        try {
            await db.execute(`
                ALTER TABLE companies
                ADD COLUMN region_district VARCHAR(50) NULL COMMENT '구/군 정보 (예: 강남구, 수원시)' AFTER region_id
            `);
            console.log('✅ region_district 컬럼 추가 완료');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log('ℹ️ region_district 컬럼이 이미 존재합니다');
            } else {
                throw err;
            }
        }

        // Step 2: 인덱스 추가 (있으면 스킵)
        try {
            await db.execute(`ALTER TABLE companies ADD INDEX idx_region_district (region_district)`);
        } catch (err) {
            if (err.code !== 'ER_DUP_KEYNAME') throw err;
        }

        // Step 3: 현재 사용 중인 customerRegion 값 조회
        const [rawRegions] = await db.execute(`
            SELECT customerRegion, COUNT(*) as count
            FROM companies
            WHERE customerRegion IS NOT NULL
              AND customerRegion != ''
            GROUP BY customerRegion
            ORDER BY customerRegion
        `);

        // Step 4: 시/도만 추출 (첫 번째 공백 이전)
        const regionMap = new Map();
        rawRegions.forEach(row => {
            const fullRegion = row.customerRegion;
            let mainRegion = fullRegion.split(' ')[0].trim();

            // "광주광역" → "광주" 통합
            if (mainRegion === '광주광역') {
                mainRegion = '광주';
            }

            if (regionMap.has(mainRegion)) {
                regionMap.set(mainRegion, regionMap.get(mainRegion) + row.count);
            } else {
                regionMap.set(mainRegion, row.count);
            }
        });

        const regions = Array.from(regionMap.entries())
            .map(([customerRegion, count]) => ({ customerRegion, count }))
            .sort((a, b) => a.customerRegion.localeCompare(b.customerRegion, 'ko'));

        // Step 5: Foreign key checks 비활성화
        await db.execute('SET FOREIGN_KEY_CHECKS = 0');

        // Step 6: regions 테이블 삭제 및 재생성
        await db.execute('DELETE FROM regions');

        // 시/도 정식 명칭 매핑
        const regionNameMap = {
            '서울': '서울특별시',
            '부산': '부산광역시',
            '대구': '대구광역시',
            '인천': '인천광역시',
            '광주': '광주광역시',
            '대전': '대전광역시',
            '울산': '울산광역시',
            '세종': '세종특별자치시',
            '경기': '경기도',
            '강원': '강원특별자치도',
            '충북': '충청북도',
            '충남': '충청남도',
            '전북': '전북특별자치도',
            '전남': '전라남도',
            '경북': '경상북도',
            '경남': '경상남도',
            '제주': '제주특별자치도'
        };

        for (let i = 0; i < regions.length; i++) {
            const region = regions[i];
            const shortName = region.customerRegion;

            // 정식 명칭 (한국 시/도는 매핑 테이블 사용, 해외는 그대로)
            const regionName = regionNameMap[shortName] || shortName;

            // 코드 (대문자 영문)
            const regionCode = shortName.toUpperCase().replace(/\s+/g, '_');

            await db.execute(`
                INSERT INTO regions (region_name, region_code, display_order, is_active)
                VALUES (?, ?, ?, TRUE)
            `, [regionName, regionCode, i + 1]);
        }

        // Step 7: companies 테이블의 region_id와 region_district 업데이트
        console.log('🔄 companies 테이블 region_id 및 region_district 업데이트 중...');

        // 짧은 이름 → 정식 명칭 매핑 (검색용)
        const shortToFullName = {
            '서울': '서울특별시',
            '부산': '부산광역시',
            '대구': '대구광역시',
            '인천': '인천광역시',
            '광주': '광주광역시',
            '대전': '대전광역시',
            '울산': '울산광역시',
            '세종': '세종특별자치시',
            '경기': '경기도',
            '강원': '강원특별자치도',
            '충북': '충청북도',
            '충남': '충청남도',
            '전북': '전북특별자치도',
            '전남': '전라남도',
            '경북': '경상북도',
            '경남': '경상남도',
            '제주': '제주특별자치도'
        };

        // 모든 회사의 region_id와 region_district를 업데이트
        for (const row of rawRegions) {
            const fullRegion = row.customerRegion;
            const parts = fullRegion.split(' ');
            let shortRegion = parts[0].trim();
            const district = parts.length > 1 ? parts.slice(1).join(' ').trim() : null;

            // "광주광역" → "광주" 통합
            if (shortRegion === '광주광역') {
                shortRegion = '광주';
            }

            // 정식 명칭으로 변환 (한국 시/도는 변환, 해외는 그대로)
            const fullRegionName = shortToFullName[shortRegion] || shortRegion;

            // region_id 찾기 (정식 명칭으로 검색)
            const [regionResult] = await db.execute(
                'SELECT id FROM regions WHERE region_name = ?',
                [fullRegionName]
            );

            if (regionResult.length > 0) {
                const regionId = regionResult[0].id;

                // region_id와 region_district 업데이트
                await db.execute(`
                    UPDATE companies
                    SET region_id = ?, region_district = ?
                    WHERE customerRegion = ?
                `, [regionId, district, fullRegion]);
            }
        }

        // Step 8: Foreign key checks 재활성화
        await db.execute('SET FOREIGN_KEY_CHECKS = 1');

        // Step 9: 결과 확인
        const [verifyResults] = await db.execute(`
            SELECT
                customerRegion,
                r.region_name,
                region_district,
                COUNT(*) as count
            FROM companies c
            LEFT JOIN regions r ON c.region_id = r.id
            WHERE c.customerRegion IS NOT NULL AND c.customerRegion != ''
            GROUP BY customerRegion, r.region_name, region_district
            ORDER BY customerRegion
            LIMIT 20
        `);

        res.json({
            success: true,
            message: `✅ ${regions.length}개의 시/도 지역이 업데이트되었습니다.`,
            regions: regions,
            sampleMappings: verifyResults
        });

    } catch (error) {
        console.error('지역 업데이트 오류:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: '지역 업데이트 중 오류가 발생했습니다.',
            details: error.message
        });
    }
});

// GET /api/migration/verify-districts - region_district 데이터 확인
router.get('/verify-districts', async (req, res) => {
    try {
        const db = await getDB();

        // region_district가 있는 회사들 샘플 조회
        const [companies] = await db.execute(`
            SELECT
                c.finalCompanyName,
                c.customerRegion,
                r.region_name,
                c.region_district
            FROM companies c
            LEFT JOIN regions r ON c.region_id = r.id
            WHERE c.customerRegion IS NOT NULL
              AND c.customerRegion != ''
            ORDER BY c.customerRegion
            LIMIT 30
        `);

        // 통계
        const [[stats]] = await db.execute(`
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN region_id IS NOT NULL THEN 1 ELSE 0 END) as has_region_id,
                SUM(CASE WHEN region_district IS NOT NULL AND region_district != '' THEN 1 ELSE 0 END) as has_district
            FROM companies
            WHERE customerRegion IS NOT NULL AND customerRegion != ''
        `);

        res.json({
            success: true,
            stats: stats,
            sampleCompanies: companies
        });

    } catch (error) {
        console.error('검증 오류:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: '데이터 검증 중 오류가 발생했습니다.',
            details: error.message
        });
    }
});

// GET /api/migration/check-gwangju - 광주 데이터 확인
router.get('/check-gwangju', async (req, res) => {
    try {
        const db = await getDB();

        // 광주/광주광역으로 시작하는 customerRegion 조회
        const [companies] = await db.execute(`
            SELECT
                c.finalCompanyName,
                c.customerRegion,
                r.region_name,
                c.region_district,
                c.region_id
            FROM companies c
            LEFT JOIN regions r ON c.region_id = r.id
            WHERE c.customerRegion LIKE '광주%'
            ORDER BY c.customerRegion
            LIMIT 50
        `);

        // regions 테이블에서 광주 관련 데이터 조회
        const [regions] = await db.execute(`
            SELECT id, region_name, region_code, display_order
            FROM regions
            WHERE region_name LIKE '%광주%'
            ORDER BY region_name
        `);

        res.json({
            success: true,
            companies: companies,
            regions: regions,
            count: companies.length
        });

    } catch (error) {
        console.error('광주 데이터 확인 오류:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: '광주 데이터 확인 중 오류가 발생했습니다.',
            details: error.message
        });
    }
});

// POST /api/migration/kpi-columns - KPI 테이블 컬럼명 영문화
router.post('/kpi-columns', async (req, res) => {
    try {
        const db = await getDB();
        const results = [];
        let errorCount = 0;

        console.log('🔄 KPI 테이블 컬럼명 영문화 시작...');

        // 1. KPI_SALES - 거래처 관리 지표
        try {
            await db.execute(`
                ALTER TABLE kpi_sales
                CHANGE COLUMN \`담당거래처\` \`assignedCompanies\` INT DEFAULT 0 COMMENT '담당 거래처 수',
                CHANGE COLUMN \`활성거래처\` \`activeCompanies\` INT DEFAULT 0 COMMENT '활성 거래처 수',
                CHANGE COLUMN \`활성화율\` \`activationRate\` DECIMAL(5,2) DEFAULT 0 COMMENT '활성화율 (%)',
                CHANGE COLUMN \`주요제품판매거래처\` \`mainProductCompanies\` INT DEFAULT 0 COMMENT '주요제품 판매 거래처 수'
            `);
            results.push({ step: 'kpi_sales_1', message: '✅ 거래처 관리 지표 (4개) 변경 완료' });
        } catch (err) {
            errorCount++;
            results.push({ step: 'kpi_sales_1', error: err.message });
        }

        // 2. KPI_SALES - 목표 달성 지표
        try {
            await db.execute(`
                ALTER TABLE kpi_sales
                CHANGE COLUMN \`회사배정기준대비달성율\` \`companyTargetAchievementRate\` DECIMAL(10,2) DEFAULT 0,
                CHANGE COLUMN \`주요고객처목표달성율\` \`majorCustomerTargetRate\` DECIMAL(5,2) DEFAULT 0
            `);
            results.push({ step: 'kpi_sales_2', message: '✅ 목표 달성 지표 (2개) 변경 완료' });
        } catch (err) {
            errorCount++;
            results.push({ step: 'kpi_sales_2', error: err.message });
        }

        // 3. KPI_SALES - 매출 성과 지표
        try {
            await db.execute(`
                ALTER TABLE kpi_sales
                CHANGE COLUMN \`누적매출금액\` \`accumulatedSales\` DECIMAL(15,2) DEFAULT 0,
                CHANGE COLUMN \`주요제품매출액\` \`mainProductSales\` DECIMAL(15,2) DEFAULT 0,
                CHANGE COLUMN \`매출집중도\` \`salesConcentration\` DECIMAL(15,2) DEFAULT 0
            `);
            results.push({ step: 'kpi_sales_3', message: '✅ 매출 성과 지표 (3개) 변경 완료' });
        } catch (err) {
            errorCount++;
            results.push({ step: 'kpi_sales_3', error: err.message });
        }

        // 4. KPI_SALES - 재무 및 기여도 지표
        try {
            await db.execute(`
                ALTER TABLE kpi_sales
                CHANGE COLUMN \`누적수금금액\` \`accumulatedCollection\` DECIMAL(15,2) DEFAULT 0,
                CHANGE COLUMN \`매출채권잔액\` \`accountsReceivable\` DECIMAL(15,2) DEFAULT 0,
                CHANGE COLUMN \`주요제품매출비율\` \`mainProductSalesRatio\` DECIMAL(5,2) DEFAULT 0,
                CHANGE COLUMN \`전체매출기여도\` \`totalSalesContribution\` DECIMAL(5,2) DEFAULT 0,
                CHANGE COLUMN \`주요제품매출기여도\` \`mainProductContribution\` DECIMAL(5,2) DEFAULT 0
            `);
            results.push({ step: 'kpi_sales_4', message: '✅ 재무 및 기여도 지표 (5개) 변경 완료' });
        } catch (err) {
            errorCount++;
            results.push({ step: 'kpi_sales_4', error: err.message });
        }

        // 5. KPI_SALES - 순위 및 누적 지표
        try {
            await db.execute(`
                ALTER TABLE kpi_sales
                CHANGE COLUMN \`전체매출기여도순위\` \`totalSalesContributionRank\` INT DEFAULT NULL,
                CHANGE COLUMN \`전체매출누적기여도\` \`cumulativeTotalSalesContribution\` DECIMAL(5,2) DEFAULT NULL,
                CHANGE COLUMN \`주요제품매출기여도순위\` \`mainProductContributionRank\` INT DEFAULT NULL,
                CHANGE COLUMN \`주요제품매출누적기여도\` \`cumulativeMainProductContribution\` DECIMAL(5,2) DEFAULT NULL
            `);
            results.push({ step: 'kpi_sales_5', message: '✅ 순위 및 누적 지표 (4개) 변경 완료' });
        } catch (err) {
            errorCount++;
            results.push({ step: 'kpi_sales_5', error: err.message });
        }

        // 6. KPI_SALES - 메타 정보
        try {
            await db.execute(`
                ALTER TABLE kpi_sales
                CHANGE COLUMN \`현재월수\` \`currentMonths\` INT DEFAULT 0
            `);
            results.push({ step: 'kpi_sales_6', message: '✅ 메타 정보 (1개) 변경 완료' });
        } catch (err) {
            errorCount++;
            results.push({ step: 'kpi_sales_6', error: err.message });
        }

        // 7. KPI_ADMIN - 전사 거래처 지표
        try {
            await db.execute(`
                ALTER TABLE kpi_admin
                CHANGE COLUMN \`전체거래처\` \`totalCompanies\` INT DEFAULT 0,
                CHANGE COLUMN \`활성거래처\` \`activeCompanies\` INT DEFAULT 0,
                CHANGE COLUMN \`활성화율\` \`activationRate\` DECIMAL(5,2) DEFAULT 0,
                CHANGE COLUMN \`주요제품판매거래처\` \`mainProductCompanies\` INT DEFAULT 0
            `);
            results.push({ step: 'kpi_admin_1', message: '✅ 전사 거래처 지표 (4개) 변경 완료' });
        } catch (err) {
            errorCount++;
            results.push({ step: 'kpi_admin_1', error: err.message });
        }

        // 8. KPI_ADMIN - 전사 목표 달성
        try {
            await db.execute(`
                ALTER TABLE kpi_admin
                CHANGE COLUMN \`회사배정기준대비달성율\` \`companyTargetAchievementRate\` DECIMAL(10,2) DEFAULT 0,
                CHANGE COLUMN \`주요고객처목표달성율\` \`majorCustomerTargetRate\` DECIMAL(5,2) DEFAULT 0
            `);
            results.push({ step: 'kpi_admin_2', message: '✅ 전사 목표 달성 (2개) 변경 완료' });
        } catch (err) {
            errorCount++;
            results.push({ step: 'kpi_admin_2', error: err.message });
        }

        // 9. KPI_ADMIN - 전사 매출 지표
        try {
            await db.execute(`
                ALTER TABLE kpi_admin
                CHANGE COLUMN \`누적매출금액\` \`accumulatedSales\` DECIMAL(15,2) DEFAULT 0,
                CHANGE COLUMN \`누적수금금액\` \`accumulatedCollection\` DECIMAL(15,2) DEFAULT 0,
                CHANGE COLUMN \`매출채권잔액\` \`accountsReceivable\` DECIMAL(15,2) DEFAULT 0,
                CHANGE COLUMN \`주요제품매출액\` \`mainProductSales\` DECIMAL(15,2) DEFAULT 0,
                CHANGE COLUMN \`매출집중도\` \`salesConcentration\` DECIMAL(15,2) DEFAULT 0
            `);
            results.push({ step: 'kpi_admin_3', message: '✅ 전사 매출 지표 (5개) 변경 완료' });
        } catch (err) {
            errorCount++;
            results.push({ step: 'kpi_admin_3', error: err.message });
        }

        // 10. KPI_ADMIN - 전사 기여도 및 메타
        try {
            await db.execute(`
                ALTER TABLE kpi_admin
                CHANGE COLUMN \`주요제품매출비율\` \`mainProductSalesRatio\` DECIMAL(5,2) DEFAULT 0,
                CHANGE COLUMN \`영업담당자수\` \`salesRepCount\` INT DEFAULT 0,
                CHANGE COLUMN \`현재월수\` \`currentMonths\` INT DEFAULT 0
            `);
            results.push({ step: 'kpi_admin_4', message: '✅ 전사 기여도 및 메타 (3개) 변경 완료' });
        } catch (err) {
            errorCount++;
            results.push({ step: 'kpi_admin_4', error: err.message });
        }

        // 11. 인덱스 업데이트
        try {
            // MySQL doesn't support DROP INDEX IF EXISTS, so try/catch for each
            try { await db.execute('ALTER TABLE kpi_sales DROP INDEX idx_contribution'); } catch (e) { /* ignore if doesn't exist */ }
            try { await db.execute('ALTER TABLE kpi_sales DROP INDEX idx_sales'); } catch (e) { /* ignore if doesn't exist */ }

            await db.execute('ALTER TABLE kpi_sales ADD INDEX idx_contribution (totalSalesContribution, mainProductContribution)');
            await db.execute('ALTER TABLE kpi_sales ADD INDEX idx_sales (accumulatedSales DESC, mainProductSales DESC)');
            results.push({ step: 'indexes', message: '✅ 인덱스 업데이트 완료' });
        } catch (err) {
            errorCount++;
            results.push({ step: 'indexes', error: err.message });
        }

        // 12. 뷰 재생성
        try {
            await db.execute('DROP VIEW IF EXISTS view_kpi_ranking_total_sales');
            await db.execute(`
                CREATE VIEW view_kpi_ranking_total_sales AS
                SELECT employeeId, employeeName, assignedCompanies, accumulatedSales,
                       totalSalesContribution, totalSalesContributionRank as \`rank\`, lastUpdated
                FROM kpi_sales WHERE totalSalesContribution > 0
                ORDER BY accumulatedSales DESC
            `);

            await db.execute('DROP VIEW IF EXISTS view_kpi_ranking_main_product_sales');
            await db.execute(`
                CREATE VIEW view_kpi_ranking_main_product_sales AS
                SELECT employeeId, employeeName, mainProductCompanies, mainProductSales,
                       mainProductContribution, mainProductContributionRank as \`rank\`, lastUpdated
                FROM kpi_sales WHERE mainProductContribution > 0
                ORDER BY mainProductSales DESC
            `);
            results.push({ step: 'views', message: '✅ 뷰 재생성 완료' });
        } catch (err) {
            errorCount++;
            results.push({ step: 'views', error: err.message });
        }

        // 13. 검증
        const [salesSample] = await db.execute(`
            SELECT assignedCompanies, activeCompanies, accumulatedSales, totalSalesContribution
            FROM kpi_sales LIMIT 1
        `);

        const [adminSample] = await db.execute(`
            SELECT totalCompanies, activeCompanies, accumulatedSales, salesRepCount
            FROM kpi_admin LIMIT 1
        `);

        console.log('✅ KPI 테이블 컬럼명 영문화 완료!');

        res.json({
            success: errorCount === 0,
            message: errorCount === 0 ? '✅ 마이그레이션 완료' : `⚠️ 마이그레이션 완료 (${errorCount}개 경고)`,
            results,
            errorCount,
            verification: {
                kpi_sales_sample: salesSample[0] || null,
                kpi_admin_sample: adminSample[0] || null
            }
        });

    } catch (error) {
        console.error('❌ 마이그레이션 실패:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: '마이그레이션 실행 중 오류가 발생했습니다.',
            details: error.message
        });
    }
});

// POST /api/migration/fix-kpi-structure - employeeId 컬럼 추가 및 뷰 생성
router.post('/fix-kpi-structure', async (req, res) => {
    try {
        const db = await getDB();
        const results = [];

        // 1. employeeId 컬럼 추가 (id 다음에)
        try {
            await db.execute(`
                ALTER TABLE kpi_sales
                ADD COLUMN employeeId VARCHAR(36) NULL COMMENT '직원 ID (employees.id 참조)'
                AFTER id
            `);
            results.push({ step: 'add_employeeId', message: '✅ employeeId 컬럼 추가 완료' });
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                results.push({ step: 'add_employeeId', message: 'ℹ️ employeeId 컬럼 이미 존재' });
            } else {
                throw err;
            }
        }

        // 2. 기존 데이터에 employeeId 채우기 (id와 동일한 값으로)
        await db.execute('UPDATE kpi_sales SET employeeId = id WHERE employeeId IS NULL');
        results.push({ step: 'populate_employeeId', message: '✅ employeeId 데이터 채우기 완료' });

        // 3. employeeId를 NOT NULL로 변경
        await db.execute(`
            ALTER TABLE kpi_sales
            MODIFY COLUMN employeeId VARCHAR(36) NOT NULL COMMENT '직원 ID (employees.id 참조)'
        `);
        results.push({ step: 'set_not_null', message: '✅ employeeId NOT NULL 설정 완료' });

        // 4. UNIQUE 인덱스 추가
        try {
            await db.execute('ALTER TABLE kpi_sales ADD UNIQUE KEY unique_employee (employeeId)');
            results.push({ step: 'add_unique_index', message: '✅ employeeId UNIQUE 인덱스 추가 완료' });
        } catch (err) {
            if (err.code === 'ER_DUP_KEYNAME') {
                results.push({ step: 'add_unique_index', message: 'ℹ️ UNIQUE 인덱스 이미 존재' });
            } else {
                throw err;
            }
        }

        // 5. 뷰 재생성
        await db.execute('DROP VIEW IF EXISTS view_kpi_ranking_total_sales');
        await db.execute(`
            CREATE VIEW view_kpi_ranking_total_sales AS
            SELECT employeeId, employeeName, assignedCompanies, accumulatedSales,
                   totalSalesContribution, totalSalesContributionRank as \`rank\`, lastUpdated
            FROM kpi_sales WHERE totalSalesContribution > 0
            ORDER BY accumulatedSales DESC
        `);

        await db.execute('DROP VIEW IF EXISTS view_kpi_ranking_main_product_sales');
        await db.execute(`
            CREATE VIEW view_kpi_ranking_main_product_sales AS
            SELECT employeeId, employeeName, mainProductCompanies, mainProductSales,
                   mainProductContribution, mainProductContributionRank as \`rank\`, lastUpdated
            FROM kpi_sales WHERE mainProductContribution > 0
            ORDER BY mainProductSales DESC
        `);
        results.push({ step: 'create_views', message: '✅ 뷰 생성 완료' });

        res.json({
            success: true,
            message: '✅ KPI 테이블 구조 수정 및 뷰 생성 완료',
            results
        });

    } catch (error) {
        console.error('❌ KPI 구조 수정 실패:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET /api/migration/check-kpi-structure - KPI 테이블 구조 확인
router.get('/check-kpi-structure', async (req, res) => {
    try {
        const db = await getDB();

        // kpi_sales 테이블 구조 확인
        const [salesColumns] = await db.execute(`
            SELECT COLUMN_NAME, DATA_TYPE, COLUMN_COMMENT
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'kpi_sales'
            ORDER BY ORDINAL_POSITION
        `);

        // kpi_admin 테이블 구조 확인
        const [adminColumns] = await db.execute(`
            SELECT COLUMN_NAME, DATA_TYPE, COLUMN_COMMENT
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'kpi_admin'
            ORDER BY ORDINAL_POSITION
        `);

        res.json({
            success: true,
            kpi_sales_columns: salesColumns,
            kpi_admin_columns: adminColumns
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

export default router;
