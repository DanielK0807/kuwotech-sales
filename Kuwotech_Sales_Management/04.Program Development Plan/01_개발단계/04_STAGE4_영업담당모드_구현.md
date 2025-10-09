# STAGE 4: 영업담당모드 구현 👔

> **단계**: STAGE 4  
> **작성일**: 2025-09-26  
> **목표**: 영업담당자용 6개 메뉴 시스템 구현  
> **예상 소요**: 3일

---

## 📋 목차

1. [개요](#1-개요)
2. [공통 레이아웃](#2-공통-레이아웃)
3. [대시보드](#3-대시보드)
4. [담당거래처관리](#4-담당거래처관리)
5. [실적보고서 작성](#5-실적보고서-작성)
6. [실적보고서 확인](#6-실적보고서-확인)
7. [데이터관리](#7-데이터관리)
8. [시스템설정](#8-시스템설정)
9. [테마 디자인](#9-테마-디자인)
10. [테스트](#10-테스트)

---

## 1. 개요

### 1.1 영업담당모드 특징

**권한 범위**
- ✅ 본인 담당 거래처만 조회/수정
- ✅ 본인이 작성한 보고서만 확인
- ✅ 전체 데이터는 조회 불가
- ❌ 엑셀 업로드 불가 (관리자 전용)

**테마 색상**
- 주색상: 파란색 (#2563eb)
- 보조색: 밝은 파란색 (#3b82f6)
- 강조색: 스카이 블루 (#60a5fa)

### 1.2 메뉴 구조

```
영업담당모드
├── 1. 대시보드 (KPI 14개)
├── 2. 담당거래처관리
├── 3. 실적보고서 작성
├── 4. 실적보고서 확인
├── 5. 데이터관리
└── 6. 시스템설정
```

### 1.3 폴더 구조

```
05.Source/
└── 03.sales_mode/
    ├── 00_common/
    │   ├── 01_sales_layout.html
    │   ├── 02_sales_layout.js
    │   └── 03_sales_theme.css
    │
    ├── 01_dashboard/
    │   ├── 01_dashboard.html
    │   ├── 02_dashboard.js
    │   └── 03_dashboard.css
    │
    ├── 02_my_companies/
    │   ├── 01_my_companies.html
    │   ├── 02_my_companies.js
    │   └── 03_my_companies.css
    │
    ├── 03_report_write/
    │   ├── 01_report_write.html
    │   ├── 02_report_write.js
    │   └── 03_report_write.css
    │
    ├── 04_report_check/
    │   ├── 01_report_check.html
    │   ├── 02_report_check.js
    │   └── 03_report_check.css
    │
    ├── 05_data_management/
    │   ├── 01_data_management.html
    │   ├── 02_data_management.js
    │   └── 03_data_management.css
    │
    └── 06_system_settings/
        ├── 01_system_settings.html
        ├── 02_system_settings.js
        └── 03_system_settings.css
```

---

## 2. 공통 레이아웃

### 2.1 레이아웃 HTML

**파일 위치**: `05.Source/03.sales_mode/00_common/01_sales_layout.html`

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>KUWOTECH - 영업담당모드</title>
  
  <!-- [섹션: 공통 스타일] -->
  <link rel="stylesheet" href="../../07.styles/01_variables.css">
  <link rel="stylesheet" href="../../07.styles/02_common.css">
  <link rel="stylesheet" href="./03_sales_theme.css">
  
  <!-- [섹션: 폰트] -->
  <link rel="stylesheet" href="../../../02.Fonts_Logos/Paperlogy/paperlogy.css">
</head>
<body class="sales-mode">
  
  <!-- [섹션: 헤더] -->
  <header id="main-header" class="sales-header">
    <div class="header-left">
      <img src="../../../02.Fonts_Logos/logo.png" alt="KUWOTECH" class="logo">
      <h1>영업관리 시스템</h1>
    </div>
    
    <div class="header-center">
      <div id="current-time" class="clock">2025-09-26 14:30:45</div>
    </div>
    
    <div class="header-right">
      <span id="user-name" class="user-name">김영업님</span>
      <button id="logout-btn" class="btn-logout">로그아웃</button>
    </div>
  </header>
  
  <!-- [섹션: 메인 컨테이너] -->
  <div class="main-container">
    
    <!-- [섹션: 사이드바] -->
    <aside id="sidebar" class="sales-sidebar">
      <nav class="sidebar-nav">
        <ul class="menu-list">
          <li class="menu-item active" data-page="dashboard">
            <i class="icon-dashboard"></i>
            <span>대시보드</span>
          </li>
          <li class="menu-item" data-page="my-companies">
            <i class="icon-company"></i>
            <span>담당거래처관리</span>
          </li>
          <li class="menu-item" data-page="report-write">
            <i class="icon-write"></i>
            <span>실적보고서 작성</span>
          </li>
          <li class="menu-item" data-page="report-check">
            <i class="icon-check"></i>
            <span>실적보고서 확인</span>
          </li>
          <li class="menu-item" data-page="data-management">
            <i class="icon-data"></i>
            <span>데이터관리</span>
          </li>
          <li class="menu-item" data-page="system-settings">
            <i class="icon-settings"></i>
            <span>시스템설정</span>
          </li>
        </ul>
      </nav>
    </aside>
    
    <!-- [섹션: 콘텐츠 영역] -->
    <main id="main-content" class="sales-content">
      <!-- 동적 로드 -->
    </main>
  </div>
  
  <!-- [섹션: 스크립트] -->
  <script type="module" src="./02_sales_layout.js"></script>
</body>
</html>
```

### 2.2 레이아웃 스크립트

**파일 위치**: `05.Source/03.sales_mode/00_common/02_sales_layout.js`

```javascript
// [섹션: Import]
import { startClock } from '../../01.common/04_clock.js';
import { showToast } from '../../01.common/06_toast.js';

// [섹션: 사용자 인증 확인]
const user = JSON.parse(sessionStorage.getItem('user'));

if (!user || user.role !== 'sales') {
  window.location.href = '../../02.login/01_login.html';
}

// [섹션: 사용자 정보 표시]
document.getElementById('user-name').textContent = `${user.name}님`;

// [섹션: 시계 시작]
startClock('current-time');

// [섹션: 메뉴 클릭 이벤트]
const menuItems = document.querySelectorAll('.menu-item');
const mainContent = document.getElementById('main-content');

menuItems.forEach(item => {
  item.addEventListener('click', async () => {
    // 활성 메뉴 변경
    menuItems.forEach(m => m.classList.remove('active'));
    item.classList.add('active');
    
    // 페이지 로드
    const page = item.dataset.page;
    await loadPage(page);
  });
});

// [섹션: 페이지 로드 함수]
async function loadPage(page) {
  try {
    // 로딩 표시
    mainContent.innerHTML = '<div class="loading">로딩 중...</div>';
    
    // HTML 로드
    const response = await fetch(`../${getPageFolder(page)}/01_${page.replace('-', '_')}.html`);
    
    if (!response.ok) {
      throw new Error('페이지를 불러올 수 없습니다.');
    }
    
    const html = await response.text();
    mainContent.innerHTML = html;
    
    // 해당 페이지 스크립트 로드
    await loadPageScript(page);
    
  } catch (error) {
    console.error('[페이지 로드 실패]', error);
    mainContent.innerHTML = `
      <div class="error-message">
        <h2>페이지를 불러올 수 없습니다</h2>
        <p>${error.message}</p>
      </div>
    `;
  }
}

// [섹션: 페이지 폴더 매핑]
function getPageFolder(page) {
  const folderMap = {
    'dashboard': '01_dashboard',
    'my-companies': '02_my_companies',
    'report-write': '03_report_write',
    'report-check': '04_report_check',
    'data-management': '05_data_management',
    'system-settings': '06_system_settings'
  };
  return folderMap[page];
}

// [섹션: 페이지 스크립트 로드]
async function loadPageScript(page) {
  const folder = getPageFolder(page);
  const scriptPath = `../${folder}/02_${page.replace('-', '_')}.js`;
  
  const script = document.createElement('script');
  script.type = 'module';
  script.src = scriptPath;
  document.body.appendChild(script);
}

// [섹션: 로그아웃]
document.getElementById('logout-btn').addEventListener('click', () => {
  if (confirm('로그아웃 하시겠습니까?')) {
    sessionStorage.clear();
    window.location.href = '../../02.login/01_login.html';
  }
});

// [섹션: 초기 페이지 로드]
document.addEventListener('DOMContentLoaded', () => {
  loadPage('dashboard');
});
```

### 2.3 테마 스타일

**파일 위치**: `05.Source/03.sales_mode/00_common/03_sales_theme.css`

```css
/* [섹션: 영업담당모드 테마] */
.sales-mode {
  --primary-color: #2563eb;
  --primary-dark: #1e40af;
  --primary-light: #3b82f6;
  --accent-color: #60a5fa;
  --accent-light: #93c5fd;
  
  --bg-primary: #000000;
  --bg-secondary: #1e293b;
  --bg-card: rgba(37, 99, 235, 0.1);
  
  --text-primary: #ffffff;
  --text-secondary: #cbd5e1;
}

/* [섹션: 헤더] */
.sales-header {
  background: linear-gradient(90deg, #1e40af 0%, #2563eb 100%);
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  box-shadow: 0 2px 10px rgba(37, 99, 235, 0.3);
}

.sales-header .logo {
  height: 40px;
  margin-right: 15px;
}

.sales-header h1 {
  color: var(--text-primary);
  font-size: 20px;
  font-weight: 600;
}

/* [섹션: 사이드바] */
.sales-sidebar {
  width: 250px;
  background: linear-gradient(180deg, #2563eb 0%, #1e40af 100%);
  height: calc(100vh - 60px);
  overflow-y: auto;
  border-right: 2px solid var(--primary-light);
}

.menu-list {
  list-style: none;
  padding: 20px 0;
  margin: 0;
}

.menu-item {
  padding: 15px 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 12px;
  color: rgba(255, 255, 255, 0.8);
}

.menu-item:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
  transform: translateX(5px);
}

.menu-item.active {
  background: rgba(255, 255, 255, 0.2);
  color: var(--text-primary);
  border-left: 4px solid var(--accent-light);
  font-weight: 600;
}

.menu-item i {
  font-size: 20px;
}

/* [섹션: 콘텐츠 영역] */
.sales-content {
  flex: 1;
  padding: 30px;
  background: var(--bg-primary);
  overflow-y: auto;
  height: calc(100vh - 60px);
}

/* [섹션: KPI 카드] */
.sales-mode .kpi-card {
  background: var(--bg-card);
  border-left: 4px solid var(--primary-color);
  padding: 20px;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.sales-mode .kpi-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 20px rgba(37, 99, 235, 0.3);
}

/* [섹션: 버튼] */
.sales-mode .btn-primary {
  background: var(--primary-color);
  color: var(--text-primary);
  border: 1px solid var(--primary-light);
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.sales-mode .btn-primary:hover {
  background: var(--primary-dark);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
}

/* [섹션: 테이블] */
.sales-mode table {
  width: 100%;
  border-collapse: collapse;
}

.sales-mode table thead {
  background: var(--primary-color);
}

.sales-mode table th {
  padding: 12px;
  color: var(--text-primary);
  font-weight: 600;
  text-align: left;
}

.sales-mode table td {
  padding: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.sales-mode table tr:hover {
  background: rgba(37, 99, 235, 0.1);
}

/* [섹션: 모달] */
.sales-mode .modal-header {
  background: var(--primary-color);
  color: var(--text-primary);
  padding: 20px;
  border-radius: 8px 8px 0 0;
}

.sales-mode .modal-content {
  background: var(--bg-secondary);
  color: var(--text-primary);
  border-radius: 8px;
  max-width: 800px;
  margin: 50px auto;
}
```

---

## 3. 대시보드

### 3.1 대시보드 HTML

**파일 위치**: `05.Source/03.sales_mode/01_dashboard/01_dashboard.html`

```html
<!-- [섹션: 대시보드 헤더] -->
<div class="page-header">
  <h1>영업 대시보드</h1>
  <p class="subtitle">나의 실적 현황을 한눈에 확인하세요</p>
</div>

<!-- [섹션: KPI 그리드] -->
<div class="kpi-grid">
  
  <!-- KPI 1: 담당거래처 -->
  <div class="kpi-card">
    <h3>담당거래처</h3>
    <div class="kpi-value" id="kpi-total-companies">-</div>
    <span class="kpi-unit">개</span>
    <div class="kpi-info">불용 제외</div>
  </div>
  
  <!-- KPI 2: 활성거래처 -->
  <div class="kpi-card">
    <h3>활성거래처</h3>
    <div class="kpi-value" id="kpi-active-companies">-</div>
    <span class="kpi-unit">개</span>
    <div class="kpi-info">활성 + 매출발생</div>
  </div>
  
  <!-- KPI 3: 활성화율 -->
  <div class="kpi-card">
    <h3>활성화율</h3>
    <div class="kpi-value" id="kpi-activation-rate">-</div>
    <span class="kpi-unit">%</span>
    <div class="kpi-info">활성/전체 비율</div>
  </div>
  
  <!-- KPI 4: 주요제품판매거래처 -->
  <div class="kpi-card">
    <h3>주요제품판매거래처</h3>
    <div class="kpi-value" id="kpi-main-product-companies">-</div>
    <span class="kpi-unit">개</span>
    <div class="kpi-info">3단계 우선순위</div>
  </div>
  
  <!-- KPI 5: 회사배정기준대비 달성율 -->
  <div class="kpi-card">
    <h3>회사배정기준대비 달성율</h3>
    <div class="kpi-value" id="kpi-achievement-rate">-</div>
    <span class="kpi-unit">%</span>
    <div class="kpi-info">기준: 80개</div>
  </div>
  
  <!-- KPI 6: 주요고객처목표달성율 -->
  <div class="kpi-card">
    <h3>주요고객처목표달성율</h3>
    <div class="kpi-value" id="kpi-main-achievement-rate">-</div>
    <span class="kpi-unit">%</span>
    <div class="kpi-info">목표: 40개</div>
  </div>
  
  <!-- KPI 7: 누적매출금액 -->
  <div class="kpi-card">
    <h3>누적매출금액</h3>
    <div class="kpi-value" id="kpi-total-sales">-</div>
    <span class="kpi-unit">원</span>
    <div class="kpi-info">현재월수 기준</div>
  </div>
  
  <!-- KPI 8: 주요제품매출액 -->
  <div class="kpi-card">
    <h3>주요제품매출액</h3>
    <div class="kpi-value" id="kpi-main-product-sales">-</div>
    <span class="kpi-unit">원</span>
    <div class="kpi-info">3개 제품</div>
  </div>
  
  <!-- KPI 9: 주요제품매출비율 -->
  <div class="kpi-card">
    <h3>주요제품매출비율</h3>
    <div class="kpi-value" id="kpi-main-product-ratio">-</div>
    <span class="kpi-unit">%</span>
    <div class="kpi-info">주요/전체 비율</div>
  </div>
  
  <!-- KPI 10: 매출집중도 -->
  <div class="kpi-card">
    <h3>매출집중도</h3>
    <div class="kpi-value" id="kpi-sales-concentration">-</div>
    <span class="kpi-unit">원</span>
    <div class="kpi-info">거래처당/월 평균</div>
  </div>
  
  <!-- KPI 11: 누적수금금액 -->
  <div class="kpi-card">
    <h3>누적수금금액</h3>
    <div class="kpi-value" id="kpi-total-collection">-</div>
    <span class="kpi-unit">원</span>
    <div class="kpi-info">실제 수금액</div>
  </div>
  
  <!-- KPI 12: 매출채권잔액 -->
  <div class="kpi-card">
    <h3>매출채권잔액</h3>
    <div class="kpi-value" id="kpi-receivables">-</div>
    <span class="kpi-unit">원</span>
    <div class="kpi-info">미수금</div>
  </div>
  
  <!-- KPI 13: 전체매출기여도 -->
  <div class="kpi-card">
    <h3>전체매출기여도</h3>
    <div class="kpi-value" id="kpi-sales-contribution">-</div>
    <span class="kpi-unit">%</span>
    <div class="kpi-info">전사 대비</div>
  </div>
  
  <!-- KPI 14: 주요제품매출기여도 -->
  <div class="kpi-card">
    <h3>주요제품매출기여도</h3>
    <div class="kpi-value" id="kpi-main-contribution">-</div>
    <span class="kpi-unit">%</span>
    <div class="kpi-info">주요제품 대비</div>
  </div>
  
</div>

<!-- [섹션: 최근 활동] -->
<div class="recent-activity">
  <h2>최근 활동</h2>
  <div id="recent-reports" class="activity-list">
    <!-- 동적 로드 -->
  </div>
</div>
```

### 3.2 대시보드 스크립트

**파일 위치**: `05.Source/03.sales_mode/01_dashboard/02_dashboard.js`

```javascript
// [섹션: Import]
import { formatNumber } from '../../01.common/02_utils.js';
import { calculateSalesKPI } from '../../06.kpi/02_sales_kpi.js';
import { CompanyCRUD } from '../../05.database/02_crud.js';
import { ReportCRUD } from '../../05.database/03_report_crud.js';

// [섹션: 사용자 정보]
const user = JSON.parse(sessionStorage.getItem('user'));

// [섹션: KPI 계산 및 표시]
async function loadDashboard() {
  try {
    // KPI 계산
    const kpi = await calculateSalesKPI(user.id);
    
    // KPI 1: 담당거래처
    document.getElementById('kpi-total-companies').textContent = 
      formatNumber(kpi.totalCompanies);
    
    // KPI 2: 활성거래처
    document.getElementById('kpi-active-companies').textContent = 
      formatNumber(kpi.activeCompanies);
    
    // KPI 3: 활성화율
    document.getElementById('kpi-activation-rate').textContent = 
      kpi.activationRate;
    
    // KPI 4: 주요제품판매거래처
    document.getElementById('kpi-main-product-companies').textContent = 
      formatNumber(kpi.mainProductCompanies);
    
    // KPI 5: 회사배정기준대비 달성율
    const achievementEl = document.getElementById('kpi-achievement-rate');
    achievementEl.textContent = Math.abs(kpi.achievementRate).toFixed(2);
    if (kpi.achievementRate >= 0) {
      achievementEl.classList.add('positive');
      achievementEl.innerHTML = `${achievementEl.textContent}<br><small>초과배정입니다</small>`;
    } else {
      achievementEl.classList.add('negative');
      achievementEl.innerHTML = `(${achievementEl.textContent})<br><small>미만배정입니다</small>`;
    }
    
    // KPI 6: 주요고객처목표달성율
    document.getElementById('kpi-main-achievement-rate').textContent = 
      kpi.mainAchievementRate.toFixed(2);
    
    // KPI 7: 누적매출금액
    document.getElementById('kpi-total-sales').textContent = 
      formatNumber(kpi.totalSales);
    
    // KPI 8: 주요제품매출액
    document.getElementById('kpi-main-product-sales').textContent = 
      formatNumber(kpi.mainProductSales);
    
    // KPI 9: 주요제품매출비율
    document.getElementById('kpi-main-product-ratio').textContent = 
      kpi.mainProductRatio;
    
    // KPI 10: 매출집중도
    document.getElementById('kpi-sales-concentration').textContent = 
      formatNumber(Math.round(kpi.salesConcentration));
    
    // KPI 11: 누적수금금액
    document.getElementById('kpi-total-collection').textContent = 
      formatNumber(kpi.totalCollection);
    
    // KPI 12: 매출채권잔액
    document.getElementById('kpi-receivables').textContent = 
      formatNumber(kpi.receivables);
    
    // KPI 13: 전체매출기여도
    document.getElementById('kpi-sales-contribution').textContent = 
      kpi.salesContribution;
    
    // KPI 14: 주요제품매출기여도
    document.getElementById('kpi-main-contribution').textContent = 
      kpi.mainContribution;
    
    console.log('[대시보드] KPI 로드 완료');
    
  } catch (error) {
    console.error('[대시보드 로딩 실패]', error);
    alert('데이터를 불러오는데 실패했습니다.');
  }
}

// [섹션: 최근 활동 로드]
async function loadRecentActivity() {
  try {
    const reportCrud = new ReportCRUD();
    const reports = await reportCrud.getMyReports(user.id, 5); // 최근 5개
    
    const container = document.getElementById('recent-reports');
    container.innerHTML = '';
    
    if (reports.length === 0) {
      container.innerHTML = '<p class="no-data">최근 활동이 없습니다.</p>';
      return;
    }
    
    reports.forEach(report => {
      const item = document.createElement('div');
      item.className = 'activity-item';
      item.innerHTML = `
        <div class="activity-date">${formatDate(report.submittedDate)}</div>
        <div class="activity-content">
          <strong>${report.companyName}</strong>
          <span class="status status-${report.status}">${getStatusText(report.status)}</span>
        </div>
      `;
      container.appendChild(item);
    });
    
  } catch (error) {
    console.error('[최근 활동 로드 실패]', error);
  }
}

// [섹션: 상태 텍스트 변환]
function getStatusText(status) {
  const statusMap = {
    'pending': '대기중',
    'confirmed': '확인완료',
    'rejected': '반려'
  };
  return statusMap[status] || status;
}

// [섹션: 날짜 포맷]
function formatDate(date) {
  return new Date(date).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// [섹션: 자동 갱신]
setInterval(() => {
  loadDashboard();
  loadRecentActivity();
}, 5 * 60 * 1000); // 5분마다

// [섹션: 초기 로드]
loadDashboard();
loadRecentActivity();
```

---

## 4. 담당거래처관리

### 4.1 거래처 관리 HTML

**파일 위치**: `05.Source/03.sales_mode/02_my_companies/01_my_companies.html`

```html
<!-- [섹션: 페이지 헤더] -->
<div class="page-header">
  <h1>담당거래처 관리</h1>
  <button id="btn-add-company" class="btn-primary">+ 신규 거래처 추가</button>
</div>

<!-- [섹션: 필터 영역] -->
<div class="filter-section">
  <div class="filter-group">
    <label>사업현황</label>
    <select id="filter-status">
      <option value="">전체</option>
      <option value="활성">활성</option>
      <option value="신규">신규</option>
      <option value="휴면">휴면</option>
      <option value="불용">불용</option>
    </select>
  </div>
  
  <div class="filter-group">
    <label>검색</label>
    <input type="text" id="search-keyword" placeholder="거래처명 검색...">
  </div>
  
  <button id="btn-filter" class="btn-primary">검색</button>
  <button id="btn-reset" class="btn-secondary">초기화</button>
</div>

<!-- [섹션: 거래처 테이블] -->
<div class="table-container">
  <table id="companies-table">
    <thead>
      <tr>
        <th>KEY VALUE</th>
        <th>최종거래처명</th>
        <th>사업현황</th>
        <th>누적매출금액</th>
        <th>누적수금금액</th>
        <th>매출채권잔액</th>
        <th>판매제품</th>
        <th>관리</th>
      </tr>
    </thead>
    <tbody id="companies-tbody">
      <!-- 동적 로드 -->
    </tbody>
  </table>
</div>

<!-- [섹션: 거래처 추가/수정 모달] -->
<div id="company-modal" class="modal">
  <div class="modal-content">
    <div class="modal-header">
      <h2 id="modal-title">거래처 정보</h2>
      <button class="modal-close">&times;</button>
    </div>
    <div class="modal-body">
      <form id="company-form">
        <div class="form-row">
          <div class="form-group">
            <label>KEY VALUE *</label>
            <input type="text" name="keyValue" required>
          </div>
          <div class="form-group">
            <label>거래처명(ERP)</label>
            <input type="text" name="companyNameERP">
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label>최종거래처명 *</label>
            <input type="text" name="finalCompanyName" required>
          </div>
          <div class="form-group">
            <label>거래처코드</label>
            <input type="text" name="companyCode">
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label>대표자명</label>
            <input type="text" name="representative">
          </div>
          <div class="form-group">
            <label>외부담당자</label>
            <input type="text" name="externalManager">
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label>사업현황 *</label>
            <select name="businessStatus" required>
              <option value="활성">활성</option>
              <option value="신규">신규</option>
              <option value="휴면">휴면</option>
              <option value="불용">불용</option>
            </select>
          </div>
          <div class="form-group">
            <label>판매제품</label>
            <input type="text" name="salesProduct" placeholder="쉼표로 구분">
          </div>
        </div>
        
        <div class="form-group">
          <label>비고</label>
          <textarea name="remarks" rows="3"></textarea>
        </div>
        
        <div class="modal-footer">
          <button type="submit" class="btn-primary">저장</button>
          <button type="button" class="btn-secondary modal-close">취소</button>
        </div>
      </form>
    </div>
  </div>
</div>
```

### 4.2 거래처 관리 스크립트

**파일 위치**: `05.Source/03.sales_mode/02_my_companies/02_my_companies.js`

```javascript
// [섹션: Import]
import { CompanyCRUD } from '../../05.database/02_crud.js';
import { formatNumber } from '../../01.common/02_utils.js';
import { showModal, closeModal } from '../../01.common/05_modal.js';
import { showToast } from '../../01.common/06_toast.js';

// [섹션: 변수]
const user = JSON.parse(sessionStorage.getItem('user'));
const companyCrud = new CompanyCRUD();
let currentEditKeyValue = null;

// [섹션: 거래처 목록 로드]
async function loadCompanies(filter = {}) {
  try {
    // 본인 담당만
    filter.internalManager = user.name;
    
    const companies = await companyCrud.list(filter);
    const tbody = document.getElementById('companies-tbody');
    tbody.innerHTML = '';
    
    if (companies.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="no-data">담당 거래처가 없습니다.</td></tr>';
      return;
    }
    
    companies.forEach(company => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${company.keyValue}</td>
        <td>${company.finalCompanyName}</td>
        <td><span class="badge badge-${getStatusClass(company.businessStatus)}">${company.businessStatus}</span></td>
        <td class="text-right">${formatNumber(company.accumulatedSales)}</td>
        <td class="text-right">${formatNumber(company.accumulatedCollection)}</td>
        <td class="text-right ${company.accountsReceivable < 0 ? 'negative' : ''}">${formatNumber(company.accountsReceivable)}</td>
        <td>${company.salesProduct || '-'}</td>
        <td>
          <button class="btn-icon btn-edit" data-key="${company.keyValue}">✏️</button>
          <button class="btn-icon btn-delete" data-key="${company.keyValue}">🗑️</button>
        </td>
      `;
      tbody.appendChild(row);
    });
    
    // 이벤트 바인딩
    bindTableEvents();
    
    console.log(`[거래처 목록] ${companies.length}개 로드`);
    
  } catch (error) {
    console.error('[거래처 목록 로드 실패]', error);
    showToast('거래처 목록을 불러오는데 실패했습니다.', 'error');
  }
}

// [섹션: 사업현황 클래스]
function getStatusClass(status) {
  const classMap = {
    '활성': 'success',
    '신규': 'info',
    '휴면': 'warning',
    '불용': 'danger'
  };
  return classMap[status] || 'default';
}

// [섹션: 테이블 이벤트]
function bindTableEvents() {
  // 수정 버튼
  document.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', async () => {
      const keyValue = btn.dataset.key;
      await openEditModal(keyValue);
    });
  });
  
  // 삭제 버튼
  document.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      const keyValue = btn.dataset.key;
      await deleteCompany(keyValue);
    });
  });
}

// [섹션: 신규 거래처 추가]
document.getElementById('btn-add-company').addEventListener('click', () => {
  currentEditKeyValue = null;
  document.getElementById('modal-title').textContent = '신규 거래처 추가';
  document.getElementById('company-form').reset();
  showModal('company-modal');
});

// [섹션: 거래처 수정 모달]
async function openEditModal(keyValue) {
  try {
    const company = await companyCrud.read(keyValue);
    
    if (!company) {
      showToast('거래처를 찾을 수 없습니다.', 'error');
      return;
    }
    
    currentEditKeyValue = keyValue;
    document.getElementById('modal-title').textContent = '거래처 수정';
    
    // 폼 데이터 채우기
    const form = document.getElementById('company-form');
    Object.keys(company).forEach(key => {
      const input = form.elements[key];
      if (input) {
        input.value = company[key] || '';
      }
    });
    
    // KEY VALUE는 수정 불가
    form.elements.keyValue.readOnly = true;
    
    showModal('company-modal');
    
  } catch (error) {
    console.error('[거래처 조회 실패]', error);
    showToast('거래처 정보를 불러오는데 실패했습니다.', 'error');
  }
}

// [섹션: 거래처 저장]
document.getElementById('company-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  try {
    const formData = new FormData(e.target);
    const company = Object.fromEntries(formData);
    
    // 내부담당자는 자동 설정
    company.internalManager = user.name;
    
    if (currentEditKeyValue) {
      // 수정
      await companyCrud.update(currentEditKeyValue, company);
      showToast('거래처 정보가 수정되었습니다.', 'success');
    } else {
      // 신규
      await companyCrud.create(company);
      showToast('신규 거래처가 추가되었습니다.', 'success');
    }
    
    closeModal('company-modal');
    await loadCompanies();
    
  } catch (error) {
    console.error('[거래처 저장 실패]', error);
    showToast('저장에 실패했습니다: ' + error.message, 'error');
  }
});

// [섹션: 거래처 삭제]
async function deleteCompany(keyValue) {
  if (!confirm('거래처를 삭제(불용 처리)하시겠습니까?')) {
    return;
  }
  
  try {
    await companyCrud.delete(keyValue);
    showToast('거래처가 삭제되었습니다.', 'success');
    await loadCompanies();
    
  } catch (error) {
    console.error('[거래처 삭제 실패]', error);
    showToast('삭제에 실패했습니다: ' + error.message, 'error');
  }
}

// [섹션: 필터 적용]
document.getElementById('btn-filter').addEventListener('click', async () => {
  const filter = {
    businessStatus: document.getElementById('filter-status').value,
    searchKeyword: document.getElementById('search-keyword').value
  };
  
  await loadCompanies(filter);
});

// [섹션: 필터 초기화]
document.getElementById('btn-reset').addEventListener('click', async () => {
  document.getElementById('filter-status').value = '';
  document.getElementById('search-keyword').value = '';
  await loadCompanies();
});

// [섹션: 모달 닫기]
document.querySelectorAll('.modal-close').forEach(btn => {
  btn.addEventListener('click', () => {
    closeModal('company-modal');
  });
});

// [섹션: 초기 로드]
loadCompanies();
```

---

## 5. 실적보고서 작성

### 5.1 보고서 작성 HTML

**파일 위치**: `05.Source/03.sales_mode/03_report_write/01_report_write.html`

```html
<!-- [섹션: 페이지 헤더] -->
<div class="page-header">
  <h1>실적보고서 작성</h1>
  <p class="subtitle">담당 거래처의 방문 실적을 보고하세요</p>
</div>

<!-- [섹션: 보고서 작성 폼] -->
<div class="report-form-container">
  <form id="report-form">
    
    <!-- [섹션: 1. 거래처 선택] -->
    <div class="form-section">
      <h2>1. 거래처 선택</h2>
      <div class="form-group">
        <label>담당거래처 *</label>
        <select name="companyId" id="company-select" required>
          <option value="">거래처를 선택하세요</option>
          <!-- 동적 로드 -->
        </select>
      </div>
      
      <div id="company-info" class="company-info">
        <!-- 선택 시 표시 -->
      </div>
    </div>
    
    <!-- [섹션: 2. 목표수금/제품/영업활동 (3가지 선택 입력)] -->
    <div class="form-section">
      <h2>2. 방문 실적 (선택 입력)</h2>
      <p class="form-help">3가지 항목 중 하나 이상 필수 입력</p>
      
      <!-- 목표수금 -->
      <div class="form-group">
        <label>
          <input type="checkbox" id="check-collection" class="report-check">
          목표수금
        </label>
        <input type="number" name="targetCollection" id="input-collection" disabled placeholder="목표 수금액 입력">
      </div>
      
      <!-- 판매제품 -->
      <div class="form-group">
        <label>
          <input type="checkbox" id="check-products" class="report-check">
          판매제품
        </label>
        <div id="products-checkboxes" class="products-grid" style="display: none;">
          <label><input type="checkbox" name="products" value="임플란트"> 임플란트</label>
          <label><input type="checkbox" name="products" value="지르코니아"> 지르코니아</label>
          <label><input type="checkbox" name="products" value="Abutment"> Abutment</label>
          <label><input type="checkbox" name="products" value="Healing Cap"> Healing Cap</label>
          <label><input type="checkbox" name="products" value="Bone graft"> Bone graft</label>
          <label><input type="checkbox" name="products" value="Membrane"> Membrane</label>
          <label><input type="checkbox" name="products" value="Bridge"> Bridge</label>
          <label><input type="checkbox" name="products" value="Inlay"> Inlay</label>
          <label><input type="checkbox" name="products" value="Onlay"> Onlay</label>
          <label><input type="checkbox" name="products" value="Veneer"> Veneer</label>
          <label><input type="checkbox" name="products" value="Full Denture"> Full Denture</label>
          <label><input type="checkbox" name="products" value="Removable Denture"> Removable Denture</label>
        </div>
      </div>
      
      <!-- 영업활동 -->
      <div class="form-group">
        <label>
          <input type="checkbox" id="check-activity" class="report-check">
          영업활동
        </label>
        <textarea name="businessActivity" id="input-activity" disabled rows="4" placeholder="영업활동 내용을 입력하세요"></textarea>
      </div>
    </div>
    
    <!-- [섹션: 제출 버튼] -->
    <div class="form-actions">
      <button type="submit" class="btn-primary btn-lg">보고서 제출</button>
      <button type="reset" class="btn-secondary btn-lg">초기화</button>
    </div>
    
  </form>
</div>
```

### 5.2 보고서 작성 스크립트

**파일 위치**: `05.Source/03.sales_mode/03_report_write/02_report_write.js`

```javascript
// [섹션: Import]
import { CompanyCRUD } from '../../05.database/02_crud.js';
import { ReportCRUD } from '../../05.database/03_report_crud.js';
import { formatNumber } from '../../01.common/02_utils.js';
import { showToast } from '../../01.common/06_toast.js';

// [섹션: 변수]
const user = JSON.parse(sessionStorage.getItem('user'));
const companyCrud = new CompanyCRUD();
const reportCrud = new ReportCRUD();

// [섹션: 거래처 목록 로드]
async function loadCompanyOptions() {
  try {
    const companies = await companyCrud.list({
      internalManager: user.name,
      businessStatus: ['활성', '신규'] // 활성/신규만
    });
    
    const select = document.getElementById('company-select');
    select.innerHTML = '<option value="">거래처를 선택하세요</option>';
    
    companies.forEach(company => {
      const option = document.createElement('option');
      option.value = company.keyValue;
      option.textContent = `${company.finalCompanyName} (${company.businessStatus})`;
      option.dataset.company = JSON.stringify(company);
      select.appendChild(option);
    });
    
    console.log(`[거래처 옵션] ${companies.length}개 로드`);
    
  } catch (error) {
    console.error('[거래처 옵션 로드 실패]', error);
    showToast('거래처 목록을 불러오는데 실패했습니다.', 'error');
  }
}

// [섹션: 거래처 선택 시]
document.getElementById('company-select').addEventListener('change', (e) => {
  const option = e.target.selectedOptions[0];
  
  if (!option.dataset.company) {
    document.getElementById('company-info').innerHTML = '';
    return;
  }
  
  const company = JSON.parse(option.dataset.company);
  
  document.getElementById('company-info').innerHTML = `
    <div class="info-grid">
      <div class="info-item">
        <label>누적매출금액</label>
        <div class="info-value">${formatNumber(company.accumulatedSales)}원</div>
      </div>
      <div class="info-item">
        <label>누적수금금액</label>
        <div class="info-value">${formatNumber(company.accumulatedCollection)}원</div>
      </div>
      <div class="info-item">
        <label>매출채권잔액</label>
        <div class="info-value ${company.accountsReceivable < 0 ? 'negative' : ''}">${formatNumber(company.accountsReceivable)}원</div>
      </div>
      <div class="info-item">
        <label>판매제품</label>
        <div class="info-value">${company.salesProduct || '-'}</div>
      </div>
    </div>
  `;
});

// [섹션: 체크박스 - 입력 필드 활성화]
document.getElementById('check-collection').addEventListener('change', (e) => {
  document.getElementById('input-collection').disabled = !e.target.checked;
});

document.getElementById('check-products').addEventListener('change', (e) => {
  document.getElementById('products-checkboxes').style.display = e.target.checked ? 'grid' : 'none';
});

document.getElementById('check-activity').addEventListener('change', (e) => {
  document.getElementById('input-activity').disabled = !e.target.checked;
});

// [섹션: 보고서 제출]
document.getElementById('report-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  try {
    const formData = new FormData(e.target);
    
    // 거래처 확인
    const companyId = formData.get('companyId');
    if (!companyId) {
      showToast('거래처를 선택하세요.', 'warning');
      return;
    }
    
    // 3가지 중 하나 이상 체크
    const hasCollection = document.getElementById('check-collection').checked;
    const hasProducts = document.getElementById('check-products').checked;
    const hasActivity = document.getElementById('check-activity').checked;
    
    if (!hasCollection && !hasProducts && !hasActivity) {
      showToast('목표수금, 판매제품, 영업활동 중 하나 이상 입력하세요.', 'warning');
      return;
    }
    
    // 보고서 데이터 생성
    const report = {
      companyId: companyId,
      companyName: document.getElementById('company-select').selectedOptions[0].textContent,
      targetCollection: hasCollection ? parseFloat(formData.get('targetCollection')) || 0 : null,
      salesProducts: hasProducts ? Array.from(formData.getAll('products')).join(', ') : null,
      businessActivity: hasActivity ? formData.get('businessActivity') : null
    };
    
    // 제출
    await reportCrud.create(report);
    
    showToast('보고서가 제출되었습니다.', 'success');
    e.target.reset();
    document.getElementById('company-info').innerHTML = '';
    
  } catch (error) {
    console.error('[보고서 제출 실패]', error);
    showToast('제출에 실패했습니다: ' + error.message, 'error');
  }
});

// [섹션: 초기 로드]
loadCompanyOptions();
```

---

## 6. 실적보고서 확인

### 6.1 보고서 확인 HTML

**파일 위치**: `05.Source/03.sales_mode/04_report_check/01_report_check.html`

```html
<!-- [섹션: 페이지 헤더] -->
<div class="page-header">
  <h1>실적보고서 확인</h1>
  <p class="subtitle">제출한 보고서의 처리 상태를 확인하세요</p>
</div>

<!-- [섹션: 필터] -->
<div class="filter-section">
  <div class="filter-group">
    <label>상태</label>
    <select id="filter-report-status">
      <option value="">전체</option>
      <option value="pending">대기중</option>
      <option value="confirmed">확인완료</option>
    </select>
  </div>
  
  <div class="filter-group">
    <label>기간</label>
    <input type="date" id="filter-start-date">
    <span>~</span>
    <input type="date" id="filter-end-date">
  </div>
  
  <button id="btn-filter-report" class="btn-primary">검색</button>
</div>

<!-- [섹션: 보고서 목록] -->
<div class="table-container">
  <table id="reports-table">
    <thead>
      <tr>
        <th>제출일</th>
        <th>거래처명</th>
        <th>목표수금</th>
        <th>판매제품</th>
        <th>상태</th>
        <th>확인자</th>
        <th>확인일</th>
        <th>상세</th>
      </tr>
    </thead>
    <tbody id="reports-tbody">
      <!-- 동적 로드 -->
    </tbody>
  </table>
</div>

<!-- [섹션: 보고서 상세 모달] -->
<div id="report-detail-modal" class="modal">
  <div class="modal-content modal-lg">
    <div class="modal-header">
      <h2>보고서 상세</h2>
      <button class="modal-close">&times;</button>
    </div>
    <div class="modal-body" id="report-detail-content">
      <!-- 동적 로드 -->
    </div>
  </div>
</div>
```

### 6.2 보고서 확인 스크립트

**파일 위치**: `05.Source/03.sales_mode/04_report_check/02_report_check.js`

```javascript
// [섹션: Import]
import { ReportCRUD } from '../../05.database/03_report_crud.js';
import { formatNumber } from '../../01.common/02_utils.js';
import { showModal, closeModal } from '../../01.common/05_modal.js';

// [섹션: 변수]
const user = JSON.parse(sessionStorage.getItem('user'));
const reportCrud = new ReportCRUD();

// [섹션: 보고서 목록 로드]
async function loadReports(filter = {}) {
  try {
    filter.submittedBy = user.id;
    
    const reports = await reportCrud.list(filter);
    const tbody = document.getElementById('reports-tbody');
    tbody.innerHTML = '';
    
    if (reports.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="no-data">보고서가 없습니다.</td></tr>';
      return;
    }
    
    reports.forEach(report => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${formatDate(report.submittedDate)}</td>
        <td>${report.companyName}</td>
        <td class="text-right">${report.targetCollection ? formatNumber(report.targetCollection) : '-'}</td>
        <td>${report.salesProducts || '-'}</td>
        <td><span class="badge badge-${getStatusClass(report.status)}">${getStatusText(report.status)}</span></td>
        <td>${report.confirmedByName || '-'}</td>
        <td>${report.confirmedDate ? formatDate(report.confirmedDate) : '-'}</td>
        <td><button class="btn-icon btn-detail" data-id="${report.reportId}">📄</button></td>
      `;
      tbody.appendChild(row);
    });
    
    // 상세 버튼 이벤트
    document.querySelectorAll('.btn-detail').forEach(btn => {
      btn.addEventListener('click', async () => {
        await showReportDetail(btn.dataset.id);
      });
    });
    
    console.log(`[보고서 목록] ${reports.length}개 로드`);
    
  } catch (error) {
    console.error('[보고서 목록 로드 실패]', error);
  }
}

// [섹션: 보고서 상세]
async function showReportDetail(reportId) {
  try {
    const report = await reportCrud.read(reportId);
    
    const content = document.getElementById('report-detail-content');
    content.innerHTML = `
      <div class="report-detail">
        <div class="detail-section">
          <h3>기본 정보</h3>
          <div class="detail-grid">
            <div class="detail-item">
              <label>제출일</label>
              <div>${formatDate(report.submittedDate)}</div>
            </div>
            <div class="detail-item">
              <label>거래처명</label>
              <div>${report.companyName}</div>
            </div>
            <div class="detail-item">
              <label>상태</label>
              <div><span class="badge badge-${getStatusClass(report.status)}">${getStatusText(report.status)}</span></div>
            </div>
          </div>
        </div>
        
        <div class="detail-section">
          <h3>방문 실적</h3>
          <div class="detail-grid">
            ${report.targetCollection ? `
              <div class="detail-item">
                <label>목표수금</label>
                <div>${formatNumber(report.targetCollection)}원</div>
              </div>
            ` : ''}
            ${report.salesProducts ? `
              <div class="detail-item">
                <label>판매제품</label>
                <div>${report.salesProducts}</div>
              </div>
            ` : ''}
            ${report.businessActivity ? `
              <div class="detail-item full-width">
                <label>영업활동</label>
                <div class="activity-content">${report.businessActivity}</div>
              </div>
            ` : ''}
          </div>
        </div>
        
        ${report.status === 'confirmed' ? `
          <div class="detail-section">
            <h3>확인 결과</h3>
            <div class="detail-grid">
              <div class="detail-item">
                <label>확인자</label>
                <div>${report.confirmedByName}</div>
              </div>
              <div class="detail-item">
                <label>확인일</label>
                <div>${formatDate(report.confirmedDate)}</div>
              </div>
              ${report.finalCollection ? `
                <div class="detail-item">
                  <label>최종수금</label>
                  <div>${formatNumber(report.finalCollection)}원</div>
                </div>
              ` : ''}
              ${report.additionalContent ? `
                <div class="detail-item full-width">
                  <label>추가 내용</label>
                  <div class="activity-content">${report.additionalContent}</div>
                </div>
              ` : ''}
            </div>
          </div>
        ` : ''}
      </div>
    `;
    
    showModal('report-detail-modal');
    
  } catch (error) {
    console.error('[보고서 상세 조회 실패]', error);
  }
}

// [섹션: 상태 관련 함수]
function getStatusText(status) {
  const map = {
    'pending': '대기중',
    'confirmed': '확인완료'
  };
  return map[status] || status;
}

function getStatusClass(status) {
  const map = {
    'pending': 'warning',
    'confirmed': 'success'
  };
  return map[status] || 'default';
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('ko-KR');
}

// [섹션: 필터 적용]
document.getElementById('btn-filter-report').addEventListener('click', () => {
  const filter = {
    status: document.getElementById('filter-report-status').value,
    startDate: document.getElementById('filter-start-date').value,
    endDate: document.getElementById('filter-end-date').value
  };
  
  loadReports(filter);
});

// [섹션: 모달 닫기]
document.querySelectorAll('.modal-close').forEach(btn => {
  btn.addEventListener('click', () => {
    closeModal('report-detail-modal');
  });
});

// [섹션: 초기 로드]
loadReports();
```

---

## 7. 데이터관리

**파일 위치**: `05.Source/03.sales_mode/05_data_management/01_data_management.html`

```html
<!-- [섹션: 페이지 헤더] -->
<div class="page-header">
  <h1>데이터 관리</h1>
  <p class="subtitle">담당 거래처 데이터를 다운로드하세요</p>
</div>

<!-- [섹션: 다운로드 옵션] -->
<div class="download-section">
  <div class="download-card">
    <h3>📊 담당거래처 데이터</h3>
    <p>본인이 담당하는 거래처 정보를 엑셀 파일로 다운로드합니다.</p>
    <button id="btn-download-companies" class="btn-primary">다운로드</button>
  </div>
  
  <div class="download-card">
    <h3>📝 제출한 보고서</h3>
    <p>본인이 작성/제출한 실적보고서를 엑셀 파일로 다운로드합니다.</p>
    <button id="btn-download-reports" class="btn-primary">다운로드</button>
  </div>
</div>

<!-- [섹션: 변경 이력] -->
<div class="history-section">
  <h2>최근 변경 이력</h2>
  <div class="table-container">
    <table id="history-table">
      <thead>
        <tr>
          <th>일시</th>
          <th>작업</th>
          <th>대상</th>
          <th>상세</th>
        </tr>
      </thead>
      <tbody id="history-tbody">
        <!-- 동적 로드 -->
      </tbody>
    </table>
  </div>
</div>
```

---

## 8. 시스템설정

**파일 위치**: `05.Source/03.sales_mode/06_system_settings/01_system_settings.html`

```html
<!-- [섹션: 페이지 헤더] -->
<div class="page-header">
  <h1>시스템 설정</h1>
  <p class="subtitle">개인 환경 설정을 관리하세요</p>
</div>

<!-- [섹션: 설정 탭] -->
<div class="settings-tabs">
  <button class="tab-btn active" data-tab="profile">프로필</button>
  <button class="tab-btn" data-tab="display">화면 설정</button>
  <button class="tab-btn" data-tab="notification">알림 설정</button>
</div>

<!-- [섹션: 탭 컨텐츠] -->
<div class="tab-content">
  
  <!-- 프로필 탭 -->
  <div id="tab-profile" class="tab-pane active">
    <h3>프로필 정보</h3>
    <form id="profile-form">
      <div class="form-group">
        <label>이름</label>
        <input type="text" name="name" readonly>
      </div>
      <div class="form-group">
        <label>역할</label>
        <input type="text" value="영업담당" readonly>
      </div>
      <div class="form-group">
        <label>입사일</label>
        <input type="date" name="hireDate" readonly>
      </div>
    </form>
  </div>
  
  <!-- 화면 설정 탭 -->
  <div id="tab-display" class="tab-pane">
    <h3>화면 설정</h3>
    <form id="display-form">
      <div class="form-group">
        <label>
          <input type="checkbox" name="compactMode">
          컴팩트 모드
        </label>
      </div>
      <div class="form-group">
        <label>
          <input type="checkbox" name="showGuide">
          도움말 표시
        </label>
      </div>
      <button type="submit" class="btn-primary">저장</button>
    </form>
  </div>
  
  <!-- 알림 설정 탭 -->
  <div id="tab-notification" class="tab-pane">
    <h3>알림 설정</h3>
    <form id="notification-form">
      <div class="form-group">
        <label>
          <input type="checkbox" name="reportConfirmed">
          보고서 확인 시 알림
        </label>
      </div>
      <div class="form-group">
        <label>
          <input type="checkbox" name="newMessage">
          새 메시지 알림
        </label>
      </div>
      <button type="submit" class="btn-primary">저장</button>
    </form>
  </div>
  
</div>
```

---

## 9. 테마 디자인

### 9.1 색상 시스템

```css
/* 영업담당모드 전용 색상 */
:root {
  /* Primary - 파란색 계열 */
  --sales-primary: #2563eb;
  --sales-primary-dark: #1e40af;
  --sales-primary-light: #3b82f6;
  
  /* Accent */
  --sales-accent: #60a5fa;
  --sales-accent-light: #93c5fd;
  
  /* Backgrounds */
  --sales-bg-card: rgba(37, 99, 235, 0.1);
  --sales-bg-hover: rgba(37, 99, 235, 0.2);
  
  /* Effects */
  --sales-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
  --sales-glow: 0 0 20px rgba(37, 99, 235, 0.3);
}
```

### 9.2 차별화 요소

| 요소 | 영업담당모드 |
|------|------------|
| **헤더 배경** | 파란색 그라데이션 (좌→우) |
| **사이드바 배경** | 파란색 그라데이션 (상→하) |
| **버튼** | 파란색 + 파란 그림자 |
| **KPI 카드** | 파란색 왼쪽 테두리 |
| **호버 효과** | 파란색 배경 + 파란 그림자 |
| **배지** | 파란색 계열 |

---

## 10. 테스트

### 10.1 기능 테스트

**테스트 시나리오**

```javascript
// [섹션: 영업담당모드 테스트]
export async function testSalesMode() {
  console.log('=== 영업담당모드 테스트 시작 ===');
  
  const results = [];
  
  // 1. 대시보드 KPI 테스트
  try {
    const kpi = await calculateSalesKPI(testUserId);
    
    // KPI 14개 검증
    const requiredKPIs = [
      'totalCompanies', 'activeCompanies', 'activationRate',
      'mainProductCompanies', 'achievementRate', 'mainAchievementRate',
      'totalSales', 'mainProductSales', 'mainProductRatio',
      'salesConcentration', 'totalCollection', 'receivables',
      'salesContribution', 'mainContribution'
    ];
    
    const allPresent = requiredKPIs.every(key => kpi.hasOwnProperty(key));
    
    if (allPresent) {
      results.push({ test: '대시보드 KPI', status: '✅ 통과', kpis: 14 });
    } else {
      throw new Error('KPI 누락');
    }
  } catch (error) {
    results.push({ test: '대시보드 KPI', status: '❌ 실패', error: error.message });
  }
  
  // 2. 권한 테스트 (본인 데이터만)
  try {
    const companies = await companyCrud.list({ internalManager: testUser.name });
    const otherUserCompanies = await companyCrud.list({ internalManager: 'OTHER_USER' });
    
    if (companies.length > 0 && otherUserCompanies.length === 0) {
      results.push({ test: '권한 제어', status: '✅ 통과' });
    } else {
      throw new Error('권한 제어 실패');
    }
  } catch (error) {
    results.push({ test: '권한 제어', status: '❌ 실패', error: error.message });
  }
  
  // 3. 보고서 작성 테스트
  try {
    const report = {
      companyId: 'TEST-001',
      targetCollection: 1000000,
      salesProducts: '임플란트, 지르코니아',
      businessActivity: '정기 방문 및 제품 소개'
    };
    
    await reportCrud.create(report);
    results.push({ test: '보고서 작성', status: '✅ 통과' });
  } catch (error) {
    results.push({ test: '보고서 작성', status: '❌ 실패', error: error.message });
  }
  
  console.table(results);
  console.log('=== 영업담당모드 테스트 완료 ===');
  
  return results;
}
```

### 10.2 UI 테스트

**체크리스트**

- [ ] 헤더 파란색 그라데이션 적용
- [ ] 사이드바 파란색 그라데이션 적용
- [ ] 메뉴 호버 시 밝아짐 효과
- [ ] KPI 카드 파란색 왼쪽 테두리
- [ ] 버튼 호버 시 파란색 그림자
- [ ] 테이블 행 호버 시 파란색 배경
- [ ] 모달 헤더 파란색 배경
- [ ] 음수 값 빨간색 표시
- [ ] 반응형 레이아웃 (1280px ~ 1920px)

---

## ✅ STAGE 4 완료 조건

- [ ] 공통 레이아웃 구현
- [ ] 대시보드 (KPI 14개) 구현
- [ ] 담당거래처관리 구현
- [ ] 실적보고서 작성 구현
- [ ] 실적보고서 확인 구현
- [ ] 데이터관리 구현
- [ ] 시스템설정 구현
- [ ] 파란색 테마 적용
- [ ] 본인 데이터만 필터링 확인
- [ ] 모든 기능 테스트 통과
- [ ] 기존 UI와 100% 일치 확인

---

**다음 단계**: STAGE 5 - 관리자모드 구현

**이 단계 완료. 확인 후 다음 단계 진행 여부 알려주세요. (예: 문제 있음/다음으로)**

---

**Creator**: Daniel.K  
**Contact**: kinggo0807@hotmail.com  
**Owner**: Kang Jung Hwan
