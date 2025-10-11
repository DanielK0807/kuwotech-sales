// ============================================
// [MODULE: 스크롤 관리 - 전역 설정 완전 통합]
// 파일 위치: 05.Source/01.common/07_scroll.js
// 수정일: 2025-01-27
// 설명: 전역 설정과 완전히 통합된 스크롤 관리 시스템
// ============================================

import { SCROLL_CONFIG, ANIMATION_CONFIG } from './01_global_config.js';
import { throttle, debounce } from './02_utils.js';
import logger from './23_logger.js';

// ============================================
// [SECTION: 스크롤 상태 관리]
// ============================================

let scrollConfig = { ...SCROLL_CONFIG };
let scrollListeners = [];
let scrollToTopButton = null;
let infiniteScrollCallbacks = new Map();
let fadeInElements = new Set();

// ============================================
// [SECTION: 커스텀 스크롤바]
// ============================================

/**
 * 커스텀 스크롤바 초기화
 * @param {string|HTMLElement} target - 대상 요소
 * @param {Object} options - 옵션
 */
export function initScrollbar(target = 'body', options = {}) {
    // 전역 설정과 옵션 병합
    const config = { ...scrollConfig.SCROLLBAR, ...options };
    
    // CSS 스타일 생성
    const styleId = 'custom-scrollbar-styles';
    let styleElement = document.getElementById(styleId);
    
    if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = styleId;
        document.head.appendChild(styleElement);
    }
    
    // 대상 선택자 처리
    const selector = typeof target === 'string' ? target : `.${target.className}`;
    
    // 스크롤바 CSS
    const css = `
        /* 웹킷 기반 브라우저 (Chrome, Safari, Edge) */
        ${selector}::-webkit-scrollbar {
            width: ${config.width};
            height: ${config.height};
        }
        
        ${selector}::-webkit-scrollbar-track {
            background: ${config.trackColor};
            border-radius: ${config.borderRadius};
        }
        
        ${selector}::-webkit-scrollbar-thumb {
            background: ${config.thumbColor};
            border-radius: ${config.borderRadius};
            transition: background 0.3s ease;
        }
        
        ${selector}::-webkit-scrollbar-thumb:hover {
            background: ${config.thumbHoverColor};
        }
        
        /* Firefox */
        ${selector} {
            scrollbar-width: thin;
            scrollbar-color: ${config.thumbColor} ${config.trackColor};
        }
    `;
    
    styleElement.textContent = css;
    
}

// ============================================
// [SECTION: 스무스 스크롤]
// ============================================

/**
 * 스무스 스크롤
 * @param {string|HTMLElement} target - 대상 요소
 * @param {Object} options - 옵션
 */
export function smoothScrollTo(target, options = {}) {
    const config = { ...scrollConfig.SMOOTH, ...options };
    
    if (!config.enabled) {
        // 스무스 스크롤 비활성화 시 즉시 이동
        if (typeof target === 'string') {
            document.querySelector(target)?.scrollIntoView();
        } else {
            target.scrollIntoView();
        }
        return;
    }
    
    let targetElement;
    let targetPosition;
    
    if (typeof target === 'string') {
        if (target === 'top') {
            targetPosition = 0;
        } else if (target === 'bottom') {
            targetPosition = document.documentElement.scrollHeight;
        } else {
            targetElement = document.querySelector(target);
            if (!targetElement) {
                logger.warn(`[스크롤] 요소를 찾을 수 없음: ${target}`);
                return;
            }
        }
    } else if (typeof target === 'number') {
        targetPosition = target;
    } else {
        targetElement = target;
    }
    
    if (targetElement) {
        const rect = targetElement.getBoundingClientRect();
        targetPosition = window.pageYOffset + rect.top - config.offset;
    }
    
    // 부드러운 스크롤 실행
    window.scrollTo({
        top: targetPosition,
        behavior: 'smooth'
    });
}

/**
 * 앵커 링크 스무스 스크롤 활성화
 */
export function enableSmoothAnchors() {
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a[href^="#"]');
        if (!link) return;
        
        const href = link.getAttribute('href');
        if (href === '#') return;
        
        e.preventDefault();
        
        const target = document.querySelector(href);
        if (target) {
            smoothScrollTo(target);
        }
    });
    
}

// ============================================
// [SECTION: 스크롤 위치 추적]
// ============================================

/**
 * 스크롤 위치 가져오기
 * @returns {Object} 스크롤 위치 정보
 */
export function getScrollPosition() {
    return {
        x: window.pageXOffset || document.documentElement.scrollLeft,
        y: window.pageYOffset || document.documentElement.scrollTop,
        maxX: document.documentElement.scrollWidth - window.innerWidth,
        maxY: document.documentElement.scrollHeight - window.innerHeight,
        percentX: (window.pageXOffset / (document.documentElement.scrollWidth - window.innerWidth)) * 100,
        percentY: (window.pageYOffset / (document.documentElement.scrollHeight - window.innerHeight)) * 100
    };
}

/**
 * 스크롤 리스너 추가
 * @param {Function} callback - 콜백 함수
 * @param {Object} options - 옵션
 * @returns {Function} 리스너 제거 함수
 */
export function addScrollListener(callback, options = {}) {
    const { throttleMs = 100, debounceMs = 0 } = options;
    
    let listener = callback;
    
    if (debounceMs > 0) {
        listener = debounce(callback, debounceMs);
    } else if (throttleMs > 0) {
        listener = throttle(callback, throttleMs);
    }
    
    const wrappedListener = () => {
        const position = getScrollPosition();
        listener(position);
    };
    
    window.addEventListener('scroll', wrappedListener);
    scrollListeners.push(wrappedListener);
    
    // 리스너 제거 함수 반환
    return () => {
        window.removeEventListener('scroll', wrappedListener);
        const index = scrollListeners.indexOf(wrappedListener);
        if (index > -1) {
            scrollListeners.splice(index, 1);
        }
    };
}

// ============================================
// [SECTION: 스크롤 투 탑 버튼]
// ============================================

/**
 * 스크롤 투 탑 버튼 생성
 * @param {Object} options - 옵션
 * @returns {HTMLElement} 버튼 요소
 */
export function createScrollToTopButton(options = {}) {
    // 기존 버튼 제거
    if (scrollToTopButton) {
        scrollToTopButton.remove();
    }
    
    const button = document.createElement('button');
    button.className = 'scroll-to-top-btn';
    button.id = 'scroll-to-top-btn';
    button.innerHTML = options.icon || '↑';
    button.setAttribute('aria-label', '맨 위로 스크롤');
    
    // 스타일 적용
    button.style.cssText = `
        position: fixed;
        bottom: ${options.bottom || '30px'};
        right: ${options.right || '30px'};
        width: ${options.size || '50px'};
        height: ${options.size || '50px'};
        background: var(--gradient-primary);
        color: white;
        border: none;
        border-radius: 50%;
        font-size: 20px;
        cursor: pointer;
        display: none;
        opacity: 0;
        transition: all 0.3s ease;
        z-index: 1000;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
    `;
    
    // 호버 효과
    button.addEventListener('mouseenter', () => {
        button.style.transform = 'scale(1.1)';
        button.style.boxShadow = '0 6px 12px rgba(0, 0, 0, 0.4)';
    });
    
    button.addEventListener('mouseleave', () => {
        button.style.transform = 'scale(1)';
        button.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.3)';
    });
    
    // 클릭 이벤트
    button.addEventListener('click', () => {
        smoothScrollTo('top');
    });
    
    // 스크롤 이벤트
    const showThreshold = options.showThreshold || 300;
    
    const scrollHandler = throttle(() => {
        const scrollY = window.pageYOffset;
        
        if (scrollY > showThreshold) {
            button.style.display = 'flex';
            button.style.alignItems = 'center';
            button.style.justifyContent = 'center';
            setTimeout(() => {
                button.style.opacity = '1';
            }, 10);
        } else {
            button.style.opacity = '0';
            setTimeout(() => {
                button.style.display = 'none';
            }, 300);
        }
    }, 100);
    
    window.addEventListener('scroll', scrollHandler);
    scrollHandler(); // 초기 상태 확인
    
    document.body.appendChild(button);
    scrollToTopButton = button;
    
    return button;
}

// ============================================
// [SECTION: 무한 스크롤]
// ============================================

/**
 * 무한 스크롤 설정
 * @param {string|HTMLElement} container - 컨테이너
 * @param {Function} callback - 콜백 함수
 * @param {Object} options - 옵션
 * @returns {Function} 무한 스크롤 해제 함수
 */
export function setupInfiniteScroll(container, callback, options = {}) {
    const config = { ...scrollConfig.INFINITE, ...options };
    
    const element = typeof container === 'string' 
        ? document.querySelector(container) 
        : container;
    
    if (!element) {
        logger.warn('[스크롤] 무한 스크롤 컨테이너를 찾을 수 없음');
        return;
    }
    
    let isLoading = false;
    let hasMore = true;
    let page = 1;
    
    const scrollHandler = throttle(async () => {
        if (isLoading || !hasMore) return;
        
        const scrollElement = element === document.body ? window : element;
        const scrollHeight = element === document.body 
            ? document.documentElement.scrollHeight 
            : element.scrollHeight;
        const scrollTop = element === document.body 
            ? window.pageYOffset 
            : element.scrollTop;
        const clientHeight = element === document.body 
            ? window.innerHeight 
            : element.clientHeight;
        
        // 하단 근처 도달 체크
        if (scrollHeight - scrollTop - clientHeight < config.threshold) {
            isLoading = true;
            
            try {
                const result = await callback(page, config.pageSize);
                
                if (result === false || (Array.isArray(result) && result.length < config.pageSize)) {
                    hasMore = false;
                } else {
                    page++;
                }
            } catch (error) {
                logger.error('[무한 스크롤 오류]:', error);
                hasMore = false;
            } finally {
                isLoading = false;
            }
        }
    }, 200);
    
    const scrollElement = element === document.body ? window : element;
    scrollElement.addEventListener('scroll', scrollHandler);
    
    // 콜백 저장
    infiniteScrollCallbacks.set(element, scrollHandler);
    
    // 해제 함수 반환
    return () => {
        scrollElement.removeEventListener('scroll', scrollHandler);
        infiniteScrollCallbacks.delete(element);
    };
}

// ============================================
// [SECTION: 스크롤 애니메이션]
// ============================================

/**
 * 스크롤 페이드인 애니메이션 설정
 * @param {string} selector - 대상 요소 선택자
 * @param {Object} options - 옵션
 */
export function setupFadeInAnimation(selector = '.fade-in', options = {}) {
    const config = { ...scrollConfig.ANIMATION, ...options };
    
    if (!config.fadeIn) return;
    
    const elements = document.querySelectorAll(selector);
    
    // 초기 스타일 설정
    elements.forEach(element => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        element.style.transition = `
            opacity ${config.fadeInDuration}ms ease,
            transform ${config.fadeInDuration}ms ease
        `;
        fadeInElements.add(element);
    });
    
    // Intersection Observer 설정
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }, config.fadeInDelay * index);
                
                observer.unobserve(entry.target);
                fadeInElements.delete(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });
    
    elements.forEach(element => {
        observer.observe(element);
    });
    
}

// ============================================
// [SECTION: 스크롤 프로그레스 바]
// ============================================

/**
 * 스크롤 프로그레스 바 생성
 * @param {Object} options - 옵션
 * @returns {HTMLElement} 프로그레스 바 요소
 */
export function createScrollProgress(options = {}) {
    const container = document.createElement('div');
    container.className = 'scroll-progress-container';
    container.id = 'scroll-progress';
    container.style.cssText = `
        position: fixed;
        top: ${options.position === 'bottom' ? 'auto' : '0'};
        bottom: ${options.position === 'bottom' ? '0' : 'auto'};
        left: 0;
        width: 100%;
        height: ${options.height || '4px'};
        background: ${options.bgColor || 'rgba(0, 0, 0, 0.1)'};
        z-index: 9999;
    `;
    
    const bar = document.createElement('div');
    bar.className = 'scroll-progress-bar';
    bar.style.cssText = `
        height: 100%;
        width: 0%;
        background: ${options.barColor || 'var(--gradient-primary)'};
        transition: width 0.1s ease;
    `;
    
    container.appendChild(bar);
    
    // 스크롤 이벤트
    const updateProgress = throttle(() => {
        const position = getScrollPosition();
        bar.style.width = `${position.percentY}%`;
    }, 50);
    
    window.addEventListener('scroll', updateProgress);
    updateProgress(); // 초기 상태
    
    document.body.appendChild(container);
    
    return container;
}

// ============================================
// [SECTION: 스크롤 동작 제어]
// ============================================

/**
 * 스크롤 비활성화
 */
export function disableScroll() {
    const scrollY = window.scrollY;
    
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    document.body.setAttribute('data-scroll-y', scrollY);
    
}

/**
 * 스크롤 활성화
 */
export function enableScroll() {
    const scrollY = document.body.getAttribute('data-scroll-y');
    
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    
    if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || 0));
        document.body.removeAttribute('data-scroll-y');
    }
    
}

/**
 * 스크롤 위치 저장
 * @param {string} key - 저장 키
 */
export function saveScrollPosition(key = 'default') {
    const position = getScrollPosition();
    sessionStorage.setItem(`scroll-position-${key}`, JSON.stringify(position));
}

/**
 * 스크롤 위치 복원
 * @param {string} key - 저장 키
 */
export function restoreScrollPosition(key = 'default') {
    const saved = sessionStorage.getItem(`scroll-position-${key}`);
    
    if (saved) {
        const position = JSON.parse(saved);
        window.scrollTo(position.x, position.y);
        sessionStorage.removeItem(`scroll-position-${key}`);
    }
}

// ============================================
// [SECTION: 스크롤 스파이]
// ============================================

/**
 * 스크롤 스파이 설정 (네비게이션 활성화)
 * @param {string} navSelector - 네비게이션 선택자
 * @param {string} sectionSelector - 섹션 선택자
 * @param {Object} options - 옵션
 */
export function setupScrollSpy(navSelector, sectionSelector, options = {}) {
    const offset = options.offset || 100;
    const activeClass = options.activeClass || 'active';
    
    const navItems = document.querySelectorAll(`${navSelector} a`);
    const sections = document.querySelectorAll(sectionSelector);
    
    if (!navItems.length || !sections.length) {
        logger.warn('[스크롤 스파이] 요소를 찾을 수 없음');
        return;
    }
    
    const scrollHandler = throttle(() => {
        const scrollY = window.pageYOffset;
        
        let current = '';
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop - offset;
            const sectionHeight = section.offsetHeight;
            
            if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
                current = section.getAttribute('id');
            }
        });
        
        navItems.forEach(item => {
            item.classList.remove(activeClass);
            
            if (item.getAttribute('href') === `#${current}`) {
                item.classList.add(activeClass);
            }
        });
    }, 100);
    
    window.addEventListener('scroll', scrollHandler);
    scrollHandler(); // 초기 상태
    
}

// ============================================
// [SECTION: 초기화]
// ============================================

/**
 * 스크롤 시스템 초기화
 * @param {Object} options - 초기화 옵션
 */
export function initScroll(options = {}) {
    // 전역 설정 업데이트
    scrollConfig = { ...scrollConfig, ...options };
    
    // 커스텀 스크롤바
    if (options.scrollbar !== false) {
        initScrollbar();
    }
    
    // 스무스 앵커
    if (options.smoothAnchors !== false && scrollConfig.SMOOTH.enabled) {
        enableSmoothAnchors();
    }
    
    // 스크롤 투 탑 버튼
    if (options.scrollToTopButton) {
        createScrollToTopButton(
            typeof options.scrollToTopButton === 'object' 
                ? options.scrollToTopButton 
                : {}
        );
    }
    
    // 페이드인 애니메이션
    if (options.fadeIn !== false && scrollConfig.ANIMATION.fadeIn) {
        // DOM 준비 후 실행
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setupFadeInAnimation();
            });
        } else {
            setupFadeInAnimation();
        }
    }
    
    // 스크롤 프로그레스
    if (options.scrollProgress) {
        createScrollProgress(
            typeof options.scrollProgress === 'object'
                ? options.scrollProgress
                : {}
        );
    }
    
    // 전역 객체에 등록
    if (typeof window !== 'undefined') {
        window.ScrollManager = {
            smoothScrollTo,
            getScrollPosition,
            addScrollListener,
            setupInfiniteScroll,
            setupFadeInAnimation,
            setupScrollSpy,
            disableScroll,
            enableScroll,
            saveScrollPosition,
            restoreScrollPosition
        };
    }
    
}

// ============================================
// 기본 내보내기
// ============================================

export default {
    initScrollbar,
    smoothScrollTo,
    enableSmoothAnchors,
    getScrollPosition,
    addScrollListener,
    createScrollToTopButton,
    setupInfiniteScroll,
    setupFadeInAnimation,
    createScrollProgress,
    disableScroll,
    enableScroll,
    saveScrollPosition,
    restoreScrollPosition,
    setupScrollSpy,
    initScroll
};

// [내용: 스크롤 관리 모듈]
// 테스트 계획: 전역 설정 통합, 다양한 스크롤 기능
// #스크롤 #애니메이션