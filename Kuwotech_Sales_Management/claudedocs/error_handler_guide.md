# ErrorHandler 사용 가이드

## 개요

중앙화된 에러 처리 시스템으로, 애플리케이션 전반에 걸친 일관된 에러 처리를 제공합니다.

## 주요 기능

### 1. 에러 타입 분류
- `NETWORK`: 네트워크 관련 에러
- `AUTH`: 인증/로그인 에러
- `VALIDATION`: 데이터 검증 에러
- `DATABASE`: 데이터베이스 에러
- `PERMISSION`: 권한 관련 에러
- `NOT_FOUND`: 데이터 미발견
- `BUSINESS_LOGIC`: 비즈니스 로직 에러
- `UNKNOWN`: 알 수 없는 에러

### 2. 에러 심각도
- `LOW`: 경고 수준 (info 토스트)
- `MEDIUM`: 일반 에러 (warning 토스트)
- `HIGH`: 심각한 에러 (error 토스트)
- `CRITICAL`: 치명적 에러 (모달 표시)

### 3. 자동 기능
- ✅ 사용자 친화적 메시지 자동 생성
- ✅ 적절한 UI 표시 (토스트/모달)
- ✅ Logger와 통합된 로깅
- ✅ 재시도 로직 (지수 백오프)
- ✅ 폴백 메커니즘
- ✅ 전역 에러 캐칭

## 기본 사용법

### 1. 단순 에러 처리

**Before (기존 방식):**
```javascript
try {
    await fetchData();
} catch (error) {
    logger.error('[데이터 로드] 실패:', error);
    showToast('데이터를 불러올 수 없습니다', 'error');
}
```

**After (ErrorHandler 사용):**
```javascript
import errorHandler from '../../01.common/24_error_handler.js';

const result = await errorHandler.handle(
    await fetchData(),
    {
        context: { module: 'dashboard', action: 'fetchData' },
        showToUser: true
    }
);

if (result.success) {
    // 성공 처리
    processData(result.data);
}
```

### 2. 헬퍼 함수 사용 (더 간단)

```javascript
import { handleError } from '../../01.common/24_error_handler.js';

const result = await handleError(
    async () => await fetchData(),
    { context: { module: 'dashboard', action: 'fetchData' } }
);

if (result.success) {
    processData(result.data);
}
```

### 3. 재시도 로직 포함

```javascript
import { safeExecuteWithRetry } from '../../01.common/24_error_handler.js';

const result = await safeExecuteWithRetry(
    async () => await fetchData(),
    {
        context: { module: 'api', action: 'fetchData' },
        maxRetries: 3,  // 최대 3회 재시도
        retryDelay: 1000  // 1초 지연
    }
);

if (result.success) {
    processData(result.data);
}
```

### 4. 폴백 함수 사용

```javascript
import errorHandler from '../../01.common/24_error_handler.js';

const result = await errorHandler.handle(
    await fetchData(),
    {
        context: { module: 'dashboard', action: 'fetchData' },
        fallbackFn: async () => {
            // 실패 시 캐시된 데이터 반환
            return getCachedData();
        }
    }
);

// result.usedFallback 로 폴백 사용 여부 확인 가능
if (result.success) {
    processData(result.data);
}
```

## 커스텀 에러 클래스 사용

### 1. NetworkError

```javascript
import { NetworkError } from '../../01.common/24_error_handler.js';

async function fetchFromAPI() {
    try {
        const response = await fetch('/api/data');
        if (!response.ok) {
            throw new NetworkError(
                'API 요청 실패',
                null,
                {
                    userMessage: '서버와 통신할 수 없습니다. 잠시 후 다시 시도해주세요.',
                    context: { url: '/api/data', status: response.status }
                }
            );
        }
        return await response.json();
    } catch (error) {
        throw new NetworkError('네트워크 연결 실패', error);
    }
}
```

### 2. ValidationError

```javascript
import { ValidationError } from '../../01.common/24_error_handler.js';

function validateEmail(email) {
    if (!email || !email.includes('@')) {
        throw new ValidationError(
            '이메일 형식이 올바르지 않습니다',
            null,
            {
                userMessage: '올바른 이메일 주소를 입력해주세요.',
                context: { field: 'email', value: email }
            }
        );
    }
}
```

### 3. AuthError

```javascript
import { AuthError } from '../../01.common/24_error_handler.js';

async function checkAuth() {
    const token = localStorage.getItem('authToken');
    if (!token) {
        throw new AuthError(
            '인증 토큰이 없습니다',
            null,
            {
                userMessage: '로그인이 필요합니다.',
                context: { action: 'checkAuth' }
            }
        );
    }
}
```

## 실전 예제

### API 호출

```javascript
import errorHandler, { NetworkError } from '../../01.common/24_error_handler.js';

async function fetchUserData(userId) {
    return errorHandler.handle(
        (async () => {
            const response = await fetch(`/api/users/${userId}`);

            if (!response.ok) {
                if (response.status === 404) {
                    throw new NotFoundError('사용자를 찾을 수 없습니다');
                }
                if (response.status === 401) {
                    throw new AuthError('인증이 필요합니다');
                }
                throw new NetworkError(`API 오류: ${response.status}`);
            }

            return await response.json();
        })(),
        {
            context: { module: 'user', action: 'fetchUserData', userId },
            allowRetry: true,
            retryFn: () => fetch(`/api/users/${userId}`).then(r => r.json()),
            fallbackFn: async () => {
                // 캐시된 사용자 데이터 반환
                return getUserFromCache(userId);
            }
        }
    );
}
```

### 폼 검증

```javascript
import { ValidationError } from '../../01.common/24_error_handler.js';
import errorHandler from '../../01.common/24_error_handler.js';

async function submitForm(formData) {
    return errorHandler.handle(
        (async () => {
            // 검증
            if (!formData.email) {
                throw new ValidationError('이메일을 입력해주세요');
            }

            if (!formData.password || formData.password.length < 8) {
                throw new ValidationError(
                    '비밀번호는 8자 이상이어야 합니다',
                    null,
                    {
                        userMessage: '비밀번호를 8자 이상 입력해주세요.',
                        context: { field: 'password' }
                    }
                );
            }

            // API 호출
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new AuthError('로그인 실패');
            }

            return await response.json();
        })(),
        {
            context: { module: 'auth', action: 'login' },
            showToUser: true
        }
    );
}
```

### 데이터베이스 작업

```javascript
import { DatabaseError } from '../../01.common/24_error_handler.js';
import errorHandler from '../../01.common/24_error_handler.js';

async function saveCompany(companyData) {
    return errorHandler.handle(
        (async () => {
            try {
                const db = await openDatabase();
                const tx = db.transaction(['companies'], 'readwrite');
                const store = tx.objectStore('companies');
                await store.put(companyData);
                return { success: true };
            } catch (error) {
                throw new DatabaseError(
                    '거래처 저장 실패',
                    error,
                    {
                        userMessage: '거래처 정보를 저장할 수 없습니다.',
                        context: { companyId: companyData.id }
                    }
                );
            }
        })(),
        {
            context: { module: 'companies', action: 'save' },
            allowRetry: true,
            retryFn: () => saveCompany(companyData)
        }
    );
}
```

## 마이그레이션 패턴

### 기존 코드 변환

**Step 1: Import 추가**
```javascript
import errorHandler from '../../01.common/24_error_handler.js';
// 또는
import { handleError } from '../../01.common/24_error_handler.js';
```

**Step 2: try-catch 변환**

Before:
```javascript
async function loadData() {
    try {
        const data = await fetchData();
        processData(data);
    } catch (error) {
        logger.error('[데이터 로드] 실패:', error);
        showToast('데이터 로드 실패', 'error');
    }
}
```

After (Option 1 - 간단):
```javascript
async function loadData() {
    const result = await handleError(
        async () => await fetchData(),
        { context: { module: 'data', action: 'load' } }
    );

    if (result.success) {
        processData(result.data);
    }
}
```

After (Option 2 - 상세):
```javascript
async function loadData() {
    const result = await errorHandler.handle(
        await fetchData(),
        {
            context: { module: 'data', action: 'load' },
            showToUser: true,
            allowRetry: true,
            retryFn: () => fetchData(),
            fallbackFn: () => getCachedData()
        }
    );

    if (result.success) {
        processData(result.data);
    }
}
```

## 전역 에러 핸들러

전역 에러 핸들러는 자동으로 설정됩니다:

```javascript
// 자동으로 처리됨:
// - window.addEventListener('unhandledrejection')
// - window.addEventListener('error')
```

전역 에러 이벤트를 감지하면 자동으로 로깅하고 사용자에게 표시합니다.

## 에러 리스너

커스텀 에러 처리가 필요한 경우:

```javascript
import errorHandler from '../../01.common/24_error_handler.js';

// 리스너 등록
errorHandler.addListener((appError) => {
    // 커스텀 처리
    if (appError.type === 'AUTH') {
        // 인증 에러 시 로그인 페이지로 이동
        window.location.href = '/login';
    }

    if (appError.severity === 'CRITICAL') {
        // 치명적 에러를 서버에 보고
        reportToServer(appError);
    }
});
```

## 모범 사례

### ✅ DO

```javascript
// 1. 명확한 context 제공
const result = await handleError(fn, {
    context: {
        module: 'companies',
        action: 'create',
        userId: currentUser.id
    }
});

// 2. 적절한 커스텀 에러 사용
throw new ValidationError('이메일이 필요합니다', null, {
    userMessage: '이메일 주소를 입력해주세요.'
});

// 3. 재시도가 필요한 작업에 allowRetry 사용
const result = await handleError(fn, {
    allowRetry: true,
    retryFn: () => retryableOperation()
});
```

### ❌ DON'T

```javascript
// 1. 빈 catch 블록 (에러 무시)
try {
    await operation();
} catch (error) {
    // 아무것도 안 함 - 나쁜 습관!
}

// 2. 제네릭한 에러 메시지
throw new Error('에러'); // 너무 일반적

// 3. 사용자에게 기술적 에러 노출
showToast(error.stack, 'error'); // 나쁨!
```

## 성능 고려사항

- ✅ ErrorHandler는 싱글톤으로 구현되어 메모리 효율적
- ✅ 재시도 카운터는 자동으로 정리됨
- ✅ 지수 백오프로 서버 부하 감소
- ✅ Logger와 통합되어 프로덕션에서 성능 영향 최소화

## 다음 단계

1. 기존 try-catch 블록을 ErrorHandler로 마이그레이션
2. 적절한 커스텀 에러 클래스 사용
3. 재시도 및 폴백 로직 추가
4. 에러 모니터링 대시보드 구축 (향후)
