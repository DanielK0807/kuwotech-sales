// ============================================
// 인증 컨트롤러
// ============================================

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getDB } from '../config/database.js';

// JWT 토큰 생성
const generateToken = (employee) => {
  return jwt.sign(
    {
      name: employee.name,
      role: employee.selectedRole, // 로그인 시 선택한 역할
      canUploadExcel: employee.canUploadExcel
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );
};

// POST /api/auth/login
export const login = async (req, res) => {
  try {
    const { name, password, selectedRole } = req.body;
    console.log('🔐 로그인 시도:', { name, selectedRole });

    // 입력 검증
    if (!name || !password || !selectedRole) {
      console.log('❌ 입력 검증 실패');
      return res.status(400).json({
        error: 'Bad Request',
        message: '이름, 비밀번호, 선택한 역할이 필요합니다.'
      });
    }

    const db = await getDB();
    console.log('✅ DB 연결 획득');

    // 직원 조회
    const [employees] = await db.execute(
      'SELECT * FROM employees WHERE name = ?',
      [name]
    );
    console.log(`📊 조회 결과: ${employees.length}명 발견`);

    if (employees.length === 0) {
      console.log('❌ 사용자 없음');
      return res.status(401).json({
        error: 'Unauthorized',
        message: '존재하지 않는 사용자입니다.'
      });
    }

    const employee = employees[0];

    // 퇴사 직원 체크
    if (employee.status === '퇴사' || employee.status === 'inactive') {
      console.log('❌ 퇴사한 직원 로그인 시도:', name);
      return res.status(403).json({
        error: 'Forbidden',
        message: '퇴사한 직원은 로그인할 수 없습니다.'
      });
    }

    // 비밀번호 검증
    const isPasswordValid = await bcrypt.compare(password, employee.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: '비밀번호가 일치하지 않습니다.'
      });
    }

    // 역할 검증
    const availableRoles = [employee.role1, employee.role2].filter(Boolean);

    if (!availableRoles.includes(selectedRole)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `잘못된 역할 선택입니다. 가능한 역할: ${availableRoles.join(', ')}`,
        availableRoles: availableRoles
      });
    }

    // 🔒 중복 로그인 체크: 활성 세션이 있는지 확인 (24시간 이내)
    const [activeSessions] = await db.execute(
      `SELECT id, loginTime, ipAddress, userAgent
       FROM access_logs
       WHERE userName = ?
         AND userRole = ?
         AND logoutTime IS NULL
         AND loginTime > NOW() - INTERVAL 24 HOUR
       ORDER BY loginTime DESC
       LIMIT 1`,
      [name, selectedRole]
    );

    if (activeSessions.length > 0) {
      const activeSession = activeSessions[0];
      console.log(`⚠️ 중복 로그인 시도 감지: ${name} (${selectedRole})`);

      return res.status(409).json({
        error: 'Conflict',
        message: '이미 다른 곳에서 로그인되어 있습니다.',
        duplicateSession: true,
        activeSessionInfo: {
          loginTime: activeSession.loginTime,
          ipAddress: activeSession.ipAddress,
          userAgent: activeSession.userAgent
        }
      });
    }

    // 24시간 이상 된 활성 세션 자동 만료 처리
    await db.execute(
      `UPDATE access_logs
       SET logoutTime = NOW(),
           sessionDuration = TIMESTAMPDIFF(SECOND, loginTime, NOW())
       WHERE userName = ?
         AND userRole = ?
         AND logoutTime IS NULL
         AND loginTime <= NOW() - INTERVAL 24 HOUR`,
      [name, selectedRole]
    );

    // 마지막 로그인 업데이트
    await db.execute(
      'UPDATE employees SET lastLogin = NOW() WHERE name = ?',
      [name]
    );

    // 📊 웹사용기록: access_logs 테이블에 로그인 기록 추가
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || 'Unknown';

    const [accessLogResult] = await db.execute(
      `INSERT INTO access_logs (userId, userName, userRole, loginTime, ipAddress, userAgent)
       VALUES (?, ?, ?, NOW(), ?, ?)`,
      [employee.id, employee.name, selectedRole, ipAddress, userAgent]
    );

    const accessLogId = accessLogResult.insertId;
    console.log(`📝 접속 로그 기록 완료: ID ${accessLogId}`);

    // JWT 토큰 생성
    const token = generateToken({
      ...employee,
      selectedRole
    });

    // 응답
    res.json({
      success: true,
      message: '로그인 성공',
      token,
      accessLogId, // 로그아웃 시 사용할 접속 로그 ID
      user: {
        id: employee.id, // ✅ FIX: id 필드 추가 (goals API에서 사용)
        name: employee.name,
        email: employee.email,
        role: selectedRole,
        role1: employee.role1,
        role2: employee.role2,
        department: employee.department,
        canUploadExcel: employee.canUploadExcel
      }
    });

  } catch (error) {
    console.error('로그인 오류:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '로그인 처리 중 오류가 발생했습니다.'
    });
  }
};

// POST /api/auth/logout
export const logout = async (req, res) => {
  try {
    const { accessLogId } = req.body;

    // 📊 웹사용기록: accessLogId가 있으면 로그아웃 시간과 세션 시간 기록
    if (accessLogId) {
      const db = await getDB();

      await db.execute(
        `UPDATE access_logs
         SET logoutTime = NOW(),
             sessionDuration = TIMESTAMPDIFF(SECOND, loginTime, NOW())
         WHERE id = ?`,
        [accessLogId]
      );

      console.log(`📝 로그아웃 기록 완료: ID ${accessLogId}`);
    }

    // JWT는 stateless이므로 클라이언트에서 토큰 삭제
    res.json({
      success: true,
      message: '로그아웃 성공'
    });

  } catch (error) {
    console.error('로그아웃 오류:', error);
    // 로그아웃은 실패해도 클라이언트가 진행할 수 있도록 200 응답
    res.json({
      success: true,
      message: '로그아웃 성공'
    });
  }
};

// GET /api/auth/me
export const getCurrentUser = async (req, res) => {
  try {
    const db = await getDB();

    const [employees] = await db.execute(
      'SELECT name, email, role1, role2, department, hireDate, phone, status, canUploadExcel, lastLogin FROM employees WHERE name = ?',
      [req.user.name]
    );

    if (employees.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: '사용자를 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      user: {
        ...employees[0],
        currentRole: req.user.role // JWT에서 가져온 현재 선택된 역할
      }
    });

  } catch (error) {
    console.error('사용자 정보 조회 오류:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '사용자 정보 조회 중 오류가 발생했습니다.'
    });
  }
};

// POST /api/auth/force-login - 기존 세션 강제 종료 후 로그인
export const forceLogin = async (req, res) => {
  try {
    const { name, password, selectedRole } = req.body;
    console.log('🔐 강제 로그인 시도:', { name, selectedRole });

    // 입력 검증
    if (!name || !password || !selectedRole) {
      return res.status(400).json({
        error: 'Bad Request',
        message: '이름, 비밀번호, 선택한 역할이 필요합니다.'
      });
    }

    const db = await getDB();

    // 직원 조회
    const [employees] = await db.execute(
      'SELECT * FROM employees WHERE name = ?',
      [name]
    );

    if (employees.length === 0) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: '존재하지 않는 사용자입니다.'
      });
    }

    const employee = employees[0];

    // 퇴사 직원 체크
    if (employee.status === '퇴사' || employee.status === 'inactive') {
      return res.status(403).json({
        error: 'Forbidden',
        message: '퇴사한 직원은 로그인할 수 없습니다.'
      });
    }

    // 비밀번호 검증
    const isPasswordValid = await bcrypt.compare(password, employee.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: '비밀번호가 일치하지 않습니다.'
      });
    }

    // 역할 검증
    const availableRoles = [employee.role1, employee.role2].filter(Boolean);
    if (!availableRoles.includes(selectedRole)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `잘못된 역할 선택입니다. 가능한 역할: ${availableRoles.join(', ')}`,
        availableRoles: availableRoles
      });
    }

    // 🔒 기존 활성 세션 모두 강제 종료
    const [result] = await db.execute(
      `UPDATE access_logs
       SET logoutTime = NOW(),
           sessionDuration = TIMESTAMPDIFF(SECOND, loginTime, NOW())
       WHERE userName = ?
         AND userRole = ?
         AND logoutTime IS NULL`,
      [name, selectedRole]
    );

    console.log(`🔓 기존 활성 세션 ${result.affectedRows}개 강제 종료됨`);

    // 마지막 로그인 업데이트
    await db.execute(
      'UPDATE employees SET lastLogin = NOW() WHERE name = ?',
      [name]
    );

    // 📊 새로운 접속 로그 기록
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || 'Unknown';

    const [accessLogResult] = await db.execute(
      `INSERT INTO access_logs (userId, userName, userRole, loginTime, ipAddress, userAgent)
       VALUES (?, ?, ?, NOW(), ?, ?)`,
      [employee.id, employee.name, selectedRole, ipAddress, userAgent]
    );

    const accessLogId = accessLogResult.insertId;
    console.log(`📝 새로운 접속 로그 기록 완료: ID ${accessLogId}`);

    // JWT 토큰 생성
    const token = generateToken({
      ...employee,
      selectedRole
    });

    // 응답
    res.json({
      success: true,
      message: '로그인 성공 (기존 세션 종료됨)',
      token,
      accessLogId,
      user: {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        role: selectedRole,
        role1: employee.role1,
        role2: employee.role2,
        department: employee.department,
        canUploadExcel: employee.canUploadExcel
      }
    });

  } catch (error) {
    console.error('강제 로그인 오류:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '로그인 처리 중 오류가 발생했습니다.'
    });
  }
};

// GET /api/auth/employees-by-role/:role - 역할별 직원 목록 조회
export const getEmployeesByRole = async (req, res) => {
  try {
    const { role } = req.params;
    console.log('👥 역할별 직원 조회:', role);

    // 역할 유효성 검증
    if (!role || (role !== '영업담당' && role !== '관리자')) {
      return res.status(400).json({
        error: 'Bad Request',
        message: '유효하지 않은 역할입니다. (영업담당 또는 관리자)'
      });
    }

    const db = await getDB();

    // role1 또는 role2가 일치하는 직원 조회
    const [employees] = await db.execute(
      'SELECT name, department, canUploadExcel FROM employees WHERE (role1 = ? OR role2 = ?) ORDER BY department, name',
      [role, role]
    );

    console.log(`📊 재직 중인 ${role} 직원: ${employees.length}명 발견`);

    // 데이터 포맷팅: "홈길동 (광주지사)" 형식
    const formattedEmployees = employees.map(emp => ({
      name: emp.name,
      department: emp.department,
      displayName: emp.department ? `${emp.name} (${emp.department})` : emp.name,
      canUploadExcel: emp.canUploadExcel
    }));

    res.json({
      success: true,
      data: {
        role: role,
        count: formattedEmployees.length,
        employees: formattedEmployees
      }
    });

  } catch (error) {
    console.error('❌ 역할별 직원 조회 오류:', error);
    console.error('Error stack:', error.stack);
    console.error('Error message:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '직원 목록 조회 중 오류가 발생했습니다.',
      debug: {
        message: error.message,
        code: error.code
      }
    });
  }
};
