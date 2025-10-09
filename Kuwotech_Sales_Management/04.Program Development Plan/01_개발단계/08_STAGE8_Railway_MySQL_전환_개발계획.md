# 📋 STAGE 8: Railway MySQL 전환 개발 계획서

> **작성일**: 2025-10-05  
> **버전**: 1.0  
> **목적**: 05.Source를 Railway MySQL 기반으로 전환 개발

---

## 📑 목차

### PART 1: 개요
- [1. 프로젝트 개요](#1-프로젝트-개요)
- [2. 기술 스택](#2-기술-스택)
- [3. 개발 환경](#3-개발-환경)
- [4. 개발 원칙](#4-개발-원칙)

### PART 2: 개발 단계
- [PHASE 1: 환경 구축 및 인증](#phase-1-환경-구축-및-인증)
  - [1-1. Backend API 기반 구축](#1-1-backend-api-기반-구축)
  - [1-2. Frontend API 클라이언트 구축](#1-2-frontend-api-클라이언트-구축)
  - [1-3. 로그인 시스템 통합](#1-3-로그인-시스템-통합)

- [PHASE 2: 영업담당 모드 개발](#phase-2-영업담당-모드-개발)
  - [2-1. 대시보드 (Dashboard)](#2-1-대시보드-dashboard)
  - [2-2. 담당거래처 관리 (My Companies)](#2-2-담당거래처-관리-my-companies)
  - [2-3. 실적보고서 작성 (Report Write)](#2-3-실적보고서-작성-report-write)
  - [2-4. 실적보고서 확인 (Report Check)](#2-4-실적보고서-확인-report-check)
  - [2-5. 데이터 관리 (Data Management)](#2-5-데이터-관리-data-management)
  - [2-6. 시스템 설정 (System Settings)](#2-6-시스템-설정-system-settings)

- [PHASE 3: 관리자 모드 개발](#phase-3-관리자-모드-개발)
  - [3-1. 대시보드 (Dashboard)](#3-1-대시보드-dashboard)
  - [3-2. 전체거래처 관리 (All Companies)](#3-2-전체거래처-관리-all-companies)
  - [3-3. 실적보고서 확인 (Report Confirm)](#3-3-실적보고서-확인-report-confirm)
  - [3-4. 보고서 발표 (Presentation)](#3-4-보고서-발표-presentation)
  - [3-5. 데이터 관리 (Data Management)](#3-5-데이터-관리-data-management)
  - [3-6. 직원 관리 (Employee Management)](#3-6-직원-관리-employee-management)
  - [3-7. 시스템 설정 (System Settings)](#3-7-시스템-설정-system-settings)
  - [3-8. Excel 업로드 (Excel Upload)](#3-8-excel-업로드-excel-upload)

### PART 3: 통합 및 배포
- [PHASE 4: 통합 테스트](#phase-4-통합-테스트)
- [PHASE 5: 배포 준비](#phase-5-배포-준비)

### PART 4: 참고 자료
- [부록 A: API 엔드포인트 목록](#부록-a-api-엔드포인트-목록)
- [부록 B: 데이터 모델](#부록-b-데이터-모델)
- [부록 C: 체크리스트](#부록-c-체크리스트)

---

# PART 1: 개요

## 1. 프로젝트 개요

### 1.1 목표
**IndexedDB 기반 → Railway MySQL 기반으로 완전 전환**

### 1.2 전환 범위
- ❌ IndexedDB 코드 삭제
- ✅ Railway MySQL + REST API
- ✅ 프론트엔드 ↔ 백엔드 통신
- ✅ JWT 인증 체계
- ✅ 실시간 데이터 동기화

### 1.3 개발 순서
```
로그인 시스템
    ↓
영업담당 모드 (메뉴 순서대로)
├── 1. 대시보드
├── 2. 담당거래처 관리
├── 3. 실적보고서 작성
├── 4. 실적보고서 확인
├── 5. 데이터 관리
└── 6. 시스템 설정
    ↓
관리자 모드 (메뉴 순서대로)
├── 1. 대시보드
├── 2. 전체거래처 관리
├── 3. 실적보고서 확인
├── 4. 보고서 발표
├── 5. 데이터 관리
├── 6. 직원 관리
├── 7. 시스템 설정
└── 8. Excel 업로드
```

---

## 2. 기술 스택

### 2.1 Backend
| 기술 | 버전 | 용도 |
|------|------|------|
| Node.js | 18.x | 런타임 |
| Express | 4.x | 웹 프레임워크 |
| MySQL | 8.x | 데이터베이스 (Railway) |
| mysql2 | Latest | MySQL 드라이버 |
| JWT | Latest | 인증 |
| bcrypt | Latest | 비밀번호 암호화 |

### 2.2 Frontend
| 기술 | 버전 | 용도 |
|------|------|------|
| Vanilla JS | ES6+ | 프론트엔드 로직 |
| Fetch API | - | HTTP 통신 |
| SheetJS | Latest | Excel 처리 |

### 2.3 개발 도구
| 도구 | 용도 |
|------|------|
| VS Code | 개발 환경 |
| Postman | API 테스트 |
| Chrome DevTools | 디버깅 |
| Railway | 배포 환경 |

---

## 3. 개발 환경

### 3.1 Railway 설정
```
Project: feb984a8-a370-49ea-b0a2-be7421c89875
Environment: de407933-5630-470a-a2c0-674b3194bbbb
MySQL URL: mysql://root:HAzwZBnqgZdOxGCoQRfZOdGaPVMhlhlD@mysql.railway.internal:3306/railway
```

### 3.2 로컬 환경
```
Node.js: C:\Development environment\node\node_installation\node.exe
Python: C:\Python313
Git: C:\Development environment\git\git_installation\Git
```

### 3.3 프로젝트 경로
```
작업 폴더: F:\7.VScode\Running VS Code\KUWOTECH\Kuwotech_Sales_Management
Backend: ./backend
Frontend: ./05.Source
```

---

## 4. 개발 원칙

### 4.1 코딩 원칙
1. **Backend 먼저, Frontend 나중**
   - API 엔드포인트 먼저 완성
   - Postman으로 테스트
   - Frontend 연동

2. **작은 단위로 개발**
   - 기능별 완성 후 다음 단계
   - 즉시 테스트 가능한 단위
   - 롤백 가능한 구조

3. **일관성 유지**
   - API 응답 형식 통일
   - 에러 코드 체계화
   - 네이밍 컨벤션 준수

4. **보안 우선**
   - JWT 토큰 검증
   - 권한 체크
   - SQL Injection 방지
   - XSS 방지

### 4.2 테스트 원칙
1. **Backend 테스트**
   - Postman으로 모든 API 테스트
   - 성공/실패 케이스 확인
   - 권한별 테스트

2. **Frontend 테스트**
   - Chrome DevTools Console 확인
   - Network 탭에서 요청/응답 확인
   - UI 동작 확인

3. **통합 테스트**
   - End-to-End 시나리오
   - 권한별 플로우
   - 에러 핸들링

### 4.3 문서화 원칙
1. **API 문서**
   - 엔드포인트별 문서화
   - 요청/응답 예시
   - 에러 코드 정의

2. **코드 주석**
   - 네비게이션 주석
   - 복잡한 로직 설명
   - TODO 표시

3. **변경 이력**
   - Git 커밋 메시지
   - 기능별 변경사항
   - 이슈 해결 기록

---

# PART 2: 개발 단계

## PHASE 1: 환경 구축 및 인증

### 1-1. Backend API 기반 구축

#### 1-1-1. Railway MySQL 연결 설정

**작업 파일:**
- `backend/config/database.js`

**작업 내용:**
1. MySQL 연결 풀 생성
2. 연결 테스트
3. 에러 처리

**Backend 코드 체크포인트:**
```javascript
// 연결 풀 정상 생성 확인
// 쿼리 실행 테스트
// 재연결 로직 확인
```

**테스트 방법:**
```bash
# Backend 서버 실행
cd backend
node server.js

# 콘솔에서 "✅ MySQL Pool 생성 완료" 확인
```

**완료 기준:**
- [ ] MySQL 연결 성공
- [ ] Connection Pool 정상 작동
- [ ] 에러 발생 시 재연결

---

#### 1-1-2. 인증 API 구현

**작업 파일:**
- `backend/controllers/auth.controller.js`
- `backend/routes/auth.js`
- `backend/middleware/auth.middleware.js`

**Backend API 목록:**

**A. POST /api/auth/login**
```
Request:
{
  "username": "kjh",
  "password": "1234"
}

Response:
{
  "success": true,
  "data": {
    "token": "jwt_token_here",
    "refreshToken": "refresh_token_here",
    "user": {
      "id": 1,
      "username": "kjh",
      "name": "강정환",
      "role": "admin",
      "department": "영업부"
    }
  },
  "message": "로그인 성공"
}

Error Response:
{
  "success": false,
  "error": {
    "message": "사용자명 또는 비밀번호가 잘못되었습니다"
  }
}
```

**B. POST /api/auth/logout**
```
Request Headers:
Authorization: Bearer {token}

Response:
{
  "success": true,
  "message": "로그아웃 되었습니다"
}
```

**C. POST /api/auth/refresh**
```
Request:
{
  "refreshToken": "refresh_token_here"
}

Response:
{
  "success": true,
  "data": {
    "token": "new_jwt_token"
  }
}
```

**D. GET /api/auth/me**
```
Request Headers:
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "id": 1,
    "username": "kjh",
    "name": "강정환",
    "email": "kjh@kuwotech.com",
    "phone": "010-1234-5678",
    "department": "영업부",
    "role": "admin",
    "position": "대표이사"
  }
}
```

**Postman 테스트 순서:**
1. POST /api/auth/login (성공 케이스)
2. POST /api/auth/login (실패 케이스 - 잘못된 비밀번호)
3. GET /api/auth/me (토큰 포함)
4. GET /api/auth/me (토큰 없음 - 401 에러)
5. POST /api/auth/refresh
6. POST /api/auth/logout

**완료 기준:**
- [ ] 모든 API 엔드포인트 정상 작동
- [ ] JWT 토큰 생성/검증 정상
- [ ] Postman 테스트 100% 통과
- [ ] 에러 처리 완비

---

#### 1-1-3. 초기 데이터 설정

**작업 파일:**
- `backend/scripts/init-db.js` (신규 생성)

**작업 내용:**
1. 테이블 생성 스크립트
2. 초기 관리자 계정 생성
3. 샘플 데이터 삽입 (선택)

**실행 방법:**
```bash
cd backend
node scripts/init-db.js
```

**완료 기준:**
- [ ] 모든 테이블 생성 완료
- [ ] 초기 관리자 계정 생성 (kjh/1234)
- [ ] 데이터베이스 스키마 확인

---

### 1-2. Frontend API 클라이언트 구축

#### 1-2-1. 전역 설정 수정

**작업 파일:**
- `05.Source/01.common/01_global_config.js`

**작업 내용:**
1. IndexedDB 관련 설정 삭제
2. Backend API 설정 추가
3. JWT 설정 추가

**수정 내용:**
```javascript
// [삭제] IndexedDB 설정
// DB_NAME: 'KuwotechSalesDB',
// DB_VERSION: 3,

// [추가] Backend API 설정
BACKEND: {
  BASE_URL: process.env.BACKEND_URL || 'http://localhost:3000/api',
  TIMEOUT: 10000,
  RETRY_COUNT: 3
},

// [추가] JWT 설정
AUTH: {
  TOKEN_KEY: 'kuwotech_auth_token',
  REFRESH_KEY: 'kuwotech_refresh_token',
  USER_KEY: 'kuwotech_user_info'
}
```

**완료 기준:**
- [ ] IndexedDB 관련 설정 완전 삭제
- [ ] Backend URL 정확히 설정
- [ ] 환경별 설정 분리 (개발/프로덕션)

---

#### 1-2-2. API 클라이언트 구현

**작업 파일:**
- `05.Source/01.common/13_api_manager.js`

**작업 내용:**
1. Fetch API 래퍼 구현
2. JWT 토큰 자동 포함
3. 에러 처리 통합
4. 요청/응답 인터셉터

**구현 기능:**

**A. 기본 HTTP 메서드**
```javascript
// GET 요청
await api.get('/companies');

// POST 요청
await api.post('/companies', { data });

// PUT 요청
await api.put('/companies/1', { data });

// DELETE 요청
await api.delete('/companies/1');
```

**B. 인증 관련**
```javascript
// 토큰 자동 포함
// 토큰 만료 시 자동 갱신
// 갱신 실패 시 로그인 페이지로 이동
```

**C. 에러 처리**
```javascript
// 네트워크 에러
// 서버 에러 (5xx)
// 클라이언트 에러 (4xx)
// 타임아웃
```

**완료 기준:**
- [ ] 모든 HTTP 메서드 구현
- [ ] JWT 토큰 자동 관리
- [ ] 에러 처리 완비
- [ ] 로딩 상태 관리

---

#### 1-2-3. 세션 관리자 구현

**작업 파일:**
- `05.Source/01.common/16_session_manager.js`

**작업 내용:**
1. IndexedDB 세션 코드 삭제
2. LocalStorage 기반 세션으로 변경
3. JWT 토큰 관리
4. 사용자 정보 캐싱

**구현 기능:**

**A. 토큰 관리**
```javascript
// 토큰 저장
SessionManager.setToken(token, refreshToken);

// 토큰 조회
const token = SessionManager.getToken();

// 토큰 삭제
SessionManager.clearToken();

// 토큰 유효성 검증
const isValid = SessionManager.isTokenValid();
```

**B. 사용자 정보 관리**
```javascript
// 사용자 정보 저장
SessionManager.setUser(userInfo);

// 사용자 정보 조회
const user = SessionManager.getUser();

// 권한 확인
const isAdmin = SessionManager.hasRole('admin');
```

**완료 기준:**
- [ ] IndexedDB 코드 완전 삭제
- [ ] LocalStorage 토큰 저장
- [ ] 토큰 만료 체크
- [ ] 페이지 새로고침 시 세션 유지

---

### 1-3. 로그인 시스템 통합

#### 1-3-1. 로그인 화면 수정

**작업 파일:**
- `05.Source/02.login/02_login.js`
- `05.Source/02.login/04_auth.js`
- `05.Source/02.login/stages/` (모든 단계)

**작업 내용:**

**A. Stage 1: 개발자 모드 (변경 없음)**
- 기존 로직 유지

**B. Stage 2: Excel 업로드 (임시 제거)**
- Backend에 직원 데이터 있으므로 Skip
- 또는 Backend에서 직원 목록 가져오기

**C. Stage 3: 사용자 선택**
- IndexedDB 조회 삭제
- Backend API `/api/employees` 호출
- 직원 목록 표시

**D. Stage 4: 비밀번호 입력**
- 사용자 선택 후 비밀번호 입력
- Backend `/api/auth/login` 호출
- JWT 토큰 받기

**E. Stage 5: 모드 진입**
- 토큰 저장
- 사용자 정보 저장
- 역할에 따라 페이지 이동

**구현 순서:**

**1. Stage 3 수정 (사용자 선택)**
```javascript
// [삭제] IndexedDB에서 직원 조회
// const employees = await db.getAll('employees');

// [추가] Backend API 호출
const response = await api.get('/employees');
const employees = response.data;

// 화면에 표시
displayEmployees(employees);
```

**2. Stage 4 추가 (비밀번호 입력)**
```javascript
// 선택한 사용자 ID
const selectedUserId = userData.selectedEmployee;

// 비밀번호 입력 폼 표시
showPasswordForm();

// 로그인 처리
async function handleLogin(password) {
  const response = await api.post('/auth/login', {
    username: selectedUserId,
    password: password
  });
  
  if (response.success) {
    // 토큰 저장
    SessionManager.setToken(
      response.data.token,
      response.data.refreshToken
    );
    
    // 사용자 정보 저장
    SessionManager.setUser(response.data.user);
    
    // 다음 단계로
    nextStep();
  }
}
```

**3. Stage 5 수정 (모드 진입)**
```javascript
// [변경 없음] 역할에 따라 페이지 이동
const user = SessionManager.getUser();

if (user.role === 'sales') {
  window.location.href = '../03.sales_mode/01_dashboard/01_dashboard.html';
} else if (user.role === 'admin') {
  window.location.href = '../04.admin_mode/01_dashboard/01_dashboard.html';
}
```

**테스트 시나리오:**
1. 개발자 모드 인증 (kjh/1234)
2. 직원 목록 표시 확인
3. 직원 선택
4. 비밀번호 입력
5. 로그인 성공 → 토큰 저장 확인
6. 역할별 페이지 이동 확인

**완료 기준:**
- [ ] 로그인 플로우 정상 작동
- [ ] JWT 토큰 저장 확인
- [ ] 사용자 정보 저장 확인
- [ ] 권한별 페이지 이동 정확
- [ ] 에러 처리 완비

---

#### 1-3-2. 인증 가드 구현

**작업 파일:**
- `05.Source/01.common/17_auth_guard.js` (신규 생성)

**작업 내용:**
1. 모든 페이지에서 인증 체크
2. 토큰 없으면 로그인 페이지로 이동
3. 토큰 만료 체크
4. 권한 체크

**구현 내용:**
```javascript
// 페이지 로드 시 자동 실행
class AuthGuard {
  static async checkAuth() {
    // 토큰 확인
    const token = SessionManager.getToken();
    
    if (!token) {
      // 로그인 페이지로 이동
      window.location.href = '/05.Source/02.login/01_login.html';
      return false;
    }
    
    // 토큰 유효성 검증
    if (!SessionManager.isTokenValid()) {
      // 토큰 갱신 시도
      const refreshed = await this.refreshToken();
      if (!refreshed) {
        window.location.href = '/05.Source/02.login/01_login.html';
        return false;
      }
    }
    
    return true;
  }
  
  static async checkRole(requiredRole) {
    const user = SessionManager.getUser();
    
    if (user.role !== requiredRole) {
      alert('권한이 없습니다.');
      window.location.href = '/';
      return false;
    }
    
    return true;
  }
}

// 모든 페이지에서 사용
window.addEventListener('DOMContentLoaded', async () => {
  await AuthGuard.checkAuth();
});
```

**완료 기준:**
- [ ] 인증 체크 자동 실행
- [ ] 토큰 없을 시 리다이렉트
- [ ] 토큰 자동 갱신
- [ ] 권한 체크 정확

---

#### 1-3-3. IndexedDB 관련 파일 정리

**삭제할 파일:**
- `05.Source/06.database/01_database_manager.js`
- `05.Source/06.database/02_schema.js`
- `05.Source/06.database/03_crud.js`
- `05.Source/06.database/05_excel_sync.js` (일부 보존)
- `05.Source/06.database/06_change_history.js`
- `05.Source/06.database/07_backup.js`

**보존할 파일:**
- `05.Source/06.database/12_download_manager.js` (Excel 다운로드용)
- `05.Source/06.database/13_download_progress.js` (진행 표시)

**작업 내용:**
1. 위 파일들 삭제
2. 해당 파일 import하는 곳 모두 수정
3. 사용하지 않는 함수 호출 제거

**완료 기준:**
- [ ] IndexedDB 관련 파일 완전 삭제
- [ ] Import 에러 없음
- [ ] Console 에러 없음

---

## PHASE 2: 영업담당 모드 개발

### 2-1. 대시보드 (Dashboard)

#### 2-1-1. Backend API 개발

**작업 파일:**
- `backend/controllers/kpi.controller.js` (신규 생성)
- `backend/routes/kpi.js` (신규 생성)
- `backend/services/kpiService.js` (참고: 03_백엔드_코드_전체.md)

**Backend API:**

**A. GET /api/kpi/sales/:userId**
```
Request Headers:
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "companies": {
      "total": 123,              // 담당거래처
      "active": 98,              // 활성거래처
      "activeRate": 79.67,       // 활성화율
      "majorProduct": 45         // 주요제품판매거래처
    },
    "achievement": {
      "companyRate": 53.75,      // 회사배정기준 달성율
      "majorRate": 12.50         // 주요고객처 목표달성율
    },
    "sales": {
      "accumulated": 500000000,  // 누적매출금액
      "majorProduct": 300000000, // 주요제품매출액
      "majorRate": 60.0,         // 주요제품매출비율
      "concentration": 4065041   // 매출집중도
    },
    "finance": {
      "collection": 450000000,   // 누적수금금액
      "receivable": 50000000     // 매출채권잔액
    },
    "contribution": {
      "total": 25.5,             // 전체매출기여도
      "major": 30.2              // 주요매출기여도
    }
  }
}
```

**Postman 테스트:**
1. 로그인하여 토큰 받기
2. GET /api/kpi/sales/{userId} 호출
3. 14개 지표 값 확인
4. 계산 정확도 검증

**완료 기준:**
- [ ] API 정상 응답
- [ ] 14개 KPI 모두 계산
- [ ] 계산 시간 < 500ms
- [ ] 데이터 정확성 100%

---

#### 2-1-2. Frontend 개발

**작업 파일:**
- `05.Source/03.sales_mode/01_dashboard/02_dashboard.js`

**작업 내용:**

**1. IndexedDB 코드 삭제**
```javascript
// [삭제] 
// const companies = await db.getAll('companies');
// const kpi = KPICalculator.calculate(companies);
```

**2. Backend API 호출 추가**
```javascript
// [추가]
async function loadDashboard() {
  try {
    // 로딩 표시
    showLoading();
    
    // 현재 사용자 ID
    const user = SessionManager.getUser();
    
    // KPI 조회
    const response = await api.get(`/kpi/sales/${user.id}`);
    
    if (response.success) {
      // KPI 카드 표시
      displayKPICards(response.data);
    }
    
  } catch (error) {
    showError('KPI 데이터를 불러오는데 실패했습니다.');
  } finally {
    hideLoading();
  }
}

// KPI 카드 표시 함수
function displayKPICards(kpiData) {
  // 담당거래처
  updateKPICard('total-companies', kpiData.companies.total);
  
  // 활성거래처
  updateKPICard('active-companies', kpiData.companies.active);
  
  // 활성화율
  updateKPICard('active-rate', kpiData.companies.activeRate, '%');
  
  // ... 나머지 11개 지표
}
```

**3. 실시간 갱신 (선택)**
```javascript
// 5분마다 자동 갱신
setInterval(() => {
  loadDashboard();
}, 5 * 60 * 1000);
```

**테스트 시나리오:**
1. 로그인 후 대시보드 접속
2. KPI 카드 14개 표시 확인
3. 숫자 포맷 확인 (천 단위 콤마)
4. 음수 처리 확인 (빨간색, 괄호)
5. 로딩 상태 표시 확인

**완료 기준:**
- [ ] 14개 KPI 카드 정상 표시
- [ ] 숫자 포맷팅 정확
- [ ] 로딩 상태 표시
- [ ] 에러 처리 완비

---

#### 2-1-3. KPI 다운로드 기능

**작업 파일:**
- `05.Source/03.sales_mode/01_dashboard/03_download_kpi.js`

**작업 내용:**

**1. Backend에서 데이터 가져오기**
```javascript
async function downloadKPI() {
  try {
    const user = SessionManager.getUser();
    
    // KPI 데이터 조회
    const response = await api.get(`/kpi/sales/${user.id}`);
    
    // Excel 생성 (SheetJS)
    const workbook = createKPIWorkbook(response.data);
    
    // 다운로드
    const filename = `KPI_${user.name}_${new Date().toISOString()}.xlsx`;
    XLSX.writeFile(workbook, filename);
    
  } catch (error) {
    showError('다운로드에 실패했습니다.');
  }
}
```

**2. Excel 파일 생성**
```javascript
function createKPIWorkbook(kpiData) {
  // 시트 데이터 생성
  const sheetData = [
    ['지표명', '값', '단위'],
    ['담당거래처', kpiData.companies.total, '개'],
    ['활성거래처', kpiData.companies.active, '개'],
    // ... 나머지 데이터
  ];
  
  // 워크북 생성
  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'KPI');
  
  return wb;
}
```

**완료 기준:**
- [ ] 다운로드 버튼 클릭 시 Excel 생성
- [ ] 14개 KPI 모두 포함
- [ ] 파일명 형식 정확
- [ ] 에러 처리 완비

---

### 2-2. 담당거래처 관리 (My Companies)

#### 2-2-1. Backend API 개발

**작업 파일:**
- `backend/controllers/companies.controller.js`
- `backend/routes/companies.js`

**Backend API:**

**A. GET /api/companies/my**
```
Request Headers:
Authorization: Bearer {token}

Query Parameters:
- status: 거래상태 필터 (optional)
- search: 검색어 (optional)
- page: 페이지 번호 (optional, default: 1)
- limit: 페이지당 개수 (optional, default: 50)

Response:
{
  "success": true,
  "data": {
    "companies": [
      {
        "id": 1,
        "keyValue": "KEY001",
        "companyNameERP": "A치과",
        "finalCompanyName": "A치과의원",
        "representative": "홍길동",
        "internalManager": "김영업",
        "businessStatus": "거래중",
        "accumulatedSales": 10000000,
        "accumulatedCollection": 9000000,
        "accountsReceivable": 1000000,
        "salesProduct": "제품A, 제품B",
        "businessActivity": "최근 방문 완료",
        // ... 기타 필드
      }
    ],
    "pagination": {
      "total": 123,
      "page": 1,
      "limit": 50,
      "totalPages": 3
    }
  }
}
```

**B. GET /api/companies/:id**
```
Request Headers:
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "id": 1,
    "keyValue": "KEY001",
    // ... 모든 필드
  }
}
```

**C. POST /api/companies**
```
Request Headers:
Authorization: Bearer {token}

Request Body:
{
  "keyValue": "KEY999",
  "companyNameERP": "신규치과",
  "finalCompanyName": "신규치과의원",
  "representative": "김대표",
  "internalManager": "김영업",
  // ... 기타 필드
}

Response:
{
  "success": true,
  "data": {
    "id": 999
  },
  "message": "거래처가 생성되었습니다"
}
```

**D. PUT /api/companies/:id**
```
Request Headers:
Authorization: Bearer {token}

Request Body:
{
  "finalCompanyName": "수정된치과",
  "businessActivity": "신규 영업활동",
  // ... 수정할 필드만
}

Response:
{
  "success": true,
  "message": "거래처가 수정되었습니다"
}
```

**E. DELETE /api/companies/:id**
```
Request Headers:
Authorization: Bearer {token}

Response:
{
  "success": true,
  "message": "거래처가 삭제되었습니다"
}
```

**Postman 테스트:**
1. GET /api/companies/my (목록 조회)
2. GET /api/companies/my?status=거래중 (필터)
3. GET /api/companies/my?search=A치과 (검색)
4. GET /api/companies/1 (상세 조회)
5. POST /api/companies (생성)
6. PUT /api/companies/1 (수정)
7. DELETE /api/companies/1 (삭제 - 영업담당은 권한 없음 확인)

**완료 기준:**
- [ ] 모든 API 정상 작동
- [ ] 페이지네이션 정확
- [ ] 필터/검색 정상
- [ ] 권한 체크 정확
- [ ] 변경 이력 자동 기록

---

#### 2-2-2. Frontend 개발

**작업 파일:**
- `05.Source/03.sales_mode/02_my_companies/02_my_companies.js`

**작업 내용:**

**1. IndexedDB 코드 삭제 및 API 호출 추가**

```javascript
// [삭제]
// const companies = await db.getAll('companies');
// const myCompanies = companies.filter(c => c.internalManager === currentUser);

// [추가]
async function loadMyCompanies(page = 1, filters = {}) {
  try {
    showLoading();
    
    // 쿼리 파라미터 생성
    const params = new URLSearchParams({
      page,
      limit: 50,
      ...filters
    });
    
    // API 호출
    const response = await api.get(`/companies/my?${params}`);
    
    if (response.success) {
      displayCompaniesTable(response.data.companies);
      displayPagination(response.data.pagination);
    }
    
  } catch (error) {
    showError('거래처 목록을 불러오는데 실패했습니다.');
  } finally {
    hideLoading();
  }
}
```

**2. 테이블 렌더링**

```javascript
function displayCompaniesTable(companies) {
  const tbody = document.querySelector('#companies-table tbody');
  tbody.innerHTML = '';
  
  companies.forEach(company => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${company.finalCompanyName}</td>
      <td>${company.representative}</td>
      <td>${company.businessStatus}</td>
      <td class="text-right">${formatCurrency(company.accumulatedSales)}</td>
      <td class="text-right">${formatCurrency(company.accountsReceivable)}</td>
      <td>${company.salesProduct}</td>
      <td>
        <button onclick="viewCompany(${company.id})">상세</button>
        <button onclick="editCompany(${company.id})">수정</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}
```

**3. 거래처 상세 조회**

```javascript
async function viewCompany(companyId) {
  try {
    const response = await api.get(`/companies/${companyId}`);
    
    if (response.success) {
      // 모달로 상세 정보 표시
      showCompanyModal(response.data);
    }
    
  } catch (error) {
    showError('거래처 정보를 불러오는데 실패했습니다.');
  }
}
```

**4. 거래처 수정**

```javascript
async function editCompany(companyId) {
  try {
    // 기존 데이터 조회
    const response = await api.get(`/companies/${companyId}`);
    
    // 수정 폼 표시
    showEditModal(response.data);
    
  } catch (error) {
    showError('거래처 정보를 불러오는데 실패했습니다.');
  }
}

async function saveCompany(companyId, formData) {
  try {
    const response = await api.put(`/companies/${companyId}`, formData);
    
    if (response.success) {
      showSuccess('거래처가 수정되었습니다.');
      closeModal();
      loadMyCompanies(); // 목록 새로고침
    }
    
  } catch (error) {
    showError('거래처 수정에 실패했습니다.');
  }
}
```

**5. 필터 및 검색**

```javascript
// 필터 변경 시
document.getElementById('status-filter').addEventListener('change', (e) => {
  const status = e.target.value;
  loadMyCompanies(1, { status });
});

// 검색
document.getElementById('search-btn').addEventListener('click', () => {
  const search = document.getElementById('search-input').value;
  loadMyCompanies(1, { search });
});
```

**테스트 시나리오:**
1. 페이지 로드 → 담당 거래처 목록 표시
2. 상태 필터 변경 → 필터링된 목록 표시
3. 검색어 입력 → 검색 결과 표시
4. 거래처 클릭 → 상세 정보 모달
5. 수정 버튼 → 수정 폼 표시
6. 정보 수정 → 저장 성공 → 목록 갱신
7. 페이지네이션 → 다른 페이지 로드

**완료 기준:**
- [ ] 목록 조회 정상
- [ ] 필터/검색 정상
- [ ] 상세 조회 정상
- [ ] 수정 기능 정상
- [ ] 페이지네이션 정상
- [ ] 에러 처리 완비

---

#### 2-2-3. 거래처 다운로드 기능

**작업 파일:**
- `05.Source/03.sales_mode/02_my_companies/03_companies_download.js`

**작업 내용:**

**1. 전체 데이터 조회**
```javascript
async function downloadMyCompanies() {
  try {
    showLoading();
    
    // 페이지네이션 없이 전체 조회
    const response = await api.get('/companies/my?limit=9999');
    
    if (response.success) {
      // Excel 생성
      const workbook = createCompaniesWorkbook(response.data.companies);
      
      // 다운로드
      const user = SessionManager.getUser();
      const filename = `담당거래처_${user.name}_${new Date().toISOString()}.xlsx`;
      XLSX.writeFile(workbook, filename);
      
      showSuccess('다운로드가 완료되었습니다.');
    }
    
  } catch (error) {
    showError('다운로드에 실패했습니다.');
  } finally {
    hideLoading();
  }
}
```

**2. Excel 생성**
```javascript
function createCompaniesWorkbook(companies) {
  // 시트 데이터 생성 (19개 컬럼)
  const headers = [
    'KEY VALUE',
    '거래처명(ERP)',
    '최종거래처명',
    '폐업여부',
    '대표이사/치과의사',
    '고객사 지역',
    '거래상태',
    '담당부서',
    '판매제품',
    '내부담당자',
    '정철웅기여',
    '회사기여',
    '마지막결제일',
    '마지막총결재금액',
    '매출채권잔액',
    '누적수금금액',
    '누적매출금액',
    '영업활동(특이사항)'
  ];
  
  const rows = companies.map(c => [
    c.keyValue,
    c.companyNameERP,
    c.finalCompanyName,
    c.isClosed,
    c.ceoOrDentist,
    c.customerRegion,
    c.businessStatus,
    c.department,
    c.salesProduct,
    c.internalManager,
    c.jcwContribution,
    c.companyContribution,
    c.lastPaymentDate,
    c.lastPaymentAmount,
    c.accountsReceivable,
    c.accumulatedCollection,
    c.accumulatedSales,
    c.businessActivity
  ]);
  
  const sheetData = [headers, ...rows];
  
  // 워크북 생성
  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '담당거래처');
  
  return wb;
}
```

**완료 기준:**
- [ ] 다운로드 버튼 클릭 시 Excel 생성
- [ ] 19개 컬럼 모두 포함
- [ ] 데이터 정확성 100%
- [ ] 파일명 형식 정확

---

### 2-3. 실적보고서 작성 (Report Write)

#### 2-3-1. Backend API 개발

**작업 파일:**
- `backend/controllers/reports.controller.js`
- `backend/routes/reports.js`

**Backend API:**

**A. POST /api/reports**
```
Request Headers:
Authorization: Bearer {token}

Request Body:
{
  "companyId": 1,
  "reportType": "방문보고서",
  "content": {
    "visitDate": "2025-10-05",
    "visitPurpose": "제품 소개",
    "targetCollectionAmount": 5000000,
    "targetSalesAmount": 10000000,
    "targetProducts": "제품A, 제품B",
    "activityNotes": "대표이사 면담 완료"
  }
}

Response:
{
  "success": true,
  "data": {
    "reportId": 123
  },
  "message": "보고서가 제출되었습니다"
}
```

**B. GET /api/reports/my**
```
Request Headers:
Authorization: Bearer {token}

Query Parameters:
- status: 보고서 상태 (optional)
- startDate: 시작일 (optional)
- endDate: 종료일 (optional)
- page: 페이지 번호
- limit: 페이지당 개수

Response:
{
  "success": true,
  "data": {
    "reports": [
      {
        "reportId": 123,
        "companyName": "A치과",
        "reportType": "방문보고서",
        "submittedDate": "2025-10-05",
        "status": "pending",
        "content": { ... }
      }
    ],
    "pagination": { ... }
  }
}
```

**C. GET /api/reports/:id**
```
Request Headers:
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "reportId": 123,
    "companyId": 1,
    "companyName": "A치과",
    "submittedBy": "김영업",
    "submittedDate": "2025-10-05",
    "reportType": "방문보고서",
    "status": "pending",
    "content": { ... },
    "confirmedBy": null,
    "confirmedDate": null,
    "adminComment": null
  }
}
```

**D. PUT /api/reports/:id**
```
Request Headers:
Authorization: Bearer {token}

Request Body:
{
  "content": {
    "targetCollectionAmount": 6000000,
    "activityNotes": "수정된 내용"
  }
}

Response:
{
  "success": true,
  "message": "보고서가 수정되었습니다"
}

Note: pending 상태일 때만 수정 가능
```

**E. DELETE /api/reports/:id**
```
Request Headers:
Authorization: Bearer {token}

Response:
{
  "success": true,
  "message": "보고서가 삭제되었습니다"
}

Note: pending 상태일 때만 삭제 가능
```

**Postman 테스트:**
1. POST /api/reports (보고서 제출)
2. GET /api/reports/my (내 보고서 목록)
3. GET /api/reports/123 (상세 조회)
4. PUT /api/reports/123 (수정)
5. DELETE /api/reports/123 (삭제)
6. PUT /api/reports/456 (confirmed 상태 수정 시도 → 실패 확인)

**완료 기준:**
- [ ] 모든 API 정상 작동
- [ ] 상태별 권한 체크 정확
- [ ] 본인 보고서만 조회/수정/삭제
- [ ] 에러 처리 완비

---

#### 2-3-2. Frontend 개발

**작업 파일:**
- `05.Source/03.sales_mode/03_report_write/02_report_write.js`

**작업 내용:**

**1. IndexedDB 코드 삭제 및 API 호출 추가**

```javascript
// [삭제]
// await db.create('reports', reportData);

// [추가]
async function submitReport(formData) {
  try {
    showLoading();
    
    // 보고서 데이터 생성
    const reportData = {
      companyId: formData.companyId,
      reportType: formData.reportType,
      content: {
        visitDate: formData.visitDate,
        visitPurpose: formData.visitPurpose,
        targetCollectionAmount: parseInt(formData.targetCollection),
        targetSalesAmount: parseInt(formData.targetSales),
        targetProducts: formData.targetProducts,
        activityNotes: formData.notes
      }
    };
    
    // API 호출
    const response = await api.post('/reports', reportData);
    
    if (response.success) {
      showSuccess('보고서가 제출되었습니다.');
      resetForm();
      // 목록 페이지로 이동
      window.location.href = '../04_report_check/01_report_check.html';
    }
    
  } catch (error) {
    showError('보고서 제출에 실패했습니다.');
  } finally {
    hideLoading();
  }
}
```

**2. 거래처 선택 기능**

```javascript
async function loadMyCompaniesForSelect() {
  try {
    // 담당 거래처 조회
    const response = await api.get('/companies/my?limit=9999');
    
    if (response.success) {
      // 셀렉트 박스 채우기
      const select = document.getElementById('company-select');
      select.innerHTML = '<option value="">거래처 선택</option>';
      
      response.data.companies.forEach(company => {
        const option = document.createElement('option');
        option.value = company.id;
        option.textContent = company.finalCompanyName;
        select.appendChild(option);
      });
    }
    
  } catch (error) {
    showError('거래처 목록을 불러오는데 실패했습니다.');
  }
}

// 페이지 로드 시 실행
window.addEventListener('DOMContentLoaded', () => {
  loadMyCompaniesForSelect();
});
```

**3. 폼 유효성 검증**

```javascript
function validateReportForm(formData) {
  // 거래처 선택 확인
  if (!formData.companyId) {
    showError('거래처를 선택해주세요.');
    return false;
  }
  
  // 보고서 유형 확인
  if (!formData.reportType) {
    showError('보고서 유형을 선택해주세요.');
    return false;
  }
  
  // 목표 수금금액
  if (!formData.targetCollection || formData.targetCollection < 0) {
    showError('목표 수금금액을 입력해주세요.');
    return false;
  }
  
  // 목표 매출액
  if (!formData.targetSales || formData.targetSales < 0) {
    showError('목표 매출액을 입력해주세요.');
    return false;
  }
  
  // 활동 내역
  if (!formData.notes || formData.notes.trim() === '') {
    showError('활동 내역을 입력해주세요.');
    return false;
  }
  
  return true;
}
```

**4. 폼 제출**

```javascript
document.getElementById('report-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  // 폼 데이터 수집
  const formData = {
    companyId: document.getElementById('company-select').value,
    reportType: document.getElementById('report-type').value,
    visitDate: document.getElementById('visit-date').value,
    visitPurpose: document.getElementById('visit-purpose').value,
    targetCollection: document.getElementById('target-collection').value,
    targetSales: document.getElementById('target-sales').value,
    targetProducts: document.getElementById('target-products').value,
    notes: document.getElementById('notes').value
  };
  
  // 유효성 검증
  if (!validateReportForm(formData)) {
    return;
  }
  
  // 보고서 제출
  await submitReport(formData);
});
```

**테스트 시나리오:**
1. 페이지 로드 → 거래처 목록 로드
2. 거래처 선택
3. 보고서 유형 선택
4. 필수 항목 입력
5. 제출 버튼 클릭 → 성공 메시지
6. 보고서 확인 페이지로 이동
7. 유효성 검증 테스트 (빈 값, 음수 등)

**완료 기준:**
- [ ] 거래처 셀렉트 박스 정상 로드
- [ ] 폼 유효성 검증 정확
- [ ] 보고서 제출 성공
- [ ] 성공 후 페이지 이동
- [ ] 에러 처리 완비

---

### 2-4. 실적보고서 확인 (Report Check)

#### 2-4-1. Backend API (이미 개발 완료)

**사용할 API:**
- GET /api/reports/my (목록 조회)
- GET /api/reports/:id (상세 조회)
- PUT /api/reports/:id (수정)
- DELETE /api/reports/:id (삭제)

---

#### 2-4-2. Frontend 개발

**작업 파일:**
- `05.Source/03.sales_mode/04_report_check/02_report_check.js`

**작업 내용:**

**1. IndexedDB 코드 삭제 및 API 호출 추가**

```javascript
// [삭제]
// const reports = await db.getAll('reports');
// const myReports = reports.filter(r => r.submittedBy === currentUser);

// [추가]
async function loadMyReports(page = 1, filters = {}) {
  try {
    showLoading();
    
    // 쿼리 파라미터
    const params = new URLSearchParams({
      page,
      limit: 50,
      ...filters
    });
    
    // API 호출
    const response = await api.get(`/reports/my?${params}`);
    
    if (response.success) {
      displayReportsTable(response.data.reports);
      displayPagination(response.data.pagination);
    }
    
  } catch (error) {
    showError('보고서 목록을 불러오는데 실패했습니다.');
  } finally {
    hideLoading();
  }
}
```

**2. 테이블 렌더링**

```javascript
function displayReportsTable(reports) {
  const tbody = document.querySelector('#reports-table tbody');
  tbody.innerHTML = '';
  
  reports.forEach(report => {
    const row = document.createElement('tr');
    
    // 상태별 배지 색상
    const statusBadge = getStatusBadge(report.status);
    
    row.innerHTML = `
      <td>${report.companyName}</td>
      <td>${report.reportType}</td>
      <td>${formatDate(report.submittedDate)}</td>
      <td>${statusBadge}</td>
      <td class="text-right">${formatCurrency(report.content.targetCollectionAmount)}</td>
      <td class="text-right">${formatCurrency(report.content.targetSalesAmount)}</td>
      <td>
        <button onclick="viewReport(${report.reportId})">상세</button>
        ${report.status === 'pending' ? `
          <button onclick="editReport(${report.reportId})">수정</button>
          <button onclick="deleteReport(${report.reportId})">삭제</button>
        ` : ''}
      </td>
    `;
    tbody.appendChild(row);
  });
}

function getStatusBadge(status) {
  const badges = {
    'pending': '<span class="badge badge-warning">대기</span>',
    'confirmed': '<span class="badge badge-success">확인</span>',
    'rejected': '<span class="badge badge-danger">반려</span>'
  };
  return badges[status] || status;
}
```

**3. 보고서 상세 조회**

```javascript
async function viewReport(reportId) {
  try {
    const response = await api.get(`/reports/${reportId}`);
    
    if (response.success) {
      showReportModal(response.data);
    }
    
  } catch (error) {
    showError('보고서를 불러오는데 실패했습니다.');
  }
}

function showReportModal(report) {
  const modal = document.getElementById('report-modal');
  
  // 모달 내용 채우기
  document.getElementById('modal-company').textContent = report.companyName;
  document.getElementById('modal-type').textContent = report.reportType;
  document.getElementById('modal-date').textContent = formatDate(report.submittedDate);
  document.getElementById('modal-status').textContent = report.status;
  document.getElementById('modal-target-collection').textContent = 
    formatCurrency(report.content.targetCollectionAmount);
  document.getElementById('modal-target-sales').textContent = 
    formatCurrency(report.content.targetSalesAmount);
  document.getElementById('modal-products').textContent = report.content.targetProducts;
  document.getElementById('modal-notes').textContent = report.content.activityNotes;
  
  // 관리자 코멘트 (있을 경우)
  if (report.adminComment) {
    document.getElementById('modal-admin-comment').textContent = report.adminComment;
    document.getElementById('admin-comment-section').style.display = 'block';
  } else {
    document.getElementById('admin-comment-section').style.display = 'none';
  }
  
  // 모달 표시
  modal.style.display = 'block';
}
```

**4. 보고서 수정**

```javascript
async function editReport(reportId) {
  try {
    // 기존 데이터 조회
    const response = await api.get(`/reports/${reportId}`);
    
    if (response.success) {
      // pending 상태인지 확인
      if (response.data.status !== 'pending') {
        showError('대기 상태의 보고서만 수정할 수 있습니다.');
        return;
      }
      
      // 수정 폼 표시
      showEditReportModal(response.data);
    }
    
  } catch (error) {
    showError('보고서를 불러오는데 실패했습니다.');
  }
}

async function saveReport(reportId, formData) {
  try {
    const reportData = {
      content: {
        targetCollectionAmount: parseInt(formData.targetCollection),
        targetSalesAmount: parseInt(formData.targetSales),
        targetProducts: formData.targetProducts,
        activityNotes: formData.notes
      }
    };
    
    const response = await api.put(`/reports/${reportId}`, reportData);
    
    if (response.success) {
      showSuccess('보고서가 수정되었습니다.');
      closeModal();
      loadMyReports(); // 목록 새로고침
    }
    
  } catch (error) {
    showError('보고서 수정에 실패했습니다.');
  }
}
```

**5. 보고서 삭제**

```javascript
async function deleteReport(reportId) {
  if (!confirm('정말 삭제하시겠습니까?')) {
    return;
  }
  
  try {
    const response = await api.delete(`/reports/${reportId}`);
    
    if (response.success) {
      showSuccess('보고서가 삭제되었습니다.');
      loadMyReports(); // 목록 새로고침
    }
    
  } catch (error) {
    showError('보고서 삭제에 실패했습니다.');
  }
}
```

**6. 필터 기능**

```javascript
// 상태 필터
document.getElementById('status-filter').addEventListener('change', (e) => {
  const status = e.target.value;
  loadMyReports(1, { status });
});

// 날짜 필터
document.getElementById('apply-date-filter').addEventListener('click', () => {
  const startDate = document.getElementById('start-date').value;
  const endDate = document.getElementById('end-date').value;
  loadMyReports(1, { startDate, endDate });
});
```

**테스트 시나리오:**
1. 페이지 로드 → 내 보고서 목록 표시
2. 상태 필터 변경 → 필터링된 목록
3. 날짜 필터 적용 → 기간별 조회
4. 보고서 클릭 → 상세 정보 모달
5. 수정 버튼 (pending) → 수정 폼 표시
6. 수정 후 저장 → 목록 갱신
7. 삭제 버튼 → 확인 후 삭제
8. confirmed 보고서 수정 시도 → 에러 메시지

**완료 기준:**
- [ ] 목록 조회 정상
- [ ] 필터 기능 정상
- [ ] 상세 조회 정상
- [ ] 수정 기능 정상 (pending만)
- [ ] 삭제 기능 정상 (pending만)
- [ ] 상태별 UI 표시 정확
- [ ] 에러 처리 완비

---

#### 2-4-3. 보고서 다운로드 기능

**작업 파일:**
- `05.Source/03.sales_mode/04_report_check/03_reports_check_download.js`

**작업 내용:**

```javascript
async function downloadMyReports() {
  try {
    showLoading();
    
    // 전체 보고서 조회
    const response = await api.get('/reports/my?limit=9999');
    
    if (response.success) {
      // Excel 생성
      const workbook = createReportsWorkbook(response.data.reports);
      
      // 다운로드
      const user = SessionManager.getUser();
      const filename = `내보고서_${user.name}_${new Date().toISOString()}.xlsx`;
      XLSX.writeFile(workbook, filename);
      
      showSuccess('다운로드가 완료되었습니다.');
    }
    
  } catch (error) {
    showError('다운로드에 실패했습니다.');
  } finally {
    hideLoading();
  }
}

function createReportsWorkbook(reports) {
  const headers = [
    '보고서ID',
    '거래처명',
    '보고서유형',
    '제출일',
    '상태',
    '목표수금금액',
    '목표매출액',
    '판매목표제품',
    '활동내역',
    '확인자',
    '확인일',
    '관리자코멘트'
  ];
  
  const rows = reports.map(r => [
    r.reportId,
    r.companyName,
    r.reportType,
    formatDate(r.submittedDate),
    r.status,
    r.content.targetCollectionAmount,
    r.content.targetSalesAmount,
    r.content.targetProducts,
    r.content.activityNotes,
    r.confirmedBy || '',
    r.confirmedDate ? formatDate(r.confirmedDate) : '',
    r.adminComment || ''
  ]);
  
  const sheetData = [headers, ...rows];
  
  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '내보고서');
  
  return wb;
}
```

**완료 기준:**
- [ ] 다운로드 버튼 클릭 시 Excel 생성
- [ ] 모든 보고서 포함
- [ ] 데이터 정확성 100%
- [ ] 파일명 형식 정확

---

### 2-5. 데이터 관리 (Data Management)

#### 2-5-1. Backend API (이미 개발 완료)

**사용할 API:**
- GET /api/companies/my (거래처 조회)
- GET /api/reports/my (보고서 조회)
- GET /api/kpi/sales/:userId (KPI 조회)

---

#### 2-5-2. Frontend 개발

**작업 파일:**
- `05.Source/03.sales_mode/05_data_management/02_data_management.js`
- `05.Source/03.sales_mode/05_data_management/03_integrated_download.js`

**작업 내용:**

**1. 통합 다운로드 기능**

```javascript
async function downloadIntegratedData() {
  try {
    showLoading('데이터를 준비 중입니다...');
    
    const user = SessionManager.getUser();
    
    // 병렬로 데이터 조회
    const [companiesRes, reportsRes, kpiRes] = await Promise.all([
      api.get('/companies/my?limit=9999'),
      api.get('/reports/my?limit=9999'),
      api.get(`/kpi/sales/${user.id}`)
    ]);
    
    // Excel 워크북 생성
    const workbook = XLSX.utils.book_new();
    
    // 시트 1: KPI
    const kpiSheet = createKPISheet(kpiRes.data);
    XLSX.utils.book_append_sheet(workbook, kpiSheet, 'KPI');
    
    // 시트 2: 담당거래처
    const companiesSheet = createCompaniesSheet(companiesRes.data.companies);
    XLSX.utils.book_append_sheet(workbook, companiesSheet, '담당거래처');
    
    // 시트 3: 보고서
    const reportsSheet = createReportsSheet(reportsRes.data.reports);
    XLSX.utils.book_append_sheet(workbook, reportsSheet, '보고서');
    
    // 다운로드
    const filename = `영업데이터_${user.name}_${new Date().toISOString()}.xlsx`;
    XLSX.writeFile(workbook, filename);
    
    showSuccess('통합 다운로드가 완료되었습니다.');
    
  } catch (error) {
    showError('다운로드에 실패했습니다.');
  } finally {
    hideLoading();
  }
}
```

**2. 개별 다운로드 버튼**

```javascript
// KPI만 다운로드
document.getElementById('download-kpi').addEventListener('click', async () => {
  // 2-1-3 참조
});

// 거래처만 다운로드
document.getElementById('download-companies').addEventListener('click', async () => {
  // 2-2-3 참조
});

// 보고서만 다운로드
document.getElementById('download-reports').addEventListener('click', async () => {
  // 2-4-3 참조
});

// 통합 다운로드
document.getElementById('download-all').addEventListener('click', async () => {
  await downloadIntegratedData();
});
```

**3. 데이터 통계 표시**

```javascript
async function displayDataStats() {
  try {
    const user = SessionManager.getUser();
    
    // 거래처 개수
    const companiesRes = await api.get('/companies/my?limit=1');
    document.getElementById('total-companies').textContent = 
      companiesRes.data.pagination.total;
    
    // 보고서 개수
    const reportsRes = await api.get('/reports/my?limit=1');
    document.getElementById('total-reports').textContent = 
      reportsRes.data.pagination.total;
    
    // 최종 다운로드 시간 (LocalStorage)
    const lastDownload = localStorage.getItem('last_download_time');
    if (lastDownload) {
      document.getElementById('last-download').textContent = 
        formatDate(new Date(lastDownload));
    }
    
  } catch (error) {
    console.error('통계 조회 실패:', error);
  }
}

// 페이지 로드 시 실행
window.addEventListener('DOMContentLoaded', () => {
  displayDataStats();
});
```

**테스트 시나리오:**
1. 페이지 로드 → 데이터 통계 표시
2. KPI 다운로드 → Excel 파일 생성
3. 거래처 다운로드 → Excel 파일 생성
4. 보고서 다운로드 → Excel 파일 생성
5. 통합 다운로드 → 3개 시트 Excel 생성
6. 최종 다운로드 시간 업데이트 확인

**완료 기준:**
- [ ] 통계 표시 정상
- [ ] 개별 다운로드 정상
- [ ] 통합 다운로드 정상
- [ ] 3종 Excel 모두 정확
- [ ] 에러 처리 완비

---

### 2-6. 시스템 설정 (System Settings)

#### 2-6-1. Backend API 개발

**작업 파일:**
- `backend/controllers/employees.controller.js`
- `backend/routes/employees.js`

**Backend API:**

**A. PUT /api/employees/:id/profile**
```
Request Headers:
Authorization: Bearer {token}

Request Body:
{
  "email": "new@email.com",
  "phone": "010-9999-9999"
}

Response:
{
  "success": true,
  "message": "프로필이 수정되었습니다"
}

Note: 본인 프로필만 수정 가능
```

**B. PUT /api/employees/:id/password**
```
Request Headers:
Authorization: Bearer {token}

Request Body:
{
  "currentPassword": "1234",
  "newPassword": "5678",
  "confirmPassword": "5678"
}

Response:
{
  "success": true,
  "message": "비밀번호가 변경되었습니다"
}

Error Cases:
- 현재 비밀번호 불일치
- 새 비밀번호 확인 불일치
- 비밀번호 규칙 위반
```

**Postman 테스트:**
1. PUT /api/employees/1/profile (성공)
2. PUT /api/employees/1/profile (다른 사용자 시도 → 403)
3. PUT /api/employees/1/password (성공)
4. PUT /api/employees/1/password (현재 비밀번호 틀림 → 401)
5. PUT /api/employees/1/password (확인 불일치 → 400)

**완료 기준:**
- [ ] 모든 API 정상 작동
- [ ] 본인만 수정 가능
- [ ] 비밀번호 검증 정확
- [ ] 에러 처리 완비

---

#### 2-6-2. Frontend 개발

**작업 파일:**
- `05.Source/03.sales_mode/06_system_settings/02_settings.js`

**작업 내용:**

**1. 프로필 정보 표시**

```javascript
async function loadProfile() {
  try {
    const response = await api.get('/auth/me');
    
    if (response.success) {
      const user = response.data;
      
      // 프로필 정보 표시
      document.getElementById('profile-name').textContent = user.name;
      document.getElementById('profile-username').textContent = user.username;
      document.getElementById('profile-email').value = user.email;
      document.getElementById('profile-phone').value = user.phone;
      document.getElementById('profile-department').textContent = user.department;
      document.getElementById('profile-role').textContent = user.role;
      document.getElementById('profile-position').textContent = user.position;
    }
    
  } catch (error) {
    showError('프로필 정보를 불러오는데 실패했습니다.');
  }
}

// 페이지 로드 시 실행
window.addEventListener('DOMContentLoaded', () => {
  loadProfile();
});
```

**2. 프로필 수정**

```javascript
document.getElementById('profile-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  try {
    const user = SessionManager.getUser();
    
    const formData = {
      email: document.getElementById('profile-email').value,
      phone: document.getElementById('profile-phone').value
    };
    
    const response = await api.put(`/employees/${user.id}/profile`, formData);
    
    if (response.success) {
      showSuccess('프로필이 수정되었습니다.');
      
      // 세션 정보 업데이트
      const updatedUser = await api.get('/auth/me');
      SessionManager.setUser(updatedUser.data);
    }
    
  } catch (error) {
    showError('프로필 수정에 실패했습니다.');
  }
});
```

**3. 비밀번호 변경**

```javascript
document.getElementById('password-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  try {
    const user = SessionManager.getUser();
    
    const formData = {
      currentPassword: document.getElementById('current-password').value,
      newPassword: document.getElementById('new-password').value,
      confirmPassword: document.getElementById('confirm-password').value
    };
    
    // 유효성 검증
    if (formData.newPassword !== formData.confirmPassword) {
      showError('새 비밀번호가 일치하지 않습니다.');
      return;
    }
    
    if (formData.newPassword.length < 4) {
      showError('비밀번호는 최소 4자 이상이어야 합니다.');
      return;
    }
    
    const response = await api.put(`/employees/${user.id}/password`, formData);
    
    if (response.success) {
      showSuccess('비밀번호가 변경되었습니다.');
      
      // 폼 초기화
      document.getElementById('password-form').reset();
    }
    
  } catch (error) {
    if (error.status === 401) {
      showError('현재 비밀번호가 일치하지 않습니다.');
    } else {
      showError('비밀번호 변경에 실패했습니다.');
    }
  }
});
```

**4. 테마 설정 (로컬 저장)**

```javascript
// 테마 변경 (LocalStorage)
document.getElementById('theme-select').addEventListener('change', (e) => {
  const theme = e.target.value;
  
  // 테마 적용
  document.documentElement.setAttribute('data-theme', theme);
  
  // LocalStorage 저장
  localStorage.setItem('theme', theme);
  
  showSuccess('테마가 변경되었습니다.');
});

// 페이지 로드 시 테마 적용
window.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('theme') || 'sales';
  document.documentElement.setAttribute('data-theme', savedTheme);
  document.getElementById('theme-select').value = savedTheme;
});
```

**5. 로그아웃**

```javascript
document.getElementById('logout-btn').addEventListener('click', async () => {
  if (!confirm('로그아웃 하시겠습니까?')) {
    return;
  }
  
  try {
    // Backend 로그아웃 API 호출
    await api.post('/auth/logout');
    
  } catch (error) {
    console.error('로그아웃 API 호출 실패:', error);
  } finally {
    // 세션 정리
    SessionManager.clearAll();
    
    // 로그인 페이지로 이동
    window.location.href = '/05.Source/02.login/01_login.html';
  }
});
```

**테스트 시나리오:**
1. 페이지 로드 → 프로필 정보 표시
2. 이메일/전화번호 수정 → 저장 성공
3. 비밀번호 변경 (성공)
4. 비밀번호 변경 (현재 비밀번호 틀림 → 에러)
5. 비밀번호 변경 (확인 불일치 → 에러)
6. 테마 변경 → 즉시 적용
7. 로그아웃 → 세션 정리 → 로그인 페이지

**완료 기준:**
- [ ] 프로필 정보 표시 정상
- [ ] 프로필 수정 정상
- [ ] 비밀번호 변경 정상
- [ ] 테마 설정 정상
- [ ] 로그아웃 정상
- [ ] 에러 처리 완비

---

## PHASE 3: 관리자 모드 개발

### 3-1. 대시보드 (Dashboard)

#### 3-1-1. Backend API 개발

**작업 파일:**
- `backend/controllers/kpi.controller.js` (추가)

**Backend API:**

**A. GET /api/kpi/admin**
```
Request Headers:
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "companies": {
      "total": 500,              // 전체거래처
      "active": 400,             // 활성거래처
      "activeRate": 80.0,        // 활성화율
      "majorProduct": 200        // 주요제품판매거래처
    },
    "achievement": {
      "companyRate": 25.0,       // 회사배정기준 달성율
      "majorRate": 25.0          // 주요고객처 목표달성율
    },
    "sales": {
      "accumulated": 2000000000, // 누적매출금액
      "majorProduct": 1200000000,// 주요제품매출액
      "majorRate": 60.0,         // 주요제품매출비율
      "concentration": 10000000  // 매출집중도
    },
    "finance": {
      "collection": 1800000000,  // 누적수금금액
      "receivable": 200000000    // 매출채권잔액
    },
    "contribution": {
      // 클릭 시 순위표 모달 (Frontend에서 처리)
    },
    "salesCount": 5              // 영업사원 수
  }
}
```

**B. GET /api/kpi/admin/rankings**
```
Request Headers:
Authorization: Bearer {token}

Query Parameters:
- type: 'total' | 'major'

Response:
{
  "success": true,
  "data": {
    "rankings": [
      {
        "rank": 1,
        "employeeName": "김영업",
        "amount": 500000000,
        "percentage": 25.0
      },
      {
        "rank": 2,
        "employeeName": "이영업",
        "amount": 400000000,
        "percentage": 20.0
      },
      // ... 나머지
    ],
    "totalAmount": 2000000000
  }
}
```

**Postman 테스트:**
1. GET /api/kpi/admin (전사 KPI)
2. GET /api/kpi/admin/rankings?type=total (전체매출 순위)
3. GET /api/kpi/admin/rankings?type=major (주요제품 순위)

**완료 기준:**
- [ ] 전사 KPI 14개 계산
- [ ] 순위표 데이터 정확
- [ ] 계산 시간 < 1초
- [ ] 데이터 정확성 100%

---

#### 3-1-2. Frontend 개발

**작업 파일:**
- `05.Source/04.admin_mode/01_dashboard/02_dashboard.js`

**작업 내용:**

**영업담당 대시보드(2-1-2)와 유사한 구조**

**차이점:**
1. API 엔드포인트: `/kpi/admin`
2. 전체매출기여도/주요매출기여도 클릭 시 순위표 모달
3. 영업사원 수 표시

**순위표 모달 구현:**

```javascript
async function showRankingModal(type) {
  try {
    const response = await api.get(`/kpi/admin/rankings?type=${type}`);
    
    if (response.success) {
      displayRankingModal(response.data.rankings, type);
    }
    
  } catch (error) {
    showError('순위표를 불러오는데 실패했습니다.');
  }
}

function displayRankingModal(rankings, type) {
  const modal = document.getElementById('ranking-modal');
  const title = type === 'total' ? '전체매출 기여도 순위' : '주요제품 매출 기여도 순위';
  
  // 제목
  document.getElementById('modal-title').textContent = title;
  
  // 테이블
  const tbody = document.querySelector('#ranking-table tbody');
  tbody.innerHTML = '';
  
  rankings.forEach(rank => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${rank.rank}</td>
      <td>${rank.employeeName}</td>
      <td class="text-right">${formatCurrency(rank.amount)}</td>
      <td class="text-right">${formatPercent(rank.percentage)}</td>
    `;
    tbody.appendChild(row);
  });
  
  // 모달 표시
  modal.style.display = 'block';
}

// KPI 카드 클릭 이벤트
document.getElementById('total-contribution-card').addEventListener('click', () => {
  showRankingModal('total');
});

document.getElementById('major-contribution-card').addEventListener('click', () => {
  showRankingModal('major');
});
```

**완료 기준:**
- [ ] 14개 KPI 카드 정상 표시
- [ ] 순위표 모달 정상 작동
- [ ] 영업사원 수 표시 정확
- [ ] 나머지는 영업담당과 동일

---

#### 3-1-3. KPI 다운로드 (2-1-3과 동일)

---

### 3-2. 전체거래처 관리 (All Companies)

#### 3-2-1. Backend API 개발

**작업 파일:**
- `backend/controllers/companies.controller.js` (추가)

**Backend API:**

**A. GET /api/companies**
```
Request Headers:
Authorization: Bearer {token}

Query Parameters:
- manager: 내부담당자 필터 (optional)
- status: 거래상태 필터 (optional)
- search: 검색어 (optional)
- page: 페이지 번호
- limit: 페이지당 개수

Response:
{
  "success": true,
  "data": {
    "companies": [ ... ],
    "pagination": { ... }
  }
}

Note: 관리자만 접근 가능
```

**Postman 테스트:**
1. GET /api/companies (전체 조회 - 관리자)
2. GET /api/companies?manager=김영업 (담당자 필터)
3. GET /api/companies (영업담당 시도 → 403)

**완료 기준:**
- [ ] 전체 거래처 조회 가능
- [ ] 필터 기능 정상
- [ ] 관리자만 접근
- [ ] 나머지는 /api/companies/my와 동일

---

#### 3-2-2. Frontend 개발

**작업 파일:**
- `05.Source/04.admin_mode/02_all_companies/02_all_companies.js`

**작업 내용:**

**영업담당 담당거래처(2-2-2)와 거의 동일**

**차이점:**
1. API 엔드포인트: `/companies` (not `/companies/my`)
2. 내부담당자 컬럼 표시
3. 내부담당자 필터 추가
4. 관리자는 삭제 권한 있음

**추가 기능:**

```javascript
// 내부담당자 필터
async function loadManagersForFilter() {
  try {
    // 직원 목록 조회
    const response = await api.get('/employees?role=sales');
    
    if (response.success) {
      const select = document.getElementById('manager-filter');
      select.innerHTML = '<option value="">전체</option>';
      
      response.data.forEach(emp => {
        const option = document.createElement('option');
        option.value = emp.name;
        option.textContent = emp.name;
        select.appendChild(option);
      });
    }
    
  } catch (error) {
    console.error('담당자 목록 조회 실패:', error);
  }
}

// 페이지 로드 시 실행
window.addEventListener('DOMContentLoaded', () => {
  loadManagersForFilter();
  loadAllCompanies();
});

// 필터 변경
document.getElementById('manager-filter').addEventListener('change', (e) => {
  const manager = e.target.value;
  loadAllCompanies(1, { manager });
});
```

**완료 기준:**
- [ ] 전체 거래처 조회 정상
- [ ] 내부담당자 필터 정상
- [ ] 삭제 권한 정상 (관리자만)
- [ ] 나머지는 영업담당과 동일

---

#### 3-2-3. 거래처 다운로드 (2-2-3과 유사)

**차이점:** 전체 거래처 다운로드

---

### 3-3. 실적보고서 확인 (Report Confirm)

#### 3-3-1. Backend API 개발

**작업 파일:**
- `backend/controllers/reports.controller.js` (추가)

**Backend API:**

**A. GET /api/reports**
```
Request Headers:
Authorization: Bearer {token}

Query Parameters:
- submittedBy: 작성자 필터 (optional)
- status: 상태 필터 (optional)
- startDate: 시작일 (optional)
- endDate: 종료일 (optional)
- page: 페이지 번호
- limit: 페이지당 개수

Response:
{
  "success": true,
  "data": {
    "reports": [
      {
        "reportId": 123,
        "companyName": "A치과",
        "submittedBy": "김영업",
        "reportType": "방문보고서",
        "submittedDate": "2025-10-05",
        "status": "pending",
        // ... 기타
      }
    ],
    "pagination": { ... }
  }
}

Note: 관리자만 접근 가능
```

**B. PUT /api/reports/:id/approve**
```
Request Headers:
Authorization: Bearer {token}

Request Body:
{
  "comment": "확인 완료" (optional)
}

Response:
{
  "success": true,
  "message": "보고서가 승인되었습니다"
}

Note:
- 관리자만 가능
- pending 상태만 승인 가능
- 승인 시 거래처 정보 자동 업데이트
```

**C. PUT /api/reports/:id/reject**
```
Request Headers:
Authorization: Bearer {token}

Request Body:
{
  "comment": "재작성 필요" (required)
}

Response:
{
  "success": true,
  "message": "보고서가 반려되었습니다"
}

Note:
- 관리자만 가능
- pending 상태만 반려 가능
- comment 필수
```

**Postman 테스트:**
1. GET /api/reports (전체 보고서 - 관리자)
2. GET /api/reports?status=pending (대기 중인 것만)
3. PUT /api/reports/123/approve (승인)
4. PUT /api/reports/456/reject (반려)
5. GET /api/reports (영업담당 시도 → 403)

**완료 기준:**
- [ ] 전체 보고서 조회 가능
- [ ] 승인 기능 정상
- [ ] 반려 기능 정상
- [ ] 자동 업데이트 로직 정확
- [ ] 관리자만 접근

---

#### 3-3-2. Frontend 개발

**작업 파일:**
- `05.Source/04.admin_mode/03_report_confirm/02_report_confirm.js`

**작업 내용:**

**영업담당 보고서 확인(2-4-2)과 유사**

**차이점:**
1. API 엔드포인트: `/reports` (not `/reports/my`)
2. 작성자 컬럼 표시
3. 작성자 필터 추가
4. 승인/반려 버튼 추가 (pending만)

**승인/반려 기능:**

```javascript
async function approveReport(reportId) {
  try {
    // 코멘트 입력 (선택)
    const comment = prompt('확인 코멘트를 입력하세요 (선택):');
    
    const response = await api.put(`/reports/${reportId}/approve`, {
      comment: comment || ''
    });
    
    if (response.success) {
      showSuccess('보고서가 승인되었습니다.');
      loadAllReports(); // 목록 새로고침
    }
    
  } catch (error) {
    showError('보고서 승인에 실패했습니다.');
  }
}

async function rejectReport(reportId) {
  try {
    // 반려 사유 입력 (필수)
    const comment = prompt('반려 사유를 입력하세요:');
    
    if (!comment || comment.trim() === '') {
      showError('반려 사유를 입력해주세요.');
      return;
    }
    
    const response = await api.put(`/reports/${reportId}/reject`, {
      comment: comment
    });
    
    if (response.success) {
      showSuccess('보고서가 반려되었습니다.');
      loadAllReports(); // 목록 새로고침
    }
    
  } catch (error) {
    showError('보고서 반려에 실패했습니다.');
  }
}
```

**테이블 렌더링 (승인/반려 버튼 추가):**

```javascript
function displayReportsTable(reports) {
  const tbody = document.querySelector('#reports-table tbody');
  tbody.innerHTML = '';
  
  reports.forEach(report => {
    const row = document.createElement('tr');
    
    const statusBadge = getStatusBadge(report.status);
    
    row.innerHTML = `
      <td>${report.submittedBy}</td>
      <td>${report.companyName}</td>
      <td>${report.reportType}</td>
      <td>${formatDate(report.submittedDate)}</td>
      <td>${statusBadge}</td>
      <td class="text-right">${formatCurrency(report.content.targetCollectionAmount)}</td>
      <td class="text-right">${formatCurrency(report.content.targetSalesAmount)}</td>
      <td>
        <button onclick="viewReport(${report.reportId})">상세</button>
        ${report.status === 'pending' ? `
          <button onclick="approveReport(${report.reportId})" class="btn-success">승인</button>
          <button onclick="rejectReport(${report.reportId})" class="btn-danger">반려</button>
        ` : ''}
      </td>
    `;
    tbody.appendChild(row);
  });
}
```

**작성자 필터:**

```javascript
async function loadSubmittersForFilter() {
  try {
    // 영업담당 목록 조회
    const response = await api.get('/employees?role=sales');
    
    if (response.success) {
      const select = document.getElementById('submitter-filter');
      select.innerHTML = '<option value="">전체</option>';
      
      response.data.forEach(emp => {
        const option = document.createElement('option');
        option.value = emp.id;
        option.textContent = emp.name;
        select.appendChild(option);
      });
    }
    
  } catch (error) {
    console.error('작성자 목록 조회 실패:', error);
  }
}
```

**테스트 시나리오:**
1. 페이지 로드 → 전체 보고서 목록
2. 상태 필터 (pending) → 대기 중인 것만 표시
3. 작성자 필터 → 특정 작성자 것만 표시
4. 보고서 상세 조회
5. 승인 버튼 → 코멘트 입력 → 승인 → 목록 갱신
6. 반려 버튼 → 사유 입력 → 반려 → 목록 갱신
7. confirmed 보고서는 버튼 없음 확인

**완료 기준:**
- [ ] 전체 보고서 조회 정상
- [ ] 작성자 필터 정상
- [ ] 승인 기능 정상
- [ ] 반려 기능 정상
- [ ] 상태별 버튼 표시 정확
- [ ] 에러 처리 완비

---

#### 3-3-3. 보고서 다운로드 (2-4-3과 유사)

**차이점:** 전체 보고서 다운로드, 작성자 컬럼 추가

---

### 3-4. 보고서 발표 (Presentation)

#### 3-4-1. Backend API (사용 안 함)

**Frontend에서 데이터 가공하여 표시**

---

#### 3-4-2. Frontend 개발

**작업 파일:**
- `05.Source/04.admin_mode/04_presentation/02_presentation.js`

**작업 내용:**

**1. 전체 보고서 조회 및 요약**

```javascript
async function loadPresentationData() {
  try {
    showLoading();
    
    // 전체 보고서 조회 (confirmed만)
    const response = await api.get('/reports?status=confirmed&limit=9999');
    
    if (response.success) {
      const reports = response.data.reports;
      
      // 발표용 데이터 가공
      const presentationData = processReportsForPresentation(reports);
      
      // 화면 표시
      displayPresentationSlides(presentationData);
    }
    
  } catch (error) {
    showError('발표 데이터를 불러오는데 실패했습니다.');
  } finally {
    hideLoading();
  }
}

function processReportsForPresentation(reports) {
  // 작성자별 그룹화
  const bySubmitter = {};
  
  reports.forEach(report => {
    if (!bySubmitter[report.submittedBy]) {
      bySubmitter[report.submittedBy] = [];
    }
    bySubmitter[report.submittedBy].push(report);
  });
  
  // 통계 계산
  const statistics = {};
  
  Object.keys(bySubmitter).forEach(submitter => {
    const submitterReports = bySubmitter[submitter];
    
    statistics[submitter] = {
      totalReports: submitterReports.length,
      totalTargetCollection: submitterReports.reduce(
        (sum, r) => sum + r.content.targetCollectionAmount, 0
      ),
      totalTargetSales: submitterReports.reduce(
        (sum, r) => sum + r.content.targetSalesAmount, 0
      ),
      recentActivities: submitterReports
        .slice(-5) // 최근 5개
        .map(r => ({
          company: r.companyName,
          date: r.submittedDate,
          notes: r.content.activityNotes
        }))
    };
  });
  
  return statistics;
}
```

**2. 슬라이드 형식으로 표시**

```javascript
function displayPresentationSlides(data) {
  const container = document.getElementById('presentation-container');
  container.innerHTML = '';
  
  Object.keys(data).forEach((submitter, index) => {
    const stats = data[submitter];
    
    const slide = document.createElement('div');
    slide.className = 'presentation-slide';
    slide.innerHTML = `
      <h2>${submitter} 영업 활동 보고</h2>
      
      <div class="stats-grid">
        <div class="stat-card">
          <h3>제출 보고서</h3>
          <p class="stat-value">${stats.totalReports}건</p>
        </div>
        
        <div class="stat-card">
          <h3>목표 수금금액</h3>
          <p class="stat-value">${formatCurrency(stats.totalTargetCollection)}</p>
        </div>
        
        <div class="stat-card">
          <h3>목표 매출액</h3>
          <p class="stat-value">${formatCurrency(stats.totalTargetSales)}</p>
        </div>
      </div>
      
      <div class="recent-activities">
        <h3>최근 영업 활동</h3>
        <ul>
          ${stats.recentActivities.map(activity => `
            <li>
              <strong>${activity.company}</strong> (${formatDate(activity.date)})
              <br>${activity.notes}
            </li>
          `).join('')}
        </ul>
      </div>
    `;
    
    container.appendChild(slide);
  });
  
  // 슬라이드 네비게이션 초기화
  initSlideNavigation();
}
```

**3. 슬라이드 네비게이션**

```javascript
let currentSlide = 0;

function initSlideNavigation() {
  const slides = document.querySelectorAll('.presentation-slide');
  
  // 첫 슬라이드만 표시
  showSlide(0);
  
  // 이전 버튼
  document.getElementById('prev-slide').addEventListener('click', () => {
    if (currentSlide > 0) {
      showSlide(currentSlide - 1);
    }
  });
  
  // 다음 버튼
  document.getElementById('next-slide').addEventListener('click', () => {
    if (currentSlide < slides.length - 1) {
      showSlide(currentSlide + 1);
    }
  });
  
  // 키보드 단축키
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
      document.getElementById('prev-slide').click();
    } else if (e.key === 'ArrowRight') {
      document.getElementById('next-slide').click();
    }
  });
}

function showSlide(index) {
  const slides = document.querySelectorAll('.presentation-slide');
  
  slides.forEach((slide, i) => {
    if (i === index) {
      slide.style.display = 'block';
    } else {
      slide.style.display = 'none';
    }
  });
  
  currentSlide = index;
  
  // 슬라이드 번호 표시
  document.getElementById('slide-number').textContent = 
    `${index + 1} / ${slides.length}`;
}
```

**4. 전체화면 모드**

```javascript
document.getElementById('fullscreen-btn').addEventListener('click', () => {
  const container = document.getElementById('presentation-container');
  
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else {
    container.requestFullscreen();
  }
});
```

**완료 기준:**
- [ ] 보고서 데이터 가공 정확
- [ ] 슬라이드 표시 정상
- [ ] 네비게이션 정상
- [ ] 전체화면 모드 정상
- [ ] 키보드 단축키 작동

---

#### 3-4-3. PPT 다운로드

**작업 파일:**
- `05.Source/04.admin_mode/04_presentation/03_download_ppt.js`

**작업 내용:**

**기존 코드 활용 (IndexedDB 부분만 API로 변경)**

```javascript
async function downloadPresentation() {
  try {
    showLoading();
    
    // 전체 보고서 조회
    const response = await api.get('/reports?status=confirmed&limit=9999');
    
    if (response.success) {
      // 발표 데이터 가공
      const presentationData = processReportsForPresentation(response.data.reports);
      
      // PPT 생성 (기존 로직 활용)
      // ... (기존 코드 재사용)
    }
    
  } catch (error) {
    showError('다운로드에 실패했습니다.');
  } finally {
    hideLoading();
  }
}
```

**완료 기준:**
- [ ] PPT 파일 생성 정상
- [ ] 슬라이드 내용 정확
- [ ] 파일명 형식 정확

---

### 3-5. 데이터 관리 (Data Management)

#### 3-5-1. Backend API

**백업 관련 API는 추후 개발 (선택 사항)**

**현재는 다운로드만 구현**

---

#### 3-5-2. Frontend 개발

**작업 파일:**
- `05.Source/04.admin_mode/05_data_management/02_data_management.js`
- `05.Source/04.admin_mode/05_data_management/03_backup_download.js`

**작업 내용:**

**영업담당 데이터 관리(2-5-2)와 유사**

**차이점:**
1. 전체 거래처 다운로드
2. 전체 보고서 다운로드
3. 전체 KPI 다운로드 (전체 사원)

**추가 기능:**

```javascript
async function downloadAllEmployeesKPI() {
  try {
    showLoading();
    
    // 전체 직원 조회
    const employeesRes = await api.get('/employees?role=sales');
    
    if (employeesRes.success) {
      const workbook = XLSX.utils.book_new();
      
      // 각 직원별 KPI 조회 및 시트 생성
      for (const employee of employeesRes.data) {
        const kpiRes = await api.get(`/kpi/sales/${employee.id}`);
        
        if (kpiRes.success) {
          const sheet = createKPISheet(kpiRes.data);
          XLSX.utils.book_append_sheet(workbook, sheet, employee.name);
        }
      }
      
      // 다운로드
      const filename = `전사KPI_${new Date().toISOString()}.xlsx`;
      XLSX.writeFile(workbook, filename);
      
      showSuccess('다운로드가 완료되었습니다.');
    }
    
  } catch (error) {
    showError('다운로드에 실패했습니다.');
  } finally {
    hideLoading();
  }
}
```

**완료 기준:**
- [ ] 전체 데이터 다운로드 정상
- [ ] 전사 KPI 다운로드 정상
- [ ] 파일 형식 정확

---

### 3-6. 직원 관리 (Employee Management)

#### 3-6-1. Backend API 개발

**작업 파일:**
- `backend/controllers/employees.controller.js` (추가)
- `backend/routes/employees.js` (추가)

**Backend API:**

**A. GET /api/employees**
```
Request Headers:
Authorization: Bearer {token}

Query Parameters:
- role: 역할 필터 (optional)
- isActive: 활성 상태 필터 (optional)

Response:
{
  "success": true,
  "data": [
    {
      "id": 1,
      "username": "kjh",
      "name": "강정환",
      "email": "kjh@kuwotech.com",
      "phone": "010-1234-5678",
      "department": "영업부",
      "role": "admin",
      "position": "대표이사",
      "isActive": true,
      "lastLogin": "2025-10-05T10:30:00",
      "createdAt": "2025-01-01T00:00:00"
    },
    // ...
  ]
}

Note: 관리자만 접근
```

**B. POST /api/employees**
```
Request Headers:
Authorization: Bearer {token}

Request Body:
{
  "username": "newsales",
  "password": "1234",
  "name": "신규영업",
  "email": "newsales@kuwotech.com",
  "phone": "010-9999-9999",
  "department": "영업부",
  "role": "sales",
  "position": "대리"
}

Response:
{
  "success": true,
  "data": {
    "id": 10
  },
  "message": "직원이 생성되었습니다"
}

Note: 관리자만 가능
```

**C. PUT /api/employees/:id**
```
Request Headers:
Authorization: Bearer {token}

Request Body:
{
  "email": "updated@kuwotech.com",
  "phone": "010-8888-8888",
  "department": "경영지원팀",
  "position": "과장",
  "isActive": true
}

Response:
{
  "success": true,
  "message": "직원 정보가 수정되었습니다"
}

Note:
- 관리자만 가능
- username, password, role은 별도 API
```

**D. PUT /api/employees/:id/reset-password**
```
Request Headers:
Authorization: Bearer {token}

Request Body:
{
  "newPassword": "5678"
}

Response:
{
  "success": true,
  "message": "비밀번호가 재설정되었습니다"
}

Note: 관리자만 가능
```

**E. DELETE /api/employees/:id**
```
Request Headers:
Authorization: Bearer {token}

Response:
{
  "success": true,
  "message": "직원이 비활성화되었습니다"
}

Note:
- 관리자만 가능
- 실제 삭제가 아닌 isActive = false
- 본인은 비활성화 불가
```

**Postman 테스트:**
1. GET /api/employees (목록)
2. GET /api/employees?role=sales (영업담당만)
3. POST /api/employees (생성)
4. PUT /api/employees/10 (수정)
5. PUT /api/employees/10/reset-password (비밀번호 재설정)
6. DELETE /api/employees/10 (비활성화)

**완료 기준:**
- [ ] 모든 API 정상 작동
- [ ] 관리자만 접근
- [ ] 비밀번호 암호화
- [ ] 에러 처리 완비

---

#### 3-6-2. Frontend 개발

**작업 파일:**
- `05.Source/04.admin_mode/06_employee_management/02_employees.js`

**작업 내용:**

**1. IndexedDB 코드 삭제 및 API 호출 추가**

```javascript
async function loadEmployees(filters = {}) {
  try {
    showLoading();
    
    const params = new URLSearchParams(filters);
    const response = await api.get(`/employees?${params}`);
    
    if (response.success) {
      displayEmployeesTable(response.data);
    }
    
  } catch (error) {
    showError('직원 목록을 불러오는데 실패했습니다.');
  } finally {
    hideLoading();
  }
}
```

**2. 테이블 렌더링**

```javascript
function displayEmployeesTable(employees) {
  const tbody = document.querySelector('#employees-table tbody');
  tbody.innerHTML = '';
  
  employees.forEach(emp => {
    const row = document.createElement('tr');
    
    // 활성 상태 배지
    const statusBadge = emp.isActive 
      ? '<span class="badge badge-success">활성</span>'
      : '<span class="badge badge-secondary">비활성</span>';
    
    row.innerHTML = `
      <td>${emp.name}</td>
      <td>${emp.username}</td>
      <td>${emp.email}</td>
      <td>${emp.phone}</td>
      <td>${emp.department}</td>
      <td>${emp.role === 'admin' ? '관리자' : '영업담당'}</td>
      <td>${emp.position}</td>
      <td>${statusBadge}</td>
      <td>${formatDate(emp.lastLogin)}</td>
      <td>
        <button onclick="viewEmployee(${emp.id})">상세</button>
        <button onclick="editEmployee(${emp.id})">수정</button>
        <button onclick="resetPassword(${emp.id})">비밀번호 재설정</button>
        ${emp.isActive ? `
          <button onclick="deactivateEmployee(${emp.id})">비활성화</button>
        ` : `
          <button onclick="activateEmployee(${emp.id})">활성화</button>
        `}
      </td>
    `;
    tbody.appendChild(row);
  });
}
```

**3. 직원 추가**

```javascript
async function addEmployee(formData) {
  try {
    const employeeData = {
      username: formData.username,
      password: formData.password,
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      department: formData.department,
      role: formData.role,
      position: formData.position
    };
    
    // 유효성 검증
    if (!validateEmployeeForm(employeeData)) {
      return;
    }
    
    const response = await api.post('/employees', employeeData);
    
    if (response.success) {
      showSuccess('직원이 추가되었습니다.');
      closeModal();
      loadEmployees(); // 목록 새로고침
    }
    
  } catch (error) {
    showError('직원 추가에 실패했습니다.');
  }
}

function validateEmployeeForm(data) {
  if (!data.username || data.username.length < 3) {
    showError('사용자명은 최소 3자 이상이어야 합니다.');
    return false;
  }
  
  if (!data.password || data.password.length < 4) {
    showError('비밀번호는 최소 4자 이상이어야 합니다.');
    return false;
  }
  
  if (!data.name) {
    showError('이름을 입력해주세요.');
    return false;
  }
  
  if (!data.email || !data.email.includes('@')) {
    showError('올바른 이메일을 입력해주세요.');
    return false;
  }
  
  return true;
}
```

**4. 직원 수정**

```javascript
async function editEmployee(employeeId) {
  try {
    // 기존 데이터 조회
    const response = await api.get(`/employees/${employeeId}`);
    
    if (response.success) {
      showEditEmployeeModal(response.data);
    }
    
  } catch (error) {
    showError('직원 정보를 불러오는데 실패했습니다.');
  }
}

async function saveEmployee(employeeId, formData) {
  try {
    const employeeData = {
      email: formData.email,
      phone: formData.phone,
      department: formData.department,
      position: formData.position,
      isActive: formData.isActive
    };
    
    const response = await api.put(`/employees/${employeeId}`, employeeData);
    
    if (response.success) {
      showSuccess('직원 정보가 수정되었습니다.');
      closeModal();
      loadEmployees();
    }
    
  } catch (error) {
    showError('직원 정보 수정에 실패했습니다.');
  }
}
```

**5. 비밀번호 재설정**

```javascript
async function resetPassword(employeeId) {
  const newPassword = prompt('새 비밀번호를 입력하세요:');
  
  if (!newPassword) {
    return;
  }
  
  if (newPassword.length < 4) {
    showError('비밀번호는 최소 4자 이상이어야 합니다.');
    return;
  }
  
  try {
    const response = await api.put(`/employees/${employeeId}/reset-password`, {
      newPassword: newPassword
    });
    
    if (response.success) {
      showSuccess('비밀번호가 재설정되었습니다.');
    }
    
  } catch (error) {
    showError('비밀번호 재설정에 실패했습니다.');
  }
}
```

**6. 활성화/비활성화**

```javascript
async function deactivateEmployee(employeeId) {
  if (!confirm('정말 비활성화 하시겠습니까?')) {
    return;
  }
  
  try {
    const response = await api.delete(`/employees/${employeeId}`);
    
    if (response.success) {
      showSuccess('직원이 비활성화되었습니다.');
      loadEmployees();
    }
    
  } catch (error) {
    showError('비활성화에 실패했습니다.');
  }
}

async function activateEmployee(employeeId) {
  try {
    const response = await api.put(`/employees/${employeeId}`, {
      isActive: true
    });
    
    if (response.success) {
      showSuccess('직원이 활성화되었습니다.');
      loadEmployees();
    }
    
  } catch (error) {
    showError('활성화에 실패했습니다.');
  }
}
```

**7. 필터 기능**

```javascript
// 역할 필터
document.getElementById('role-filter').addEventListener('change', (e) => {
  const role = e.target.value;
  loadEmployees({ role });
});

// 활성 상태 필터
document.getElementById('status-filter').addEventListener('change', (e) => {
  const isActive = e.target.value;
  loadEmployees({ isActive });
});
```

**테스트 시나리오:**
1. 페이지 로드 → 직원 목록 표시
2. 역할 필터 → 영업담당만 표시
3. 직원 추가 → 폼 입력 → 저장 성공
4. 직원 수정 → 정보 변경 → 저장 성공
5. 비밀번호 재설정 → 새 비밀번호 입력 → 성공
6. 비활성화 → 확인 → 비활성화 성공
7. 활성화 → 활성화 성공

**완료 기준:**
- [ ] 목록 조회 정상
- [ ] 필터 기능 정상
- [ ] 직원 추가 정상
- [ ] 직원 수정 정상
- [ ] 비밀번호 재설정 정상
- [ ] 활성화/비활성화 정상
- [ ] 에러 처리 완비

---

#### 3-6-3. 직원 다운로드

**작업 파일:**
- `05.Source/04.admin_mode/06_employee_management/03_employee_download.js`

**작업 내용:**

```javascript
async function downloadEmployees() {
  try {
    showLoading();
    
    // 전체 직원 조회
    const response = await api.get('/employees');
    
    if (response.success) {
      const workbook = createEmployeesWorkbook(response.data);
      
      const filename = `직원목록_${new Date().toISOString()}.xlsx`;
      XLSX.writeFile(workbook, filename);
      
      showSuccess('다운로드가 완료되었습니다.');
    }
    
  } catch (error) {
    showError('다운로드에 실패했습니다.');
  } finally {
    hideLoading();
  }
}

function createEmployeesWorkbook(employees) {
  const headers = [
    'ID',
    '사용자명',
    '이름',
    '이메일',
    '전화번호',
    '부서',
    '역할',
    '직급',
    '활성상태',
    '마지막로그인',
    '생성일'
  ];
  
  const rows = employees.map(emp => [
    emp.id,
    emp.username,
    emp.name,
    emp.email,
    emp.phone,
    emp.department,
    emp.role === 'admin' ? '관리자' : '영업담당',
    emp.position,
    emp.isActive ? '활성' : '비활성',
    formatDate(emp.lastLogin),
    formatDate(emp.createdAt)
  ]);
  
  const sheetData = [headers, ...rows];
  
  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '직원목록');
  
  return wb;
}
```

**완료 기준:**
- [ ] 다운로드 버튼 클릭 시 Excel 생성
- [ ] 모든 직원 포함
- [ ] 데이터 정확성 100%

---

### 3-7. 시스템 설정 (System Settings)

**영업담당 시스템 설정(2-6)과 동일**

**완료 기준:**
- [ ] 영업담당과 동일한 기능
- [ ] 관리자 권한 추가 기능 없음

---

### 3-8. Excel 업로드 (Excel Upload)

#### 3-8-1. Backend API 개발

**작업 파일:**
- `backend/controllers/excel.controller.js` (신규 생성)
- `backend/routes/excel.js` (신규 생성)

**Backend API:**

**A. POST /api/excel/upload**
```
Request Headers:
Authorization: Bearer {token}
Content-Type: multipart/form-data

Request Body:
- file: Excel 파일 (multipart/form-data)

Response:
{
  "success": true,
  "data": {
    "companiesImported": 500,
    "employeesImported": 5,
    "errors": []
  },
  "message": "Excel 업로드가 완료되었습니다"
}

Note:
- 관리자 중 특정 사용자만 가능 (kjh)
- 기존 데이터 덮어쓰기 옵션
```

**Postman 테스트:**
1. POST /api/excel/upload (파일 첨부)
2. 응답 확인 (import 개수)
3. DB 확인 (데이터 저장 여부)

**완료 기준:**
- [ ] 파일 업로드 정상
- [ ] Excel 파싱 정확
- [ ] DB 저장 정상
- [ ] 에러 처리 완비

---

#### 3-8-2. Frontend 개발

**작업 파일:**
- `05.Source/04.admin_mode/08_excel_upload/02_excel_upload.js`

**작업 내용:**

**1. 파일 선택 및 업로드**

```javascript
document.getElementById('excel-file').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  
  if (!file) {
    return;
  }
  
  // 파일 크기 체크 (10MB)
  if (file.size > 10 * 1024 * 1024) {
    showError('파일 크기는 10MB 이하여야 합니다.');
    return;
  }
  
  // 파일 확장자 체크
  if (!file.name.endsWith('.xlsx')) {
    showError('Excel 파일(.xlsx)만 업로드 가능합니다.');
    return;
  }
  
  await uploadExcel(file);
});

async function uploadExcel(file) {
  try {
    showLoading('파일을 업로드 중입니다...');
    
    // FormData 생성
    const formData = new FormData();
    formData.append('file', file);
    
    // API 호출
    const response = await api.post('/excel/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    if (response.success) {
      showSuccess(
        `업로드 완료!\n` +
        `거래처: ${response.data.companiesImported}개\n` +
        `직원: ${response.data.employeesImported}명`
      );
      
      // 에러가 있으면 표시
      if (response.data.errors.length > 0) {
        displayErrors(response.data.errors);
      }
    }
    
  } catch (error) {
    showError('Excel 업로드에 실패했습니다.');
  } finally {
    hideLoading();
  }
}
```

**2. 업로드 진행 상태 표시**

```javascript
async function uploadExcelWithProgress(file) {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    // XMLHttpRequest로 진행 상태 표시
    const xhr = new XMLHttpRequest();
    
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percentComplete = (e.loaded / e.total) * 100;
        updateProgress(percentComplete);
      }
    });
    
    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        const response = JSON.parse(xhr.responseText);
        showSuccess('업로드가 완료되었습니다.');
        displayUploadResults(response.data);
      } else {
        showError('업로드에 실패했습니다.');
      }
    });
    
    xhr.open('POST', `${CONFIG.BACKEND.BASE_URL}/excel/upload`);
    xhr.setRequestHeader('Authorization', `Bearer ${SessionManager.getToken()}`);
    xhr.send(formData);
    
  } catch (error) {
    showError('업로드에 실패했습니다.');
  }
}

function updateProgress(percent) {
  const progressBar = document.getElementById('upload-progress-bar');
  const progressText = document.getElementById('upload-progress-text');
  
  progressBar.style.width = `${percent}%`;
  progressText.textContent = `${Math.round(percent)}%`;
}
```

**3. 업로드 결과 표시**

```javascript
function displayUploadResults(data) {
  const resultsDiv = document.getElementById('upload-results');
  
  resultsDiv.innerHTML = `
    <h3>업로드 결과</h3>
    <div class="result-stats">
      <div class="stat-item">
        <span class="stat-label">거래처:</span>
        <span class="stat-value">${data.companiesImported}개</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">직원:</span>
        <span class="stat-value">${data.employeesImported}명</span>
      </div>
    </div>
  `;
  
  if (data.errors && data.errors.length > 0) {
    const errorsHtml = `
      <h4>오류 목록 (${data.errors.length}개)</h4>
      <ul class="error-list">
        ${data.errors.map(err => `<li>${err}</li>`).join('')}
      </ul>
    `;
    resultsDiv.innerHTML += errorsHtml;
  }
  
  resultsDiv.style.display = 'block';
}
```

**4. 권한 체크**

```javascript
window.addEventListener('DOMContentLoaded', () => {
  const user = SessionManager.getUser();
  
  // kjh만 접근 가능
  if (user.username !== 'kjh') {
    document.getElementById('upload-container').innerHTML = `
      <div class="access-denied">
        <h2>접근 권한이 없습니다</h2>
        <p>Excel 업로드는 강정환(kjh)만 가능합니다.</p>
      </div>
    `;
  }
});
```

**테스트 시나리오:**
1. 페이지 접속 (kjh) → 업로드 폼 표시
2. 페이지 접속 (다른 관리자) → 접근 거부 메시지
3. Excel 파일 선택
4. 업로드 시작 → 진행 상태 표시
5. 업로드 완료 → 결과 표시
6. 에러 있을 경우 → 에러 목록 표시

**완료 기준:**
- [ ] 파일 선택 정상
- [ ] 업로드 진행 상태 표시
- [ ] 업로드 완료 후 결과 표시
- [ ] 권한 체크 정확 (kjh만)
- [ ] 에러 처리 완비

---

## PHASE 4: 통합 테스트

### 4-1. End-to-End 시나리오 테스트

**테스트 시나리오:**

**시나리오 1: 영업담당 전체 플로우**
1. 로그인 (영업담당)
2. 대시보드 확인 (KPI 14개)
3. 담당거래처 조회
4. 거래처 정보 수정
5. 보고서 작성
6. 제출한 보고서 확인
7. 데이터 다운로드 (3종)
8. 로그아웃

**시나리오 2: 관리자 전체 플로우**
1. 로그인 (관리자)
2. 대시보드 확인 (전사 KPI)
3. 전체거래처 조회
4. 보고서 확인
5. 보고서 승인/반려
6. 직원 관리 (추가/수정)
7. Excel 업로드 (kjh만)
8. 발표 자료 생성
9. 로그아웃

**시나리오 3: 권한 테스트**
1. 영업담당 로그인
2. 관리자 페이지 접근 시도 → 거부
3. 다른 사람 거래처 수정 시도 → 거부
4. 관리자 로그인
5. 영업담당 권한 기능 접근 → 허용
6. 직원 관리 → 허용

**시나리오 4: 데이터 일관성 테스트**
1. 영업담당: 보고서 제출
2. 관리자: 보고서 승인
3. 영업담당: 대시보드 → KPI 변경 확인
4. 관리자: 전사 KPI → 변경 반영 확인
5. 다운로드 → 데이터 일치 확인

**완료 기준:**
- [ ] 모든 시나리오 통과
- [ ] 권한 체크 정확
- [ ] 데이터 일관성 유지
- [ ] 에러 없음

---

### 4-2. 성능 테스트

**테스트 항목:**

**1. API 응답 시간**
- 로그인: < 500ms
- KPI 계산: < 500ms
- 거래처 목록: < 1초
- 보고서 목록: < 1초

**2. 프론트엔드 렌더링**
- 대시보드 로딩: < 2초
- 테이블 렌더링 (50개): < 500ms
- 모달 표시: < 200ms

**3. 다운로드**
- Excel 생성 (500개): < 5초
- PPT 생성: < 10초

**완료 기준:**
- [ ] 모든 성능 기준 충족
- [ ] 병목 구간 없음
- [ ] 메모리 누수 없음

---

### 4-3. 크로스 브라우저 테스트

**테스트 브라우저:**
- Chrome (최신)
- Edge (최신)
- Firefox (선택)

**테스트 항목:**
- [ ] 레이아웃 정상
- [ ] 기능 정상 작동
- [ ] API 호출 정상
- [ ] 파일 다운로드 정상

---

## PHASE 5: 배포 준비

### 5-1. 배포 전 체크리스트

**Backend:**
- [ ] Railway 배포 완료
- [ ] MySQL 연결 정상
- [ ] 환경 변수 설정
- [ ] API 엔드포인트 테스트
- [ ] 로그 확인

**Frontend:**
- [ ] Backend URL 설정 (프로덕션)
- [ ] Console 에러 제거
- [ ] 디버깅 코드 제거
- [ ] 주석 정리
- [ ] 파일 압축

**데이터:**
- [ ] 초기 데이터 준비
- [ ] 테스트 계정 생성
- [ ] 백업 파일 준비

---

### 5-2. 문서화

**작성할 문서:**

**1. API 문서**
- 전체 엔드포인트 목록
- 요청/응답 형식
- 에러 코드

**2. 사용자 가이드**
- 로그인 방법
- 기능별 사용법
- 문제 해결 (FAQ)

**3. 개발자 문서**
- 프로젝트 구조
- 개발 환경 설정
- 배포 방법

---

### 5-3. 배포 실행

**배포 순서:**

1. Backend 배포
   - Railway 재배포
   - DB 마이그레이션
   - API 테스트

2. Frontend 배포
   - 파일 업로드 (서버)
   - URL 설정 확인
   - 통합 테스트

3. 최종 확인
   - 전체 플로우 테스트
   - 성능 측정
   - 사용자 인수 테스트

---

# PART 3: 통합 및 배포

## 부록 A: API 엔드포인트 목록

### 인증 (Auth)
- POST /api/auth/login
- POST /api/auth/logout
- POST /api/auth/refresh
- GET /api/auth/me

### 거래처 (Companies)
- GET /api/companies (관리자)
- GET /api/companies/my (영업담당)
- GET /api/companies/:id
- POST /api/companies
- PUT /api/companies/:id
- DELETE /api/companies/:id (관리자)

### 보고서 (Reports)
- GET /api/reports (관리자)
- GET /api/reports/my (영업담당)
- GET /api/reports/:id
- POST /api/reports
- PUT /api/reports/:id
- DELETE /api/reports/:id
- PUT /api/reports/:id/approve (관리자)
- PUT /api/reports/:id/reject (관리자)

### KPI
- GET /api/kpi/sales/:userId
- GET /api/kpi/admin
- GET /api/kpi/admin/rankings

### 직원 (Employees)
- GET /api/employees (관리자)
- POST /api/employees (관리자)
- PUT /api/employees/:id (관리자)
- PUT /api/employees/:id/profile (본인)
- PUT /api/employees/:id/password (본인)
- PUT /api/employees/:id/reset-password (관리자)
- DELETE /api/employees/:id (관리자)

### Excel
- POST /api/excel/upload (kjh만)

---

## 부록 B: 데이터 모델

### Company (거래처)
```javascript
{
  id: Number,
  keyValue: String,
  companyNameERP: String,
  finalCompanyName: String,
  isClosed: String,
  ceoOrDentist: String,
  customerRegion: String,
  businessStatus: String,
  department: String,
  salesProduct: String,
  internalManager: String,
  jcwContribution: String,
  companyContribution: String,
  lastPaymentDate: Date,
  lastPaymentAmount: Number,
  accountsReceivable: Number,
  accumulatedCollection: Number,
  accumulatedSales: Number,
  businessActivity: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Report (보고서)
```javascript
{
  reportId: Number,
  companyId: Number,
  submittedBy: Number,
  reportType: String,
  content: {
    visitDate: Date,
    visitPurpose: String,
    targetCollectionAmount: Number,
    targetSalesAmount: Number,
    targetProducts: String,
    activityNotes: String
  },
  status: String, // 'pending', 'confirmed', 'rejected'
  confirmedBy: Number,
  confirmedDate: Date,
  adminComment: String,
  submittedDate: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Employee (직원)
```javascript
{
  id: Number,
  username: String,
  password: String, // hashed
  name: String,
  email: String,
  phone: String,
  department: String,
  role: String, // 'admin', 'sales'
  position: String,
  isActive: Boolean,
  lastLogin: Date,
  createdAt: Date,
  updatedAt: Date
}
```

---

## 부록 C: 체크리스트

### Phase 1 완료
- [ ] Backend MySQL 연결
- [ ] 인증 API 완성
- [ ] Frontend API 클라이언트
- [ ] 로그인 시스템 통합
- [ ] IndexedDB 파일 삭제

### Phase 2 완료
- [ ] 영업담당 6개 메뉴 완성
- [ ] 모든 API 정상 작동
- [ ] 다운로드 기능 정상
- [ ] 에러 처리 완비

### Phase 3 완료
- [ ] 관리자 8개 메뉴 완성
- [ ] 권한 체크 정확
- [ ] Excel 업로드 정상
- [ ] 발표 자료 생성

### Phase 4 완료
- [ ] E2E 시나리오 통과
- [ ] 성능 기준 충족
- [ ] 크로스 브라우저 테스트

### Phase 5 완료
- [ ] Backend 배포
- [ ] Frontend 배포
- [ ] 문서화 완료
- [ ] 사용자 인수

---

**📝 최종 업데이트**: 2025-10-05  
**✍️ 작성자**: Claude  
**📌 버전**: 1.0

---
