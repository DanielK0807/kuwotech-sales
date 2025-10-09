// ============================================
// 모든 테이블 삭제 스크립트
// ============================================
// 실행: node backend/scripts/drop-all-tables.js
// 주의: 모든 데이터가 삭제됩니다!
// ============================================

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const dropAllTables = async () => {
  let connection;

  try {
    connection = await mysql.createConnection(process.env.DATABASE_URL);
    console.log('✅ MySQL 연결 성공\n');

    console.log('⚠️  모든 테이블을 삭제합니다...\n');

    // 외래키 체크 비활성화
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');

    const tables = [
      'reports',
      'kpi_sales',
      'kpi_admin',
      'change_history',
      'backups',
      'companies',
      'products',
      'employees'
    ];

    for (const table of tables) {
      try {
        await connection.query(`DROP TABLE IF EXISTS ${table}`);
        console.log(`   ✅ ${table} 삭제 완료`);
      } catch (error) {
        console.log(`   ⏭️  ${table} 삭제 건너뜀 (${error.message})`);
      }
    }

    // 트리거 삭제
    try {
      await connection.query('DROP TRIGGER IF EXISTS update_company_after_report_approval');
      console.log(`   ✅ 트리거 삭제 완료`);
    } catch (error) {
      console.log(`   ⏭️  트리거 삭제 건너뜀`);
    }

    // 외래키 체크 재활성화
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log('\n🎉 모든 테이블 삭제 완료!\n');
    console.log('다음 서버 시작 시 자동으로 테이블이 재생성됩니다.\n');

  } catch (error) {
    console.error('\n❌ 테이블 삭제 중 오류 발생:');
    console.error('오류 메시지:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 MySQL 연결 종료\n');
    }
  }
};

dropAllTables();
