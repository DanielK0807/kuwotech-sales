/**
 * ============================================
 * KUWOTECH 영업관리 시스템 - 관리자모드 레이아웃 (수정판)
 * 파일: 03_admin_layout_fixed.js
 * Created by: Daniel.K
 * Date: 2025-01-27
 * 설명: 세션 관리 통일 및 페이지 매핑 수정
 * ============================================
 */

// ============================================
// [SECTION: 공통 모듈 임포트]
// ============================================

import {
    initCommonModules,
    GlobalConfig,
    showToast,
    toastManager,
    showModal,
    modalManager,
    showLoading,
    hideLoading,
    formatNumber,
    formatCurrency,
    formatPercent,
    translateToKorean,
    createLogoElement,
    updateAllLogos,
    loadFonts
} from '../../01.common/20_common_index.js';

// 세션 매니저 임포트
import sessionManager, { startSessionMonitoring, handleLogout, isAuthenticated, hasRole } from '../../01.common/16_session_manager.js';

// 레이아웃 공통 함수 임포트
import {
    activateMenu,
    checkUnsavedWork,
    showErrorPage,
    setupGlobalEvents,
    setupLogoutButton,
    setupMenuEvents
} from '../../01.common/18_layout_common.js';

// ============================================
// [SECTION: 전역 변수]
// ============================================

let currentPage = 'dashboard';
let user = null;
let isInitialized = false;

// 페이지 파일 매핑 (관리자 전용 - 실제 폴더 구조에 맞게 수정)
const pageFileMap = {
    'dashboard': { 
        folder: '01_dashboard', 
        file: '01_dashboard',
        script: '02_dashboard.js'
    },
    'all-companies': { 
        folder: '02_all_companies', 
        file: '01_all_companies',
        script: '02_all_companies.js'
    },
    'report-confirm': {
        folder: '03_report_confirm',
        file: '01_report_confirm',
        script: '02_report_confirm.js'
    },
    'presentation': {
        folder: '04_presentation',
        file: '01_presentation',
        script: '02_presentation.js'
    },
    'data-management': {
        folder: '05_data_management',
        file: '01_data_management',
        script: '02_data_management.js'
    },
    'employee-management': { 
        folder: '06_employee_management',
        file: '01_employees',
        script: '02_employees.js'
    },
    'system-settings': { 
        folder: '07_system_settings',
        file: '01_settings',
        script: '02_settings.js'
    },
    'excel-upload': { 
        folder: '08_excel_upload',
        file: '01_excel_upload',
        script: '02_excel_upload.js',
        adminOnly: true,
        specificUser: '강정환'
    }
};

// ============================================
// [SECTION: 초기화 함수]
// ============================================

async function initAdminMode() {
    try {
        console.log('========================================');
        console.log('[관리자모드] 초기화 시작');
        console.log('========================================');
        
        // 1. 사용자 인증 확인 - 여러 소스에서 시도
        let userJson = sessionStorage.getItem('user');
        
        // sessionStorage에 없으면 localStorage에서도 확인
        if (!userJson) {
            console.log('[관리자모드] sessionStorage에 user 없음, localStorage 확인');
            const loginData = localStorage.getItem('loginData');
            if (loginData) {
                try {
                    const data = JSON.parse(loginData);
                    if (data.user) {
                        userJson = JSON.stringify(data.user);
                        sessionStorage.setItem('user', userJson);  // sessionStorage에도 저장
                        console.log('[관리자모드] localStorage에서 사용자 정보 복구');
                    }
                } catch (e) {
                    console.error('[관리자모드] loginData 파싱 실패:', e);
                }
            }
        }
        
        if (!userJson) {
            console.error('[관리자모드] 사용자 정보 없음 - 로그인 페이지로 이동');
            window.location.href = '../../02.login/01_login.html';
            return;
        }
        
        try {
            user = JSON.parse(userJson);
            console.log('[관리자모드] 로드된 사용자 정보:', user);
            
            // 사용자 이름이 없는 경우 localStorage에서 시도
            if (!user.name) {
                const savedName = localStorage.getItem('userName');
                if (savedName) {
                    user.name = savedName;
                    console.log('[관리자모드] localStorage에서 이름 복구:', savedName);
                } else {
                    user.name = '사용자';  // 기본값
                    console.warn('[관리자모드] 사용자 이름 없음 - 기본값 사용');
                }
            }
        } catch (error) {
            console.error('[관리자모드] 사용자 정보 파싱 실패:', error);
            window.location.href = '../../02.login/01_login.html';
            return;
        }
        
        // 역할 확인 ("관리자" 한글로 체크)
        if (user.role !== '관리자') {
            console.error('[관리자모드] 권한 없음 - role:', user.role);
            showToast('관리자 권한이 필요합니다.', 'error');
            setTimeout(() => {
                window.location.href = '../../02.login/01_login.html';
            }, 2000);
            return;
        }
        
        console.log('[관리자모드] 권한 확인 완료 - role:', user.role);
        
        // 2. 사용자 정보 표시
        console.log('[UI] user 객체 전체:', user);
        console.log('[UI] user.name 값:', user.name);
        
        const userGreeting = document.getElementById('user-greeting');
        if (userGreeting) {
            const userName = user.name || '사용자';
            // 이름만 span으로 감싸서 스타일 적용
            userGreeting.innerHTML = `관리자 <span class="user-name-highlight">${userName}</span>님 수고하십니다.`;
            console.log(`[UI] 헤더 사용자 정보 표시: 관리자 ${userName}님 수고하십니다.`);
            console.log('[UI] userGreeting 요소:', userGreeting);
            console.log('[UI] userGreeting.textContent:', userGreeting.textContent);
        } else {
            console.error('[UI] user-greeting 요소를 찾을 수 없습니다!');
        }
        
        // 3. 공통 모듈 초기화 (관리자 테마)
        await initCommonModules({
            theme: 'admin',  // 관리자 테마
            logoFont: true,
            fonts: true,
            logo: true,
            favicon: true,
            clock: false,  // 직접 초기화할 것이므로 false
            modal: true,
            toast: true,
            scrollbar: true,
            navigation: false,
            terms: true,
            utils: true,
            design: true
        });
        
        // 시계 직접 초기화
        const { startClock } = await import('../../01.common/05_clock.js');
        startClock('current-time');
        
        // 4. 로고 삽입
        const logoContainer = document.getElementById('header-logo-container');
        if (logoContainer) {
            const logo = createLogoElement({
                className: 'logo',
                height: 40
            });
            logoContainer.appendChild(logo);
        }
        
        // 5. 메뉴 이벤트 설정
        setupMenuEvents(loadPage, { value: currentPage });

        // 6. 로그아웃 버튼 설정
        setupLogoutButton(handleLogout, showToast, user);

        // 7. 글로벌 이벤트 설정
        setupGlobalEvents(loadPage, { value: isInitialized }, { isAdmin: true, user: user });
        
        // 8. 세션 모니터링 시작
        startSessionMonitoring();
        
        // 9. 관리자 전용 기능 초기화
        await initAdminFeatures();
        
        // 10. URL 파라미터 확인 후 초기 페이지 로드
        const urlParams = new URLSearchParams(window.location.search);
        const targetPage = urlParams.get('page') || 'dashboard';
        
        // 초기 페이지에 맞는 메뉴 활성화
        activateMenu(targetPage);
        
        await loadPage(targetPage);
        
        isInitialized = true;
        console.log('[관리자모드] 초기화 완료');
        
        // 환영 메시지
        showToast(`안녕하세요, ${user.name}님! 관리자 모드입니다.`, 'success');
        
    } catch (error) {
        console.error('[관리자모드] 초기화 실패:', error);
        showToast('시스템 초기화 중 오류가 발생했습니다.', 'error');
    }
}

// ============================================
// [SECTION: 강정환 관리자 전용 메뉴]
// ============================================

/**
 * 강정환 관리자 전용 엑셀 업로드 메뉴 표시
 */
function showExcelUploadMenu() {
    console.log('[메뉴 표시] 강정환 관리자 전용 엑셀 업로드 메뉴 표시');
    
    const excelMenu = document.getElementById('excel-upload-menu');
    if (!excelMenu) {
        console.error('[메뉴 표시] excel-upload-menu 요소를 찾을 수 없습니다.');
        return;
    }
    
    // 메뉴 표시
    excelMenu.style.display = 'flex';
    
    console.log('[메뉴 표시] 엑셀 업로드 메뉴 표시 완료');
}

// ============================================
// [SECTION: 관리자 전용 기능]
// ============================================

async function initAdminFeatures() {
    // 강정환 관리자 전용 메뉴 표시
    if (user && user.name === '강정환') {
        showExcelUploadMenu();
    }
    
    // 관리자 알림 설정
    setupAdminNotifications();
    
    // 시스템 모니터링
    setupSystemMonitoring();
    
    // 단축키 설정
    setupAdminShortcuts();
}

/**
 * 관리자 알림 설정
 */
function setupAdminNotifications() {
    // 새로운 보고서 알림
    window.addEventListener('newReport', (e) => {
        showToast(`새로운 보고서가 등록되었습니다: ${e.detail.title}`, 'info');
    });
    
    // 시스템 이벤트 알림
    window.addEventListener('systemEvent', (e) => {
        if (e.detail.type === 'warning') {
            showToast(e.detail.message, 'warning');
        }
    });
}

/**
 * 시스템 모니터링
 */
function setupSystemMonitoring() {
    // 성능 모니터링
    if (window.performance && window.performance.memory) {
        setInterval(() => {
            const memUsage = window.performance.memory.usedJSHeapSize / 1048576;
            if (memUsage > 100) {
                console.warn(`[시스템] 메모리 사용량 높음: ${memUsage.toFixed(2)} MB`);
            }
        }, 30000); // 30초마다 체크
    }
}

/**
 * 관리자 단축키
 */
function setupAdminShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl + Shift + D: 대시보드
        if (e.ctrlKey && e.shiftKey && e.key === 'D') {
            e.preventDefault();
            navigateTo('dashboard');
        }
        // Ctrl + Shift + E: 직원관리
        else if (e.ctrlKey && e.shiftKey && e.key === 'E') {
            e.preventDefault();
            navigateTo('employee-management');
        }
        // Ctrl + Shift + R: 보고서 확인
        else if (e.ctrlKey && e.shiftKey && e.key === 'R') {
            e.preventDefault();
            navigateTo('report-confirm');
        }
    });
}

// ============================================
// [SECTION: 메뉴 이벤트 설정]
// ============================================
// → 18_layout_common.js에서 import

// ============================================
// [SECTION: 페이지 로드 함수]
// ============================================

async function loadPage(page) {
    try {
        // 페이지 매핑 확인
        const mapping = pageFileMap[page];
        if (!mapping) {
            throw new Error(`알 수 없는 페이지: ${page}`);
        }
        
        showLoading('페이지 로딩 중...');
        
        // 현재 페이지 업데이트
        currentPage = page;
        
        // 페이지 로드 시 메뉴 활성화 (중요!)
        activateMenu(page);
        
        // 메인 콘텐츠 영역
        const mainContent = document.getElementById('main-content');
        if (!mainContent) {
            throw new Error('메인 콘텐츠 영역을 찾을 수 없습니다.');
        }
        
        // HTML 파일 경로
        const htmlPath = `../${mapping.folder}/${mapping.file}.html`;
        
        console.log(`[페이지 로드] ${page} - ${htmlPath}`);
        
        // HTML 로드
        const response = await fetch(htmlPath);
        
        if (!response.ok) {
            throw new Error(`페이지를 찾을 수 없습니다: ${page}`);
        }
        
        const html = await response.text();
        await renderPage(mainContent, html, mapping, page);
        
        // URL 업데이트 (히스토리 관리)
        const newUrl = `${window.location.pathname}?page=${page}`;
        window.history.pushState({ page }, '', newUrl);
        
        // 페이지별 권한 체크
        checkPagePermissions(page);
        
        hideLoading();
        
    } catch (error) {
        console.error(`[페이지 로드 실패] ${page}:`, error);
        hideLoading();
        
        // 에러 페이지 표시
        showErrorPage(error.message);
        showToast('페이지를 불러올 수 없습니다.', 'error');
    }
}

/**
 * 페이지별 권한 체크
 */
function checkPagePermissions(page) {
    // 특정 페이지에 대한 추가 권한 체크
    const restrictedPages = ['employee-management', 'system-settings'];
    
    if (restrictedPages.includes(page)) {
        console.log(`[권한 체크] ${page} - 관리자 전용 페이지`);
    }
}

/**
 * 페이지 렌더링
 */
async function renderPage(container, html, mapping, page) {
    // 페이드 아웃 효과
    container.style.opacity = '0';
    container.style.transition = 'opacity 0.3s ease';
    
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // HTML 삽입
    container.innerHTML = html;
    
    // 기존 페이지 스크립트 제거
    const existingScript = document.querySelector(`script[data-page="${page}"]`);
    if (existingScript) {
        existingScript.remove();
    }
    
    // 새 페이지 스크립트 로드 (있는 경우)
    if (mapping.script) {
        const scriptPath = `../${mapping.folder}/${mapping.script}`;
        
        try {
            const script = document.createElement('script');
            script.type = 'module';
            script.src = scriptPath;
            script.dataset.page = page;
            
            await new Promise((resolve, reject) => {
                script.onload = () => {
                    console.log(`[스크립트 로드 완료] ${scriptPath}`);
                    resolve();
                };
                script.onerror = () => {
                    console.warn(`[스크립트 로드 실패] ${scriptPath}`);
                    resolve(); // 스크립트 없어도 계속 진행
                };
                document.body.appendChild(script);
            });
        } catch (error) {
            console.warn(`[스크립트 로드 오류] ${scriptPath}:`, error);
        }
    }
    
    // 페이드 인 효과
    container.style.opacity = '1';
    
    // 페이지 로드 이벤트 발생
    window.dispatchEvent(new CustomEvent('pageLoaded', { 
        detail: { 
            page, 
            folder: mapping.folder,
            user: user,
            isAdmin: true
        } 
    }));
    
    // 세션 활동 업데이트
    sessionManager.updateActivity();
}

// showErrorPage → 18_layout_common.js에서 import

// ============================================
// [SECTION: 로그아웃 설정]
// ============================================
// → 18_layout_common.js에서 import

// ============================================
// [SECTION: 글로벌 이벤트]
// ============================================
// → 18_layout_common.js에서 import (setupGlobalEvents, checkUnsavedWork)

// ============================================
// [SECTION: 유틸리티 함수]
// ============================================
// activateMenu → 18_layout_common.js에서 import 및 re-export

/**
 * 페이지 새로고침
 */
export async function refreshCurrentPage() {
    if (currentPage) {
        await loadPage(currentPage);
    }
}

/**
 * 다른 페이지로 이동
 * @param {string} page - 이동할 페이지
 */
export async function navigateTo(page) {
    if (pageFileMap[page]) {
        activateMenu(page);
        await loadPage(page);
    } else {
        console.error(`[네비게이션 오류] 알 수 없는 페이지: ${page}`);
    }
}

// ============================================
// [SECTION: 내보내기]
// ============================================

export {
    currentPage,
    user,
    loadPage,
    pageFileMap,
    activateMenu  // re-export from 18_layout_common.js
};

// ============================================
// [SECTION: 전역 로그아웃 함수]
// ============================================
// → 18_layout_common.js의 setupLogoutButton 사용 (confirm 기반)

// ============================================
// [SECTION: 개발 모드 헬퍼]
// ============================================

if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.adminDebug = {
        currentPage: () => currentPage,
        user: () => user,
        pageMap: () => pageFileMap,
        navigateTo: navigateTo,
        refreshPage: refreshCurrentPage,
        sessionInfo: () => SessionManager.debugSession(),
        // 관리자 전용
        simulateReport: () => {
            window.dispatchEvent(new CustomEvent('newReport', {
                detail: { title: '테스트 보고서' }
            }));
        },
        systemEvent: (type, message) => {
            window.dispatchEvent(new CustomEvent('systemEvent', {
                detail: { type, message }
            }));
        }
    };
    
    console.log('[관리자모드] 디버그 명령어:');
    console.log('- adminDebug.currentPage()');
    console.log('- adminDebug.user()');
    console.log('- adminDebug.pageMap()');
    console.log('- adminDebug.navigateTo("dashboard")');
    console.log('- adminDebug.refreshPage()');
    console.log('- adminDebug.sessionInfo()');
    console.log('- adminDebug.simulateReport()');
    console.log('- adminDebug.systemEvent("warning", "테스트 경고")');
}

// ============================================
// [SECTION: DOM 로드 시 실행 - readyState 체크]
// ============================================

if (document.readyState === 'loading') {
    // DOM이 아직 로딩 중이면 이벤트 리스너 등록
    document.addEventListener('DOMContentLoaded', initAdminMode);
    console.log('[관리자모드] DOMContentLoaded 이벤트 리스너 등록 완료');
} else {
    // DOM이 이미 로드되었으면 바로 실행
    console.log('[관리자모드] DOM 이미 로드됨 - 초기화 함수 바로 실행');
    initAdminMode();
}

// ============================================
// [SECTION: 파일 정보]
// ============================================

// [파일: 02_admin_layout.js]
// [설명: 수정된 관리자모드 레이아웃 - 세션 관리 통일, 페이지 매핑 수정, 권한 체크]
// [테스트: 모든 페이지 이동, 권한 관리, 관리자 전용 기능]