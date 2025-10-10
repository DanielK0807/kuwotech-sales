// ============================================
// 보고서 발표 페이지
// ============================================

import ApiManager from '../../01.common/13_api_manager.js';
import { showToast } from '../../01.common/20_common_index.js';
import { formatCurrency, formatDate, formatNumber } from '../../01.common/03_format.js';
import { GlobalConfig } from '../../01.common/01_global_config.js';

// ============================================
// 전역 변수
// ============================================
const apiManager = new ApiManager();

let allReports = [];           // 전체 보고서 데이터
let filteredReports = [];      // 필터링된 보고서
let groupedReports = {};       // 담당자별 그룹화된 데이터
let companiesMap = {};         // 거래처 정보 맵 (누적매출/수금 조회용)
let employeesMap = {};         // 직원 정보 맵 (이름 → 부서 조회용)
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
    endDate: ''
};
let startDatePicker = null;    // 시작일 Flatpickr 인스턴스
let endDatePicker = null;      // 종료일 Flatpickr 인스턴스

// ============================================
// 초기화
// ============================================
async function init() {
    console.log('📊 보고서 발표 페이지 초기화...');

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
        console.log('[마스터데이터] 로드 시작');
        const authToken = localStorage.getItem('authToken');

        if (!authToken) {
            console.error('❌ [마스터데이터] 인증 토큰이 없습니다');
            showToast('로그인이 필요합니다', 'error');
            return;
        }

        console.log('🔑 [마스터데이터] 인증 토큰 확인:', authToken.substring(0, 20) + '...');

        // API Base URL 가져오기 (GlobalConfig 사용)
        const API_BASE_URL = GlobalConfig.API_BASE_URL;

        // 1. 담당부서 목록 로드
        console.log('📡 [담당부서] API 호출 시작:', `${API_BASE_URL}/api/master/departments`);
        const departmentsResponse = await fetch(`${API_BASE_URL}/api/master/departments`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            }
        });

        console.log('📡 [담당부서] 응답 상태:', departmentsResponse.status, departmentsResponse.statusText);

        if (departmentsResponse.ok) {
            const departmentsData = await departmentsResponse.json();
            console.log('📦 [담당부서] 응답 데이터:', departmentsData);

            if (departmentsData.success && Array.isArray(departmentsData.departments)) {
                populateDepartmentSelect(departmentsData.departments);
                console.log('✅ [담당부서] 로드 성공:', departmentsData.departments.length, '개');
            } else {
                console.warn('⚠️ [담당부서] 응답 형식 오류:', departmentsData);
            }
        } else {
            const errorData = await departmentsResponse.json().catch(() => ({}));
            console.error('❌ [담당부서] 로드 실패:', departmentsResponse.status, errorData);
            showToast(`부서 목록 로드 실패: ${errorData.message || departmentsResponse.statusText}`, 'error');
        }

        // 2. 직원 목록 로드
        console.log('📡 [직원] API 호출 시작:', `${API_BASE_URL}/api/employees`);
        const employeesResponse = await fetch(`${API_BASE_URL}/api/employees`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            }
        });

        console.log('📡 [직원] 응답 상태:', employeesResponse.status, employeesResponse.statusText);

        if (employeesResponse.ok) {
            const employeesData = await employeesResponse.json();
            console.log('📦 [직원] 응답 데이터:', employeesData);

            if (employeesData.success && Array.isArray(employeesData.employees)) {
                populateEmployeeSelect(employeesData.employees);
                console.log('✅ [직원] 로드 성공:', employeesData.employees.length, '개');
            } else {
                console.warn('⚠️ [직원] 응답 형식 오류:', employeesData);
            }
        } else {
            const errorData = await employeesResponse.json().catch(() => ({}));
            console.error('❌ [직원] 로드 실패:', employeesResponse.status, errorData);

            // 403 에러인 경우 권한 부족 메시지
            if (employeesResponse.status === 403) {
                console.warn('⚠️ [직원] 권한 부족: 관리자 권한이 필요할 수 있습니다');
                showToast('직원 목록 조회 권한이 없습니다', 'warning');
            } else {
                showToast(`직원 목록 로드 실패: ${errorData.message || employeesResponse.statusText}`, 'error');
            }
        }

    } catch (error) {
        console.error('❌ [마스터데이터] 로드 중 예외 발생:', error);
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

    console.log(`📋 [직원 필터링] 전체: ${employees.length}명 → 영업담당: ${salesEmployees.length}명`);

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

    // 비교 조회 버튼
    const btnComparisonSearch = document.getElementById('btnComparisonSearch');
    btnComparisonSearch?.addEventListener('click', handleComparisonSearch);
}

// ============================================
// 데이터 로드
// ============================================

/**
 * 보고서 데이터 로드
 */
async function loadReports() {
    try {
        console.log('📋 보고서 데이터 로드 중...');

        // 기간 계산
        const dateRange = calculateDateRange(currentFilters.period);
        console.log(`📅 [조회 기간] ${dateRange.start} ~ ${dateRange.end} (${currentFilters.period})`);

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

        console.log(`✅ 보고서 ${allReports.length}건 로드 완료`);

        // 작성자별 통계
        if (allReports.length > 0) {
            const submitterCounts = {};
            allReports.forEach(report => {
                const submitter = report.submittedBy || '미상';
                submitterCounts[submitter] = (submitterCounts[submitter] || 0) + 1;
            });
            console.log('📊 [작성자별 보고서 수]', submitterCounts);
        }

        // 거래처 정보 로드
        await loadCompanies();

        // 필터 적용 및 렌더링
        applyFiltersAndRender();

    } catch (error) {
        console.error('❌ 보고서 로드 실패:', error);
        showToast('보고서 데이터를 불러오는데 실패했습니다.', 'error');
    }
}

/**
 * 거래처 정보 로드 (누적 매출/수금 조회용)
 */
async function loadCompanies() {
    try {
        const response = await apiManager.getCompanies();
        console.log('📦 [거래처] 응답 데이터:', response);

        // API Manager는 응답을 그대로 반환
        if (response && response.companies && Array.isArray(response.companies)) {
            response.companies.forEach(company => {
                companiesMap[company.keyValue] = company;
            });
            console.log(`✅ 거래처 ${response.companies.length}개 로드 완료 (총: ${response.total}개)`);
        } else if (response && response.data && Array.isArray(response.data.companies)) {
            // 혹시 response.data에 있을 경우 대비
            response.data.companies.forEach(company => {
                companiesMap[company.keyValue] = company;
            });
            console.log(`✅ 거래처 ${response.data.companies.length}개 로드 완료`);
        } else if (Array.isArray(response)) {
            // 배열 형태로 올 경우
            response.forEach(company => {
                companiesMap[company.keyValue] = company;
            });
            console.log(`✅ 거래처 ${response.length}개 로드 완료`);
        } else {
            console.warn('⚠️ 거래처 정보 응답 형식 오류:', response);
        }
    } catch (error) {
        console.error('❌ 거래처 정보 로드 실패:', error);
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

    console.log(`🔍 필터링 결과: ${filteredReports.length}건`);

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
 * 날짜 범위 포맷팅
 */
function formatDateRange(start, end) {
    const startDate = new Date(start);
    const endDate = new Date(end);

    const startStr = `${startDate.getFullYear()}년 ${startDate.getMonth() + 1}월 ${startDate.getDate()}일`;
    const endStr = `${endDate.getFullYear()}년 ${endDate.getMonth() + 1}월 ${endDate.getDate()}일`;

    return `${startStr} ~ ${endStr}`;
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
                <td colspan="15" class="empty-state">
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
            <td colspan="15" class="group-header-cell">
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

    return `
        <tr class="report-row clickable" data-employee="${employee}" data-report-id="${report.reportId}" style="display: none; cursor: pointer;">
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
            <td colspan="4"></td>
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
    console.log('기간 변경:', currentFilters.period);
}

/**
 * 필터 적용 핸들러
 */
async function handleApplyFilter() {
    // select 값 가져오기
    currentFilters.department = document.getElementById('departmentFilter')?.value || '';
    currentFilters.employee = document.getElementById('employeeFilter')?.value || '';

    console.log('필터 적용:', currentFilters);

    // 데이터 다시 로드
    await loadReports();
}

/**
 * 새로고침 핸들러
 */
async function handleRefresh() {
    console.log('🔄 데이터 새로고침...');
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
    const reportRows = document.querySelectorAll('.report-row.clickable');
    reportRows.forEach(row => {
        row.addEventListener('click', () => {
            const reportId = row.dataset.reportId;
            const report = allReports.find(r => r.reportId === reportId);
            if (report) {
                showReportDetail(report);
            }
        });
    });
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
    console.log('[비교보고] Flatpickr 초기화 시작');

    const today = new Date().toISOString().split('T')[0];

    // Flatpickr 라이브러리 확인
    if (typeof flatpickr === 'undefined') {
        console.error('[비교보고] ❌ Flatpickr 라이브러리를 찾을 수 없습니다');
        return;
    }

    try {
        // 기본 기간 설정 (금주)
        const defaultRange = calculateDateRange('weekly');

        // 시작일 달력
        const startDateEl = document.getElementById('comparisonStartDate');
        if (startDateEl) {
            startDatePicker = flatpickr(startDateEl, {
                locale: 'ko',
                dateFormat: 'Y-m-d',
                defaultDate: defaultRange.start,  // 기본값 설정
                maxDate: today,
                position: 'auto',
                onChange: function(selectedDates, dateStr) {
                    console.log('[비교보고] 시작일 선택:', dateStr);
                    comparisonFilters.startDate = dateStr;
                    updateComparisonPeriodDisplay();

                    // 시작일이 종료일보다 늦으면 종료일도 업데이트
                    if (comparisonFilters.endDate && dateStr > comparisonFilters.endDate) {
                        endDatePicker?.setDate(dateStr);
                    }
                }
            });
            comparisonFilters.startDate = defaultRange.start;
            console.log('[비교보고] ✅ 시작일 Flatpickr 초기화 완료');
        }

        // 종료일 달력
        const endDateEl = document.getElementById('comparisonEndDate');
        if (endDateEl) {
            endDatePicker = flatpickr(endDateEl, {
                locale: 'ko',
                dateFormat: 'Y-m-d',
                defaultDate: defaultRange.end,  // 기본값 설정
                maxDate: today,
                position: 'auto',
                onChange: function(selectedDates, dateStr) {
                    console.log('[비교보고] 종료일 선택:', dateStr);
                    comparisonFilters.endDate = dateStr;
                    updateComparisonPeriodDisplay();

                    // 종료일이 시작일보다 이르면 시작일도 업데이트
                    if (comparisonFilters.startDate && dateStr < comparisonFilters.startDate) {
                        startDatePicker?.setDate(dateStr);
                    }
                }
            });
            comparisonFilters.endDate = defaultRange.end;
            console.log('[비교보고] ✅ 종료일 Flatpickr 초기화 완료');
        }

        // 초기 기간 표시 업데이트
        updateComparisonPeriodDisplay();

    } catch (error) {
        console.error('[비교보고] ❌ Flatpickr 초기화 오류:', error);
    }
}

/**
 * 비교보고 기간 유형 변경 핸들러
 */
function handleComparisonPeriodChange(event) {
    comparisonFilters.period = event.target.value;
    console.log('[비교보고] 기간 유형 변경:', comparisonFilters.period);

    // 기간 유형에 따라 날짜 자동 설정
    const dateRange = calculateDateRange(comparisonFilters.period);

    if (startDatePicker) {
        startDatePicker.setDate(dateRange.start);
        comparisonFilters.startDate = dateRange.start;
    }

    if (endDatePicker) {
        endDatePicker.setDate(dateRange.end);
        comparisonFilters.endDate = dateRange.end;
    }

    updateComparisonPeriodDisplay();
}

/**
 * 선택된 기간 표시 업데이트
 */
function updateComparisonPeriodDisplay() {
    const periodRangeEl = document.getElementById('comparisonPeriodRange');
    if (!periodRangeEl) return;

    if (comparisonFilters.startDate && comparisonFilters.endDate) {
        const periodText = formatDateRange(comparisonFilters.startDate, comparisonFilters.endDate);
        periodRangeEl.textContent = periodText;
    } else {
        periodRangeEl.textContent = '날짜를 선택하세요';
    }
}

/**
 * 비교 조회 핸들러
 */
async function handleComparisonSearch() {
    // 필터 값 가져오기
    comparisonFilters.department = document.getElementById('comparisonDepartment')?.value || '';
    comparisonFilters.employee = document.getElementById('comparisonEmployee')?.value || '';

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

    console.log('[비교보고] 조회 시작:', comparisonFilters);
    showToast('비교보고 데이터를 조회합니다...', 'info');

    try {
        await loadComparisonReports();
    } catch (error) {
        console.error('[비교보고] ❌ 조회 실패:', error);
        showToast('비교보고 조회 중 오류가 발생했습니다', 'error');
    }
}

/**
 * 비교보고 데이터 로드
 */
async function loadComparisonReports() {
    try {
        console.log('[비교보고] 데이터 로드 중...');
        console.log(`[비교보고] 📅 조회 기간: ${comparisonFilters.startDate} ~ ${comparisonFilters.endDate}`);

        // API 호출 파라미터 구성
        const params = {
            startDate: comparisonFilters.startDate,
            endDate: comparisonFilters.endDate
        };

        // 부서 필터 추가
        if (comparisonFilters.department) {
            params.department = comparisonFilters.department;
        }

        // 담당자 필터 추가
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

        // 실제 실행된 실적만 필터링 (actualCollectionAmount 또는 actualSalesAmount가 0보다 큰 경우)
        comparisonReports = comparisonReports.filter(report => {
            const hasActualCollection = Number(report.actualCollectionAmount) > 0;
            const hasActualSales = Number(report.actualSalesAmount) > 0;
            return hasActualCollection || hasActualSales;
        });

        console.log(`[비교보고] ✅ ${comparisonReports.length}건 로드 완료`);

        // UI 렌더링
        renderComparisonTable();
        renderComparisonSummary();

        showToast(`비교보고 ${comparisonReports.length}건 조회 완료`, 'success');

    } catch (error) {
        console.error('[비교보고] ❌ 데이터 로드 실패:', error);
        throw error;
    }
}

/**
 * 비교보고 테이블 렌더링
 */
function renderComparisonTable() {
    const tbody = document.getElementById('comparisonTableBody');
    const container = document.getElementById('comparisonTableContainer');
    const emptyState = document.getElementById('comparisonEmptyState');

    if (!tbody || !container || !emptyState) return;

    // 빈 상태 체크
    if (comparisonReports.length === 0) {
        container.style.display = 'none';
        emptyState.style.display = 'block';
        emptyState.innerHTML = `
            <div class="empty-icon">📭</div>
            <p class="empty-text">조회된 실적 보고서가 없습니다</p>
            <p class="empty-subtext">선택한 기간 동안 실제 실행된 실적이 없습니다</p>
        `;
        return;
    }

    // 테이블 표시
    container.style.display = 'block';
    emptyState.style.display = 'none';

    // 테이블 행 생성
    let html = '';
    comparisonReports.forEach(report => {
        html += renderComparisonRow(report);
    });

    tbody.innerHTML = html;
}

/**
 * 비교보고 행 렌더링
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

// ============================================
// 페이지 초기화
// ============================================

// DOM이 로드되면 초기화 실행
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
