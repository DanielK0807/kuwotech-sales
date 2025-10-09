// 비밀번호 해싱 스크립트
import bcrypt from 'bcrypt';

const password = '1234';
const saltRounds = 10;

async function hashPassword() {
  try {
    const hash = await bcrypt.hash(password, saltRounds);
    console.log('\n===========================================');
    console.log('비밀번호:', password);
    console.log('해시값:', hash);
    console.log('===========================================\n');
    console.log('SQL 업데이트 예시:');
    console.log(`UPDATE employees SET password = '${hash}' WHERE name = '강정환';`);
    console.log('===========================================\n');

    // 검증
    const isValid = await bcrypt.compare('1234', hash);
    console.log('검증 결과:', isValid ? '✅ 성공' : '❌ 실패');
  } catch (error) {
    console.error('에러:', error);
  }
}

hashPassword();
