// ============================================
// [MODULE: 모달창 시스템 - UI 사양서 기반]
// 파일 위치: 05.Source/01.common/05_modal.js
// 수정일: 2025-01-27
// 설명: UI 사양서 기반 동적 모달 시스템
// ============================================

import { MODAL_CONFIG, ANIMATION_CONFIG } from './01_global_config.js';
import { generateId } from './02_utils.js';

// ============================================
// [SECTION: 모달 상태 관리]
// ============================================

const modalStack = [];
let modalOverlay = null;
let focusTrap = null;
let lastFocusedElement = null;

// UI 사양서 기반 모달 크기 정의 (1.5배 확대)
const MODAL_SIZES = {
    xs: {
        width: '600px',
        minHeight: '300px',
        maxHeight: '600px'
    },
    sm: {
        width: '750px',
        minHeight: '375px',
        maxHeight: '750px'
    },
    md: {
        width: '900px',
        minHeight: '450px',
        maxHeight: '900px'
    },
    lg: {
        width: '1200px',
        minHeight: '600px',
        maxHeight: '1050px'
    },
    xl: {
        width: '1800px',
        minHeight: '750px',
        maxHeight: 'calc(100vh - 100px)'
    },
    full: {
        width: 'calc(100vw - var(--spacing-xl) * 2)',
        minHeight: 'calc(100vh - var(--spacing-xl) * 2)',
        maxHeight: 'calc(100vh - var(--spacing-xl) * 2)'
    }
};

// 모달 위치 정의
const MODAL_POSITIONS = {
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

// ============================================
// [SECTION: 모달 클래스]
// ============================================

class Modal {
    constructor(options = {}) {
        this.id = options.id || generateId('modal');
        this.size = options.size || 'md';
        this.position = options.position || 'center';
        this.title = options.title || '';
        this.content = options.content || '';
        this.footer = options.footer || null;
        this.className = options.className || '';
        this.closeOnEsc = options.closeOnEsc !== false;
        this.closeOnOverlayClick = options.closeOnOverlayClick !== false;
        this.showCloseButton = options.showCloseButton !== false;
        this.preventScroll = options.preventScroll !== false;
        this.focusTrap = options.focusTrap !== false;
        this.onOpen = options.onOpen || null;
        this.onClose = options.onClose || null;
        this.buttons = options.buttons || [];
        this.customStyles = options.customStyles || {};
        
        this.element = null;
        this.isOpen = false;
        
        this.create();
    }
    
    /**
     * 모달 생성
     */
    create() {
        // 모달 컨테이너
        const modal = document.createElement('div');
        modal.className = `modal glass-panel ${this.className}`;
        modal.id = this.id;
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', `${this.id}-title`);
        
        // 크기와 위치 스타일 적용
        const sizeConfig = MODAL_SIZES[this.size] || MODAL_SIZES.md;
        const positionConfig = MODAL_POSITIONS[this.position] || MODAL_POSITIONS.center;
        
        Object.assign(modal.style, {
            position: 'fixed',
            width: `var(--modal-width, ${sizeConfig.width})`,
            minHeight: `var(--modal-min-height, ${sizeConfig.minHeight})`,
            maxHeight: `var(--modal-max-height, ${sizeConfig.maxHeight})`,
            maxWidth: 'calc(100vw - var(--spacing-xl) * 2)',
            zIndex: 'var(--z-index-modal)',
            display: 'none',
            flexDirection: 'column',
            ...positionConfig,
            ...this.customStyles
        });
        
        // 헤더 생성
        if (this.title || this.showCloseButton) {
            const header = this.createHeader();
            modal.appendChild(header);
        }
        
        // 바디 생성
        const body = this.createBody();
        modal.appendChild(body);
        
        // 푸터 생성
        if (this.footer || this.buttons.length > 0) {
            const footer = this.createFooter();
            modal.appendChild(footer);
        }
        
        this.element = modal;
        
        // DOM에 추가
        document.body.appendChild(modal);
    }
    
    /**
     * 헤더 생성
     */
    createHeader() {
        const header = document.createElement('div');
        header.className = 'modal-header';
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: calc(var(--spacing-lg) * 1.5);
            border-bottom: 1px solid var(--glass-border);
            min-height: calc(var(--spacing-unit) * 12);
        `;
        
        // 제목
        if (this.title) {
            const title = document.createElement('h2');
            title.id = `${this.id}-title`;
            title.className = 'modal-title';
            title.textContent = this.title;
            title.style.cssText = `
                font-size: calc(var(--font-xl) * 1.5);
                font-weight: var(--font-weight-semibold);
                color: #FFFFFF;
                text-shadow: 0 2px 8px rgba(0, 0, 0, 0.4), 0 4px 16px rgba(0, 0, 0, 0.3);
                margin: 0;
            `;
            header.appendChild(title);
        }
        
        // 닫기 버튼
        if (this.showCloseButton) {
            const closeBtn = document.createElement('button');
            closeBtn.className = 'modal-close';
            closeBtn.innerHTML = '&times;';
            closeBtn.setAttribute('aria-label', '닫기');
            closeBtn.style.cssText = `
                background: transparent;
                border: none;
                color: var(--text-secondary);
                font-size: 36px;
                cursor: pointer;
                padding: calc(var(--spacing-sm) * 1.5);
                line-height: 1;
                transition: var(--transition-colors);
            `;
            closeBtn.onclick = () => this.close();
            header.appendChild(closeBtn);
        }
        
        return header;
    }
    
    /**
     * 바디 생성
     */
    createBody() {
        const body = document.createElement('div');
        body.className = 'modal-body';
        body.style.cssText = `
            flex: 1 1 auto;
            padding: calc(var(--spacing-xl) * 1.5);
            overflow-y: auto;
            overflow-x: hidden;
            max-height: calc(100vh - 400px);
            font-size: calc(var(--font-md) * 1.5);
            line-height: 1.6;
            color: #FFFFFF;
        `;
        
        if (typeof this.content === 'string') {
            body.innerHTML = this.content;
        } else if (this.content instanceof HTMLElement) {
            body.appendChild(this.content);
        }
        
        return body;
    }
    
    /**
     * 푸터 생성
     */
    createFooter() {
        const footer = document.createElement('div');
        footer.className = 'modal-footer';
        footer.style.cssText = `
            display: flex;
            justify-content: flex-end;
            gap: calc(var(--spacing-md) * 1.5);
            padding: calc(var(--spacing-lg) * 1.5);
            border-top: 1px solid var(--glass-border);
            min-height: calc(var(--spacing-unit) * 10);
        `;
        
        // 커스텀 푸터 콘텐츠
        if (this.footer) {
            if (typeof this.footer === 'string') {
                footer.innerHTML = this.footer;
            } else if (this.footer instanceof HTMLElement) {
                footer.appendChild(this.footer);
            }
        }
        
        // 버튼 추가
        this.buttons.forEach(btnConfig => {
            const button = document.createElement('button');
            button.className = `btn ${btnConfig.className || 'btn-secondary'}`;
            button.textContent = btnConfig.text;
            // ✅ 버튼 크기 및 폰트 크기 증가 (사용자 요청)
            button.style.fontSize = '18px';  /* 기존 var(--font-md)보다 크게 */
            button.style.padding = '14px 32px';  /* 기존보다 크게 */
            button.style.minWidth = '120px';  /* 최소 너비 보장 */
            button.style.fontWeight = '600';  /* 폰트 강조 */

            if (btnConfig.onClick) {
                button.onclick = () => {
                    const result = btnConfig.onClick(this);
                    if (result !== false) {
                        this.close();
                    }
                };
            }

            footer.appendChild(button);
        });
        
        // 기본 버튼 (버튼이 없을 경우)
        if (this.buttons.length === 0 && !this.footer) {
            const closeBtn = document.createElement('button');
            closeBtn.className = 'btn btn-primary';
            closeBtn.textContent = '확인';
            closeBtn.style.fontSize = 'var(--font-md)';  /* 폰트 크기 정상화 */
            closeBtn.style.padding = 'var(--spacing-sm) var(--spacing-lg)';  /* 패딩 정상화 */
            closeBtn.onclick = () => this.close();
            footer.appendChild(closeBtn);
        }
        
        return footer;
    }
    
    /**
     * 모달 열기
     */
    open() {
        if (this.isOpen) return;
        
        // 현재 포커스 저장
        lastFocusedElement = document.activeElement;
        
        // 오버레이 생성 및 표시
        this.showOverlay();
        
        // 스크롤 방지
        if (this.preventScroll) {
            document.body.style.overflow = 'hidden';
        }
        
        // 모달 표시
        this.element.style.display = 'flex';
        
        // 애니메이션
        requestAnimationFrame(() => {
            this.element.classList.add('modal-open');
            this.element.style.opacity = '1';
        });
        
        // 스택에 추가
        modalStack.push(this);
        
        // 포커스 트랩 설정
        if (this.focusTrap) {
            this.setupFocusTrap();
        }
        
        // ESC 키 이벤트
        if (this.closeOnEsc) {
            this.handleEscKey = (e) => {
                if (e.key === 'Escape' && modalStack[modalStack.length - 1] === this) {
                    this.close();
                }
            };
            document.addEventListener('keydown', this.handleEscKey);
        }
        
        this.isOpen = true;
        
        // 콜백 실행
        if (this.onOpen) {
            this.onOpen(this);
        }
    }
    
    /**
     * 모달 닫기
     */
    close() {
        if (!this.isOpen) return;
        
        // 애니메이션
        this.element.classList.remove('modal-open');
        this.element.style.opacity = '0';
        
        setTimeout(() => {
            // 모달 숨김
            this.element.style.display = 'none';
            
            // 스택에서 제거
            const index = modalStack.indexOf(this);
            if (index > -1) {
                modalStack.splice(index, 1);
            }
            
            // 오버레이 처리
            if (modalStack.length === 0) {
                this.hideOverlay();
                
                // 스크롤 복원
                if (this.preventScroll) {
                    document.body.style.overflow = '';
                }
            }
            
            // 포커스 트랩 제거
            if (this.focusTrap) {
                this.removeFocusTrap();
            }
            
            // ESC 키 이벤트 제거
            if (this.handleEscKey) {
                document.removeEventListener('keydown', this.handleEscKey);
            }
            
            // 포커스 복원
            if (lastFocusedElement && lastFocusedElement.focus) {
                lastFocusedElement.focus();
            }
            
            this.isOpen = false;
            
            // 콜백 실행
            if (this.onClose) {
                this.onClose(this);
            }
        }, 300);
    }
    
    /**
     * 오버레이 표시
     */
    showOverlay() {
        if (!modalOverlay) {
            modalOverlay = document.createElement('div');
            modalOverlay.className = 'modal-overlay glass-overlay';
            modalOverlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, var(--backdrop-opacity, 0.6));
                backdrop-filter: blur(2px);
                z-index: var(--z-index-modal-backdrop);
                opacity: 0;
                transition: opacity 300ms ease;
            `;
            
            modalOverlay.addEventListener('click', (e) => {
                if (e.target === modalOverlay) {
                    const topModal = modalStack[modalStack.length - 1];
                    if (topModal && topModal.closeOnOverlayClick) {
                        topModal.close();
                    }
                }
            });
            
            document.body.appendChild(modalOverlay);
        }
        
        modalOverlay.style.display = 'block';
        requestAnimationFrame(() => {
            modalOverlay.style.opacity = '1';
        });
    }
    
    /**
     * 오버레이 숨김
     */
    hideOverlay() {
        if (modalOverlay) {
            modalOverlay.style.opacity = '0';
            setTimeout(() => {
                modalOverlay.style.display = 'none';
            }, 300);
        }
    }
    
    /**
     * 포커스 트랩 설정
     */
    setupFocusTrap() {
        const focusableElements = this.element.querySelectorAll(
            'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
        );
        
        if (focusableElements.length === 0) return;
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        this.focusTrapHandler = (e) => {
            if (e.key === 'Tab') {
                if (e.shiftKey && document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement.focus();
                } else if (!e.shiftKey && document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement.focus();
                }
            }
        };
        
        this.element.addEventListener('keydown', this.focusTrapHandler);
        firstElement.focus();
    }
    
    /**
     * 포커스 트랩 제거
     */
    removeFocusTrap() {
        if (this.focusTrapHandler) {
            this.element.removeEventListener('keydown', this.focusTrapHandler);
        }
    }
    
    /**
     * 모달 제거
     */
    destroy() {
        this.close();
        setTimeout(() => {
            if (this.element && this.element.parentNode) {
                this.element.parentNode.removeChild(this.element);
            }
        }, 350);
    }
    
    /**
     * 콘텐츠 업데이트
     * @param {string|HTMLElement} content - 새 콘텐츠
     */
    updateContent(content) {
        const body = this.element.querySelector('.modal-body');
        if (body) {
            if (typeof content === 'string') {
                body.innerHTML = content;
            } else if (content instanceof HTMLElement) {
                body.innerHTML = '';
                body.appendChild(content);
            }
        }
    }
}

// ============================================
// [SECTION: 특수 모달 팩토리]
// ============================================

/**
 * 시계 모달 생성
 */
function createClockModal() {
    return new Modal({
        size: 'sm',
        position: 'center',
        className: 'clock-modal',
        title: '현재 시간',
        content: `
            <div class="clock-display">
                <div class="clock-time"></div>
                <div class="clock-date"></div>
            </div>
        `,
        onOpen: (modal) => {
            const updateTime = () => {
                const now = new Date();
                const timeEl = modal.element.querySelector('.clock-time');
                const dateEl = modal.element.querySelector('.clock-date');
                
                if (timeEl && dateEl) {
                    timeEl.textContent = now.toLocaleTimeString('ko-KR');
                    dateEl.textContent = now.toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        weekday: 'long'
                    });
                }
            };
            
            updateTime();
            modal.clockInterval = setInterval(updateTime, 1000);
        },
        onClose: (modal) => {
            if (modal.clockInterval) {
                clearInterval(modal.clockInterval);
            }
        }
    });
}

/**
 * 거래처 상세 모달 생성
 * @param {Object} companyData - 거래처 데이터
 */
function createCompanyDetailModal(companyData) {
    return new Modal({
        size: 'lg',
        position: 'center',
        className: 'company-detail-modal',
        title: companyData.companyNameFull || '거래처 상세정보',
        content: createCompanyDetailContent(companyData),
        buttons: [
            {
                text: '수정',
                className: 'btn-secondary',
                onClick: () => {
                    // 수정 로직
                    console.log('수정 클릭');
                    return false; // 모달 유지
                }
            },
            {
                text: '닫기',
                className: 'btn-primary',
                onClick: () => true // 모달 닫기
            }
        ]
    });
}

/**
 * 거래처 상세 콘텐츠 생성
 * @param {Object} data - 거래처 데이터
 */
function createCompanyDetailContent(data) {
    const sections = [
        {
            title: '기본 정보',
            fields: [
                { label: '거래처명', value: data.companyNameFull },
                { label: 'ERP 코드', value: data.erpCode },
                { label: '사업자번호', value: data.businessNumber },
                { label: '대표자', value: data.ceoOrDentist }
            ]
        },
        {
            title: '연락처 정보',
            fields: [
                { label: '전화번호', value: data.phoneNumber },
                { label: '팩스번호', value: data.faxNumber },
                { label: '이메일', value: data.email },
                { label: '주소', value: data.address }
            ]
        },
        {
            title: '담당자 정보',
            fields: [
                { label: '내부 담당자', value: data.internalManager },
                { label: '거래처 담당자', value: data.externalManager },
                { label: '담당자 연락처', value: data.managerPhone },
                { label: '담당자 이메일', value: data.managerEmail }
            ]
        }
    ];
    
    const container = document.createElement('div');
    container.className = 'company-detail-content';
    container.style.cssText = `
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: var(--spacing-lg);
    `;
    
    sections.forEach(section => {
        const sectionEl = document.createElement('div');
        sectionEl.className = 'detail-section';
        
        const title = document.createElement('h3');
        title.textContent = section.title;
        title.style.cssText = `
            font-size: var(--font-md);
            font-weight: 600;
            color: var(--text-secondary);
            margin-bottom: var(--spacing-md);
        `;
        sectionEl.appendChild(title);
        
        section.fields.forEach(field => {
            const fieldEl = document.createElement('div');
            fieldEl.style.cssText = `
                margin-bottom: var(--spacing-md);
            `;
            
            const label = document.createElement('div');
            label.textContent = field.label;
            label.style.cssText = `
                font-size: var(--font-sm);
                color: var(--text-muted);
                margin-bottom: var(--spacing-xs);
            `;
            fieldEl.appendChild(label);
            
            const value = document.createElement('div');
            value.textContent = field.value || '-';
            value.style.cssText = `
                font-size: var(--font-md);
                padding: var(--spacing-sm);
                background: var(--glass-bg);
                border-radius: var(--border-radius-sm);
                min-height: calc(var(--spacing-unit) * 5);
            `;
            fieldEl.appendChild(value);
            
            sectionEl.appendChild(fieldEl);
        });
        
        container.appendChild(sectionEl);
    });
    
    return container;
}

// ============================================
// [SECTION: 유틸리티 함수]
// ============================================

/**
 * 간단한 알림 모달
 * @param {string} message - 메시지
 * @param {string} title - 제목
 */
function alert(message, title = '알림') {
    const modal = new Modal({
        size: 'sm',
        title,
        content: `<p class="modal-message">${message}</p>`,
        buttons: [{
            text: '확인',
            className: 'btn-primary'
        }]
    });
    
    modal.open();
    return modal;
}

/**
 * 확인 모달
 * @param {string} message - 메시지
 * @param {string} title - 제목
 * @returns {Promise<boolean>} 확인 여부
 */
function confirm(message, title = '확인') {
    return new Promise((resolve) => {
        const modal = new Modal({
            size: 'sm',
            title,
            content: `<p class="modal-message">${message}</p>`,
            buttons: [
                {
                    text: '취소',
                    className: 'btn-secondary',
                    onClick: () => {
                        resolve(false);
                        return true;
                    }
                },
                {
                    text: '확인',
                    className: 'btn-primary',
                    onClick: () => {
                        resolve(true);
                        return true;
                    }
                }
            ]
        });
        
        modal.open();
    });
}

/**
 * 프롬프트 모달
 * @param {string} message - 메시지
 * @param {string} title - 제목
 * @param {string} defaultValue - 기본값
 * @returns {Promise<string|null>} 입력값
 */
function prompt(message, title = '입력', defaultValue = '') {
    return new Promise((resolve) => {
        const inputId = generateId('prompt-input');
        
        const modal = new Modal({
            size: 'sm',
            title,
            content: `
                <p class="modal-message">${message}</p>
                <input type="text" id="${inputId}" class="form-input prompt-input" value="${defaultValue}">
            `,
            buttons: [
                {
                    text: '취소',
                    className: 'btn-secondary',
                    onClick: () => {
                        resolve(null);
                        return true;
                    }
                },
                {
                    text: '확인',
                    className: 'btn-primary',
                    onClick: () => {
                        const input = document.getElementById(inputId);
                        resolve(input ? input.value : null);
                        return true;
                    }
                }
            ],
            onOpen: () => {
                setTimeout(() => {
                    const input = document.getElementById(inputId);
                    if (input) {
                        input.focus();
                        input.select();
                    }
                }, 100);
            }
        });
        
        modal.open();
    });
}

/**
 * 범용 모달 표시 함수
 * @param {Object} options - 모달 옵션
 * @param {string} options.title - 모달 제목
 * @param {string|HTMLElement} options.content - 모달 내용
 * @param {string} options.size - 모달 크기 (xs, sm, md, lg, xl, full)
 * @param {Array} options.buttons - 버튼 배열
 * @param {string} options.type - 모달 타입 (alert, confirm 등)
 * @param {Function} options.onOpen - 열릴 때 콜백
 * @param {Function} options.onClose - 닫힐 때 콜백
 * @returns {Promise<any>} 버튼 클릭 결과
 */
function showModal(options = {}) {
    return new Promise((resolve) => {
        // type이 'confirm'인 경우 기본 confirm 함수 사용
        if (options.type === 'confirm') {
            return resolve(confirm(options.content || options.message, options.title));
        }
        
        // type이 'alert'인 경우 기본 alert 함수 사용
        if (options.type === 'alert') {
            alert(options.content || options.message, options.title);
            return resolve(true);
        }
        
        // 버튼 설정
        let modalButtons = options.buttons || [];
        
        // 버튼이 없으면 기본 확인 버튼 추가
        if (modalButtons.length === 0) {
            modalButtons = [{
                text: '확인',
                type: 'primary',
                className: 'btn-primary',
                onClick: () => {
                    resolve(true);
                    return true;
                }
            }];
        } else {
            // 버튼에 resolve 추가
            modalButtons = modalButtons.map(btn => ({
                ...btn,
                className: btn.className || `btn-${btn.type || 'secondary'}`,
                onClick: () => {
                    const originalOnClick = btn.onClick;
                    let result = true;
                    
                    if (originalOnClick) {
                        result = originalOnClick();
                        
                        // Promise인 경우 처리
                        if (result && typeof result.then === 'function') {
                            result.then(res => {
                                if (res !== null && res !== false) {
                                    resolve(res);
                                } else if (res === false) {
                                    resolve(false);
                                }
                            }).catch(err => {
                                console.error('Modal button onClick error:', err);
                                resolve(null);
                            });
                            return null; // 모달 유지
                        }
                    }
                    
                    // 결과에 따라 resolve
                    if (result !== null && result !== false) {
                        resolve(result);
                        return true; // 모달 닫기
                    } else if (result === false) {
                        resolve(false);
                        return true; // 모달 닫기
                    } else {
                        return null; // 모달 유지
                    }
                }
            }));
        }
        
        // 모달 생성
        const modal = new Modal({
            title: options.title || '',
            content: options.content || '',
            size: options.size || 'md',
            position: options.position || 'center',
            className: options.className || '',
            buttons: modalButtons,
            closeOnEsc: options.closeOnEsc !== false,
            closeOnOverlayClick: options.closeOnOverlayClick !== false,
            showCloseButton: options.showCloseButton !== false,
            onOpen: options.onOpen || null,
            onClose: (m) => {
                if (options.onClose) {
                    options.onClose(m);
                }
                // 모달이 닫힐 때 resolve되지 않았다면 null 반환
                resolve(null);
            }
        });
        
        // 모달 열기
        modal.open();
    });
}

// ============================================
// [SECTION: 전역 노출]
// ============================================

// 전역 객체 등록
window.Modal = Modal;
window.modalUtils = {
    alert,
    confirm,
    prompt,
    createClockModal,
    createCompanyDetailModal
};

// 별칭 export (호환성)
export const modalManager = Modal;

// 기본 내보내기
export default Modal;
export {
    alert,
    confirm,
    prompt,
    showModal,
    createClockModal,
    createCompanyDetailModal
};
