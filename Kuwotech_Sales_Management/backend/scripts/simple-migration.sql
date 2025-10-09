-- regions 테이블 생성
CREATE TABLE IF NOT EXISTS regions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  region_name VARCHAR(50) NOT NULL UNIQUE,
  region_code VARCHAR(10) NOT NULL UNIQUE,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_region_name (region_name),
  INDEX idx_region_code (region_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 시/도 데이터 삽입
INSERT IGNORE INTO regions (region_name, region_code, display_order) VALUES
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
  ('제주특별자치도', 'JEJU', 17);

-- companies 테이블에 region_id 추가 (이미 있으면 무시됨)
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS region_id INT NULL AFTER customerRegion;

-- 외래키 제약조건 추가 (이미 있으면 에러 발생하지만 무시)
ALTER TABLE companies
ADD CONSTRAINT fk_companies_region FOREIGN KEY (region_id) REFERENCES regions(id) ON UPDATE CASCADE ON DELETE SET NULL;

-- 인덱스 추가
ALTER TABLE companies ADD INDEX IF NOT EXISTS idx_region_id (region_id);
