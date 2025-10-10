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

        for (let i = 0; i < regions.length; i++) {
            const region = regions[i];
            const regionName = region.customerRegion;
            const regionCode = regionName.toUpperCase().replace(/\s+/g, '_');

            await db.execute(`
                INSERT INTO regions (region_name, region_code, display_order, is_active)
                VALUES (?, ?, ?, TRUE)
            `, [regionName, regionCode, i + 1]);
        }

        // Step 7: companies 테이블의 region_id와 region_district 업데이트
        console.log('🔄 companies 테이블 region_id 및 region_district 업데이트 중...');

        // 모든 회사의 region_id와 region_district를 업데이트
        for (const row of rawRegions) {
            const fullRegion = row.customerRegion;
            const parts = fullRegion.split(' ');
            let mainRegion = parts[0].trim();
            const district = parts.length > 1 ? parts.slice(1).join(' ').trim() : null;

            // "광주광역" → "광주" 통합
            if (mainRegion === '광주광역') {
                mainRegion = '광주';
            }

            // region_id 찾기
            const [regionResult] = await db.execute(
                'SELECT id FROM regions WHERE region_name = ?',
                [mainRegion]
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

export default router;
