// ============================================
// 직원 컨트롤러
// ============================================

import bcrypt from 'bcrypt';
import { getDB } from '../config/database.js';

// GET /api/employees - 전체 직원 조회 (영업담당 역할이 있는 직원만)
export const getAllEmployees = async (req, res) => {
  try {
    const db = await getDB();

    const [employees] = await db.execute(`
      SELECT
        id, name, email, role1, role2, department, hireDate,
        phone, status, canUploadExcel, lastLogin
      FROM employees
      WHERE status = '재직'
        AND (role1 = '영업담당' OR role2 = '영업담당')
      ORDER BY hireDate ASC
    `);

    res.json({
      success: true,
      count: employees.length,
      employees
    });

  } catch (error) {
    console.error('직원 목록 조회 오류:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '직원 목록 조회 중 오류가 발생했습니다.'
    });
  }
};

// GET /api/employees/:name - 특정 직원 조회
export const getEmployeeByName = async (req, res) => {
  try {
    const { name } = req.params;
    const db = await getDB();

    const [employees] = await db.execute(`
      SELECT
        id, name, email, role1, role2, department, hireDate,
        phone, status, canUploadExcel, lastLogin
      FROM employees
      WHERE name = ?
    `, [name]);

    if (employees.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: '직원을 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      employee: employees[0]
    });

  } catch (error) {
    console.error('직원 조회 오류:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '직원 조회 중 오류가 발생했습니다.'
    });
  }
};

// PUT /api/employees/:id - 직원 정보 수정
export const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, phone, department, role } = req.body;

    console.log('[직원 정보 수정] 요청:', { id, email, phone, department, role });

    // 인증된 사용자가 본인의 정보만 수정할 수 있도록 검증
    const db = await getDB();
    const [employees] = await db.execute(
      'SELECT id, name FROM employees WHERE id = ?',
      [id]
    );

    if (employees.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: '직원을 찾을 수 없습니다.'
      });
    }

    // 정보 업데이트 (role은 role2에 저장)
    await db.execute(
      `UPDATE employees
       SET email = ?, phone = ?, department = ?, role2 = ?
       WHERE id = ?`,
      [email, phone, department, role, id]
    );

    console.log('[직원 정보 수정] 성공');

    res.json({
      success: true,
      message: '직원 정보가 성공적으로 수정되었습니다.'
    });

  } catch (error) {
    console.error('[직원 정보 수정] 오류:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '직원 정보 수정 중 오류가 발생했습니다.'
    });
  }
};

// PUT /api/employees/:id/password - 비밀번호 변경
export const updatePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    console.log('[비밀번호 변경] 요청:', { id });

    // 입력 검증
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Bad Request',
        message: '현재 비밀번호와 새 비밀번호가 필요합니다.'
      });
    }

    const db = await getDB();

    // 직원 조회 (비밀번호 포함)
    const [employees] = await db.execute(
      'SELECT id, name, password FROM employees WHERE id = ?',
      [id]
    );

    if (employees.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: '직원을 찾을 수 없습니다.'
      });
    }

    const employee = employees[0];

    // 현재 비밀번호 검증
    const isPasswordValid = await bcrypt.compare(currentPassword, employee.password);
    if (!isPasswordValid) {
      console.log('[비밀번호 변경] 현재 비밀번호 불일치');
      return res.status(401).json({
        error: 'Unauthorized',
        message: '현재 비밀번호가 일치하지 않습니다.'
      });
    }

    // 새 비밀번호 해싱 (보안 강도 10)
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 비밀번호 업데이트
    await db.execute(
      'UPDATE employees SET password = ? WHERE id = ?',
      [hashedPassword, id]
    );

    console.log('[비밀번호 변경] 성공:', employee.name);

    res.json({
      success: true,
      message: '비밀번호가 성공적으로 변경되었습니다.'
    });

  } catch (error) {
    console.error('[비밀번호 변경] 오류:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '비밀번호 변경 중 오류가 발생했습니다.'
    });
  }
};
