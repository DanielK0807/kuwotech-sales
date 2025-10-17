// ============================================
// KUWOTECH 영업관리 시스템 - 데이터베이스 초기화 v2
// ============================================
// 실행: node backend/scripts/init-db-v2.js
// 새로운 스키마 기반 (8개 테이블)
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
    // MySQL 연결 (DATABASE_URL 파싱)
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
      database,
      connectTimeout: 60000,
      waitForConnections: true,
      connectionLimit: 10
    };

    connection = await mysql.createConnection(config);
    console.log('🔌 MySQL 연결 성공\n');

    // ==========================================
    // 1. employees 테이블 생성
    // ==========================================
    console.log('1️⃣  employees 테이블 생성 중...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS employees (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE COMMENT '이름 (로그인 아이디)',
        email VARCHAR(200) UNIQUE COMMENT '이메일',
        password VARCHAR(255) NOT NULL COMMENT '비밀번호 (bcrypt 해시)',
        role1 VARCHAR(50) COMMENT '역할1 (영업담당/관리자)',
        role2 VARCHAR(50) COMMENT '역할2',
        department VARCHAR(100) COMMENT '부서',
        hireDate DATE NOT NULL COMMENT '입사일 (현재월수 계산용)',
        phone VARCHAR(50) COMMENT '전화번호',
        status ENUM('재직', '휴직', '퇴사') DEFAULT '재직' COMMENT '재직상태',
        canUploadExcel BOOLEAN DEFAULT FALSE COMMENT '엑셀 업로드 권한 (강정환만 TRUE)',
        lastLogin TIMESTAMP NULL COMMENT '마지막 로그인',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        INDEX idx_name (name),
        INDEX idx_role1 (role1),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('   ✅ employees 테이블 생성 완료\n');

    // ==========================================
    // 2. products 테이블 생성 (제품 마스터)
    // ==========================================
    console.log('2️⃣  products 테이블 생성 중...');
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
    console.log('   ✅ products 테이블 생성 완료\n');

    // ==========================================
    // 3. companies 테이블 생성 (19개 컬럼)
    // ==========================================
    console.log('3️⃣  companies 테이블 생성 중...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS companies (
        -- 기본 정보 (8개)
        keyValue VARCHAR(100) PRIMARY KEY COMMENT '고유키 (UUID)',
        erpCompanyName VARCHAR(200) COMMENT '거래처명(ERP)',
        finalCompanyName VARCHAR(200) COMMENT '최종거래처명',
        isClosed ENUM('Y', 'N') DEFAULT 'N' COMMENT '폐업여부',
        ceoOrDentist VARCHAR(100) COMMENT '대표이사 또는 치과의사',
        customerRegion VARCHAR(100) COMMENT '고객사 지역',
        businessStatus VARCHAR(50) COMMENT '거래상태 (활성/비활성/불용/추가확인)',
        department VARCHAR(100) COMMENT '담당부서',

        -- 자동 업데이트 필드 (6개)
        salesProduct TEXT COMMENT '판매제품 (콤마구분, 자동)',
        lastPaymentDate DATE COMMENT '마지막결제일 (자동)',
        lastPaymentAmount DECIMAL(15,2) DEFAULT 0 COMMENT '마지막총결재금액 (자동)',
        accumulatedCollection DECIMAL(15,2) DEFAULT 0 COMMENT '누적수금금액 (자동)',
        accumulatedSales DECIMAL(15,2) DEFAULT 0 COMMENT '누적매출금액 (자동, 부가세처리)',
        businessActivity TEXT COMMENT '영업활동(특이사항) (자동)',

        -- 담당자 및 평가 (3개)
        internalManager VARCHAR(100) COMMENT '내부담당자',
        jcwContribution ENUM('상', '중', '하') COMMENT '정철웅기여',
        companyContribution ENUM('상', '중', '하') COMMENT '회사기여',

        -- 재무 정보 (1개)
        accountsReceivable DECIMAL(15,2) DEFAULT 0 COMMENT '매출채권잔액 (관리자만 수정)',

        -- 시스템 필드
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        INDEX idx_erpCompanyName (erpCompanyName),
        INDEX idx_finalCompanyName (finalCompanyName),
        INDEX idx_internalManager (internalManager),
        INDEX idx_businessStatus (businessStatus),
        INDEX idx_customerRegion (customerRegion),
        INDEX idx_department (department),
        INDEX idx_isClosed (isClosed)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('   ✅ companies 테이블 생성 완료 (19개 필드)\n');

    // ==========================================
    // 4. reports 테이블 생성 (실적보고서)
    // ==========================================
    console.log('4️⃣  reports 테이블 생성 중...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS reports (
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

        -- 실적 (영업담당자 확인 시 companies 업데이트용)
        actualSalesAmount DECIMAL(15,2) DEFAULT 0 COMMENT '실제 매출금액',
        actualCollectionAmount DECIMAL(15,2) DEFAULT 0 COMMENT '실제 수금금액',
        soldProducts TEXT COMMENT '판매한 제품 (콤마구분)',
        includeVAT BOOLEAN DEFAULT TRUE COMMENT '부가세 포함 여부',

        -- 상태
        status ENUM('임시저장', '확인') DEFAULT '임시저장' COMMENT '상태',
        processedBy VARCHAR(100) COMMENT '처리자 (관리자)',
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
    console.log('   ✅ reports 테이블 생성 완료\n');

    // ==========================================
    // 5. kpi_sales 테이블 생성 (영업담당 KPI - 16개)
    // ==========================================
    console.log('5️⃣  kpi_sales 테이블 생성 중...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS kpi_sales (
        id VARCHAR(36) PRIMARY KEY,
        employeeName VARCHAR(50) NOT NULL UNIQUE,

        -- 거래처 관리 지표 (4개)
        담당거래처 INT DEFAULT 0 COMMENT '내부담당자=본인 AND 거래상태≠불용',
        활성거래처 INT DEFAULT 0 COMMENT '거래상태=활성',
        활성화율 DECIMAL(5,2) DEFAULT 0 COMMENT '(활성/담당)×100',
        주요제품판매거래처 INT DEFAULT 0 COMMENT '3단계 우선순위 계산',

        -- 목표 달성 지표 (2개)
        회사배정기준대비달성율 DECIMAL(10,2) DEFAULT 0 COMMENT '((담당/80)-1)×100',
        주요고객처목표달성율 DECIMAL(5,2) DEFAULT 0 COMMENT '(주요제품거래처/40)×100',

        -- 매출 성과 지표 (3개)
        누적매출금액 DECIMAL(15,2) DEFAULT 0,
        주요제품매출액 DECIMAL(15,2) DEFAULT 0,
        매출집중도 DECIMAL(15,2) DEFAULT 0 COMMENT '(누적매출/담당거래처)/현재월수',

        -- 재무 및 기여도 지표 (7개)
        누적수금금액 DECIMAL(15,2) DEFAULT 0,
        매출채권잔액 DECIMAL(15,2) DEFAULT 0,
        주요제품매출비율 DECIMAL(5,2) DEFAULT 0 COMMENT '(주요제품매출/누적매출)×100',
        전체매출기여도 DECIMAL(5,2) DEFAULT 0 COMMENT '(개인누적매출/전사누적매출)×100',
        주요매출기여도 DECIMAL(5,2) DEFAULT 0 COMMENT '(개인주요제품매출/전사주요제품매출)×100',
        전체매출누적기여도 DECIMAL(10,2) DEFAULT 0 COMMENT '누적 전체매출기여도',
        주요매출누적기여도 DECIMAL(10,2) DEFAULT 0 COMMENT '누적 주요매출기여도',

        -- 메타
        현재월수 INT DEFAULT 0,
        lastUpdated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        INDEX idx_employeeName (employeeName),
        INDEX idx_전체매출기여도 (전체매출기여도 DESC),
        INDEX idx_주요매출기여도 (주요매출기여도 DESC)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('   ✅ kpi_sales 테이블 생성 완료 (16개 지표)\n');

    // ==========================================
    // 6. kpi_admin 테이블 생성 (전사 KPI - 14개)
    // ==========================================
    console.log('6️⃣  kpi_admin 테이블 생성 중...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS kpi_admin (
        id VARCHAR(36) PRIMARY KEY DEFAULT 'admin-kpi-singleton',

        -- 전사 거래처 지표 (4개)
        전체거래처 INT DEFAULT 0,
        활성거래처 INT DEFAULT 0,
        활성화율 DECIMAL(5,2) DEFAULT 0,
        주요제품판매거래처 INT DEFAULT 0,

        -- 전사 목표 달성 (2개)
        회사배정기준대비달성율 DECIMAL(10,2) DEFAULT 0,
        주요고객처목표달성율 DECIMAL(5,2) DEFAULT 0,

        -- 전사 매출 지표 (5개)
        누적매출금액 DECIMAL(15,2) DEFAULT 0,
        누적수금금액 DECIMAL(15,2) DEFAULT 0,
        매출채권잔액 DECIMAL(15,2) DEFAULT 0,
        주요제품매출액 DECIMAL(15,2) DEFAULT 0,
        매출집중도 DECIMAL(15,2) DEFAULT 0,

        -- 전사 기여도 지표 (3개)
        주요제품매출비율 DECIMAL(5,2) DEFAULT 0,
        전체매출기여도_링크 VARCHAR(200) DEFAULT '/api/kpi/admin/ranking/total',
        주요제품매출기여도_링크 VARCHAR(200) DEFAULT '/api/kpi/admin/ranking/main',

        -- 메타
        영업담당자수 INT DEFAULT 0,
        현재월수 INT DEFAULT 0 COMMENT '현재월 - 1',
        lastUpdated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('   ✅ kpi_admin 테이블 생성 완료 (14개 지표)\n');

    // ==========================================
    // 7. change_history 테이블 생성
    // ==========================================
    console.log('7️⃣  change_history 테이블 생성 중...');
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
    console.log('   ✅ change_history 테이블 생성 완료\n');

    // ==========================================
    // 8. backups 테이블 생성
    // ==========================================
    console.log('8️⃣  backups 테이블 생성 중...');
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
    console.log('   ✅ backups 테이블 생성 완료\n');

    // ==========================================
    // 결과 요약
    // ==========================================
    console.log('='.repeat(60));
    console.log('🎉 모든 테이블 생성 완료!');
    console.log('='.repeat(60));
    console.log('✅ employees 테이블');
    console.log('✅ products 테이블 (제품 마스터)');
    console.log('✅ companies 테이블 (19개 필드)');
    console.log('✅ reports 테이블 (실적보고서)');
    console.log('✅ kpi_sales 테이블 (영업담당 16개 지표)');
    console.log('✅ kpi_admin 테이블 (전사 14개 지표)');
    console.log('✅ change_history 테이블');
    console.log('✅ backups 테이블');
    console.log('='.repeat(60));
    console.log('\n💡 다음 단계:');
    console.log('   1. node backend/scripts/insert-products.js (제품 마스터 데이터 삽입)');
    console.log('   2. node backend/scripts/create-triggers.js (트리거 생성)');
    console.log('   3. 초기 직원 데이터 삽입');
    console.log('   4. 엑셀 데이터 임포트\n');

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
