// ============================================
// JSON → MySQL 데이터 임포트 스크립트
// ============================================
// 실행: node backend/scripts/import-data.js
// 목적: JSON 데이터를 MySQL database에 임포트
// ============================================

import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend directory
dotenv.config({ path: path.join(__dirname, '../.env') });

const COMPANIES_JSON = path.join(__dirname, '../data/companies.json');
const EMPLOYEES_JSON = path.join(__dirname, '../data/employees.json');

console.log('📥 JSON → MySQL 데이터 임포트 시작\n');

const importData = async () => {
  let connection;

  try {
    // ==========================================
    // 1. JSON 파일 읽기
    // ==========================================
    console.log('1️⃣  JSON 파일 읽기 중...');
    const companies = JSON.parse(fs.readFileSync(COMPANIES_JSON, 'utf8'));
    const employees = JSON.parse(fs.readFileSync(EMPLOYEES_JSON, 'utf8'));
    console.log(`   ✅ companies.json: ${companies.length}개`);
    console.log(`   ✅ employees.json: ${employees.length}명\n`);

    // ==========================================
    // 2. MySQL 연결
    // ==========================================
    console.log('2️⃣  MySQL 연결 중...');

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

    // ==========================================
    // 3. 트랜잭션 시작
    // ==========================================
    console.log('3️⃣  트랜잭션 시작...');
    await connection.beginTransaction();
    console.log('   ✅ BEGIN 완료\n');

    // ==========================================
    // 4. employees 테이블 임포트 (FK 참조되므로 먼저)
    // ==========================================
    console.log('4️⃣  employees 데이터 임포트 중...');

    let employeeCount = 0;
    for (const emp of employees) {
      await connection.execute(
        `INSERT INTO employees (
          name, email, password, role1, role2, department, hireDate,
          phone, status, canUploadExcel, lastLogin
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          emp.name,
          emp.email,
          emp.password,
          emp.role1,
          emp.role2,
          emp.department,
          emp.hireDate,
          emp.phone,
          emp.status,
          emp.canUploadExcel || false,
          emp.lastLogin
        ]
      );
      employeeCount++;

      if (employeeCount % 5 === 0) {
        console.log(`   ⏳ ${employeeCount}/${employees.length} 명 처리 중...`);
      }
    }

    console.log(`   ✅ ${employeeCount}명 임포트 완료\n`);

    // ==========================================
    // 5. companies 테이블 임포트
    // ==========================================
    console.log('5️⃣  companies 데이터 임포트 중...');

    let companyCount = 0;
    for (const company of companies) {
      await connection.execute(
        `INSERT INTO companies (
          keyValue, finalCompanyName, isClosed, ceoOrDentist, customerRegion,
          businessStatus, department, salesProduct, internalManager,
          jcwContribution, companyContribution, lastPaymentDate, lastPaymentAmount,
          accountsReceivable, accumulatedCollection, accumulatedSales, businessActivity
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          company.keyValue,
          company.finalCompanyName,
          company.isClosed || 'N',
          company.ceoOrDentist,
          company.customerRegion,
          company.businessStatus,
          company.department,
          company.salesProduct,
          company.internalManager,
          company.jcwContribution,
          company.companyContribution,
          company.lastPaymentDate,
          company.lastPaymentAmount || 0,
          company.accountsReceivable || 0,
          company.accumulatedCollection || 0,
          company.accumulatedSales || 0,
          company.businessActivity
        ]
      );
      companyCount++;

      if (companyCount % 100 === 0) {
        console.log(`   ⏳ ${companyCount}/${companies.length} 개 처리 중... (${Math.round(companyCount / companies.length * 100)}%)`);
      }
    }

    console.log(`   ✅ ${companyCount}개 회사 임포트 완료\n`);

    // ==========================================
    // 6. 트랜잭션 커밋
    // ==========================================
    console.log('6️⃣  트랜잭션 커밋 중...');
    await connection.commit();
    console.log('   ✅ COMMIT 완료\n');

    // ==========================================
    // 7. 임포트 결과 검증
    // ==========================================
    console.log('7️⃣  임포트 결과 검증 중...');

    const [employeeRows] = await connection.execute('SELECT COUNT(*) as count FROM employees');
    const [companyRows] = await connection.execute('SELECT COUNT(*) as count FROM companies');

    console.log(`   ✅ employees 테이블: ${employeeRows[0].count}명`);
    console.log(`   ✅ companies 테이블: ${companyRows[0].count}개\n`);

    // ==========================================
    // 8. 샘플 데이터 조회
    // ==========================================
    console.log('8️⃣  샘플 데이터 조회:');
    console.log('-'.repeat(80));

    // 단일 역할 조회
    const [singleRoleRows] = await connection.execute(
      `SELECT name, role1, department FROM employees WHERE role2 IS NULL LIMIT 5`
    );
    console.log('\n👥 단일 역할 (처음 5명):');
    singleRoleRows.forEach(row => {
      console.log(`   ${row.name}: ${row.role1} (${row.department || '부서없음'})`);
    });

    // 복수 역할 조회
    const [multiRoleRows] = await connection.execute(
      `SELECT name, role1, role2, department, canUploadExcel FROM employees WHERE role2 IS NOT NULL`
    );
    console.log('\n🎭 복수 역할:');
    multiRoleRows.forEach(row => {
      console.log(`   ${row.name}: ${row.role1} + ${row.role2} (${row.department || '부서없음'}) - 엑셀 업로드: ${row.canUploadExcel ? 'Y' : 'N'}`);
    });

    // UUID 형식 확인
    const [uuidRows] = await connection.execute(
      `SELECT keyValue, finalCompanyName FROM companies LIMIT 3`
    );
    console.log('\n🔑 UUID 샘플 (처음 3개):');
    uuidRows.forEach(row => {
      console.log(`   ${row.finalCompanyName}: ${row.keyValue}`);
    });

    // 거래상태별 통계
    const [statusStats] = await connection.execute(
      `SELECT businessStatus, COUNT(*) as count
       FROM companies
       WHERE businessStatus IS NOT NULL
       GROUP BY businessStatus
       ORDER BY count DESC`
    );
    console.log('\n📊 거래상태별 통계:');
    statusStats.forEach(row => {
      console.log(`   ${row.businessStatus}: ${row.count}개`);
    });

    // 폐업 통계
    const [closedStats] = await connection.execute(
      `SELECT isClosed, COUNT(*) as count FROM companies GROUP BY isClosed`
    );
    console.log('\n🏢 폐업 통계:');
    closedStats.forEach(row => {
      console.log(`   ${row.isClosed === 'Y' ? '폐업' : '영업중'}: ${row.count}개`);
    });

    console.log('\n' + '-'.repeat(80));

    // ==========================================
    // 9. 결과 요약
    // ==========================================
    console.log('\n' + '='.repeat(80));
    console.log('🎉 데이터 임포트 완료!');
    console.log('='.repeat(80));
    console.log(`✅ employees: ${employeeRows[0].count}명 (단일 역할: ${employeeRows[0].count - multiRoleRows.length}명, 복수 역할: ${multiRoleRows.length}명)`);
    console.log(`✅ companies: ${companyRows[0].count}개`);
    console.log('='.repeat(80));

    console.log('\n💡 다음 단계:');
    console.log('   1. node backend/scripts/create-triggers.js (트리거 생성)');
    console.log('   2. node backend/scripts/validate-data.js (데이터 검증)\n');

  } catch (error) {
    // 롤백
    if (connection) {
      console.error('\n⚠️  오류 발생! 트랜잭션 롤백 중...');
      await connection.rollback();
      console.error('   ✅ ROLLBACK 완료');
    }

    console.error('\n❌ 임포트 중 오류 발생:');
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
importData();
