/**
 * KUWOTECH 영업관리 시스템 - 공통 모듈 인덱스
 * Created: 2025-01-27
 * Description: 모든 공통 모듈 통합 관리
 */

// ============================================
// [섹션: 기존 모듈 임포트]
// ============================================

// 전역 설정
import { GlobalConfig, KUWOTECH_CONFIG, initGlobalConfig } from './01_global_config.js';

// 전역 설정 초기화
initGlobalConfig();

// 기본 컴포넌트
import { BaseComponent } from './02_base_component.js';

// 유틸리티
import { formatNumber, formatDate, formatTime, formatCurrency } from './03_format.js';
import { translateToKorean } from './04_terms.js';
import { debounce, throttle, deepClone } from './02_utils.js';

// UI 컴포넌트
import { showToast, clearToasts } from './14_toast.js';
import { alert, confirm, prompt, showModal } from './06_modal.js';
import { initClock, updateClock } from './05_clock.js';
import { smoothScrollTo } from './08_scroll.js';

// 디자인 시스템
import { applyGlassmorphism, initGlassmorphism } from './07_design.js';
import { AnimationManager } from './09_animation_manager.js';

// 테마 관리
import { themeManager } from './11_theme_manager.js';

// 세션 관리
import sessionManager from './16_session_manager.js';

// ============================================
// [섹션: 로딩 관리]
// ============================================

let loadingOverlay = null;

export function showGlobalLoading(show = true, message = '처리 중...') {
    if (show) {
        if (!loadingOverlay) {
            loadingOverlay = document.getElementById('loading-overlay');
        }
        if (loadingOverlay) {
            loadingOverlay.querySelector('.loading-text').textContent = message;
            loadingOverlay.style.display = 'flex';
        }
    } else {
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }
}

export function hideGlobalLoading() {
    showGlobalLoading(false);
}

export const showLoading = showGlobalLoading;
export const hideLoading = hideGlobalLoading;

// ============================================
// [섹션: 토스트 매니저]
// ============================================

export const toastManager = {
    success: (msg, duration) => showToast(msg, 'success', duration),
    error: (msg, duration) => showToast(msg, 'error', duration),
    warning: (msg, duration) => showToast(msg, 'warning', duration),
    info: (msg, duration) => showToast(msg, 'info', duration),
    clear: clearToasts
};

// ============================================
// [섹션: 스크롤 래퍼 함수]
// ============================================

/**
 * 스무스 스크롤 (호환성을 위한 래퍼 함수)
 * @param {string|HTMLElement} target - 대상 요소
 * @param {Object} options - 옵션
 */
export function smoothScroll(target, options) {
    return smoothScrollTo(target, options);
}

/**
 * 맨 위로 스크롤 (호환성을 위한 래퍼 함수)
 * @param {Object} options - 옵션
 */
export function scrollToTop(options) {
    return smoothScrollTo('top', options);
}

// ============================================
// [섹션: 통합 초기화]
// ============================================

export async function initCommonModules(options = {}) {
    console.log('[공통모듈] 초기화 시작...');
    
    try {
        // 테마 초기화
        if (options.theme) {
            themeManager.init();
        }
        
        // 시계 초기화
        if (options.clock) {
            initClock(options.clockConfig);
        }
        
        // 스크롤 초기화
        if (options.scrollbar) {
            // 스크롤바 초기화는 다른 모듈에서 처리
            console.log('[스크롤] 초기화 옵션 확인');
        }
        
        // 에셋 로드
        if (options.assets) {
            loadFonts();
            updateAllLogos();
        }
        
        console.log('[공통모듈] 초기화 완료');
        
        // 이벤트 발생
        window.dispatchEvent(new CustomEvent('commonModulesReady', {
            detail: { 
                loadTime: performance.now(),
                modules: options 
            }
        }));
        
        return true;
        
    } catch (error) {
        console.error('[공통모듈] 초기화 실패:', error);
        return false;
    }
}

// ============================================
// [섹션: 내보내기]
// ============================================

export {
    // 전역 설정
    GlobalConfig,
    KUWOTECH_CONFIG,
    
    // 포맷팅
    formatNumber,
    formatDate,
    formatTime,
    formatCurrency,
    
    // 용어
    translateToKorean,
    
    // 유틸리티
    debounce,
    throttle,
    deepClone,
    
    // 모달
    alert,
    confirm,
    prompt,
    showModal,
    
    // 토스트
    showToast,
    
    // 시계
    initClock,
    updateClock,
    
    // 스크롤
    smoothScrollTo,
    
    // 테마
    themeManager,
    
    // 에셋 (주석 처리 - 파일 없음)
    // loadFonts,
    // createLogoElement,
    // updateAllLogos,
    
    // 세션
    sessionManager
};

// 기본 내보내기
export default {
    initCommonModules,
    showGlobalLoading,
    hideGlobalLoading,
    toastManager
};