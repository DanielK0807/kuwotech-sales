// ============================================
// 실적보고서 시스템 전체 마이그레이션 실행
// ============================================
// Railway 환경에서 실행되어 모든 SQL 마이그레이션 적용
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// 마이그레이션 파일 목록 (실행 순서)
const MIGRATION_FILES = [
  '01_add_reports_fields.sql',
  '02_create_reports_tables_v2.sql',
  '03_create_reports_trigger.sql',
  '05_clean_sample_data.sql'
  // 04_insert_initial_goals.sql - 제외됨 (목표는 관리자가 API로 동적 입력)
];

async function runSingleMigration(connection, sqlFileName) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📄 ${sqlFileName}`);
  console.log(`${'='.repeat(60)}`);

  try {
    const sqlFilePath = path.join(__dirname, sqlFileName);
    const sqlContent = await fs.readFile(sqlFilePath, 'utf8');

    console.log(`🚀 실행 중...`);

    // SQL 파일 전체를 multipleStatements로 실행
    try {
      await connection.query(sqlContent);
      console.log(`✅ 완료: 성공`);
      return { success: true, successCount: 1, errorCount: 0 };
    } catch (error) {
      // 이미 존재하는 객체 에러는 무시
      if (error.code === 'ER_TABLE_EXISTS_ERROR' ||
          error.code === 'ER_DUP_FIELDNAME' ||
          error.code === 'ER_DUP_KEYNAME' ||
          error.message.includes('already exists')) {
        console.log(`⚠️  이미 존재: ${error.message.substring(0, 100)}`);
        return { success: true, successCount: 1, errorCount: 0 };
      } else {
        console.error(`❌ 에러:`, error.message);
        console.error(`SQL 에러 코드:`, error.code);
        return { success: false, successCount: 0, errorCount: 1, error: error.message };
      }
    }

  } catch (error) {
    console.error(`❌ 파일 실행 실패:`, error.message);
    return { success: false, error: error.message };
  }
}

async function runAllMigrations() {
  let connection;

  try {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 실적보고서 시스템 마이그레이션 시작');
    console.log('='.repeat(60));

    // Railway MySQL 연결
    console.log('\n📡 MySQL 연결 중...');
    connection = await mysql.createConnection({
      uri: process.env.DATABASE_URL,
      multipleStatements: true
    });
    console.log('✅ MySQL 연결 성공\n');

    const results = {};
    let totalSuccess = 0;
    let totalErrors = 0;

    // 각 마이그레이션 파일 실행
    for (const file of MIGRATION_FILES) {
      const result = await runSingleMigration(connection, file);
      results[file] = result;

      if (result.success) {
        totalSuccess++;
      } else {
        totalErrors++;
        console.log(`\n⚠️  ${file} 실행 중 오류 발생. 계속 진행합니다.`);
      }
    }

    // 최종 결과 확인
    console.log('\n' + '='.repeat(60));
    console.log('📊 마이그레이션 결과 요약');
    console.log('='.repeat(60));

    MIGRATION_FILES.forEach(file => {
      const result = results[file];
      const status = result.success ? '✅' : '❌';
      console.log(`${status} ${file}`);
      if (result.successCount !== undefined) {
        console.log(`   └─ ${result.successCount} statements 성공, ${result.errorCount} 실패`);
      }
    });

    // 테이블 목록 확인
    console.log('\n📋 생성된 테이블 확인:');
    const [tables] = await connection.query('SHOW TABLES');
    tables.forEach(table => {
      const tableName = Object.values(table)[0];
      console.log(`   - ${tableName}`);
    });

    // 실적보고서 관련 테이블 상세 확인
    console.log('\n🔍 실적보고서 시스템 테이블 상세:');

    const reportTables = ['employees', 'reports', 'companyGoals', 'changeHistory'];
    for (const tableName of reportTables) {
      try {
        const [rows] = await connection.query(
          `SELECT COUNT(*) as count FROM ${tableName}`
        );
        console.log(`   - ${tableName}: ${rows[0].count} rows`);
      } catch (error) {
        console.log(`   - ${tableName}: ⚠️  테이블 없음`);
      }
    }

    // 트리거 확인
    console.log('\n⚡ 트리거 확인:');
    const [triggers] = await connection.query(
      `SHOW TRIGGERS WHERE \`Trigger\` LIKE '%report%'`
    );
    if (triggers.length > 0) {
      triggers.forEach(trigger => {
        console.log(`   - ${trigger.Trigger} (${trigger.Table})`);
      });
    } else {
      console.log('   ⚠️  실적보고서 트리거 없음');
    }

    await connection.end();
    console.log('\n✅ MySQL 연결 종료');

    console.log('\n' + '='.repeat(60));
    if (totalErrors === 0) {
      console.log('🎉 모든 마이그레이션 성공!');
    } else {
      console.log(`⚠️  ${totalSuccess}/${MIGRATION_FILES.length} 성공, ${totalErrors} 실패`);
    }
    console.log('='.repeat(60) + '\n');

    return totalErrors === 0;

  } catch (error) {
    console.error('\n❌ 마이그레이션 실패:', error.message);
    console.error(error);

    if (connection) {
      await connection.end();
    }

    return false;
  }
}

// 실행
runAllMigrations()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('예외 발생:', error);
    process.exit(1);
  });
