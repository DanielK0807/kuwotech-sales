/**
 * ============================================
 * KUWOTECH 영업관리 시스템 - 글래스모피즘 자동 적용 모듈
 * ============================================
 * 파일: 01.common/18_glassmorphism_auto_apply.js
 * 작성일: 2025-09-30
 * 
 * 목적: 대시보드 및 모든 페이지에 Enhanced 3D 글래스모피즘 자동 적용
 * 참조: 14_최신_색상_규칙_및_글래스모피즘_가이드.md
 * ============================================
 */

class GlassmorphismAutoApply {
    constructor() {
        this.initialized = false;
        this.currentMode = null;
        this.init();
    }

    /**
     * 초기화
     */
    init() {
        if (this.initialized) return;
        
        // DOM 로드 시 적용
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.apply());
        } else {
            this.apply();
        }
        
        // 페이지 전환 시에도 적용
        window.addEventListener('pagechange', () => this.apply());
        
        this.initialized = true;
    }

    /**
     * 현재 모드 감지
     */
    detectMode() {
        const body = document.body;
        
        // data-mode 속성 확인
        if (body.dataset.mode) {
            return body.dataset.mode;
        }
        
        // 클래스 이름으로 확인
        if (body.classList.contains('theme-admin')) {
            return 'admin';
        } else if (body.classList.contains('theme-sales')) {
            return 'sales';
        } else if (body.classList.contains('theme-login')) {
            return 'login';
        }
        
        // URL에서 추측
        const path = window.location.pathname;
        if (path.includes('admin')) return 'admin';
        if (path.includes('sales')) return 'sales';
        
        return 'login';
    }

    /**
     * 글래스모피즘 자동 적용
     */
    apply() {
        this.currentMode = this.detectMode();
        console.log(`✨ Glassmorphism Auto Apply: ${this.currentMode} mode detected`);
        
        // 페이지 타입 확인
        const pageType = document.body.dataset.pageType || document.body.dataset.page;
        
        if (pageType === 'dashboard') {
            this.applyDashboard();
        } else {
            this.applyGeneral();
        }
        
        // 3D 뷰포트 설정
        this.setup3DViewport();
        
        // 애니메이션 추가
        this.addAnimations();
    }

    /**
     * 대시보드 특별 처리
     */
    applyDashboard() {
        console.log('📊 Applying Dashboard Glassmorphism...');
        
        // KPI 카드
        document.querySelectorAll('.kpi-card').forEach((card, index) => {
            if (!card.classList.contains('glass-enhanced')) {
                card.classList.add('glass-card', 'glass-3d-element', 'glass-enhanced');
                card.style.animationDelay = `${index * 0.1}s`;
                
                // 3D Transform 적용
                card.style.transform = `translateZ(${50 + index * 5}px) rotateX(${2 - index * 0.2}deg) rotateY(${-2 + index * 0.3}deg)`;
                card.style.transformStyle = 'preserve-3d';
                
                // Hover 효과
                this.addHoverEffect(card);
            }
        });
        
        // 차트 카드
        document.querySelectorAll('.chart-card').forEach(card => {
            if (!card.classList.contains('glass-enhanced')) {
                card.classList.add('glass-frosted', 'glass-3d-element', 'glass-enhanced');
                card.style.transform = 'translateZ(40px) rotateX(1deg)';
            }
        });
        
        // 활동 카드
        document.querySelectorAll('.activity-card, .notification-card').forEach(card => {
            if (!card.classList.contains('glass-enhanced')) {
                card.classList.add('glass-panel', 'glass-3d-element', 'glass-enhanced');
                
                // 홀로그래픽 효과 추가 (알림 카드)
                if (card.classList.contains('notification-card')) {
                    card.classList.add('glass-holographic');
                }
            }
        });
        
        // 헤더 강화
        const header = document.querySelector('.page-header');
        if (header && !header.classList.contains('glass-enhanced')) {
            header.classList.add('glass-layered', 'glass-shimmer', 'glass-enhanced');
            header.style.transform = 'translateZ(80px)';
        }
        
        // 버튼 강화
        document.querySelectorAll('.glass-button, .btn').forEach(btn => {
            if (!btn.classList.contains('glass-enhanced')) {
                btn.classList.add('glass-3d-element', 'glass-enhanced');
                btn.style.transform = 'translateZ(20px)';
                this.addRippleEffect(btn);
            }
        });
    }

    /**
     * 일반 페이지 처리
     */
    applyGeneral() {
        console.log('📄 Applying General Glassmorphism...');
        
        // 모든 카드
        document.querySelectorAll('.card').forEach(card => {
            if (!card.classList.contains('glass-enhanced')) {
                card.classList.add('glass-card', 'glass-3d-element', 'glass-enhanced');
            }
        });
        
        // 모든 패널
        document.querySelectorAll('.panel').forEach(panel => {
            if (!panel.classList.contains('glass-enhanced')) {
                panel.classList.add('glass-panel', 'glass-enhanced');
            }
        });
        
        // 모든 버튼
        document.querySelectorAll('button, .btn').forEach(btn => {
            if (!btn.classList.contains('glass-enhanced')) {
                btn.classList.add('glass-button', 'glass-enhanced');
                this.addRippleEffect(btn);
            }
        });
        
        // 입력 필드
        document.querySelectorAll('input, textarea, select').forEach(input => {
            if (!input.classList.contains('glass-enhanced')) {
                input.classList.add('glass-input', 'glass-enhanced');
            }
        });
        
        // 테이블
        document.querySelectorAll('table').forEach(table => {
            if (!table.classList.contains('glass-enhanced')) {
                table.classList.add('glass-table', 'glass-enhanced');
            }
        });
    }

    /**
     * 3D 뷰포트 설정
     */
    setup3DViewport() {
        const viewport = document.querySelector('.viewport-3d');
        if (viewport) {
            viewport.style.perspective = '1500px';
            viewport.style.perspectiveOrigin = '50% 50%';
            viewport.style.transformStyle = 'preserve-3d';
        }
        
        // body에도 3D 설정
        document.body.style.transformStyle = 'preserve-3d';
    }

    /**
     * Hover 효과 추가
     */
    addHoverEffect(element) {
        const originalTransform = element.style.transform || '';
        
        element.addEventListener('mouseenter', () => {
            const currentZ = this.extractZValue(originalTransform) || 50;
            const newZ = currentZ + 20;
            element.style.transform = `translateY(-8px) translateZ(${newZ}px) rotateX(3deg) rotateY(-3deg) scale(1.02)`;
        });
        
        element.addEventListener('mouseleave', () => {
            element.style.transform = originalTransform;
        });
    }

    /**
     * Ripple 효과 추가
     */
    addRippleEffect(button) {
        button.addEventListener('click', function(e) {
            // 기존 ripple 제거
            const existingRipple = this.querySelector('.ripple');
            if (existingRipple) {
                existingRipple.remove();
            }
            
            // 새 ripple 생성
            const ripple = document.createElement('span');
            ripple.className = 'ripple';
            
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.cssText = `
                position: absolute;
                width: ${size}px;
                height: ${size}px;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.5);
                transform: translate(${x}px, ${y}px) scale(0);
                animation: rippleEffect 0.6s ease-out;
                pointer-events: none;
            `;
            
            this.style.position = 'relative';
            this.style.overflow = 'hidden';
            this.appendChild(ripple);
            
            setTimeout(() => ripple.remove(), 600);
        });
    }

    /**
     * 애니메이션 추가
     */
    addAnimations() {
        // 스타일 태그가 이미 있는지 확인
        if (document.getElementById('glassmorphism-animations')) return;
        
        const style = document.createElement('style');
        style.id = 'glassmorphism-animations';
        style.textContent = `
            /* Fade In Animation */
            @keyframes fadeInUp3D {
                from {
                    opacity: 0;
                    transform: translateY(30px) translateZ(0);
                }
                to {
                    opacity: 1;
                    transform: translateY(0) translateZ(var(--z-depth, 40px));
                }
            }
            
            /* Ripple Effect */
            @keyframes rippleEffect {
                to {
                    transform: translate(var(--x, 0), var(--y, 0)) scale(4);
                    opacity: 0;
                }
            }
            
            /* Shimmer Effect */
            @keyframes glass-shimmer-3d {
                0% {
                    transform: translateX(-100%) translateZ(1px);
                }
                100% {
                    transform: translateX(100%) translateZ(1px);
                }
            }
            
            /* Holographic Effect */
            @keyframes holographic-3d {
                0% {
                    background-position: 0% 50%;
                    transform: translateZ(60px) rotateY(-2deg);
                }
                50% {
                    background-position: 100% 50%;
                    transform: translateZ(65px) rotateY(2deg);
                }
                100% {
                    background-position: 0% 50%;
                    transform: translateZ(60px) rotateY(-2deg);
                }
            }
            
            /* Apply animations */
            .glass-3d-element {
                animation: fadeInUp3D 0.6s cubic-bezier(0.23, 1, 0.32, 1) forwards;
            }
            
            .glass-shimmer::before {
                animation: glass-shimmer-3d 3s ease-in-out infinite;
            }
            
            .glass-holographic {
                animation: holographic-3d 10s ease infinite;
            }
            
            /* Performance optimization */
            .glass-3d-element {
                will-change: transform, opacity;
                backface-visibility: hidden;
            }
            
            @media (prefers-reduced-motion: reduce) {
                * {
                    animation-duration: 0.01ms !important;
                    animation-iteration-count: 1 !important;
                    transition-duration: 0.01ms !important;
                }
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * Z값 추출 헬퍼
     */
    extractZValue(transform) {
        const match = transform.match(/translateZ\((\d+)px\)/);
        return match ? parseInt(match[1]) : null;
    }

    /**
     * 디버그 모드
     */
    debug() {
        console.group('🔍 Glassmorphism Debug Info');
        console.log('Current Mode:', this.currentMode);
        console.log('Page Type:', document.body.dataset.pageType);
        console.log('Enhanced Elements:', document.querySelectorAll('.glass-enhanced').length);
        console.log('3D Elements:', document.querySelectorAll('.glass-3d-element').length);
        console.log('Theme Classes:', Array.from(document.body.classList));
        console.log('CSS Variables:');
        console.log('  --layer-1:', getComputedStyle(document.body).getPropertyValue('--layer-1'));
        console.log('  --layer-2:', getComputedStyle(document.body).getPropertyValue('--layer-2'));
        console.log('  --primary-color:', getComputedStyle(document.body).getPropertyValue('--primary-color'));
        console.log('  --glass-bg:', getComputedStyle(document.body).getPropertyValue('--glass-bg'));
        console.groupEnd();
    }
}

// 인스턴스 생성 및 전역 노출
const glassmorphismAuto = new GlassmorphismAutoApply();

// 전역 객체로 노출 (디버깅용)
window.GlassmorphismAutoApply = GlassmorphismAutoApply;
window.glassmorphismAuto = glassmorphismAuto;

// ES6 모듈 export
export { GlassmorphismAutoApply, glassmorphismAuto };
export default glassmorphismAuto;

console.log('✨ Glassmorphism Auto Apply Module Loaded');
