// ============================================
// 보고서 발표 페이지
// ============================================

import ApiManager from '../../01.common/13_api_manager.js';
import { showToast } from '../../01.common/20_common_index.js';
import { formatCurrency, formatDate, formatDateRange, formatNumber } from '../../01.common/03_format.js';
import { GlobalConfig } from '../../01.common/01_global_config.js';
import logger from '../../01.common/23_logger.js';

// ============================================
// 전역 변수
// ============================================
const apiManager = ApiManager.getInstance();

let allReports = [];           // 전체 보고서 데이터
let filteredReports = [];      // 필터링된 보고서
let groupedReports = {};       // 담당자별 그룹화된 데이터
let companiesMap = {};         // 거래처 정보 맵 (누적매출/수금 조회용)
let employeesMap = {};         // 직원 정보 맵 (이름 → 부서 조회용)
let todayReports = [];         // 오늘 날짜 보고서 (영업담당자 통계용)
let currentFilters = {
    period: 'weekly',
    department: '',
    employee: ''
};

// 비교보고 관련 변수
let comparisonReports = [];    // 비교보고 데이터
let comparisonFilters = {
    period: 'weekly',
    department: '',
    employee: '',
    startDate: '',
    endDate: '',
    includeZeroReports: false,  // 실적 0인 보고서 포함 여부
    groupingExpanded: false     // 계층적 그룹화 확장 여부 (부서별/직원별 상세 표시)
};
let startDatePicker = null;    // 시작일 Flatpickr 인스턴스
let endDatePicker = null;      // 종료일 Flatpickr 인스턴스

// ============================================
// 초기화
// ============================================
async function init() {

    // 이벤트 리스너 등록
    setupEventListeners();

    // 마스터 데이터 로드 (부서, 직원)
    await loadMasterData();

    // 비교보고 Flatpickr 초기화
    initComparisonDatePickers();

    // 초기 데이터 로드
    await loadReports();
}

// ============================================
// 마스터 데이터 로드
// ============================================

/**
 * 부서 및 직원 목록 로드
 */
async function loadMasterData() {
    try {
        const authToken = localStorage.getItem('authToken');

        if (!authToken) {
            logger.error('❌ [마스터데이터] 인증 토큰이 없습니다');
            showToast('로그인이 필요합니다', 'error');
            return;
        }


        // API Base URL 가져오기 (GlobalConfig 사용)
        const API_BASE_URL = GlobalConfig.API_BASE_URL;

        // 1. 담당부서 목록 로드
        const departmentsResponse = await fetch(`${API_BASE_URL}/api/master/departments`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            }
        });


        if (departmentsResponse.ok) {
            const departmentsData = await departmentsResponse.json();

            if (departmentsData.success && Array.isArray(departmentsData.departments)) {
                populateDepartmentSelect(departmentsData.departments);
            } else {
                logger.warn('⚠️ [담당부서] 응답 형식 오류:', departmentsData);
            }
        } else {
            const errorData = await departmentsResponse.json().catch(() => ({}));
            logger.error('❌ [담당부서] 로드 실패:', departmentsResponse.status, errorData);
            showToast(`부서 목록 로드 실패: ${errorData.message || departmentsResponse.statusText}`, 'error');
        }

        // 2. 직원 목록 로드
        const employeesResponse = await fetch(`${API_BASE_URL}/api/employees`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            }
        });


        if (employeesResponse.ok) {
            const employeesData = await employeesResponse.json();

            if (employeesData.success && Array.isArray(employeesData.employees)) {
                populateEmployeeSelect(employeesData.employees);
            } else {
                logger.warn('⚠️ [직원] 응답 형식 오류:', employeesData);
            }
        } else {
            const errorData = await employeesResponse.json().catch(() => ({}));
            logger.error('❌ [직원] 로드 실패:', employeesResponse.status, errorData);

            // 403 에러인 경우 권한 부족 메시지
            if (employeesResponse.status === 403) {
                logger.warn('⚠️ [직원] 권한 부족: 관리자 권한이 필요할 수 있습니다');
                showToast('직원 목록 조회 권한이 없습니다', 'warning');
            } else {
                showToast(`직원 목록 로드 실패: ${errorData.message || employeesResponse.statusText}`, 'error');
            }
        }

    } catch (error) {
        logger.error('❌ [마스터데이터] 로드 중 예외 발생:', error);
        showToast('마스터 데이터 로드 중 오류가 발생했습니다', 'error');
    }
}

/**
 * 담당부서 select 옵션 채우기
 */
function populateDepartmentSelect(departments) {
    const departmentSelect = document.getElementById('departmentFilter');
    const comparisonDepartmentSelect = document.getElementById('comparisonDepartment');

    // 기존 보고서 발표용 select
    if (departmentSelect) {
        while (departmentSelect.options.length > 1) {
            departmentSelect.remove(1);
        }
        departments.forEach(dept => {
            const option = document.createElement('option');
            option.value = dept.department_name;
            option.textContent = dept.department_name;
            departmentSelect.appendChild(option);
        });
    }

    // 비교보고용 select
    if (comparisonDepartmentSelect) {
        while (comparisonDepartmentSelect.options.length > 1) {
            comparisonDepartmentSelect.remove(1);
        }
        departments.forEach(dept => {
            const option = document.createElement('option');
            option.value = dept.department_name;
            option.textContent = dept.department_name;
            comparisonDepartmentSelect.appendChild(option);
        });
    }
}

/**
 * 직원 select 옵션 채우기
 */
function populateEmployeeSelect(employees) {
    const employeeSelect = document.getElementById('employeeFilter');
    const comparisonEmployeeSelect = document.getElementById('comparisonEmployee');

    // 직원 맵 생성 (이름 → 부서 조회용)
    employeesMap = {};
    employees.forEach(emp => {
        employeesMap[emp.name] = {
            department: emp.department || '미분류',
            role1: emp.role1,
            role2: emp.role2
        };
    });

    // 영업 관련 직원만 필터링
    const salesEmployees = employees.filter(emp => {
        const isRole1Sales = emp.role1 === '영업담당';
        const isRole2Sales = emp.role2 === '영업담당';
        return isRole1Sales || isRole2Sales;
    });


    // 기존 보고서 발표용 select
    if (employeeSelect) {
        while (employeeSelect.options.length > 1) {
            employeeSelect.remove(1);
        }
        salesEmployees.forEach(emp => {
            const option = document.createElement('option');
            option.value = emp.name;
            option.textContent = `${emp.name} (${emp.department || ''})`;
            employeeSelect.appendChild(option);
        });
    }

    // 비교보고용 select
    if (comparisonEmployeeSelect) {
        while (comparisonEmployeeSelect.options.length > 1) {
            comparisonEmployeeSelect.remove(1);
        }
        salesEmployees.forEach(emp => {
            const option = document.createElement('option');
            option.value = emp.name;
            option.textContent = `${emp.name} (${emp.department || ''})`;
            comparisonEmployeeSelect.appendChild(option);
        });
    }
}

/**
 * 이벤트 리스너 등록
 */
function setupEventListeners() {
    // 필터 변경 이벤트
    const periodRadios = document.querySelectorAll('input[name="period"]');
    periodRadios.forEach(radio => {
        radio.addEventListener('change', handlePeriodChange);
    });

    // 조회 버튼
    const btnApplyFilter = document.getElementById('btnApplyFilter');
    btnApplyFilter?.addEventListener('click', handleApplyFilter);

    // 새로고침 버튼
    const btnRefresh = document.getElementById('btnRefresh');
    btnRefresh?.addEventListener('click', handleRefresh);

    // 비교보고 이벤트 리스너
    setupComparisonEventListeners();

    // 섹션 토글 버튼 이벤트 리스너
    setupSectionToggleListeners();

    // 필터 토글 버튼 이벤트 리스너
    setupFilterToggleListeners();
}

/**
 * 비교보고 이벤트 리스너 등록
 */
function setupComparisonEventListeners() {
    // 비교보고 기간 유형 변경
    const comparisonPeriodRadios = document.querySelectorAll('input[name="comparisonPeriod"]');
    comparisonPeriodRadios.forEach(radio => {
        radio.addEventListener('change', handleComparisonPeriodChange);
    });

    // 기간확정 버튼
    const btnConfirmPeriod = document.getElementById('btnConfirmPeriod');
    btnConfirmPeriod?.addEventListener('click', handleConfirmPeriod);

    // 비교 조회 버튼
    const btnComparisonSearch = document.getElementById('btnComparisonSearch');
    btnComparisonSearch?.addEventListener('click', handleComparisonSearch);

    // 계층적 그룹화 토글 버튼
    const btnToggleGrouping = document.getElementById('btnToggleGrouping');
    btnToggleGrouping?.addEventListener('click', handleToggleGrouping);
}

/**
 * 섹션 토글 버튼 이벤트 리스너 등록
 */
function setupSectionToggleListeners() {
    const toggleButtons = document.querySelectorAll('.btn-section-toggle');

    toggleButtons.forEach(button => {
        button.addEventListener('click', handleSectionToggle);
    });
}

/**
 * 필터 토글 버튼 이벤트 리스너 등록
 */
function setupFilterToggleListeners() {
    const filterToggleBtn = document.getElementById('btnPerformanceFilterToggle');
    if (filterToggleBtn) {
        filterToggleBtn.addEventListener('click', handleFilterToggle);
    }

    const comparisonFilterToggleBtn = document.getElementById('btnComparisonFilterToggle');
    if (comparisonFilterToggleBtn) {
        comparisonFilterToggleBtn.addEventListener('click', handleComparisonFilterToggle);
    }
}

/**
 * 섹션 토글 핸들러
 */
function handleSectionToggle(event) {
    const button = event.currentTarget;
    const section = button.dataset.section;
    const action = button.dataset.action;


    // 섹션별 컨텐츠 요소 찾기
    let sectionElement, contentElements;

    switch(section) {
        case 'performance':
            sectionElement = document.querySelector('.performance-report-section');
            contentElements = [
                sectionElement?.querySelector('.performance-filters'),
                sectionElement?.querySelector('.performance-period-display'),
                sectionElement?.querySelector('.performance-table-section'),
                sectionElement?.querySelector('.performance-summary')
            ].filter(el => el !== null);
            break;

        case 'comparison':
            sectionElement = document.querySelector('.comparison-report-section');
            contentElements = [
                sectionElement?.querySelector('.comparison-filters'),
                sectionElement?.querySelector('.comparison-period-display'),
                sectionElement?.querySelector('.comparison-result-area')
            ].filter(el => el !== null);
            break;

        case 'employee':
            sectionElement = document.querySelector('.employee-stats-section');
            contentElements = [
                sectionElement?.querySelector('.stats-table-container')
            ].filter(el => el !== null);
            break;
    }

    if (!contentElements || contentElements.length === 0) {
        logger.warn(`[섹션토글] ${section} 섹션의 컨텐츠 요소를 찾을 수 없습니다`);
        return;
    }

    // 토글 동작
    if (action === 'expand') {
        // 상세보기 - 모든 컨텐츠 표시
        contentElements.forEach(el => {
            el.style.display = 'block';
        });

        // 실적보고 섹션인 경우 필터 토글 버튼 표시
        if (section === 'performance') {
            const filterToggleContainer = document.querySelector('.filter-toggle-container');
            if (filterToggleContainer) {
                filterToggleContainer.style.display = 'flex';
            }
        }

        // 비교보고 섹션인 경우 필터 토글 버튼 표시
        if (section === 'comparison') {
            const comparisonFilterToggleContainer = document.querySelector('.comparison-filter-toggle-container');
            if (comparisonFilterToggleContainer) {
                comparisonFilterToggleContainer.style.display = 'flex';
            }
        }
    } else if (action === 'collapse') {
        // 접기 - 모든 컨텐츠 숨김
        contentElements.forEach(el => {
            el.style.display = 'none';
        });

        // 실적보고 섹션인 경우 필터 토글 버튼 숨김
        if (section === 'performance') {
            const filterToggleContainer = document.querySelector('.filter-toggle-container');
            if (filterToggleContainer) {
                filterToggleContainer.style.display = 'none';
            }
        }

        // 비교보고 섹션인 경우 필터 토글 버튼 숨김
        if (section === 'comparison') {
            const comparisonFilterToggleContainer = document.querySelector('.comparison-filter-toggle-container');
            if (comparisonFilterToggleContainer) {
                comparisonFilterToggleContainer.style.display = 'none';
            }
        }
    }
}

/**
 * 필터 토글 핸들러
 */
function handleFilterToggle(event) {
    const button = event.currentTarget;
    const toggleText = button.querySelector('.filter-toggle-text');
    const filtersElement = document.querySelector('.performance-filters');

    if (!filtersElement || !toggleText) return;

    // 현재 필터 표시 상태 확인
    const isVisible = filtersElement.style.display !== 'none';

    if (isVisible) {
        // 필터 영역 숨김
        filtersElement.style.display = 'none';
        toggleText.textContent = '펼치기';
    } else {
        // 필터 영역 표시
        filtersElement.style.display = 'block';
        toggleText.textContent = '접기';
    }
}

/**
 * 비교보고 필터 토글 핸들러
 */
function handleComparisonFilterToggle(event) {
    const button = event.currentTarget;
    const toggleText = button.querySelector('.filter-toggle-text');
    const filtersElement = document.querySelector('.comparison-filters');

    if (!filtersElement || !toggleText) return;

    // 현재 필터 표시 상태 확인
    const isVisible = filtersElement.style.display !== 'none';

    if (isVisible) {
        // 필터 영역 숨김
        filtersElement.style.display = 'none';
        toggleText.textContent = '펼치기';
    } else {
        // 필터 영역 표시
        filtersElement.style.display = 'block';
        toggleText.textContent = '접기';
    }
}

// ============================================
// 데이터 로드
// ============================================

/**
 * 보고서 데이터 로드
 */
async function loadReports() {
    try {

        // 기간 계산
        const dateRange = calculateDateRange(currentFilters.period);

        // API 호출 (모든 보고서 조회)
        const response = await apiManager.getReports({
            startDate: dateRange.start,
            endDate: dateRange.end
        });

        // 데이터 파싱
        if (response && response.data && Array.isArray(response.data.reports)) {
            allReports = response.data.reports;
        } else if (Array.isArray(response)) {
            allReports = response;
        } else {
            allReports = [];
        }


        // 작성자별 통계
        if (allReports.length > 0) {
            const submitterCounts = {};
            allReports.forEach(report => {
                const submitter = report.submittedBy || '미상';
                submitterCounts[submitter] = (submitterCounts[submitter] || 0) + 1;
            });
        }

        // 오늘 날짜 보고서 로드 (영업담당자 통계용)
        await loadTodayReports();

        // 거래처 정보 로드
        await loadCompanies();

        // 필터 적용 및 렌더링
        applyFiltersAndRender();

        // 영업담당자 통계 렌더링
        renderEmployeeReportStats();

    } catch (error) {
        logger.error('❌ 보고서 로드 실패:', error);
        showToast('보고서 데이터를 불러오는데 실패했습니다.', 'error');
    }
}

/**
 * 올해 누적 보고서 로드 (영업담당자 통계용)
 */
async function loadTodayReports() {
    try {
        const today = new Date();
        const startOfYear = new Date(today.getFullYear(), 0, 1); // 올해 1월 1일

        const startDate = startOfYear.toISOString().split('T')[0];
        const endDate = today.toISOString().split('T')[0];


        // API 호출 (올해 1월 1일부터 오늘까지)
        const response = await apiManager.getReports({
            startDate: startDate,
            endDate: endDate
        });

        // 데이터 파싱
        if (response && response.data && Array.isArray(response.data.reports)) {
            todayReports = response.data.reports;
        } else if (Array.isArray(response)) {
            todayReports = response;
        } else {
            todayReports = [];
        }

    } catch (error) {
        logger.error('❌ [올해누적보고서] 로드 실패:', error);
        todayReports = [];
    }
}

/**
 * 거래처 정보 로드 (누적 매출/수금 조회용)
 */
async function loadCompanies() {
    try {
        const response = await apiManager.getCompanies();

        // API Manager는 응답을 그대로 반환
        if (response && response.companies && Array.isArray(response.companies)) {
            response.companies.forEach(company => {
                companiesMap[company.keyValue] = company;
            });
        } else if (response && response.data && Array.isArray(response.data.companies)) {
            // 혹시 response.data에 있을 경우 대비
            response.data.companies.forEach(company => {
                companiesMap[company.keyValue] = company;
            });
        } else if (Array.isArray(response)) {
            // 배열 형태로 올 경우
            response.forEach(company => {
                companiesMap[company.keyValue] = company;
            });
        } else {
            logger.warn('⚠️ 거래처 정보 응답 형식 오류:', response);
        }
    } catch (error) {
        logger.error('❌ 거래처 정보 로드 실패:', error);
    }
}

/**
 * 기간 범위 계산
 */
function calculateDateRange(period) {
    const today = new Date();
    let start, end;

    switch (period) {
        case 'weekly':
            // 금주: 이번 주 월요일 ~ 일요일
            start = getMonday(today);
            end = getSunday(today);
            break;

        case 'monthly':
            // 월간: 현재 월 1일 ~ 현재
            start = new Date(today.getFullYear(), today.getMonth(), 1);
            end = today;
            break;

        case 'yearly':
            // 년간: 1월 1일 ~ 현재
            start = new Date(today.getFullYear(), 0, 1);
            end = today;
            break;
    }

    return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0]
    };
}

function getMonday(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
}

function getSunday(date) {
    const monday = getMonday(date);
    return new Date(monday.getTime() + 6 * 24 * 60 * 60 * 1000);
}

// ============================================
// 필터링 및 그룹화
// ============================================

/**
 * 필터 적용 및 렌더링
 */
function applyFiltersAndRender() {
    // 필터 적용
    filteredReports = allReports.filter(report => {
        // 담당부서 필터 (정확한 값 비교)
        if (currentFilters.department && report.department !== currentFilters.department) {
            return false;
        }
        // 내부담당자 필터 (정확한 값 비교)
        if (currentFilters.employee && report.submittedBy !== currentFilters.employee) {
            return false;
        }
        return true;
    });


    // 담당자별 그룹화
    groupedReports = groupByEmployee(filteredReports);

    // UI 렌더링
    renderPeriodDisplay();
    renderReportTable();
    renderSummary();
}

/**
 * 담당자별 그룹화
 */
function groupByEmployee(reports) {
    const grouped = {};

    reports.forEach(report => {
        const employee = report.submittedBy;
        if (!grouped[employee]) {
            // employeesMap에서 부서 정보 조회
            const employeeInfo = employeesMap[employee] || {};
            grouped[employee] = {
                employee: employee,
                department: employeeInfo.department || '미분류',
                reports: [],
                subtotal: {
                    targetCollection: 0,
                    actualCollection: 0,
                    targetSales: 0,
                    actualSales: 0
                }
            };
        }

        grouped[employee].reports.push(report);
        grouped[employee].subtotal.targetCollection += Number(report.targetCollectionAmount) || 0;
        grouped[employee].subtotal.actualCollection += Number(report.actualCollectionAmount) || 0;
        grouped[employee].subtotal.targetSales += Number(report.targetSalesAmount) || 0;
        grouped[employee].subtotal.actualSales += Number(report.actualSalesAmount) || 0;
    });

    // 달성률 계산
    Object.values(grouped).forEach(group => {
        group.subtotal.collectionRate = calculateRate(
            group.subtotal.actualCollection,
            group.subtotal.targetCollection
        );
        group.subtotal.salesRate = calculateRate(
            group.subtotal.actualSales,
            group.subtotal.targetSales
        );
    });

    return grouped;
}

/**
 * 달성률 계산
 */
function calculateRate(actual, target) {
    if (!target || target === 0) return '0.00';
    return ((actual / target) * 100).toFixed(2);  /* ✅ % 소수점 2자리 */
}

// ============================================
// UI 렌더링
// ============================================

/**
 * 기간 표시 렌더링
 */
function renderPeriodDisplay() {
    const dateRange = calculateDateRange(currentFilters.period);
    const periodText = formatDateRange(dateRange.start, dateRange.end);

    const periodRangeEl = document.getElementById('periodRange');
    if (periodRangeEl) {
        periodRangeEl.textContent = periodText;
    }
}

/**
 * 테이블 렌더링
 */
function renderReportTable() {
    const tbody = document.getElementById('reportTableBody');
    if (!tbody) return;

    // 빈 상태 체크
    if (Object.keys(groupedReports).length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="16" class="empty-state">
                    <p>📭 조회된 보고서가 없습니다</p>
                </td>
            </tr>
        `;
        return;
    }

    let html = '';

    // 담당자별로 렌더링
    Object.values(groupedReports).forEach(group => {
        // 그룹 헤더
        html += renderGroupHeader(group);

        // 보고서 행들
        group.reports.forEach(report => {
            html += renderReportRow(report, group.employee);
        });

        // 소계 행
        html += renderSubtotalRow(group);
    });

    tbody.innerHTML = html;

    // 토글 이벤트 등록
    attachToggleEvents();

    // 행 클릭 이벤트 등록
    attachRowClickEvents();
}

/**
 * 그룹 헤더 렌더링
 */
function renderGroupHeader(group) {
    const reportCount = group.reports.length;
    const collectionRate = group.subtotal.collectionRate;
    const salesRate = group.subtotal.salesRate;

    return `
        <tr class="group-header collapsed" data-employee="${group.employee}">
            <td colspan="16" class="group-header-cell">
                <div class="group-header-content">
                    <button class="toggle-btn" aria-label="펼치기/접기">▶</button>
                    <span class="employee-info">
                        <strong>👤 ${group.employee}</strong> (${group.department}) - 보고서 ${reportCount}건
                    </span>
                    <span class="group-summary">
                        수금: ${collectionRate}% | 매출: ${salesRate}%
                    </span>
                </div>
            </td>
        </tr>
    `;
}

/**
 * 보고서 행 렌더링
 */
function renderReportRow(report, employee) {
    const collectionRate = calculateRate(report.actualCollectionAmount, report.targetCollectionAmount);
    const salesRate = calculateRate(report.actualSalesAmount, report.targetSalesAmount);

    // 거래처 누적 정보 가져오기
    const company = companiesMap[report.companyId] || {};
    const accumulatedSales = company.accumulatedSales || 0;
    const accumulatedCollection = company.accumulatedCollection || 0;

    // 직원 정보에서 부서 조회
    const employeeInfo = employeesMap[report.submittedBy] || {};
    const department = employeeInfo.department || '미분류';

    // 일반 행 + 상세 정보 행
    return `
        <tr class="report-row clickable" data-employee="${employee}" data-report-id="${report.reportId}" style="display: none;">
            <td>${formatDate(report.submittedDate)}</td>
            <td>${department}</td>
            <td>${report.submittedBy || '-'}</td>
            <td>${report.companyName || '-'}</td>
            <td>${company.ceo || '-'}</td>
            <td class="amount">${formatCurrencyLocal(report.targetCollectionAmount)}</td>
            <td class="amount">${formatCurrencyLocal(report.actualCollectionAmount)}</td>
            <td class="rate ${getRateClass(collectionRate)}">${collectionRate}%</td>
            <td class="amount">${formatCurrencyLocal(report.targetSalesAmount)}</td>
            <td class="amount">${formatCurrencyLocal(report.actualSalesAmount)}</td>
            <td class="rate ${getRateClass(salesRate)}">${salesRate}%</td>
            <td class="activity" title="${getActivityText(report)}">${getActivityText(report)}</td>
            <td class="status">${getStatusBadge(collectionRate, salesRate)}</td>
            <td class="amount">${formatCurrencyLocal(accumulatedSales)}</td>
            <td class="amount">${formatCurrencyLocal(accumulatedCollection)}</td>
            <td>
                <button class="btn-detail-toggle" data-report-id="${report.reportId}">
                    <span class="toggle-icon">▼</span>
                    <span class="toggle-text">상세보기</span>
                </button>
            </td>
        </tr>
        ${renderReportDetailRow(report, employee, company, department, collectionRate, salesRate)}
    `;
}

/**
 * 보고서 상세 정보 행 렌더링 (영업활동만 표시)
 */
function renderReportDetailRow(report, employee, company, department, collectionRate, salesRate) {
    return `
        <tr class="report-detail-row collapsed" data-employee="${employee}" data-report-id="${report.reportId}-detail" style="display: none;">
            <td colspan="16">
                <div class="report-detail-container">
                    <!-- 영업활동(특이사항)만 표시 -->
                    <div class="report-detail-activity">
                        <h4>📝 영업활동 (특이사항)</h4>
                        <div class="report-detail-activity-content">${getActivityText(report)}</div>
                    </div>
                </div>
            </td>
        </tr>
    `;
}

/**
 * 소계 행 렌더링
 */
function renderSubtotalRow(group) {
    const subtotal = group.subtotal;

    return `
        <tr class="subtotal-row" data-employee="${group.employee}" style="display: none;">
            <td colspan="5" class="subtotal-label">💰 소계 (${group.employee})</td>
            <td class="amount">${formatCurrencyLocal(subtotal.targetCollection)}</td>
            <td class="amount">${formatCurrencyLocal(subtotal.actualCollection)}</td>
            <td class="rate ${getRateClass(subtotal.collectionRate)}">${subtotal.collectionRate}%</td>
            <td class="amount">${formatCurrencyLocal(subtotal.targetSales)}</td>
            <td class="amount">${formatCurrencyLocal(subtotal.actualSales)}</td>
            <td class="rate ${getRateClass(subtotal.salesRate)}">${subtotal.salesRate}%</td>
            <td colspan="5"></td>
        </tr>
    `;
}

/**
 * 요약 정보 렌더링
 */
function renderSummary() {
    const employeeCount = Object.keys(groupedReports).length;
    const reportCount = filteredReports.length;

    let totalTargetCollection = 0;
    let totalActualCollection = 0;
    let totalTargetSales = 0;
    let totalActualSales = 0;

    filteredReports.forEach(report => {
        totalTargetCollection += Number(report.targetCollectionAmount) || 0;
        totalActualCollection += Number(report.actualCollectionAmount) || 0;
        totalTargetSales += Number(report.targetSalesAmount) || 0;
        totalActualSales += Number(report.actualSalesAmount) || 0;
    });

    const collectionRate = calculateRate(totalActualCollection, totalTargetCollection);
    const salesRate = calculateRate(totalActualSales, totalTargetSales);

    // UI 업데이트
    document.getElementById('totalEmployees').textContent = `${employeeCount}명`;
    document.getElementById('totalReports').textContent = `${reportCount}건`;
    document.getElementById('totalTargetCollection').textContent = formatCurrencyLocal(totalTargetCollection);
    document.getElementById('totalActualCollection').textContent = formatCurrencyLocal(totalActualCollection);
    document.getElementById('collectionRate').textContent = `${collectionRate}%`;
    document.getElementById('totalTargetSales').textContent = formatCurrencyLocal(totalTargetSales);
    document.getElementById('totalActualSales').textContent = formatCurrencyLocal(totalActualSales);
    document.getElementById('salesRate').textContent = `${salesRate}%`;
}

// ============================================
// 토글 기능
// ============================================

/**
 * 토글 이벤트 등록
 */
function attachToggleEvents() {
    const groupHeaders = document.querySelectorAll('.group-header');

    groupHeaders.forEach(header => {
        header.addEventListener('click', handleToggleGroup);
    });
}

/**
 * 그룹 토글 핸들러
 */
function handleToggleGroup(event) {
    const header = event.currentTarget;
    const employee = header.dataset.employee;
    const isExpanded = header.classList.contains('expanded');

    // 관련 행들 찾기
    const relatedRows = document.querySelectorAll(`tr[data-employee="${employee}"]:not(.group-header)`);

    if (isExpanded) {
        // 접기
        header.classList.remove('expanded');
        header.classList.add('collapsed');
        relatedRows.forEach(row => {
            row.style.display = 'none';
        });
    } else {
        // 펼치기
        header.classList.remove('collapsed');
        header.classList.add('expanded');
        relatedRows.forEach(row => {
            row.style.display = '';
        });
    }
}

// ============================================
// 이벤트 핸들러
// ============================================

/**
 * 기간 변경 핸들러
 */
function handlePeriodChange(event) {
    currentFilters.period = event.target.value;
}

/**
 * 필터 적용 핸들러
 */
async function handleApplyFilter() {
    // select 값 가져오기
    currentFilters.department = document.getElementById('departmentFilter')?.value || '';
    currentFilters.employee = document.getElementById('employeeFilter')?.value || '';


    // 데이터 다시 로드
    await loadReports();
}

/**
 * 새로고침 핸들러
 */
async function handleRefresh() {
    showToast('데이터를 새로고침합니다...', 'info');
    await loadReports();
    showToast('새로고침 완료', 'success');
}

// ============================================
// 유틸리티 함수
// ============================================

/**
 * 금액 포맷팅 (공통 함수 래퍼 - 안전 처리)
 */
function formatCurrencyLocal(amount) {
    if (!amount || amount === 0 || isNaN(amount)) return '-';

    const formatted = formatCurrency(amount);
    // formatCurrency는 객체를 반환할 수 있음 (음수의 경우)
    if (typeof formatted === 'object' && formatted.text) {
        return formatted.text;
    }
    return formatted;
}

/**
 * 달성률 클래스 반환
 */
function getRateClass(rate) {
    if (rate >= 100) return 'excellent';
    if (rate >= 80) return 'good';
    if (rate >= 60) return 'warning';
    return 'poor';
}

/**
 * 영업활동 텍스트 추출
 */
function getActivityText(report) {
    if (!report.activityNotes) return '-';

    try {
        const activities = JSON.parse(report.activityNotes);
        if (Array.isArray(activities) && activities.length > 0) {
            return activities.map(a => a.content).join(', ') || '-';
        }
    } catch (e) {
        // JSON 파싱 실패 시 문자열 그대로 반환
        return report.activityNotes;
    }

    return '-';
}

/**
 * 이행여부 배지 생성
 */
function getStatusBadge(collectionRate, salesRate) {
    const avgRate = (collectionRate + salesRate) / 2;

    if (avgRate >= 80) {
        return '<span class="badge badge-success">✅ 완료</span>';
    } else if (avgRate >= 50) {
        return '<span class="badge badge-warning">⏳ 진행중</span>';
    } else {
        return '<span class="badge badge-danger">❌ 미이행</span>';
    }
}

/**
 * 제품 데이터 포맷팅 (JSON → 제품명만 추출)
 */
function formatProductsData(productsJson) {
    if (!productsJson) return '-';

    try {
        const products = JSON.parse(productsJson);
        if (!Array.isArray(products) || products.length === 0) {
            return '-';
        }

        return products.map(product => product.name || '제품명 없음').join(', ');
    } catch (e) {
        // JSON 파싱 실패 시 원본 문자열 반환
        return productsJson;
    }
}

// ============================================
// 모달 기능
// ============================================

/**
 * 보고서 행 클릭 이벤트 등록
 */
function attachRowClickEvents() {
    const toggleButtons = document.querySelectorAll('.btn-detail-toggle');
    toggleButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation(); // 이벤트 버블링 방지
            const reportId = button.dataset.reportId;
            toggleReportDetail(reportId, button);
        });
    });
}

/**
 * 보고서 상세 정보 토글
 */
function toggleReportDetail(reportId, button) {
    const detailRow = document.querySelector(`.report-detail-row[data-report-id="${reportId}-detail"]`);

    if (!detailRow) return;

    const isExpanded = detailRow.classList.contains('expanded');
    const toggleIcon = button.querySelector('.toggle-icon');
    const toggleText = button.querySelector('.toggle-text');

    if (isExpanded) {
        // 접기
        detailRow.classList.remove('expanded');
        detailRow.classList.add('collapsed');
        detailRow.style.display = 'none';

        // 버튼 상태 변경
        button.classList.remove('expanded');
        toggleIcon.textContent = '▼';
        toggleText.textContent = '상세보기';
    } else {
        // 펼치기
        detailRow.classList.remove('collapsed');
        detailRow.classList.add('expanded');
        detailRow.style.display = 'table-row';

        // 버튼 상태 변경
        button.classList.add('expanded');
        toggleIcon.textContent = '▲';
        toggleText.textContent = '접기';
    }
}

/**
 * 보고서 상세 모달 표시
 */
function showReportDetail(report) {
    const collectionRate = calculateRate(report.actualCollectionAmount, report.targetCollectionAmount);
    const salesRate = calculateRate(report.actualSalesAmount, report.targetSalesAmount);
    const company = companiesMap[report.companyId] || {};
    const employeeInfo = employeesMap[report.submittedBy] || {};

    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = `
        <div class="detail-section">
            <h3>📊 기본 정보</h3>
            <div class="detail-grid">
                <div class="detail-item">
                    <span class="detail-label">보고일</span>
                    <span class="detail-value">${formatDate(report.submittedDate)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">담당부서</span>
                    <span class="detail-value">${employeeInfo.department || '미분류'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">내부담당자</span>
                    <span class="detail-value">${report.submittedBy || '-'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">보고서 ID</span>
                    <span class="detail-value">${report.reportId}</span>
                </div>
            </div>
        </div>

        <div class="detail-section">
            <h3>🏢 거래처 정보</h3>
            <div class="detail-grid">
                <div class="detail-item">
                    <span class="detail-label">거래처명</span>
                    <span class="detail-value">${report.companyName || '-'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">대표이사</span>
                    <span class="detail-value">${company.ceo || '-'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">누적매출</span>
                    <span class="detail-value amount">${formatCurrencyLocal(company.accumulatedSales)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">누적수금</span>
                    <span class="detail-value amount">${formatCurrencyLocal(company.accumulatedCollection)}</span>
                </div>
            </div>
        </div>

        <div class="detail-section">
            <h3>💰 수금 실적</h3>
            <div class="detail-grid">
                <div class="detail-item">
                    <span class="detail-label">목표수금액</span>
                    <span class="detail-value amount">${formatCurrencyLocal(report.targetCollectionAmount)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">실제수금액</span>
                    <span class="detail-value amount">${formatCurrencyLocal(report.actualCollectionAmount)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">수금달성율</span>
                    <span class="detail-value rate ${getRateClass(collectionRate)}">${collectionRate}%</span>
                </div>
            </div>
        </div>

        <div class="detail-section">
            <h3>📈 매출 실적</h3>
            <div class="detail-grid">
                <div class="detail-item">
                    <span class="detail-label">목표매출액</span>
                    <span class="detail-value amount">${formatCurrencyLocal(report.targetSalesAmount)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">실제매출액</span>
                    <span class="detail-value amount">${formatCurrencyLocal(report.actualSalesAmount)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">매출달성율</span>
                    <span class="detail-value rate ${getRateClass(salesRate)}">${salesRate}%</span>
                </div>
            </div>
        </div>

        <div class="detail-section">
            <h3>📝 영업활동</h3>
            <div class="detail-item detail-full">
                <div class="activity-content">${getActivityText(report)}</div>
            </div>
        </div>

        ${(report.soldProducts || report.targetProducts) ? `
        <div class="detail-section">
            <h3>✅ 판매제품</h3>
            <div class="detail-item detail-full">
                <div class="activity-content">${formatProductsData(report.soldProducts || report.targetProducts)}</div>
            </div>
        </div>
        ` : ''}
    `;

    const modal = document.getElementById('reportModal');
    modal.classList.add('show');

    // ESC 키로 닫기
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            closeReportModal();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);

    // 오버레이 클릭 시 닫기
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeReportModal();
        }
    });
}

/**
 * 보고서 상세 모달 닫기
 */
function closeReportModal() {
    const modal = document.getElementById('reportModal');
    modal.classList.remove('show');
}

// 전역 함수로 등록 (HTML에서 사용)
window.closeReportModal = closeReportModal;

// ============================================
// 비교보고 기능
// ============================================

/**
 * Flatpickr 달력 초기화
 */
function initComparisonDatePickers() {

    const today = new Date().toISOString().split('T')[0];

    // 기본 기간 설정 (금주)
    const defaultRange = calculateDateRange('weekly');

    // 시작일 달력 초기화
    const startDateEl = document.getElementById('comparisonStartDate');
    if (startDateEl) {
        // ✅ Flatpickr 라이브러리 확인
        if (typeof flatpickr !== 'undefined') {

            try {
                startDatePicker = flatpickr(startDateEl, {
                    locale: 'ko',                    // 한국어
                    dateFormat: 'Y-m-d',             // 날짜 형식 (YYYY-MM-DD)
                    defaultDate: defaultRange.start, // 기본값: 금주 시작일
                    maxDate: today,                  // 최대 선택 가능일: 오늘
                    allowInput: false,               // 직접 입력 비활성화 (달력만 사용)
                    clickOpens: true,                // 클릭 시 달력 열기
                    position: 'auto',                // 위치 자동 조정
                    disableMobile: false,            // 모바일에서도 커스텀 달력 사용
                    onChange: function(selectedDates, dateStr) {
                        comparisonFilters.startDate = dateStr;
                        updateComparisonPeriodDisplay();

                        // 시작일이 종료일보다 늦으면 종료일도 업데이트
                        if (comparisonFilters.endDate && dateStr > comparisonFilters.endDate) {
                            endDatePicker?.setDate(dateStr);
                        }
                    }
                });

                comparisonFilters.startDate = defaultRange.start;
            } catch (error) {
                logger.error('[비교보고] ❌ 시작일 Flatpickr 초기화 오류:', error);
                // 오류 시 폴백
                startDateEl.value = defaultRange.start;
                startDateEl.setAttribute('type', 'date');
                startDateEl.removeAttribute('readonly');
                comparisonFilters.startDate = defaultRange.start;
            }
        } else {
            // Flatpickr 라이브러리가 없으면 기본 date input 방식으로 폴백
            logger.warn('[비교보고] ⚠️ Flatpickr 라이브러리를 찾을 수 없습니다 - 기본 date input 사용');
            startDateEl.value = defaultRange.start;
            startDateEl.setAttribute('type', 'date');
            startDateEl.setAttribute('max', today);
            comparisonFilters.startDate = defaultRange.start;

            // 네이티브 date input change 이벤트 리스너 추가
            startDateEl.addEventListener('change', (e) => {
                comparisonFilters.startDate = e.target.value;
                updateComparisonPeriodDisplay();

                // 시작일이 종료일보다 늦으면 종료일도 업데이트
                if (comparisonFilters.endDate && e.target.value > comparisonFilters.endDate) {
                    const endDateInput = document.getElementById('comparisonEndDate');
                    if (endDateInput) {
                        endDateInput.value = e.target.value;
                        comparisonFilters.endDate = e.target.value;
                    }
                }
            });
        }
    } else {
        logger.error('[비교보고] ❌ comparisonStartDate 요소를 찾을 수 없습니다');
    }

    // 종료일 달력 초기화
    const endDateEl = document.getElementById('comparisonEndDate');
    if (endDateEl) {
        // ✅ Flatpickr 라이브러리 확인
        if (typeof flatpickr !== 'undefined') {
            try {
                endDatePicker = flatpickr(endDateEl, {
                    locale: 'ko',                    // 한국어
                    dateFormat: 'Y-m-d',             // 날짜 형식 (YYYY-MM-DD)
                    defaultDate: defaultRange.end,   // 기본값: 금주 종료일
                    maxDate: today,                  // 최대 선택 가능일: 오늘
                    allowInput: false,               // 직접 입력 비활성화 (달력만 사용)
                    clickOpens: true,                // 클릭 시 달력 열기
                    position: 'auto',                // 위치 자동 조정
                    disableMobile: false,            // 모바일에서도 커스텀 달력 사용
                    onChange: function(selectedDates, dateStr) {
                        comparisonFilters.endDate = dateStr;
                        updateComparisonPeriodDisplay();

                        // 종료일이 시작일보다 이르면 시작일도 업데이트
                        if (comparisonFilters.startDate && dateStr < comparisonFilters.startDate) {
                            startDatePicker?.setDate(dateStr);
                        }
                    }
                });

                comparisonFilters.endDate = defaultRange.end;
            } catch (error) {
                logger.error('[비교보고] ❌ 종료일 Flatpickr 초기화 오류:', error);
                // 오류 시 폴백
                endDateEl.value = defaultRange.end;
                endDateEl.setAttribute('type', 'date');
                endDateEl.removeAttribute('readonly');
                comparisonFilters.endDate = defaultRange.end;
            }
        } else {
            // Flatpickr 라이브러리가 없으면 기본 date input 방식으로 폴백
            endDateEl.value = defaultRange.end;
            endDateEl.setAttribute('type', 'date');
            endDateEl.setAttribute('max', today);
            comparisonFilters.endDate = defaultRange.end;

            // 네이티브 date input change 이벤트 리스너 추가
            endDateEl.addEventListener('change', (e) => {
                comparisonFilters.endDate = e.target.value;
                updateComparisonPeriodDisplay();

                // 종료일이 시작일보다 이르면 시작일도 업데이트
                if (comparisonFilters.startDate && e.target.value < comparisonFilters.startDate) {
                    const startDateInput = document.getElementById('comparisonStartDate');
                    if (startDateInput) {
                        startDateInput.value = e.target.value;
                        comparisonFilters.startDate = e.target.value;
                    }
                }
            });
        }
    } else {
        logger.error('[비교보고] ❌ comparisonEndDate 요소를 찾을 수 없습니다');
    }

    // 초기 기간 표시 업데이트
    updateComparisonPeriodDisplay();
}

/**
 * 기간확정 버튼 핸들러
 */
function handleConfirmPeriod() {

    // 날짜 입력 필드에서 직접 값 읽기 (Flatpickr가 제대로 작동하지 않을 경우 대비)
    const startDateInput = document.getElementById('comparisonStartDate');
    const endDateInput = document.getElementById('comparisonEndDate');

    if (startDateInput && startDateInput.value) {
        comparisonFilters.startDate = startDateInput.value;
    }
    if (endDateInput && endDateInput.value) {
        comparisonFilters.endDate = endDateInput.value;
    }

    // 날짜 검증
    if (!comparisonFilters.startDate || !comparisonFilters.endDate) {
        showToast('시작일과 종료일을 모두 선택해주세요', 'warning');
        return;
    }

    // 시작일이 종료일보다 늦을 경우
    if (comparisonFilters.startDate > comparisonFilters.endDate) {
        showToast('시작일은 종료일보다 늦을 수 없습니다', 'error');
        return;
    }

    // 선택된 기간 표시 업데이트
    updateComparisonPeriodDisplay();

    // 성공 메시지
    const periodText = formatDateRange(comparisonFilters.startDate, comparisonFilters.endDate);
    showToast(`기간이 확정되었습니다: ${periodText}`, 'success');

}

/**
 * 비교보고 기간 유형 변경 핸들러
 */
function handleComparisonPeriodChange(event) {
    comparisonFilters.period = event.target.value;

    // 주간/월간/연간은 단지 테이블 표시 방식만 변경
    // 시작일/종료일은 사용자가 입력한 값 유지
    // updateComparisonPeriodDisplay()는 호출하지 않음 (날짜가 변경되지 않았으므로)
}

/**
 * 선택된 기간 표시 업데이트
 */
function updateComparisonPeriodDisplay() {

    const periodRangeEl = document.getElementById('comparisonPeriodRange');

    if (!periodRangeEl) {
        logger.error('[비교보고] ❌ comparisonPeriodRange 요소를 찾을 수 없습니다');
        return;
    }

    if (comparisonFilters.startDate && comparisonFilters.endDate) {
        const periodText = formatDateRange(comparisonFilters.startDate, comparisonFilters.endDate);
        periodRangeEl.textContent = periodText;
    } else {
        periodRangeEl.textContent = '날짜를 선택하세요';
    }
}

/**
 * 계층적 그룹화 토글 핸들러
 */
function handleToggleGrouping() {

    comparisonFilters.groupingExpanded = !comparisonFilters.groupingExpanded;


    // 버튼 텍스트 업데이트
    const toggleText = document.getElementById('groupingToggleText');
    if (toggleText) {
        if (comparisonFilters.department) {
            // 특정 부서 선택된 경우: 직원별 상세
            toggleText.textContent = comparisonFilters.groupingExpanded ? '👤 직원별 접기' : '👤 직원별 상세 표시';
        } else {
            // 전체 선택된 경우: 부서별 상세
            toggleText.textContent = comparisonFilters.groupingExpanded ? '🏢 부서별 접기' : '🏢 부서별 상세 표시';
        }
    }

    // 테이블 재렌더링
    renderComparisonTable();
}

/**
 * 비교 조회 핸들러
 */
async function handleComparisonSearch() {
    // 필터 값 가져오기
    comparisonFilters.department = document.getElementById('comparisonDepartment')?.value || '';
    comparisonFilters.employee = document.getElementById('comparisonEmployee')?.value || '';
    comparisonFilters.includeZeroReports = document.getElementById('includeZeroReports')?.checked || false;

    // 날짜 검증
    if (!comparisonFilters.startDate || !comparisonFilters.endDate) {
        showToast('시작일과 종료일을 선택해주세요', 'warning');
        return;
    }

    // 시작일이 종료일보다 늦을 경우
    if (comparisonFilters.startDate > comparisonFilters.endDate) {
        showToast('시작일은 종료일보다 늦을 수 없습니다', 'error');
        return;
    }

    showToast('비교보고 데이터를 조회합니다...', 'info');

    try {
        await loadComparisonReports();
    } catch (error) {
        logger.error('[비교보고] ❌ 조회 실패:', error);
        showToast('비교보고 조회 중 오류가 발생했습니다', 'error');
    }
}

/**
 * 비교보고 데이터 로드
 */
async function loadComparisonReports() {
    try {

        // API 호출 파라미터 구성
        const params = {
            startDate: comparisonFilters.startDate,
            endDate: comparisonFilters.endDate
        };

        // ⚠️ 부서 필터는 API에 전달하지 않음 (API가 제대로 처리 못함)
        // 클라이언트에서 필터링할 예정
        // if (comparisonFilters.department) {
        //     params.department = comparisonFilters.department;
        // }

        // 담당자 필터는 API에 전달
        if (comparisonFilters.employee) {
            params.submittedBy = comparisonFilters.employee;
        }


        // API 호출
        const response = await apiManager.getReports(params);

        // 데이터 파싱
        if (response && response.data && Array.isArray(response.data.reports)) {
            comparisonReports = response.data.reports;
        } else if (Array.isArray(response)) {
            comparisonReports = response;
        } else {
            comparisonReports = [];
        }


        // 작성자별로 보고서 수 확인
        const submitterCounts = {};
        comparisonReports.forEach(report => {
            const submitter = report.submittedBy || '미상';
            submitterCounts[submitter] = (submitterCounts[submitter] || 0) + 1;
        });

        // ✅ 클라이언트 사이드 필터링 (API가 필터를 보냈으면 이미 필터링됨)
        // API에 department나 submittedBy 파라미터를 전달했다면 클라이언트 필터링 스킵
        const apiFilteredByDepartment = params.department !== undefined;
        const apiFilteredByEmployee = params.submittedBy !== undefined;

        let beforeClientFilterCount = comparisonReports.length;

        // 담당부서 필터 (API에서 필터링하지 않았을 경우에만 클라이언트에서 필터링)
        if (comparisonFilters.department && !apiFilteredByDepartment) {
            comparisonReports = comparisonReports.filter(report => {
                const employeeInfo = employeesMap[report.submittedBy] || {};
                const reportDepartment = employeeInfo.department || report.department || '미분류';
                const passed = reportDepartment === comparisonFilters.department;

                if (!passed) {
                }

                return passed;
            });

            beforeClientFilterCount = comparisonReports.length;
        } else if (comparisonFilters.department && apiFilteredByDepartment) {
        }

        // 내부담당자 필터 (API에서 필터링하지 않았을 경우에만 클라이언트에서 필터링)
        if (comparisonFilters.employee && !apiFilteredByEmployee) {
            comparisonReports = comparisonReports.filter(report => {
                const passed = report.submittedBy === comparisonFilters.employee;

                if (!passed) {
                }

                return passed;
            });

        } else if (comparisonFilters.employee && apiFilteredByEmployee) {
        }

        // 실적 0 필터링 (체크박스 설정에 따라)
        const beforeFilterCount = comparisonReports.length;

        if (!comparisonFilters.includeZeroReports) {
            // 실제 실행된 실적만 필터링 (actualCollectionAmount 또는 actualSalesAmount가 0보다 큰 경우)
            comparisonReports = comparisonReports.filter(report => {
                const hasActualCollection = Number(report.actualCollectionAmount) > 0;
                const hasActualSales = Number(report.actualSalesAmount) > 0;
                const passed = hasActualCollection || hasActualSales;

                // 필터링되는 보고서 로그
                if (!passed) {
                }

                return passed;
            });


            // 필터링 후 작성자별 보고서 수
            const afterSubmitterCounts = {};
            comparisonReports.forEach(report => {
                const submitter = report.submittedBy || '미상';
                afterSubmitterCounts[submitter] = (afterSubmitterCounts[submitter] || 0) + 1;
            });
        } else {
        }

        // 선택 기간 표시 업데이트
        updateComparisonPeriodDisplay();

        // UI 렌더링
        renderComparisonTable();
        renderComparisonSummary();

        showToast(`비교보고 ${comparisonReports.length}건 조회 완료`, 'success');

    } catch (error) {
        logger.error('[비교보고] ❌ 데이터 로드 실패:', error);
        throw error;
    }
}

/**
 * 선택된 기간 범위 내의 모든 기간 생성 (보고서 없는 기간도 포함)
 */
function generatePeriodRanges(startDate, endDate, periodType) {
    const periods = {};
    const start = new Date(startDate);
    const end = new Date(endDate);


    if (periodType === 'weekly') {
        // 시작일이 속한 주의 월요일부터 시작
        let currentMonday = getMonday(start);

        while (currentMonday <= end) {
            const sunday = getSunday(currentMonday);
            const groupKey = currentMonday.toISOString().split('T')[0];

            periods[groupKey] = {
                periodType: 'weekly',
                startDate: currentMonday.toISOString().split('T')[0],
                endDate: sunday.toISOString().split('T')[0],
                displayText: `${currentMonday.getMonth() + 1}월 ${currentMonday.getDate()}일 ~ ${sunday.getMonth() + 1}월 ${sunday.getDate()}일`,
                reports: []
            };

            // 다음 주로 이동
            currentMonday = new Date(currentMonday);
            currentMonday.setDate(currentMonday.getDate() + 7);
        }
    } else if (periodType === 'monthly') {
        let currentYear = start.getFullYear();
        let currentMonth = start.getMonth();

        while (new Date(currentYear, currentMonth, 1) <= end) {
            const firstDay = new Date(currentYear, currentMonth, 1);
            const lastDay = new Date(currentYear, currentMonth + 1, 0);
            const groupKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

            periods[groupKey] = {
                periodType: 'monthly',
                startDate: firstDay.toISOString().split('T')[0],
                endDate: lastDay.toISOString().split('T')[0],
                displayText: `${currentYear}년 ${currentMonth + 1}월`,
                reports: []
            };

            // 다음 월로 이동
            currentMonth++;
            if (currentMonth > 11) {
                currentMonth = 0;
                currentYear++;
            }
        }
    } else if (periodType === 'yearly') {
        let currentYear = start.getFullYear();
        const endYear = end.getFullYear();

        while (currentYear <= endYear) {
            const groupKey = String(currentYear);

            periods[groupKey] = {
                periodType: 'yearly',
                startDate: `${currentYear}-01-01`,
                endDate: `${currentYear}-12-31`,
                displayText: `${currentYear}년`,
                reports: []
            };

            currentYear++;
        }
    }

    return periods;
}

/**
 * 기간별 보고서 그룹화 (주간/월간/연간) - 선택된 범위 내 모든 기간 포함
 */
function groupReportsByPeriod(reports, period, startDate, endDate) {
    // 먼저 선택된 범위 내의 모든 기간 생성
    const grouped = generatePeriodRanges(startDate, endDate, period);


    // 보고서를 해당 기간에 배치
    reports.forEach(report => {
        const reportDate = new Date(report.submittedDate);
        let groupKey;

        if (period === 'weekly') {
            // 주간: 해당 주의 월요일 날짜를 키로 사용
            const monday = getMonday(reportDate);
            groupKey = monday.toISOString().split('T')[0];
        } else if (period === 'monthly') {
            // 월간: YYYY-MM 형식을 키로 사용
            const year = reportDate.getFullYear();
            const month = reportDate.getMonth();
            groupKey = `${year}-${String(month + 1).padStart(2, '0')}`;
        } else if (period === 'yearly') {
            // 연간: YYYY 형식을 키로 사용
            const year = reportDate.getFullYear();
            groupKey = String(year);
        }

        // 해당 기간이 존재하면 보고서 추가
        if (grouped[groupKey]) {
            grouped[groupKey].reports.push(report);
        }
    });

    return grouped;
}

/**
 * 부서별 보고서 그룹화
 */
function groupReportsByDepartment(reports) {

    const grouped = {};

    reports.forEach((report, index) => {
        const employeeInfo = employeesMap[report.submittedBy] || {};
        const department = employeeInfo.department || report.department || '미분류';

        if (!grouped[department]) {
            grouped[department] = {
                department: department,
                employees: {},
                reports: []
            };
        }

        // 부서 내 직원별로도 그룹화
        const employee = report.submittedBy || '미상';
        if (!grouped[department].employees[employee]) {
            grouped[department].employees[employee] = {
                employee: employee,
                reports: []
            };
        }

        grouped[department].employees[employee].reports.push(report);
        grouped[department].reports.push(report);
    });

    return grouped;
}

/**
 * 보고서 배열의 실적 합계 계산
 */
function aggregateReports(reports) {
    let totalActualCollection = 0;
    let totalActualSales = 0;
    let totalTargetCollection = 0;
    let totalTargetSales = 0;

    reports.forEach(report => {
        totalActualCollection += Number(report.actualCollectionAmount) || 0;
        totalActualSales += Number(report.actualSalesAmount) || 0;
        totalTargetCollection += Number(report.targetCollectionAmount) || 0;
        totalTargetSales += Number(report.targetSalesAmount) || 0;
    });

    const collectionRate = calculateRate(totalActualCollection, totalTargetCollection);
    const salesRate = calculateRate(totalActualSales, totalTargetSales);

    return {
        count: reports.length,
        totalActualCollection,
        totalActualSales,
        totalTargetCollection,
        totalTargetSales,
        collectionRate,
        salesRate
    };
}

/**
 * 비교보고 테이블 렌더링
 */
function renderComparisonTable() {
    const tbody = document.getElementById('comparisonTableBody');
    const container = document.getElementById('comparisonTableContainer');
    const emptyState = document.getElementById('comparisonEmptyState');

    if (!tbody || !container || !emptyState) return;

    // ✅ 빈 상태 체크 (부서/직원이 선택되지 않았을 때만)
    // 부서나 직원이 선택된 경우에는 보고서가 0건이어도 0원으로 표시
    const isDepartmentOrEmployeeSelected = comparisonFilters.department || comparisonFilters.employee;

    if (comparisonReports.length === 0 && !isDepartmentOrEmployeeSelected) {
        container.style.display = 'none';
        emptyState.style.display = 'block';

        const zeroReportsIncluded = comparisonFilters.includeZeroReports;
        const emptyMessage = zeroReportsIncluded
            ? '선택한 기간 동안 작성된 보고서가 없습니다'
            : '선택한 기간 동안 실제 실행된 실적이 없습니다';
        const emptyHint = zeroReportsIncluded
            ? ''
            : '<p class="empty-subtext">💡 "실적 0인 보고서도 포함" 옵션을 체크하면 모든 보고서를 볼 수 있습니다</p>';

        emptyState.innerHTML = `
            <div class="empty-icon">📭</div>
            <p class="empty-text">조회된 실적 보고서가 없습니다</p>
            <p class="empty-subtext">${emptyMessage}</p>
            ${emptyHint}
        `;
        return;
    }

    // 테이블 표시
    container.style.display = 'block';
    emptyState.style.display = 'none';

    let html = '';
    let aggregationInfo = '';

    // 필터 조건에 따라 다른 렌더링 방식 적용
    if (comparisonFilters.employee) {
        // 담당부서 + 내부담당자 선택: 특정 직원의 기간별 데이터
        html = renderComparisonByEmployee();
        const periodName = comparisonFilters.period === 'weekly' ? '주간' : comparisonFilters.period === 'monthly' ? '월간' : '연간';
        aggregationInfo = `📊 <strong>${comparisonFilters.employee}</strong>님의 <strong>${periodName}</strong> 기간별 집계`;
    } else if (comparisonFilters.department) {
        // 담당부서만 선택: 해당 부서의 직원별 전체 합계
        html = renderComparisonByDepartment();
        aggregationInfo = `👥 <strong>${comparisonFilters.department}</strong> 부서의 <strong>직원별 전체 합계</strong>`;
    } else {
        // 부서/직원 선택 없음: 기간별 전체 집계
        html = renderComparisonByPeriod();
        const periodName = comparisonFilters.period === 'weekly' ? '주간' : comparisonFilters.period === 'monthly' ? '월간' : '연간';
        aggregationInfo = `📅 전체 데이터의 <strong>${periodName}</strong> 기간별 집계`;
    }


    // 집계 방식 안내 표시
    const aggregationInfoEl = document.getElementById('comparisonAggregationInfo');
    if (aggregationInfoEl) {
        aggregationInfoEl.innerHTML = aggregationInfo;
        aggregationInfoEl.style.display = 'block';
    }

    // ✅ 토글 버튼 표시/숨김 (직원이 선택되지 않은 경우에만 표시)
    const groupingToggleContainer = document.getElementById('comparisonGroupingToggle');
    const toggleText = document.getElementById('groupingToggleText');

    if (!comparisonFilters.employee) {
        // 직원이 선택되지 않은 경우에만 토글 버튼 표시
        if (groupingToggleContainer) {
            groupingToggleContainer.style.display = 'block';
        }

        // 버튼 텍스트 설정
        if (toggleText) {
            if (comparisonFilters.department) {
                // 특정 부서 선택: 직원별 상세
                toggleText.textContent = comparisonFilters.groupingExpanded ? '👤 직원별 접기' : '👤 직원별 상세 표시';
            } else {
                // 전체 선택: 부서별 상세
                toggleText.textContent = comparisonFilters.groupingExpanded ? '🏢 부서별 접기' : '🏢 부서별 상세 표시';
            }
        }
    } else {
        // 직원이 선택된 경우 토글 버튼 숨김
        if (groupingToggleContainer) {
            groupingToggleContainer.style.display = 'none';
        }
    }

    tbody.innerHTML = html;
}

/**
 * 기간별 집계 렌더링 (부서/직원 선택 없음)
 */
function renderComparisonByPeriod() {
    // 선택된 기간 유형과 날짜 범위로 그룹화
    const periodGroups = groupReportsByPeriod(
        comparisonReports,
        comparisonFilters.period,
        comparisonFilters.startDate,
        comparisonFilters.endDate
    );

    // 그룹 키를 날짜순으로 정렬
    const sortedKeys = Object.keys(periodGroups).sort();

    let html = '';

    sortedKeys.forEach(key => {
        const group = periodGroups[key];
        const aggregated = aggregateReports(group.reports);

        // ✅ 기간별 합계 행
        html += `
            <tr class="report-row period-total-row" style="background: rgba(16, 185, 129, 0.08); font-weight: bold;">
                <td colspan="2">${group.displayText} (전체)</td>
                <td class="amount">${formatCurrencyLocal(aggregated.totalActualCollection)}</td>
                <td class="amount">${formatCurrencyLocal(aggregated.totalActualSales)}</td>
                <td class="rate ${getRateClass(aggregated.collectionRate)}">${aggregated.collectionRate}%</td>
                <td class="rate ${getRateClass(aggregated.salesRate)}">${aggregated.salesRate}%</td>
                <td class="text-center">${aggregated.count}건</td>
            </tr>
        `;

        // ✅ 토글이 활성화된 경우: 부서별 상세 표시
        if (comparisonFilters.groupingExpanded) {
            // 해당 기간의 보고서를 부서별로 그룹화
            const periodReports = group.reports;
            const departmentGroups = {};

            periodReports.forEach(report => {
                const employeeInfo = employeesMap[report.submittedBy] || {};
                const department = employeeInfo.department || report.department || '미분류';

                if (!departmentGroups[department]) {
                    departmentGroups[department] = [];
                }
                departmentGroups[department].push(report);
            });

            // 부서명으로 정렬
            const sortedDepartments = Object.keys(departmentGroups).sort();

            sortedDepartments.forEach(department => {
                const deptReports = departmentGroups[department];
                const deptAggregated = aggregateReports(deptReports);

                html += `
                    <tr class="report-row department-detail-row" style="background: rgba(16, 185, 129, 0.03); padding-left: var(--spacing-lg);">
                        <td colspan="2" style="padding-left: 2rem;">└─ ${department}</td>
                        <td class="amount">${formatCurrencyLocal(deptAggregated.totalActualCollection)}</td>
                        <td class="amount">${formatCurrencyLocal(deptAggregated.totalActualSales)}</td>
                        <td class="rate ${getRateClass(deptAggregated.collectionRate)}">${deptAggregated.collectionRate}%</td>
                        <td class="rate ${getRateClass(deptAggregated.salesRate)}">${deptAggregated.salesRate}%</td>
                        <td class="text-center">${deptAggregated.count}건</td>
                    </tr>
                `;
            });
        }
    });

    return html;
}

/**
 * 부서별 집계 렌더링 (부서만 선택)
 */
function renderComparisonByDepartment() {

    const selectedDept = comparisonFilters.department;
    let html = '';

    // ✅ employeesMap에서 선택된 부서의 모든 직원 추출
    const departmentEmployees = Object.entries(employeesMap)
        .filter(([name, info]) => info.department === selectedDept)
        .map(([name, info]) => name)
        .sort();


    if (departmentEmployees.length === 0) {
        logger.warn(`[부서별집계] ⚠️ "${selectedDept}" 부서에 등록된 직원이 없습니다`);
        return html;
    }

    // ✅ 선택된 날짜 범위의 모든 기간 생성 (주간/월간/연간)
    const allPeriods = generatePeriodRanges(
        comparisonFilters.startDate,
        comparisonFilters.endDate,
        comparisonFilters.period
    );

    // 기간 키를 날짜순으로 정렬
    const sortedPeriodKeys = Object.keys(allPeriods).sort();

    // ✅ 각 기간별로 부서 합계 표시
    sortedPeriodKeys.forEach(periodKey => {
        const periodInfo = allPeriods[periodKey];

        // 해당 기간에 해당 부서의 모든 보고서 집계
        const periodDeptReports = comparisonReports.filter(report => {
            const reportDate = report.submittedDate;
            return reportDate >= periodInfo.startDate && reportDate <= periodInfo.endDate;
        });

        const aggregated = aggregateReports(periodDeptReports);

        // ✅ 기간별 부서 합계 행
        html += `
            <tr class="report-row period-total-row" style="background: rgba(16, 185, 129, 0.08); font-weight: bold;">
                <td colspan="2">${periodInfo.displayText} (${selectedDept} 전체)</td>
                <td class="amount">${formatCurrencyLocal(aggregated.totalActualCollection)}</td>
                <td class="amount">${formatCurrencyLocal(aggregated.totalActualSales)}</td>
                <td class="rate ${getRateClass(aggregated.collectionRate)}">${aggregated.collectionRate}%</td>
                <td class="rate ${getRateClass(aggregated.salesRate)}">${aggregated.salesRate}%</td>
                <td class="text-center">${aggregated.count}건</td>
            </tr>
        `;

        // ✅ 토글이 활성화된 경우: 직원별 상세 표시
        if (comparisonFilters.groupingExpanded) {
            departmentEmployees.forEach(employeeName => {
                const employeePeriodReports = periodDeptReports.filter(report =>
                    report.submittedBy === employeeName
                );

                const employeeAggregated = aggregateReports(employeePeriodReports);

                html += `
                    <tr class="report-row employee-detail-row" style="background: rgba(16, 185, 129, 0.03);">
                        <td colspan="2" style="padding-left: 2rem;">└─ ${employeeName}</td>
                        <td class="amount">${formatCurrencyLocal(employeeAggregated.totalActualCollection)}</td>
                        <td class="amount">${formatCurrencyLocal(employeeAggregated.totalActualSales)}</td>
                        <td class="rate ${getRateClass(employeeAggregated.collectionRate)}">${employeeAggregated.collectionRate}%</td>
                        <td class="rate ${getRateClass(employeeAggregated.salesRate)}">${employeeAggregated.salesRate}%</td>
                        <td class="text-center">${employeeAggregated.count}건</td>
                    </tr>
                `;
            });
        }
    });

    return html;
}

/**
 * 직원별 집계 렌더링 (부서 + 직원 선택)
 */
function renderComparisonByEmployee() {
    // 선택된 직원의 기간별 집계 표시 (선택된 날짜 범위 내 모든 기간 포함)
    const periodGroups = groupReportsByPeriod(
        comparisonReports,
        comparisonFilters.period,
        comparisonFilters.startDate,
        comparisonFilters.endDate
    );

    // 그룹 키를 날짜순으로 정렬
    const sortedKeys = Object.keys(periodGroups).sort();

    let html = '';

    const selectedEmployee = comparisonFilters.employee;
    const employeeInfo = employeesMap[selectedEmployee] || {};
    const department = employeeInfo.department || '미분류';

    sortedKeys.forEach(key => {
        const group = periodGroups[key];
        const aggregated = aggregateReports(group.reports);

        html += `
            <tr class="report-row">
                <td colspan="2">${group.displayText} (${department} - ${selectedEmployee})</td>
                <td class="amount">${formatCurrencyLocal(aggregated.totalActualCollection)}</td>
                <td class="amount">${formatCurrencyLocal(aggregated.totalActualSales)}</td>
                <td class="rate ${getRateClass(aggregated.collectionRate)}">${aggregated.collectionRate}%</td>
                <td class="rate ${getRateClass(aggregated.salesRate)}">${aggregated.salesRate}%</td>
                <td class="text-center">${aggregated.count}건</td>
            </tr>
        `;
    });

    return html;
}

/**
 * 비교보고 행 렌더링 (개별 보고서 - 사용 안 함)
 */
function renderComparisonRow(report) {
    const collectionRate = calculateRate(report.actualCollectionAmount, report.targetCollectionAmount);
    const salesRate = calculateRate(report.actualSalesAmount, report.targetSalesAmount);

    // 직원 정보에서 부서 조회
    const employeeInfo = employeesMap[report.submittedBy] || {};
    const department = employeeInfo.department || '미분류';

    return `
        <tr class="report-row">
            <td>${formatDate(report.submittedDate)}</td>
            <td>${department}</td>
            <td>${report.submittedBy || '-'}</td>
            <td>${report.companyName || '-'}</td>
            <td class="amount">${formatCurrencyLocal(report.actualCollectionAmount)}</td>
            <td class="amount">${formatCurrencyLocal(report.actualSalesAmount)}</td>
            <td class="rate ${getRateClass(collectionRate)}">${collectionRate}%</td>
            <td class="rate ${getRateClass(salesRate)}">${salesRate}%</td>
            <td class="activity" title="${getActivityText(report)}">${getActivityText(report)}</td>
        </tr>
    `;
}

/**
 * 비교보고 요약 렌더링
 */
function renderComparisonSummary() {
    const reportCount = comparisonReports.length;

    let totalActualCollection = 0;
    let totalActualSales = 0;
    let totalCollectionRate = 0;
    let totalSalesRate = 0;

    comparisonReports.forEach(report => {
        totalActualCollection += Number(report.actualCollectionAmount) || 0;
        totalActualSales += Number(report.actualSalesAmount) || 0;

        const collectionRate = parseFloat(calculateRate(report.actualCollectionAmount, report.targetCollectionAmount));
        const salesRate = parseFloat(calculateRate(report.actualSalesAmount, report.targetSalesAmount));

        totalCollectionRate += collectionRate;
        totalSalesRate += salesRate;
    });

    const avgCollectionRate = reportCount > 0 ? (totalCollectionRate / reportCount).toFixed(2) : '0.00';
    const avgSalesRate = reportCount > 0 ? (totalSalesRate / reportCount).toFixed(2) : '0.00';
    const avgTotalRate = reportCount > 0 ? ((parseFloat(avgCollectionRate) + parseFloat(avgSalesRate)) / 2).toFixed(2) : '0.00';

    // UI 업데이트
    document.getElementById('comparisonTotalReports').textContent = `${reportCount}건`;
    document.getElementById('comparisonActualCollection').textContent = formatCurrencyLocal(totalActualCollection);
    document.getElementById('comparisonActualSales').textContent = formatCurrencyLocal(totalActualSales);
    document.getElementById('comparisonAvgRate').textContent = `${avgTotalRate}%`;
}

/**
 * 담당자별 보고서 통계 렌더링
 */
function renderEmployeeReportStats() {

    const statsContainer = document.getElementById('employeeReportStats');
    const statsTableBody = document.getElementById('statsTableBody');
    const statsTitle = document.getElementById('employeeStatsTitle');

    if (!statsContainer || !statsTableBody || !statsTitle) {
        logger.error('❌ [영업담당자통계] DOM 요소를 찾을 수 없습니다');
        return;
    }

    // 올해 누적 기간 포맷팅
    const today = new Date();
    const year = today.getFullYear();
    const dateStr = `${year}.01.01 ~ ${year}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;
    statsTitle.textContent = `👥 영업담당자별 보고서 제출현황 (${dateStr})`;


    // 모든 영업담당자 목록 생성
    const salesEmployees = Object.entries(employeesMap).filter(([name, info]) => {
        return info.role1 === '영업담당' || info.role2 === '영업담당';
    });


    // 영업담당자가 있으면 표시
    if (salesEmployees.length > 0) {

        // 담당자별 통계 계산
        const employeeStats = {};

        // 모든 영업담당자 초기화
        salesEmployees.forEach(([name, info]) => {
            employeeStats[name] = {
                name: name,
                department: info.department || '미분류',
                total: 0,
                notStarted: 0,
                partial: 0,
                completed: 0
            };
        });


        // 오늘 날짜 보고서 데이터에서 통계 집계
        todayReports.forEach(report => {
            const employee = report.submittedBy;
            if (employeeStats[employee]) {
                employeeStats[employee].total++;

                // 미실행: 실제 수금액과 매출액이 모두 0
                const actualCollection = Number(report.actualCollectionAmount) || 0;
                const actualSales = Number(report.actualSalesAmount) || 0;

                if (actualCollection === 0 && actualSales === 0) {
                    employeeStats[employee].notStarted++;
                } else {
                    // 달성률 계산
                    const collectionRate = parseFloat(calculateRate(actualCollection, report.targetCollectionAmount));
                    const salesRate = parseFloat(calculateRate(actualSales, report.targetSalesAmount));
                    const avgRate = (collectionRate + salesRate) / 2;

                    // 완료: 평균 달성률 80% 이상
                    if (avgRate >= 80) {
                        employeeStats[employee].completed++;
                    } else {
                        // 일부완료: 나머지
                        employeeStats[employee].partial++;
                    }
                }
            }
        });


        // 담당자 이름순 정렬
        const sortedStats = Object.values(employeeStats).sort((a, b) => {
            return a.name.localeCompare(b.name);
        });


        // 테이블 행 렌더링
        let html = '';
        sortedStats.forEach(stat => {
            html += `
                <tr>
                    <td class="employee-name">${stat.name}</td>
                    <td class="department">${stat.department}</td>
                    <td class="total">${stat.total}건</td>
                    <td class="not-started">${stat.notStarted}건</td>
                    <td class="partial">${stat.partial}건</td>
                    <td class="completed">${stat.completed}건</td>
                </tr>
            `;
        });

        statsTableBody.innerHTML = html;

        // display 설정 - 컨테이너와 테이블 모두 표시
        statsContainer.style.display = 'block';

        // ✅ 테이블 컨테이너도 명시적으로 표시 (CSS 기본 숨김 override)
        const statsTableContainer = document.querySelector('.stats-table-container');
        if (statsTableContainer) {
            statsTableContainer.style.display = 'block';
        }
    } else {
        // 영업담당자가 없으면 숨김
        logger.warn('⚠️ [영업담당자통계] 영업담당자가 없음 - 숨김 처리');
        statsContainer.style.display = 'none';
    }

}

// ============================================
// 페이지 초기화
// ============================================

// DOM이 로드되면 초기화 실행
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
