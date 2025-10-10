/**
 * confirmationData 컬럼 추가 스크립트
 * Railway 프로덕션 DB에 실행
 */

import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

dotenv.config();

async function addConfirmationDataColumn() {
  let connection;

  try {
    console.log('🔌 Railway MySQL 연결 중...');

    // Railway DATABASE_URL 파싱
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error('DATABASE_URL 환경변수가 설정되지 않았습니다.');
    }

    console.log('DATABASE_URL:', dbUrl.replace(/:[^:@]+@/, ':****@')); // 비밀번호 마스킹

    // DATABASE_URL 사용 (Railway 표준 방식)
    connection = await mysql.createConnection(dbUrl);

    console.log('✅ MySQL 연결 성공');

    // DATABASE 이름 추출
    const dbName = dbUrl.split('/').pop().split('?')[0];
    console.log('데이터베이스:', dbName);

    // 1. 현재 테이블 구조 확인
    console.log('\n📋 현재 reports 테이블 구조 확인...');
    const [columns] = await connection.execute(
      `SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE, IS_NULLABLE, COLUMN_COMMENT
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'reports'
       ORDER BY ORDINAL_POSITION`,
      [dbName]
    );

    console.log('\n현재 컬럼 목록:');
    columns.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME}: ${col.COLUMN_TYPE} ${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    // 2. confirmationData 컬럼 존재 확인
    const hasConfirmationData = columns.some(col => col.COLUMN_NAME === 'confirmationData');

    if (hasConfirmationData) {
      console.log('\n⚠️  confirmationData 컬럼이 이미 존재합니다. 스킵합니다.');
      return;
    }

    // 3. confirmationData 컬럼 추가
    console.log('\n🔨 confirmationData 컬럼 추가 중...');
    await connection.execute(`
      ALTER TABLE reports
      ADD COLUMN confirmationData JSON
      COMMENT '실적 확인 상세 데이터 (entries 배열 등)'
    `);

    console.log('✅ confirmationData 컬럼 추가 완료!');

    // 4. 결과 확인
    console.log('\n📋 업데이트된 테이블 구조:');
    const [newColumns] = await connection.execute(
      `SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE, IS_NULLABLE, COLUMN_COMMENT
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'reports'
       ORDER BY ORDINAL_POSITION`,
      [dbName]
    );

    newColumns.forEach(col => {
      if (col.COLUMN_NAME === 'confirmationData') {
        console.log(`  ✅ ${col.COLUMN_NAME}: ${col.COLUMN_TYPE} ${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'} - ${col.COLUMN_COMMENT}`);
      }
    });

    // 5. 샘플 데이터 확인
    console.log('\n📊 현재 저장된 보고서 샘플:');
    const [reports] = await connection.execute(`
      SELECT reportId, actualCollectionAmount, actualSalesAmount,
             confirmationData, processedBy, processedDate
      FROM reports
      LIMIT 3
    `);

    console.log(`  총 ${reports.length}개 보고서 확인`);
    reports.forEach(r => {
      console.log(`  - ${r.reportId}: 수금=${r.actualCollectionAmount || 0}, 매출=${r.actualSalesAmount || 0}, confirmationData=${r.confirmationData ? 'O' : 'X'}`);
    });

    console.log('\n🎉 마이그레이션 완료!');

  } catch (error) {
    console.error('\n❌ 에러 발생:', error.message);
    console.error('상세:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 MySQL 연결 종료');
    }
  }
}

// 실행
addConfirmationDataColumn();
