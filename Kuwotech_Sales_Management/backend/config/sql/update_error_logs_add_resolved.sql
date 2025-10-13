-- ============================================
-- 에러 로그 테이블에 해결 상태 컬럼 추가
-- ============================================

ALTER TABLE error_logs
ADD COLUMN IF NOT EXISTS resolved TINYINT(1) DEFAULT 0 COMMENT '해결 여부 (0: 미해결, 1: 해결)',
ADD COLUMN IF NOT EXISTS resolvedBy VARCHAR(100) DEFAULT NULL COMMENT '해결한 사람',
ADD COLUMN IF NOT EXISTS resolvedAt DATETIME DEFAULT NULL COMMENT '해결 시간',
ADD COLUMN IF NOT EXISTS resolutionNote TEXT DEFAULT NULL COMMENT '해결 메모';

-- 인덱스 추가 (해결 여부로 필터링 시 성능 향상)
ALTER TABLE error_logs
ADD INDEX IF NOT EXISTS idx_resolved (resolved);
