-- ============================================
-- 10. reports 테이블에 confirmationData 컬럼 추가
-- ============================================
-- 목적: 실적 확인 시 입력된 수금/매출/활동 상세 내역을 JSON으로 저장
-- 실행일: 2025-10-11
-- 작성자: Claude

-- confirmationData 컬럼 추가 (중복 방지)
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'reports'
     AND COLUMN_NAME = 'confirmationData') = 0,
  'ALTER TABLE reports ADD COLUMN confirmationData JSON COMMENT "실적 확인 상세 데이터 (entries 배열 등)"',
  'SELECT "confirmationData already exists" AS message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 결과 확인
SELECT '✅ confirmationData 컬럼 추가 완료' AS status;

-- 테이블 구조 확인
DESCRIBE reports;

-- 샘플 데이터 확인
SELECT
  reportId,
  actualCollectionAmount,
  actualSalesAmount,
  confirmationData,
  processedBy,
  processedDate
FROM reports
WHERE processedBy IS NOT NULL
LIMIT 5;
