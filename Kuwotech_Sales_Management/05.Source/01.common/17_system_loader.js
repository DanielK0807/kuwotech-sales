/* ============================================
   시스템 통합 로더 - UI/UX 가이드 기반
   파일: 01.common/16_system_loader.js
   작성일: 2025-01-27
   설명: 새로운 컴포넌트 시스템 통합 로드
============================================ */

/**
 * 시스템 통합 로더
 * 모든 매니저와 컴포넌트를 순차적으로 로드
 */
class SystemLoader {
    constructor() {
        this.loaded = {
            managers: false,
            components: false,
            styles: false
        };
        this.basePath = '../01.common';
        this.componentsPath = '../08.components';
    }
    
    /**
     * 전체 시스템 초기화
     */
    async init(options = {}) {
        console.log('====================================');
        console.log('[시스템 로더] 초기화 시작');
        console.log('====================================');
        
        const startTime = performance.now();
        
        try {
            // 1. CSS 변수 시스템 로드
            await this.loadStyles();
            console.log('[1/4] 스타일 시스템 로드 완료');
            
            // 2. 매니저 시스템 로드
            await this.loadManagers(options.managers);
            console.log('[2/4] 매니저 시스템 로드 완료');
            
            // 3. 컴포넌트 시스템 로드
            await this.loadComponents(options.components);
            console.log('[3/4] 컴포넌트 시스템 로드 완료');
            
            // 4. 페이지별 초기화
            await this.initializePage(options.page);
            console.log('[4/4] 페이지 초기화 완료');
            
            const endTime = performance.now();
            const loadTime = (endTime - startTime).toFixed(2);
            
            console.log('====================================');
            console.log(`[시스템 로더] 초기화 완료 (${loadTime}ms)`);
            console.log('====================================');
            
            // 초기화 완료 이벤트
            window.dispatchEvent(new CustomEvent('systemReady', {
                detail: {
                    loadTime,
                    loaded: this.loaded
                }
            }));
            
            return true;
            
        } catch (error) {
            console.error('[시스템 로더] 초기화 실패:', error);
            throw error;
        }
    }
    
    /**
     * 스타일 로드
     */
    async loadStyles() {
        // 새로운 글래스모피즘 강화 스타일
        const styleSheet = document.createElement('style');
        styleSheet.id = 'system-enhanced-styles';
        styleSheet.textContent = `
            /* ✅ FIXED: 글래스모피즘 강화 - CSS 변수 사용 */
            .glass-card, .glass-container {
                background: var(--glass-bg);
                backdrop-filter: var(--glass-blur);
                -webkit-backdrop-filter: var(--glass-blur);
                border: 1px solid var(--glass-border);
                box-shadow: var(--glass-shadow);
            }
            
            /* 호버 효과 강화 */
            .glass-card:hover {
                transform: translateY(-2px);
                box-shadow: var(--glass-shadow-hover);
            }
            
            /* 애니메이션 트랜지션 - transition은 각 요소에 필요시 적용 */
            .glass-card, .glass-container {
                transition: transform 0.3s ease, box-shadow 0.3s ease;
            }
        `;
        document.head.appendChild(styleSheet);
        
        this.loaded.styles = true;
    }
    
    /**
     * 매니저 시스템 로드
     */
    async loadManagers(options = {}) {
        const scripts = [
            `${this.basePath}/11_theme_manager.js`,
            `${this.basePath}/02_base_component.js`,
            `${this.basePath}/12_breakpoint_manager.js`,
            `${this.basePath}/09_animation_manager.js`
        ];
        
        for (const script of scripts) {
            await this.loadScript(script);
        }
        
        // ✅ FIXED: 테마 초기화 제거 - ThemeManager가 자동으로 처리
        // ThemeManager.init()에서 이미 테마를 설정하므로 여기서 재적용 불필요
        // HTML의 <body class="theme-*">만으로도 충분히 작동함
        if (window.themeManager) {
            console.log('[시스템 로더] ThemeManager 확인: 현재 테마', window.themeManager.getCurrentTheme());
            // 테마 재적용하지 않음 - 이미 설정된 테마 유지
        }
        
        // 애니메이션 초기화
        if (window.animationManager && options.animations !== false) {
            this.setupAnimations();
        }
        
        this.loaded.managers = true;
    }
    
    /**
     * 컴포넌트 시스템 로드
     * 참고: 모달은 01.common/06_modal.js에서 관리됩니다.
     */
    async loadComponents(options = {}) {
        const scripts = [
            `${this.componentsPath}/02_dynamic_button.js`,
            `${this.componentsPath}/04_dynamic_table.js`,
            `${this.componentsPath}/05_kpi_card.js`
        ];

        for (const script of scripts) {
            await this.loadScript(script);
        }

        this.loaded.components = true;
    }
    
    /**
     * 페이지별 초기화
     */
    async initializePage(pageType) {
        switch (pageType) {
            case 'login':
                await this.initLoginPage();
                break;
            case 'dashboard':
                await this.initDashboard();
                break;
            case 'companies':
                await this.initCompaniesPage();
                break;
            case 'reports':
                await this.initReportsPage();
                break;
            default:
                await this.initDefaultPage();
        }
    }
    
    /**
     * 로그인 페이지 초기화
     */
    async initLoginPage() {
        // 로그인 버튼 교체
        const loginBtn = document.querySelector('#loginBtn');
        if (loginBtn && window.DynamicButton) {
            const newBtn = new DynamicButton({
                text: '로그인',
                icon: 'emoji:🔐',
                variant: 'primary',
                size: 'lg',
                glass: true,
                ripple: true,
                onClick: () => handleLogin()
            });
            
            const container = loginBtn.parentElement;
            container.innerHTML = '';
            newBtn.mount(container);
        }
    }
    
    /**
     * 대시보드 초기화
     */
    async initDashboard() {
        // KPI 카드 교체
        const kpiContainer = document.querySelector('.kpi-container');
        if (kpiContainer && window.KPIGroup) {
            const kpiGroup = new KPIGroup({
                cards: [
                    {
                        title: '월 매출',
                        value: 125000000,
                        unit: '원',
                        trend: { value: 15, direction: 'up', period: '전월 대비' },
                        icon: 'emoji:💰',
                        status: 'success',
                        glass: true
                    },
                    {
                        title: '신규 고객',
                        value: 24,
                        unit: '개사',
                        trend: { value: 8, direction: 'up', period: '전월 대비' },
                        icon: 'emoji:🏢',
                        status: 'success',
                        glass: true
                    },
                    {
                        title: '실적 달성률',
                        value: 87.5,
                        unit: '%',
                        progress: 87.5,
                        target: 100,
                        icon: 'emoji:📊',
                        status: 'warning',
                        glass: true
                    },
                    {
                        title: '미수금',
                        value: 32000000,
                        unit: '원',
                        trend: { value: 5, direction: 'down', period: '전월 대비' },
                        icon: 'emoji:💳',
                        status: 'normal',
                        glass: true
                    }
                ],
                columns: 4,
                responsive: true,
                glass: true
            });
            
            kpiContainer.innerHTML = '';
            kpiGroup.mount(kpiContainer);
        }
    }
    
    /**
     * 거래처 페이지 초기화
     */
    async initCompaniesPage() {
        // 데이터 테이블 교체
        const tableContainer = document.querySelector('.table-container');
        if (tableContainer && window.DynamicDataTable) {
            const table = new DynamicDataTable({
                columns: [
                    { key: 'company', title: '거래처명', sortable: true, filterable: true },
                    { key: 'manager', title: '담당자', sortable: true },
                    { key: 'contact', title: '연락처' },
                    { key: 'sales', title: '매출액', sortable: true, formatter: (v) => `${v.toLocaleString()}원` },
                    { key: 'status', title: '상태', render: (v) => {
                        const colors = { active: 'success', pending: 'warning', inactive: 'error' };
                        return `<span class="badge badge-${colors[v]}">${v}</span>`;
                    }}
                ],
                data: [], // 실제 데이터는 별도 로드
                features: {
                    sort: true,
                    filter: true,
                    search: true,
                    pagination: true,
                    selection: true,
                    export: true
                },
                styles: {
                    striped: true,
                    bordered: true,
                    hover: true,
                    glass: true
                }
            });
            
            tableContainer.innerHTML = '';
            table.mount(tableContainer);
        }
    }
    
    /**
     * 보고서 페이지 초기화
     * 참고: 모달 관련 기능은 01.common/06_modal.js의 showModal을 사용하세요.
     */
    async initReportsPage() {
        // 보고서 작성 버튼 - 실제 모달은 각 페이지에서 구현
        console.log('[보고서 페이지] 초기화 완료');
    }
    
    /**
     * 기본 페이지 초기화
     */
    async initDefaultPage() {
        // 모든 페이지 공통 적용 사항
        this.replaceButtons();
        this.enhanceTables();
        this.setupAnimations();
    }
    
    /**
     * 버튼 교체
     */
    replaceButtons() {
        if (!window.DynamicButton) return;
        
        // 모든 기본 버튼을 동적 버튼으로 교체
        document.querySelectorAll('button:not(.no-replace)').forEach(btn => {
            const text = btn.textContent;
            const classes = btn.className;
            
            let variant = 'primary';
            if (classes.includes('secondary')) variant = 'secondary';
            if (classes.includes('danger')) variant = 'error';
            if (classes.includes('success')) variant = 'success';
            
            const newBtn = new DynamicButton({
                text: text.trim(),
                variant,
                glass: true,
                ripple: true,
                onClick: () => btn.click()
            });
            
            const container = document.createElement('div');
            container.className = 'btn-container';
            btn.parentElement.insertBefore(container, btn);
            btn.style.display = 'none';
            newBtn.mount(container);
        });
    }
    
    /**
     * 테이블 강화
     */
    enhanceTables() {
        // 기존 테이블에 글래스모피즘 효과 추가
        document.querySelectorAll('table').forEach(table => {
            table.classList.add('table-glass');
        });
    }
    
    /**
     * 애니메이션 설정
     */
    setupAnimations() {
        if (!window.animationManager) return;
        
        // 스크롤 애니메이션
        window.animationManager.observeElements('.fade-in', 'fadeIn');
        window.animationManager.observeElements('.scale-in', 'scaleIn');
        window.animationManager.observeElements('.slide-in', 'slideIn');
        
        // 카드 애니메이션
        window.animationManager.observeElements('.card', 'fadeIn', { stagger: true });
        window.animationManager.observeElements('.kpi-card', 'scaleIn', { stagger: true });
    }
    
    /**
     * 스크립트 동적 로드
     */
    loadScript(src) {
        return new Promise((resolve, reject) => {
            const existing = document.querySelector(`script[src="${src}"]`);
            if (existing) {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = src;
            script.type = 'module';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
}

// 전역 인스턴스 생성
const systemLoader = new SystemLoader();

// 전역으로 노출
window.SystemLoader = SystemLoader;
window.systemLoader = systemLoader;

// ES6 모듈 export
export { SystemLoader, systemLoader };
export default SystemLoader;