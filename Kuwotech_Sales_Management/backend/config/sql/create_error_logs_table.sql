-- ============================================
-- 에러 로그 테이블 생성
-- ============================================

CREATE TABLE IF NOT EXISTS error_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userName VARCHAR(100),                    -- 사용자 이름
  userRole VARCHAR(50),                     -- 사용자 역할 (관리자/영업담당)
  errorMessage TEXT NOT NULL,               -- 에러 메시지
  errorStack TEXT,                          -- 에러 스택 트레이스
  pageUrl VARCHAR(500),                     -- 에러 발생 페이지
  browserInfo VARCHAR(200),                 -- 브라우저 정보
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP, -- 발생 시간
  INDEX idx_timestamp (timestamp),
  INDEX idx_userName (userName)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
