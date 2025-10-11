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

// ============================================
// 백업 이력 관리
// ============================================

// POST /api/admin/backup-history
// 백업 이력 저장
export const saveBackupHistory = async (req, res) => {
  try {
    const { backupType, backupBy, format, memo, selectedSheets, metadata } = req.body;

    // 필수 필드 검증
    if (!backupType || !backupBy) {
      return res.status(400).json({
        success: false,
        message: 'backupType과 backupBy는 필수입니다.'
      });
    }

    const db = await getDB();

    const [result] = await db.execute(
      `INSERT INTO backupHistory (backupType, backupBy, format, memo, selectedSheets, metadata)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        backupType,
        backupBy,
        format || 'excel',
        memo || null,
        selectedSheets ? JSON.stringify(selectedSheets) : null,
        metadata ? JSON.stringify(metadata) : null
      ]
    );

    res.json({
      success: true,
      message: '백업 이력이 저장되었습니다.',
      id: result.insertId
    });

  } catch (error) {
    console.error('❌ 백업 이력 저장 에러:', error);
    res.status(500).json({
      success: false,
      message: '백업 이력 저장 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};

// GET /api/admin/backup-history
// 백업 이력 조회
export const getBackupHistory = async (req, res) => {
  try {
    const { backupType, limit = 20 } = req.query;

    const db = await getDB();

    let query = 'SELECT * FROM backupHistory';
    const params = [];

    if (backupType) {
      query += ' WHERE backupType = ?';
      params.push(backupType);
    }

    query += ' ORDER BY backupAt DESC LIMIT ?';
    params.push(parseInt(limit));

    const [rows] = await db.execute(query, params);

    // JSON 파싱
    const history = rows.map(row => ({
      ...row,
      selectedSheets: row.selectedSheets ? JSON.parse(row.selectedSheets) : null,
      metadata: row.metadata ? JSON.parse(row.metadata) : null
    }));

    res.json({
      success: true,
      history: history
    });

  } catch (error) {
    console.error('❌ 백업 이력 조회 에러:', error);
    res.status(500).json({
      success: false,
      message: '백업 이력 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};

// DELETE /api/admin/backup-history/:id
// 백업 이력 삭제
export const deleteBackupHistory = async (req, res) => {
  try {
    const { id } = req.params;

    const db = await getDB();

    const [result] = await db.execute(
      'DELETE FROM backupHistory WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: '해당 백업 이력을 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      message: '백업 이력이 삭제되었습니다.'
    });

  } catch (error) {
    console.error('❌ 백업 이력 삭제 에러:', error);
    res.status(500).json({
      success: false,
      message: '백업 이력 삭제 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};

// ============================================
// 보안 로그 관리
// ============================================

// POST /api/admin/security-logs
// 보안 로그 저장
export const saveSecurityLog = async (req, res) => {
  try {
    const { eventType, userId, username, data, fingerprint } = req.body;

    // 필수 필드 검증
    if (!eventType) {
      return res.status(400).json({
        success: false,
        message: 'eventType은 필수입니다.'
      });
    }

    const db = await getDB();

    // 클라이언트 정보 추출
    const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const [result] = await db.execute(
      `INSERT INTO securityLogs (eventType, userId, username, data, fingerprint, ipAddress, userAgent)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        eventType,
        userId || null,
        username || null,
        data ? JSON.stringify(data) : null,
        fingerprint || null,
        ipAddress || null,
        userAgent || null
      ]
    );

    res.json({
      success: true,
      message: '보안 로그가 저장되었습니다.',
      id: result.insertId
    });

  } catch (error) {
    console.error('❌ 보안 로그 저장 에러:', error);
    res.status(500).json({
      success: false,
      message: '보안 로그 저장 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};

// GET /api/admin/security-logs
// 보안 로그 조회
export const getSecurityLogs = async (req, res) => {
  try {
    const { eventType, userId, limit = 100, offset = 0 } = req.query;

    const db = await getDB();

    let query = 'SELECT * FROM securityLogs WHERE 1=1';
    const params = [];

    if (eventType) {
      query += ' AND eventType = ?';
      params.push(eventType);
    }

    if (userId) {
      query += ' AND userId = ?';
      params.push(userId);
    }

    query += ' ORDER BY createdAt DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [rows] = await db.execute(query, params);

    // JSON 파싱
    const logs = rows.map(row => ({
      ...row,
      data: row.data ? JSON.parse(row.data) : null
    }));

    res.json({
      success: true,
      logs: logs,
      count: logs.length
    });

  } catch (error) {
    console.error('❌ 보안 로그 조회 에러:', error);
    res.status(500).json({
      success: false,
      message: '보안 로그 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};
