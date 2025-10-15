-- ============================================
-- KUWOTECH 영업관리 시스템
-- 마이그레이션 014: companies 테이블에 고객소식 필드 추가
-- 작성일: 2025-01-27
-- ============================================

-- 1. activityNotes 컬럼 추가 (관리자 엑셀 업로드 "고객소식")
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS activityNotes TEXT COMMENT '고객소식 (관리자 엑셀 업로드)'
AFTER businessActivity;

-- 2. customerNewsDate 컬럼 추가 (고객소식 작성일)
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS customerNewsDate DATE COMMENT '고객소식 작성일'
AFTER activityNotes;

-- 3. 기존 데이터에 대해 activityNotes가 있으면 날짜를 2025-10-15로 설정
UPDATE companies
SET customerNewsDate = '2025-10-15'
WHERE activityNotes IS NOT NULL AND activityNotes != '' AND customerNewsDate IS NULL;

-- 완료
SELECT '✅ activityNotes 및 customerNewsDate 컬럼 추가 완료' AS result;
