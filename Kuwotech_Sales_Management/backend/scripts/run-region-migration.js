// ============================================
// regions 테이블 마이그레이션 실행 스크립트
// ============================================
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

async function runMigration() {
  let connection;

  try {
    console.log('🔄 데이터베이스에 연결 중...');
    connection = await mysql.createConnection(process.env.DATABASE_URL);
    console.log('✅ 연결 성공!\n');

    // 005: regions 테이블 생성
    console.log('📋 Step 1: regions 테이블 생성 중...');
    const migration005 = await fs.readFile(
      path.join(__dirname, '../migrations/005_create_regions_table.sql'),
      'utf-8'
    );

    // SQL 문을 세미콜론으로 분리하여 실행
    const statements005 = migration005
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--'));

    for (const statement of statements005) {
      if (statement) {
        await connection.execute(statement);
      }
    }

    console.log('✅ regions 테이블 생성 완료!\n');

    // 006: region_id 업데이트
    console.log('📋 Step 2: region_id 업데이트 중...');
    const migration006 = await fs.readFile(
      path.join(__dirname, '../migrations/006_populate_region_ids.sql'),
      'utf-8'
    );

    const statements006 = migration006
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--'));

    for (const statement of statements006) {
      if (statement) {
        await connection.execute(statement);
      }
    }

    console.log('✅ region_id 업데이트 완료!\n');

    // 결과 확인
    console.log('📊 마이그레이션 결과:\n');

    // 1. regions 테이블 확인
    console.log('=== regions 테이블 ===');
    const [regions] = await connection.execute('SELECT * FROM regions ORDER BY display_order');
    console.table(regions);

    // 2. 시/도별 거래처 수
    console.log('\n=== 시/도별 거래처 수 ===');
    const [stats] = await connection.execute(`
      SELECT
        r.region_name AS '시/도',
        COUNT(c.keyValue) AS '거래처 수'
      FROM regions r
      LEFT JOIN companies c ON c.region_id = r.id
      GROUP BY r.id, r.region_name
      ORDER BY r.display_order
    `);
    console.table(stats);

    // 3. 매핑 실패 건수
    const [[failCount]] = await connection.execute(`
      SELECT COUNT(*) as count
      FROM companies
      WHERE customerRegion IS NOT NULL
        AND customerRegion != ''
        AND region_id IS NULL
    `);

    if (failCount.count > 0) {
      console.log(`\n⚠️ 매핑 실패: ${failCount.count}건`);
      const [failed] = await connection.execute(`
        SELECT customerRegion, COUNT(*) as count
        FROM companies
        WHERE customerRegion IS NOT NULL
          AND customerRegion != ''
          AND region_id IS NULL
        GROUP BY customerRegion
        ORDER BY count DESC
        LIMIT 10
      `);
      console.table(failed);
    } else {
      console.log('\n✅ 모든 거래처가 성공적으로 매핑되었습니다!');
    }

    console.log('\n🎉 마이그레이션 완료!');

  } catch (error) {
    console.error('❌ 마이그레이션 실패:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

runMigration();
