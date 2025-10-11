// ============================================
// 관리자 전용 라우트
// ============================================

import express from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import {
  resetAllPasswords,
  fixCompanyColumns,
  saveBackupHistory,
  getBackupHistory,
  deleteBackupHistory,
  saveSecurityLog,
  getSecurityLogs
} from '../controllers/admin.controller.js';

const router = express.Router();
const execPromise = promisify(exec);

// POST /api/admin/reset-passwords - 모든 비밀번호 리셋
router.post('/reset-passwords', resetAllPasswords);

// POST /api/admin/migrate/fix-company-columns - Companies 테이블 컬럼명 영문 변경
router.post('/migrate/fix-company-columns', fixCompanyColumns);

// 백업 이력 관리
router.post('/backup-history', saveBackupHistory);
router.get('/backup-history', getBackupHistory);
router.delete('/backup-history/:id', deleteBackupHistory);

// 보안 로그 관리
router.post('/security-logs', saveSecurityLog);
router.get('/security-logs', getSecurityLogs);

// ==========================================
// POST /api/admin/migrate/backup-tables - 백업 및 보안 로그 테이블 생성
// ==========================================
router.post('/migrate/backup-tables', async (req, res) => {
  try {
    console.log('🚀 백업/보안 로그 테이블 마이그레이션 시작...');

    const { getDB } = await import('../config/database.js');
    const db = await getDB();

    const results = [];

    // backupHistory 테이블 생성
    try {
      console.log('📋 backupHistory 테이블 생성 중...');
      await db.execute(`
        CREATE TABLE IF NOT EXISTS backupHistory (
          id INT AUTO_INCREMENT PRIMARY KEY COMMENT '백업 이력 ID',
          backupType VARCHAR(50) NOT NULL COMMENT '백업 타입 (settings, full_backup)',
          backupBy VARCHAR(100) NOT NULL COMMENT '백업 실행자',
          backupAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '백업 일시',
          format VARCHAR(20) DEFAULT 'excel' COMMENT '백업 형식 (excel, json, csv)',
          memo TEXT COMMENT '백업 메모',
          selectedSheets JSON COMMENT '선택된 시트 정보',
          metadata JSON COMMENT '추가 메타데이터',
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
          INDEX idx_backup_type (backupType),
          INDEX idx_backup_by (backupBy),
          INDEX idx_backup_at (backupAt)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='백업 이력 테이블'
      `);
      results.push({ table: 'backupHistory', status: 'success', message: '테이블 생성 완료' });
      console.log('✅ backupHistory 테이블 생성 완료');
    } catch (error) {
      if (error.code === 'ER_TABLE_EXISTS_ERROR') {
        results.push({ table: 'backupHistory', status: 'skipped', message: '이미 존재함' });
        console.log('⚠️  backupHistory 테이블이 이미 존재합니다');
      } else {
        throw error;
      }
    }

    // securityLogs 테이블 생성
    try {
      console.log('📋 securityLogs 테이블 생성 중...');
      await db.execute(`
        CREATE TABLE IF NOT EXISTS securityLogs (
          id INT AUTO_INCREMENT PRIMARY KEY COMMENT '보안 로그 ID',
          eventType VARCHAR(50) NOT NULL COMMENT '이벤트 타입',
          userId VARCHAR(100) COMMENT '사용자 ID',
          username VARCHAR(100) COMMENT '사용자명',
          data JSON COMMENT '이벤트 데이터',
          fingerprint VARCHAR(50) COMMENT '디바이스 핑거프린트',
          ipAddress VARCHAR(45) COMMENT 'IP 주소',
          userAgent TEXT COMMENT 'User-Agent',
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
          INDEX idx_event_type (eventType),
          INDEX idx_user_id (userId),
          INDEX idx_created_at (createdAt)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='보안 로그 테이블'
      `);
      results.push({ table: 'securityLogs', status: 'success', message: '테이블 생성 완료' });
      console.log('✅ securityLogs 테이블 생성 완료');
    } catch (error) {
      if (error.code === 'ER_TABLE_EXISTS_ERROR') {
        results.push({ table: 'securityLogs', status: 'skipped', message: '이미 존재함' });
        console.log('⚠️  securityLogs 테이블이 이미 존재합니다');
      } else {
        throw error;
      }
    }

    console.log('✅ 마이그레이션 완료');

    res.json({
      success: true,
      message: '백업/보안 로그 테이블 마이그레이션 완료',
      results: results
    });

  } catch (error) {
    console.error('❌ 마이그레이션 실패:', error);
    res.status(500).json({
      success: false,
      message: '마이그레이션 실패',
      error: error.message
    });
  }
});

// ==========================================
// POST /api/admin/migrate - 실적보고서 마이그레이션 실행
// ==========================================
router.post('/migrate', async (req, res) => {
  try {
    console.log('🚀 실적보고서 마이그레이션 시작...');
    console.log('Current working directory:', process.cwd());

    // Railway 환경에서 마이그레이션 실행 (직접 node 명령 실행)
    // Railway: /app/backend에서 실행 → backend/migrations/run_all_migrations.js
    const { stdout, stderr } = await execPromise('cd backend 2>/dev/null || true && node migrations/run_all_migrations.js', {
      cwd: process.cwd(),
      timeout: 120000, // 2분 타임아웃
      shell: '/bin/bash'
    });

    console.log('✅ 마이그레이션 완료');
    console.log(stdout);

    res.json({
      success: true,
      message: '실적보고서 마이그레이션 완료',
      output: stdout,
      errors: stderr || null
    });

  } catch (error) {
    console.error('❌ 마이그레이션 실패:', error);

    res.status(500).json({
      success: false,
      message: '마이그레이션 실패',
      error: error.message,
      output: error.stdout || null,
      errors: error.stderr || null
    });
  }
});

// ==========================================
// GET /api/admin/db-status - DB 상태 확인
// ==========================================
router.get('/db-status', async (req, res) => {
  try {
    const { getDB } = await import('../config/database.js');
    const connection = await getDB();

    // 테이블 목록 조회
    const [tables] = await connection.query('SHOW TABLES');

    // 실적보고서 관련 테이블 확인
    const reportTables = ['employees', 'reports', 'companyGoals', 'changeHistory'];
    const tableStatus = {};

    for (const tableName of reportTables) {
      try {
        const [rows] = await connection.query(`SELECT COUNT(*) as count FROM ${tableName}`);
        tableStatus[tableName] = {
          exists: true,
          count: rows[0].count
        };
      } catch (error) {
        tableStatus[tableName] = {
          exists: false,
          count: 0
        };
      }
    }

    res.json({
      success: true,
      totalTables: tables.length,
      allTables: tables.map(t => Object.values(t)[0]),
      reportSystemTables: tableStatus
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'DB 상태 확인 실패',
      error: error.message
    });
  }
});

export default router;
