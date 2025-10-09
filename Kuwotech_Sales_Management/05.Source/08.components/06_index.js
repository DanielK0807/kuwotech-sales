/* ============================================
   컴포넌트 시스템 통합 인덱스
   파일: 08.components/index.js
   작성일: 2025-01-27
   설명: 모든 컴포넌트 모듈 통합 관리
============================================ */

// 기존 컴포넌트
import * as navigation from './01_navigation.js';

// 새로운 동적 컴포넌트들
import './02_dynamic_button.js';
import './03_dynamic_modal.js';
import './04_dynamic_table.js';
import './05_kpi_card.js';
import './07_accordion.js';

/**
 * 컴포넌트 시스템 초기화
 * @param {Object} options - 초기화 옵션
 */
export async function initComponents(options = {}) {
    console.log('========================================');
    console.log('[컴포넌트 시스템] 초기화 시작');
    console.log('========================================');
    
    try {
        // 1. 네비게이션 초기화
        if (options.navigation !== false) {
            await navigation.initNavigation(options.navigationConfig);
            console.log('[1/5] 네비게이션 컴포넌트 초기화 완료');
        }
        
        // 2. 버튼 컴포넌트 초기화
        if (options.button !== false && window.DynamicButton) {
            console.log('[2/5] 동적 버튼 컴포넌트 로드 완료');
        }
        
        // 3. 모달 컴포넌트 초기화
        if (options.modal !== false && window.DynamicModal) {
            console.log('[3/5] 동적 모달 컴포넌트 로드 완료');
        }
        
        // 4. 테이블 컴포넌트 초기화
        if (options.table !== false && window.DynamicDataTable) {
            console.log('[4/5] 동적 테이블 컴포넌트 로드 완료');
        }
        
        // 5. KPI 카드 컴포넌트 초기화
        if (options.kpi !== false && window.KPICard) {
            console.log('[5/6] KPI 카드 컴포넌트 로드 완료');
        }
        
        // 6. 아코디언 컴포넌트 초기화
        if (options.accordion !== false && window.Accordion) {
            console.log('[6/6] 아코디언 컴포넌트 로드 완료');
        }
        
        // 컴포넌트 스타일 적용
        applyComponentStyles();
        
        console.log('========================================');
        console.log('[컴포넌트 시스템] 초기화 완료');
        console.log('========================================');
        
        // 초기화 완료 이벤트
        window.dispatchEvent(new CustomEvent('componentsReady', {
            detail: { components: getLoadedComponents() }
        }));
        
        return true;
        
    } catch (error) {
        console.error('[컴포넌트 시스템] 초기화 실패:', error);
        throw error;
    }
}

/**
 * 컴포넌트 스타일 적용
 */
function applyComponentStyles() {
    // 스타일이 이미 존재하는지 확인
    if (document.getElementById('component-styles')) return;
    
    const styleSheet = document.createElement('style');
    styleSheet.id = 'component-styles';
    styleSheet.textContent = getComponentStyles();
    document.head.appendChild(styleSheet);
}

/**
 * 컴포넌트 스타일 정의
 */
function getComponentStyles() {
    return `
        /* ========== 동적 버튼 스타일 ========== */
        .btn {
            position: relative;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: var(--spacing-sm) var(--spacing-md);
            font-size: var(--font-md);
            font-weight: var(--font-weight-medium);
            line-height: 1.5;
            border: 1px solid transparent;
            border-radius: var(--border-radius-md);
            cursor: pointer;
            transition: all 0.3s ease;
            outline: none;
            text-decoration: none;
            user-select: none;
            overflow: hidden;
        }
        
        .btn-primary {
            background: var(--gradient-primary, var(--primary-color));
            color: var(--text-primary);
            border-color: var(--primary-dark);
        }
        
        .btn-glass {
            background: var(--glass-bg);
            backdrop-filter: var(--glass-blur);
            -webkit-backdrop-filter: var(--glass-blur);
            border: 1px solid var(--glass-border);
        }
        
        .btn-ripple {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
            pointer-events: none;
        }
        
        .btn-ripple-wave {
            position: absolute;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.5);
            transform: scale(0);
            animation: ripple 0.6s ease-out;
        }
        
        @keyframes ripple {
            to {
                transform: scale(4);
                opacity: 0;
            }
        }
        
        /* ========== 동적 모달 스타일 ========== */
        .modal-backdrop {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: var(--z-modal-backdrop);
        }
        
        .modal-backdrop-blur {
            backdrop-filter: blur(5px);
            -webkit-backdrop-filter: blur(5px);
        }
        
        .modal-wrapper {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: var(--z-modal);
            pointer-events: none;
        }
        
        .modal {
            position: relative;
            background: var(--bg-primary);
            border-radius: var(--border-radius-lg);
            box-shadow: var(--shadow-2xl);
            pointer-events: auto;
            max-height: 90vh;
            overflow: auto;
        }
        
        .modal-glass {
            background: var(--glass-bg-heavy);
            backdrop-filter: var(--glass-blur-heavy);
            -webkit-backdrop-filter: var(--glass-blur-heavy);
            border: 1px solid var(--glass-border);
        }
        
        .modal-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: var(--spacing-lg);
            border-bottom: 1px solid var(--border-light);
        }
        
        .modal-body {
            padding: var(--spacing-lg);
        }
        
        .modal-footer {
            padding: var(--spacing-lg);
            border-top: 1px solid var(--border-light);
            display: flex;
            justify-content: flex-end;
            gap: var(--spacing-sm);
        }
        
        /* ========== 동적 테이블 스타일 ========== */
        .data-table {
            width: 100%;
            background: var(--bg-primary);
            border-radius: var(--border-radius-lg);
            overflow: hidden;
        }
        
        .table-wrapper {
            overflow-x: auto;
        }
        
        .table {
            width: 100%;
            border-collapse: collapse;
        }
        
        .table-glass {
            background: var(--glass-bg);
            backdrop-filter: var(--glass-blur-light);
            -webkit-backdrop-filter: var(--glass-blur-light);
        }
        
        .table thead {
            background: var(--gradient-primary, var(--bg-secondary));
        }
        
        .table th {
            padding: var(--spacing-sm) var(--spacing-md);
            text-align: left;
            font-weight: var(--font-weight-semibold);
            color: var(--text-primary);
            border-bottom: 2px solid var(--border-light);
        }
        
        .table td {
            padding: var(--spacing-sm) var(--spacing-md);
            border-bottom: 1px solid var(--border-light);
        }
        
        .table-hover tbody tr:hover {
            background: var(--bg-hover);
        }
        
        .table-striped tbody tr:nth-child(odd) {
            background: rgba(255, 255, 255, 0.02);
        }
        
        /* ========== KPI 카드 스타일 ========== */
        .kpi-card {
            position: relative;
            background: var(--bg-secondary);
            border-radius: var(--border-radius-lg);
            padding: var(--spacing-lg);
            transition: all 0.3s ease;
            overflow: hidden;
        }
        
        .kpi-card-glass {
            background: var(--glass-bg);
            backdrop-filter: var(--glass-blur);
            -webkit-backdrop-filter: var(--glass-blur);
            border: 1px solid var(--glass-border);
        }
        
        .kpi-card:hover {
            transform: translateY(-4px);
            box-shadow: var(--shadow-xl);
        }
        
        .kpi-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: var(--spacing-md);
        }
        
        .kpi-title {
            font-size: var(--font-sm);
            font-weight: var(--font-weight-medium);
            color: var(--text-secondary);
            margin: 0;
        }
        
        .kpi-value {
            font-size: var(--font-2xl);
            font-weight: var(--font-weight-bold);
            color: var(--primary-color);
            margin: var(--spacing-sm) 0;
        }
        
        .kpi-trend {
            display: flex;
            align-items: center;
            gap: var(--spacing-xs);
            font-size: var(--font-sm);
        }
        
        .kpi-trend-up {
            color: var(--color-success);
        }
        
        .kpi-trend-down {
            color: var(--color-error);
        }
        
        .kpi-progress {
            margin-top: var(--spacing-md);
        }
        
        .kpi-progress-bar {
            height: 8px;
            background: var(--bg-tertiary);
            border-radius: var(--border-radius-full);
            overflow: hidden;
        }
        
        .kpi-progress-fill {
            height: 100%;
            background: var(--gradient-primary);
            transition: width 0.5s ease;
            position: relative;
        }
        
        .kpi-group {
            display: grid;
            gap: var(--spacing-lg);
        }
        
        .kpi-group-responsive {
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        }
        
        /* ========== 반응형 스타일 ========== */
        @media (max-width: 768px) {
            .modal {
                width: 90vw !important;
                max-width: none;
            }
            
            .kpi-group {
                grid-template-columns: 1fr;
            }
            
            .table-responsive {
                font-size: var(--font-sm);
            }
            
            .btn {
                padding: var(--spacing-xs) var(--spacing-sm);
                font-size: var(--font-sm);
            }
        }
    `;
}

/**
 * 로드된 컴포넌트 목록
 */
function getLoadedComponents() {
    return {
        navigation: !!navigation,
        dynamicButton: !!window.DynamicButton,
        dynamicModal: !!window.DynamicModal,
        dynamicTable: !!window.DynamicDataTable,
        kpiCard: !!window.KPICard,
        buttonGroup: !!window.ButtonGroup,
        kpiGroup: !!window.KPIGroup,
        modalManager: !!window.modalManager,
        accordion: !!window.Accordion
    };
}

/**
 * 컴포넌트 팩토리
 * 쉽게 컴포넌트를 생성할 수 있는 헬퍼 함수들
 */
export const ComponentFactory = {
    // 버튼 생성
    button: (config) => new window.DynamicButton(config),
    
    // 버튼 그룹 생성
    buttonGroup: (config) => new window.ButtonGroup(config),
    
    // 모달 생성 및 열기
    modal: (config) => {
        const modal = new window.DynamicModal(config);
        modal.open();
        return modal;
    },
    
    // 알림 모달
    alert: (message, title = '알림') => {
        return ComponentFactory.modal({
            title,
            content: message,
            size: 'sm',
            buttons: [{
                text: '확인',
                variant: 'primary',
                onClick: (e, modal) => modal.close()
            }]
        });
    },
    
    // 확인 모달
    confirm: (message, title = '확인') => {
        return new Promise((resolve) => {
            ComponentFactory.modal({
                title,
                content: message,
                size: 'sm',
                buttons: [
                    {
                        text: '취소',
                        variant: 'secondary',
                        onClick: (e, modal) => {
                            modal.close();
                            resolve(false);
                        }
                    },
                    {
                        text: '확인',
                        variant: 'primary',
                        onClick: (e, modal) => {
                            modal.close();
                            resolve(true);
                        }
                    }
                ]
            });
        });
    },
    
    // 데이터 테이블 생성
    table: (config) => new window.DynamicDataTable(config),
    
    // KPI 카드 생성
    kpiCard: (config) => new window.KPICard(config),
    
    // KPI 그룹 생성
    kpiGroup: (config) => new window.KPIGroup(config),
    
    // 아코디언 생성
    accordion: (config) => new window.Accordion(config)
};

// 전역으로 노출
window.ComponentFactory = ComponentFactory;

// 기본 내보내기
export default {
    initComponents,
    ComponentFactory,
    getLoadedComponents,
    
    // 네비게이션 관련
    ...navigation,
    
    // 컴포넌트 클래스들
    DynamicButton: window.DynamicButton,
    ButtonGroup: window.ButtonGroup,
    DynamicModal: window.DynamicModal,
    DynamicDataTable: window.DynamicDataTable,
    KPICard: window.KPICard,
    KPIGroup: window.KPIGroup,
    Accordion: window.Accordion
};