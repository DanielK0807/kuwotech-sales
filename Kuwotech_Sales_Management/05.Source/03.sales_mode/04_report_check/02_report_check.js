/**
 * =====================================================
 * 실적보고서 확인 페이지 - Accordion UI JavaScript
 * =====================================================
 *
 * 06_실적보고서_확인_UI_구현가이드.md 기반 구현
 *
 * 주요 기능:
 * 1. 아코디언 토글 (상세보기/접기)
 * 2. 검색 및 필터링 (유형, 상태)
 * 3. 누적 실적 입력 및 관리
 * 4. 상태 업데이트 및 통계 계산
 * 5. API 연동 (데이터 로드/저장)
 */

import ApiManager from '../../01.common/13_api_manager.js';
import { getCompanyDisplayName } from '../../01.common/02_utils.js';
import { formatNumber, formatDate } from '../../01.common/03_format.js';

// =====================================================
// API Manager 초기화
// =====================================================
const apiManager = ApiManager.getInstance();

// =====================================================
// 전역 상태 관리
// =====================================================
const state = {
  currentUser: null,
  reportsData: [], // 전체 보고서 데이터
  filteredReports: [], // 필터링된 보고서 데이터
  expandedReportId: null, // 현재 확장된 보고서 ID
  companies: [] // 거래처 목록
};

// =====================================================
// DOM 요소 참조
// =====================================================
const elements = {
  // 통계 카드
  totalCount: null,
  completedCount: null,
  partialCount: null,
  incompleteCount: null,

  // 필터
  filterType: null,
  filterCompany: null,
  filterStatus: null,
  btnSearch: null,
  btnRefresh: null,

  // 리스트
  reportList: null,
  loadingState: null,
  emptyState: null,

  // 템플릿
  template: null
};

// =====================================================
// 초기화
// =====================================================
async function initReportCheckPage() {
  try {
    // DOM 요소 캐싱
    cacheElements();

    // API Manager 초기화
    await apiManager.init();

    // 사용자 정보 확인
    if (!checkUserSession()) {
      return;
    }

    // 이벤트 리스너 등록 (CRITICAL: 반드시 실행되어야 함)
    initEventListeners();

    // 거래처 목록 로드
    await loadCompanies();

    // 초기 데이터 로드
    await loadReportsData();
  } catch (error) {
    console.error('❌ [Report Check] 초기화 실패:', error);
    console.error('   스택:', error.stack);

    // 초기화 실패해도 이벤트 리스너는 등록 시도
    try {
      initEventListeners();
    } catch (listenerError) {
      console.error('❌ [Report Check] 이벤트 리스너 등록 실패:', listenerError);
    }

    // 에러 표시
    showEmptyState(true);
  }
}

// ✅ FIX: DOMContentLoaded가 이미 발생했을 수 있으므로 즉시 실행도 지원
if (document.readyState === 'loading') {
  // 아직 로딩 중이면 DOMContentLoaded 대기
  document.addEventListener('DOMContentLoaded', initReportCheckPage);
} else {
  // 이미 DOM이 로드되었으면 즉시 실행
  initReportCheckPage();
}

/**
 * DOM 요소 캐싱
 */
function cacheElements() {
  // 통계 카드
  elements.totalCount = document.getElementById('totalCount');
  elements.completedCount = document.getElementById('completedCount');
  elements.partialCount = document.getElementById('partialCount');
  elements.incompleteCount = document.getElementById('incompleteCount');

  // 필터
  elements.filterType = document.getElementById('filterType');
  elements.filterCompany = document.getElementById('filterCompany');
  elements.filterStatus = document.getElementById('filterStatus');
  elements.btnSearch = document.getElementById('btnSearch');
  elements.btnRefresh = document.getElementById('btnRefresh');

  // 리스트
  elements.reportList = document.getElementById('reportList');
  elements.loadingState = document.getElementById('loadingState');
  elements.emptyState = document.getElementById('emptyState');

  // 템플릿
  elements.template = document.getElementById('report-item-template');
}

/**
 * 사용자 세션 확인
 */
function checkUserSession() {
  state.currentUser = JSON.parse(sessionStorage.getItem('user'));

  if (!state.currentUser) {
    if (window.Toast) {
      window.Toast.error('로그인이 필요합니다');
    }
    setTimeout(() => {
      window.location.href = '../../../05.Source/02.login_mode/01_login/01_login.html';
    }, 1000);
    return false;
  }

  return true;
}

// =====================================================
// 이벤트 리스너 초기화
// =====================================================
function initEventListeners() {
  try {

    // 검색 버튼
    if (elements.btnSearch) {
      elements.btnSearch.addEventListener('click', handleSearch);
    } else {
      console.error('[Report Check]   - 검색 버튼 요소 없음 ✗');
    }

    // 새로고침 버튼
    if (elements.btnRefresh) {
      elements.btnRefresh.addEventListener('click', handleRefresh);
    } else {
      console.error('[Report Check]   - 새로고침 버튼 요소 없음 ✗');
    }

    // 엔터키로 검색
    if (elements.filterType) {
      elements.filterType.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
      });
    }

    if (elements.filterCompany) {
      elements.filterCompany.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
      });
    }

    if (elements.filterStatus) {
      elements.filterStatus.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
      });
    }

  } catch (error) {
    console.error('[Report Check] 이벤트 리스너 등록 중 오류:', error);
    throw error;
  }
}

// =====================================================
// 데이터 로드
// =====================================================
async function loadReportsData() {
  showLoading(true);

  try {

    // API 호출로 실제 데이터 가져오기
    // ✅ FIX: 백엔드는 submittedBy 파라미터를 기대함 (employeeId 아님)
    const response = await apiManager.getReports({
      submittedBy: state.currentUser.name,  // 백엔드 컨트롤러가 기대하는 파라미터명
      limit: 100,
      offset: 0
    });


    if (response.success) {
      // API 응답에서 실제 보고서 배열 추출
      // 응답 구조: { success: true, data: { reports: [...] } }
      const reportsArray = response.data?.reports || response.data || [];

      // 데이터 변환 (API 응답 → 아코디언 UI 형식)
      state.reportsData = transformReportsData(reportsArray);

      // 날짜 기준 내림차순 정렬 (최신순)
      state.reportsData.sort((a, b) =>
        new Date(b.submitDate) - new Date(a.submitDate)
      );
    } else {
      console.warn('[Report Check] 보고서 목록 로드 실패:', response.message);
      state.reportsData = [];

      // 개발용: 목업 데이터 사용
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        state.reportsData = generateMockData();
      }
    }

    // 초기 필터링 (전체)
    state.filteredReports = [...state.reportsData];

    // UI 업데이트
    updateSummaryCards();
    renderReportList();

    showLoading(false);
  } catch (error) {
    console.error('❌ [Report Check] 데이터 로드 실패:', error);
    console.error('   에러 스택:', error.stack);
    showLoading(false);

    // 개발용: 목업 데이터 사용
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      state.reportsData = generateMockData();
      state.filteredReports = [...state.reportsData];
      updateSummaryCards();
      renderReportList();
    } else {
      showEmptyState(true);
    }
  }
}

/**
 * 거래처 목록 로드 및 드롭다운 채우기
 */
async function loadCompanies() {
  try {

    // 담당자별 거래처 조회 API 호출
    const response = await apiManager.getCompaniesByManager(state.currentUser.name);

    if (response.success) {
      state.companies = response.companies || [];

      // 거래처 드롭다운 채우기
      populateCompanyFilter();
    } else {
      console.warn('[Report Check] 거래처 목록 로드 실패:', response.message);
      state.companies = [];
    }
  } catch (error) {
    console.error('❌ [Report Check] 거래처 목록 로드 실패:', error);
    state.companies = [];
  }
}

/**
 * 거래처 필터 드롭다운 채우기
 */
function populateCompanyFilter() {
  if (!elements.filterCompany) {
    console.warn('[Report Check] 거래처 필터 요소 없음');
    return;
  }

  // 기존 옵션 제거 (전체 제외)
  elements.filterCompany.innerHTML = '<option value="">전체</option>';

  // 거래처명 기준 정렬
  const sortedCompanies = [...state.companies].sort((a, b) => {
    const nameA = getCompanyDisplayName(a);
    const nameB = getCompanyDisplayName(b);
    return nameA.localeCompare(nameB);
  });

  // 거래처 옵션 추가
  sortedCompanies.forEach(company => {
    const option = document.createElement('option');
    option.value = company.keyValue; // 거래처 ID
    option.textContent = getCompanyDisplayName(company);
    elements.filterCompany.appendChild(option);
  });

}

/**
 * API 데이터를 UI 형식으로 변환
 */
function transformReportsData(apiData) {

  if (!apiData || !Array.isArray(apiData)) {
    console.warn('[Report Check] 유효하지 않은 데이터:', apiData);
    return [];
  }

  return apiData.map((report, index) => {
    try {

      // ✅ FIX: 백엔드 실제 필드명에 맞춰 파싱
      // 백엔드는 targetProducts (JSON 문자열), activityNotes (JSON 문자열) 반환
      const targetProducts = parseJSON(report.targetProducts, []);
      const activityNotes = parseJSON(report.activityNotes, []);

      // 확인 데이터 파싱 (아직 백엔드에 없을 수 있음)
      const confirmationData = parseJSON(report.confirmationData, {
        collection: { entries: [] },
        sales: { entries: [] },
        activities: []
      });

      // 통화 및 제품명 추출
      const currency = targetProducts[0]?.currency || 'KRW';
      const productNames = targetProducts.map(p => p.name || p.productName).filter(Boolean).join(', ');

      const transformed = {
        reportId: report.reportId,
        type: report.reportType || 'weekly',
        companyId: report.companyId, // 거래처 ID (필터링용)
        companyName: report.companyName, // 거래처명 (표시용)
        submitDate: formatDate(report.submittedDate),
        completeDates: extractCompletionDates(confirmationData),
        status: determineStatusFromBackend(report, confirmationData),
        currency: currency, // 통화단위
        collection: {
          planned: parseFloat(report.targetCollectionAmount) || 0,
          actual: calculateActual(confirmationData.collection?.entries || []),
          entries: confirmationData.collection?.entries || [],
          currency: currency
        },
        sales: {
          planned: parseFloat(report.targetSalesAmount) || 0,
          actual: calculateActual(confirmationData.sales?.entries || []),
          entries: confirmationData.sales?.entries || [],
          products: targetProducts,
          productNames: productNames,
          currency: currency
        },
        activities: transformActivitiesFromBackend(activityNotes, confirmationData.activities || [])
      };

      return transformed;
    } catch (error) {
      console.error(`[Report Check] 보고서 #${index + 1} 변환 실패:`, error, report);
      // 실패한 보고서는 건너뛰지 않고 기본값으로 반환
      return {
        reportId: report.reportId || 'unknown',
        type: 'weekly',
        submitDate: formatDate(report.submittedDate),
        completeDates: [],
        status: 'incomplete',
        collection: { planned: 0, actual: 0, entries: [] },
        sales: { planned: 0, actual: 0, entries: [], products: [] },
        activities: []
      };
    }
  });
}

/**
 * 백엔드 데이터로부터 상태 결정
 */
function determineStatusFromBackend(report, confirmationData) {
  // 백엔드에서 status 필드가 있으면 사용 (임시저장/제출완료/승인/반려)
  // 아니면 확인 데이터 기반으로 계산
  if (report.status && report.status !== '임시저장') {
    // 백엔드 상태를 UI 상태로 매핑
    const statusMap = {
      '임시저장': 'incomplete',
      '제출완료': 'partial',
      '승인': 'completed',
      '반려': 'incomplete'
    };
    return statusMap[report.status] || 'incomplete';
  }

  // 확인 데이터로 상태 계산
  const collectionRate = calculateRate(
    calculateActual(confirmationData.collection?.entries || []),
    parseFloat(report.targetCollectionAmount) || 0
  );

  const salesRate = calculateRate(
    calculateActual(confirmationData.sales?.entries || []),
    parseFloat(report.targetSalesAmount) || 0
  );

  const activityNotes = parseJSON(report.activityNotes, []);
  const activityRate = calculateActivityRateFromNotes(activityNotes, confirmationData.activities || []);

  // 모두 100% 달성 → 완료
  if (collectionRate >= 100 && salesRate >= 100 && activityRate >= 100) {
    return 'completed';
  }

  // 하나라도 진행 → 일부완료
  if (collectionRate > 0 || salesRate > 0 || activityRate > 0) {
    return 'partial';
  }

  // 아무것도 없음 → 미완료
  return 'incomplete';
}

/**
 * 활동 노트로부터 활동 확인률 계산
 */
function calculateActivityRateFromNotes(activityNotes, confirmedActivities) {
  if (!activityNotes || activityNotes.length === 0) return 100;
  const confirmedCount = confirmedActivities.filter(c => c.confirmed).length;
  return (confirmedCount / activityNotes.length) * 100;
}

/**
 * 백엔드 활동 노트를 UI 형식으로 변환
 */
function transformActivitiesFromBackend(activityNotes = [], confirmedActivities = []) {
  if (!Array.isArray(activityNotes)) return [];

  return activityNotes.map((activity, index) => {
    const activityId = activity.id || `activity_${index}`;
    const confirmed = confirmedActivities.find(c => c.id === activityId);

    return {
      id: activityId,
      company: activity.company || activity.companyName || '미지정',
      content: activity.content || activity.description || activity.notes || '내용 없음',
      date: activity.date || activity.visitDate || '',
      confirmed: confirmed?.confirmed || false,
      confirmedDate: confirmed?.confirmedDate || null,
      note: confirmed?.note || ''
    };
  });
}

function parseJSON(jsonString, defaultValue = {}) {
  if (!jsonString) return defaultValue;
  try {
    return typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
  } catch (error) {
    console.error('JSON 파싱 에러:', error);
    return defaultValue;
  }
}

function extractCompletionDates(confirmationData) {
  const dates = new Set();

  // 수금 확정일
  if (confirmationData.collection?.entries) {
    confirmationData.collection.entries.forEach(entry => {
      if (entry.date) dates.add(entry.date);
    });
  }

  // 매출 확정일
  if (confirmationData.sales?.entries) {
    confirmationData.sales.entries.forEach(entry => {
      if (entry.date) dates.add(entry.date);
    });
  }

  // 활동 확인일
  if (confirmationData.activities) {
    confirmationData.activities.forEach(activity => {
      if (activity.confirmedDate) dates.add(activity.confirmedDate);
    });
  }

  return Array.from(dates).sort();
}

function calculateActual(entries) {
  if (!entries || !Array.isArray(entries)) return 0;
  return entries.reduce((sum, entry) => sum + (entry.amount || 0), 0);
}

// ✅ 이전 버전의 함수들 제거됨 (백엔드 데이터 구조에 맞게 재작성됨)
// - calculateSalesPlanned → 백엔드에서 targetSalesAmount 직접 사용
// - transformActivities → transformActivitiesFromBackend로 대체
// - determineStatus → determineStatusFromBackend로 대체
// - calculateActivityRate → calculateActivityRateFromNotes로 대체

// =====================================================
// 검색 및 필터링
// =====================================================
function handleSearch() {
  const typeFilter = elements.filterType.value;
  const companyFilter = elements.filterCompany.value;
  const statusFilter = elements.filterStatus.value;


  state.filteredReports = state.reportsData.filter(report => {
    const matchType = !typeFilter || report.type === typeFilter;
    const matchCompany = !companyFilter || report.companyId === companyFilter;
    const matchStatus = !statusFilter || report.status === statusFilter;
    return matchType && matchCompany && matchStatus;
  });

  updateSummaryCards();
  renderReportList();

  if (window.Toast) {
    window.Toast.success(`${state.filteredReports.length}건의 보고서를 찾았습니다`);
  }
}

function handleRefresh() {

  try {
    // 애니메이션 효과
    if (elements.btnRefresh) {
      elements.btnRefresh.style.transform = 'rotate(360deg)';
      elements.btnRefresh.style.transition = 'transform 0.6s ease';

      setTimeout(() => {
        elements.btnRefresh.style.transform = 'rotate(0deg)';
      }, 600);
    }

    // 필터 초기화
    if (elements.filterType) {
      elements.filterType.value = '';
    }
    if (elements.filterStatus) {
      elements.filterStatus.value = '';
    }

    // 데이터 리로드
    loadReportsData();

    // 토스트 알림
    if (window.Toast) {
      window.Toast.info('데이터를 새로고침했습니다');
    }

  } catch (error) {
    console.error('[Report Check] ❌ 새로고침 중 오류:', error);
    if (window.Toast) {
      window.Toast.error('새로고침 중 오류가 발생했습니다');
    }
  }
}

// =====================================================
// 통계 카드 업데이트
// =====================================================
function updateSummaryCards() {
  const stats = {
    total: state.filteredReports.length,
    completed: state.filteredReports.filter(r => r.status === 'completed').length,
    partial: state.filteredReports.filter(r => r.status === 'partial').length,
    incomplete: state.filteredReports.filter(r => r.status === 'incomplete').length
  };

  // 숫자 애니메이션 효과
  animateNumber(elements.totalCount, stats.total);
  animateNumber(elements.completedCount, stats.completed);
  animateNumber(elements.partialCount, stats.partial);
  animateNumber(elements.incompleteCount, stats.incomplete);
}

function animateNumber(element, targetValue) {
  const currentValue = parseInt(element.textContent) || 0;
  const duration = 500;
  const steps = 20;
  const increment = (targetValue - currentValue) / steps;
  let currentStep = 0;

  const timer = setInterval(() => {
    currentStep++;
    const newValue = Math.round(currentValue + (increment * currentStep));
    element.textContent = newValue;

    if (currentStep >= steps) {
      clearInterval(timer);
      element.textContent = targetValue;
    }
  }, duration / steps);
}

// =====================================================
// 보고서 리스트 렌더링
// =====================================================
function renderReportList() {
  elements.reportList.innerHTML = '';

  if (state.filteredReports.length === 0) {
    showEmptyState(true);
    return;
  }

  showEmptyState(false);

  state.filteredReports.forEach(report => {
    const reportElement = createReportElement(report);
    if (reportElement) {
      elements.reportList.appendChild(reportElement);
    } else {
      console.warn('[Report Check] 보고서 요소 생성 실패:', report.reportId);
    }
  });
}

function createReportElement(report) {
  const clone = elements.template.content.cloneNode(true);
  const reportItem = clone.querySelector('.report-item');

  if (!reportItem) {
    console.error('[Report Check] 템플릿에서 .report-item을 찾을 수 없습니다');
    return null;
  }

  // 데이터 속성 설정
  reportItem.dataset.reportId = report.reportId;

  // ✅ 보고서 ID 표시 (앞 8자리만)
  const reportIdEl = reportItem.querySelector('.report-id');
  if (reportIdEl) {
    reportIdEl.textContent = report.reportId.substring(0, 8);
  }

  // ✅ 보고서 유형 표시
  const reportTypeEl = reportItem.querySelector('.report-type');
  if (reportTypeEl) {
    const typeLabels = {
      'weekly': '주간',
      'monthly': '월간',
      'annual': '연간'
    };
    reportTypeEl.textContent = typeLabels[report.type] || report.type;
  }

  // ✅ 거래처명 표시
  const reportCompanyEl = reportItem.querySelector('.report-company');
  if (reportCompanyEl) {
    reportCompanyEl.textContent = report.companyName || '미지정';
  }

  // 기본 정보 - 제출일
  const submitDateEl = reportItem.querySelector('.submit-date');
  if (submitDateEl) {
    submitDateEl.textContent = report.submitDate;
  }

  // 완료일 (누적)
  const completeDatesContainer = reportItem.querySelector('.complete-dates');
  if (completeDatesContainer) {
    if (report.completeDates && report.completeDates.length > 0) {
      report.completeDates.forEach(date => {
        const dateSpan = document.createElement('span');
        dateSpan.className = 'complete-date-item';
        dateSpan.textContent = date;
        completeDatesContainer.appendChild(dateSpan);
      });
    } else {
      completeDatesContainer.innerHTML = '<span class="text-muted">미확정</span>';
    }
  }

  // 상태 배지
  const statusBadge = reportItem.querySelector('.status-badge');
  if (statusBadge) {
    statusBadge.className = `status-badge status-${report.status}`;
    statusBadge.textContent = getStatusLabel(report.status);
  }

  // 상세보기 버튼
  const btnToggle = reportItem.querySelector('.btn-toggle-detail');
  const detailSection = reportItem.querySelector('.report-detail');

  if (btnToggle) {
    btnToggle.addEventListener('click', () => {
      toggleReportDetail(reportItem, report, btnToggle, detailSection);
    });
  }

  // 삭제 버튼
  const btnDelete = reportItem.querySelector('.btn-delete-report');
  if (btnDelete) {
    btnDelete.addEventListener('click', (e) => {
      e.stopPropagation(); // 상세보기 토글 방지
      handleDeleteReport(reportItem, report);
    });
  }

  // 수금 실적 추가 버튼 (선택적 - 템플릿에 있을 수도 없을 수도 있음)
  const btnAddCollection = reportItem.querySelector('.btn-add-collection');
  if (btnAddCollection) {
    btnAddCollection.addEventListener('click', () => {
      handleAddCollection(reportItem, report);
    });
  }

  // 매출 실적 추가 버튼 (선택적)
  const btnAddSales = reportItem.querySelector('.btn-add-sales');
  if (btnAddSales) {
    btnAddSales.addEventListener('click', () => {
      handleAddSales(reportItem, report);
    });
  }

  // 활동 확인 버튼 (선택적)
  const btnConfirmActivity = reportItem.querySelector('.btn-confirm-activity');
  if (btnConfirmActivity) {
    btnConfirmActivity.addEventListener('click', (e) => {
      e.stopPropagation();
      handleConfirmActivity(reportItem, report);
    });
  }

  // ✅ 활동 실행 내용 글자수 카운터
  const executionContent = reportItem.querySelector('.execution-content');
  if (executionContent) {
    executionContent.addEventListener('input', (e) => {
      const charCount = reportItem.querySelector('.char-count');
      const charStatus = reportItem.querySelector('.char-status');
      const length = e.target.value.trim().length;

      if (charCount) charCount.textContent = length;

      if (charStatus) {
        if (length >= 15) {
          charStatus.textContent = '✅ (작성 완료)';
          charStatus.classList.remove('invalid');
          charStatus.classList.add('valid');
        } else {
          charStatus.textContent = '❌ (15자 이상 필요)';
          charStatus.classList.remove('valid');
          charStatus.classList.add('invalid');
        }
      }
    });
  }

  // ✅ NEW: 섹션별 접기/펼치기 버튼
  const sectionTitles = reportItem.querySelectorAll('.collapsible-section-title');
  sectionTitles.forEach(title => {
    title.addEventListener('click', (e) => {
      // 버튼 클릭 시에는 토글하지 않음
      if (e.target.closest('.btn-confirm-collection') ||
          e.target.closest('.btn-confirm-sales') ||
          e.target.closest('.btn-confirm-activity')) {
        return;
      }
      toggleSectionContent(title);
    });
  });

  // ✅ 수금 확인 버튼
  const btnConfirmCollection = reportItem.querySelector('.btn-confirm-collection');
  if (btnConfirmCollection) {
    btnConfirmCollection.addEventListener('click', (e) => {
      e.stopPropagation();
      handleConfirmCollection(reportItem, report);
    });
  }

  // ✅ 매출 확인 버튼
  const btnConfirmSales = reportItem.querySelector('.btn-confirm-sales');
  if (btnConfirmSales) {
    btnConfirmSales.addEventListener('click', (e) => {
      e.stopPropagation();
      handleConfirmSales(reportItem, report);
    });
  }

  // ✅ 수금 실적 추가 행 버튼 (+)
  const btnAddCollectionRow = reportItem.querySelector('.btn-add-collection-row');
  if (btnAddCollectionRow) {
    btnAddCollectionRow.addEventListener('click', () => {
      addDynamicCollectionRow(reportItem, report);
    });
  }

  // ✅ 매출 실적 추가 행 버튼 (+)
  const btnAddSalesRow = reportItem.querySelector('.btn-add-sales-row');
  if (btnAddSalesRow) {
    btnAddSalesRow.addEventListener('click', () => {
      addDynamicSalesRow(reportItem, report);
    });
  }

  return reportItem;
}

// =====================================================
// 섹션 토글 (2단계 아코디언)
// =====================================================
function toggleSectionContent(sectionTitle) {
  const sectionContent = sectionTitle.nextElementSibling;
  const isExpanded = sectionTitle.classList.contains('expanded');

  if (isExpanded) {
    // 접기
    sectionTitle.classList.remove('expanded');
    sectionContent.style.display = 'none';
  } else {
    // 펼치기
    sectionTitle.classList.add('expanded');
    sectionContent.style.display = 'block';
  }

}

// =====================================================
// 아코디언 토글
// =====================================================
function toggleReportDetail(reportItem, report, btnToggle, detailSection) {
  const isExpanded = detailSection.style.display === 'block';

  if (isExpanded) {
    // 접기
    detailSection.style.display = 'none';
    detailSection.classList.add('hidden');  // Add hidden class back for consistency
    btnToggle.innerHTML = '상세보기 <span class="toggle-icon">▼</span>';
    reportItem.classList.remove('expanded');
    state.expandedReportId = null;
  } else {
    // 다른 모든 아코디언 닫기
    document.querySelectorAll('.report-item.expanded').forEach(item => {
      const detail = item.querySelector('.report-detail');
      const btn = item.querySelector('.btn-toggle-detail');
      detail.style.display = 'none';
      detail.classList.add('hidden');  // Add hidden class back
      btn.innerHTML = '상세보기 <span class="toggle-icon">▼</span>';
      item.classList.remove('expanded');
    });

    // 현재 아코디언 열기
    // ✅ FIX: .hidden 클래스를 먼저 제거해야 display가 제대로 적용됨
    detailSection.classList.remove('hidden');  // Remove hidden class FIRST
    detailSection.style.display = 'block';     // Then set display
    btnToggle.innerHTML = '접기 <span class="toggle-icon">▲</span>';
    reportItem.classList.add('expanded');
    state.expandedReportId = report.reportId;

    // 상세 정보 로드
    loadReportDetails(reportItem, report);
  }
}

// =====================================================
// 동적 입력줄 추가
// =====================================================
function addDynamicCollectionRow(reportItem, report) {

  const container = reportItem.querySelector('.collection-section .dynamic-input-rows');
  if (!container) {
    console.error('[Report Check] 수금 동적 입력줄 컨테이너를 찾을 수 없습니다');
    return;
  }

  const newRow = document.createElement('div');
  newRow.className = 'grid-row grid-content-row dynamic-row';
  newRow.innerHTML = `
    <div class="grid-col-left"></div>
    <div class="grid-col-center">
      <input type="number" class="glass-input collection-amount-input"
             placeholder="금액" min="0" step="1">
      <input type="date" class="glass-input collection-date-input">
    </div>
    <div class="grid-col-right">
      <button class="btn-remove-row glass-button error-sm" title="삭제">🗑️</button>
    </div>
  `;

  // 삭제 버튼 이벤트
  const btnRemove = newRow.querySelector('.btn-remove-row');
  btnRemove.addEventListener('click', () => {
    newRow.remove();
  });

  container.appendChild(newRow);
}

function addDynamicSalesRow(reportItem, report) {

  const container = reportItem.querySelector('.sales-section .dynamic-input-rows');
  if (!container) {
    console.error('[Report Check] 매출 동적 입력줄 컨테이너를 찾을 수 없습니다');
    return;
  }

  const newRow = document.createElement('div');
  newRow.className = 'grid-row grid-content-row dynamic-row';
  newRow.innerHTML = `
    <div class="grid-col-left"></div>
    <div class="grid-col-center">
      <input type="number" class="glass-input sales-amount-input"
             placeholder="금액" min="0" step="1">
      <label class="vat-checkbox-inline">
        <input type="checkbox" class="vat-included"> VAT포함
      </label>
      <input type="date" class="glass-input sales-date-input">
    </div>
    <div class="grid-col-right">
      <button class="btn-remove-row glass-button error-sm" title="삭제">🗑️</button>
    </div>
  `;

  // 삭제 버튼 이벤트
  const btnRemove = newRow.querySelector('.btn-remove-row');
  btnRemove.addEventListener('click', () => {
    newRow.remove();
  });

  container.appendChild(newRow);
}

// =====================================================
// 상세 정보 로드
// =====================================================
function loadReportDetails(reportItem, report) {

  // ✅ 보고서 기본정보 섹션 채우기

  const detailReportId = reportItem.querySelector('.detail-report-id');
  if (detailReportId) {
    detailReportId.textContent = report.reportId;
  }

  const detailReportType = reportItem.querySelector('.detail-report-type');
  if (detailReportType) {
    const typeLabels = { 'weekly': '주간보고서', 'monthly': '월간보고서', 'annual': '연간보고서' };
    detailReportType.textContent = typeLabels[report.type] || report.type;
  }

  const detailCompany = reportItem.querySelector('.detail-company');
  if (detailCompany) {
    detailCompany.textContent = report.companyName || '미지정';
  }

  const detailEmployee = reportItem.querySelector('.detail-employee');
  if (detailEmployee) {
    detailEmployee.textContent = state.currentUser?.name || '알 수 없음';
  }

  const detailSubmitDate = reportItem.querySelector('.detail-submit-date');
  if (detailSubmitDate) {
    detailSubmitDate.textContent = report.submitDate;
  }

  const detailCompleteDates = reportItem.querySelector('.detail-complete-dates');
  if (detailCompleteDates) {
    if (report.completeDates && report.completeDates.length > 0) {
      detailCompleteDates.innerHTML = report.completeDates.map(date =>
        `<span class="complete-date-item">${date}</span>`
      ).join(', ');
    } else {
      detailCompleteDates.innerHTML = '<span class="text-muted">미확정</span>';
    }
  }

  const detailStatus = reportItem.querySelector('.detail-status');
  if (detailStatus) {
    detailStatus.textContent = getStatusLabel(report.status);
  }


  // ✅ 섹션 표시 (데이터가 있으면 표시) 및 자동 펼치기
  const collectionSection = reportItem.querySelector('.collection-section');
  const salesSection = reportItem.querySelector('.sales-section');
  const activitySection = reportItem.querySelector('.activity-section');

  if (collectionSection && report.collection && report.collection.planned > 0) {
    // ✅ FIX: .hidden 클래스를 먼저 제거해야 섹션이 보임
    collectionSection.classList.remove('hidden');
    collectionSection.style.display = 'block';
    // 섹션 자동 펼치기
    const collectionSectionTitle = collectionSection.querySelector('.collapsible-section-title');
    const collectionSectionContent = collectionSectionTitle?.nextElementSibling;
    if (collectionSectionContent) {
      collectionSectionContent.classList.remove('hidden');
      collectionSectionContent.style.display = 'block';
      collectionSectionTitle.classList.add('expanded');
    }
  }

  if (salesSection && report.sales && report.sales.planned > 0) {
    // ✅ FIX: .hidden 클래스를 먼저 제거해야 섹션이 보임
    salesSection.classList.remove('hidden');
    salesSection.style.display = 'block';
    // 섹션 자동 펼치기
    const salesSectionTitle = salesSection.querySelector('.collapsible-section-title');
    const salesSectionContent = salesSectionTitle?.nextElementSibling;
    if (salesSectionContent) {
      salesSectionContent.classList.remove('hidden');
      salesSectionContent.style.display = 'block';
      salesSectionTitle.classList.add('expanded');
    }
  }

  if (activitySection && report.activities && report.activities.length > 0) {
    // ✅ FIX: .hidden 클래스를 먼저 제거해야 섹션이 보임
    activitySection.classList.remove('hidden');
    activitySection.style.display = 'block';
    // 활동 섹션도 자동 펼치기
    const activitySectionTitle = activitySection.querySelector('.collapsible-section-title');
    const activitySectionContent = activitySectionTitle?.nextElementSibling;
    if (activitySectionContent) {
      activitySectionContent.classList.remove('hidden');
      activitySectionContent.style.display = 'block';
      activitySectionTitle.classList.add('expanded');
    }
  }

  const planCollectionEl = reportItem.querySelector('.plan-collection-amount');
  if (planCollectionEl) {
    const formattedValue = formatNumber(report.collection.planned);
    planCollectionEl.textContent = formattedValue;
  }

  // ✅ 통화단위 표시
  const collectionCurrencyEls = reportItem.querySelectorAll('.collection-currency-display');
  collectionCurrencyEls.forEach(el => {
    el.textContent = report.collection.currency || 'KRW';
  });

  // ✅ 미이행 금액 계산 및 표시
  const collectionRemaining = report.collection.planned - report.collection.actual;
  const collectionRemainingEl = reportItem.querySelector('.collection-remaining-amount');
  if (collectionRemainingEl) {
    const formattedValue = formatNumber(collectionRemaining);
    collectionRemainingEl.textContent = formattedValue;
  }

  // 기존 수금 실적 표시
  const collectionItemsEl = reportItem.querySelector('.collection-actual-items');
  if (collectionItemsEl) {
    renderActualItems(collectionItemsEl, report.collection.entries, 'collection', report);
  }

  const planSalesEl = reportItem.querySelector('.plan-sales-total');
  if (planSalesEl) {
    const formattedValue = formatNumber(report.sales.planned);
    planSalesEl.textContent = formattedValue;
  }

  // ✅ 미이행 금액 계산 및 표시
  const salesRemaining = report.sales.planned - report.sales.actual;
  const salesRemainingEl = reportItem.querySelector('.sales-remaining-amount');
  if (salesRemainingEl) {
    const formattedValue = formatNumber(salesRemaining);
    salesRemainingEl.textContent = formattedValue;
  }

  // ✅ 매출 통화단위 표시
  const salesCurrencyEls = reportItem.querySelectorAll('.sales-currency-display');
  salesCurrencyEls.forEach(el => {
    el.textContent = report.sales.currency || 'KRW';
  });

  // ✅ 매출 제품명 표시 (헤더에 표시)
  const salesProductNamesHeaderEl = reportItem.querySelector('.sales-product-names-header');
  if (salesProductNamesHeaderEl && report.sales.productNames) {
    salesProductNamesHeaderEl.textContent = report.sales.productNames;
  }

  // 기존 매출 실적 표시
  const salesItemsEl = reportItem.querySelector('.sales-actual-items');
  if (salesItemsEl) {
    renderActualItems(salesItemsEl, report.sales.entries, 'sales', report);
  }

  const activityItems = reportItem.querySelector('.activity-items');
  if (activityItems) {
    activityItems.innerHTML = '';

    if (report.activities && report.activities.length > 0) {
      report.activities.forEach((activity, index) => {
        const activityCard = createActivityCard(activity);
        activityItems.appendChild(activityCard);
      });
    } else {
      // ✅ 빈 컨테이너만 표시 (메시지 제거)
      activityItems.innerHTML = '';
    }
  }

  // ✅ 헤더 상태 업데이트
  updateSectionStatuses(reportItem, report);

}

// =====================================================
// 섹션 상태 업데이트 (헤더에 표시)
// =====================================================
function updateSectionStatuses(reportItem, report) {
  // 수금액 상태
  const collectionStatus = getStatus(report.collection.entries, report.collection.actual, report.collection.planned);
  const collectionStatusEl = reportItem.querySelector('.collection-status-text');
  if (collectionStatusEl) {
    collectionStatusEl.textContent = collectionStatus;
  }

  // 매출액 상태
  const salesStatus = getStatus(report.sales.entries, report.sales.actual, report.sales.planned);
  const salesStatusEl = reportItem.querySelector('.sales-status-text');
  if (salesStatusEl) {
    salesStatusEl.textContent = salesStatus;
  }

  // 영업활동 상태
  const activityConfirmations = report.activityConfirmation?.length || 0;
  const activityStatus = activityConfirmations > 0 ? '완료' : '미확인';
  const activityStatusEl = reportItem.querySelector('.activity-status-text');
  if (activityStatusEl) {
    activityStatusEl.textContent = activityStatus;
  }
}

function getStatus(entries, actual, planned) {
  if (!entries || entries.length === 0) {
    return '미확인';
  }
  if (actual < planned) {
    return '일부완료';
  }
  return '완료';
}

function renderActualItems(container, entries, type, report) {

  if (!container) {
    console.error('[Report Check] ❌ renderActualItems: container가 null입니다');
    return;
  }

  container.innerHTML = '';

  if (!entries || entries.length === 0) {
    // ✅ 빈 컨테이너만 표시 (메시지 제거)
    return;
  }

  entries.forEach((entry, index) => {
    const item = document.createElement('div');
    item.className = 'actual-item glass-card';

    const displayContent = type === 'sales'
      ? `${entry.product || '미지정'} - ${formatNumber(entry.amount)}원`
      : `${formatNumber(entry.amount)}원`;

    item.innerHTML = `
      <div class="actual-item-info">
        <span class="actual-item-number">#${index + 1}</span>
        <span class="actual-item-amount">${displayContent}</span>
        <span class="actual-item-date">확정일: ${entry.date}</span>
      </div>
      <button class="btn-remove-actual glass-button danger" data-index="${index}">
        🗑️ 삭제
      </button>
    `;

    // 삭제 버튼 이벤트
    item.querySelector('.btn-remove-actual').addEventListener('click', async (e) => {
      if (!confirm('이 실적을 삭제하시겠습니까?')) return;

      const idx = parseInt(e.target.dataset.index);
      entries.splice(idx, 1);

      // 누적 금액 재계산
      if (type === 'collection') {
        report.collection.actual = calculateActual(entries);
      } else {
        report.sales.actual = calculateActual(entries);
      }

      // 상태 업데이트
      updateReportStatus(report);

      // UI 재렌더링
      const reportItem = container.closest('.report-item');
      loadReportDetails(reportItem, report);

      // 서버 저장
      await saveReportData(report);

      if (window.Toast) {
        window.Toast.success('실적이 삭제되었습니다');
      }
    });

    container.appendChild(item);
  });
}

function createActivityCard(activity) {
  const card = document.createElement('div');
  card.className = 'activity-card';
  card.style.cssText = 'padding: 15px; margin-bottom: 10px; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; background: rgba(255,255,255,0.05);';

  card.innerHTML = `
    <div class="activity-body">
      <p style="margin: 0; white-space: pre-wrap;">${activity.content || activity.activityNotes || ''}</p>
    </div>
  `;

  return card;
}

// =====================================================
// 수금 실적 추가
// =====================================================
async function handleAddCollection(reportItem, report) {

  const amountInput = reportItem.querySelector('.actual-collection-amount');
  const dateInput = reportItem.querySelector('.actual-collection-date');


  const amount = parseFloat(amountInput.value);
  const date = dateInput.value;


  // 유효성 검사
  if (!amount || amount <= 0) {
    console.warn('[Report Check] 금액 검증 실패:', amount);
    if (window.Toast) window.Toast.warning('실적금액을 입력해주세요');
    amountInput.focus();
    return;
  }

  if (!date) {
    console.warn('[Report Check] 날짜 검증 실패:', date);
    if (window.Toast) window.Toast.warning('수금일을 선택해주세요');
    dateInput.focus();
    return;
  }


  // 실적 추가
  if (!report.collection.entries) {
    report.collection.entries = [];
  }

  report.collection.entries.push({
    amount: amount,
    date: date,
    registeredAt: new Date().toISOString()
  });

  // 누적 금액 업데이트
  report.collection.actual += amount;

  // 완료일 추가
  if (!report.completeDates) {
    report.completeDates = [];
  }
  if (!report.completeDates.includes(date)) {
    report.completeDates.push(date);
    report.completeDates.sort();
  }

  // 입력 필드 초기화
  amountInput.value = '';
  dateInput.value = '';

  // 상태 업데이트
  updateReportStatus(report);


  // ✅ CRITICAL: 섹션이 접혀있을 수 있으므로 강제로 펼치기
  const collectionSectionTitle = reportItem.querySelector('.collapsible-section-title[data-section="collection"]');
  const collectionSectionContent = collectionSectionTitle?.nextElementSibling;


  if (collectionSectionContent) {
    const isContentVisible = collectionSectionContent.style.display !== 'none';

    if (!isContentVisible) {
      collectionSectionContent.style.display = 'block';
      if (collectionSectionTitle) {
        collectionSectionTitle.classList.add('expanded');
      }
    }
  }

  // ✅ UI 업데이트 - 실적 리스트만 업데이트
  const collectionItemsEl = reportItem.querySelector('.collection-actual-items');

  if (collectionItemsEl) {
    renderActualItems(collectionItemsEl, report.collection.entries, 'collection', report);
  } else {
    console.error('[Report Check] ❌ collection-actual-items 요소를 찾을 수 없음');
  }

  // ✅ 미이행 금액 업데이트
  const collectionRemaining = report.collection.planned - report.collection.actual;
  const collectionRemainingEl = reportItem.querySelector('.collection-remaining-amount');

  if (collectionRemainingEl) {
    collectionRemainingEl.textContent = formatNumber(collectionRemaining);
  } else {
    console.error('[Report Check] ❌ collection-remaining-amount 요소를 찾을 수 없음');
  }

  updateCompleteDates(reportItem, report);

  // 서버 저장
  await saveReportData(report);

  // 성공 피드백
  if (window.Toast) {
    window.Toast.success('✅ 수금 실적이 추가되었습니다');
  }

}

// =====================================================
// 매출 실적 추가
// =====================================================
async function handleAddSales(reportItem, report) {
  const productSelect = reportItem.querySelector('.actual-sales-product');
  const amountInput = reportItem.querySelector('.actual-sales-amount');
  const dateInput = reportItem.querySelector('.actual-sales-date');

  const product = productSelect.value;
  const amount = parseFloat(amountInput.value);
  const date = dateInput.value;

  // 유효성 검사
  if (!product) {
    if (window.Toast) window.Toast.warning('제품을 선택해주세요');
    productSelect.focus();
    return;
  }

  if (!amount || amount <= 0) {
    if (window.Toast) window.Toast.warning('실적금액을 입력해주세요');
    amountInput.focus();
    return;
  }

  if (!date) {
    if (window.Toast) window.Toast.warning('매출일을 선택해주세요');
    dateInput.focus();
    return;
  }

  // 실적 추가
  if (!report.sales.entries) {
    report.sales.entries = [];
  }

  report.sales.entries.push({
    product: product,
    amount: amount,
    date: date,
    registeredAt: new Date().toISOString()
  });

  // 누적 금액 업데이트
  report.sales.actual += amount;

  // 완료일 추가
  if (!report.completeDates) {
    report.completeDates = [];
  }
  if (!report.completeDates.includes(date)) {
    report.completeDates.push(date);
    report.completeDates.sort();
  }

  // 입력 필드 초기화
  productSelect.selectedIndex = 0;
  amountInput.value = '';
  dateInput.value = '';

  // 상태 업데이트
  updateReportStatus(report);

  // ✅ CRITICAL: 섹션이 접혀있을 수 있으므로 강제로 펼치기
  const salesSectionTitle = reportItem.querySelector('.collapsible-section-title[data-section="sales"]');
  const salesSectionContent = salesSectionTitle?.nextElementSibling;

  if (salesSectionContent && salesSectionContent.style.display === 'none') {
    salesSectionContent.style.display = 'block';
    if (salesSectionTitle) {
      salesSectionTitle.classList.add('expanded');
    }
  }

  // ✅ UI 업데이트 - 실적 리스트만 업데이트
  const salesItemsEl = reportItem.querySelector('.sales-actual-items');
  if (salesItemsEl) {
    renderActualItems(salesItemsEl, report.sales.entries, 'sales', report);
  }

  // ✅ 미이행 금액 업데이트
  const salesRemaining = report.sales.planned - report.sales.actual;
  const salesRemainingEl = reportItem.querySelector('.sales-remaining-amount');
  if (salesRemainingEl) {
    salesRemainingEl.textContent = formatNumber(salesRemaining);
  }

  updateCompleteDates(reportItem, report);

  // 서버 저장
  await saveReportData(report);

  // 성공 피드백
  if (window.Toast) {
    window.Toast.success('✅ 매출 실적이 추가되었습니다');
  }
}

// =====================================================
// 활동 확인
// =====================================================
async function handleConfirmActivity(reportItem, report) {
  // 실행 여부 체크
  const executedRadio = reportItem.querySelector('input[name="activity-executed"]:checked');
  if (!executedRadio) {
    alert('실행 또는 미실행을 선택해주세요');
    return;
  }

  const isExecuted = executedRadio.value === 'yes';

  // 실행 내용 검증 (15자 이상)
  const executionContent = reportItem.querySelector('.execution-content').value.trim();
  if (executionContent.length < 15) {
    alert('실행 내용을 15자 이상 작성해주세요');
    return;
  }

  // 활동 데이터 저장
  if (!report.activityConfirmation) {
    report.activityConfirmation = [];
  }

  report.activityConfirmation.push({
    executed: isExecuted,
    content: executionContent,
    confirmedDate: new Date().toISOString().split('T')[0],
    confirmed: true
  });

  // 입력 필드 초기화
  reportItem.querySelectorAll('input[name="activity-executed"]').forEach(radio => radio.checked = false);
  reportItem.querySelector('.execution-content').value = '';
  const charCount = reportItem.querySelector('.char-count');
  if (charCount) charCount.textContent = '0';

  // 상태 업데이트
  updateReportStatus(report);

  // UI 업데이트
  loadReportDetails(reportItem, report);

  // 서버 저장
  await saveReportData(report);

  // 성공 피드백
  if (window.Toast) {
    window.Toast.success('✅ 활동이 확인되었습니다');
  } else {
    alert('✅ 활동이 확인되었습니다');
  }
}

// =====================================================
// 보고서 상태 업데이트
// =====================================================
function updateReportStatus(report) {
  // 수금 달성률
  const collectionRate = calculateRate(report.collection.actual, report.collection.planned);

  // 매출 달성률
  const salesRate = calculateRate(report.sales.actual, report.sales.planned);

  // 활동 확인 여부
  const hasActivityConfirmation = (report.activityConfirmation?.length || 0) > 0;

  // 전체 완료 상태 판단
  const previousStatus = report.status;

  if (collectionRate >= 100 && salesRate >= 100 && hasActivityConfirmation) {
    report.status = 'completed';
  } else if (collectionRate > 0 || salesRate > 0 || hasActivityConfirmation) {
    report.status = 'partial';
  } else {
    report.status = 'incomplete';
  }

  // 상태가 변경되었으면 통계 카드 업데이트
  if (previousStatus !== report.status) {
    updateSummaryCards();

    // 상태 배지 업데이트
    const reportItem = document.querySelector(`.report-item[data-report-id="${report.reportId}"]`);
    if (reportItem) {
      const statusBadge = reportItem.querySelector('.status-badge');
      statusBadge.className = `status-badge status-${report.status}`;
      statusBadge.textContent = getStatusLabel(report.status);
    }
  }
}

/**
 * 완료일 UI 업데이트
 */
function updateCompleteDates(reportItem, report) {
  const completeDatesContainer = reportItem.querySelector('.complete-dates');
  completeDatesContainer.innerHTML = '';

  if (report.completeDates && report.completeDates.length > 0) {
    report.completeDates.forEach(date => {
      const dateSpan = document.createElement('span');
      dateSpan.className = 'complete-date-item';
      dateSpan.textContent = date;
      completeDatesContainer.appendChild(dateSpan);
    });
  } else {
    completeDatesContainer.innerHTML = '<span class="text-muted">미확정</span>';
  }
}

// =====================================================
// 데이터 저장
// =====================================================
async function saveReportData(report) {
  try {

    // 확인 데이터 구조화
    const confirmationData = {
      collection: {
        entries: report.collection.entries
      },
      sales: {
        entries: report.sales.entries
      },
      activities: report.activities.filter(a => a.confirmed)
    };

    // API 호출
    // ✅ 누적 실적 금액도 함께 전송 (DB의 actualCollectionAmount, actualSalesAmount에 저장됨)
    const response = await apiManager.updateReportConfirmation(report.reportId, {
      status: report.status,

      // 누적 금액 (집계용)
      actualCollectionAmount: report.collection.actual,
      actualSalesAmount: report.sales.actual,

      // 상세 내역 (JSON)
      confirmationData: JSON.stringify(confirmationData),

      processedBy: state.currentUser.name,
      processedDate: new Date().toISOString()
    });

    if (response.success) {
      return true;
    } else {
      throw new Error(response.message || '저장 실패');
    }
  } catch (error) {
    console.error('[Report Check] 보고서 저장 에러:', error);
    if (window.Toast) {
      window.Toast.error('저장에 실패했습니다: ' + error.message);
    }
    return false;
  }
}

// =====================================================
// 보고서 삭제 처리
// =====================================================
async function handleDeleteReport(reportItem, report) {
  try {

    // 삭제 확인 메시지
    const confirmMsg = `정말로 이 보고서를 삭제하시겠습니까?\n\n` +
      `보고서 ID: ${report.reportId}\n` +
      `거래처: ${report.companyName || '미지정'}\n` +
      `제출일: ${report.submitDate}\n\n` +
      `⚠️ 삭제된 보고서는 복구할 수 없습니다.`;

    if (!confirm(confirmMsg)) {
      return;
    }


    // API 호출로 보고서 삭제
    const response = await apiManager.deleteReport(report.reportId);

    if (response.success) {

      // UI에서 보고서 제거
      reportItem.style.animation = 'fadeOut 0.3s ease';
      setTimeout(() => {
        reportItem.remove();
      }, 300);

      // 상태 데이터에서 제거
      state.reportsData = state.reportsData.filter(r => r.reportId !== report.reportId);
      state.filteredReports = state.filteredReports.filter(r => r.reportId !== report.reportId);

      // 통계 카드 업데이트
      updateSummaryCards();

      // 리스트가 비었으면 빈 상태 표시
      if (state.filteredReports.length === 0) {
        showEmptyState(true);
      }

      // 성공 피드백
      if (window.Toast) {
        window.Toast.success('✅ 보고서가 삭제되었습니다.');
      } else {
        alert('✅ 보고서가 삭제되었습니다.');
      }
    } else {
      throw new Error(response.message || '삭제 실패');
    }
  } catch (error) {
    console.error('[Report Check] 보고서 삭제 에러:', error);
    if (window.Toast) {
      window.Toast.error('삭제에 실패했습니다: ' + error.message);
    } else {
      alert('❌ 삭제에 실패했습니다: ' + error.message);
    }
  }
}

// =====================================================
// 수금 확인 처리
// =====================================================
async function handleConfirmCollection(reportItem, report) {
  try {

    // 입력된 실적이 있는지 확인
    if (!report.collection.entries || report.collection.entries.length === 0) {
      if (window.Toast) {
        window.Toast.warning('입력된 수금 실적이 없습니다.');
      }
      return;
    }

    // 확인 메시지
    const confirmMsg = `총 ${report.collection.entries.length}건의 수금 실적을 확인하시겠습니까?\n\n` +
      `계획 금액: ${formatNumber(report.collection.planned)}원\n` +
      `누적 실적: ${formatNumber(report.collection.actual)}원\n` +
      `미이행 금액: ${formatNumber(report.collection.planned - report.collection.actual)}원`;

    if (!confirm(confirmMsg)) {
      return;
    }

    // 상태 업데이트
    updateReportStatus(report);

    // 서버 저장
    const saved = await saveReportData(report);

    if (saved) {
      if (window.Toast) {
        window.Toast.success('✅ 수금 실적이 확인되었습니다.');
      }
    }
  } catch (error) {
    console.error('[Report Check] 수금 확인 처리 에러:', error);
    if (window.Toast) {
      window.Toast.error('확인 처리 중 오류가 발생했습니다.');
    }
  }
}

// =====================================================
// 매출 확인 처리
// =====================================================
async function handleConfirmSales(reportItem, report) {
  try {

    // 입력된 실적이 있는지 확인
    if (!report.sales.entries || report.sales.entries.length === 0) {
      if (window.Toast) {
        window.Toast.warning('입력된 매출 실적이 없습니다.');
      }
      return;
    }

    // 확인 메시지
    const confirmMsg = `총 ${report.sales.entries.length}건의 매출 실적을 확인하시겠습니까?\n\n` +
      `계획 금액: ${formatNumber(report.sales.planned)}원\n` +
      `누적 실적: ${formatNumber(report.sales.actual)}원\n` +
      `미이행 금액: ${formatNumber(report.sales.planned - report.sales.actual)}원`;

    if (!confirm(confirmMsg)) {
      return;
    }

    // 상태 업데이트
    updateReportStatus(report);

    // 서버 저장
    const saved = await saveReportData(report);

    if (saved) {
      if (window.Toast) {
        window.Toast.success('✅ 매출 실적이 확인되었습니다.');
      }
    }
  } catch (error) {
    console.error('[Report Check] 매출 확인 처리 에러:', error);
    if (window.Toast) {
      window.Toast.error('확인 처리 중 오류가 발생했습니다.');
    }
  }
}

// =====================================================
// 유틸리티 함수
// =====================================================
function calculateRate(actual, planned) {
  if (!planned || planned === 0) return 0;
  return (actual / planned) * 100;
}

function getStatusLabel(status) {
  const labels = {
    completed: '완료',
    partial: '일부완료',
    incomplete: '미완료'
  };
  return labels[status] || '미확인';
}

function showLoading(show) {
  elements.loadingState.style.display = show ? 'flex' : 'none';
  elements.reportList.style.display = show ? 'none' : 'block';
}

function showEmptyState(show) {
  elements.emptyState.style.display = show ? 'flex' : 'none';
  elements.reportList.style.display = show ? 'none' : 'block';
}

function generateId() {
  return 'A' + Date.now() + Math.random().toString(36).substr(2, 9);
}

// =====================================================
// 목업 데이터 생성 (개발용)
// =====================================================
function generateMockData() {
  return [
    {
      id: 'R001',
      type: 'weekly',
      submitDate: '2025-10-01',
      completeDates: ['2025-10-02', '2025-10-05'],
      status: 'completed',
      collection: {
        planned: 5000000,
        actual: 5200000,
        entries: [
          { amount: 3000000, date: '2025-10-02' },
          { amount: 2200000, date: '2025-10-05' }
        ]
      },
      sales: {
        planned: 8000000,
        actual: 8500000,
        products: [
          { name: 'Product A', totalPrice: 5000000 },
          { name: 'Product B', totalPrice: 3000000 }
        ],
        entries: [
          { product: 'Product A', amount: 5000000, date: '2025-10-02' },
          { product: 'Product B', amount: 3500000, date: '2025-10-05' }
        ]
      },
      activities: [
        {
          id: 'A001',
          company: '거래처 A',
          content: '제품 데모 및 상담',
          date: '2025-09-28',
          confirmed: true,
          confirmedDate: '2025-10-02'
        },
        {
          id: 'A002',
          company: '거래처 B',
          content: '견적서 제출',
          date: '2025-09-30',
          confirmed: true,
          confirmedDate: '2025-10-05'
        }
      ]
    },
    {
      id: 'R002',
      type: 'weekly',
      submitDate: '2025-10-08',
      completeDates: ['2025-10-09'],
      status: 'partial',
      collection: {
        planned: 3000000,
        actual: 1500000,
        entries: [
          { amount: 1500000, date: '2025-10-09' }
        ]
      },
      sales: {
        planned: 6000000,
        actual: 3000000,
        products: [
          { name: 'Product A', totalPrice: 6000000 }
        ],
        entries: [
          { product: 'Product A', amount: 3000000, date: '2025-10-09' }
        ]
      },
      activities: [
        {
          id: 'A003',
          company: '거래처 C',
          content: '신규 거래처 방문',
          date: '2025-10-05',
          confirmed: true,
          confirmedDate: '2025-10-09'
        },
        {
          id: 'A004',
          company: '거래처 D',
          content: '계약 협의',
          date: '2025-10-07',
          confirmed: false
        }
      ]
    },
    {
      id: 'R003',
      type: 'monthly',
      submitDate: '2025-09-30',
      completeDates: [],
      status: 'incomplete',
      collection: {
        planned: 15000000,
        actual: 0,
        entries: []
      },
      sales: {
        planned: 25000000,
        actual: 0,
        products: [
          { name: 'Product A', totalPrice: 15000000 },
          { name: 'Product B', totalPrice: 10000000 }
        ],
        entries: []
      },
      activities: [
        {
          id: 'A005',
          company: '거래처 E',
          content: '정기 미팅',
          date: '2025-09-25',
          confirmed: false
        }
      ]
    }
  ];
}

// =====================================================
// CSS 애니메이션 (동적 추가)
// =====================================================
const style = document.createElement('style');
style.textContent = `
  .actual-item {
    animation: fadeInUp 0.3s ease;
  }

  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .report-item.expanded {
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
  }

  .btn-remove-actual {
    padding: 6px 12px;
    font-size: 12px;
  }
`;
document.head.appendChild(style);
