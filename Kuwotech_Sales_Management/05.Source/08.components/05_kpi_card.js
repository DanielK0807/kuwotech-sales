/* ============================================
   KPI 카드 컴포넌트 - UI 사양서 기반
   파일: 08.components/05_kpi_card.js
   수정일: 2025-01-27
   설명: UI 사양서 기준 KPI 대시보드 카드
   
   [NAVIGATION: 컴포넌트 개요]
   - KPI 카드를 동적으로 생성하는 컴포넌트
   - 글래스모피즘 3D 효과 자동 적용
   - BaseComponent를 상속받아 구현
   
   [NAVIGATION: 클래스]
   - KPICard: 개별 KPI 카드 컴포넌트
   - KPIGrid: KPI 카드를 그리드로 배치하는 컴포넌트
   
   [NAVIGATION: 주요 기능]
   - 진행률 표시 (progress bar)
   - 변화 추세 표시 (change trend)
   - 미니 차트 표시 (sparkline)
   - 애니메이션 효과 (count-up, shimmer)
   - 자동 새로고침 (auto-refresh)
============================================ */

import BaseComponent from '../01.common/02_base_component.js';
import { formatNumber, formatCurrency, formatPercent } from '../01.common/03_format.js';

/**
 * KPI 카드 컴포넌트
 * UI 사양서 기반 동적 KPI 표시
 */
class KPICard extends BaseComponent {
    constructor(config) {
        const defaultConfig = {
            className: 'kpi-card glass-card',
            
            // KPI 데이터
            title: '',
            value: 0,
            unit: '',
            icon: null,
            description: '',
            formula: '', // 계산 공식
            
            // 변화 표시
            change: {
                value: 0,
                type: 'percent', // percent, absolute
                period: '전월 대비',
                showArrow: true
            },
            
            // 진행률
            progress: {
                show: false,
                current: 0,
                target: 100,
                showPercentage: true
            },
            
            // 스타일
            style: {
                color: 'primary', // primary, success, warning, danger, info
                size: 'md', // sm, md, lg
                animated: true,
                clickable: false,
                highlighted: false // 테두리 강조
            },
            
            // UI 사양서 기준 레이아웃
            layout: {
                minHeight: 'calc(var(--spacing-unit) * 20)', // 160px
                padding: 'var(--spacing-lg)',
                gap: 'var(--spacing-md)'
            },
            
            // 차트 옵션
            chart: {
                show: false,
                type: 'line', // line, bar, area
                data: [],
                height: 60
            },
            
            // 콜백
            onClick: null,
            onRefresh: null
        };
        
        super({ ...defaultConfig, ...config });

        // 상태 관리
        this.state = {
            ...this.state,
            isLoading: false,
            isUpdating: false,
            previousValue: this.config.value
        };
        
        // 자동 업데이트 설정
        if (this.config.autoRefresh) {
            this.startAutoRefresh();
        }
    }
    
    /**
     * 렌더링
     */
    render() {
        const card = document.createElement('div');
        card.className = this.config.className;
        card.dataset.kpiType = this.config.style.color;
        
        // 크기별 스타일
        const sizeStyles = {
            sm: {
                minHeight: 'calc(var(--spacing-unit) * 15)', // 120px
                fontSize: 'var(--font-sm)'
            },
            md: {
                minHeight: 'calc(var(--spacing-unit) * 20)', // 160px
                fontSize: 'var(--font-md)'
            },
            lg: {
                minHeight: 'calc(var(--spacing-unit) * 25)', // 200px
                fontSize: 'var(--font-lg)'
            }
        };
        
        const size = sizeStyles[this.config.style.size] || sizeStyles.md;
        
        card.style.cssText = `
            min-height: ${size.minHeight};
            padding: ${this.config.layout.padding};
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            transition: all var(--animation-duration);
            cursor: ${this.config.style.clickable ? 'pointer' : 'default'};
            position: relative;
            overflow: hidden;
            ${this.config.style.highlighted ? `
                border: 3px solid var(--${this.config.style.color}-color);
                box-shadow: 0 0 20px rgba(var(--${this.config.style.color}-rgb, 74, 158, 255), 0.4);
            ` : ''}
        `;
        
        // 호버 효과
        if (this.config.style.clickable) {
            card.addEventListener('mouseenter', () => {
                card.style.transform = 'translateY(-4px)';
                card.style.boxShadow = 'var(--shadow-lg)';
            });
            
            card.addEventListener('mouseleave', () => {
                card.style.transform = 'translateY(0)';
                card.style.boxShadow = '';
            });
            
            if (this.config.onClick) {
                card.addEventListener('click', () => this.config.onClick(this));
            }
        }
        
        // 헤더 섹션
        card.appendChild(this.renderHeader());
        
        // 메인 값
        card.appendChild(this.renderValue());
        
        // 차트 (옵션)
        if (this.config.chart.show && this.config.chart.data.length > 0) {
            card.appendChild(this.renderChart());
        }
        
        // 진행률 바 (옵션)
        if (this.config.progress.show) {
            card.appendChild(this.renderProgress());
        }
        
        // 푸터 섹션
        card.appendChild(this.renderFooter());
        
        // 애니메이션 효과
        if (this.config.style.animated) {
            this.addAnimationEffects(card);
        }
        
        this.element = card;
        return card;
    }
    
    /**
     * 헤더 렌더링
     */
    renderHeader() {
        const header = document.createElement('div');
        header.className = 'kpi-header';
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: var(--spacing-md);
        `;
        
        // 제목과 아이콘
        const titleContainer = document.createElement('div');
        titleContainer.style.cssText = `
            display: flex;
            align-items: center;
            gap: var(--spacing-sm);
        `;
        
        // 아이콘
        if (this.config.icon) {
            const icon = document.createElement('span');
            icon.className = 'kpi-icon';
            icon.style.cssText = `
                font-size: var(--font-xl);
                opacity: 0.8;
                color: var(--${this.config.style.color}-color);
            `;
            
            if (this.config.icon.startsWith('fa-')) {
                icon.innerHTML = `<i class="fas ${this.config.icon}"></i>`;
            } else {
                icon.textContent = this.config.icon;
            }
            
            titleContainer.appendChild(icon);
        }
        
        // 제목
        const title = document.createElement('h3');
        title.className = 'kpi-title';
        title.style.cssText = `
            font-size: calc(var(--font-sm) + 2px);
            color: var(--text-secondary);
            font-weight: var(--font-weight-medium);
            margin: 0;
        `;
        title.textContent = this.config.title;
        titleContainer.appendChild(title);
        
        header.appendChild(titleContainer);
        
        // 배지 (옵션)
        if (this.config.badge) {
            const badge = document.createElement('span');
            badge.className = 'glass-badge';
            badge.style.cssText = `
                padding: var(--spacing-xs) var(--spacing-sm);
                font-size: var(--font-xs);
                background: var(--${this.config.style.color}-alpha);
                color: var(--${this.config.style.color}-color);
            `;
            badge.textContent = this.config.badge;
            header.appendChild(badge);
        }
        
        return header;
    }
    
    /**
     * 값 렌더링
     */
    renderValue() {
        const valueContainer = document.createElement('div');
        valueContainer.className = 'kpi-value-container';
        valueContainer.style.cssText = `
            margin: var(--spacing-md) 0;
        `;
        
        // 메인 값
        const value = document.createElement('div');
        value.className = 'kpi-value';
        value.style.cssText = `
            font-size: clamp(1.5rem, 3vw, 2rem);
            font-weight: var(--font-weight-bold);
            color: var(--text-primary);
            line-height: 1;
        `;
        
        // 값 포맷팅 (음수 규칙 적용)
        let formattedValue = this.config.value;
        let isNegative = false;
        let negativeClass = '';

        switch (this.config.unit) {
            case '원':
            case '₩':
                const currencyResult = formatCurrency(this.config.value, true);
                if (typeof currencyResult === 'object') {
                    formattedValue = currencyResult.text;
                    isNegative = currencyResult.isNegative;
                    negativeClass = currencyResult.className;
                } else {
                    formattedValue = currencyResult;
                }
                break;
            case '%':
                // KPI 값은 0-100 형식이므로 100으로 나눈 후 포맷팅 (음수 규칙 적용)
                const percentResult = formatPercent(this.config.value / 100, 2, true);
                if (typeof percentResult === 'object') {
                    formattedValue = percentResult.text;
                    isNegative = percentResult.isNegative;
                    negativeClass = percentResult.className;
                } else {
                    formattedValue = percentResult;
                }
                break;
            case '개':
            case '건':
            case '명':
            case '개사':
                const numberResult = formatNumber(this.config.value, true);
                if (typeof numberResult === 'object') {
                    formattedValue = numberResult.text + this.config.unit;
                    isNegative = numberResult.isNegative;
                    negativeClass = numberResult.className;
                } else {
                    formattedValue = numberResult + this.config.unit;
                }
                break;
            default:
                if (typeof this.config.value === 'number') {
                    const defaultResult = formatNumber(this.config.value, true);
                    if (typeof defaultResult === 'object') {
                        formattedValue = defaultResult.text;
                        isNegative = defaultResult.isNegative;
                        negativeClass = defaultResult.className;
                    } else {
                        formattedValue = defaultResult;
                    }
                } else if (typeof this.config.value === 'string') {
                    // 문자열 값인 경우 (예: 달성율)
                    formattedValue = this.config.value;
                    // 괄호로 시작하면 음수로 간주 (음수 규칙)
                    if (formattedValue.trim().startsWith('(')) {
                        isNegative = true;
                        negativeClass = 'text-negative';
                    }
                }
                if (this.config.unit) {
                    formattedValue += ' ' + this.config.unit;
                }
        }

        value.textContent = formattedValue;
        if (isNegative && negativeClass) {
            value.classList.add(negativeClass);
        }

        // 10억 이상의 금액은 폰트 크기를 80%로 축소
        if ((this.config.unit === '원' || this.config.unit === '₩') &&
            Math.abs(this.config.value) >= 1000000000) {
            value.style.fontSize = 'clamp(1.2rem, 2.4vw, 1.6rem)'; // 80% 크기
        }

        valueContainer.appendChild(value);
        
        // 설명 (옵션)
        if (this.config.description) {
            const desc = document.createElement('div');
            desc.className = 'kpi-description';
            desc.style.cssText = `
                font-size: var(--font-sm);
                color: var(--text-muted);
                margin-top: var(--spacing-xs);
            `;
            desc.textContent = this.config.description;
            valueContainer.appendChild(desc);
        }

        return valueContainer;
    }
    
    /**
     * 차트 렌더링
     */
    renderChart() {
        const chartContainer = document.createElement('div');
        chartContainer.className = 'kpi-chart';
        chartContainer.style.cssText = `
            height: ${this.config.chart.height}px;
            margin: var(--spacing-md) 0;
            position: relative;
        `;
        
        // 간단한 스파크라인 차트
        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = this.config.chart.height;
        canvas.style.cssText = `
            width: 100%;
            height: 100%;
        `;
        
        this.drawSparkline(canvas, this.config.chart.data);
        chartContainer.appendChild(canvas);
        
        return chartContainer;
    }
    
    /**
     * CSS 변수를 실제 색상 값으로 변환
     */
    getCSSVariableColor(variableName, fallback = '#4A9EFF') {
        // 루트 요소에서 CSS 변수 값 가져오기
        const rootStyles = getComputedStyle(document.documentElement);
        const colorValue = rootStyles.getPropertyValue(variableName).trim();
        
        if (colorValue) {
            return colorValue;
        }
        return fallback;
    }
    
    /**
     * 스파크라인 그리기
     */
    drawSparkline(canvas, data) {
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        if (data.length < 2) return;
        
        // 데이터 정규화
        const max = Math.max(...data);
        const min = Math.min(...data);
        const range = max - min || 1;
        
        const points = data.map((value, index) => ({
            x: (index / (data.length - 1)) * width,
            y: height - ((value - min) / range) * height * 0.8 - height * 0.1
        }));
        
        // 색상 매핑
        const colorMap = {
            'primary': '#4A9EFF',
            'success': '#22C55E',
            'warning': '#F59E0B',
            'danger': '#EF4444',
            'info': '#3B82F6'
        };
        
        // 현재 테마 색상 가져오기
        const baseColor = this.getCSSVariableColor(`--${this.config.style.color}-color`, 
                                                   colorMap[this.config.style.color] || colorMap.primary);
        
        // RGB 변환 (rgba를 위해)
        let rgbColor = baseColor;
        
        // hex to rgb 변환
        if (baseColor.startsWith('#')) {
            const hex = baseColor.replace('#', '');
            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);
            rgbColor = `${r}, ${g}, ${b}`;
        } else if (baseColor.startsWith('rgb')) {
            // rgb(r, g, b) 형식에서 r, g, b만 추출
            const match = baseColor.match(/\d+/g);
            if (match && match.length >= 3) {
                rgbColor = `${match[0]}, ${match[1]}, ${match[2]}`;
            }
        }
        
        // 그라디언트 영역
        ctx.beginPath();
        ctx.moveTo(points[0].x, height);
        points.forEach(point => ctx.lineTo(point.x, point.y));
        ctx.lineTo(points[points.length - 1].x, height);
        ctx.closePath();
        
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, `rgba(${rgbColor}, 0.3)`);
        gradient.addColorStop(1, `rgba(${rgbColor}, 0)`);
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // 라인
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        points.forEach(point => ctx.lineTo(point.x, point.y));
        ctx.strokeStyle = baseColor;
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // 포인트
        points.forEach((point, index) => {
            if (index === points.length - 1) {
                ctx.beginPath();
                ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
                ctx.fillStyle = baseColor;
                ctx.fill();
            }
        });
    }
    
    /**
     * 진행률 바 렌더링
     */
    renderProgress() {
        const progressContainer = document.createElement('div');
        progressContainer.className = 'kpi-progress';
        progressContainer.style.cssText = `
            margin: var(--spacing-md) 0;
        `;
        
        // 진행률 정보
        if (this.config.progress.showPercentage) {
            const info = document.createElement('div');
            info.style.cssText = `
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: var(--spacing-xs);
                font-size: var(--font-sm);
            `;
            
            const label = document.createElement('span');
            label.textContent = '진행률';
            label.style.color = 'var(--text-muted)';
            
            const percentage = document.createElement('span');
            const percent = (this.config.progress.current / this.config.progress.target * 100).toFixed(2);  /* ✅ % 소수점 2자리 */
            percentage.textContent = `${percent}%`;
            percentage.style.color = 'var(--text-primary)';
            
            info.appendChild(label);
            info.appendChild(percentage);
            progressContainer.appendChild(info);
        }
        
        // 진행률 바
        const progressBar = document.createElement('div');
        progressBar.className = 'glass-progress';
        progressBar.style.cssText = `
            height: 8px;
            background: var(--glass-bg);
            border-radius: var(--border-radius-full);
            overflow: hidden;
        `;
        
        const progressFill = document.createElement('div');
        progressFill.className = 'glass-progress-bar';
        progressFill.style.cssText = `
            width: ${(this.config.progress.current / this.config.progress.target * 100)}%;
            height: 100%;
            background: var(--gradient-${this.config.style.color}, var(--gradient-primary));
            transition: width var(--animation-slow) ease-out;
        `;
        
        progressBar.appendChild(progressFill);
        progressContainer.appendChild(progressBar);
        
        // 애니메이션
        setTimeout(() => {
            progressFill.style.width = `${(this.config.progress.current / this.config.progress.target * 100)}%`;
        }, 100);
        
        return progressContainer;
    }
    
    /**
     * 푸터 렌더링
     */
    renderFooter() {
        const footer = document.createElement('div');
        footer.className = 'kpi-footer';
        footer.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: var(--spacing-sm);
            padding-top: var(--spacing-md);
            margin-top: var(--spacing-md);
            border-top: 1px solid var(--glass-border);
        `;

        // 계산 공식 (옵션) - 푸터 최상단에 배치
        if (this.config.formula) {
            const formula = document.createElement('div');
            formula.className = 'kpi-formula';
            formula.style.cssText = `
                display: block !important;
                font-size: 13px !important;
                color: #1a1a1a !important;
                padding: 10px 14px !important;
                background: rgba(255, 255, 255, 0.95) !important;
                border-left: 4px solid var(--${this.config.style.color}-color) !important;
                border-radius: 6px !important;
                font-family: 'Paperlogy', -apple-system, 'Noto Sans KR', sans-serif !important;
                font-weight: 600 !important;
                line-height: 1.5 !important;
                letter-spacing: 0.3px !important;
                box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15) !important;
                margin-bottom: 8px !important;
                opacity: 1 !important;
                visibility: visible !important;
            `;
            formula.textContent = `📐 ${this.config.formula}`;
            footer.appendChild(formula);
        }

        // 변화/새로고침 컨테이너
        const actionRow = document.createElement('div');
        actionRow.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;

        // 변화 표시
        if (this.config.change) {
            const trend = document.createElement('div');
            trend.className = 'kpi-trend';
            trend.style.cssText = `
                display: flex;
                align-items: center;
                gap: var(--spacing-xs);
                font-size: var(--font-sm);
            `;
            
            // 화살표
            if (this.config.change.showArrow) {
                const arrow = document.createElement('span');
                const isPositive = this.config.change.value >= 0;
                arrow.innerHTML = isPositive ? '▲' : '▼';
                arrow.style.color = isPositive ? 'var(--color-success)' : 'var(--color-danger)';
                trend.appendChild(arrow);
            }
            
            // 변화값
            const changeValue = document.createElement('span');
            let changeText = '';

            if (this.config.change.type === 'percent') {
                // 변화값이 백분율인 경우 100으로 나눔
                changeText = formatPercent(Math.abs(this.config.change.value) / 100);
            } else {
                changeText = formatNumber(Math.abs(this.config.change.value));
                if (this.config.unit) {
                    changeText += ' ' + this.config.unit;
                }
            }
            
            changeValue.textContent = changeText;
            changeValue.style.color = this.config.change.value >= 0 ? 
                'var(--color-success)' : 'var(--color-danger)';
            trend.appendChild(changeValue);
            
            // 기간
            if (this.config.change.period) {
                const period = document.createElement('span');
                period.textContent = this.config.change.period;
                period.style.color = 'var(--text-muted)';
                trend.appendChild(period);
            }
            
            actionRow.appendChild(trend);
        }

        // 새로고침 버튼 (옵션)
        if (this.config.onRefresh) {
            const refreshBtn = document.createElement('button');
            refreshBtn.className = 'kpi-refresh-btn';
            refreshBtn.style.cssText = `
                background: transparent;
                border: none;
                color: var(--text-muted);
                cursor: pointer;
                padding: var(--spacing-xs);
                border-radius: var(--border-radius-sm);
                transition: all var(--animation-duration);
            `;
            refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i>';
            
            refreshBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.refresh();
            });
            
            refreshBtn.addEventListener('mouseenter', () => {
                refreshBtn.style.background = 'var(--glass-bg)';
                refreshBtn.style.color = 'var(--text-primary)';
            });
            
            refreshBtn.addEventListener('mouseleave', () => {
                refreshBtn.style.background = 'transparent';
                refreshBtn.style.color = 'var(--text-muted)';
            });
            
            actionRow.appendChild(refreshBtn);
        }

        footer.appendChild(actionRow);

        return footer;
    }
    
    /**
     * 애니메이션 효과 추가
     */
    addAnimationEffects(card) {
        // 숫자 카운트 애니메이션
        const valueElement = card.querySelector('.kpi-value');
        if (valueElement && typeof this.config.value === 'number') {
            this.animateValue(valueElement, 0, this.config.value, 1000);
        }
        
        // 반짝임 효과
        const shimmer = document.createElement('div');
        shimmer.className = 'kpi-shimmer';
        shimmer.style.cssText = `
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(
                105deg,
                transparent 40%,
                rgba(255, 255, 255, 0.1) 50%,
                transparent 60%
            );
            animation: shimmer 3s infinite;
            pointer-events: none;
        `;
        
        card.appendChild(shimmer);
        
        // 애니메이션 정의
        if (!document.querySelector('#kpi-animations')) {
            const style = document.createElement('style');
            style.id = 'kpi-animations';
            style.textContent = `
                @keyframes shimmer {
                    0%, 100% { left: -100%; }
                    50% { left: 100%; }
                }
                
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.8; }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    /**
     * 값 애니메이션
     */
    animateValue(element, start, end, duration) {
        const startTime = performance.now();
        const unit = this.config.unit;
        
        const update = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // 이징 함수 (ease-out)
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const current = start + (end - start) * easeOut;
            
            // 포맷팅 (음수 규칙 적용)
            let formattedValue = current;
            let isNegative = false;

            switch (unit) {
                case '원':
                case '₩':
                    const currencyResult = formatCurrency(Math.round(current), true);
                    if (typeof currencyResult === 'object') {
                        formattedValue = currencyResult.text;
                        isNegative = currencyResult.isNegative;
                    } else {
                        formattedValue = currencyResult;
                    }
                    break;
                case '%':
                    // 애니메이션 중 백분율 값은 100으로 나눔 (음수 규칙 적용)
                    const percentAnimResult = formatPercent(current / 100, 2, true);
                    if (typeof percentAnimResult === 'object') {
                        formattedValue = percentAnimResult.text;
                        isNegative = percentAnimResult.isNegative;
                    } else {
                        formattedValue = percentAnimResult;
                    }
                    break;
                case '개':
                case '건':
                case '명':
                case '개사':
                    const numberResult = formatNumber(Math.round(current), true);
                    if (typeof numberResult === 'object') {
                        formattedValue = numberResult.text + unit;
                        isNegative = numberResult.isNegative;
                    } else {
                        formattedValue = numberResult + unit;
                    }
                    break;
                default:
                    const defaultResult = formatNumber(Math.round(current), true);
                    if (typeof defaultResult === 'object') {
                        formattedValue = defaultResult.text;
                        isNegative = defaultResult.isNegative;
                    } else {
                        formattedValue = defaultResult;
                    }
                    if (unit) {
                        formattedValue += ' ' + unit;
                    }
            }

            element.textContent = formattedValue;

            // 음수 클래스 적용
            if (isNegative) {
                element.classList.add('text-negative');
            } else {
                element.classList.remove('text-negative');
            }
            
            if (progress < 1) {
                requestAnimationFrame(update);
            }
        };
        
        requestAnimationFrame(update);
    }
    
    /**
     * 새로고침
     */
    async refresh() {
        if (this.state.isLoading) return;
        
        this.state.isLoading = true;
        
        // 로딩 애니메이션
        const refreshBtn = this.element.querySelector('.kpi-refresh-btn i');
        if (refreshBtn) {
            refreshBtn.classList.add('fa-spin');
        }
        
        try {
            if (this.config.onRefresh) {
                const newData = await this.config.onRefresh(this);
                if (newData) {
                    this.updateData(newData);
                }
            }
        } catch (error) {
            console.error('KPI 새로고침 실패:', error);
        } finally {
            this.state.isLoading = false;
            if (refreshBtn) {
                refreshBtn.classList.remove('fa-spin');
            }
        }
    }
    
    /**
     * 데이터 업데이트
     */
    updateData(data) {
        this.state.previousValue = this.config.value;
        
        // 설정 업데이트
        Object.assign(this.config, data);
        
        // 리렌더링
        this.update();
        
        // 변화 하이라이트
        if (this.config.value !== this.state.previousValue) {
            this.highlightChange();
        }
    }
    
    /**
     * 변화 하이라이트
     */
    highlightChange() {
        if (!this.element) return;
        
        const valueElement = this.element.querySelector('.kpi-value');
        if (valueElement) {
            valueElement.style.animation = 'pulse 0.5s ease-in-out';
            
            setTimeout(() => {
                valueElement.style.animation = '';
            }, 500);
        }
    }
    
    /**
     * 자동 새로고침 시작
     */
    startAutoRefresh() {
        if (this.config.autoRefresh && this.config.autoRefresh.interval) {
            this.autoRefreshInterval = setInterval(() => {
                this.refresh();
            }, this.config.autoRefresh.interval);
        }
    }
    
    /**
     * 자동 새로고침 중지
     */
    stopAutoRefresh() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
        }
    }
    
    /**
     * 파괴
     */
    destroy() {
        this.stopAutoRefresh();
        super.destroy();
    }
}

// KPI 그리드 컨테이너
class KPIGrid extends BaseComponent {
    constructor(config) {
        const defaultConfig = {
            className: 'kpi-grid',
            cards: [],
            columns: 'auto-fit',
            minWidth: 'var(--kpi-min-width, 280px)',
            gap: 'var(--spacing-lg)',
            responsive: true
        };
        
        super({ ...defaultConfig, ...config });
        
        this.cards = [];
        this.createCards();
    }
    
    /**
     * 카드 생성
     */
    createCards() {
        this.config.cards.forEach(cardConfig => {
            const card = new KPICard(cardConfig);
            this.cards.push(card);
        });
    }
    
    /**
     * 렌더링
     */
    render() {
        const grid = document.createElement('div');
        grid.className = this.config.className;
        grid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(${this.config.columns}, minmax(${this.config.minWidth}, 1fr));
            gap: ${this.config.gap};
            margin-bottom: var(--spacing-2xl);
        `;
        
        // 카드 추가
        this.cards.forEach(card => {
            grid.appendChild(card.render());
        });
        
        this.element = grid;
        
        // 반응형 처리
        if (this.config.responsive) {
            this.setupResponsive();
        }
        
        return grid;
    }
    
    /**
     * 반응형 설정
     */
    setupResponsive() {
        if (window.breakpointManager) {
            window.breakpointManager.addListener((data) => {
                this.adjustGrid(data.to);
            });
        }
    }
    
    /**
     * 그리드 조정
     */
    adjustGrid(breakpoint) {
        if (!this.element) return;
        
        const columns = {
            xs: '1',
            sm: '1',
            md: '2',
            lg: '3',
            xl: '4',
            '2xl': '5'
        };
        
        const column = columns[breakpoint] || 'auto-fit';
        
        if (column === '1') {
            this.element.style.gridTemplateColumns = '1fr';
        } else {
            this.element.style.gridTemplateColumns = 
                `repeat(auto-fit, minmax(${this.config.minWidth}, 1fr))`;
        }
    }
    
    /**
     * 모든 카드 새로고침
     */
    async refreshAll() {
        const promises = this.cards.map(card => card.refresh());
        await Promise.all(promises);
    }
    
    /**
     * 특정 카드 업데이트
     */
    updateCard(index, data) {
        if (this.cards[index]) {
            this.cards[index].updateData(data);
        }
    }
}

// 전역 등록
window.KPICard = KPICard;
window.KPIGrid = KPIGrid;

export { KPICard, KPIGrid };
export default KPICard;