/* ============================================
   아코디언 컴포넌트 - UI 사양서 기반
   파일: 08.components/07_accordion.js
   수정일: 2025-01-27
   설명: 다단계 프로세스용 아코디언 UI
============================================ */

import BaseComponent from '../01.common/02_base_component.js';

/**
 * 아코디언 컴포넌트
 * 로그인 단계별 프로세스에 최적화
 */
class Accordion extends BaseComponent {
    constructor(config) {
        const defaultConfig = {
            className: 'accordion glass-panel',
            
            // 아코디언 항목들
            items: [],
            
            // 옵션
            options: {
                exclusive: true,           // 한 번에 하나만 열기
                animated: true,            // 애니메이션 효과
                collapsible: true,         // 모두 닫기 가능
                startOpened: 0,            // 처음 열려있을 항목
                disabled: [],              // 비활성화된 항목들
                showProgress: false,       // 진행 상태 표시
                showStepNumbers: true,     // 단계 번호 표시
                completedSteps: [],        // 완료된 단계들
                allowNavigation: false     // 클릭으로 이동 허용
            },
            
            // 스타일 (UI 사양서 기준)
            styles: {
                headerHeight: 'calc(var(--spacing-unit) * 8)', // 64px
                iconSize: 'calc(var(--spacing-unit) * 3)',     // 24px
                borderRadius: 'var(--border-radius-lg)',
                gap: 'var(--spacing-md)'
            },
            
            // 콜백
            onOpen: null,
            onClose: null,
            onChange: null,
            onStepComplete: null
        };
        
        // 깊은 병합을 위한 config 처리
        const mergedConfig = {
            ...defaultConfig,
            ...config,
            options: {
                ...defaultConfig.options,
                ...(config?.options || {})
            },
            styles: {
                ...defaultConfig.styles,
                ...(config?.styles || {})
            }
        };
        
        super(mergedConfig);
        
        // 상태 관리
        this.state = {
            ...this.state,
            activeItems: new Set(),
            completedItems: new Set(this.config.options.completedSteps || []),
            currentStep: this.config.options.startOpened || 0
        };
        
        // 초기 열림 상태 설정
        if (this.config.options.startOpened !== null && this.config.options.startOpened >= 0) {
            this.state.activeItems.add(this.config.options.startOpened);
        }
    }
    
    /**
     * 렌더링
     */
    render() {
        const container = document.createElement('div');
        container.className = `${this.config.className} accordion-container`;
        container.style.cssText = `
            width: 100%;
            display: flex;
            flex-direction: column;
            gap: ${this.config.styles.gap};
        `;
        
        // 진행 상태 바 (옵션)
        if (this.config.options.showProgress) {
            container.appendChild(this.renderProgressBar());
        }
        
        // 아코디언 아이템들
        this.config.items.forEach((item, index) => {
            const accordionItem = this.renderAccordionItem(item, index);
            container.appendChild(accordionItem);
        });
        
        this.element = container;
        return container;
    }
    
    /**
     * 진행 상태 바 렌더링
     */
    renderProgressBar() {
        const progressContainer = document.createElement('div');
        progressContainer.className = 'accordion-progress';
        progressContainer.style.cssText = `
            width: 100%;
            padding: var(--spacing-lg);
            background: var(--glass-bg);
            border-radius: ${this.config.styles.borderRadius};
            margin-bottom: var(--spacing-md);
        `;
        
        // 진행률 계산
        const totalSteps = this.config.items.length;
        const completedSteps = this.state.completedItems.size;
        const progress = (completedSteps / totalSteps) * 100;
        
        // 진행 바
        const progressBar = document.createElement('div');
        progressBar.style.cssText = `
            width: 100%;
            height: calc(var(--spacing-unit) * 1);
            background: var(--glass-border);
            border-radius: var(--border-radius-sm);
            overflow: hidden;
            position: relative;
        `;
        
        const progressFill = document.createElement('div');
        progressFill.className = 'progress-fill';
        progressFill.style.cssText = `
            height: 100%;
            width: ${progress}%;
            background: linear-gradient(90deg, var(--color-primary), var(--color-secondary));
            transition: width var(--animation-duration-slow) ease;
            border-radius: inherit;
        `;
        
        progressBar.appendChild(progressFill);
        
        // 단계 표시
        const stepsContainer = document.createElement('div');
        stepsContainer.style.cssText = `
            display: flex;
            justify-content: space-between;
            margin-top: var(--spacing-md);
            position: relative;
        `;
        
        this.config.items.forEach((item, index) => {
            const step = document.createElement('div');
            step.className = 'progress-step';
            step.style.cssText = `
                flex: 1;
                text-align: center;
                position: relative;
            `;
            
            // 스텝 원
            const stepCircle = document.createElement('div');
            stepCircle.className = `step-circle ${
                this.state.completedItems.has(index) ? 'completed' : 
                this.state.currentStep === index ? 'active' : ''
            }`;
            stepCircle.style.cssText = `
                width: calc(var(--spacing-unit) * 4);
                height: calc(var(--spacing-unit) * 4);
                border-radius: 50%;
                background: ${
                    this.state.completedItems.has(index) ? 'var(--color-success)' :
                    this.state.currentStep === index ? 'var(--color-primary)' :
                    'var(--glass-bg)'
                };
                border: 2px solid ${
                    this.state.completedItems.has(index) ? 'var(--color-success)' :
                    this.state.currentStep === index ? 'var(--color-primary)' :
                    'var(--glass-border)'
                };
                margin: 0 auto var(--spacing-xs);
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: var(--font-weight-semibold);
                color: ${
                    this.state.completedItems.has(index) || this.state.currentStep === index ? 
                    'white' : 'var(--text-muted)'
                };
                transition: all var(--animation-duration);
            `;
            
            // 아이콘 또는 번호
            if (this.state.completedItems.has(index)) {
                stepCircle.innerHTML = '<i class="fas fa-check"></i>';
            } else {
                stepCircle.textContent = index + 1;
            }
            
            // 라벨
            const stepLabel = document.createElement('div');
            stepLabel.style.cssText = `
                font-size: var(--font-xs);
                color: ${
                    this.state.completedItems.has(index) || this.state.currentStep === index ? 
                    'var(--text-primary)' : 'var(--text-muted)'
                };
                font-weight: ${
                    this.state.currentStep === index ? 'var(--font-weight-semibold)' : 'normal'
                };
            `;
            stepLabel.textContent = item.title || `단계 ${index + 1}`;
            
            step.appendChild(stepCircle);
            step.appendChild(stepLabel);
            
            // 연결선 (마지막 제외)
            if (index < this.config.items.length - 1) {
                const connector = document.createElement('div');
                connector.className = 'step-connector';
                connector.style.cssText = `
                    position: absolute;
                    top: calc(var(--spacing-unit) * 2);
                    left: 50%;
                    width: 100%;
                    height: 2px;
                    background: ${
                        this.state.completedItems.has(index) ? 
                        'var(--color-success)' : 'var(--glass-border)'
                    };
                    z-index: -1;
                `;
                step.appendChild(connector);
            }
            
            stepsContainer.appendChild(step);
        });
        
        // 진행률 텍스트
        const progressText = document.createElement('div');
        progressText.style.cssText = `
            text-align: center;
            margin-bottom: var(--spacing-md);
            color: var(--text-secondary);
            font-size: var(--font-sm);
        `;
        progressText.textContent = `진행률: ${Math.round(progress)}% (${completedSteps}/${totalSteps} 완료)`;
        
        progressContainer.appendChild(progressText);
        progressContainer.appendChild(progressBar);
        progressContainer.appendChild(stepsContainer);
        
        return progressContainer;
    }
    
    /**
     * 아코디언 아이템 렌더링
     */
    renderAccordionItem(item, index) {
        const itemContainer = document.createElement('div');
        itemContainer.className = `accordion-item ${
            this.state.activeItems.has(index) ? 'active' : ''
        } ${this.state.completedItems.has(index) ? 'completed' : ''}`;
        itemContainer.dataset.index = index;
        
        const isDisabled = this.config.options?.disabled?.includes(index) || false;
        const isActive = this.state.activeItems.has(index);
        const isCompleted = this.state.completedItems.has(index);
        
        itemContainer.style.cssText = `
            background: var(--glass-bg);
            border: 1px solid ${isActive ? 'var(--color-primary)' : 'var(--glass-border)'};
            border-radius: ${this.config.styles.borderRadius};
            overflow: hidden;
            transition: all var(--animation-duration);
            ${isDisabled ? 'opacity: 0.5; pointer-events: none;' : ''}
        `;
        
        // 헤더
        const header = this.renderAccordionHeader(item, index, isActive, isCompleted, isDisabled);
        itemContainer.appendChild(header);
        
        // 콘텐츠
        const content = this.renderAccordionContent(item, index, isActive);
        itemContainer.appendChild(content);
        
        return itemContainer;
    }
    
    /**
     * 아코디언 헤더 렌더링
     */
    renderAccordionHeader(item, index, isActive, isCompleted, isDisabled) {
        const header = document.createElement('div');
        header.className = 'accordion-header';
        header.style.cssText = `
            display: flex;
            align-items: center;
            padding: var(--spacing-lg);
            min-height: ${this.config.styles.headerHeight};
            cursor: ${isDisabled ? 'not-allowed' : 'pointer'};
            user-select: none;
            transition: background var(--animation-duration);
        `;
        
        // 호버 효과
        if (!isDisabled) {
            header.onmouseenter = () => {
                header.style.background = 'var(--glass-hover)';
            };
            header.onmouseleave = () => {
                header.style.background = '';
            };
            
            // 클릭 이벤트
            header.onclick = () => this.toggleItem(index);
        }
        
        // 단계 번호
        if (this.config.options.showStepNumbers) {
            const stepNumber = document.createElement('div');
            stepNumber.className = 'step-number';
            stepNumber.style.cssText = `
                width: calc(var(--spacing-unit) * 5);
                height: calc(var(--spacing-unit) * 5);
                border-radius: 50%;
                background: ${
                    isCompleted ? 'var(--color-success)' :
                    isActive ? 'var(--color-primary)' :
                    'var(--glass-bg)'
                };
                color: ${isCompleted || isActive ? 'white' : 'var(--text-muted)'};
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: var(--font-weight-semibold);
                margin-right: var(--spacing-md);
                transition: all var(--animation-duration);
            `;
            
            if (isCompleted) {
                stepNumber.innerHTML = '<i class="fas fa-check"></i>';
            } else {
                stepNumber.textContent = index + 1;
            }
            
            header.appendChild(stepNumber);
        }
        
        // 아이콘
        if (item.icon) {
            const icon = document.createElement('div');
            icon.className = 'accordion-icon';
            icon.style.cssText = `
                width: ${this.config.styles.iconSize};
                height: ${this.config.styles.iconSize};
                margin-right: var(--spacing-md);
                color: ${isActive ? 'var(--color-primary)' : 'var(--text-secondary)'};
                display: flex;
                align-items: center;
                justify-content: center;
            `;
            icon.innerHTML = `<i class="${item.icon}"></i>`;
            header.appendChild(icon);
        }
        
        // 제목
        const titleContainer = document.createElement('div');
        titleContainer.style.cssText = `
            flex: 1;
        `;
        
        const title = document.createElement('div');
        title.className = 'accordion-title';
        title.style.cssText = `
            font-size: var(--font-lg);
            font-weight: var(--font-weight-semibold);
            color: var(--text-primary);
            margin-bottom: var(--spacing-xs);
        `;
        title.textContent = item.title;
        
        titleContainer.appendChild(title);
        
        // 부제목
        if (item.subtitle) {
            const subtitle = document.createElement('div');
            subtitle.className = 'accordion-subtitle';
            subtitle.style.cssText = `
                font-size: var(--font-sm);
                color: var(--text-muted);
            `;
            subtitle.textContent = item.subtitle;
            titleContainer.appendChild(subtitle);
        }
        
        header.appendChild(titleContainer);
        
        // 상태 뱃지
        if (isCompleted) {
            const badge = document.createElement('div');
            badge.className = 'status-badge completed';
            badge.style.cssText = `
                padding: var(--spacing-xs) var(--spacing-sm);
                background: var(--color-success);
                color: white;
                border-radius: var(--border-radius-sm);
                font-size: var(--font-xs);
                margin-right: var(--spacing-md);
            `;
            badge.textContent = '완료';
            header.appendChild(badge);
        }
        
        // 화살표
        const arrow = document.createElement('div');
        arrow.className = 'accordion-arrow';
        arrow.style.cssText = `
            width: ${this.config.styles.iconSize};
            height: ${this.config.styles.iconSize};
            color: var(--text-muted);
            transition: transform var(--animation-duration);
            transform: rotate(${isActive ? '90deg' : '0deg'});
        `;
        arrow.innerHTML = '<i class="fas fa-chevron-right"></i>';
        header.appendChild(arrow);
        
        return header;
    }
    
    /**
     * 아코디언 콘텐츠 렌더링
     */
    renderAccordionContent(item, index, isActive) {
        const content = document.createElement('div');
        content.className = 'accordion-content';
        content.style.cssText = `
            max-height: ${isActive ? 'var(--accordion-max-height, 1000px)' : '0'};
            opacity: ${isActive ? '1' : '0'};
            overflow: hidden;
            transition: max-height var(--animation-duration-slow) ease,
                        opacity var(--animation-duration) ease;
            padding: ${isActive ? 'var(--spacing-lg)' : '0 var(--spacing-lg)'};
            padding-top: ${isActive ? '0' : '0'};
            border-top: ${isActive ? '1px solid var(--glass-border)' : 'none'};
        `;
        
        // 콘텐츠 래퍼
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'content-wrapper';
        contentWrapper.style.cssText = `
            padding: var(--spacing-md) 0;
        `;
        
        // 콘텐츠 삽입
        if (typeof item.content === 'string') {
            contentWrapper.innerHTML = item.content;
        } else if (item.content instanceof HTMLElement) {
            contentWrapper.appendChild(item.content);
        } else if (typeof item.content === 'function') {
            const result = item.content();
            if (typeof result === 'string') {
                contentWrapper.innerHTML = result;
            } else if (result instanceof HTMLElement) {
                contentWrapper.appendChild(result);
            }
        }
        
        // 액션 버튼들
        if (item.actions && item.actions.length > 0) {
            const actionsContainer = document.createElement('div');
            actionsContainer.className = 'accordion-actions';
            actionsContainer.style.cssText = `
                display: flex;
                gap: var(--spacing-md);
                margin-top: var(--spacing-lg);
                padding-top: var(--spacing-lg);
                border-top: 1px solid var(--glass-border);
            `;
            
            item.actions.forEach(action => {
                console.log('[아코디언] 버튼 생성:', action.label, 'for index:', index);
                const button = document.createElement('button');
                button.className = `glass-button ${action.className || ''}`;
                button.textContent = action.label;
                button.onclick = () => {
                    console.log('[아코디언] 버튼 클릭됨:', action.label, 'index:', index);
                    if (action.onClick) {
                        console.log('[아코디언] onClick 실행');
                        action.onClick(index, item);
                    } else {
                        console.log('[아코디언] onClick이 없음');
                    }
                };
                actionsContainer.appendChild(button);
                console.log('[아코디언] 버튼 DOM에 추가됨:', button);
            });
            
            contentWrapper.appendChild(actionsContainer);
        }
        
        content.appendChild(contentWrapper);
        
        return content;
    }
    
    /**
     * 아이템 토글
     * @param {number} index - 아이템 인덱스
     */
    toggleItem(index) {
        const isActive = this.state.activeItems.has(index);
        
        if (isActive) {
            // 닫기
            this.closeItem(index);
        } else {
            // 열기
            if (this.config.options.exclusive) {
                // 다른 아이템들 닫기
                this.state.activeItems.forEach(activeIndex => {
                    if (activeIndex !== index) {
                        this.closeItem(activeIndex);
                    }
                });
            }
            
            this.openItem(index);
        }
    }
    
    /**
     * 아이템 열기
     * @param {number} index - 아이템 인덱스
     */
    openItem(index) {
        console.log('[아코디언] openItem 호출됨, index:', index);
        console.log('[아코디언] allowNavigation:', this.config.options.allowNavigation);
        console.log('[아코디언] 현재 단계:', this.state.currentStep);

        if (!this.config.options.allowNavigation && index !== this.state.currentStep) {
            console.log('[아코디언] 네비게이션 비활성화로 인해 이동 불가');
            return; // 네비게이션 비활성화시 현재 단계만 열기 가능
        }

        console.log('[아코디언] 아이템 열기 진행');
        this.state.activeItems.add(index);
        this.state.currentStep = index;
        console.log('[아코디언] currentStep 업데이트됨:', this.state.currentStep);

        // DOM 업데이트
        console.log('[아코디언] DOM 업데이트 시작, index:', index);
        const item = this.element.querySelector(`.accordion-item[data-index="${index}"]`);
        console.log('[아코디언] 찾은 아이템:', item);
        if (item) {
            console.log('[아코디언] 아이템 DOM 조작 시작');
            item.classList.add('active');
            
            // 헤더 화살표 회전
            const arrow = item.querySelector('.accordion-arrow');
            if (arrow) {
                arrow.style.transform = 'rotate(90deg)';
            }
            
            // 콘텐츠 열기
            const content = item.querySelector('.accordion-content');
            if (content) {
                content.style.maxHeight = 'var(--accordion-max-height, 1000px)';
                content.style.opacity = '1';
                content.style.paddingTop = '0';
                content.style.paddingBottom = 'var(--spacing-lg)';
                content.style.borderTop = '1px solid var(--glass-border)';
            }
            
            // 테두리 강조
            item.style.borderColor = 'var(--color-primary)';
        }
        
        // 콜백
        if (this.config.onOpen) {
            this.config.onOpen(index, this.config.items[index]);
        }
        
        if (this.config.onChange) {
            this.config.onChange(index, 'open');
        }
    }
    
    /**
     * 아이템 닫기
     * @param {number} index - 아이템 인덱스
     */
    closeItem(index) {
        if (!this.config.options.collapsible && this.state.activeItems.size === 1) {
            return; // 모두 닫기 비활성화시 최소 하나는 열려있어야 함
        }
        
        this.state.activeItems.delete(index);
        
        // DOM 업데이트
        const item = this.element.querySelector(`.accordion-item[data-index="${index}"]`);
        if (item) {
            item.classList.remove('active');
            
            // 헤더 화살표 원위치
            const arrow = item.querySelector('.accordion-arrow');
            if (arrow) {
                arrow.style.transform = 'rotate(0deg)';
            }
            
            // 콘텐츠 닫기
            const content = item.querySelector('.accordion-content');
            if (content) {
                content.style.maxHeight = '0';
                content.style.opacity = '0';
                content.style.paddingTop = '0';
                content.style.paddingBottom = '0';
                content.style.borderTop = 'none';
            }
            
            // 테두리 원복
            item.style.borderColor = 'var(--glass-border)';
        }
        
        // 콜백
        if (this.config.onClose) {
            this.config.onClose(index, this.config.items[index]);
        }
        
        if (this.config.onChange) {
            this.config.onChange(index, 'close');
        }
    }
    
    /**
     * 단계 완료
     * @param {number} index - 단계 인덱스
     */
    completeStep(index) {
        this.state.completedItems.add(index);
        
        // DOM 업데이트
        const item = this.element.querySelector(`.accordion-item[data-index="${index}"]`);
        if (item) {
            item.classList.add('completed');
            
            // 단계 번호 업데이트
            const stepNumber = item.querySelector('.step-number');
            if (stepNumber) {
                stepNumber.style.background = 'var(--color-success)';
                stepNumber.style.color = 'white';
                stepNumber.innerHTML = '<i class="fas fa-check"></i>';
            }
            
            // 상태 뱃지 추가
            if (!item.querySelector('.status-badge')) {
                const header = item.querySelector('.accordion-header');
                const arrow = header.querySelector('.accordion-arrow');
                
                const badge = document.createElement('div');
                badge.className = 'status-badge completed';
                badge.style.cssText = `
                    padding: var(--spacing-xs) var(--spacing-sm);
                    background: var(--color-success);
                    color: white;
                    border-radius: var(--border-radius-sm);
                    font-size: var(--font-xs);
                    margin-right: var(--spacing-md);
                `;
                badge.textContent = '완료';
                header.insertBefore(badge, arrow);
            }
        }
        
        // 진행 바 업데이트
        if (this.config.options.showProgress) {
            this.updateProgressBar();
        }
        
        // 다음 단계로 자동 이동 (옵션)
        if (this.config.options.exclusive && index < this.config.items.length - 1) {
            setTimeout(() => {
                this.closeItem(index);
                this.openItem(index + 1);
            }, 500);
        }
        
        // 콜백
        if (this.config.onStepComplete) {
            this.config.onStepComplete(index, this.config.items[index]);
        }
    }
    
    /**
     * 진행 바 업데이트
     */
    updateProgressBar() {
        const progressFill = this.element.querySelector('.progress-fill');
        const progressText = this.element.querySelector('.accordion-progress > div:first-child');
        
        if (progressFill) {
            const totalSteps = this.config.items.length;
            const completedSteps = this.state.completedItems.size;
            const progress = (completedSteps / totalSteps) * 100;
            
            progressFill.style.width = `${progress}%`;
            
            if (progressText) {
                progressText.textContent = `진행률: ${Math.round(progress)}% (${completedSteps}/${totalSteps} 완료)`;
            }
        }
        
        // 단계 원들 업데이트
        const stepCircles = this.element.querySelectorAll('.progress-step .step-circle');
        stepCircles.forEach((circle, index) => {
            if (this.state.completedItems.has(index)) {
                circle.classList.add('completed');
                circle.style.background = 'var(--color-success)';
                circle.style.borderColor = 'var(--color-success)';
                circle.style.color = 'white';
                circle.innerHTML = '<i class="fas fa-check"></i>';
            } else if (this.state.currentStep === index) {
                circle.classList.add('active');
                circle.classList.remove('completed');
                circle.style.background = 'var(--color-primary)';
                circle.style.borderColor = 'var(--color-primary)';
                circle.style.color = 'white';
                circle.textContent = index + 1;
            } else {
                circle.classList.remove('active', 'completed');
                circle.style.background = 'var(--glass-bg)';
                circle.style.borderColor = 'var(--glass-border)';
                circle.style.color = 'var(--text-muted)';
                circle.textContent = index + 1;
            }
        });
        
        // 연결선 업데이트
        const connectors = this.element.querySelectorAll('.step-connector');
        connectors.forEach((connector, index) => {
            if (this.state.completedItems.has(index)) {
                connector.style.background = 'var(--color-success)';
            } else {
                connector.style.background = 'var(--glass-border)';
            }
        });
    }
    
    /**
     * 특정 단계로 이동
     * @param {number} index - 이동할 단계
     */
    goToStep(index) {
        console.log('[아코디언] goToStep 호출됨, index:', index);
        console.log('[아코디언] 전체 아이템 수:', this.config.items.length);
        console.log('[아코디언] 현재 단계:', this.state.currentStep);

        if (index < 0 || index >= this.config.items.length) {
            console.log('[아코디언] 유효하지 않은 인덱스:', index);
            return;
        }

        // 모든 아이템 닫기
        console.log('[아코디언] 모든 아이템 닫기 시작');
        this.state.activeItems.forEach(activeIndex => {
            console.log('[아코디언] 아이템 닫기:', activeIndex);
            this.closeItem(activeIndex);
        });

        // 해당 아이템 열기
        console.log('[아코디언] 아이템 열기 시도:', index);
        this.openItem(index);
    }
    
    /**
     * 다음 단계로
     */
    nextStep() {
        const currentStep = this.state.currentStep;
        if (currentStep < this.config.items.length - 1) {
            this.goToStep(currentStep + 1);
        }
    }
    
    /**
     * 이전 단계로
     */
    previousStep() {
        const currentStep = this.state.currentStep;
        if (currentStep > 0) {
            this.goToStep(currentStep - 1);
        }
    }
    
    /**
     * 모든 단계 초기화
     */
    reset() {
        this.state.activeItems.clear();
        this.state.completedItems.clear();
        this.state.currentStep = 0;
        
        // 첫 단계 열기
        if (this.config.options.startOpened !== null && this.config.options.startOpened >= 0) {
            this.openItem(this.config.options.startOpened);
        }
        
        // DOM 업데이트
        this.update();
    }
    
    /**
     * 업데이트
     */
    update() {
        if (!this.element) return;
        
        const newElement = this.render();
        this.element.parentNode.replaceChild(newElement, this.element);
        this.element = newElement;
    }
}

// 전역 등록
window.Accordion = Accordion;

export default Accordion;