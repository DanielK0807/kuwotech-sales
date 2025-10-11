// ============================================
// [MODULE: 공통 모듈 통합 인덱스]
// 파일 위치: 05.Source/01.common/20_common_index.js
// 작성일: 2025-01-27
// 설명: 모든 공통 모듈을 한 곳에서 import할 수 있는 인덱스 파일
// ============================================

import logger from './23_logger.js';

// 전역 설정
export * from './01_global_config.js';
export { default as GlobalConfig } from './01_global_config.js';

// 기본 컴포넌트
export * from './02_base_component.js';
export { default as BaseComponent } from './02_base_component.js';

// 포맷팅
export * from './03_format.js';
export { default as Format } from './03_format.js';

// 용어
export * from './04_terms.js';
export { default as Terms } from './04_terms.js';

// 시계
export * from './05_clock.js';
export { default as Clock } from './05_clock.js';

// 모달
export * from './06_modal.js';
export { default as Modal } from './06_modal.js';

// 디자인
export * from './07_design.js';
export { default as Design } from './07_design.js';

// 스크롤
export * from './08_scroll.js';
export { default as Scroll } from './08_scroll.js';

// 애니메이션 매니저
export * from './09_animation_manager.js';
export { default as AnimationManager } from './09_animation_manager.js';

// 테마 매니저
export * from './11_theme_manager.js';
export { default as ThemeManager } from './11_theme_manager.js';

// 브레이크포인트 매니저
export * from './12_breakpoint_manager.js';
export { default as BreakpointManager } from './12_breakpoint_manager.js';

// API 매니저
export * from './13_api_manager.js';
export { default as ApiManager } from './13_api_manager.js';

// 토스트
export * from './14_toast.js';
export { default as Toast } from './14_toast.js';

// 매니저 로더
export * from './15_manager_loader.js';
export { default as ManagerLoader } from './15_manager_loader.js';

// 세션 매니저
export * from './16_session_manager.js';
export { default as SessionManager } from './16_session_manager.js';

// 시스템 로더
export * from './17_system_loader.js';
export { default as SystemLoader } from './17_system_loader.js';

// 테마 초기화
export * from './18_theme_init.js';
export { default as ThemeInit } from './18_theme_init.js';

// 컴포넌트 시스템
export * from './19_component_system.js';
export { default as ComponentSystem } from './19_component_system.js';

// 로고 및 폰트 매니저
export * from './21_logo_font_manager.js';
export { default as LogoFontManager } from './21_logo_font_manager.js';

// 로딩 인디케이터
export * from './22_loading.js';
export { default as Loading } from './22_loading.js';

// ============================================
// [SECTION: 통합 초기화]
// ============================================

/**
 * 모든 공통 모듈 초기화
 * @param {Object} options - 초기화 옵션
 */
export async function initializeCommonModules(options = {}) {
    
    try {
        // 1. 전역 설정 초기화
        const { initGlobalConfig } = await import('./01_global_config.js');
        if (typeof initGlobalConfig === 'function') {
            initGlobalConfig();
        }
        
        // 2. 포맷팅 시스템 초기화
        const { initFormat } = await import('./03_format.js');
        if (typeof initFormat === 'function') {
            initFormat();
        }
        
        // 3. 디자인 시스템 초기화
        const { initDesign } = await import('./07_design.js');
        if (typeof initDesign === 'function') {
            await initDesign();
        }
        
        // 4. 시계 시스템 초기화 (옵션)
        if (options.enableClock !== false) {
            const { initClock } = await import('./05_clock.js');
            initClock({
                autoStart: false  // floating 시계 자동 생성 방지, 각 레이아웃에서 수동으로 startClock() 호출
            });
        }
        
        // 5. 스크롤 시스템 초기화
        if (options.enableScroll !== false) {
            const { initScroll } = await import('./08_scroll.js');
            initScroll({
                scrollbar: options.customScrollbar !== false,
                smoothAnchors: options.smoothAnchors !== false,
                scrollToTopButton: options.scrollToTopButton,
                fadeIn: options.fadeInAnimation !== false
            });
        }
        
        // 6. 토스트 시스템 초기화
        if (options.enableToast !== false) {
            const { initToast } = await import('./14_toast.js');
            if (typeof initToast === 'function') {
                initToast();
            }
        }
        
        // 7. API 매니저 초기화 (자동 연결 관리)
        if (options.enableApiManager !== false) {
            const ApiManagerModule = await import('./13_api_manager.js');
            const apiManager = new ApiManagerModule.default();
            const isConnected = await apiManager.init();
            
            // 전역에 등록
            window.apiManager = apiManager;
            
            if (isConnected) {
            } else {
                logger.warn('⚠️ API 매니저 초기화 완료 (서버 연결 실패 - 재연결 시도 중)');
            }
        }

        return true;

    } catch (error) {
        logger.error('❌ 공통 모듈 초기화 실패:', error);
        return false;
    }
}

// ============================================
// [SECTION: 전역 등록]
// ============================================

// 전역 객체에 통합 모듈 등록
if (typeof window !== 'undefined') {
    window.KuwotechCommon = {
        initializeAll: initializeCommonModules,
        GlobalConfig: await import('./01_global_config.js'),
        BaseComponent: await import('./02_base_component.js'),
        Format: await import('./03_format.js'),
        Terms: await import('./04_terms.js'),
        Clock: await import('./05_clock.js'),
        Modal: await import('./06_modal.js'),
        Design: await import('./07_design.js'),
        Scroll: await import('./08_scroll.js'),
        AnimationManager: await import('./09_animation_manager.js'),
        ThemeManager: await import('./11_theme_manager.js'),
        BreakpointManager: await import('./12_breakpoint_manager.js'),
        ApiManager: await import('./13_api_manager.js'),
        Toast: await import('./14_toast.js'),
        SessionManager: await import('./16_session_manager.js'),
        ThemeInit: await import('./18_theme_init.js')
    };
}

// ============================================
// 별칭 export (호환성)
// ============================================
export const initCommonModules = initializeCommonModules;

// ============================================
// 기본 내보내기
// ============================================
export default {
    initializeCommonModules,
    initCommonModules
};
