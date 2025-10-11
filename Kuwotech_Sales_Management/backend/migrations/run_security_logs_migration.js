// ============================================
// 보안 로그 테이블 생성 마이그레이션
// ============================================
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

async function runSecurityLogsMigration() {
  let connection;

  try {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 보안 로그 테이블 생성 마이그레이션 시작');
    console.log('='.repeat(60));

    // MySQL 연결
    console.log('\n📡 MySQL 연결 중...');
    connection = await mysql.createConnection({
      uri: process.env.DATABASE_URL,
      multipleStatements: true
    });
    console.log('✅ MySQL 연결 성공\n');

    // SQL 파일 읽기
    const sqlFilePath = path.join(__dirname, '012_create_security_logs_table.sql');
    const sqlContent = await fs.readFile(sqlFilePath, 'utf8');

    console.log('📄 012_create_security_logs_table.sql 실행 중...');

    // SQL 실행
    try {
      await connection.query(sqlContent);
      console.log('✅ securityLogs 테이블 생성 완료');
    } catch (error) {
      if (error.code === 'ER_TABLE_EXISTS_ERROR') {
        console.log('⚠️  securityLogs 테이블이 이미 존재합니다.');
      } else {
        throw error;
      }
    }

    // 테이블 확인
    console.log('\n🔍 테이블 구조 확인:');
    const [columns] = await connection.query('DESCRIBE securityLogs');
    console.table(columns);

    // 테이블 개수 확인
    const [rows] = await connection.query('SELECT COUNT(*) as count FROM securityLogs');
    console.log(`\n📊 현재 보안 로그 개수: ${rows[0].count}개`);

    await connection.end();
    console.log('\n✅ MySQL 연결 종료');
    console.log('\n🎉 보안 로그 테이블 마이그레이션 완료!\n');

    return true;

  } catch (error) {
    console.error('\n❌ 마이그레이션 실패:', error.message);
    console.error(error);

    if (connection) {
      await connection.end();
    }

    return false;
  }
}

// 실행
runSecurityLogsMigration()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('예외 발생:', error);
    process.exit(1);
  });
