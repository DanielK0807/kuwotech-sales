/* ============================================
   동적 버튼 컴포넌트 - UI/UX 가이드 기반
   파일: 08.components/02_dynamic_button.js
   작성일: 2025-01-27
   설명: 재사용 가능한 동적 버튼 컴포넌트
============================================ */

/**
 * 동적 버튼 컴포넌트
 * BaseComponent를 상속받아 구현
 */
class DynamicButton extends BaseComponent {
    constructor(config) {
        // 기본 설정 병합
        const defaultConfig = {
            className: 'btn',
            text: '버튼',
            icon: null,
            iconPosition: 'left', // left, right
            size: 'md', // xs, sm, md, lg, xl
            variant: 'primary', // primary, secondary, success, warning, error, ghost, glass
            shape: 'rounded', // rounded, square, pill
            fullWidth: false,
            loading: false,
            loadingText: '처리 중...',
            disabled: false,
            ripple: true,
            glass: false,
            glow: false,
            gradient: false,
            animation: true,
            tooltip: null,
            badge: null,
            onClick: null,
            onHover: null
        };
        
        super({ ...defaultConfig, ...config });
        
        // 버튼 상태
        this.state = {
            ...this.state,
            isPressed: false,
            isHovered: false,
            isFocused: false
        };
    }
    
    /**
     * 컴포넌트 초기화
     */
    init() {
        super.init();
        
        // 리플 효과 설정
        if (this.config.ripple) {
            this.setupRipple();
        }
        
        // 글로우 효과 설정
        if (this.config.glow) {
            this.setupGlow();
        }
    }
    
    /**
     * 버튼 내용 렌더링
     */
    renderContent() {
        const { text, icon, iconPosition, loading, loadingText, badge, glass, gradient } = this.config;
        
        let content = '';
        
        // 아이콘 (왼쪽)
        if (icon && iconPosition === 'left' && !loading) {
            content += this.renderIcon(icon);
        }
        
        // 로딩 스피너
        if (loading) {
            content += this.renderLoader();
        }
        
        // 텍스트
        content += `<span class="btn-text">${loading ? loadingText : text}</span>`;
        
        // 아이콘 (오른쪽)
        if (icon && iconPosition === 'right' && !loading) {
            content += this.renderIcon(icon);
        }
        
        // 뱃지
        if (badge) {
            content += this.renderBadge(badge);
        }
        
        // 리플 컨테이너
        if (this.config.ripple) {
            content += '<span class="btn-ripple"></span>';
        }
        
        // 글래스 오버레이
        if (glass) {
            content += '<span class="btn-glass-overlay"></span>';
        }
        
        // 그라데이션 오버레이
        if (gradient) {
            content += '<span class="btn-gradient-overlay"></span>';
        }
        
        return content;
    }
    
    /**
     * 아이콘 렌더링
     */
    renderIcon(icon) {
        // 이모지 체크
        if (icon.startsWith('emoji:')) {
            return `<span class="btn-icon btn-icon-emoji">${icon.replace('emoji:', '')}</span>`;
        }
        
        // SVG 아이콘
        if (icon.startsWith('svg:')) {
            return `<span class="btn-icon btn-icon-svg">${this.getSVGIcon(icon.replace('svg:', ''))}</span>`;
        }
        
        // 클래스 아이콘
        return `<span class="btn-icon"><i class="${icon}"></i></span>`;
    }
    
    /**
     * 로더 렌더링
     */
    renderLoader() {
        return `
            <span class="btn-loader">
                <span class="btn-loader-spinner">
                    <span></span>
                    <span></span>
                    <span></span>
                </span>
            </span>
        `;
    }
    
    /**
     * 뱃지 렌더링
     */
    renderBadge(badge) {
        const badgeClass = badge.type ? `btn-badge-${badge.type}` : '';
        return `
            <span class="btn-badge ${badgeClass}">
                ${badge.text || badge}
            </span>
        `;
    }
    
    /**
     * 전체 렌더링
     */
    render() {
        const { tooltip, disabled, loading, fullWidth } = this.config;
        
        return `
            <button
                id="${this.config.id}"
                class="${this.generateClassName()}"
                style="${this.styleString()}"
                ${disabled || loading ? 'disabled' : ''}
                ${tooltip ? `title="${tooltip}"` : ''}
                ${fullWidth ? 'data-full-width="true"' : ''}
                type="button"
            >
                ${this.renderContent()}
            </button>
        `;
    }
    
    /**
     * 클래스 이름 생성
     */
    generateClassName() {
        const classes = [
            'btn',
            `btn-${this.config.variant}`,
            `btn-${this.config.size}`,
            `btn-${this.config.shape}`,
            this.config.glass ? 'btn-glass' : '',
            this.config.glow ? 'btn-glow' : '',
            this.config.gradient ? 'btn-gradient' : '',
            this.config.fullWidth ? 'btn-full-width' : '',
            this.config.loading ? 'btn-loading' : '',
            this.config.disabled ? 'btn-disabled' : '',
            this.config.customClass
        ];
        
        return classes.filter(Boolean).join(' ');
    }
    
    /**
     * 스타일 생성
     */
    generateStyles() {
        const styles = super.generateStyles();
        
        // 버튼 특화 스타일
        if (this.config.variant === 'glass') {
            Object.assign(styles, {
                '--btn-bg': 'var(--glass-bg)',
                '--btn-backdrop': 'var(--glass-blur)',
                '--btn-border': 'var(--glass-border)'
            });
        }
        
        if (this.config.glow) {
            Object.assign(styles, {
                '--btn-glow': 'var(--glow-primary)',
                '--btn-glow-hover': 'var(--glow-strong)'
            });
        }
        
        return styles;
    }
    
    /**
     * 리플 효과 설정
     */
    setupRipple() {
        this.on('mousedown', (e) => {
            if (this.config.disabled || this.config.loading) return;
            
            const button = e.currentTarget;
            const ripple = button.querySelector('.btn-ripple');
            
            if (!ripple) return;
            
            const rect = button.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            const wave = document.createElement('span');
            wave.className = 'btn-ripple-wave';
            wave.style.width = wave.style.height = size + 'px';
            wave.style.left = x + 'px';
            wave.style.top = y + 'px';
            
            ripple.appendChild(wave);
            
            // 애니메이션 후 제거
            setTimeout(() => wave.remove(), 600);
        });
    }
    
    /**
     * 글로우 효과 설정
     */
    setupGlow() {
        this.on('mouseenter', () => {
            if (this.refs.root) {
                this.refs.root.classList.add('btn-glow-active');
            }
        });
        
        this.on('mouseleave', () => {
            if (this.refs.root) {
                this.refs.root.classList.remove('btn-glow-active');
            }
        });
    }
    
    /**
     * 이벤트 바인딩
     */
    bindEvents() {
        super.bindEvents();
        
        // 클릭 이벤트
        if (this.config.onClick) {
            this.on('click', (e) => {
                if (this.config.disabled || this.config.loading) {
                    e.preventDefault();
                    return;
                }
                
                // 애니메이션
                if (this.config.animation && window.animationManager) {
                    window.animationManager.animate(this.refs.root, 'pulse', {
                        duration: 200
                    });
                }
                
                this.config.onClick(e, this);
            });
        }
        
        // 호버 이벤트
        if (this.config.onHover) {
            this.on('mouseenter', (e) => this.config.onHover(e, this, true));
            this.on('mouseleave', (e) => this.config.onHover(e, this, false));
        }
        
        // 포커스 이벤트
        this.on('focus', () => {
            this.setState({ isFocused: true });
        });
        
        this.on('blur', () => {
            this.setState({ isFocused: false });
        });
    }
    
    /**
     * 로딩 상태 설정
     */
    setLoading(loading, loadingText) {
        this.config.loading = loading;
        if (loadingText) {
            this.config.loadingText = loadingText;
        }
        this.update();
    }
    
    /**
     * 비활성화 상태 설정
     */
    setDisabled(disabled) {
        this.config.disabled = disabled;
        this.update();
    }
    
    /**
     * 텍스트 변경
     */
    setText(text) {
        this.config.text = text;
        if (this.refs.root) {
            const textElement = this.refs.root.querySelector('.btn-text');
            if (textElement && !this.config.loading) {
                textElement.textContent = text;
            }
        }
    }
    
    /**
     * 뱃지 업데이트
     */
    setBadge(badge) {
        this.config.badge = badge;
        if (this.refs.root) {
            const badgeElement = this.refs.root.querySelector('.btn-badge');
            if (badge) {
                if (badgeElement) {
                    badgeElement.textContent = badge.text || badge;
                } else {
                    this.refs.root.insertAdjacentHTML('beforeend', this.renderBadge(badge));
                }
            } else if (badgeElement) {
                badgeElement.remove();
            }
        }
    }
    
    /**
     * SVG 아이콘 가져오기
     */
    getSVGIcon(name) {
        const icons = {
            check: '<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>',
            close: '<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/></svg>',
            arrow_right: '<svg viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6-6-6z"/></svg>',
            arrow_left: '<svg viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12l4.58-4.59z"/></svg>',
            plus: '<svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>',
            minus: '<svg viewBox="0 0 24 24"><path d="M19 13H5v-2h14v2z"/></svg>',
            refresh: '<svg viewBox="0 0 24 24"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>',
            download: '<svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>',
            upload: '<svg viewBox="0 0 24 24"><path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z"/></svg>',
            search: '<svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>'
        };
        
        return icons[name] || '';
    }
}

/**
 * 버튼 그룹 컴포넌트
 */
class ButtonGroup extends BaseComponent {
    constructor(config) {
        const defaultConfig = {
            className: 'btn-group',
            buttons: [],
            orientation: 'horizontal', // horizontal, vertical
            size: 'md',
            variant: 'primary',
            connected: true, // 버튼들을 연결된 형태로 표시
            exclusive: false, // 하나만 선택 가능
            multiple: false, // 여러 개 선택 가능
            onChange: null
        };
        
        super({ ...defaultConfig, ...config });
        
        this.buttons = [];
        this.selected = new Set();
    }
    
    renderContent() {
        const { buttons, size, variant, connected } = this.config;
        
        let content = '';
        
        buttons.forEach((buttonConfig, index) => {
            const button = new DynamicButton({
                ...buttonConfig,
                size: buttonConfig.size || size,
                variant: buttonConfig.variant || variant,
                customClass: `btn-group-item ${connected ? 'btn-connected' : ''}`
            });
            
            this.buttons.push(button);
            content += button.render();
        });
        
        return content;
    }
    
    render() {
        return `
            <div 
                id="${this.config.id}"
                class="${this.generateClassName()}"
                style="${this.styleString()}"
                data-orientation="${this.config.orientation}"
            >
                ${this.renderContent()}
            </div>
        `;
    }
    
    bindEvents() {
        super.bindEvents();
        
        // 버튼 클릭 이벤트
        this.buttons.forEach((button, index) => {
            button.on('click', (e) => {
                this.handleButtonClick(index, button);
            });
        });
    }
    
    handleButtonClick(index, button) {
        if (this.config.exclusive) {
            // 단일 선택
            this.selected.clear();
            this.selected.add(index);
            
            // 모든 버튼 비활성화
            this.buttons.forEach((btn, i) => {
                btn.refs.root.classList.toggle('btn-active', i === index);
            });
        } else if (this.config.multiple) {
            // 다중 선택
            if (this.selected.has(index)) {
                this.selected.delete(index);
                button.refs.root.classList.remove('btn-active');
            } else {
                this.selected.add(index);
                button.refs.root.classList.add('btn-active');
            }
        }
        
        // 변경 이벤트
        if (this.config.onChange) {
            this.config.onChange(Array.from(this.selected), this);
        }
    }
}

// 전역으로 노출
window.DynamicButton = DynamicButton;
window.ButtonGroup = ButtonGroup;

// 헬퍼 함수
window.createButton = function(config) {
    const button = new DynamicButton(config);
    return button;
};

window.createButtonGroup = function(config) {
    const group = new ButtonGroup(config);
    return group;
};