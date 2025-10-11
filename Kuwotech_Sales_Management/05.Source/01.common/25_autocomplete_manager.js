/**
 * ============================================
 * KUWOTECH 영업관리 시스템 - 자동완성 매니저
 * ============================================
 *
 * @파일명: 25_autocomplete_manager.js
 * @작성자: System
 * @작성일: 2025-10-11
 * @버전: 1.0
 *
 * @설명:
 * 입력 필드에 대한 자동완성 기능을 제공하는 범용 매니저
 *
 * @주요기능:
 * - 실시간 검색 및 필터링
 * - 키보드 탐색 지원 (↑, ↓, Enter, Esc)
 * - 하이라이트 표시
 * - 커스터마이징 가능한 표시 형식
 */

import logger from './23_logger.js';

class AutocompleteManager {
    /**
     * @param {Object} options - 자동완성 옵션
     * @param {HTMLElement} options.inputElement - 입력 필드 요소
     * @param {HTMLElement} options.listElement - 자동완성 목록 표시 요소
     * @param {Array} options.dataSource - 자동완성 데이터 소스
     * @param {Function} options.getDisplayText - 데이터 항목을 표시 텍스트로 변환하는 함수
     * @param {Function} options.onSelect - 항목 선택 시 콜백
     * @param {Number} options.maxResults - 최대 표시 결과 수 (기본: 10)
     * @param {String} options.placeholder - 결과 없을 때 표시 텍스트
     * @param {Boolean} options.highlightSearch - 검색어 하이라이트 여부 (기본: true)
     */
    constructor(options) {
        this.inputElement = options.inputElement;
        this.listElement = options.listElement;
        this.dataSource = options.dataSource || [];
        this.getDisplayText = options.getDisplayText || (item => item.toString());
        this.onSelect = options.onSelect || (() => {});
        this.maxResults = options.maxResults || 10;
        this.placeholder = options.placeholder || '검색 결과가 없습니다';
        this.highlightSearch = options.highlightSearch !== false;

        this.currentFocus = -1;
        this.isOpen = false;

        this.init();
    }

    init() {
        if (!this.inputElement || !this.listElement) {
            logger.error('[AutocompleteManager] 필수 요소가 없습니다');
            return;
        }

        // 이벤트 리스너 설정
        this.inputElement.addEventListener('input', (e) => this.handleInput(e));
        this.inputElement.addEventListener('keydown', (e) => this.handleKeyDown(e));
        this.inputElement.addEventListener('focus', () => this.handleFocus());

        // 외부 클릭 시 목록 닫기
        document.addEventListener('click', (e) => {
            if (!this.inputElement.contains(e.target) && !this.listElement.contains(e.target)) {
                this.close();
            }
        });

        logger.info('[AutocompleteManager] 초기화 완료');
    }

    handleInput(e) {
        const value = e.target.value.trim();

        if (!value) {
            this.close();
            return;
        }

        this.search(value);
    }

    handleFocus() {
        const value = this.inputElement.value.trim();
        if (value) {
            this.search(value);
        }
    }

    handleKeyDown(e) {
        if (!this.isOpen) return;

        const items = this.listElement.querySelectorAll('.autocomplete-item');

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.currentFocus++;
                if (this.currentFocus >= items.length) this.currentFocus = 0;
                this.setActive(items);
                break;

            case 'ArrowUp':
                e.preventDefault();
                this.currentFocus--;
                if (this.currentFocus < 0) this.currentFocus = items.length - 1;
                this.setActive(items);
                break;

            case 'Enter':
                e.preventDefault();
                if (this.currentFocus > -1 && items[this.currentFocus]) {
                    items[this.currentFocus].click();
                }
                break;

            case 'Escape':
                this.close();
                break;
        }
    }

    search(query) {
        const lowerQuery = query.toLowerCase();

        // 데이터 필터링
        const results = this.dataSource.filter(item => {
            const displayText = this.getDisplayText(item).toLowerCase();
            return displayText.includes(lowerQuery);
        }).slice(0, this.maxResults);

        this.render(results, query);
    }

    render(results, query) {
        this.listElement.innerHTML = '';
        this.currentFocus = -1;

        if (results.length === 0) {
            // 결과 없음 표시
            const noResultItem = document.createElement('div');
            noResultItem.className = 'autocomplete-no-results';
            noResultItem.textContent = this.placeholder;
            this.listElement.appendChild(noResultItem);
            this.open();
            return;
        }

        // 결과 항목 생성
        results.forEach((item, index) => {
            const itemElement = document.createElement('div');
            itemElement.className = 'autocomplete-item';

            let displayText = this.getDisplayText(item);

            // 검색어 하이라이트
            if (this.highlightSearch && query) {
                const regex = new RegExp(`(${this.escapeRegex(query)})`, 'gi');
                displayText = displayText.replace(regex, '<strong>$1</strong>');
            }

            itemElement.innerHTML = displayText;

            // 클릭 이벤트
            itemElement.addEventListener('click', () => {
                this.select(item);
            });

            // 마우스오버 이벤트
            itemElement.addEventListener('mouseenter', () => {
                this.currentFocus = index;
                this.setActive(this.listElement.querySelectorAll('.autocomplete-item'));
            });

            this.listElement.appendChild(itemElement);
        });

        this.open();
    }

    setActive(items) {
        if (!items) return;

        // 모든 활성화 제거
        items.forEach(item => item.classList.remove('active'));

        // 현재 포커스 활성화
        if (this.currentFocus >= 0 && this.currentFocus < items.length) {
            items[this.currentFocus].classList.add('active');
            items[this.currentFocus].scrollIntoView({
                block: 'nearest',
                behavior: 'smooth'
            });
        }
    }

    select(item) {
        // 선택 콜백 실행
        this.onSelect(item);

        // 목록 닫기
        this.close();

        logger.info('[AutocompleteManager] 항목 선택:', item);
    }

    open() {
        this.listElement.classList.remove('hidden');
        this.isOpen = true;
    }

    close() {
        this.listElement.classList.add('hidden');
        this.listElement.innerHTML = '';
        this.currentFocus = -1;
        this.isOpen = false;
    }

    updateDataSource(newDataSource) {
        this.dataSource = newDataSource || [];
        logger.info('[AutocompleteManager] 데이터 소스 업데이트:', this.dataSource.length);

        // 현재 열려있으면 재검색
        if (this.isOpen && this.inputElement.value.trim()) {
            this.search(this.inputElement.value.trim());
        }
    }

    escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    destroy() {
        // 이벤트 리스너 제거는 생략 (메모리 누수 방지를 위해 필요하면 추가)
        this.close();
        logger.info('[AutocompleteManager] 파괴됨');
    }
}

// 전역 등록
if (typeof window !== 'undefined') {
    window.AutocompleteManager = AutocompleteManager;
}

export default AutocompleteManager;
