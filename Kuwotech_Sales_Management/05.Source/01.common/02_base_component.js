/* ============================================
   베이스 컴포넌트 클래스 - 재사용 가능한 컴포넌트 시스템
   파일: 01.common/12_base_component.js
   작성일: 2025-01-27
   설명: 모든 UI 컴포넌트의 기본 클래스
============================================ */

import logger from './23_logger.js';

/**
 * 베이스 컴포넌트 클래스
 * 모든 컴포넌트가 상속받는 기본 클래스
 */
class BaseComponent {
    constructor(config = {}) {
        // 기본 설정
        this.config = {
            // 컴포넌트 기본 속성
            id: config.id || this.generateId(),
            className: config.className || 'component',
            theme: config.theme || 'default',
            size: config.size || 'md',
            variant: config.variant || 'primary',
            
            // 기능 플래그
            responsive: config.responsive !== false,
            animation: config.animation !== false,
            interactive: config.interactive !== false,
            
            // 상태
            disabled: config.disabled || false,
            loading: config.loading || false,
            visible: config.visible !== false,
            
            // 스타일
            styles: config.styles || {},
            customClass: config.customClass || '',
            
            // 이벤트
            events: config.events || {},
            
            // 나머지 설정
            ...config
        };
        
        // 컴포넌트 상태
        this.state = {
            mounted: false,
            initialized: false,
            destroyed: false,
            ...config.initialState
        };
        
        // DOM 참조
        this.refs = {};
        
        // 이벤트 리스너 목록
        this.listeners = new Map();
        
        // 하위 컴포넌트 목록
        this.children = new Map();
        
        // 초기화
        this.init();
    }
    
    /**
     * 컴포넌트 초기화
     */
    init() {
        this.state.initialized = true;
        this.setupResponsive();
        this.setupAnimation();
    }
    
    /**
     * 고유 ID 생성
     * @returns {string} 고유 ID
     */
    generateId() {
        return `component-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * 동적 스타일 생성
     * @returns {Object} 스타일 객체
     */
    generateStyles() {
        const { size, variant, theme } = this.config;
        
        return {
            '--component-size': `var(--size-${size}, var(--spacing-${size}))`,
            '--component-color': `var(--${variant}-color, var(--primary-color))`,
            '--component-spacing': `var(--spacing-${size})`,
            '--component-radius': `var(--radius-${size}, var(--border-radius-md))`,
            '--component-font-size': `var(--font-${size})`,
            ...this.config.styles
        };
    }
    
    /**
     * 스타일 문자열 변환
     * @returns {string} 인라인 스타일 문자열
     */
    styleString() {
        const styles = this.generateStyles();
        return Object.entries(styles)
            .map(([key, value]) => `${key}:${value}`)
            .join(';');
    }
    
    /**
     * 클래스 이름 생성
     * @returns {string} 클래스 이름
     */
    generateClassName() {
        const classes = [
            this.config.className,
            `${this.config.className}--${this.config.size}`,
            `${this.config.className}--${this.config.variant}`,
            this.config.theme !== 'default' ? `${this.config.className}--${this.config.theme}` : '',
            this.config.disabled ? `${this.config.className}--disabled` : '',
            this.config.loading ? `${this.config.className}--loading` : '',
            this.config.customClass
        ];
        
        return classes.filter(Boolean).join(' ');
    }
    
    /**
     * 반응형 설정
     */
    setupResponsive() {
        if (!this.config.responsive) return;
        
        const breakpoints = ['sm', 'md', 'lg', 'xl'];
        
        breakpoints.forEach(bp => {
            if (this.config[bp]) {
                this.applyBreakpointConfig(bp, this.config[bp]);
            }
        });
    }
    
    /**
     * 브레이크포인트별 설정 적용
     * @param {string} breakpoint - 브레이크포인트
     * @param {Object} config - 설정 객체
     */
    applyBreakpointConfig(breakpoint, config) {
        // 미디어 쿼리 매칭
        const mediaQueries = {
            sm: '(min-width: 640px)',
            md: '(min-width: 768px)',
            lg: '(min-width: 1024px)',
            xl: '(min-width: 1280px)'
        };
        
        const mediaQuery = window.matchMedia(mediaQueries[breakpoint]);
        
        const applyConfig = () => {
            if (mediaQuery.matches) {
                Object.assign(this.config, config);
                if (this.state.mounted) {
                    this.update();
                }
            }
        };
        
        // 초기 적용
        applyConfig();
        
        // 리스너 등록
        mediaQuery.addListener(applyConfig);
        this.listeners.set(`responsive-${breakpoint}`, applyConfig);
    }
    
    /**
     * 애니메이션 설정
     */
    setupAnimation() {
        if (!this.config.animation) return;
        
        // 기본 애니메이션 클래스
        const animationClass = this.config.animationClass || 'animate-in';
        
        // 애니메이션 지속 시간
        const duration = this.config.animationDuration || 300;
        
        // CSS 변수 설정
        if (this.refs.root) {
            this.refs.root.style.setProperty('--animation-duration', `${duration}ms`);
            this.refs.root.classList.add(animationClass);
        }
    }
    
    /**
     * 컴포넌트 렌더링
     * @returns {string} HTML 문자열
     */
    render() {
        return `
            <div 
                id="${this.config.id}"
                class="${this.generateClassName()}"
                style="${this.styleString()}"
                ${this.config.disabled ? 'data-disabled="true"' : ''}
                ${this.config.loading ? 'data-loading="true"' : ''}
            >
                ${this.renderContent()}
            </div>
        `;
    }
    
    /**
     * 컴포넌트 내용 렌더링 (하위 클래스에서 구현)
     * @returns {string} HTML 문자열
     */
    renderContent() {
        return '';
    }
    
    /**
     * DOM에 마운트
     * @param {Element|string} target - 대상 요소 또는 선택자
     */
    mount(target) {
        const targetElement = typeof target === 'string' 
            ? document.querySelector(target) 
            : target;

        if (!targetElement) {
            logger.error('Mount target not found');
            return;
        }
        
        // HTML 삽입
        targetElement.innerHTML = this.render();
        
        // 루트 요소 참조
        this.refs.root = targetElement.querySelector(`#${this.config.id}`);
        
        // 이벤트 바인딩
        this.bindEvents();
        
        // 상태 업데이트
        this.state.mounted = true;
        
        // 마운트 후 처리
        this.onMounted();
    }
    
    /**
     * 이벤트 바인딩
     */
    bindEvents() {
        if (!this.refs.root) return;
        
        // 설정된 이벤트 바인딩
        Object.entries(this.config.events).forEach(([event, handler]) => {
            this.refs.root.addEventListener(event, handler.bind(this));
            this.listeners.set(event, handler);
        });
    }
    
    /**
     * 이벤트 언바인딩
     */
    unbindEvents() {
        if (!this.refs.root) return;
        
        this.listeners.forEach((handler, event) => {
            this.refs.root.removeEventListener(event, handler);
        });
        
        this.listeners.clear();
    }
    
    /**
     * 컴포넌트 업데이트
     * @param {Object} newConfig - 새 설정
     */
    update(newConfig = {}) {
        // 설정 병합
        Object.assign(this.config, newConfig);
        
        // DOM 업데이트
        if (this.refs.root) {
            const parent = this.refs.root.parentElement;
            this.unmount();
            this.mount(parent);
        }
    }
    
    /**
     * 상태 업데이트
     * @param {Object} newState - 새 상태
     */
    setState(newState) {
        const prevState = { ...this.state };
        Object.assign(this.state, newState);
        
        // 상태 변경 후 처리
        this.onStateChange(prevState, this.state);
        
        // 필요시 리렌더링
        if (this.shouldUpdate(prevState, this.state)) {
            this.update();
        }
    }
    
    /**
     * 업데이트 필요 여부 확인
     * @param {Object} prevState - 이전 상태
     * @param {Object} nextState - 다음 상태
     * @returns {boolean} 업데이트 필요 여부
     */
    shouldUpdate(prevState, nextState) {
        return JSON.stringify(prevState) !== JSON.stringify(nextState);
    }
    
    /**
     * DOM에서 언마운트
     */
    unmount() {
        // 이벤트 언바인딩
        this.unbindEvents();
        
        // 하위 컴포넌트 파괴
        this.children.forEach(child => child.destroy());
        
        // DOM 제거
        if (this.refs.root) {
            this.refs.root.remove();
        }
        
        // 참조 초기화
        this.refs = {};
        
        // 상태 업데이트
        this.state.mounted = false;
        
        // 언마운트 후 처리
        this.onUnmounted();
    }
    
    /**
     * 컴포넌트 파괴
     */
    destroy() {
        if (this.state.destroyed) return;
        
        // 언마운트
        this.unmount();
        
        // 리스너 정리
        this.listeners.clear();
        
        // 하위 컴포넌트 정리
        this.children.clear();
        
        // 상태 업데이트
        this.state.destroyed = true;
        
        // 파괴 후 처리
        this.onDestroyed();
    }
    
    /**
     * 하위 컴포넌트 추가
     * @param {string} name - 컴포넌트 이름
     * @param {BaseComponent} component - 컴포넌트 인스턴스
     */
    addChild(name, component) {
        this.children.set(name, component);
    }
    
    /**
     * 하위 컴포넌트 제거
     * @param {string} name - 컴포넌트 이름
     */
    removeChild(name) {
        const child = this.children.get(name);
        if (child) {
            child.destroy();
            this.children.delete(name);
        }
    }
    
    /**
     * 하위 컴포넌트 가져오기
     * @param {string} name - 컴포넌트 이름
     * @returns {BaseComponent} 컴포넌트 인스턴스
     */
    getChild(name) {
        return this.children.get(name);
    }
    
    /**
     * 이벤트 발생
     * @param {string} eventName - 이벤트 이름
     * @param {*} data - 이벤트 데이터
     */
    emit(eventName, data) {
        if (!this.refs.root) return;
        
        const event = new CustomEvent(eventName, {
            detail: data,
            bubbles: true,
            cancelable: true
        });
        
        this.refs.root.dispatchEvent(event);
    }
    
    /**
     * 이벤트 리스닝
     * @param {string} eventName - 이벤트 이름
     * @param {Function} handler - 핸들러 함수
     */
    on(eventName, handler) {
        if (!this.refs.root) return;
        
        this.refs.root.addEventListener(eventName, handler);
        this.listeners.set(`custom-${eventName}`, handler);
    }
    
    /**
     * 이벤트 리스닝 해제
     * @param {string} eventName - 이벤트 이름
     */
    off(eventName) {
        if (!this.refs.root) return;
        
        const handler = this.listeners.get(`custom-${eventName}`);
        if (handler) {
            this.refs.root.removeEventListener(eventName, handler);
            this.listeners.delete(`custom-${eventName}`);
        }
    }
    
    // ========== 라이프사이클 훅 ==========
    
    /**
     * 마운트 후 처리
     */
    onMounted() {
        // 하위 클래스에서 구현
    }
    
    /**
     * 언마운트 후 처리
     */
    onUnmounted() {
        // 하위 클래스에서 구현
    }
    
    /**
     * 파괴 후 처리
     */
    onDestroyed() {
        // 하위 클래스에서 구현
    }
    
    /**
     * 상태 변경 후 처리
     * @param {Object} prevState - 이전 상태
     * @param {Object} nextState - 다음 상태
     */
    onStateChange(prevState, nextState) {
        // 하위 클래스에서 구현
    }
}

// 전역으로 노출
window.BaseComponent = BaseComponent;

// ES6 모듈 export
export { BaseComponent };
export default BaseComponent;