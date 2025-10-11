// ============================================
// 직원 컨트롤러
// ============================================

import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../config/database.js';

// GET /api/employees - 전체 직원 조회
export const getAllEmployees = async (req, res) => {
  try {
    const db = await getDB();

    // 관리자는 모든 직원 조회, 영업담당은 영업담당만 조회
    const userRole = req.user?.role || req.user?.role1;

    let query = `
      SELECT
        id, name, email, role1, role2, department, hireDate,
        phone, status, canUploadExcel, lastLogin
      FROM employees
    `;

    const conditions = [];

    // 영업담당이 아닌 경우 모든 직원 조회
    if (userRole !== '영업담당') {
      // 관리자는 모든 직원 조회 (재직/퇴사 모두)
    } else {
      // 영업담당은 영업담당만 조회
      conditions.push(`(role1 = '영업담당' OR role2 = '영업담당')`);
      conditions.push(`status = '재직'`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY hireDate ASC';

    const [employees] = await db.execute(query);

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
    const { name, email, phone, department, role1, role2, status, hireDate } = req.body;

    console.log('[직원 정보 수정] 요청:', { id, name, email, phone, department, role1, status });

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

    const currentEmployee = employees[0];

    // 이름이 변경되는 경우, 중복 체크 (현재 직원 제외)
    if (name !== undefined && name !== currentEmployee.name) {
      const [duplicateCheck] = await db.execute(
        'SELECT id FROM employees WHERE name = ? AND id != ?',
        [name, id]
      );

      if (duplicateCheck.length > 0) {
        return res.status(409).json({
          error: 'Conflict',
          message: `이미 "${name}" 이름의 다른 직원이 존재합니다.`
        });
      }
    }

    // 업데이트할 필드들을 동적으로 구성
    const updates = [];
    const values = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (email !== undefined) {
      updates.push('email = ?');
      values.push(email);
    }
    if (phone !== undefined) {
      updates.push('phone = ?');
      values.push(phone);
    }
    if (department !== undefined) {
      updates.push('department = ?');
      values.push(department);
    }
    if (role1 !== undefined) {
      updates.push('role1 = ?');
      values.push(role1);
    }
    if (role2 !== undefined) {
      updates.push('role2 = ?');
      values.push(role2);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      values.push(status);
    }
    if (hireDate !== undefined) {
      updates.push('hireDate = ?');
      values.push(hireDate);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: '업데이트할 필드가 없습니다.'
      });
    }

    values.push(id);

    // 정보 업데이트
    await db.execute(
      `UPDATE employees SET ${updates.join(', ')} WHERE id = ?`,
      values
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

// POST /api/employees - 직원 추가
export const createEmployee = async (req, res) => {
  try {
    const { name, email, role1, role2, department, phone, hireDate, status } = req.body;

    console.log('[직원 추가] 요청:', { name, email, role1, department });

    // 필수 필드 검증
    if (!name || !role1) {
      return res.status(400).json({
        error: 'Bad Request',
        message: '이름과 역할은 필수 항목입니다.'
      });
    }

    const db = await getDB();

    // 중복 체크 - 같은 이름의 직원이 이미 존재하는지 확인
    const [existingEmployees] = await db.execute(
      'SELECT id, name FROM employees WHERE name = ?',
      [name]
    );

    if (existingEmployees.length > 0) {
      console.log('[직원 추가] 중복된 이름:', name);
      return res.status(409).json({
        error: 'Conflict',
        message: `이미 "${name}" 이름의 직원이 존재합니다.`
      });
    }

    const employeeId = uuidv4();

    // 기본 비밀번호 생성 (이름 + 0000)
    const defaultPassword = await bcrypt.hash(`${name}0000`, 10);

    // 직원 추가
    await db.execute(
      `INSERT INTO employees
       (id, name, email, role1, role2, department, phone, hireDate, status, password, canUploadExcel)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        employeeId,
        name,
        email || null,
        role1,
        role2 || null,
        department || null,
        phone || null,
        hireDate || new Date().toISOString().split('T')[0],
        status || '재직',
        defaultPassword,
        0
      ]
    );

    console.log('[직원 추가] 성공:', name);

    res.json({
      success: true,
      message: '직원이 성공적으로 추가되었습니다.',
      employee: {
        id: employeeId,
        name,
        email,
        role1,
        role2,
        department,
        phone,
        hireDate,
        status: status || '재직'
      }
    });

  } catch (error) {
    console.error('[직원 추가] 오류:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '직원 추가 중 오류가 발생했습니다.'
    });
  }
};

// DELETE /api/employees/:id - 직원 삭제
export const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('[직원 삭제] 요청:', { id });

    const db = await getDB();

    // 직원 존재 여부 확인
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

    const employeeName = employees[0].name;

    // 직원 삭제
    await db.execute('DELETE FROM employees WHERE id = ?', [id]);

    console.log('[직원 삭제] 성공:', employeeName);

    res.json({
      success: true,
      message: '직원이 성공적으로 삭제되었습니다.'
    });

  } catch (error) {
    console.error('[직원 삭제] 오류:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '직원 삭제 중 오류가 발생했습니다.'
    });
  }
};

// GET /api/employees/statistics - 직원 통계 조회
export const getEmployeeStatistics = async (req, res) => {
  try {
    const db = await getDB();

    console.log('[직원 통계] 조회 시작');

    // 전체 직원 수
    const [totalResult] = await db.execute(
      'SELECT COUNT(*) as count FROM employees'
    );
    const totalEmployees = totalResult[0].count;

    // 영업담당 수 (role1 또는 role2에 '영업' 포함)
    const [salesResult] = await db.execute(`
      SELECT COUNT(*) as count FROM employees
      WHERE role1 LIKE '%영업%' OR role2 LIKE '%영업%' OR department LIKE '%영업%'
    `);
    const salesEmployees = salesResult[0].count;

    // 관리자 수 (role1 또는 role2가 '관리자')
    const [adminResult] = await db.execute(`
      SELECT COUNT(*) as count FROM employees
      WHERE role1 = '관리자' OR role2 = '관리자'
         OR department LIKE '%관리%' OR department = '경영지원팀'
    `);
    const adminEmployees = adminResult[0].count;

    // 재직 중인 직원 수
    const [activeResult] = await db.execute(`
      SELECT COUNT(*) as count FROM employees
      WHERE status = '재직' OR status = 'active'
    `);
    const activeEmployees = activeResult[0].count;

    console.log('[직원 통계] 조회 완료:', {
      totalEmployees,
      salesEmployees,
      adminEmployees,
      activeEmployees
    });

    res.json({
      success: true,
      statistics: {
        totalEmployees,
        salesEmployees,
        adminEmployees,
        activeEmployees
      }
    });

  } catch (error) {
    console.error('[직원 통계] 조회 오류:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '직원 통계 조회 중 오류가 발생했습니다.'
    });
  }
};
