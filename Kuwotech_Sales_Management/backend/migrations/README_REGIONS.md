# Regions 테이블 마이그레이션

## 개요

고객사 지역(customerRegion)을 시/도 레벨로 정규화하여 `regions` 테이블로 관리합니다.

**목적**:
- 고객사 주소에서 시/도 레벨만 추출 (예: "서울특별시", "경기도", "부산광역시")
- 상세 주소(구, 동, 번지)는 제외하고 광역 단위만 별도 테이블로 관리
- 지역별 통계 및 필터링 기능 향상

## 데이터 구조

### Before (기존)
```
companies 테이블:
- customerRegion: "서울 중구", "경기 성남시", "경북 안동시" 등
```

### After (변경 후)
```
regions 테이블 (새로 생성):
- id: 1
- region_name: "서울특별시"
- region_code: "SEOUL"

companies 테이블 (region_id 추가):
- customerRegion: "서울 중구" (기존 데이터 유지)
- region_id: 1 (서울특별시)
```

## 마이그레이션 파일

### 1. `005_create_regions_table.sql`
- regions 테이블 생성
- 17개 시/도 기본 데이터 삽입
- companies 테이블에 region_id 컬럼 추가 (외래키 설정)

### 2. `006_populate_region_ids.sql`
- customerRegion에서 시/도 추출
- region_id 자동 매핑
- 결과 검증 쿼리 포함

## 실행 방법

### 방법 1: 자동 실행 스크립트 (권장)

```bash
cd backend
node scripts/run-region-migration.js
```

**실행 결과**:
- regions 테이블 생성 확인
- 시/도별 거래처 수 통계
- 매핑 실패 건수 및 상세 내역

### 방법 2: SQL 직접 실행

```bash
# 1단계: regions 테이블 생성
mysql -h <host> -u <user> -p <database> < migrations/005_create_regions_table.sql

# 2단계: region_id 업데이트
mysql -h <host> -u <user> -p <database> < migrations/006_populate_region_ids.sql
```

### 방법 3: Railway CLI 사용

```bash
railway link
railway run node scripts/run-region-migration.js
```

## 시/도 매핑 규칙

| customerRegion 예시 | region_id | region_name |
|---------------------|-----------|-------------|
| 서울 중구           | 1         | 서울특별시  |
| 경기 성남시         | 9         | 경기도      |
| 부산 강서구         | 2         | 부산광역시  |
| 경북 안동시         | 15        | 경상북도    |

**매핑 로직**:
- customerRegion의 첫 단어(공백 기준)를 추출
- "서울" → "서울특별시", "경기" → "경기도" 등으로 매핑

## 검증 쿼리

### 1. regions 테이블 확인
```sql
SELECT * FROM regions ORDER BY display_order;
```

### 2. 시/도별 거래처 수
```sql
SELECT
  r.region_name AS '시/도',
  COUNT(c.keyValue) AS '거래처 수'
FROM regions r
LEFT JOIN companies c ON c.region_id = r.id
GROUP BY r.id, r.region_name
ORDER BY r.display_order;
```

### 3. 매핑 실패 건수 확인
```sql
SELECT COUNT(*) as '매핑 실패 건수'
FROM companies
WHERE customerRegion IS NOT NULL
  AND customerRegion != ''
  AND region_id IS NULL;
```

### 4. 매핑 실패 상세 목록
```sql
SELECT customerRegion, COUNT(*) as count
FROM companies
WHERE region_id IS NULL
  AND customerRegion IS NOT NULL
GROUP BY customerRegion
ORDER BY count DESC;
```

## 롤백 (필요시)

마이그레이션을 되돌리려면:

```sql
-- companies 테이블에서 region_id 컬럼 제거
ALTER TABLE companies
DROP FOREIGN KEY fk_companies_region,
DROP COLUMN region_id;

-- regions 테이블 삭제
DROP TABLE IF EXISTS regions;
```

## API 활용 예시

### 지역별 거래처 조회
```javascript
// GET /api/companies?region=서울특별시
const companies = await fetch('/api/companies?region=서울특별시');
```

### 지역 목록 조회
```javascript
// GET /api/regions
const regions = await fetch('/api/regions');
```

## 주의사항

1. **백업 필수**: 마이그레이션 실행 전 데이터베이스 백업 권장
2. **중복 실행 방지**: SQL 파일에 `IF NOT EXISTS` 포함되어 있어 중복 실행 시 에러 없음
3. **데이터 보존**: 기존 customerRegion 데이터는 유지되며, region_id만 추가됨
4. **NULL 허용**: region_id는 NULL 허용 (매핑 실패 시에도 에러 없음)

## 문제 해결

### Q1: 매핑 실패 건수가 많을 때
A: customerRegion 형식이 예상과 다를 수 있습니다. 매핑 실패 목록을 확인하고 필요시 SQL 수정

### Q2: 외래키 제약 조건 에러
A: regions 테이블이 먼저 생성되었는지 확인 (`005` → `006` 순서)

### Q3: Railway 연결 실패
A: .env 파일의 DATABASE_URL 확인 또는 Railway CLI 재로그인

## 작성일
- 2025-10-06
- 작성자: Claude Code
