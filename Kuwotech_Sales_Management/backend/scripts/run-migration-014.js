// ============================================
// KUWOTECH 영업관리 시스템
// 마이그레이션 014 실행 스크립트
// companies 테이블에 activityNotes, customerNewsDate 추가
// ============================================

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const runMigration = async () => {
  let connection;

  try {
    // MySQL 연결
    const urlString = process.env.DATABASE_URL;
    const match = urlString.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);

    if (!match) {
      throw new Error('DATABASE_URL 형식이 잘못되었습니다.');
    }

    const [, user, password, host, port, database] = match;
    connection = await mysql.createConnection({
      host,
      port: parseInt(port),
      user,
      password,
      database,
      connectTimeout: 60000,
      multipleStatements: true
    });

    console.log('🔌 MySQL 연결 성공\n');

    // SQL 파일 읽기
    const sqlPath = path.join(__dirname, '../migrations/014_add_customer_news_fields.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('📄 마이그레이션 014 실행 중...\n');
    console.log('   - activityNotes 컬럼 추가');
    console.log('   - customerNewsDate 컬럼 추가');
    console.log('   - 기존 데이터 날짜 업데이트 (2025-10-15)\n');

    // SQL 실행
    await connection.query(sql);

    console.log('✅ 마이그레이션 014 완료!\n');
    console.log('='.repeat(60));
    console.log('✅ companies.activityNotes 추가됨 (고객소식)');
    console.log('✅ companies.customerNewsDate 추가됨 (고객소식 작성일)');
    console.log('✅ 기존 데이터 날짜 = 2025-10-15');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ 마이그레이션 실행 실패:');
    console.error('오류 메시지:', error.message);
    console.error('오류 코드:', error.code);
    if (error.sql) {
      console.error('SQL:', error.sql);
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 MySQL 연결 종료\n');
    }
  }
};

// 스크립트 실행
runMigration();
