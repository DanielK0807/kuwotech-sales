// ============================================
// 데이터베이스 자동 초기화 모듈
// ============================================
// 서버 시작 시 자동으로 테이블 생성 및 초기 데이터 삽입
// 안전하고 효율적인 방식으로 구현
// ============================================

import mysql from 'mysql2/promise';
import xlsx from 'xlsx';
import bcrypt from 'bcrypt';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==========================================
// 테이블 존재 여부 확인
// ==========================================
const checkTableExists = async (connection, tableName) => {
  try {
    const [rows] = await connection.execute(
      `SELECT COUNT(*) as count FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
      [tableName]
    );
    return rows[0].count > 0;
  } catch (error) {
    console.error(`❌ 테이블 존재 여부 확인 실패 (${tableName}):`, error.message);
    return false;
  }
};

// ==========================================
// 1. employees 테이블 생성
// ==========================================
const createEmployeesTable = async (connection) => {
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS employees (
      id VARCHAR(36) PRIMARY KEY COMMENT '직원 UUID (영구 추적용)',
      name VARCHAR(100) NOT NULL UNIQUE COMMENT '이름 (로그인 아이디)',
      email VARCHAR(200) UNIQUE COMMENT '이메일',
      password VARCHAR(255) NOT NULL COMMENT '비밀번호 (bcrypt 해시)',
      role1 VARCHAR(50) COMMENT '역할1 (영업담당/관리자)',
      role2 VARCHAR(50) COMMENT '역할2',
      department VARCHAR(100) COMMENT '부서',
      hireDate DATE NOT NULL COMMENT '입사일 (현재월수 계산용)',
      phone VARCHAR(50) COMMENT '전화번호',
      status ENUM('재직', '휴직', '퇴사') DEFAULT '재직' COMMENT '재직상태',
      canUploadExcel BOOLEAN DEFAULT FALSE COMMENT '엑셀 업로드 권한',
      lastLogin TIMESTAMP NULL COMMENT '마지막 로그인',
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_name (name),
      INDEX idx_role1 (role1),
      INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
};

// ==========================================
// 2. products 테이블 생성
// ==========================================
const createProductsTable = async (connection) => {
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      productName VARCHAR(100) NOT NULL UNIQUE COMMENT '제품명',
      category ENUM('주요제품', '일반제품') DEFAULT '일반제품' COMMENT '제품 카테고리',
      priority INT DEFAULT 0 COMMENT '우선순위 (1=임플란트, 2=지르코니아, 3=Abutment, 0=일반)',
      isActive BOOLEAN DEFAULT TRUE COMMENT '활성 상태',
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_category (category),
      INDEX idx_priority (priority)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
};

// ==========================================
// 3. companies 테이블 생성
// ==========================================
const createCompaniesTable = async (connection) => {
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS companies (
      keyValue VARCHAR(100) PRIMARY KEY COMMENT '고유키 (UUID)',
      erpCompanyName VARCHAR(200) COMMENT '거래처명(ERP)',
      finalCompanyName VARCHAR(200) COMMENT '최종거래처명',
      isClosed ENUM('Y', 'N') DEFAULT 'N' COMMENT '폐업여부',
      ceoOrDentist VARCHAR(100) COMMENT '대표이사 또는 치과의사',
      customerRegion VARCHAR(100) COMMENT '고객사 지역',
      businessStatus VARCHAR(50) COMMENT '거래상태',
      department VARCHAR(100) COMMENT '담당부서',
      salesProduct TEXT COMMENT '판매제품 (자동)',
      lastPaymentDate DATE COMMENT '마지막결제일 (자동)',
      lastPaymentAmount DECIMAL(15,2) DEFAULT 0 COMMENT '마지막총결재금액 (자동)',
      accumulatedCollection DECIMAL(15,2) DEFAULT 0 COMMENT '누적수금금액 (자동)',
      accumulatedSales DECIMAL(15,2) DEFAULT 0 COMMENT '누적매출금액 (자동)',
      activityNotes TEXT COMMENT '영업활동(특이사항) (자동)',
      internalManager VARCHAR(100) COMMENT '내부담당자',
      jcwContribution ENUM('상', '중', '하') COMMENT '정철웅기여',
      companyContribution ENUM('상', '중', '하') COMMENT '회사기여',
      accountsReceivable DECIMAL(15,2) DEFAULT 0 COMMENT '매출채권잔액',
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_erpCompanyName (erpCompanyName),
      INDEX idx_finalCompanyName (finalCompanyName),
      INDEX idx_internalManager (internalManager),
      INDEX idx_businessStatus (businessStatus)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
};

// ==========================================
// 4. reports 테이블 생성
// ==========================================
const createReportsTable = async (connection) => {
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS reports (
      reportId VARCHAR(100) PRIMARY KEY COMMENT '보고서ID (UUID)',
      submittedBy VARCHAR(100) NOT NULL COMMENT '작성자명',
      submittedDate DATE NOT NULL COMMENT '제출일',
      companyId VARCHAR(100) NOT NULL COMMENT '거래처ID',
      reportType VARCHAR(100) COMMENT '보고서유형',
      targetCollectionAmount DECIMAL(15,2) DEFAULT 0 COMMENT '목표수금금액',
      targetSalesAmount DECIMAL(15,2) DEFAULT 0 COMMENT '목표매출액',
      targetProducts VARCHAR(200) COMMENT '판매목표제품',
      activityNotes TEXT COMMENT '활동내역',
      actualSalesAmount DECIMAL(15,2) DEFAULT 0 COMMENT '실제 매출금액',
      actualCollectionAmount DECIMAL(15,2) DEFAULT 0 COMMENT '실제 수금금액',
      soldProducts TEXT COMMENT '판매한 제품',
      includeVAT BOOLEAN DEFAULT TRUE COMMENT '부가세 포함 여부',
      status ENUM('임시저장', '확인') DEFAULT '임시저장' COMMENT '상태',
      processedBy VARCHAR(100) COMMENT '처리자',
      processedDate TIMESTAMP NULL COMMENT '처리일',
      adminComment TEXT COMMENT '관리자코멘트',
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (submittedBy) REFERENCES employees(name) ON UPDATE CASCADE ON DELETE RESTRICT,
      FOREIGN KEY (companyId) REFERENCES companies(keyValue) ON UPDATE CASCADE ON DELETE RESTRICT,
      FOREIGN KEY (processedBy) REFERENCES employees(name) ON UPDATE CASCADE ON DELETE SET NULL,
      INDEX idx_submittedBy (submittedBy),
      INDEX idx_companyId (companyId),
      INDEX idx_status (status),
      INDEX idx_submittedDate (submittedDate)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
};

// ==========================================
// 5. kpi_sales 테이블 생성
// ==========================================
const createKpiSalesTable = async (connection) => {
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS kpi_sales (
      id VARCHAR(36) PRIMARY KEY,
      employeeName VARCHAR(50) NOT NULL UNIQUE,
      담당거래처 INT DEFAULT 0,
      활성거래처 INT DEFAULT 0,
      활성화율 DECIMAL(5,2) DEFAULT 0,
      주요제품판매거래처 INT DEFAULT 0,
      회사배정기준대비달성율 DECIMAL(10,2) DEFAULT 0,
      주요고객처목표달성율 DECIMAL(5,2) DEFAULT 0,
      누적매출금액 DECIMAL(15,2) DEFAULT 0,
      주요제품매출액 DECIMAL(15,2) DEFAULT 0,
      매출집중도 DECIMAL(15,2) DEFAULT 0,
      누적수금금액 DECIMAL(15,2) DEFAULT 0,
      매출채권잔액 DECIMAL(15,2) DEFAULT 0,
      주요제품매출비율 DECIMAL(5,2) DEFAULT 0,
      전체매출기여도 DECIMAL(5,2) DEFAULT 0,
      주요제품매출기여도 DECIMAL(5,2) DEFAULT 0,
      전체매출기여도순위 INT DEFAULT 0 COMMENT '전체매출기여도 순위',
      주요제품매출기여도순위 INT DEFAULT 0 COMMENT '주요제품매출기여도 순위',
      전체매출누적기여도 DECIMAL(10,2) DEFAULT 0 COMMENT '전체매출기여도 누적합계',
      주요제품매출누적기여도 DECIMAL(10,2) DEFAULT 0 COMMENT '주요제품매출기여도 누적합계',
      현재월수 INT DEFAULT 0,
      lastUpdated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_employeeName (employeeName)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
};

// 마이그레이션 코드 제거 - UUID 기반으로 처음부터 깨끗하게 시작

// ==========================================
// 5-1. kpi_sales 테이블 마이그레이션 (필드명 변경)
// ==========================================
const migrateKpiSalesFieldNames = async (connection) => {
  try {
    // 주요매출기여도 → 주요제품매출기여도
    await connection.execute(`
      ALTER TABLE kpi_sales
      CHANGE COLUMN 주요매출기여도 주요제품매출기여도 DECIMAL(5,2) DEFAULT 0
    `).catch(() => {
      console.log('   ℹ️ 주요제품매출기여도 컬럼이 이미 존재하거나 마이그레이션 불필요');
    });

    // 주요매출기여도순위 → 주요제품매출기여도순위
    await connection.execute(`
      ALTER TABLE kpi_sales
      CHANGE COLUMN 주요매출기여도순위 주요제품매출기여도순위 INT DEFAULT 0 COMMENT '주요제품매출기여도 순위'
    `).catch(() => {
      console.log('   ℹ️ 주요제품매출기여도순위 컬럼이 이미 존재하거나 마이그레이션 불필요');
    });

    // 주요매출누적기여도 → 주요제품매출누적기여도
    await connection.execute(`
      ALTER TABLE kpi_sales
      CHANGE COLUMN 주요매출누적기여도 주요제품매출누적기여도 DECIMAL(10,2) DEFAULT 0 COMMENT '주요제품매출기여도 누적합계'
    `).catch(() => {
      console.log('   ℹ️ 주요제품매출누적기여도 컬럼이 이미 존재하거나 마이그레이션 불필요');
    });

    console.log('✅ kpi_sales 필드명 마이그레이션 완료');
  } catch (error) {
    console.log('⚠️ kpi_sales 마이그레이션 오류 (이미 적용됨):', error.message);
  }
};

// ==========================================
// 6. kpi_admin 테이블 생성
// ==========================================
const createKpiAdminTable = async (connection) => {
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS kpi_admin (
      id VARCHAR(36) PRIMARY KEY DEFAULT 'admin-kpi-singleton',
      전체거래처 INT DEFAULT 0,
      활성거래처 INT DEFAULT 0,
      활성화율 DECIMAL(5,2) DEFAULT 0,
      주요제품판매거래처 INT DEFAULT 0,
      회사배정기준대비달성율 DECIMAL(10,2) DEFAULT 0,
      주요고객처목표달성율 DECIMAL(5,2) DEFAULT 0,
      누적매출금액 DECIMAL(15,2) DEFAULT 0,
      누적수금금액 DECIMAL(15,2) DEFAULT 0,
      매출채권잔액 DECIMAL(15,2) DEFAULT 0,
      주요제품매출액 DECIMAL(15,2) DEFAULT 0,
      매출집중도 DECIMAL(15,2) DEFAULT 0,
      주요제품매출비율 DECIMAL(5,2) DEFAULT 0,
      전체매출기여도_링크 VARCHAR(200) DEFAULT '/api/kpi/admin/ranking/total',
      주요제품매출기여도_링크 VARCHAR(200) DEFAULT '/api/kpi/admin/ranking/main',
      영업담당자수 INT DEFAULT 0,
      현재월수 INT DEFAULT 0,
      lastUpdated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
};

// ==========================================
// 7. change_history 테이블 생성
// ==========================================
const createChangeHistoryTable = async (connection) => {
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
      INDEX idx_changedBy (changedBy)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
};

// ==========================================
// 8. backups 테이블 생성
// ==========================================
const createBackupsTable = async (connection) => {
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS backups (
      id INT AUTO_INCREMENT PRIMARY KEY,
      backupName VARCHAR(200) NOT NULL COMMENT '백업명',
      backupType ENUM('수동', '자동', '시스템') DEFAULT '수동' COMMENT '백업유형',
      backupData LONGTEXT NOT NULL COMMENT '백업데이터 (JSON)',
      dataSize BIGINT COMMENT '백업크기',
      recordCount INT COMMENT '레코드수',
      createdBy VARCHAR(100) NOT NULL COMMENT '생성자',
      description TEXT COMMENT '설명',
      isRestored BOOLEAN DEFAULT FALSE COMMENT '복원여부',
      restoredAt TIMESTAMP NULL COMMENT '복원일시',
      restoredBy VARCHAR(100) COMMENT '복원자',
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
      INDEX idx_createdAt (createdAt),
      INDEX idx_backupType (backupType)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
};

// ==========================================
// 9. error_logs 테이블 생성
// ==========================================
const createErrorLogsTable = async (connection) => {
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS error_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      userName VARCHAR(100) COMMENT '사용자 이름',
      userRole VARCHAR(50) COMMENT '사용자 역할',
      errorMessage TEXT NOT NULL COMMENT '에러 메시지',
      errorStack TEXT COMMENT '에러 스택',
      pageUrl VARCHAR(500) COMMENT '발생 페이지',
      browserInfo VARCHAR(200) COMMENT '브라우저 정보',
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '발생 시간',
      resolved TINYINT(1) DEFAULT 0 COMMENT '해결 여부',
      resolvedBy VARCHAR(100) DEFAULT NULL COMMENT '해결한 사람',
      resolvedAt DATETIME DEFAULT NULL COMMENT '해결 시간',
      resolutionNote TEXT DEFAULT NULL COMMENT '해결 메모',
      INDEX idx_timestamp (timestamp),
      INDEX idx_userName (userName),
      INDEX idx_resolved (resolved)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
};

// ==========================================
// 9-1. error_logs 테이블 마이그레이션 (해결 상태 컬럼 추가)
// ==========================================
const migrateErrorLogsAddResolved = async (connection) => {
  try {
    // 컬럼 존재 여부 확인 헬퍼 함수
    const columnExists = async (tableName, columnName) => {
      const [rows] = await connection.execute(
        `SELECT COUNT(*) as count FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
        [tableName, columnName]
      );
      return rows[0].count > 0;
    };

    // resolved 컬럼 추가
    if (!(await columnExists('error_logs', 'resolved'))) {
      await connection.execute(`
        ALTER TABLE error_logs
        ADD COLUMN resolved TINYINT(1) DEFAULT 0 COMMENT '해결 여부 (0: 미해결, 1: 해결)'
      `);
      console.log('   ✅ resolved 컬럼 추가 완료');
    }

    // resolvedBy 컬럼 추가
    if (!(await columnExists('error_logs', 'resolvedBy'))) {
      await connection.execute(`
        ALTER TABLE error_logs
        ADD COLUMN resolvedBy VARCHAR(100) DEFAULT NULL COMMENT '해결한 사람'
      `);
      console.log('   ✅ resolvedBy 컬럼 추가 완료');
    }

    // resolvedAt 컬럼 추가
    if (!(await columnExists('error_logs', 'resolvedAt'))) {
      await connection.execute(`
        ALTER TABLE error_logs
        ADD COLUMN resolvedAt DATETIME DEFAULT NULL COMMENT '해결 시간'
      `);
      console.log('   ✅ resolvedAt 컬럼 추가 완료');
    }

    // resolutionNote 컬럼 추가
    if (!(await columnExists('error_logs', 'resolutionNote'))) {
      await connection.execute(`
        ALTER TABLE error_logs
        ADD COLUMN resolutionNote TEXT DEFAULT NULL COMMENT '해결 메모'
      `);
      console.log('   ✅ resolutionNote 컬럼 추가 완료');
    }

    // 인덱스 존재 여부 확인 및 추가
    const [indexCheck] = await connection.execute(
      `SELECT COUNT(*) as count FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'error_logs' AND INDEX_NAME = 'idx_resolved'`
    );
    if (indexCheck[0].count === 0) {
      await connection.execute(`
        ALTER TABLE error_logs
        ADD INDEX idx_resolved (resolved)
      `);
      console.log('   ✅ idx_resolved 인덱스 추가 완료');
    }

    console.log('   ✅ error_logs 해결 상태 컬럼 마이그레이션 완료');
  } catch (error) {
    console.log('   ⚠️  error_logs 마이그레이션 오류:', error.message);
  }
};

// ==========================================
// 10. access_logs 테이블 생성 (웹사용기록)
// ==========================================
const createAccessLogsTable = async (connection) => {
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS access_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      userId VARCHAR(36) COMMENT '사용자 ID (employees.id)',
      userName VARCHAR(100) NOT NULL COMMENT '사용자 이름',
      userRole VARCHAR(50) COMMENT '사용자 역할',
      loginTime DATETIME NOT NULL COMMENT '로그인 시간',
      logoutTime DATETIME DEFAULT NULL COMMENT '로그아웃 시간',
      sessionDuration INT DEFAULT NULL COMMENT '세션 시간 (초)',
      ipAddress VARCHAR(50) COMMENT 'IP 주소',
      userAgent TEXT COMMENT '브라우저 정보',
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_userId (userId),
      INDEX idx_userName (userName),
      INDEX idx_loginTime (loginTime),
      FOREIGN KEY (userId) REFERENCES employees(id) ON UPDATE CASCADE ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
};

// ==========================================
// 11. customer_news 테이블 생성 (고객소식)
// ==========================================
const createCustomerNewsTable = async (connection) => {
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS customer_news (
      id VARCHAR(36) PRIMARY KEY COMMENT '고객소식 ID (UUID)',
      companyId VARCHAR(100) NOT NULL COMMENT '거래처 ID',
      companyName VARCHAR(200) NOT NULL COMMENT '거래처명 (조회용)',
      createdBy VARCHAR(100) NOT NULL COMMENT '작성자 (영업담당자)',
      department VARCHAR(100) COMMENT '작성자 부서',
      category ENUM('경조사', '생일', '개업기념일', '일반소식', '중요공지', '기타') NOT NULL COMMENT '카테고리',
      title VARCHAR(200) NOT NULL COMMENT '제목',
      content TEXT NOT NULL COMMENT '내용',
      newsDate DATE NOT NULL COMMENT '소식 발생일',
      isYearlyRecurring BOOLEAN DEFAULT FALSE COMMENT '매년 반복 여부 (생일, 기념일 등)',
      priority ENUM('낮음', '보통', '높음', '긴급') DEFAULT '보통' COMMENT '중요도',
      showAsNotification BOOLEAN DEFAULT FALSE COMMENT '로그인 시 알림 표시 여부',
      status ENUM('활성', '비활성', '삭제됨') DEFAULT '활성' COMMENT '상태',
      viewCount INT DEFAULT 0 COMMENT '조회수',
      commentCount INT DEFAULT 0 COMMENT '의견 수',
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '작성일시',
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
      FOREIGN KEY (companyId) REFERENCES companies(keyValue) ON UPDATE CASCADE ON DELETE RESTRICT,
      FOREIGN KEY (createdBy) REFERENCES employees(name) ON UPDATE CASCADE ON DELETE RESTRICT,
      INDEX idx_companyId (companyId),
      INDEX idx_createdBy (createdBy),
      INDEX idx_category (category),
      INDEX idx_newsDate (newsDate),
      INDEX idx_showAsNotification (showAsNotification),
      INDEX idx_status (status),
      INDEX idx_createdAt (createdAt)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    COMMENT='고객소식 관리 테이블 - 영업담당자가 작성'
  `);
};

// ==========================================
// 12. customer_news_comments 테이블 생성 (관리자 의견)
// ==========================================
const createCustomerNewsCommentsTable = async (connection) => {
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS customer_news_comments (
      id VARCHAR(36) PRIMARY KEY COMMENT '의견 ID (UUID)',
      newsId VARCHAR(36) NOT NULL COMMENT '고객소식 ID',
      commentBy VARCHAR(100) NOT NULL COMMENT '의견 작성자 (주로 관리자)',
      commentByRole VARCHAR(50) COMMENT '작성자 역할',
      comment TEXT NOT NULL COMMENT '의견 내용',
      commentType ENUM('일반', '질문', '제안', '승인', '반려') DEFAULT '일반' COMMENT '의견 유형',
      isRead BOOLEAN DEFAULT FALSE COMMENT '영업담당자 읽음 여부',
      readAt TIMESTAMP NULL COMMENT '읽은 시간',
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '작성일시',
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
      FOREIGN KEY (newsId) REFERENCES customer_news(id) ON UPDATE CASCADE ON DELETE CASCADE,
      FOREIGN KEY (commentBy) REFERENCES employees(name) ON UPDATE CASCADE ON DELETE RESTRICT,
      INDEX idx_newsId (newsId),
      INDEX idx_commentBy (commentBy),
      INDEX idx_isRead (isRead),
      INDEX idx_createdAt (createdAt)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    COMMENT='고객소식 의견 테이블 - 관리자가 작성'
  `);
};

// ==========================================
// 13. customer_news_notifications 테이블 생성 (알림 읽음 상태)
// ==========================================
const createCustomerNewsNotificationsTable = async (connection) => {
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS customer_news_notifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      newsId VARCHAR(36) NOT NULL COMMENT '고객소식 ID',
      employeeName VARCHAR(100) NOT NULL COMMENT '직원명',
      viewCount INT DEFAULT 0 COMMENT '조회 횟수 (최대 3회)',
      isDismissed BOOLEAN DEFAULT FALSE COMMENT '더이상 보지 않기 클릭 여부',
      dismissedAt TIMESTAMP NULL COMMENT '더이상 보지 않기 클릭 시간',
      firstViewedAt TIMESTAMP NULL COMMENT '첫 조회 시간',
      lastViewedAt TIMESTAMP NULL COMMENT '마지막 조회 시간',
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
      FOREIGN KEY (newsId) REFERENCES customer_news(id) ON UPDATE CASCADE ON DELETE CASCADE,
      FOREIGN KEY (employeeName) REFERENCES employees(name) ON UPDATE CASCADE ON DELETE CASCADE,
      UNIQUE KEY uk_news_employee (newsId, employeeName),
      INDEX idx_employeeName (employeeName),
      INDEX idx_isDismissed (isDismissed),
      INDEX idx_viewCount (viewCount)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    COMMENT='고객소식 알림 읽음 상태 추적 테이블'
  `);
};

// ==========================================
// 14. customer_news 관련 트리거 생성
// ==========================================
const createCustomerNewsTriggers = async (connection) => {
  // 기존 트리거 삭제
  try {
    await connection.query('DROP TRIGGER IF EXISTS increment_comment_count');
    await connection.query('DROP TRIGGER IF EXISTS decrement_comment_count');
  } catch (error) {
    // 무시
  }

  // 트리거 1: 의견 작성 시 commentCount 증가
  await connection.query(`
    CREATE TRIGGER increment_comment_count
    AFTER INSERT ON customer_news_comments
    FOR EACH ROW
    BEGIN
      UPDATE customer_news
      SET commentCount = commentCount + 1
      WHERE id = NEW.newsId;
    END
  `);

  // 트리거 2: 의견 삭제 시 commentCount 감소
  await connection.query(`
    CREATE TRIGGER decrement_comment_count
    AFTER DELETE ON customer_news_comments
    FOR EACH ROW
    BEGIN
      UPDATE customer_news
      SET commentCount = GREATEST(0, commentCount - 1)
      WHERE id = OLD.newsId;
    END
  `);
};

// ==========================================
// 제품 마스터 데이터 삽입 (37개)
// ==========================================
const insertProducts = async (connection) => {
  const products = [
    // 주요제품
    ['임플란트', '주요제품', 1], ['TL', '주요제품', 1], ['KIS', '주요제품', 1],
    ['지르코니아', '주요제품', 2], ['Abutment', '주요제품', 3],
    // 일반제품 (32개)
    ['패키지', '일반제품', 0], ['마스크', '일반제품', 0], ['재료', '일반제품', 0],
    ['의료장비', '일반제품', 0], ['Centric Guide', '일반제품', 0],
    ['의치착색제', '일반제품', 0], ['임플란트부속품', '일반제품', 0],
    ['트리톤', '일반제품', 0], ['루시아지그', '일반제품', 0], ['리퀴드', '일반제품', 0],
    ['키스본', '일반제품', 0], ['MPP KIT', '일반제품', 0], ['임프레션코핑', '일반제품', 0],
    ['아나로그', '일반제품', 0], ['센트릭', '일반제품', 0], ['피에조', '일반제품', 0],
    ['쿠보몰', '일반제품', 0], ['장비', '일반제품', 0], ['리프게이지', '일반제품', 0],
    ['보철', '일반제품', 0], ['CLIP KIT', '일반제품', 0], ['실리캡', '일반제품', 0],
    ['멤브레인', '일반제품', 0], ['기구', '일반제품', 0], ['기공물', '일반제품', 0],
    ['BONE', '일반제품', 0], ['BITE', '일반제품', 0], ['상부구조물', '일반제품', 0],
    ['EMS TIP', '일반제품', 0], ['동종골', '일반제품', 0], ['핸드피스', '일반제품', 0],
    ['블록 리퀴드', '일반제품', 0], ['힐링', '일반제품', 0]
  ];

  let insertCount = 0;
  for (const [name, category, priority] of products) {
    try {
      await connection.execute(
        'INSERT IGNORE INTO products (productName, category, priority) VALUES (?, ?, ?)',
        [name, category, priority]
      );
      insertCount++;
    } catch (error) {
      // 중복 에러는 무시
    }
  }
  return insertCount;
};

// ==========================================
// 트리거 생성
// ==========================================
const createTriggers = async (connection) => {
  // 기존 트리거 삭제
  try {
    await connection.query('DROP TRIGGER IF EXISTS update_company_after_report_confirmation');
  } catch (error) {
    // 무시
  }

  // 트리거 생성: 영업담당자가 실적보고서 확인 시 companies 테이블 자동 업데이트
  await connection.query(`
    CREATE TRIGGER update_company_after_report_confirmation
    AFTER UPDATE ON reports
    FOR EACH ROW
    BEGIN
      IF NEW.status = '확인' AND OLD.status != '확인' THEN
        UPDATE companies
        SET
          salesProduct = CASE
            WHEN salesProduct IS NULL OR salesProduct = '' THEN NEW.soldProducts
            WHEN NEW.soldProducts IS NOT NULL AND NEW.soldProducts != '' THEN
              CONCAT(salesProduct, ',', NEW.soldProducts)
            ELSE salesProduct
          END,
          lastPaymentDate = IFNULL(NEW.processedDate, CURDATE()),
          lastPaymentAmount = NEW.actualSalesAmount,
          accumulatedCollection = accumulatedCollection + IFNULL(NEW.actualCollectionAmount, 0),
          accumulatedSales = accumulatedSales +
            CASE
              WHEN NEW.includeVAT = TRUE THEN IFNULL(NEW.actualSalesAmount, 0) / 1.1
              ELSE IFNULL(NEW.actualSalesAmount, 0)
            END,
          activityNotes = CASE
            WHEN activityNotes IS NULL OR activityNotes = '' THEN
              CONCAT('[', DATE_FORMAT(IFNULL(NEW.processedDate, CURDATE()), '%Y-%m-%d'), '] ',
                     IFNULL(NEW.activityNotes, ''))
            WHEN NEW.activityNotes IS NOT NULL AND NEW.activityNotes != '' THEN
              CONCAT(activityNotes, '\n',
                     '[', DATE_FORMAT(IFNULL(NEW.processedDate, CURDATE()), '%Y-%m-%d'), '] ',
                     NEW.activityNotes)
            ELSE activityNotes
          END,
          updatedAt = NOW()
        WHERE keyValue = NEW.companyId;
      END IF;
    END
  `);
};

// ==========================================
// 유틸리티 함수
// ==========================================

// 엑셀 날짜 시리얼 번호를 Date로 변환
const excelDateToJSDate = (serial) => {
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  const date_info = new Date(utc_value * 1000);
  return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate());
};

// Date를 MySQL DATE 형식으로 변환 (YYYY-MM-DD)
const formatDate = (date) => {
  if (!date) return null;
  if (date instanceof Date) {
    return date.toISOString().split('T')[0];
  }
  // 문자열 날짜 (2025.08.28) -> 2025-08-28
  if (typeof date === 'string') {
    return date.replace(/\./g, '-');
  }
  return null;
};

// ==========================================
// 엑셀 데이터 임포트
// ==========================================

// 직원 데이터 임포트
const importEmployeesFromExcel = async (connection) => {
  try {
    // 엑셀 파일 경로 (Railway: /app, 로컬: 프로젝트 루트)
    const excelPath = path.join(__dirname, '../../01.Original_data/영업관리기초자료_UUID.xlsx');
    console.log(`   📂 엑셀 경로 확인: ${excelPath}`);

    if (!existsSync(excelPath)) {
      console.log('   ⏭️  엑셀 파일 없음 - 직원 데이터 임포트 건너뜀');
      console.log(`   ⏭️  __dirname: ${__dirname}`);
      return 0;
    }

    console.log('   ✅ 엑셀 파일 존재 확인');
    const workbook = xlsx.readFile(excelPath);
    const employeeSheet = workbook.Sheets['입사일자'];
    const employeeData = xlsx.utils.sheet_to_json(employeeSheet);
    console.log(`   📊 엑셀에서 ${employeeData.length}명의 직원 데이터 발견`);

    let count = 0;
    let errorCount = 0;
    for (const row of employeeData) {
      try {
        const name = row['성명'];
        if (!name) {
          console.log('   ⚠️  성명 없음 - 건너뜀:', row);
          errorCount++;
          continue;
        }

        const hireDate = excelDateToJSDate(row['입사일자']);
        const role1 = row['영업사원목록'] || null;
        const role2 = row['관리자목록'] || null;
        const department = row['부서'] || null;

        // UUID 생성 (영구 추적용 - Primary Key)
        const { randomUUID } = require('crypto');
        const employeeId = randomUUID();

        // 기본 비밀번호: 이름1234
        const defaultPassword = `${name}1234`;
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);

        const [result] = await connection.execute(
          `INSERT IGNORE INTO employees (id, name, password, role1, role2, department, hireDate, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, '재직')`,
          [employeeId, name, hashedPassword, role1, role2, department, formatDate(hireDate)]
        );

        if (result.affectedRows > 0) {
          count++;
        }
      } catch (error) {
        console.error(`   ❌ 직원 임포트 실패 (${row['성명']}):`, error.message);
        errorCount++;
      }
    }

    if (errorCount > 0) {
      console.log(`   ⚠️  임포트 오류: ${errorCount}명 실패`);
    }
    return count;
  } catch (error) {
    console.error('   ❌ 직원 데이터 임포트 실패:', error.message);
    console.error(error.stack);
    return 0;
  }
};

// 거래처 데이터 임포트
const importCompaniesFromExcel = async (connection) => {
  try {
    const excelPath = path.join(__dirname, '../../01.Original_data/영업관리기초자료_UUID.xlsx');

    if (!existsSync(excelPath)) {
      console.log('   ⏭️  엑셀 파일 없음 - 거래처 데이터 임포트 건너뜀');
      return 0;
    }

    const workbook = xlsx.readFile(excelPath);
    const companySheet = workbook.Sheets['기본정보'];
    const companyData = xlsx.utils.sheet_to_json(companySheet);

    let count = 0;
    for (const row of companyData) {
      try {
        const keyValue = row['KEYVALUE'];
        const erpCompanyName = row['거래처명(ERP)'] || null;
        const finalCompanyName = row['최종거래처명'] || null;
        const isClosed = row['폐업여부'] === '폐업' ? 'Y' : 'N';
        const ceoOrDentist = row['대표이사 또는 치과의사'] || null;
        const customerRegion = row['고객사 지역'] || null;
        const businessStatus = row['거래상태'] || null;
        const department = row['담당부서'] || null;
        const salesProduct = row['판매제품'] || null;
        const internalManager = row['내부담당자'] || null;
        const jcwContribution = row['정철웅기여\r\n(상.중.하)'] || row['정철웅기여(상.중.하)'] || null;
        const companyContribution = row['회사기여\r\n(상.중.하)'] || row['회사기여(상.중.하)'] || null;
        const lastPaymentDate = formatDate(row['마지막결제일']);
        const lastPaymentAmount = row['마지막총결재금액'] || 0;
        const accumulatedSales = row['누적매출금액'] || 0;
        const accumulatedCollection = row['누적수금금액'] || 0;
        const accountsReceivable = row['매출채권잔액'] || 0;
        const activityNotes = row['영업활동(특이사항)'] || null;

        await connection.execute(
          `INSERT IGNORE INTO companies (
            keyValue, erpCompanyName, finalCompanyName, isClosed, ceoOrDentist,
            customerRegion, businessStatus, department, salesProduct, internalManager,
            jcwContribution, companyContribution, lastPaymentDate, lastPaymentAmount,
            accumulatedSales, accumulatedCollection, accountsReceivable, activityNotes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            keyValue, erpCompanyName, finalCompanyName, isClosed, ceoOrDentist,
            customerRegion, businessStatus, department, salesProduct, internalManager,
            jcwContribution, companyContribution, lastPaymentDate, lastPaymentAmount,
            accumulatedSales, accumulatedCollection, accountsReceivable, activityNotes
          ]
        );
        count++;
      } catch (error) {
        // 중복 에러 무시
      }
    }
    return count;
  } catch (error) {
    console.error('   ❌ 거래처 데이터 임포트 실패:', error.message);
    return 0;
  }
};

// ==========================================
// 메인 초기화 함수
// ==========================================
export const initializeDatabase = async () => {
  let connection;

  try {
    console.log('\n🔧 데이터베이스 초기화 시작...');

    // DATABASE_URL로 직접 연결
    connection = await mysql.createConnection(process.env.DATABASE_URL);

    // 환경변수로 데이터베이스 완전 리셋 (RESET_DATABASE=true)
    if (process.env.RESET_DATABASE === 'true') {
      console.log('\n🔥 RESET_DATABASE=true 감지 - 데이터베이스 완전 리셋 시작...');
      console.log('⚠️  모든 테이블이 삭제됩니다!');

      const tables = [
        'customer_news_notifications',
        'customer_news_comments',
        'customer_news',
        'change_history',
        'kpi_admin',
        'kpi_sales',
        'reports',
        'companies',
        'products',
        'employees'
      ];

      for (const table of tables) {
        try {
          await connection.execute(`DROP TABLE IF EXISTS ${table}`);
          console.log(`   ✅ ${table} 삭제 완료`);
        } catch (error) {
          console.log(`   ⏭️  ${table} 삭제 건너뜀:`, error.message);
        }
      }

      console.log('✅ 모든 테이블 삭제 완료 - UUID 기반 스키마로 재생성 시작...\n');
    }

    // 1. employees 테이블 확인 및 생성
    if (!(await checkTableExists(connection, 'employees'))) {
      console.log('   📦 employees 테이블 생성 중...');
      await createEmployeesTable(connection);
      console.log('   ✅ employees 생성 완료');
    }

    // 직원 데이터가 비어있으면 엑셀에서 임포트
    const [empCount] = await connection.execute('SELECT COUNT(*) as count FROM employees');
    if (empCount[0].count === 0) {
      console.log('   📦 직원 데이터 임포트 중...');
      const employeeCount = await importEmployeesFromExcel(connection);
      if (employeeCount > 0) {
        console.log(`   ✅ 직원 ${employeeCount}명 임포트 완료`);
      }
    }

    // 강정환 계정에 엑셀 업로드 권한 설정 (일회성)
    try {
      const [kangCheck] = await connection.execute(
        'SELECT name, canUploadExcel FROM employees WHERE name = ?',
        ['강정환']
      );
      if (kangCheck.length > 0 && !kangCheck[0].canUploadExcel) {
        await connection.execute(
          'UPDATE employees SET canUploadExcel = TRUE WHERE name = ?',
          ['강정환']
        );
        console.log('   ✅ 강정환 계정 엑셀 업로드 권한 부여 완료');
      }
    } catch (error) {
      console.log('   ⏭️  권한 설정 건너뜀:', error.message);
    }

    // 직원 role2 업데이트 (일회성 - 엑셀 "관리자목록" 컬럼 반영)
    try {
      const excelPath = path.join(__dirname, '../../01.Original_data/영업관리기초자료_UUID.xlsx');
      if (existsSync(excelPath)) {
        const workbook = xlsx.readFile(excelPath);
        const employeeSheet = workbook.Sheets['입사일자'];
        const employeeData = xlsx.utils.sheet_to_json(employeeSheet);

        let role2Updated = 0;
        for (const row of employeeData) {
          const name = row['성명'];
          const role2 = row['관리자목록'] || null;

          const [existing] = await connection.execute(
            'SELECT role2 FROM employees WHERE name = ?',
            [name]
          );

          if (existing.length > 0 && existing[0].role2 !== role2) {
            await connection.execute(
              'UPDATE employees SET role2 = ? WHERE name = ?',
              [role2, name]
            );
            role2Updated++;
          }
        }

        if (role2Updated > 0) {
          console.log(`   ✅ 직원 role2 업데이트 완료 (${role2Updated}명)`);
        }
      }
    } catch (error) {
      console.log('   ⏭️  role2 업데이트 건너뜀:', error.message);
    }

    // 2. products 테이블 확인 및 생성
    if (!(await checkTableExists(connection, 'products'))) {
      console.log('   📦 products 테이블 생성 중...');
      await createProductsTable(connection);
      console.log('   ✅ products 생성 완료');

      // 제품 데이터 삽입
      console.log('   📦 제품 마스터 데이터 삽입 중...');
      const count = await insertProducts(connection);
      console.log(`   ✅ 제품 데이터 ${count}개 삽입 완료`);
    }

    // 3. companies 테이블 확인 및 생성
    if (!(await checkTableExists(connection, 'companies'))) {
      console.log('   📦 companies 테이블 생성 중...');
      await createCompaniesTable(connection);
      console.log('   ✅ companies 생성 완료');
    }

    // 거래처 데이터가 비어있으면 엑셀에서 임포트
    const [compCount] = await connection.execute('SELECT COUNT(*) as count FROM companies');
    if (compCount[0].count === 0) {
      console.log('   📦 거래처 데이터 임포트 중...');
      const companyCount = await importCompaniesFromExcel(connection);
      if (companyCount > 0) {
        console.log(`   ✅ 거래처 ${companyCount}개 임포트 완료`);
      }
    }

    // 4. reports 테이블 확인 및 생성
    if (!(await checkTableExists(connection, 'reports'))) {
      console.log('   📦 reports 테이블 생성 중...');
      await createReportsTable(connection);
      console.log('   ✅ reports 생성 완료');
    }

    // 5. kpi_sales 테이블 확인 및 생성
    if (!(await checkTableExists(connection, 'kpi_sales'))) {
      console.log('   📦 kpi_sales 테이블 생성 중...');
      await createKpiSalesTable(connection);
      console.log('   ✅ kpi_sales 생성 완료');
    }

    // 5-1. kpi_sales 필드명 마이그레이션
    console.log('   📦 kpi_sales 필드명 마이그레이션 중...');
    await migrateKpiSalesFieldNames(connection);

    // 6. kpi_admin 테이블 확인 및 생성
    if (!(await checkTableExists(connection, 'kpi_admin'))) {
      console.log('   📦 kpi_admin 테이블 생성 중...');
      await createKpiAdminTable(connection);
      console.log('   ✅ kpi_admin 생성 완료');
    }

    // 7. change_history 테이블 확인 및 생성
    if (!(await checkTableExists(connection, 'change_history'))) {
      console.log('   📦 change_history 테이블 생성 중...');
      await createChangeHistoryTable(connection);
      console.log('   ✅ change_history 생성 완료');
    }

    // 8. backups 테이블 확인 및 생성
    if (!(await checkTableExists(connection, 'backups'))) {
      console.log('   📦 backups 테이블 생성 중...');
      await createBackupsTable(connection);
      console.log('   ✅ backups 생성 완료');
    }

    // 9. error_logs 테이블 확인 및 생성
    if (!(await checkTableExists(connection, 'error_logs'))) {
      console.log('   📦 error_logs 테이블 생성 중...');
      await createErrorLogsTable(connection);
      console.log('   ✅ error_logs 생성 완료');
    }

    // 9-1. error_logs 해결 상태 컬럼 마이그레이션
    console.log('   📦 error_logs 해결 상태 마이그레이션 중...');
    await migrateErrorLogsAddResolved(connection);

    // 10. access_logs 테이블 확인 및 생성
    if (!(await checkTableExists(connection, 'access_logs'))) {
      console.log('   📦 access_logs 테이블 생성 중...');
      await createAccessLogsTable(connection);
      console.log('   ✅ access_logs 생성 완료');
    }

    // 11. customer_news 테이블 확인 및 생성
    if (!(await checkTableExists(connection, 'customer_news'))) {
      console.log('   📦 customer_news 테이블 생성 중...');
      await createCustomerNewsTable(connection);
      console.log('   ✅ customer_news 생성 완료');
    }

    // 12. customer_news_comments 테이블 확인 및 생성
    if (!(await checkTableExists(connection, 'customer_news_comments'))) {
      console.log('   📦 customer_news_comments 테이블 생성 중...');
      await createCustomerNewsCommentsTable(connection);
      console.log('   ✅ customer_news_comments 생성 완료');
    }

    // 13. customer_news_notifications 테이블 확인 및 생성
    if (!(await checkTableExists(connection, 'customer_news_notifications'))) {
      console.log('   📦 customer_news_notifications 테이블 생성 중...');
      await createCustomerNewsNotificationsTable(connection);
      console.log('   ✅ customer_news_notifications 생성 완료');
    }

    // 14. 트리거 생성 (reports + customer_news)
    console.log('   📦 트리거 생성 중...');
    await createTriggers(connection);
    await createCustomerNewsTriggers(connection);
    console.log('   ✅ 트리거 생성 완료');

    console.log('✅ 데이터베이스 초기화 완료!\n');

    return true;
  } catch (error) {
    console.error('❌ 데이터베이스 초기화 실패:', error.message);
    console.error('⚠️  서버는 계속 실행되지만 데이터베이스 기능이 제한될 수 있습니다.\n');
    return false;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};
