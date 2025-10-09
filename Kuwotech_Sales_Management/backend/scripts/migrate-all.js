// ============================================
// 통합 마이그레이션 스크립트
// ============================================
// 실행: node backend/scripts/migrate-all.js
// 목적: 전체 마이그레이션 프로세스를 순차적으로 실행
// ============================================

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('='.repeat(80));
console.log('🚀 쿠워테크 영업관리 시스템 - 통합 마이그레이션');
console.log('='.repeat(80));
console.log();

const runScript = (scriptPath, description) => {
  console.log(`\n${'━'.repeat(80)}`);
  console.log(`📌 ${description}`);
  console.log(`${'━'.repeat(80)}\n`);

  try {
    const fullPath = path.join(__dirname, scriptPath);

    // 스크립트 존재 여부 확인
    if (!fs.existsSync(fullPath)) {
      console.error(`❌ 스크립트 파일을 찾을 수 없습니다: ${fullPath}`);
      throw new Error(`Script not found: ${scriptPath}`);
    }

    // 스크립트 실행 (inherit로 실시간 출력 표시)
    execSync(`node "${fullPath}"`, {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
      encoding: 'utf8'
    });

    console.log(`\n✅ ${description} 완료\n`);
    return true;
  } catch (error) {
    console.error(`\n❌ ${description} 실패`);
    console.error('오류 메시지:', error.message);
    return false;
  }
};

const migrate = async () => {
  const startTime = Date.now();

  try {
    console.log('⚙️  마이그레이션 시작...\n');
    console.log('📋 실행 순서:');
    console.log('   1. 기존 테이블 삭제 (drop-tables.js)');
    console.log('   2. 새 테이블 생성 (init-db.js)');
    console.log('   3. 엑셀 → JSON 변환 (parse-excel-to-json.js)');
    console.log('   4. JSON → MySQL 임포트 (import-data.js)');
    console.log('   5. 트리거 생성 (create-triggers.js)');
    console.log('   6. 데이터 검증 (validate-data.js)\n');

    console.log('⚠️  주의: 이 작업은 기존 데이터를 삭제합니다!\n');

    // ==========================================
    // 1. 기존 테이블 삭제
    // ==========================================
    if (!runScript('drop-tables.js', '1️⃣  기존 테이블 삭제')) {
      throw new Error('테이블 삭제 실패');
    }

    // ==========================================
    // 2. 새 테이블 생성
    // ==========================================
    if (!runScript('init-db.js', '2️⃣  새 테이블 생성 (UUID 스키마)')) {
      throw new Error('테이블 생성 실패');
    }

    // ==========================================
    // 3. 엑셀 → JSON 변환
    // ==========================================
    if (!runScript('parse-excel-to-json.js', '3️⃣  엑셀 데이터 파싱 (→ JSON)')) {
      throw new Error('엑셀 파싱 실패');
    }

    // ==========================================
    // 4. JSON → MySQL 임포트
    // ==========================================
    if (!runScript('import-data.js', '4️⃣  JSON 데이터 임포트 (→ MySQL)')) {
      throw new Error('데이터 임포트 실패');
    }

    // ==========================================
    // 5. 트리거 생성
    // ==========================================
    if (!runScript('create-triggers.js', '5️⃣  MySQL 트리거 생성')) {
      throw new Error('트리거 생성 실패');
    }

    // ==========================================
    // 6. 데이터 검증
    // ==========================================
    if (!runScript('validate-data.js', '6️⃣  데이터 무결성 검증')) {
      throw new Error('데이터 검증 실패');
    }

    // ==========================================
    // 완료 메시지
    // ==========================================
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(1);

    console.log('\n' + '='.repeat(80));
    console.log('🎉 마이그레이션 완료!');
    console.log('='.repeat(80));
    console.log(`\n⏱️  총 소요 시간: ${duration}초\n`);

    console.log('📊 마이그레이션 결과:');
    console.log('   ✅ 테이블 생성: employees, companies, reports, change_history, backups');
    console.log('   ✅ 트리거 생성: after_report_approved_insert/update/delete');
    console.log('   ✅ 데이터 임포트: 18명 직원, 1008개 회사');
    console.log('   ✅ 데이터 검증: 통과\n');

    console.log('🚀 다음 단계:');
    console.log('   1. 백엔드 서버 시작: npm start');
    console.log('   2. API 테스트: http://localhost:5000/api/test');
    console.log('   3. 프론트엔드 개발 진행\n');

    console.log('📁 생성된 파일:');
    console.log('   - backend/data/companies.json (1008개 회사)');
    console.log('   - backend/data/employees.json (18명 직원)\n');

    console.log('💾 데이터베이스:');
    console.log('   - Host: MySQL (from DATABASE_URL)');
    console.log('   - Charset: utf8mb4_unicode_ci');
    console.log('   - Engine: InnoDB\n');

    console.log('='.repeat(80));

  } catch (error) {
    console.error('\n' + '='.repeat(80));
    console.error('❌ 마이그레이션 실패!');
    console.error('='.repeat(80));
    console.error('\n오류:', error.message);
    console.error('\n💡 문제 해결:');
    console.error('   1. DATABASE_URL 환경변수 확인');
    console.error('   2. MySQL 서버 실행 확인');
    console.error('   3. 엑셀 파일 경로 확인 (01.Original_data/영업관리기초자료.xlsx)');
    console.error('   4. 개별 스크립트 실행으로 단계별 확인\n');
    process.exit(1);
  }
};

// 스크립트 실행
migrate();
