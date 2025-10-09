// ============================================
// [MODULE: 토스트 메시지 - 전역 설정 완전 통합]
// 파일 위치: 05.Source/01.common/06_toast.js
// 수정일: 2025-01-27
// 설명: 전역 설정과 완전히 통합된 토스트 메시지 시스템
// ============================================

import { TOAST_CONFIG, ANIMATION_CONFIG } from './01_global_config.js';
import { generateId } from './02_utils.js';

// ============================================
// [SECTION: 토스트 상태 관리]
// ============================================

const toastQueue = [];
let toastContainer = null;
let currentToastCount = 0;
let toastConfig = { ...TOAST_CONFIG };

// ============================================
// [SECTION: 토스트 컨테이너]
// ============================================

/**
 * 토스트 컨테이너 생성
 * @returns {HTMLElement} 토스트 컨테이너
 */
function createToastContainer() {
    if (toastContainer) return toastContainer;
    
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    
    // 위치별 스타일
    const positions = {
        'top-left': { 
            top: '20px', 
            left: '20px', 
            right: 'auto', 
            bottom: 'auto',
            alignItems: 'flex-start'
        },
        'top-center': { 
            top: '20px', 
            left: '50%', 
            right: 'auto', 
            bottom: 'auto', 
            transform: 'translateX(-50%)',
            alignItems: 'center'
        },
        'top-right': { 
            top: '20px', 
            right: '20px', 
            left: 'auto', 
            bottom: 'auto',
            alignItems: 'flex-end'
        },
        'bottom-left': { 
            bottom: '20px', 
            left: '20px', 
            right: 'auto', 
            top: 'auto',
            alignItems: 'flex-start'
        },
        'bottom-center': { 
            bottom: '20px', 
            left: '50%', 
            right: 'auto', 
            top: 'auto', 
            transform: 'translateX(-50%)',
            alignItems: 'center'
        },
        'bottom-right': { 
            bottom: '20px', 
            right: '20px', 
            left: 'auto', 
            top: 'auto',
            alignItems: 'flex-end'
        }
    };
    
    const positionStyle = positions[toastConfig.POSITION] || positions['top-right'];
    
    container.style.cssText = `
        position: fixed;
        z-index: 10001;
        pointer-events: none;
        display: flex;
        flex-direction: column;
        gap: ${toastConfig.STACK_SPACING}px;
        ${Object.entries(positionStyle).map(([k, v]) => `${k}: ${v}`).join('; ')};
    `;
    
    document.body.appendChild(container);
    toastContainer = container;
    
    return container;
}

// ============================================
// [SECTION: 토스트 생성]
// ============================================

/**
 * 토스트 생성
 * @param {string} message - 메시지
 * @param {string} type - 타입
 * @param {Object} options - 옵션
 * @returns {HTMLElement} 토스트 요소
 */
function createToast(message, type = 'info', options = {}) {
    const config = { ...toastConfig, ...options };
    const typeConfig = config.TYPES[type] || config.TYPES.info;
    const toastId = generateId('toast');
    
    // 토스트 요소
    const toast = document.createElement('div');
    toast.id = toastId;
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'polite');
    
    // 스타일 적용
    Object.assign(toast.style, config.STYLE, {
        background: typeConfig.background,
        color: typeConfig.color,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        pointerEvents: 'auto',
        opacity: '0',
        transform: getInitialTransform(config.POSITION),
        transition: `all 0.3s ease`,
        position: 'relative'
    });
    
    // 아이콘
    const icon = document.createElement('span');
    icon.className = 'toast-icon';
    icon.innerHTML = typeConfig.icon;
    icon.style.cssText = `
        font-size: 20px;
        flex-shrink: 0;
    `;
    toast.appendChild(icon);
    
    // 메시지
    const messageElement = document.createElement('div');
    messageElement.className = 'toast-message';
    messageElement.style.cssText = `
        flex: 1;
        line-height: 1.4;
    `;
    
    // HTML 또는 텍스트 처리
    if (options.html) {
        messageElement.innerHTML = message;
    } else {
        messageElement.textContent = message;
    }
    
    toast.appendChild(messageElement);
    
    // 닫기 버튼
    if (options.closeable !== false) {
        const closeBtn = document.createElement('button');
        closeBtn.className = 'toast-close';
        closeBtn.innerHTML = '&times;';
        closeBtn.style.cssText = `
            background: none;
            border: none;
            color: inherit;
            font-size: 20px;
            cursor: pointer;
            opacity: 0.7;
            padding: 0;
            margin-left: 12px;
            transition: opacity 0.3s ease;
        `;
        
        closeBtn.addEventListener('mouseover', () => {
            closeBtn.style.opacity = '1';
        });
        
        closeBtn.addEventListener('mouseout', () => {
            closeBtn.style.opacity = '0.7';
        });
        
        closeBtn.addEventListener('click', () => {
            removeToast(toast);
        });
        
        toast.appendChild(closeBtn);
    }
    
    // 프로그레스 바 (자동 닫힘용)
    const duration = options.duration ?? config.DURATION.medium;
    if (duration > 0 && options.progress !== false) {
        const progress = document.createElement('div');
        progress.className = 'toast-progress';
        progress.style.cssText = `
            position: absolute;
            bottom: 0;
            left: 0;
            height: 3px;
            background: rgba(255, 255, 255, 0.3);
            border-radius: 0 0 ${config.STYLE.borderRadius} 0;
            animation: toastProgress ${duration}ms linear;
        `;
        
        // 애니메이션 스타일 추가
        if (!document.getElementById('toast-progress-style')) {
            const style = document.createElement('style');
            style.id = 'toast-progress-style';
            style.textContent = `
                @keyframes toastProgress {
                    from { width: 100%; }
                    to { width: 0%; }
                }
            `;
            document.head.appendChild(style);
        }
        
        toast.appendChild(progress);
    }
    
    // 클릭 이벤트 (옵션)
    if (options.onClick) {
        toast.style.cursor = 'pointer';
        toast.addEventListener('click', (e) => {
            if (e.target.classList.contains('toast-close')) return;
            options.onClick(toast);
        });
    }
    
    return toast;
}

/**
 * 초기 트랜스폼 가져오기
 * @param {string} position - 위치
 * @returns {string} 트랜스폼
 */
function getInitialTransform(position) {
    if (position.includes('top')) {
        return 'translateY(-20px)';
    } else if (position.includes('bottom')) {
        return 'translateY(20px)';
    } else if (position.includes('left')) {
        return 'translateX(-20px)';
    } else {
        return 'translateX(20px)';
    }
}

// ============================================
// [SECTION: 토스트 표시/제거]
// ============================================

/**
 * 토스트 표시
 * @param {string} message - 메시지
 * @param {string} type - 타입
 * @param {Object} options - 옵션
 * @returns {HTMLElement} 토스트 요소
 */
export function showToast(message, type = 'info', options = {}) {
    // 컨테이너 확인
    if (!toastContainer) {
        createToastContainer();
    }
    
    // 최대 개수 체크
    if (currentToastCount >= toastConfig.MAX_COUNT) {
        if (toastConfig.STACK) {
            // 가장 오래된 토스트 제거
            const oldestToast = toastContainer.firstElementChild;
            if (oldestToast) {
                removeToast(oldestToast);
            }
        } else {
            // 기존 토스트 모두 제거
            clearToasts();
        }
    }
    
    // 토스트 생성
    const toast = createToast(message, type, options);
    
    // 스택 모드에 따른 처리
    if (toastConfig.STACK) {
        if (toastConfig.POSITION.includes('bottom')) {
            toastContainer.insertBefore(toast, toastContainer.firstChild);
        } else {
            toastContainer.appendChild(toast);
        }
    } else {
        clearToasts();
        toastContainer.appendChild(toast);
    }
    
    currentToastCount++;
    toastQueue.push(toast);
    
    // 애니메이션
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translate(0)';
    }, 10);
    
    // 자동 제거
    const duration = options.duration ?? 
        (toastConfig.DURATION[options.duration] || toastConfig.DURATION.medium);
    
    if (duration > 0) {
        toast.timeoutId = setTimeout(() => {
            removeToast(toast);
        }, duration);
    }
    
    // 마우스 호버 시 타이머 일시정지
    if (options.pauseOnHover !== false && duration > 0) {
        toast.addEventListener('mouseenter', () => {
            if (toast.timeoutId) {
                clearTimeout(toast.timeoutId);
            }
            
            // 프로그레스 애니메이션 일시정지
            const progress = toast.querySelector('.toast-progress');
            if (progress) {
                progress.style.animationPlayState = 'paused';
            }
        });
        
        toast.addEventListener('mouseleave', () => {
            // 남은 시간 계산 (간단히 절반으로)
            const remainingDuration = duration / 2;
            
            toast.timeoutId = setTimeout(() => {
                removeToast(toast);
            }, remainingDuration);
            
            // 프로그레스 애니메이션 재개
            const progress = toast.querySelector('.toast-progress');
            if (progress) {
                progress.style.animationPlayState = 'running';
            }
        });
    }
    
    return toast;
}

/**
 * 토스트 제거
 * @param {HTMLElement} toast - 토스트 요소
 */
function removeToast(toast) {
    if (!toast || !toast.parentNode) return;
    
    // 타이머 정리
    if (toast.timeoutId) {
        clearTimeout(toast.timeoutId);
    }
    
    // 애니메이션
    toast.style.opacity = '0';
    toast.style.transform = getInitialTransform(toastConfig.POSITION);
    
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
        
        currentToastCount = Math.max(0, currentToastCount - 1);
        
        const index = toastQueue.indexOf(toast);
        if (index > -1) {
            toastQueue.splice(index, 1);
        }
    }, 300);
}

/**
 * 모든 토스트 제거
 */
export function clearToasts() {
    [...toastQueue].forEach(toast => removeToast(toast));
}

// ============================================
// [SECTION: 프리셋 토스트]
// ============================================

/**
 * 성공 토스트
 * @param {string} message - 메시지
 * @param {Object} options - 옵션
 * @returns {HTMLElement} 토스트 요소
 */
export function success(message, options = {}) {
    return showToast(message, 'success', options);
}

/**
 * 오류 토스트
 * @param {string} message - 메시지
 * @param {Object} options - 옵션
 * @returns {HTMLElement} 토스트 요소
 */
export function error(message, options = {}) {
    return showToast(message, 'error', { 
        duration: toastConfig.DURATION.long,
        ...options 
    });
}

/**
 * 경고 토스트
 * @param {string} message - 메시지
 * @param {Object} options - 옵션
 * @returns {HTMLElement} 토스트 요소
 */
export function warning(message, options = {}) {
    return showToast(message, 'warning', options);
}

/**
 * 정보 토스트
 * @param {string} message - 메시지
 * @param {Object} options - 옵션
 * @returns {HTMLElement} 토스트 요소
 */
export function info(message, options = {}) {
    return showToast(message, 'info', options);
}

// ============================================
// [SECTION: Promise 토스트]
// ============================================

/**
 * Promise 토스트
 * @param {Promise} promise - Promise 객체
 * @param {Object} messages - 메시지 설정
 * @param {Object} options - 옵션
 * @returns {Promise} Promise
 */
export function promise(promise, messages = {}, options = {}) {
    const {
        loading = '처리 중...',
        success = '성공!',
        error = '오류 발생'
    } = messages;
    
    // 로딩 토스트 표시
    const loadingToast = showToast(loading, 'info', {
        duration: 0,  // 자동 닫힘 비활성화
        closeable: false,
        ...options
    });
    
    return promise
        .then((result) => {
            removeToast(loadingToast);
            
            const successMessage = typeof success === 'function' 
                ? success(result) 
                : success;
            
            showToast(successMessage, 'success', options);
            return result;
        })
        .catch((err) => {
            removeToast(loadingToast);
            
            const errorMessage = typeof error === 'function' 
                ? error(err) 
                : error;
            
            showToast(errorMessage, 'error', {
                duration: toastConfig.DURATION.long,
                ...options
            });
            
            throw err;
        });
}

// ============================================
// [SECTION: 커스텀 토스트]
// ============================================

/**
 * 커스텀 토스트
 * @param {HTMLElement|string} content - 내용
 * @param {Object} options - 옵션
 * @returns {HTMLElement} 토스트 요소
 */
export function custom(content, options = {}) {
    const toastId = generateId('toast');
    
    // 컨테이너 확인
    if (!toastContainer) {
        createToastContainer();
    }
    
    // 토스트 요소
    const toast = document.createElement('div');
    toast.id = toastId;
    toast.className = 'toast toast-custom';
    
    // 기본 스타일
    Object.assign(toast.style, toastConfig.STYLE, {
        background: options.background || '#333333',
        color: options.color || '#ffffff',
        pointerEvents: 'auto',
        opacity: '0',
        transform: getInitialTransform(toastConfig.POSITION),
        transition: `all 0.3s ease`,
        ...options.style
    });
    
    // 내용 설정
    if (typeof content === 'string') {
        toast.innerHTML = content;
    } else if (content instanceof HTMLElement) {
        toast.appendChild(content);
    }
    
    // 컨테이너에 추가
    toastContainer.appendChild(toast);
    currentToastCount++;
    toastQueue.push(toast);
    
    // 애니메이션
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translate(0)';
    }, 10);
    
    // 자동 제거
    const duration = options.duration ?? toastConfig.DURATION.medium;
    if (duration > 0) {
        setTimeout(() => {
            removeToast(toast);
        }, duration);
    }
    
    return toast;
}

// ============================================
// [SECTION: 토스트 설정]
// ============================================

/**
 * 토스트 위치 설정
 * @param {string} position - 위치
 */
export function setPosition(position) {
    toastConfig.POSITION = position;
    
    if (toastContainer) {
        // 컨테이너 재생성
        const oldContainer = toastContainer;
        toastContainer = null;
        createToastContainer();
        
        // 기존 토스트 이동
        while (oldContainer.firstChild) {
            toastContainer.appendChild(oldContainer.firstChild);
        }
        
        oldContainer.remove();
    }
}

/**
 * 토스트 설정 업데이트
 * @param {Object} config - 설정
 */
export function updateConfig(config) {
    toastConfig = { ...toastConfig, ...config };
}

// ============================================
// [SECTION: 토스트 매니저]
// ============================================

/**
 * 토스트 매니저 클래스
 */
class ToastManager {
    constructor() {
        this.toasts = new Map();
    }
    
    show(message, type, options) {
        const toast = showToast(message, type, options);
        this.toasts.set(toast.id, toast);
        return toast;
    }
    
    success(message, options) {
        return this.show(message, 'success', options);
    }
    
    error(message, options) {
        return this.show(message, 'error', options);
    }
    
    warning(message, options) {
        return this.show(message, 'warning', options);
    }
    
    info(message, options) {
        return this.show(message, 'info', options);
    }
    
    promise(promise, messages, options) {
        return promise(promise, messages, options);
    }
    
    custom(content, options) {
        return custom(content, options);
    }
    
    clear() {
        clearToasts();
        this.toasts.clear();
    }
    
    remove(toastId) {
        const toast = this.toasts.get(toastId);
        if (toast) {
            removeToast(toast);
            this.toasts.delete(toastId);
        }
    }
    
    setPosition(position) {
        setPosition(position);
    }
    
    updateConfig(config) {
        updateConfig(config);
    }
}

// 싱글톤 인스턴스
export const toastManager = new ToastManager();

// ============================================
// [SECTION: 초기화]
// ============================================

/**
 * 토스트 시스템 초기화
 * @param {Object} options - 초기화 옵션
 */
export function initToast(options = {}) {
    // 전역 설정 업데이트
    toastConfig = { ...toastConfig, ...options };
    
    // 컨테이너 생성
    createToastContainer();
    
    // 전역 객체에 등록
    if (typeof window !== 'undefined' && options.global !== false) {
        window.Toast = toastManager;
        window.showToast = showToast;
    }
    
    console.log('[토스트] 시스템 초기화 완료');
}

// ============================================
// 기본 내보내기
// ============================================

export default {
    showToast,
    clearToasts,
    success,
    error,
    warning,
    info,
    promise,
    custom,
    setPosition,
    updateConfig,
    toastManager,
    initToast
};

// [내용: 토스트 메시지 모듈]
// 테스트 계획: 전역 설정 통합, 다양한 토스트 타입
// #토스트 #알림