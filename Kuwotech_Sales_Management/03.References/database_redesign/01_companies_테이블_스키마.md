# companies 테이블 스키마

## 테이블명
- **Excel 시트명**: 기본정보
- **Database 테이블명**: companies

## 칼럼 매핑

| 순번 | 한국어 칼럼명 | 영문 칼럼명 | 데이터 타입 | 제약조건 | 수식/산식 | 데이터 생성 방법 | 데이터 생성 장소 |
|------|--------------|------------|-----------|---------|----------|---------------|---------------|
| 1 | 고유키 | keyValue | VARCHAR(100) | PRIMARY KEY, UNIQUE, NOT NULL | - | 자동생성 (UUID) | 시스템 자동 |
| 2 | 최종거래처명 | finalCompanyName | VARCHAR(200) | - | - | 수동입력 (관리자/영업담당) | 관리자/영업 > 담당거래처 관리 |
| 3 | 폐업여부 | isClosed | ENUM('Y', 'N') | DEFAULT 'N' | - | 수동입력 (관리자/영업담당) | 관리자/영업 > 담당거래처 관리 |
| 4 | 대표이사또는치과의사 | ceoOrDentist | VARCHAR(100) | - | - | 수동입력 (관리자/영업담당) | 관리자/영업 > 담당거래처 관리 |
| 5 | 고객사지역 | customerRegion | VARCHAR(100) | - | - | 수동입력 (관리자/영업담당) | 관리자/영업 > 담당거래처 관리 |
| 6 | 거래상태 | businessStatus | VARCHAR(50) | - | 활성/비활성/불용/추가확인 | 수동입력 (관리자/영업담당) | 관리자/영업 > 담당거래처 관리 |
| 7 | 담당부서 | department | VARCHAR(100) | - | - | 수동입력 (관리자) | 관리자 > 담당거래처 관리 |
| 8 | 판매제품 | salesProduct | TEXT | - | **자동업데이트**: reports 테이블에서 companyId 기준으로 최신 productName 집계 | 자동계산 (시스템) | 시스템 자동 (실적보고서 저장 시) |
| 9 | 내부담당자 | internalManager | VARCHAR(100) | - | - | 수동입력 (관리자) | 관리자 > 담당거래처 관리 |
| 10 | 정철웅기여 | jcwContribution | ENUM('상', '중', '하') | - | - | 수동입력 (관리자/영업담당) | 관리자/영업 > 담당거래처 관리 |
| 11 | 회사기여 | companyContribution | ENUM('상', '중', '하') | - | - | 수동입력 (관리자/영업담당) | 관리자/영업 > 담당거래처 관리 |
| 12 | 마지막결제일 | lastPaymentDate | DATE | - | **자동업데이트**: reports 테이블에서 companyId 기준으로 MAX(paymentDate) | 자동계산 (시스템) | 시스템 자동 (실적보고서 저장 시) |
| 13 | 마지막총결제금액 | lastPaymentAmount | DECIMAL(15,2) | DEFAULT 0 | **자동업데이트**: reports 테이블에서 companyId 기준으로 최신 paymentAmount | 자동계산 (시스템) | 시스템 자동 (실적보고서 저장 시) |
| 14 | 매출채권잔액 | accountsReceivable | DECIMAL(15,2) | DEFAULT 0 | - | 수동입력 (관리자, 월말 일괄) | 관리자 > 담당거래처 관리 |
| 15 | 누적수금금액 | accumulatedCollection | DECIMAL(15,2) | DEFAULT 0 | **자동업데이트**: SUM(reports.collectionAmount WHERE companyId = this.keyValue) | 자동계산 (시스템) | 시스템 자동 (실적보고서 저장 시) |
| 16 | 누적매출금액 | accumulatedSales | DECIMAL(15,2) | DEFAULT 0 | **자동업데이트**: SUM(reports.salesAmount WHERE companyId = this.keyValue) | 자동계산 (시스템) | 시스템 자동 (실적보고서 저장 시) |
| 17 | 영업활동(특이사항) | businessActivity | TEXT | - | **자동업데이트**: reports 테이블에서 companyId 기준으로 최신 activityNotes 집계 | 자동계산 (시스템) | 시스템 자동 (실적보고서 저장 시) |
| 18 | 생성일시 | createdAt | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | - | 자동생성 | 시스템 자동 |
| 19 | 수정일시 | updatedAt | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | - | 자동업데이트 | 시스템 자동 |

## 자동계산 필드 트리거

### 판매제품 (salesProduct)
```sql
-- reports 테이블에 INSERT/UPDATE 발생 시
UPDATE companies
SET salesProduct = (
  SELECT GROUP_CONCAT(DISTINCT targetProducts SEPARATOR ', ')
  FROM reports
  WHERE companyId = companies.keyValue
)
WHERE keyValue = [보고서의 companyId];
```

### 마지막결제일 (lastPaymentDate)
```sql
-- reports 테이블에 INSERT/UPDATE 발생 시
UPDATE companies
SET lastPaymentDate = (
  SELECT MAX(submittedDate)
  FROM reports
  WHERE companyId = companies.keyValue
  AND status = '승인'
)
WHERE keyValue = [보고서의 companyId];
```

### 마지막총결제금액 (lastPaymentAmount)
```sql
-- reports 테이블에 INSERT/UPDATE 발생 시
UPDATE companies
SET lastPaymentAmount = (
  SELECT targetCollectionAmount
  FROM reports
  WHERE companyId = companies.keyValue
  AND status = '승인'
  ORDER BY submittedDate DESC
  LIMIT 1
)
WHERE keyValue = [보고서의 companyId];
```

### 누적수금금액 (accumulatedCollection)
```sql
-- reports 테이블에 INSERT/UPDATE/DELETE 발생 시
UPDATE companies
SET accumulatedCollection = (
  SELECT COALESCE(SUM(targetCollectionAmount), 0)
  FROM reports
  WHERE companyId = companies.keyValue
  AND status = '승인'
)
WHERE keyValue = [보고서의 companyId];
```

### 누적매출금액 (accumulatedSales)
```sql
-- reports 테이블에 INSERT/UPDATE/DELETE 발생 시
UPDATE companies
SET accumulatedSales = (
  SELECT COALESCE(SUM(targetSalesAmount), 0)
  FROM reports
  WHERE companyId = companies.keyValue
  AND status = '승인'
)
WHERE keyValue = [보고서의 companyId];
```

### 영업활동(특이사항) (businessActivity)
```sql
-- reports 테이블에 INSERT/UPDATE 발생 시
UPDATE companies
SET businessActivity = (
  SELECT GROUP_CONCAT(activityNotes SEPARATOR ' | ')
  FROM (
    SELECT activityNotes
    FROM reports
    WHERE companyId = companies.keyValue
    AND status = '승인'
    ORDER BY submittedDate DESC
    LIMIT 5
  ) AS recent_activities
)
WHERE keyValue = [보고서의 companyId];
```

## 인덱스

```sql
CREATE INDEX idx_salesPerson ON companies(salesPerson);
CREATE INDEX idx_status ON companies(status);
CREATE INDEX idx_finalCompanyName ON companies(finalCompanyName);
CREATE INDEX idx_industry ON companies(industry);
```

## 기본 데이터 흐름

1. **초기 생성**: 관리자가 "ERP 연동" 또는 "담당거래처 관리"에서 회사 등록
2. **기본 정보 입력**: 관리자/영업담당이 최종거래처명, 고객사지역, 거래상태, 대표이사 등 입력
3. **담당자 배정**: 관리자가 내부담당자(영업담당자) 배정
4. **기여도 평가**: 관리자/영업담당이 정철웅기여, 회사기여 등급 설정
5. **자동 업데이트**: 영업담당자가 실적보고서 작성 시 판매제품, 마지막결제일, 마지막총결제금액, 누적수금/매출, 영업활동(특이사항) 자동 갱신
6. **월말 정리**: 관리자가 매출채권잔액 일괄 업데이트
