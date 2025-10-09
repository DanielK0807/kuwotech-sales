-- companies 테이블에 새로운 컬럼 추가
-- 실행일: 2025-01-29

ALTER TABLE companies
ADD COLUMN 사업자등록번호 VARCHAR(12) COMMENT '사업자등록번호 (형식: 123-45-67890)',
ADD COLUMN 상세주소 TEXT COMMENT '회사 상세 주소',
ADD COLUMN 전화번호 VARCHAR(20) COMMENT '회사 대표 전화번호',
ADD COLUMN 소개경로 VARCHAR(100) COMMENT '소개해준 사람 또는 방법';

-- 확인: 업데이트된 테이블 구조 조회
DESCRIBE companies;
