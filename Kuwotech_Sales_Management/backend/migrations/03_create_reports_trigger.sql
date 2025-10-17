-- ============================================
-- 03. reports 실적 확정 시 companies 자동 업데이트 트리거
-- ============================================
-- 목적: 영업담당자가 실적보고서 확인에서 매출금액 확정 시 거래처 정보 자동 갱신
-- 실행일: 2025-10-14
-- 참고: confirmationData 업데이트 시 실행 (영업담당자 확인 개념)

-- ==========================================
-- 기존 트리거 삭제 (있으면)
-- ==========================================
DROP TRIGGER IF EXISTS trigger_update_company_on_approval;
DROP TRIGGER IF EXISTS trigger_update_company_on_confirmation;

-- ==========================================
-- 트리거 생성
-- ==========================================
CREATE TRIGGER trigger_update_company_on_confirmation
AFTER UPDATE ON reports
FOR EACH ROW
BEGIN
  DECLARE final_collection DECIMAL(15,2);
  DECLARE final_sales DECIMAL(15,2);
  DECLARE vat_included BOOLEAN;
  DECLARE product_list TEXT;
  DECLARE activity_summary TEXT;
  DECLARE confirmation_date DATE;

  -- confirmationData가 변경되었을 때만 실행 (영업담당자가 확정)
  -- 그리고 actualSalesAmount가 0보다 클 때만 실행
  IF (NEW.confirmationData IS NOT NULL AND
      (OLD.confirmationData IS NULL OR NEW.confirmationData != OLD.confirmationData) AND
      COALESCE(NEW.actualSalesAmount, 0) > 0) THEN

    -- 1. 기존 테이블 필드에서 값 추출
    SET final_collection = COALESCE(NEW.actualCollectionAmount, 0);
    SET final_sales = COALESCE(NEW.actualSalesAmount, 0);
    SET vat_included = COALESCE(NEW.includeVAT, FALSE);
    SET product_list = NEW.soldProducts;
    SET activity_summary = NEW.activityNotes;

    -- 확정 날짜: processedDate가 있으면 사용, 없으면 현재 날짜
    SET confirmation_date = COALESCE(NEW.processedDate, CURDATE());

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

      -- 최종결제일/금액 (매출금액 확정 날짜와 금액)
      lastPaymentDate = confirmation_date,
      lastPaymentAmount = final_sales,

      -- 누적 수금금액
      accumulatedCollection = COALESCE(accumulatedCollection, 0) + final_collection,

      -- 누적 매출금액 (부가세 처리)
      accumulatedSales = COALESCE(accumulatedSales, 0) +
        IF(vat_included = 1, ROUND(final_sales / 1.1, 0), final_sales),

      -- 영업활동(특이사항) 추가
      activityNotes = CONCAT(
        COALESCE(activityNotes, ''),
        IF(activityNotes IS NOT NULL AND activityNotes != '', '\n---\n', ''),
        '[', DATE_FORMAT(confirmation_date, '%Y-%m-%d'), '] ',
        COALESCE(activity_summary, '')
      )

    WHERE keyValue = NEW.companyId;

  END IF;
END;

-- ==========================================
-- 결과 확인
-- ==========================================
SELECT '✅ reports 확인 트리거 생성 완료' AS status;

SHOW TRIGGERS WHERE `Trigger` = 'trigger_update_company_on_approval';
