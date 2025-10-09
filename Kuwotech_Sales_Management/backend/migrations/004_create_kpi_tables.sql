-- ============================================
-- KPI 테이블 생성 마이그레이션
-- 파일: backend/migrations/004_create_kpi_tables.sql
-- Created by: Daniel.K
-- Date: 2025-01-28
-- 설명: 영업담당별 KPI 및 전사 KPI 캐시 테이블
-- ============================================

-- ============================================
-- 1. 영업담당별 KPI 테이블
-- ============================================

DROP TABLE IF EXISTS kpi_sales;

CREATE TABLE kpi_sales (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    employeeId VARCHAR(36) NOT NULL COMMENT '직원 ID',
    employeeName VARCHAR(50) NOT NULL COMMENT '직원 이름',

    -- === 거래처 관리 지표 (4개) ===
    담당거래처 INT DEFAULT 0 COMMENT '담당 거래처 수',
    활성거래처 INT DEFAULT 0 COMMENT '활성 거래처 수',
    활성화율 DECIMAL(5,2) DEFAULT 0 COMMENT '활성화율 (%)',
    주요제품판매거래처 INT DEFAULT 0 COMMENT '주요제품 판매 거래처 수',

    -- === 목표 달성 지표 (2개) ===
    회사배정기준대비달성율 DECIMAL(10,2) DEFAULT 0 COMMENT '회사 배정 기준 대비 달성율 (%)',
    주요고객처목표달성율 DECIMAL(5,2) DEFAULT 0 COMMENT '주요 고객처 목표 달성율 (%)',

    -- === 매출 성과 지표 (3개) ===
    누적매출금액 DECIMAL(15,2) DEFAULT 0 COMMENT '누적 매출 금액 (원)',
    주요제품매출액 DECIMAL(15,2) DEFAULT 0 COMMENT '주요제품 매출액 (원)',
    매출집중도 DECIMAL(15,2) DEFAULT 0 COMMENT '매출 집중도 (원/개사/월)',

    -- === 재무 및 기여도 지표 (5개) ===
    누적수금금액 DECIMAL(15,2) DEFAULT 0 COMMENT '누적 수금 금액 (원)',
    매출채권잔액 DECIMAL(15,2) DEFAULT 0 COMMENT '매출 채권 잔액 (원)',
    주요제품매출비율 DECIMAL(5,2) DEFAULT 0 COMMENT '주요제품 매출 비율 (%)',
    전체매출기여도 DECIMAL(5,2) DEFAULT 0 COMMENT '전체 매출 기여도 (%)',
    주요제품매출기여도 DECIMAL(5,2) DEFAULT 0 COMMENT '주요제품 매출 기여도 (%)',

    -- === 메타 정보 ===
    현재월수 INT DEFAULT 0 COMMENT '입사 후 경과 월수',
    lastUpdated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '최종 업데이트 시간',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성 시간',

    -- === 인덱스 ===
    UNIQUE KEY unique_employee (employeeId),
    INDEX idx_employee_name (employeeName),
    INDEX idx_last_updated (lastUpdated)

    -- === 외래키 제거 (타입 호환성 문제) ===
    -- FOREIGN KEY (employeeId) REFERENCES employees(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='영업담당별 KPI 캐시 테이블';

-- ============================================
-- 2. 전사 KPI 테이블
-- ============================================

DROP TABLE IF EXISTS kpi_admin;

CREATE TABLE kpi_admin (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),

    -- === 전사 거래처 지표 (4개) ===
    전체거래처 INT DEFAULT 0 COMMENT '전체 거래처 수',
    활성거래처 INT DEFAULT 0 COMMENT '활성 거래처 수',
    활성화율 DECIMAL(5,2) DEFAULT 0 COMMENT '활성화율 (%)',
    주요제품판매거래처 INT DEFAULT 0 COMMENT '주요제품 판매 거래처 수',

    -- === 전사 목표 달성 (2개) ===
    회사배정기준대비달성율 DECIMAL(10,2) DEFAULT 0 COMMENT '회사 배정 기준 대비 달성율 (%)',
    주요고객처목표달성율 DECIMAL(5,2) DEFAULT 0 COMMENT '주요 고객처 목표 달성율 (%)',

    -- === 전사 매출 지표 (5개) ===
    누적매출금액 DECIMAL(15,2) DEFAULT 0 COMMENT '누적 매출 금액 (원)',
    누적수금금액 DECIMAL(15,2) DEFAULT 0 COMMENT '누적 수금 금액 (원)',
    매출채권잔액 DECIMAL(15,2) DEFAULT 0 COMMENT '매출 채권 잔액 (원)',
    주요제품매출액 DECIMAL(15,2) DEFAULT 0 COMMENT '주요제품 매출액 (원)',
    매출집중도 DECIMAL(15,2) DEFAULT 0 COMMENT '매출 집중도 (원/개사/월)',

    -- === 전사 기여도 지표 (1개) ===
    주요제품매출비율 DECIMAL(5,2) DEFAULT 0 COMMENT '주요제품 매출 비율 (%)',

    -- === 메타 정보 ===
    영업담당자수 INT DEFAULT 0 COMMENT '재직 중인 영업담당자 수',
    현재월수 INT DEFAULT 0 COMMENT '현재 월 (0-11)',
    lastUpdated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '최종 업데이트 시간',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성 시간',

    -- === 인덱스 ===
    INDEX idx_last_updated (lastUpdated)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='전사 KPI 캐시 테이블';

-- ============================================
-- 3. 초기 데이터 삽입
-- ============================================

-- 전사 KPI 초기 레코드 (단일 레코드만 유지)
INSERT INTO kpi_admin (id)
VALUES ('admin-kpi-singleton')
ON DUPLICATE KEY UPDATE id=id;

-- ============================================
-- 4. 뷰 생성 (관리자 모드용 - 영업담당자별 순위)
-- ============================================

-- 전체매출 기여도 순위 뷰
DROP VIEW IF EXISTS view_kpi_ranking_total_sales;

CREATE VIEW view_kpi_ranking_total_sales AS
SELECT
    employeeId,
    employeeName,
    담당거래처,
    누적매출금액,
    전체매출기여도,
    RANK() OVER (ORDER BY 누적매출금액 DESC) as `rank`,
    lastUpdated
FROM kpi_sales
WHERE 전체매출기여도 > 0
ORDER BY 누적매출금액 DESC;

-- 주요제품매출 기여도 순위 뷰
DROP VIEW IF EXISTS view_kpi_ranking_main_product_sales;

CREATE VIEW view_kpi_ranking_main_product_sales AS
SELECT
    employeeId,
    employeeName,
    주요제품판매거래처,
    주요제품매출액,
    주요제품매출기여도,
    RANK() OVER (ORDER BY 주요제품매출액 DESC) as `rank`,
    lastUpdated
FROM kpi_sales
WHERE 주요제품매출기여도 > 0
ORDER BY 주요제품매출액 DESC;

-- ============================================
-- 5. 인덱스 최적화 (선택사항)
-- ============================================

-- 기여도 조회 성능 향상
ALTER TABLE kpi_sales ADD INDEX idx_contribution (전체매출기여도, 주요제품매출기여도);
ALTER TABLE kpi_sales ADD INDEX idx_sales (누적매출금액 DESC, 주요제품매출액 DESC);

-- ============================================
-- 완료
-- ============================================

SELECT '✅ KPI 테이블 생성 완료!' as status;
