-- ============================================
-- 01. companies 테이블에 실적보고서용 필드 추가
-- ============================================
-- 목적: 기존 companies 테이블에 목표, 실적 필드 추가
-- 실행일: 2025-10-07
-- 참고: 기존 테이블은 camelCase 네이밍 사용

-- 이미 존재하는 필드:
-- - lastPaymentAmount (마지막총결재금액)
-- - lastPaymentDate (마지막지불일)
-- - accumulatedCollection (누적수금금액)
-- - accumulatedSales (누적매출금액)
-- - activityNotes (영업활동(특이사항))
-- - salesProduct (판매제품) - 확인 필요

-- 1. companies 테이블에 컬럼 추가 (camelCase 방식)
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'companies'
     AND COLUMN_NAME = 'monthlyCollectionGoal') = 0,
  'ALTER TABLE companies ADD COLUMN monthlyCollectionGoal DECIMAL(15,2) DEFAULT 0 COMMENT "거래처별 월간 수금 목표"',
  'SELECT "monthlyCollectionGoal already exists" AS message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'companies'
     AND COLUMN_NAME = 'monthlySalesGoal') = 0,
  'ALTER TABLE companies ADD COLUMN monthlySalesGoal DECIMAL(15,2) DEFAULT 0 COMMENT "거래처별 월간 매출 목표"',
  'SELECT "monthlySalesGoal already exists" AS message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'companies'
     AND COLUMN_NAME = 'annualCollectionGoal') = 0,
  'ALTER TABLE companies ADD COLUMN annualCollectionGoal DECIMAL(15,2) DEFAULT 0 COMMENT "거래처별 연간 수금 목표"',
  'SELECT "annualCollectionGoal already exists" AS message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'companies'
     AND COLUMN_NAME = 'annualSalesGoal') = 0,
  'ALTER TABLE companies ADD COLUMN annualSalesGoal DECIMAL(15,2) DEFAULT 0 COMMENT "거래처별 연간 매출 목표"',
  'SELECT "annualSalesGoal already exists" AS message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'companies'
     AND COLUMN_NAME = 'salesProduct') = 0,
  'ALTER TABLE companies ADD COLUMN salesProduct JSON COMMENT "판매제품 목록 (JSON 배열)"',
  'SELECT "salesProduct already exists" AS message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. 인덱스 추가 (중복 방지)
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'companies'
     AND INDEX_NAME = 'idx_monthly_goals') = 0,
  'ALTER TABLE companies ADD INDEX idx_monthly_goals (monthlyCollectionGoal, monthlySalesGoal)',
  'SELECT "idx_monthly_goals already exists" AS message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'companies'
     AND INDEX_NAME = 'idx_annual_goals') = 0,
  'ALTER TABLE companies ADD INDEX idx_annual_goals (annualCollectionGoal, annualSalesGoal)',
  'SELECT "idx_annual_goals already exists" AS message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. 결과 확인
SELECT '✅ companies 테이블 필드 추가 완료' AS status;
DESCRIBE companies;
