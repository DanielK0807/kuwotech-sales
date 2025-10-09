-- ============================================
-- 03. reports 승인 시 companies 자동 업데이트 트리거
-- ============================================
-- 목적: 실적보고서 승인 시 거래처 정보 자동 갱신
-- 실행일: 2025-10-07
-- 참고: 기존 reports 테이블 구조에 맞춤

-- ==========================================
-- 기존 트리거 삭제 (있으면)
-- ==========================================
DROP TRIGGER IF EXISTS trigger_update_company_on_approval;

-- ==========================================
-- 트리거 생성
-- ==========================================
CREATE TRIGGER trigger_update_company_on_approval
AFTER UPDATE ON reports
FOR EACH ROW
BEGIN
  DECLARE final_collection DECIMAL(15,2);
  DECLARE final_sales DECIMAL(15,2);
  DECLARE vat_included BOOLEAN;
  DECLARE product_list TEXT;
  DECLARE activity_summary TEXT;

  -- 상태가 '승인'으로 변경되었을 때만 실행
  IF NEW.status = '승인' AND OLD.status != '승인' THEN

    -- 1. 기존 테이블 필드에서 값 추출
    SET final_collection = COALESCE(NEW.actualCollectionAmount, 0);
    SET final_sales = COALESCE(NEW.actualSalesAmount, 0);
    SET vat_included = COALESCE(NEW.includeVAT, FALSE);
    SET product_list = NEW.soldProducts;
    SET activity_summary = NEW.activityNotes;

    -- 2. companies 테이블 업데이트
    UPDATE companies
    SET
      -- 판매제품 목록 업데이트
      salesProduct = IF(
        product_list IS NOT NULL AND product_list != '',
        CONCAT(
          COALESCE(salesProduct, ''),
          IF(salesProduct IS NOT NULL AND salesProduct != '', ', ', ''),
          product_list
        ),
        salesProduct
      ),

      -- 마지막 결제일/금액
      lastPaymentDate = NEW.processedDate,
      lastPaymentAmount = final_collection,

      -- 누적 수금금액
      accumulatedCollection = COALESCE(accumulatedCollection, 0) + final_collection,

      -- 누적 매출금액 (부가세 처리)
      accumulatedSales = COALESCE(accumulatedSales, 0) +
        IF(vat_included = 1, ROUND(final_sales / 1.1, 0), final_sales),

      -- 영업활동(특이사항) 추가
      activityNotes = CONCAT(
        COALESCE(activityNotes, ''),
        IF(activityNotes IS NOT NULL AND activityNotes != '', '\n---\n', ''),
        '[', DATE_FORMAT(NEW.processedDate, '%Y-%m-%d'), '] ',
        COALESCE(activity_summary, '')
      )

    WHERE keyValue = NEW.companyId;

  END IF;
END;

-- ==========================================
-- 결과 확인
-- ==========================================
SELECT '✅ reports 승인 트리거 생성 완료' AS status;

SHOW TRIGGERS WHERE `Trigger` = 'trigger_update_company_on_approval';
