-- ============================================
-- 005: regions 테이블 생성 (시/도 저장용)
-- ============================================
-- 실행일: 2025-10-06
-- 목적: 고객사 지역을 시/도 레벨로 정규화하여 별도 테이블로 관리

-- 1. regions 테이블 생성
CREATE TABLE IF NOT EXISTS regions (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '지역 ID',
  region_name VARCHAR(50) NOT NULL UNIQUE COMMENT '시/도 정식명 (예: 서울특별시, 경기도)',
  region_code VARCHAR(10) NOT NULL UNIQUE COMMENT '시/도 코드 (예: SEOUL, GYEONGGI)',
  display_order INT DEFAULT 0 COMMENT '표시 순서 (서울=1, 부산=2, ...)',
  is_active BOOLEAN DEFAULT TRUE COMMENT '활성 상태',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_region_name (region_name),
  INDEX idx_region_code (region_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='시/도 지역 테이블';

-- 2. 기본 시/도 데이터 삽입
INSERT INTO regions (region_name, region_code, display_order) VALUES
  ('서울특별시', 'SEOUL', 1),
  ('부산광역시', 'BUSAN', 2),
  ('대구광역시', 'DAEGU', 3),
  ('인천광역시', 'INCHEON', 4),
  ('광주광역시', 'GWANGJU', 5),
  ('대전광역시', 'DAEJEON', 6),
  ('울산광역시', 'ULSAN', 7),
  ('세종특별자치시', 'SEJONG', 8),
  ('경기도', 'GYEONGGI', 9),
  ('강원특별자치도', 'GANGWON', 10),
  ('충청북도', 'CHUNGBUK', 11),
  ('충청남도', 'CHUNGNAM', 12),
  ('전북특별자치도', 'JEONBUK', 13),
  ('전라남도', 'JEONNAM', 14),
  ('경상북도', 'GYEONGBUK', 15),
  ('경상남도', 'GYEONGNAM', 16),
  ('제주특별자치도', 'JEJU', 17)
ON DUPLICATE KEY UPDATE
  display_order = VALUES(display_order),
  updated_at = CURRENT_TIMESTAMP;

-- 3. companies 테이블에 region_id 컬럼 추가
ALTER TABLE companies
ADD COLUMN region_id INT NULL COMMENT '시/도 지역 ID (regions.id 참조)' AFTER customerRegion,
ADD CONSTRAINT fk_companies_region
  FOREIGN KEY (region_id) REFERENCES regions(id)
  ON UPDATE CASCADE ON DELETE SET NULL,
ADD INDEX idx_region_id (region_id);

-- 4. 확인 쿼리
SELECT 'regions 테이블 생성 완료' AS status;
SELECT * FROM regions ORDER BY display_order;
DESCRIBE companies;
-- ============================================
-- 006: companies 테이블의 region_id 업데이트
-- ============================================
-- 실행일: 2025-10-06
-- 목적: 기존 customerRegion 데이터에서 시/도를 추출하여 region_id 매핑

-- customerRegion 형식: "서울 중구", "경기 성남시", "경북 안동시" 등
-- 첫 단어(공백 기준)를 추출하여 시/도로 매핑

-- 1. 서울특별시
UPDATE companies SET region_id = (SELECT id FROM regions WHERE region_code = 'SEOUL')
WHERE customerRegion LIKE '서울%' AND region_id IS NULL;

-- 2. 부산광역시
UPDATE companies SET region_id = (SELECT id FROM regions WHERE region_code = 'BUSAN')
WHERE customerRegion LIKE '부산%' AND region_id IS NULL;

-- 3. 대구광역시
UPDATE companies SET region_id = (SELECT id FROM regions WHERE region_code = 'DAEGU')
WHERE customerRegion LIKE '대구%' AND region_id IS NULL;

-- 4. 인천광역시
UPDATE companies SET region_id = (SELECT id FROM regions WHERE region_code = 'INCHEON')
WHERE customerRegion LIKE '인천%' AND region_id IS NULL;

-- 5. 광주광역시
UPDATE companies SET region_id = (SELECT id FROM regions WHERE region_code = 'GWANGJU')
WHERE customerRegion LIKE '광주%' AND region_id IS NULL;

-- 6. 대전광역시
UPDATE companies SET region_id = (SELECT id FROM regions WHERE region_code = 'DAEJEON')
WHERE customerRegion LIKE '대전%' AND region_id IS NULL;

-- 7. 울산광역시
UPDATE companies SET region_id = (SELECT id FROM regions WHERE region_code = 'ULSAN')
WHERE customerRegion LIKE '울산%' AND region_id IS NULL;

-- 8. 세종특별자치시
UPDATE companies SET region_id = (SELECT id FROM regions WHERE region_code = 'SEJONG')
WHERE customerRegion LIKE '세종%' AND region_id IS NULL;

-- 9. 경기도
UPDATE companies SET region_id = (SELECT id FROM regions WHERE region_code = 'GYEONGGI')
WHERE customerRegion LIKE '경기%' AND region_id IS NULL;

-- 10. 강원특별자치도
UPDATE companies SET region_id = (SELECT id FROM regions WHERE region_code = 'GANGWON')
WHERE customerRegion LIKE '강원%' AND region_id IS NULL;

-- 11. 충청북도
UPDATE companies SET region_id = (SELECT id FROM regions WHERE region_code = 'CHUNGBUK')
WHERE customerRegion LIKE '충북%' AND region_id IS NULL;

-- 12. 충청남도
UPDATE companies SET region_id = (SELECT id FROM regions WHERE region_code = 'CHUNGNAM')
WHERE customerRegion LIKE '충남%' AND region_id IS NULL;

-- 13. 전북특별자치도
UPDATE companies SET region_id = (SELECT id FROM regions WHERE region_code = 'JEONBUK')
WHERE customerRegion LIKE '전북%' AND region_id IS NULL;

-- 14. 전라남도
UPDATE companies SET region_id = (SELECT id FROM regions WHERE region_code = 'JEONNAM')
WHERE customerRegion LIKE '전남%' AND region_id IS NULL;

-- 15. 경상북도
UPDATE companies SET region_id = (SELECT id FROM regions WHERE region_code = 'GYEONGBUK')
WHERE customerRegion LIKE '경북%' AND region_id IS NULL;

-- 16. 경상남도
UPDATE companies SET region_id = (SELECT id FROM regions WHERE region_code = 'GYEONGNAM')
WHERE customerRegion LIKE '경남%' AND region_id IS NULL;

-- 17. 제주특별자치도
UPDATE companies SET region_id = (SELECT id FROM regions WHERE region_code = 'JEJU')
WHERE customerRegion LIKE '제주%' AND region_id IS NULL;

-- ============================================
-- 결과 확인
-- ============================================

-- 1. region_id별 거래처 수 확인
SELECT
  r.region_name AS '시/도',
  COUNT(c.keyValue) AS '거래처 수'
FROM regions r
LEFT JOIN companies c ON c.region_id = r.id
GROUP BY r.id, r.region_name
ORDER BY r.display_order;

-- 2. region_id가 NULL인 거래처 확인 (매핑 실패)
SELECT
  customerRegion AS '매핑 실패 지역',
  COUNT(*) AS '거래처 수'
FROM companies
WHERE customerRegion IS NOT NULL
  AND customerRegion != ''
  AND region_id IS NULL
GROUP BY customerRegion
ORDER BY COUNT(*) DESC
LIMIT 20;

-- 3. 전체 통계
SELECT
  '전체 거래처' AS '구분',
  COUNT(*) AS '개수'
FROM companies
UNION ALL
SELECT
  'region_id 매핑 완료',
  COUNT(*)
FROM companies
WHERE region_id IS NOT NULL
UNION ALL
SELECT
  'region_id NULL (매핑 실패)',
  COUNT(*)
FROM companies
WHERE customerRegion IS NOT NULL AND customerRegion != '' AND region_id IS NULL;
