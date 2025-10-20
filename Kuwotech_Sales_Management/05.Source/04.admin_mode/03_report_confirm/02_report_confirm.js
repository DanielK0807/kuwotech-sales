/**
 * ============================================
 * 관리자모드 - 실적보고서 확인 (Admin Report Confirmation)
 * ============================================
 * Railway 데이터베이스 연동 - 실제 데이터 사용
 *
 * 기능:
 * 1. 금주 실적보고서 제출현황 표시
 * 2. 보고서 상태별 필터링 (미실행/일부완료/완료)
 * 3. 금주 보고서 우선 표시
 * 4. 보고서 상세 보기
 * 5. 관리자 의견 작성 및 저장
 */

import ApiManager from '../../01.common/13_api_manager.js';
import { USER_ROLES, STATUS_MAP, REPORT_TYPE_MAP } from '../../01.common/05_constants.js';
import { formatCurrency, formatDate } from '../../01.common/03_format.js';
import { getCompanyDisplayName } from '../../01.common/02_utils.js';
import { bindAmountFormatting } from '../../08.components/09_amount_formatter.js';
import logger from '../../01.common/23_logger.js';
import AutocompleteManager from '../../01.common/25_autocomplete_manager.js';
import { showToast } from '../../01.common/10_index.js';

// ============================================
// 전역 변수 및 상수
// ============================================
const apiManager = ApiManager.getInstance();

let allReports = [];           // 전체 보고서 데이터
let allEmployees = [];         // 전체 직원 데이터
let allCompanies = [];         // 전체 거래처 데이터
let currentFilter = 'incomplete'; // 현재 선택된 필터 (기본: 미실행)
let selectedReportId = null;   // 현재 선택된 보고서 ID
let selectedCompanyForReport = null;  // 현재 선택된 거래처
let isCompanyVerified = false; // 거래처 확인 여부
let isInitializing = false;    // 초기화 진행 중 플래그 (중복 방지)
let isEventListenersAttached = false; // 이벤트 리스너 등록 여부

// ============================================
// 유틸리티 함수
// ============================================

/**
 * 금주의 시작일과 종료일을 반환
 */
function getCurrentWeekRange() {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // 월요일 기준

    const monday = new Date(now.setDate(diff));
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    return { start: monday, end: sunday };
}

/**
 * 날짜가 금주 범위 내에 있는지 확인
 */
function isThisWeek(dateString) {
    if (!dateString) return false;

    const date = new Date(dateString);
    const { start, end } = getCurrentWeekRange();

    return date >= start && date <= end;
}

/**
 * 보고서 상태 계산 (실제 로직)
 */
function calculateReportStatus(report) {
    // PRIORITY: Check DB status first
    // "임시저장" = temporary save = not submitted = incomplete
    if (report.status === '임시저장') {
        return 'incomplete';
    }

    // Only calculate from field values if report was submitted
    const hasCollection = report.targetCollectionAmount && report.targetCollectionAmount > 0;
    const hasSales = report.targetSalesAmount && report.targetSalesAmount > 0;
    const hasProducts = report.targetProducts && report.targetProducts.trim().length > 0;

    const completedCount = [hasCollection, hasSales, hasProducts].filter(Boolean).length;

    if (completedCount === 0) return 'incomplete';
    if (completedCount === 3) return 'complete';
    return 'partial';
}

/**
 * 상태 배지 HTML 생성
 */
function getStatusBadgeHTML(status) {
    const badgeMap = {
        incomplete: '<span class="status-badge incomplete">❌ 미실행</span>',
        partial: '<span class="status-badge partial">⚠️ 일부완료</span>',
        complete: '<span class="status-badge complete">✅ 완료</span>'
    };
    return badgeMap[status] || badgeMap.partial;
}

// ============================================
// 데이터 로드 함수
// ============================================

/**
 * 전체 보고서 데이터 로드
 */
async function loadReports() {
    showLoading(true);

    try {
        // 타임아웃 추가 (30초)
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('API 호출 타임아웃 (30초)')), 30000);
        });

        const response = await Promise.race([
            apiManager.getReports(),
            timeoutPromise
        ]);

        // API 응답 처리
        let reportsData = [];

        if (Array.isArray(response)) {
            // 배열로 직접 옴
            reportsData = response;
        } else if (response && Array.isArray(response.reports)) {
            // { success: true, reports: [...] } 형식
            reportsData = response.reports;
        } else if (response && response.data && Array.isArray(response.data.reports)) {
            // { success: true, data: { reports: [...] } } 형식 (중첩)
            reportsData = response.data.reports;
        } else if (response && Array.isArray(response.data)) {
            // { success: true, data: [...] } 형식
            reportsData = response.data;
        } else if (response && typeof response === 'object') {
            // 객체인 경우 모든 키 확인
            logger.warn('⚠️ 응답 형식이 예상과 다름');
            const keys = Object.keys(response);

            // 각 키의 값이 배열인지 확인
            for (const key of keys) {
                if (Array.isArray(response[key])) {
                    reportsData = response[key];
                    break;
                }
            }

            if (reportsData.length === 0) {
                logger.error('❌ 배열 데이터를 찾을 수 없음');
            }
        } else {
            logger.error('❌ 알 수 없는 응답 형식');
            reportsData = [];
        }

        allReports = reportsData.map(report => ({
            ...report,
            calculatedStatus: calculateReportStatus(report)
        }));

        return true;
    } catch (error) {
        logger.error('❌ 보고서 로드 에러:', error);
        logger.error('에러 이름:', error.name);
        logger.error('에러 메시지:', error.message);
        logger.error('에러 스택:', error.stack);

        // HTTP 에러 상세 정보
        if (error.status) {
            logger.error(`❌ HTTP ${error.status} 에러:`, error.statusText);
            logger.error('에러 응답 데이터:', error.data);
        }

        alert('보고서 데이터를 불러오는데 실패했습니다:\n' + error.message + '\n\n브라우저 콘솔(F12)에서 상세 정보를 확인하세요.');
        return false;
    } finally {
        // CRITICAL: 에러 발생 시에도 로딩 해제 보장
        showLoading(false);
    }
}

/**
 * 전체 직원 데이터 로드
 */
async function loadEmployees() {
    try {
        // 역할별 직원 조회 API 사용 (관리자 권한 불필요)
        const response = await apiManager.getEmployeesByRole(USER_ROLES.SALES);

        if (response.success && response.data && Array.isArray(response.data.employees)) {
            // API 응답 형식: { success, data: { role, count, employees: [...] } }
            allEmployees = response.data.employees.map(emp => ({
                name: emp.name,
                role1: USER_ROLES.SALES,
                department: emp.department,
                canUploadExcel: emp.canUploadExcel
            }));
        } else {
            logger.warn('⚠️ 직원 데이터 형식 오류, 보고서에서 추출');
            extractEmployeesFromReports();
        }

        return true;
    } catch (error) {
        logger.error('❌ 직원 로드 에러:', error);
        // 직원 데이터 로드 실패시 보고서에서 추출
        extractEmployeesFromReports();
        return true;
    }
}

/**
 * 보고서에서 직원 정보 추출 (fallback)
 * 보고서를 제출한 사람은 모두 영업담당으로 간주
 */
function extractEmployeesFromReports() {
    const uniqueNames = [...new Set(allReports.map(r => r.submittedBy))];
    allEmployees = uniqueNames.map(name => ({
        name,
        role1: USER_ROLES.SALES  // 보고서 제출자는 영업담당으로 간주
    }));
}

/**
 * 전체 거래처 데이터 로드
 */
async function loadCompanies() {
    try {
        const response = await apiManager.getCompanies();

        if (response.success && response.companies && Array.isArray(response.companies)) {
            allCompanies = response.companies;
        } else {
            logger.warn('⚠️ 거래처 데이터 형식 오류');
            allCompanies = [];
        }

        return true;
    } catch (error) {
        logger.error('❌ 거래처 로드 에러:', error);
        allCompanies = [];
        return true;
    }
}

// ============================================
// 거래처 자동완성 관리
// ============================================
let companyAutocompleteManagerInDetail = null;

/**
 * 거래처 자동완성 초기화 (AutocompleteManager 사용)
 */
function initCompanyAutocompleteInDetail(inputElement, autocompleteList) {
    if (!inputElement || !autocompleteList) {
        logger.warn('[Report Confirm] 자동완성 요소를 찾을 수 없습니다');
        return;
    }

    // 기존 인스턴스 정리
    if (companyAutocompleteManagerInDetail) {
        companyAutocompleteManagerInDetail.destroy();
    }

    // AutocompleteManager 생성
    companyAutocompleteManagerInDetail = new AutocompleteManager({
        inputElement,
        listElement: autocompleteList,
        dataSource: allCompanies,
        getDisplayText: (company) => getCompanyDisplayName(company),
        onSelect: (company) => {
            const companyName = getCompanyDisplayName(company);
            inputElement.value = companyName;

            // 선택 즉시 확정 (담당거래처관리 방식)
            selectedCompanyForReport = company;
            isCompanyVerified = true;

            // UI 업데이트 - 선택 완료 표시
            inputElement.classList.add('verified');
        },
        maxResults: 10,
        placeholder: '검색 결과가 없습니다',
        highlightSearch: true
    });

    // 입력 변경 시 verified 상태 초기화 (AutocompleteManager의 이벤트 외 추가 처리)
    inputElement.addEventListener('input', () => {
        if (inputElement.classList.contains('verified')) {
            inputElement.classList.remove('verified');
            isCompanyVerified = false;
            selectedCompanyForReport = null;
        }
    });
}

// ============================================
// UI 렌더링 함수
// ============================================

/**
 * 영업담당 여부 확인 (관리자이면서 영업담당인 경우 포함)
 */
function isSalesEmployee(employee) {
    // role 또는 role1에 '영업'이 포함되어 있으면 영업담당
    const role = String(employee.role || '');
    const role1 = String(employee.role1 || '');

    return role.includes('영업') || role1.includes('영업');
}

/**
 * 금주 제출현황 렌더링
 */
function renderSubmissionStatus() {
    const weeklyReports = allReports.filter(r => isThisWeek(r.submittedDate));
    const submitters = [...new Set(weeklyReports.map(r => r.submittedBy))];

    // 영업담당 직원만 필터링 (관리자 제외, 단 영업담당 역할도 있으면 포함)
    const salesEmployees = allEmployees.filter(emp => isSalesEmployee(emp));

    const nonSubmitters = salesEmployees
        .map(e => e.name)
        .filter(name => !submitters.includes(name));

    // 제출자 렌더링 (영업담당만)
    const salesSubmitters = submitters.filter(name =>
        salesEmployees.some(emp => emp.name === name)
    );

    const submittersListEl = document.getElementById('submittersList');
    const submittersCountEl = document.getElementById('submittersCount');

    if (submittersCountEl) {
        submittersCountEl.textContent = salesSubmitters.length;
    }

    if (submittersListEl) {
        submittersListEl.innerHTML = salesSubmitters.length > 0
            ? salesSubmitters.map(name => `<li class="submitter-item">✅ ${name}</li>`).join('')
            : '<li class="empty-message">제출자가 없습니다</li>';
    }

    // 미제출자 렌더링
    const nonSubmittersListEl = document.getElementById('nonSubmittersList');
    const nonSubmittersCountEl = document.getElementById('nonSubmittersCount');

    if (nonSubmittersCountEl) {
        nonSubmittersCountEl.textContent = nonSubmitters.length;
    }

    if (nonSubmittersListEl) {
        nonSubmittersListEl.innerHTML = nonSubmitters.length > 0
            ? nonSubmitters.map(name => `<li class="non-submitter-item">❌ ${name}</li>`).join('')
            : '<li class="empty-message">모두 제출했습니다</li>';
    }
}

/**
 * 상태별 카운트 업데이트
 */
function updateStatusCounts() {
    const counts = {
        incomplete: allReports.filter(r => r.calculatedStatus === 'incomplete').length,
        partial: allReports.filter(r => r.calculatedStatus === 'partial').length,
        complete: allReports.filter(r => r.calculatedStatus === 'complete').length
    };

    document.getElementById('incompleteCount').textContent = counts.incomplete;
    document.getElementById('partialCount').textContent = counts.partial;
    document.getElementById('completeCount').textContent = counts.complete;
}

/**
 * 금주 보고서 렌더링
 */
function renderWeeklyReports() {
    const weeklyReports = allReports.filter(r => isThisWeek(r.submittedDate));
    const container = document.getElementById('weeklyReportsContainer');

    if (weeklyReports.length === 0) {
        container.innerHTML = '<p class="empty-message">금주 제출된 보고서가 없습니다</p>';
        return;
    }

    container.innerHTML = weeklyReports.map(report => createReportItemHTML(report)).join('');
}

/**
 * 필터링된 보고서 렌더링
 */
function renderFilteredReports() {
    const filteredReports = allReports.filter(r => r.calculatedStatus === currentFilter);
    const container = document.getElementById('filteredReportsContainer');
    const titleEl = document.getElementById('filteredSectionTitle');
    const countEl = document.getElementById('filteredReportsCount');

    // 제목 업데이트
    titleEl.textContent = `▼ ${STATUS_MAP[currentFilter]} 보고서`;
    countEl.textContent = `(총 ${filteredReports.length}건)`;

    // 리스트 렌더링
    if (filteredReports.length === 0) {
        container.innerHTML = '<p class="empty-message">해당 상태의 보고서가 없습니다</p>';
        return;
    }

    container.innerHTML = filteredReports.map(report => createReportItemHTML(report)).join('');
}

/**
 * 보고서 아이템 HTML 생성
 */
function createReportItemHTML(report) {
    const isSelected = report.reportId === selectedReportId;

    // 거래처 표시명 가져오기 (finalCompanyName 우선, 없으면 erpCompanyName)
    const companyDisplayName = getCompanyDisplayName(report) || report.companyName || '회사명 없음';

    return `
        <div class="report-item ${isSelected ? 'selected' : ''}"
             data-report-id="${report.reportId}"
             onclick="handleReportClick('${report.reportId}')">
            <div class="report-item-header">
                <span class="report-type">${REPORT_TYPE_MAP[report.reportType] || report.reportType}</span>
                ${getStatusBadgeHTML(report.calculatedStatus)}
            </div>
            <div class="report-item-body">
                <div class="report-company">${companyDisplayName}</div>
                <div class="report-meta">
                    <span class="report-author">👤 ${report.submittedBy}</span>
                    <span class="report-date">📅 ${formatDate(report.submittedDate)}</span>
                </div>
            </div>
        </div>
    `;
}

/**
 * 보고서 상세 패널 렌더링
 */
function renderReportDetail(reportId) {
    const report = allReports.find(r => r.reportId === reportId);

    if (!report) {
        showDetailPlaceholder();
        return;
    }

    // 플레이스홀더 숨기고 상세 내용 표시 (CSS 클래스도 함께 관리)
    const placeholder = document.getElementById('detailPlaceholder');
    const content = document.getElementById('detailContent');

    // CRITICAL: hidden 클래스를 먼저 제거 (CSS에 !important가 있어 inline style보다 우선함)
    placeholder.classList.add('hidden');
    placeholder.style.display = 'none';

    // hidden 클래스 제거 후 display 설정 (CSS에 display: flex 정의되어 있음)
    content.classList.remove('hidden');
    content.style.display = 'flex';

    // 기본 정보
    document.getElementById('detailReportId').textContent = report.reportId || '-';
    document.getElementById('detailReportType').textContent = REPORT_TYPE_MAP[report.reportType] || report.reportType;

    // 거래처 표시명 가져오기 (finalCompanyName 우선, 없으면 erpCompanyName)
    const companyDisplayName = getCompanyDisplayName(report) || report.companyName || '-';

    // 거래처 입력 필드에 설정 및 이벤트 바인딩 (담당거래처관리 방식)
    const companyInput = document.getElementById('detailCompanyInput');
    if (companyInput) {
        companyInput.value = companyDisplayName;

        // 거래처 객체 찾기
        const matchingCompany = allCompanies.find(c =>
            getCompanyDisplayName(c) === companyDisplayName
        );

        if (matchingCompany) {
            // 선택 즉시 확정 (담당거래처관리 방식)
            selectedCompanyForReport = matchingCompany;
            isCompanyVerified = true;
            companyInput.classList.add('verified');
        } else {
            selectedCompanyForReport = null;
            isCompanyVerified = false;
            companyInput.classList.remove('verified');
        }

        // 자동완성 초기화 (AutocompleteManager 사용)
        const autocompleteList = document.getElementById('detailCompanyAutocomplete');
        initCompanyAutocompleteInDetail(companyInput, autocompleteList);
    }

    document.getElementById('detailSubmitter').textContent = report.submittedBy || '-';
    document.getElementById('detailSubmitDate').textContent = formatDate(report.submittedDate);
    document.getElementById('detailStatus').innerHTML = getStatusBadgeHTML(report.calculatedStatus);

    // ✅ 보고서 유형에 따라 섹션 표시/숨김 처리
    const isMonthlyOrAnnual = report.reportType === 'monthly' || report.reportType === 'annual';

    const collectionSection = document.getElementById('collection-section');
    const salesSection = document.getElementById('sales-section');
    const activitySection = document.getElementById('activity-section');

    if (isMonthlyOrAnnual) {
        // 월간/연간 보고서: 수금/매출/활동 섹션 숨기기
        if (collectionSection) {
            collectionSection.style.display = 'none';
            collectionSection.classList.add('hidden');
        }
        if (salesSection) {
            salesSection.style.display = 'none';
            salesSection.classList.add('hidden');
        }
        if (activitySection) {
            activitySection.style.display = 'none';
            activitySection.classList.add('hidden');
        }
    } else {
        // 주간 보고서: 수금/매출/활동 섹션 표시
        if (collectionSection) {
            collectionSection.style.display = 'block';
            collectionSection.classList.remove('hidden');
        }
        if (salesSection) {
            salesSection.style.display = 'block';
            salesSection.classList.remove('hidden');
        }
        if (activitySection) {
            activitySection.style.display = 'block';
            activitySection.classList.remove('hidden');
        }
    }

    // ✅ 주간 보고서만 수금/매출/활동 필드 업데이트
    if (!isMonthlyOrAnnual) {
        // 수금금액 (읽기 전용)
        const targetCollection = report.targetCollectionAmount || 0;
        const actualCollection = report.actualCollectionAmount || 0;
        const remainingCollection = targetCollection - actualCollection;

        const collectionGoalEl = document.getElementById('detailCollectionGoal');
        const collectionActualEl = document.getElementById('detailCollectionActual');
        const collectionRemainingEl = document.getElementById('detailCollectionRemaining');

        if (collectionGoalEl) collectionGoalEl.textContent = formatCurrency(targetCollection);
        if (collectionActualEl) collectionActualEl.textContent = formatCurrency(actualCollection);
        if (collectionRemainingEl) collectionRemainingEl.textContent = formatCurrency(remainingCollection);

        // 매출액 (읽기 전용)
        const targetSales = report.targetSalesAmount || 0;
        const actualSales = report.actualSalesAmount || 0;
        const remainingSales = targetSales - actualSales;

        const salesGoalEl = document.getElementById('detailSalesGoal');
        const salesActualEl = document.getElementById('detailSalesActual');
        const salesRemainingEl = document.getElementById('detailSalesRemaining');

        if (salesGoalEl) salesGoalEl.textContent = formatCurrency(targetSales);
        if (salesActualEl) salesActualEl.textContent = formatCurrency(actualSales);
        if (salesRemainingEl) salesRemainingEl.textContent = formatCurrency(remainingSales);

        // 목표상품 (목표매출액 헤더에 표시)
        const salesProductEl = document.getElementById('detailSalesProduct');
        if (salesProductEl) {
            try {
                const productsData = typeof report.targetProducts === 'string'
                    ? JSON.parse(report.targetProducts)
                    : report.targetProducts;

                if (Array.isArray(productsData) && productsData.length > 0) {
                    salesProductEl.textContent = productsData.map(p => p.name).join(', ');
                } else {
                    salesProductEl.textContent = '-';
                }
            } catch (e) {
                salesProductEl.textContent = report.targetProducts || '-';
            }
        }

        // 영업활동(특이사항) - activityNotes는 JSON 배열
        const activityListEl = document.getElementById('detailActivityList');
        if (activityListEl) {
            try {
                const activities = typeof report.activityNotes === 'string'
                    ? JSON.parse(report.activityNotes)
                    : report.activityNotes;

                if (Array.isArray(activities) && activities.length > 0) {
                    activityListEl.innerHTML = activities.map(activity => `
                        <div class="activity-item glass-card activity-item-padding">
                            <div class="activity-company">
                                ${activity.companyName || '회사명 없음'}
                            </div>
                            <div class="activity-content-text">
                                ${activity.content || '-'}
                            </div>
                        </div>
                    `).join('');
                } else {
                    activityListEl.innerHTML = '<p class="activity-no-data">활동 내역이 없습니다</p>';
                }
            } catch (e) {
                logger.error('활동내역 파싱 에러:', e);
                activityListEl.innerHTML = '<p class="activity-no-data">-</p>';
            }
        }
    }

    // 관리자 의견 (기존 의견 표시)
    document.getElementById('adminComment').value = report.adminComment || '';

    // ✅ NEW: 월간/연간 목표 데이터 로드 및 표시
    loadAndDisplayGoals(report);
}

/**
 * ✅ NEW: 월간/연간 목표 로드 및 표시 (관리자 모드)
 * @param {Object} report - 현재 보고서 객체
 */
async function loadAndDisplayGoals(report) {
    try {
        // 월간/연간 목표 보고서 조회 (보고서 작성자 기준)
        const [monthlyGoalResponse, annualGoalResponse] = await Promise.all([
            apiManager.getReports({
                submittedBy: report.submittedBy,
                reportType: 'monthly',
                limit: 1
            }),
            apiManager.getReports({
                submittedBy: report.submittedBy,
                reportType: 'annual',
                limit: 1
            })
        ]);

        // 월간목표 처리
        const monthlyGoalSection = document.querySelector('.monthly-goal-section');
        if (monthlyGoalResponse.success && monthlyGoalResponse.data?.reports?.length > 0) {
            const monthlyGoal = monthlyGoalResponse.data.reports[0];
            displayGoalData(monthlyGoal, 'monthly');

            // 섹션 표시
            if (monthlyGoalSection) {
                monthlyGoalSection.classList.remove('hidden');
                monthlyGoalSection.style.display = 'block';
            }
        } else {
            // 월간목표 없음 - "0원" 표시
            displayGoalData(null, 'monthly');
            if (monthlyGoalSection) {
                monthlyGoalSection.classList.remove('hidden');
                monthlyGoalSection.style.display = 'block';
            }
        }

        // 연간목표 처리
        const annualGoalSection = document.querySelector('.annual-goal-section');
        if (annualGoalResponse.success && annualGoalResponse.data?.reports?.length > 0) {
            const annualGoal = annualGoalResponse.data.reports[0];
            displayGoalData(annualGoal, 'annual');

            // 섹션 표시
            if (annualGoalSection) {
                annualGoalSection.classList.remove('hidden');
                annualGoalSection.style.display = 'block';
            }
        } else {
            // 연간목표 없음 - "0원" 표시
            displayGoalData(null, 'annual');
            if (annualGoalSection) {
                annualGoalSection.classList.remove('hidden');
                annualGoalSection.style.display = 'block';
            }
        }

    } catch (error) {
        logger.error('[Report Confirm] 목표 데이터 로드 실패:', error);
        // 에러 발생 시에도 "0원" 표시
        displayGoalData(null, 'monthly');
        displayGoalData(null, 'annual');
    }
}

/**
 * 목표 데이터 표시 (월간 또는 연간)
 * @param {Object|null} goalReport - 목표 보고서 객체 (없으면 null)
 * @param {string} type - 'monthly' 또는 'annual'
 */
function displayGoalData(goalReport, type) {
    const prefix = type === 'monthly' ? 'monthly' : 'annual';

    const collectionEl = document.querySelector(`.${prefix}-goal-collection`);
    const salesEl = document.querySelector(`.${prefix}-goal-sales`);
    const productsEl = document.querySelector(`.${prefix}-goal-products`);

    if (goalReport) {
        // 목표 데이터가 있으면 표시
        if (collectionEl) {
            const collectionAmount = parseFloat(goalReport.targetCollectionAmount) || 0;
            collectionEl.textContent = formatCurrency(collectionAmount);
        }

        if (salesEl) {
            const salesAmount = parseFloat(goalReport.targetSalesAmount) || 0;
            salesEl.textContent = formatCurrency(salesAmount);
        }

        if (productsEl) {
            try {
                const targetProducts = typeof goalReport.targetProducts === 'string'
                    ? JSON.parse(goalReport.targetProducts)
                    : goalReport.targetProducts;

                if (Array.isArray(targetProducts) && targetProducts.length > 0) {
                    const productNames = targetProducts
                        .map(p => p.name || p.productName)
                        .filter(Boolean)
                        .join(', ');
                    productsEl.textContent = productNames || '-';
                } else {
                    productsEl.textContent = '-';
                }
            } catch (e) {
                productsEl.textContent = goalReport.targetProducts || '-';
            }
        }
    } else {
        // 목표 데이터가 없으면 "0원" 표시
        if (collectionEl) {
            collectionEl.textContent = '0원';
        }
        if (salesEl) {
            salesEl.textContent = '0원';
        }
        if (productsEl) {
            productsEl.textContent = '-';
        }
    }
}

/**
 * 상세 패널 플레이스홀더 표시
 */
function showDetailPlaceholder() {
    const placeholder = document.getElementById('detailPlaceholder');
    const content = document.getElementById('detailContent');

    // hidden 클래스 제거 후 display 설정 (CSS !important 대응)
    placeholder.classList.remove('hidden');
    placeholder.style.display = 'flex';

    // content 숨기기
    content.classList.add('hidden');
    content.style.display = 'none';
}

/**
 * 로딩 상태 표시/숨김
 */
function showLoading(show) {
    const loadingState = document.getElementById('loadingState');
    const mainLayout = document.getElementById('mainLayout');

    if (!loadingState || !mainLayout) {
        logger.error('❌ DOM 요소를 찾을 수 없습니다!');
        logger.error('loadingState:', loadingState);
        logger.error('mainLayout:', mainLayout);
        return;
    }

    if (show) {
        loadingState.style.display = 'flex';
        loadingState.classList.remove('hidden');
        loadingState.classList.add('flex-display');
        mainLayout.style.display = 'none';
        mainLayout.classList.add('hidden');
    } else {
        loadingState.style.display = 'none';
        loadingState.classList.add('hidden');
        loadingState.classList.remove('flex-display');
        mainLayout.style.display = 'flex';
        mainLayout.classList.remove('hidden');
    }
}

// ============================================
// 이벤트 핸들러
// ============================================

/**
 * 보고서 아이템 클릭 핸들러
 */
window.handleReportClick = function(reportId) {
    selectedReportId = reportId;

    // 모든 아이템에서 selected 클래스 제거
    document.querySelectorAll('.report-item').forEach(item => {
        item.classList.remove('selected');
    });

    // 클릭된 아이템에 selected 클래스 추가
    const clickedItem = document.querySelector(`[data-report-id="${reportId}"]`);
    if (clickedItem) {
        clickedItem.classList.add('selected');
    }

    // 상세 패널 렌더링
    renderReportDetail(reportId);
};

/**
 * 상태 필터 클릭 핸들러
 */
function handleFilterClick(status) {
    currentFilter = status;

    // 모든 필터 버튼에서 active 클래스 제거
    document.querySelectorAll('.status-filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // 클릭된 필터 버튼에 active 클래스 추가
    const filterItem = document.querySelector(`[data-status="${status}"]`);
    if (filterItem) {
        const button = filterItem.querySelector('.status-filter-btn');
        button.classList.add('active');
    }

    // 필터링된 보고서 렌더링
    renderFilteredReports();
}

/**
 * 관리자 의견 저장 핸들러
 */
async function handleSaveComment() {
    if (!selectedReportId) {
        alert('보고서를 선택해주세요.');
        return;
    }

    const comment = document.getElementById('adminComment').value.trim();

    // 현재 로그인한 관리자 정보 가져오기
    const userJson = localStorage.getItem('user');

    if (!userJson) {
        alert('❌ 로그인 정보를 찾을 수 없습니다. 다시 로그인해주세요.');
        return;
    }

    let processedBy;
    try {
        const user = JSON.parse(userJson);

        processedBy = user.name;

        if (!processedBy) {
            alert('❌ 사용자 이름을 찾을 수 없습니다.');
            return;
        }
    } catch (e) {
        logger.error('user 데이터 파싱 실패:', e);
        alert('❌ 사용자 정보를 읽을 수 없습니다. 다시 로그인해주세요.');
        return;
    }

    try {
        const updateData = {
            adminComment: comment,
            processedBy: processedBy
        };

        // 거래처가 변경된 경우 companyId도 업데이트
        if (selectedCompanyForReport) {
            const report = allReports.find(r => r.reportId === selectedReportId);
            if (report && report.companyId !== selectedCompanyForReport.keyValue) {
                updateData.companyId = selectedCompanyForReport.keyValue;
            }
        }

        const response = await apiManager.updateReport(selectedReportId, updateData);

        if (response.success) {
            const messages = ['✅ 관리자 의견이 저장되었습니다.'];

            // 로컬 데이터 업데이트
            const report = allReports.find(r => r.reportId === selectedReportId);
            if (report) {
                report.adminComment = comment;
                report.processedBy = processedBy;
                report.processedDate = new Date().toISOString();

                // 거래처가 변경된 경우
                if (updateData.companyId) {
                    report.companyId = updateData.companyId;
                    report.finalCompanyName = selectedCompanyForReport.finalCompanyName;
                    report.erpCompanyName = selectedCompanyForReport.erpCompanyName;
                    messages.push('✅ 거래처 정보가 변경되었습니다.');
                }
            }

            alert(messages.join('\n'));
        } else {
            throw new Error(response.message || '저장 실패');
        }
    } catch (error) {
        logger.error('❌ 의견 저장 에러:', error);
        alert('의견 저장에 실패했습니다: ' + error.message);
    }
}


/**
 * 새로고침 핸들러
 */
async function handleRefresh() {
    selectedReportId = null;
    await initializePage();
    showToast('데이타가 새로고침되었습니다.', 'success');
}

// ============================================
// 초기화 함수
// ============================================

/**
 * 페이지 초기화
 */
async function initializePage() {
    try {
        // 데이터 로드
        const reportsLoaded = await loadReports();

        // 보고서 로드 실패시에도 직원과 거래처는 로드 시도
        await loadEmployees();
        await loadCompanies();

        // 보고서가 없어도 UI는 표시
        if (!reportsLoaded || allReports.length === 0) {
            logger.warn('⚠️ 보고서 데이터가 없습니다');
            showLoading(false);

            // 빈 상태로 UI 렌더링 (에러 처리 포함)
            safeRender('renderSubmissionStatus', renderSubmissionStatus);
            safeRender('updateStatusCounts', updateStatusCounts);
            safeRender('renderWeeklyReports', renderWeeklyReports);
            safeRender('renderFilteredReports', renderFilteredReports);
            safeRender('showDetailPlaceholder', showDetailPlaceholder);

            return;
        }

        // UI 렌더링 (에러 처리 포함)
        safeRender('renderSubmissionStatus', renderSubmissionStatus);
        safeRender('updateStatusCounts', updateStatusCounts);
        safeRender('renderWeeklyReports', renderWeeklyReports);
        safeRender('renderFilteredReports', renderFilteredReports);
        safeRender('showDetailPlaceholder', showDetailPlaceholder);

        showLoading(false);
    } catch (error) {
        logger.error('❌ 초기화 중 에러:', error);
        logger.error('에러 스택:', error.stack);
        showLoading(false);
        alert('페이지 초기화 중 오류가 발생했습니다:\n\n' + error.message + '\n\n브라우저 콘솔(F12)을 확인하세요.');
    }
}

/**
 * 안전한 렌더링 헬퍼 함수
 * 렌더 함수 실행 중 에러가 발생해도 전체 페이지가 중단되지 않도록 함
 */
function safeRender(funcName, renderFunc) {
    try {
        renderFunc();
    } catch (error) {
        logger.error(`❌ ${funcName} 렌더링 에러:`, error);
        logger.error('에러 스택:', error.stack);
        // 개별 렌더 함수 에러는 전체 페이지를 중단시키지 않음
    }
}

/**
 * 이벤트 리스너 등록 (중복 방지)
 */
function attachEventListeners() {
    // 이미 등록된 경우 중복 등록 방지
    if (isEventListenersAttached) {
        return;
    }

    // 상태 필터 버튼 클릭
    document.querySelectorAll('.status-filter-item').forEach(item => {
        const button = item.querySelector('.status-filter-btn');
        const status = item.dataset.status;

        button.addEventListener('click', () => handleFilterClick(status));
    });

    // 관리자 의견 저장 버튼
    const saveCommentBtn = document.getElementById('saveCommentBtn');
    if (saveCommentBtn) {
        saveCommentBtn.addEventListener('click', handleSaveComment);
    }

    // 새로고침 버튼
    const refreshBtn = document.getElementById('btnRefresh');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', handleRefresh);
    }

    isEventListenersAttached = true;
}

// ============================================
// 페이지 로드시 실행
// ============================================

/**
 * 메인 초기화 함수
 */
async function main() {
    // 중복 초기화 방지 (진행 중인 경우만 차단)
    if (isInitializing) {
        return;
    }

    isInitializing = true;

    try {
        // API Manager 초기화 및 서버 연결 확인
        let isConnected = false;
        if (typeof apiManager.init === 'function') {
            isConnected = await apiManager.init();
        } else {
            logger.error('❌ API Manager init 함수를 찾을 수 없습니다');
            showLoading(false);
            alert('❌ API Manager 초기화 함수를 찾을 수 없습니다.\n\n페이지를 새로고침해주세요.');
            isInitializing = false;
            return;
        }

        // 서버 연결 실패 시 중단
        if (!isConnected) {
            logger.error('❌ 백엔드 서버에 연결할 수 없습니다');
            showLoading(false);
            // API Manager가 이미 에러 배너를 표시하므로 추가 alert는 불필요
            isInitializing = false;
            return;
        }

        attachEventListeners();
        await initializePage();

    } catch (error) {
        logger.error('❌ 페이지 로드 에러:', error);
        logger.error('에러 스택:', error.stack);
        showLoading(false);
        alert('페이지 초기화에 실패했습니다:\n\n' + error.message + '\n\n브라우저 콘솔(F12)을 확인하세요.');
    } finally {
        isInitializing = false;
    }
}

// DOMContentLoaded가 이미 발생했는지 확인하고 실행
if (document.readyState === 'loading') {
    // 아직 로딩 중이면 이벤트 리스너 등록
    document.addEventListener('DOMContentLoaded', main);
} else {
    // 이미 로드 완료되었으면 즉시 실행
    main();
}

// 페이지가 다시 보일 때 재초기화 (SPA 페이지 전환 대응)
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && !isInitializing) {
        logger.info('[Report Confirm] 페이지가 다시 보임 - 재초기화 시작');
        main();
    }
});

// SPA 페이지 전환 감지 - 페이지 요소가 보일 때 초기화
const observer = new MutationObserver(() => {
    const loadingState = document.getElementById('loadingState');
    const mainLayout = document.getElementById('mainLayout');

    // 페이지 요소가 존재하고 로딩 상태가 표시 중이며, 초기화 중이 아닐 때
    if (loadingState && mainLayout && loadingState.style.display !== 'none' && !isInitializing) {
        logger.info('[Report Confirm] 페이지 요소 감지 - 초기화 시작');
        main();
    }
});

// body의 변경사항 관찰
if (document.body) {
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}
