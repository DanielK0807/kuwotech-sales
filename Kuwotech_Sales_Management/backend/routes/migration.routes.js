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

export default router;
