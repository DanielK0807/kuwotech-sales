-- ============================================
-- 008: company_history 테이블 생성 (이력 관리)
-- ============================================
-- 실행일: 2025-10-06
-- 목적: 거래처 정보 변경 이력 추적 및 감사

-- 1. company_history 테이블 생성
CREATE TABLE IF NOT EXISTS company_history (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '이력 ID',
  company_key VARCHAR(100) NOT NULL COMMENT '거래처 키 (companies.keyValue)',
  action VARCHAR(20) NOT NULL COMMENT '작업 유형 (INSERT, UPDATE, DELETE)',
  changed_by VARCHAR(100) NOT NULL COMMENT '변경한 사용자',
  changed_by_role VARCHAR(50) COMMENT '변경자 역할 (영업담당, 관리자)',
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '변경 시각',

  -- 변경 내용 (JSON 형식)
  old_data JSON COMMENT '변경 전 데이터 (JSON)',
  new_data JSON COMMENT '변경 후 데이터 (JSON)',
  changes JSON COMMENT '변경된 필드만 (JSON)',

  -- 추가 정보
  change_reason VARCHAR(500) COMMENT '변경 사유 (옵션)',
  ip_address VARCHAR(45) COMMENT '변경자 IP 주소',
  user_agent TEXT COMMENT '변경자 브라우저 정보',

  -- 인덱스
  INDEX idx_company_key (company_key),
  INDEX idx_changed_by (changed_by),
  INDEX idx_changed_at (changed_at),
  INDEX idx_action (action),

  -- 외래키
  CONSTRAINT fk_company_history_company
    FOREIGN KEY (company_key) REFERENCES companies(keyValue)
    ON UPDATE CASCADE ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='거래처 변경 이력 테이블';

-- 2. 확인
SELECT 'company_history 테이블 생성 완료' AS status;
DESCRIBE company_history;
