-- ============================================
-- 부서 테이블 생성
-- ============================================

-- departments 테이블이 이미 존재하면 삭제
DROP TABLE IF EXISTS departments;

-- departments 테이블 생성
CREATE TABLE departments (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '부서 ID',
    department_name VARCHAR(100) NOT NULL COMMENT '부서명',
    department_code VARCHAR(50) UNIQUE COMMENT '부서코드',
    display_order INT DEFAULT 0 COMMENT '표시 순서',
    is_active BOOLEAN DEFAULT TRUE COMMENT '활성 상태',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
    INDEX idx_department_name (department_name),
    INDEX idx_active (is_active),
    INDEX idx_display_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='부서 마스터';

-- 기본 부서 데이터 삽입
INSERT INTO departments (department_name, department_code, display_order, is_active) VALUES
('영업1팀', 'SALES_1', 1, TRUE),
('영업2팀', 'SALES_2', 2, TRUE),
('영업3팀', 'SALES_3', 3, TRUE),
('관리팀', 'ADMIN', 4, TRUE),
('기술팀', 'TECH', 5, TRUE);

-- 결과 확인
SELECT * FROM departments ORDER BY display_order;
