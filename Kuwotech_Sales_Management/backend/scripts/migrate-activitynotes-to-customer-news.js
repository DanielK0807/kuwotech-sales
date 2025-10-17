// ============================================
// 기존 companies.activityNotes를 customer_news로 마이그레이션
// ============================================
// 이미 companies 테이블에 있는 activityNotes 데이터를
// customer_news 테이블로 일괄 복사하는 스크립트

import { randomUUID } from 'crypto';
import { getDB } from '../config/database.js';

async function migrateActivityNotesToCustomerNews() {
  let connection;

  try {
    connection = await getDB();

    console.log('🔄 [마이그레이션] companies.activityNotes → customer_news 시작\n');

    // 1. activityNotes가 있는 거래처 조회
    const [companies] = await connection.execute(`
      SELECT keyValue, finalCompanyName, activityNotes
      FROM companies
      WHERE activityNotes IS NOT NULL
        AND activityNotes != ''
    `);

    console.log(`📊 activityNotes가 있는 거래처: ${companies.length}개\n`);

    if (companies.length === 0) {
      console.log('✅ 마이그레이션할 데이터가 없습니다.');
      return;
    }

    let insertedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // 2. 각 거래처의 activityNotes를 customer_news에 삽입
    for (const company of companies) {
      try {
        // 이미 해당 거래처의 시스템 생성 고객소식이 있는지 확인
        const [existing] = await connection.execute(`
          SELECT id FROM customer_news
          WHERE companyId = ?
            AND createdBy = '시스템'
            AND category = '일반소식'
            AND content = ?
          LIMIT 1
        `, [company.keyValue, company.activityNotes]);

        if (existing.length > 0) {
          console.log(`⏭️  ${company.finalCompanyName} - 이미 존재함 (건너뜀)`);
          skippedCount++;
          continue;
        }

        // customer_news에 삽입
        const newsId = randomUUID();
        const today = new Date().toISOString().split('T')[0];

        await connection.execute(`
          INSERT INTO customer_news (
            id, companyId, companyName, createdBy, department,
            category, title, content, newsDate, priority, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          newsId,
          company.keyValue,
          company.finalCompanyName,
          '시스템',
          '시스템',
          '일반소식',
          `[마이그레이션] ${company.finalCompanyName} 영업활동`,
          company.activityNotes,
          today,
          '보통',
          '활성'
        ]);

        console.log(`✅ ${company.finalCompanyName} - 고객소식 생성 완료`);
        insertedCount++;

      } catch (error) {
        console.error(`❌ ${company.finalCompanyName} - 실패: ${error.message}`);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 마이그레이션 결과 요약');
    console.log('='.repeat(50));
    console.log(`✅ 성공: ${insertedCount}개`);
    console.log(`⏭️  건너뜀: ${skippedCount}개`);
    console.log(`❌ 실패: ${errorCount}개`);
    console.log(`📋 전체: ${companies.length}개`);
    console.log('='.repeat(50));

  } catch (error) {
    console.error('❌ 마이그레이션 실패:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 스크립트 실행
migrateActivityNotesToCustomerNews()
  .then(() => {
    console.log('\n✅ 마이그레이션 완료!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 마이그레이션 중 오류 발생:', error);
    process.exit(1);
  });
