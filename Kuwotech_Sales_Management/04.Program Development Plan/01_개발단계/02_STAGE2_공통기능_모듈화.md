# STAGE 2: 공통 기능 모듈화

> **작성일**: 2025-09-26  
> **작성자**: Daniel.K  
> **단계**: 공통 기능 및 유틸리티 구현  
> **예상 기간**: 1-2일

---

## 📋 목차

1. [단계 개요](#1-단계-개요)
2. [공통 기능 구현](#2-공통-기능-구현)
3. [유틸리티 함수](#3-유틸리티-함수)
4. [사이드바 시스템](#4-사이드바-시스템)
5. [테스트](#5-테스트)
6. [출력](#6-출력)

---

## 1. 단계 개요

### 1.1 목표
- 공통 기능 모듈화
- 코드 재사용 극대화
- 영업/관리자 모드 유사성 활용

### 1.2 구현 범위
✅ **생성할 파일**
- `01.common/` 전체 모듈
- `sidebar.js` (모드별 사이드바)
- 공통 스타일 확장

---

## 2. 공통 기능 구현

### 2.1 설정 관리 (01_config.js)

```javascript
// [MODULE: 설정 관리]

// [SECTION: 시스템 설정]
export const CONFIG = {
  APP_NAME: 'KUWOTECH 영업관리 시스템',
  VERSION: '3.0.0',
  DB_NAME: 'KuwotechSalesDB',
  DB_VERSION: 3,
  
  // 경로 설정
  PATHS: {
    LOGO: '../../02.Fonts_Logos/logo.png',
    DATA: '../../01.Original_data/영업관리기초자료.xlsx',
    FONTS: '../../02.Fonts_Logos/Paperlogy/'
  },
  
  // 색상 테마
  THEMES: {
    SALES: {
      primary: '#007bff',
      secondary: '#0056b3',
      name: '영업담당'
    },
    ADMIN: {
      primary: '#6c757d',
      secondary: '#5a6268',
      name: '관리자'
    }
  },
  
  // KPI 목표
  TARGETS: {
    COMPANIES_PER_PERSON: 80,
    KEY_PRODUCTS_PER_PERSON: 40
  },
  
  // 주요 제품
  KEY_PRODUCTS: ['임플란트', '지르코니아', 'Abutment'],
  
  // 거래 상태
  BUSINESS_STATUS: ['활성', '비활성', '불용', '추가확인'],
  
  // 기여도
  CONTRIBUTION_LEVELS: ['상', '중', '하']
};

// [SECTION: 한국어 용어집]
export const TERMS = {
  '고객': '거래처',
  '거래처명': '최종거래처명',
  'ERP명': '거래처명(ERP)',
  '담당자': '내부담당자',
  '활동': '영업활동(특이사항)'
};

// [SECTION: API 엔드포인트] (향후 확장용)
export const API = {
  BASE_URL: '',
  ENDPOINTS: {
    LOGIN: '/api/auth/login',
    UPLOAD: '/api/data/upload',
    DOWNLOAD: '/api/data/download'
  }
};
```

### 2.2 유틸리티 함수 (02_utils.js)

```javascript
// [MODULE: 유틸리티 함수]

// [SECTION: 숫자 형식화]
export function formatNumber(num) {
  if (num === null || num === undefined) return '-';
  return Number(num).toLocaleString('ko-KR');
}

// [SECTION: 통화 형식화]
export function formatCurrency(num) {
  if (num === null || num === undefined) return '-';
  return formatNumber(num) + '원';
}

// [SECTION: 백분율 형식화]
export function formatPercentage(num, decimals = 2) {
  if (num === null || num === undefined) return '-';
  return Number(num).toFixed(decimals) + '%';
}

// [SECTION: 음수 처리]
export function formatNegative(num, unit = '') {
  if (num < 0) {
    return `(${formatNumber(Math.abs(num))})${unit}`;
  }
  return formatNumber(num) + unit;
}

// [SECTION: 날짜 형식화]
export function formatDate(date) {
  if (!date) return '-';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// [SECTION: 시간 형식화]
export function formatTime(date) {
  if (!date) return '-';
  const d = new Date(date);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

// [SECTION: 날짜시간 형식화]
export function formatDateTime(date) {
  return `${formatDate(date)} ${formatTime(date)}`;
}

// [SECTION: 디바운스]
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// [SECTION: 쓰로틀]
export function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// [SECTION: 로컬 스토리지]
export const storage = {
  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },
  
  get(key) {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  },
  
  remove(key) {
    localStorage.removeItem(key);
  },
  
  clear() {
    localStorage.clear();
  }
};
```

### 2.3 포맷팅 함수 (03_format.js)

```javascript
// [MODULE: 포맷팅 전문 함수]
import { CONFIG } from './01_config.js';

// [SECTION: 달성률 표시]
export function formatAchievementRate(rate) {
  if (rate > 0) {
    return {
      text: `${rate.toFixed(2)}% 초과달성 상태입니다`,
      class: 'achievement-over',
      color: '#007bff'
    };
  } else {
    return {
      text: `(${Math.abs(rate).toFixed(2)})% 미만달성 상태입니다`,
      class: 'achievement-under',
      color: '#dc3545'
    };
  }
}

// [SECTION: 기여도 표시]
export function formatContribution(level) {
  const colors = {
    '상': '#28a745',
    '중': '#ffc107',
    '하': '#dc3545'
  };
  
  return {
    text: level,
    color: colors[level] || '#6c757d'
  };
}

// [SECTION: 거래 상태 표시]
export function formatBusinessStatus(status) {
  const statusMap = {
    '활성': { text: '활성', color: '#28a745', icon: '✅' },
    '비활성': { text: '비활성', color: '#ffc107', icon: '⏸️' },
    '불용': { text: '불용', color: '#dc3545', icon: '❌' },
    '추가확인': { text: '추가확인', color: '#17a2b8', icon: '❓' }
  };
  
  return statusMap[status] || { text: status, color: '#6c757d', icon: '' };
}

// [SECTION: KPI 스타일]
export function getKPIStyle(value, target) {
  const rate = (value / target - 1) * 100;
  
  if (rate >= 0) {
    return { color: '#28a745', icon: '📈' };
  } else if (rate >= -10) {
    return { color: '#ffc107', icon: '📊' };
  } else {
    return { color: '#dc3545', icon: '📉' };
  }
}
```

### 2.4 시계 표시 (04_clock.js)

```javascript
// [MODULE: 실시간 시계]

// [SECTION: 시계 초기화]
export function initClock(elementId) {
  const element = document.getElementById(elementId);
  if (!element) return;
  
  function updateClock() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    const weekday = weekdays[now.getDay()];
    
    element.textContent = `${year}-${month}-${day} (${weekday}) ${hours}:${minutes}:${seconds}`;
  }
  
  updateClock();
  setInterval(updateClock, 1000);
}
```

### 2.5 모달 시스템 (05_modal.js)

```javascript
// [MODULE: 모달 관리]

// [SECTION: 모달 클래스]
class Modal {
  constructor(modalId) {
    this.modal = document.getElementById(modalId);
    if (!this.modal) {
      console.error(`Modal with id '${modalId}' not found`);
      return;
    }
    
    this.overlay = this.modal.querySelector('.modal-overlay');
    this.content = this.modal.querySelector('.modal-content');
    this.closeBtn = this.modal.querySelector('.modal-close');
    
    this.init();
  }
  
  // [SECTION: 초기화]
  init() {
    // 닫기 버튼
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.close());
    }
    
    // 오버레이 클릭
    if (this.overlay) {
      this.overlay.addEventListener('click', () => this.close());
    }
    
    // ESC 키
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen()) {
        this.close();
      }
    });
  }
  
  // [SECTION: 열기]
  open() {
    this.modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
  
  // [SECTION: 닫기]
  close() {
    this.modal.classList.remove('active');
    document.body.style.overflow = '';
  }
  
  // [SECTION: 상태 확인]
  isOpen() {
    return this.modal.classList.contains('active');
  }
  
  // [SECTION: 내용 설정]
  setContent(html) {
    if (this.content) {
      this.content.innerHTML = html;
    }
  }
}

// [SECTION: 모달 생성 헬퍼]
export function createModal(id, title, content) {
  const modalHTML = `
    <div id="${id}" class="modal">
      <div class="modal-overlay"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3>${title}</h3>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          ${content}
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  return new Modal(id);
}

// [SECTION: 확인 모달]
export function confirmModal(message) {
  return new Promise((resolve) => {
    const modal = createModal('confirmModal', '확인', `
      <p>${message}</p>
      <div class="modal-buttons">
        <button class="btn-cancel">취소</button>
        <button class="btn-confirm">확인</button>
      </div>
    `);
    
    modal.open();
    
    document.querySelector('.btn-cancel').addEventListener('click', () => {
      modal.close();
      modal.modal.remove();
      resolve(false);
    });
    
    document.querySelector('.btn-confirm').addEventListener('click', () => {
      modal.close();
      modal.modal.remove();
      resolve(true);
    });
  });
}

// [SECTION: 알림 모달]
export function alertModal(message) {
  const modal = createModal('alertModal', '알림', `
    <p>${message}</p>
    <button class="btn-ok">확인</button>
  `);
  
  modal.open();
  
  document.querySelector('.btn-ok').addEventListener('click', () => {
    modal.close();
    modal.modal.remove();
  });
}

export { Modal };
```

---

## 3. 유틸리티 함수

### 3.1 토스트 알림 (06_toast.js)

```javascript
// [MODULE: 토스트 알림]

// [SECTION: 토스트 표시]
export function showToast(message, type = 'info', duration = 3000) {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, duration);
}

// [SECTION: 성공 토스트]
export function successToast(message) {
  showToast(message, 'success');
}

// [SECTION: 에러 토스트]
export function errorToast(message) {
  showToast(message, 'error');
}

// [SECTION: 경고 토스트]
export function warningToast(message) {
  showToast(message, 'warning');
}
```

---

## 4. 사이드바 시스템

### 4.1 사이드바 관리 (08.components/03_sidebar.js)

```javascript
// [MODULE: 사이드바 관리]
import { storage } from '../01.common/02_utils.js';

// [SECTION: 사이드바 메뉴 정의]
const SIDEBAR_MENUS = {
  sales: [
    { id: 'dashboard', name: '대시보드', icon: '🏠', path: '01_dashboard/01_dashboard.html' },
    { id: 'my-companies', name: '담당거래처 관리', icon: '📊', path: '02_my_companies/01_my_companies.html' },
    { id: 'report-write', name: '실적보고서 작성', icon: '📝', path: '03_report_write/01_report_write.html' },
    { id: 'report-check', name: '실적보고서 확인', icon: '✅', path: '04_report_check/01_report_check.html' },
    { id: 'data-management', name: '데이터 관리', icon: '📥', path: '05_data_management/01_data_management.html' },
    { id: 'settings', name: '시스템 설정', icon: '⚙️', path: '06_system_settings/01_settings.html' }
  ],
  
  admin: [
    { id: 'dashboard', name: '대시보드', icon: '🏠', path: '01_dashboard/01_dashboard.html' },
    { id: 'all-companies', name: '전체거래처 관리', icon: '📊', path: '02_all_companies/01_all_companies.html' },
    { id: 'report-confirm', name: '실적보고서 확인', icon: '✅', path: '03_report_confirm/01_report_confirm.html' },
    { id: 'presentation', name: '보고서 발표', icon: '📈', path: '04_presentation/01_presentation.html' },
    { id: 'data-management', name: '데이터 관리', icon: '📥', path: '05_data_management/01_data_management.html' },
    { id: 'employees', name: '직원 관리', icon: '👥', path: '06_employee_management/01_employees.html' },
    { id: 'settings', name: '시스템 설정', icon: '⚙️', path: '07_system_settings/01_settings.html' }
  ]
};

// [SECTION: 사이드바 렌더링]
export function renderSidebar(mode) {
  const sidebarElement = document.getElementById('sidebar');
  if (!sidebarElement) return;
  
  const menus = SIDEBAR_MENUS[mode] || [];
  const currentUser = storage.get('currentUser');
  
  const sidebarHTML = `
    <div class="sidebar-header">
      <img src="../../02.Fonts_Logos/logo.png" alt="Logo" class="sidebar-logo">
      <div class="user-info">
        <p class="user-name">${currentUser?.name || '사용자'}</p>
        <p class="user-role">${currentUser?.role === 'admin' ? '관리자' : '영업담당'}</p>
      </div>
    </div>
    
    <nav class="sidebar-nav">
      ${menus.map(menu => `
        <a href="${menu.path}" class="sidebar-item" data-id="${menu.id}">
          <span class="sidebar-icon">${menu.icon}</span>
          <span class="sidebar-text">${menu.name}</span>
        </a>
      `).join('')}
    </nav>
    
    <div class="sidebar-footer">
      <button class="btn-logout" id="logoutBtn">
        <span>🚪</span> 로그아웃
      </button>
    </div>
  `;
  
  sidebarElement.innerHTML = sidebarHTML;
  
  // 로그아웃 버튼
  document.getElementById('logoutBtn').addEventListener('click', logout);
  
  // 현재 페이지 활성화
  highlightCurrentMenu();
}

// [SECTION: 현재 메뉴 강조]
function highlightCurrentMenu() {
  const currentPath = window.location.pathname;
  const menuItems = document.querySelectorAll('.sidebar-item');
  
  menuItems.forEach(item => {
    if (currentPath.includes(item.getAttribute('href'))) {
      item.classList.add('active');
    }
  });
}

// [SECTION: 로그아웃]
function logout() {
  storage.remove('currentUser');
  window.location.href = '../../02.login/01_login.html';
}
```

### 4.2 사이드바 스타일 추가

```css
/* [SECTION: 사이드바 스타일] */
.sidebar {
  width: 250px;
  height: 100vh;
  background-color: var(--color-bg-secondary);
  display: flex;
  flex-direction: column;
  position: fixed;
  left: 0;
  top: 0;
}

.sidebar-header {
  padding: var(--spacing-lg);
  border-bottom: 1px solid #333;
  text-align: center;
}

.sidebar-logo {
  width: 80px;
  margin-bottom: var(--spacing-md);
}

.user-info {
  margin-top: var(--spacing-md);
}

.user-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.user-role {
  font-size: 14px;
  color: var(--color-text-secondary);
}

.sidebar-nav {
  flex: 1;
  padding: var(--spacing-md);
  overflow-y: auto;
}

.sidebar-item {
  display: flex;
  align-items: center;
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-sm);
  color: var(--color-text-primary);
  text-decoration: none;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.sidebar-item:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.sidebar-item.active {
  background-color: var(--color-accent-blue);
}

.sidebar-icon {
  font-size: 20px;
  margin-right: var(--spacing-md);
}

.sidebar-text {
  font-size: 14px;
}

.sidebar-footer {
  padding: var(--spacing-md);
  border-top: 1px solid #333;
}

.btn-logout {
  width: 100%;
  padding: var(--spacing-md);
  background-color: var(--color-accent-red);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.btn-logout:hover {
  background-color: #c82333;
}
```

---

## 5. 테스트

### 5.1 유틸리티 테스트

```javascript
// [TEST: 포맷팅 함수]
import { formatNumber, formatCurrency, formatPercentage } from './02_utils.js';

console.log(formatNumber(1234567));      // "1,234,567"
console.log(formatCurrency(1234567));    // "1,234,567원"
console.log(formatPercentage(12.3456));  // "12.35%"
console.log(formatNegative(-1234, '원')); // "(1,234)원"
```

### 5.2 모달 테스트

```javascript
// [TEST: 모달 기능]
import { confirmModal, alertModal } from './05_modal.js';

// 확인 모달
const result = await confirmModal('정말 삭제하시겠습니까?');
console.log(result); // true or false

// 알림 모달
alertModal('저장되었습니다.');
```

### 5.3 사이드바 테스트

```javascript
// [TEST: 사이드바 렌더링]
import { renderSidebar } from './03_sidebar.js';

// 영업담당 모드
renderSidebar('sales');

// 관리자 모드
renderSidebar('admin');
```

---

## 6. 출력

### 6.1 생성된 파일 목록

```
05.Source/
├── 01.common/
│   ├── 01_config.js (설정 관리)
│   ├── 02_utils.js (유틸리티 함수)
│   ├── 03_format.js (포맷팅 함수)
│   ├── 04_clock.js (시계 표시)
│   ├── 05_modal.js (모달 시스템)
│   └── 06_toast.js (토스트 알림)
│
└── 08.components/
    └── 03_sidebar.js (사이드바 관리)
```

### 6.2 모듈 의존성

```
common/
├── config.js (독립)
├── utils.js (독립)
├── format.js → config.js
├── clock.js (독립)
├── modal.js (독립)
└── toast.js (독립)

components/
└── sidebar.js → utils.js, config.js
```

---

## ✅ STAGE 2 완료 조건

- [x] 설정 관리 구현
- [x] 유틸리티 함수 구현
- [x] 포맷팅 함수 구현
- [x] 시계 표시 구현
- [x] 모달 시스템 구현
- [x] 토스트 알림 구현
- [x] 사이드바 시스템 구현
- [x] 테스트 완료

---

**다음 단계**: STAGE 3 - 데이터 처리 및 IndexedDB

**이 단계 완료. 확인 후 다음 단계 진행 여부 알려주세요. (예: 문제 있음/다음으로)**

**Creator**: Daniel.K  
**Contact**: kinggo0807@hotmail.com  
**Owner**: Kang Jung Hwan
