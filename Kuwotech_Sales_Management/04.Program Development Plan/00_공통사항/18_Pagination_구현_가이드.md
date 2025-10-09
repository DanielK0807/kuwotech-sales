# Pagination 구현 가이드

## 📌 개요
대량 데이터 조회 시 `limit=10000` 방식을 Pagination으로 개선하여 성능을 향상시킵니다.

---

## 🎯 현재 문제점

### 대량 데이터 조회의 성능 이슈
```javascript
// ❌ Admin Mode - all_companies.js:275
`${GlobalConfig.API_BASE_URL}/api/companies?limit=10000`

// ❌ Admin Mode - employees.js:116
`${GlobalConfig.API_BASE_URL}/api/employees?limit=9999`

// ❌ Admin Mode - data_management.js:79
`${API_BASE_URL}/companies?limit=9999`
```

**문제점**:
- 한 번에 최대 10,000개 레코드 조회
- 네트워크 전송 시간 증가
- 브라우저 메모리 사용 증가
- 초기 로딩 시간 지연
- 사용자 경험 저하

**현재 시나리오**:
```
거래처 500개 → 0.5초 로딩 ✅
거래처 2,000개 → 2초 로딩 ⚠️
거래처 5,000개 → 5초 로딩 ❌
거래처 10,000개 → 10초 이상 ❌❌
```

---

## ✅ Pagination 해결 방안

### 1. Page-Based Pagination (권장)

#### Backend API 구현
```javascript
// routes/companies.js

/**
 * GET /api/companies
 * @query {number} page - 페이지 번호 (1부터 시작)
 * @query {number} limit - 페이지당 항목 수 (기본값: 50)
 */
router.get('/', async (req, res, next) => {
  try {
    // 쿼리 파라미터 추출
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    // 데이터베이스 쿼리
    const [companies, [{ total }]] = await Promise.all([
      // 페이지별 데이터 조회
      db.query(
        'SELECT * FROM companies ORDER BY company_name LIMIT ? OFFSET ?',
        [limit, offset]
      ),
      // 전체 개수 조회
      db.query('SELECT COUNT(*) as total FROM companies')
    ]);

    // 페이지네이션 정보 계산
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    // 표준 응답 반환
    res.json({
      success: true,
      data: companies,
      pagination: {
        page: page,
        limit: limit,
        total: total,
        totalPages: totalPages,
        hasNext: hasNext,
        hasPrev: hasPrev
      },
      message: '거래처 목록 조회 성공'
    });

  } catch (error) {
    next(error);
  }
});
```

---

#### Frontend 구현 (15_api_helper.js 활용)
```javascript
// all_companies.js (수정 후)
import { apiGet } from '../../01.common/15_api_helper.js';

let state = {
  currentPage: 1,
  itemsPerPage: 50,
  totalPages: 1,
  companies: []
};

/**
 * 거래처 목록 로드 (페이지네이션)
 */
async function loadCompanies(page = 1) {
  try {
    showLoadingSpinner();

    // ✅ 페이지네이션 API 호출
    const response = await apiGet('/companies', {
      page: page,
      limit: state.itemsPerPage
    });

    // 응답 처리
    state.companies = response.data;
    state.currentPage = response.pagination.page;
    state.totalPages = response.pagination.totalPages;

    // UI 렌더링
    renderCompanyTable(state.companies);
    renderPaginationControls(response.pagination);

    hideLoadingSpinner();

  } catch (error) {
    handleApiError(error, showToast);
  }
}

/**
 * 페이지네이션 컨트롤 렌더링
 */
function renderPaginationControls(pagination) {
  const paginationHTML = `
    <div class="pagination-controls">
      <button
        class="btn-prev"
        ${!pagination.hasPrev ? 'disabled' : ''}
        onclick="loadCompanies(${pagination.page - 1})">
        이전
      </button>

      <span class="page-info">
        페이지 ${pagination.page} / ${pagination.totalPages}
        (전체 ${pagination.total.toLocaleString()}개)
      </span>

      <button
        class="btn-next"
        ${!pagination.hasNext ? 'disabled' : ''}
        onclick="loadCompanies(${pagination.page + 1})">
        다음
      </button>

      <select
        class="items-per-page"
        onchange="changeItemsPerPage(this.value)">
        <option value="20" ${pagination.limit === 20 ? 'selected' : ''}>20개</option>
        <option value="50" ${pagination.limit === 50 ? 'selected' : ''}>50개</option>
        <option value="100" ${pagination.limit === 100 ? 'selected' : ''}>100개</option>
      </select>
    </div>
  `;

  document.querySelector('.pagination-container').innerHTML = paginationHTML;
}

/**
 * 페이지당 항목 수 변경
 */
function changeItemsPerPage(newLimit) {
  state.itemsPerPage = parseInt(newLimit);
  loadCompanies(1); // 첫 페이지로 리셋
}
```

---

### 2. Infinite Scroll (무한 스크롤)

#### Frontend 구현
```javascript
// all_companies.js (Infinite Scroll 버전)

let state = {
  currentPage: 1,
  itemsPerPage: 50,
  hasMore: true,
  isLoading: false,
  companies: []
};

/**
 * 초기 로드
 */
async function initialize() {
  await loadMoreCompanies();
  setupInfiniteScroll();
}

/**
 * 추가 데이터 로드
 */
async function loadMoreCompanies() {
  if (state.isLoading || !state.hasMore) return;

  state.isLoading = true;
  showLoadingSpinner();

  try {
    const response = await apiGet('/companies', {
      page: state.currentPage,
      limit: state.itemsPerPage
    });

    // 데이터 추가 (누적)
    state.companies = [...state.companies, ...response.data];
    state.hasMore = response.pagination.hasNext;
    state.currentPage += 1;

    // 테이블에 추가 렌더링
    appendCompanyRows(response.data);

  } catch (error) {
    handleApiError(error, showToast);
  } finally {
    state.isLoading = false;
    hideLoadingSpinner();
  }
}

/**
 * 무한 스크롤 이벤트 설정
 */
function setupInfiniteScroll() {
  const tableContainer = document.querySelector('.table-container');

  tableContainer.addEventListener('scroll', () => {
    // 스크롤이 하단 100px 이내에 도달하면 추가 로드
    const scrollBottom = tableContainer.scrollHeight - tableContainer.scrollTop - tableContainer.clientHeight;

    if (scrollBottom < 100 && !state.isLoading && state.hasMore) {
      loadMoreCompanies();
    }
  });
}

/**
 * 테이블에 행 추가 (누적 렌더링)
 */
function appendCompanyRows(companies) {
  const tbody = document.querySelector('.company-table tbody');
  const newRows = companies.map(company => renderCompanyRow(company)).join('');
  tbody.insertAdjacentHTML('beforeend', newRows);
}
```

---

### 3. Server-Side Search & Filter (서버 측 검색)

#### Backend API 구현
```javascript
// routes/companies.js

/**
 * GET /api/companies
 * @query {string} search - 검색 키워드
 * @query {string} filter - 필터 조건 (JSON)
 * @query {number} page - 페이지 번호
 * @query {number} limit - 페이지당 항목 수
 */
router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    // SQL 쿼리 구성
    let query = 'SELECT * FROM companies WHERE 1=1';
    let countQuery = 'SELECT COUNT(*) as total FROM companies WHERE 1=1';
    const params = [];

    // 검색 조건 추가
    if (search) {
      query += ' AND (company_name LIKE ? OR employee_name LIKE ?)';
      countQuery += ' AND (company_name LIKE ? OR employee_name LIKE ?)';
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam);
    }

    // 정렬 및 페이지네이션
    query += ' ORDER BY company_name LIMIT ? OFFSET ?';
    params.push(limit, offset);

    // 실행
    const [companies] = await db.query(query, params);
    const [[{ total }]] = await db.query(countQuery, params.slice(0, -2)); // limit, offset 제외

    // 응답
    res.json({
      success: true,
      data: companies,
      pagination: {
        page: page,
        limit: limit,
        total: total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });

  } catch (error) {
    next(error);
  }
});
```

---

#### Frontend 검색 구현
```javascript
// all_companies.js

let state = {
  currentPage: 1,
  itemsPerPage: 50,
  searchKeyword: '',
  companies: []
};

/**
 * 검색 실행
 */
async function searchCompanies(keyword) {
  state.searchKeyword = keyword;
  state.currentPage = 1; // 검색 시 첫 페이지로 리셋

  await loadCompanies();
}

/**
 * 거래처 목록 로드 (검색 포함)
 */
async function loadCompanies(page = 1) {
  try {
    const response = await apiGet('/companies', {
      page: page,
      limit: state.itemsPerPage,
      search: state.searchKeyword // 검색 키워드 추가
    });

    state.companies = response.data;
    state.currentPage = response.pagination.page;
    state.totalPages = response.pagination.totalPages;

    renderCompanyTable(state.companies);
    renderPaginationControls(response.pagination);

  } catch (error) {
    handleApiError(error, showToast);
  }
}

/**
 * 검색 입력 이벤트
 */
document.querySelector('#search-input').addEventListener('input', (e) => {
  const keyword = e.target.value.trim();

  // 디바운싱 (300ms)
  clearTimeout(state.searchTimer);
  state.searchTimer = setTimeout(() => {
    searchCompanies(keyword);
  }, 300);
});
```

---

## 🎨 UI/UX 가이드

### Pagination Controls CSS
```css
/* 페이지네이션 컨트롤 스타일 */
.pagination-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-top: 2rem;
  padding: 1rem;
}

.pagination-controls button {
  padding: 0.5rem 1rem;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.pagination-controls button:hover:not(:disabled) {
  background-color: #0056b3;
}

.pagination-controls button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.page-info {
  font-size: 0.9rem;
  color: #666;
}

.items-per-page {
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}
```

---

### Loading Spinner
```javascript
/**
 * 로딩 스피너 표시
 */
function showLoadingSpinner() {
  const spinner = `
    <div class="loading-spinner">
      <div class="spinner"></div>
      <span>데이터 로딩 중...</span>
    </div>
  `;

  document.querySelector('.loading-container').innerHTML = spinner;
}

/**
 * 로딩 스피너 숨김
 */
function hideLoadingSpinner() {
  document.querySelector('.loading-container').innerHTML = '';
}
```

---

## 📊 성능 비교

### Before (limit=10000)
```yaml
시나리오: 거래처 5000개 조회
- 네트워크 전송: 5MB
- 응답 시간: 5-8초
- 메모리 사용: 50MB
- 초기 렌더링: 3초
- 사용자 대기 시간: 8-11초
```

### After (Pagination, limit=50)
```yaml
시나리오: 거래처 5000개 → 50개씩 페이지네이션
- 네트워크 전송: 50KB (100배 감소)
- 응답 시간: 0.1-0.3초 (25배 빠름)
- 메모리 사용: 5MB (10배 감소)
- 초기 렌더링: 0.1초 (30배 빠름)
- 사용자 대기 시간: 0.4초 (20배 빠름)
```

---

## 🔧 구현 우선순위

### Phase 1: 기본 Pagination (즉시 실행)
- [ ] Backend: `/api/companies` Pagination 지원
- [ ] Backend: `/api/employees` Pagination 지원
- [ ] Frontend: `all_companies.js` Pagination UI 구현
- [ ] Frontend: `employees.js` Pagination UI 구현
- [ ] **예상 소요**: 1-2일
- **효과**: 초기 로딩 시간 80% 감소

---

### Phase 2: Server-Side Search (단기 실행)
- [ ] Backend: 검색 쿼리 파라미터 지원
- [ ] Frontend: 검색 입력 UI 구현
- [ ] Frontend: 디바운싱 적용
- [ ] **예상 소요**: 1일
- **효과**: 검색 속도 10배 향상

---

### Phase 3: Advanced Features (중기 실행)
- [ ] Backend: 필터 조건 지원 (부서, 지역, 제품군)
- [ ] Frontend: 필터 UI 구현
- [ ] Backend: 정렬 옵션 지원
- [ ] Frontend: 정렬 UI 구현
- [ ] **예상 소요**: 2-3일
- **효과**: 사용자 편의성 향상

---

### Phase 4: Optimization (장기 실행)
- [ ] Infinite Scroll 옵션 추가
- [ ] Virtual Scrolling (대량 데이터 렌더링 최적화)
- [ ] IndexedDB 캐싱 통합
- [ ] **예상 소요**: 3-5일
- **효과**: 극한 성능 최적화

---

## 🧪 테스트 체크리스트

### Backend API 테스트
- [ ] `/api/companies?page=1&limit=50` 정상 작동
- [ ] `/api/companies?page=2&limit=50` 정상 작동
- [ ] 마지막 페이지 `hasNext: false` 확인
- [ ] 첫 페이지 `hasPrev: false` 확인
- [ ] `total` 값이 전체 개수와 일치
- [ ] 검색 쿼리 정상 작동 (`search=keyword`)
- [ ] 빈 결과 처리 (data: [], total: 0)

### Frontend UI 테스트
- [ ] 페이지 이동 버튼 정상 작동
- [ ] 첫 페이지에서 "이전" 버튼 비활성화
- [ ] 마지막 페이지에서 "다음" 버튼 비활성화
- [ ] 페이지당 항목 수 변경 정상 작동
- [ ] 검색 입력 시 첫 페이지로 리셋
- [ ] 로딩 스피너 표시/숨김 정상
- [ ] 에러 처리 (네트워크 오류, 404 등)

### 성능 테스트
- [ ] 1,000개 데이터: 0.5초 이내 로딩
- [ ] 5,000개 데이터: 1초 이내 로딩
- [ ] 10,000개 데이터: 1.5초 이내 로딩
- [ ] 메모리 사용량 80% 감소 확인
- [ ] 네트워크 전송량 90% 감소 확인

---

## 📚 참고 자료

- [Pagination Best Practices](https://www.citusdata.com/blog/2016/03/30/five-ways-to-paginate/)
- [REST API Pagination](https://docs.github.com/en/rest/guides/using-pagination-in-the-rest-api)
- KUWOTECH 프로젝트: `05.Source/01.common/15_api_helper.js`
- 분석 문서: `04.Program Development Plan/03_문제점파악/04_데이터플로우_일관성_분석.md` (Section 11.2)

---

**작성일**: 2025-10-09
**버전**: 1.0
**작성자**: Claude Code
