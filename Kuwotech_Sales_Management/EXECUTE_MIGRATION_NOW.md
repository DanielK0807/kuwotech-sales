# 🚀 마이그레이션 실행 가이드

## ✅ 완료된 작업

1. ✅ 백엔드 코드 수정 완료
2. ✅ Git 커밋 및 푸시 완료
3. ✅ Railway 배포 성공 (Deployment ID: 3502a3c4-b3d0-404f-913e-edc081b9fc09)

## 📋 지금 실행할 작업

**Railway 대시보드에서 SQL을 실행하여 데이터베이스 컬럼명을 변경해야 합니다.**

## 🔧 실행 방법 (5분 소요)

### STEP 1: Railway 대시보드 접속

1. 브라우저에서 [Railway Dashboard](https://railway.app) 열기
2. 프로젝트 `exciting-freedom` 선택
3. `MySQL` 데이터베이스 서비스 클릭

### STEP 2: Query 탭 열기

1. MySQL 서비스 화면에서 **Query** 탭 클릭
2. 또는 **Data** 탭에서 쿼리 에디터 열기

### STEP 3: SQL 복사 및 실행

1. 다음 파일 열기:
   ```
   backend/migrations/013_EXECUTE_THIS_IN_RAILWAY.sql
   ```

2. **전체 내용 복사** (Ctrl+A, Ctrl+C)

3. Railway Query 에디터에 **붙여넣기** (Ctrl+V)

4. **Execute** 또는 **Run** 버튼 클릭

### STEP 4: 결과 확인

실행 후 다음 메시지들이 표시되어야 합니다:

```
✅ KPI 테이블 컬럼명 영문 변경 완료!
kpi_sales_count: [숫자]
kpi_admin_count: 1

assignedCompanies | activeCompanies | accumulatedSales | totalSalesContribution
------------------|-----------------|------------------|------------------------
[데이터]          | [데이터]        | [데이터]         | [데이터]
```

**에러가 발생하면:**
- 에러 메시지 복사
- 롤백 필요 여부 판단
- 백업에서 복원 (필요시)

## 🔍 검증 방법

### Railway Query 탭에서 실행:

```sql
-- 1. 테이블 구조 확인
SHOW COLUMNS FROM kpi_sales;
SHOW COLUMNS FROM kpi_admin;

-- 2. 데이터 확인
SELECT
    employeeName,
    assignedCompanies,
    activeCompanies,
    accumulatedSales,
    totalSalesContribution
FROM kpi_sales
LIMIT 5;

-- 3. 뷰 확인
SELECT * FROM view_kpi_ranking_total_sales LIMIT 3;
```

**결과:**
- 모든 컬럼명이 영문으로 표시되어야 함
- 기존 데이터가 그대로 유지되어야 함
- 뷰가 정상 작동해야 함

## 🌐 애플리케이션 테스트

마이그레이션 완료 후 다음 URL들을 테스트:

### 1. 관리자 대시보드
```
https://kuwotech-sales-production-aa64.up.railway.app/admin/dashboard
```
- KPI 카드 표시 확인
- 순위 테이블 확인
- 그래프 데이터 확인

### 2. API 테스트 (Postman/cURL)

```bash
# 전사 KPI 조회
curl -X GET "https://kuwotech-sales-production-aa64.up.railway.app/api/kpi/admin" \
  -H "Authorization: Bearer [YOUR_TOKEN]"

# 영업담당 KPI 조회
curl -X GET "https://kuwotech-sales-production-aa64.up.railway.app/api/kpi/sales/[EMPLOYEE_ID]" \
  -H "Authorization: Bearer [YOUR_TOKEN]"

# 순위 조회
curl -X GET "https://kuwotech-sales-production-aa64.up.railway.app/api/kpi/admin/ranking/total" \
  -H "Authorization: Bearer [YOUR_TOKEN]"
```

**예상 응답:**
```json
{
  "success": true,
  "data": {
    "assignedCompanies": 85,
    "activeCompanies": 70,
    "activationRate": 82.35,
    "accumulatedSales": 450000000,
    "totalSalesContribution": 15.5,
    ...
  }
}
```

## ⚠️ 주의사항

### 실행 전
- ✅ 백엔드 배포 완료 확인 (완료됨)
- ⏰ 사용자 접근 최소화 시간대 선택
- 📝 에러 로그 준비

### 실행 중
- ⏱️ 전체 실행 시간: 약 2-3분
- 🚫 브라우저 닫지 않기
- 💾 에러 발생 시 스크린샷

### 실행 후
- ✅ 검증 쿼리 실행
- ✅ 애플리케이션 테스트
- ✅ 에러 로그 확인

## 🔄 롤백 (문제 발생 시)

### 옵션 1: 컬럼명 되돌리기

Railway Query 탭에서 실행:

```sql
-- KPI_SALES 롤백
ALTER TABLE kpi_sales
    CHANGE COLUMN `assignedCompanies` `담당거래처` INT DEFAULT 0,
    CHANGE COLUMN `activeCompanies` `활성거래처` INT DEFAULT 0,
    CHANGE COLUMN `activationRate` `활성화율` DECIMAL(5,2) DEFAULT 0,
    -- ... (나머지 컬럼 역변경)
```

### 옵션 2: 이전 코드로 되돌리기

```bash
# Git 롤백
git revert HEAD
git push origin main

# Railway 자동 재배포 확인
railway deployment list
```

## 📊 마이그레이션 체크리스트

### 사전 준비
- [x] 백엔드 코드 수정
- [x] Git 커밋 및 푸시
- [x] Railway 배포 성공
- [x] 마이그레이션 SQL 준비

### 실행
- [ ] Railway 대시보드 접속
- [ ] SQL 복사 및 실행
- [ ] 실행 결과 확인
- [ ] 검증 쿼리 실행

### 검증
- [ ] 테이블 구조 확인
- [ ] 데이터 무결성 확인
- [ ] 뷰 동작 확인
- [ ] API 응답 확인
- [ ] 프론트엔드 동작 확인

### 완료
- [ ] 에러 없음 확인
- [ ] 모든 기능 정상 동작
- [ ] 마이그레이션 완료 보고

## 📞 문제 발생 시

### 일반적인 에러

**에러 1: "Column doesn't exist"**
```
원인: 컬럼이 이미 변경되었거나 존재하지 않음
해결: SHOW COLUMNS로 현재 상태 확인
```

**에러 2: "Unknown table"**
```
원인: 테이블이 존재하지 않음
해결: 데이터베이스 연결 확인
```

**에러 3: "View already exists"**
```
원인: 뷰가 이미 존재
해결: DROP VIEW IF EXISTS 문 다시 실행
```

### 긴급 연락처

- **Technical**: Claude Code 세션
- **Database**: Railway Dashboard Support
- **Documentation**: MIGRATION_GUIDE.md

---

## 🎯 요약

**지금 해야 할 일:**

1. **Railway 대시보드 열기** → MySQL 선택
2. **Query 탭 클릭**
3. **SQL 파일 복사/붙여넣기** (`backend/migrations/013_EXECUTE_THIS_IN_RAILWAY.sql`)
4. **Execute 버튼 클릭**
5. **결과 확인** (✅ 메시지 확인)
6. **애플리케이션 테스트**

**예상 소요 시간:** 5분
**위험도:** 낮음 (데이터 손실 없음, 롤백 가능)
**영향:** 백엔드 API만 (프론트엔드는 자동 적응)

---

**준비 완료! 🚀 이제 Railway 대시보드에서 SQL을 실행하세요!**
