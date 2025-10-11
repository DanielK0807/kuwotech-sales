/**
 * ============================================
 * KUWOTECH 영업관리 시스템 - 전체거래처 관리 (관리자모드)
 * Created by: Daniel.K
 * Date: 2025-01-27
 * ============================================
 */

// ============================================
// [SECTION: 공통 모듈 임포트]
// ============================================

import {
    GlobalConfig,
    formatNumber,
    formatCurrency,
    formatDate,
    showToast,
    showModal,
    showLoading,
    hideLoading,
    translateToKorean,
    debounce,
    throttle,
    deepClone
} from '../../01.common/10_index.js';

import { initDownloadButton, exportExcel, importExcel } from './03_companies_download.js';
import { getCompanyDisplayName } from '../../01.common/02_utils.js';
import {
    validatePhoneNumber,
    validateBusinessNumber,
    checkCompanyNameDuplicate,
    checkBusinessNumberDuplicate,
    showDuplicateCompanyModal,
    parseRegionFromAddress
} from '../../01.common/18_validation_utils.js';
import logger from '../../01.common/23_logger.js';
import AutocompleteManager from '../../01.common/25_autocomplete_manager.js';

// ============================================
// [SECTION: 전역 변수]
// ============================================

const user = JSON.parse(sessionStorage.getItem('user') || '{}');
let companyList = [];
let allCompaniesForAutocomplete = []; // 자동완성용 전체 거래처 목록
let currentFilter = {
    employee: [],    // 배열 (다중 선택)
    department: [],  // 배열로 변경 (다중 선택)
    status: [],      // 배열로 변경 (다중 선택)
    product: [],     // 배열로 변경 (다중 선택)
    region: [],      // 배열로 변경 (다중 선택)
    name: ''         // 거래처명만 단일 선택 (자동완성 keyValue 저장)
};
let currentSort = 'name';

// ============================================
// [SECTION: 초기화]
// ============================================

async function initAllCompanies() {
    try {
        showLoading('거래처 데이터를 불러오는 중...');
        
        // DOM 요소 확인 후 이벤트 리스너 설정
        await waitForDOMReady();
        setupEventListeners();
        
        // 마스터 데이터 로드 (제품, 지역, 담당자, 부서)
        await loadMasterData();
        
        // 거래처 목록 로드
        await loadCompanies();

        // 거래처명 자동완성 초기화
        initCompanyAutocomplete();

        // 다운로드 버튼 초기화
        initDownloadButton();

        hideLoading();
        
    } catch (error) {
        logger.error('[전체거래처] 초기화 실패:', error);
        hideLoading();
        showToast('거래처 데이터 로드 중 오류가 발생했습니다.', 'error');
    }
}

// DOM 준비 대기 함수
function waitForDOMReady() {
    return new Promise((resolve) => {
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            // DOM이 이미 준비됨
            setTimeout(resolve, 100); // 약간의 여유 시간
        } else {
            // DOM 로드 대기
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(resolve, 100);
            });
        }
    });
}

// ============================================
// [SECTION: 마스터 데이터 로드]
// ============================================

/**
 * 제품, 지역, 담당자, 부서 마스터 데이터 로드
 */
async function loadMasterData() {
    try {
        // 1. 제품 목록 로드
        const productsResponse = await fetch(`${GlobalConfig.API_BASE_URL}/api/master/products`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        if (productsResponse.ok) {
            const productsData = await productsResponse.json();
            if (productsData.success) {
                populateProductSelect(productsData.products);
            }
        }

        // 2. 지역 마스터 데이터 조회 (고객사지역 필터용)
        const regionsResponse = await fetch(`${GlobalConfig.API_BASE_URL}/api/master/regions`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });

        if (regionsResponse.ok) {
            const regionsData = await regionsResponse.json();
            if (regionsData.success) {
                populateRegionSelect(regionsData.regions);
            }
        }

        // 3. 담당부서 목록 로드
        const departmentsResponse = await fetch(`${GlobalConfig.API_BASE_URL}/api/master/departments`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        if (departmentsResponse.ok) {
            const departmentsData = await departmentsResponse.json();
            if (departmentsData.success) {
                populateDepartmentSelect(departmentsData.departments);
                window.masterDepartments = departmentsData.departments; // 전역 저장
            }
        }

        // 4. 직원 목록 로드
        const employeesResponse = await fetch(`${GlobalConfig.API_BASE_URL}/api/employees`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });

        if (employeesResponse.ok) {
            const employeesData = await employeesResponse.json();
            if (employeesData.success) {
                populateEmployeeSelect(employeesData.employees);
            }
        }

        // 5. 거래상태 정적 옵션 로드
        populateStatusSelect();

    } catch (error) {
        logger.error('[마스터데이터] 로드 실패:', error);
        // 에러가 발생해도 계속 진행
    }
}

/**
 * 제품 체크박스 드롭다운 채우기
 */
function populateProductSelect(products) {
    const dropdownMenu = document.getElementById('product-dropdown-menu');
    if (!dropdownMenu) return;

    dropdownMenu.innerHTML = '';

    products.forEach(product => {
        const item = document.createElement('div');
        item.className = 'custom-dropdown-item';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `product-${product.productName}`;
        checkbox.value = product.productName;
        checkbox.addEventListener('change', updateProductSelection);

        const label = document.createElement('label');
        label.htmlFor = `product-${product.productName}`;
        label.textContent = product.productName;

        item.appendChild(checkbox);
        item.appendChild(label);
        dropdownMenu.appendChild(item);
    });
}

/**
 * 판매제품 선택 업데이트
 */
function updateProductSelection() {
    const checkboxes = document.querySelectorAll('#product-dropdown-menu input[type="checkbox"]');
    const selectedValues = Array.from(checkboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);

    const selectedText = document.getElementById('product-selected-text');

    if (selectedValues.length === 0) {
        selectedText.textContent = '전체';
    } else if (selectedValues.length === 1) {
        selectedText.textContent = selectedValues[0];
    } else {
        selectedText.textContent = `${selectedValues[0]} 외 ${selectedValues.length - 1}개`;
    }

    currentFilter.product = selectedValues;
}

/**
 * 고객사지역 checkbox dropdown 채우기 (regions 마스터 데이터 사용)
 */
function populateRegionSelect(regions) {
    const dropdownMenu = document.getElementById('region-dropdown-menu');
    if (!dropdownMenu) return;

    dropdownMenu.innerHTML = '';

    // regions 배열을 display_order로 정렬
    const sortedRegions = [...regions].sort((a, b) => a.display_order - b.display_order);

    sortedRegions.forEach(region => {
        const item = document.createElement('div');
        item.className = 'custom-dropdown-item';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `region-${region.region_code}`;
        checkbox.value = region.region_code; // 필터링용 짧은 코드 (예: "서울")
        checkbox.addEventListener('change', updateRegionSelection);

        const label = document.createElement('label');
        label.htmlFor = `region-${region.region_code}`;
        label.textContent = region.region_name; // 표시용 정식 명칭 (예: "서울특별시")

        item.appendChild(checkbox);
        item.appendChild(label);
        dropdownMenu.appendChild(item);
    });
}

/**
 * 고객사 지역 선택 업데이트
 */
function updateRegionSelection() {
    const checkboxes = document.querySelectorAll('#region-dropdown-menu input[type="checkbox"]');
    const selectedValues = Array.from(checkboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);

    const selectedText = document.getElementById('region-selected-text');

    if (selectedValues.length === 0) {
        selectedText.textContent = '전체';
    } else if (selectedValues.length === 1) {
        selectedText.textContent = selectedValues[0];
    } else {
        selectedText.textContent = `${selectedValues[0]} 외 ${selectedValues.length - 1}개`;
    }

    currentFilter.region = selectedValues;
}

/**
 * 담당부서 체크박스 드롭다운 채우기
 */
function populateDepartmentSelect(departments) {
    const dropdownMenu = document.getElementById('department-dropdown-menu');
    if (!dropdownMenu) return;

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

/**
 * 담당부서 선택 업데이트
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

    currentFilter.department = selectedValues;
}

/**
 * 거래상태 체크박스 드롭다운 채우기 (정적 옵션)
 */
function populateStatusSelect() {
    const dropdownMenu = document.getElementById('status-dropdown-menu');
    if (!dropdownMenu) return;

    const statuses = ['활성', '비활성', '불용', '추가확인'];
    dropdownMenu.innerHTML = '';

    statuses.forEach(status => {
        const item = document.createElement('div');
        item.className = 'custom-dropdown-item';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `status-${status}`;
        checkbox.value = status;
        checkbox.addEventListener('change', updateStatusSelection);

        const label = document.createElement('label');
        label.htmlFor = `status-${status}`;
        label.textContent = status;

        item.appendChild(checkbox);
        item.appendChild(label);
        dropdownMenu.appendChild(item);
    });
}

/**
 * 거래상태 선택 업데이트
 */
function updateStatusSelection() {
    const checkboxes = document.querySelectorAll('#status-dropdown-menu input[type="checkbox"]');
    const selectedValues = Array.from(checkboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);

    const selectedText = document.getElementById('status-selected-text');

    if (selectedValues.length === 0) {
        selectedText.textContent = '전체';
    } else if (selectedValues.length === 1) {
        selectedText.textContent = selectedValues[0];
    } else {
        selectedText.textContent = `${selectedValues[0]} 외 ${selectedValues.length - 1}개`;
    }

    currentFilter.status = selectedValues;
}

/**
 * 직원 체크박스 드롭다운 채우기
 */
function populateEmployeeSelect(employees) {
    const dropdownMenu = document.getElementById('employee-dropdown-menu');
    if (!dropdownMenu) return;

    // 기존 항목 제거
    dropdownMenu.innerHTML = '';

    employees.forEach(emp => {
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

/**
 * 내부담당자 선택 업데이트
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

    // currentFilter 업데이트
    currentFilter.employee = selectedValues;
}

/**
 * 거래처명 select 옵션 채우기
 */
function populateCompanyNameSelect(companies) {
    const filterNameSelect = document.getElementById('filter-name');
    if (!filterNameSelect) return;

    // Keep first "전체" option, remove rest
    while (filterNameSelect.options.length > 1) {
        filterNameSelect.remove(1);
    }

    // 중복 제거를 위해 Set 사용
    const uniqueNames = new Set();
    companies.forEach(company => {
        const displayName = getCompanyDisplayName(company);
        if (displayName && displayName.trim()) {
            uniqueNames.add(displayName);
        }
    });

    // 정렬된 거래처명 배열로 변환
    const sortedNames = Array.from(uniqueNames).sort((a, b) => a.localeCompare(b, 'ko'));

    // 거래처명 옵션 추가
    sortedNames.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        filterNameSelect.appendChild(option);
    });
}

// ============================================
// [SECTION: 거래처 데이터 로드]
// ============================================

async function loadCompanies() {
    try {
        showLoading('거래처 데이터를 불러오는 중...');

        // 백엔드 API 엔드포인트 (관리자용 전체 거래처)
        // limit=10000으로 설정하여 전체 거래처 조회
        const apiUrl = `${GlobalConfig.API_BASE_URL}/api/companies?limit=10000`;

        // 백엔드 API 호출
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`API 오류: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || '데이터 조회 실패');
        }
        
        // 백엔드에서 받은 데이터
        const allCompanies = data.companies || [];

        // 자동완성용 전체 거래처 목록 저장
        allCompaniesForAutocomplete = [...allCompanies];

        // 자동완성 데이터 소스 업데이트
        if (companyAutocompleteManager) {
            companyAutocompleteManager.updateDataSource(allCompaniesForAutocomplete);
        }

        // 주의: 지역 필터는 loadMasterData()에서 regions 테이블 기준으로 이미 처리됨

        // 필터 적용
        companyList = allCompanies;

        // 내부담당자 필터 (OR 조건 - 다중 선택)
        if (currentFilter.employee && currentFilter.employee.length > 0) {
            companyList = companyList.filter(c =>
                currentFilter.employee.includes(c.internalManager)
            );
        }

        // 담당부서 필터 (OR 조건 - 다중 선택)
        if (currentFilter.department && currentFilter.department.length > 0) {
            companyList = companyList.filter(c =>
                currentFilter.department.includes(c.department)
            );
        }

        // 거래상태 필터 (OR 조건 - 다중 선택)
        if (currentFilter.status && currentFilter.status.length > 0) {
            companyList = companyList.filter(c =>
                currentFilter.status.includes(c.businessStatus)
            );
        }

        // 판매제품 필터 (OR 조건 - 다중 선택)
        if (currentFilter.product && currentFilter.product.length > 0) {
            companyList = companyList.filter(c =>
                currentFilter.product.includes(c.salesProduct)
            );
        }

        // 고객사 지역 필터 (OR 조건 - 다중 선택)
        // customerRegion의 첫 번째 공백 이전 값으로 비교 (예: "서울 강남구" -> "서울")
        if (currentFilter.region && currentFilter.region.length > 0) {
            companyList = companyList.filter(c => {
                if (!c.customerRegion) return false;
                const mainRegion = c.customerRegion.trim().split(' ')[0];
                return currentFilter.region.includes(mainRegion);
            });
        }

        // 거래처명 필터 (단일 선택)
        if (currentFilter.name) {
            companyList = companyList.filter(c => getCompanyDisplayName(c) === currentFilter.name);
        }

        // 정렬
        sortCompanies();

        // 테이블 렌더링
        renderCompanyTable();

        // 통계 업데이트
        updateStatistics();

        hideLoading();
        
    } catch (error) {
        logger.error('[거래처 로드 실패]', error);
        hideLoading();
        showToast('거래처 데이터 로드 중 오류가 발생했습니다.', 'error');
        
        // 오류 시 빈 배열로 초기화
        companyList = [];
        renderCompanyTable();
        updateStatistics();
    }
}

// ============================================
// [SECTION: 테이블 렌더링]
// ============================================

function renderCompanyTable() {
    const tbody = document.getElementById('companies-tbody');
    if (!tbody) return;
    
    if (companyList.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="12" class="text-center">
                    <div class="no-data">
                        <p>등록된 거래처가 없습니다.</p>
                        <button class="btn btn-glass" onclick="openCompanyModal()">
                            새 거래처 등록
                        </button>
                    </div>
                </td>
            </tr>`;
        return;
    }
    
    let html = '';
    companyList.forEach((company, index) => {
        const statusClass = getStatusClass(company.businessStatus);
        const statusBadge = getStatusBadge(company.businessStatus);
        
        // 매출채권잔액 계산 (누적매출 - 누적수금)
        const salesReceivable = (company.accumulatedSales || 0) - (company.accumulatedCollection || 0);
        
        // 금액 포맷팅 (음수는 괄호 표시)
        const formatAmount = (value) => {
            const result = formatCurrency(value, true);
            if (typeof result === 'object' && result.isNegative) {
                return `<span class="${result.className}">${result.text}</span>`;
            }
            return result;
        };
        
        html += `
            <tr class="table-row glass-hover" data-key="${company.keyValue}">
                <td>${company.internalManager || '-'}</td>
                <td>${company.department || '-'}</td>
                <td>
                    <div class="company-name">
                        ${getCompanyDisplayName(company) || '-'}
                        ${company.isMainProduct ? '<span class="badge badge-primary">주요</span>' : ''}
                    </div>
                </td>
                <td>${company.ceoOrDentist || '-'}</td>
                <td>${company.customerRegion || '-'}</td>
                <td>
                    <span class="status-badge ${statusClass}">
                        ${statusBadge}
                    </span>
                </td>
                <td>${company.salesProduct || '-'}</td>
                <td>${formatDate(company.lastPaymentDate) || '-'}</td>
                <td>${formatAmount(company.lastPaymentAmount || 0)}</td>
                <td>${formatAmount(company.accumulatedSales || 0)}</td>
                <td>${formatAmount(company.accumulatedCollection || 0)}</td>
                <td>${formatAmount(salesReceivable)}</td>
            </tr>`;
    });
    
    tbody.innerHTML = html;

    // 거래처 행 클릭 이벤트 (상세보기/수정 모달)
    tbody.querySelectorAll('tr[data-key]').forEach(row => {
        row.style.cursor = 'pointer';
        row.addEventListener('click', () => {
            const keyValue = row.getAttribute('data-key');
            if (keyValue) {
                openCompanyDetailModal(keyValue);
            }
        });
    });
}

// ============================================
// [SECTION: 유틸리티 함수]
// ============================================

function getStatusClass(status) {
    const classes = {
        '활성': 'status-active',
        '비활성': 'status-inactive',
        '보류': 'status-pending',
        '불용': 'status-disabled'
    };
    return classes[status] || 'status-default';
}

function getStatusBadge(status) {
    const badges = {
        '활성': '✅ 활성',
        '비활성': '⏸️ 비활성',
        '보류': '⏳ 보류',
        '불용': '❌ 불용'
    };
    return badges[status] || status;
}

function sortCompanies() {
    companyList.sort((a, b) => {
        switch (currentSort) {
            case 'name':
                return getCompanyDisplayName(a).localeCompare(getCompanyDisplayName(b));
            case 'sales':
                return (b.accumulatedSales || 0) - (a.accumulatedSales || 0);
            case 'status':
                return (a.businessStatus || '').localeCompare(b.businessStatus || '');
            default:
                return 0;
        }
    });
}

// ============================================
// [SECTION: 자동완성 기능]
// ============================================

let companyAutocompleteManager = null;

/**
 * 거래처명 자동완성 초기화 (AutocompleteManager 사용)
 */
function initCompanyAutocomplete() {
    const inputElement = document.getElementById('filter-name');
    const listElement = document.getElementById('company-autocomplete-list');

    if (!inputElement || !listElement) {
        logger.warn('[자동완성] 필수 요소를 찾을 수 없습니다');
        return;
    }

    // 기존 인스턴스 정리
    if (companyAutocompleteManager) {
        companyAutocompleteManager.destroy();
    }

    // AutocompleteManager 생성
    companyAutocompleteManager = new AutocompleteManager({
        inputElement,
        listElement,
        dataSource: allCompaniesForAutocomplete,
        getDisplayText: (company) => getCompanyDisplayName(company),
        onSelect: (company) => {
            const companyName = getCompanyDisplayName(company);
            inputElement.value = companyName;

            // 거래처명으로 필터 설정 (keyValue가 아닌 이름으로 필터링)
            currentFilter.name = companyName;

            // 목록 새로고침
            loadCompanies();
        },
        maxResults: 10,
        placeholder: '검색 결과가 없습니다',
        highlightSearch: true
    });
}

// ============================================
// [SECTION: 통계 업데이트]
// ============================================

function updateStatistics() {
    // 현재 필터된 companyList를 기반으로 통계 계산
    const totalCount = companyList.length;
    
    // 백엔드 API 필드명 사용 (camelCase)
    const totalSales = companyList.reduce((sum, c) => {
        const sales = Number(c.accumulatedSales || 0);
        return sum + sales;
    }, 0);

    const totalCollection = companyList.reduce((sum, c) => {
        const collection = Number(c.accumulatedCollection || 0);
        return sum + collection;
    }, 0);
    
    const totalReceivable = totalSales - totalCollection;

    // 거래처 개수 업데이트
    const totalCountElement = document.getElementById('total-count');
    if (totalCountElement) {
        totalCountElement.textContent = formatNumber(totalCount);
    }
    
    // 누적매출금액합계 업데이트
    const totalSalesElement = document.getElementById('total-sales');
    if (totalSalesElement) {
        totalSalesElement.textContent = formatCurrency(totalSales, true);
    }
    
    // 누적수금금액합계 업데이트
    const totalCollectionElement = document.getElementById('total-collection');
    if (totalCollectionElement) {
        totalCollectionElement.textContent = formatCurrency(totalCollection, true);
    }
    
    // 매출채권잔액합계 업데이트
    const totalReceivableElement = document.getElementById('total-receivable');
    if (totalReceivableElement) {
        const formattedValue = formatCurrency(totalReceivable, true);
        if (typeof formattedValue === 'object' && formattedValue.isNegative) {
            totalReceivableElement.innerHTML = `<span class="${formattedValue.className}">${formattedValue.text}</span>`;
        } else {
            totalReceivableElement.textContent = formattedValue;
        }
    }
}

// ============================================
// [SECTION: CRUD 작업]
// ============================================

async function viewCompany(keyValue) {
    try {
        const company = await companyCrud.read(keyValue);
        if (!company) {
            showToast('거래처 정보를 찾을 수 없습니다.', 'error');
            return;
        }
        
        // 상세 정보 모달 표시
        showCompanyDetailModal(company);
        
    } catch (error) {
        logger.error('[거래처 조회] 실패:', error);
        showToast('거래처 정보 조회 중 오류가 발생했습니다.', 'error');
    }
}

async function editCompany(keyValue) {
    try {
        const company = await companyCrud.read(keyValue);
        if (!company) {
            showToast('거래처 정보를 찾을 수 없습니다.', 'error');
            return;
        }
        
        // 수정 모달 표시
        showCompanyEditModal(company);
        
    } catch (error) {
        logger.error('[거래처 수정] 준비 실패:', error);
        showToast('거래처 수정 준비 중 오류가 발생했습니다.', 'error');
    }
}

async function deleteCompany(keyValue) {
    const confirmed = await showModal({
        type: 'confirm',
        title: '거래처 삭제',
        content: '정말로 이 거래처를 삭제하시겠습니까?',
        confirmText: '삭제',
        cancelText: '취소'
    });
    
    if (!confirmed) return;
    
    try {
        showLoading('거래처 삭제 중...');
        
        await companyCrud.delete(keyValue);
        
        // 목록 새로고침
        await loadCompanies();
        
        hideLoading();
        showToast('거래처가 삭제되었습니다.', 'success');
        
    } catch (error) {
        logger.error('[거래처 삭제] 실패:', error);
        hideLoading();
        showToast('거래처 삭제 중 오류가 발생했습니다.', 'error');
    }
}

// ============================================
// [SECTION: 모달 관련]
// ============================================

function showCompanyDetailModal(company) {
    const content = `
        <div class="company-detail">
            <div class="detail-group">
                <h4>기본 정보</h4>
                <div class="detail-item">
                    <label>거래처명:</label>
                    <span>${getCompanyDisplayName(company)}</span>
                </div>
                <div class="detail-item">
                    <label>대표자:</label>
                    <span>${company.ceoOrDentist || '-'}</span>
                </div>
                <div class="detail-item">
                    <label>연락처:</label>
                    <span>${company.contact || company.phoneNumber || '-'}</span>
                </div>
                <div class="detail-item">
                    <label>주소:</label>
                    <span>${company.address || company.detailedAddress || '-'}</span>
                </div>
            </div>
            
            <div class="detail-group">
                <h4>영업 정보</h4>
                <div class="detail-item">
                    <label>담당자:</label>
                    <span>${company.internalManager || '-'}</span>
                </div>
                <div class="detail-item">
                    <label>담당부서:</label>
                    <span>${company.department || '-'}</span>
                </div>
                <div class="detail-item">
                    <label>상태:</label>
                    <span>${getStatusBadge(company.businessStatus)}</span>
                </div>
                <div class="detail-item">
                    <label>누적매출:</label>
                    <span>${formatCurrency(company.accumulatedSales || 0)}</span>
                </div>
                <div class="detail-item">
                    <label>주요제품:</label>
                    <span>${company.salesProduct || '-'}</span>
                </div>
                <div class="detail-item">
                    <label>등록일:</label>
                    <span>${formatDate(company.createdAt)}</span>
                </div>
            </div>
        </div>
    `;
    
    showModal({
        title: '거래처 상세 정보',
        content,
        size: 'large',
        buttons: [{
            text: '닫기',
            type: 'primary'
        }]
    });
}

async function showCompanyEditModal(company) {
    // 제품 목록 가져오기
    let productsHtml = '';
    try {
        const productsResponse = await fetch(`${GlobalConfig.API_BASE_URL}/api/master/products`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        if (productsResponse.ok) {
            const productsData = await productsResponse.json();
            if (productsData.success) {
                productsHtml = productsData.products.map(product => 
                    `<option value="${product.productName}" ${company.salesProduct === product.productName ? 'selected' : ''}>${product.productName}</option>`
                ).join('');
            }
        }
    } catch (error) {
        logger.error('[제품 목록 로드 실패]', error);
    }
    
    const modalContent = `
        <div class="company-form">
            <div class="form-section">
                <h4>📝 기본 정보</h4>
                <div class="form-grid">
                    <div class="form-group">
                        <label class="required">거래처명</label>
                        <input type="text" id="modal-company-name" class="form-control" value="${getCompanyDisplayName(company)}" required>
                    </div>
                    <div class="form-group">
                        <label>거래처코드</label>
                        <input type="text" id="modal-company-code" class="form-control" value="${company.companyCode || ''}" readonly>
                    </div>
                    <div class="form-group">
                        <label class="required">대표자명</label>
                        <input type="text" id="modal-representative" class="form-control" value="${company.ceoOrDentist || ''}" required>
                    </div>
                    <div class="form-group">
                        <label>연락처</label>
                        <input type="tel" id="modal-contact" class="form-control" value="${company.contact || ''}">
                    </div>
                </div>
            </div>
            
            <div class="form-section">
                <h4>🏢 사업 정보</h4>
                <div class="form-grid">
                    <div class="form-group">
                        <label>사업현황</label>
                        <select id="modal-business-status" class="form-control">
                            <option value="활성" ${company.businessStatus === '활성' ? 'selected' : ''}>✅ 활성</option>
                            <option value="비활성" ${company.businessStatus === '비활성' ? 'selected' : ''}>⏸️ 비활성</option>
                            <option value="불용" ${company.businessStatus === '불용' ? 'selected' : ''}>❌ 불용</option>
                            <option value="추가확인" ${company.businessStatus === '추가확인' ? 'selected' : ''}>🔍 추가확인</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>주요제품</label>
                        <select id="modal-sales-product" class="form-control">
                            ${productsHtml}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>누적매출</label>
                        <input type="number" id="modal-accumulated-sales" class="form-control" value="${company.accumulatedSales || 0}">
                    </div>
                    <div class="form-group">
                        <label>누적수금</label>
                        <input type="number" id="modal-accumulated-collection" class="form-control" value="${company.accumulatedCollection || 0}">
                    </div>
                </div>
            </div>
            
            <div class="form-section">
                <h4>📍 상세 정보</h4>
                <div class="form-group full-width">
                    <label>주소</label>
                    <input type="text" id="modal-address" class="form-control" value="${company.address || ''}">
                </div>
                <div class="form-group full-width">
                    <label>비고</label>
                    <textarea id="modal-remarks" class="form-control" rows="3">${company.remarks || ''}</textarea>
                </div>
            </div>
        </div>
    `;
    
    const result = await showModal({
        title: '✏️ 거래처 정보 수정',
        content: modalContent,
        size: 'large',
        buttons: [
            {
                text: '취소',
                type: 'secondary',
                onClick: () => false
            },
            {
                text: '저장',
                type: 'primary',
                onClick: async () => {
                    // 필수 입력 검증
                    const companyName = document.getElementById('modal-company-name')?.value;
                    const representative = document.getElementById('modal-representative')?.value;
                    
                    if (!companyName || !representative) {
                        showToast('거래처명과 대표자명은 필수입니다.', 'warning');
                        return null;
                    }
                    
                    // 수정된 데이터 수집
                    const updatedData = {
                        ...company,
                        companyName: companyName,
                        ceoOrDentist: representative,
                        contact: document.getElementById('modal-contact')?.value || '',
                        address: document.getElementById('modal-address')?.value || '',
                        businessStatus: document.getElementById('modal-business-status')?.value || '활성',
                        salesProduct: document.getElementById('modal-sales-product')?.value || '',
                        accumulatedSales: parseInt(document.getElementById('modal-accumulated-sales')?.value) || 0,
                        accumulatedCollection: parseInt(document.getElementById('modal-accumulated-collection')?.value) || 0,
                        remarks: document.getElementById('modal-remarks')?.value || ''
                    };
                    
                    try {
                        showLoading('거래처 정보 수정 중...');
                        
                        // 거래처 업데이트
                        await companyCrud.update(company.keyValue, updatedData);
                        
                        hideLoading();
                        showToast('거래처 정보가 수정되었습니다.', 'success');
                        
                        // 목록 새로고침
                        await loadCompanies();
                        
                        return true;
                        
                    } catch (error) {
                        hideLoading();
                        logger.error('[거래처 수정 실패]', error);
                        showToast('거래처 수정 중 오류가 발생했습니다.', 'error');
                        return null;
                    }
                }
            }
        ]
    });
}

async function openCompanyModal() {
    // 지역 목록 가져오기
    let regionsHtml = '<option value="">선택하세요</option>';
    try {
        const regionsResponse = await fetch(`${GlobalConfig.API_BASE_URL}/api/master/regions`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });

        if (regionsResponse.ok) {
            const regionsData = await regionsResponse.json();
            if (regionsData.success) {
                regionsHtml += regionsData.regions.map(region =>
                    `<option value="${region.id}">${region.region_name}</option>`
                ).join('');
            }
        }
    } catch (error) {
        logger.error('[지역 목록 로드 실패]', error);
    }
    
    // 담당부서 목록 가져오기
    let departmentsHtml = '<option value="">선택하세요</option>';
    try {
        const departmentsResponse = await fetch(`${GlobalConfig.API_BASE_URL}/api/master/departments`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });

        if (departmentsResponse.ok) {
            const departmentsData = await departmentsResponse.json();
            if (departmentsData.success) {
                departmentsHtml += departmentsData.departments.map(dept =>
                    `<option value="${dept.department_name}">${dept.department_name}</option>`
                ).join('');
            }
        }
    } catch (error) {
        logger.error('[담당부서 목록 로드 실패]', error);
    }
    
    // 직원 목록 가져오기 (관리자 전용)
    let employeesHtml = '<option value="">선택하세요</option>';
    try {
        const employeesResponse = await fetch(`${GlobalConfig.API_BASE_URL}/api/employees`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });

        if (employeesResponse.ok) {
            const employeesData = await employeesResponse.json();
            if (employeesData.success) {
                employeesHtml += employeesData.employees.map(emp =>
                    `<option value="${emp.name}">${emp.name} (${emp.department || ''})</option>`
                ).join('');
            }
        }
    } catch (error) {
        logger.error('[직원 목록 로드 실패]', error);
    }
    
    const modalContent = `
        <div class="company-form">
            <div class="form-section">
                <h4>📝 기본 정보</h4>
                <div class="form-grid">
                    <div class="form-group">
                        <label class="required">최종거래처명</label>
                        <input type="text" id="modal-final-company-name" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label>사업자등록번호</label>
                        <input type="text" id="modal-business-registration-number" class="form-control" placeholder="000-00-00000">
                    </div>
                    <div class="form-group">
                        <label class="required">대표이사/치과의사</label>
                        <input type="text" id="modal-ceo-or-dentist" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label>전화번호</label>
                        <input type="tel" id="modal-phone-number" class="form-control" placeholder="02-0000-0000">
                    </div>
                </div>
            </div>

            <div class="form-section">
                <h4>🏢 거래 정보</h4>
                <div class="form-grid">
                    <div class="form-group">
                        <label>폐업여부</label>
                        <select id="modal-is-closed" class="form-control">
                            <option value="N">N (정상)</option>
                            <option value="Y">Y (폐업)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>고객사 지역</label>
                        <select id="modal-region-id" class="form-control">
                            ${regionsHtml}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>거래상태</label>
                        <select id="modal-business-status" class="form-control">
                            <option value="활성">✅ 활성</option>
                            <option value="비활성">⏸️ 비활성</option>
                            <option value="불용">❌ 불용</option>
                            <option value="추가확인">🔍 추가확인</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>담당부서</label>
                        <select id="modal-department" class="form-control">
                            ${departmentsHtml}
                        </select>
                    </div>
                </div>
            </div>

            <div class="form-section">
                <h4>💼 내부 정보</h4>
                <div class="form-grid">
                    <div class="form-group">
                        <label class="required">내부담당자</label>
                        <select id="modal-internal-manager" class="form-control" required>
                            ${employeesHtml}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>정철웅기여</label>
                        <select id="modal-jcw-contribution" class="form-control">
                            <option value="">선택하세요</option>
                            <option value="상">상</option>
                            <option value="중">중</option>
                            <option value="하">하</option>
                            <option value="관계없음">관계없음</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>회사기여도</label>
                        <select id="modal-company-contribution" class="form-control">
                            <option value="">선택하세요</option>
                            <option value="상">상</option>
                            <option value="중">중</option>
                            <option value="하">하</option>
                            <option value="관계없음">관계없음</option>
                        </select>
                    </div>
                </div>
            </div>

            <div class="form-section">
                <h4>📍 상세 정보</h4>
                <div class="form-group full-width">
                    <label>상세주소</label>
                    <input type="text" id="modal-detailed-address" class="form-control" placeholder="상세 주소를 입력하세요">
                </div>
                <div class="form-group full-width">
                    <label>소개경로</label>
                    <input type="text" id="modal-referral-source" class="form-control" placeholder="거래처 소개 경로를 입력하세요">
                </div>
            </div>
        </div>
        
        <style>
        .company-form { 
            padding: 20px; 
            width: 100%;
            max-width: 1400px;
            margin: 0 auto;
        }
        .form-section { 
            margin-bottom: 35px; 
        }
        .form-section h4 { 
            margin-bottom: 15px; 
            color: var(--primary-color);
            font-size: 16px;
        }
        .form-grid { 
            display: grid; 
            grid-template-columns: repeat(2, 1fr); 
            gap: 22px; 
        }
        .form-group { 
            display: flex; 
            flex-direction: column; 
        }
        .form-group.full-width { 
            grid-column: span 2; 
        }
        .form-group label { 
            margin-bottom: 8px; 
            font-size: 15px;
            color: #2c3e50;
            font-weight: 600;
        }
        .form-group label.required::after { 
            content: ' *'; 
            color: var(--danger-color); 
        }
        .form-control { 
            padding: 12px 16px;
            border: 1px solid var(--glass-border);
            border-radius: 6px;
            background: var(--glass-bg-white);
            font-size: 16px;
            color: #2c3e50;
            transition: all 0.3s ease;
        }
        .form-control:focus {
            outline: none;
            border-color: var(--primary-color);
            box-shadow: 0 0 0 3px rgba(74, 158, 255, 0.1);
        }
        .form-control::placeholder {
            color: #95a5a6;
        }
        </style>
    `;
    
    const result = await showModal({
        title: '🆕 새 거래처 등록',
        content: modalContent,
        size: 'xl',
        buttons: [
            {
                text: '취소',
                type: 'secondary',
                onClick: () => false
            },
            {
                text: '저장',
                type: 'primary',
                onClick: async () => {
                    // 필수 입력 검증
                    const finalCompanyName = document.getElementById('modal-final-company-name')?.value.trim();
                    const ceoOrDentist = document.getElementById('modal-ceo-or-dentist')?.value.trim();
                    const internalManager = document.getElementById('modal-internal-manager')?.value.trim();

                    if (!finalCompanyName || !ceoOrDentist || !internalManager) {
                        showToast('최종거래처명, 대표이사/치과의사, 내부담당자는 필수입니다.', 'warning');
                        return null; // 모달 유지
                    }

                    // 거래처 데이터 수집 (백엔드 컬럼명과 일치)
                    const companyData = {
                        finalCompanyName: finalCompanyName,
                        businessRegistrationNumber: document.getElementById('modal-business-registration-number')?.value.trim() || null,
                        ceoOrDentist: ceoOrDentist,
                        phoneNumber: document.getElementById('modal-phone-number')?.value.trim() || null,
                        isClosed: document.getElementById('modal-is-closed')?.value || 'N',
                        region_id: document.getElementById('modal-region-id')?.value || null,
                        businessStatus: document.getElementById('modal-business-status')?.value || '활성',
                        department: document.getElementById('modal-department')?.value || null,
                        internalManager: internalManager,
                        jcwContribution: document.getElementById('modal-jcw-contribution')?.value || null,
                        companyContribution: document.getElementById('modal-company-contribution')?.value || null,
                        detailedAddress: document.getElementById('modal-detailed-address')?.value.trim() || null,
                        referralSource: document.getElementById('modal-referral-source')?.value.trim() || null
                    };

                    try {
                        showLoading('거래처 등록 중...');

                        // 백엔드 API 호출
                        const response = await fetch(`${GlobalConfig.API_BASE_URL}/api/companies`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                            },
                            body: JSON.stringify(companyData)
                        });

                        hideLoading();

                        if (!response.ok) {
                            const errorData = await response.json();
                            throw new Error(errorData.message || '거래처 등록에 실패했습니다.');
                        }

                        const result = await response.json();
                        showToast('거래처가 성공적으로 등록되었습니다.', 'success');

                        // 목록 새로고침
                        await loadCompanies();

                        return true; // 모달 닫기

                    } catch (error) {
                        hideLoading();
                        logger.error('[거래처 등록 실패]', error);
                        showToast(error.message || '거래처 등록 중 오류가 발생했습니다.', 'error');
                        return null; // 모달 유지
                    }
                }
            }
        ]
    });
}

// 거래처 상세보기/수정 모달 (전체 20개 항목)
async function openCompanyDetailModal(keyValue) {
    try{
        showLoading('거래처 정보 로드 중...');

        // 거래처 정보 가져오기
        const companyResponse = await fetch(`${GlobalConfig.API_BASE_URL}/api/companies/${keyValue}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });

        if (!companyResponse.ok) {
            throw new Error('거래처 정보를 불러올 수 없습니다.');
        }

        const companyResult = await companyResponse.json();
        const company = companyResult.company;

        // 지역 목록 가져오기
        let regionsHtml = '<option value="">선택하세요</option>';
        try {
            const regionsResponse = await fetch(`${GlobalConfig.API_BASE_URL}/api/master/regions`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });

            if (regionsResponse.ok) {
                const regionsData = await regionsResponse.json();
                if (regionsData.success) {
                    regionsHtml += regionsData.regions.map(region =>
                        `<option value="${region.id}" ${region.id == company.region_id ? 'selected' : ''}>${region.region_name}</option>`
                    ).join('');
                }
            }
        } catch (error) {
            logger.error('[지역 목록 로드 실패]', error);
        }

        // 담당부서 목록 가져오기
        let departmentsHtml = '<option value="">선택하세요</option>';
        try {
            const departmentsResponse = await fetch(`${GlobalConfig.API_BASE_URL}/api/master/departments`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });

            if (departmentsResponse.ok) {
                const departmentsData = await departmentsResponse.json();
                if (departmentsData.success) {
                    departmentsHtml += departmentsData.departments.map(dept =>
                        `<option value="${dept.department_name}" ${dept.department_name === company.department ? 'selected' : ''}>${dept.department_name}</option>`
                    ).join('');
                }
            }
        } catch (error) {
            logger.error('[담당부서 목록 로드 실패]', error);
        }

        // 직원 목록 가져오기 (관리자 전용)
        let employeesHtml = '<option value="">선택하세요</option>';
        try {
            const employeesResponse = await fetch(`${GlobalConfig.API_BASE_URL}/api/employees`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });

            if (employeesResponse.ok) {
                const employeesData = await employeesResponse.json();
                if (employeesData.success) {
                    employeesHtml += employeesData.employees.map(emp =>
                        `<option value="${emp.name}" ${emp.name === company.internalManager ? 'selected' : ''}>${emp.name} (${emp.department || ''})</option>`
                    ).join('');
                }
            }
        } catch (error) {
            logger.error('[직원 목록 로드 실패]', error);
        }

        hideLoading();

        // 사용자 권한 체크
        const isAdmin = user.role === '관리자';
        const readonlyAttr = isAdmin ? '' : 'readonly';
        const disabledAttr = isAdmin ? '' : 'disabled';

        const modalContent = `
            <div class="company-form">
                ${!isAdmin ? '<div class="permission-warning">⚠️ 읽기 전용 모드입니다. 수정 권한이 없습니다.</div>' : ''}
                <div class="form-section">
                    <h4>📝 기본 정보</h4>
                    <div class="form-grid">
                        <div class="form-group">
                            <label class="required">최종거래처명</label>
                            <input type="text" id="modal-final-company-name" class="form-control" value="${company.finalCompanyName || ''}" ${readonlyAttr}>
                        </div>
                        <div class="form-group">
                            <label>사업자등록번호</label>
                            <input type="text" id="modal-business-registration-number" class="form-control" value="${company.businessRegistrationNumber || ''}" placeholder="000-00-00000" ${readonlyAttr}>
                        </div>
                        <div class="form-group">
                            <label class="required">대표이사/치과의사</label>
                            <input type="text" id="modal-ceo-or-dentist" class="form-control" value="${company.ceoOrDentist || ''}" required ${readonlyAttr}>
                        </div>
                        <div class="form-group">
                            <label>전화번호</label>
                            <input type="tel" id="modal-phone-number" class="form-control" value="${company.phoneNumber || ''}" placeholder="02-0000-0000" ${readonlyAttr}>
                        </div>
                    </div>
                </div>

                <div class="form-section">
                    <h4>🏢 거래 정보</h4>
                    <div class="form-grid">
                        <div class="form-group">
                            <label>폐업여부</label>
                            <select id="modal-is-closed" class="form-control" ${disabledAttr}>
                                <option value="N" ${company.isClosed === 'N' ? 'selected' : ''}>N (정상)</option>
                                <option value="Y" ${company.isClosed === 'Y' ? 'selected' : ''}>Y (폐업)</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>고객사 지역</label>
                            <select id="modal-region-id" class="form-control" ${disabledAttr}>
                                ${regionsHtml}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>거래상태</label>
                            <select id="modal-business-status" class="form-control" ${disabledAttr}>
                                <option value="활성" ${company.businessStatus === '활성' ? 'selected' : ''}>✅ 활성</option>
                                <option value="비활성" ${company.businessStatus === '비활성' ? 'selected' : ''}>⏸️ 비활성</option>
                                <option value="불용" ${company.businessStatus === '불용' ? 'selected' : ''}>❌ 불용</option>
                                <option value="추가확인" ${company.businessStatus === '추가확인' ? 'selected' : ''}>🔍 추가확인</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>담당부서</label>
                            <select id="modal-department" class="form-control" ${disabledAttr}>
                                ${departmentsHtml}
                            </select>
                        </div>
                    </div>
                </div>

                <div class="form-section">
                    <h4>💼 내부 정보</h4>
                    <div class="form-grid">
                        <div class="form-group">
                            <label class="required">내부담당자</label>
                            <select id="modal-internal-manager" class="form-control" required ${disabledAttr}>
                                ${employeesHtml}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>정철웅기여</label>
                            <select id="modal-jcw-contribution" class="form-control" ${disabledAttr}>
                                <option value="">선택하세요</option>
                                <option value="상" ${company.jcwContribution === '상' ? 'selected' : ''}>상</option>
                                <option value="중" ${company.jcwContribution === '중' ? 'selected' : ''}>중</option>
                                <option value="하" ${company.jcwContribution === '하' ? 'selected' : ''}>하</option>
                                <option value="관계없음" ${company.jcwContribution === '관계없음' ? 'selected' : ''}>관계없음</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>회사기여도</label>
                            <select id="modal-company-contribution" class="form-control" ${disabledAttr}>
                                <option value="">선택하세요</option>
                                <option value="상" ${company.companyContribution === '상' ? 'selected' : ''}>상</option>
                                <option value="중" ${company.companyContribution === '중' ? 'selected' : ''}>중</option>
                                <option value="하" ${company.companyContribution === '하' ? 'selected' : ''}>하</option>
                                <option value="관계없음" ${company.companyContribution === '관계없음' ? 'selected' : ''}>관계없음</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div class="form-section">
                    <h4>📊 자동생성 정보 (읽기 전용)</h4>
                    <div class="form-grid">
                        <div class="form-group">
                            <label>판매제품</label>
                            <input type="text" class="form-control readonly-bg" value="${company.salesProduct || '-'}" readonly>
                        </div>
                        <div class="form-group">
                            <label>마지막결제일</label>
                            <input type="text" class="form-control readonly-bg" value="${company.lastPaymentDate || '-'}" readonly>
                        </div>
                        <div class="form-group">
                            <label>마지막총결재금액</label>
                            <input type="text" class="form-control readonly-bg" value="${company.lastPaymentAmount ? formatCurrency(company.lastPaymentAmount, true) : '-'}" readonly>
                        </div>
                        <div class="form-group">
                            <label>누적수금금액</label>
                            <input type="text" class="form-control readonly-bg" value="${company.accumulatedCollection ? formatCurrency(company.accumulatedCollection, true) : '-'}" readonly>
                        </div>
                        <div class="form-group">
                            <label>누적매출금액</label>
                            <input type="text" class="form-control readonly-bg" value="${company.accumulatedSales ? formatCurrency(company.accumulatedSales, true) : '-'}" readonly>
                        </div>
                        <div class="form-group">
                            <label>매출채권잔액</label>
                            <input type="text" class="form-control readonly-bg" value="${company.accountsReceivable ? formatCurrency(company.accountsReceivable, true) : '-'}" readonly>
                        </div>
                        <div class="form-group full-width">
                            <label>영업활동</label>
                            <textarea class="form-control readonly-bg" rows="2" readonly>${company.activityNotes || '-'}</textarea>
                        </div>
                    </div>
                </div>

                <div class="form-section">
                    <h4>📍 상세 정보</h4>
                    <div class="form-group full-width">
                        <label>상세주소</label>
                        <input type="text" id="modal-detailed-address" class="form-control" value="${company.detailedAddress || ''}" placeholder="상세 주소를 입력하세요" ${readonlyAttr}>
                    </div>
                    <div class="form-group full-width">
                        <label>소개경로</label>
                        <input type="text" id="modal-referral-source" class="form-control" value="${company.referralSource || ''}" placeholder="거래처 소개 경로를 입력하세요" ${readonlyAttr}>
                    </div>
                </div>
            </div>

            <style>
            .company-form {
                padding: 20px;
                width: 100%;
                max-width: 1400px;
                margin: 0 auto;
            }
            .permission-warning {
                background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
                border: 2px solid #ffc107;
                border-radius: 8px;
                padding: 12px 16px;
                margin-bottom: 20px;
                color: #856404;
                font-weight: 600;
                text-align: center;
                font-size: 15px;
                box-shadow: 0 2px 8px rgba(255, 193, 7, 0.2);
            }
            .form-section {
                margin-bottom: 35px;
            }
            .form-section h4 {
                margin-bottom: 15px;
                color: var(--primary-color);
                font-size: 16px;
            }
            .form-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 22px;
            }
            .form-group {
                display: flex;
                flex-direction: column;
            }
            .form-group.full-width {
                grid-column: span 2;
            }
            .form-group label {
                margin-bottom: 8px;
                font-size: 15px;
                color: #2c3e50;
                font-weight: 600;
            }
            .form-group label.required::after {
                content: ' *';
                color: var(--danger-color);
            }
            .form-control {
                padding: 12px 16px;
                border: 1px solid var(--glass-border);
                border-radius: 6px;
                background: var(--glass-bg-white);
                font-size: 16px;
                color: #2c3e50;
                transition: all 0.3s ease;
            }
            .form-control:focus {
                outline: none;
                border-color: var(--primary-color);
                box-shadow: 0 0 0 3px rgba(74, 158, 255, 0.1);
            }
            .form-control::placeholder {
                color: #95a5a6;
            }
            .form-control[readonly] {
                background-color: #f8f9fa;
                color: #6c757d;
                cursor: not-allowed;
                border-color: #dee2e6;
            }
            .form-control[disabled] {
                background-color: #e9ecef;
                color: #6c757d;
                cursor: not-allowed;
                border-color: #dee2e6;
            }
            </style>
        `;

        const result = await showModal({
            title: '📋 거래처 상세정보',
            content: modalContent,
            size: 'xl',
            buttons: isAdmin ? [
                {
                    text: '취소',
                    type: 'secondary',
                    onClick: () => false
                },
                {
                    text: '삭제',
                    type: 'danger',
                    onClick: async () => {
                        // 삭제 확인 모달
                        const confirmed = await showModal({
                            title: '⚠️ 거래처 삭제',
                            content: `
                                <div style="padding: 20px; text-align: center;">
                                    <p style="font-size: 16px; margin-bottom: 15px;">
                                        <strong>${company.finalCompanyName}</strong> 거래처를 삭제하시겠습니까?
                                    </p>
                                    <p style="color: #dc3545; font-weight: 600;">
                                        ⚠️ 이 작업은 취소할 수 없습니다!
                                    </p>
                                </div>
                            `,
                            buttons: [
                                { text: '취소', type: 'secondary', onClick: () => false },
                                { text: '삭제', type: 'danger', onClick: () => true }
                            ]
                        });

                        if (!confirmed) return null; // 삭제 취소 시 상세 모달 유지

                        try {
                            showLoading('거래처 삭제 중...');

                            const response = await fetch(`${GlobalConfig.API_BASE_URL}/api/companies/${keyValue}`, {
                                method: 'DELETE',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                                }
                            });

                            hideLoading();

                            if (!response.ok) {
                                const errorData = await response.json();
                                throw new Error(errorData.message || '거래처 삭제에 실패했습니다.');
                            }

                            showToast('거래처가 성공적으로 삭제되었습니다.', 'success');

                            // 목록 새로고침
                            await loadCompanies();

                            return true; // 모달 닫기

                        } catch (error) {
                            hideLoading();
                            logger.error('[거래처 삭제 실패]', error);
                            showToast(error.message || '거래처 삭제 중 오류가 발생했습니다.', 'error');
                            return null; // 모달 유지
                        }
                    }
                },
                {
                    text: '저장',
                    type: 'primary',
                    onClick: async () => {
                        // 필수 입력 검증
                        const finalCompanyName = document.getElementById('modal-final-company-name')?.value.trim();
                        const ceoOrDentist = document.getElementById('modal-ceo-or-dentist')?.value.trim();
                        const internalManager = document.getElementById('modal-internal-manager')?.value.trim();

                        if (!finalCompanyName || !ceoOrDentist || !internalManager) {
                            showToast('최종거래처명, 대표이사/치과의사, 내부담당자는 필수입니다.', 'warning');
                            return null;
                        }

                        // 거래처 데이터 수집
                        const updatedData = {
                            finalCompanyName: finalCompanyName,
                            businessRegistrationNumber: document.getElementById('modal-business-registration-number')?.value.trim() || null,
                            ceoOrDentist: ceoOrDentist,
                            phoneNumber: document.getElementById('modal-phone-number')?.value.trim() || null,
                            isClosed: document.getElementById('modal-is-closed')?.value || 'N',
                            region_id: document.getElementById('modal-region-id')?.value || null,
                            businessStatus: document.getElementById('modal-business-status')?.value || '활성',
                            department: document.getElementById('modal-department')?.value || null,
                            internalManager: internalManager,
                            jcwContribution: document.getElementById('modal-jcw-contribution')?.value || null,
                            companyContribution: document.getElementById('modal-company-contribution')?.value || null,
                            detailedAddress: document.getElementById('modal-detailed-address')?.value.trim() || null,
                            referralSource: document.getElementById('modal-referral-source')?.value.trim() || null
                        };

                        try {
                            showLoading('거래처 정보 수정 중...');

                            // 백엔드 API 호출
                            const response = await fetch(`${GlobalConfig.API_BASE_URL}/api/companies/${keyValue}`, {
                                method: 'PUT',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                                },
                                body: JSON.stringify(updatedData)
                            });

                            hideLoading();

                            if (!response.ok) {
                                const errorData = await response.json();
                                throw new Error(errorData.message || '거래처 수정에 실패했습니다.');
                            }

                            showToast('거래처 정보가 성공적으로 수정되었습니다.', 'success');

                            // 목록 새로고침
                            await loadCompanies();

                            return true; // 모달 닫기

                        } catch (error) {
                            hideLoading();
                            logger.error('[거래처 수정 실패]', error);
                            showToast(error.message || '거래처 수정 중 오류가 발생했습니다.', 'error');
                            return null; // 모달 유지
                        }
                    }
                }
            ] : [
                {
                    text: '닫기',
                    type: 'secondary',
                    onClick: () => true
                }
            ]
        });

    } catch (error) {
        hideLoading();
        logger.error('[거래처 상세 로드 실패]', error);
        showToast('거래처 정보를 불러올 수 없습니다.', 'error');
    }
}

// ============================================
// [SECTION: 이벤트 리스너]
// ============================================

function setupEventListeners() {
    // 거래처 추가 버튼
    const addCompanyBtn = document.getElementById('add-company-btn');

    if (addCompanyBtn) {
        addCompanyBtn.addEventListener('click', () => {
            openCompanyModal();
        });
    } else {
        logger.warn('[거래처 추가 버튼] 요소를 찾을 수 없습니다!');
    }

    // 내부담당자 커스텀 드롭다운 토글
    const employeeDropdownButton = document.getElementById('employee-dropdown-button');
    const employeeDropdownMenu = document.getElementById('employee-dropdown-menu');

    if (employeeDropdownButton && employeeDropdownMenu) {
        employeeDropdownButton.addEventListener('click', (e) => {
            e.stopPropagation();
            employeeDropdownButton.classList.toggle('active');
            employeeDropdownMenu.classList.toggle('show');
        });

        // 드롭다운 외부 클릭 시 닫기
        document.addEventListener('click', (e) => {
            if (!employeeDropdownButton.contains(e.target) && !employeeDropdownMenu.contains(e.target)) {
                employeeDropdownButton.classList.remove('active');
                employeeDropdownMenu.classList.remove('show');
            }
        });
    }

    // 담당부서 커스텀 드롭다운 토글
    const departmentDropdownButton = document.getElementById('department-dropdown-button');
    const departmentDropdownMenu = document.getElementById('department-dropdown-menu');

    if (departmentDropdownButton && departmentDropdownMenu) {
        departmentDropdownButton.addEventListener('click', (e) => {
            e.stopPropagation();
            departmentDropdownButton.classList.toggle('active');
            departmentDropdownMenu.classList.toggle('show');
        });

        document.addEventListener('click', (e) => {
            if (!departmentDropdownButton.contains(e.target) && !departmentDropdownMenu.contains(e.target)) {
                departmentDropdownButton.classList.remove('active');
                departmentDropdownMenu.classList.remove('show');
            }
        });
    }

    // 거래상태 커스텀 드롭다운 토글
    const statusDropdownButton = document.getElementById('status-dropdown-button');
    const statusDropdownMenu = document.getElementById('status-dropdown-menu');

    if (statusDropdownButton && statusDropdownMenu) {
        statusDropdownButton.addEventListener('click', (e) => {
            e.stopPropagation();
            statusDropdownButton.classList.toggle('active');
            statusDropdownMenu.classList.toggle('show');
        });

        document.addEventListener('click', (e) => {
            if (!statusDropdownButton.contains(e.target) && !statusDropdownMenu.contains(e.target)) {
                statusDropdownButton.classList.remove('active');
                statusDropdownMenu.classList.remove('show');
            }
        });
    }

    // 판매제품 커스텀 드롭다운 토글
    const productDropdownButton = document.getElementById('product-dropdown-button');
    const productDropdownMenu = document.getElementById('product-dropdown-menu');

    if (productDropdownButton && productDropdownMenu) {
        productDropdownButton.addEventListener('click', (e) => {
            e.stopPropagation();
            productDropdownButton.classList.toggle('active');
            productDropdownMenu.classList.toggle('show');
        });

        document.addEventListener('click', (e) => {
            if (!productDropdownButton.contains(e.target) && !productDropdownMenu.contains(e.target)) {
                productDropdownButton.classList.remove('active');
                productDropdownMenu.classList.remove('show');
            }
        });
    }

    // 고객사 지역 커스텀 드롭다운 토글
    const regionDropdownButton = document.getElementById('region-dropdown-button');
    const regionDropdownMenu = document.getElementById('region-dropdown-menu');

    if (regionDropdownButton && regionDropdownMenu) {
        regionDropdownButton.addEventListener('click', (e) => {
            e.stopPropagation();
            regionDropdownButton.classList.toggle('active');
            regionDropdownMenu.classList.toggle('show');
        });

        document.addEventListener('click', (e) => {
            if (!regionDropdownButton.contains(e.target) && !regionDropdownMenu.contains(e.target)) {
                regionDropdownButton.classList.remove('active');
                regionDropdownMenu.classList.remove('show');
            }
        });
    }

    // 거래처명 자동완성은 AutocompleteManager가 자동 처리

    // 필터 버튼
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            currentFilter = btn.dataset.filter || 'all';
            loadCompanies();
        });
    });
    
    // 정렬 선택
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            currentSort = e.target.value;
            sortCompanies();
            renderCompanyTable();
        });
    }
    
    // 검색 (debounce 함수 사용)
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        const debouncedSearch = debounce((value) => {
            searchCompanies(value);
        }, 300);
        
        searchInput.addEventListener('input', (e) => {
            debouncedSearch(e.target.value);
        });
    }
    
    // 새로고침 버튼
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            loadCompanies();
        });
    }
}

// ============================================
// [SECTION: 검색 기능]
// ============================================

function searchCompanies(keyword) {
    if (!keyword) {
        loadCompanies();
        return;
    }
    
    const filtered = companyList.filter(company => {
        const searchText = keyword.toLowerCase();
        return (
            getCompanyDisplayName(company).toLowerCase().includes(searchText) ||
            company.ceoOrDentist?.toLowerCase().includes(searchText) ||
            company.internalManager?.toLowerCase().includes(searchText) ||
            company.department?.toLowerCase().includes(searchText) ||
            company.contact?.includes(searchText) ||
            company.phoneNumber?.includes(searchText) ||
            company.address?.toLowerCase().includes(searchText) ||
            company.detailedAddress?.toLowerCase().includes(searchText)
        );
    });
    
    companyList = filtered;
    renderCompanyTable();
    updateStatistics();
}

// ============================================
// [SECTION: 필터 기능]
// ============================================

/**
 * 필터 적용 (내부담당자, 담당부서, 거래상태, 판매제품, 고객사지역, 거래처명)
 */
function applyFilter() {
    // 배열 필터들은 이미 각 update 함수에서 업데이트됨:
    // - currentFilter.employee (updateEmployeeSelection)
    // - currentFilter.department (updateDepartmentSelection)
    // - currentFilter.status (updateStatusSelection)
    // - currentFilter.product (updateProductSelection)
    // - currentFilter.region (updateRegionSelection)

    // 거래처명만 단일 선택이므로 여기서 업데이트
    currentFilter.name = document.getElementById('filter-name')?.value || '';

    // 거래처 목록 재로드
    loadCompanies();
}

// ============================================
// [SECTION: 전역 함수 등록]
// ============================================

// HTML에서 사용할 함수들을 window 객체에 등록
if (typeof window !== 'undefined') {
    window.openCompanyModal = openCompanyModal;
    window.openCompanyDetailModal = openCompanyDetailModal;
    window.viewCompany = viewCompany;
    window.editCompany = editCompany;
    window.deleteCompany = deleteCompany;
    window.applyFilter = applyFilter;
    window.searchCompanies = searchCompanies;
    window.exportExcel = exportExcel;  // 03_download.js에서 import
    window.importExcel = importExcel;  // 03_download.js에서 import
}

// ============================================
// [SECTION: 페이지 로드 이벤트]
// ============================================

// 페이지 로드 이벤트 리스닝 (SPA 라우팅)
window.addEventListener('pageLoaded', (e) => {
    if (e.detail && e.detail.page === 'all-companies') {
        initAllCompanies();
    }
});

// 전역 함수로 노출 (HTML onclick 이벤트 및 다른 모듈에서 사용)
if (typeof window !== 'undefined') {
    window.allCompaniesModule = {
        initAllCompanies,
        loadCompanies,
        openCompanyModal,
        openCompanyDetailModal,
        viewCompany,
        editCompany,
        deleteCompany,
        searchCompanies,
        applyFilter
    };
}