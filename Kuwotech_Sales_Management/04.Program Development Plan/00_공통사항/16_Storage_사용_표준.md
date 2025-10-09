# Storage 사용 표준 가이드

## 📌 개요
프론트엔드에서 브라우저 Storage API를 일관되게 사용하기 위한 표준 가이드

---

## 🎯 Storage 선택 기준

### localStorage 사용 (영구 저장)
**사용 시나리오**:
- 로그인 토큰 (JWT)
- 사용자 환경 설정
- 테마 설정
- 언어 설정
- 최근 검색어 (영구 보관)

**특징**:
- 브라우저를 닫아도 유지됨
- 탭 간 공유됨
- 명시적으로 삭제하기 전까지 유지
- 도메인별로 격리

**제한사항**:
- 저장 용량: 약 5-10MB
- 동기적 API (blocking)
- 문자열만 저장 가능

---

### sessionStorage 사용 (임시 저장)
**사용 시나리오**:
- 임시 폼 데이터
- 위저드 단계 데이터
- 탭별 필터 설정
- 임시 UI 상태

**특징**:
- 탭/윈도우를 닫으면 삭제됨
- 탭 간 격리됨 (공유 안 됨)
- 페이지 새로고침 시 유지

**제한사항**:
- localStorage와 동일 (5-10MB, 동기, 문자열)

---

### IndexedDB 사용 (대용량 저장)
**사용 시나리오**:
- 대량의 거래처 데이터 캐싱
- 오프라인 모드 데이터
- 파일 블롭 저장
- 복잡한 객체 저장

**특징**:
- 수백 MB 저장 가능
- 비동기 API (non-blocking)
- 객체 그대로 저장 가능
- 인덱스 및 쿼리 지원

**제한사항**:
- API가 복잡함
- 프로미스 기반 래퍼 권장 (Dexie.js, idb 등)

---

## ✅ KUWOTECH 프로젝트 표준

### 1. 인증 토큰 저장
```javascript
// ✅ 올바른 방법
localStorage.setItem('authToken', token);
const token = localStorage.getItem('authToken');
localStorage.removeItem('authToken');

// ❌ 잘못된 방법
sessionStorage.setItem('token', token);          // Storage 타입 틀림
localStorage.setItem('token', token);            // 키 이름 틀림
sessionStorage.setItem('authToken', token);      // Storage 타입 틀림
```

**규칙**:
- **Storage 타입**: `localStorage` (영구 저장)
- **키 이름**: `'authToken'` (고정)
- **저장 시점**: 로그인 성공 시
- **삭제 시점**: 로그아웃 시 또는 토큰 만료 시

---

### 2. 사용자 설정 저장
```javascript
// 테마 설정
localStorage.setItem('theme', 'sales'); // 'sales', 'admin'

// 언어 설정
localStorage.setItem('language', 'ko'); // 'ko', 'en'

// 사이드바 상태
localStorage.setItem('sidebarCollapsed', 'false');
```

**규칙**:
- Storage: `localStorage`
- 키 이름: camelCase
- 값: 문자열 (Boolean은 'true'/'false')

---

### 3. 임시 UI 상태 저장
```javascript
// 탭별 필터 상태 (세션 종료 시 초기화)
sessionStorage.setItem('currentFilter', 'active');

// 다단계 폼 임시 데이터
sessionStorage.setItem('wizardStep', '2');
sessionStorage.setItem('wizardData', JSON.stringify(formData));
```

**규칙**:
- Storage: `sessionStorage`
- 키 이름: camelCase
- 복잡한 객체: `JSON.stringify()` 사용

---

### 4. 민감 정보 처리
```javascript
// ❌ 절대 저장 금지
localStorage.setItem('password', password);        // 비밀번호
localStorage.setItem('creditCard', cardNumber);    // 신용카드
localStorage.setItem('privateKey', key);           // 개인키

// ✅ 올바른 방법
// - 비밀번호: 절대 저장하지 않음
// - 신용카드: 서버에서만 처리
// - 민감 정보: 메모리에만 보관, Storage 사용 금지
```

**보안 규칙**:
- 비밀번호, 개인정보, 금융정보는 절대 저장 금지
- JWT 토큰만 localStorage에 저장 (서버에서 만료 관리)
- XSS 공격 방지를 위한 Content-Security-Policy 설정 필수

---

## 📝 코딩 컨벤션

### Storage 접근 패턴
```javascript
// ✅ 권장: try-catch로 감싸기
function getAuthToken() {
    try {
        return localStorage.getItem('authToken');
    } catch (error) {
        console.error('Storage access failed:', error);
        return null;
    }
}

function setAuthToken(token) {
    try {
        localStorage.setItem('authToken', token);
        return true;
    } catch (error) {
        console.error('Storage write failed:', error);
        return false;
    }
}

// ✅ 권장: 유틸리티 함수 사용
// 05.Source/01.common/15_storage_manager.js 활용
import { getItem, setItem, removeItem } from './15_storage_manager.js';
```

---

### JSON 데이터 저장
```javascript
// ✅ 올바른 방법
const data = { name: '홍길동', role: 'admin' };
localStorage.setItem('userData', JSON.stringify(data));

const retrieved = JSON.parse(localStorage.getItem('userData'));

// ❌ 잘못된 방법
localStorage.setItem('userData', data); // "[object Object]"로 저장됨
```

---

### Storage 초기화
```javascript
// 로그아웃 시 인증 정보만 삭제
function logout() {
    localStorage.removeItem('authToken');
    // 테마, 언어 설정은 유지
}

// 전체 초기화 (필요 시에만)
function clearAllStorage() {
    localStorage.clear();
    sessionStorage.clear();
}
```

---

## 🔍 Storage 키 이름 규칙

### 네이밍 컨벤션
```javascript
// ✅ 권장
localStorage.setItem('authToken', token);        // camelCase
localStorage.setItem('userName', name);
localStorage.setItem('lastLoginTime', time);

// ❌ 비권장
localStorage.setItem('auth_token', token);       // snake_case
localStorage.setItem('AUTH-TOKEN', token);       // SCREAMING-KEBAB
localStorage.setItem('token', token);            // 너무 일반적
```

**규칙**:
- camelCase 사용
- 명확하고 설명적인 이름
- 프로젝트 전체에서 일관성 유지

---

## 📊 KUWOTECH 프로젝트 Storage 키 목록

### localStorage (영구 저장)
| 키 이름 | 타입 | 설명 | 예시 값 |
|--------|------|------|---------|
| `authToken` | string | JWT 인증 토큰 | `eyJhbGc...` |
| `theme` | string | 테마 설정 | `'sales'`, `'admin'` |
| `language` | string | 언어 설정 | `'ko'`, `'en'` |
| `sidebarCollapsed` | string | 사이드바 상태 | `'true'`, `'false'` |

### sessionStorage (세션 저장)
| 키 이름 | 타입 | 설명 | 예시 값 |
|--------|------|------|---------|
| (현재 사용 안 함) | - | - | - |

---

## ⚠️ 주의사항

### 1. Storage Quota 초과
```javascript
try {
    localStorage.setItem(key, value);
} catch (e) {
    if (e.name === 'QuotaExceededError') {
        console.error('Storage quota exceeded');
        // 오래된 데이터 삭제 또는 사용자에게 알림
    }
}
```

### 2. Private Browsing Mode
- Safari Private Mode에서는 localStorage가 0 bytes
- 에러 처리 필수

### 3. 동기 API 성능
- localStorage/sessionStorage는 blocking API
- 대량 데이터는 IndexedDB 사용

### 4. Storage Event
```javascript
// 다른 탭에서 Storage 변경 감지
window.addEventListener('storage', (e) => {
    if (e.key === 'authToken') {
        // 토큰 변경됨 → 로그아웃 처리
        handleLogout();
    }
});
```

---

## 🧪 테스트 체크리스트

### Storage 일관성 테스트
- [ ] 로그인 시 localStorage에 'authToken' 저장 확인
- [ ] 페이지 새로고침 시 'authToken' 유지 확인
- [ ] 로그아웃 시 'authToken' 삭제 확인
- [ ] 다른 탭에서 로그아웃 시 동기화 확인
- [ ] Private Mode에서 에러 처리 확인

---

## 📚 참고 자료

- [MDN: Web Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API)
- [MDN: IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- KUWOTECH 프로젝트: `05.Source/01.common/15_storage_manager.js`

---

**작성일**: 2025-10-09
**버전**: 1.0
**작성자**: Claude Code
