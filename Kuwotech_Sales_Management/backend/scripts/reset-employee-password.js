// ============================================
// 특정 직원 비밀번호 초기화 스크립트
// 사용법: node scripts/reset-employee-password.js "직원이름" [새비밀번호]
// 예: node scripts/reset-employee-password.js "이미정" "이미정0000"
// ============================================

import bcrypt from 'bcrypt';
import { getDB } from '../config/database.js';
import 'dotenv/config';

async function resetEmployeePassword() {
    const employeeName = process.argv[2];
    const newPassword = process.argv[3];

    if (!employeeName) {
        console.error('❌ 사용법: node scripts/reset-employee-password.js "직원이름" [새비밀번호]');
        console.error('   예제: node scripts/reset-employee-password.js "이미정"');
        console.error('   예제: node scripts/reset-employee-password.js "이미정" "이미정0000"');
        process.exit(1);
    }

    try {
        const db = await getDB();

        // 직원 확인
        const [employees] = await db.execute(
            'SELECT id, name FROM employees WHERE name = ?',
            [employeeName]
        );

        if (employees.length === 0) {
            console.error(`❌ "${employeeName}" 직원을 찾을 수 없습니다.`);
            process.exit(1);
        }

        const employee = employees[0];

        // 새 비밀번호 결정 (입력 없으면 "이름0000")
        const password = newPassword || `${employeeName}0000`;

        // 비밀번호 해싱
        const hashedPassword = await bcrypt.hash(password, 10);

        // 비밀번호 업데이트
        await db.execute(
            'UPDATE employees SET password = ? WHERE id = ?',
            [hashedPassword, employee.id]
        );

        console.log(`✅ "${employeeName}" 비밀번호가 "${password}"로 초기화되었습니다.`);
        console.log(`   로그인 시 이 비밀번호를 사용하세요.`);

        await db.end();
        process.exit(0);

    } catch (error) {
        console.error('❌ 비밀번호 초기화 실패:', error.message);
        process.exit(1);
    }
}

resetEmployeePassword();
