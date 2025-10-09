// 모든 직원 비밀번호를 bcrypt 해시로 업데이트
import bcrypt from 'bcrypt';
import { getDB } from '../config/database.js';

const DEFAULT_PASSWORD = '1234';
const SALT_ROUNDS = 10;

async function updateAllPasswords() {
  try {
    console.log('🔐 비밀번호 업데이트 시작...\n');

    // bcrypt 해시 생성
    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);
    console.log('생성된 해시:', hashedPassword);
    console.log('');

    // DB 연결
    const db = await getDB();
    console.log('✅ DB 연결 성공\n');

    // 모든 직원 조회
    const [employees] = await db.execute('SELECT name FROM employees');
    console.log(`📊 총 ${employees.length}명의 직원 발견\n`);

    // 모든 직원 비밀번호 업데이트
    const [result] = await db.execute(
      'UPDATE employees SET password = ?',
      [hashedPassword]
    );

    console.log(`✅ ${result.affectedRows}명의 비밀번호 업데이트 완료\n`);
    console.log('===========================================');
    console.log('✅ 모든 직원 비밀번호: 1234');
    console.log('===========================================\n');

    // 검증
    console.log('🔍 검증 중...');
    const [testEmployees] = await db.execute(
      'SELECT name, password FROM employees LIMIT 3'
    );

    for (const emp of testEmployees) {
      const isValid = await bcrypt.compare(DEFAULT_PASSWORD, emp.password);
      console.log(`${emp.name}: ${isValid ? '✅' : '❌'}`);
    }

    console.log('\n✅ 업데이트 완료!');
    process.exit(0);

  } catch (error) {
    console.error('❌ 에러:', error);
    process.exit(1);
  }
}

updateAllPasswords();
