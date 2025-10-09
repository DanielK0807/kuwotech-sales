// ============================================
// [MODULE: 공통 컴포넌트 시스템]
// 파일 위치: 05.Source/01.common/19_component_system.js
// 작성일: 2025-01-27
// 설명: 모든 페이지에서 사용하는 공통 컴포넌트 통합 관리
// ============================================

import { glassmorphism } from './07_design.js';
import { formatNumber, formatCurrency, formatPercent } from './03_format.js';
import Modal from './06_modal.js';
import { showToast } from './14_toast.js';

// ============================================
// [SECTION: 기본 컴포넌트 클래스]
// ============================================

export class BaseComponent {
    constructor(config = {}) {
        this.id = config.id || `component-${Date.now()}`;
        this.container = config.container || null;
        this.theme = config.theme || 'sales';
        this.glassEffect = config.glassEffect || true;
        this.data = config.data || {};
        this.events = {};
    }
    
    /**
     * 글래스모피즘 효과 적용
     */
    applyGlassEffect(element) {
        if (!this.glassEffect || !element) return;
        
        element.classList.add('glass-effect');
        Object.assign(element.style, glassmorphism.styles.basic);
    }
    
    /**
     * 테마 색상 적용
     */
    applyThemeColors(element) {
        if (!element) return;
        
        // CSS 변수 사용으로 변경
        element.style.setProperty('--component-primary', 'var(--primary-color)');
        element.style.setProperty('--component-accent', 'var(--accent-color)');
        element.style.setProperty('--component-secondary', 'var(--secondary-color)');
    }
    
    /**
     * 이벤트 리스너 등록
     */
    on(eventName, callback) {
        if (!this.events[eventName]) {
            this.events[eventName] = [];
        }
        this.events[eventName].push(callback);
    }
    
    /**
     * 이벤트 트리거
     */
    trigger(eventName, data) {
        if (this.events[eventName]) {
            this.events[eventName].forEach(callback => callback(data));
        }
    }
    
    /**
     * 렌더링 (하위 클래스에서 구현)
     */
    render() {
        throw new Error('render() method must be implemented by subclass');
    }
}

// ============================================
// [SECTION: 글래스 카드 컴포넌트]
// ============================================

export class GlassCard extends BaseComponent {
    constructor(config) {
        super(config);
        this.title = config.title || '';
        this.content = config.content || '';
        this.size = config.size || 'md';
        this.icon = config.icon || null;
    }
    
    render() {
        const card = document.createElement('div');
        card.className = `glass-card glass-card-${this.size}`;
        card.id = this.id;
        
        // 글래스 효과 적용
        this.applyGlassEffect(card);
        this.applyThemeColors(card);
        
        // 헤더
        if (this.title) {
            const header = document.createElement('div');
            header.className = 'glass-card-header';
            header.innerHTML = `
                ${this.icon ? `<span class="card-icon">${this.icon}</span>` : ''}
                <h3 class="card-title">${this.title}</h3>
            `;
            card.appendChild(header);
        }
        
        // 콘텐츠
        const content = document.createElement('div');
        content.className = 'glass-card-content';
        content.innerHTML = this.content;
        card.appendChild(content);
        
        // 컨테이너에 추가
        if (this.container) {
            if (typeof this.container === 'string') {
                document.querySelector(this.container).appendChild(card);
            } else {
                this.container.appendChild(card);
            }
        }
        
        return card;
    }
}

// ============================================
// [SECTION: 데이터 테이블 컴포넌트]
// ============================================

export class DataTable extends BaseComponent {
    constructor(config) {
        super(config);
        this.columns = config.columns || [];
        this.rows = config.rows || [];
        this.sortable = config.sortable !== false;
        this.searchable = config.searchable !== false;
        this.pagination = config.pagination !== false;
        this.pageSize = config.pageSize || 10;
        this.currentPage = 1;
        this.sortColumn = null;
        this.sortDirection = 'asc';
        this.searchTerm = '';
    }
    
    render() {
        const wrapper = document.createElement('div');
        wrapper.className = 'data-table-wrapper glass-effect';
        wrapper.id = this.id;
        
        // 글래스 효과 적용
        this.applyGlassEffect(wrapper);
        this.applyThemeColors(wrapper);
        
        // 검색바
        if (this.searchable) {
            wrapper.appendChild(this.renderSearchBar());
        }
        
        // 테이블
        const table = document.createElement('table');
        table.className = 'data-table';
        
        // 헤더
        table.appendChild(this.renderHeader());
        
        // 바디
        table.appendChild(this.renderBody());
        
        wrapper.appendChild(table);
        
        // 페이지네이션
        if (this.pagination) {
            wrapper.appendChild(this.renderPagination());
        }
        
        // 컨테이너에 추가
        if (this.container) {
            if (typeof this.container === 'string') {
                document.querySelector(this.container).appendChild(wrapper);
            } else {
                this.container.appendChild(wrapper);
            }
        }
        
        return wrapper;
    }
    
    renderSearchBar() {
        const searchBar = document.createElement('div');
        searchBar.className = 'table-search-bar';
        searchBar.innerHTML = `
            <input type="text" 
                   class="search-input glass-input" 
                   placeholder="검색..." 
                   value="${this.searchTerm}">
            <button class="search-btn glass-btn">🔍</button>
        `;
        
        // 검색 이벤트
        const input = searchBar.querySelector('.search-input');
        input.addEventListener('input', (e) => {
            this.searchTerm = e.target.value;
            this.currentPage = 1;
            this.updateTable();
        });
        
        return searchBar;
    }
    
    renderHeader() {
        const thead = document.createElement('thead');
        const tr = document.createElement('tr');
        
        this.columns.forEach(column => {
            const th = document.createElement('th');
            th.className = this.sortable ? 'sortable' : '';
            th.innerHTML = `
                ${column.label}
                ${this.sortable ? '<span class="sort-icon">⇅</span>' : ''}
            `;
            
            if (this.sortable) {
                th.addEventListener('click', () => this.sort(column.key));
            }
            
            tr.appendChild(th);
        });
        
        thead.appendChild(tr);
        return thead;
    }
    
    renderBody() {
        const tbody = document.createElement('tbody');
        const filteredRows = this.getFilteredRows();
        const paginatedRows = this.getPaginatedRows(filteredRows);
        
        paginatedRows.forEach(row => {
            const tr = document.createElement('tr');
            
            this.columns.forEach(column => {
                const td = document.createElement('td');
                const value = row[column.key];
                
                // 포맷 적용 (음수 규칙 적용)
                if (column.format === 'number') {
                    const result = formatNumber(value, true);
                    if (typeof result === 'object') {
                        td.textContent = result.text;
                        if (result.isNegative) td.classList.add(result.className);
                    } else {
                        td.textContent = result;
                    }
                } else if (column.format === 'currency') {
                    const result = formatCurrency(value, true);
                    if (typeof result === 'object') {
                        td.textContent = result.text;
                        if (result.isNegative) td.classList.add(result.className);
                    } else {
                        td.textContent = result;
                    }
                } else if (column.format === 'percent') {
                    // 백분율 값(0-100)을 소수점(0-1)으로 변환 후 포맷팅
                    td.textContent = formatPercent(value / 100);
                } else {
                    td.textContent = value;
                }
                
                tr.appendChild(td);
            });
            
            tbody.appendChild(tr);
        });
        
        return tbody;
    }
    
    renderPagination() {
        const pagination = document.createElement('div');
        pagination.className = 'table-pagination';
        
        const totalPages = Math.ceil(this.getFilteredRows().length / this.pageSize);
        
        pagination.innerHTML = `
            <button class="page-btn prev" ${this.currentPage === 1 ? 'disabled' : ''}>◀</button>
            <span class="page-info">${this.currentPage} / ${totalPages}</span>
            <button class="page-btn next" ${this.currentPage === totalPages ? 'disabled' : ''}>▶</button>
        `;
        
        // 페이지 이벤트
        pagination.querySelector('.prev').addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.updateTable();
            }
        });
        
        pagination.querySelector('.next').addEventListener('click', () => {
            if (this.currentPage < totalPages) {
                this.currentPage++;
                this.updateTable();
            }
        });
        
        return pagination;
    }
    
    getFilteredRows() {
        if (!this.searchTerm) return this.rows;
        
        return this.rows.filter(row => {
            return this.columns.some(column => {
                const value = String(row[column.key]).toLowerCase();
                return value.includes(this.searchTerm.toLowerCase());
            });
        });
    }
    
    getPaginatedRows(rows) {
        const start = (this.currentPage - 1) * this.pageSize;
        const end = start + this.pageSize;
        return rows.slice(start, end);
    }
    
    sort(columnKey) {
        if (this.sortColumn === columnKey) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = columnKey;
            this.sortDirection = 'asc';
        }
        
        this.rows.sort((a, b) => {
            const aVal = a[columnKey];
            const bVal = b[columnKey];
            
            if (this.sortDirection === 'asc') {
                return aVal > bVal ? 1 : -1;
            } else {
                return aVal < bVal ? 1 : -1;
            }
        });
        
        this.updateTable();
    }
    
    updateTable() {
        const wrapper = document.getElementById(this.id);
        if (wrapper) {
            const newTable = this.render();
            wrapper.parentNode.replaceChild(newTable, wrapper);
        }
    }
}

// ============================================
// [SECTION: 차트 컴포넌트 (간단한 바 차트)]
// ============================================

export class BarChart extends BaseComponent {
    constructor(config) {
        super(config);
        this.title = config.title || '';
        this.labels = config.labels || [];
        this.values = config.values || [];
        this.colors = config.colors || [];
        this.height = config.height || 300;
    }
    
    render() {
        const wrapper = document.createElement('div');
        wrapper.className = 'bar-chart-wrapper glass-effect';
        wrapper.id = this.id;
        
        // 글래스 효과 적용
        this.applyGlassEffect(wrapper);
        this.applyThemeColors(wrapper);
        
        // 제목
        if (this.title) {
            const title = document.createElement('h3');
            title.className = 'chart-title';
            title.textContent = this.title;
            wrapper.appendChild(title);
        }
        
        // 차트 컨테이너
        const chartContainer = document.createElement('div');
        chartContainer.className = 'chart-container';
        chartContainer.style.height = `${this.height}px`;
        
        // 최대값 계산
        const maxValue = Math.max(...this.values);
        
        // 바 생성
        this.values.forEach((value, index) => {
            const barWrapper = document.createElement('div');
            barWrapper.className = 'bar-wrapper';
            
            const bar = document.createElement('div');
            bar.className = 'bar';
            const height = (value / maxValue) * 100;
            bar.style.height = `${height}%`;
            bar.style.backgroundColor = this.colors[index] || 'var(--primary-color)';
            
            const label = document.createElement('div');
            label.className = 'bar-label';
            label.textContent = this.labels[index];
            
            const valueLabel = document.createElement('div');
            valueLabel.className = 'bar-value';
            valueLabel.textContent = formatNumber(value);
            
            barWrapper.appendChild(bar);
            barWrapper.appendChild(valueLabel);
            barWrapper.appendChild(label);
            
            chartContainer.appendChild(barWrapper);
        });
        
        wrapper.appendChild(chartContainer);
        
        // 컨테이너에 추가
        if (this.container) {
            if (typeof this.container === 'string') {
                document.querySelector(this.container).appendChild(wrapper);
            } else {
                this.container.appendChild(wrapper);
            }
        }
        
        return wrapper;
    }
}

// ============================================
// [SECTION: 모달 컴포넌트 확장]
// ============================================

export class CustomModal extends BaseComponent {
    constructor(config) {
        super(config);
        this.title = config.title || '';
        this.content = config.content || '';
        this.buttons = config.buttons || [];
        this.size = config.size || 'md';
        this.modalInstance = null;
    }
    
    show() {
        // Modal 클래스를 직접 사용
        this.modalInstance = new Modal({
            title: this.title,
            content: this.content,
            buttons: this.buttons,
            size: this.size
        });
        
        this.modalInstance.open();
    }
    
    close() {
        if (this.modalInstance) {
            this.modalInstance.close();
        }
    }
}

// ============================================
// [SECTION: 내보내기]
// ============================================

export default {
    BaseComponent,
    GlassCard,
    DataTable,
    BarChart,
    CustomModal
};