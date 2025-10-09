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
      console.log('   ✅ 기존 트리거 삭제 완료\n');
    } catch (error) {
      console.log('   ⏭️  기존 트리거 없음\n');
    }

    // 트리거 생성
    console.log('2️⃣  새 트리거 생성 중...');
    await connection.execute(`
      CREATE TRIGGER update_company_after_report_approval
      AFTER UPDATE ON reports
      FOR EACH ROW
      BEGIN
        -- 보고서가 승인 상태로 변경되었을 때만 실행
        IF NEW.status = '승인' AND OLD.status != '승인' THEN

          UPDATE companies
          SET
            -- 1. 판매제품 추가 (기존 제품과 신규 제품 병합)
            salesProduct = CASE
              WHEN salesProduct IS NULL OR salesProduct = '' THEN NEW.soldProducts
              WHEN NEW.soldProducts IS NOT NULL AND NEW.soldProducts != '' THEN
                CONCAT(salesProduct, ',', NEW.soldProducts)
              ELSE salesProduct
            END,

            -- 2. 마지막 결제 정보 갱신
            lastPaymentDate = IFNULL(NEW.processedDate, CURDATE()),
            lastPaymentAmount = NEW.actualSalesAmount,

            -- 3. 누적 수금금액 합산
            accumulatedCollection = accumulatedCollection + IFNULL(NEW.actualCollectionAmount, 0),

            -- 4. 누적 매출금액 합산 (부가세 처리)
            accumulatedSales = accumulatedSales +
              CASE
                WHEN NEW.includeVAT = TRUE THEN IFNULL(NEW.actualSalesAmount, 0) / 1.1
                ELSE IFNULL(NEW.actualSalesAmount, 0)
              END,

            -- 5. 영업활동(특이사항) 추가
            businessActivity = CASE
              WHEN businessActivity IS NULL OR businessActivity = '' THEN
                CONCAT('[', DATE_FORMAT(IFNULL(NEW.processedDate, CURDATE()), '%Y-%m-%d'), '] ',
                       IFNULL(NEW.activityNotes, ''))
              WHEN NEW.activityNotes IS NOT NULL AND NEW.activityNotes != '' THEN
                CONCAT(businessActivity, '\n',
                       '[', DATE_FORMAT(IFNULL(NEW.processedDate, CURDATE()), '%Y-%m-%d'), '] ',
                       NEW.activityNotes)
              ELSE businessActivity
            END,

            -- 6. 수정일시 갱신
            updatedAt = NOW()

          WHERE keyValue = NEW.companyId;

        END IF;
      END
    `);
    console.log('   ✅ 트리거 생성 완료\n');

    // 트리거 확인
    console.log('3️⃣  생성된 트리거 확인...');
    const [triggers] = await connection.execute(`
      SHOW TRIGGERS WHERE \`Trigger\` = 'update_company_after_report_approval'
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
    console.log('트리거명: update_company_after_report_approval');
    console.log('동작: reports 테이블 UPDATE 후');
    console.log('조건: status가 "승인"으로 변경될 때');
    console.log('\n자동 업데이트 항목:');
    console.log('  1. ✅ salesProduct (판매제품 추가)');
    console.log('  2. ✅ lastPaymentDate (마지막결제일)');
    console.log('  3. ✅ lastPaymentAmount (마지막총결재금액)');
    console.log('  4. ✅ accumulatedCollection (누적수금금액 합산)');
    console.log('  5. ✅ accumulatedSales (누적매출금액 합산, 부가세처리)');
    console.log('  6. ✅ businessActivity (영업활동 추가)');
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
