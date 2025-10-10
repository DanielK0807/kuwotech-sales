-- ============================================
-- regions 테이블 업데이트 스크립트
-- 실제 companies 테이블의 customerRegion 값으로 regions 테이블 재구성
-- Created: 2025-01-27
-- ============================================

-- Step 1: 현재 companies 테이블에서 사용 중인 고유한 customerRegion 값 확인
SELECT DISTINCT customerRegion
FROM companies
WHERE customerRegion IS NOT NULL
  AND customerRegion != ''
ORDER BY customerRegion;

-- Step 2: 기존 regions 테이블 백업 (선택사항)
-- CREATE TABLE regions_backup AS SELECT * FROM regions;

-- Step 3: 기존 regions 테이블 데이터 삭제
-- TRUNCATE TABLE regions;

-- Step 4: 실제 데이터 기반으로 regions 테이블 재구성
-- 위의 SELECT 결과를 확인한 후, 아래 INSERT 문을 실제 데이터에 맞게 수정하세요
--
-- 예시:
-- INSERT INTO regions (region_name, region_code, display_order, is_active) VALUES
-- ('서울', 'SEOUL', 1, TRUE),
-- ('경기', 'GYEONGGI', 2, TRUE),
-- ('인천', 'INCHEON', 3, TRUE),
-- ('강원', 'GANGWON', 4, TRUE),
-- ('충북', 'CHUNGBUK', 5, TRUE),
-- ('충남', 'CHUNGNAM', 6, TRUE),
-- ('대전', 'DAEJEON', 7, TRUE),
-- ('세종', 'SEJONG', 8, TRUE),
-- ('전북', 'JEONBUK', 9, TRUE),
-- ('전남', 'JEONNAM', 10, TRUE),
-- ('광주', 'GWANGJU', 11, TRUE),
-- ('경북', 'GYEONGBUK', 12, TRUE),
-- ('경남', 'GYEONGNAM', 13, TRUE),
-- ('대구', 'DAEGU', 14, TRUE),
-- ('울산', 'ULSAN', 15, TRUE),
-- ('부산', 'BUSAN', 16, TRUE),
-- ('제주', 'JEJU', 17, TRUE);

-- ============================================
-- 사용 방법:
-- 1. Step 1의 SELECT 쿼리를 실행하여 실제 데이터 확인
-- 2. 확인된 데이터를 기반으로 Step 4의 INSERT 문 작성
-- 3. Step 3의 TRUNCATE 주석 해제하고 실행
-- 4. Step 4의 INSERT 문 실행
-- ============================================
