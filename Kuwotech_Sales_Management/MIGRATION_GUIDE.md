# KPI 테이블 컬럼명 영문화 마이그레이션 가이드

## 📋 개요

이 문서는 KPI_ADMIN, KPI_SALES 테이블의 한글 컬럼명을 영문으로 변경하는 마이그레이션 절차를 설명합니다.

## ⚠️ 중요 사항

### 마이그레이션 전 필수 확인사항

1. **데이터베이스 백업**
   ```bash
   # Railway 데이터베이스 백업
   mysqldump -h [RAILWAY_HOST] -u [USER] -p railway > backup_before_migration_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **애플리케이션 중단**
   - 마이그레이션 진행 중 사용자 접근 차단
   - 예상 소요 시간: 10-15분

3. **롤백 계획**
   - 백업 파일 위치 확인
   - 롤백 스크립트 준비 완료 확인

## 📂 변경된 파일 목록

### ✅ 완료된 작업

#### 1. 문서 파일 (2개)
- ✅ `backend/migrations/KPI_COLUMN_MAPPING.md` - 컬럼명 매핑 테이블
- ✅ `MIGRATION_GUIDE.md` - 마이그레이션 가이드 (현재 문서)

#### 2. 마이그레이션 스크립트 (1개)
- ✅ `backend/migrations/013_rename_kpi_columns_to_english.sql`

#### 3. 백엔드 코드 (2개)
- ✅ `backend/services/kpi.service.js`
- ✅ `backend/controllers/kpi.controller.js`

### ⏳ 프론트엔드 검토 필요 (28개 파일)

프론트엔드 파일들은 **주로 주석과 로그 메시지**에서 한글 용어를 사용하며, 실제 API 응답 데이터는 백엔드에서 제공하는 컬럼명을 따릅니다.

#### 검토 방법
1. 각 파일에서 한글 컬럼명 사용 여부 확인
2. API 응답 데이터 참조 부분 확인
3. 필요시 수정 (대부분은 주석이므로 선택적)

#### 파일 목록
```
05.Source/
├── 01.common/
│   ├── 01_global_config.js (주석만)
│   ├── 04_terms.js (용어 사전, 수정 불필요)
│   └── 21_kpi_calculator.js (주석 및 로그)
├── 03.sales_mode/
│   ├── 00_layouts/01_sales_layout.html
│   ├── 01_dashboard/02_dashboard.js
│   ├── 02_my_companies/
│   │   ├── 01_my_companies.html
│   │   ├── 02_my_companies.js
│   │   └── 03_companies_download.js
│   └── 05_data_management/02_data_management.js
├── 04.admin_mode/
│   ├── 00_layouts/01_admin_layout.html
│   ├── 01_dashboard/
│   │   ├── 02_dashboard.js
│   │   └── 03_download_kpi.js
│   ├── 02_all_companies/
│   │   ├── 01_all_companies.html
│   │   ├── 02_all_companies.js
│   │   └── 03_companies_download.js
│   ├── 03_report_confirm/02_report_confirm.js
│   ├── 04_presentation/02_presentation.js
│   ├── 05_data_management/
│   │   ├── 01_data_management.html
│   │   └── 02_data_management.js
│   └── 06_employee_management/01_employees.html
├── 05.kpi/
│   ├── 01_kpi_calculator.js (주석 및 로그)
│   ├── 02_sales_kpi.js (주석 및 로그)
│   └── 03_admin_kpi_backup.js (주석 및 로그)
├── 06.database/
│   ├── 05_excel_sync.js
│   ├── 06_change_history.js
│   ├── 10_excel_data_loader.js
│   └── 12_download_manager.js
└── 08.components/
    └── 01_navigation.js
```

## 🔧 마이그레이션 실행 단계

### STEP 1: 데이터베이스 백업 (필수)

```bash
# Railway CLI를 사용한 백업
railway run mysqldump railway > backup_$(date +%Y%m%d_%H%M%S).sql

# 또는 직접 접속하여 백업
mysqldump -h [RAILWAY_HOST] -P [PORT] -u [USER] -p railway > backup.sql
```

### STEP 2: 마이그레이션 스크립트 실행

```bash
# Railway 데이터베이스 접속
railway connect

# 또는 mysql 직접 접속
mysql -h [RAILWAY_HOST] -P [PORT] -u [USER] -p railway

# 마이그레이션 실행
source backend/migrations/013_rename_kpi_columns_to_english.sql
```

**예상 결과:**
```
🔄 KPI_SALES 테이블 컬럼명 변경 시작...
✅ 거래처 관리 지표 (4개) 변경 완료
✅ 목표 달성 지표 (2개) 변경 완료
✅ 매출 성과 지표 (3개) 변경 완료
✅ 재무 및 기여도 지표 (5개) 변경 완료
✅ 순위 및 누적 지표 (4개) 변경 완료
✅ 메타 정보 (1개) 변경 완료
🔄 KPI_ADMIN 테이블 컬럼명 변경 시작...
✅ 전사 거래처 지표 (4개) 변경 완료
✅ 전사 목표 달성 (2개) 변경 완료
✅ 전사 매출 지표 (5개) 변경 완료
✅ 전사 기여도 지표 (1개) 변경 완료
✅ 메타 정보 (2개) 변경 완료
🔄 인덱스 업데이트 시작...
✅ 인덱스 업데이트 완료
🔄 뷰 재생성 시작...
✅ 뷰 재생성 완료
```

### STEP 3: 백엔드 재배포

```bash
# Git 커밋 및 푸시 (Railway 자동 배포)
git add backend/
git commit -m "feat: KPI 테이블 컬럼명 영문화"
git push origin main

# Railway 배포 확인
railway logs
```

### STEP 4: 검증

#### 4.1 데이터베이스 검증

```sql
-- KPI_SALES 테이블 구조 확인
SHOW COLUMNS FROM kpi_sales;

-- 샘플 데이터 확인
SELECT
    employeeName,
    assignedCompanies,
    activeCompanies,
    accumulatedSales,
    totalSalesContribution
FROM kpi_sales
LIMIT 5;

-- KPI_ADMIN 테이블 확인
SELECT
    totalCompanies,
    activeCompanies,
    accumulatedSales,
    salesRepCount
FROM kpi_admin;
```

#### 4.2 API 테스트

```bash
# 영업담당 KPI 조회
curl -X GET "https://[YOUR-DOMAIN]/api/kpi/sales/[EMPLOYEE_ID]" \
  -H "Authorization: Bearer [TOKEN]"

# 전사 KPI 조회
curl -X GET "https://[YOUR-DOMAIN]/api/kpi/admin" \
  -H "Authorization: Bearer [TOKEN]"

# 순위 조회
curl -X GET "https://[YOUR-DOMAIN]/api/kpi/admin/ranking/total" \
  -H "Authorization: Bearer [TOKEN]"
```

#### 4.3 프론트엔드 테스트

1. **관리자 대시보드** (`/admin/dashboard`)
   - KPI 카드 표시 확인
   - 순위 테이블 확인
   - 그래프 데이터 확인

2. **영업 대시보드** (`/sales/dashboard`)
   - 개인 KPI 표시 확인
   - 목표 달성률 확인

3. **보고서 화면** (`/admin/presentation`)
   - KPI 데이터 로드 확인

### STEP 5: 모니터링

마이그레이션 후 24시간 동안 다음 사항 모니터링:

```bash
# 애플리케이션 로그 확인
railway logs --tail 100

# 에러 로그 확인
SELECT * FROM error_logs
WHERE timestamp > NOW() - INTERVAL 1 HOUR
ORDER BY timestamp DESC;

# KPI 업데이트 확인
SELECT lastUpdated FROM kpi_sales ORDER BY lastUpdated DESC LIMIT 10;
SELECT lastUpdated FROM kpi_admin;
```

## 🚨 롤백 절차

문제 발생 시 즉시 롤백:

### 옵션 1: 백업 복원 (권장)

```bash
# 백업 파일 복원
railway run mysql railway < backup_[TIMESTAMP].sql

# 또는
mysql -h [HOST] -P [PORT] -u [USER] -p railway < backup_[TIMESTAMP].sql
```

### 옵션 2: 역방향 마이그레이션 스크립트

```sql
-- 영문 컬럼을 다시 한글로 변경
ALTER TABLE kpi_sales
    CHANGE COLUMN `assignedCompanies` `담당거래처` INT DEFAULT 0,
    CHANGE COLUMN `activeCompanies` `활성거래처` INT DEFAULT 0,
    CHANGE COLUMN `activationRate` `활성화율` DECIMAL(5,2) DEFAULT 0,
    -- ... (모든 컬럼 역변경)
```

## 📊 마이그레이션 영향 분석

### 데이터베이스 영향
- **테이블 구조 변경**: KPI_SALES, KPI_ADMIN
- **인덱스 재생성**: 2개
- **뷰 재생성**: 2개
- **데이터 손실**: 없음 (컬럼명 변경만 수행)

### 애플리케이션 영향
- **백엔드**: 2개 파일 수정 (완료)
- **프론트엔드**: 28개 파일 검토 필요 (대부분 주석)
- **다운타임**: 약 10-15분 (마이그레이션 + 배포)

### 성능 영향
- **쿼리 성능**: 변화 없음 (컬럼명만 변경)
- **인덱스 효율**: 동일 유지
- **애플리케이션 속도**: 영향 없음

## ✅ 완료 체크리스트

### 사전 준비
- [ ] 데이터베이스 백업 완료
- [ ] 백엔드 코드 변경사항 확인
- [ ] 롤백 계획 수립
- [ ] 사용자 공지 (시스템 점검 안내)

### 마이그레이션 실행
- [ ] 마이그레이션 스크립트 실행
- [ ] 테이블 구조 변경 확인
- [ ] 인덱스 재생성 확인
- [ ] 뷰 재생성 확인
- [ ] 샘플 데이터 확인

### 배포 및 검증
- [ ] 백엔드 재배포
- [ ] API 테스트 성공
- [ ] 프론트엔드 동작 확인
- [ ] 에러 로그 확인
- [ ] 성능 모니터링

### 사후 작업
- [ ] 프론트엔드 주석 정리 (선택)
- [ ] 문서 업데이트
- [ ] 팀 공유
- [ ] 마이그레이션 완료 보고

## 📝 주의사항

1. **프론트엔드 코드**
   - API 응답 데이터는 자동으로 영문 컬럼명 사용
   - 주석 및 로그의 한글은 선택적으로 수정 가능
   - 기능적 영향 없음

2. **데이터 무결성**
   - ALTER TABLE CHANGE COLUMN은 데이터를 유지하면서 이름만 변경
   - 데이터 손실 위험 없음

3. **하위 호환성**
   - 기존 한글 컬럼명을 사용하는 외부 시스템이 있다면 별도 대응 필요
   - 현재 프로젝트 내에서만 사용되므로 문제 없음

## 📞 문제 발생 시 대응

### 일반적인 문제

**문제 1: 마이그레이션 스크립트 실행 실패**
```sql
-- 에러 메시지 확인
SHOW ERRORS;

-- 현재 테이블 구조 확인
SHOW COLUMNS FROM kpi_sales;
SHOW COLUMNS FROM kpi_admin;
```

**해결방법:**
- 특정 컬럼이 이미 존재하는 경우: 해당 컬럼 스킵
- 컬럼이 없는 경우: 컬럼 생성 후 재시도

**문제 2: API 응답 에러**
```bash
# 로그 확인
railway logs | grep "KPI"

# 데이터베이스 연결 확인
railway run mysql railway -e "SELECT 1"
```

**해결방법:**
- 백엔드 재시작: `railway restart`
- 필요시 롤백 수행

**문제 3: 프론트엔드 표시 오류**
- 브라우저 캐시 클리어
- API 응답 데이터 확인 (개발자 도구)
- 백엔드 로그 확인

## 📖 참고 자료

- **컬럼 매핑 테이블**: `backend/migrations/KPI_COLUMN_MAPPING.md`
- **마이그레이션 스크립트**: `backend/migrations/013_rename_kpi_columns_to_english.sql`
- **백엔드 변경사항**:
  - `backend/services/kpi.service.js`
  - `backend/controllers/kpi.controller.js`

## 📅 마이그레이션 이력

| 일자 | 작업 | 담당자 | 상태 |
|------|------|--------|------|
| 2025-xx-xx | 마이그레이션 계획 수립 | Claude Code | ✅ 완료 |
| 2025-xx-xx | 백엔드 코드 수정 | Claude Code | ✅ 완료 |
| 2025-xx-xx | 마이그레이션 스크립트 작성 | Claude Code | ✅ 완료 |
| 2025-xx-xx | 마이그레이션 실행 | - | ⏳ 대기 |
| 2025-xx-xx | 검증 및 모니터링 | - | ⏳ 대기 |

---

**작성일**: 2025년
**작성자**: Claude Code Assistant
**검토자**: (검토 후 기입)
**승인자**: (승인 후 기입)
