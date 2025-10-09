// ============================================
// 제품 마스터 데이터 삽입 스크립트
// ============================================
// 실행: node backend/scripts/insert-products.js
// 36개 제품 데이터 삽입
// ============================================

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const insertProducts = async () => {
  let connection;

  try {
    const urlString = process.env.DATABASE_URL;
    const match = urlString.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);

    if (!match) {
      throw new Error('DATABASE_URL 형식이 잘못되었습니다.');
    }

    const [, user, password, host, port, database] = match;
    const config = { host, port: parseInt(port), user, password, database };

    connection = await mysql.createConnection(config);
    console.log('🔌 MySQL 연결 성공\n');

    console.log('📦 제품 마스터 데이터 삽입 중...\n');

    const products = [
      // 주요제품 - 우선순위 1 (임플란트)
      { name: '임플란트', category: '주요제품', priority: 1 },
      { name: 'TL', category: '주요제품', priority: 1 },
      { name: 'KIS', category: '주요제품', priority: 1 },

      // 주요제품 - 우선순위 2 (지르코니아)
      { name: '지르코니아', category: '주요제품', priority: 2 },

      // 주요제품 - 우선순위 3 (Abutment)
      { name: 'Abutment', category: '주요제품', priority: 3 },

      // 일반제품 (32개)
      { name: '패키지', category: '일반제품', priority: 0 },
      { name: '마스크', category: '일반제품', priority: 0 },
      { name: '재료', category: '일반제품', priority: 0 },
      { name: '의료장비', category: '일반제품', priority: 0 },
      { name: 'Centric Guide', category: '일반제품', priority: 0 },
      { name: '의치착색제', category: '일반제품', priority: 0 },
      { name: '임플란트부속품', category: '일반제품', priority: 0 },
      { name: '트리톤', category: '일반제품', priority: 0 },
      { name: '루시아지그', category: '일반제품', priority: 0 },
      { name: '리퀴드', category: '일반제품', priority: 0 },
      { name: '키스본', category: '일반제품', priority: 0 },
      { name: 'MPP KIT', category: '일반제품', priority: 0 },
      { name: '임프레션코핑', category: '일반제품', priority: 0 },
      { name: '아나로그', category: '일반제품', priority: 0 },
      { name: '센트릭', category: '일반제품', priority: 0 },
      { name: '피에조', category: '일반제품', priority: 0 },
      { name: '쿠보몰', category: '일반제품', priority: 0 },
      { name: '장비', category: '일반제품', priority: 0 },
      { name: '리프게이지', category: '일반제품', priority: 0 },
      { name: '보철', category: '일반제품', priority: 0 },
      { name: 'CLIP KIT', category: '일반제품', priority: 0 },
      { name: '실리캡', category: '일반제품', priority: 0 },
      { name: '멤브레인', category: '일반제품', priority: 0 },
      { name: '기구', category: '일반제품', priority: 0 },
      { name: '기공물', category: '일반제품', priority: 0 },
      { name: 'BONE', category: '일반제품', priority: 0 },
      { name: 'BITE', category: '일반제품', priority: 0 },
      { name: '상부구조물', category: '일반제품', priority: 0 },
      { name: 'EMS TIP', category: '일반제품', priority: 0 },
      { name: '동종골', category: '일반제품', priority: 0 },
      { name: '핸드피스', category: '일반제품', priority: 0 },
      { name: '블록 리퀴드', category: '일반제품', priority: 0 },
      { name: '힐링', category: '일반제품', priority: 0 }
    ];

    let insertedCount = 0;
    let skippedCount = 0;

    for (const product of products) {
      try {
        await connection.execute(
          `INSERT INTO products (productName, category, priority) VALUES (?, ?, ?)`,
          [product.name, product.category, product.priority]
        );
        console.log(`   ✅ ${product.name} (${product.category}, 우선순위: ${product.priority})`);
        insertedCount++;
      } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
          console.log(`   ⏭️  ${product.name} (이미 존재)`);
          skippedCount++;
        } else {
          throw error;
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎉 제품 마스터 데이터 삽입 완료!');
    console.log('='.repeat(60));
    console.log(`✅ 신규 삽입: ${insertedCount}개`);
    console.log(`⏭️  건너뛴: ${skippedCount}개`);
    console.log(`📦 전체: ${products.length}개`);
    console.log('='.repeat(60) + '\n');

    // 제품 목록 확인
    const [rows] = await connection.execute(`
      SELECT category, priority, COUNT(*) as count
      FROM products
      GROUP BY category, priority
      ORDER BY category DESC, priority ASC
    `);

    console.log('📊 제품 통계:');
    rows.forEach(row => {
      const priorityLabel = row.priority === 1 ? '(임플란트)' :
                            row.priority === 2 ? '(지르코니아)' :
                            row.priority === 3 ? '(Abutment)' : '';
      console.log(`   ${row.category} - 우선순위 ${row.priority}${priorityLabel}: ${row.count}개`);
    });
    console.log('');

  } catch (error) {
    console.error('\n❌ 제품 데이터 삽입 중 오류 발생:');
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

// 스크립트 실행
insertProducts();
