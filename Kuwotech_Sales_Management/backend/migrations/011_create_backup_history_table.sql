-- ============================================
-- 백업 이력 테이블 생성
-- ============================================
-- 작성일: 2025-10-11
-- 설명: 시스템 설정 백업 및 전체 백업 이력 저장

CREATE TABLE IF NOT EXISTS backupHistory (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '백업 이력 ID',
    backupType VARCHAR(50) NOT NULL COMMENT '백업 타입 (settings, full_backup)',
    backupBy VARCHAR(100) NOT NULL COMMENT '백업 실행자',
    backupAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '백업 일시',
    format VARCHAR(20) DEFAULT 'excel' COMMENT '백업 형식 (excel, json, csv)',
    memo TEXT COMMENT '백업 메모',
    selectedSheets JSON COMMENT '선택된 시트 정보',
    metadata JSON COMMENT '추가 메타데이터 (파일크기, 설정값 등)',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
    INDEX idx_backup_type (backupType),
    INDEX idx_backup_by (backupBy),
    INDEX idx_backup_at (backupAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='백업 이력 테이블';
