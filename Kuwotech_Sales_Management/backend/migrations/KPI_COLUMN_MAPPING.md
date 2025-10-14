# KPI 테이블 컬럼명 한글→영문 매핑

## 개요
- **작업 일자**: 2025년 (현재)
- **작업 내용**: KPI_ADMIN, KPI_SALES 테이블의 한글 컬럼명을 영문으로 변경
- **목적**: 국제 표준 준수, 데이터베이스 호환성 향상, 유지보수 편의성 개선

## KPI_SALES 테이블 컬럼 매핑

### 거래처 관리 지표 (4개)
| 기존 한글 컬럼명 | 새 영문 컬럼명 | 설명 | 타입 |
|---|---|---|---|
| 담당거래처 | assignedCompanies | 담당 거래처 수 | INT |
| 활성거래처 | activeCompanies | 활성 거래처 수 | INT |
| 활성화율 | activationRate | 활성화율 (%) | DECIMAL(5,2) |
| 주요제품판매거래처 | mainProductCompanies | 주요제품 판매 거래처 수 | INT |

### 목표 달성 지표 (2개)
| 기존 한글 컬럼명 | 새 영문 컬럼명 | 설명 | 타입 |
|---|---|---|---|
| 회사배정기준대비달성율 | companyTargetAchievementRate | 회사 배정 기준 대비 달성율 (%) | DECIMAL(10,2) |
| 주요고객처목표달성율 | majorCustomerTargetRate | 주요 고객처 목표 달성율 (%) | DECIMAL(5,2) |

### 매출 성과 지표 (3개)
| 기존 한글 컬럼명 | 새 영문 컬럼명 | 설명 | 타입 |
|---|---|---|---|
| 누적매출금액 | accumulatedSales | 누적 매출 금액 (원) | DECIMAL(15,2) |
| 주요제품매출액 | mainProductSales | 주요제품 매출액 (원) | DECIMAL(15,2) |
| 매출집중도 | salesConcentration | 매출 집중도 (원/개사/월) | DECIMAL(15,2) |

### 재무 및 기여도 지표 (5개)
| 기존 한글 컬럼명 | 새 영문 컬럼명 | 설명 | 타입 |
|---|---|---|---|
| 누적수금금액 | accumulatedCollection | 누적 수금 금액 (원) | DECIMAL(15,2) |
| 매출채권잔액 | accountsReceivable | 매출 채권 잔액 (원) | DECIMAL(15,2) |
| 주요제품매출비율 | mainProductSalesRatio | 주요제품 매출 비율 (%) | DECIMAL(5,2) |
| 전체매출기여도 | totalSalesContribution | 전체 매출 기여도 (%) | DECIMAL(5,2) |
| 주요제품매출기여도 | mainProductContribution | 주요제품 매출 기여도 (%) | DECIMAL(5,2) |

### 순위 및 누적 지표 (4개)
| 기존 한글 컬럼명 | 새 영문 컬럼명 | 설명 | 타입 |
|---|---|---|---|
| 전체매출기여도순위 | totalSalesContributionRank | 전체매출기여도 순위 | INT |
| 전체매출누적기여도 | cumulativeTotalSalesContribution | 전체매출 누적기여도 | DECIMAL(5,2) |
| 주요제품매출기여도순위 | mainProductContributionRank | 주요제품매출기여도 순위 | INT |
| 주요제품매출누적기여도 | cumulativeMainProductContribution | 주요제품매출 누적기여도 | DECIMAL(5,2) |

### 메타 정보 (1개)
| 기존 한글 컬럼명 | 새 영문 컬럼명 | 설명 | 타입 |
|---|---|---|---|
| 현재월수 | currentMonths | 입사 후 경과 월수 | INT |

## KPI_ADMIN 테이블 컬럼 매핑

### 전사 거래처 지표 (4개)
| 기존 한글 컬럼명 | 새 영문 컬럼명 | 설명 | 타입 |
|---|---|---|---|
| 전체거래처 | totalCompanies | 전체 거래처 수 | INT |
| 활성거래처 | activeCompanies | 활성 거래처 수 | INT |
| 활성화율 | activationRate | 활성화율 (%) | DECIMAL(5,2) |
| 주요제품판매거래처 | mainProductCompanies | 주요제품 판매 거래처 수 | INT |

### 전사 목표 달성 (2개)
| 기존 한글 컬럼명 | 새 영문 컬럼명 | 설명 | 타입 |
|---|---|---|---|
| 회사배정기준대비달성율 | companyTargetAchievementRate | 회사 배정 기준 대비 달성율 (%) | DECIMAL(10,2) |
| 주요고객처목표달성율 | majorCustomerTargetRate | 주요 고객처 목표 달성율 (%) | DECIMAL(5,2) |

### 전사 매출 지표 (5개)
| 기존 한글 컬럼명 | 새 영문 컬럼명 | 설명 | 타입 |
|---|---|---|---|
| 누적매출금액 | accumulatedSales | 누적 매출 금액 (원) | DECIMAL(15,2) |
| 누적수금금액 | accumulatedCollection | 누적 수금 금액 (원) | DECIMAL(15,2) |
| 매출채권잔액 | accountsReceivable | 매출 채권 잔액 (원) | DECIMAL(15,2) |
| 주요제품매출액 | mainProductSales | 주요제품 매출액 (원) | DECIMAL(15,2) |
| 매출집중도 | salesConcentration | 매출 집중도 (원/개사/월) | DECIMAL(15,2) |

### 전사 기여도 지표 (1개)
| 기존 한글 컬럼명 | 새 영문 컬럼명 | 설명 | 타입 |
|---|---|---|---|
| 주요제품매출비율 | mainProductSalesRatio | 주요제품 매출 비율 (%) | DECIMAL(5,2) |

### 메타 정보 (2개)
| 기존 한글 컬럼명 | 새 영문 컬럼명 | 설명 | 타입 |
|---|---|---|---|
| 영업담당자수 | salesRepCount | 재직 중인 영업담당자 수 | INT |
| 현재월수 | currentMonths | 현재 월 (0-11) | INT |

## 변경되지 않는 컬럼 (공통)

| 컬럼명 | 설명 | 타입 |
|---|---|---|
| id | 기본 키 | VARCHAR(36) |
| employeeId | 직원 ID (kpi_sales만) | VARCHAR(36) |
| employeeName | 직원 이름 (kpi_sales만) | VARCHAR(50) |
| lastUpdated | 최종 업데이트 시간 | TIMESTAMP |
| createdAt | 생성 시간 | TIMESTAMP |

## 마이그레이션 전략

### 1단계: 새 컬럼 추가 (영문)
- 기존 한글 컬럼을 유지하면서 새 영문 컬럼 추가
- 데이터 복사 (한글 → 영문)

### 2단계: 애플리케이션 코드 업데이트
- 백엔드 코드 수정 (controller, service)
- 프론트엔드 코드 수정 (모든 KPI 참조 부분)

### 3단계: 검증
- 기존 한글 컬럼과 새 영문 컬럼 데이터 일치 확인
- 애플리케이션 기능 테스트

### 4단계: 한글 컬럼 삭제
- 검증 완료 후 기존 한글 컬럼 삭제

## 영향받는 파일 목록

### 백엔드 (3개)
1. `backend/controllers/kpi.controller.js`
2. `backend/services/kpi.service.js`
3. `backend/routes/kpi.routes.js`

### 프론트엔드 (28개)
1. `05.Source/04.admin_mode/04_presentation/02_presentation.js`
2. `05.Source/04.admin_mode/03_report_confirm/02_report_confirm.js`
3. `05.Source/04.admin_mode/00_layouts/01_admin_layout.html`
4. `05.Source/03.sales_mode/00_layouts/01_sales_layout.html`
5. `05.Source/03.sales_mode/02_my_companies/02_my_companies.js`
6. `05.Source/04.admin_mode/02_all_companies/02_all_companies.js`
7. `05.Source/04.admin_mode/01_dashboard/02_dashboard.js`
8. `05.Source/04.admin_mode/02_all_companies/01_all_companies.html`
9. `05.Source/03.sales_mode/02_my_companies/01_my_companies.html`
10. `05.Source/06.database/12_download_manager.js`
11. `05.Source/04.admin_mode/01_dashboard/03_download_kpi.js`
12. `05.Source/03.sales_mode/02_my_companies/03_companies_download.js`
13. `05.Source/04.admin_mode/02_all_companies/03_companies_download.js`
14. `05.Source/03.sales_mode/01_dashboard/02_dashboard.js`
15. `05.Source/03.sales_mode/05_data_management/02_data_management.js`
16. `05.Source/06.database/10_excel_data_loader.js`
17. `05.Source/06.database/05_excel_sync.js`
18. `05.Source/06.database/06_change_history.js`
19. `05.Source/08.components/01_navigation.js`
20. `05.Source/04.admin_mode/05_data_management/02_data_management.js`
21. `05.Source/05.kpi/03_admin_kpi_backup.js`
22. `05.Source/05.kpi/01_kpi_calculator.js`
23. `05.Source/05.kpi/02_sales_kpi.js`
24. `05.Source/01.common/21_kpi_calculator.js`
25. `05.Source/01.common/04_terms.js`
26. `05.Source/01.common/01_global_config.js`
27. `05.Source/04.admin_mode/06_employee_management/01_employees.html`
28. `05.Source/04.admin_mode/05_data_management/01_data_management.html`

## 주의사항

1. **데이터 무결성**: 마이그레이션 전 반드시 백업
2. **점진적 전환**: 한글 컬럼과 영문 컬럼을 동시에 유지하며 점진적 전환
3. **검증 철저**: 모든 화면과 기능에서 데이터 표시 확인
4. **롤백 계획**: 문제 발생 시 즉시 복구 가능하도록 준비

## 참고

- 작성일: 2025년
- 작성자: Claude Code Assistant
- 검토자: (검토 후 기입)
