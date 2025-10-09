# KUWOTECH 영업관리 시스템 - 데이터베이스 스키마 명세서

**문서번호**: 02_01
**작성일**: 2025-01-10
**버전**: 1.0
**작성자**: System

---

## 📋 목차

1. [개요](#1-개요)
2. [데이터베이스 구조](#2-데이터베이스-구조)
3. [테이블 상세 명세](#3-테이블-상세-명세)
4. [관계도](#4-관계도)
5. [인덱스 및 제약조건](#5-인덱스-및-제약조건)
6. [트리거](#6-트리거)

---

## 1. 개요

### 1.1 데이터베이스 정보
- **데이터베이스 엔진**: MySQL 8.0 / MariaDB
- **문자셋**: utf8mb4
- **콜레이션**: utf8mb4_unicode_ci
- **스토리지 엔진**: InnoDB

### 1.2 테이블 목록
| No | 테이블명 | 영문명 | 설명 |
|----|---------|--------|------|
| 1 | 직원 정보 | employees | 직원 계정 및 인사 정보 |
| 2 | 제품 정보 | products | 제품 마스터 데이터 |
| 3 | 거래처 정보 | companies | 고객사/거래처 정보 |
| 4 | 영업 보고서 | reports | 영업담당자 일일 보고서 |
| 5 | 영업담당 KPI | kpi_sales | 영업담당자별 KPI 지표 |
| 6 | 관리자 KPI | kpi_admin | 전사 통합 KPI 지표 |
| 7 | 변경 이력 | change_history | 데이터 변경 추적 로그 |
| 8 | 백업 정보 | backups | 데이터베이스 백업 이력 |

---

## 2. 데이터베이스 구조

### 2.1 ERD 개념도
```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│  employees  │───────│   reports   │───────│  companies  │
│  (직원정보)  │       │ (영업보고서) │       │ (거래처정보) │
└─────────────┘       └─────────────┘       └─────────────┘
       │                     │                      │
       │                     │                      │
       ▼                     ▼                      │
┌─────────────┐       ┌─────────────┐              │
│  kpi_sales  │       │ change_     │              │
│ (영업담당KPI)│       │ history     │◄─────────────┘
└─────────────┘       │ (변경이력)   │
                      └─────────────┘
       │
       │
       ▼
┌─────────────┐       ┌─────────────┐
│  kpi_admin  │       │   products  │
│ (관리자KPI)  │       │  (제품정보)  │
└─────────────┘       └─────────────┘
```

---

## 3. 테이블 상세 명세

### 3.1 employees (직원 정보)
**용도**: 직원 계정 및 인사 정보 관리

| 컬럼명 | 영문명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|--------|------|------|-----|--------|------|
| 직원UUID | id | VARCHAR(36) | NOT NULL | PK | - | 직원 고유 식별자 |
| 이름 | name | VARCHAR(100) | NOT NULL | UNI | - | 이름 (로그인 아이디) |
| 이메일 | email | VARCHAR(200) | NULL | UNI | NULL | 이메일 주소 |
| 비밀번호 | password | VARCHAR(255) | NOT NULL | - | - | bcrypt 해시 비밀번호 |
| 역할1 | role1 | VARCHAR(50) | NULL | IDX | NULL | 주 역할 (영업담당/관리자) |
| 역할2 | role2 | VARCHAR(50) | NULL | - | NULL | 부 역할 |
| 부서 | department | VARCHAR(100) | NULL | - | NULL | 소속 부서 |
| 입사일 | hireDate | DATE | NOT NULL | - | - | 입사일자 |
| 전화번호 | phone | VARCHAR(50) | NULL | - | NULL | 연락처 |
| 재직상태 | status | ENUM | NULL | IDX | '재직' | 재직/휴직/퇴사 |
| 엑셀업로드권한 | canUploadExcel | BOOLEAN | NULL | - | FALSE | 엑셀 업로드 가능 여부 |
| 마지막로그인 | lastLogin | TIMESTAMP | NULL | - | NULL | 최근 로그인 일시 |
| 생성일시 | createdAt | TIMESTAMP | NULL | - | NOW() | 레코드 생성 시간 |
| 수정일시 | updatedAt | TIMESTAMP | NULL | - | NOW() | 레코드 수정 시간 |

**인덱스**:
- PRIMARY KEY: `id`
- UNIQUE KEY: `name`, `email`
- INDEX: `idx_name`, `idx_role1`, `idx_status`

**제약조건**:
- `status`: ENUM('재직', '휴직', '퇴사')

---

### 3.2 products (제품 정보)
**용도**: 판매 제품 마스터 데이터

| 컬럼명 | 영문명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|--------|------|------|-----|--------|------|
| 제품ID | id | INT | NOT NULL | PK AI | - | 자동 증가 식별자 |
| 제품명 | productName | VARCHAR(100) | NOT NULL | UNI | - | 제품 이름 |
| 카테고리 | category | ENUM | NULL | IDX | '일반제품' | 주요제품/일반제품 |
| 우선순위 | priority | INT | NULL | IDX | 0 | 제품 중요도 순위 |
| 활성상태 | isActive | BOOLEAN | NULL | - | TRUE | 판매 가능 여부 |
| 생성일시 | createdAt | TIMESTAMP | NULL | - | NOW() | 레코드 생성 시간 |

**인덱스**:
- PRIMARY KEY: `id`
- UNIQUE KEY: `productName`
- INDEX: `idx_category`, `idx_priority`

**제약조건**:
- `category`: ENUM('주요제품', '일반제품')
- `priority`: 1=임플란트, 2=지르코니아, 3=Abutment, 0=일반

**제품 목록**:
- 주요제품 (5개): 임플란트, TL, KIS, 지르코니아, Abutment
- 일반제품 (32개): 패키지, 마스크, 재료, 의료장비, 등

---

### 3.3 companies (거래처 정보)
**용도**: 고객사 및 거래처 정보 관리

| 컬럼명 | 영문명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|--------|------|------|-----|--------|------|
| 거래처UUID | keyValue | VARCHAR(100) | NOT NULL | PK | - | 거래처 고유 식별자 |
| ERP거래처명 | erpCompanyName | VARCHAR(200) | NULL | IDX | NULL | ERP 시스템 거래처명 |
| 최종거래처명 | finalCompanyName | VARCHAR(200) | NULL | IDX | NULL | 실제 사용 거래처명 |
| 폐업여부 | isClosed | ENUM | NULL | - | 'N' | Y/N |
| 대표자/의사 | ceoOrDentist | VARCHAR(100) | NULL | - | NULL | 대표이사 또는 치과의사 |
| 고객사지역 | customerRegion | VARCHAR(100) | NULL | - | NULL | 거래처 소재지 |
| 거래상태 | businessStatus | VARCHAR(50) | NULL | IDX | NULL | 거래 진행 상태 |
| 담당부서 | department | VARCHAR(100) | NULL | - | NULL | 담당 부서 |
| 판매제품 | salesProduct | TEXT | NULL | - | NULL | 판매 제품 목록 (자동) |
| 마지막결제일 | lastPaymentDate | DATE | NULL | - | NULL | 최근 결제일 (자동) |
| 마지막결제금액 | lastPaymentAmount | DECIMAL(15,2) | NULL | - | 0 | 최근 결제 금액 (자동) |
| 누적수금금액 | accumulatedCollection | DECIMAL(15,2) | NULL | - | 0 | 총 수금액 (자동) |
| 누적매출금액 | accumulatedSales | DECIMAL(15,2) | NULL | - | 0 | 총 매출액 (자동) |
| 영업활동내역 | activityNotes | TEXT | NULL | - | NULL | 영업 특이사항 (자동) |
| 내부담당자 | internalManager | VARCHAR(100) | NULL | IDX | NULL | 담당 영업사원 |
| 정철웅기여도 | jcwContribution | ENUM | NULL | - | NULL | 상/중/하 |
| 회사기여도 | companyContribution | ENUM | NULL | - | NULL | 상/중/하 |
| 매출채권잔액 | accountsReceivable | DECIMAL(15,2) | NULL | - | 0 | 미수금 잔액 |
| 생성일시 | createdAt | TIMESTAMP | NULL | - | NOW() | 레코드 생성 시간 |
| 수정일시 | updatedAt | TIMESTAMP | NULL | - | NOW() | 레코드 수정 시간 |

**인덱스**:
- PRIMARY KEY: `keyValue`
- INDEX: `idx_erpCompanyName`, `idx_finalCompanyName`, `idx_internalManager`, `idx_businessStatus`

**제약조건**:
- `isClosed`: ENUM('Y', 'N')
- `jcwContribution`: ENUM('상', '중', '하')
- `companyContribution`: ENUM('상', '중', '하')

---

### 3.4 reports (영업 보고서)
**용도**: 영업담당자 일일 활동 보고서

| 컬럼명 | 영문명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|--------|------|------|-----|--------|------|
| 보고서ID | reportId | VARCHAR(100) | NOT NULL | PK | - | 보고서 고유 식별자 |
| 작성자 | submittedBy | VARCHAR(100) | NOT NULL | FK IDX | - | 작성자명 |
| 제출일 | submittedDate | DATE | NOT NULL | IDX | - | 보고서 제출일 |
| 거래처ID | companyId | VARCHAR(100) | NOT NULL | FK IDX | - | 대상 거래처 |
| 보고서유형 | reportType | VARCHAR(100) | NULL | - | NULL | 보고서 타입 |
| 목표수금금액 | targetCollectionAmount | DECIMAL(15,2) | NULL | - | 0 | 계획 수금액 |
| 목표매출액 | targetSalesAmount | DECIMAL(15,2) | NULL | - | 0 | 계획 매출액 |
| 판매목표제품 | targetProducts | VARCHAR(200) | NULL | - | NULL | 판매 목표 제품 |
| 활동내역 | activityNotes | TEXT | NULL | - | NULL | 영업 활동 내용 |
| 실제매출금액 | actualSalesAmount | DECIMAL(15,2) | NULL | - | 0 | 실제 달성 매출액 |
| 실제수금금액 | actualCollectionAmount | DECIMAL(15,2) | NULL | - | 0 | 실제 달성 수금액 |
| 판매제품 | soldProducts | TEXT | NULL | - | NULL | 실제 판매 제품 |
| 부가세포함 | includeVAT | BOOLEAN | NULL | - | TRUE | VAT 포함 여부 |
| 상태 | status | ENUM | NULL | IDX | '임시저장' | 보고서 처리 상태 |
| 처리자 | processedBy | VARCHAR(100) | NULL | FK | NULL | 승인/반려 처리자 |
| 처리일시 | processedDate | TIMESTAMP | NULL | - | NULL | 승인/반려 일시 |
| 관리자코멘트 | adminComment | TEXT | NULL | - | NULL | 승인/반려 사유 |
| 생성일시 | createdAt | TIMESTAMP | NULL | - | NOW() | 레코드 생성 시간 |
| 수정일시 | updatedAt | TIMESTAMP | NULL | - | NOW() | 레코드 수정 시간 |

**인덱스**:
- PRIMARY KEY: `reportId`
- FOREIGN KEY: `submittedBy` → `employees.name`
- FOREIGN KEY: `companyId` → `companies.keyValue`
- FOREIGN KEY: `processedBy` → `employees.name`
- INDEX: `idx_submittedBy`, `idx_companyId`, `idx_status`, `idx_submittedDate`

**제약조건**:
- `status`: ENUM('임시저장', '제출완료', '승인', '반려')
- `submittedBy`: ON UPDATE CASCADE, ON DELETE RESTRICT
- `companyId`: ON UPDATE CASCADE, ON DELETE RESTRICT
- `processedBy`: ON UPDATE CASCADE, ON DELETE SET NULL

---

### 3.5 kpi_sales (영업담당 KPI)
**용도**: 영업담당자별 성과 지표

| 컬럼명 | 영문명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|--------|------|------|-----|--------|------|
| KPI_ID | id | VARCHAR(36) | NOT NULL | PK | - | KPI 레코드 식별자 |
| 직원명 | employeeName | VARCHAR(50) | NOT NULL | UNI IDX | - | 영업담당자 이름 |
| 담당거래처 | 담당거래처 | INT | NULL | - | 0 | 담당 거래처 수 |
| 활성거래처 | 활성거래처 | INT | NULL | - | 0 | 활동 중인 거래처 수 |
| 활성화율 | 활성화율 | DECIMAL(5,2) | NULL | - | 0 | 활성거래처/담당거래처 |
| 주요제품판매거래처 | 주요제품판매거래처 | INT | NULL | - | 0 | 주요제품 판매처 수 |
| 회사배정기준달성율 | 회사배정기준대비달성율 | DECIMAL(10,2) | NULL | - | 0 | 목표 대비 달성률 |
| 주요고객목표달성율 | 주요고객처목표달성율 | DECIMAL(5,2) | NULL | - | 0 | 주요 고객 목표 달성 |
| 누적매출금액 | 누적매출금액 | DECIMAL(15,2) | NULL | - | 0 | 총 매출액 |
| 주요제품매출액 | 주요제품매출액 | DECIMAL(15,2) | NULL | - | 0 | 주요 제품 매출액 |
| 매출집중도 | 매출집중도 | DECIMAL(15,2) | NULL | - | 0 | 상위 거래처 집중도 |
| 누적수금금액 | 누적수금금액 | DECIMAL(15,2) | NULL | - | 0 | 총 수금액 |
| 매출채권잔액 | 매출채권잔액 | DECIMAL(15,2) | NULL | - | 0 | 미수금 잔액 |
| 주요제품매출비율 | 주요제품매출비율 | DECIMAL(5,2) | NULL | - | 0 | 주요제품/전체매출 |
| 전체매출기여도 | 전체매출기여도 | DECIMAL(5,2) | NULL | - | 0 | 전사 매출 기여율 |
| 주요제품매출기여도 | 주요제품매출기여도 | DECIMAL(5,2) | NULL | - | 0 | 주요제품 기여율 |
| 전체매출기여도순위 | 전체매출기여도순위 | INT | NULL | - | 0 | 전체매출 순위 |
| 주요제품기여도순위 | 주요제품매출기여도순위 | INT | NULL | - | 0 | 주요제품 순위 |
| 전체매출누적기여도 | 전체매출누적기여도 | DECIMAL(10,2) | NULL | - | 0 | 전체 누적 기여도 |
| 주요제품누적기여도 | 주요제품매출누적기여도 | DECIMAL(10,2) | NULL | - | 0 | 주요제품 누적 기여도 |
| 현재월수 | 현재월수 | INT | NULL | - | 0 | 재직 개월 수 |
| 최종수정일시 | lastUpdated | TIMESTAMP | NULL | - | NOW() | 마지막 계산 시간 |

**인덱스**:
- PRIMARY KEY: `id`
- UNIQUE KEY: `employeeName`
- INDEX: `idx_employeeName`

---

### 3.6 kpi_admin (관리자 KPI)
**용도**: 전사 통합 성과 지표 (싱글톤)

| 컬럼명 | 영문명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|--------|------|------|-----|--------|------|
| KPI_ID | id | VARCHAR(36) | NOT NULL | PK | 'admin-kpi-singleton' | 고정 식별자 |
| 전체거래처 | 전체거래처 | INT | NULL | - | 0 | 전체 거래처 수 |
| 활성거래처 | 활성거래처 | INT | NULL | - | 0 | 활동 중인 거래처 수 |
| 활성화율 | 활성화율 | DECIMAL(5,2) | NULL | - | 0 | 활성거래처/전체거래처 |
| 주요제품판매거래처 | 주요제품판매거래처 | INT | NULL | - | 0 | 주요제품 판매처 수 |
| 회사배정기준달성율 | 회사배정기준대비달성율 | DECIMAL(10,2) | NULL | - | 0 | 전사 목표 달성률 |
| 주요고객목표달성율 | 주요고객처목표달성율 | DECIMAL(5,2) | NULL | - | 0 | 주요 고객 달성률 |
| 누적매출금액 | 누적매출금액 | DECIMAL(15,2) | NULL | - | 0 | 전사 총 매출액 |
| 누적수금금액 | 누적수금금액 | DECIMAL(15,2) | NULL | - | 0 | 전사 총 수금액 |
| 매출채권잔액 | 매출채권잔액 | DECIMAL(15,2) | NULL | - | 0 | 전사 미수금 잔액 |
| 주요제품매출액 | 주요제품매출액 | DECIMAL(15,2) | NULL | - | 0 | 주요제품 매출액 |
| 매출집중도 | 매출집중도 | DECIMAL(15,2) | NULL | - | 0 | 상위 거래처 집중도 |
| 주요제품매출비율 | 주요제품매출비율 | DECIMAL(5,2) | NULL | - | 0 | 주요제품/전체매출 |
| 전체매출기여도링크 | 전체매출기여도_링크 | VARCHAR(200) | NULL | - | '/api/kpi/admin/ranking/total' | 순위 API 링크 |
| 주요제품기여도링크 | 주요제품매출기여도_링크 | VARCHAR(200) | NULL | - | '/api/kpi/admin/ranking/main' | 순위 API 링크 |
| 영업담당자수 | 영업담당자수 | INT | NULL | - | 0 | 영업팀 인원 수 |
| 현재월수 | 현재월수 | INT | NULL | - | 0 | 기준 개월 수 |
| 최종수정일시 | lastUpdated | TIMESTAMP | NULL | - | NOW() | 마지막 계산 시간 |

**인덱스**:
- PRIMARY KEY: `id`

**특징**:
- 싱글톤 테이블 (단일 레코드만 존재)
- `id` = 'admin-kpi-singleton' (고정)

---

### 3.7 change_history (변경 이력)
**용도**: 데이터 변경 감사 로그

| 컬럼명 | 영문명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|--------|------|------|-----|--------|------|
| 이력ID | id | INT | NOT NULL | PK AI | - | 자동 증가 식별자 |
| 테이블명 | tableName | VARCHAR(50) | NOT NULL | IDX | - | 변경된 테이블 |
| 작업유형 | operation | ENUM | NOT NULL | - | - | INSERT/UPDATE/DELETE |
| 레코드ID | recordId | VARCHAR(100) | NULL | - | NULL | 대상 레코드 식별자 |
| 변경자 | changedBy | VARCHAR(100) | NOT NULL | IDX | - | 변경 실행자 |
| 변경전데이터 | oldData | JSON | NULL | - | NULL | 변경 전 JSON |
| 변경후데이터 | newData | JSON | NULL | - | NULL | 변경 후 JSON |
| 변경일시 | changedAt | TIMESTAMP | NULL | IDX | NOW() | 변경 발생 시간 |
| IP주소 | ipAddress | VARCHAR(50) | NULL | - | NULL | 요청 IP |
| 사용자에이전트 | userAgent | TEXT | NULL | - | NULL | 브라우저 정보 |

**인덱스**:
- PRIMARY KEY: `id`
- INDEX: `idx_tableName`, `idx_changedAt`, `idx_changedBy`

**제약조건**:
- `operation`: ENUM('INSERT', 'UPDATE', 'DELETE')

---

### 3.8 backups (백업 정보)
**용도**: 데이터베이스 백업 관리

| 컬럼명 | 영문명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|--------|------|------|-----|--------|------|
| 백업ID | id | INT | NOT NULL | PK AI | - | 자동 증가 식별자 |
| 백업명 | backupName | VARCHAR(200) | NOT NULL | - | - | 백업 파일명 |
| 백업유형 | backupType | ENUM | NULL | IDX | '수동' | 수동/자동/시스템 |
| 백업데이터 | backupData | LONGTEXT | NOT NULL | - | - | JSON 백업 데이터 |
| 데이터크기 | dataSize | BIGINT | NULL | - | NULL | 백업 크기 (bytes) |
| 레코드수 | recordCount | INT | NULL | - | NULL | 백업 레코드 수 |
| 생성자 | createdBy | VARCHAR(100) | NOT NULL | - | - | 백업 실행자 |
| 설명 | description | TEXT | NULL | - | NULL | 백업 목적/설명 |
| 복원여부 | isRestored | BOOLEAN | NULL | - | FALSE | 복원 실행 여부 |
| 복원일시 | restoredAt | TIMESTAMP | NULL | - | NULL | 복원 실행 시간 |
| 복원자 | restoredBy | VARCHAR(100) | NULL | - | NULL | 복원 실행자 |
| 생성일시 | createdAt | TIMESTAMP | NULL | IDX | NOW() | 백업 생성 시간 |

**인덱스**:
- PRIMARY KEY: `id`
- INDEX: `idx_createdAt`, `idx_backupType`

**제약조건**:
- `backupType`: ENUM('수동', '자동', '시스템')

---

## 4. 관계도

### 4.1 주요 외래키 관계
```sql
reports.submittedBy → employees.name
reports.companyId → companies.keyValue
reports.processedBy → employees.name
```

### 4.2 논리적 관계
```
employees (1) ──< (N) kpi_sales
employees (1) ──< (N) reports
companies (1) ──< (N) reports
reports (승인) ──▶ companies (자동 업데이트)
```

---

## 5. 인덱스 및 제약조건

### 5.1 인덱스 전략
- **PRIMARY KEY**: UUID (employees, companies) 또는 AUTO_INCREMENT (products, change_history, backups)
- **UNIQUE KEY**: 이름, 이메일, 제품명 등 중복 불가 필드
- **INDEX**: 검색 및 조인에 자주 사용되는 컬럼

### 5.2 외래키 정책
| 외래키 | ON UPDATE | ON DELETE | 설명 |
|--------|-----------|-----------|------|
| reports.submittedBy | CASCADE | RESTRICT | 직원명 변경 시 보고서도 변경, 삭제 불가 |
| reports.companyId | CASCADE | RESTRICT | 거래처 키 변경 시 보고서도 변경, 삭제 불가 |
| reports.processedBy | CASCADE | SET NULL | 처리자 삭제 시 NULL 처리 |

---

## 6. 트리거

### 6.1 update_company_after_report_approval
**트리거 대상**: reports 테이블
**트리거 시점**: AFTER UPDATE
**트리거 조건**: status가 '승인'으로 변경될 때

**동작**:
1. **판매제품 누적**: `companies.salesProduct`에 `reports.soldProducts` 추가
2. **마지막 결제일**: `companies.lastPaymentDate` 업데이트
3. **마지막 결제금액**: `companies.lastPaymentAmount` 업데이트
4. **누적 수금금액**: `companies.accumulatedCollection` 증가
5. **누적 매출금액**: `companies.accumulatedSales` 증가 (부가세 자동 계산)
6. **영업활동 이력**: `companies.activityNotes`에 날짜별 활동 추가

**부가세 처리 로직**:
```sql
CASE
  WHEN NEW.includeVAT = TRUE THEN IFNULL(NEW.actualSalesAmount, 0) / 1.1
  ELSE IFNULL(NEW.actualSalesAmount, 0)
END
```

---

## 7. 보안 및 권한

### 7.1 비밀번호 보안
- **해싱 알고리즘**: bcrypt
- **보안 강도**: 10 rounds
- **기본 비밀번호**: `{이름}1234`

### 7.2 접근 권한
- **관리자 (admin)**: 모든 테이블 읽기/쓰기 권한
- **영업담당 (sales)**: companies, reports, kpi_sales 읽기/쓰기 제한
- **엑셀 업로드**: `employees.canUploadExcel = TRUE` 필요

---

## 8. 데이터 초기화

### 8.1 초기 데이터
- **제품**: 37개 (주요제품 5개, 일반제품 32개)
- **직원**: 엑셀 파일 `영업관리기초자료_UUID.xlsx` → `입사일자` 시트
- **거래처**: 엑셀 파일 `영업관리기초자료_UUID.xlsx` → `기본정보` 시트

### 8.2 초기화 스크립트
- **위치**: `backend/config/db-initializer.js`
- **실행 시점**: 서버 시작 시 자동 실행
- **안전성**: `CREATE TABLE IF NOT EXISTS` 사용

---

## 9. 변경 이력

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|-----------|--------|
| 1.0 | 2025-01-10 | 초기 문서 작성 | System |

---

**END OF DOCUMENT**
