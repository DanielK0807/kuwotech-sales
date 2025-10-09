-- ============================================
-- 02. 실적보고서 관련 테이블 생성 (기존 시스템 호환 버전)
-- ============================================
-- 목적: 기존 employees, reports 테이블 활용, 새 테이블만 추가
-- 실행일: 2025-10-07
-- 참고: 기존 시스템과 100% 호환

-- ==========================================
-- 1. employees 테이블에 목표 필드 추가
-- ==========================================
-- monthlyCollectionGoal 필드 추가
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'employees'
     AND COLUMN_NAME = 'monthlyCollectionGoal') = 0,
  'ALTER TABLE employees ADD COLUMN monthlyCollectionGoal DECIMAL(15,2) DEFAULT 0 COMMENT "개인 월간 수금 목표"',
  'SELECT "monthlyCollectionGoal already exists" AS message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- monthlySalesGoal 필드 추가
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'employees'
     AND COLUMN_NAME = 'monthlySalesGoal') = 0,
  'ALTER TABLE employees ADD COLUMN monthlySalesGoal DECIMAL(15,2) DEFAULT 0 COMMENT "개인 월간 매출 목표"',
  'SELECT "monthlySalesGoal already exists" AS message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- annualCollectionGoal 필드 추가
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'employees'
     AND COLUMN_NAME = 'annualCollectionGoal') = 0,
  'ALTER TABLE employees ADD COLUMN annualCollectionGoal DECIMAL(15,2) DEFAULT 0 COMMENT "개인 연간 수금 목표"',
  'SELECT "annualCollectionGoal already exists" AS message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- annualSalesGoal 필드 추가
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'employees'
     AND COLUMN_NAME = 'annualSalesGoal') = 0,
  'ALTER TABLE employees ADD COLUMN annualSalesGoal DECIMAL(15,2) DEFAULT 0 COMMENT "개인 연간 매출 목표"',
  'SELECT "annualSalesGoal already exists" AS message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ==========================================
-- 2. companyGoals 테이블 생성
-- ==========================================
CREATE TABLE IF NOT EXISTS companyGoals (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '목표 ID',
  goalYear INT NOT NULL COMMENT '목표 연도',
  goalMonth INT COMMENT '목표 월 (NULL=연간목표)',

  -- 전사 목표
  companyCollectionGoal DECIMAL(15,2) DEFAULT 0 COMMENT '전사 수금 목표',
  companySalesGoal DECIMAL(15,2) DEFAULT 0 COMMENT '전사 매출 목표',

  -- 부서 목표 (JSON)
  departmentGoals JSON COMMENT '부서별 목표',

  createdBy VARCHAR(100) COMMENT '생성자 이름',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',

  UNIQUE INDEX idx_year_month (goalYear, goalMonth),
  INDEX idx_year (goalYear),

  FOREIGN KEY (createdBy) REFERENCES employees(name)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='전사/부서 목표 관리';

-- ==========================================
-- 3. changeHistory 테이블 생성
-- ==========================================
CREATE TABLE IF NOT EXISTS changeHistory (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '변경 이력 ID',
  tableName VARCHAR(100) NOT NULL COMMENT '테이블명',
  recordId VARCHAR(100) NOT NULL COMMENT '레코드 ID',
  fieldName VARCHAR(100) NOT NULL COMMENT '필드명',
  oldValue TEXT COMMENT '이전 값',
  newValue TEXT COMMENT '새 값',
  changedBy VARCHAR(100) COMMENT '변경자 이름',
  changedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '변경일시',
  changeReason VARCHAR(500) COMMENT '변경 사유',

  INDEX idx_table_record (tableName, recordId),
  INDEX idx_changed_by (changedBy),
  INDEX idx_changed_at (changedAt),

  FOREIGN KEY (changedBy) REFERENCES employees(name)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='데이터 변경 이력';

-- ==========================================
-- 결과 확인
-- ==========================================
SELECT '✅ 실적보고서 테이블 생성 완료 (기존 시스템 호환)' AS status;

SHOW TABLES LIKE '%goals%';
SHOW TABLES LIKE '%history%';

-- 테이블 구조 확인
DESCRIBE companyGoals;
DESCRIBE changeHistory;
