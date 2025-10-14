-- ============================================
-- Railway 대시보드에서 실행할 SQL
-- 이 파일의 내용을 Railway > Database > Query 탭에 복사/붙여넣기하여 실행
-- ============================================

-- ============================================
-- 1. KPI_SALES 테이블 컬럼명 변경
-- ============================================

-- 거래처 관리 지표 (4개)
ALTER TABLE kpi_sales
    CHANGE COLUMN `담당거래처` `assignedCompanies` INT DEFAULT 0 COMMENT '담당 거래처 수',
    CHANGE COLUMN `활성거래처` `activeCompanies` INT DEFAULT 0 COMMENT '활성 거래처 수',
    CHANGE COLUMN `활성화율` `activationRate` DECIMAL(5,2) DEFAULT 0 COMMENT '활성화율 (%)',
    CHANGE COLUMN `주요제품판매거래처` `mainProductCompanies` INT DEFAULT 0 COMMENT '주요제품 판매 거래처 수';

-- 목표 달성 지표 (2개)
ALTER TABLE kpi_sales
    CHANGE COLUMN `회사배정기준대비달성율` `companyTargetAchievementRate` DECIMAL(10,2) DEFAULT 0 COMMENT '회사 배정 기준 대비 달성율 (%)',
    CHANGE COLUMN `주요고객처목표달성율` `majorCustomerTargetRate` DECIMAL(5,2) DEFAULT 0 COMMENT '주요 고객처 목표 달성율 (%)';

-- 매출 성과 지표 (3개)
ALTER TABLE kpi_sales
    CHANGE COLUMN `누적매출금액` `accumulatedSales` DECIMAL(15,2) DEFAULT 0 COMMENT '누적 매출 금액 (원)',
    CHANGE COLUMN `주요제품매출액` `mainProductSales` DECIMAL(15,2) DEFAULT 0 COMMENT '주요제품 매출액 (원)',
    CHANGE COLUMN `매출집중도` `salesConcentration` DECIMAL(15,2) DEFAULT 0 COMMENT '매출 집중도 (원/개사/월)';

-- 재무 및 기여도 지표 (5개)
ALTER TABLE kpi_sales
    CHANGE COLUMN `누적수금금액` `accumulatedCollection` DECIMAL(15,2) DEFAULT 0 COMMENT '누적 수금 금액 (원)',
    CHANGE COLUMN `매출채권잔액` `accountsReceivable` DECIMAL(15,2) DEFAULT 0 COMMENT '매출 채권 잔액 (원)',
    CHANGE COLUMN `주요제품매출비율` `mainProductSalesRatio` DECIMAL(5,2) DEFAULT 0 COMMENT '주요제품 매출 비율 (%)',
    CHANGE COLUMN `전체매출기여도` `totalSalesContribution` DECIMAL(5,2) DEFAULT 0 COMMENT '전체 매출 기여도 (%)',
    CHANGE COLUMN `주요제품매출기여도` `mainProductContribution` DECIMAL(5,2) DEFAULT 0 COMMENT '주요제품 매출 기여도 (%)';

-- 순위 및 누적 지표 (4개)
ALTER TABLE kpi_sales
    CHANGE COLUMN `전체매출기여도순위` `totalSalesContributionRank` INT DEFAULT NULL COMMENT '전체매출기여도 순위',
    CHANGE COLUMN `전체매출누적기여도` `cumulativeTotalSalesContribution` DECIMAL(5,2) DEFAULT NULL COMMENT '전체매출 누적기여도',
    CHANGE COLUMN `주요제품매출기여도순위` `mainProductContributionRank` INT DEFAULT NULL COMMENT '주요제품매출기여도 순위',
    CHANGE COLUMN `주요제품매출누적기여도` `cumulativeMainProductContribution` DECIMAL(5,2) DEFAULT NULL COMMENT '주요제품매출 누적기여도';

-- 메타 정보 (1개)
ALTER TABLE kpi_sales
    CHANGE COLUMN `현재월수` `currentMonths` INT DEFAULT 0 COMMENT '입사 후 경과 월수';

-- ============================================
-- 2. KPI_ADMIN 테이블 컬럼명 변경
-- ============================================

-- 전사 거래처 지표 (4개)
ALTER TABLE kpi_admin
    CHANGE COLUMN `전체거래처` `totalCompanies` INT DEFAULT 0 COMMENT '전체 거래처 수',
    CHANGE COLUMN `활성거래처` `activeCompanies` INT DEFAULT 0 COMMENT '활성 거래처 수',
    CHANGE COLUMN `활성화율` `activationRate` DECIMAL(5,2) DEFAULT 0 COMMENT '활성화율 (%)',
    CHANGE COLUMN `주요제품판매거래처` `mainProductCompanies` INT DEFAULT 0 COMMENT '주요제품 판매 거래처 수';

-- 전사 목표 달성 (2개)
ALTER TABLE kpi_admin
    CHANGE COLUMN `회사배정기준대비달성율` `companyTargetAchievementRate` DECIMAL(10,2) DEFAULT 0 COMMENT '회사 배정 기준 대비 달성율 (%)',
    CHANGE COLUMN `주요고객처목표달성율` `majorCustomerTargetRate` DECIMAL(5,2) DEFAULT 0 COMMENT '주요 고객처 목표 달성율 (%)';

-- 전사 매출 지표 (5개)
ALTER TABLE kpi_admin
    CHANGE COLUMN `누적매출금액` `accumulatedSales` DECIMAL(15,2) DEFAULT 0 COMMENT '누적 매출 금액 (원)',
    CHANGE COLUMN `누적수금금액` `accumulatedCollection` DECIMAL(15,2) DEFAULT 0 COMMENT '누적 수금 금액 (원)',
    CHANGE COLUMN `매출채권잔액` `accountsReceivable` DECIMAL(15,2) DEFAULT 0 COMMENT '매출 채권 잔액 (원)',
    CHANGE COLUMN `주요제품매출액` `mainProductSales` DECIMAL(15,2) DEFAULT 0 COMMENT '주요제품 매출액 (원)',
    CHANGE COLUMN `매출집중도` `salesConcentration` DECIMAL(15,2) DEFAULT 0 COMMENT '매출 집중도 (원/개사/월)';

-- 전사 기여도 지표 (1개)
ALTER TABLE kpi_admin
    CHANGE COLUMN `주요제품매출비율` `mainProductSalesRatio` DECIMAL(5,2) DEFAULT 0 COMMENT '주요제품 매출 비율 (%)';

-- 메타 정보 (2개)
ALTER TABLE kpi_admin
    CHANGE COLUMN `영업담당자수` `salesRepCount` INT DEFAULT 0 COMMENT '재직 중인 영업담당자 수',
    CHANGE COLUMN `현재월수` `currentMonths` INT DEFAULT 0 COMMENT '현재 월 (0-11)';

-- ============================================
-- 3. 인덱스 업데이트
-- ============================================

ALTER TABLE kpi_sales DROP INDEX IF EXISTS idx_contribution;
ALTER TABLE kpi_sales DROP INDEX IF EXISTS idx_sales;

ALTER TABLE kpi_sales ADD INDEX idx_contribution (totalSalesContribution, mainProductContribution);
ALTER TABLE kpi_sales ADD INDEX idx_sales (accumulatedSales DESC, mainProductSales DESC);

-- ============================================
-- 4. 뷰 재생성
-- ============================================

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

-- ============================================
-- 5. 검증
-- ============================================

SELECT '✅ KPI 테이블 컬럼명 영문 변경 완료!' as status;

-- 변경 확인
SELECT COUNT(*) as kpi_sales_count FROM kpi_sales;
SELECT COUNT(*) as kpi_admin_count FROM kpi_admin;

-- 영문 컬럼명 확인 (에러 없으면 성공)
SELECT assignedCompanies, activeCompanies, accumulatedSales, totalSalesContribution
FROM kpi_sales LIMIT 1;

SELECT totalCompanies, activeCompanies, accumulatedSales, salesRepCount
FROM kpi_admin LIMIT 1;
