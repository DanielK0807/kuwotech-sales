/* ============================================
   동적 모달 컴포넌트 - UI/UX 가이드 기반
   파일: 08.components/03_dynamic_modal.js
   작성일: 2025-01-27
   설명: 재사용 가능한 동적 모달 컴포넌트
============================================ */

/**
 * 동적 모달 컴포넌트
 * BaseComponent를 상속받아 구현
 */
class DynamicModal extends BaseComponent {
    constructor(config) {
        const defaultConfig = {
            className: 'modal',
            title: '',
            content: '',
            footer: null,
            size: 'md', // sm, md, lg, xl, full
            position: 'center', // center, top, bottom, left, right
            animation: 'fade', // fade, slide, scale, rotate, glass
            backdrop: true,
            backdropBlur: true,
            closable: true,
            closeOnEsc: true,
            closeOnBackdrop: true,
            keyboard: true,
            draggable: false,
            resizable: false,
            maximizable: false,
            glass: true,
            showHeader: true,
            showFooter: true,
            buttons: [],
            onOpen: null,
            onClose: null,
            onConfirm: null,
            onCancel: null,
            zIndex: null
        };
        
        super({ ...defaultConfig, ...config });
        
        // 모달 상태
        this.state = {
            ...this.state,
            isOpen: false,
            isMaximized: false,
            isDragging: false,
            isResizing: false,
            position: { x: 0, y: 0 },
            size: { width: null, height: null }
        };
        
        // 드래그 관련
        this.dragData = {
            startX: 0,
            startY: 0,
            currentX: 0,
            currentY: 0
        };
    }
    
    /**
     * 모달 내용 렌더링
     */
    renderContent() {
        const { showHeader, showFooter } = this.config;
        
        let content = '';
        
        // 헤더
        if (showHeader) {
            content += this.renderHeader();
        }
        
        // 바디
        content += this.renderBody();
        
        // 푸터
        if (showFooter) {
            content += this.renderFooter();
        }
        
        return content;
    }
    
    /**
     * 헤더 렌더링
     */
    renderHeader() {
        const { title, closable, maximizable, draggable } = this.config;
        
        return `
            <div class="modal-header ${draggable ? 'modal-draggable' : ''}">
                <h3 class="modal-title">${title}</h3>
                <div class="modal-header-actions">
                    ${maximizable ? `
                        <button class="modal-btn modal-btn-maximize" title="최대화">
                            <span>🗖</span>
                        </button>
                    ` : ''}
                    ${closable ? `
                        <button class="modal-btn modal-btn-close" title="닫기">
                            <span>×</span>
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    /**
     * 바디 렌더링
     */
    renderBody() {
        const { content } = this.config;
        
        return `
            <div class="modal-body">
                ${typeof content === 'function' ? content() : content}
            </div>
        `;
    }
    
    /**
     * 푸터 렌더링
     */
    renderFooter() {
        const { footer, buttons } = this.config;
        
        if (footer) {
            return `
                <div class="modal-footer">
                    ${typeof footer === 'function' ? footer() : footer}
                </div>
            `;
        }
        
        // 버튼 렌더링
        if (buttons && buttons.length > 0) {
            let buttonsHtml = '';
            
            buttons.forEach(buttonConfig => {
                const button = new DynamicButton({
                    size: 'md',
                    ...buttonConfig
                });
                buttonsHtml += button.render();
            });
            
            return `
                <div class="modal-footer">
                    <div class="modal-footer-buttons">
                        ${buttonsHtml}
                    </div>
                </div>
            `;
        }
        
        return '';
    }
    
    /**
     * 전체 렌더링
     */
    render() {
        const { backdrop, glass } = this.config;
        
        let html = '';
        
        // 백드롭
        if (backdrop) {
            html += `
                <div class="modal-backdrop ${glass ? 'modal-backdrop-blur' : ''}" id="${this.config.id}-backdrop"></div>
            `;
        }
        
        // 모달 컨테이너
        html += `
            <div class="modal-wrapper" id="${this.config.id}-wrapper">
                <div 
                    id="${this.config.id}"
                    class="${this.generateClassName()}"
                    style="${this.styleString()}"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="${this.config.id}-title"
                >
                    ${this.renderContent()}
                    ${this.config.resizable ? '<div class="modal-resize-handle"></div>' : ''}
                </div>
            </div>
        `;
        
        return html;
    }
    
    /**
     * 클래스 이름 생성
     */
    generateClassName() {
        const classes = [
            'modal',
            `modal-${this.config.size}`,
            `modal-${this.config.position}`,
            `modal-animation-${this.config.animation}`,
            this.config.glass ? 'modal-glass' : '',
            this.state.isMaximized ? 'modal-maximized' : '',
            this.state.isDragging ? 'modal-dragging' : '',
            this.config.customClass
        ];
        
        return classes.filter(Boolean).join(' ');
    }
    
    /**
     * 스타일 생성
     */
    generateStyles() {
        const styles = super.generateStyles();
        const { size, position } = this.config;
        
        // 크기 스타일
        const sizeStyles = this.getSizeStyles();
        Object.assign(styles, sizeStyles);
        
        // 위치 스타일
        const positionStyles = this.getPositionStyles();
        Object.assign(styles, positionStyles);
        
        // 커스텀 z-index
        if (this.config.zIndex) {
            styles['z-index'] = this.config.zIndex;
        }
        
        // 드래그된 위치
        if (this.state.position.x !== 0 || this.state.position.y !== 0) {
            styles.transform = `translate(${this.state.position.x}px, ${this.state.position.y}px)`;
        }
        
        // 리사이즈된 크기
        if (this.state.size.width) {
            styles.width = `${this.state.size.width}px`;
        }
        if (this.state.size.height) {
            styles.height = `${this.state.size.height}px`;
        }
        
        return styles;
    }
    
    /**
     * 크기 스타일 가져오기
     */
    getSizeStyles() {
        const sizes = {
            sm: { width: '400px', maxWidth: '90vw' },
            md: { width: '600px', maxWidth: '90vw' },
            lg: { width: '800px', maxWidth: '90vw' },
            xl: { width: '1200px', maxWidth: '95vw' },
            full: { width: '100vw', height: '100vh' }
        };
        
        return sizes[this.config.size] || sizes.md;
    }
    
    /**
     * 위치 스타일 가져오기
     */
    getPositionStyles() {
        if (this.state.isMaximized) {
            return {
                top: '0',
                left: '0',
                width: '100vw',
                height: '100vh',
                transform: 'none'
            };
        }
        
        const positions = {
            center: {
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)'
            },
            top: {
                top: 'var(--spacing-xl)',
                left: '50%',
                transform: 'translateX(-50%)'
            },
            bottom: {
                bottom: 'var(--spacing-xl)',
                left: '50%',
                transform: 'translateX(-50%)'
            },
            left: {
                top: '50%',
                left: 'var(--spacing-xl)',
                transform: 'translateY(-50%)'
            },
            right: {
                top: '50%',
                right: 'var(--spacing-xl)',
                transform: 'translateY(-50%)'
            }
        };
        
        return positions[this.config.position] || positions.center;
    }
    
    /**
     * 모달 열기
     */
    open() {
        if (this.state.isOpen) return;
        
        // DOM에 추가
        const container = document.createElement('div');
        container.innerHTML = this.render();
        document.body.appendChild(container);
        
        // 참조 설정
        this.refs.container = container;
        this.refs.backdrop = container.querySelector('.modal-backdrop');
        this.refs.wrapper = container.querySelector('.modal-wrapper');
        this.refs.root = container.querySelector('.modal');
        this.refs.header = container.querySelector('.modal-header');
        this.refs.body = container.querySelector('.modal-body');
        this.refs.footer = container.querySelector('.modal-footer');
        
        // 이벤트 바인딩
        this.bindEvents();
        
        // 상태 업데이트
        this.setState({ isOpen: true });
        
        // 애니메이션
        this.animateOpen();
        
        // 열기 콜백
        if (this.config.onOpen) {
            this.config.onOpen(this);
        }
        
        // 포커스 트랩 설정
        this.setupFocusTrap();
        
        // ESC 키 리스너
        if (this.config.closeOnEsc) {
            this.setupEscListener();
        }
    }
    
    /**
     * 모달 닫기
     */
    close() {
        if (!this.state.isOpen) return;
        
        // 닫기 애니메이션
        this.animateClose().then(() => {
            // DOM에서 제거
            if (this.refs.container) {
                this.refs.container.remove();
            }
            
            // 참조 초기화
            this.refs = {};
            
            // 상태 업데이트
            this.setState({ isOpen: false });
            
            // 닫기 콜백
            if (this.config.onClose) {
                this.config.onClose(this);
            }
            
            // ESC 리스너 제거
            this.removeEscListener();
        });
    }
    
    /**
     * 열기 애니메이션
     */
    animateOpen() {
        if (!window.animationManager) return;
        
        const animation = this.config.animation;
        
        // 백드롭 애니메이션
        if (this.refs.backdrop) {
            window.animationManager.animate(this.refs.backdrop, 'fadeIn', {
                duration: 200
            });
        }
        
        // 모달 애니메이션
        if (this.refs.root) {
            const animations = {
                fade: 'fadeIn',
                slide: 'slideIn',
                scale: 'scaleIn',
                rotate: 'rotateIn',
                glass: 'scaleIn'
            };
            
            window.animationManager.animate(this.refs.root, animations[animation] || 'fadeIn', {
                duration: 300
            });
        }
    }
    
    /**
     * 닫기 애니메이션
     */
    animateClose() {
        if (!window.animationManager) {
            return Promise.resolve();
        }
        
        const animation = this.config.animation;
        const promises = [];
        
        // 백드롭 애니메이션
        if (this.refs.backdrop) {
            promises.push(
                window.animationManager.animate(this.refs.backdrop, 'fadeOut', {
                    duration: 200
                })
            );
        }
        
        // 모달 애니메이션
        if (this.refs.root) {
            const animations = {
                fade: 'fadeOut',
                slide: 'slideOut',
                scale: 'scaleOut',
                rotate: 'scaleOut',
                glass: 'scaleOut'
            };
            
            promises.push(
                window.animationManager.animate(this.refs.root, animations[animation] || 'fadeOut', {
                    duration: 300
                })
            );
        }
        
        return Promise.all(promises);
    }
    
    /**
     * 이벤트 바인딩
     */
    bindEvents() {
        // 닫기 버튼
        const closeBtn = this.refs.root?.querySelector('.modal-btn-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }
        
        // 최대화 버튼
        const maxBtn = this.refs.root?.querySelector('.modal-btn-maximize');
        if (maxBtn) {
            maxBtn.addEventListener('click', () => this.toggleMaximize());
        }
        
        // 백드롭 클릭
        if (this.config.closeOnBackdrop && this.refs.backdrop) {
            this.refs.backdrop.addEventListener('click', () => this.close());
        }
        
        // 푸터 버튼들
        const buttons = this.refs.footer?.querySelectorAll('.btn');
        if (buttons) {
            buttons.forEach((btn, index) => {
                const buttonConfig = this.config.buttons[index];
                if (buttonConfig && buttonConfig.onClick) {
                    btn.addEventListener('click', (e) => {
                        buttonConfig.onClick(e, this);
                    });
                }
            });
        }
        
        // 드래그 설정
        if (this.config.draggable) {
            this.setupDraggable();
        }
        
        // 리사이즈 설정
        if (this.config.resizable) {
            this.setupResizable();
        }
    }
    
    /**
     * 최대화 토글
     */
    toggleMaximize() {
        this.setState({ isMaximized: !this.state.isMaximized });
        
        if (this.refs.root) {
            this.refs.root.classList.toggle('modal-maximized', this.state.isMaximized);
            
            // 스타일 업데이트
            const styles = this.getPositionStyles();
            Object.entries(styles).forEach(([key, value]) => {
                this.refs.root.style[key] = value;
            });
        }
    }
    
    /**
     * 드래그 설정
     */
    setupDraggable() {
        if (!this.refs.header) return;
        
        this.refs.header.style.cursor = 'move';
        
        let isDragging = false;
        let startX = 0;
        let startY = 0;
        let initialX = 0;
        let initialY = 0;
        
        const handleMouseDown = (e) => {
            if (this.state.isMaximized) return;
            
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            
            const transform = window.getComputedStyle(this.refs.root).transform;
            if (transform !== 'none') {
                const matrix = new DOMMatrix(transform);
                initialX = matrix.m41;
                initialY = matrix.m42;
            } else {
                initialX = 0;
                initialY = 0;
            }
            
            this.refs.root.classList.add('modal-dragging');
        };
        
        const handleMouseMove = (e) => {
            if (!isDragging) return;
            
            e.preventDefault();
            
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            const newX = initialX + deltaX;
            const newY = initialY + deltaY;
            
            this.refs.root.style.transform = `translate(${newX}px, ${newY}px)`;
        };
        
        const handleMouseUp = () => {
            isDragging = false;
            this.refs.root.classList.remove('modal-dragging');
        };
        
        this.refs.header.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }
    
    /**
     * 리사이즈 설정
     */
    setupResizable() {
        const handle = this.refs.root?.querySelector('.modal-resize-handle');
        if (!handle) return;
        
        let isResizing = false;
        let startX = 0;
        let startY = 0;
        let startWidth = 0;
        let startHeight = 0;
        
        handle.addEventListener('mousedown', (e) => {
            isResizing = true;
            startX = e.clientX;
            startY = e.clientY;
            startWidth = this.refs.root.offsetWidth;
            startHeight = this.refs.root.offsetHeight;
            
            this.refs.root.classList.add('modal-resizing');
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            const newWidth = Math.max(300, startWidth + deltaX);
            const newHeight = Math.max(200, startHeight + deltaY);
            
            this.refs.root.style.width = `${newWidth}px`;
            this.refs.root.style.height = `${newHeight}px`;
        });
        
        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                this.refs.root.classList.remove('modal-resizing');
            }
        });
    }
    
    /**
     * 포커스 트랩 설정
     */
    setupFocusTrap() {
        if (!this.refs.root) return;
        
        const focusableElements = this.refs.root.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        if (focusableElements.length === 0) return;
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        // 첫 번째 요소에 포커스
        firstElement.focus();
        
        // Tab 키 트랩
        this.refs.root.addEventListener('keydown', (e) => {
            if (e.key !== 'Tab') return;
            
            if (e.shiftKey) {
                if (document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement.focus();
                }
            } else {
                if (document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement.focus();
                }
            }
        });
    }
    
    /**
     * ESC 키 리스너 설정
     */
    setupEscListener() {
        this.escHandler = (e) => {
            if (e.key === 'Escape') {
                this.close();
            }
        };
        
        document.addEventListener('keydown', this.escHandler);
    }
    
    /**
     * ESC 키 리스너 제거
     */
    removeEscListener() {
        if (this.escHandler) {
            document.removeEventListener('keydown', this.escHandler);
            this.escHandler = null;
        }
    }
    
    /**
     * 내용 업데이트
     */
    setContent(content) {
        this.config.content = content;
        
        if (this.refs.body) {
            this.refs.body.innerHTML = typeof content === 'function' ? content() : content;
        }
    }
    
    /**
     * 제목 업데이트
     */
    setTitle(title) {
        this.config.title = title;
        
        const titleElement = this.refs.header?.querySelector('.modal-title');
        if (titleElement) {
            titleElement.textContent = title;
        }
    }
}

/**
 * 모달 매니저
 * 여러 모달을 관리
 */
class ModalManager {
    constructor() {
        this.modals = new Map();
        this.stack = [];
        this.zIndexBase = 1000;
    }
    
    /**
     * 모달 생성
     */
    create(config) {
        const modal = new DynamicModal({
            ...config,
            zIndex: this.zIndexBase + this.stack.length * 10
        });
        
        this.modals.set(modal.config.id, modal);
        return modal;
    }
    
    /**
     * 모달 열기
     */
    open(modalOrConfig) {
        let modal;
        
        if (modalOrConfig instanceof DynamicModal) {
            modal = modalOrConfig;
        } else {
            modal = this.create(modalOrConfig);
        }
        
        modal.open();
        this.stack.push(modal);
        
        return modal;
    }
    
    /**
     * 모달 닫기
     */
    close(modal) {
        if (typeof modal === 'string') {
            modal = this.modals.get(modal);
        }
        
        if (modal) {
            modal.close();
            const index = this.stack.indexOf(modal);
            if (index > -1) {
                this.stack.splice(index, 1);
            }
        }
    }
    
    /**
     * 모든 모달 닫기
     */
    closeAll() {
        [...this.stack].reverse().forEach(modal => modal.close());
        this.stack = [];
    }
    
    /**
     * 최상위 모달 가져오기
     */
    getTopModal() {
        return this.stack[this.stack.length - 1];
    }
}

// 전역 모달 매니저
const modalManager = new ModalManager();

// 전역으로 노출
window.DynamicModal = DynamicModal;
window.modalManager = modalManager;

// 헬퍼 함수
window.createModal = function(config) {
    return modalManager.create(config);
};

window.openModal = function(config) {
    return modalManager.open(config);
};

window.closeModal = function(modal) {
    return modalManager.close(modal);
};

window.closeAllModals = function() {
    return modalManager.closeAll();
};