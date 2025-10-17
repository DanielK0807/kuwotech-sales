// ============================================
// companies.activityNotes와 customer_news 동기화 상태 확인
// ============================================

import mysql from 'mysql2/promise';

const dbConfig = {
  host: 'autorack.proxy.rlwy.net',
  port: 28008,
  user: 'root',
  password: 'EFrXGjmCAxfXynjhAuVYQbgdZGtMhiHX',
  database: 'railway'
};

async function checkSyncStatus() {
  const connection = await mysql.createConnection(dbConfig);

  try {
    console.log('=== 1. companies 테이블에 activityNotes가 있는 레코드 확인 ===\n');
    const [companies] = await connection.execute(`
      SELECT keyValue, finalCompanyName, activityNotes
      FROM companies
      WHERE activityNotes IS NOT NULL AND activityNotes != ''
      LIMIT 10
    `);

    console.log(`✅ activityNotes가 있는 거래처: ${companies.length}개`);
    companies.forEach((c, idx) => {
      console.log(`\n${idx + 1}. ${c.finalCompanyName} (${c.keyValue})`);
      console.log(`   내용: ${c.activityNotes.substring(0, 100)}...`);
    });

    console.log('\n\n=== 2. customer_news 테이블의 레코드 확인 ===\n');
    const [news] = await connection.execute(`
      SELECT id, companyId, companyName, category, content, createdBy, newsDate
      FROM customer_news
      ORDER BY createdAt DESC
      LIMIT 10
    `);

    console.log(`✅ customer_news 레코드: ${news.length}개`);
    news.forEach((n, idx) => {
      console.log(`\n${idx + 1}. ${n.companyName} - ${n.category}`);
      console.log(`   작성자: ${n.createdBy} | 날짜: ${n.newsDate}`);
      console.log(`   내용: ${n.content.substring(0, 100)}...`);
    });

    console.log('\n\n=== 3. activityNotes가 있지만 customer_news에 없는 거래처 확인 ===\n');
    const [missing] = await connection.execute(`
      SELECT c.keyValue, c.finalCompanyName, c.activityNotes
      FROM companies c
      LEFT JOIN customer_news cn ON c.keyValue = cn.companyId AND cn.category = '일반소식' AND cn.createdBy = '시스템'
      WHERE c.activityNotes IS NOT NULL
        AND c.activityNotes != ''
        AND cn.id IS NULL
      LIMIT 10
    `);

    console.log(`⚠️ customer_news에 복사되지 않은 거래처: ${missing.length}개`);
    if (missing.length > 0) {
      console.log('\n복사되지 않은 거래처 목록:');
      missing.forEach((m, idx) => {
        console.log(`\n${idx + 1}. ${m.finalCompanyName} (${m.keyValue})`);
        console.log(`   내용: ${m.activityNotes.substring(0, 100)}...`);
      });
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
  } finally {
    await connection.end();
  }
}

checkSyncStatus();
