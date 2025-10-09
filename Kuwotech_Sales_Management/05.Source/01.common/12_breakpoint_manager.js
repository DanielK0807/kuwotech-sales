/* ============================================
   브레이크포인트 매니저 - UI 사양서 기반 반응형 시스템
   파일: 01.common/13_breakpoint_manager.js
   작성일: 2025-01-27
   설명: UI 사양서 기반 동적 레이아웃 관리
============================================ */

/**
 * 브레이크포인트 매니저
 * UI 사양서 기반 반응형 디자인 시스템
 */
class BreakpointManager {
    constructor() {
        // UI 사양서 기반 브레이크포인트 정의
        this.breakpoints = {
            xs: 0,        // 모바일 (639px 이하)
            sm: 640,      // 대형 모바일 (640px - 767px)
            md: 768,      // 태블릿 (768px - 1023px)
            lg: 1024,     // 데스크톱 (1024px - 1279px)
            xl: 1280,     // 대형 데스크톱 (1280px - 1535px)
            '2xl': 1536   // 초대형 데스크톱 (1536px 이상)
        };
        
        // UI 사양서 기반 레이아웃 설정
        this.layoutConfigs = {
            xs: {
                sidebarWidth: '0',
                headerHeight: '56px',
                contentMaxWidth: '100%',
                kpiColumns: 1,
                tableColumns: 'mobile-view',
                sidebarOverlay: true,
                mobileMenu: true,
                cardView: true,
                contentPadding: '16px'
            },
            sm: {
                sidebarWidth: '0',
                headerHeight: '56px',
                contentMaxWidth: '100%',
                kpiColumns: 1,
                tableColumns: 'priority-essential',
                sidebarOverlay: true,
                mobileMenu: true,
                cardView: false,
                contentPadding: '24px'
            },
            md: {
                sidebarWidth: '200px',
                headerHeight: '60px',
                contentMaxWidth: '100%',
                kpiColumns: 2,
                tableColumns: 'priority-medium',
                sidebarCollapsible: true,
                mobileMenu: false,
                cardView: false,
                contentPadding: '24px'
            },
            lg: {
                sidebarWidth: '250px',
                headerHeight: '64px',
                contentMaxWidth: '100%',
                kpiColumns: 3,
                tableColumns: 'priority-high',
                sidebarCollapsible: false,
                mobileMenu: false,
                cardView: false,
                contentPadding: '32px'
            },
            xl: {
                sidebarWidth: '250px',
                headerHeight: '64px',
                contentMaxWidth: '1200px',
                kpiColumns: 4,
                tableColumns: 'all',
                sidebarCollapsible: false,
                mobileMenu: false,
                cardView: false,
                contentPadding: '32px'
            },
            '2xl': {
                sidebarWidth: '280px',
                headerHeight: '70px',
                contentMaxWidth: '1400px',
                kpiColumns: 5,
                tableColumns: 'all',
                sidebarCollapsible: false,
                mobileMenu: false,
                cardView: false,
                contentPadding: '40px'
            }
        };
        
        // 현재 브레이크포인트
        this.current = null;
        this.previous = null;
        
        // 리스너 목록
        this.listeners = new Set();
        
        // 디바운스 타이머
        this.debounceTimer = null;
        
        // 초기화
        this.init();
    }
    
    /**
     * 초기화
     */
    init() {
        // 초기 브레이크포인트 설정
        this.updateBreakpoint();
        
        // 리사이즈 이벤트 리스너 (디바운스 적용)
        window.addEventListener('resize', this.debounce(() => {
            this.updateBreakpoint();
        }, 150));
        
        // 오리엔테이션 변경 감지
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.updateBreakpoint(), 100);
        });
        
        console.log('[BreakpointManager] 초기화 완료');
    }
    
    /**
     * 현재 브레이크포인트 업데이트
     */
    updateBreakpoint() {
        const width = window.innerWidth;
        this.previous = this.current;
        
        // 브레이크포인트 결정
        let newBreakpoint = 'xs';
        for (const [name, minWidth] of Object.entries(this.breakpoints).reverse()) {
            if (width >= minWidth) {
                newBreakpoint = name;
                break;
            }
        }
        
        this.current = newBreakpoint;
        
        // 변경되었을 때만 처리
        if (this.previous !== this.current) {
            this.onBreakpointChange(this.previous, this.current);
        }
    }
    
    /**
     * 브레이크포인트 변경 처리
     * @param {string} from - 이전 브레이크포인트
     * @param {string} to - 현재 브레이크포인트
     */
    onBreakpointChange(from, to) {
        // body에 클래스와 데이터 속성 설정
        document.body.className = document.body.className
            .replace(/breakpoint-\w+/g, '')
            .trim() + ` breakpoint-${to}`;
        document.body.dataset.breakpoint = to;
        
        // CSS 변수 업데이트
        this.updateCSSVariables(to);
        
        // 레이아웃 적용
        this.applyLayout(to);
        
        // 커스텀 이벤트 발생
        window.dispatchEvent(new CustomEvent('layoutchange', {
            detail: {
                breakpoint: to,
                from,
                layout: this.layoutConfigs[to],
                width: window.innerWidth,
                height: window.innerHeight
            }
        }));
        
        // 리스너 실행
        this.notifyListeners({
            from,
            to,
            layout: this.layoutConfigs[to],
            width: window.innerWidth,
            height: window.innerHeight
        });
        
        console.log(`[BreakpointManager] 변경: ${from || 'initial'} → ${to}`);
    }
    
    /**
     * CSS 변수 업데이트
     * @param {string} breakpoint - 현재 브레이크포인트
     */
    updateCSSVariables(breakpoint) {
        const root = document.documentElement;
        const config = this.layoutConfigs[breakpoint];
        
        // 레이아웃 관련 CSS 변수 업데이트
        Object.entries(config).forEach(([key, value]) => {
            if (typeof value === 'string' || typeof value === 'number') {
                const cssVarName = `--${this.kebabCase(key)}`;
                root.style.setProperty(cssVarName, value);
            }
        });
        
        // 추가 동적 변수 설정
        if (breakpoint === 'xs' || breakpoint === 'sm') {
            root.style.setProperty('--sidebar-translate', '-100%');
            root.style.setProperty('--modal-width', '95vw');
            root.style.setProperty('--table-display', 'none');
            root.style.setProperty('--card-display', 'block');
        } else {
            root.style.setProperty('--sidebar-translate', '0');
            root.style.setProperty('--modal-width', '600px');
            root.style.setProperty('--table-display', 'table');
            root.style.setProperty('--card-display', 'none');
        }
    }
    
    /**
     * 레이아웃 적용
     * @param {string} breakpoint - 현재 브레이크포인트
     */
    applyLayout(breakpoint) {
        const config = this.layoutConfigs[breakpoint];
        
        // 모바일 메뉴 처리
        if (config.mobileMenu) {
            this.enableMobileMenu();
        } else {
            this.disableMobileMenu();
        }
        
        // 사이드바 처리
        if (config.sidebarOverlay) {
            this.enableSidebarOverlay();
        } else {
            this.disableSidebarOverlay();
        }
        
        // 카드뷰/테이블뷰 전환
        if (config.cardView) {
            this.enableCardView();
        } else {
            this.disableCardView();
        }
        
        // KPI 그리드 조정
        this.adjustKPIGrid(config.kpiColumns);
        
        // 테이블 컬럼 조정
        this.adjustTableColumns(config.tableColumns);
    }
    
    /**
     * 모바일 메뉴 활성화
     */
    enableMobileMenu() {
        const header = document.querySelector('.navbar, .header');
        if (header && !header.querySelector('.mobile-menu-btn')) {
            const menuBtn = document.createElement('button');
            menuBtn.className = 'mobile-menu-btn';
            menuBtn.innerHTML = '<i class="fas fa-bars"></i>';
            menuBtn.onclick = () => this.toggleSidebar();
            header.appendChild(menuBtn);
        }
    }
    
    /**
     * 모바일 메뉴 비활성화
     */
    disableMobileMenu() {
        const menuBtn = document.querySelector('.mobile-menu-btn');
        if (menuBtn) {
            menuBtn.remove();
        }
    }
    
    /**
     * 사이드바 오버레이 활성화
     */
    enableSidebarOverlay() {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            sidebar.classList.add('sidebar-overlay');
            
            // 오버레이 배경 추가
            if (!document.querySelector('.sidebar-backdrop')) {
                const backdrop = document.createElement('div');
                backdrop.className = 'sidebar-backdrop';
                backdrop.onclick = () => this.closeSidebar();
                document.body.appendChild(backdrop);
            }
        }
    }
    
    /**
     * 사이드바 오버레이 비활성화
     */
    disableSidebarOverlay() {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            sidebar.classList.remove('sidebar-overlay');
        }
        
        const backdrop = document.querySelector('.sidebar-backdrop');
        if (backdrop) {
            backdrop.remove();
        }
    }
    
    /**
     * 카드뷰 활성화
     */
    enableCardView() {
        const tables = document.querySelectorAll('.data-table, .table-container');
        tables.forEach(table => {
            table.style.display = 'none';
            
            // 카드뷰 컨테이너 생성
            const cardContainer = table.nextElementSibling;
            if (cardContainer && cardContainer.classList.contains('card-view-container')) {
                cardContainer.style.display = 'block';
            } else {
                this.createCardView(table);
            }
        });
    }
    
    /**
     * 카드뷰 비활성화
     */
    disableCardView() {
        const tables = document.querySelectorAll('.data-table, .table-container');
        tables.forEach(table => {
            table.style.display = '';
            
            const cardContainer = table.nextElementSibling;
            if (cardContainer && cardContainer.classList.contains('card-view-container')) {
                cardContainer.style.display = 'none';
            }
        });
    }
    
    /**
     * 카드뷰 생성
     * @param {HTMLElement} table - 테이블 요소
     */
    createCardView(table) {
        // 테이블 데이터를 카드로 변환
        const cardContainer = document.createElement('div');
        cardContainer.className = 'card-view-container';
        
        const rows = table.querySelectorAll('tbody tr');
        rows.forEach(row => {
            const card = document.createElement('div');
            card.className = 'data-card';
            
            const cells = row.querySelectorAll('td');
            const headers = table.querySelectorAll('th');
            
            cells.forEach((cell, index) => {
                if (headers[index]) {
                    const field = document.createElement('div');
                    field.className = 'card-field';
                    field.innerHTML = `
                        <span class="field-label">${headers[index].textContent}:</span>
                        <span class="field-value">${cell.innerHTML}</span>
                    `;
                    card.appendChild(field);
                }
            });
            
            cardContainer.appendChild(card);
        });
        
        table.parentNode.insertBefore(cardContainer, table.nextSibling);
    }
    
    /**
     * KPI 그리드 조정
     * @param {number} columns - 컬럼 수
     */
    adjustKPIGrid(columns) {
        const kpiContainer = document.querySelector('.kpi-grid, .kpi-container');
        if (kpiContainer) {
            kpiContainer.style.gridTemplateColumns = 
                columns === 1 ? '1fr' : 
                `repeat(auto-fit, minmax(var(--kpi-min-width), 1fr))`;
        }
    }
    
    /**
     * 테이블 컬럼 조정
     * @param {string} columnType - 컬럼 타입
     */
    adjustTableColumns(columnType) {
        const tables = document.querySelectorAll('.data-table, table');
        
        tables.forEach(table => {
            const headers = table.querySelectorAll('th');
            const rows = table.querySelectorAll('tr');
            
            headers.forEach((header, index) => {
                const priority = header.dataset.priority || 'high';
                
                // 컬럼 표시/숨김 처리
                let show = false;
                switch (columnType) {
                    case 'all':
                        show = true;
                        break;
                    case 'priority-high':
                        show = priority === 'high';
                        break;
                    case 'priority-medium':
                        show = priority !== 'low';
                        break;
                    case 'priority-essential':
                        show = priority === 'essential';
                        break;
                    case 'mobile-view':
                        show = priority === 'essential';
                        break;
                }
                
                // 헤더와 셀 표시/숨김
                header.style.display = show ? '' : 'none';
                rows.forEach(row => {
                    const cell = row.children[index];
                    if (cell) {
                        cell.style.display = show ? '' : 'none';
                    }
                });
            });
        });
    }
    
    /**
     * 사이드바 토글
     */
    toggleSidebar() {
        const sidebar = document.querySelector('.sidebar');
        const backdrop = document.querySelector('.sidebar-backdrop');
        
        if (sidebar) {
            sidebar.classList.toggle('open');
            if (backdrop) {
                backdrop.classList.toggle('show');
            }
        }
    }
    
    /**
     * 사이드바 닫기
     */
    closeSidebar() {
        const sidebar = document.querySelector('.sidebar');
        const backdrop = document.querySelector('.sidebar-backdrop');
        
        if (sidebar) {
            sidebar.classList.remove('open');
        }
        if (backdrop) {
            backdrop.classList.remove('show');
        }
    }
    
    /**
     * 현재 브레이크포인트 확인
     * @param {string} query - 쿼리 문자열
     * @returns {boolean} 매칭 여부
     */
    matches(query) {
        const width = window.innerWidth;
        
        // 정확한 매칭
        if (this.breakpoints[query] !== undefined) {
            return this.current === query;
        }
        
        // >= 쿼리
        if (query.startsWith('>=')) {
            const bp = query.slice(2);
            return width >= this.breakpoints[bp];
        }
        
        // <= 쿼리
        if (query.startsWith('<=')) {
            const bp = query.slice(2);
            const bpIndex = Object.keys(this.breakpoints).indexOf(bp);
            const currentIndex = Object.keys(this.breakpoints).indexOf(this.current);
            return currentIndex <= bpIndex;
        }
        
        // > 쿼리
        if (query.startsWith('>')) {
            const bp = query.slice(1);
            return width > this.breakpoints[bp];
        }
        
        // < 쿼리
        if (query.startsWith('<')) {
            const bp = query.slice(1);
            return width < this.breakpoints[bp];
        }
        
        return false;
    }
    
    /**
     * 현재 브레이크포인트 가져오기
     * @returns {string} 현재 브레이크포인트
     */
    getCurrent() {
        return this.current;
    }
    
    /**
     * 현재 레이아웃 설정 가져오기
     * @returns {Object} 레이아웃 설정
     */
    getCurrentLayout() {
        return this.layoutConfigs[this.current];
    }
    
    /**
     * 디바이스 타입 가져오기
     * @returns {string} 디바이스 타입
     */
    getDeviceType() {
        if (this.matches('<=sm')) return 'mobile';
        if (this.matches('<=lg')) return 'tablet';
        return 'desktop';
    }
    
    /**
     * 오리엔테이션 가져오기
     * @returns {string} 오리엔테이션
     */
    getOrientation() {
        return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
    }
    
    /**
     * 브레이크포인트 변경 리스너 추가
     * @param {Function} callback - 콜백 함수
     */
    addListener(callback) {
        this.listeners.add(callback);
    }
    
    /**
     * 브레이크포인트 변경 리스너 제거
     * @param {Function} callback - 콜백 함수
     */
    removeListener(callback) {
        this.listeners.delete(callback);
    }
    
    /**
     * 리스너들에게 알림
     * @param {Object} data - 변경 데이터
     */
    notifyListeners(data) {
        this.listeners.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error('[BreakpointManager] 리스너 에러:', error);
            }
        });
    }
    
    /**
     * 디바운스 함수
     * @param {Function} func - 실행할 함수
     * @param {number} wait - 대기 시간
     * @returns {Function} 디바운스된 함수
     */
    debounce(func, wait) {
        return (...args) => {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = setTimeout(() => {
                func.apply(this, args);
            }, wait);
        };
    }
    
    /**
     * kebab-case 변환
     * @param {string} str - 변환할 문자열
     * @returns {string} kebab-case 문자열
     */
    kebabCase(str) {
        return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    }
}

// 전역 인스턴스 생성
const breakpointManager = new BreakpointManager();

// 전역으로 노출
window.BreakpointManager = BreakpointManager;
window.breakpointManager = breakpointManager;

// 레이아웃 변경 이벤트 리스너 예시
window.addEventListener('layoutchange', (e) => {
    console.log('[Layout Changed]', e.detail);
});

export default breakpointManager;