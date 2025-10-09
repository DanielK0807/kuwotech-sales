// ============================================
// 강정환 엑셀 업로드 권한 설정 스크립트
// ============================================
// 실행: node backend/scripts/set-upload-permission.js
// ============================================

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const setUploadPermission = async () => {
  let connection;

  try {
    connection = await mysql.createConnection(process.env.DATABASE_URL);
    console.log('✅ MySQL 연결 성공\n');

    // 강정환 계정 확인
    const [employees] = await connection.execute(
      'SELECT name, canUploadExcel FROM employees WHERE name = ?',
      ['강정환']
    );

    if (employees.length === 0) {
      console.log('❌ "강정환" 직원을 찾을 수 없습니다.');
      console.log('현재 직원 목록:');
      const [allEmployees] = await connection.execute('SELECT name FROM employees ORDER BY name');
      allEmployees.forEach(emp => console.log(`  - ${emp.name}`));
      return;
    }

    // 업로드 권한 설정
    await connection.execute(
      'UPDATE employees SET canUploadExcel = TRUE WHERE name = ?',
      ['강정환']
    );

    console.log('✅ 강정환 계정에 엑셀 업로드 권한 부여 완료!\n');
    console.log('권한 정보:');
    console.log(`  이름: 강정환`);
    console.log(`  권한: canUploadExcel = TRUE`);
    console.log(`  기능: 엑셀 파일 업로드 및 일괄 업데이트 가능\n`);

  } catch (error) {
    console.error('❌ 권한 설정 실패:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 MySQL 연결 종료\n');
    }
  }
};

setUploadPermission();
