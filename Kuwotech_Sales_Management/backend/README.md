# 🚀 KUWOTECH 영업관리 시스템 - 백엔드 API

## 📋 프로젝트 개요

KUWOTECH 영업관리 시스템의 백엔드 API 서버입니다.  
Express.js와 MySQL을 사용하여 RESTful API를 제공합니다.

## 🛠️ 기술 스택

- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js
- **Database**: MySQL (Railway)
- **Authentication**: JWT (JSON Web Token)
- **ORM**: mysql2 (Promise)

## 📁 프로젝트 구조

```
backend/
├── src/
│   ├── config/          # 설정 파일
│   │   └── database.js  # MySQL 연결 설정
│   ├── models/          # 데이터 모델
│   ├── controllers/     # 비즈니스 로직
│   ├── routes/          # API 라우트
│   ├── middleware/      # 미들웨어
│   └── utils/           # 유틸리티 함수
├── scripts/             # 유틸리티 스크립트
│   └── init-db.js       # DB 초기화
├── .env.example         # 환경 변수 템플릿
├── .gitignore           # Git 제외 파일
├── package.json         # 프로젝트 의존성
├── server.js            # Express 서버 진입점
└── README.md            # 이 파일
```

## 🚀 설치 및 실행

### 1. 의존성 설치

```bash
cd backend
npm install
```

### 2. 환경 변수 설정

`.env` 파일을 생성하고 아래 내용을 입력하세요:

```env
DATABASE_URL=mysql://root:password@host:port/database
JWT_SECRET=your_jwt_secret_here_minimum_32_characters
JWT_EXPIRES_IN=1d
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5500
```

### 3. 데이터베이스 마이그레이션

#### 방법 1: 통합 마이그레이션 스크립트 (권장)

```bash
node backend/scripts/migrate-all.js
```

전체 프로세스를 순차적으로 실행:
1. 기존 테이블 삭제
2. 새 테이블 생성 (UUID 스키마)
3. 엑셀 → JSON 파싱
4. JSON → MySQL 임포트
5. 트리거 생성
6. 데이터 검증

#### 방법 2: 단계별 실행

```bash
# 1. 테이블 삭제 (선택사항)
node backend/scripts/drop-tables.js

# 2. 테이블 생성
node backend/scripts/init-db.js

# 3. 엑셀 파싱
node backend/scripts/parse-excel-to-json.js

# 4. 데이터 임포트
node backend/scripts/import-data.js

# 5. 트리거 생성
node backend/scripts/create-triggers.js

# 6. 데이터 검증
node backend/scripts/validate-data.js
```

#### 주의사항

- `migrate-all.js`는 기존 데이터를 삭제하므로 백업 필수
- 엑셀 파일 경로 확인: `01.Original_data/영업관리기초자료.xlsx`
- DATABASE_URL 환경변수 확인

### 4. 서버 실행

**개발 모드** (nodemon):
```bash
npm run dev
```

**프로덕션 모드**:
```bash
npm start
```

## 🗄️ 데이터베이스 스키마 (UUID 기반)

### 1. employees (직원 - 13 필드)
- `id` (PK): 자동 증가 ID
- `name` (UNIQUE): 이름 (로그인 아이디로 사용)
- `email`: 이메일
- `password`: bcrypt 해시 비밀번호
- **`role1`**: 주 역할 (영업담당 또는 관리자)
- **`role2`**: 부 역할 (복수 역할인 경우)
- `department`: 부서
- `hireDate`: 입사일
- `phone`: 전화번호
- `status`: 재직상태 (재직/휴직/퇴사)
- **`canUploadExcel`**: 엑셀 업로드 권한 (강정환만 TRUE)
- `lastLogin`: 마지막 로그인
- `createdAt`, `updatedAt`: 생성/수정일

**직원 통계**:
- 단일 역할: 16명 (영업담당 14명 + 관리자 2명)
- 복수 역할: 2명 (김태선, 송호영 - 영업담당+관리자)
- 기본 비밀번호: `1234` (모든 직원)

### 2. companies (거래처 - 19 필드)
- **`keyValue` (PK)**: UUID v4 고유 식별자
- `erpCompanyName`: ERP상 거래처명
- `finalCompanyName`: 최종 거래처명
- `isClosed`: 폐업여부 (Y/N)
- `ceoOrDentist`: 대표이사/치과의사
- `customerRegion`: 고객사 지역
- `businessStatus`: 거래상태 (활성/비활성/불용/추가확인)
- `department`: 담당부서
- **`salesProduct`**: 판매제품 (자동 업데이트)
- `internalManager`: 내부담당자
- `jcwContribution`: 정철웅기여 (상/중/하)
- `companyContribution`: 회사기여 (상/중/하)
- **자동 업데이트 필드** (트리거):
  - `lastPaymentDate`: 마지막결제일
  - `lastPaymentAmount`: 마지막총결제금액
  - `accumulatedCollection`: 누적수금금액
  - `accumulatedSales`: 누적매출금액
  - `businessActivity`: 영업활동-특이사항

**거래처 통계** (1008개):
- 활성: 743개, 비활성: 214개, 불용: 51개
- 폐업: 34개, 영업중: 974개

### 3. reports (실적보고서 - 15 필드)
- `reportId` (PK): UUID 보고서ID
- `submittedBy` (FK → employees.name): 작성자명
- `submittedDate`: 제출일
- `companyId` (FK → companies.keyValue): 거래처ID
- `reportType`: 보고서유형
- `targetCollectionAmount`: 목표수금금액
- `targetSalesAmount`: 목표매출액
- `targetProducts`: 판매목표제품
- `activityNotes`: 활동내역
- **`status`**: 상태 (임시저장/제출완료/승인/반려)
- `processedBy` (FK → employees.name): 처리자 (관리자)
- `processedDate`: 처리일
- `adminComment`: 관리자코멘트
- `createdAt`, `updatedAt`: 생성/수정일

### 4. change_history (변경 이력 - 10 필드)
- `id` (PK): 자동 증가 ID
- `tableName`: 테이블명
- `operation`: 작업유형 (INSERT/UPDATE/DELETE)
- `recordId`: 레코드ID
- `changedBy`: 변경자
- `oldData`: 변경 전 데이터 (JSON)
- `newData`: 변경 후 데이터 (JSON)
- `changedAt`: 변경일시
- `ipAddress`: IP주소
- `userAgent`: 사용자에이전트

### 5. backups (백업 - 12 필드)
- `id` (PK): 자동 증가 ID
- `backupName`: 백업명
- `backupType`: 백업유형 (수동/자동/시스템)
- `backupData`: 백업데이터 (LONGTEXT JSON)
- `dataSize`: 백업크기 (바이트)
- `recordCount`: 레코드수
- `createdBy`: 생성자
- `description`: 설명
- `isRestored`: 복원여부
- `restoredAt`: 복원일시
- `restoredBy`: 복원자
- `createdAt`: 생성일시

## 🔧 트리거 시스템

### 자동 업데이트 트리거 (3개)

1. **after_report_approved_insert**: 보고서 승인 시 companies 업데이트
2. **after_report_approved_update**: 승인 상태 변경 시 누적 금액 관리
3. **after_report_approved_delete**: 승인 보고서 삭제 시 롤백

**자동 업데이트 로직**:
- 보고서 상태가 '승인'으로 변경 시:
  - `salesProduct`: 판매제품 누적
  - `lastPaymentDate`: 최신 날짜로 갱신
  - `lastPaymentAmount`: 최근 수금금액으로 갱신
  - `accumulatedCollection`: 수금금액 합산
  - `accumulatedSales`: 매출금액 합산
  - `businessActivity`: 활동내역 누적

## 👥 역할 시스템 (role1/role2)

### 로그인 로직
- **모든 직원**: 로그인 시 역할 선택
- **단일 역할 직원** (16명): 잘못된 역할 선택 시 경고
- **복수 역할 직원** (2명): 상황에 따라 자유롭게 선택
  - 김태선: 영업담당 + 관리자
  - 송호영: 영업담당 + 관리자

### 특별 권한
- **강정환**: `canUploadExcel = true` (엑셀 업로드 유일 권한)

## 📡 API 엔드포인트

### 기본
- `GET /` - API 정보
- `GET /api/health` - Health Check

### 인증 (예정)
- `POST /api/auth/login` - 로그인
- `POST /api/auth/logout` - 로그아웃
- `POST /api/auth/refresh` - 토큰 갱신

### 거래처 (예정)
- `GET /api/companies` - 전체 거래처 조회
- `GET /api/companies/:id` - 특정 거래처 조회
- `POST /api/companies` - 거래처 생성
- `PUT /api/companies/:id` - 거래처 수정
- `DELETE /api/companies/:id` - 거래처 삭제

### 보고서 (예정)
- `GET /api/reports` - 전체 보고서 조회
- `POST /api/reports` - 보고서 작성
- `PUT /api/reports/:id` - 보고서 수정
- `DELETE /api/reports/:id` - 보고서 삭제

## 🔐 환경 변수

| 변수명 | 설명 | 기본값 |
|--------|------|--------|
| `DATABASE_URL` | MySQL 연결 URL | 필수 |
| `JWT_SECRET` | JWT 비밀키 | 필수 |
| `JWT_EXPIRES_IN` | JWT 만료 시간 | 1d |
| `PORT` | 서버 포트 | 3000 |
| `NODE_ENV` | 실행 환경 | development |
| `FRONTEND_URL` | 프론트엔드 URL | http://localhost:5500 |

## 🚨 오류 해결

### MySQL 연결 실패
```
❌ MySQL 연결 실패: ECONNREFUSED
```
- `.env` 파일의 `DATABASE_URL` 확인
- Railway MySQL이 Running 상태인지 확인

### 포트 충돌
```
❌ Error: listen EADDRINUSE: address already in use :::3000
```
- 다른 프로세스가 3000번 포트 사용 중
- `.env`에서 PORT 변경

## 📝 개발 가이드

### 코드 작성 규칙
1. ES Modules 사용 (`import/export`)
2. async/await 사용 (Promise 체이닝 지양)
3. 에러는 try-catch로 처리
4. 함수명은 명확하게 (동사 + 명사)

### 커밋 메시지 규칙
- `feat:` 새 기능 추가
- `fix:` 버그 수정
- `docs:` 문서 수정
- `refactor:` 코드 리팩토링
- `test:` 테스트 추가

## 📦 배포

### Railway 배포
1. GitHub에 푸시
2. Railway 자동 배포 확인
3. 환경 변수 설정 확인
4. Health Check 테스트

```bash
# Health Check
curl https://your-app.up.railway.app/api/health
```

## 👥 팀

- **개발**: KUWOTECH
- **버전**: 1.0.0
- **라이선스**: ISC

## 📞 문의

문제가 발생하거나 질문이 있으시면 이슈를 등록해주세요.

---

**최종 수정일**: 2025-10-03  
**문서 버전**: 1.0.0
