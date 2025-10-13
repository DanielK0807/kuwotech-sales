// ============================================
// 트리거 생성 스크립트
// ============================================
// 실행: node backend/scripts/create-triggers-v2.js
// 보고서 승인 시 자동 업데이트 트리거
// ============================================

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const createTriggers = async () => {
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

    console.log('🔧 트리거 생성 중...\n');

    // 기존 트리거 삭제
    console.log('1️⃣  기존 트리거 삭제 중...');
    try {
      await connection.execute('DROP TRIGGER IF EXISTS update_company_after_report_approval');
      await connection.execute('DROP TRIGGER IF EXISTS trigger_update_company_on_approval');
      await connection.execute('DROP TRIGGER IF EXISTS trigger_update_company_on_confirmation');
      console.log('   ✅ 기존 트리거 삭제 완료\n');
    } catch (error) {
      console.log('   ⏭️  기존 트리거 없음\n');
    }

    // 트리거 생성 (영업담당자 확정 시)
    console.log('2️⃣  새 트리거 생성 중...');
    await connection.execute(`
      CREATE TRIGGER trigger_update_company_on_confirmation
      AFTER UPDATE ON reports
      FOR EACH ROW
      BEGIN
        DECLARE final_collection DECIMAL(15,2);
        DECLARE final_sales DECIMAL(15,2);
        DECLARE vat_included BOOLEAN;
        DECLARE product_list TEXT;
        DECLARE activity_summary TEXT;
        DECLARE confirmation_date DATE;

        -- confirmationData가 변경되었을 때만 실행 (영업담당자가 확정)
        -- 그리고 actualSalesAmount가 0보다 클 때만 실행
        IF (NEW.confirmationData IS NOT NULL AND
            (OLD.confirmationData IS NULL OR NEW.confirmationData != OLD.confirmationData) AND
            COALESCE(NEW.actualSalesAmount, 0) > 0) THEN

          -- 1. 기존 테이블 필드에서 값 추출
          SET final_collection = COALESCE(NEW.actualCollectionAmount, 0);
          SET final_sales = COALESCE(NEW.actualSalesAmount, 0);
          SET vat_included = COALESCE(NEW.includeVAT, FALSE);
          SET product_list = NEW.soldProducts;
          SET activity_summary = NEW.activityNotes;

          -- 확정 날짜: processedDate가 있으면 사용, 없으면 현재 날짜
          SET confirmation_date = COALESCE(NEW.processedDate, CURDATE());

          -- 2. companies 테이블 업데이트
          UPDATE companies
          SET
            -- 판매제품 목록 업데이트
            salesProduct = IF(
              product_list IS NOT NULL AND product_list != '',
              CONCAT(
                COALESCE(salesProduct, ''),
                IF(salesProduct IS NOT NULL AND salesProduct != '', ', ', ''),
                product_list
              ),
              salesProduct
            ),

            -- 최종결제일/금액 (매출금액 확정 날짜와 금액)
            lastPaymentDate = confirmation_date,
            lastPaymentAmount = final_sales,

            -- 누적 수금금액
            accumulatedCollection = COALESCE(accumulatedCollection, 0) + final_collection,

            -- 누적 매출금액 (부가세 처리)
            accumulatedSales = COALESCE(accumulatedSales, 0) +
              IF(vat_included = 1, ROUND(final_sales / 1.1, 0), final_sales),

            -- 영업활동(특이사항) 추가
            activityNotes = CONCAT(
              COALESCE(activityNotes, ''),
              IF(activityNotes IS NOT NULL AND activityNotes != '', '\\n---\\n', ''),
              '[', DATE_FORMAT(confirmation_date, '%Y-%m-%d'), '] ',
              COALESCE(activity_summary, '')
            )

          WHERE keyValue = NEW.companyId;

        END IF;
      END
    `);
    console.log('   ✅ 트리거 생성 완료\n');

    // 트리거 확인
    console.log('3️⃣  생성된 트리거 확인...');
    const [triggers] = await connection.execute(`
      SHOW TRIGGERS WHERE \`Trigger\` = 'trigger_update_company_on_confirmation'
    `);

    if (triggers.length > 0) {
      console.log('   ✅ 트리거 확인 완료');
      console.log('   트리거명:', triggers[0].Trigger);
      console.log('   테이블:', triggers[0].Table);
      console.log('   이벤트:', triggers[0].Event);
      console.log('   타이밍:', triggers[0].Timing);
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎉 트리거 생성 완료!');
    console.log('='.repeat(60));
    console.log('트리거명: trigger_update_company_on_confirmation');
    console.log('동작: reports 테이블 UPDATE 후');
    console.log('조건: 영업담당자가 confirmationData 확정할 때');
    console.log('\n자동 업데이트 항목:');
    console.log('  1. ✅ salesProduct (판매제품 추가)');
    console.log('  2. ✅ lastPaymentDate (확정 날짜)');
    console.log('  3. ✅ lastPaymentAmount (확정 매출금액 - actualSalesAmount)');
    console.log('  4. ✅ accumulatedCollection (누적수금금액 합산)');
    console.log('  5. ✅ accumulatedSales (누적매출금액 합산, 부가세처리)');
    console.log('  6. ✅ activityNotes (영업활동 추가)');
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ 트리거 생성 중 오류 발생:');
    console.error('오류 메시지:', error.message);
    console.error('오류 코드:', error.code);
    if (error.sql) {
      console.error('SQL:', error.sql);
    }
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
