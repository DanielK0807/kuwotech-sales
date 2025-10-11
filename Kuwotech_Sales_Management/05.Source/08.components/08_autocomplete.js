// ============================================
// [MODULE: 자동완성 컴포넌트]
// 파일 위치: 05.Source/08.components/08_autocomplete.js
// 작성일: 2025-10-11
// 설명: 재사용 가능한 자동완성 컴포넌트
// ============================================

/**
 * 자동완성 매니저 클래스
 * 입력 필드에 자동완성 기능을 추가합니다.
 */
export class AutocompleteManager {
    /**
     * @param {Object} config - 설정 객체
     * @param {HTMLInputElement} config.inputElement - 입력 필드 요소
     * @param {HTMLElement} config.listElement - 자동완성 목록 요소
     * @param {Array} config.dataSource - 데이터 소스 배열
     * @param {Function} config.getDisplayText - 항목의 표시 텍스트를 반환하는 함수
     * @param {Function} config.onSelect - 항목 선택 시 콜백 함수
     * @param {Function} config.filterFunction - 커스텀 필터 함수 (선택)
     * @param {number} config.maxResults - 최대 표시 개수 (기본값: 10)
     * @param {string} config.placeholder - 결과 없을 때 표시 문구
     * @param {boolean} config.highlightSearch - 검색어 하이라이트 여부 (기본값: true)
     */
    constructor(config) {
        this.inputElement = config.inputElement;
        this.listElement = config.listElement;
        this.dataSource = config.dataSource || [];
        this.getDisplayText = config.getDisplayText || (item => String(item));
        this.onSelect = config.onSelect;
        this.filterFunction = config.filterFunction || this.defaultFilter.bind(this);
        this.maxResults = config.maxResults || 10;
        this.placeholder = config.placeholder || '검색 결과가 없습니다';
        this.highlightSearch = config.highlightSearch !== false;

        this.init();
    }

    /**
     * 초기화 - 이벤트 리스너 설정
     */
    init() {
        if (!this.inputElement || !this.listElement) {
            console.error('[Autocomplete] 필수 요소가 없습니다');
            return;
        }

        // 입력 이벤트
        this.inputElement.addEventListener('input', (e) => this.handleInput(e));

        // 포커스 이벤트
        this.inputElement.addEventListener('focus', (e) => this.handleFocus(e));

        // 외부 클릭 시 닫기
        this.outsideClickHandler = (e) => {
            if (!this.inputElement.contains(e.target) && !this.listElement.contains(e.target)) {
                this.hide();
            }
        };
        document.addEventListener('click', this.outsideClickHandler);
    }

    /**
     * 입력 이벤트 핸들러
     */
    handleInput(event) {
        const inputValue = event.target.value.trim().toLowerCase();

        if (!inputValue) {
            this.hide();
            return;
        }

        // 데이터 필터링
        const filtered = this.dataSource.filter(item =>
            this.filterFunction(item, inputValue)
        );

        this.display(filtered, inputValue);
    }

    /**
     * 포커스 이벤트 핸들러
     */
    handleFocus(event) {
        const inputValue = event.target.value.trim();
        if (inputValue) {
            this.handleInput(event);
        } else {
            // 입력값이 없으면 전체 목록 표시 (선택)
            this.display(this.dataSource, '');
        }
    }

    /**
     * 기본 필터 함수 (대소문자 구분 없이 includes)
     */
    defaultFilter(item, searchTerm) {
        const displayText = this.getDisplayText(item).toLowerCase();
        return displayText.includes(searchTerm);
    }

    /**
     * 자동완성 목록 표시
     */
    display(items, searchTerm) {
        this.listElement.innerHTML = '';

        if (items.length === 0) {
            const noResultItem = document.createElement('div');
            noResultItem.className = 'autocomplete-item autocomplete-no-results';
            noResultItem.textContent = this.placeholder;
            this.listElement.appendChild(noResultItem);
            this.show();
            return;
        }

        // 최대 개수만큼만 표시
        items.slice(0, this.maxResults).forEach(item => {
            const displayText = this.getDisplayText(item);
            const element = document.createElement('div');
            element.className = 'autocomplete-item';

            // 검색어 하이라이팅
            if (searchTerm && this.highlightSearch) {
                const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(`(${escapedTerm})`, 'gi');
                element.innerHTML = displayText.replace(regex, '<strong>$1</strong>');
            } else {
                element.textContent = displayText;
            }

            // 클릭 이벤트
            element.addEventListener('click', () => {
                if (this.onSelect) {
                    this.onSelect(item);
                }
                this.hide();
            });

            this.listElement.appendChild(element);
        });

        this.show();
    }

    /**
     * 목록 표시
     */
    show() {
        this.listElement.classList.remove('hidden');
        this.listElement.style.display = 'block';
    }

    /**
     * 목록 숨기기
     */
    hide() {
        this.listElement.classList.add('hidden');
        this.listElement.style.display = 'none';
    }

    /**
     * 데이터 소스 업데이트
     */
    updateDataSource(newData) {
        this.dataSource = newData || [];
    }

    /**
     * 리소스 정리
     */
    destroy() {
        if (this.outsideClickHandler) {
            document.removeEventListener('click', this.outsideClickHandler);
        }
    }
}

/**
 * 간단한 자동완성 초기화 헬퍼 함수
 * @param {string} inputId - 입력 필드 ID
 * @param {string} listId - 목록 요소 ID
 * @param {Array} dataSource - 데이터 배열
 * @param {Function} getDisplayText - 표시 텍스트 함수
 * @param {Function} onSelect - 선택 콜백
 * @returns {AutocompleteManager} 자동완성 매니저 인스턴스
 */
export function createAutocomplete(inputId, listId, dataSource, getDisplayText, onSelect) {
    const inputElement = document.getElementById(inputId);
    const listElement = document.getElementById(listId);

    if (!inputElement || !listElement) {
        console.error('[Autocomplete] 요소를 찾을 수 없습니다:', inputId, listId);
        return null;
    }

    return new AutocompleteManager({
        inputElement,
        listElement,
        dataSource,
        getDisplayText,
        onSelect
    });
}

/**
 * 전역 등록
 */
if (typeof window !== 'undefined') {
    window.AutocompleteManager = AutocompleteManager;
    window.createAutocomplete = createAutocomplete;
}

export default {
    AutocompleteManager,
    createAutocomplete
};
