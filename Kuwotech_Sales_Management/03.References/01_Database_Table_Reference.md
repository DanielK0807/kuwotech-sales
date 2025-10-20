# KUWOTECH 영업관리 시스템 - 데이터베이스 테이블 참조서

## 1. employees (직원)

### 테이블 변수

| 컬럼명 (영문) | 컬럼명 (한글) | 데이터 타입 | 설명 |
|--------------|--------------|------------|------|
| id | 직원ID | INT AUTO_INCREMENT | 직원 고유 식별자 (PK) |
| employee_id | 직원번호 | VARCHAR(50) UNIQUE | 직원 사번 |
| password | 비밀번호 | VARCHAR(255) | 해시된 로그인 비밀번호 |
| name | 이름 | VARCHAR(100) | 직원 성명 |
| email | 이메일 | VARCHAR(100) | 직원 이메일 주소 |
| role | 역할 | VARCHAR(50) | 권한 (sales: 영업담당, admin: 관리자) |
| department | 부서 | VARCHAR(100) | 소속 부서명 |
| region | 지역 | VARCHAR(100) | 담당 지역 |
| created_at | 생성일시 | TIMESTAMP | 계정 생성일 |

### 데이터 입력/변동 방법

- **생성**: 관리자모드 > 직원 관리 > 직원 추가
- **수정**: 관리자모드 > 직원 관리 > 직원 정보 수정
- **삭제**: 관리자모드 > 직원 관리 > 직원 삭제
- **비밀번호 변경**: 영업담당모드/관리자모드 > 시스템설정 > 비밀번호 변경

### 사용 페이지

- **영업담당모드**: 시스템설정
- **관리자모드**: 직원 관리, 시스템설정, 대시보드 (직원 통계)

---

## 2. companies (거래처)

### 테이블 변수

| 컬럼명 (영문) | 컬럼명 (한글) | 데이터 타입 | 설명 |
|--------------|--------------|------------|------|
| id | 거래처ID | INT AUTO_INCREMENT | 거래처 고유 식별자 (PK) |
| company_code | 거래처코드 | VARCHAR(50) UNIQUE | 거래처 고유 코드 |
| name | 거래처명 | VARCHAR(200) | 거래처 회사명 |
| address | 주소 | VARCHAR(500) | 거래처 주소 |
| phone | 전화번호 | VARCHAR(50) | 대표 전화번호 |
| representative | 대표자 | VARCHAR(100) | 대표자 성명 |
| business_type | 업종 | VARCHAR(100) | 사업 업종 |
| employee_id | 담당직원ID | INT | 담당 영업사원 (FK: employees.id) |
| region_id | 지역ID | INT | 소속 지역 (FK: regions.id) |
| status | 상태 | VARCHAR(50) | 거래 상태 (active, inactive, pending) |
| notes | 비고 | TEXT | 추가 메모 |
| created_at | 생성일시 | TIMESTAMP | 거래처 등록일 |
| updated_at | 수정일시 | TIMESTAMP | 최종 수정일 |
| is_deleted | 삭제여부 | BOOLEAN | 삭제 플래그 (0: 활성, 1: 삭제) |

### 데이터 입력/변동 방법

- **생성**:
  - 관리자모드 > 전체거래처 관리 > 거래처 추가
  - 엑셀 업로드 (관리자 전용)
- **수정**:
  - 영업담당모드 > 담당거래처관리 > 거래처 정보 수정
  - 관리자모드 > 전체거래처 관리 > 거래처 정보 수정
- **삭제**: 관리자모드 > 전체거래처 관리 > 거래처 삭제 (소프트 삭제)
- **자동 업데이트**:
  - 트리거: 거래처 정보 변경 시 updated_at 자동 갱신
  - 트리거: 거래처 변경 시 company_history 테이블에 이력 자동 기록

### 사용 페이지

- **영업담당모드**: 담당거래처관리, 거래처 데이터관리, 실적보고서 작성
- **관리자모드**: 전체거래처 관리, 거래처 데이터관리, 대시보드

---

## 3. products (제품)

### 테이블 변수

| 컬럼명 (영문) | 컬럼명 (한글) | 데이터 타입 | 설명 |
|--------------|--------------|------------|------|
| id | 제품ID | INT AUTO_INCREMENT | 제품 고유 식별자 (PK) |
| product_code | 제품코드 | VARCHAR(50) UNIQUE | 제품 고유 코드 |
| name | 제품명 | VARCHAR(200) | 제품 이름 |
| category | 카테고리 | VARCHAR(100) | 제품 분류 |
| unit_price | 단가 | DECIMAL(15,2) | 제품 단가 |
| description | 설명 | TEXT | 제품 상세 설명 |
| created_at | 생성일시 | TIMESTAMP | 제품 등록일 |

### 데이터 입력/변동 방법

- **생성**: 관리자모드 > 시스템 설정 > 제품 관리 > 제품 추가
- **수정**: 관리자모드 > 시스템 설정 > 제품 관리 > 제품 정보 수정
- **삭제**: 관리자모드 > 시스템 설정 > 제품 관리 > 제품 삭제

### 사용 페이지

- **영업담당모드**: 실적보고서 작성 (제품 선택)
- **관리자모드**: 시스템 설정 (제품 관리), 실적보고서 확인

---

## 4. reports (실적보고서)

### 테이블 변수

| 컬럼명 (영문) | 컬럼명 (한글) | 데이터 타입 | 설명 |
|--------------|--------------|------------|------|
| id | 보고서ID | INT AUTO_INCREMENT | 보고서 고유 식별자 (PK) |
| employee_id | 작성자ID | INT | 작성 직원 (FK: employees.id) |
| company_id | 거래처ID | INT | 방문 거래처 (FK: companies.id) |
| report_date | 보고일자 | DATE | 보고서 작성일 |
| visit_date | 방문일자 | DATE | 실제 방문일 |
| visit_type | 방문유형 | VARCHAR(50) | 방문 종류 (신규, 정기, 긴급 등) |
| product_id | 제품ID | INT | 관련 제품 (FK: products.id) |
| quantity | 수량 | INT | 판매/거래 수량 |
| amount | 금액 | DECIMAL(15,2) | 거래 금액 |
| content | 내용 | TEXT | 보고서 본문 |
| status | 상태 | VARCHAR(50) | 보고서 상태 (draft: 임시저장, submitted: 제출, confirmed: 확인완료) |
| admin_comment | 관리자의견 | TEXT | 관리자 피드백 |
| confirmed_at | 확인일시 | TIMESTAMP | 관리자 확인 시간 |
| created_at | 생성일시 | TIMESTAMP | 보고서 생성일 |
| updated_at | 수정일시 | TIMESTAMP | 최종 수정일 |

### 데이터 입력/변동 방법

- **생성**: 영업담당모드 > 실적보고서 작성 > 보고서 작성
- **임시저장**: 영업담당모드 > 실적보고서 작성 > 임시저장 (status: draft)
- **제출**: 영업담당모드 > 실적보고서 작성 > 제출 (status: submitted)
- **수정**: 영업담당모드 > 실적보고서 확인 > 수정 (제출 전만 가능)
- **관리자 확인**: 관리자모드 > 실적보고서 확인 > 확인 완료 (status: confirmed)
- **관리자 의견**: 관리자모드 > 실적보고서 확인 > 의견 작성

### 사용 페이지

- **영업담당모드**: 실적보고서 작성, 실적보고서 확인, 관리자 의견 확인
- **관리자모드**: 실적보고서 확인, 보고서 발표, 대시보드

---

## 5. regions (지역)

### 테이블 변수

| 컬럼명 (영문) | 컬럼명 (한글) | 데이터 타입 | 설명 |
|--------------|--------------|------------|------|
| id | 지역ID | INT AUTO_INCREMENT | 지역 고유 식별자 (PK) |
| region_name | 지역명 | VARCHAR(100) UNIQUE | 지역 이름 |
| description | 설명 | TEXT | 지역 상세 설명 |
| created_at | 생성일시 | TIMESTAMP | 지역 등록일 |

### 데이터 입력/변동 방법

- **생성**: 관리자모드 > 시스템 설정 > 지역 관리 > 지역 추가
- **수정**: 관리자모드 > 시스템 설정 > 지역 관리 > 지역 정보 수정
- **삭제**: 관리자모드 > 시스템 설정 > 지역 관리 > 지역 삭제

### 사용 페이지

- **영업담당모드**: 담당거래처관리 (지역 필터)
- **관리자모드**: 전체거래처 관리, 시스템 설정, 대시보드 (지역별 통계)

---

## 6. kpi_sales (영업담당 KPI)

### 테이블 변수

| 컬럼명 (영문) | 컬럼명 (한글) | 데이터 타입 | 설명 |
|--------------|--------------|------------|------|
| id | KPIID | INT AUTO_INCREMENT | KPI 고유 식별자 (PK) |
| employee_id | 직원ID | INT | 대상 직원 (FK: employees.id) |
| year | 연도 | INT | 측정 연도 |
| month | 월 | INT | 측정 월 |
| total_companies | 총거래처수 | INT | 담당 전체 거래처 수 |
| active_companies | 활성거래처수 | INT | 활동 중인 거래처 수 |
| new_companies | 신규거래처수 | INT | 신규 등록 거래처 수 |
| total_visits | 총방문횟수 | INT | 전체 방문 횟수 |
| total_sales | 총매출액 | DECIMAL(15,2) | 총 매출 금액 |
| report_submission_rate | 보고서제출률 | DECIMAL(5,2) | 보고서 제출 비율 (%) |
| created_at | 생성일시 | TIMESTAMP | KPI 생성일 |
| updated_at | 수정일시 | TIMESTAMP | 최종 수정일 |

### 데이터 입력/변동 방법

- **자동 생성**: 시스템이 매월 자동으로 KPI 계산 및 생성
- **수동 갱신**: 관리자모드 > 대시보드 > KPI 갱신 버튼
- **계산 로직**:
  - 실적보고서, 거래처 데이터 기반 자동 집계
  - 보고서 제출 상태 체크

### 사용 페이지

- **영업담당모드**: 대시보드 (개인 KPI 조회)
- **관리자모드**: 대시보드 (전체 직원 KPI 조회 및 비교)

---

## 7. kpi_admin (관리자 KPI)

### 테이블 변수

| 컬럼명 (영문) | 컬럼명 (한글) | 데이터 타입 | 설명 |
|--------------|--------------|------------|------|
| id | KPIID | INT AUTO_INCREMENT | KPI 고유 식별자 (PK) |
| year | 연도 | INT | 측정 연도 |
| month | 월 | INT | 측정 월 |
| total_companies | 총거래처수 | INT | 전체 거래처 수 |
| active_companies | 활성거래처수 | INT | 활동 중인 거래처 수 |
| total_employees | 총직원수 | INT | 전체 직원 수 |
| total_reports | 총보고서수 | INT | 전체 보고서 수 |
| confirmed_reports | 확인완료보고서수 | INT | 확인 완료된 보고서 수 |
| total_sales | 총매출액 | DECIMAL(15,2) | 전사 총 매출 금액 |
| created_at | 생성일시 | TIMESTAMP | KPI 생성일 |
| updated_at | 수정일시 | TIMESTAMP | 최종 수정일 |

### 데이터 입력/변동 방법

- **자동 생성**: 시스템이 매월 자동으로 전사 KPI 계산 및 생성
- **수동 갱신**: 관리자모드 > 대시보드 > 전사 KPI 갱신 버튼
- **계산 로직**:
  - 전체 직원, 거래처, 보고서 데이터 집계
  - 전사 매출 총합 계산
  - API 응답 시 inactiveCompanies는 동적 계산 (DB 컬럼 아님)

### 사용 페이지

- **관리자모드**: 대시보드 (전사 현황 조회)

---

## 8. companyGoals (거래처 목표)

### 테이블 변수

| 컬럼명 (영문) | 컬럼명 (한글) | 데이터 타입 | 설명 |
|--------------|--------------|------------|------|
| id | 목표ID | INT AUTO_INCREMENT | 목표 고유 식별자 (PK) |
| company_id | 거래처ID | INT | 대상 거래처 (FK: companies.id) |
| year | 연도 | INT | 목표 연도 |
| month | 월 | INT | 목표 월 |
| target_amount | 목표금액 | DECIMAL(15,2) | 월별 매출 목표 |
| actual_amount | 실적금액 | DECIMAL(15,2) | 실제 달성 금액 |
| achievement_rate | 달성률 | DECIMAL(5,2) | 목표 대비 달성 비율 (%) |
| created_at | 생성일시 | TIMESTAMP | 목표 생성일 |
| updated_at | 수정일시 | TIMESTAMP | 최종 수정일 |

### 데이터 입력/변동 방법

- **생성**: 관리자모드 > 전체거래처 관리 > 거래처별 목표 설정
- **수정**: 관리자모드 > 전체거래처 관리 > 목표 금액 수정
- **자동 갱신**: 실적보고서 제출 시 actual_amount, achievement_rate 자동 계산 및 업데이트

### 사용 페이지

- **영업담당모드**: 담당거래처관리 (목표 대비 실적 조회)
- **관리자모드**: 전체거래처 관리, 대시보드 (목표 달성 현황)

---

## 9. departments (부서)

### 테이블 변수

| 컬럼명 (영문) | 컬럼명 (한글) | 데이터 타입 | 설명 |
|--------------|--------------|------------|------|
| id | 부서ID | INT AUTO_INCREMENT | 부서 고유 식별자 (PK) |
| department_name | 부서명 | VARCHAR(100) UNIQUE | 부서 이름 |
| description | 설명 | TEXT | 부서 상세 설명 |
| created_at | 생성일시 | TIMESTAMP | 부서 등록일 |

### 데이터 입력/변동 방법

- **생성**: 관리자모드 > 시스템 설정 > 부서 관리 > 부서 추가
- **수정**: 관리자모드 > 시스템 설정 > 부서 관리 > 부서 정보 수정
- **삭제**: 관리자모드 > 시스템 설정 > 부서 관리 > 부서 삭제

### 사용 페이지

- **관리자모드**: 시스템 설정, 직원 관리 (부서 할당), 대시보드 (부서별 통계)

---

## 10. customer_news (고객소식)

### 테이블 변수

| 컬럼명 (영문) | 컬럼명 (한글) | 데이터 타입 | 설명 |
|--------------|--------------|------------|------|
| id | 소식ID | INT AUTO_INCREMENT | 고객소식 고유 식별자 (PK) |
| employee_id | 작성자ID | INT | 작성 직원 (FK: employees.id) |
| company_id | 거래처ID | INT | 관련 거래처 (FK: companies.id) |
| title | 제목 | VARCHAR(200) | 소식 제목 |
| content | 내용 | TEXT | 소식 본문 |
| news_date | 소식일자 | DATE | 소식 발생일 |
| status | 상태 | VARCHAR(50) | 소식 상태 (draft: 임시저장, published: 게시) |
| view_count | 조회수 | INT | 조회 횟수 |
| comment_count | 댓글수 | INT | 댓글 개수 (트리거로 자동 갱신) |
| created_at | 생성일시 | TIMESTAMP | 소식 생성일 |
| updated_at | 수정일시 | TIMESTAMP | 최종 수정일 |

### 데이터 입력/변동 방법

- **생성**: 영업담당모드 > 고객소식 작성 > 소식 작성
- **임시저장**: 영업담당모드 > 고객소식 작성 > 임시저장 (status: draft)
- **게시**: 영업담당모드 > 고객소식 작성 > 게시 (status: published)
- **수정**: 영업담당모드 > 고객소식 작성 > 수정
- **삭제**: 영업담당모드 > 고객소식 작성 > 삭제
- **조회수 증가**: 소식 열람 시 자동 증가
- **댓글수 갱신**: 트리거로 댓글 추가/삭제 시 자동 갱신

### 사용 페이지

- **영업담당모드**: 고객소식 작성, 관리자 의견 확인
- **관리자모드**: 고객소식 의견 제시

---

## 11. customer_news_comments (고객소식 댓글)

### 테이블 변수

| 컬럼명 (영문) | 컬럼명 (한글) | 데이터 타입 | 설명 |
|--------------|--------------|------------|------|
| id | 댓글ID | INT AUTO_INCREMENT | 댓글 고유 식별자 (PK) |
| news_id | 소식ID | INT | 대상 고객소식 (FK: customer_news.id) |
| employee_id | 작성자ID | INT | 작성 직원 (FK: employees.id) |
| content | 내용 | TEXT | 댓글 내용 |
| created_at | 생성일시 | TIMESTAMP | 댓글 생성일 |
| updated_at | 수정일시 | TIMESTAMP | 최종 수정일 |

### 데이터 입력/변동 방법

- **생성**:
  - 영업담당모드 > 관리자 의견 확인 > 댓글 작성
  - 관리자모드 > 고객소식 의견 제시 > 댓글 작성
- **수정**: 댓글 수정 기능
- **삭제**: 댓글 삭제 기능
- **자동 트리거**: 댓글 추가/삭제 시 customer_news.comment_count 자동 갱신

### 사용 페이지

- **영업담당모드**: 관리자 의견 확인 (댓글 조회)
- **관리자모드**: 고객소식 의견 제시 (댓글 작성)

---

## 12. customer_news_notifications (고객소식 알림)

### 테이블 변수

| 컬럼명 (영문) | 컬럼명 (한글) | 데이터 타입 | 설명 |
|--------------|--------------|------------|------|
| id | 알림ID | INT AUTO_INCREMENT | 알림 고유 식별자 (PK) |
| news_id | 소식ID | INT | 대상 고객소식 (FK: customer_news.id) |
| employee_id | 수신자ID | INT | 알림 받을 직원 (FK: employees.id) |
| is_read | 읽음여부 | BOOLEAN | 읽음 상태 (0: 미읽음, 1: 읽음) |
| created_at | 생성일시 | TIMESTAMP | 알림 생성일 |
| read_at | 읽음일시 | TIMESTAMP | 알림 읽은 시간 |

### 데이터 입력/변동 방법

- **자동 생성**: 관리자가 고객소식에 댓글 작성 시 자동으로 작성자에게 알림 생성
- **읽음 처리**: 영업담당모드 > 관리자 의견 확인 > 알림 클릭 시 is_read = 1로 변경
- **삭제**: 읽은 알림은 30일 후 자동 삭제 (배치 작업)

### 사용 페이지

- **영업담당모드**: 관리자 의견 확인 (알림 조회 및 읽음 처리)

---

## 13. changeHistory (변경이력)

### 테이블 변수

| 컬럼명 (영문) | 컬럼명 (한글) | 데이터 타입 | 설명 |
|--------------|--------------|------------|------|
| id | 이력ID | INT AUTO_INCREMENT | 이력 고유 식별자 (PK) |
| table_name | 테이블명 | VARCHAR(100) | 변경된 테이블 이름 |
| record_id | 레코드ID | INT | 변경된 레코드 ID |
| action | 작업유형 | VARCHAR(50) | 작업 종류 (INSERT, UPDATE, DELETE) |
| changed_by | 변경자ID | INT | 변경한 직원 (FK: employees.id) |
| old_values | 변경전값 | JSON | 변경 전 데이터 (JSON 형식) |
| new_values | 변경후값 | JSON | 변경 후 데이터 (JSON 형식) |
| changed_at | 변경일시 | TIMESTAMP | 변경 시간 |

### 데이터 입력/변동 방법

- **자동 생성**:
  - 트리거: 주요 테이블 (companies, employees, reports) 변경 시 자동 기록
  - 시스템 로그: 중요 데이터 변경 시 자동 이력 저장
- **조회**: 관리자모드 > 데이터 관리 > 변경 이력 조회

### 사용 페이지

- **관리자모드**: 데이터 관리 (변경 이력 추적)

---

## 14. company_history (거래처 이력)

### 테이블 변수

| 컬럼명 (영문) | 컬럼명 (한글) | 데이터 타입 | 설명 |
|--------------|--------------|------------|------|
| id | 이력ID | INT AUTO_INCREMENT | 이력 고유 식별자 (PK) |
| company_id | 거래처ID | INT | 대상 거래처 (FK: companies.id) |
| changed_by | 변경자ID | INT | 변경한 직원 (FK: employees.id) |
| field_name | 필드명 | VARCHAR(100) | 변경된 필드 이름 |
| old_value | 변경전값 | TEXT | 변경 전 값 |
| new_value | 변경후값 | TEXT | 변경 후 값 |
| changed_at | 변경일시 | TIMESTAMP | 변경 시간 |

### 데이터 입력/변동 방법

- **자동 생성**: 트리거로 companies 테이블 UPDATE 시 자동 기록
- **조회**:
  - 영업담당모드 > 담당거래처관리 > 거래처 상세 > 변경 이력
  - 관리자모드 > 전체거래처 관리 > 거래처 상세 > 변경 이력

### 사용 페이지

- **영업담당모드**: 담당거래처관리
- **관리자모드**: 전체거래처 관리, 데이터 관리

---

## 15. backupHistory (백업이력)

### 테이블 변수

| 컬럼명 (영문) | 컬럼명 (한글) | 데이터 타입 | 설명 |
|--------------|--------------|------------|------|
| id | 백업ID | INT AUTO_INCREMENT | 백업 고유 식별자 (PK) |
| backup_date | 백업일시 | TIMESTAMP | 백업 실행 시간 |
| backup_file | 백업파일명 | VARCHAR(255) | 백업 파일 이름 |
| backup_size | 백업크기 | BIGINT | 백업 파일 크기 (bytes) |
| status | 상태 | VARCHAR(50) | 백업 상태 (success, failed) |
| performed_by | 수행자ID | INT | 백업 수행 직원 (FK: employees.id) |
| created_at | 생성일시 | TIMESTAMP | 레코드 생성일 |

### 데이터 입력/변동 방법

- **수동 백업**: 관리자모드 > 데이터 관리 > 데이터 백업 실행
- **자동 백업**: 스케줄러에 의한 정기 자동 백업 (매일 자정)
- **백업 실패**: 백업 오류 시 status = 'failed'로 기록

### 사용 페이지

- **관리자모드**: 데이터 관리 (백업 실행 및 이력 조회)

---

## 16. securityLogs (보안로그)

### 테이블 변수

| 컬럼명 (영문) | 컬럼명 (한글) | 데이터 타입 | 설명 |
|--------------|--------------|------------|------|
| id | 로그ID | INT AUTO_INCREMENT | 로그 고유 식별자 (PK) |
| employee_id | 직원ID | INT | 관련 직원 (FK: employees.id, NULL 가능) |
| action | 작업유형 | VARCHAR(100) | 보안 이벤트 종류 (login, logout, failed_login 등) |
| ip_address | IP주소 | VARCHAR(50) | 접속 IP 주소 |
| details | 상세내용 | TEXT | 이벤트 상세 정보 |
| created_at | 생성일시 | TIMESTAMP | 로그 생성 시간 |

### 데이터 입력/변동 방법

- **자동 생성**:
  - 로그인 성공 시 자동 기록 (action: login)
  - 로그아웃 시 자동 기록 (action: logout)
  - 로그인 실패 시 자동 기록 (action: failed_login)
  - 권한 위반 시도 시 자동 기록 (action: unauthorized_access)
- **조회**: 관리자모드 > 웹사용기록 (강정환 관리자 전용)

### 사용 페이지

- **관리자모드**: 웹사용기록 (강정환 관리자 전용 메뉴)

---

## 17. error_logs (오류로그)

### 테이블 변수

| 컬럼명 (영문) | 컬럼명 (한글) | 데이터 타입 | 설명 |
|--------------|--------------|------------|------|
| id | 로그ID | INT AUTO_INCREMENT | 로그 고유 식별자 (PK) |
| employee_id | 직원ID | INT | 관련 직원 (FK: employees.id, NULL 가능) |
| error_type | 오류유형 | VARCHAR(100) | 오류 종류 (DB error, API error 등) |
| error_message | 오류메시지 | TEXT | 오류 상세 메시지 |
| stack_trace | 스택추적 | TEXT | 오류 스택 트레이스 |
| request_url | 요청URL | VARCHAR(500) | 오류 발생 URL |
| request_method | 요청방식 | VARCHAR(10) | HTTP 메서드 (GET, POST 등) |
| created_at | 생성일시 | TIMESTAMP | 로그 생성 시간 |

### 데이터 입력/변동 방법

- **자동 생성**:
  - 시스템 오류 발생 시 자동 기록
  - API 에러 발생 시 자동 기록
  - 데이터베이스 오류 시 자동 기록
  - 프론트엔드 오류 발생 시 자동 전송 및 기록
- **조회**: 관리자모드 > 오류사항 (강정환 관리자 전용)

### 사용 페이지

- **관리자모드**: 오류사항 (강정환 관리자 전용 메뉴)

---

## 18. access_logs (접속로그)

### 테이블 변수

| 컬럼명 (영문) | 컬럼명 (한글) | 데이터 타입 | 설명 |
|--------------|--------------|------------|------|
| id | 로그ID | INT AUTO_INCREMENT | 로그 고유 식별자 (PK) |
| employee_id | 직원ID | INT | 접속 직원 (FK: employees.id) |
| login_time | 로그인시간 | TIMESTAMP | 로그인 시간 |
| logout_time | 로그아웃시간 | TIMESTAMP | 로그아웃 시간 (NULL 가능) |
| ip_address | IP주소 | VARCHAR(50) | 접속 IP 주소 |
| user_agent | 사용자에이전트 | TEXT | 브라우저 정보 |
| session_id | 세션ID | VARCHAR(255) | 세션 식별자 |
| created_at | 생성일시 | TIMESTAMP | 레코드 생성일 |

### 데이터 입력/변동 방법

- **로그인 시**: 새 레코드 생성, login_time 기록
- **로그아웃 시**: 해당 세션의 logout_time 업데이트
- **자동 정리**: 90일 이상 된 로그는 자동 삭제 (배치 작업)

### 사용 페이지

- **관리자모드**: 웹사용기록 (강정환 관리자 전용 메뉴)

---

## 19. backups (백업)

### 테이블 변수

| 컬럼명 (영문) | 컬럼명 (한글) | 데이터 타입 | 설명 |
|--------------|--------------|------------|------|
| id | 백업ID | INT AUTO_INCREMENT | 백업 고유 식별자 (PK) |
| backup_name | 백업명 | VARCHAR(255) | 백업 파일 이름 |
| backup_path | 백업경로 | VARCHAR(500) | 백업 파일 저장 경로 |
| backup_type | 백업유형 | VARCHAR(50) | 백업 종류 (full, incremental, differential) |
| created_by | 생성자ID | INT | 백업 수행 직원 (FK: employees.id) |
| created_at | 생성일시 | TIMESTAMP | 백업 생성 시간 |

### 데이터 입력/변동 방법

- **수동 백업**: 관리자모드 > 데이터 관리 > 데이터 백업 실행
- **자동 백업**: 스케줄러에 의한 정기 자동 백업
- **복원**: 관리자모드 > 데이터 관리 > 데이터 복원 (백업 선택)

### 사용 페이지

- **관리자모드**: 데이터 관리 (백업 및 복원)

---

## 20. change_history (변경이력 상세)

### 테이블 변수

| 컬럼명 (영문) | 컬럼명 (한글) | 데이터 타입 | 설명 |
|--------------|--------------|------------|------|
| id | 이력ID | INT AUTO_INCREMENT | 이력 고유 식별자 (PK) |
| table_name | 테이블명 | VARCHAR(100) | 변경된 테이블 이름 |
| record_id | 레코드ID | INT | 변경된 레코드 ID |
| field_name | 필드명 | VARCHAR(100) | 변경된 필드 이름 |
| old_value | 변경전값 | TEXT | 변경 전 값 |
| new_value | 변경후값 | TEXT | 변경 후 값 |
| changed_by | 변경자ID | INT | 변경한 직원 (FK: employees.id) |
| changed_at | 변경일시 | TIMESTAMP | 변경 시간 |

### 데이터 입력/변동 방법

- **자동 생성**: 트리거로 주요 테이블 변경 시 필드별 상세 이력 자동 기록
- **조회**: 관리자모드 > 데이터 관리 > 변경 이력 상세 조회

### 사용 페이지

- **관리자모드**: 데이터 관리 (변경 이력 상세 추적)

---

## 사이드메뉴별 테이블 사용 현황

### 영업담당모드

#### 📊 대시보드

- **사용 테이블**: employees, companies, kpi_sales, reports, companyGoals

#### 🏢 나의 거래처

- **사용 테이블**: companies, regions, employees, company_history, companyGoals, reports

#### 📝 데이터 관리

- **사용 테이블**: companies, employees

#### 📝 실적보고서 작성

- **사용 테이블**: reports, companies, products, employees

#### 📋 실적보고서 확인

- **사용 테이블**: reports, companies, products, employees

#### 📰 고객소식 작성

- **사용 테이블**: customer_news, companies, employees

#### 💬 관리자 의견 확인

- **사용 테이블**: customer_news, customer_news_comments, customer_news_notifications, employees

#### ⚙️ 시스템설정

- **사용 테이블**: employees

---

### 관리자모드

#### 📊 대시보드

- **사용 테이블**: employees, companies, regions, departments, kpi_admin, kpi_sales, reports, companyGoals

#### 🏢 전체 거래처

- **사용 테이블**: companies, regions, employees, company_history, companyGoals

#### 📝 데이터 관리

- **사용 테이블**: companies, employees

#### ✅ 실적보고서 확인

- **사용 테이블**: reports, companies, products, employees

#### 📺 보고서 발표

- **사용 테이블**: reports, companies, products, employees, regions

#### 💬 고객소식 의견 제시

- **사용 테이블**: customer_news, customer_news_comments, companies, employees

#### 👥 직원 관리

- **사용 테이블**: employees, departments, regions

#### ⚙️ 시스템 설정

- **사용 테이블**: employees, departments, regions, products

#### 💾 데이터 관리 (강정환 관리자 전용)

- **사용 테이블**: backupHistory, backups, changeHistory, change_history, company_history

#### 📤 엑셀 업로드 (강정환 관리자 전용)

- **사용 테이블**: companies, products, employees

#### 🔍 오류사항 (강정환 관리자 전용)

- **사용 테이블**: error_logs, employees

#### 📊 웹사용기록 (강정환 관리자 전용)

- **사용 테이블**: access_logs, securityLogs, employees

---

## 데이터베이스 관계도 요약

### 주요 외래키 관계

1. **companies.employee_id** → employees.id (담당 직원)
2. **companies.region_id** → regions.id (소속 지역)
3. **reports.employee_id** → employees.id (작성자)
4. **reports.company_id** → companies.id (거래처)
5. **reports.product_id** → products.id (제품)
6. **kpi_sales.employee_id** → employees.id (직원)
7. **companyGoals.company_id** → companies.id (거래처)
8. **customer_news.employee_id** → employees.id (작성자)
9. **customer_news.company_id** → companies.id (거래처)
10. **customer_news_comments.news_id** → customer_news.id (고객소식)
11. **customer_news_comments.employee_id** → employees.id (댓글 작성자)
12. **customer_news_notifications.news_id** → customer_news.id (고객소식)
13. **customer_news_notifications.employee_id** → employees.id (알림 수신자)

### 트리거

1. **companies_update_trigger**: companies 테이블 업데이트 시 updated_at 자동 갱신
2. **company_history_trigger**: companies 테이블 변경 시 company_history에 이력 자동 기록
3. **customer_news_comment_count_insert**: 댓글 추가 시 comment_count 자동 증가
4. **customer_news_comment_count_delete**: 댓글 삭제 시 comment_count 자동 감소

---

**문서 작성일**: 2025년 10월 18일
**작성자**: Daniel.K
**버전**: 1.0
