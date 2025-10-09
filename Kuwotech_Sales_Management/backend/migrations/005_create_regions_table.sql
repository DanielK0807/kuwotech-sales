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
