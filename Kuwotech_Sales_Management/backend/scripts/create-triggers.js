// ============================================
// MySQL 트리거 생성 스크립트
// ============================================
// 실행: node backend/scripts/create-triggers.js
// 목적: reports 테이블 승인 시 companies 자동 업데이트
// ============================================

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

console.log('🔧 MySQL 트리거 생성 시작\n');

const createTriggers = async () => {
  let connection;

  try {
    // ==========================================
    // 1. MySQL 연결
    // ==========================================
    console.log('1️⃣  MySQL 연결 중...');
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
      database,
      multipleStatements: true // 여러 SQL 문 실행 허용
    };

    connection = await mysql.createConnection(config);
    console.log('   ✅ MySQL 연결 성공\n');

    // ==========================================
    // 2. 기존 트리거 삭제 (있으면)
    // ==========================================
    console.log('2️⃣  기존 트리거 확인 및 삭제 중...');

    const triggers = [
      'after_report_approved_insert',
      'after_report_approved_update',
      'after_report_approved_delete'
    ];

    for (const trigger of triggers) {
      try {
        await connection.query(`DROP TRIGGER IF EXISTS ${trigger}`);
        console.log(`   ✅ ${trigger} 삭제 완료 (또는 존재하지 않음)`);
      } catch (error) {
        console.log(`   ⚠️  ${trigger} 삭제 실패: ${error.message}`);
      }
    }
    console.log();

    // ==========================================
    // 3. INSERT 트리거 생성
    // ==========================================
    console.log('3️⃣  INSERT 트리거 생성 중...');

    await connection.query(`
      CREATE TRIGGER after_report_approved_insert
      AFTER INSERT ON reports
      FOR EACH ROW
      BEGIN
        -- 승인된 보고서만 처리
        IF NEW.status = '승인' THEN
          UPDATE companies
          SET
            -- 판매제품 업데이트 (누적)
            salesProduct = CONCAT(
              COALESCE(salesProduct, ''),
              IF(salesProduct IS NOT NULL AND salesProduct != '', ', ', ''),
              COALESCE(NEW.targetProducts, '')
            ),

            -- 마지막결제일 (최신 날짜로)
            lastPaymentDate = GREATEST(
              COALESCE(lastPaymentDate, NEW.submittedDate),
              NEW.submittedDate
            ),

            -- 마지막총결제금액 (최신 승인 보고서의 수금금액)
            lastPaymentAmount = COALESCE(NEW.targetCollectionAmount, 0),

            -- 누적수금금액 (합산)
            accumulatedCollection = COALESCE(accumulatedCollection, 0) + COALESCE(NEW.targetCollectionAmount, 0),

            -- 누적매출금액 (합산)
            accumulatedSales = COALESCE(accumulatedSales, 0) + COALESCE(NEW.targetSalesAmount, 0),

            -- 영업활동(특이사항) 업데이트 (누적)
            businessActivity = CONCAT(
              COALESCE(businessActivity, ''),
              IF(businessActivity IS NOT NULL AND businessActivity != '', '\n---\n', ''),
              '[', DATE_FORMAT(NEW.submittedDate, '%Y-%m-%d'), '] ',
              COALESCE(NEW.activityNotes, '')
            )
          WHERE keyValue = NEW.companyId;
        END IF;
      END
    `);

    console.log('   ✅ after_report_approved_insert 트리거 생성 완료\n');

    // ==========================================
    // 4. UPDATE 트리거 생성
    // ==========================================
    console.log('4️⃣  UPDATE 트리거 생성 중...');

    await connection.query(`
      CREATE TRIGGER after_report_approved_update
      AFTER UPDATE ON reports
      FOR EACH ROW
      BEGIN
        -- 케이스 1: 상태가 승인으로 변경된 경우
        IF OLD.status != '승인' AND NEW.status = '승인' THEN
          UPDATE companies
          SET
            salesProduct = CONCAT(
              COALESCE(salesProduct, ''),
              IF(salesProduct IS NOT NULL AND salesProduct != '', ', ', ''),
              COALESCE(NEW.targetProducts, '')
            ),
            lastPaymentDate = GREATEST(
              COALESCE(lastPaymentDate, NEW.submittedDate),
              NEW.submittedDate
            ),
            lastPaymentAmount = COALESCE(NEW.targetCollectionAmount, 0),
            accumulatedCollection = COALESCE(accumulatedCollection, 0) + COALESCE(NEW.targetCollectionAmount, 0),
            accumulatedSales = COALESCE(accumulatedSales, 0) + COALESCE(NEW.targetSalesAmount, 0),
            businessActivity = CONCAT(
              COALESCE(businessActivity, ''),
              IF(businessActivity IS NOT NULL AND businessActivity != '', '\n---\n', ''),
              '[', DATE_FORMAT(NEW.submittedDate, '%Y-%m-%d'), '] ',
              COALESCE(NEW.activityNotes, '')
            )
          WHERE keyValue = NEW.companyId;

        -- 케이스 2: 승인 상태에서 비승인으로 변경된 경우 (롤백)
        ELSEIF OLD.status = '승인' AND NEW.status != '승인' THEN
          -- 누적 금액만 롤백 (판매제품, 영업활동은 수동 관리 필요)
          UPDATE companies
          SET
            accumulatedCollection = GREATEST(0, COALESCE(accumulatedCollection, 0) - COALESCE(OLD.targetCollectionAmount, 0)),
            accumulatedSales = GREATEST(0, COALESCE(accumulatedSales, 0) - COALESCE(OLD.targetSalesAmount, 0))
          WHERE keyValue = OLD.companyId;
        END IF;
      END
    `);

    console.log('   ✅ after_report_approved_update 트리거 생성 완료\n');

    // ==========================================
    // 5. DELETE 트리거 생성
    // ==========================================
    console.log('5️⃣  DELETE 트리거 생성 중...');

    await connection.query(`
      CREATE TRIGGER after_report_approved_delete
      AFTER DELETE ON reports
      FOR EACH ROW
      BEGIN
        -- 승인된 보고서가 삭제되면 누적 금액 롤백
        IF OLD.status = '승인' THEN
          UPDATE companies
          SET
            accumulatedCollection = GREATEST(0, COALESCE(accumulatedCollection, 0) - COALESCE(OLD.targetCollectionAmount, 0)),
            accumulatedSales = GREATEST(0, COALESCE(accumulatedSales, 0) - COALESCE(OLD.targetSalesAmount, 0))
          WHERE keyValue = OLD.companyId;
        END IF;
      END
    `);

    console.log('   ✅ after_report_approved_delete 트리거 생성 완료\n');

    // ==========================================
    // 6. 트리거 생성 결과 확인
    // ==========================================
    console.log('6️⃣  생성된 트리거 확인 중...');

    const [rows] = await connection.execute(`
      SELECT TRIGGER_NAME, EVENT_MANIPULATION, EVENT_OBJECT_TABLE, ACTION_TIMING
      FROM information_schema.TRIGGERS
      WHERE TRIGGER_SCHEMA = ?
      ORDER BY TRIGGER_NAME
    `, [database]);

    console.log(`   ✅ 총 ${rows.length}개 트리거 생성됨:\n`);
    rows.forEach(row => {
      console.log(`      - ${row.TRIGGER_NAME}`);
      console.log(`        ${row.ACTION_TIMING} ${row.EVENT_MANIPULATION} on ${row.EVENT_OBJECT_TABLE}`);
    });

    console.log();

    // ==========================================
    // 7. 트리거 테스트 시나리오 안내
    // ==========================================
    console.log('='.repeat(80));
    console.log('🎉 트리거 생성 완료!');
    console.log('='.repeat(80));
    console.log('\n📋 트리거 동작 로직:');
    console.log('   1. INSERT: 보고서 승인 시 companies 자동 업데이트');
    console.log('   2. UPDATE: 승인 상태 변경 시 누적 금액 추가/롤백');
    console.log('   3. DELETE: 승인된 보고서 삭제 시 누적 금액 롤백');
    console.log('\n📊 자동 업데이트 필드:');
    console.log('   - salesProduct (판매제품)');
    console.log('   - lastPaymentDate (마지막결제일)');
    console.log('   - lastPaymentAmount (마지막총결제금액)');
    console.log('   - accumulatedCollection (누적수금금액)');
    console.log('   - accumulatedSales (누적매출금액)');
    console.log('   - businessActivity (영업활동-특이사항)');
    console.log('\n⚠️  주의사항:');
    console.log('   - 판매제품과 영업활동은 누적되므로 중복 주의');
    console.log('   - 비승인으로 변경 시 판매제품/영업활동은 수동 정리 필요');
    console.log('   - 승인 보고서 삭제 시 누적 금액만 롤백됨');
    console.log('='.repeat(80));

    console.log('\n💡 다음 단계:');
    console.log('   1. node backend/scripts/validate-data.js (데이터 검증)');
    console.log('   2. 트리거 테스트 (테스트 보고서 승인/변경/삭제)\n');

  } catch (error) {
    console.error('\n❌ 트리거 생성 중 오류 발생:');
    console.error('오류 메시지:', error.message);
    console.error('오류 코드:', error.code);
    if (error.sql) {
      console.error('SQL:', error.sql);
    }
    console.error('스택 트레이스:', error.stack);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 MySQL 연결 종료\n');
    }
  }
};

// 스크립트 실행
createTriggers();
