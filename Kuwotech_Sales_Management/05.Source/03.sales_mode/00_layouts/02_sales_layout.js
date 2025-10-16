/**
 * ============================================
 * KUWOTECH 영업관리 시스템 - 영업담당모드 레이아웃
 * 파일: 02_sales_layout.js
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

import logger from '../../01.common/23_logger.js';

// ErrorHandler 임포트
import errorHandler, { AuthError, PermissionError, NotFoundError, ValidationError } from '../../01.common/24_error_handler.js';

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

// 페이지 파일 매핑 (정확한 경로 - 실제 폴더 구조에 맞게 수정)
const pageFileMap = {
    'dashboard': { 
        folder: '01_dashboard', 
        file: '01_dashboard',
        script: '02_dashboard.js'
    },
    'my-companies': {
        folder: '02_my_companies',
        file: '01_my_companies',
        script: '02_my_companies.js'
    },
    'company-data-management': {
        folder: '07_company_data_management',
        file: '01_company_data_management',
        script: '02_company_data_management.js'
    },
    'report-write': {
        folder: '03_report_write',
        file: '01_report_write',
        script: '02_report_write.js'
    },
    'report-check': {
        folder: '04_report_check',  // 수정: 05 -> 04
        file: '01_report_check',
        script: '02_report_check.js'
    },
    'admin-feedback': {
        folder: '05_admin_feedback',
        file: '01_admin_feedback',
        script: '02_admin_feedback.js'
    },
    'customer-news': {
        folder: '05_customer_news',
        file: '01_customer_news',
        script: '02_customer_news.js'
    },
    'admin-comments': {
        folder: '06_admin_comments',
        file: '01_admin_comments',
        script: '02_admin_comments.js'
    },
    'system-settings': {
        folder: '06_system_settings',  // 수정: 07 -> 06
        file: '01_settings',
        script: '02_settings.js'
    }
};

// ============================================
// [SECTION: 초기화 함수]
// ============================================

async function initSalesMode() {
    try {
        
        // 1. 사용자 인증 확인 - 여러 소스에서 시도
        let userJson = sessionStorage.getItem('user');
        
        // sessionStorage에 없으면 localStorage에서도 확인
        if (!userJson) {
            const loginData = localStorage.getItem('loginData');
            if (loginData) {
                try {
                    const data = JSON.parse(loginData);
                    if (data.user) {
                        userJson = JSON.stringify(data.user);
                        sessionStorage.setItem('user', userJson);  // sessionStorage에도 저장
                    }
                } catch (e) {
                    await errorHandler.handle(
                        new AuthError('로그인 데이터 파싱 실패', e, {
                            userMessage: '로그인 정보를 확인할 수 없습니다.',
                            context: {
                                module: 'sales_layout',
                                action: 'initSalesMode',
                                source: 'localStorage'
                            },
                            severity: 'MEDIUM'
                        }),
                        { showToUser: false }
                    );
                }
            }
        }
        
        if (!userJson) {
            await errorHandler.handle(
                new AuthError('사용자 정보 없음', null, {
                    userMessage: '로그인이 필요합니다.',
                    context: {
                        module: 'sales_layout',
                        action: 'initSalesMode',
                        redirect: true
                    },
                    severity: 'HIGH'
                }),
                { showToUser: false }
            );
            window.location.href = '../../02.login/01_login.html';
            return;
        }
        
        try {
            user = JSON.parse(userJson);
            
            // 사용자 이름이 없는 경우 localStorage에서 시도
            if (!user.name) {
                const savedName = localStorage.getItem('userName');
                if (savedName) {
                    user.name = savedName;
                } else {
                    user.name = '사용자';  // 기본값
                    logger.warn('[영업모드] 사용자 이름 없음 - 기본값 사용');
                }
            }
        } catch (error) {
            await errorHandler.handle(
                new AuthError('사용자 정보 파싱 실패', error, {
                    userMessage: '로그인 정보가 손상되었습니다. 다시 로그인해주세요.',
                    context: {
                        module: 'sales_layout',
                        action: 'initSalesMode',
                        userJson
                    },
                    severity: 'HIGH'
                }),
                { showToUser: false }
            );
            window.location.href = '../../02.login/01_login.html';
            return;
        }
        
        // 역할 확인 ("영업담당" 또는 "관리자" 한글로 체크)
        if (user.role !== '영업담당' && user.role !== '관리자') {
            await errorHandler.handle(
                new PermissionError('영업모드 권한 없음', null, {
                    userMessage: '영업모드 접근 권한이 없습니다.',
                    context: {
                        module: 'sales_layout',
                        action: 'initSalesMode',
                        userRole: user.role,
                        requiredRoles: ['영업담당', '관리자']
                    },
                    severity: 'HIGH'
                }),
                { showToUser: true }
            );
            setTimeout(() => {
                window.location.href = '../../02.login/01_login.html';
            }, 2000);
            return;
        }
        
        
        // 2. 사용자 정보 표시
        
        const userGreeting = document.getElementById('user-greeting');
        if (userGreeting) {
            const roleText = user.role === '관리자' ? '관리자' : '영업담당';
            const userName = user.name || '사용자';
            // 이름만 span으로 감싸서 스타일 적용
            userGreeting.innerHTML = `${roleText} <span class="user-name-highlight">${userName}</span>님 수고하십니다.`;
        } else {
            // UI 요소 누락은 로그만 남기고 계속 진행 (치명적이지 않음)
            logger.warn('[UI] user-greeting 요소를 찾을 수 없습니다!');
        }
        
        // 3. 공통 모듈 초기화
        await initCommonModules({
            theme: 'sales',
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

        // 7. 햄버거 메뉴 토글 설정 (모바일)
        setupMobileMenuToggle();

        // 8. 글로벌 이벤트 설정
        setupGlobalEvents(loadPage, { value: isInitialized }, { isAdmin: false, user: user });
        
        // 8. 세션 모니터링 시작
        startSessionMonitoring();
        
        // 9. URL 파라미터 확인 후 초기 페이지 로드
        const urlParams = new URLSearchParams(window.location.search);
        const targetPage = urlParams.get('page') || 'dashboard';
        
        // 초기 페이지에 맞는 메뉴 활성화
        activateMenu(targetPage);
        
        await loadPage(targetPage);

        isInitialized = true;

        // 환영 메시지
        showToast(`안녕하세요, ${user.name}님! 영업관리 시스템에 오신 것을 환영합니다.`, 'success');

        // 읽지 않은 관리자 의견 확인 (영업담당만, 최초 로그인 시 1회만)
        // 세션 스토리지에 체크 완료 플래그가 없으면 실행
        if (user.role === '영업담당' && !sessionStorage.getItem('commentsChecked')) {
            sessionStorage.setItem('commentsChecked', 'true');
            await checkUnreadComments();
        }

    } catch (error) {
        await errorHandler.handle(
            new AuthError('영업모드 초기화 실패', error, {
                userMessage: '시스템 초기화 중 오류가 발생했습니다.',
                context: {
                    module: 'sales_layout',
                    action: 'initSalesMode',
                    user: user?.name
                },
                severity: 'CRITICAL'
            }),
            { showToUser: true }
        );
    }
}

// ============================================
// [SECTION: 햄버거 메뉴 토글 (모바일 전용)]
// ============================================

/**
 * 모바일 햄버거 메뉴 토글 기능 설정
 */
function setupMobileMenuToggle() {
    const mobileMenuBtn = document.getElementById('mobile-menu-toggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    if (!mobileMenuBtn || !sidebar || !overlay) {
        logger.warn('[모바일 메뉴] 햄버거 메뉴 요소를 찾을 수 없습니다.');
        return;
    }

    // 햄버거 버튼 클릭 이벤트
    mobileMenuBtn.addEventListener('click', () => {
        const isOpen = sidebar.classList.contains('open');

        if (isOpen) {
            // 사이드바 닫기
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
            mobileMenuBtn.classList.remove('active');
        } else {
            // 사이드바 열기
            sidebar.classList.add('open');
            overlay.classList.add('active');
            mobileMenuBtn.classList.add('active');
        }

    });

    // 오버레이 클릭 시 사이드바 닫기
    overlay.addEventListener('click', () => {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
        mobileMenuBtn.classList.remove('active');
    });

    // 윈도우 리사이즈 시 데스크톱 뷰로 전환되면 사이드바/오버레이 자동 닫기
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            if (window.innerWidth > 768) {
                // 데스크톱 뷰 - 모바일 메뉴 상태 초기화
                sidebar.classList.remove('open');
                overlay.classList.remove('active');
                mobileMenuBtn.classList.remove('active');
            }
        }, 250);
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
        
        
        // HTML 로드
        const response = await fetch(htmlPath);
        
        if (!response.ok) {
            // 대체 경로 시도
            const altPath = `../${mapping.folder}/01_${page.replace(/-/g, '_')}.html`;
            const altResponse = await fetch(altPath);
            
            if (!altResponse.ok) {
                throw new Error(`페이지를 찾을 수 없습니다: ${page}`);
            }
            
            const html = await altResponse.text();
            await renderPage(mainContent, html, mapping, page);
        } else {
            const html = await response.text();
            await renderPage(mainContent, html, mapping, page);
        }
        
        // URL 업데이트 (히스토리 관리)
        const newUrl = `${window.location.pathname}?page=${page}`;
        window.history.pushState({ page }, '', newUrl);
        
        hideLoading();
        
    } catch (error) {
        await errorHandler.handle(
            new NotFoundError(`페이지 로드 실패: ${page}`, error, {
                userMessage: '페이지를 불러올 수 없습니다.',
                context: {
                    module: 'sales_layout',
                    action: 'loadPage',
                    page,
                    mapping: pageFileMap[page]
                },
                severity: 'MEDIUM'
            }),
            { showToUser: true }
        );
        hideLoading();

        // 에러 페이지 표시
        showErrorPage(error.message);
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
                    resolve();
                };
                script.onerror = () => {
                    logger.warn(`[스크립트 로드 실패] ${scriptPath}`);
                    resolve(); // 스크립트 없어도 계속 진행
                };
                document.body.appendChild(script);
            });
        } catch (error) {
            logger.warn(`[스크립트 로드 오류] ${scriptPath}:`, error);
        }
    }
    
    // 페이드 인 효과
    container.style.opacity = '1';
    
    // 페이지 로드 이벤트 발생
    window.dispatchEvent(new CustomEvent('pageLoaded', { 
        detail: { 
            page, 
            folder: mapping.folder,
            user: user 
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
// [SECTION: 읽지 않은 관리자 의견 확인]
// ============================================

/**
 * 읽지 않은 관리자 의견 확인 및 알림
 */
async function checkUnreadComments() {
    try {
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        if (!token) {
            logger.warn('[관리자 의견] 토큰이 없어 의견 확인을 건너뜁니다.');
            return;
        }

        // API 호출하여 읽지 않은 의견 확인
        const API_BASE_URL = GlobalConfig.API_BASE_URL || 'https://kuwotech-sales-production-aa64.up.railway.app';
        const response = await fetch(`${API_BASE_URL}/api/customer-news/my-news-with-comments`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            logger.warn('[관리자 의견] API 호출 실패:', response.status);
            return;
        }

        const data = await response.json();
        const newsData = data.news || [];

        // 읽지 않은 의견 개수 계산
        let unreadCount = 0;
        newsData.forEach(news => {
            const comments = news.comments || [];
            unreadCount += comments.filter(c => !c.is_read_by_writer).length;
        });

        if (unreadCount === 0) {
            logger.info('[관리자 의견] 읽지 않은 의견이 없습니다.');
            return;
        }

        // 읽지 않은 의견이 있으면 모달 표시
        showUnreadCommentsModal(unreadCount);

    } catch (error) {
        logger.error('[관리자 의견] 확인 오류:', error);
        // 오류가 발생해도 로그인 프로세스는 계속 진행
    }
}

/**
 * 읽지 않은 의견 모달 표시
 */
function showUnreadCommentsModal(count) {
    const modalConfig = {
        title: '🔔 새로운 관리자 의견이 있습니다',
        message: `
            <div style="text-align: center; padding: 20px 0;">
                <div style="font-size: 48px; margin-bottom: 20px;">💬</div>
                <p style="font-size: 18px; font-weight: 600; margin-bottom: 10px;">
                    읽지 않은 관리자 의견이 <span style="color: #ef4444; font-size: 24px;">${count}개</span> 있습니다.
                </p>
                <p style="color: var(--text-secondary); margin-top: 10px;">
                    관리자가 작성한 고객소식에 대한 의견을 확인해보세요.
                </p>
            </div>
        `,
        confirmText: '지금 확인하기',
        cancelText: '나중에 확인',
        type: 'info',
        onConfirm: () => {
            // "관리자 의견 확인" 페이지로 이동
            navigateToAdminComments();
        },
        onCancel: () => {
            logger.info('[관리자 의견] 사용자가 나중에 확인을 선택했습니다.');
        }
    };

    showModal(modalConfig);
}

/**
 * 관리자 의견 확인 페이지로 이동
 */
function navigateToAdminComments() {
    // 관리자 의견 확인 페이지가 pageFileMap에 등록되어 있는지 확인
    const adminCommentsPage = 'admin-comments';

    if (pageFileMap[adminCommentsPage]) {
        // 페이지 매핑이 있으면 navigateTo 사용
        navigateTo(adminCommentsPage);
    } else {
        // 페이지 매핑이 없으면 직접 이동
        window.location.href = '../06_admin_comments/01_admin_comments.html';
    }
}

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
        await errorHandler.handle(
            new ValidationError(`알 수 없는 페이지: ${page}`, null, {
                userMessage: '요청하신 페이지를 찾을 수 없습니다.',
                context: {
                    module: 'sales_layout',
                    action: 'navigateTo',
                    page,
                    availablePages: Object.keys(pageFileMap)
                },
                severity: 'LOW'
            }),
            { showToUser: true }
        );
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
    window.salesDebug = {
        currentPage: () => currentPage,
        user: () => user,
        pageMap: () => pageFileMap,
        navigateTo: navigateTo,
        refreshPage: refreshCurrentPage,
        sessionInfo: () => SessionManager.debugSession()
    };
    
}

// ============================================
// [SECTION: DOM 로드 시 실행]
// ============================================

if (document.readyState === 'loading') {
    // DOM이 아직 로딩 중이면 이벤트 리스너 등록
    document.addEventListener('DOMContentLoaded', initSalesMode);
} else {
    // DOM이 이미 로드되었으면 바로 실행
    initSalesMode();
}

// ============================================
// [SECTION: 파일 정보]
// ============================================

// [파일: 02_sales_layout.js]
// [설명: 수정된 영업모드 레이아웃 - 세션 관리 통일, 페이지 매핑 수정]
// [테스트: 모든 페이지 이동, 세션 관리, 에러 처리]