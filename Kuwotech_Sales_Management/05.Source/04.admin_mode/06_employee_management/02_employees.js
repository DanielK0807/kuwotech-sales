// =====================================
// KUWOTECH 영업관리 시스템
// 직원 관리 페이지 JavaScript
// 작성일: 2025-01-27
// =====================================

// 공통 모듈 import
import { formatDate, formatPhone, formatDateKorean } from '../../01.common/03_format.js';
import { themeManager } from '../../01.common/11_theme_manager.js';
import Modal from '../../01.common/06_modal.js';
import { showToast } from '../../01.common/14_toast.js';
import { initGlassmorphism } from '../../01.common/07_design.js';
import { FIELD_LABELS } from '../../01.common/04_terms.js';
import { GlobalConfig } from '../../01.common/10_index.js';
import { initEmployeeDownloadButton, quickDownloadEmployees } from './03_employee_download.js';

// ===================
// 전역 변수
// ===================
let employees = [];          // 전체 직원 데이터
let filteredEmployees = [];  // 필터링된 직원 데이터
let currentPage = 1;         // 현재 페이지
const itemsPerPage = 10;     // 페이지당 항목 수
let selectedEmployees = new Set(); // 선택된 직원 ID들
let departments = [];        // 부서 목록 (API에서 로드)

// ===================
// 초기화 함수
// ===================
async function initializePage() {
    console.log('[직원 관리] 페이지 초기화 시작');

    try {
        // 부서 목록 로드 (API에서)
        await loadDepartments();

        // 직원 데이터 로드
        await loadEmployeeData();

        // 통계 업데이트
        updateStatistics();

        // 테이블 렌더링
        renderEmployeeTable();

        // 이벤트 리스너 설정
        setupEventListeners();

        // 다운로드 버튼 초기화
        initEmployeeDownloadButton();

        console.log('[직원 관리] 페이지 초기화 완료');
        showToast('직원 관리 페이지가 로드되었습니다', 'success');

    } catch (error) {
        console.error('[직원 관리] 초기화 오류:', error);
        showToast('페이지 초기화 중 오류가 발생했습니다', 'error');
    }
}

// ===================
// 부서 목록 로드 (API)
// ===================
async function loadDepartments() {
    try {
        const token = localStorage.getItem('authToken');
        console.log('[부서 목록] API 호출 시작, 토큰:', token ? '있음' : '없음');
        const response = await fetch(`${GlobalConfig.API_BASE_URL}/api/master/departments`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.warn('[부서 목록] API 응답 실패:', response.status, response.statusText);
            departments = []; // 빈 배열로 초기화하고 계속 진행
            return;
        }

        const data = await response.json();
        departments = data.departments || [];
        console.log('[부서 목록] 로드 성공:', departments.length, '개');

    } catch (error) {
        console.error('[부서 목록] 로드 오류:', error);
        departments = []; // 빈 배열로 초기화하고 계속 진행
        // 에러를 throw하지 않고 계속 진행
    }
}

// ===================
// 부서 선택 옵션 생성
// ===================
function generateDepartmentOptions(selectedDepartment = '') {
    let options = '<option value="">선택하세요</option>';
    
    departments.forEach(dept => {
        const selected = dept.department_name === selectedDepartment ? 'selected' : '';
        options += `<option value="${dept.department_name}" ${selected}>${dept.department_name}</option>`;
    });
    
    return options;
}

// ===================
// 직원 데이터 로드 (API)
// ===================
async function loadEmployeeData() {
    try {
        const token = localStorage.getItem('authToken');

        // 직원 데이터 로드
        console.log('[직원 데이터] API 호출 시작, 토큰:', token ? '있음' : '없음');
        const employeeResponse = await fetch(`${GlobalConfig.API_BASE_URL}/api/employees?limit=9999`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!employeeResponse.ok) {
            throw new Error('직원 데이터 로드 실패');
        }

        const employeeData = await employeeResponse.json();
        console.log('[직원 데이터] 응답:', employeeData);
        console.log('[직원 데이터] 응답 구조:', {
            success: employeeData.success,
            employeesCount: employeeData.employees?.length,
            firstEmployee: employeeData.employees?.[0]
        });
        console.log('[직원 데이터] 첫 번째 직원 상세:', JSON.stringify(employeeData.employees?.[0], null, 2));

        // API 응답 형식: {success: true, employees: [...]}
        const employeesArray = employeeData.employees || employeeData.data || [];

        if (employeeData.success && Array.isArray(employeesArray)) {
            employees = employeesArray.map(emp => ({
                id: emp.id,
                name: emp.name,
                email: emp.email || '',
                role1: emp.role1 || '',
                role2: emp.role2 || '',
                department: emp.department || '',
                joinDate: emp.hireDate || emp.joinDate || emp.created_at || '',
                phone: emp.phone || '',
                status: emp.status === 'active' || emp.status === '재직' ? 'active' : 'inactive',
                companyCount: 0  // 나중에 계산
            }));

            console.log('[직원 데이터] 로드 성공:', employees.length, '명');
            console.log('[직원 데이터] 매핑 후 샘플:', employees.slice(0, 2));

            // 담당 거래처 개수 계산
            await calculateCompanyCounts();

            filteredEmployees = [...employees];
        } else {
            throw new Error('직원 데이터 형식 오류');
        }

    } catch (error) {
        console.error('[직원 데이터 로드] 실패:', error);
        showToast('직원 데이터를 불러오지 못했습니다', 'error');

        // 빈 배열로 초기화
        employees = [];
        filteredEmployees = [];
    }
}

// ===================
// 담당 거래처 개수 계산
// ===================
async function calculateCompanyCounts() {
    try {
        const token = localStorage.getItem('authToken');

        console.log('[거래처 데이터] API 호출 시작');
        const companyResponse = await fetch(`${GlobalConfig.API_BASE_URL}/api/companies?limit=9999`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!companyResponse.ok) {
            throw new Error('거래처 데이터 로드 실패');
        }

        const companyData = await companyResponse.json();
        const companiesArray = companyData.companies || companyData.data || [];

        console.log('[거래처 데이터] 로드 성공:', companiesArray.length, '개');

        // 각 직원별 담당 거래처 개수 계산
        employees.forEach(emp => {
            emp.companyCount = companiesArray.filter(c =>
                c.internalManager === emp.name && c.businessStatus !== '불용'
            ).length;
        });

        console.log('[담당 거래처] 계산 완료');

    } catch (error) {
        console.error('[담당 거래처 계산] 실패:', error);
        // 실패해도 계속 진행 (companyCount = 0 유지)
    }
}

// ===================
// 통계 업데이트
// ===================
function updateStatistics() {
    console.log('[통계 업데이트] 시작 - 전체 직원 수:', employees.length);

    // 샘플 직원 데이터 출력 (처음 3명)
    if (employees.length > 0) {
        console.log('[통계 업데이트] 샘플 직원 데이터:', employees.slice(0, 3).map(emp => ({
            name: emp.name,
            role1: emp.role1,
            role2: emp.role2,
            department: emp.department,
            status: emp.status
        })));
    }

    const totalEmployees = employees.length;

    // role1 또는 role2에 '영업' 포함 여부 확인
    const salesEmployees = employees.filter(emp =>
        (emp.role1 && emp.role1.includes('영업')) ||
        (emp.role2 && emp.role2.includes('영업')) ||
        (emp.department && emp.department.includes('영업'))
    ).length;

    // role1 또는 role2가 '관리자'이거나 department에 '관리' 포함
    const adminEmployees = employees.filter(emp =>
        emp.role1 === '관리자' ||
        emp.role2 === '관리자' ||
        (emp.department && (emp.department.includes('관리') || emp.department === '경영지원팀'))
    ).length;

    const activeEmployees = employees.filter(emp => emp.status === 'active').length;

    console.log('[통계 업데이트] 결과:', {
        totalEmployees,
        salesEmployees,
        adminEmployees,
        activeEmployees
    });

    // 애니메이션으로 값 업데이트
    animateValue('totalEmployees', 0, totalEmployees, 500);
    animateValue('salesEmployees', 0, salesEmployees, 500);
    animateValue('adminEmployees', 0, adminEmployees, 500);
    animateValue('activeEmployees', 0, activeEmployees, 500);
}

// ===================
// 숫자 애니메이션
// ===================
function animateValue(elementId, start, end, duration) {
    const element = document.getElementById(elementId);

    // 엘리먼트가 없으면 조용히 종료
    if (!element) {
        console.warn(`[애니메이션] 엘리먼트를 찾을 수 없습니다: ${elementId}`);
        return;
    }

    // 값이 같으면 즉시 설정
    if (start === end) {
        element.textContent = end;
        return;
    }

    const range = end - start;
    const minTimer = 50;
    let stepTime = Math.abs(Math.floor(duration / range));
    stepTime = Math.max(stepTime, minTimer);
    const steps = Math.floor(duration / stepTime);
    const increment = range / steps;
    let current = start;

    const timer = setInterval(() => {
        current += increment;
        if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
            element.textContent = end;
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(current);
        }
    }, stepTime);
}

// ===================
// 직원 테이블 렌더링
// ===================
function renderEmployeeTable() {
    const tbody = document.getElementById('employeeTableBody');
    tbody.innerHTML = '';
    
    // 페이지네이션 계산
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageEmployees = filteredEmployees.slice(startIndex, endIndex);
    
    // 테이블 행 생성
    pageEmployees.forEach(employee => {
        const row = createEmployeeRow(employee);
        tbody.appendChild(row);
    });
    
    // 페이지 정보 업데이트
    updatePagination();
    
    // 선택 상태 업데이트
    updateBulkActionsVisibility();
}

// ===================
// 직원 행 생성
// ===================
function createEmployeeRow(employee) {
    const row = document.createElement('tr');
    const isChecked = selectedEmployees.has(employee.id);

    // 역할 표시 (role1과 role2 결합)
    const roles = [employee.role1, employee.role2].filter(r => r).join(', ') || '-';

    row.innerHTML = `
        <td>
            <input type="checkbox"
                   data-id="${employee.id}"
                   ${isChecked ? 'checked' : ''}
                   onchange="toggleEmployeeSelection('${employee.id}')">
        </td>
        <td>${employee.id ? employee.id.substring(0, 8) : '-'}</td>
        <td><strong>${employee.name}</strong></td>
        <td>${employee.department || '-'}</td>
        <td>${employee.joinDate ? formatDate(employee.joinDate) : '-'}</td>
        <td>${employee.phone ? formatPhone(employee.phone) : '-'}</td>
        <td style="font-size: 0.9rem;">${employee.email || '-'}</td>
        <td>
            <span class="company-count-badge" title="${employee.companyCount}개 거래처 담당">
                📦 ${employee.companyCount}개
            </span>
        </td>
        <td>
            <span class="status-badge status-${employee.status}">
                ${employee.status === 'active' ? '재직' : '퇴사'}
            </span>
        </td>
        <td>
            <div class="action-buttons">
                <button class="btn-icon" onclick="viewEmployee('${employee.id}')" title="상세보기">👁️</button>
                <button class="btn-icon" onclick="editEmployee('${employee.id}')" title="수정">✏️</button>
                ${employee.companyCount > 0 ?
                    `<button class="btn-icon" onclick="showTransferCompanies('${employee.id}')" title="거래처 이관">🔄</button>` :
                    ''}
                ${employee.status === 'active' ?
                    `<button class="btn-icon" onclick="handleRetirement('${employee.id}')" title="퇴사처리">👋</button>` :
                    `<button class="btn-icon" onclick="deleteEmployee('${employee.id}')" title="삭제">🗑️</button>`}
            </div>
        </td>
    `;

    return row;
}

// ===================
// 페이지네이션 업데이트
// ===================
function updatePagination() {
    const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
    const pageInfo = document.getElementById('pageInfo');
    pageInfo.textContent = `${currentPage} / ${totalPages}`;
}

// ===================
// 직원 추가
// ===================
window.showAddEmployee = function() {
    const modal = new Modal({
        size: 'lg',
        title: '신규 직원 추가',
        content: `
            <div class="modal-form">
                <div class="form-row">
                    <div class="form-group">
                        <label>이름 *</label>
                        <input type="text" id="newName" class="glass-input" placeholder="직원 이름">
                    </div>
                    <div class="form-group">
                        <label>이메일 *</label>
                        <input type="email" id="newEmail" class="glass-input" placeholder="email@kuwotech.com">
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>역할 *</label>
                        <select id="newRole" class="glass-input">
                            <option value="">선택하세요</option>
                            <option value="관리자">관리자</option>
                            <option value="영업담당">영업담당</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>부서 *</label>
                        <select id="newDepartment" class="glass-input">
                            ${generateDepartmentOptions()}
                        </select>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>전화번호 *</label>
                        <input type="tel" id="newPhone" class="glass-input" placeholder="010-0000-0000">
                    </div>
                    <div class="form-group">
                        <label>입사일</label>
                        <input type="date" id="newJoinDate" class="glass-input">
                    </div>
                </div>
            </div>
        `,
        buttons: [
            {
                text: '추가',
                className: 'glass-button primary',
                onClick: () => {
                    const newEmployee = {
                        id: 'EMP' + String(employees.length + 1).padStart(3, '0'),
                        name: document.getElementById('newName').value,
                        email: document.getElementById('newEmail').value,
                        role: document.getElementById('newRole').value,
                        department: document.getElementById('newDepartment').value,
                        phone: document.getElementById('newPhone').value.replace(/-/g, ''),
                        joinDate: document.getElementById('newJoinDate').value || new Date().toISOString().split('T')[0],
                        status: 'active'
                    };
                    
                    if (!newEmployee.name || !newEmployee.email || !newEmployee.role || !newEmployee.department) {
                        showToast('필수 항목을 모두 입력해주세요', 'warning');
                        return false;
                    }
                    
                    employees.push(newEmployee);
                    filteredEmployees = [...employees];
                    updateStatistics();
                    renderEmployeeTable();
                    showToast('직원이 추가되었습니다', 'success');
                    return true;
                }
            },
            {
                text: '취소',
                className: 'glass-button'
            }
        ]
    });
    
    modal.open();
};

// ===================
// 직원 상세 보기
// ===================
window.viewEmployee = function(id) {
    const employee = employees.find(emp => emp.id === id);
    if (!employee) return;
    
    const modal = new Modal({
        size: 'lg',
        title: '직원 상세 정보',
        content: `
            <div class="employee-detail" style="padding: 20px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                    <div>
                        <h3 style="margin-bottom: 15px;">기본 정보</h3>
                        <p><strong>ID:</strong> ${employee.id}</p>
                        <p><strong>이름:</strong> ${employee.name}</p>
                        <p><strong>이메일:</strong> ${employee.email}</p>
                        <p><strong>전화번호:</strong> ${formatPhone(employee.phone)}</p>
                    </div>
                    <div>
                        <h3 style="margin-bottom: 15px;">직무 정보</h3>
                        <p><strong>역할:</strong> ${employee.role}</p>
                        <p><strong>부서:</strong> ${employee.department}</p>
                        <p><strong>입사일:</strong> ${formatDateKorean(employee.joinDate)}</p>
                        <p><strong>상태:</strong> 
                            <span class="glass-badge ${employee.status === 'active' ? 'success' : 'warning'}">
                                ${employee.status === 'active' ? '활성' : '비활성'}
                            </span>
                        </p>
                    </div>
                </div>
                
                <div style="margin-top: 30px;">
                    <h3 style="margin-bottom: 15px;">활동 내역</h3>
                    <div class="glass-panel" style="padding: 15px;">
                        <p>• 최근 로그인: 2025-01-27 09:30:00</p>
                        <p>• 이번 달 실적: 15건 처리</p>
                        <p>• 관리 거래처: 8개사</p>
                    </div>
                </div>
            </div>
        `,
        buttons: [
            {
                text: '닫기',
                className: 'glass-button primary'
            }
        ]
    });
    
    modal.open();
};

// ===================
// 직원 수정
// ===================
window.editEmployee = function(id) {
    const employee = employees.find(emp => emp.id === id);
    if (!employee) return;
    
    const modal = new Modal({
        size: 'lg',
        title: '직원 정보 수정',
        content: `
            <div class="modal-form">
                <div class="form-row">
                    <div class="form-group">
                        <label>이름 *</label>
                        <input type="text" id="editName" class="glass-input" value="${employee.name}">
                    </div>
                    <div class="form-group">
                        <label>이메일 *</label>
                        <input type="email" id="editEmail" class="glass-input" value="${employee.email}">
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>역할 *</label>
                        <select id="editRole" class="glass-input">
                            <option value="관리자" ${employee.role === '관리자' ? 'selected' : ''}>관리자</option>
                            <option value="영업담당" ${employee.role === '영업담당' ? 'selected' : ''}>영업담당</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>부서 *</label>
                        <select id="editDepartment" class="glass-input">
                            ${generateDepartmentOptions(employee.department)}
                        </select>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>전화번호 *</label>
                        <input type="tel" id="editPhone" class="glass-input" value="${formatPhone(employee.phone)}">
                    </div>
                    <div class="form-group">
                        <label>상태</label>
                        <select id="editStatus" class="glass-input">
                            <option value="active" ${employee.status === 'active' ? 'selected' : ''}>활성</option>
                            <option value="inactive" ${employee.status === 'inactive' ? 'selected' : ''}>비활성</option>
                        </select>
                    </div>
                </div>
            </div>
        `,
        buttons: [
            {
                text: '저장',
                className: 'glass-button primary',
                onClick: () => {
                    employee.name = document.getElementById('editName').value;
                    employee.email = document.getElementById('editEmail').value;
                    employee.role = document.getElementById('editRole').value;
                    employee.department = document.getElementById('editDepartment').value;
                    employee.phone = document.getElementById('editPhone').value.replace(/-/g, '');
                    employee.status = document.getElementById('editStatus').value;
                    
                    updateStatistics();
                    renderEmployeeTable();
                    showToast('직원 정보가 수정되었습니다', 'success');
                    return true;
                }
            },
            {
                text: '취소',
                className: 'glass-button'
            }
        ]
    });
    
    modal.open();
};

// ===================
// 직원 삭제
// ===================
window.deleteEmployee = function(id) {
    const employee = employees.find(emp => emp.id === id);
    if (!employee) return;
    
    const modal = new Modal({
        size: 'md',
        title: '직원 삭제 확인',
        content: `
            <div style="padding: 20px; text-align: center;">
                <p style="margin-bottom: 20px;">
                    <strong>${employee.name}</strong> 직원을 삭제하시겠습니까?
                </p>
                <p style="color: #ef4444; font-size: 0.9rem;">
                    ⚠️ 이 작업은 되돌릴 수 없습니다.
                </p>
            </div>
        `,
        buttons: [
            {
                text: '삭제',
                className: 'glass-button danger',
                onClick: () => {
                    const index = employees.findIndex(emp => emp.id === id);
                    if (index > -1) {
                        employees.splice(index, 1);
                        filteredEmployees = [...employees];
                        updateStatistics();
                        renderEmployeeTable();
                        showToast(`${employee.name} 직원이 삭제되었습니다`, 'success');
                    }
                    return true;
                }
            },
            {
                text: '취소',
                className: 'glass-button'
            }
        ]
    });
    
    modal.open();
};

// ===================
// 검색 기능
// ===================
window.searchEmployees = function() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    
    if (searchTerm === '') {
        filteredEmployees = [...employees];
    } else {
        filteredEmployees = employees.filter(emp => 
            emp.name.toLowerCase().includes(searchTerm) ||
            emp.department.toLowerCase().includes(searchTerm) ||
            emp.role.toLowerCase().includes(searchTerm) ||
            emp.email.toLowerCase().includes(searchTerm)
        );
    }
    
    currentPage = 1;
    renderEmployeeTable();
    showToast(`검색 결과: ${filteredEmployees.length}명`, 'info');
};

// ===================
// 전체 선택/해제
// ===================
window.toggleSelectAll = function() {
    const selectAll = document.getElementById('selectAll');
    const checkboxes = document.querySelectorAll('#employeeTableBody input[type="checkbox"]');
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAll.checked;
        const id = checkbox.dataset.id;
        if (selectAll.checked) {
            selectedEmployees.add(id);
        } else {
            selectedEmployees.delete(id);
        }
    });
    
    updateBulkActionsVisibility();
};

// ===================
// 개별 직원 선택
// ===================
window.toggleEmployeeSelection = function(id) {
    if (selectedEmployees.has(id)) {
        selectedEmployees.delete(id);
    } else {
        selectedEmployees.add(id);
    }
    
    updateBulkActionsVisibility();
};

// ===================
// 일괄 작업 표시 업데이트
// ===================
function updateBulkActionsVisibility() {
    const bulkActions = document.getElementById('bulkActions');
    const selectedCount = document.getElementById('selectedCount');
    
    if (selectedEmployees.size > 0) {
        bulkActions.style.display = 'flex';
        selectedCount.textContent = `${selectedEmployees.size}개 선택됨`;
    } else {
        bulkActions.style.display = 'none';
    }
}

// ===================
// 일괄 활성화
// ===================
window.bulkActivate = function() {
    selectedEmployees.forEach(id => {
        const employee = employees.find(emp => emp.id === id);
        if (employee) {
            employee.status = 'active';
        }
    });
    
    selectedEmployees.clear();
    document.getElementById('selectAll').checked = false;
    updateStatistics();
    renderEmployeeTable();
    showToast('선택한 직원들이 활성화되었습니다', 'success');
};

// ===================
// 일괄 비활성화
// ===================
window.bulkDeactivate = function() {
    selectedEmployees.forEach(id => {
        const employee = employees.find(emp => emp.id === id);
        if (employee) {
            employee.status = 'inactive';
        }
    });
    
    selectedEmployees.clear();
    document.getElementById('selectAll').checked = false;
    updateStatistics();
    renderEmployeeTable();
    showToast('선택한 직원들이 비활성화되었습니다', 'warning');
};

// ===================
// 일괄 삭제
// ===================
window.bulkDelete = function() {
    const count = selectedEmployees.size;
    
    const modal = new Modal({
        size: 'md',
        title: '일괄 삭제 확인',
        content: `
            <div style="padding: 20px; text-align: center;">
                <p style="margin-bottom: 20px;">
                    선택한 <strong>${count}명</strong>의 직원을 삭제하시겠습니까?
                </p>
                <p style="color: #ef4444; font-size: 0.9rem;">
                    ⚠️ 이 작업은 되돌릴 수 없습니다.
                </p>
            </div>
        `,
        buttons: [
            {
                text: '삭제',
                className: 'glass-button danger',
                onClick: () => {
                    employees = employees.filter(emp => !selectedEmployees.has(emp.id));
                    filteredEmployees = [...employees];
                    selectedEmployees.clear();
                    document.getElementById('selectAll').checked = false;
                    updateStatistics();
                    renderEmployeeTable();
                    showToast(`${count}명의 직원이 삭제되었습니다`, 'success');
                    return true;
                }
            },
            {
                text: '취소',
                className: 'glass-button'
            }
        ]
    });
    
    modal.open();
};

// ===================
// 일괄 등록 (CSV Import)
// ===================
window.importEmployees = function() {
    const modal = new Modal({
        size: 'lg',
        title: '직원 일괄 등록',
        content: `
            <div style="padding: 20px;">
                <h3 style="margin-bottom: 15px; color: #FFFFFF; font-weight: 600; text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);">CSV 파일 업로드</h3>
                <p style="margin-bottom: 20px; color: #FFFFFF; font-size: 14px; text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);">
                    CSV 파일 형식: 이름, 이메일, 역할, 부서, 전화번호
                </p>

                <input type="file" id="csvFile" accept=".csv" class="glass-input" style="margin-bottom: 20px;">

                <div class="glass-panel" style="padding: 15px; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 8px;">
                    <h4 style="margin-bottom: 12px; color: #FFFFFF; font-weight: 600; text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);">예제 형식:</h4>
                    <pre style="font-size: 0.875rem; color: #FFFFFF; background: rgba(0, 0, 0, 0.3); padding: 12px; border-radius: 6px; line-height: 1.6; margin: 0;">이름,이메일,역할,부서,전화번호
홍길동,hong@kuwotech.com,관리자,경영지원팀,01012345678
김영희,kim@kuwotech.com,영업담당,영업1팀,01023456789</pre>
                </div>
            </div>
        `,
        buttons: [
            {
                text: '업로드',
                className: 'glass-button primary',
                onClick: () => {
                    const file = document.getElementById('csvFile').files[0];
                    if (!file) {
                        showToast('파일을 선택해주세요', 'warning');
                        return false;
                    }
                    
                    // 실제로는 파일을 파싱하여 처리해야 함
                    showToast('CSV 파일 업로드 기능은 준비 중입니다', 'info');
                    return true;
                }
            },
            {
                text: '취소',
                className: 'glass-button'
            }
        ]
    });
    
    modal.open();
};

// ===================
// 내보내기 - 통합 다운로드 매니저 사용
// ===================
// 레거시 exportEmployees 함수는 삭제됨 (03_employee_download.js의 exportExcel 사용)

// ===================
// 페이지 이동
// ===================
window.previousPage = function() {
    if (currentPage > 1) {
        currentPage--;
        renderEmployeeTable();
    }
};

window.nextPage = function() {
    const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        renderEmployeeTable();
    }
};

// ===================
// 이벤트 리스너 설정
// ===================
function setupEventListeners() {
    // 새로고침 버튼 이벤트
    const btnRefresh = document.getElementById('btnRefresh');
    if (btnRefresh) {
        btnRefresh.addEventListener('click', async () => {
            showToast('데이터를 새로고침하는 중...', 'info');
            await loadEmployeeData();
            updateStatistics();
            renderEmployeeTable();
            showToast('새로고침 완료', 'success');
        });
    }

    // ESC 키로 모달 닫기
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const modals = document.querySelectorAll('.modal-backdrop');
            modals.forEach(modal => modal.click());
        }
    });
}

// ===================
// 통합 다운로드 매니저 함수 등록
// ===================
window.exportEmployees = quickDownloadEmployees;

// ===================
// 거래처 이관 모달 표시
// ===================
window.showTransferCompanies = async function(employeeId) {
    const employee = employees.find(emp => emp.id === employeeId);
    if (!employee) return;

    // 거래처 목록 로드
    const companies = await loadEmployeeCompanies(employee.name);

    if (companies.length === 0) {
        showToast('이관할 거래처가 없습니다', 'warning');
        return;
    }

    const modal = new Modal({
        size: 'xl',
        title: `🔄 거래처 이관 - ${employee.name}`,
        content: `
            <div style="padding: 20px;">
                <div class="glass-panel" style="padding: 15px; margin-bottom: 20px; background: rgba(74, 158, 255, 0.1);">
                    <p style="margin: 0; font-size: 0.95rem;">
                        <strong>${employee.name}</strong>님이 담당하는 <strong>${companies.length}개</strong> 거래처를 이관합니다.
                    </p>
                </div>

                <div style="margin-bottom: 20px;">
                    <h4 style="margin-bottom: 10px;">이관 방식 선택</h4>
                    <div style="display: flex; gap: 15px;">
                        <label class="transfer-option" style="flex: 1; padding: 15px; border: 2px solid rgba(74, 158, 255, 0.3); border-radius: 8px; cursor: pointer;">
                            <input type="radio" name="transferMode" value="all" checked onchange="updateTransferMode()">
                            <div>
                                <strong>전체 일괄 이관</strong>
                                <p style="margin: 5px 0 0; font-size: 0.85rem; color: var(--text-secondary);">${companies.length}개 거래처 모두 이관</p>
                            </div>
                        </label>
                        <label class="transfer-option" style="flex: 1; padding: 15px; border: 2px solid rgba(74, 158, 255, 0.3); border-radius: 8px; cursor: pointer;">
                            <input type="radio" name="transferMode" value="selective" onchange="updateTransferMode()">
                            <div>
                                <strong>선택적 이관</strong>
                                <p style="margin: 5px 0 0; font-size: 0.85rem; color: var(--text-secondary);">거래처를 선택하여 이관</p>
                            </div>
                        </label>
                    </div>
                </div>

                <div id="selectiveSection" style="display: none; margin-bottom: 20px;">
                    <h4 style="margin-bottom: 10px;">이관할 거래처 선택 (<span id="selectedCompanyCount">0</span>/${companies.length}개)</h4>
                    <div style="max-height: 300px; overflow-y: auto; border: 1px solid var(--glass-border); border-radius: 8px; padding: 10px;">
                        ${companies.map(c => `
                            <label class="company-checkbox-item" style="display: flex; align-items: center; padding: 10px; margin-bottom: 5px; background: var(--glass-bg); border-radius: 6px; cursor: pointer;">
                                <input type="checkbox" class="company-checkbox" data-key="${c.keyValue}" onchange="updateSelectedCompanyCount()">
                                <div style="margin-left: 10px; flex: 1;">
                                    <strong>${c.finalCompanyName}</strong>
                                    <span style="margin-left: 10px; font-size: 0.85rem; color: var(--text-secondary);">
                                        ${c.businessStatus} | 매출: ${(c.accumulatedSales || 0).toLocaleString()}원
                                    </span>
                                </div>
                            </label>
                        `).join('')}
                    </div>
                </div>

                <div style="margin-bottom: 20px;">
                    <h4 style="margin-bottom: 10px;">이관 대상 직원</h4>
                    <select id="targetEmployee" class="glass-input" style="width: 100%;">
                        <option value="">직원을 선택하세요</option>
                        ${employees.filter(e => e.id !== employeeId && e.status === 'active').map(e => `
                            <option value="${e.name}">${e.name} (${e.department}) - 현재 ${e.companyCount}개 담당</option>
                        `).join('')}
                    </select>
                </div>

                <div id="transferSummary" class="glass-panel" style="padding: 15px; background: rgba(16, 185, 129, 0.1); display: none;">
                    <p style="margin: 0; font-size: 0.9rem; color: #10b981;">
                        ℹ️ <span id="summaryText"></span>
                    </p>
                </div>
            </div>
        `,
        buttons: [
            {
                text: '이관 실행',
                className: 'glass-button primary',
                onClick: async () => {
                    const targetName = document.getElementById('targetEmployee').value;
                    if (!targetName) {
                        showToast('이관 대상 직원을 선택해주세요', 'warning');
                        return false;
                    }

                    const mode = document.querySelector('input[name="transferMode"]:checked').value;
                    let companiesToTransfer = [];

                    if (mode === 'all') {
                        companiesToTransfer = companies.map(c => c.keyValue);
                    } else {
                        const checkboxes = document.querySelectorAll('.company-checkbox:checked');
                        companiesToTransfer = Array.from(checkboxes).map(cb => cb.dataset.key);

                        if (companiesToTransfer.length === 0) {
                            showToast('이관할 거래처를 선택해주세요', 'warning');
                            return false;
                        }
                    }

                    // 거래처 이관 API 호출
                    const success = await transferCompaniesAPI(companiesToTransfer, targetName);

                    if (success) {
                        showToast(`${companiesToTransfer.length}개 거래처가 ${targetName}님에게 이관되었습니다`, 'success');
                        await loadEmployeeData();
                        updateStatistics();
                        renderEmployeeTable();
                        return true;
                    }

                    return false;
                }
            },
            {
                text: '취소',
                className: 'glass-button'
            }
        ]
    });

    modal.open();

    // 모달 열린 후 이벤트 리스너 설정
    setTimeout(() => {
        const targetSelect = document.getElementById('targetEmployee');
        targetSelect?.addEventListener('change', updateTransferSummary);
    }, 100);
};

// ===================
// 이관 모드 변경
// ===================
window.updateTransferMode = function() {
    const mode = document.querySelector('input[name="transferMode"]:checked').value;
    const selectiveSection = document.getElementById('selectiveSection');

    if (mode === 'selective') {
        selectiveSection.style.display = 'block';
    } else {
        selectiveSection.style.display = 'none';
    }

    updateTransferSummary();
};

// ===================
// 선택된 거래처 수 업데이트
// ===================
window.updateSelectedCompanyCount = function() {
    const checkboxes = document.querySelectorAll('.company-checkbox:checked');
    document.getElementById('selectedCompanyCount').textContent = checkboxes.length;
    updateTransferSummary();
};

// ===================
// 이관 요약 업데이트
// ===================
function updateTransferSummary() {
    const targetName = document.getElementById('targetEmployee')?.value;
    const mode = document.querySelector('input[name="transferMode"]:checked')?.value;
    const summary = document.getElementById('transferSummary');
    const summaryText = document.getElementById('summaryText');

    if (!targetName || !summary || !summaryText) return;

    let count = 0;
    if (mode === 'all') {
        const allCompanies = document.querySelectorAll('.company-checkbox');
        count = allCompanies.length;
    } else {
        const selected = document.querySelectorAll('.company-checkbox:checked');
        count = selected.length;
    }

    if (count > 0) {
        summary.style.display = 'block';
        summaryText.textContent = `${targetName}님에게 ${count}개 거래처가 이관됩니다.`;
    } else {
        summary.style.display = 'none';
    }
}

// ===================
// 직원의 담당 거래처 로드
// ===================
async function loadEmployeeCompanies(employeeName) {
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${GlobalConfig.API_BASE_URL}/api/companies?limit=9999`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error('거래처 로드 실패');

        const data = await response.json();
        const companies = data.companies || data.data || [];

        return companies.filter(c =>
            c.internalManager === employeeName && c.businessStatus !== '불용'
        );

    } catch (error) {
        console.error('[거래처 로드] 실패:', error);
        return [];
    }
}

// ===================
// 거래처 이관 API 호출
// ===================
async function transferCompaniesAPI(companyKeys, targetName) {
    try {
        const token = localStorage.getItem('authToken');

        // 각 거래처를 순차적으로 업데이트
        for (const keyValue of companyKeys) {
            const response = await fetch(`${GlobalConfig.API_BASE_URL}/api/companies/${keyValue}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    internalManager: targetName
                })
            });

            if (!response.ok) {
                console.error(`[거래처 이관] 실패: ${keyValue}`);
            }
        }

        console.log(`[거래처 이관] 완료: ${companyKeys.length}개`);
        return true;

    } catch (error) {
        console.error('[거래처 이관 API] 실패:', error);
        showToast('거래처 이관 중 오류가 발생했습니다', 'error');
        return false;
    }
}

// ===================
// 퇴사 처리 워크플로우
// ===================
window.handleRetirement = async function(employeeId) {
    const employee = employees.find(emp => emp.id === employeeId);
    if (!employee) return;

    // 담당 거래처가 있는 경우 이관 먼저 처리
    if (employee.companyCount > 0) {
        const modal = new Modal({
            size: 'md',
            title: '👋 퇴사 처리',
            content: `
                <div style="padding: 20px; text-align: center;">
                    <div class="glass-panel" style="padding: 20px; margin-bottom: 20px; background: rgba(245, 158, 11, 0.1);">
                        <h3 style="margin: 0 0 10px; color: #f59e0b;">⚠️ 거래처 이관 필요</h3>
                        <p style="margin: 0; font-size: 0.95rem;">
                            <strong>${employee.name}</strong>님이 담당하는 <strong>${employee.companyCount}개</strong> 거래처를<br/>
                            먼저 다른 직원에게 이관해야 합니다.
                        </p>
                    </div>
                    <p style="margin: 20px 0; color: var(--text-secondary);">
                        거래처 이관 화면으로 이동하시겠습니까?
                    </p>
                </div>
            `,
            buttons: [
                {
                    text: '거래처 이관하기',
                    className: 'glass-button primary',
                    onClick: () => {
                        showTransferCompanies(employeeId);
                        return true;
                    }
                },
                {
                    text: '취소',
                    className: 'glass-button'
                }
            ]
        });

        modal.open();
    } else {
        // 담당 거래처가 없는 경우 바로 퇴사 처리
        confirmRetirement(employee);
    }
};

// ===================
// 퇴사 확인
// ===================
function confirmRetirement(employee) {
    const modal = new Modal({
        size: 'md',
        title: '👋 퇴사 처리 확인',
        content: `
            <div style="padding: 20px; text-align: center;">
                <p style="margin-bottom: 20px; font-size: 1.1rem;">
                    <strong>${employee.name}</strong>님을 퇴사 처리하시겠습니까?
                </p>
                <div class="glass-panel" style="padding: 15px; text-align: left; background: var(--glass-bg);">
                    <p style="margin: 5px 0;"><strong>부서:</strong> ${employee.department}</p>
                    <p style="margin: 5px 0;"><strong>입사일:</strong> ${formatDateKorean(employee.joinDate)}</p>
                    <p style="margin: 5px 0;"><strong>담당 거래처:</strong> ${employee.companyCount}개</p>
                </div>
                <p style="margin-top: 20px; color: var(--text-secondary); font-size: 0.9rem;">
                    퇴사 처리 후에도 데이터는 보관되며, 상태만 '퇴사'로 변경됩니다.
                </p>
            </div>
        `,
        buttons: [
            {
                text: '퇴사 처리',
                className: 'glass-button danger',
                onClick: async () => {
                    const success = await updateEmployeeStatus(employee.id, 'inactive');
                    if (success) {
                        showToast(`${employee.name}님이 퇴사 처리되었습니다`, 'success');
                        await loadEmployeeData();
                        updateStatistics();
                        renderEmployeeTable();
                        return true;
                    }
                    return false;
                }
            },
            {
                text: '취소',
                className: 'glass-button'
            }
        ]
    });

    modal.open();
}

// ===================
// 직원 상태 업데이트 API
// ===================
async function updateEmployeeStatus(employeeId, status) {
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${GlobalConfig.API_BASE_URL}/api/employees/${employeeId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status })
        });

        if (!response.ok) throw new Error('상태 업데이트 실패');

        return true;

    } catch (error) {
        console.error('[직원 상태 업데이트] 실패:', error);
        showToast('상태 업데이트 중 오류가 발생했습니다', 'error');
        return false;
    }
}

// ===================
// 페이지 로드 시 초기화
// ===================
if (document.readyState === 'loading') {
    // DOM이 아직 로드 중이면 이벤트 리스너 등록
    console.log('[직원 관리] DOM loading, adding event listener');
    document.addEventListener('DOMContentLoaded', initializePage);
} else {
    // DOM이 이미 로드된 경우 약간의 지연 후 실행
    console.log('[직원 관리] DOM already loaded, executing with delay');
    setTimeout(initializePage, 100);
}