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
import AutocompleteManager from '../../01.common/25_autocomplete_manager.js';

// ============================================
// 전역 변수
// ============================================

const user = JSON.parse(sessionStorage.getItem('user') || '{}');
let allCompanies = [];
let allNews = [];
const API_BASE_URL = GlobalConfig.API_BASE_URL;

// 자동완성 매니저 인스턴스
let companyAutocompleteManager = null;
let filterCompanyAutocompleteManager = null;

// 인증 토큰 및 사용자 정보 유틸리티 함수
function getAuthToken() {
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
}

function getUserName() {
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

async function initializePage() {
    console.warn('✅ [고객소식] 페이지 초기화 시작');

    // 초기화
    await init();

    // 이벤트 리스너 등록
    registerEventListeners();

    // 초기 화면은 빈 상태 표시 (검색하기 버튼 클릭 시에만 데이터 로드)
    showInitialEmptyState();

    console.warn('✅ [고객소식] 페이지 초기화 완료');
}

// DOMContentLoaded가 이미 발생했는지 확인
if (document.readyState === 'loading') {
    // 아직 로딩 중이면 DOMContentLoaded 이벤트 대기
    console.warn('⏳ [고객소식] DOM 로딩 중... DOMContentLoaded 대기');
    document.addEventListener('DOMContentLoaded', initializePage);
} else {
    // 이미 로드 완료되었으면 즉시 실행 (동적 로드 시)
    console.warn('⚡ [고객소식] DOM 이미 로드됨 - 즉시 초기화 실행');
    initializePage();
}

// ============================================
// 초기화 함수
// ============================================

async function init() {
    // 거래처 목록 로드
    await loadCompanies();

    // 거래처 자동완성 초기화
    initCompanyAutocomplete();

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
        console.warn('🔄 [고객소식] 거래처 목록 로드 시작... 사용자:', user.name);
        // 담당 거래처만 로드 (담당거래처관리와 동일)
        const response = await fetch(`${API_BASE_URL}/api/companies/manager/${encodeURIComponent(user.name)}`, {
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
        console.warn(`✅ [고객소식] 담당 거래처 ${allCompanies.length}개 로드 완료`);

        // 자동완성 데이터 소스 업데이트
        if (companyAutocompleteManager) {
            companyAutocompleteManager.updateDataSource(allCompanies);
        }
        if (filterCompanyAutocompleteManager) {
            filterCompanyAutocompleteManager.updateDataSource(allCompanies);
        }
    } catch (error) {
        console.error('❌ 거래처 목록 로드 오류:', error);
        showToast('거래처 목록을 불러오는데 실패했습니다', 'error');
    }
}

// ============================================
// 이벤트 리스너 등록
// ============================================

function registerEventListeners() {
    console.warn('🎯 [고객소식] 이벤트 리스너 등록 시작');

    // 탭 전환
    const tabButtons = document.querySelectorAll('.tab-button');
    console.warn(`  - 탭 버튼 ${tabButtons.length}개 발견`);
    tabButtons.forEach((button, index) => {
        console.warn(`    * 버튼 ${index + 1}: data-tab="${button.dataset.tab}"`);
        button.addEventListener('click', handleTabSwitch);
    });
    console.warn('  ✅ 탭 버튼 이벤트 리스너 등록 완료');

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
    console.warn(`  - 검색 버튼 발견: ${btnSearch ? 'O' : 'X'}`);
    if (btnSearch) {
        btnSearch.addEventListener('click', handleSearch);
        console.warn('  ✅ 검색 버튼 이벤트 리스너 등록 완료');
    }

    // 거래처 자동완성은 initCompanyAutocomplete()에서 처리됨

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

    console.warn('🔄 [고객소식] 탭 전환:', targetTab);

    // 모든 탭 버튼과 컨텐츠 비활성화
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    // 선택된 탭 활성화
    e.currentTarget.classList.add('active');

    if (targetTab === 'view') {
        document.getElementById('viewTab').classList.add('active');
        console.warn('✅ [고객소식] 조회 탭 활성화됨');
    } else if (targetTab === 'write') {
        document.getElementById('writeTab').classList.add('active');
        console.warn('✅ [고객소식] 작성 탭 활성화됨');

        // 작성 탭으로 전환 시 자동완성 재초기화 (탭이 보이는 상태에서 초기화)
        // requestAnimationFrame을 사용하여 DOM 렌더링 완료 후 확실하게 초기화
        console.warn('⏳ [고객소식] 자동완성 초기화 예약 (requestAnimationFrame)...');
        requestAnimationFrame(() => {
            setTimeout(() => {
                initWriteTabAutocomplete();
            }, 50);
        });
    }
}

// ============================================
// 거래처 자동완성 초기화 (AutocompleteManager 사용)
// ============================================

function initCompanyAutocomplete() {
    // 조회 탭 자동완성 초기화
    initViewTabAutocomplete();

    // 작성 탭 자동완성도 미리 초기화 (탭이 숨겨져 있어도 DOM 요소는 존재)
    // 약간의 딜레이 후 초기화하여 DOM이 준비되도록 함
    setTimeout(() => {
        initWriteTabAutocomplete();
    }, 200);
}

/**
 * 조회 탭 자동완성 초기화
 */
function initViewTabAutocomplete() {
    const filterCompany = document.getElementById('filterCompany');
    const filterCompanyAutocomplete = document.getElementById('filterCompanyAutocomplete');

    if (filterCompany && filterCompanyAutocomplete) {
        // 기존 인스턴스 정리
        if (filterCompanyAutocompleteManager) {
            filterCompanyAutocompleteManager.destroy();
        }

        filterCompanyAutocompleteManager = new AutocompleteManager({
            inputElement: filterCompany,
            listElement: filterCompanyAutocomplete,
            dataSource: allCompanies,
            getDisplayText: (company) => {
                const mainName = company.finalCompanyName || company.erpCompanyName;
                if (company.erpCompanyName && company.finalCompanyName !== company.erpCompanyName) {
                    return `${mainName} (${company.erpCompanyName})`;
                }
                return mainName;
            },
            onSelect: (company) => {
                filterCompany.value = company.finalCompanyName || company.erpCompanyName;
                console.log('✅ 필터 거래처 선택됨:', company);
            },
            maxResults: 10,
            placeholder: '검색 결과가 없습니다'
        });

        console.warn('✅ [고객소식] 조회 탭 자동완성 초기화 완료');
    } else {
        console.warn('⚠️ [고객소식] 조회 탭 자동완성 요소를 찾을 수 없음');
    }
}

/**
 * 작성 탭 자동완성 초기화
 * - 탭이 보이는 상태에서만 호출되어야 함
 */
function initWriteTabAutocomplete() {
    const companyName = document.getElementById('companyName');
    const companyAutocomplete = document.getElementById('companyAutocomplete');

    console.warn('🔍 [고객소식] 작성 탭 자동완성 초기화 시도...');
    console.warn('  - companyName 요소:', companyName);
    console.warn('  - companyAutocomplete 요소:', companyAutocomplete);
    console.warn('  - 거래처 데이터 개수:', allCompanies.length);

    if (!companyName || !companyAutocomplete) {
        console.error('❌ [고객소식] 작성 탭 자동완성 요소를 찾을 수 없음!');
        console.error('  - companyName 존재 여부:', !!companyName);
        console.error('  - companyAutocomplete 존재 여부:', !!companyAutocomplete);
        return;
    }

    // 기존 인스턴스 정리
    if (companyAutocompleteManager) {
        console.warn('  - 기존 인스턴스 정리 중...');
        companyAutocompleteManager.destroy();
        companyAutocompleteManager = null;
    }

    // 거래처 데이터 확인
    if (!allCompanies || allCompanies.length === 0) {
        console.error('❌ [고객소식] 거래처 데이터가 없습니다!');
        return;
    }

    // 새 인스턴스 생성
    try {
        companyAutocompleteManager = new AutocompleteManager({
            inputElement: companyName,
            listElement: companyAutocomplete,
            dataSource: allCompanies,
            getDisplayText: (company) => {
                const mainName = company.finalCompanyName || company.erpCompanyName;
                if (company.erpCompanyName && company.finalCompanyName !== company.erpCompanyName) {
                    return `${mainName} (${company.erpCompanyName})`;
                }
                return mainName;
            },
            onSelect: (company) => {
                companyName.value = company.finalCompanyName || company.erpCompanyName;
                // Hidden input에 companyId 저장
                const companyIdInput = document.getElementById('companyId');
                if (companyIdInput) {
                    companyIdInput.value = company.keyValue;
                }
                console.warn('✅ [고객소식] 거래처 선택됨:', company.finalCompanyName || company.erpCompanyName);
            },
            maxResults: 10,
            placeholder: '검색 결과가 없습니다',
            highlightSearch: true
        });

        console.warn('✅ [고객소식] 작성 탭 자동완성 초기화 완료!');
        console.warn('  - 인스턴스 생성됨:', !!companyAutocompleteManager);
        console.warn('  - 데이터 소스 개수:', allCompanies.length);
    } catch (error) {
        console.error('❌ [고객소식] 자동완성 생성 중 오류:', error);
    }
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
// 초기 빈 상태 표시
// ============================================

function showInitialEmptyState() {
    const loadingState = document.getElementById('loadingState');
    const emptyState = document.getElementById('emptyState');
    const newsList = document.getElementById('newsList');

    // 로딩 숨김
    loadingState.classList.add('hidden');

    // 빈 상태 메시지 설정 (초기 상태용)
    const emptyIcon = emptyState.querySelector('.empty-icon');
    const emptyMessage = emptyState.querySelector('p');
    if (emptyIcon) emptyIcon.textContent = '🔍';
    if (emptyMessage) emptyMessage.textContent = '검색하기 버튼을 클릭하여 고객소식을 조회하세요.';

    // 빈 상태 표시
    emptyState.classList.remove('hidden');

    // 목록 비우기
    newsList.innerHTML = '';

    console.warn('📋 [고객소식] 초기 빈 상태 표시 - 검색하기 버튼을 클릭하여 조회하세요');
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
        allNews = data.data?.news || [];

        console.warn(`✅ [고객소식] 소식 ${allNews.length}개 로드 완료`);

        // 로딩 숨김
        loadingState.classList.add('hidden');

        if (allNews.length === 0) {
            // 검색 결과가 없을 때 메시지 설정
            const emptyIcon = emptyState.querySelector('.empty-icon');
            const emptyMessage = emptyState.querySelector('p');
            if (emptyIcon) emptyIcon.textContent = '📭';
            if (emptyMessage) emptyMessage.textContent = '검색 조건에 맞는 고객소식이 없습니다.';

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
        clone.querySelector('.news-date').textContent = formatNewsDate(news.newsDate);

        // 상세 정보
        clone.querySelector('.news-title').textContent = news.title;
        clone.querySelector('.news-content').textContent = news.content;
        clone.querySelector('.news-author').textContent = news.createdBy;
        clone.querySelector('.news-created').textContent = formatNewsDateTime(news.createdAt);
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
    console.warn('🔍 [고객소식] 검색 버튼 클릭됨');

    const filters = {
        companyName: document.getElementById('filterCompany').value.trim(),
        startDate: document.getElementById('filterStartDate').value,
        endDate: document.getElementById('filterEndDate').value,
        category: document.getElementById('filterCategory').value
    };

    console.warn('📋 [고객소식] 검색 조건:', filters);
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

function formatNewsDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatNewsDateTime(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR');
}
