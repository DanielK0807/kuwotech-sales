// ============================================
// 보고서 발표 페이지
// Last Updated: 2025-10-20
//
// 주요 변경사항:
// - 실적보고(개인별) 섹션의 누적매출/누적수금 데이터를
//   companies 테이블 집계에서 kpi_sales 테이블로 변경
// - kpi_sales 테이블은 회사 데이터 변동 시 자동 업데이트됨
// - 누적 금액: kpi_sales 테이블 (기간 무관 - 1월 1일~현재)
// - 목표/실제 금액: reports 테이블 (선택한 기간 내 보고서)
// - KPI 필드명: 영문 컬럼명 사용 (accumulatedSales, accumulatedCollection)
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

// 커스텀 드롭다운 다중 선택 상태 (실적보고 섹션)
let selectedDepartments = [];  // 선택된 담당부서 배열 (다중 선택)
let selectedEmployees = [];    // 선택된 내부담당자 배열 (다중 선택)

// 비교보고 커스텀 드롭다운 다중 선택 상태
let comparisonSelectedDepartments = [];  // 비교보고 선택된 담당부서 배열
let comparisonSelectedEmployees = [];    // 비교보고 선택된 내부담당자 배열

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
 * 담당부서 커스텀 체크박스 드롭다운 채우기
 */
function populateDepartmentSelect(departments) {
    const dropdownMenu = document.getElementById('department-dropdown-menu');
    const comparisonDropdownMenu = document.getElementById('comparison-department-dropdown-menu');

    // 실적보고(상세)용 - 커스텀 체크박스 드롭다운
    if (dropdownMenu) {
        dropdownMenu.innerHTML = '';

        departments.forEach(dept => {
            const item = document.createElement('div');
            item.className = 'custom-dropdown-item';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `dept-${dept.department_name}`;
            checkbox.value = dept.department_name;
            checkbox.addEventListener('change', updateDepartmentSelection);

            const label = document.createElement('label');
            label.htmlFor = `dept-${dept.department_name}`;
            label.textContent = dept.department_name;

            item.appendChild(checkbox);
            item.appendChild(label);
            dropdownMenu.appendChild(item);
        });
    }

    // 비교보고용 - 커스텀 체크박스 드롭다운
    if (comparisonDropdownMenu) {
        comparisonDropdownMenu.innerHTML = '';

        departments.forEach(dept => {
            const item = document.createElement('div');
            item.className = 'custom-dropdown-item';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `comparison-dept-${dept.department_name}`;
            checkbox.value = dept.department_name;
            checkbox.addEventListener('change', updateComparisonDepartmentSelection);

            const label = document.createElement('label');
            label.htmlFor = `comparison-dept-${dept.department_name}`;
            label.textContent = dept.department_name;

            item.appendChild(checkbox);
            item.appendChild(label);
            comparisonDropdownMenu.appendChild(item);
        });
    }
}

/**
 * 직원 커스텀 체크박스 드롭다운 채우기
 */
function populateEmployeeSelect(employees) {
    const dropdownMenu = document.getElementById('employee-dropdown-menu');
    const comparisonDropdownMenu = document.getElementById('comparison-employee-dropdown-menu');

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

    // 실적보고(상세)용 - 커스텀 체크박스 드롭다운
    if (dropdownMenu) {
        dropdownMenu.innerHTML = '';

        salesEmployees.forEach(emp => {
            const item = document.createElement('div');
            item.className = 'custom-dropdown-item';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `emp-${emp.name}`;
            checkbox.value = emp.name;
            checkbox.addEventListener('change', updateEmployeeSelection);

            const label = document.createElement('label');
            label.htmlFor = `emp-${emp.name}`;
            label.textContent = `${emp.name} (${emp.department || ''})`;

            item.appendChild(checkbox);
            item.appendChild(label);
            dropdownMenu.appendChild(item);
        });
    }

    // 비교보고용 - 커스텀 체크박스 드롭다운
    if (comparisonDropdownMenu) {
        comparisonDropdownMenu.innerHTML = '';

        salesEmployees.forEach(emp => {
            const item = document.createElement('div');
            item.className = 'custom-dropdown-item';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `comparison-emp-${emp.name}`;
            checkbox.value = emp.name;
            checkbox.addEventListener('change', updateComparisonEmployeeSelection);

            const label = document.createElement('label');
            label.htmlFor = `comparison-emp-${emp.name}`;
            label.textContent = `${emp.name} (${emp.department || ''})`;

            item.appendChild(checkbox);
            item.appendChild(label);
            comparisonDropdownMenu.appendChild(item);
        });
    }
}

/**
 * 담당부서 선택 업데이트 (다중 선택)
 */
function updateDepartmentSelection() {
    const checkboxes = document.querySelectorAll('#department-dropdown-menu input[type="checkbox"]');
    const selectedValues = Array.from(checkboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);

    const selectedText = document.getElementById('department-selected-text');

    if (selectedValues.length === 0) {
        selectedText.textContent = '전체';
    } else if (selectedValues.length === 1) {
        selectedText.textContent = selectedValues[0];
    } else {
        selectedText.textContent = `${selectedValues[0]} 외 ${selectedValues.length - 1}개`;
    }

    selectedDepartments = selectedValues;

    // 필터 적용 (조회하기 버튼 클릭과 동일한 동작)
    handleApplyFilter();
}

/**
 * 내부담당자 선택 업데이트 (다중 선택)
 */
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

    selectedEmployees = selectedValues;

    // 필터 적용 (조회하기 버튼 클릭과 동일한 동작)
    handleApplyFilter();
}

/**
 * 비교보고 담당부서 선택 업데이트 (다중 선택)
 */
function updateComparisonDepartmentSelection() {
    const checkboxes = document.querySelectorAll('#comparison-department-dropdown-menu input[type="checkbox"]');
    const selectedValues = Array.from(checkboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);

    const selectedText = document.getElementById('comparison-department-selected-text');

    if (selectedValues.length === 0) {
        selectedText.textContent = '전체';
    } else if (selectedValues.length === 1) {
        selectedText.textContent = selectedValues[0];
    } else {
        selectedText.textContent = `${selectedValues[0]} 외 ${selectedValues.length - 1}개`;
    }

    comparisonSelectedDepartments = selectedValues;
}

/**
 * 비교보고 내부담당자 선택 업데이트 (다중 선택)
 */
function updateComparisonEmployeeSelection() {
    const checkboxes = document.querySelectorAll('#comparison-employee-dropdown-menu input[type="checkbox"]');
    const selectedValues = Array.from(checkboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);

    const selectedText = document.getElementById('comparison-employee-selected-text');

    if (selectedValues.length === 0) {
        selectedText.textContent = '전체';
    } else if (selectedValues.length === 1) {
        selectedText.textContent = selectedValues[0];
    } else {
        selectedText.textContent = `${selectedValues[0]} 외 ${selectedValues.length - 1}명`;
    }

    comparisonSelectedEmployees = selectedValues;
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

    // 개인별 실적 이벤트 리스너
    setupIndividualPerformanceListeners();

    // 비교보고 이벤트 리스너
    setupComparisonEventListeners();

    // 섹션 토글 버튼 이벤트 리스너
    setupSectionToggleListeners();

    // 필터 토글 버튼 이벤트 리스너
    setupFilterToggleListeners();

    // 커스텀 드롭다운 토글 이벤트 리스너 (이벤트 위임 사용)
    setupCustomDropdowns();
}

/**
 * 커스텀 드롭다운 이벤트 설정
 */
function setupCustomDropdowns() {
    const departmentDropdownButton = document.getElementById('department-dropdown-button');
    const departmentDropdownMenu = document.getElementById('department-dropdown-menu');

    if (departmentDropdownButton && departmentDropdownMenu) {
        console.log('[Dropdown] 담당부서 드롭다운 버튼 찾음');
        departmentDropdownButton.addEventListener('click', (e) => {
            console.log('[Dropdown] 담당부서 버튼 클릭됨');
            e.stopPropagation();
            e.preventDefault();

            const isOpen = departmentDropdownMenu.classList.contains('show');

            // 모든 드롭다운 닫기
            document.querySelectorAll('.custom-dropdown-menu').forEach(menu => {
                menu.classList.remove('show');
            });

            // 현재 드롭다운 토글
            if (!isOpen) {
                // 약간의 지연을 두고 열기 (외부 클릭 이벤트와 충돌 방지)
                setTimeout(() => {
                    departmentDropdownMenu.classList.add('show');
                    console.log('[Dropdown] 담당부서 드롭다운 열림');
                }, 0);
            } else {
                console.log('[Dropdown] 담당부서 드롭다운 닫힘');
            }
        });
    } else {
        console.warn('[Dropdown] 담당부서 드롭다운 버튼 또는 메뉴를 찾을 수 없음');
    }

    const employeeDropdownButton = document.getElementById('employee-dropdown-button');
    const employeeDropdownMenu = document.getElementById('employee-dropdown-menu');

    if (employeeDropdownButton && employeeDropdownMenu) {
        console.log('[Dropdown] 내부담당자 드롭다운 버튼 찾음');
        employeeDropdownButton.addEventListener('click', (e) => {
            console.log('[Dropdown] 내부담당자 버튼 클릭됨');
            e.stopPropagation();
            e.preventDefault();

            const isOpen = employeeDropdownMenu.classList.contains('show');

            // 모든 드롭다운 닫기
            document.querySelectorAll('.custom-dropdown-menu').forEach(menu => {
                menu.classList.remove('show');
            });

            // 현재 드롭다운 토글
            if (!isOpen) {
                // 약간의 지연을 두고 열기 (외부 클릭 이벤트와 충돌 방지)
                setTimeout(() => {
                    employeeDropdownMenu.classList.add('show');
                    console.log('[Dropdown] 내부담당자 드롭다운 열림');
                }, 0);
            } else {
                console.log('[Dropdown] 내부담당자 드롭다운 닫힘');
            }
        });
    } else {
        console.warn('[Dropdown] 내부담당자 드롭다운 버튼 또는 메뉴를 찾을 수 없음');
    }

    // 드롭다운 외부 클릭 시 닫기 (단, 드롭다운 버튼 클릭은 제외)
    document.addEventListener('click', (e) => {
        console.log('[Dropdown] 외부 클릭 감지:', e.target);

        // 드롭다운 버튼이나 메뉴를 클릭한 경우가 아니면 모든 드롭다운 닫기
        if (!e.target.closest('.custom-dropdown')) {
            console.log('[Dropdown] 외부 클릭 - 모든 드롭다운 닫기');
            document.querySelectorAll('.custom-dropdown-menu').forEach(menu => {
                menu.classList.remove('show');
            });
        }
    });

    // 드롭다운 메뉴 내부 클릭 시 이벤트 전파 방지
    if (departmentDropdownMenu) {
        departmentDropdownMenu.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    if (employeeDropdownMenu) {
        employeeDropdownMenu.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    // 비교보고 담당부서 드롭다운
    const comparisonDepartmentDropdownButton = document.getElementById('comparison-department-dropdown-button');
    const comparisonDepartmentDropdownMenu = document.getElementById('comparison-department-dropdown-menu');

    if (comparisonDepartmentDropdownButton && comparisonDepartmentDropdownMenu) {
        console.log('[Dropdown] 비교보고 담당부서 드롭다운 버튼 찾음');
        comparisonDepartmentDropdownButton.addEventListener('click', (e) => {
            console.log('[Dropdown] 비교보고 담당부서 버튼 클릭됨');
            e.stopPropagation();
            e.preventDefault();

            const isOpen = comparisonDepartmentDropdownMenu.classList.contains('show');

            // 모든 드롭다운 닫기
            document.querySelectorAll('.custom-dropdown-menu').forEach(menu => {
                menu.classList.remove('show');
            });

            // 현재 드롭다운 토글
            if (!isOpen) {
                setTimeout(() => {
                    comparisonDepartmentDropdownMenu.classList.add('show');
                    console.log('[Dropdown] 비교보고 담당부서 드롭다운 열림');
                }, 0);
            } else {
                console.log('[Dropdown] 비교보고 담당부서 드롭다운 닫힘');
            }
        });

        comparisonDepartmentDropdownMenu.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    } else {
        console.warn('[Dropdown] 비교보고 담당부서 드롭다운 버튼 또는 메뉴를 찾을 수 없음');
    }

    // 비교보고 내부담당자 드롭다운
    const comparisonEmployeeDropdownButton = document.getElementById('comparison-employee-dropdown-button');
    const comparisonEmployeeDropdownMenu = document.getElementById('comparison-employee-dropdown-menu');

    if (comparisonEmployeeDropdownButton && comparisonEmployeeDropdownMenu) {
        console.log('[Dropdown] 비교보고 내부담당자 드롭다운 버튼 찾음');
        comparisonEmployeeDropdownButton.addEventListener('click', (e) => {
            console.log('[Dropdown] 비교보고 내부담당자 버튼 클릭됨');
            e.stopPropagation();
            e.preventDefault();

            const isOpen = comparisonEmployeeDropdownMenu.classList.contains('show');

            // 모든 드롭다운 닫기
            document.querySelectorAll('.custom-dropdown-menu').forEach(menu => {
                menu.classList.remove('show');
            });

            // 현재 드롭다운 토글
            if (!isOpen) {
                setTimeout(() => {
                    comparisonEmployeeDropdownMenu.classList.add('show');
                    console.log('[Dropdown] 비교보고 내부담당자 드롭다운 열림');
                }, 0);
            } else {
                console.log('[Dropdown] 비교보고 내부담당자 드롭다운 닫힘');
            }
        });

        comparisonEmployeeDropdownMenu.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    } else {
        console.warn('[Dropdown] 비교보고 내부담당자 드롭다운 버튼 또는 메뉴를 찾을 수 없음');
    }
}

/**
 * 비교보고 이벤트 리스너 등록
 */
function setupComparisonEventListeners() {
    // 비교보고 기간 유형 변경 (표시 방식 변경)
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
 * 개인별 실적 이벤트 리스너 등록
 */
function setupIndividualPerformanceListeners() {
    // 조회 버튼
    const btnIndividualSearch = document.getElementById('btnIndividualSearch');
    btnIndividualSearch?.addEventListener('click', handleIndividualSearch);
}

/**
 * 모든 영업담당자의 KPI 데이터 가져오기
 * @returns {Map} employeeName -> KPI 데이터
 */
async function fetchAllEmployeeKPI() {
    const kpiMap = new Map();

    // 영업담당자 목록 추출
    const salesEmployees = Object.entries(employeesMap)
        .filter(([name, info]) => info.role1 === '영업담당' || info.role2 === '영업담당')
        .map(([name, info]) => name);

    console.log(`[KPI Fetch] 영업담당자 ${salesEmployees.length}명의 KPI 데이터 가져오기 시작`);

    // 각 영업담당자의 KPI 데이터 가져오기 (병렬 처리)
    const promises = salesEmployees.map(async (employeeName) => {
        try {
            const response = await apiManager.getSalesKPI(employeeName);

            if (response && response.success && response.data) {
                const kpiData = response.data;

                // 누적 금액 추출 (영문 필드명)
                const cumulativeCollection = Number(kpiData['accumulatedCollection']) || 0;
                const cumulativeSales = Number(kpiData['accumulatedSales']) || 0;

                kpiMap.set(employeeName, {
                    accumulatedCollection: cumulativeCollection,
                    accumulatedSales: cumulativeSales,
                    ...kpiData // 전체 KPI 데이터도 저장
                });

                console.log(`[KPI Fetch] ✅ ${employeeName}: 누적수금 ${cumulativeCollection.toLocaleString()}원, 누적매출 ${cumulativeSales.toLocaleString()}원`);
            } else {
                console.warn(`[KPI Fetch] ⚠️ ${employeeName}: KPI 데이터 없음`);
                // KPI 데이터가 없어도 0으로 설정
                kpiMap.set(employeeName, {
                    accumulatedCollection: 0,
                    accumulatedSales: 0
                });
            }
        } catch (error) {
            console.error(`[KPI Fetch] ❌ ${employeeName} KPI 조회 실패:`, error);
            // 에러 발생 시에도 0으로 설정
            kpiMap.set(employeeName, {
                accumulatedCollection: 0,
                accumulatedSales: 0
            });
        }
    });

    // 모든 요청이 완료될 때까지 대기
    await Promise.all(promises);

    console.log(`[KPI Fetch] ✅ 완료: ${kpiMap.size}명의 KPI 데이터 로드됨`);
    return kpiMap;
}

/**
 * 개인별 조회 버튼 핸들러
 */
async function handleIndividualSearch() {
    // 선택된 기간 가져오기
    const selectedRadio = document.querySelector('input[name="individualPeriod"]:checked');
    const selectedPeriod = selectedRadio?.value || 'weekly';

    console.log('='.repeat(80));
    console.log('🔍 [개인별실적 조회 시작]');
    console.log('='.repeat(80));
    console.log(`선택한 기간: ${selectedPeriod}`);

    try {
        // ✅ 선택한 기간에 맞는 보고서를 API에서 직접 가져오기
        const today = new Date();
        let startDate, endDate;

        if (selectedPeriod === 'weekly') {
            // 주간: 지난주 월요일 ~ 일요일
            const lastWeek = new Date(today);
            lastWeek.setDate(today.getDate() - 7);  // 7일 전
            startDate = getMonday(lastWeek);
            endDate = getSunday(lastWeek);
        } else if (selectedPeriod === 'monthly') {
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        } else if (selectedPeriod === 'yearly') {
            startDate = new Date(today.getFullYear(), 0, 1);
            endDate = new Date(today.getFullYear(), 11, 31);
        }

        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];

        console.log(`📅 조회 기간: ${startDateStr} ~ ${endDateStr}`);
        console.log(`📝 선택한 기간: ${selectedPeriod}`);
        console.log(`⏳ API 호출 중...`);

        // ✅ 1. 목표 금액용: 선택한 기간 유형의 보고서 조회
        console.log(`📊 목표 금액: ${selectedPeriod} 보고서 조회 중...`);
        const targetResponse = await apiManager.getReports({
            startDate: startDateStr,
            endDate: endDateStr,
            reportType: selectedPeriod  // 'weekly', 'monthly', 'yearly'
        });

        let targetReports = [];
        if (targetResponse && targetResponse.data && Array.isArray(targetResponse.data.reports)) {
            targetReports = targetResponse.data.reports;
        } else if (Array.isArray(targetResponse)) {
            targetReports = targetResponse;
        }

        console.log(`✅ ${selectedPeriod} 보고서: ${targetReports.length}개`);

        // ✅ 2. 실제 금액용: 항상 주간보고서(확정본)만 조회
        let actualReports = [];

        if (selectedPeriod === 'weekly') {
            // 주간 선택 시: 같은 데이터 사용
            actualReports = targetReports;
            console.log(`💡 실제 금액: 주간 보고서 사용 (동일 데이터)`);
        } else {
            // 월간/연간 선택 시: 주간보고서 별도 조회
            console.log(`📊 실제 금액: weekly 보고서 조회 중...`);
            const actualResponse = await apiManager.getReports({
                startDate: startDateStr,
                endDate: endDateStr,
                reportType: 'weekly'  // 항상 주간보고서
            });

            if (actualResponse && actualResponse.data && Array.isArray(actualResponse.data.reports)) {
                actualReports = actualResponse.data.reports;
            } else if (Array.isArray(actualResponse)) {
                actualReports = actualResponse;
            }

            console.log(`✅ weekly 보고서: ${actualReports.length}개`);
        }

        // 통합 보고서 (UI 표시용)
        const periodReports = { target: targetReports, actual: actualReports };

        console.log(`\n📊 === 집계 요약 ===`);
        console.log(`목표용 보고서: ${targetReports.length}개 (${selectedPeriod})`);
        console.log(`실제용 보고서: ${actualReports.length}개 (weekly 확정본)`);

        // 목표 보고서 작성자별 개수
        const targetSubmitterCounts = targetReports.reduce((acc, r) => {
            acc[r.submittedBy] = (acc[r.submittedBy] || 0) + 1;
            return acc;
        }, {});
        console.log(`👤 목표 작성자:`, targetSubmitterCounts);

        // 실제 보고서 작성자별 개수 (확정된 것만)
        const confirmedActualReports = actualReports.filter(r => r.confirmationData);
        const actualSubmitterCounts = confirmedActualReports.reduce((acc, r) => {
            acc[r.submittedBy] = (acc[r.submittedBy] || 0) + 1;
            return acc;
        }, {});
        console.log(`✅ 실제 작성자 (확정본):`, actualSubmitterCounts);
        console.log(`⚠️ 미확정: ${actualReports.length - confirmedActualReports.length}개`);

        console.log(`전체 거래처: ${Object.keys(companiesMap).length}개`);
        console.log(`전체 직원: ${Object.keys(employeesMap).length}명`);

        // ✅ KPI 데이터 가져오기 (누적매출금액, 누적수금금액)
        console.log('\n📊 KPI 데이터 가져오는 중...');
        const kpiDataMap = await fetchAllEmployeeKPI();
        console.log(`✅ KPI 데이터 ${kpiDataMap.size}개 로드 완료`);

        // ✅ 디버깅용: window 객체에 데이터 노출
        window.DEBUG_companiesMap = companiesMap;
        window.DEBUG_employeesMap = employeesMap;
        window.DEBUG_periodReports = periodReports;
        window.DEBUG_kpiDataMap = kpiDataMap;

        // 거래처 담당자 목록
        const managers = new Set();
        Object.values(companiesMap).forEach(c => {
            if (c.internalManager) managers.add(c.internalManager);
        });
        console.log(`\n📋 거래처 DB의 담당자 (${managers.size}명):`, Array.from(managers).sort());

        // 영업담당자 목록
        const salesEmployees = Object.entries(employeesMap)
            .filter(([name, info]) => info.role1 === '영업담당' || info.role2 === '영업담당')
            .map(([name, info]) => name);
        console.log(`\n👥 영업담당자 목록 (${salesEmployees.length}명):`, salesEmployees.sort());

        console.log('='.repeat(80));

        // 기간 표시 업데이트
        updateIndividualPeriodDisplay(selectedPeriod);

        // 카드 렌더링 (API에서 가져온 periodReports와 KPI 데이터 사용)
        renderIndividualPerformanceCards(selectedPeriod, periodReports, kpiDataMap);

    } catch (error) {
        console.error('❌ [개인별실적] API 호출 실패:', error);
        showToast('보고서 데이터를 불러오는데 실패했습니다.', 'error');
    }
}

/**
 * 개인별 기간 표시 업데이트
 */
function updateIndividualPeriodDisplay(period) {
    const periodRangeElement = document.getElementById('individualPeriodRange');
    if (!periodRangeElement) return;

    const today = new Date();
    let startDate, endDate, periodText;

    if (period === 'weekly') {
        // 주간: 지난주 월요일 ~ 일요일
        const lastWeek = new Date(today);
        lastWeek.setDate(today.getDate() - 7);  // 7일 전
        startDate = getMonday(lastWeek);
        endDate = getSunday(lastWeek);
        periodText = `${formatDate(startDate)} ~ ${formatDate(endDate)} (주간)`;
    } else if (period === 'monthly') {
        // 월간: 이번 달 1일 ~ 말일
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        periodText = `${formatDate(startDate)} ~ ${formatDate(endDate)} (월간)`;
    } else if (period === 'yearly') {
        // 년간: 올해 1월 1일 ~ 12월 31일
        startDate = new Date(today.getFullYear(), 0, 1);
        endDate = new Date(today.getFullYear(), 11, 31);
        periodText = `${formatDate(startDate)} ~ ${formatDate(endDate)} (년간)`;
    }

    periodRangeElement.textContent = periodText;
}

/**
 * 개인별 실적 카드 렌더링
 */
function renderIndividualPerformanceCards(period = 'weekly', periodReports = [], kpiDataMap = new Map()) {
    const cardsGrid = document.getElementById('employeeCardsGrid');
    if (!cardsGrid) return;

    // 기간 범위 계산
    const today = new Date();
    let startDate, endDate;

    if (period === 'weekly') {
        // 주간: 지난주 월요일 ~ 일요일
        const lastWeek = new Date(today);
        lastWeek.setDate(today.getDate() - 7);  // 7일 전
        startDate = getMonday(lastWeek);
        endDate = getSunday(lastWeek);
    } else if (period === 'monthly') {
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    } else if (period === 'yearly') {
        startDate = new Date(today.getFullYear(), 0, 1);
        endDate = new Date(today.getFullYear(), 11, 31);
    }

    // ✅ API에서 가져온 periodReports 사용 (allReports 대신)
    console.log(`📊 집계할 보고서: ${periodReports.length}개`);

    // 직원별 데이터 집계 (KPI 데이터 포함) - period 전달
    const employeeData = aggregateEmployeeData(periodReports, startDate, endDate, kpiDataMap, period);

    logger.info(`[개인별실적] 렌더링할 직원 데이터:`, employeeData);

    // 카드 HTML 생성
    if (employeeData.length > 0) {
        const cardsHTML = employeeData.map(emp => createEmployeeCard(emp)).join('');
        cardsGrid.innerHTML = cardsHTML;
        console.log(`✅ ${employeeData.length}개 카드 렌더링 완료`);
        logger.info(`[개인별실적] ${employeeData.length}개 카드 렌더링 완료`);
    } else {
        cardsGrid.innerHTML = '<p style="text-align: center; padding: 40px; color: var(--text-secondary);">직원 데이터가 없습니다</p>';
        console.warn('⚠️ 렌더링할 직원 데이터가 없습니다');
        logger.warn('[개인별실적] 렌더링할 직원 데이터가 없습니다');
    }
}

/**
 * 직원별 데이터 집계
 * @param {Object} reports - { target: [], actual: [] } 형태의 보고서 객체
 * @param {Date} startDate - 시작일
 * @param {Date} endDate - 종료일
 * @param {Map} kpiDataMap - KPI 데이터 (employeeName -> KPI 데이터)
 * @param {string} period - 기간 유형 (weekly/monthly/yearly)
 */
function aggregateEmployeeData(reports, startDate, endDate, kpiDataMap = new Map(), period = 'weekly') {
    const employeeMap = new Map();

    const targetReports = reports.target || [];
    const actualReports = reports.actual || [];

    logger.info(`[개인별실적] ========== 집계 시작 ==========`);
    logger.info(`[개인별실적] 기간 유형: ${period}`);
    logger.info(`[개인별실적] 기간: ${startDate.toISOString().split('T')[0]} ~ ${endDate.toISOString().split('T')[0]}`);
    logger.info(`[개인별실적] 목표용 보고서: ${targetReports.length}개`);
    logger.info(`[개인별실적] 실제용 보고서: ${actualReports.length}개`);
    logger.info(`[개인별실적] KPI 데이터: ${kpiDataMap.size}명`);

    // 영업담당자만 초기화 (관리자 제외)
    Object.entries(employeesMap).forEach(([employeeName, employeeInfo]) => {
        // 영업담당자만 카드 표시 (role1 또는 role2가 '영업담당'인 경우)
        if (employeeInfo.role1 === '영업담당' || employeeInfo.role2 === '영업담당') {
            employeeMap.set(employeeName, {
                employeeName: employeeName,
                department: employeeInfo.department || '미지정',
                targetCollection: 0,
                actualCollection: 0,
                targetSales: 0,
                actualSales: 0,
                cumulativeCollection: 0,
                cumulativeSales: 0
            });
        }
    });

    // ✅ 핵심 수정: KPI 테이블에서 누적 데이터 가져오기 (기간 무관 - 1월 1일~현재)
    logger.info(`[개인별실적] KPI 데이터로 누적금액 설정 시작`);

    employeeMap.forEach((empData, employeeName) => {
        const kpiData = kpiDataMap.get(employeeName);

        if (kpiData) {
            // KPI 데이터에서 누적 금액 추출 (영문 필드명)
            empData.cumulativeCollection = Number(kpiData['accumulatedCollection']) || 0;
            empData.cumulativeSales = Number(kpiData['accumulatedSales']) || 0;

            logger.info(`[개인별실적] ✅ ${employeeName}: KPI 누적수금 ${empData.cumulativeCollection.toLocaleString()}원 | 누적매출 ${empData.cumulativeSales.toLocaleString()}원`);
        } else {
            // KPI 데이터가 없으면 0으로 설정
            empData.cumulativeCollection = 0;
            empData.cumulativeSales = 0;
            logger.warn(`[개인별실적] ⚠️ ${employeeName}: KPI 데이터 없음 - 누적금액 0으로 설정`);
        }
    });

    logger.info(`[개인별실적] ✅ 누적금액 설정 완료 (${employeeMap.size}명)`);

    // 영업담당자의 직원 목록
    const salesEmployees = Array.from(employeeMap.keys());
    logger.info(`[개인별실적] 영업담당자 수: ${salesEmployees.length}`, salesEmployees);

    // ✅ 1. 목표 금액 집계 (targetReports에서)
    logger.info(`\n[개인별실적] 📊 목표 금액 집계 중... (${targetReports.length}개 보고서)`);

    let targetCount = 0;
    let targetSkipped = 0;

    targetReports.forEach((report) => {
        const employeeName = report.submittedBy;

        if (!employeeMap.has(employeeName)) {
            targetSkipped++;
            if (targetSkipped <= 3) {
                logger.info(`[개인별실적] 목표 Skip: ${employeeName} (영업담당자 아님)`);
            }
            return;
        }

        targetCount++;

        const empData = employeeMap.get(employeeName);
        const targetCollection = Number(report.targetCollectionAmount) || 0;
        const targetSales = Number(report.targetSalesAmount) || 0;

        empData.targetCollection += targetCollection;
        empData.targetSales += targetSales;

        if (targetCount <= 3) {
            logger.info(`[개인별실적] 목표 #${targetCount} (${employeeName}):`, {
                targetCollection, targetSales
            });
        }
    });

    logger.info(`[개인별실적] ✅ 목표 금액 집계 완료: ${targetCount}개 처리, ${targetSkipped}개 스킵`);

    // ✅ 2. 실제 금액 집계 (actualReports 중 confirmationData가 있는 것만)
    logger.info(`\n[개인별실적] 💰 실제 금액 집계 중... (${actualReports.length}개 보고서)`);

    const confirmedReports = actualReports.filter(r => r.confirmationData);
    logger.info(`[개인별실적] 확정된 보고서: ${confirmedReports.length}개 / 전체: ${actualReports.length}개`);

    let actualCount = 0;
    let actualSkipped = 0;

    confirmedReports.forEach((report) => {
        const employeeName = report.submittedBy;

        if (!employeeMap.has(employeeName)) {
            actualSkipped++;
            if (actualSkipped <= 3) {
                logger.info(`[개인별실적] 실제 Skip: ${employeeName} (영업담당자 아님)`);
            }
            return;
        }

        actualCount++;

        const empData = employeeMap.get(employeeName);
        const actualCollection = Number(report.actualCollectionAmount) || 0;
        const actualSales = Number(report.actualSalesAmount) || 0;

        empData.actualCollection += actualCollection;
        empData.actualSales += actualSales;

        if (actualCount <= 3) {
            logger.info(`[개인별실적] 실제 #${actualCount} (${employeeName}):`, {
                actualCollection, actualSales
            });
        }
    });

    logger.info(`[개인별실적] ✅ 실제 금액 집계 완료: ${actualCount}개 처리, ${actualSkipped}개 스킵`);

    logger.info(`\n[개인별실적] ========== 집계 완료 ==========`);
    logger.info(`[개인별실적] 목표 보고서: ${targetCount}개 처리 (${targetSkipped}개 스킵)`);
    logger.info(`[개인별실적] 실제 보고서: ${actualCount}개 처리 (${actualSkipped}개 스킵)`);

    // Map을 배열로 변환하고 이름순 정렬
    const result = Array.from(employeeMap.values()).sort((a, b) =>
        a.employeeName.localeCompare(b.employeeName, 'ko')
    );

    // 모든 직원 집계 결과 로그
    logger.info(`[개인별실적] 최종 집계 결과 (${result.length}명):`,
        result.map(emp => ({
            name: emp.employeeName,
            dept: emp.department,
            target수금: emp.targetCollection,
            actual수금: emp.actualCollection,
            target매출: emp.targetSales,
            actual매출: emp.actualSales,
            누적수금: emp.cumulativeCollection,
            누적매출: emp.cumulativeSales
        }))
    );

    return result;
}

/**
 * 금액 포맷 (회계 방식 음수 처리)
 * @param {number} amount - 금액
 * @returns {{text: string, className: string}} - 포맷된 텍스트와 클래스명
 */
function formatAmountWithStyle(amount) {
    const formatted = formatCurrency(amount, true);
    if (typeof formatted === 'object' && formatted.text) {
        return {
            text: formatted.text,
            className: formatted.className || ''
        };
    }
    return {
        text: formatted,
        className: ''
    };
}

/**
 * 직원 카드 HTML 생성
 */
function createEmployeeCard(empData) {
    // 달성률 계산 (소수점 2자리)
    const collectionRate = empData.targetCollection > 0
        ? ((empData.actualCollection / empData.targetCollection) * 100).toFixed(2)
        : '0.00';
    const salesRate = empData.targetSales > 0
        ? ((empData.actualSales / empData.targetSales) * 100).toFixed(2)
        : '0.00';

    // 금액 포맷 (회계 방식 음수 처리)
    const targetCollectionFmt = formatAmountWithStyle(empData.targetCollection);
    const actualCollectionFmt = formatAmountWithStyle(empData.actualCollection);
    const targetSalesFmt = formatAmountWithStyle(empData.targetSales);
    const actualSalesFmt = formatAmountWithStyle(empData.actualSales);
    const cumulativeCollectionFmt = formatAmountWithStyle(empData.cumulativeCollection);
    const cumulativeSalesFmt = formatAmountWithStyle(empData.cumulativeSales);

    return `
        <div class="employee-card">
            <div class="employee-card-header">
                <div class="employee-card-name">${empData.employeeName}</div>
                <div class="employee-card-department">${empData.department}</div>
            </div>

            <!-- 1행: 수금 그룹 -->
            <div class="employee-card-row collection-group">
                <div class="card-row-group">
                    <div class="card-row-label">목표수금</div>
                    <div class="card-row-value ${targetCollectionFmt.className}">${targetCollectionFmt.text}</div>
                </div>
                <div class="card-row-group">
                    <div class="card-row-label">실제수금</div>
                    <div class="card-row-value ${actualCollectionFmt.className}">${actualCollectionFmt.text}</div>
                </div>
                <div class="card-row-group">
                    <div class="card-row-label">달성률</div>
                    <div class="card-row-value rate">${collectionRate}%</div>
                </div>
            </div>

            <!-- 2행: 매출 그룹 -->
            <div class="employee-card-row sales-group">
                <div class="card-row-group">
                    <div class="card-row-label">목표매출</div>
                    <div class="card-row-value ${targetSalesFmt.className}">${targetSalesFmt.text}</div>
                </div>
                <div class="card-row-group">
                    <div class="card-row-label">실제매출</div>
                    <div class="card-row-value ${actualSalesFmt.className}">${actualSalesFmt.text}</div>
                </div>
                <div class="card-row-group">
                    <div class="card-row-label">달성률</div>
                    <div class="card-row-value rate">${salesRate}%</div>
                </div>
            </div>

            <!-- 3행: 누적 그룹 -->
            <div class="employee-card-row cumulative-group">
                <div class="card-row-group">
                    <div class="card-row-label">누적수금</div>
                    <div class="card-row-value ${cumulativeCollectionFmt.className}">${cumulativeCollectionFmt.text}</div>
                </div>
                <div class="card-row-group">
                    <div class="card-row-label">누적매출</div>
                    <div class="card-row-value ${cumulativeSalesFmt.className}">${cumulativeSalesFmt.text}</div>
                </div>
            </div>
        </div>
    `;
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

        case 'individual':
            sectionElement = document.querySelector('.individual-performance-section');
            contentElements = [
                sectionElement?.querySelector('.individual-filters'),
                sectionElement?.querySelector('.individual-period-display'),
                sectionElement?.querySelector('.individual-cards-container')
            ].filter(el => el !== null);
            break;

        case 'employee':
            sectionElement = document.querySelector('.employee-stats-section');
            contentElements = [
                sectionElement?.querySelector('.stats-table-container')
            ].filter(el => el !== null);
            break;

        case 'last-payment':
            sectionElement = document.querySelector('.last-payment-section');
            contentElements = [
                sectionElement?.querySelector('.last-payment-chart-container'),
                sectionElement?.querySelector('.last-payment-stats')
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
            // 최종결제일 보고의 stats는 grid로 표시
            if (section === 'last-payment' && el.classList.contains('last-payment-stats')) {
                el.style.display = 'grid';
            } else {
                el.style.display = 'block';
            }
        });

        // 섹션의 collapsed 클래스 제거
        if (sectionElement) {
            sectionElement.classList.remove('collapsed');
        }

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

        // 섹션의 collapsed 클래스 추가
        if (sectionElement) {
            sectionElement.classList.add('collapsed');
        }

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

        // ✅ MODIFIED: API 호출 (주간 보고서만 조회 - 실제 성과 데이터)
        const response = await apiManager.getReports({
            startDate: dateRange.start,
            endDate: dateRange.end,
            reportType: 'weekly'  // 주간 보고서만 조회 (월간/연간 목표 보고서는 별도 로드)
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

        // 최종결제일 통계 렌더링
        renderLastPaymentStats();

    } catch (error) {
        logger.error('❌ 보고서 로드 실패:', error);
        showToast('보고서 데이터를 불러오는데 실패했습니다.', 'error');
    }
}

/**
 * ❌ DEPRECATED: 목표 보고서 로드 (월간/연간)
 * 목표값은 employees 테이블의 monthlyCollectionGoal, monthlySalesGoal,
 * annualCollectionGoal, annualSalesGoal을 직접 사용하도록 변경됨
 * @param {string} period - 'monthly' 또는 'yearly'
 */
// async function loadGoalReports(period) {
//     try {
//         const reportType = period === 'monthly' ? 'monthly' : 'annual';
//         logger.log(`📊 [목표 보고서] ${reportType} 보고서 로드 중...`);
//         const response = await apiManager.getReports({
//             reportType: reportType,
//             limit: 100
//         });
//         goalReports = {};
//         let reports = [];
//         if (response && response.data && Array.isArray(response.data.reports)) {
//             reports = response.data.reports;
//         } else if (Array.isArray(response)) {
//             reports = response;
//         }
//         reports.forEach(report => {
//             const employee = report.submittedBy;
//             if (!goalReports[employee]) {
//                 goalReports[employee] = {};
//             }
//             if (reportType === 'monthly') {
//                 goalReports[employee].monthly = report;
//             } else {
//                 goalReports[employee].annual = report;
//             }
//         });
//         logger.log(`✅ [목표 보고서] ${Object.keys(goalReports).length}명의 ${reportType} 목표 보고서 로드 완료`);
//     } catch (error) {
//         logger.error('❌ [목표 보고서] 로드 실패:', error);
//         goalReports = {};
//     }
// }

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
        // 전체 거래처 로드 (limit 제한 없이 - 매우 큰 숫자 설정)
        const response = await apiManager.getCompanies({ limit: 999999 });

        logger.warn(`[거래처로드] API 응답:`, response);

        // API Manager는 응답을 그대로 반환
        if (response && response.companies && Array.isArray(response.companies)) {
            response.companies.forEach(company => {
                companiesMap[company.keyValue] = company;
            });
            logger.info(`[거래처로드] response.companies 경로: ${response.companies.length}개 로드됨`);
        } else if (response && response.data && Array.isArray(response.data.companies)) {
            // 혹시 response.data에 있을 경우 대비
            response.data.companies.forEach(company => {
                companiesMap[company.keyValue] = company;
            });
            logger.info(`[거래처로드] response.data.companies 경로: ${response.data.companies.length}개 로드됨`);
        } else if (Array.isArray(response)) {
            // 배열 형태로 올 경우
            response.forEach(company => {
                companiesMap[company.keyValue] = company;
            });
            logger.info(`[거래처로드] 배열 경로: ${response.length}개 로드됨`);
        } else {
            logger.warn('⚠️ 거래처 정보 응답 형식 오류:', response);
        }

        logger.info(`[거래처로드] 최종 companiesMap 크기: ${Object.keys(companiesMap).length}`);

        // 첫 번째 거래처 샘플 로그
        const firstCompanyKey = Object.keys(companiesMap)[0];
        if (firstCompanyKey) {
            const firstCompany = companiesMap[firstCompanyKey];
            logger.info(`[거래처로드] 첫 번째 거래처 샘플:`, {
                keyValue: firstCompany.keyValue,
                finalCompanyName: firstCompany.finalCompanyName,
                accumulatedCollection: firstCompany.accumulatedCollection,
                accumulatedSales: firstCompany.accumulatedSales
            });
        }

    } catch (error) {
        logger.error('❌ 거래처 정보 로드 실패:', error);
    }
}

// ============================================
// 최종결제일 보고 관련 함수
// ============================================

/**
 * 최종결제일 데이터 집계 (월별)
 * @returns {Object} 집계된 데이터 { monthlyData, withinYear, overYear, noData }
 */
function aggregateLastPaymentData() {
    const today = new Date();
    const oneYearAgo = new Date(today);
    oneYearAgo.setFullYear(today.getFullYear() - 1);

    logger.warn('[최종결제일 집계] 시작:', {
        오늘날짜: today.toISOString().split('T')[0],
        현재년월: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`,
        일년전: oneYearAgo.toISOString().split('T')[0]
    });

    // 월별 데이터 저장 (최근 12개월)
    const monthlyData = {};

    // 1년 이내, 1년 이전, 데이터 없음 집계
    const withinYear = { count: 0, amount: 0, companies: [] };
    const overYear = { count: 0, amount: 0, companies: [] };
    const noData = { count: 0, amount: 0, companies: [] };

    // 최근 12개월 키 생성 (현재 월부터 시작)
    const monthKeys = [];
    for (let i = 0; i < 12; i++) {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1); // 각 월의 1일
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthKeys.push(key);
        monthlyData[key] = {
            count: 0,
            amount: 0,
            companies: [],
            label: `${date.getFullYear()}년 ${date.getMonth() + 1}월`,
            // 디버깅용: 해당 월의 범위
            startDate: new Date(date.getFullYear(), date.getMonth(), 1),
            endDate: new Date(date.getFullYear(), date.getMonth() + 1, 0) // 다음 월 0일 = 이번 달 마지막 날
        };
    }

    logger.warn('[최종결제일 집계] 생성된 월 키:', monthKeys);

    // 디버깅을 위한 카운터
    let totalCompanies = 0;
    let companiesWithDate = 0;
    let septemberCompanies = 0;
    let septemberAmount = 0;

    // 모든 거래처 순회
    Object.values(companiesMap).forEach(company => {
        totalCompanies++;
        const lastPaymentDate = company.lastPaymentDate;
        const lastPaymentAmount = Number(company.lastPaymentAmount) || 0;

        const companyInfo = {
            keyValue: company.keyValue,
            name: company.finalCompanyName || company.keyValue,
            lastPaymentDate: lastPaymentDate,
            lastPaymentAmount: lastPaymentAmount
        };

        if (!lastPaymentDate) {
            // 데이터 없음
            noData.count++;
            noData.amount += lastPaymentAmount;
            noData.companies.push(companyInfo);
        } else {
            companiesWithDate++;
            const paymentDate = new Date(lastPaymentDate);

            // 디버깅: 9월 데이터 추적
            if (lastPaymentDate.includes('2025.09') || lastPaymentDate.includes('2025-09')) {
                septemberCompanies++;
                septemberAmount += lastPaymentAmount;
                if (septemberCompanies <= 5) {
                    logger.warn(`[9월 샘플] ${company.keyValue}: ${lastPaymentDate} = ${lastPaymentAmount.toLocaleString()}원`);
                }
            }

            if (paymentDate >= oneYearAgo) {
                // 1년 이내
                withinYear.count++;
                withinYear.amount += lastPaymentAmount;
                withinYear.companies.push(companyInfo);

                // 월별 집계 (최근 12개월 내에만 포함)
                const monthKey = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, '0')}`;
                if (monthlyData[monthKey]) {
                    monthlyData[monthKey].count++;
                    monthlyData[monthKey].amount += lastPaymentAmount;
                    monthlyData[monthKey].companies.push(companyInfo);
                }
                // monthKey가 없으면 1년 이내이지만 최근 12개월 밖 (정상 동작)
            } else {
                // 1년 이전
                overYear.count++;
                overYear.amount += lastPaymentAmount;
                overYear.companies.push(companyInfo);
            }
        }
    });

    logger.warn('[최종결제일 집계] 거래처 처리 완료:', {
        전체거래처: totalCompanies,
        날짜있음: companiesWithDate,
        날짜없음: noData.count,
        '9월거래처': septemberCompanies,
        '9월금액': Math.round(septemberAmount / 10000) + '만원'
    });

    // 월별 데이터를 배열로 변환 (과거순 정렬)
    const monthlyArray = Object.keys(monthlyData)
        .sort((a, b) => a.localeCompare(b)) // 오름차순 (과거부터 시작: 2024년11월 → 2025년10월)
        .map(key => ({
            month: key,
            ...monthlyData[key]
        }));

    // 월별 상세 로깅
    logger.warn('[최종결제일 집계] 월별 상세:',
        monthlyArray.slice(0, 5).map(m => ({
            월: m.label,
            개수: m.count,
            금액만원: Math.round(m.amount / 10000)
        }))
    );

    logger.warn('[최종결제일 집계] 완료:', {
        withinYearCount: withinYear.count,
        withinYearAmount: Math.round(withinYear.amount / 10000) + '만원',
        overYearCount: overYear.count,
        overYearAmount: Math.round(overYear.amount / 10000) + '만원',
        noDataCount: noData.count,
        monthlyDataLength: monthlyArray.length
    });

    return {
        monthlyData: monthlyArray,
        withinYear,
        overYear,
        noData
    };
}

/**
 * 최종결제일 통계 표시
 */
function renderLastPaymentStats() {
    const aggregated = aggregateLastPaymentData();

    // 통계 박스 업데이트
    document.getElementById('withinYearCount').textContent = `${aggregated.withinYear.count}개`;
    document.getElementById('withinYearAmount').textContent = formatCurrency(aggregated.withinYear.amount);

    document.getElementById('overYearCount').textContent = `${aggregated.overYear.count}개`;
    document.getElementById('overYearAmount').textContent = formatCurrency(aggregated.overYear.amount);

    document.getElementById('noDataCount').textContent = `${aggregated.noData.count}개`;
    document.getElementById('noDataAmount').textContent = formatCurrency(aggregated.noData.amount);

    logger.warn('[최종결제일 통계] 렌더링 완료');

    // 차트 렌더링
    renderLastPaymentChart(aggregated);

    return aggregated;
}

// 차트 인스턴스 저장 (재렌더링 시 파괴용)
let lastPaymentChartInstance = null;

/**
 * 최종결제일 차트 렌더링
 */
function renderLastPaymentChart(aggregated) {
    const canvas = document.getElementById('lastPaymentChart');
    if (!canvas) {
        logger.warn('[최종결제일 차트] Canvas 요소를 찾을 수 없습니다');
        return;
    }

    // 기존 차트 파괴
    if (lastPaymentChartInstance) {
        lastPaymentChartInstance.destroy();
    }

    // 차트 데이터 준비
    const labels = [];
    const counts = [];
    const amounts = [];
    const companiesData = []; // 각 막대에 대한 거래처 리스트 저장

    // 최근 12개월 데이터만 표시 (최신부터 과거로)
    // aggregated.monthlyData는 이미 내림차순 정렬되어 있음 (최신 → 과거)
    aggregated.monthlyData.forEach(monthData => {
        labels.push(monthData.label);
        counts.push(monthData.count);
        amounts.push(monthData.amount);
        companiesData.push(monthData.companies);
    });

    logger.warn('[최종결제일 차트] 데이터:', {
        labels,
        counts,
        amounts: amounts.map(a => Math.round(a / 10000)),
        totalCompanies: counts.reduce((sum, c) => sum + c, 0),
        기간확인: {
            시작월: labels[0],
            종료월: labels[labels.length - 1]
        }
    });

    // 금액을 만원 단위로 변환
    const amountsInManwon = amounts.map(a => Math.round(a / 10000));

    // Chart.js 생성 - 단일 Y축 (금액)
    const ctx = canvas.getContext('2d');
    lastPaymentChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '금액 (만원)',
                    data: amountsInManwon,
                    backgroundColor: 'rgba(236, 72, 153, 0.7)',  // 핑크색
                    borderColor: 'rgba(236, 72, 153, 1)',
                    borderWidth: 2,
                    // 막대 위에 레이블 표시용 데이터 저장
                    counts: counts,
                    amounts: amounts
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                title: {
                    display: true,
                    text: '최종결제일 기준 거래처 분포 (최근 12개월)',
                    font: {
                        size: 18,
                        weight: 'bold',
                        family: 'Paperlogy, sans-serif'
                    },
                    color: '#ec4899',
                    padding: {
                        top: 10,
                        bottom: 20
                    }
                },
                legend: {
                    display: false  // 단일 데이터셋이므로 범례 숨김
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleFont: {
                        family: 'Paperlogy, sans-serif',
                        size: 14,
                        weight: 'bold'
                    },
                    bodyFont: {
                        family: 'Paperlogy, sans-serif',
                        size: 13
                    },
                    padding: 12,
                    callbacks: {
                        title: function(context) {
                            return context[0].label;
                        },
                        label: function(context) {
                            const amountInManwon = context.parsed.y;
                            const count = counts[context.dataIndex];
                            const amount = amounts[context.dataIndex];
                            return [
                                `거래처: ${count}개`,
                                `금액: ${formatCurrency(amount)}`
                            ];
                        }
                    }
                },
                // 막대 위에 레이블 표시
                datalabels: {
                    display: true,
                    anchor: 'end',
                    align: 'top',
                    font: {
                        family: 'Paperlogy, sans-serif',
                        size: 11,
                        weight: 'bold'
                    },
                    color: '#333333',
                    formatter: function(value, context) {
                        const count = counts[context.dataIndex];
                        const amountInManwon = value; // value는 이미 만원 단위
                        return `${count}개(${amountInManwon.toLocaleString()}만원)`;
                    },
                    padding: {
                        top: 4
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: '금액 (만원)',
                        color: '#333333',  // 검은색 계열
                        font: {
                            family: 'Paperlogy, sans-serif',
                            size: 14,
                            weight: 'bold'
                        },
                        padding: {
                            bottom: 10
                        }
                    },
                    ticks: {
                        color: '#333333',  // 검은색 계열
                        font: {
                            family: 'Paperlogy, sans-serif',
                            size: 12
                        },
                        callback: function(value) {
                            return value.toLocaleString() + '만원';
                        }
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)',
                        lineWidth: 1
                    }
                },
                x: {
                    ticks: {
                        color: '#333333',  // 검은색 계열
                        font: {
                            family: 'Paperlogy, sans-serif',
                            size: 11
                        },
                        maxRotation: 45,
                        minRotation: 45
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)',
                        lineWidth: 1
                    }
                }
            },
            onClick: (event, activeElements) => {
                if (activeElements.length > 0) {
                    const dataIndex = activeElements[0].index;
                    const companies = companiesData[dataIndex];
                    const periodLabel = labels[dataIndex];

                    showLastPaymentModal(periodLabel, companies);
                }
            }
        },
        plugins: [{
            id: 'customDatalabels',
            afterDatasetsDraw: function(chart) {
                const ctx = chart.ctx;
                chart.data.datasets.forEach((dataset, i) => {
                    const meta = chart.getDatasetMeta(i);
                    meta.data.forEach((bar, index) => {
                        const amountInManwon = dataset.data[index]; // Y축 값 (이미 만원 단위)
                        const count = dataset.counts[index]; // 거래처 개수
                        const label = `${count}개(${amountInManwon.toLocaleString()}만원)`;

                        ctx.fillStyle = '#333333';  // 검은색 계열
                        ctx.font = 'bold 11px Paperlogy, sans-serif';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'bottom';
                        ctx.fillText(label, bar.x, bar.y - 5);
                    });
                });
            }
        }]
    });

    logger.info('[최종결제일 차트] 렌더링 완료');
}

/**
 * 최종결제일 모달 표시
 * @param {string} periodLabel - 기간 레이블 (예: "2024년 10월", "1년 이전", "자료 없음")
 * @param {Array} companies - 거래처 목록
 */
function showLastPaymentModal(periodLabel, companies) {
    const modal = document.getElementById('lastPaymentModal');
    const modalTitle = document.getElementById('lastPaymentModalTitle');
    const modalBody = document.getElementById('lastPaymentModalBody');

    // 제목 설정
    modalTitle.textContent = `${periodLabel} - 거래처 목록 (${companies.length}개)`;

    // 테이블 생성
    let html = '';

    if (companies.length === 0) {
        html = '<p style="text-align: center; padding: 40px; color: var(--text-secondary);">해당 기간에 거래처가 없습니다.</p>';
    } else {
        html = `
            <div class="table-wrapper">
                <table class="report-table">
                    <thead>
                        <tr>
                            <th style="width: 60px;">번호</th>
                            <th style="min-width: 200px;">거래처명</th>
                            <th style="min-width: 120px;">마지막 결제일</th>
                            <th style="min-width: 150px;">결제 금액</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        // 금액 기준 내림차순 정렬
        const sortedCompanies = [...companies].sort((a, b) => b.lastPaymentAmount - a.lastPaymentAmount);

        sortedCompanies.forEach((company, index) => {
            const paymentDate = company.lastPaymentDate
                ? formatDate(company.lastPaymentDate)
                : '-';
            const amount = formatCurrency(company.lastPaymentAmount);

            html += `
                <tr>
                    <td style="text-align: center;">${index + 1}</td>
                    <td style="text-align: left;">${company.name}</td>
                    <td style="text-align: center;">${paymentDate}</td>
                    <td style="text-align: right; font-family: var(--font-primary); font-weight: 600;">${amount}</td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;
    }

    modalBody.innerHTML = html;

    // 모달 표시
    modal.classList.add('show');

    logger.info(`[최종결제일 모달] 표시: ${periodLabel}, ${companies.length}개 거래처`);
}

/**
 * 최종결제일 모달 닫기
 */
function closeLastPaymentModal() {
    const modal = document.getElementById('lastPaymentModal');
    modal.classList.remove('show');
}

// 전역 함수로 등록 (HTML onclick에서 사용)
window.closeLastPaymentModal = closeLastPaymentModal;

/**
 * 기간 범위 계산
 */
function calculateDateRange(period) {
    const today = new Date();
    let start, end;

    switch (period) {
        case 'weekly':
            // 주간: 지난주 월요일 ~ 일요일
            const lastWeek = new Date(today);
            lastWeek.setDate(today.getDate() - 7);  // 7일 전
            start = getMonday(lastWeek);
            end = getSunday(lastWeek);
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
        // 담당부서 필터 (다중 선택 OR 조건)
        if (selectedDepartments.length > 0) {
            const employeeInfo = employeesMap[report.submittedBy] || {};
            const reportDepartment = employeeInfo.department || report.department || '미분류';
            if (!selectedDepartments.includes(reportDepartment)) {
                return false;
            }
        }

        // 내부담당자 필터 (다중 선택 OR 조건)
        if (selectedEmployees.length > 0) {
            if (!selectedEmployees.includes(report.submittedBy)) {
                return false;
            }
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
 * ✅ MODIFIED: 월간/연간 기간인 경우 목표 보고서 사용
 */
function groupByEmployee(reports) {
    const grouped = {};
    const period = currentFilters.period;

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

        // ✅ NEW: 기간별 처리 로직
        if (period === 'weekly') {
            // 주간: 각 보고서의 목표/실제 금액 사용
            grouped[employee].subtotal.targetCollection += Number(report.targetCollectionAmount) || 0;
            grouped[employee].subtotal.actualCollection += Number(report.actualCollectionAmount) || 0;
            grouped[employee].subtotal.targetSales += Number(report.targetSalesAmount) || 0;
            grouped[employee].subtotal.actualSales += Number(report.actualSalesAmount) || 0;
        } else {
            // 월간/연간: 실제 금액만 누적 (목표는 나중에 goalReports에서 가져옴)
            grouped[employee].subtotal.actualCollection += Number(report.actualCollectionAmount) || 0;
            grouped[employee].subtotal.actualSales += Number(report.actualSalesAmount) || 0;
        }
    });

    // ✅ NEW: 월간/연간 기간인 경우 목표 금액을 employees 테이블에서 설정
    if (period === 'monthly' || period === 'yearly') {
        Object.keys(grouped).forEach(employee => {
            const employeeInfo = employeesMap[employee];

            if (employeeInfo) {
                if (period === 'monthly') {
                    grouped[employee].subtotal.targetCollection = Number(employeeInfo.monthlyCollectionGoal) || 0;
                    grouped[employee].subtotal.targetSales = Number(employeeInfo.monthlySalesGoal) || 0;
                } else if (period === 'yearly') {
                    grouped[employee].subtotal.targetCollection = Number(employeeInfo.annualCollectionGoal) || 0;
                    grouped[employee].subtotal.targetSales = Number(employeeInfo.annualSalesGoal) || 0;
                }
            } else {
                // 직원 정보가 없는 경우 0으로 설정
                grouped[employee].subtotal.targetCollection = 0;
                grouped[employee].subtotal.targetSales = 0;
            }
        });
    }

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
 * ✅ MODIFIED: groupedReports의 subtotal을 사용하여 목표 보고서 반영
 */
function renderSummary() {
    const employeeCount = Object.keys(groupedReports).length;
    const reportCount = filteredReports.length;

    let totalTargetCollection = 0;
    let totalActualCollection = 0;
    let totalTargetSales = 0;
    let totalActualSales = 0;

    // ✅ MODIFIED: groupedReports의 subtotal을 합산 (목표 보고서가 반영된 값)
    Object.values(groupedReports).forEach(group => {
        totalTargetCollection += group.subtotal.targetCollection || 0;
        totalActualCollection += group.subtotal.actualCollection || 0;
        totalTargetSales += group.subtotal.targetSales || 0;
        totalActualSales += group.subtotal.actualSales || 0;
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

    // 기본 기간 설정 (주간 = 지난주)
    const defaultRange = calculateDateRange('weekly');

    // 시작일 달력 초기화
    const startDateEl = document.getElementById('comparisonStartDate');
    if (startDateEl) {
        // ✅ Flatpickr 라이브러리 확인 (모듈 스코프에서 글로벌 window.flatpickr 접근)
        if (typeof window.flatpickr !== 'undefined') {

            try {
                startDatePicker = window.flatpickr(startDateEl, {
                    locale: 'ko',                    // 한국어
                    dateFormat: 'Y-m-d',             // 날짜 형식 (YYYY-MM-DD)
                    defaultDate: defaultRange.start, // 기본값: 지난주 시작일
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
        // ✅ Flatpickr 라이브러리 확인 (모듈 스코프에서 글로벌 window.flatpickr 접근)
        if (typeof window.flatpickr !== 'undefined') {
            try {
                endDatePicker = window.flatpickr(endDateEl, {
                    locale: 'ko',                    // 한국어
                    dateFormat: 'Y-m-d',             // 날짜 형식 (YYYY-MM-DD)
                    defaultDate: defaultRange.end,   // 기본값: 지난주 종료일
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
 * ✅ 데이터는 무조건 주간보고서만 사용, 이 선택은 표시 방식(그룹화 단위)만 변경
 */
function handleComparisonPeriodChange(event) {
    comparisonFilters.period = event.target.value;
    // 주간/월간/연간은 단지 테이블 표시 방식(그룹화 단위)만 변경
    // 데이터는 항상 주간보고서에서만 가져옴
    // 시작일/종료일은 사용자가 입력한 값 유지
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
    // 필터 값 가져오기 (다중 선택 사용)
    comparisonFilters.department = comparisonSelectedDepartments.length > 0 ? comparisonSelectedDepartments[0] : '';
    comparisonFilters.employee = comparisonSelectedEmployees.length > 0 ? comparisonSelectedEmployees[0] : '';
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

        // API 호출 파라미터 구성 (주간보고서만 조회)
        // 다중 선택 필터는 클라이언트에서 처리하므로 API에 전달하지 않음
        const params = {
            startDate: comparisonFilters.startDate,
            endDate: comparisonFilters.endDate,
            reportType: 'weekly'  // ✅ 비교보고는 무조건 주간보고서만 기준
        };


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

        // ✅ 클라이언트 사이드 필터링 (다중 선택 OR 조건)
        let beforeClientFilterCount = comparisonReports.length;

        // 담당부서 필터 (다중 선택 OR 조건)
        if (comparisonSelectedDepartments.length > 0) {
            comparisonReports = comparisonReports.filter(report => {
                const employeeInfo = employeesMap[report.submittedBy] || {};
                const reportDepartment = employeeInfo.department || report.department || '미분류';
                return comparisonSelectedDepartments.includes(reportDepartment);
            });

            beforeClientFilterCount = comparisonReports.length;
        }

        // 내부담당자 필터 (다중 선택 OR 조건)
        if (comparisonSelectedEmployees.length > 0) {
            comparisonReports = comparisonReports.filter(report => {
                return comparisonSelectedEmployees.includes(report.submittedBy);
            });
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
 * ✅ MODIFIED: 월간/연간 기간인 경우 목표 보고서 사용
 */
function aggregateReports(reports) {
    let totalActualCollection = 0;
    let totalActualSales = 0;
    let totalTargetCollection = 0;
    let totalTargetSales = 0;

    // ✅ 비교보고는 주간보고서만 기준
    reports.forEach(report => {
        // 목표 금액: 작성된 모든 주간보고서의 target 값
        totalTargetCollection += Number(report.targetCollectionAmount) || 0;
        totalTargetSales += Number(report.targetSalesAmount) || 0;

        // 실제 금액: 확정된 주간보고서의 actual 값만 (confirmationData가 있는 것만)
        if (report.confirmationData) {
            totalActualCollection += Number(report.actualCollectionAmount) || 0;
            totalActualSales += Number(report.actualSalesAmount) || 0;
        }
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
    // ✅ 데이터는 무조건 주간보고서만 사용, period는 표시 방식(그룹화 단위)
    const periodName = comparisonFilters.period === 'weekly' ? '주간' : comparisonFilters.period === 'monthly' ? '월간' : '연간';

    if (comparisonFilters.employee) {
        // 담당부서 + 내부담당자 선택: 특정 직원의 기간별 데이터
        html = renderComparisonByEmployee();
        aggregationInfo = `📊 <strong>${comparisonFilters.employee}</strong>님의 <strong>${periodName}</strong> 기간별 집계`;
    } else if (comparisonFilters.department) {
        // 담당부서만 선택: 해당 부서의 직원별 전체 합계
        html = renderComparisonByDepartment();
        aggregationInfo = `👥 <strong>${comparisonFilters.department}</strong> 부서의 <strong>직원별 전체 합계</strong>`;
    } else {
        // 부서/직원 선택 없음: 기간별 전체 집계
        html = renderComparisonByPeriod();
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
    // ✅ 데이터는 주간보고서만 사용, period는 그룹화 단위 (주간/월간/연간)
    const periodGroups = groupReportsByPeriod(
        comparisonReports,
        comparisonFilters.period,  // 사용자가 선택한 표시 방식
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
            <tr class="report-row period-total-row" style="font-weight: bold;">
                <td colspan="2">${group.displayText} (전체)</td>
                <td class="amount" style="background: rgba(59, 130, 246, 0.25) !important;">${formatCurrencyLocal(aggregated.totalTargetCollection)}</td>
                <td class="amount" style="background: rgba(59, 130, 246, 0.25) !important;">${formatCurrencyLocal(aggregated.totalActualCollection)}</td>
                <td class="rate ${getRateClass(aggregated.collectionRate)}" style="background: rgba(59, 130, 246, 0.25) !important;">${aggregated.collectionRate}%</td>
                <td class="amount" style="background: rgba(16, 185, 129, 0.25) !important;">${formatCurrencyLocal(aggregated.totalTargetSales)}</td>
                <td class="amount" style="background: rgba(16, 185, 129, 0.25) !important;">${formatCurrencyLocal(aggregated.totalActualSales)}</td>
                <td class="rate ${getRateClass(aggregated.salesRate)}" style="background: rgba(16, 185, 129, 0.25) !important;">${aggregated.salesRate}%</td>
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
                    <tr class="report-row department-detail-row" style="padding-left: var(--spacing-lg);">
                        <td colspan="2" style="padding-left: 2rem;">└─ ${department}</td>
                        <td class="amount" style="background: rgba(59, 130, 246, 0.2) !important;">${formatCurrencyLocal(deptAggregated.totalTargetCollection)}</td>
                        <td class="amount" style="background: rgba(59, 130, 246, 0.2) !important;">${formatCurrencyLocal(deptAggregated.totalActualCollection)}</td>
                        <td class="rate ${getRateClass(deptAggregated.collectionRate)}" style="background: rgba(59, 130, 246, 0.2) !important;">${deptAggregated.collectionRate}%</td>
                        <td class="amount" style="background: rgba(16, 185, 129, 0.2) !important;">${formatCurrencyLocal(deptAggregated.totalTargetSales)}</td>
                        <td class="amount" style="background: rgba(16, 185, 129, 0.2) !important;">${formatCurrencyLocal(deptAggregated.totalActualSales)}</td>
                        <td class="rate ${getRateClass(deptAggregated.salesRate)}" style="background: rgba(16, 185, 129, 0.2) !important;">${deptAggregated.salesRate}%</td>
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

    // ✅ 데이터는 주간보고서만 사용, period는 그룹화 단위
    const allPeriods = generatePeriodRanges(
        comparisonFilters.startDate,
        comparisonFilters.endDate,
        comparisonFilters.period  // 사용자가 선택한 표시 방식
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
            <tr class="report-row period-total-row" style="font-weight: bold;">
                <td colspan="2">${periodInfo.displayText} (${selectedDept} 전체)</td>
                <td class="amount" style="background: rgba(59, 130, 246, 0.25) !important;">${formatCurrencyLocal(aggregated.totalTargetCollection)}</td>
                <td class="amount" style="background: rgba(59, 130, 246, 0.25) !important;">${formatCurrencyLocal(aggregated.totalActualCollection)}</td>
                <td class="rate ${getRateClass(aggregated.collectionRate)}" style="background: rgba(59, 130, 246, 0.25) !important;">${aggregated.collectionRate}%</td>
                <td class="amount" style="background: rgba(16, 185, 129, 0.25) !important;">${formatCurrencyLocal(aggregated.totalTargetSales)}</td>
                <td class="amount" style="background: rgba(16, 185, 129, 0.25) !important;">${formatCurrencyLocal(aggregated.totalActualSales)}</td>
                <td class="rate ${getRateClass(aggregated.salesRate)}" style="background: rgba(16, 185, 129, 0.25) !important;">${aggregated.salesRate}%</td>
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
                    <tr class="report-row employee-detail-row">
                        <td colspan="2" style="padding-left: 2rem;">└─ ${employeeName}</td>
                        <td class="amount" style="background: rgba(59, 130, 246, 0.2) !important;">${formatCurrencyLocal(employeeAggregated.totalTargetCollection)}</td>
                        <td class="amount" style="background: rgba(59, 130, 246, 0.2) !important;">${formatCurrencyLocal(employeeAggregated.totalActualCollection)}</td>
                        <td class="rate ${getRateClass(employeeAggregated.collectionRate)}" style="background: rgba(59, 130, 246, 0.2) !important;">${employeeAggregated.collectionRate}%</td>
                        <td class="amount" style="background: rgba(16, 185, 129, 0.2) !important;">${formatCurrencyLocal(employeeAggregated.totalTargetSales)}</td>
                        <td class="amount" style="background: rgba(16, 185, 129, 0.2) !important;">${formatCurrencyLocal(employeeAggregated.totalActualSales)}</td>
                        <td class="rate ${getRateClass(employeeAggregated.salesRate)}" style="background: rgba(16, 185, 129, 0.2) !important;">${employeeAggregated.salesRate}%</td>
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
    // ✅ 데이터는 주간보고서만 사용, period는 그룹화 단위
    const periodGroups = groupReportsByPeriod(
        comparisonReports,
        comparisonFilters.period,  // 사용자가 선택한 표시 방식
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
                <td class="amount" style="background: rgba(59, 130, 246, 0.25) !important;">${formatCurrencyLocal(aggregated.totalTargetCollection)}</td>
                <td class="amount" style="background: rgba(59, 130, 246, 0.25) !important;">${formatCurrencyLocal(aggregated.totalActualCollection)}</td>
                <td class="rate ${getRateClass(aggregated.collectionRate)}" style="background: rgba(59, 130, 246, 0.25) !important;">${aggregated.collectionRate}%</td>
                <td class="amount" style="background: rgba(16, 185, 129, 0.25) !important;">${formatCurrencyLocal(aggregated.totalTargetSales)}</td>
                <td class="amount" style="background: rgba(16, 185, 129, 0.25) !important;">${formatCurrencyLocal(aggregated.totalActualSales)}</td>
                <td class="rate ${getRateClass(aggregated.salesRate)}" style="background: rgba(16, 185, 129, 0.25) !important;">${aggregated.salesRate}%</td>
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

        // ✅ 데이터는 렌더링하되, 화면 표시는 CSS 기본값(숨김) 유지
        // 사용자가 "상세보기" 버튼을 클릭할 때만 표시됨
    } else {
        // 영업담당자가 없으면 데이터 없음
        logger.warn('⚠️ [영업담당자통계] 영업담당자가 없음');
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

// ============================================
// SPA 페이지 재로드 이벤트 리스너
// ============================================

/**
 * ✅ pageLoaded 이벤트 리스너 - 페이지 재로드 시 전체 초기화
 */
window.addEventListener('pageLoaded', (event) => {
    const { page } = event.detail || {};

    if (page === 'presentation') {
        // 페이지 재로드 시 전체 초기화 (데이터 로드 + 이벤트 리스너 재연결)
        setTimeout(() => {
            init();
        }, 100);  // DOM이 완전히 렌더링된 후 초기화
    }
});
