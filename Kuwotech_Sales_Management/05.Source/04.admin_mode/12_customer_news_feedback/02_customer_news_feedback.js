/**
 * 고객소식 의견 제시 (관리자 모드)
 * 영업담당자가 작성한 고객소식을 확인하고 의견 작성
 */

import {
    GlobalConfig,
    showToast,
    showModal
} from '../../01.common/10_index.js';

// 유틸리티 함수
const API_BASE_URL = GlobalConfig.API_BASE_URL;

function getAuthToken() {
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
}

function getUserName() {
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    return user.name || '';
}

function showNotification(message, type = 'info') {
    showToast(message, type);
}

// DOM 요소
let btnRefresh;
let mainLayout;
let loadingState;
let emptyState;

// 사이드바 통계
let totalNewsCount;
let noCommentCount;

// 필터 버튼
let categoryFilterButtons;
let commentFilterButtons;

// 카테고리별 카운트
let allCount, celebrationCount, birthdayCount, anniversaryCount;
let equipmentCount, awardCount, expansionCount, claimCount, generalCount;

// 고객소식 리스트
let newsItemsContainer;
let newsListCount;

// 상세 패널
let detailPlaceholder;
let detailContent;
let existingCommentsSection;
let existingCommentsList;
let noCommentsMessage;

// 폼 요소
let commentType;
let commentContent;
let saveCommentBtn;

// 검색/필터 요소
let filterCompanyName;
let filterCreatedBy;
let filterStartDate;
let filterEndDate;
let applyFiltersBtn;
let resetFiltersBtn;

// 상태 관리
let allNewsData = [];
let filteredNewsData = [];
let selectedCategory = 'all';
let selectedCommentStatus = 'all';
let currentSelectedNewsId = null;

// 검색/필터 상태
let searchCompanyText = '';
let searchCreatedByText = '';
let searchStartDate = '';
let searchEndDate = '';

/**
 * 초기화
 */
function init() {
    // DOM 요소 가져오기
    btnRefresh = document.getElementById('btnRefresh');
    mainLayout = document.getElementById('mainLayout');
    loadingState = document.getElementById('loadingState');
    emptyState = document.getElementById('emptyState');

    // 통계 요소
    totalNewsCount = document.getElementById('totalNewsCount');
    noCommentCount = document.getElementById('noCommentCount');

    // 카테고리별 카운트
    allCount = document.getElementById('allCount');
    celebrationCount = document.getElementById('celebrationCount');
    birthdayCount = document.getElementById('birthdayCount');
    anniversaryCount = document.getElementById('anniversaryCount');
    equipmentCount = document.getElementById('equipmentCount');
    awardCount = document.getElementById('awardCount');
    expansionCount = document.getElementById('expansionCount');
    claimCount = document.getElementById('claimCount');
    generalCount = document.getElementById('generalCount');

    // 리스트 요소
    newsItemsContainer = document.getElementById('newsItemsContainer');
    newsListCount = document.getElementById('newsListCount');

    // 상세 패널 요소
    detailPlaceholder = document.getElementById('detailPlaceholder');
    detailContent = document.getElementById('detailContent');
    existingCommentsSection = document.getElementById('existingCommentsSection');
    existingCommentsList = document.getElementById('existingCommentsList');
    noCommentsMessage = document.getElementById('noCommentsMessage');

    // 폼 요소
    commentType = document.getElementById('commentType');
    commentContent = document.getElementById('commentContent');
    saveCommentBtn = document.getElementById('saveCommentBtn');

    // 검색/필터 요소
    filterCompanyName = document.getElementById('filterCompanyName');
    filterCreatedBy = document.getElementById('filterCreatedBy');
    filterStartDate = document.getElementById('filterStartDate');
    filterEndDate = document.getElementById('filterEndDate');
    applyFiltersBtn = document.getElementById('applyFiltersBtn');
    resetFiltersBtn = document.getElementById('resetFiltersBtn');

    // 이벤트 리스너
    btnRefresh?.addEventListener('click', handleRefresh);
    saveCommentBtn?.addEventListener('click', handleSaveComment);
    applyFiltersBtn?.addEventListener('click', handleApplyFilters);
    resetFiltersBtn?.addEventListener('click', handleResetFilters);

    // 필터 버튼 이벤트
    categoryFilterButtons = document.querySelectorAll('.category-filter-btn');
    categoryFilterButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const category = e.target.closest('.category-filter-item').dataset.category;
            handleCategoryFilter(category);
        });
    });

    commentFilterButtons = document.querySelectorAll('.comment-filter-btn');
    commentFilterButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const status = e.target.closest('.comment-filter-item').dataset.status;
            handleCommentStatusFilter(status);
        });
    });

    // 초기 데이터 로드
    loadCustomerNews();
}

/**
 * 새로고침 핸들러
 */
async function handleRefresh() {
    await loadCustomerNews();
    showNotification('데이터를 새로고침했습니다.', 'success');
}

/**
 * 고객소식 목록 로드
 */
async function loadCustomerNews() {
    const token = getAuthToken();
    if (!token) {
        showNotification('로그인이 필요합니다.', 'error');
        return;
    }

    try {
        showLoading(true);

        const response = await fetch(`${API_BASE_URL}/api/customer-news`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('고객소식 데이터를 불러오는데 실패했습니다.');
        }

        const data = await response.json();
        allNewsData = data.data?.news || [];

        console.log('✅ [고객소식] API 응답:', data);
        console.log('📊 [고객소식] 로드된 데이터:', allNewsData.length, '건');

        if (allNewsData.length === 0) {
            showEmptyState(true);
            showMainLayout(false);
        } else {
            showEmptyState(false);
            showMainLayout(true);

            // 통계 업데이트
            updateStatistics();

            // 카테고리별 카운트 업데이트
            updateCategoryCounts();

            // 필터 적용
            applyFilters();
        }

    } catch (error) {
        console.error('고객소식 로드 오류:', error);
        showNotification(error.message || '데이터를 불러오는데 실패했습니다.', 'error');
        showEmptyState(true);
        showMainLayout(false);
    } finally {
        showLoading(false);
    }
}

/**
 * 통계 업데이트
 */
function updateStatistics() {
    const total = allNewsData.length;
    const noComment = allNewsData.filter(news => !news.comments || news.comments.length === 0).length;

    if (totalNewsCount) totalNewsCount.textContent = total;
    if (noCommentCount) noCommentCount.textContent = noComment;
}

/**
 * 카테고리별 카운트 업데이트
 */
function updateCategoryCounts() {
    const categoryCounts = {
        'all': allNewsData.length,
        '경조사': 0,
        '생일': 0,
        '개업기념일': 0,
        '신규장비구매': 0,
        '수상/인증': 0,
        '확장/이전': 0,
        '클레임/이슈': 0,
        '일반소식': 0
    };

    allNewsData.forEach(news => {
        const category = news.category || '일반소식';
        if (categoryCounts.hasOwnProperty(category)) {
            categoryCounts[category]++;
        }
    });

    if (allCount) allCount.textContent = categoryCounts['all'];
    if (celebrationCount) celebrationCount.textContent = categoryCounts['경조사'];
    if (birthdayCount) birthdayCount.textContent = categoryCounts['생일'];
    if (anniversaryCount) anniversaryCount.textContent = categoryCounts['개업기념일'];
    if (equipmentCount) equipmentCount.textContent = categoryCounts['신규장비구매'];
    if (awardCount) awardCount.textContent = categoryCounts['수상/인증'];
    if (expansionCount) expansionCount.textContent = categoryCounts['확장/이전'];
    if (claimCount) claimCount.textContent = categoryCounts['클레임/이슈'];
    if (generalCount) generalCount.textContent = categoryCounts['일반소식'];
}

/**
 * 카테고리 필터 핸들러
 */
function handleCategoryFilter(category) {
    selectedCategory = category;

    // 버튼 활성 상태 업데이트
    categoryFilterButtons.forEach(btn => {
        if (btn.closest('.category-filter-item').dataset.category === category) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // 필터 적용
    applyFilters();
}

/**
 * 의견 상태 필터 핸들러
 */
function handleCommentStatusFilter(status) {
    selectedCommentStatus = status;

    // 버튼 활성 상태 업데이트
    commentFilterButtons.forEach(btn => {
        if (btn.closest('.comment-filter-item').dataset.status === status) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // 필터 적용
    applyFilters();
}

/**
 * 검색 필터 적용 핸들러
 */
function handleApplyFilters() {
    // 입력값 가져오기
    searchCompanyText = filterCompanyName?.value?.trim() || '';
    searchCreatedByText = filterCreatedBy?.value?.trim() || '';
    searchStartDate = filterStartDate?.value || '';
    searchEndDate = filterEndDate?.value || '';

    // 필터 적용
    applyFilters();

    // 사용자 피드백
    const filterCount = [searchCompanyText, searchCreatedByText, searchStartDate, searchEndDate].filter(f => f).length;
    if (filterCount > 0) {
        showNotification(`${filterCount}개의 검색 조건이 적용되었습니다.`, 'success');
    }
}

/**
 * 검색 필터 초기화 핸들러
 */
function handleResetFilters() {
    // 입력 필드 초기화
    if (filterCompanyName) filterCompanyName.value = '';
    if (filterCreatedBy) filterCreatedBy.value = '';
    if (filterStartDate) filterStartDate.value = '';
    if (filterEndDate) filterEndDate.value = '';

    // 상태 초기화
    searchCompanyText = '';
    searchCreatedByText = '';
    searchStartDate = '';
    searchEndDate = '';

    // 필터 적용
    applyFilters();

    // 사용자 피드백
    showNotification('검색 조건이 초기화되었습니다.', 'info');
}

/**
 * 필터 적용
 */
function applyFilters() {
    filteredNewsData = allNewsData.filter(news => {
        // 카테고리 필터
        const categoryMatch = selectedCategory === 'all' || news.category === selectedCategory;

        // 의견 상태 필터
        let commentStatusMatch = true;
        if (selectedCommentStatus === 'no-comment') {
            commentStatusMatch = !news.comments || news.comments.length === 0;
        } else if (selectedCommentStatus === 'has-comment') {
            commentStatusMatch = news.comments && news.comments.length > 0;
        }

        // 거래처명 검색 (부분 일치, 대소문자 무시)
        const companyMatch = !searchCompanyText ||
            (news.companyName && news.companyName.toLowerCase().includes(searchCompanyText.toLowerCase()));

        // 영업담당자 검색 (부분 일치, 대소문자 무시)
        const createdByMatch = !searchCreatedByText ||
            (news.createdBy && news.createdBy.toLowerCase().includes(searchCreatedByText.toLowerCase()));

        // 날짜 범위 필터 (소식 발생일 기준)
        let dateMatch = true;
        if (searchStartDate || searchEndDate) {
            const newsDate = new Date(news.newsDate);

            if (searchStartDate) {
                const startDate = new Date(searchStartDate);
                startDate.setHours(0, 0, 0, 0);
                if (newsDate < startDate) {
                    dateMatch = false;
                }
            }

            if (searchEndDate) {
                const endDate = new Date(searchEndDate);
                endDate.setHours(23, 59, 59, 999);
                if (newsDate > endDate) {
                    dateMatch = false;
                }
            }
        }

        return categoryMatch && commentStatusMatch && companyMatch && createdByMatch && dateMatch;
    });

    // 목록 렌더링
    renderNewsList();
}

/**
 * 고객소식 목록 렌더링
 */
function renderNewsList() {
    if (!newsItemsContainer) return;

    newsItemsContainer.innerHTML = '';

    if (filteredNewsData.length === 0) {
        newsItemsContainer.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: var(--spacing-xl);">조건에 맞는 고객소식이 없습니다.</p>';
        if (newsListCount) newsListCount.textContent = '(총 0건)';
        return;
    }

    // 날짜 순으로 정렬 (최신순)
    const sortedNews = [...filteredNewsData].sort((a, b) =>
        new Date(b.createdAt) - new Date(a.createdAt)
    );

    sortedNews.forEach(news => {
        const newsItem = createNewsItem(news);
        newsItemsContainer.appendChild(newsItem);
    });

    if (newsListCount) {
        newsListCount.textContent = `(총 ${filteredNewsData.length}건)`;
    }
}

/**
 * 고객소식 아이템 생성
 */
function createNewsItem(news) {
    const div = document.createElement('div');
    div.className = 'news-item';
    div.dataset.newsId = news.id;

    const hasComments = news.comments && news.comments.length > 0;
    if (!hasComments) {
        div.classList.add('no-comment');
    }

    if (currentSelectedNewsId === news.id) {
        div.classList.add('selected');
    }

    const commentStatusHtml = hasComments
        ? '<span class="news-comment-status has-comment">✅ 의견작성</span>'
        : '<span class="news-comment-status no-comment">❌ 미작성</span>';

    div.innerHTML = `
        <div class="news-item-header">
            <span class="news-category-badge">${news.category || '일반소식'}</span>
            ${commentStatusHtml}
        </div>
        <div class="news-item-title">${escapeHtml(news.title || '제목 없음')}</div>
        <div class="news-item-info">
            <span class="news-company">${escapeHtml(news.companyName || '-')}</span>
            <span class="news-author">${escapeHtml(news.createdBy || '-')}</span>
        </div>
    `;

    // 클릭 이벤트
    div.addEventListener('click', () => {
        selectNews(news.id);
    });

    return div;
}

/**
 * 고객소식 선택
 */
async function selectNews(newsId) {
    currentSelectedNewsId = newsId;

    // 선택 상태 업데이트
    document.querySelectorAll('.news-item').forEach(item => {
        if (item.dataset.newsId === String(newsId)) {
            item.classList.add('selected');
        } else {
            item.classList.remove('selected');
        }
    });

    // 상세 정보 로드
    await loadNewsDetail(newsId);
}

/**
 * 고객소식 상세 정보 로드
 */
async function loadNewsDetail(newsId) {
    const token = getAuthToken();
    if (!token) {
        showNotification('로그인이 필요합니다.', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/customer-news/${newsId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('고객소식 상세 정보를 불러오는데 실패했습니다.');
        }

        const data = await response.json();
        console.log('✅ [고객소식 상세] API 응답:', data);
        displayNewsDetail(data.data?.news);

    } catch (error) {
        console.error('고객소식 상세 로드 오류:', error);
        showNotification(error.message || '상세 정보를 불러오는데 실패했습니다.', 'error');
    }
}

/**
 * 고객소식 상세 정보 표시
 */
function displayNewsDetail(news) {
    // 플레이스홀더 숨기기, 상세 내용 표시
    if (detailPlaceholder) detailPlaceholder.classList.add('hidden');
    if (detailContent) detailContent.classList.remove('hidden');

    // 기본 정보
    document.getElementById('detailNewsId').textContent = news.id || '-';
    document.getElementById('detailCategory').textContent = news.category || '-';
    document.getElementById('detailAuthor').textContent = news.createdBy || '-';
    document.getElementById('detailCompany').textContent = news.companyName || '-';
    document.getElementById('detailNewsDate').textContent = formatDate(news.newsDate);
    document.getElementById('detailCreatedDate').textContent = formatDateTime(news.createdAt);

    const priorityLabel = getPriorityLabel(news.priority);
    document.getElementById('detailPriority').textContent = priorityLabel;

    // 소식 내용
    document.getElementById('detailTitle').textContent = news.title || '-';
    document.getElementById('detailContent').textContent = news.content || '-';

    // 기존 의견 목록
    const comments = news.comments || [];
    if (comments.length > 0) {
        renderExistingComments(comments);
        if (noCommentsMessage) noCommentsMessage.classList.add('hidden');
        if (existingCommentsList) existingCommentsList.classList.remove('hidden');
    } else {
        if (noCommentsMessage) noCommentsMessage.classList.remove('hidden');
        if (existingCommentsList) existingCommentsList.classList.add('hidden');
    }

    // 폼 초기화
    if (commentType) commentType.value = '칭찬';
    if (commentContent) commentContent.value = '';
}

/**
 * 기존 의견 목록 렌더링
 */
function renderExistingComments(comments) {
    if (!existingCommentsList) return;

    existingCommentsList.innerHTML = '';

    // 날짜 순으로 정렬 (최신순)
    const sortedComments = [...comments].sort((a, b) =>
        new Date(b.createdAt) - new Date(a.createdAt)
    );

    sortedComments.forEach(comment => {
        const commentItem = createExistingCommentItem(comment);
        existingCommentsList.appendChild(commentItem);
    });
}

/**
 * 기존 의견 아이템 생성
 */
function createExistingCommentItem(comment) {
    const div = document.createElement('div');
    div.className = 'existing-comment-item';

    const typeLabel = getCommentTypeLabel(comment.commentType);

    div.innerHTML = `
        <div class="comment-item-header">
            <div>
                <span class="comment-author">${comment.commentBy || '관리자'}</span>
                <span class="comment-type">${typeLabel}</span>
            </div>
            <span class="comment-date">${formatDateTime(comment.createdAt)}</span>
        </div>
        <div class="comment-content">${escapeHtml(comment.comment)}</div>
    `;

    return div;
}

/**
 * 의견 저장 핸들러
 */
async function handleSaveComment() {
    if (!currentSelectedNewsId) {
        showNotification('고객소식을 선택해주세요.', 'warning');
        return;
    }

    const type = commentType?.value;
    const content = commentContent?.value?.trim();

    if (!content) {
        showNotification('의견 내용을 입력해주세요.', 'warning');
        return;
    }

    const token = getAuthToken();
    if (!token) {
        showNotification('로그인이 필요합니다.', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/customer-news/${currentSelectedNewsId}/comments`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                commentType: type,
                content: content
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || '의견 저장에 실패했습니다.');
        }

        showNotification('의견이 성공적으로 저장되었습니다.', 'success');

        // 폼 초기화
        if (commentType) commentType.value = '칭찬';
        if (commentContent) commentContent.value = '';

        // 데이터 새로고침
        await loadCustomerNews();

        // 현재 선택된 소식 다시 로드
        await loadNewsDetail(currentSelectedNewsId);

    } catch (error) {
        console.error('의견 저장 오류:', error);
        showNotification(error.message || '의견 저장에 실패했습니다.', 'error');
    }
}

/**
 * 우선순위 라벨
 */
function getPriorityLabel(priority) {
    const labels = {
        '높음': '🔴 높음',
        '보통': '🟡 보통',
        '낮음': '🟢 낮음'
    };
    return labels[priority] || priority || '-';
}

/**
 * 의견 타입 라벨
 */
function getCommentTypeLabel(type) {
    const labels = {
        '칭찬': '👍 칭찬',
        '개선요청': '💡 개선요청',
        '질문': '❓ 질문',
        '정보공유': '📢 정보공유',
        '기타': '💬 기타'
    };
    return labels[type] || '💬 기타';
}

/**
 * 날짜 포맷팅 (YYYY-MM-DD)
 */
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).replace(/\./g, '-').replace(/\s/g, '');
}

/**
 * 날짜/시간 포맷팅 (YYYY-MM-DD HH:mm)
 */
function formatDateTime(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }).replace(/\./g, '-').replace(/\s/g, ' ');
}

/**
 * HTML 이스케이프
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * 로딩 상태 표시
 */
function showLoading(show) {
    if (loadingState) {
        loadingState.classList.toggle('hidden', !show);
        loadingState.classList.toggle('flex-display', show);
    }
}

/**
 * 빈 상태 표시
 */
function showEmptyState(show) {
    if (emptyState) {
        emptyState.classList.toggle('hidden', !show);
    }
}

/**
 * 메인 레이아웃 표시
 */
function showMainLayout(show) {
    if (mainLayout) {
        mainLayout.classList.toggle('hidden', !show);
    }
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', init);
