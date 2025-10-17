// ============================================
// 고객소식 의견제시 (관리자) - JavaScript
// ============================================

import {
    GlobalConfig,
    showToast
} from '../../01.common/10_index.js';
import { getCompanyDisplayName } from '../../01.common/02_utils.js';
import AutocompleteManager from '../../01.common/25_autocomplete_manager.js';

console.log('📰 [고객소식 의견제시] 모듈 로드');

// ============================================
// 전역 변수
// ============================================

const API_BASE_URL = GlobalConfig.API_BASE_URL;
let currentNewsData = [];
let allCompanies = [];
let companyAutocompleteManager = null;
let currentFilter = {
    employee: []  // 내부담당자 배열 (다중 선택)
};

// ============================================
// API 호출 함수
// ============================================

/**
 * 고객소식 조회 API
 */
async function fetchCustomerNews(filters = {}) {
    try {
        const params = new URLSearchParams();

        if (filters.category) params.append('category', filters.category);
        if (filters.companyName) params.append('companyName', filters.companyName);
        if (filters.createdBy) params.append('createdBy', filters.createdBy);
        if (filters.startDate) params.append('startDate', filters.startDate);
        if (filters.endDate) params.append('endDate', filters.endDate);
        params.append('limit', '10000'); // 전체 데이터 로드

        const queryString = params.toString();
        const url = `/api/customer-news${queryString ? '?' + queryString : ''}`;

        console.log('🔍 [고객소식 조회] 요청:', url);

        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('✅ [고객소식 조회] 성공:', result.count, '건');
        return result.data.news || [];

    } catch (error) {
        console.error('❌ [고객소식 조회] 오류:', error);
        alert('고객소식을 불러오는 중 오류가 발생했습니다.');
        return [];
    }
}

/**
 * 의견 저장 API
 */
async function saveComment(newsId, commentType, commentContent) {
    try {
        console.log('💾 [의견 저장] 요청:', newsId);

        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        const response = await fetch(`/api/customer-news/${newsId}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                comment: commentContent,
                commentType: commentType
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('✅ [의견 저장] 성공:', result);
        return result;

    } catch (error) {
        console.error('❌ [의견 저장] 오류:', error);
        alert('의견 저장 중 오류가 발생했습니다.');
        return null;
    }
}

// ============================================
// UI 렌더링 함수
// ============================================

/**
 * 고객소식 목록 렌더링
 */
function renderNewsList(newsArray) {
    const newsList = document.getElementById('newsList');
    const emptyState = document.getElementById('emptyState');
    const template = document.getElementById('news-item-template');

    // 목록 초기화
    newsList.innerHTML = '';

    if (newsArray.length === 0) {
        emptyState.style.display = 'flex';
        emptyState.innerHTML = `
            <div class="empty-icon">📭</div>
            <p>검색 조건에 맞는 고객소식이 없습니다.</p>
        `;
        return;
    }

    emptyState.style.display = 'none';

    // 각 고객소식 아이템 렌더링
    newsArray.forEach(news => {
        const clone = template.content.cloneNode(true);
        const newsItem = clone.querySelector('.news-item');

        // 데이터 속성 설정
        newsItem.dataset.newsId = news.id;

        // 헤더 정보
        const categoryBadge = clone.querySelector('.category-badge');
        categoryBadge.textContent = news.category;

        const commentStatusBadge = clone.querySelector('.comment-status-badge');
        const hasComments = news.comments && news.comments.length > 0;
        if (hasComments) {
            commentStatusBadge.textContent = `✅ 의견 ${news.comments.length}개`;
            commentStatusBadge.classList.add('has-comment');
        } else {
            commentStatusBadge.textContent = '❌ 의견 미작성';
            commentStatusBadge.classList.add('no-comment');
        }

        clone.querySelector('.news-company').textContent = news.companyName;
        clone.querySelector('.news-author').textContent = `작성자: ${news.createdBy}`;
        clone.querySelector('.news-date').textContent = `날짜: ${news.newsDate}`;

        // 상세 정보
        clone.querySelector('.news-title').textContent = news.title;
        clone.querySelector('.news-content').textContent = news.content;
        clone.querySelector('.news-company-full').textContent = news.companyName;
        clone.querySelector('.news-author-full').textContent = news.createdBy;
        clone.querySelector('.news-category-full').textContent = news.category;
        clone.querySelector('.news-date-full').textContent = news.newsDate;
        clone.querySelector('.news-created-at').textContent = formatDateTime(news.createdAt);
        clone.querySelector('.news-priority').textContent = news.priority || '보통';

        // 기존 의견 목록 렌더링
        const existingCommentsList = clone.querySelector('.existing-comments-list');
        const noCommentsMessage = clone.querySelector('.no-comments-message');

        if (hasComments) {
            renderExistingComments(existingCommentsList, news.comments);
            noCommentsMessage.classList.add('hidden');
        } else {
            noCommentsMessage.classList.remove('hidden');
        }

        // 상세보기 토글 버튼 이벤트
        const btnToggle = clone.querySelector('.btn-toggle-detail');
        btnToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleNewsDetail(newsItem);
        });

        // 의견 저장 버튼 이벤트
        const btnSaveComment = clone.querySelector('.btn-save-comment');
        btnSaveComment.addEventListener('click', () => {
            handleSaveComment(newsItem, news.id);
        });

        newsList.appendChild(clone);
    });

    console.log(`📋 [목록 렌더링] ${newsArray.length}건 표시 완료`);
}

/**
 * 기존 의견 목록 렌더링
 */
function renderExistingComments(container, comments) {
    const template = document.getElementById('comment-item-template');
    container.innerHTML = '';

    comments.forEach(comment => {
        const clone = template.content.cloneNode(true);

        clone.querySelector('.comment-author').textContent = comment.commentBy;
        clone.querySelector('.comment-type-badge').textContent = comment.commentType || '일반';
        clone.querySelector('.comment-date').textContent = formatDateTime(comment.createdAt);
        clone.querySelector('.comment-content').textContent = comment.comment;

        container.appendChild(clone);
    });
}

// ============================================
// 이벤트 핸들러
// ============================================

/**
 * 검색 버튼 클릭 핸들러
 */
async function handleSearch() {
    console.error('🔍 [검색] handleSearch() 함수 호출됨!');

    const loadingState = document.getElementById('loadingState');
    const emptyState = document.getElementById('emptyState');

    console.error('🔍 [검색] 요소 확인:', {
        loadingState: !!loadingState,
        emptyState: !!emptyState,
        newsList: !!document.getElementById('newsList')
    });

    try {
        // 로딩 상태 표시
        loadingState.classList.remove('hidden');
        emptyState.classList.add('hidden');
        document.getElementById('newsList').innerHTML = '';
        console.error('🔍 [검색] 로딩 상태 표시됨');

        // 필터 조건 수집
        const filters = {
            category: document.getElementById('filterCategory').value,
            companyName: document.getElementById('filterCompanyName').value.trim(),
            startDate: document.getElementById('filterStartDate').value,
            endDate: document.getElementById('filterEndDate').value
        };

        // 빈 값 제거
        Object.keys(filters).forEach(key => {
            if (!filters[key]) delete filters[key];
        });

        console.error('🔍 [검색] 필터 조건:', filters);
        console.error('🔍 [검색] 선택된 내부담당자:', currentFilter.employee);

        // API 호출 (내부담당자 필터 없이 모든 데이터 가져오기)
        let newsData = await fetchCustomerNews(filters);
        console.error(`🔍 [검색] API 응답 받음: ${newsData.length}건`);

        // 클라이언트 사이드에서 내부담당자 필터링 (다중 선택 지원)
        if (currentFilter.employee.length > 0) {
            newsData = newsData.filter(news =>
                currentFilter.employee.includes(news.createdBy)
            );
            console.error(`🔍 [검색] 내부담당자 필터 적용 후: ${newsData.length}건`);
        }

        currentNewsData = newsData;

        // 목록 렌더링
        renderNewsList(currentNewsData);

    } catch (error) {
        console.error('❌ [검색] 오류:', error);
        emptyState.style.display = 'flex';
        emptyState.innerHTML = `
            <div class="empty-icon">⚠️</div>
            <p>데이터를 불러오는 중 오류가 발생했습니다.</p>
        `;
    } finally {
        loadingState.classList.add('hidden');
    }
}

/**
 * 상세보기 토글
 */
function toggleNewsDetail(newsItem) {
    const detailArea = newsItem.querySelector('.news-detail');
    const btnToggle = newsItem.querySelector('.btn-toggle-detail');

    if (detailArea.classList.contains('hidden')) {
        // 다른 모든 아이템 닫기
        document.querySelectorAll('.news-item').forEach(item => {
            if (item !== newsItem) {
                item.querySelector('.news-detail').classList.add('hidden');
                item.querySelector('.btn-toggle-detail').classList.remove('expanded');
            }
        });

        // 현재 아이템 열기
        detailArea.classList.remove('hidden');
        btnToggle.classList.add('expanded');
    } else {
        // 현재 아이템 닫기
        detailArea.classList.add('hidden');
        btnToggle.classList.remove('expanded');
    }
}

/**
 * 의견 저장 핸들러
 */
async function handleSaveComment(newsItem, newsId) {
    const commentTypeSelect = newsItem.querySelector('.comment-type-select');
    const commentTextarea = newsItem.querySelector('.comment-textarea');

    const commentType = commentTypeSelect.value;
    const commentContent = commentTextarea.value.trim();

    if (!commentContent) {
        alert('의견 내용을 입력해주세요.');
        commentTextarea.focus();
        return;
    }

    // 확인 대화상자
    if (!confirm('의견을 저장하시겠습니까?')) {
        return;
    }

    // API 호출
    const result = await saveComment(newsId, commentType, commentContent);

    if (result) {
        alert('의견이 성공적으로 저장되었습니다.');

        // 폼 초기화
        commentTextarea.value = '';
        commentTypeSelect.selectedIndex = 0;

        // 목록 새로고침
        await handleSearch();
    }
}

/**
 * 새로고침 버튼 핸들러
 */
async function handleRefresh() {
    // 필터 초기화
    document.getElementById('filterCategory').value = '';
    document.getElementById('filterCompanyName').value = '';
    document.getElementById('filterStartDate').value = '';
    document.getElementById('filterEndDate').value = '';

    // 내부담당자 체크박스 초기화
    const checkboxes = document.querySelectorAll('#employee-dropdown-menu input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = false);
    document.getElementById('employee-selected-text').textContent = '전체';
    currentFilter.employee = [];

    // 목록 초기화
    document.getElementById('newsList').innerHTML = '';
    document.getElementById('emptyState').style.display = 'flex';
    document.getElementById('emptyState').innerHTML = `
        <div class="empty-icon">🔍</div>
        <p>검색하기 버튼을 클릭하여 고객소식을 조회하세요.</p>
    `;

    currentNewsData = [];

    // 거래처 목록 재로드
    await loadCompanies();

    // 내부담당자 목록 재로드
    await loadSalesReps();

    console.log('🔄 [새로고침] 초기화 완료');
}

// ============================================
// 유틸리티 함수
// ============================================

/**
 * 날짜/시간 포맷
 */
function formatDateTime(dateString) {
    if (!dateString) return '-';

    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}`;
}

// ============================================
// 거래처 목록 로드
// ============================================

async function loadCompanies() {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    if (!token) {
        showToast('로그인이 필요합니다', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/companies`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('거래처 목록 로드 실패');
        }

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || '데이터 조회 실패');
        }

        allCompanies = data.companies || [];
        console.log(`✅ [거래처] ${allCompanies.length}개 로드 완료`);

        // 자동완성 데이터 소스 업데이트
        if (companyAutocompleteManager) {
            companyAutocompleteManager.updateDataSource(allCompanies);
        }
    } catch (error) {
        console.error('❌ 거래처 목록 로드 오류:', error);
        showToast('거래처 목록을 불러오는데 실패했습니다', 'error');
    }
}

// ============================================
// 영업담당자 목록 로드 (employees 테이블에서)
// ============================================

async function loadSalesReps() {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    if (!token) {
        showToast('로그인이 필요합니다', 'error');
        return;
    }

    try {
        // employees 테이블에서 직원 목록 조회
        const response = await fetch(`${API_BASE_URL}/api/employees`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('내부담당자 목록 로드 실패');
        }

        const data = await response.json();
        const employees = data.employees || [];

        // 영업담당자만 필터링 (role1 또는 role2가 '영업담당'인 직원)
        const salesReps = employees
            .filter(emp => emp.role1 === '영업담당' || emp.role2 === '영업담당')
            .map(emp => ({
                name: emp.name,
                department: emp.department || ''
            }))
            .sort((a, b) => a.name.localeCompare(b.name));

        console.log(`✅ [내부담당자] ${salesReps.length}명 로드 완료`);

        // 체크박스 드롭다운 메뉴 채우기
        const dropdownMenu = document.getElementById('employee-dropdown-menu');
        if (!dropdownMenu) {
            console.error('❌ employee-dropdown-menu 요소를 찾을 수 없습니다');
            return;
        }

        // 기존 항목 제거
        dropdownMenu.innerHTML = '';

        // 각 영업담당자에 대해 체크박스 아이템 생성
        salesReps.forEach(rep => {
            const item = document.createElement('div');
            item.className = 'custom-dropdown-item';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `emp-${rep.name}`;
            checkbox.value = rep.name;
            checkbox.addEventListener('change', updateEmployeeSelection);

            const label = document.createElement('label');
            label.htmlFor = `emp-${rep.name}`;
            label.textContent = rep.department ? `${rep.name} (${rep.department})` : rep.name;

            item.appendChild(checkbox);
            item.appendChild(label);
            dropdownMenu.appendChild(item);
        });

    } catch (error) {
        console.error('❌ [내부담당자] 로드 오류:', error);
        showToast('내부담당자 목록을 불러오는데 실패했습니다', 'error');
    }
}

// ============================================
// 내부담당자 선택 업데이트
// ============================================

function updateEmployeeSelection() {
    const checkboxes = document.querySelectorAll('#employee-dropdown-menu input[type="checkbox"]');
    const selectedValues = Array.from(checkboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);

    const selectedText = document.getElementById('employee-selected-text');

    if (selectedValues.length === 0) {
        selectedText.textContent = '전체';
    } else if (selectedValues.length === 1) {
        selectedText.textContent = selectedValues[0];
    } else {
        selectedText.textContent = `${selectedValues[0]} 외 ${selectedValues.length - 1}명`;
    }

    // currentFilter 업데이트
    currentFilter.employee = selectedValues;
    console.log('✅ [내부담당자] 선택 업데이트:', selectedValues);
}

// ============================================
// 거래처 자동완성 초기화
// ============================================

function initCompanyAutocomplete() {
    const inputElement = document.getElementById('filterCompanyName');
    const listElement = document.getElementById('filterCompanyAutocomplete');

    if (!inputElement || !listElement) {
        console.error('❌ [자동완성] 필수 요소를 찾을 수 없음!');
        return;
    }

    if (allCompanies.length === 0) {
        console.warn('⚠️ [자동완성] 거래처 데이터가 없습니다!');
        return;
    }

    // 기존 인스턴스 정리
    if (companyAutocompleteManager) {
        companyAutocompleteManager.destroy();
    }

    // AutocompleteManager 생성 (작동하는 패턴과 동일)
    companyAutocompleteManager = new AutocompleteManager({
        inputElement,
        listElement,
        dataSource: allCompanies,
        getDisplayText: (company) => getCompanyDisplayName(company),
        onSelect: (company) => {
            const companyName = getCompanyDisplayName(company);
            inputElement.value = companyName;
            console.log('✅ 거래처 선택됨:', company);
        },
        maxResults: 10,
        placeholder: '검색 결과가 없습니다',
        highlightSearch: true
    });

    console.log('✅ [자동완성] 초기화 완료! 거래처 수:', allCompanies.length);
}

// ============================================
// 초기화
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 [고객소식 의견제시] 초기화 시작');

    // 거래처 목록 로드
    await loadCompanies();

    // 내부담당자 목록 로드
    await loadSalesReps();

    // 거래처 자동완성 초기화
    initCompanyAutocomplete();

    // 이벤트 리스너 등록
    const btnSearch = document.getElementById('btnSearch');
    const btnRefresh = document.getElementById('btnRefresh');

    console.log('🔍 [이벤트 등록] 버튼 요소 확인:', {
        btnSearch: !!btnSearch,
        btnRefresh: !!btnRefresh
    });

    if (btnSearch) {
        btnSearch.addEventListener('click', () => {
            console.error('🔍 [검색 버튼] 클릭됨!');
            handleSearch();
        });
        console.error('✅ [이벤트 등록] 검색 버튼 이벤트 리스너 등록 완료');
    } else {
        console.error('❌ [이벤트 등록] 검색 버튼을 찾을 수 없음!');
    }

    if (btnRefresh) {
        btnRefresh.addEventListener('click', handleRefresh);
        console.log('✅ [이벤트 등록] 새로고침 버튼 이벤트 리스너 등록 완료');
    } else {
        console.error('❌ [이벤트 등록] 새로고침 버튼을 찾을 수 없음!');
    }

    // Enter 키로 검색
    const filterCompanyName = document.getElementById('filterCompanyName');
    if (filterCompanyName) {
        filterCompanyName.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleSearch();
            }
        });
    }

    // 내부담당자 드롭다운 토글
    const employeeDropdownButton = document.getElementById('employee-dropdown-button');
    const employeeDropdownMenu = document.getElementById('employee-dropdown-menu');

    if (employeeDropdownButton && employeeDropdownMenu) {
        console.log('✅ [드롭다운] 버튼과 메뉴 요소 찾음');

        employeeDropdownButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const isOpen = employeeDropdownMenu.classList.contains('show');
            console.log('🔽 [드롭다운] 클릭 - 현재 상태:', isOpen ? '열림' : '닫힘');

            if (isOpen) {
                employeeDropdownMenu.classList.remove('show');
                employeeDropdownButton.classList.remove('active');
                console.log('🔽 [드롭다운] 메뉴 닫음');
            } else {
                employeeDropdownMenu.classList.add('show');
                employeeDropdownButton.classList.add('active');
                console.log('🔽 [드롭다운] 메뉴 열림');
            }
        });

        // 드롭다운 외부 클릭 시 닫기
        document.addEventListener('click', (e) => {
            if (!employeeDropdownButton.contains(e.target) && !employeeDropdownMenu.contains(e.target)) {
                if (employeeDropdownMenu.classList.contains('show')) {
                    employeeDropdownMenu.classList.remove('show');
                    employeeDropdownButton.classList.remove('active');
                    console.log('🔽 [드롭다운] 외부 클릭으로 닫힘');
                }
            }
        });
    } else {
        console.error('❌ [드롭다운] 버튼 또는 메뉴 요소를 찾을 수 없음!');
        console.log('버튼:', employeeDropdownButton);
        console.log('메뉴:', employeeDropdownMenu);
    }

    console.log('✅ [고객소식 의견제시] 초기화 완료');
});
