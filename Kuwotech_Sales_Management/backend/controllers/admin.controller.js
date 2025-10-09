// ============================================
// 관리자 전용 컨트롤러
// ============================================

import bcrypt from 'bcrypt';
import { getDB } from '../config/database.js';

// POST /api/admin/migrate/fix-company-columns
// Companies 테이블 한글 컬럼을 영문으로 변경
export const fixCompanyColumns = async (req, res) => {
  try {
    console.log('🔄 Companies 테이블 컬럼명 영문 변경 시작...');

    const db = await getDB();

    // 현재 테이블 구조 확인
    const [currentColumns] = await db.execute('SHOW COLUMNS FROM companies');
    const existingColumns = currentColumns.map(col => col.Field);

    console.log('현재 컬럼:', existingColumns);

    // 한글 컬럼 → 영문 컬럼 매핑
    const columnMapping = [
      {
        oldName: '사업자등록번호',
        newName: 'businessRegistrationNumber',
        type: 'VARCHAR(12)',
        comment: 'Business Registration Number (Format: 123-45-67890)'
      },
      {
        oldName: '상세주소',
        newName: 'detailedAddress',
        type: 'TEXT',
        comment: 'Detailed Company Address'
      },
      {
        oldName: '전화번호',
        newName: 'phoneNumber',
        type: 'VARCHAR(20)',
        comment: 'Company Phone Number'
      },
      {
        oldName: '소개경로',
        newName: 'referralSource',
        type: 'VARCHAR(100)',
        comment: 'Referral Source or Person'
      }
    ];

    const renamed = [];
    const skipped = [];

    for (const col of columnMapping) {
      if (existingColumns.includes(col.oldName)) {
        // 한글 컬럼이 존재하면 영문으로 변경
        const query = `ALTER TABLE companies CHANGE COLUMN \`${col.oldName}\` \`${col.newName}\` ${col.type} COMMENT '${col.comment}'`;
        await db.execute(query);
        renamed.push({ from: col.oldName, to: col.newName });
        console.log(`✅ ${col.oldName} → ${col.newName} 변경 완료`);
      } else if (existingColumns.includes(col.newName)) {
        // 이미 영문 컬럼이 존재
        skipped.push(col.newName);
        console.log(`⏭️  ${col.newName} 이미 존재 - 건너뜀`);
      } else {
        // 둘 다 없으면 새로 추가
        const query = `ALTER TABLE companies ADD COLUMN \`${col.newName}\` ${col.type} COMMENT '${col.comment}'`;
        await db.execute(query);
        renamed.push({ from: 'NEW', to: col.newName });
        console.log(`🆕 ${col.newName} 신규 추가`);
      }
    }

    // 업데이트된 테이블 구조
    const [updatedColumns] = await db.execute('SHOW COLUMNS FROM companies');

    res.json({
      success: true,
      message: '컬럼명 영문 변경 완료',
      renamed: renamed,
      skipped: skipped,
      currentColumns: updatedColumns.map(col => ({
        name: col.Field,
        type: col.Type,
        null: col.Null,
        key: col.Key,
        default: col.Default
      }))
    });

  } catch (error) {
    console.error('❌ 컬럼명 변경 에러:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '컬럼명 변경 중 오류가 발생했습니다.',
      debug: error.message
    });
  }
};

// POST /api/admin/reset-all-passwords
// 모든 직원 비밀번호를 기본값(1234)으로 리셋
export const resetAllPasswords = async (req, res) => {
  try {
    const DEFAULT_PASSWORD = '1234';
    const SALT_ROUNDS = 10;

    console.log('🔐 비밀번호 리셋 시작...');

    // bcrypt 해시 생성
    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);
    console.log('생성된 해시:', hashedPassword);

    // DB 연결
    const db = await getDB();

    // 모든 직원 비밀번호 업데이트
    const [result] = await db.execute(
      'UPDATE employees SET password = ?',
      [hashedPassword]
    );

    console.log(`✅ ${result.affectedRows}명의 비밀번호 업데이트 완료`);

    // 검증
    const [testEmployees] = await db.execute(
      'SELECT name, password FROM employees LIMIT 3'
    );

    const validations = [];
    for (const emp of testEmployees) {
      const isValid = await bcrypt.compare(DEFAULT_PASSWORD, emp.password);
      validations.push({ name: emp.name, isValid });
    }

    res.json({
      success: true,
      message: `${result.affectedRows}명의 비밀번호가 "1234"로 리셋되었습니다`,
      updated: result.affectedRows,
      validations: validations
    });

  } catch (error) {
    console.error('❌ 비밀번호 리셋 에러:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '비밀번호 리셋 중 오류가 발생했습니다.',
      debug: error.message
    });
  }
};
