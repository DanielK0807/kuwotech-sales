// ============================================
// MySQL 테이블 삭제 스크립트
// ============================================
// 실행: node backend/scripts/drop-tables.js
// ============================================

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const dropTables = async () => {
  let connection;

  try {
    const urlString = process.env.DATABASE_URL;
    const match = urlString.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);

    if (!match) {
      throw new Error('DATABASE_URL 형식이 잘못되었습니다.');
    }

    const [, user, password, host, port, database] = match;
    const config = {
      host,
      port: parseInt(port),
      user,
      password,
      database
    };

    connection = await mysql.createConnection(config);
    console.log('🔌 MySQL 연결 성공\n');

    console.log('⚠️  테이블 삭제 시작...\n');

    // FK 제약조건 무시
    await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
    console.log('   ✅ 외래키 제약 해제\n');

    // FK 제약조건 때문에 순서대로 삭제
    const tables = ['reports', 'companies', 'employees', 'change_history', 'backups'];

    for (const table of tables) {
      try {
        await connection.execute(`DROP TABLE IF EXISTS ${table}`);
        console.log(`✅ ${table} 테이블 삭제 완료`);
      } catch (error) {
        console.log(`⚠️  ${table} 테이블 삭제 실패 또는 존재하지 않음: ${error.message}`);
      }
    }

    // FK 제약조건 복원
    await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
    console.log('\n   ✅ 외래키 제약 복원');

    console.log('\n🎉 모든 테이블 삭제 완료!\n');
    console.log('💡 다음 단계:');
    console.log('   node backend/scripts/init-db.js (테이블 재생성)\n');

  } catch (error) {
    console.error('\n❌ 테이블 삭제 중 오류 발생:');
    console.error('오류 메시지:', error.message);
    console.error('오류 코드:', error.code);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 MySQL 연결 종료\n');
    }
  }
};

dropTables();
