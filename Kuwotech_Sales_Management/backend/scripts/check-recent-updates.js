// 최근 업데이트 확인 스크립트
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const checkRecentUpdates = async () => {
  let connection;

  try {
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
      connectTimeout: 60000
    });

    console.log('🔌 MySQL 연결 성공\n');

    // 1. 총 거래처 수
    const [countResult] = await connection.execute('SELECT COUNT(*) as total FROM companies');
    console.log('📊 총 거래처 수:', countResult[0].total);

    // 2. 오늘(2025-10-15) updatedAt이 변경된 거래처 수
    const [todayUpdates] = await connection.execute(`
      SELECT COUNT(*) as count
      FROM companies
      WHERE DATE(updatedAt) = '2025-10-15'
    `);
    console.log('📅 오늘(2025-10-15) updatedAt이 변경된 거래처:', todayUpdates[0].count, '개');

    // 3. 최근 10개 거래처의 updatedAt
    const [recentCompanies] = await connection.execute(`
      SELECT keyValue, finalCompanyName, updatedAt, customerNewsDate
      FROM companies
      ORDER BY updatedAt DESC
      LIMIT 10
    `);
    console.log('\n🔍 최근 업데이트된 거래처 10개:');
    recentCompanies.forEach((c, i) => {
      console.log(`  ${i + 1}. ${c.finalCompanyName} - updatedAt: ${c.updatedAt} - customerNewsDate: ${c.customerNewsDate}`);
    });

    // 4. customerNewsDate가 2025-10-15인 거래처 수
    const [newsDateCount] = await connection.execute(`
      SELECT COUNT(*) as count
      FROM companies
      WHERE customerNewsDate = '2025-10-15'
    `);
    console.log('\n📰 customerNewsDate가 2025-10-15인 거래처:', newsDateCount[0].count, '개');

    // 5. 오늘 createdAt이 생성된 거래처 (실제 신규 추가)
    const [newToday] = await connection.execute(`
      SELECT COUNT(*) as count
      FROM companies
      WHERE DATE(createdAt) = '2025-10-15'
    `);
    console.log('✨ 오늘(2025-10-15) 신규 생성된 거래처:', newToday[0].count, '개');

    console.log('\n='.repeat(60));
    console.log('📝 결론:');
    if (newToday[0].count > 0) {
      console.log('✅ 오늘 엑셀 업로드가 실행되었습니다!');
    } else if (todayUpdates[0].count > 0) {
      console.log('⚠️  오늘 엑셀 업로드는 실행되지 않았습니다.');
      console.log('   updatedAt 변경은 마이그레이션 014로 인한 것입니다.');
    } else {
      console.log('❌ 오늘 아무런 변경사항이 없습니다.');
    }
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ 확인 실패:');
    console.error('오류 메시지:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 MySQL 연결 종료\n');
    }
  }
};

checkRecentUpdates();
