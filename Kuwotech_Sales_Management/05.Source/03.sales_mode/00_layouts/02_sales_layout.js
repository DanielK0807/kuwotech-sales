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

// 세션 매니저 임포트
import sessionManager, { startSessionMonitoring, handleLogout, isAuthenticated, hasRole } from '../../01.common/16_session_manager.js';

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
        console.log('========================================');
        console.log('[영업모드] 초기화 시작');
        console.log('========================================');
        
        // 1. 사용자 인증 확인 - 여러 소스에서 시도
        let userJson = sessionStorage.getItem('user');
        
        // sessionStorage에 없으면 localStorage에서도 확인
        if (!userJson) {
            console.log('[영업모드] sessionStorage에 user 없음, localStorage 확인');
            const loginData = localStorage.getItem('loginData');
            if (loginData) {
                try {
                    const data = JSON.parse(loginData);
                    if (data.user) {
                        userJson = JSON.stringify(data.user);
                        sessionStorage.setItem('user', userJson);  // sessionStorage에도 저장
                        console.log('[영업모드] localStorage에서 사용자 정보 복구');
                    }
                } catch (e) {
                    console.error('[영업모드] loginData 파싱 실패:', e);
                }
            }
        }
        
        if (!userJson) {
            console.error('[영업모드] 사용자 정보 없음 - 로그인 페이지로 이동');
            window.location.href = '../../02.login/01_login.html';
            return;
        }
        
        try {
            user = JSON.parse(userJson);
            console.log('[영업모드] 로드된 사용자 정보:', user);
            
            // 사용자 이름이 없는 경우 localStorage에서 시도
            if (!user.name) {
                const savedName = localStorage.getItem('userName');
                if (savedName) {
                    user.name = savedName;
                    console.log('[영업모드] localStorage에서 이름 복구:', savedName);
                } else {
                    user.name = '사용자';  // 기본값
                    console.warn('[영업모드] 사용자 이름 없음 - 기본값 사용');
                }
            }
        } catch (error) {
            console.error('[영업모드] 사용자 정보 파싱 실패:', error);
            window.location.href = '../../02.login/01_login.html';
            return;
        }
        
        // 역할 확인 ("영업담당" 또는 "관리자" 한글로 체크)
        if (user.role !== '영업담당' && user.role !== '관리자') {
            console.error('[영업모드] 권한 없음 - role:', user.role);
            showToast('영업모드 접근 권한이 없습니다.', 'error');
            setTimeout(() => {
                window.location.href = '../../02.login/01_login.html';
            }, 2000);
            return;
        }
        
        console.log('[영업모드] 권한 확인 완료 - role:', user.role);
        
        // 2. 사용자 정보 표시
        console.log('[UI] user 객체 전체:', user);
        console.log('[UI] user.name 값:', user.name);
        
        const userGreeting = document.getElementById('user-greeting');
        if (userGreeting) {
            const roleText = user.role === '관리자' ? '관리자' : '영업담당';
            const userName = user.name || '사용자';
            // 이름만 span으로 감싸서 스타일 적용
            userGreeting.innerHTML = `${roleText} <span class="user-name-highlight">${userName}</span>님 수고하십니다.`;
            console.log(`[UI] 헤더 사용자 정보 표시: ${roleText} ${userName}님 수고하십니다.`);
            console.log('[UI] userGreeting 요소:', userGreeting);
            console.log('[UI] userGreeting.textContent:', userGreeting.textContent);
        } else {
            console.error('[UI] user-greeting 요소를 찾을 수 없습니다!');
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
        setupMenuEvents();
        
        // 6. 로그아웃 버튼 설정
        setupLogoutButton();
        
        // 7. 글로벌 이벤트 설정
        setupGlobalEvents();
        
        // 8. 세션 모니터링 시작
        startSessionMonitoring();
        
        // 9. URL 파라미터 확인 후 초기 페이지 로드
        const urlParams = new URLSearchParams(window.location.search);
        const targetPage = urlParams.get('page') || 'dashboard';
        
        // 초기 페이지에 맞는 메뉴 활성화
        activateMenu(targetPage);
        
        await loadPage(targetPage);
        
        isInitialized = true;
        console.log('[영업모드] 초기화 완료');
        
        // 환영 메시지
        showToast(`안녕하세요, ${user.name}님! 영업관리 시스템에 오신 것을 환영합니다.`, 'success');
        
    } catch (error) {
        console.error('[영업모드] 초기화 실패:', error);
        showToast('시스템 초기화 중 오류가 발생했습니다.', 'error');
    }
}

// ============================================
// [SECTION: 메뉴 이벤트 설정]
// ============================================

function setupMenuEvents() {
    const menuItems = document.querySelectorAll('.menu-item');
    
    menuItems.forEach(item => {
        item.addEventListener('click', async (e) => {
            e.preventDefault();
            
            const page = item.dataset.page;
            
            // 이미 활성화된 메뉴면 무시
            if (item.classList.contains('active') && currentPage === page) {
                return;
            }
            
            // 활성 메뉴 변경
            menuItems.forEach(m => m.classList.remove('active'));
            item.classList.add('active');
            
            // 페이지 로드
            await loadPage(page);
        });
        
        // 키보드 접근성
        item.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                item.click();
            }
        });
    });
}

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
        console.error(`[페이지 로드 실패] ${page}:`, error);
        hideLoading();
        
        // 에러 페이지 표시
        showErrorPage(error.message);
        showToast('페이지를 불러올 수 없습니다.', 'error');
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
            user: user 
        } 
    }));
    
    // 세션 활동 업데이트
    sessionManager.updateActivity();
}

/**
 * 에러 페이지 표시
 */
function showErrorPage(message) {
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
        mainContent.innerHTML = `
            <div class="error-container glass-card" style="
                max-width: 600px;
                margin: 100px auto;
                padding: 40px;
                text-align: center;
            ">
                <h2 style="color: #ff6b6b; margin-bottom: 20px;">
                    ⚠️ 페이지 로드 오류
                </h2>
                <p style="color: #ffffff; margin-bottom: 30px;">
                    ${message}
                </p>
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button class="btn btn-glass" onclick="location.reload()">
                        새로고침
                    </button>
                    <button class="btn btn-glass" onclick="history.back()">
                        이전 페이지
                    </button>
                </div>
            </div>
        `;
    }
}

// ============================================
// [SECTION: 로그아웃 설정]
// ============================================

function setupLogoutButton() {
    const logoutBtn = document.getElementById('logout-btn');
    
    console.log('[로그아웃 버튼] 설정 시작, 버튼 요소:', logoutBtn);
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            console.log('[로그아웃 버튼] 클릭됨');
            
            // 간단한 confirm 사용
            const confirmed = confirm('정말 로그아웃 하시겠습니까?');
            
            console.log('[로그아웃 확인]:', confirmed);
            
            if (confirmed) {
                console.log('[로그아웃] 처리 시작');
                showToast('로그아웃 중...', 'info');
                
                setTimeout(() => {
                    handleLogout(); // 세션 매니저의 로그아웃 처리
                }, 500);
            }
        });
        
        console.log('[로그아웃 버튼] 이벤트 리스너 등록 완료');
    } else {
        console.error('[로그아웃 버튼] 버튼 요소를 찾을 수 없습니다!');
    }
}

// ============================================
// [SECTION: 글로벌 이벤트]
// ============================================

function setupGlobalEvents() {
    // 브라우저 뒤로가기 처리
    window.addEventListener('popstate', (e) => {
        if (e.state && e.state.page) {
            // 메뉴 활성화 상태 업데이트
            const menuItems = document.querySelectorAll('.menu-item');
            menuItems.forEach(item => {
                if (item.dataset.page === e.state.page) {
                    item.classList.add('active');
                } else {
                    item.classList.remove('active');
                }
            });
            
            // 페이지 로드
            loadPage(e.state.page);
        }
    });
    
    // 새로고침 시 확인
    window.addEventListener('beforeunload', (e) => {
        if (isInitialized) {
            // 작업 중인 내용 확인
            const hasUnsavedWork = checkUnsavedWork();
            if (hasUnsavedWork) {
                e.preventDefault();
                e.returnValue = '작업 중인 내용이 저장되지 않을 수 있습니다.';
            }
        }
    });
    
    // 네트워크 상태 감지
    window.addEventListener('online', () => {
        showToast('네트워크가 연결되었습니다.', 'success');
    });
    
    window.addEventListener('offline', () => {
        showToast('네트워크 연결이 끊어졌습니다.', 'warning');
    });
    
    // 에러 처리
    window.addEventListener('error', (e) => {
        console.error('[전역 에러]:', e.error);
        if (!e.error?.message?.includes('Failed to fetch')) {
            showToast('예기치 않은 오류가 발생했습니다.', 'error');
        }
    });
    
    window.addEventListener('unhandledrejection', (e) => {
        console.error('[Promise 거부]:', e.reason);
        if (!e.reason?.message?.includes('Failed to fetch')) {
            showToast('비동기 처리 중 오류가 발생했습니다.', 'error');
        }
    });
}

/**
 * 저장되지 않은 작업 확인
 */
function checkUnsavedWork() {
    // 페이지별로 저장되지 않은 작업 확인
    const unsavedIndicators = [
        document.querySelector('form[data-unsaved="true"]'),
        document.querySelector('input[data-changed="true"]'),
        document.querySelector('textarea[data-changed="true"]')
    ];
    
    return unsavedIndicators.some(el => el !== null);
}

// ============================================
// [SECTION: 유틸리티 함수]
// ============================================

/**
 * 메뉴 활성화
 * @param {string} page - 페이지 이름
 */
export function activateMenu(page) {
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        if (item.dataset.page === page) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

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
    pageFileMap
};

// ============================================
// [SECTION: 전역 로그아웃 함수]
// ============================================

// 글래스모핀 모달 생성 함수
function createGlassModal(title, message, onConfirm, onCancel) {
    // 모달 오버레이
    const overlay = document.createElement('div');
    overlay.className = 'logout-modal-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        animation: fadeIn 0.3s ease;
    `;
    
    // 모달 컨테이너
    const modal = document.createElement('div');
    modal.className = 'logout-modal glass-card';
    modal.style.cssText = `
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 16px;
        padding: 32px;
        min-width: 400px;
        max-width: 500px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        animation: slideUp 0.3s ease;
        text-align: center;
    `;
    
    // 아이콘
    const icon = document.createElement('div');
    icon.style.cssText = `
        font-size: 48px;
        margin-bottom: 16px;
    `;
    icon.textContent = '🚪';
    
    // 제목
    const titleEl = document.createElement('h2');
    titleEl.style.cssText = `
        color: white;
        font-size: 24px;
        font-weight: 600;
        margin-bottom: 16px;
    `;
    titleEl.textContent = title;
    
    // 메시지
    const messageEl = document.createElement('p');
    messageEl.style.cssText = `
        color: rgba(255, 255, 255, 0.9);
        font-size: 16px;
        margin-bottom: 32px;
        line-height: 1.5;
    `;
    messageEl.textContent = message;
    
    // 버튼 컨테이너
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
        display: flex;
        gap: 12px;
        justify-content: center;
    `;
    
    // 취소 버튼
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-glass';
    cancelBtn.style.cssText = `
        padding: 12px 32px;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 8px;
        color: white;
        font-size: 16px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.3s ease;
    `;
    cancelBtn.textContent = '취소';
    cancelBtn.onmouseover = () => {
        cancelBtn.style.background = 'rgba(255, 255, 255, 0.15)';
        cancelBtn.style.transform = 'translateY(-2px)';
    };
    cancelBtn.onmouseout = () => {
        cancelBtn.style.background = 'rgba(255, 255, 255, 0.1)';
        cancelBtn.style.transform = 'translateY(0)';
    };
    cancelBtn.onclick = () => {
        overlay.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => {
            overlay.remove();
            if (onCancel) onCancel();
        }, 300);
    };
    
    // 확인 버튼
    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'btn btn-primary';
    confirmBtn.style.cssText = `
        padding: 12px 32px;
        background: rgba(255, 59, 48, 0.8);
        border: 1px solid rgba(255, 59, 48, 0.4);
        border-radius: 8px;
        color: white;
        font-size: 16px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.3s ease;
    `;
    confirmBtn.textContent = '로그아웃';
    confirmBtn.onmouseover = () => {
        confirmBtn.style.background = 'rgba(255, 59, 48, 1)';
        confirmBtn.style.transform = 'translateY(-2px)';
    };
    confirmBtn.onmouseout = () => {
        confirmBtn.style.background = 'rgba(255, 59, 48, 0.8)';
        confirmBtn.style.transform = 'translateY(0)';
    };
    confirmBtn.onclick = () => {
        overlay.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => {
            overlay.remove();
            if (onConfirm) onConfirm();
        }, 300);
    };
    
    // 요소 조립
    buttonContainer.appendChild(cancelBtn);
    buttonContainer.appendChild(confirmBtn);
    
    modal.appendChild(icon);
    modal.appendChild(titleEl);
    modal.appendChild(messageEl);
    modal.appendChild(buttonContainer);
    
    overlay.appendChild(modal);
    
    // 애니메이션 스타일 추가
    if (!document.getElementById('logout-modal-styles')) {
        const style = document.createElement('style');
        style.id = 'logout-modal-styles';
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
            @keyframes slideUp {
                from { 
                    opacity: 0;
                    transform: translateY(20px);
                }
                to { 
                    opacity: 1;
                    transform: translateY(0);
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    // ESC 키로 닫기
    const handleEsc = (e) => {
        if (e.key === 'Escape') {
            cancelBtn.click();
            document.removeEventListener('keydown', handleEsc);
        }
    };
    document.addEventListener('keydown', handleEsc);
    
    // 오버레이 클릭으로 닫기
    overlay.onclick = (e) => {
        if (e.target === overlay) {
            cancelBtn.click();
        }
    };
    
    return overlay;
}

// HTML onclick에서 호출할 수 있도록 전역 함수로 등록
window.handleLogoutClick = function() {
    console.log('[GLOBAL] 로그아웃 버튼 클릭 - 전역 함수 호출됨');
    
    // 글래스모핀 모달 생성
    const modal = createGlassModal(
        '로그아웃',
        '정말 로그아웃 하시겠습니까?\n역할 선택 화면으로 이동합니다.',
        () => {
            // 확인 버튼 클릭 시
            console.log('[GLOBAL] 로그아웃 확인 - handleLogout 호출');
            
            // showToast가 사용 가능한지 확인
            if (typeof showToast === 'function') {
                showToast('로그아웃 중...', 'info');
            } else {
                console.log('[GLOBAL] showToast 함수를 찾을 수 없음');
            }
            
            setTimeout(() => {
                if (typeof handleLogout === 'function') {
                    console.log('[GLOBAL] handleLogout 함수 호출');
                    handleLogout();
                } else {
                    console.error('[GLOBAL] handleLogout 함수를 찾을 수 없음 - 직접 리다이렉트');
                    window.location.href = '../../02.login/01_login.html';
                }
            }, 500);
        },
        () => {
            // 취소 버튼 클릭 시
            console.log('[GLOBAL] 로그아웃 취소');
        }
    );
    
    document.body.appendChild(modal);
};

console.log('[GLOBAL] handleLogoutClick 함수 등록 완료');

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
    
    console.log('[영업모드] 디버그 명령어:');
    console.log('- salesDebug.currentPage()');
    console.log('- salesDebug.user()');
    console.log('- salesDebug.pageMap()');
    console.log('- salesDebug.navigateTo("dashboard")');
    console.log('- salesDebug.refreshPage()');
    console.log('- salesDebug.sessionInfo()');
}

// ============================================
// [SECTION: DOM 로드 시 실행]
// ============================================

if (document.readyState === 'loading') {
    // DOM이 아직 로딩 중이면 이벤트 리스너 등록
    document.addEventListener('DOMContentLoaded', initSalesMode);
    console.log('[영업모드] DOMContentLoaded 이벤트 리스너 등록 완료');
} else {
    // DOM이 이미 로드되었으면 바로 실행
    console.log('[영업모드] DOM 이미 로드됨 - 초기화 함수 바로 실행');
    initSalesMode();
}

// ============================================
// [SECTION: 파일 정보]
// ============================================

// [파일: 02_sales_layout.js]
// [설명: 수정된 영업모드 레이아웃 - 세션 관리 통일, 페이지 매핑 수정]
// [테스트: 모든 페이지 이동, 세션 관리, 에러 처리]