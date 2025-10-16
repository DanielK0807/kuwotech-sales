// ============================================
// 고객소식 작성 - JavaScript
// ============================================

import {
    GlobalConfig,
    formatNumber,
    formatCurrency,
    formatDate,
    showToast,
    showModal,
    showLoading,
    hideLoading
} from '../../01.common/10_index.js';

// ============================================
// 전역 변수
// ============================================

let allCompanies = [];
let allNews = [];
const API_BASE_URL = GlobalConfig.API_BASE_URL;

// 인증 토큰 및 사용자 정보 유틸리티 함수
function getAuthToken() {
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
}

function getUserName() {
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    return user.name || '';
}

// 카테고리별 템플릿
const TEMPLATES = {
    '경조사': [
        {
            name: '결혼',
            title: '[경조사] {거래처명} - 결혼 축하',
            content: `안녕하세요,

{거래처명}의 경사스러운 소식을 전합니다.

🎉 축하드립니다!

일시: {날짜}
장소:

앞으로도 변함없는 관심과 협조 부탁드립니다.

감사합니다.`
        },
        {
            name: '부고',
            title: '[경조사] {거래처명} - 부고',
            content: `안녕하세요,

{거래처명}의 슬픈 소식을 전합니다.

삼가 고인의 명복을 빕니다.

일시: {날짜}
장소:

위로의 말씀 전해드립니다.`
        }
    ],
    '생일': [
        {
            name: '생일 축하',
            title: '[생일] {거래처명} - 생일 축하',
            content: `안녕하세요,

{거래처명} 대표님의 생신을 진심으로 축하드립니다.

🎂 생일 축하드립니다!

생신: {날짜}

항상 건강하시고 행복한 한 해 되시기를 기원합니다.

감사합니다.`
        }
    ],
    '개업기념일': [
        {
            name: '개업기념일',
            title: '[기념일] {거래처명} - 개업기념일 축하',
            content: `안녕하세요,

{거래처명}의 개업기념일을 진심으로 축하드립니다.

🎊 개업 N주년 축하드립니다!

개업일: {날짜}

앞으로도 더욱 발전하시기를 기원합니다.

감사합니다.`
        }
    ],
    '일반소식': [
        {
            name: '신규 장비 구매',
            title: '[일반소식] {거래처명} - 신규 장비 도입',
            content: `안녕하세요,

{거래처명}에서 신규 장비를 도입하셨습니다.

📦 장비 정보:
- 장비명:
- 구매일: {날짜}
- 특이사항:

향후 장비 관련 지원이 필요하시면 연락 주시기 바랍니다.`
        },
        {
            name: '수상/인증',
            title: '[일반소식] {거래처명} - 수상/인증 축하',
            content: `안녕하세요,

{거래처명}의 수상/인증을 축하드립니다.

🏆 축하드립니다!

수상/인증:
일시: {날짜}

앞으로도 더욱 발전하시기를 기원합니다.`
        },
        {
            name: '확장/이전',
            title: '[일반소식] {거래처명} - 확장/이전',
            content: `안녕하세요,

{거래처명}의 확장/이전 소식을 전합니다.

🏢 새로운 시작을 축하드립니다!

이전일: {날짜}
새 주소:

새로운 환경에서도 더욱 번창하시기를 기원합니다.`
        }
    ],
    '중요공지': [
        {
            name: '클레임/이슈',
            title: '[중요공지] {거래처명} - 클레임/이슈',
            content: `안녕하세요,

{거래처명}의 중요 사항을 공지합니다.

⚠️ 주의사항:

발생일: {날짜}
내용:
조치사항:

빠른 조치와 후속 관리가 필요합니다.`
        }
    ]
};

// ============================================
// DOM 로드 완료 시 실행
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('고객소식 작성 페이지 로드');

    // 초기화
    await init();

    // 이벤트 리스너 등록
    registerEventListeners();

    // 기본 조회 탭 데이터 로드
    await loadCustomerNews();
});

// ============================================
// 초기화 함수
// ============================================

async function init() {
    // 거래처 목록 로드
    await loadCompanies();

    // 오늘 날짜 설정
    const today = new Date().toISOString().split('T')[0];
    const newsDateInput = document.getElementById('newsDate');
    if (newsDateInput) {
        newsDateInput.value = today;
    }
}

// ============================================
// 거래처 목록 로드
// ============================================

async function loadCompanies() {
    const token = getAuthToken();
    if (!token) {
        showToast('로그인이 필요합니다', 'error');
        window.location.href = '../../02.login/01_login.html';
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
        allCompanies = data.companies || [];
        console.log(`거래처 ${allCompanies.length}개 로드 완료`);
    } catch (error) {
        console.error('거래처 목록 로드 오류:', error);
        showToast('거래처 목록을 불러오는데 실패했습니다', 'error');
    }
}

// ============================================
// 이벤트 리스너 등록
// ============================================

function registerEventListeners() {
    // 탭 전환
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        button.addEventListener('click', handleTabSwitch);
    });

    // 새로고침 버튼
    const btnRefresh = document.getElementById('btnRefresh');
    if (btnRefresh) {
        btnRefresh.addEventListener('click', async () => {
            await loadCustomerNews();
            showToast('데이터를 새로고침했습니다', 'success');
        });
    }

    // 검색 버튼
    const btnSearch = document.getElementById('btnSearch');
    if (btnSearch) {
        btnSearch.addEventListener('click', handleSearch);
    }

    // 거래처 자동완성 (조회 탭)
    const filterCompany = document.getElementById('filterCompany');
    if (filterCompany) {
        filterCompany.addEventListener('input', (e) => handleCompanyAutocomplete(e, 'filterCompanyAutocomplete', 'filterCompany'));
    }

    // 거래처 자동완성 (작성 탭)
    const companyName = document.getElementById('companyName');
    if (companyName) {
        companyName.addEventListener('input', (e) => handleCompanyAutocomplete(e, 'companyAutocomplete', 'companyName'));
    }

    // 카테고리 선택
    const categorySelect = document.getElementById('category');
    if (categorySelect) {
        categorySelect.addEventListener('change', handleCategoryChange);
    }

    // 폼 제출
    const newsForm = document.getElementById('newsForm');
    if (newsForm) {
        newsForm.addEventListener('submit', handleFormSubmit);
    }

    // 초기화 버튼
    const btnReset = document.getElementById('btnReset');
    if (btnReset) {
        btnReset.addEventListener('click', resetForm);
    }

    // 글자수 카운터
    const contentTextarea = document.getElementById('content');
    if (contentTextarea) {
        contentTextarea.addEventListener('input', updateCharCounter);
    }
}

// ============================================
// 탭 전환
// ============================================

function handleTabSwitch(e) {
    const targetTab = e.currentTarget.dataset.tab;

    // 모든 탭 버튼과 컨텐츠 비활성화
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    // 선택된 탭 활성화
    e.currentTarget.classList.add('active');

    if (targetTab === 'view') {
        document.getElementById('viewTab').classList.add('active');
    } else if (targetTab === 'write') {
        document.getElementById('writeTab').classList.add('active');
    }
}

// ============================================
// 거래처 자동완성
// ============================================

function handleCompanyAutocomplete(e, listId, inputId) {
    const input = e.target.value.trim().toLowerCase();
    const autocompleteList = document.getElementById(listId);

    if (input.length === 0) {
        autocompleteList.classList.add('hidden');
        return;
    }

    // 검색 결과 필터링
    const filtered = allCompanies.filter(company =>
        company.finalCompanyName?.toLowerCase().includes(input) ||
        company.erpCompanyName?.toLowerCase().includes(input)
    ).slice(0, 10);

    if (filtered.length === 0) {
        autocompleteList.innerHTML = '<div class="autocomplete-item autocomplete-no-results">검색 결과가 없습니다</div>';
        autocompleteList.classList.remove('hidden');
        return;
    }

    // 결과 표시
    autocompleteList.innerHTML = filtered.map(company => `
        <div class="autocomplete-item" data-company-id="${company.keyValue}" data-company-name="${company.finalCompanyName || company.erpCompanyName}">
            <strong>${company.finalCompanyName || company.erpCompanyName}</strong>
            ${company.erpCompanyName && company.finalCompanyName !== company.erpCompanyName ? `<br><small>${company.erpCompanyName}</small>` : ''}
        </div>
    `).join('');

    autocompleteList.classList.remove('hidden');

    // 클릭 이벤트 등록
    autocompleteList.querySelectorAll('.autocomplete-item:not(.autocomplete-no-results)').forEach(item => {
        item.addEventListener('click', () => {
            const companyId = item.dataset.companyId;
            const companyName = item.dataset.companyName;
            document.getElementById(inputId).value = companyName;

            // 작성 탭인 경우 companyId도 저장
            if (inputId === 'companyName') {
                document.getElementById('companyId').value = companyId;
            }

            autocompleteList.classList.add('hidden');
        });
    });
}

// ============================================
// 카테고리 선택 시 템플릿 표시
// ============================================

function handleCategoryChange(e) {
    const category = e.target.value;
    const templateSection = document.getElementById('templateSection');
    const templateButtons = document.getElementById('templateButtons');

    if (!category || !TEMPLATES[category]) {
        templateSection.classList.add('hidden');
        return;
    }

    const templates = TEMPLATES[category];
    templateButtons.innerHTML = templates.map((template, index) => `
        <button type="button" class="template-button" data-template-index="${index}" data-category="${category}">
            📄 ${template.name}
        </button>
    `).join('');

    templateSection.classList.remove('hidden');

    // 템플릿 클릭 이벤트 등록
    templateButtons.querySelectorAll('.template-button').forEach(btn => {
        btn.addEventListener('click', handleTemplateClick);
    });
}

// ============================================
// 템플릿 클릭
// ============================================

function handleTemplateClick(e) {
    const category = e.currentTarget.dataset.category;
    const templateIndex = parseInt(e.currentTarget.dataset.templateIndex);
    const template = TEMPLATES[category][templateIndex];

    const companyName = document.getElementById('companyName').value || '{거래처명}';
    const newsDate = document.getElementById('newsDate').value || '{날짜}';

    // 템플릿 적용
    document.getElementById('title').value = template.title
        .replace('{거래처명}', companyName)
        .replace('{날짜}', newsDate);

    document.getElementById('content').value = template.content
        .replace(/{거래처명}/g, companyName)
        .replace(/{날짜}/g, newsDate);

    // 글자수 업데이트
    updateCharCounter();

    showToast('템플릿이 적용되었습니다', 'success');
}

// ============================================
// 고객소식 조회
// ============================================

async function loadCustomerNews(filters = {}) {
    const token = getAuthToken();
    if (!token) {
        showToast('로그인이 필요합니다', 'error');
        return;
    }

    const loadingState = document.getElementById('loadingState');
    const emptyState = document.getElementById('emptyState');
    const newsList = document.getElementById('newsList');

    // 로딩 표시
    loadingState.classList.remove('hidden');
    emptyState.classList.add('hidden');
    newsList.innerHTML = '';

    try {
        // 쿼리 파라미터 구성
        const queryParams = new URLSearchParams();
        if (filters.companyName) queryParams.append('companyName', filters.companyName);
        if (filters.startDate) queryParams.append('startDate', filters.startDate);
        if (filters.endDate) queryParams.append('endDate', filters.endDate);
        if (filters.category) queryParams.append('category', filters.category);

        const url = `${API_BASE_URL}/api/customer-news?${queryParams.toString()}`;

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('고객소식 조회 실패');
        }

        const data = await response.json();
        allNews = data.news || [];

        console.log(`고객소식 ${allNews.length}개 로드 완료`);

        // 로딩 숨김
        loadingState.classList.add('hidden');

        if (allNews.length === 0) {
            emptyState.classList.remove('hidden');
            return;
        }

        // 목록 렌더링
        renderNewsList(allNews);

    } catch (error) {
        console.error('고객소식 조회 오류:', error);
        showToast('고객소식을 불러오는데 실패했습니다', 'error');
        loadingState.classList.add('hidden');
        emptyState.classList.remove('hidden');
    }
}

// ============================================
// 고객소식 목록 렌더링
// ============================================

function renderNewsList(newsItems) {
    const newsList = document.getElementById('newsList');
    const template = document.getElementById('news-item-template');

    newsList.innerHTML = '';

    newsItems.forEach(news => {
        const clone = template.content.cloneNode(true);

        // 기본 정보
        const newsItem = clone.querySelector('.news-item');
        newsItem.dataset.newsId = news.id;

        // 카테고리 뱃지
        const categoryBadge = clone.querySelector('.category-badge');
        categoryBadge.textContent = news.category;

        // 중요도 뱃지
        const priorityBadge = clone.querySelector('.priority-badge');
        priorityBadge.textContent = news.priority;
        priorityBadge.className = `priority-badge ${news.priority}`;

        // 거래처명
        clone.querySelector('.news-company').textContent = news.companyName;

        // 날짜
        clone.querySelector('.news-date').textContent = formatDate(news.newsDate);

        // 상세 정보
        clone.querySelector('.news-title').textContent = news.title;
        clone.querySelector('.news-content').textContent = news.content;
        clone.querySelector('.news-author').textContent = news.createdBy;
        clone.querySelector('.news-created').textContent = formatDateTime(news.createdAt);
        clone.querySelector('.news-views').textContent = news.viewCount + '회';
        clone.querySelector('.news-comments').textContent = news.commentCount + '개';

        // 토글 버튼
        const btnToggle = clone.querySelector('.btn-toggle-detail');
        btnToggle.addEventListener('click', (e) => handleToggleDetail(e, news.id));

        // 삭제 버튼
        const btnDelete = clone.querySelector('.btn-delete-news');
        btnDelete.addEventListener('click', (e) => handleDeleteNews(e, news.id));

        newsList.appendChild(clone);
    });
}

// ============================================
// 검색 처리
// ============================================

function handleSearch() {
    const filters = {
        companyName: document.getElementById('filterCompany').value.trim(),
        startDate: document.getElementById('filterStartDate').value,
        endDate: document.getElementById('filterEndDate').value,
        category: document.getElementById('filterCategory').value
    };

    loadCustomerNews(filters);
}

// ============================================
// 상세보기 토글
// ============================================

function handleToggleDetail(e, newsId) {
    const newsItem = document.querySelector(`.news-item[data-news-id="${newsId}"]`);
    const detail = newsItem.querySelector('.news-detail');
    const button = e.currentTarget;

    if (detail.classList.contains('hidden')) {
        detail.classList.remove('hidden');
        button.classList.add('expanded');
    } else {
        detail.classList.add('hidden');
        button.classList.remove('expanded');
    }
}

// ============================================
// 고객소식 삭제
// ============================================

async function handleDeleteNews(e, newsId) {
    if (!confirm('이 고객소식을 삭제하시겠습니까?')) {
        return;
    }

    const token = getAuthToken();
    if (!token) {
        showToast('로그인이 필요합니다', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/customer-news/${newsId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('고객소식 삭제 실패');
        }

        showToast('고객소식이 삭제되었습니다', 'success');
        await loadCustomerNews();

    } catch (error) {
        console.error('고객소식 삭제 오류:', error);
        showToast('고객소식 삭제에 실패했습니다', 'error');
    }
}

// ============================================
// 폼 제출
// ============================================

async function handleFormSubmit(e) {
    e.preventDefault();

    const token = getAuthToken();
    const userName = getUserName();

    if (!token || !userName) {
        showToast('로그인이 필요합니다', 'error');
        return;
    }

    // 폼 데이터 수집
    const companyId = document.getElementById('companyId').value;
    const companyName = document.getElementById('companyName').value.trim();
    const category = document.getElementById('category').value;
    const title = document.getElementById('title').value.trim();
    const content = document.getElementById('content').value.trim();
    const newsDate = document.getElementById('newsDate').value;
    const isYearlyRecurring = document.getElementById('isYearlyRecurring').checked;
    const priority = document.getElementById('priority').value;
    const showAsNotification = document.getElementById('showAsNotification').checked;

    // 유효성 검사
    if (!companyId || !companyName) {
        showToast('거래처를 선택해주세요', 'error');
        return;
    }

    if (!category) {
        showToast('카테고리를 선택해주세요', 'error');
        return;
    }

    if (!title || !content) {
        showToast('제목과 내용을 입력해주세요', 'error');
        return;
    }

    if (!newsDate) {
        showToast('소식 발생일을 입력해주세요', 'error');
        return;
    }

    // 데이터 전송
    const requestData = {
        companyId,
        companyName,
        category,
        title,
        content,
        newsDate,
        isYearlyRecurring,
        priority,
        showAsNotification
    };

    try {
        const response = await fetch(`${API_BASE_URL}/api/customer-news`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || '고객소식 작성 실패');
        }

        showToast('고객소식이 작성되었습니다', 'success');

        // 폼 초기화
        resetForm();

        // 조회 탭으로 전환하고 데이터 새로고침
        document.querySelector('.tab-button[data-tab="view"]').click();
        await loadCustomerNews();

    } catch (error) {
        console.error('고객소식 작성 오류:', error);
        showToast(error.message || '고객소식 작성에 실패했습니다', 'error');
    }
}

// ============================================
// 폼 초기화
// ============================================

function resetForm() {
    const form = document.getElementById('newsForm');
    if (form) {
        form.reset();
    }

    document.getElementById('companyId').value = '';
    document.getElementById('templateSection').classList.add('hidden');

    // 오늘 날짜 재설정
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('newsDate').value = today;

    updateCharCounter();
}

// ============================================
// 글자수 카운터 업데이트
// ============================================

function updateCharCounter() {
    const contentTextarea = document.getElementById('content');
    const charCount = document.getElementById('contentCharCount');

    if (contentTextarea && charCount) {
        charCount.textContent = contentTextarea.value.length;
    }
}

// ============================================
// 유틸리티 함수
// ============================================

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatDateTime(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR');
}
