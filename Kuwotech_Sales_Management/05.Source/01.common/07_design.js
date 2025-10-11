/**
 * 글래스모피즘 디자인 시스템 - KUWOTECH 영업관리 시스템
 * 반투명 + blur 효과를 활용한 모던 UI 디자인
 */

class GlassmorphismManager {
    constructor() {
        this.styles = {
            // 기본 글래스 효과
            basic: {
                background: 'rgba(255, 255, 255, 0.08)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)', // Safari
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '16px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                transition: 'all 0.3s ease'
            },
            
            // 가벼운 글래스 효과
            light: {
                background: 'rgba(255, 255, 255, 0.12)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '12px',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
                transition: 'all 0.3s ease'
            },
            
            // 무거운 글래스 효과
            heavy: {
                background: 'rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(30px)',
                WebkitBackdropFilter: 'blur(30px)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                borderRadius: '20px',
                boxShadow: '0 12px 48px rgba(0, 0, 0, 0.5)',
                transition: 'all 0.3s ease'
            },
            
            // 다크 글래스 효과
            dark: {
                background: 'rgba(0, 0, 0, 0.3)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '16px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.8)',
                transition: 'all 0.3s ease'
            },
            
            // 컬러 글래스 효과 (테마색 기반)
            colored: {
                background: 'var(--glass-bg)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid var(--glass-border)',
                borderRadius: '16px',
                boxShadow: 'var(--glass-shadow)',
                transition: 'all 0.3s ease'
            }
        };

        this.animations = {
            // 빛 반사 효과
            shimmer: {
                background: `linear-gradient(
                    105deg,
                    transparent 40%,
                    rgba(255, 255, 255, 0.7) 50%,
                    transparent 60%
                )`,
                backgroundSize: '200% 100%',
                animation: 'shimmer 2s infinite'
            },
            
            // 펄스 효과
            pulse: {
                animation: 'pulse 2s infinite'
            },
            
            // 플로팅 효과
            float: {
                animation: 'float 6s ease-in-out infinite'
            }
        };

        this.initialized = false;
    }

    /**
     * 초기화 - CSS 애니메이션 정의 주입
     */
    init() {
        if (this.initialized) return;

        const styleSheet = document.createElement('style');
        styleSheet.textContent = `
            /* 글래스모피즘 기본 클래스 */
            .glass {
                ${this.styleToCSS(this.styles.basic)}
            }
            
            .glass-light {
                ${this.styleToCSS(this.styles.light)}
            }
            
            .glass-heavy {
                ${this.styleToCSS(this.styles.heavy)}
            }
            
            .glass-dark {
                ${this.styleToCSS(this.styles.dark)}
            }
            
            .glass-colored {
                ${this.styleToCSS(this.styles.colored)}
            }
            
            /* 글래스 패널 */
            .glass-panel {
                ${this.styleToCSS(this.styles.basic)}
                padding: 24px;
                margin-bottom: 20px;
            }
            
            /* 글래스 카드 */
            .glass-card {
                ${this.styleToCSS(this.styles.light)}
                padding: 20px;
                position: relative;
                overflow: hidden;
            }
            
            .glass-card:hover {
                transform: translateY(-4px);
                box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
            }
            
            /* 글래스 버튼 */
            .glass-button {
                ${this.styleToCSS(this.styles.light)}
                padding: 12px 24px;
                font-weight: 600;
                cursor: pointer;
                border-radius: 12px;
                text-transform: none;
                font-family: 'Paperlogy', sans-serif;
                position: relative;
                overflow: hidden;
            }
            
            .glass-button:hover {
                transform: scale(1.02);
                background: rgba(255, 255, 255, 0.15);
            }
            
            .glass-button:active {
                transform: scale(0.98);
            }
            
            .glass-button.primary {
                background: var(--gradient-primary), var(--glass-bg);
                color: var(--text-on-primary);
            }
            
            .glass-button.success {
                background: linear-gradient(135deg, #00E676 0%, #69F0AE 100%), var(--glass-bg);
                color: #212121;
            }
            
            .glass-button.danger {
                background: linear-gradient(135deg, #FF5252 0%, #FF8A80 100%), var(--glass-bg);
                color: #FFFFFF;
            }
            
            .glass-button.warning {
                background: linear-gradient(135deg, #FFC107 0%, #FFD54F 100%), var(--glass-bg);
                color: #212121;
            }
            
            /* 글래스 입력 필드 */
            .glass-input {
                ${this.styleToCSS(this.styles.light)}
                padding: 12px 16px;
                width: 100%;
                border-radius: 8px;
                font-size: 14px;
                color: var(--text-primary);
                font-family: 'Paperlogy', sans-serif;
            }
            
            .glass-input:focus {
                outline: none;
                border-color: var(--primary-color);
                background: rgba(255, 255, 255, 0.2);
            }
            
            .glass-input::placeholder {
                color: var(--text-secondary);
                opacity: 0.7;
            }
            
            /* 글래스 테이블 */
            .glass-table {
                width: 100%;
                border-collapse: separate;
                border-spacing: 0;
                ${this.styleToCSS(this.styles.light)}
                overflow: hidden;
            }
            
            .glass-table thead {
                background: var(--gradient-primary), var(--glass-bg);
            }
            
            .glass-table th {
                padding: 12px;
                text-align: left;
                font-weight: 600;
                color: var(--text-on-primary);
                border-bottom: 1px solid rgba(255, 255, 255, 0.2);
            }
            
            .glass-table td {
                padding: 12px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                color: var(--text-primary);
            }
            
            .glass-table tbody tr:hover {
                background: rgba(255, 255, 255, 0.05);
            }
            
            /* 글래스 배지 */
            .glass-badge {
                display: inline-block;
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
                ${this.styleToCSS(this.styles.light)}
            }
            
            .glass-badge.success {
                background: rgba(0, 230, 118, 0.2);
                color: #00E676;
                border-color: rgba(0, 230, 118, 0.3);
            }
            
            .glass-badge.warning {
                background: rgba(255, 193, 7, 0.2);
                color: #FFC107;
                border-color: rgba(255, 193, 7, 0.3);
            }
            
            .glass-badge.danger {
                background: rgba(255, 82, 82, 0.2);
                color: #FF5252;
                border-color: rgba(255, 82, 82, 0.3);
            }
            
            /* KPI 카드 */
            .kpi-card {
                ${this.styleToCSS(this.styles.colored)}
                padding: 24px;
                text-align: center;
                position: relative;
                overflow: hidden;
            }
            
            .kpi-card .kpi-label {
                font-size: 14px;
                color: var(--text-secondary);
                margin-bottom: 12px;
                font-weight: 500;
            }
            
            .kpi-card .kpi-value {
                font-size: 32px;
                font-weight: 800;
                color: var(--text-primary);
                margin-bottom: 8px;
            }
            
            .kpi-card .kpi-trend {
                font-size: 14px;
                font-weight: 600;
            }
            
            .kpi-card .kpi-trend.up {
                color: #00E676;
            }
            
            .kpi-card .kpi-trend.down {
                color: #FF5252;
            }
            
            /* 프로그레스 바 */
            .glass-progress {
                height: 8px;
                border-radius: 4px;
                ${this.styleToCSS(this.styles.light)}
                overflow: hidden;
            }
            
            .glass-progress-bar {
                height: 100%;
                background: var(--gradient-primary);
                border-radius: 4px;
                transition: width 0.3s ease;
            }
            
            /* 네비게이션 */
            .glass-nav {
                ${this.styleToCSS(this.styles.colored)}
                padding: 16px 24px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                position: sticky;
                top: 0;
                z-index: 100;
            }
            
            /* 사이드바 */
            .glass-sidebar {
                ${this.styleToCSS(this.styles.dark)}
                width: 250px;
                height: 100vh;
                padding: 20px;
                position: fixed;
                left: 0;
                top: 0;
            }
            
            /* 애니메이션 정의 */
            @keyframes shimmer {
                0% { background-position: -200% 0; }
                100% { background-position: 200% 0; }
            }
            
            @keyframes pulse {
                0% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.05); opacity: 0.8; }
                100% { transform: scale(1); opacity: 1; }
            }
            
            @keyframes float {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-10px); }
            }
            
            /* 반사 효과 */
            .glass-shimmer {
                position: relative;
                overflow: hidden;
            }
            
            .glass-shimmer::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                ${this.styleToCSS(this.animations.shimmer)}
            }
            
            .glass-shimmer:hover::before {
                animation: shimmer 0.5s ease-out;
            }
            
            /* 모바일 최적화 */
            @media (max-width: 768px) {
                .glass-panel,
                .glass-card {
                    backdrop-filter: blur(10px);
                    -webkit-backdrop-filter: blur(10px);
                }
                
                .glass-sidebar {
                    width: 100%;
                    height: auto;
                    position: relative;
                }
            }
            
            /* 다크모드 지원 */
            @media (prefers-color-scheme: dark) {
                .glass {
                    background: rgba(255, 255, 255, 0.05);
                }
            }
            
            /* 브라우저 호환성 */
            @supports not (backdrop-filter: blur(20px)) {
                .glass,
                .glass-panel,
                .glass-card {
                    background: rgba(255, 255, 255, 0.9);
                }
            }
        `;

        document.head.appendChild(styleSheet);
        this.initialized = true;
    }

    /**
     * 스타일 객체를 CSS 문자열로 변환
     */
    styleToCSS(style) {
        return Object.entries(style)
            .map(([key, value]) => {
                const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
                return `${cssKey}: ${value};`;
            })
            .join('\n');
    }

    /**
     * 요소에 글래스모피즘 적용
     */
    applyGlassmorphism(element, type = 'basic') {
        if (!element) return;
        
        const style = this.styles[type];
        if (!style) {
            console.warn(`Unknown glassmorphism type: ${type}`);
            return;
        }

        Object.assign(element.style, style);
    }

    /**
     * 요소에 애니메이션 추가
     */
    addAnimation(element, animationType) {
        if (!element) return;
        
        const animation = this.animations[animationType];
        if (!animation) {
            console.warn(`Unknown animation type: ${animationType}`);
            return;
        }

        Object.assign(element.style, animation);
    }

    /**
     * 커스텀 글래스 생성
     */
    createCustomGlass(options = {}) {
        const defaultOptions = {
            blur: 20,
            opacity: 0.08,
            borderOpacity: 0.2,
            borderRadius: 16,
            shadowOpacity: 0.4,
            shadowBlur: 32
        };

        const config = { ...defaultOptions, ...options };

        return {
            background: `rgba(255, 255, 255, ${config.opacity})`,
            backdropFilter: `blur(${config.blur}px)`,
            WebkitBackdropFilter: `blur(${config.blur}px)`,
            border: `1px solid rgba(255, 255, 255, ${config.borderOpacity})`,
            borderRadius: `${config.borderRadius}px`,
            boxShadow: `0 8px ${config.shadowBlur}px rgba(0, 0, 0, ${config.shadowOpacity})`
        };
    }

    /**
     * 글래스 카드 생성
     */
    createGlassCard(content, options = {}) {
        const card = document.createElement('div');
        card.className = `glass-card ${options.className || ''}`;
        
        if (options.shimmer) {
            card.classList.add('glass-shimmer');
        }
        
        if (options.float) {
            this.addAnimation(card, 'float');
        }

        card.innerHTML = content;
        return card;
    }

    /**
     * KPI 카드 생성
     */
    createKPICard(label, value, trend = null, trendDirection = 'up') {
        const card = this.createGlassCard(`
            <div class="kpi-label">${label}</div>
            <div class="kpi-value">${value}</div>
            ${trend ? `<div class="kpi-trend ${trendDirection}">${trend}</div>` : ''}
        `, { className: 'kpi-card' });
        
        return card;
    }

    /**
     * 글래스 버튼 생성
     */
    createGlassButton(text, variant = '', onClick = null) {
        const button = document.createElement('button');
        button.className = `glass-button ${variant}`;
        button.textContent = text;
        
        if (onClick) {
            button.addEventListener('click', onClick);
        }
        
        return button;
    }

    /**
     * 토스트 메시지 생성
     */
    createToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = 'glass-toast';
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 16px 24px;
            z-index: 10000;
            ${this.styleToCSS(this.styles.colored)}
            animation: slideInUp 0.3s ease-out;
        `;

        const colors = {
            success: '#00E676',
            error: '#FF5252',
            warning: '#FFC107',
            info: '#64B5F6'
        };

        toast.style.borderColor = colors[type];
        toast.innerHTML = `
            <div class="toast-content-container">
                <span class="toast-icon">
                    ${type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'}
                </span>
                <span class="toast-message-text">${message}</span>
            </div>
        `;

        return toast;
    }

    /**
     * 로딩 스피너 생성
     */
    createLoadingSpinner(size = 40) {
        const spinner = document.createElement('div');
        spinner.className = 'glass-spinner';
        spinner.style.cssText = `
            width: ${size}px;
            height: ${size}px;
            border: 4px solid rgba(255, 255, 255, 0.2);
            border-top-color: var(--primary-color);
            border-radius: 50%;
            animation: spin 1s linear infinite;
        `;

        // 스피너 애니메이션 추가
        if (!document.querySelector('#glass-spinner-style')) {
            const style = document.createElement('style');
            style.id = 'glass-spinner-style';
            style.textContent = `
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }

        return spinner;
    }

    /**
     * 모달 배경 생성
     */
    createModalBackdrop() {
        const backdrop = document.createElement('div');
        backdrop.className = 'glass-modal-backdrop';
        backdrop.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(5px);
            -webkit-backdrop-filter: blur(5px);
            z-index: 9999;
            animation: fadeIn 0.3s ease-out;
        `;

        return backdrop;
    }

    /**
     * 반응형 글래스 그리드
     */
    createResponsiveGrid(items, columns = { xs: 1, sm: 2, md: 3, lg: 4 }) {
        const grid = document.createElement('div');
        grid.className = 'glass-grid';
        grid.style.cssText = `
            display: grid;
            gap: 20px;
            grid-template-columns: repeat(${columns.lg}, 1fr);
        `;

        // 미디어 쿼리 스타일 추가
        const styleId = 'glass-grid-responsive';
        if (!document.querySelector(`#${styleId}`)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                @media (max-width: 1024px) {
                    .glass-grid { grid-template-columns: repeat(${columns.md}, 1fr); }
                }
                @media (max-width: 768px) {
                    .glass-grid { grid-template-columns: repeat(${columns.sm}, 1fr); }
                }
                @media (max-width: 480px) {
                    .glass-grid { grid-template-columns: repeat(${columns.xs}, 1fr); }
                }
            `;
            document.head.appendChild(style);
        }

        items.forEach(item => grid.appendChild(item));
        return grid;
    }
}

// 싱글톤 인스턴스
const glassmorphism = new GlassmorphismManager();

// 초기화
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => glassmorphism.init());
} else {
    glassmorphism.init();
}

// 편의 함수 export
export const applyGlassmorphism = (element, type) => glassmorphism.applyGlassmorphism(element, type);
export const createGlassCard = (content, options) => glassmorphism.createGlassCard(content, options);
export const createKPICard = (label, value, trend, direction) => glassmorphism.createKPICard(label, value, trend, direction);
export const createGlassButton = (text, variant, onClick) => glassmorphism.createGlassButton(text, variant, onClick);
export const createToast = (message, type) => glassmorphism.createToast(message, type);
export const initGlassmorphism = () => glassmorphism.init();

// 전역 노출
window.glassmorphism = glassmorphism;

export { glassmorphism };
export default glassmorphism;