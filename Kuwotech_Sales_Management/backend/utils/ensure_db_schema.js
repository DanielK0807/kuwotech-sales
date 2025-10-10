/**
 * 데이터베이스 스키마 자동 체크 및 업데이트
 * 서버 시작 시 자동으로 실행되어 필요한 컬럼이 없으면 추가
 */

import { getDB } from '../config/database.js';

/**
 * reports 테이블에 confirmationData 컬럼이 있는지 확인하고 없으면 추가
 */
export async function ensureReportsSchema() {
  try {
    const db = await getDB();

    console.log('📋 [DB Schema] reports 테이블 스키마 체크 중...');

    // 1. confirmationData 컬럼 존재 여부 확인
    const [columns] = await db.execute(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'reports'
        AND COLUMN_NAME = 'confirmationData'
    `);

    if (columns.length > 0) {
      console.log('✅ [DB Schema] confirmationData 컬럼 존재 - 스킵');
      return true;
    }

    // 2. confirmationData 컬럼 추가
    console.log('🔨 [DB Schema] confirmationData 컬럼 추가 중...');

    await db.execute(`
      ALTER TABLE reports
      ADD COLUMN confirmationData JSON
      COMMENT '실적 확인 상세 데이터 (entries 배열 등)'
    `);

    console.log('✅ [DB Schema] confirmationData 컬럼 추가 완료!');

    // 3. 결과 확인
    const [newColumns] = await db.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, COLUMN_COMMENT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'reports'
        AND COLUMN_NAME = 'confirmationData'
    `);

    if (newColumns.length > 0) {
      const col = newColumns[0];
      console.log(`✅ [DB Schema] 컬럼 확인: ${col.COLUMN_NAME} (${col.DATA_TYPE}) - ${col.COLUMN_COMMENT}`);
      return true;
    }

    return false;

  } catch (error) {
    console.error('❌ [DB Schema] 스키마 체크 실패:', error.message);

    // 이미 존재하는 경우 에러는 무시
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('⚠️  [DB Schema] confirmationData 컬럼이 이미 존재합니다.');
      return true;
    }

    throw error;
  }
}

/**
 * 모든 필수 스키마 체크 및 업데이트
 */
export async function ensureAllSchemas() {
  try {
    console.log('\n====================================');
    console.log('🔍 데이터베이스 스키마 자동 체크 시작');
    console.log('====================================\n');

    // reports 테이블 스키마 확인
    await ensureReportsSchema();

    console.log('\n====================================');
    console.log('✅ 데이터베이스 스키마 체크 완료');
    console.log('====================================\n');

    return true;

  } catch (error) {
    console.error('\n❌ 데이터베이스 스키마 체크 실패:', error);
    // 스키마 체크 실패해도 서버는 계속 실행 (기존 기능은 동작)
    console.warn('⚠️  서버는 계속 실행되지만 일부 기능이 제한될 수 있습니다.');
    return false;
  }
}
