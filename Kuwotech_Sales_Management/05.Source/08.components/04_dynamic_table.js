/* ============================================
   동적 데이터 테이블 컴포넌트 - UI 사양서 기반
   파일: 08.components/04_dynamic_table.js
   수정일: 2025-01-27
   설명: UI 사양서 기준 반응형 데이터 테이블
============================================ */

import BaseComponent from '../01.common/12_base_component.js';
import { formatNumber, formatCurrency, formatDate } from '../01.common/03_format.js';
import { getFieldLabel } from '../01.common/08_terms.js';

/**
 * 동적 데이터 테이블 컴포넌트
 * UI 사양서 기반 반응형 테이블
 */
class DynamicDataTable extends BaseComponent {
    constructor(config) {
        const defaultConfig = {
            className: 'dynamic-table glass-table',
            
            // 데이터
            columns: [],
            data: [],
            dataSource: null, // URL 또는 함수
            
            // 기능 플래그
            features: {
                sort: true,
                filter: true,
                search: true,
                pagination: true,
                selection: false,
                editing: false,
                export: false,
                columnResize: false,
                virtualScroll: false,
                expandable: false,
                responsive: true // 반응형 모드
            },
            
            // 스타일링 (UI 사양서 기준)
            styles: {
                striped: true,
                bordered: true,
                hover: true,
                compact: false,
                glass: true,
                cardView: false // 모바일 카드뷰
            },
            
            // 페이지네이션 (UI 사양서 기준)
            pagination: {
                pageSize: 20,
                pageSizes: [10, 20, 50, 100],
                position: 'bottom',
                showInfo: true,
                showSizeChanger: true,
                showQuickJumper: true
            },
            
            // 선택
            selection: {
                mode: 'checkbox',
                showSelectAll: true,
                selectedRowKeys: []
            },
            
            // 반응형 설정 (UI 사양서 기준)
            responsive: {
                breakpoints: {
                    xs: { columns: 'essential' },
                    sm: { columns: 'essential' },
                    md: { columns: 'priority-medium' },
                    lg: { columns: 'priority-high' },
                    xl: { columns: 'all' },
                    '2xl': { columns: 'all' }
                }
            },
            
            // 레이아웃 크기 (UI 사양서 기준)
            layout: {
                filterBarHeight: 'calc(var(--spacing-unit) * 7)', // 56px
                headerHeight: 'calc(var(--spacing-unit) * 6)', // 48px
                rowHeight: 'calc(var(--spacing-unit) * 5)', // 40px
                maxHeight: 'calc(100vh - 300px)',
                paginationHeight: 'calc(var(--spacing-unit) * 7)' // 56px
            },
            
            // 콜백
            onRowClick: null,
            onRowDoubleClick: null,
            onSelectionChange: null,
            onSort: null,
            onFilter: null,
            onPageChange: null,
            onEdit: null,
            onExpand: null
        };
        
        super({ ...defaultConfig, ...config });
        
        // 테이블 상태
        this.state = {
            ...this.state,
            currentPage: 1,
            pageSize: this.config.pagination.pageSize,
            sortColumn: null,
            sortDirection: 'asc',
            filters: {},
            searchQuery: '',
            selectedRows: new Set(this.config.selection.selectedRowKeys),
            editingCell: null,
            expandedRows: new Set(),
            processedData: [],
            totalRows: 0,
            currentBreakpoint: this.getCurrentBreakpoint()
        };
        
        // 컬럼 정보 처리
        this.columns = this.processColumns();
        
        // 브레이크포인트 리스너 등록
        this.setupBreakpointListener();
        
        // 데이터 처리
        this.processData();
    }
    
    /**
     * 컬럼 정보 처리
     */
    processColumns() {
        return this.config.columns.map(col => ({
            key: col.key || col.dataIndex,
            title: col.title || getFieldLabel(col.key),
            dataIndex: col.dataIndex || col.key,
            width: col.width || 'auto',
            align: col.align || 'left',
            type: col.type || 'text',
            format: col.format || null,
            sortable: col.sortable !== false && this.config.features.sort,
            filterable: col.filterable !== false && this.config.features.filter,
            editable: col.editable === true && this.config.features.editing,
            priority: col.priority || 'high', // essential, high, medium, low
            render: col.render || null,
            ellipsis: col.ellipsis !== false
        }));
    }
    
    /**
     * 현재 브레이크포인트 가져오기
     */
    getCurrentBreakpoint() {
        if (window.breakpointManager) {
            return window.breakpointManager.getCurrent();
        }
        
        // 폴백: 수동 체크
        const width = window.innerWidth;
        if (width >= 1536) return '2xl';
        if (width >= 1280) return 'xl';
        if (width >= 1024) return 'lg';
        if (width >= 768) return 'md';
        if (width >= 640) return 'sm';
        return 'xs';
    }
    
    /**
     * 브레이크포인트 리스너 설정
     */
    setupBreakpointListener() {
        if (window.breakpointManager) {
            window.breakpointManager.addListener((data) => {
                this.state.currentBreakpoint = data.to;
                this.handleBreakpointChange(data);
            });
        }
        
        // 폴백: 리사이즈 이벤트
        window.addEventListener('resize', this.debounce(() => {
            const newBreakpoint = this.getCurrentBreakpoint();
            if (newBreakpoint !== this.state.currentBreakpoint) {
                this.state.currentBreakpoint = newBreakpoint;
                this.handleBreakpointChange({ to: newBreakpoint });
            }
        }, 150));
    }
    
    /**
     * 브레이크포인트 변경 처리
     */
    handleBreakpointChange(data) {
        const breakpoint = data.to;
        
        // 모바일 카드뷰 전환
        if (breakpoint === 'xs' || breakpoint === 'sm') {
            if (this.config.styles.cardView !== false) {
                this.enableCardView();
            }
        } else {
            this.disableCardView();
        }
        
        // 컬럼 가시성 조정
        this.adjustColumnVisibility(breakpoint);
    }
    
    /**
     * 렌더링
     */
    render() {
        const container = document.createElement('div');
        container.className = 'table-container';
        container.style.cssText = `
            width: 100%;
            border-radius: var(--border-radius-lg);
            overflow: hidden;
            border: 1px solid var(--glass-border);
            background: var(--bg-secondary);
        `;
        
        // 필터바
        if (this.shouldShowFilterBar()) {
            container.appendChild(this.renderFilterBar());
        }
        
        // 테이블 또는 카드뷰
        if (this.state.isCardView) {
            container.appendChild(this.renderCardView());
        } else {
            container.appendChild(this.renderTable());
        }
        
        // 페이지네이션
        if (this.config.features.pagination) {
            container.appendChild(this.renderPagination());
        }
        
        this.element = container;
        return container;
    }
    
    /**
     * 필터바 렌더링
     */
    renderFilterBar() {
        const filterBar = document.createElement('div');
        filterBar.className = 'table-filter-bar';
        filterBar.style.cssText = `
            display: flex;
            gap: var(--spacing-md);
            padding: var(--spacing-md);
            border-bottom: 1px solid var(--glass-border);
            height: ${this.config.layout.filterBarHeight};
            align-items: center;
            flex-wrap: wrap;
        `;
        
        // 검색 입력
        if (this.config.features.search) {
            const searchContainer = document.createElement('div');
            searchContainer.style.cssText = `
                flex: 1 1 300px;
                min-width: 200px;
            `;
            
            const searchInput = document.createElement('input');
            searchInput.type = 'text';
            searchInput.placeholder = '검색...';
            searchInput.className = 'glass-input';
            searchInput.value = this.state.searchQuery;
            searchInput.style.height = 'calc(var(--spacing-unit) * 5)';
            
            searchInput.addEventListener('input', this.debounce((e) => {
                this.state.searchQuery = e.target.value;
                this.processData();
            }, 300));
            
            searchContainer.appendChild(searchInput);
            filterBar.appendChild(searchContainer);
        }
        
        // 필터 버튼들
        const filterButtons = document.createElement('div');
        filterButtons.style.cssText = `
            display: flex;
            gap: var(--spacing-sm);
            flex: 0 0 auto;
        `;
        
        // 내보내기 버튼
        if (this.config.features.export) {
            const exportBtn = document.createElement('button');
            exportBtn.className = 'glass-button';
            exportBtn.innerHTML = '<i class="fas fa-download"></i> 내보내기';
            exportBtn.onclick = () => this.exportData();
            filterButtons.appendChild(exportBtn);
        }
        
        filterBar.appendChild(filterButtons);
        
        return filterBar;
    }
    
    /**
     * 테이블 렌더링
     */
    renderTable() {
        const tableWrapper = document.createElement('div');
        tableWrapper.style.cssText = `
            max-height: ${this.config.layout.maxHeight};
            overflow-y: auto;
        `;
        
        const table = document.createElement('table');
        table.className = this.config.className;
        table.style.cssText = `
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
        `;
        
        // 헤더
        table.appendChild(this.renderTableHeader());
        
        // 바디
        table.appendChild(this.renderTableBody());
        
        tableWrapper.appendChild(table);
        return tableWrapper;
    }
    
    /**
     * 테이블 헤더 렌더링
     */
    renderTableHeader() {
        const thead = document.createElement('thead');
        thead.style.cssText = `
            position: sticky;
            top: 0;
            z-index: 10;
            background: var(--bg-tertiary);
        `;
        
        const tr = document.createElement('tr');
        
        // 선택 체크박스
        if (this.config.features.selection && this.config.selection.mode === 'checkbox') {
            const th = document.createElement('th');
            th.style.cssText = `
                width: 40px;
                padding: var(--spacing-md);
                height: ${this.config.layout.headerHeight};
            `;
            
            if (this.config.selection.showSelectAll) {
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = this.state.selectedRows.size === this.state.processedData.length;
                checkbox.onchange = (e) => this.selectAll(e.target.checked);
                th.appendChild(checkbox);
            }
            
            tr.appendChild(th);
        }
        
        // 데이터 컬럼
        this.getVisibleColumns().forEach(col => {
            const th = document.createElement('th');
            th.style.cssText = `
                padding: var(--spacing-md);
                height: ${this.config.layout.headerHeight};
                font-weight: 600;
                font-size: var(--font-sm);
                text-transform: uppercase;
                letter-spacing: 0.05em;
                border-bottom: 2px solid var(--glass-border);
                text-align: ${col.align};
                ${col.width !== 'auto' ? `width: ${col.width}` : ''}
            `;
            
            th.dataset.priority = col.priority;
            
            const headerContent = document.createElement('div');
            headerContent.style.cssText = `
                display: flex;
                align-items: center;
                justify-content: ${col.align === 'center' ? 'center' : col.align === 'right' ? 'flex-end' : 'flex-start'};
                gap: var(--spacing-xs);
            `;
            
            // 제목
            const title = document.createElement('span');
            title.textContent = col.title;
            headerContent.appendChild(title);
            
            // 정렬 아이콘
            if (col.sortable) {
                th.style.cursor = 'pointer';
                th.style.userSelect = 'none';
                
                const sortIcon = document.createElement('span');
                sortIcon.style.cssText = `
                    opacity: 0.5;
                    transition: opacity var(--animation-duration);
                    font-size: 10px;
                `;
                
                if (this.state.sortColumn === col.key) {
                    sortIcon.textContent = this.state.sortDirection === 'asc' ? '▲' : '▼';
                    sortIcon.style.opacity = '1';
                } else {
                    sortIcon.textContent = '⇅';
                }
                
                headerContent.appendChild(sortIcon);
                
                th.onclick = () => this.handleSort(col.key);
                
                th.onmouseenter = () => {
                    sortIcon.style.opacity = '1';
                };
                
                th.onmouseleave = () => {
                    if (this.state.sortColumn !== col.key) {
                        sortIcon.style.opacity = '0.5';
                    }
                };
            }
            
            th.appendChild(headerContent);
            tr.appendChild(th);
        });
        
        thead.appendChild(tr);
        return thead;
    }
    
    /**
     * 테이블 바디 렌더링
     */
    renderTableBody() {
        const tbody = document.createElement('tbody');
        
        const pageData = this.getPageData();
        
        if (pageData.length === 0) {
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = this.getVisibleColumns().length + (this.config.features.selection ? 1 : 0);
            td.style.cssText = `
                text-align: center;
                padding: var(--spacing-2xl);
                color: var(--text-muted);
            `;
            td.textContent = '데이터가 없습니다.';
            tr.appendChild(td);
            tbody.appendChild(tr);
            return tbody;
        }
        
        pageData.forEach((row, index) => {
            const tr = this.renderTableRow(row, index);
            tbody.appendChild(tr);
        });
        
        return tbody;
    }
    
    /**
     * 테이블 행 렌더링
     */
    renderTableRow(row, index) {
        const tr = document.createElement('tr');
        tr.style.cssText = `
            height: ${this.config.layout.rowHeight};
            transition: background var(--animation-duration);
        `;
        
        // 호버 효과
        if (this.config.styles.hover) {
            tr.onmouseenter = () => {
                tr.style.background = 'var(--glass-bg)';
            };
            tr.onmouseleave = () => {
                if (!this.state.selectedRows.has(row.id || index)) {
                    tr.style.background = '';
                }
            };
        }
        
        // 선택 효과
        if (this.state.selectedRows.has(row.id || index)) {
            tr.style.background = 'var(--accent-color)';
            tr.style.opacity = '0.1';
        }
        
        // 클릭 이벤트
        if (this.config.onRowClick) {
            tr.style.cursor = 'pointer';
            tr.onclick = () => this.config.onRowClick(row, index);
        }
        
        // 더블클릭 이벤트
        if (this.config.onRowDoubleClick) {
            tr.ondblclick = () => this.config.onRowDoubleClick(row, index);
        }
        
        // 선택 체크박스
        if (this.config.features.selection && this.config.selection.mode === 'checkbox') {
            const td = document.createElement('td');
            td.style.cssText = `
                width: 40px;
                padding: var(--spacing-sm) var(--spacing-md);
                text-align: center;
            `;
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = this.state.selectedRows.has(row.id || index);
            checkbox.onchange = (e) => this.toggleSelection(row.id || index, e.target.checked);
            checkbox.onclick = (e) => e.stopPropagation();
            
            td.appendChild(checkbox);
            tr.appendChild(td);
        }
        
        // 데이터 셀
        this.getVisibleColumns().forEach(col => {
            const td = document.createElement('td');
            td.style.cssText = `
                padding: var(--spacing-sm) var(--spacing-md);
                border-bottom: 1px solid var(--glass-border);
                font-size: var(--font-md);
                text-align: ${col.align};
            `;
            
            td.dataset.priority = col.priority;
            
            // 셀 내용
            const value = this.getCellValue(row, col);
            const content = this.renderCellContent(value, col, row);
            
            if (col.ellipsis) {
                td.style.cssText += `
                    max-width: var(--cell-max-width, 200px);
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                `;
                td.title = typeof value === 'string' ? value : '';
            }
            
            td.appendChild(content);
            tr.appendChild(td);
        });
        
        return tr;
    }
    
    /**
     * 셀 값 가져오기
     */
    getCellValue(row, col) {
        const keys = col.dataIndex.split('.');
        let value = row;
        
        for (const key of keys) {
            value = value?.[key];
        }
        
        return value;
    }
    
    /**
     * 셀 내용 렌더링
     */
    renderCellContent(value, col, row) {
        const span = document.createElement('span');
        
        // 커스텀 렌더러
        if (col.render) {
            const result = col.render(value, row);
            if (typeof result === 'string') {
                span.innerHTML = result;
            } else if (result instanceof HTMLElement) {
                return result;
            }
            return span;
        }
        
        // 타입별 포맷팅
        let formattedValue = value;
        
        switch (col.type) {
            case 'number':
                formattedValue = formatNumber(value);
                break;
            case 'currency':
                formattedValue = formatCurrency(value);
                break;
            case 'date':
                formattedValue = formatDate(value);
                break;
            case 'percent':
                formattedValue = value ? `${value}%` : '';
                break;
            case 'boolean':
                formattedValue = value ? '✓' : '✗';
                span.style.color = value ? 'var(--color-success)' : 'var(--text-muted)';
                break;
            default:
                formattedValue = value || '-';
        }
        
        // 커스텀 포맷
        if (col.format && typeof col.format === 'function') {
            formattedValue = col.format(value, row);
        }
        
        span.textContent = formattedValue;
        return span;
    }
    
    /**
     * 카드뷰 렌더링
     */
    renderCardView() {
        const container = document.createElement('div');
        container.className = 'card-view-container';
        container.style.cssText = `
            display: grid;
            gap: var(--spacing-md);
            padding: var(--spacing-md);
        `;
        
        const pageData = this.getPageData();
        
        if (pageData.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.style.cssText = `
                text-align: center;
                padding: var(--spacing-2xl);
                color: var(--text-muted);
            `;
            emptyMessage.textContent = '데이터가 없습니다.';
            container.appendChild(emptyMessage);
            return container;
        }
        
        pageData.forEach((row, index) => {
            const card = this.renderDataCard(row, index);
            container.appendChild(card);
        });
        
        return container;
    }
    
    /**
     * 데이터 카드 렌더링
     */
    renderDataCard(row, index) {
        const card = document.createElement('div');
        card.className = 'data-card glass-card';
        card.style.cssText = `
            padding: var(--spacing-lg);
            border-radius: var(--border-radius-md);
        `;
        
        // 선택 상태
        if (this.state.selectedRows.has(row.id || index)) {
            card.style.borderColor = 'var(--color-primary)';
            card.style.background = 'var(--accent-alpha)';
        }
        
        // 클릭 이벤트
        if (this.config.onRowClick) {
            card.style.cursor = 'pointer';
            card.onclick = () => this.config.onRowClick(row, index);
        }
        
        // 카드 헤더 (첫 번째 essential 컬럼)
        const essentialColumns = this.columns.filter(col => col.priority === 'essential');
        if (essentialColumns.length > 0) {
            const header = document.createElement('div');
            header.style.cssText = `
                font-size: var(--font-lg);
                font-weight: var(--font-weight-semibold);
                margin-bottom: var(--spacing-md);
                padding-bottom: var(--spacing-sm);
                border-bottom: 1px solid var(--glass-border);
            `;
            
            const headerValue = this.getCellValue(row, essentialColumns[0]);
            header.textContent = headerValue || '-';
            card.appendChild(header);
        }
        
        // 카드 필드들
        this.getVisibleColumns().forEach(col => {
            if (col.priority === 'essential' && essentialColumns.indexOf(col) === 0) {
                return; // 헤더로 이미 표시됨
            }
            
            const field = document.createElement('div');
            field.className = 'card-field';
            field.style.cssText = `
                display: flex;
                justify-content: space-between;
                padding: var(--spacing-xs) 0;
                font-size: var(--font-sm);
            `;
            
            const label = document.createElement('span');
            label.style.cssText = `
                color: var(--text-muted);
                font-weight: var(--font-weight-medium);
            `;
            label.textContent = col.title + ':';
            
            const value = document.createElement('span');
            value.style.cssText = `
                color: var(--text-primary);
                text-align: right;
            `;
            
            const cellValue = this.getCellValue(row, col);
            const content = this.renderCellContent(cellValue, col, row);
            
            if (content instanceof HTMLElement) {
                value.appendChild(content);
            } else {
                value.innerHTML = content.innerHTML || content.textContent;
            }
            
            field.appendChild(label);
            field.appendChild(value);
            card.appendChild(field);
        });
        
        // 선택 체크박스
        if (this.config.features.selection && this.config.selection.mode === 'checkbox') {
            const checkboxContainer = document.createElement('div');
            checkboxContainer.style.cssText = `
                margin-top: var(--spacing-md);
                padding-top: var(--spacing-md);
                border-top: 1px solid var(--glass-border);
            `;
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `card-select-${index}`;
            checkbox.checked = this.state.selectedRows.has(row.id || index);
            checkbox.onchange = (e) => this.toggleSelection(row.id || index, e.target.checked);
            checkbox.onclick = (e) => e.stopPropagation();
            
            const label = document.createElement('label');
            label.htmlFor = `card-select-${index}`;
            label.style.cssText = `
                margin-left: var(--spacing-sm);
                cursor: pointer;
            `;
            label.textContent = '선택';
            
            checkboxContainer.appendChild(checkbox);
            checkboxContainer.appendChild(label);
            card.appendChild(checkboxContainer);
        }
        
        return card;
    }
    
    /**
     * 페이지네이션 렌더링
     */
    renderPagination() {
        const pagination = document.createElement('div');
        pagination.className = 'table-pagination';
        pagination.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: var(--spacing-md);
            border-top: 1px solid var(--glass-border);
            height: ${this.config.layout.paginationHeight};
            flex-wrap: wrap;
            gap: var(--spacing-md);
        `;
        
        // 페이지 정보
        if (this.config.pagination.showInfo) {
            const info = document.createElement('div');
            info.className = 'pagination-info';
            info.style.cssText = `
                font-size: var(--font-sm);
                color: var(--text-secondary);
            `;
            
            const start = (this.state.currentPage - 1) * this.state.pageSize + 1;
            const end = Math.min(this.state.currentPage * this.state.pageSize, this.state.totalRows);
            
            info.textContent = `${start}-${end} / 총 ${this.state.totalRows}개`;
            pagination.appendChild(info);
        }
        
        // 페이지 컨트롤
        const controls = document.createElement('div');
        controls.className = 'pagination-controls';
        controls.style.cssText = `
            display: flex;
            gap: var(--spacing-sm);
            align-items: center;
        `;
        
        // 이전 버튼
        const prevBtn = document.createElement('button');
        prevBtn.className = 'glass-button';
        prevBtn.innerHTML = '◀';
        prevBtn.disabled = this.state.currentPage === 1;
        prevBtn.onclick = () => this.goToPage(this.state.currentPage - 1);
        prevBtn.style.cssText = `
            width: calc(var(--spacing-unit) * 4);
            height: calc(var(--spacing-unit) * 4);
            padding: 0;
        `;
        controls.appendChild(prevBtn);
        
        // 페이지 번호들
        const totalPages = Math.ceil(this.state.totalRows / this.state.pageSize);
        const pageNumbers = this.getPageNumbers(totalPages);
        
        pageNumbers.forEach(num => {
            if (num === '...') {
                const ellipsis = document.createElement('span');
                ellipsis.textContent = '...';
                ellipsis.style.cssText = `
                    padding: 0 var(--spacing-xs);
                    color: var(--text-muted);
                `;
                controls.appendChild(ellipsis);
            } else {
                const pageBtn = document.createElement('button');
                pageBtn.className = 'glass-button';
                pageBtn.textContent = num;
                pageBtn.onclick = () => this.goToPage(num);
                pageBtn.style.cssText = `
                    width: calc(var(--spacing-unit) * 4);
                    height: calc(var(--spacing-unit) * 4);
                    padding: 0;
                `;
                
                if (num === this.state.currentPage) {
                    pageBtn.style.background = 'var(--accent-color)';
                    pageBtn.style.color = 'var(--text-primary)';
                }
                
                controls.appendChild(pageBtn);
            }
        });
        
        // 다음 버튼
        const nextBtn = document.createElement('button');
        nextBtn.className = 'glass-button';
        nextBtn.innerHTML = '▶';
        nextBtn.disabled = this.state.currentPage === totalPages;
        nextBtn.onclick = () => this.goToPage(this.state.currentPage + 1);
        nextBtn.style.cssText = `
            width: calc(var(--spacing-unit) * 4);
            height: calc(var(--spacing-unit) * 4);
            padding: 0;
        `;
        controls.appendChild(nextBtn);
        
        // 페이지 크기 선택
        if (this.config.pagination.showSizeChanger) {
            const sizeChanger = document.createElement('select');
            sizeChanger.className = 'glass-input';
            sizeChanger.style.cssText = `
                margin-left: var(--spacing-md);
                padding: var(--spacing-xs) var(--spacing-sm);
                height: calc(var(--spacing-unit) * 4);
            `;
            
            this.config.pagination.pageSizes.forEach(size => {
                const option = document.createElement('option');
                option.value = size;
                option.textContent = `${size}개`;
                option.selected = size === this.state.pageSize;
                sizeChanger.appendChild(option);
            });
            
            sizeChanger.onchange = (e) => {
                this.state.pageSize = parseInt(e.target.value);
                this.state.currentPage = 1;
                this.processData();
            };
            
            controls.appendChild(sizeChanger);
        }
        
        pagination.appendChild(controls);
        
        return pagination;
    }
    
    /**
     * 페이지 번호 배열 생성
     */
    getPageNumbers(totalPages) {
        const current = this.state.currentPage;
        const pages = [];
        
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            pages.push(1);
            
            if (current > 3) {
                pages.push('...');
            }
            
            for (let i = Math.max(2, current - 1); i <= Math.min(current + 1, totalPages - 1); i++) {
                pages.push(i);
            }
            
            if (current < totalPages - 2) {
                pages.push('...');
            }
            
            pages.push(totalPages);
        }
        
        return pages;
    }
    
    /**
     * 필터바 표시 여부
     */
    shouldShowFilterBar() {
        return this.config.features.search || 
               this.config.features.filter || 
               this.config.features.export;
    }
    
    /**
     * 가시 컬럼 가져오기
     */
    getVisibleColumns() {
        const breakpoint = this.state.currentBreakpoint;
        const columnVisibility = this.config.responsive.breakpoints[breakpoint]?.columns || 'all';
        
        return this.columns.filter(col => {
            switch (columnVisibility) {
                case 'essential':
                    return col.priority === 'essential';
                case 'priority-medium':
                    return col.priority !== 'low';
                case 'priority-high':
                    return col.priority === 'essential' || col.priority === 'high';
                case 'all':
                default:
                    return true;
            }
        });
    }
    
    /**
     * 컬럼 가시성 조정
     */
    adjustColumnVisibility(breakpoint) {
        if (!this.element) return;
        
        const columnVisibility = this.config.responsive.breakpoints[breakpoint]?.columns || 'all';
        
        const headers = this.element.querySelectorAll('th[data-priority]');
        const cells = this.element.querySelectorAll('td[data-priority]');
        
        [...headers, ...cells].forEach(el => {
            const priority = el.dataset.priority;
            let show = false;
            
            switch (columnVisibility) {
                case 'essential':
                    show = priority === 'essential';
                    break;
                case 'priority-medium':
                    show = priority !== 'low';
                    break;
                case 'priority-high':
                    show = priority === 'essential' || priority === 'high';
                    break;
                case 'all':
                default:
                    show = true;
            }
            
            el.style.display = show ? '' : 'none';
        });
    }
    
    /**
     * 카드뷰 활성화
     */
    enableCardView() {
        this.state.isCardView = true;
        if (this.element) {
            this.update();
        }
    }
    
    /**
     * 카드뷰 비활성화
     */
    disableCardView() {
        this.state.isCardView = false;
        if (this.element) {
            this.update();
        }
    }
    
    /**
     * 데이터 처리
     */
    async processData() {
        let data = [...this.config.data];
        
        // 외부 데이터 소스
        if (this.config.dataSource) {
            if (typeof this.config.dataSource === 'string') {
                // URL
                data = await this.fetchData(this.config.dataSource);
            } else if (typeof this.config.dataSource === 'function') {
                // 함수
                data = await this.config.dataSource();
            }
        }
        
        // 검색
        if (this.state.searchQuery) {
            data = this.searchData(data, this.state.searchQuery);
        }
        
        // 필터
        if (Object.keys(this.state.filters).length > 0) {
            data = this.filterData(data, this.state.filters);
        }
        
        // 정렬
        if (this.state.sortColumn) {
            data = this.sortData(data, this.state.sortColumn, this.state.sortDirection);
        }
        
        this.state.processedData = data;
        this.state.totalRows = data.length;
        
        // 리렌더링
        if (this.element) {
            this.update();
        }
    }
    
    /**
     * 검색 데이터
     */
    searchData(data, query) {
        const lowerQuery = query.toLowerCase();
        
        return data.filter(row => {
            return this.columns.some(col => {
                const value = this.getCellValue(row, col);
                if (value === null || value === undefined) return false;
                
                return String(value).toLowerCase().includes(lowerQuery);
            });
        });
    }
    
    /**
     * 필터 데이터
     */
    filterData(data, filters) {
        return data.filter(row => {
            return Object.entries(filters).every(([key, filterValue]) => {
                const value = row[key];
                
                if (Array.isArray(filterValue)) {
                    return filterValue.includes(value);
                }
                
                if (typeof filterValue === 'object' && filterValue !== null) {
                    if ('min' in filterValue && value < filterValue.min) return false;
                    if ('max' in filterValue && value > filterValue.max) return false;
                    return true;
                }
                
                return value === filterValue;
            });
        });
    }
    
    /**
     * 정렬 데이터
     */
    sortData(data, column, direction) {
        return [...data].sort((a, b) => {
            const aValue = a[column];
            const bValue = b[column];
            
            if (aValue === null || aValue === undefined) return 1;
            if (bValue === null || bValue === undefined) return -1;
            
            let comparison = 0;
            
            if (typeof aValue === 'string' && typeof bValue === 'string') {
                comparison = aValue.localeCompare(bValue, 'ko-KR');
            } else if (typeof aValue === 'number' && typeof bValue === 'number') {
                comparison = aValue - bValue;
            } else {
                comparison = String(aValue).localeCompare(String(bValue));
            }
            
            return direction === 'asc' ? comparison : -comparison;
        });
    }
    
    /**
     * 페이지 데이터 가져오기
     */
    getPageData() {
        if (!this.config.features.pagination) {
            return this.state.processedData;
        }
        
        const start = (this.state.currentPage - 1) * this.state.pageSize;
        const end = start + this.state.pageSize;
        
        return this.state.processedData.slice(start, end);
    }
    
    /**
     * 정렬 처리
     */
    handleSort(column) {
        if (!this.config.features.sort) return;
        
        if (this.state.sortColumn === column) {
            this.state.sortDirection = this.state.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.state.sortColumn = column;
            this.state.sortDirection = 'asc';
        }
        
        this.processData();
        
        if (this.config.onSort) {
            this.config.onSort(column, this.state.sortDirection);
        }
    }
    
    /**
     * 페이지 이동
     */
    goToPage(page) {
        const totalPages = Math.ceil(this.state.totalRows / this.state.pageSize);
        
        if (page < 1 || page > totalPages) return;
        
        this.state.currentPage = page;
        this.update();
        
        if (this.config.onPageChange) {
            this.config.onPageChange(page, this.state.pageSize);
        }
    }
    
    /**
     * 선택 토글
     */
    toggleSelection(id, selected) {
        if (selected) {
            this.state.selectedRows.add(id);
        } else {
            this.state.selectedRows.delete(id);
        }
        
        if (this.config.onSelectionChange) {
            this.config.onSelectionChange(Array.from(this.state.selectedRows));
        }
        
        // 체크박스 업데이트
        this.updateSelectionUI();
    }
    
    /**
     * 전체 선택
     */
    selectAll(selected) {
        const pageData = this.getPageData();
        
        pageData.forEach((row, index) => {
            const id = row.id || index;
            if (selected) {
                this.state.selectedRows.add(id);
            } else {
                this.state.selectedRows.delete(id);
            }
        });
        
        if (this.config.onSelectionChange) {
            this.config.onSelectionChange(Array.from(this.state.selectedRows));
        }
        
        this.updateSelectionUI();
    }
    
    /**
     * 선택 UI 업데이트
     */
    updateSelectionUI() {
        if (!this.element) return;
        
        // 개별 체크박스
        this.element.querySelectorAll('tbody input[type="checkbox"]').forEach((checkbox, index) => {
            const pageData = this.getPageData();
            const row = pageData[index];
            if (row) {
                checkbox.checked = this.state.selectedRows.has(row.id || index);
            }
        });
        
        // 전체 선택 체크박스
        const selectAllCheckbox = this.element.querySelector('thead input[type="checkbox"]');
        if (selectAllCheckbox) {
            const pageData = this.getPageData();
            const allSelected = pageData.length > 0 && pageData.every((row, index) => 
                this.state.selectedRows.has(row.id || index)
            );
            selectAllCheckbox.checked = allSelected;
        }
        
        // 선택된 행 스타일
        this.element.querySelectorAll('tbody tr').forEach((tr, index) => {
            const pageData = this.getPageData();
            const row = pageData[index];
            if (row && this.state.selectedRows.has(row.id || index)) {
                tr.style.background = 'var(--accent-alpha)';
            } else {
                tr.style.background = '';
            }
        });
    }
    
    /**
     * 데이터 내보내기
     */
    exportData() {
        const data = this.state.processedData;
        const headers = this.columns.map(col => col.title);
        
        // CSV 생성
        let csv = headers.join(',') + '\n';
        
        data.forEach(row => {
            const values = this.columns.map(col => {
                const value = this.getCellValue(row, col);
                // CSV 이스케이프 처리
                if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value || '';
            });
            csv += values.join(',') + '\n';
        });
        
        // 다운로드
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `data_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
    
    /**
     * 데이터 업데이트
     * @param {Array} data - 새 데이터
     */
    setData(data) {
        this.config.data = data;
        this.processData();
    }
    
    /**
     * 컬럼 업데이트
     * @param {Array} columns - 새 컬럼 정의
     */
    setColumns(columns) {
        this.config.columns = columns;
        this.columns = this.processColumns();
        this.update();
    }
    
    /**
     * 필터 설정
     * @param {Object} filters - 필터 객체
     */
    setFilters(filters) {
        this.state.filters = filters;
        this.state.currentPage = 1;
        this.processData();
    }
    
    /**
     * 필터 초기화
     */
    clearFilters() {
        this.state.filters = {};
        this.state.searchQuery = '';
        this.state.currentPage = 1;
        this.processData();
    }
    
    /**
     * 선택 초기화
     */
    clearSelection() {
        this.state.selectedRows.clear();
        this.updateSelectionUI();
        
        if (this.config.onSelectionChange) {
            this.config.onSelectionChange([]);
        }
    }
    
    /**
     * 선택된 행 가져오기
     * @returns {Array} 선택된 행 데이터
     */
    getSelectedRows() {
        return this.state.processedData.filter((row, index) => 
            this.state.selectedRows.has(row.id || index)
        );
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
    
    /**
     * 디바운스
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    /**
     * 외부 데이터 가져오기
     */
    async fetchData(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('데이터 로드 실패:', error);
            return [];
        }
    }
}

// 전역 등록
window.DynamicDataTable = DynamicDataTable;

export default DynamicDataTable;