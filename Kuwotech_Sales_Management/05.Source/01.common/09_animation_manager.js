/* ============================================
   애니메이션 매니저 - 동적 애니메이션 시스템
   파일: 01.common/14_animation_manager.js
   작성일: 2025-01-27
   설명: 통합 애니메이션 관리 시스템
============================================ */

import logger from './23_logger.js';

/**
 * 애니메이션 매니저
 * 모든 애니메이션을 중앙에서 관리
 */
class AnimationManager {
    constructor() {
        // 애니메이션 정의
        this.animations = {
            fadeIn: {
                duration: 300,
                easing: 'ease-out',
                keyframes: [
                    { opacity: 0, transform: 'translateY(10px)' },
                    { opacity: 1, transform: 'translateY(0)' }
                ]
            },
            fadeOut: {
                duration: 300,
                easing: 'ease-in',
                keyframes: [
                    { opacity: 1, transform: 'translateY(0)' },
                    { opacity: 0, transform: 'translateY(10px)' }
                ]
            },
            slideIn: {
                duration: 400,
                easing: 'ease-in-out',
                keyframes: [
                    { transform: 'translateX(-100%)' },
                    { transform: 'translateX(0)' }
                ]
            },
            slideOut: {
                duration: 400,
                easing: 'ease-in-out',
                keyframes: [
                    { transform: 'translateX(0)' },
                    { transform: 'translateX(100%)' }
                ]
            },
            scaleIn: {
                duration: 250,
                easing: 'ease-out',
                keyframes: [
                    { transform: 'scale(0.95)', opacity: 0 },
                    { transform: 'scale(1)', opacity: 1 }
                ]
            },
            scaleOut: {
                duration: 250,
                easing: 'ease-in',
                keyframes: [
                    { transform: 'scale(1)', opacity: 1 },
                    { transform: 'scale(0.95)', opacity: 0 }
                ]
            },
            rotateIn: {
                duration: 500,
                easing: 'ease-out',
                keyframes: [
                    { transform: 'rotate(-180deg) scale(0.8)', opacity: 0 },
                    { transform: 'rotate(0deg) scale(1)', opacity: 1 }
                ]
            },
            bounce: {
                duration: 600,
                easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
                keyframes: [
                    { transform: 'scale(1)' },
                    { transform: 'scale(1.1)' },
                    { transform: 'scale(0.9)' },
                    { transform: 'scale(1.05)' },
                    { transform: 'scale(1)' }
                ]
            },
            shake: {
                duration: 500,
                easing: 'ease-in-out',
                keyframes: [
                    { transform: 'translateX(0)' },
                    { transform: 'translateX(-10px)' },
                    { transform: 'translateX(10px)' },
                    { transform: 'translateX(-10px)' },
                    { transform: 'translateX(10px)' },
                    { transform: 'translateX(0)' }
                ]
            },
            pulse: {
                duration: 1000,
                easing: 'ease-in-out',
                iterations: 'infinite',
                keyframes: [
                    { opacity: 1 },
                    { opacity: 0.5 },
                    { opacity: 1 }
                ]
            },
            glassShine: {
                duration: 3000,
                easing: 'linear',
                iterations: 'infinite',
                keyframes: [
                    { backgroundPosition: '-200% 0' },
                    { backgroundPosition: '200% 0' }
                ]
            }
        };
        
        // 스태거 애니메이션 설정
        this.staggerConfig = {
            delay: 50,
            duration: 300
        };
        
        // Intersection Observer 목록
        this.observers = new Map();
        
        // 실행 중인 애니메이션
        this.runningAnimations = new Map();
        
        // 초기화
        this.init();
    }
    
    /**
     * 초기화
     */
    init() {
        // CSS 애니메이션 생성
        this.createCSSAnimations();
        
        // 애니메이션 감소 모션 설정 확인
        this.checkReducedMotion();
    }
    
    /**
     * CSS 애니메이션 생성
     */
    createCSSAnimations() {
        const styleSheet = document.createElement('style');
        styleSheet.id = 'animation-manager-styles';
        
        let css = '';
        
        // 각 애니메이션에 대한 키프레임 생성
        Object.entries(this.animations).forEach(([name, config]) => {
            css += this.generateKeyframes(name, config.keyframes);
        });
        
        // 애니메이션 클래스 생성
        Object.entries(this.animations).forEach(([name, config]) => {
            css += `
                .animate-${name} {
                    animation: ${name} ${config.duration}ms ${config.easing} ${config.iterations || 1};
                    animation-fill-mode: both;
                }
            `;
        });
        
        styleSheet.textContent = css;
        document.head.appendChild(styleSheet);
    }
    
    /**
     * 키프레임 생성
     * @param {string} name - 애니메이션 이름
     * @param {Array} keyframes - 키프레임 배열
     * @returns {string} CSS 키프레임 문자열
     */
    generateKeyframes(name, keyframes) {
        const steps = keyframes.length;
        let css = `@keyframes ${name} {\n`;
        
        keyframes.forEach((frame, index) => {
            const percentage = steps > 1 ? (index / (steps - 1)) * 100 : 100;
            css += `  ${percentage}% {\n`;
            
            Object.entries(frame).forEach(([property, value]) => {
                const cssProperty = property.replace(/([A-Z])/g, '-$1').toLowerCase();
                css += `    ${cssProperty}: ${value};\n`;
            });
            
            css += '  }\n';
        });
        
        css += '}\n';
        return css;
    }
    
    /**
     * 요소에 애니메이션 적용
     * @param {Element} element - 대상 요소
     * @param {string} animationName - 애니메이션 이름
     * @param {Object} options - 옵션
     * @returns {Promise} 애니메이션 완료 프로미스
     */
    animate(element, animationName, options = {}) {
        return new Promise((resolve) => {
            if (!element || !this.animations[animationName]) {
                logger.warn(`Animation "${animationName}" not found`);
                resolve();
                return;
            }
            
            const animation = this.animations[animationName];
            const duration = options.duration || animation.duration;
            const delay = options.delay || 0;
            const easing = options.easing || animation.easing;
            
            // Web Animations API 사용
            if ('animate' in element) {
                const animationObj = element.animate(
                    animation.keyframes,
                    {
                        duration,
                        delay,
                        easing,
                        fill: 'both',
                        iterations: options.iterations || 1
                    }
                );
                
                // 애니메이션 저장
                this.runningAnimations.set(element, animationObj);
                
                animationObj.onfinish = () => {
                    this.runningAnimations.delete(element);
                    resolve();
                };
            } else {
                // Fallback: CSS 클래스 사용
                element.style.animationDelay = `${delay}ms`;
                element.classList.add(`animate-${animationName}`);
                
                setTimeout(() => {
                    element.classList.remove(`animate-${animationName}`);
                    resolve();
                }, duration + delay);
            }
        });
    }
    
    /**
     * 여러 요소에 순차 애니메이션 적용 (Stagger)
     * @param {NodeList|Array} elements - 대상 요소들
     * @param {string} animationName - 애니메이션 이름
     * @param {Object} options - 옵션
     */
    stagger(elements, animationName, options = {}) {
        const delay = options.staggerDelay || this.staggerConfig.delay;
        const promises = [];
        
        Array.from(elements).forEach((element, index) => {
            const elementDelay = (options.delay || 0) + (index * delay);
            promises.push(
                this.animate(element, animationName, {
                    ...options,
                    delay: elementDelay
                })
            );
        });
        
        return Promise.all(promises);
    }
    
    /**
     * 스크롤 애니메이션 설정
     * @param {string} selector - 선택자
     * @param {string} animationName - 애니메이션 이름
     * @param {Object} options - 옵션
     */
    observeElements(selector, animationName = 'fadeIn', options = {}) {
        const elements = document.querySelectorAll(selector);
        
        const observerOptions = {
            threshold: options.threshold || 0.1,
            rootMargin: options.rootMargin || '50px'
        };
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry, index) => {
                if (entry.isIntersecting) {
                    const delay = options.stagger ? index * this.staggerConfig.delay : 0;
                    
                    this.animate(entry.target, animationName, {
                        ...options,
                        delay
                    });
                    
                    if (!options.repeat) {
                        observer.unobserve(entry.target);
                    }
                }
            });
        }, observerOptions);
        
        elements.forEach(el => observer.observe(el));
        this.observers.set(selector, observer);
        
        return observer;
    }
    
    /**
     * 스크롤 애니메이션 해제
     * @param {string} selector - 선택자
     */
    unobserveElements(selector) {
        const observer = this.observers.get(selector);
        if (observer) {
            observer.disconnect();
            this.observers.delete(selector);
        }
    }
    
    /**
     * 트랜지션 적용
     * @param {Element} element - 대상 요소
     * @param {Array} properties - 속성 배열
     * @param {number} duration - 지속 시간
     * @param {string} easing - 이징
     */
    transition(element, properties, duration = 300, easing = 'ease') {
        const transitionValue = properties
            .map(prop => `${prop} ${duration}ms ${easing}`)
            .join(', ');
        
        element.style.transition = transitionValue;
    }
    
    /**
     * 트랜지션 제거
     * @param {Element} element - 대상 요소
     */
    removeTransition(element) {
        element.style.transition = '';
    }
    
    /**
     * 애니메이션 일시정지
     * @param {Element} element - 대상 요소
     */
    pause(element) {
        const animation = this.runningAnimations.get(element);
        if (animation) {
            animation.pause();
        }
    }
    
    /**
     * 애니메이션 재개
     * @param {Element} element - 대상 요소
     */
    resume(element) {
        const animation = this.runningAnimations.get(element);
        if (animation) {
            animation.play();
        }
    }
    
    /**
     * 애니메이션 중지
     * @param {Element} element - 대상 요소
     */
    stop(element) {
        const animation = this.runningAnimations.get(element);
        if (animation) {
            animation.cancel();
            this.runningAnimations.delete(element);
        }
    }
    
    /**
     * 모든 애니메이션 중지
     */
    stopAll() {
        this.runningAnimations.forEach((animation) => {
            animation.cancel();
        });
        this.runningAnimations.clear();
    }
    
    /**
     * 감소 모션 설정 확인
     */
    checkReducedMotion() {
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
        
        if (prefersReducedMotion.matches) {
            document.body.classList.add('reduced-motion');
            this.reducedMotion = true;
        }
        
        prefersReducedMotion.addEventListener('change', (e) => {
            if (e.matches) {
                document.body.classList.add('reduced-motion');
                this.reducedMotion = true;
            } else {
                document.body.classList.remove('reduced-motion');
                this.reducedMotion = false;
            }
        });
    }
    
    /**
     * 커스텀 애니메이션 추가
     * @param {string} name - 애니메이션 이름
     * @param {Object} config - 애니메이션 설정
     */
    addAnimation(name, config) {
        this.animations[name] = config;
        
        // CSS 업데이트
        const styleSheet = document.getElementById('animation-manager-styles');
        if (styleSheet) {
            const css = this.generateKeyframes(name, config.keyframes);
            const classCSS = `
                .animate-${name} {
                    animation: ${name} ${config.duration}ms ${config.easing} ${config.iterations || 1};
                    animation-fill-mode: both;
                }
            `;
            styleSheet.textContent += css + classCSS;
        }
    }
    
    /**
     * 애니메이션 체이닝
     * @param {Element} element - 대상 요소
     * @param {Array} animations - 애니메이션 배열
     * @returns {Promise} 완료 프로미스
     */
    async chain(element, animations) {
        for (const animation of animations) {
            await this.animate(element, animation.name, animation.options);
        }
    }
    
    /**
     * 애니메이션 병렬 실행
     * @param {Array} animations - 애니메이션 배열 [{element, name, options}]
     * @returns {Promise} 완료 프로미스
     */
    parallel(animations) {
        const promises = animations.map(({ element, name, options }) => {
            return this.animate(element, name, options);
        });
        
        return Promise.all(promises);
    }
    
    /**
     * 글래스모피즘 효과 애니메이션
     * @param {Element} element - 대상 요소
     * @param {Object} options - 옵션
     */
    animateGlass(element, options = {}) {
        element.classList.add('glass-effect');
        
        // 빛 반사 효과
        const shine = document.createElement('div');
        shine.className = 'glass-shine';
        element.appendChild(shine);
        
        return this.animate(shine, 'glassShine', {
            ...options,
            iterations: Infinity
        });
    }
}

// 전역 인스턴스 생성
const animationManager = new AnimationManager();

// 전역으로 노출
window.AnimationManager = AnimationManager;
window.animationManager = animationManager;

// ============================================
// [SECTION: 모듈 내보내기]
// ============================================

export { AnimationManager, animationManager };
export default animationManager;