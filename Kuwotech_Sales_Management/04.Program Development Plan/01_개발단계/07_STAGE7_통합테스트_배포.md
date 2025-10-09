# STAGE 7: 통합 테스트 & 배포

> **작성일**: 2025-09-26  
> **작성자**: Daniel.K  
> **단계**: 통합 테스트 및 배포  
> **예상 기간**: 3-4일

---

## 📋 목차

1. [단계 개요](#1-단계-개요)
2. [통합 테스트](#2-통합-테스트)
3. [크로스 브라우저 테스트](#3-크로스-브라우저-테스트)
4. [성능 최적화](#4-성능-최적화)
5. [배포 준비](#5-배포-준비)
6. [출력 결과](#6-출력-결과)

---

## 1. 단계 개요

### 1.1 목표
- 전체 시스템 통합 테스트
- 크로스 브라우저 호환성 확인
- 성능 최적화
- 가비아 서버 배포 준비

### 1.2 핵심 원칙
✅ **기존 프로그램과 100% 동일**
- 로그인 → 모드 분기 → 기능 동작 완벽 재현
- 디자인, 스크롤, 클릭 효과, 모달 스타일 일치
- 버그 제로 배포

---

## 2. 통합 테스트

### 2.1 전체 흐름 테스트

#### 테스트 시나리오

**1. 로그인 흐름**
```
[STEP 1] 개발자 모드 진입
  ↓ index.html 로드
  ↓ "개발자 모드" 버튼 확인
  ↓
[STEP 2] 엑셀 업로드
  ↓ 영업관리기초자료.xlsx 선택
  ↓ SheetJS 파싱 확인
  ↓ IndexedDB 저장 확인
  ↓
[STEP 3] 사용자 선택
  ↓ 드롭다운에서 사용자 선택
  ↓ 입사일자 시트 조회
  ↓
[STEP 4] 역할 확인
  ↓ 영업담당/관리자 표시
  ↓
[STEP 5] 모드 진입
  ↓ sales.html or admin.html 이동
  ✅ 성공
```

**2. 영업담당 모드 흐름**
```
[대시보드]
  ↓ KPI 14개 표시
  ↓ 실시간 시계 확인
  ↓
[담당거래처 관리]
  ↓ 내 거래처 목록 로드
  ↓ 거래처 추가 버튼 클릭
  ↓ 모달 오픈 → 19개 필드 입력
  ↓ 저장 → IndexedDB 업데이트
  ↓ 테이블 새로고침
  ↓
[실적보고서 작성]
  ↓ 신규 보고서 버튼
  ↓ 5개 필드 입력
  ↓ 저장 → reports 스토어
  ↓
[실적보고서 확인]
  ↓ 제출한 보고서 목록
  ↓ 상태별 필터링 (대기/승인/반려)
  ↓
[데이터 관리]
  ↓ 다운로드 버튼 3개 확인
  ↓ 개인 실적 다운로드 (xlsx)
  ↓ 보고서 다운로드 (xlsx)
  ↓ KPI 다운로드 (xlsx)
  ✅ 성공
```

**3. 관리자 모드 흐름**
```
[대시보드]
  ↓ 전사 KPI 11개 표시
  ↓ 기여도 순위 표시
  ↓
[전체거래처 관리]
  ↓ 모든 거래처 목록
  ↓ 거래처 추가/수정/삭제
  ↓
[실적보고서 확인]
  ↓ 전체 보고서 목록
  ↓ 승인/반려 처리
  ↓ 관리자 코멘트 작성
  ↓
[보고서 발표]
  ↓ 발표 자료 생성
  ↓ 차트/그래프 확인
  ↓
[데이터 관리]
  ↓ 전체 데이터 다운로드
  ↓ 백업 실행
  ↓ 엑셀 업로드 (강정환 전용)
  ↓
[직원 관리]
  ↓ 직원 목록
  ↓ 직원 추가/수정/삭제
  ✅ 성공
```

---

### 2.2 기능별 테스트 체크리스트

#### ✅ 로그인 & 인증
- [ ] 개발자 모드 진입
- [ ] 엑셀 업로드 및 파싱
- [ ] 사용자 선택 및 입사일자 확인
- [ ] 역할 분기 (영업담당/관리자)
- [ ] 모드 진입 및 화면 전환

#### ✅ 영업담당 모드
- [ ] 대시보드 KPI 14개 표시
- [ ] 담당거래처 CRUD
- [ ] 실적보고서 작성 (5개 필드)
- [ ] 실적보고서 상태 확인
- [ ] 3가지 다운로드 기능
- [ ] 프로필 설정 수정

#### ✅ 관리자 모드
- [ ] 대시보드 전사 KPI 11개
- [ ] 전체거래처 CRUD
- [ ] 보고서 승인/반려
- [ ] 보고서 발표 자료 생성
- [ ] 전체 데이터 다운로드
- [ ] 백업 실행
- [ ] 엑셀 업로드
- [ ] 직원 CRUD

#### ✅ 공통 기능
- [ ] 실시간 시계 표시
- [ ] 숫자 포맷팅 (1,234,567)
- [ ] 통화 포맷팅 (1,234,567원)
- [ ] 음수 표시 ((1,234)원)
- [ ] 모달 오픈/닫기
- [ ] 토스트 알림
- [ ] 사이드바 메뉴 전환

---

### 2.3 데이터 무결성 테스트

#### IndexedDB 검증
```javascript
// [TEST: 데이터 무결성]
async function testDataIntegrity() {
  console.log('=== 데이터 무결성 테스트 시작 ===');
  
  const results = [];
  
  // 1. 거래처 데이터
  const companies = await getAllCompanies();
  results.push({
    store: 'companies',
    count: companies.length,
    status: companies.length > 0 ? '✅' : '❌'
  });
  
  // 2. 보고서 데이터
  const reports = await getAllReports();
  results.push({
    store: 'reports',
    count: reports.length,
    status: '✅'
  });
  
  // 3. 직원 데이터
  const employees = await getAllEmployees();
  results.push({
    store: 'employees',
    count: employees.length,
    status: employees.length > 0 ? '✅' : '❌'
  });
  
  // 4. 데이터 관계 검증
  const orphanReports = reports.filter(r => 
    !employees.find(e => e.name === r.submittedBy)
  );
  
  results.push({
    test: '보고서-작성자 관계',
    orphans: orphanReports.length,
    status: orphanReports.length === 0 ? '✅' : '⚠️'
  });
  
  console.table(results);
  return results;
}
```

---

## 3. 크로스 브라우저 테스트

### 3.1 지원 브라우저

| 브라우저 | 버전 | 테스트 항목 | 상태 |
|---------|------|------------|------|
| Chrome | 최신 | 전체 기능 | ✅ |
| Edge | 최신 | 전체 기능 | ✅ |
| Firefox | 최신 | 전체 기능 | ⚠️ |
| Safari | 최신 | 제한적 | ⚠️ |

### 3.2 테스트 항목

#### ✅ 레이아웃
- [ ] 헤더 고정
- [ ] 사이드바 레이아웃
- [ ] 콘텐츠 영역 스크롤
- [ ] 푸터 위치
- [ ] 반응형 디자인 (모바일)

#### ✅ 기능
- [ ] IndexedDB 지원
- [ ] SheetJS 파싱
- [ ] 파일 다운로드
- [ ] 파일 업로드
- [ ] 모달 팝업
- [ ] 드롭다운 선택

#### ✅ 스타일
- [ ] Paperlogy 폰트 로드
- [ ] CSS 변수 적용
- [ ] 색상 테마 (영업/관리자)
- [ ] 호버 효과
- [ ] 클릭 효과

---

### 3.3 모바일 반응형

#### 테스트 디바이스
- iPhone 12/13/14 (iOS)
- Galaxy S21/S22 (Android)
- iPad (Tablet)

#### 반응형 브레이크포인트
```css
/* 모바일: 480px 이하 */
@media (max-width: 480px) {
  .sidebar {
    width: 100%;
    height: auto;
  }
  
  .main-content {
    margin-left: 0;
    padding: 10px;
  }
}

/* 태블릿: 768px 이하 */
@media (max-width: 768px) {
  .sidebar {
    width: 200px;
  }
}

/* 데스크톱: 1024px 이상 */
@media (min-width: 1024px) {
  .sidebar {
    width: 250px;
  }
}
```

---

## 4. 성능 최적화

### 4.1 성능 목표

| 항목 | 목표 | 현재 | 상태 |
|------|------|------|------|
| 로그인 처리 | < 2초 | - | ⏳ |
| KPI 계산 | < 500ms | - | ⏳ |
| 페이지 로드 | < 3초 | - | ⏳ |
| IndexedDB 조회 | < 200ms | - | ⏳ |
| 엑셀 파싱 | < 5초 | - | ⏳ |

---

### 4.2 최적화 항목

#### ✅ JavaScript 최적화
```javascript
// [최적화: 이벤트 위임]
// ❌ 나쁜 예
items.forEach(item => {
  item.addEventListener('click', handleClick);
});

// ✅ 좋은 예
container.addEventListener('click', (e) => {
  if (e.target.classList.contains('item')) {
    handleClick(e);
  }
});
```

```javascript
// [최적화: 캐싱]
const kpiCache = new Map();

async function getKPI(userId) {
  if (kpiCache.has(userId)) {
    return kpiCache.get(userId);
  }
  
  const kpi = await calculateKPI(userId);
  kpiCache.set(userId, kpi);
  return kpi;
}
```

#### ✅ CSS 최적화
```css
/* [최적화: will-change] */
.modal {
  will-change: transform, opacity;
}

/* [최적화: contain] */
.table-container {
  contain: layout style paint;
}
```

#### ✅ IndexedDB 최적화
```javascript
// [최적화: 인덱스 활용]
const tx = db.transaction('companies', 'readonly');
const index = tx.objectStore('companies')
  .index('internalManager');

// 인덱스로 빠른 조회
const companies = await index.getAll(currentUser);
```

---

### 4.3 성능 테스트

```javascript
// [TEST: 성능 측정]
async function measurePerformance() {
  const metrics = [];
  
  // 1. KPI 계산 속도
  const start1 = performance.now();
  await calculateSalesKPI(userId);
  const duration1 = performance.now() - start1;
  
  metrics.push({
    test: 'KPI 계산',
    duration: `${duration1.toFixed(2)}ms`,
    target: '500ms',
    status: duration1 < 500 ? '✅' : '❌'
  });
  
  // 2. 거래처 로드 속도
  const start2 = performance.now();
  await getAllCompanies();
  const duration2 = performance.now() - start2;
  
  metrics.push({
    test: '거래처 로드',
    duration: `${duration2.toFixed(2)}ms`,
    target: '200ms',
    status: duration2 < 200 ? '✅' : '❌'
  });
  
  // 3. 엑셀 파싱 속도
  const start3 = performance.now();
  await parseExcel(excelFile);
  const duration3 = performance.now() - start3;
  
  metrics.push({
    test: '엑셀 파싱',
    duration: `${duration3.toFixed(2)}ms`,
    target: '5000ms',
    status: duration3 < 5000 ? '✅' : '❌'
  });
  
  console.table(metrics);
  return metrics;
}
```

---

## 5. 배포 준비

### 5.1 배포 전 체크리스트

#### ✅ 코드 정리
- [ ] console.log 제거
- [ ] 디버깅 코드 제거
- [ ] 주석 정리 (// [섹션: 설명] 유지)
- [ ] 테스트 코드 제거
- [ ] 파일 압축

#### ✅ 리소스 확인
- [ ] Paperlogy 폰트 (6개)
- [ ] logo.png
- [ ] 영업관리기초자료.xlsx
- [ ] SheetJS CDN 링크
- [ ] 상대 경로 확인

#### ✅ 설정 파일
- [ ] config.js 환경 변수
- [ ] API 엔드포인트 (없음)
- [ ] 폴더 권한 설정

---

### 5.2 파일 압축 및 정리

#### 생성할 파일 구조
```
배포파일/
├── index.html (로그인)
├── 05.Source/
│   ├── 01.common/
│   ├── 02.login/
│   ├── 03.sales_mode/
│   ├── 04.admin_mode/
│   ├── 05.database/
│   ├── 06.kpi/
│   ├── 07.styles/
│   └── 08.components/
├── 01.Original_data/
│   └── 영업관리기초자료.xlsx
├── 02.Fonts_Logos/
│   ├── Paperlogy/ (6개)
│   └── logo.png
└── README.md (배포 가이드)
```

#### 파일 크기 최적화
```bash
# CSS 압축
npx cssnano 07.styles/*.css

# JS 압축 (옵션)
# npx terser 파일명.js -o 파일명.min.js

# 이미지 최적화
# logo.png는 이미 최적화됨 (2.8KB)
```

---

### 5.3 가비아 서버 배포

#### 배포 절차

**1. FTP 접속**
```
호스트: ftp.kuwotech.com
사용자: (제공됨)
비밀번호: (제공됨)
포트: 21
```

**2. 파일 업로드**
```
원격 경로: /public_html/sales_management/
```

**3. 권한 설정**
```bash
# 폴더 권한
chmod 755 폴더명

# 파일 권한
chmod 644 파일명
```

**4. 접속 확인**
```
URL: https://kuwotech.com/sales_management/
```

---

### 5.4 배포 후 테스트

#### ✅ 실 서버 테스트
- [ ] 로그인 프로세스
- [ ] 엑셀 업로드
- [ ] 모드별 기능
- [ ] 다운로드 기능
- [ ] 모바일 접속
- [ ] 보안 (HTTPS)

#### ✅ 모니터링
```javascript
// [배포: 에러 로깅]
window.addEventListener('error', (e) => {
  console.error('Runtime Error:', {
    message: e.message,
    filename: e.filename,
    lineno: e.lineno,
    colno: e.colno,
    timestamp: new Date().toISOString()
  });
  
  // 서버 로그 전송 (옵션)
  // sendErrorLog(errorData);
});
```

---

## 6. 출력 결과

### 6.1 테스트 보고서

#### 통합 테스트 결과
```
=== 통합 테스트 결과 ===

[로그인 흐름] ✅ 통과
- STEP 1-5 모두 정상
- 역할 분기 정확
- 화면 전환 확인

[영업담당 모드] ✅ 통과
- 대시보드 KPI 14개 정상
- 거래처 CRUD 정상
- 보고서 작성/확인 정상
- 다운로드 3개 정상

[관리자 모드] ✅ 통과
- 대시보드 KPI 11개 정상
- 전체거래처 CRUD 정상
- 보고서 승인/반려 정상
- 백업/복원 정상

[공통 기능] ✅ 통과
- 시계, 포맷팅 정상
- 모달, 토스트 정상
- 사이드바 정상

[데이터 무결성] ✅ 통과
- companies: 100건
- reports: 50건
- employees: 10건
- 관계 검증 완료

[성능] ✅ 통과
- KPI 계산: 350ms (목표: 500ms)
- 페이지 로드: 2.5초 (목표: 3초)
- IndexedDB: 150ms (목표: 200ms)

[크로스 브라우저] ✅ 통과
- Chrome: 완벽
- Edge: 완벽
- Firefox: 일부 스타일 조정
- Safari: 제한적 지원

=== 테스트 완료 ===
```

---

### 6.2 배포 문서

#### README.md (배포 가이드)

```markdown
# KUWOTECH 영업관리 시스템 v3.0

## 📋 시스템 요구사항
- 웹 브라우저: Chrome 최신 버전 (권장)
- IndexedDB 지원 필수
- JavaScript 활성화

## 🚀 배포 방법

### 1. 로컬 테스트
```bash
# VS Code Live Server 실행
# 또는
python -m http.server 8000
```

### 2. 가비아 서버 배포
1. FTP 접속
2. `/public_html/sales_management/` 경로에 업로드
3. 권한 설정 (폴더: 755, 파일: 644)
4. URL 접속: https://kuwotech.com/sales_management/

## 📖 사용 방법

### 로그인
1. 개발자 모드 진입
2. 엑셀 업로드 (영업관리기초자료.xlsx)
3. 사용자 선택
4. 역할 확인 (영업담당/관리자)
5. 모드 진입

### 영업담당 모드
- 대시보드: KPI 14개
- 담당거래처 관리
- 실적보고서 작성/확인
- 데이터 다운로드

### 관리자 모드
- 대시보드: 전사 KPI 11개
- 전체거래처 관리
- 보고서 승인/반려
- 백업/복원
- 직원 관리

## 🔧 문제 해결

### IndexedDB 오류
- 브라우저 캐시 삭제
- 시크릿 모드 시도

### 엑셀 업로드 실패
- 파일 형식 확인 (.xlsx)
- 시트 구조 확인

## 📞 연락처
- 작성자: Daniel.K
- 이메일: kinggo0807@hotmail.com
- 소유자: Kang Jung Hwan
```

---

## ✅ STAGE 7 완료 조건

- [ ] 통합 테스트 100% 통과
- [ ] 크로스 브라우저 호환성 확인
- [ ] 성능 목표 달성 (KPI < 500ms)
- [ ] 데이터 무결성 검증
- [ ] 배포 파일 준비 완료
- [ ] 가비아 서버 업로드
- [ ] 실 서버 테스트 완료
- [ ] 배포 문서 작성 완료

---

**다음 단계**: 프로젝트 완료 🎉

**이 단계 완료. 확인 후 최종 배포 진행. (예: 문제 있음/배포 진행)**

---

**Creator**: Daniel.K  
**Contact**: kinggo0807@hotmail.com  
**Owner**: Kang Jung Hwan
