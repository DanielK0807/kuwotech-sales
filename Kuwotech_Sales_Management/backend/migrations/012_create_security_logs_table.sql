-- ============================================
-- 보안 로그 테이블 생성
-- ============================================
-- 작성일: 2025-10-11
-- 설명: 로그인/로그아웃 및 보안 이벤트 로그 저장

CREATE TABLE IF NOT EXISTS securityLogs (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '보안 로그 ID',
    eventType VARCHAR(50) NOT NULL COMMENT '이벤트 타입 (LOGIN_SUCCESS, LOGIN_FAILURE, LOGOUT, SUSPICIOUS_INPUT 등)',
    userId VARCHAR(100) COMMENT '사용자 ID',
    username VARCHAR(100) COMMENT '사용자명',
    data JSON COMMENT '이벤트 데이터 (로그인 시도 횟수, 타임스탬프 등)',
    fingerprint VARCHAR(50) COMMENT '디바이스 핑거프린트',
    ipAddress VARCHAR(45) COMMENT 'IP 주소 (IPv4/IPv6)',
    userAgent TEXT COMMENT '브라우저 User-Agent',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
    INDEX idx_event_type (eventType),
    INDEX idx_user_id (userId),
    INDEX idx_created_at (createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='보안 로그 테이블';
