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

// ============================================
// [SECTION: 전역 변수]
// ============================================

const user = JSON.parse(sessionStorage.getItem('user') || '{}');
let companyList = [];
let currentFilter = {
    employee: '',
    department: '',
    status: '',
    product: '',
    region: '',
    name: ''
};
let currentSort = 'name';

// ============================================
// [SECTION: 초기화]
// ============================================

async function initAllCompanies() {
    try {
        console.log('[전체거래처] 초기화 시작');
        console.log('[전체거래처] DOM 상태:', document.readyState);
        
        showLoading('거래처 데이터를 불러오는 중...');
        
        // DOM 요소 확인 후 이벤트 리스너 설정
        await waitForDOMReady();
        setupEventListeners();
        
        // 마스터 데이터 로드 (제품, 지역, 담당자, 부서)
        await loadMasterData();
        
        // 거래처 목록 로드
        await loadCompanies();
        
        // 다운로드 버튼 초기화
        initDownloadButton();
        
        hideLoading();
        console.log('[전체거래처] 초기화 완료');
        
    } catch (error) {
        console.error('[전체거래처] 초기화 실패:', error);
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
        console.log('[마스터데이터] 로드 시작');
        
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
                console.log('[제품] 로드 성공:', productsData.products.length, '개');
            }
        }
        
        // 2. 지역 목록 로드
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
                console.log('[지역] 로드 성공:', regionsData.regions.length, '개');
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
                console.log('[담당부서] 로드 성공:', departmentsData.departments.length, '개');
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
                console.log('[직원] 로드 성공:', employeesData.employees.length, '개');
            }
        }
        
    } catch (error) {
        console.error('[마스터데이터] 로드 실패:', error);
        // 에러가 발생해도 계속 진행
    }
}

/**
 * 제품 select 옵션 채우기
 */
function populateProductSelect(products) {
    const filterProductSelect = document.getElementById('filter-product');
    if (!filterProductSelect) return;

    // "전체" 옵션을 제외하고 기존 옵션 모두 제거
    while (filterProductSelect.options.length > 1) {
        filterProductSelect.remove(1);
    }

    // 제품 옵션 추가
    products.forEach(product => {
        const option = document.createElement('option');
        option.value = product.productName;
        option.textContent = product.productName;
        filterProductSelect.appendChild(option);
    });
}

/**
 * 지역 select 옵션 채우기
 */
function populateRegionSelect(regions) {
    const filterRegionSelect = document.getElementById('filter-region');
    if (!filterRegionSelect) return;

    // "전체" 옵션을 제외하고 기존 옵션 모두 제거
    while (filterRegionSelect.options.length > 1) {
        filterRegionSelect.remove(1);
    }

    // 지역 옵션 추가
    regions.forEach(region => {
        const option = document.createElement('option');
        option.value = region.region_name;
        option.textContent = region.region_name;
        filterRegionSelect.appendChild(option);
    });
}

/**
 * 담당부서 select 옵션 채우기
 */
function populateDepartmentSelect(departments) {
    const filterDepartmentSelect = document.getElementById('filter-department');
    if (!filterDepartmentSelect) return;

    // "전체" 옵션을 제외하고 기존 옵션 모두 제거
    while (filterDepartmentSelect.options.length > 1) {
        filterDepartmentSelect.remove(1);
    }

    // 부서 옵션 추가
    departments.forEach(dept => {
        const option = document.createElement('option');
        option.value = dept.department_name;
        option.textContent = dept.department_name;
        filterDepartmentSelect.appendChild(option);
    });
}

/**
 * 직원 select 옵션 채우기
 */
function populateEmployeeSelect(employees) {
    const filterEmployeeSelect = document.getElementById('filter-employee');
    if (!filterEmployeeSelect) return;

    // "전체" 옵션을 제외하고 기존 옵션 모두 제거
    while (filterEmployeeSelect.options.length > 1) {
        filterEmployeeSelect.remove(1);
    }

    // 직원 옵션 추가
    employees.forEach(emp => {
        const option = document.createElement('option');
        option.value = emp.name;
        option.textContent = `${emp.name} (${emp.department || ''})`;
        filterEmployeeSelect.appendChild(option);
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

        console.log('[API 호출]', apiUrl);

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
        companyList = data.companies || [];
        
        // 필터 적용
        if (currentFilter.employee) {
            companyList = companyList.filter(c => c.internalManager === currentFilter.employee);
        }
        
        if (currentFilter.department) {
            companyList = companyList.filter(c => c.department === currentFilter.department);
        }
        
        if (currentFilter.status) {
            companyList = companyList.filter(c => c.businessStatus === currentFilter.status);
        }
        
        if (currentFilter.product) {
            companyList = companyList.filter(c => c.salesProduct === currentFilter.product);
        }
        
        if (currentFilter.region) {
            companyList = companyList.filter(c => c.customerRegion === currentFilter.region);
        }
        
        if (currentFilter.name) {
            const keyword = currentFilter.name.toLowerCase();
            companyList = companyList.filter(c =>
                getCompanyDisplayName(c).toLowerCase().includes(keyword)
            );
        }
        
        // 정렬
        sortCompanies();
        
        // 테이블 렌더링
        renderCompanyTable();
        
        // 통계 업데이트
        updateStatistics();
        
        hideLoading();
        
        console.log('[거래처 로드 성공]', companyList.length, '개');
        
    } catch (error) {
        console.error('[거래처 로드 실패]', error);
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
    
    console.log('[updateStatistics] 통계 업데이트:', {
        totalCount,
        totalSales,
        totalCollection,
        totalReceivable,
        sampleData: companyList.slice(0, 2).map(c => ({
            name: getCompanyDisplayName(c),
            sales: c.accumulatedSales,
            collection: c.accumulatedCollection
        }))
    });
    
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
        console.error('[거래처 조회] 실패:', error);
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
        console.error('[거래처 수정] 준비 실패:', error);
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
        console.error('[거래처 삭제] 실패:', error);
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
        console.error('[제품 목록 로드 실패]', error);
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
                        console.error('[거래처 수정 실패]', error);
                        showToast('거래처 수정 중 오류가 발생했습니다.', 'error');
                        return null;
                    }
                }
            }
        ]
    });
}

async function openCompanyModal() {
    console.log('[거래처 추가] openCompanyModal 함수 호출됨');

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
        console.error('[지역 목록 로드 실패]', error);
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
        console.error('[담당부서 목록 로드 실패]', error);
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
        console.error('[직원 목록 로드 실패]', error);
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
                        console.error('[거래처 등록 실패]', error);
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
    console.log('[거래처 상세] 함수 호출됨, keyValue:', keyValue);

    try {
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
            console.error('[지역 목록 로드 실패]', error);
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
            console.error('[담당부서 목록 로드 실패]', error);
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
            console.error('[직원 목록 로드 실패]', error);
        }

        hideLoading();

        const modalContent = `
            <div class="company-form">
                <div class="form-section">
                    <h4>📝 기본 정보</h4>
                    <div class="form-grid">
                        <div class="form-group">
                            <label class="required">최종거래처명</label>
                            <input type="text" id="modal-final-company-name" class="form-control" value="${company.finalCompanyName || ''}">
                        </div>
                        <div class="form-group">
                            <label>사업자등록번호</label>
                            <input type="text" id="modal-business-registration-number" class="form-control" value="${company.businessRegistrationNumber || ''}" placeholder="000-00-00000">
                        </div>
                        <div class="form-group">
                            <label class="required">대표이사/치과의사</label>
                            <input type="text" id="modal-ceo-or-dentist" class="form-control" value="${company.ceoOrDentist || ''}" required>
                        </div>
                        <div class="form-group">
                            <label>전화번호</label>
                            <input type="tel" id="modal-phone-number" class="form-control" value="${company.phoneNumber || ''}" placeholder="02-0000-0000">
                        </div>
                    </div>
                </div>

                <div class="form-section">
                    <h4>🏢 거래 정보</h4>
                    <div class="form-grid">
                        <div class="form-group">
                            <label>폐업여부</label>
                            <select id="modal-is-closed" class="form-control">
                                <option value="N" ${company.isClosed === 'N' ? 'selected' : ''}>N (정상)</option>
                                <option value="Y" ${company.isClosed === 'Y' ? 'selected' : ''}>Y (폐업)</option>
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
                                <option value="활성" ${company.businessStatus === '활성' ? 'selected' : ''}>✅ 활성</option>
                                <option value="비활성" ${company.businessStatus === '비활성' ? 'selected' : ''}>⏸️ 비활성</option>
                                <option value="불용" ${company.businessStatus === '불용' ? 'selected' : ''}>❌ 불용</option>
                                <option value="추가확인" ${company.businessStatus === '추가확인' ? 'selected' : ''}>🔍 추가확인</option>
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
                                <option value="상" ${company.jcwContribution === '상' ? 'selected' : ''}>상</option>
                                <option value="중" ${company.jcwContribution === '중' ? 'selected' : ''}>중</option>
                                <option value="하" ${company.jcwContribution === '하' ? 'selected' : ''}>하</option>
                                <option value="관계없음" ${company.jcwContribution === '관계없음' ? 'selected' : ''}>관계없음</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>회사기여도</label>
                            <select id="modal-company-contribution" class="form-control">
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
                            <input type="text" class="form-control" value="${company.salesProduct || '-'}" readonly style="background-color: #f5f5f5;">
                        </div>
                        <div class="form-group">
                            <label>마지막결제일</label>
                            <input type="text" class="form-control" value="${company.lastPaymentDate || '-'}" readonly style="background-color: #f5f5f5;">
                        </div>
                        <div class="form-group">
                            <label>마지막총결재금액</label>
                            <input type="text" class="form-control" value="${company.lastPaymentAmount ? formatCurrency(company.lastPaymentAmount, true) : '-'}" readonly style="background-color: #f5f5f5;">
                        </div>
                        <div class="form-group">
                            <label>누적수금금액</label>
                            <input type="text" class="form-control" value="${company.accumulatedCollection ? formatCurrency(company.accumulatedCollection, true) : '-'}" readonly style="background-color: #f5f5f5;">
                        </div>
                        <div class="form-group">
                            <label>누적매출금액</label>
                            <input type="text" class="form-control" value="${company.accumulatedSales ? formatCurrency(company.accumulatedSales, true) : '-'}" readonly style="background-color: #f5f5f5;">
                        </div>
                        <div class="form-group">
                            <label>매출채권잔액</label>
                            <input type="text" class="form-control" value="${company.accountsReceivable ? formatCurrency(company.accountsReceivable, true) : '-'}" readonly style="background-color: #f5f5f5;">
                        </div>
                        <div class="form-group full-width">
                            <label>영업활동</label>
                            <textarea class="form-control" rows="2" readonly style="background-color: #f5f5f5;">${company.activityNotes || '-'}</textarea>
                        </div>
                    </div>
                </div>

                <div class="form-section">
                    <h4>📍 상세 정보</h4>
                    <div class="form-group full-width">
                        <label>상세주소</label>
                        <input type="text" id="modal-detailed-address" class="form-control" value="${company.detailedAddress || ''}" placeholder="상세 주소를 입력하세요">
                    </div>
                    <div class="form-group full-width">
                        <label>소개경로</label>
                        <input type="text" id="modal-referral-source" class="form-control" value="${company.referralSource || ''}" placeholder="거래처 소개 경로를 입력하세요">
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
            title: `📋 거래처 상세정보 - ${company.finalCompanyName}`,
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
                            console.error('[거래처 수정 실패]', error);
                            showToast(error.message || '거래처 수정 중 오류가 발생했습니다.', 'error');
                            return null; // 모달 유지
                        }
                    }
                }
            ]
        });

    } catch (error) {
        hideLoading();
        console.error('[거래처 상세 로드 실패]', error);
        showToast('거래처 정보를 불러올 수 없습니다.', 'error');
    }
}

// ============================================
// [SECTION: 이벤트 리스너]
// ============================================

function setupEventListeners() {
    console.log('[이벤트 리스너] 설정 시작');
    
    // 거래처 추가 버튼
    const addCompanyBtn = document.getElementById('add-company-btn');
    console.log('[이벤트 리스너] add-company-btn 요소:', addCompanyBtn);
    
    if (addCompanyBtn) {
        addCompanyBtn.addEventListener('click', () => {
            console.log('[거래처 추가] 버튼 클릭됨');
            openCompanyModal();
        });
        console.log('[거래처 추가 버튼] 이벤트 리스너 등록 완료');
    } else {
        console.warn('[거래처 추가 버튼] 요소를 찾을 수 없습니다!');
    }
    
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
 * 필터 적용 (내부담당자, 담당부서 포함)
 */
function applyFilter() {
    // 필터 값 수집
    currentFilter = {
        employee: document.getElementById('filter-employee')?.value || '',
        department: document.getElementById('filter-department')?.value || '',
        name: document.getElementById('filter-name')?.value || '',
        status: document.getElementById('filter-status')?.value || '',
        product: document.getElementById('filter-product')?.value || '',
        region: document.getElementById('filter-region')?.value || ''
    };
    
    console.log('[필터 적용]', currentFilter);
    
    // 거래처 목록 재로드
    loadCompanies();
}

// ============================================
// [SECTION: 전역 함수 등록]
// ============================================

// HTML에서 사용할 함수들을 window 객체에 등록
if (typeof window !== 'undefined') {
    console.log('[전역 함수] window 객체에 등록 시작');
    
    window.openCompanyModal = openCompanyModal;
    window.openCompanyDetailModal = openCompanyDetailModal;
    window.viewCompany = viewCompany;
    window.editCompany = editCompany;
    window.deleteCompany = deleteCompany;
    window.applyFilter = applyFilter;
    window.searchCompanies = searchCompanies;
    window.exportExcel = exportExcel;  // 03_download.js에서 import
    window.importExcel = importExcel;  // 03_download.js에서 import
    
    console.log('[전역 함수] 등록 완료 - openCompanyModal:', typeof window.openCompanyModal);
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
    
    console.log('[전체거래처관리] 모듈 함수 전역 등록 완료');
}