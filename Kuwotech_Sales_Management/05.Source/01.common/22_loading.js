/**
 * ============================================
 * KUWOTECH 영업관리 시스템 - 로딩 인디케이터
 * 파일: 05.Source/01.common/22_loading.js
 * 작성일: 2025-01-30
 * 설명: 전역 로딩 인디케이터 시스템
 * ============================================
 */

// ============================================
// [SECTION: 로딩 상태 관리]
// ============================================

let loadingElement = null;
let loadingCount = 0;
let loadingTimeout = null;

// ============================================
// [SECTION: 로딩 인디케이터 생성]
// ============================================

/**
 * 로딩 인디케이터 요소 생성
 * @returns {HTMLElement} 로딩 인디케이터 요소
 */
function createLoadingElement() {
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(5px);
        -webkit-backdrop-filter: blur(5px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        opacity: 0;
        transition: opacity 0.3s ease;
    `;

    const container = document.createElement('div');
    container.className = 'loading-container';
    container.style.cssText = `
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 16px;
        padding: 32px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 20px;
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    `;

    // 스피너
    const spinner = document.createElement('div');
    spinner.className = 'loading-spinner';
    spinner.style.cssText = `
        width: 50px;
        height: 50px;
        border: 4px solid rgba(255, 255, 255, 0.2);
        border-top-color: var(--primary-color, #64B5F6);
        border-radius: 50%;
        animation: spin 1s linear infinite;
    `;

    // 메시지
    const message = document.createElement('div');
    message.className = 'loading-message';
    message.textContent = '로딩 중...';
    message.style.cssText = `
        color: #FFFFFF;
        font-size: 16px;
        font-weight: 600;
        font-family: 'Paperlogy', sans-serif;
        text-align: center;
    `;

    // 스피너 애니메이션 추가
    const styleId = 'loading-spinner-style';
    if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }

    container.appendChild(spinner);
    container.appendChild(message);
    overlay.appendChild(container);

    return overlay;
}

// ============================================
// [SECTION: 로딩 인디케이터 표시/숨김]
// ============================================

/**
 * 로딩 인디케이터 표시
 * @param {string} message - 로딩 메시지
 * @param {Object} options - 옵션
 */
export function showLoading(message = '로딩 중...', options = {}) {
    loadingCount++;

    // 이미 표시 중이면 메시지만 업데이트
    if (loadingElement && loadingElement.parentNode) {
        const messageElement = loadingElement.querySelector('.loading-message');
        if (messageElement) {
            messageElement.textContent = message;
        }
        return;
    }

    // 로딩 요소 생성
    loadingElement = createLoadingElement();
    
    // 메시지 설정
    const messageElement = loadingElement.querySelector('.loading-message');
    if (messageElement) {
        messageElement.textContent = message;
    }

    // DOM에 추가
    document.body.appendChild(loadingElement);

    // 페이드 인 애니메이션
    requestAnimationFrame(() => {
        if (loadingElement && loadingElement.style) {
            loadingElement.style.opacity = '1';
        }
    });

    // 자동 숨김 (옵션)
    if (options.timeout && options.timeout > 0) {
        loadingTimeout = setTimeout(() => {
            hideLoading();
        }, options.timeout);
    }

    console.log(`[로딩] 표시: ${message}`);
}

/**
 * 로딩 인디케이터 숨김
 * @param {boolean} force - 강제 숨김 여부
 */
export function hideLoading(force = false) {
    loadingCount = Math.max(0, loadingCount - 1);

    // 강제 숨김이 아니고 아직 로딩 중이면 반환
    if (!force && loadingCount > 0) {
        return;
    }

    // 타임아웃 클리어
    if (loadingTimeout) {
        clearTimeout(loadingTimeout);
        loadingTimeout = null;
    }

    if (!loadingElement || !loadingElement.parentNode) {
        loadingCount = 0;
        return;
    }

    // 페이드 아웃 애니메이션
    loadingElement.style.opacity = '0';

    setTimeout(() => {
        if (loadingElement && loadingElement.parentNode) {
            document.body.removeChild(loadingElement);
        }
        loadingElement = null;
        loadingCount = 0;
    }, 300);

    console.log('[로딩] 숨김');
}

/**
 * 로딩 상태 확인
 * @returns {boolean} 로딩 중 여부
 */
export function isLoading() {
    return loadingElement !== null && loadingElement.parentNode !== null;
}

/**
 * 로딩 메시지 업데이트
 * @param {string} message - 새 메시지
 */
export function updateLoadingMessage(message) {
    if (!loadingElement) return;

    const messageElement = loadingElement.querySelector('.loading-message');
    if (messageElement) {
        messageElement.textContent = message;
    }
}

/**
 * 모든 로딩 인디케이터 강제 종료
 */
export function clearAllLoading() {
    loadingCount = 0;
    hideLoading(true);
}

// ============================================
// [SECTION: 로딩 매니저 클래스]
// ============================================

class LoadingManager {
    constructor() {
        this.active = false;
    }

    /**
     * 로딩 표시
     */
    show(message, options) {
        this.active = true;
        showLoading(message, options);
    }

    /**
     * 로딩 숨김
     */
    hide(force) {
        this.active = false;
        hideLoading(force);
    }

    /**
     * 로딩 상태 확인
     */
    isActive() {
        return this.active && isLoading();
    }

    /**
     * 메시지 업데이트
     */
    updateMessage(message) {
        updateLoadingMessage(message);
    }

    /**
     * 전체 초기화
     */
    clear() {
        this.active = false;
        clearAllLoading();
    }

    /**
     * Promise와 함께 사용
     */
    async withLoading(promise, message = '처리 중...') {
        try {
            this.show(message);
            const result = await promise;
            this.hide();
            return result;
        } catch (error) {
            this.hide(true);
            throw error;
        }
    }
}

// 싱글톤 인스턴스
export const loadingManager = new LoadingManager();

// ============================================
// [SECTION: 전역 노출]
// ============================================

if (typeof window !== 'undefined') {
    window.showLoading = showLoading;
    window.hideLoading = hideLoading;
    window.loadingManager = loadingManager;
}

// ============================================
// [SECTION: Export]
// ============================================

export default {
    showLoading,
    hideLoading,
    isLoading,
    updateLoadingMessage,
    clearAllLoading,
    loadingManager
};

// ============================================
// [파일 끝]
// ============================================
