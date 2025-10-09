/* ============================================
   통합 매니저 로더 - UI/UX 가이드 기반
   파일: 01.common/15_manager_loader.js
   작성일: 2025-01-27
   설명: 새로운 매니저 시스템 통합 로더
============================================ */

/**
 * 매니저 시스템 통합 로더
 * 테마, 브레이크포인트, 애니메이션 매니저 통합 초기화
 */
class ManagerLoader {
    constructor() {
        this.managers = {};
        this.initialized = false;
    }
    
    /**
     * 모든 매니저 초기화
     * @param {Object} options - 초기화 옵션
     */
    async init(options = {}) {
        if (this.initialized) {
            console.warn('Manager systems already initialized');
            return;
        }
        
        console.log('========================================');
        console.log('[매니저 시스템] 초기화 시작');
        console.log('========================================');
        
        try {
            // 1. 테마 매니저 로드
            if (options.theme !== false) {
                await this.loadScript('./11_theme_manager.js');
                this.managers.theme = window.themeManager;
                
                // 초기 테마 적용
                const savedTheme = localStorage.getItem('theme-mode') || options.defaultTheme || 'sales';
                if (this.managers.theme) {
                    this.managers.theme.applyTheme(savedTheme);
                }
                console.log('[1/4] 테마 매니저 로드 완료');
            }
            
            // 2. 베이스 컴포넌트 로드
            if (options.component !== false) {
                await this.loadScript('./02_base_component.js');
                this.managers.baseComponent = window.BaseComponent;
                console.log('[2/4] 베이스 컴포넌트 로드 완료');
            }
            
            // 3. 브레이크포인트 매니저 로드
            if (options.breakpoint !== false) {
                await this.loadScript('./12_breakpoint_manager.js');
                this.managers.breakpoint = window.breakpointManager;
                console.log('[3/4] 브레이크포인트 매니저 로드 완료');
            }
            
            // 4. 애니메이션 매니저 로드
            if (options.animation !== false) {
                await this.loadScript('./09_animation_manager.js');
                this.managers.animation = window.animationManager;
                
                // 기본 스크롤 애니메이션 설정
                if (options.scrollAnimations !== false && this.managers.animation) {
                    this.setupScrollAnimations();
                }
                console.log('[4/4] 애니메이션 매니저 로드 완료');
            }
            
            // 초기화 완료
            this.initialized = true;
            
            // 이벤트 발생
            window.dispatchEvent(new CustomEvent('managersReady', {
                detail: { managers: this.managers }
            }));
            
            console.log('========================================');
            console.log('[매니저 시스템] 초기화 완료');
            console.log('========================================');
            
            return this.managers;
            
        } catch (error) {
            console.error('[매니저 시스템] 초기화 실패:', error);
            throw error;
        }
    }
    
    /**
     * 스크립트 동적 로드
     * @param {string} src - 스크립트 경로
     */
    loadScript(src) {
        return new Promise((resolve, reject) => {
            // 이미 로드된 경우 체크
            const existingScript = document.querySelector(`script[src="${src}"]`);
            if (existingScript) {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = src;
            script.type = 'text/javascript';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
    
    /**
     * 스크롤 애니메이션 설정
     */
    setupScrollAnimations() {
        if (!this.managers.animation) return;
        
        // 기본 스크롤 애니메이션 클래스들
        const animations = [
            { selector: '.fade-in', animation: 'fadeIn' },
            { selector: '.fade-out', animation: 'fadeOut' },
            { selector: '.slide-in', animation: 'slideIn' },
            { selector: '.slide-out', animation: 'slideOut' },
            { selector: '.scale-in', animation: 'scaleIn' },
            { selector: '.scale-out', animation: 'scaleOut' },
            { selector: '.glass-card', animation: 'fadeIn' },
            { selector: '.kpi-card', animation: 'scaleIn' },
            { selector: '[data-animate]', animation: 'fadeIn' }
        ];
        
        animations.forEach(({ selector, animation }) => {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
                this.managers.animation.observeElements(selector, animation, {
                    stagger: true,
                    threshold: 0.1
                });
            }
        });
    }
    
    /**
     * 특정 매니저 가져오기
     * @param {string} name - 매니저 이름
     */
    getManager(name) {
        return this.managers[name];
    }
    
    /**
     * 테마 전환 헬퍼
     * @param {string} theme - 테마 이름
     */
    setTheme(theme) {
        if (this.managers.theme) {
            this.managers.theme.applyTheme(theme);
        }
    }
    
    /**
     * 현재 브레이크포인트 가져오기
     */
    getCurrentBreakpoint() {
        if (this.managers.breakpoint) {
            return this.managers.breakpoint.getCurrent();
        }
        return null;
    }
    
    /**
     * 애니메이션 실행
     * @param {Element} element - 대상 요소
     * @param {string} animation - 애니메이션 이름
     * @param {Object} options - 옵션
     */
    animate(element, animation, options = {}) {
        if (this.managers.animation) {
            return this.managers.animation.animate(element, animation, options);
        }
        return Promise.resolve();
    }
    
    /**
     * 반응형 체크
     * @param {string} query - 쿼리 문자열
     */
    matchesBreakpoint(query) {
        if (this.managers.breakpoint) {
            return this.managers.breakpoint.matches(query);
        }
        return false;
    }
}

// 전역 인스턴스 생성
const managerLoader = new ManagerLoader();

// 전역으로 노출
window.ManagerLoader = ManagerLoader;
window.managerLoader = managerLoader;

// ============================================
// [SECTION: 모듈 내보내기]
// ============================================

export { ManagerLoader, managerLoader };
export default managerLoader;