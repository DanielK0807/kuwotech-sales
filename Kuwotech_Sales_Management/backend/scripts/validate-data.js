// ============================================
// 데이터 검증 스크립트
// ============================================
// 실행: node backend/scripts/validate-data.js
// 목적: MySQL 데이터베이스 무결성 및 품질 검증
// ============================================

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

console.log('🔍 데이터 검증 시작\n');

const validateData = async () => {
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
      database
    };

    connection = await mysql.createConnection(config);
    console.log('   ✅ MySQL 연결 성공\n');

    const errors = [];
    const warnings = [];

    // ==========================================
    // 2. employees 테이블 검증
    // ==========================================
    console.log('2️⃣  employees 테이블 검증 중...');

    // 총 직원 수
    const [empCount] = await connection.execute('SELECT COUNT(*) as count FROM employees');
    console.log(`   ✅ 총 직원 수: ${empCount[0].count}명`);

    // 이름 중복 검사
    const [dupNames] = await connection.execute(`
      SELECT name, COUNT(*) as count FROM employees GROUP BY name HAVING count > 1
    `);
    if (dupNames.length > 0) {
      errors.push(`중복된 이름 발견: ${dupNames.map(d => d.name).join(', ')}`);
    } else {
      console.log('   ✅ 이름 중복 없음');
    }

    // 역할1 필수 검사
    const [noRole1] = await connection.execute(`
      SELECT name FROM employees WHERE role1 IS NULL OR role1 = ''
    `);
    if (noRole1.length > 0) {
      errors.push(`역할1 누락: ${noRole1.map(e => e.name).join(', ')}`);
    } else {
      console.log('   ✅ 모든 직원이 역할1 보유');
    }

    // 역할 통계
    const [roleStats] = await connection.execute(`
      SELECT
        role1,
        COUNT(*) as count,
        SUM(CASE WHEN role2 IS NOT NULL THEN 1 ELSE 0 END) as dual_role_count
      FROM employees
      GROUP BY role1
    `);
    console.log('   📊 역할별 통계:');
    roleStats.forEach(row => {
      console.log(`      - ${row.role1}: ${row.count}명 (복수역할: ${row.dual_role_count}명)`);
    });

    // 복수 역할 직원 조회
    const [multiRole] = await connection.execute(`
      SELECT name, role1, role2, canUploadExcel FROM employees WHERE role2 IS NOT NULL
    `);
    console.log(`   🎭 복수 역할 직원: ${multiRole.length}명`);
    multiRole.forEach(row => {
      console.log(`      - ${row.name}: ${row.role1} + ${row.role2} (엑셀권한: ${row.canUploadExcel ? 'Y' : 'N'})`);
    });

    // 엑셀 업로드 권한 검사
    const [excelPerms] = await connection.execute(`
      SELECT name FROM employees WHERE canUploadExcel = TRUE
    `);
    console.log(`   📤 엑셀 업로드 권한: ${excelPerms.map(e => e.name).join(', ')}`);
    if (excelPerms.length !== 1 || excelPerms[0].name !== '강정환') {
      warnings.push('엑셀 업로드 권한은 강정환만 가져야 합니다.');
    }

    // 입사일자 검증
    const [invalidHireDates] = await connection.execute(`
      SELECT name, hireDate FROM employees
      WHERE hireDate IS NULL OR hireDate < '2000-01-01' OR hireDate > CURDATE()
    `);
    if (invalidHireDates.length > 0) {
      warnings.push(`비정상 입사일자: ${invalidHireDates.map(e => `${e.name}(${e.hireDate})`).join(', ')}`);
    } else {
      console.log('   ✅ 모든 입사일자 정상');
    }

    console.log();

    // ==========================================
    // 3. companies 테이블 검증
    // ==========================================
    console.log('3️⃣  companies 테이블 검증 중...');

    // 총 회사 수
    const [compCount] = await connection.execute('SELECT COUNT(*) as count FROM companies');
    console.log(`   ✅ 총 회사 수: ${compCount[0].count}개`);

    // UUID 형식 검증
    const [invalidUUIDs] = await connection.execute(`
      SELECT keyValue, finalCompanyName FROM companies
      WHERE keyValue IS NULL
         OR keyValue NOT REGEXP '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    `);
    if (invalidUUIDs.length > 0) {
      errors.push(`잘못된 UUID 형식: ${invalidUUIDs.length}개`);
      invalidUUIDs.slice(0, 5).forEach(c => {
        console.log(`      - ${c.finalCompanyName}: ${c.keyValue}`);
      });
    } else {
      console.log('   ✅ 모든 UUID 형식 정상');
    }

    // 최종거래처명 필수 검사
    const [noCompanyName] = await connection.execute(`
      SELECT keyValue FROM companies WHERE finalCompanyName IS NULL OR finalCompanyName = ''
    `);
    if (noCompanyName.length > 0) {
      errors.push(`최종거래처명 누락: ${noCompanyName.length}개`);
    } else {
      console.log('   ✅ 모든 회사가 최종거래처명 보유');
    }

    // 내부담당자 검증 (존재하는 직원인지)
    const [employeeNames] = await connection.execute('SELECT name FROM employees');
    const validEmployees = new Set(employeeNames.map(e => e.name));

    const [invalidManagers] = await connection.execute(`
      SELECT finalCompanyName, internalManager FROM companies
      WHERE internalManager IS NOT NULL AND internalManager != ''
    `);

    const unknownManagers = invalidManagers.filter(c => !validEmployees.has(c.internalManager));
    if (unknownManagers.length > 0) {
      warnings.push(`존재하지 않는 내부담당자: ${unknownManagers.length}개`);
      const uniqueManagers = [...new Set(unknownManagers.map(c => c.internalManager))];
      console.log(`   ⚠️  미등록 담당자: ${uniqueManagers.join(', ')}`);
    } else {
      console.log('   ✅ 모든 내부담당자 유효');
    }

    // 거래상태 통계
    const [statusStats] = await connection.execute(`
      SELECT businessStatus, COUNT(*) as count FROM companies
      WHERE businessStatus IS NOT NULL
      GROUP BY businessStatus
      ORDER BY count DESC
    `);
    console.log('   📊 거래상태별 통계:');
    statusStats.forEach(row => {
      console.log(`      - ${row.businessStatus}: ${row.count}개`);
    });

    // Enum 값 검증
    const validStatuses = ['활성', '비활성', '불용', '추가확인'];
    const [invalidStatuses] = await connection.execute(`
      SELECT finalCompanyName, businessStatus FROM companies
      WHERE businessStatus IS NOT NULL
        AND businessStatus NOT IN (${validStatuses.map(() => '?').join(',')})
    `, validStatuses);
    if (invalidStatuses.length > 0) {
      errors.push(`잘못된 거래상태: ${invalidStatuses.length}개`);
    } else {
      console.log('   ✅ 모든 거래상태 유효');
    }

    // Contribution 값 검증
    const validContributions = ['상', '중', '하'];
    const [invalidJCW] = await connection.execute(`
      SELECT finalCompanyName, jcwContribution FROM companies
      WHERE jcwContribution IS NOT NULL
        AND jcwContribution NOT IN (${validContributions.map(() => '?').join(',')})
    `, validContributions);
    const [invalidComp] = await connection.execute(`
      SELECT finalCompanyName, companyContribution FROM companies
      WHERE companyContribution IS NOT NULL
        AND companyContribution NOT IN (${validContributions.map(() => '?').join(',')})
    `, validContributions);

    if (invalidJCW.length > 0 || invalidComp.length > 0) {
      errors.push(`잘못된 기여도 값: 정철웅 ${invalidJCW.length}개, 회사 ${invalidComp.length}개`);
    } else {
      console.log('   ✅ 모든 기여도 값 유효');
    }

    // 폐업 통계
    const [closedStats] = await connection.execute(`
      SELECT isClosed, COUNT(*) as count FROM companies GROUP BY isClosed
    `);
    console.log('   🏢 폐업 통계:');
    closedStats.forEach(row => {
      console.log(`      - ${row.isClosed === 'Y' ? '폐업' : '영업중'}: ${row.count}개`);
    });

    // 금액 필드 통계 (정보성)
    const [negativeCollection] = await connection.execute(`
      SELECT COUNT(*) as count FROM companies WHERE accumulatedCollection < 0
    `);
    const [negativeSales] = await connection.execute(`
      SELECT COUNT(*) as count FROM companies WHERE accumulatedSales < 0
    `);
    const [negativeAR] = await connection.execute(`
      SELECT COUNT(*) as count FROM companies WHERE accountsReceivable < 0
    `);

    console.log('   ℹ️  금액 필드 통계:');
    console.log(`      - 음수 누적수금: ${negativeCollection[0].count}개 (환불 등)`);
    console.log(`      - 음수 누적매출: ${negativeSales[0].count}개 (반품/환불 등)`);
    console.log(`      - 음수 매출채권: ${negativeAR[0].count}개 (선수금/과입금 등)`);
    console.log('   ✅ 금액 음수 허용 (비즈니스 로직상 정상)');

    console.log();

    // ==========================================
    // 4. reports 테이블 검증
    // ==========================================
    console.log('4️⃣  reports 테이블 검증 중...');

    const [reportCount] = await connection.execute('SELECT COUNT(*) as count FROM reports');
    console.log(`   ✅ 총 보고서 수: ${reportCount[0].count}개`);

    if (reportCount[0].count > 0) {
      // FK 검증: submittedBy
      const [invalidSubmitters] = await connection.execute(`
        SELECT DISTINCT r.submittedBy
        FROM reports r
        LEFT JOIN employees e ON r.submittedBy = e.name
        WHERE e.name IS NULL
      `);
      if (invalidSubmitters.length > 0) {
        errors.push(`존재하지 않는 작성자: ${invalidSubmitters.map(r => r.submittedBy).join(', ')}`);
      }

      // FK 검증: companyId
      const [invalidCompanies] = await connection.execute(`
        SELECT DISTINCT r.companyId
        FROM reports r
        LEFT JOIN companies c ON r.companyId = c.keyValue
        WHERE c.keyValue IS NULL
      `);
      if (invalidCompanies.length > 0) {
        errors.push(`존재하지 않는 회사ID: ${invalidCompanies.length}개`);
      }

      // 보고서 상태별 통계
      const [reportStatusStats] = await connection.execute(`
        SELECT status, COUNT(*) as count FROM reports GROUP BY status
      `);
      console.log('   📊 보고서 상태별 통계:');
      reportStatusStats.forEach(row => {
        console.log(`      - ${row.status}: ${row.count}개`);
      });
    } else {
      console.log('   ℹ️  보고서 데이터 없음 (정상)');
    }

    console.log();

    // ==========================================
    // 5. 트리거 검증
    // ==========================================
    console.log('5️⃣  트리거 검증 중...');

    const [triggers] = await connection.execute(`
      SELECT TRIGGER_NAME, EVENT_MANIPULATION, EVENT_OBJECT_TABLE
      FROM information_schema.TRIGGERS
      WHERE TRIGGER_SCHEMA = ?
      ORDER BY TRIGGER_NAME
    `, [database]);

    console.log(`   ✅ 총 ${triggers.length}개 트리거 존재:`);
    triggers.forEach(t => {
      console.log(`      - ${t.TRIGGER_NAME} (${t.EVENT_MANIPULATION} on ${t.EVENT_OBJECT_TABLE})`);
    });

    const requiredTriggers = [
      'after_report_approved_insert',
      'after_report_approved_update',
      'after_report_approved_delete'
    ];
    const existingTriggers = new Set(triggers.map(t => t.TRIGGER_NAME));
    const missingTriggers = requiredTriggers.filter(t => !existingTriggers.has(t));

    if (missingTriggers.length > 0) {
      warnings.push(`누락된 트리거: ${missingTriggers.join(', ')}`);
    } else {
      console.log('   ✅ 필수 트리거 모두 존재');
    }

    console.log();

    // ==========================================
    // 6. 인덱스 검증
    // ==========================================
    console.log('6️⃣  인덱스 검증 중...');

    const tables = ['employees', 'companies', 'reports'];
    for (const table of tables) {
      const [indexes] = await connection.execute(`
        SHOW INDEX FROM ${table}
      `);
      const indexCount = new Set(indexes.map(i => i.Key_name)).size;
      console.log(`   ✅ ${table}: ${indexCount}개 인덱스`);
    }

    console.log();

    // ==========================================
    // 7. 결과 요약
    // ==========================================
    console.log('='.repeat(80));
    console.log('📊 검증 결과 요약');
    console.log('='.repeat(80));

    if (errors.length === 0 && warnings.length === 0) {
      console.log('✅ 모든 검증 통과! 데이터베이스 상태 정상\n');
    } else {
      if (errors.length > 0) {
        console.log(`\n❌ 오류 (${errors.length}개):`);
        errors.forEach((err, idx) => {
          console.log(`   ${idx + 1}. ${err}`);
        });
      }

      if (warnings.length > 0) {
        console.log(`\n⚠️  경고 (${warnings.length}개):`);
        warnings.forEach((warn, idx) => {
          console.log(`   ${idx + 1}. ${warn}`);
        });
      }

      console.log();
    }

    console.log('='.repeat(80));

    // ==========================================
    // 8. 데이터 품질 점수
    // ==========================================
    const totalChecks = 20; // 총 검증 항목 수
    const failedChecks = errors.length + (warnings.length * 0.5); // 경고는 0.5점 감점
    const qualityScore = Math.max(0, ((totalChecks - failedChecks) / totalChecks * 100)).toFixed(1);

    console.log(`\n🎯 데이터 품질 점수: ${qualityScore}/100`);
    if (qualityScore >= 90) {
      console.log('   등급: 우수 ⭐⭐⭐');
    } else if (qualityScore >= 70) {
      console.log('   등급: 양호 ⭐⭐');
    } else if (qualityScore >= 50) {
      console.log('   등급: 보통 ⭐');
    } else {
      console.log('   등급: 개선필요 ⚠️');
    }

    console.log('\n💡 다음 단계:');
    if (errors.length > 0) {
      console.log('   1. 오류 수정 필요');
      console.log('   2. 수정 후 재검증: node backend/scripts/validate-data.js');
    } else {
      console.log('   1. 백업 생성 권장');
      console.log('   2. 애플리케이션 테스트 시작\n');
    }

  } catch (error) {
    console.error('\n❌ 검증 중 오류 발생:');
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
validateData();
