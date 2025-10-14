-- ============================================
-- KPI 테이블 컬럼명 한글 → 영문 변경
-- 파일: backend/migrations/013_rename_kpi_columns_to_english.sql
-- Created by: Claude Code Assistant
-- Date: 2025
-- 설명: KPI_SALES, KPI_ADMIN 테이블의 한글 컬럼명을 영문으로 변경
-- 전략: ALTER TABLE ... CHANGE COLUMN (컬럼명 변경 + 데이터 유지)
-- ============================================

USE railway;

-- ============================================
-- 1. KPI_SALES 테이블 컬럼명 변경
-- ============================================

SELECT '🔄 KPI_SALES 테이블 컬럼명 변경 시작...' as status;

-- 거래처 관리 지표 (4개)
ALTER TABLE kpi_sales
    CHANGE COLUMN `담당거래처` `assignedCompanies` INT DEFAULT 0 COMMENT '담당 거래처 수',
    CHANGE COLUMN `활성거래처` `activeCompanies` INT DEFAULT 0 COMMENT '활성 거래처 수',
    CHANGE COLUMN `활성화율` `activationRate` DECIMAL(5,2) DEFAULT 0 COMMENT '활성화율 (%)',
    CHANGE COLUMN `주요제품판매거래처` `mainProductCompanies` INT DEFAULT 0 COMMENT '주요제품 판매 거래처 수';

SELECT '✅ 거래처 관리 지표 (4개) 변경 완료' as status;

-- 목표 달성 지표 (2개)
ALTER TABLE kpi_sales
    CHANGE COLUMN `회사배정기준대비달성율` `companyTargetAchievementRate` DECIMAL(10,2) DEFAULT 0 COMMENT '회사 배정 기준 대비 달성율 (%)',
    CHANGE COLUMN `주요고객처목표달성율` `majorCustomerTargetRate` DECIMAL(5,2) DEFAULT 0 COMMENT '주요 고객처 목표 달성율 (%)';

SELECT '✅ 목표 달성 지표 (2개) 변경 완료' as status;

-- 매출 성과 지표 (3개)
ALTER TABLE kpi_sales
    CHANGE COLUMN `누적매출금액` `accumulatedSales` DECIMAL(15,2) DEFAULT 0 COMMENT '누적 매출 금액 (원)',
    CHANGE COLUMN `주요제품매출액` `mainProductSales` DECIMAL(15,2) DEFAULT 0 COMMENT '주요제품 매출액 (원)',
    CHANGE COLUMN `매출집중도` `salesConcentration` DECIMAL(15,2) DEFAULT 0 COMMENT '매출 집중도 (원/개사/월)';

SELECT '✅ 매출 성과 지표 (3개) 변경 완료' as status;

-- 재무 및 기여도 지표 (5개)
ALTER TABLE kpi_sales
    CHANGE COLUMN `누적수금금액` `accumulatedCollection` DECIMAL(15,2) DEFAULT 0 COMMENT '누적 수금 금액 (원)',
    CHANGE COLUMN `매출채권잔액` `accountsReceivable` DECIMAL(15,2) DEFAULT 0 COMMENT '매출 채권 잔액 (원)',
    CHANGE COLUMN `주요제품매출비율` `mainProductSalesRatio` DECIMAL(5,2) DEFAULT 0 COMMENT '주요제품 매출 비율 (%)',
    CHANGE COLUMN `전체매출기여도` `totalSalesContribution` DECIMAL(5,2) DEFAULT 0 COMMENT '전체 매출 기여도 (%)',
    CHANGE COLUMN `주요제품매출기여도` `mainProductContribution` DECIMAL(5,2) DEFAULT 0 COMMENT '주요제품 매출 기여도 (%)';

SELECT '✅ 재무 및 기여도 지표 (5개) 변경 완료' as status;

-- 순위 및 누적 지표 (4개) - 이미 존재하는 경우에만 변경
ALTER TABLE kpi_sales
    CHANGE COLUMN `전체매출기여도순위` `totalSalesContributionRank` INT DEFAULT NULL COMMENT '전체매출기여도 순위',
    CHANGE COLUMN `전체매출누적기여도` `cumulativeTotalSalesContribution` DECIMAL(5,2) DEFAULT NULL COMMENT '전체매출 누적기여도',
    CHANGE COLUMN `주요제품매출기여도순위` `mainProductContributionRank` INT DEFAULT NULL COMMENT '주요제품매출기여도 순위',
    CHANGE COLUMN `주요제품매출누적기여도` `cumulativeMainProductContribution` DECIMAL(5,2) DEFAULT NULL COMMENT '주요제품매출 누적기여도';

SELECT '✅ 순위 및 누적 지표 (4개) 변경 완료' as status;

-- 메타 정보 (1개)
ALTER TABLE kpi_sales
    CHANGE COLUMN `현재월수` `currentMonths` INT DEFAULT 0 COMMENT '입사 후 경과 월수';

SELECT '✅ 메타 정보 (1개) 변경 완료' as status;

-- ============================================
-- 2. KPI_ADMIN 테이블 컬럼명 변경
-- ============================================

SELECT '🔄 KPI_ADMIN 테이블 컬럼명 변경 시작...' as status;

-- 전사 거래처 지표 (4개)
ALTER TABLE kpi_admin
    CHANGE COLUMN `전체거래처` `totalCompanies` INT DEFAULT 0 COMMENT '전체 거래처 수',
    CHANGE COLUMN `활성거래처` `activeCompanies` INT DEFAULT 0 COMMENT '활성 거래처 수',
    CHANGE COLUMN `활성화율` `activationRate` DECIMAL(5,2) DEFAULT 0 COMMENT '활성화율 (%)',
    CHANGE COLUMN `주요제품판매거래처` `mainProductCompanies` INT DEFAULT 0 COMMENT '주요제품 판매 거래처 수';

SELECT '✅ 전사 거래처 지표 (4개) 변경 완료' as status;

-- 전사 목표 달성 (2개)
ALTER TABLE kpi_admin
    CHANGE COLUMN `회사배정기준대비달성율` `companyTargetAchievementRate` DECIMAL(10,2) DEFAULT 0 COMMENT '회사 배정 기준 대비 달성율 (%)',
    CHANGE COLUMN `주요고객처목표달성율` `majorCustomerTargetRate` DECIMAL(5,2) DEFAULT 0 COMMENT '주요 고객처 목표 달성율 (%)';

SELECT '✅ 전사 목표 달성 (2개) 변경 완료' as status;

-- 전사 매출 지표 (5개)
ALTER TABLE kpi_admin
    CHANGE COLUMN `누적매출금액` `accumulatedSales` DECIMAL(15,2) DEFAULT 0 COMMENT '누적 매출 금액 (원)',
    CHANGE COLUMN `누적수금금액` `accumulatedCollection` DECIMAL(15,2) DEFAULT 0 COMMENT '누적 수금 금액 (원)',
    CHANGE COLUMN `매출채권잔액` `accountsReceivable` DECIMAL(15,2) DEFAULT 0 COMMENT '매출 채권 잔액 (원)',
    CHANGE COLUMN `주요제품매출액` `mainProductSales` DECIMAL(15,2) DEFAULT 0 COMMENT '주요제품 매출액 (원)',
    CHANGE COLUMN `매출집중도` `salesConcentration` DECIMAL(15,2) DEFAULT 0 COMMENT '매출 집중도 (원/개사/월)';

SELECT '✅ 전사 매출 지표 (5개) 변경 완료' as status;

-- 전사 기여도 지표 (1개)
ALTER TABLE kpi_admin
    CHANGE COLUMN `주요제품매출비율` `mainProductSalesRatio` DECIMAL(5,2) DEFAULT 0 COMMENT '주요제품 매출 비율 (%)';

SELECT '✅ 전사 기여도 지표 (1개) 변경 완료' as status;

-- 메타 정보 (2개)
ALTER TABLE kpi_admin
    CHANGE COLUMN `영업담당자수` `salesRepCount` INT DEFAULT 0 COMMENT '재직 중인 영업담당자 수',
    CHANGE COLUMN `현재월수` `currentMonths` INT DEFAULT 0 COMMENT '현재 월 (0-11)';

SELECT '✅ 메타 정보 (2개) 변경 완료' as status;

-- ============================================
-- 3. 인덱스 업데이트
-- ============================================

SELECT '🔄 인덱스 업데이트 시작...' as status;

-- 기존 인덱스 삭제 (한글 컬럼명 기반)
ALTER TABLE kpi_sales DROP INDEX IF EXISTS idx_contribution;
ALTER TABLE kpi_sales DROP INDEX IF EXISTS idx_sales;

-- 새 인덱스 생성 (영문 컬럼명 기반)
ALTER TABLE kpi_sales ADD INDEX idx_contribution (totalSalesContribution, mainProductContribution);
ALTER TABLE kpi_sales ADD INDEX idx_sales (accumulatedSales DESC, mainProductSales DESC);

SELECT '✅ 인덱스 업데이트 완료' as status;

-- ============================================
-- 4. 뷰 재생성 (영문 컬럼명 기반)
-- ============================================

SELECT '🔄 뷰 재생성 시작...' as status;

-- 전체매출 기여도 순위 뷰
DROP VIEW IF EXISTS view_kpi_ranking_total_sales;

CREATE VIEW view_kpi_ranking_total_sales AS
SELECT
    employeeId,
    employeeName,
    assignedCompanies,
    accumulatedSales,
    totalSalesContribution,
    totalSalesContributionRank as `rank`,
    lastUpdated
FROM kpi_sales
WHERE totalSalesContribution > 0
ORDER BY accumulatedSales DESC;

-- 주요제품매출 기여도 순위 뷰
DROP VIEW IF EXISTS view_kpi_ranking_main_product_sales;

CREATE VIEW view_kpi_ranking_main_product_sales AS
SELECT
    employeeId,
    employeeName,
    mainProductCompanies,
    mainProductSales,
    mainProductContribution,
    mainProductContributionRank as `rank`,
    lastUpdated
FROM kpi_sales
WHERE mainProductContribution > 0
ORDER BY mainProductSales DESC;

SELECT '✅ 뷰 재생성 완료' as status;

-- ============================================
-- 5. 검증
-- ============================================

SELECT '🔍 변경사항 검증...' as status;

-- KPI_SALES 테이블 구조 확인
SELECT '=== KPI_SALES 테이블 구조 ===' as info;
SHOW COLUMNS FROM kpi_sales;

-- KPI_ADMIN 테이블 구조 확인
SELECT '=== KPI_ADMIN 테이블 구조 ===' as info;
SHOW COLUMNS FROM kpi_admin;

-- 데이터 샘플 확인
SELECT '=== KPI_SALES 데이터 샘플 ===' as info;
SELECT employeeName, assignedCompanies, activeCompanies, accumulatedSales, totalSalesContribution
FROM kpi_sales
LIMIT 3;

SELECT '=== KPI_ADMIN 데이터 샘플 ===' as info;
SELECT totalCompanies, activeCompanies, accumulatedSales, salesRepCount
FROM kpi_admin
LIMIT 1;

-- ============================================
-- 완료
-- ============================================

SELECT '✅ KPI 테이블 컬럼명 영문 변경 완료!' as status;
SELECT 'ℹ️  다음 단계: 애플리케이션 코드 업데이트 필요' as next_step;
