# Backend API 응답 구조 표준

## 📌 개요
Backend API의 일관된 응답 형식을 정의하여 Frontend 파싱 로직을 단순화하고 방어 코드를 제거합니다.

---

## 🎯 표준화 목표

### 현재 문제점
```javascript
// ❌ admin_feedback.js에서 여러 응답 형식 방어
const reportsArray = Array.isArray(result) ? result :
                    Array.isArray(result.data) ? result.data :
                    Array.isArray(result.reports) ? result.reports : [];
```

**문제**:
- Backend API 응답 구조가 일관되지 않음
- 여러 응답 형식에 대한 방어 코드 필요
- Frontend와 Backend 간 계약(contract) 불명확
- 예기치 않은 응답 구조로 인한 버그 가능

**목표**:
- 모든 엔드포인트에서 일관된 JSON 형식 사용
- Frontend 파싱 로직 단일화
- 에러 응답 형식 통일
- 방어 코드 제거 가능

---

## ✅ 표준 응답 형식

### 1. 성공 응답 (Success Response)

#### 단일 데이터 조회 (Single Resource)
```javascript
{
  "success": true,
  "data": {
    "id": 1,
    "name": "홍길동",
    "email": "hong@example.com"
  },
  "message": "조회 성공",
  "timestamp": "2025-10-09T12:00:00Z"
}
```

**규칙**:
- `success`: 항상 `true`
- `data`: 단일 객체
- `message`: 선택적, 사용자 친화적 메시지
- `timestamp`: ISO 8601 형식 (선택적)

---

#### 목록 조회 (List/Array)
```javascript
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "홍길동"
    },
    {
      "id": 2,
      "name": "김철수"
    }
  ],
  "total": 2,
  "message": "거래처 목록 조회 성공",
  "timestamp": "2025-10-09T12:00:00Z"
}
```

**규칙**:
- `success`: 항상 `true`
- `data`: 항상 배열 (빈 배열도 `[]`로 반환)
- `total`: 전체 데이터 개수 (선택적, 페이지네이션 시 필수)
- `message`: 선택적
- `timestamp`: 선택적

---

#### 페이지네이션 포함 목록 조회
```javascript
{
  "success": true,
  "data": [
    { "id": 1, "name": "홍길동" },
    { "id": 2, "name": "김철수" }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 150,
    "totalPages": 15,
    "hasNext": true,
    "hasPrev": false
  },
  "message": "거래처 목록 조회 성공",
  "timestamp": "2025-10-09T12:00:00Z"
}
```

**규칙**:
- `pagination`: 페이지네이션 정보 객체
  - `page`: 현재 페이지 (1-based)
  - `limit`: 페이지당 항목 수
  - `total`: 전체 데이터 개수
  - `totalPages`: 전체 페이지 수
  - `hasNext`: 다음 페이지 존재 여부
  - `hasPrev`: 이전 페이지 존재 여부

---

#### 생성/수정/삭제 응답 (CUD Operations)
```javascript
// POST /api/companies (생성)
{
  "success": true,
  "data": {
    "id": 123,
    "name": "신규거래처",
    "createdAt": "2025-10-09T12:00:00Z"
  },
  "message": "거래처가 성공적으로 생성되었습니다"
}

// PUT /api/companies/123 (수정)
{
  "success": true,
  "data": {
    "id": 123,
    "name": "수정된거래처",
    "updatedAt": "2025-10-09T12:05:00Z"
  },
  "message": "거래처가 성공적으로 수정되었습니다"
}

// DELETE /api/companies/123 (삭제)
{
  "success": true,
  "data": {
    "id": 123,
    "deletedAt": "2025-10-09T12:10:00Z"
  },
  "message": "거래처가 성공적으로 삭제되었습니다"
}
```

**규칙**:
- 항상 변경된 리소스 정보를 `data`에 포함
- 생성: `createdAt` 포함
- 수정: `updatedAt` 포함
- 삭제: `deletedAt` 포함 (Soft Delete인 경우)

---

### 2. 에러 응답 (Error Response)

#### 표준 에러 형식
```javascript
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "입력값이 유효하지 않습니다",
    "details": [
      {
        "field": "email",
        "message": "이메일 형식이 올바르지 않습니다"
      },
      {
        "field": "phone",
        "message": "전화번호는 필수입니다"
      }
    ]
  },
  "timestamp": "2025-10-09T12:00:00Z"
}
```

**규칙**:
- `success`: 항상 `false`
- `error`: 에러 정보 객체
  - `code`: 에러 코드 (대문자 스네이크 케이스)
  - `message`: 사용자 친화적 에러 메시지
  - `details`: 세부 에러 정보 (선택적, 배열)
- `timestamp`: 에러 발생 시각

---

## 📋 표준 에러 코드

### HTTP 상태 코드별 에러 코드

#### 400 Bad Request
```javascript
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "입력값 검증 실패",
    "details": [...]
  }
}
```

**에러 코드**:
- `VALIDATION_ERROR`: 입력값 검증 실패
- `INVALID_FORMAT`: 잘못된 형식
- `MISSING_REQUIRED_FIELD`: 필수 필드 누락
- `INVALID_REQUEST`: 잘못된 요청

---

#### 401 Unauthorized
```javascript
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "인증이 필요합니다"
  }
}
```

**에러 코드**:
- `UNAUTHORIZED`: 인증 필요
- `TOKEN_EXPIRED`: 토큰 만료
- `TOKEN_INVALID`: 유효하지 않은 토큰
- `TOKEN_MISSING`: 토큰 누락

---

#### 403 Forbidden
```javascript
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "접근 권한이 없습니다"
  }
}
```

**에러 코드**:
- `FORBIDDEN`: 권한 없음
- `INSUFFICIENT_PERMISSIONS`: 권한 부족
- `ACCESS_DENIED`: 접근 거부

---

#### 404 Not Found
```javascript
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "요청한 리소스를 찾을 수 없습니다"
  }
}
```

**에러 코드**:
- `NOT_FOUND`: 리소스 없음
- `RESOURCE_NOT_FOUND`: 특정 리소스 없음 (예: `COMPANY_NOT_FOUND`)

---

#### 409 Conflict
```javascript
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "중복된 데이터가 존재합니다",
    "details": {
      "field": "email",
      "value": "duplicate@example.com"
    }
  }
}
```

**에러 코드**:
- `CONFLICT`: 데이터 충돌
- `DUPLICATE_ENTRY`: 중복 데이터
- `CONSTRAINT_VIOLATION`: 제약 조건 위반

---

#### 500 Internal Server Error
```javascript
{
  "success": false,
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요"
  }
}
```

**에러 코드**:
- `INTERNAL_SERVER_ERROR`: 서버 내부 오류
- `DATABASE_ERROR`: 데이터베이스 오류
- `SERVICE_UNAVAILABLE`: 서비스 불가

---

## 🔧 Backend 구현 가이드

### Express.js 응답 헬퍼 함수

#### 성공 응답 헬퍼
```javascript
// utils/responseHelper.js

/**
 * 성공 응답 생성
 */
function successResponse(data, message = null, statusCode = 200) {
  return {
    success: true,
    data,
    ...(message && { message }),
    timestamp: new Date().toISOString()
  };
}

/**
 * 페이지네이션 응답 생성
 */
function paginatedResponse(data, pagination, message = null) {
  return {
    success: true,
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: Math.ceil(pagination.total / pagination.limit),
      hasNext: pagination.page < Math.ceil(pagination.total / pagination.limit),
      hasPrev: pagination.page > 1
    },
    ...(message && { message }),
    timestamp: new Date().toISOString()
  };
}

/**
 * 생성 응답 (201 Created)
 */
function createdResponse(data, message = '생성되었습니다') {
  return {
    success: true,
    data: {
      ...data,
      createdAt: data.createdAt || new Date().toISOString()
    },
    message,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  successResponse,
  paginatedResponse,
  createdResponse
};
```

---

#### 에러 응답 헬퍼
```javascript
// utils/errorHelper.js

/**
 * 표준 에러 클래스
 */
class ApiError extends Error {
  constructor(code, message, statusCode = 500, details = null) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * 에러 응답 생성
 */
function errorResponse(error) {
  return {
    success: false,
    error: {
      code: error.code || 'INTERNAL_SERVER_ERROR',
      message: error.message || '서버 오류가 발생했습니다',
      ...(error.details && { details: error.details })
    },
    timestamp: new Date().toISOString()
  };
}

/**
 * 에러 타입별 팩토리 함수
 */
const Errors = {
  validation: (message, details = null) =>
    new ApiError('VALIDATION_ERROR', message, 400, details),

  unauthorized: (message = '인증이 필요합니다') =>
    new ApiError('UNAUTHORIZED', message, 401),

  forbidden: (message = '접근 권한이 없습니다') =>
    new ApiError('FORBIDDEN', message, 403),

  notFound: (message = '요청한 리소스를 찾을 수 없습니다') =>
    new ApiError('NOT_FOUND', message, 404),

  conflict: (message, details = null) =>
    new ApiError('CONFLICT', message, 409, details),

  internal: (message = '서버 오류가 발생했습니다') =>
    new ApiError('INTERNAL_SERVER_ERROR', message, 500)
};

module.exports = {
  ApiError,
  errorResponse,
  Errors
};
```

---

#### Express 미들웨어
```javascript
// middleware/errorHandler.js
const { errorResponse } = require('../utils/errorHelper');

/**
 * 전역 에러 핸들러
 */
function errorHandler(err, req, res, next) {
  // 로깅
  console.error('Error:', {
    code: err.code,
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method
  });

  // 표준 에러 응답 반환
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json(errorResponse(err));
}

module.exports = errorHandler;
```

---

### 라우터 예시

#### 거래처 API (Companies)
```javascript
// routes/companies.js
const express = require('express');
const router = express.Router();
const { successResponse, paginatedResponse, createdResponse } = require('../utils/responseHelper');
const { Errors } = require('../utils/errorHelper');

/**
 * GET /api/companies - 거래처 목록 조회
 */
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    // 데이터 조회
    const { companies, total } = await getCompanies(page, limit);

    // 페이지네이션 응답 반환
    res.json(paginatedResponse(
      companies,
      { page: parseInt(page), limit: parseInt(limit), total },
      '거래처 목록 조회 성공'
    ));

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/companies/:id - 단일 거래처 조회
 */
router.get('/:id', async (req, res, next) => {
  try {
    const company = await getCompanyById(req.params.id);

    if (!company) {
      throw Errors.notFound('거래처를 찾을 수 없습니다');
    }

    res.json(successResponse(company, '거래처 조회 성공'));

  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/companies - 거래처 생성
 */
router.post('/', async (req, res, next) => {
  try {
    // 유효성 검증
    const errors = validateCompanyData(req.body);
    if (errors.length > 0) {
      throw Errors.validation('입력값 검증 실패', errors);
    }

    // 중복 체크
    const existing = await findCompanyByName(req.body.name);
    if (existing) {
      throw Errors.conflict('이미 존재하는 거래처명입니다', {
        field: 'name',
        value: req.body.name
      });
    }

    // 생성
    const newCompany = await createCompany(req.body);

    res.status(201).json(createdResponse(newCompany, '거래처가 생성되었습니다'));

  } catch (error) {
    next(error);
  }
});

module.exports = router;
```

---

## 💻 Frontend 파싱 가이드

### 15_api_helper.js 통합

이미 생성된 `15_api_helper.js`가 표준 응답 형식을 처리합니다:

```javascript
import { apiGet, apiPost, handleApiError } from './15_api_helper.js';

// ✅ 표준화된 API 호출
async function loadCompanies() {
  try {
    // 표준 응답: { success: true, data: [...], total: 100 }
    const response = await apiGet('/companies');

    // 방어 코드 불필요 - 항상 response.data가 배열
    const companies = response.data;

    displayCompanies(companies);

  } catch (error) {
    // 표준 에러 처리
    const message = handleApiError(error, showToast);
    console.error(message);
  }
}
```

---

### 기존 방어 코드 제거

#### 수정 전 (방어 코드 필요)
```javascript
// ❌ admin_feedback.js (Line 87-100)
const reportsArray = Array.isArray(result) ? result :
                    Array.isArray(result.data) ? result.data :
                    Array.isArray(result.reports) ? result.reports : [];
```

#### 수정 후 (표준화)
```javascript
// ✅ admin_feedback.js (Backend 표준화 후)
import { apiGet } from '../../01.common/15_api_helper.js';

const response = await apiGet('/reports');
const reports = response.data; // 항상 배열 보장
```

---

## 📊 KUWOTECH API 엔드포인트별 표준 응답

### 1. 인증 (Authentication)

#### POST /api/auth/login
```javascript
// 성공
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "name": "홍길동",
      "role": "admin"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "로그인 성공"
}

// 실패
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "아이디 또는 비밀번호가 일치하지 않습니다"
  }
}
```

---

### 2. 거래처 (Companies)

#### GET /api/companies
```javascript
{
  "success": true,
  "data": [
    {
      "company_key": "001",
      "company_name": "ABC주식회사",
      "employee_name": "홍길동"
    }
  ],
  "total": 150,
  "message": "거래처 목록 조회 성공"
}
```

#### GET /api/companies/:id
```javascript
{
  "success": true,
  "data": {
    "company_key": "001",
    "company_name": "ABC주식회사",
    "employee_name": "홍길동",
    "created_at": "2025-01-01T00:00:00Z"
  }
}
```

---

### 3. 직원 (Employees)

#### GET /api/employees
```javascript
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "홍길동",
      "department": "영업팀",
      "role": "manager"
    }
  ],
  "total": 25
}
```

#### GET /api/employees/:id/companies
```javascript
{
  "success": true,
  "data": [
    {
      "company_key": "001",
      "company_name": "ABC주식회사"
    }
  ],
  "total": 10,
  "message": "직원의 거래처 목록 조회 성공"
}
```

---

### 4. 보고서 (Reports)

#### GET /api/reports
```javascript
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "2025년 1월 영업보고",
      "author": "홍길동",
      "created_at": "2025-01-31T23:59:59Z"
    }
  ],
  "total": 50
}
```

---

### 5. 마스터 데이터 (Master Data)

#### GET /api/master-data/industries
```javascript
{
  "success": true,
  "data": [
    {
      "code": "IT",
      "name": "정보통신업"
    },
    {
      "code": "MFG",
      "name": "제조업"
    }
  ],
  "total": 20
}
```

---

## ✅ 구현 체크리스트

### Backend 작업
- [ ] `utils/responseHelper.js` 생성
- [ ] `utils/errorHelper.js` 생성
- [ ] `middleware/errorHandler.js` 생성
- [ ] 모든 라우터에 표준 응답 적용
  - [ ] `/api/auth/*`
  - [ ] `/api/companies/*`
  - [ ] `/api/employees/*`
  - [ ] `/api/reports/*`
  - [ ] `/api/master-data/*`
- [ ] 에러 핸들러 미들웨어 등록 (`app.use(errorHandler)`)
- [ ] 기존 응답 형식 마이그레이션

### Frontend 작업
- [ ] `15_api_helper.js` 활용
- [ ] 방어 코드 제거
  - [ ] `admin_feedback.js` (Line 87-100)
  - [ ] 기타 `Array.isArray()` 방어 코드 검색
- [ ] 표준 에러 처리 적용
- [ ] 페이지네이션 UI 구현 (선택)

### 테스트
- [ ] 각 엔드포인트 응답 형식 검증
- [ ] 에러 시나리오 테스트 (401, 404, 500 등)
- [ ] Frontend 파싱 정상 동작 확인

---

## 🔍 마이그레이션 예시

### Before (비표준)
```javascript
// Backend
router.get('/companies', async (req, res) => {
  const companies = await getCompanies();
  res.json(companies);  // ❌ 배열 직접 반환
});

// Frontend
const result = await fetch('/api/companies').then(r => r.json());
const companies = Array.isArray(result) ? result :  // ❌ 방어 코드
                  Array.isArray(result.data) ? result.data : [];
```

### After (표준)
```javascript
// Backend
router.get('/companies', async (req, res, next) => {
  try {
    const companies = await getCompanies();
    res.json(successResponse(companies, '거래처 목록 조회 성공'));  // ✅ 표준 응답
  } catch (error) {
    next(error);
  }
});

// Frontend
import { apiGet } from './15_api_helper.js';

const response = await apiGet('/companies');
const companies = response.data;  // ✅ 항상 배열 보장
```

---

## 📚 참고 자료

- [REST API Best Practices](https://restfulapi.net/http-status-codes/)
- [JSON API Specification](https://jsonapi.org/)
- KUWOTECH 프로젝트: `05.Source/01.common/15_api_helper.js`
- 분석 문서: `04.Program Development Plan/03_문제점파악/04_데이터플로우_일관성_분석.md`

---

**작성일**: 2025-10-09
**버전**: 1.0
**작성자**: Claude Code
