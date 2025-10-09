// ============================================
// MySQL 테이블 초기화 스크립트 (UUID 기반)
// ============================================
// 실행: node backend/scripts/init-db.js
// database_redesign 설계 기반으로 완전히 새로 작성
// ============================================

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend directory
dotenv.config({ path: path.join(__dirname, '../.env') });

const createTables = async () => {
  let connection;

  try {
    // MySQL 연결 (URL 파싱)
    // mysql://user:password@host:port/database 형식
    const urlString = process.env.DATABASE_URL;
    const match = urlString.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);

    if (!match) {
      throw new Error('DATABASE_URL 형식이 잘못되었습니다.');
    }

    const [, user, password, host, port, database] = match;
    const config = {
      host,
      port: parseInt(port),
      user,
      password,
      database
    };

    connection = await mysql.createConnection(config);
    console.log('🔌 MySQL 연결 성공\n');

    // ==========================================
    // 1. employees 테이블 생성 (FK 없음, 먼저 생성)
    // ==========================================
    console.log('1️⃣  employees 테이블 생성 중...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS employees (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE COMMENT '이름 (로그인 아이디로 사용)',
        email VARCHAR(200) UNIQUE COMMENT '이메일',
        password VARCHAR(255) NOT NULL COMMENT '비밀번호 (bcrypt 해시)',
        role1 VARCHAR(50) COMMENT '역할1 (영업담당 또는 관리자)',
        role2 VARCHAR(50) COMMENT '역할2 (있으면 두번째 역할)',
        department VARCHAR(100) COMMENT '부서',
        hireDate DATE COMMENT '입사일',
        phone VARCHAR(50) COMMENT '전화번호',
        status ENUM('재직', '휴직', '퇴사') DEFAULT '재직' COMMENT '재직상태',
        canUploadExcel BOOLEAN DEFAULT FALSE COMMENT '엑셀 업로드 권한 (강정환만 TRUE)',
        lastLogin TIMESTAMP NULL COMMENT '마지막 로그인',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_name (name),
        INDEX idx_role1 (role1),
        INDEX idx_role2 (role2),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('   ✅ employees 테이블 생성 완료 (13개 필드)\n');

    // ==========================================
    // 2. companies 테이블 생성
    // ==========================================
    console.log('2️⃣  companies 테이블 생성 중...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS companies (
        -- 기본 정보
        keyValue VARCHAR(100) PRIMARY KEY COMMENT '고유키 (UUID)',
        finalCompanyName VARCHAR(200) COMMENT '최종거래처명',
        isClosed ENUM('Y', 'N') DEFAULT 'N' COMMENT '폐업여부',
        ceoOrDentist VARCHAR(100) COMMENT '대표이사 또는 치과의사',
        customerRegion VARCHAR(100) COMMENT '고객사지역',
        businessStatus VARCHAR(50) COMMENT '거래상태 (활성/비활성/불용/추가확인)',
        department VARCHAR(100) COMMENT '담당부서',

        -- 자동 업데이트 필드 (실적보고서 승인 시)
        salesProduct TEXT COMMENT '판매제품 (자동)',

        -- 담당자
        internalManager VARCHAR(100) COMMENT '내부담당자',

        -- 평가
        jcwContribution ENUM('상', '중', '하') COMMENT '정철웅기여',
        companyContribution ENUM('상', '중', '하') COMMENT '회사기여',

        -- 재무 정보
        lastPaymentDate DATE COMMENT '마지막결제일 (자동)',
        lastPaymentAmount DECIMAL(15,2) DEFAULT 0 COMMENT '마지막총결제금액 (자동)',
        accountsReceivable DECIMAL(15,2) DEFAULT 0 COMMENT '매출채권잔액 (강정환만 수정)',
        accumulatedCollection DECIMAL(15,2) DEFAULT 0 COMMENT '누적수금금액 (자동)',
        accumulatedSales DECIMAL(15,2) DEFAULT 0 COMMENT '누적매출금액 (자동)',
        businessActivity TEXT COMMENT '영업활동(특이사항) (자동)',

        -- 시스템 필드
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        -- 인덱스
        INDEX idx_finalCompanyName (finalCompanyName),
        INDEX idx_internalManager (internalManager),
        INDEX idx_businessStatus (businessStatus),
        INDEX idx_customerRegion (customerRegion),
        INDEX idx_isClosed (isClosed)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('   ✅ companies 테이블 생성 완료 (19개 필드)\n');

    // ==========================================
    // 3. reports 테이블 생성 (실적보고서)
    // ==========================================
    console.log('3️⃣  reports 테이블 생성 중...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS reports (
        -- 기본 정보
        reportId VARCHAR(100) PRIMARY KEY COMMENT '보고서ID (UUID)',
        submittedBy VARCHAR(100) NOT NULL COMMENT '작성자명',
        submittedDate DATE NOT NULL COMMENT '제출일',
        companyId VARCHAR(100) NOT NULL COMMENT '거래처ID',
        reportType VARCHAR(100) COMMENT '보고서유형',

        -- 목표
        targetCollectionAmount DECIMAL(15,2) DEFAULT 0 COMMENT '목표수금금액',
        targetSalesAmount DECIMAL(15,2) DEFAULT 0 COMMENT '목표매출액',
        targetProducts VARCHAR(200) COMMENT '판매목표제품',
        activityNotes TEXT COMMENT '활동내역',

        -- 상태
        status ENUM('임시저장', '제출완료', '승인', '반려') DEFAULT '임시저장' COMMENT '상태',
        processedBy VARCHAR(100) COMMENT '처리자 (관리자)',
        processedDate TIMESTAMP NULL COMMENT '처리일',
        adminComment TEXT COMMENT '관리자코멘트',

        -- 시스템 필드
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        -- 외래키
        FOREIGN KEY (submittedBy) REFERENCES employees(name) ON UPDATE CASCADE ON DELETE RESTRICT,
        FOREIGN KEY (companyId) REFERENCES companies(keyValue) ON UPDATE CASCADE ON DELETE RESTRICT,
        FOREIGN KEY (processedBy) REFERENCES employees(name) ON UPDATE CASCADE ON DELETE SET NULL,

        -- 인덱스
        INDEX idx_submittedBy (submittedBy),
        INDEX idx_companyId (companyId),
        INDEX idx_status (status),
        INDEX idx_submittedDate (submittedDate),
        INDEX idx_processedBy (processedBy)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('   ✅ reports 테이블 생성 완료 (15개 필드)\n');

    // ==========================================
    // 4. change_history 테이블 생성
    // ==========================================
    console.log('4️⃣  change_history 테이블 생성 중...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS change_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tableName VARCHAR(50) NOT NULL COMMENT '테이블명',
        operation ENUM('INSERT', 'UPDATE', 'DELETE') NOT NULL COMMENT '작업유형',
        recordId VARCHAR(100) COMMENT '레코드ID',
        changedBy VARCHAR(100) NOT NULL COMMENT '변경자',
        oldData JSON COMMENT '변경 전 데이터',
        newData JSON COMMENT '변경 후 데이터',
        changedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '변경일시',
        ipAddress VARCHAR(50) COMMENT 'IP주소',
        userAgent TEXT COMMENT '사용자에이전트',
        INDEX idx_tableName (tableName),
        INDEX idx_changedAt (changedAt),
        INDEX idx_changedBy (changedBy),
        INDEX idx_recordId (recordId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('   ✅ change_history 테이블 생성 완료 (10개 필드)\n');

    // ==========================================
    // 5. backups 테이블 생성
    // ==========================================
    console.log('5️⃣  backups 테이블 생성 중...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS backups (
        id INT AUTO_INCREMENT PRIMARY KEY,
        backupName VARCHAR(200) NOT NULL COMMENT '백업명',
        backupType ENUM('수동', '자동', '시스템') DEFAULT '수동' COMMENT '백업유형',
        backupData LONGTEXT NOT NULL COMMENT '백업데이터 (JSON)',
        dataSize BIGINT COMMENT '백업크기 (바이트)',
        recordCount INT COMMENT '레코드수',
        createdBy VARCHAR(100) NOT NULL COMMENT '생성자',
        description TEXT COMMENT '설명',
        isRestored BOOLEAN DEFAULT FALSE COMMENT '복원여부',
        restoredAt TIMESTAMP NULL COMMENT '복원일시',
        restoredBy VARCHAR(100) COMMENT '복원자',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
        INDEX idx_createdAt (createdAt),
        INDEX idx_backupType (backupType),
        INDEX idx_isRestored (isRestored)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('   ✅ backups 테이블 생성 완료 (12개 필드)\n');

    // ==========================================
    // 결과 요약
    // ==========================================
    console.log('='.repeat(60));
    console.log('🎉 모든 테이블 생성 완료!');
    console.log('='.repeat(60));
    console.log('✅ employees 테이블        : 13개 필드');
    console.log('✅ companies 테이블        : 19개 필드 (UUID keyValue)');
    console.log('✅ reports 테이블          : 15개 필드 (실적보고서)');
    console.log('✅ change_history 테이블   : 10개 필드');
    console.log('✅ backups 테이블          : 12개 필드');
    console.log('='.repeat(60));
    console.log('\n💡 다음 단계:');
    console.log('   1. node backend/scripts/create-triggers.js (트리거 생성)');
    console.log('   2. node backend/scripts/parse-excel-to-json.js (엑셀 파싱)');
    console.log('   3. node backend/scripts/import-data.js (데이터 임포트)');
    console.log('   4. node backend/scripts/validate-data.js (데이터 검증)\n');

  } catch (error) {
    console.error('\n❌ 테이블 생성 중 오류 발생:');
    console.error('오류 메시지:', error.message);
    console.error('오류 코드:', error.code);
    if (error.sql) {
      console.error('SQL:', error.sql);
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 MySQL 연결 종료\n');
    }
  }
};

// 스크립트 실행
createTables();
