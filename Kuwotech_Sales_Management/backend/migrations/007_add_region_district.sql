-- ============================================
-- 007: companies 테이블에 region_district 컬럼 추가
-- ============================================
-- 실행일: 2025-10-10
-- 목적: 구/군 정보를 별도 컬럼으로 저장 (예: 강남구, 수원시)

-- 1. region_district 컬럼 추가
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS region_district VARCHAR(50) NULL COMMENT '구/군 정보 (예: 강남구, 수원시)' AFTER region_id,
ADD INDEX idx_region_district (region_district);

-- 2. customerRegion에서 구/군 정보 추출 및 업데이트
UPDATE companies
SET region_district = TRIM(SUBSTRING_INDEX(customerRegion, ' ', -1))
WHERE customerRegion IS NOT NULL
  AND customerRegion != ''
  AND customerRegion LIKE '% %';

-- 3. 확인 쿼리
SELECT
  customerRegion,
  region_id,
  region_district,
  COUNT(*) as count
FROM companies
WHERE customerRegion IS NOT NULL AND customerRegion != ''
GROUP BY customerRegion, region_id, region_district
ORDER BY customerRegion
LIMIT 20;
