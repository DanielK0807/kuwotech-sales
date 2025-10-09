/**
 * 데이터베이스 완전 리셋 스크립트
 * UUID 기반 스키마로 깨끗하게 재구축
 *
 * 경고: 모든 데이터가 삭제됩니다!
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function resetDatabase() {
  let connection;

  try {
    console.log('🔥 데이터베이스 완전 리셋 시작...');
    console.log('⚠️  모든 데이터가 삭제됩니다!');

    connection = await mysql.createConnection(process.env.DATABASE_URL);

    // 1. 모든 테이블 DROP
    console.log('\n📦 기존 테이블 삭제 중...');

    const tables = [
      'change_history',
      'kpi_admin',
      'kpi_sales',
      'reports',
      'companies',
      'products',
      'employees'
    ];

    for (const table of tables) {
      try {
        await connection.execute(`DROP TABLE IF EXISTS ${table}`);
        console.log(`   ✅ ${table} 삭제 완료`);
      } catch (error) {
        console.log(`   ⏭️  ${table} 삭제 건너뜀:`, error.message);
      }
    }

    console.log('\n✅ 모든 테이블 삭제 완료');
    console.log('💡 서버를 재시작하면 UUID 기반 스키마로 자동 재생성됩니다.');

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    console.error(error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

resetDatabase();
