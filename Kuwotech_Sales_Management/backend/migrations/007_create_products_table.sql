-- ============================================
-- 007: products 테이블 생성 및 기본 데이터 삽입
-- ============================================

-- 1. products 테이블 생성
CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '제품 ID',
  productName VARCHAR(100) NOT NULL COMMENT '제품명',
  category VARCHAR(50) DEFAULT NULL COMMENT '제품 카테고리',
  priority INT DEFAULT 0 COMMENT '우선순위 (높을수록 먼저 표시)',
  isActive BOOLEAN DEFAULT TRUE COMMENT '활성 상태',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_product_name (productName),
  INDEX idx_category (category),
  INDEX idx_active (isActive)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. 기본 제품 데이터 삽입 (예시)
INSERT IGNORE INTO products (productName, category, priority, isActive) VALUES
  ('제품 A', '카테고리1', 100, TRUE),
  ('제품 B', '카테고리1', 90, TRUE),
  ('제품 C', '카테고리2', 80, TRUE),
  ('제품 D', '카테고리2', 70, TRUE),
  ('제품 E', '카테고리3', 60, TRUE);

-- 3. 확인
SELECT * FROM products ORDER BY priority DESC, productName ASC;
