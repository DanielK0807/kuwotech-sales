// ============================================
// [MODULE: 네비게이션 시스템]
// 파일 위치: 05.Source/08.components/01_navigation.js
// 작성일: 2025-01-27
// 설명: 파일 간 이동과 라우팅을 담당하는 네비게이션 시스템
// ============================================

import { ROUTE_CONFIG } from '../01.common/01_global_config.js';
import { showToast, showLoading, hideLoading } from '../01.common/20_common_index.js';
import { applyTheme } from '../01.common/07_design.js';
import logger from '../01.common/23_logger.js';

// ============================================
// [SECTION: 네비게이션 상태 관리]
// ============================================

const navigationState = {
    currentPath: '',
    previousPath: '',
    history: [],
    isNavigating: false
};

// ============================================
// [SECTION: 사용자 권한 확인]
// ============================================

/**
 * 사용자 권한 확인
 * @returns {Object} 권한 정보
 */
export function checkUserPermission() {
    const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
    const userRole = sessionStorage.getItem('userRole');
    const userName = sessionStorage.getItem('userName');
    
    return {
        isLoggedIn,
        userRole,
        userName,
        isAdmin: userRole === '관리자',
        isSales: userRole === '영업담당'
    };
}

// ============================================
// [SECTION: 경로 유틸리티]
// ============================================

/**
 * 경로 정규화
 * @param {string} path - 경로
 * @returns {string} 정규화된 경로
 */
function normalizePath(path) {
    // 상대 경로를 절대 경로로 변환
    if (!path.startsWith('/')) {
        const currentDir = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'));
        path = currentDir + '/' + path;
    }
    
    // 이중 슬래시 제거
    path = path.replace(/\/+/g, '/');
    
    // ./ 및 ../ 처리
    const parts = path.split('/').filter(part => part !== '.');
    const normalizedParts = [];
    
    for (const part of parts) {
        if (part === '..') {
            normalizedParts.pop();
        } else if (part) {
            normalizedParts.push(part);
        }
    }
    
    return '/' + normalizedParts.join('/');
}

/**
 * 경로에서 모드 추출
 * @param {string} path - 경로
 * @returns {string} 모드 (sales/admin)
 */
function getModeFromPath(path) {
    if (path.includes('/04.admin_mode/')) return 'admin';
    if (path.includes('/03.sales_mode/')) return 'sales';
    return sessionStorage.getItem('userRole') === '관리자' ? 'admin' : 'sales';
}

// ============================================
// [SECTION: 네비게이션 함수]
// ============================================

/**
 * 페이지 네비게이트
 * @param {string} path - 이동할 경로
 * @param {Object} options - 옵션
 */
export async function navigate(path, options = {}) {
    // 네비게이션 중복 방지
    if (navigationState.isNavigating) {
        logger.warn('[네비게이션] 이미 진행 중입니다.');
        return false;
    }
    
    navigationState.isNavigating = true;
    
    try {
        // 권한 확인
        const permission = checkUserPermission();
        
        // 로그인 체크
        if (!permission.isLoggedIn && !path.includes('login')) {
            showToast('로그인이 필요합니다.', 'warning');
            window.location.href = '/02.login/01_login.html';
            return false;
        }
        
        // 경로 정규화
        path = normalizePath(path);
        
        // 관리자 페이지 접근 체크
        if (path.includes('/04.admin_mode/') && !permission.isAdmin) {
            showToast('접근 권한이 없습니다.', 'error');
            return false;
        }
        
        // 로딩 표시
        if (!options.silent) {
            showLoading('페이지 이동 중...');
        }
        
        // 히스토리 저장
        navigationState.previousPath = navigationState.currentPath;
        navigationState.currentPath = path;
        navigationState.history.push({
            path,
            timestamp: new Date().toISOString()
        });
        
        // 테마 적용
        const mode = getModeFromPath(path);
        applyTheme(mode);
        
        // 페이지 이동
        window.location.href = path;
        
        return true;
        
    } catch (error) {
        logger.error('[네비게이션 오류]:', error);
        showToast('페이지 이동 중 오류가 발생했습니다.', 'error');
        return false;
        
    } finally {
        navigationState.isNavigating = false;
        hideLoading();
    }
}

/**
 * 뒤로가기
 */
export function goBack() {
    if (navigationState.previousPath) {
        navigate(navigationState.previousPath);
    } else {
        window.history.back();
    }
}

/**
 * 홈으로 이동
 */
export function goHome() {
    const permission = checkUserPermission();
    
    if (permission.isAdmin) {
        navigate(ROUTE_CONFIG.ADMIN.DASHBOARD);
    } else if (permission.isSales) {
        navigate(ROUTE_CONFIG.SALES.DASHBOARD);
    } else {
        navigate(ROUTE_CONFIG.LOGIN);
    }
}

/**
 * 로그아웃
 */
export function logout() {
    // 세션 클리어
    sessionStorage.clear();
    
    // 테마 초기화
    localStorage.removeItem('theme-mode');
    
    // 로그인 페이지로 이동
    showToast('로그아웃되었습니다.', 'info');
    window.location.href = ROUTE_CONFIG.LOGIN;
}

// ============================================
// [SECTION: 네비게이션 메뉴 생성]
// ============================================

/**
 * 사이드바 메뉴 생성
 * @param {string} currentPage - 현재 페이지
 * @returns {HTMLElement} 메뉴 요소
 */
export function createSidebarMenu(currentPage = '') {
    const permission = checkUserPermission();
    const container = document.createElement('nav');
    container.className = 'sidebar-menu';
    container.id = 'sidebar-menu';
    
    // 메뉴 아이템 정의
    const menuItems = permission.isAdmin ? [
        { title: '대시보드', path: ROUTE_CONFIG.ADMIN.DASHBOARD, icon: '📊' },
        { title: '전체거래처', path: ROUTE_CONFIG.ADMIN.ALL_COMPANIES, icon: '🏢' },
        { title: '영업보고 확인', path: ROUTE_CONFIG.ADMIN.REPORT_CONFIRM, icon: '📝' },
        { title: '프레젠테이션', path: ROUTE_CONFIG.ADMIN.PRESENTATION, icon: '📽️' },
        { title: '데이터 관리', path: ROUTE_CONFIG.ADMIN.DATA_MANAGEMENT, icon: '💾' },
        { title: '직원 관리', path: ROUTE_CONFIG.ADMIN.EMPLOYEE_MANAGEMENT, icon: '👥' },
        { title: '시스템 설정', path: ROUTE_CONFIG.ADMIN.SETTINGS, icon: '⚙️' }
    ] : [
        { title: '대시보드', path: ROUTE_CONFIG.SALES.DASHBOARD, icon: '📊' },
        { title: '나의 거래처', path: ROUTE_CONFIG.SALES.MY_COMPANIES, icon: '🏢' },
        { title: '영업보고 작성', path: ROUTE_CONFIG.SALES.REPORT_WRITE, icon: '✍️' },
        { title: '영업보고 확인', path: ROUTE_CONFIG.SALES.REPORT_CHECK, icon: '📝' },
        { title: '데이터 관리', path: ROUTE_CONFIG.SALES.DATA_MANAGEMENT, icon: '💾' },
        { title: '시스템 설정', path: ROUTE_CONFIG.SALES.SETTINGS, icon: '⚙️' }
    ];
    
    // 메뉴 헤더
    const header = document.createElement('div');
    header.className = 'sidebar-header';
    header.innerHTML = `
        <div class="user-info">
            <span class="user-name">${permission.userName || '사용자'}</span>
            <span class="user-role">${permission.userRole || '역할'}</span>
        </div>
    `;
    container.appendChild(header);
    
    // 메뉴 리스트
    const menuList = document.createElement('ul');
    menuList.className = 'sidebar-menu-list';
    
    menuItems.forEach(item => {
        const li = document.createElement('li');
        li.className = 'menu-item';
        
        // 현재 페이지 표시
        if (currentPage && item.path.includes(currentPage)) {
            li.classList.add('active');
        }
        
        const link = document.createElement('a');
        link.href = '#';
        link.className = 'menu-link';
        link.innerHTML = `
            <span class="menu-icon">${item.icon}</span>
            <span class="menu-title">${item.title}</span>
        `;
        
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navigate(item.path);
        });
        
        li.appendChild(link);
        menuList.appendChild(li);
    });
    
    container.appendChild(menuList);
    
    // 로그아웃 버튼
    const footer = document.createElement('div');
    footer.className = 'sidebar-footer';
    footer.innerHTML = `
        <button class="logout-btn" onclick="logout()">
            <span>🚪</span> 로그아웃
        </button>
    `;
    container.appendChild(footer);
    
    return container;
}

/**
 * 상단 네비게이션 바 생성
 * @param {Object} options - 옵션
 * @returns {HTMLElement} 네비게이션 바
 */
export function createTopNavBar(options = {}) {
    const permission = checkUserPermission();
    const container = document.createElement('header');
    container.className = 'top-navbar';
    container.id = 'top-navbar';
    
    // 로고 영역
    const logo = document.createElement('div');
    logo.className = 'navbar-logo';
    logo.innerHTML = `
        <img src="/assets/logo.png" alt="KUWOTECH" onerror="this.style.display='none'">
        <span>KUWOTECH 영업관리</span>
    `;
    logo.addEventListener('click', goHome);
    container.appendChild(logo);
    
    // 중앙 타이틀
    if (options.title) {
        const title = document.createElement('div');
        title.className = 'navbar-title';
        title.textContent = options.title;
        container.appendChild(title);
    }
    
    // 우측 메뉴
    const rightMenu = document.createElement('div');
    rightMenu.className = 'navbar-right';
    rightMenu.innerHTML = `
        <span class="user-welcome">안녕하세요, ${permission.userName}님</span>
        <button class="nav-btn home-btn" title="홈">🏠</button>
        <button class="nav-btn back-btn" title="뒤로가기">⬅️</button>
        <button class="nav-btn logout-btn" title="로그아웃">🚪</button>
    `;
    
    // 이벤트 리스너
    rightMenu.querySelector('.home-btn').addEventListener('click', goHome);
    rightMenu.querySelector('.back-btn').addEventListener('click', goBack);
    rightMenu.querySelector('.logout-btn').addEventListener('click', logout);
    
    container.appendChild(rightMenu);
    
    return container;
}

// ============================================
// [SECTION: 브레드크럼]
// ============================================

/**
 * 브레드크럼 생성
 * @param {Array} items - 브레드크럼 아이템
 * @returns {HTMLElement} 브레드크럼
 */
export function createBreadcrumb(items = []) {
    const container = document.createElement('nav');
    container.className = 'breadcrumb';
    container.setAttribute('aria-label', 'breadcrumb');
    
    const ol = document.createElement('ol');
    ol.className = 'breadcrumb-list';
    
    items.forEach((item, index) => {
        const li = document.createElement('li');
        li.className = 'breadcrumb-item';
        
        if (index === items.length - 1) {
            // 현재 페이지
            li.classList.add('active');
            li.setAttribute('aria-current', 'page');
            li.textContent = item.title;
        } else {
            // 링크
            const link = document.createElement('a');
            link.href = '#';
            link.textContent = item.title;
            link.addEventListener('click', (e) => {
                e.preventDefault();
                if (item.path) navigate(item.path);
            });
            li.appendChild(link);
        }
        
        ol.appendChild(li);
        
        // 구분자
        if (index < items.length - 1) {
            const separator = document.createElement('span');
            separator.className = 'breadcrumb-separator';
            separator.textContent = ' > ';
            ol.appendChild(separator);
        }
    });
    
    container.appendChild(ol);
    return container;
}

// ============================================
// [SECTION: 초기화]
// ============================================

/**
 * 네비게이션 시스템 초기화
 * @param {Object} options - 옵션
 */
export function initNavigation(options = {}) {
    // 현재 경로 저장
    navigationState.currentPath = window.location.pathname;
    
    // 네비게이션 이벤트 리스너
    window.addEventListener('popstate', (e) => {
        if (e.state && e.state.path) {
            navigate(e.state.path, { silent: true });
        }
    });
    
    // 전역 함수 등록
    window.navigation = {
        navigate,
        goBack,
        goHome,
        logout,
        checkUserPermission
    };
    
    logger.debug('[네비게이션] 시스템 초기화 완료');
}

// 페이지 로드 시 자동 초기화
if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', initNavigation);
}

// ============================================
// 기본 내보내기
// ============================================

export default {
    navigate,
    goBack,
    goHome,
    logout,
    checkUserPermission,
    createSidebarMenu,
    createTopNavBar,
    createBreadcrumb,
    initNavigation
};

// [내용: 네비게이션 시스템]
// 테스트 계획: 파일 간 이동, 권한 체크, 메뉴 생성
// #네비게이션 #라우팅