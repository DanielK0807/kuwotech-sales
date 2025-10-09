/**
 * KUWOTECH 영업관리 시스템 - 단순 로그인
 * Created by: Daniel.K
 * Date: 2025
 */

import { showToast } from '../01.common/14_toast.js';
import dbManager from '../06.database/01_database_manager.js';

// ============================================
// [SECTION: 전역 변수]
// ============================================

let selectedRole = null;
let selectedEmployee = null;
let employeesList = [];

// ============================================
// [SECTION: DOM 요소]
// ============================================

const elements = {
    roleRadios: null,
    employeeSelect: null,
    passwordInput: null,
    loginButton: null,
    loginForm: null
};

// ============================================
// [SECTION: 초기화]
// ============================================

/**
 * [기능: 페이지 초기화]
 */
function initLoginPage() {
    console.log('🔐 로그인 페이지 초기화 시작');

    // DOM 요소 가져오기
    elements.roleRadios = document.querySelectorAll('input[name="role"]');
    elements.employeeSelect = document.getElementById('employee');
    elements.passwordInput = document.getElementById('password');
    elements.loginButton = document.getElementById('loginButton');
    elements.loginForm = document.getElementById('loginForm');

    // 이벤트 리스너 등록
    attachEventListeners();

    console.log('✅ 로그인 페이지 초기화 완료');
}

/**
 * [기능: 이벤트 리스너 등록]
 */
function attachEventListeners() {
    // 역할 선택 이벤트
    elements.roleRadios.forEach(radio => {
        radio.addEventListener('change', handleRoleChange);
    });

    // 직원 선택 이벤트
    elements.employeeSelect.addEventListener('change', handleEmployeeChange);

    // 폼 제출 이벤트
    elements.loginForm.addEventListener('submit', handleLogin);

    console.log('✅ 이벤트 리스너 등록 완료');
}

// ============================================
// [SECTION: 이벤트 핸들러]
// ============================================

/**
 * [기능: 역할 변경 핸들러]
 */
async function handleRoleChange(event) {
    selectedRole = event.target.value;
    console.log(`👤 역할 선택됨: ${selectedRole}`);

    // 직원 선택 초기화
    elements.employeeSelect.innerHTML = '<option value="">불러오는 중...</option>';
    elements.employeeSelect.disabled = true;
    elements.loginButton.disabled = true;

    try {
        // API를 통해 역할별 직원 목록 가져오기
        const response = await dbManager.getEmployeesByRole(selectedRole);
        
        console.log(`📊 역할별 직원 조회 응답:`, response);

        // 응답 데이터 확인
        if (!response || response.length === 0) {
            elements.employeeSelect.innerHTML = '<option value="">해당 역할의 직원이 없습니다</option>';
            showToast(`${selectedRole} 역할의 직원이 없습니다`, 'warning');
            return;
        }

        employeesList = response;
        
        console.log(`✅ ${selectedRole} 직원 목록 (${employeesList.length}명):`, employeesList);

        // 드롭다운 업데이트
        updateEmployeeDropdown(employeesList);
        elements.employeeSelect.disabled = false;

        showToast(`${employeesList.length}명의 ${selectedRole} 직원을 불러왔습니다`, 'success');

    } catch (error) {
        console.error('❌ 직원 목록 로드 실패:', error);
        elements.employeeSelect.innerHTML = '<option value="">직원 목록을 불러올 수 없습니다</option>';
        showToast('직원 목록을 불러오는데 실패했습니다', 'error');
    }
}

/**
 * [기능: 직원 드롭다운 업데이트]
 */
function updateEmployeeDropdown(employees) {
    // 기본 옵션
    let html = '<option value="">직원을 선택해주세요</option>';

    // 직원 목록 추가
    employees.forEach(emp => {
        // 엑셀 업로드 권한 표시
        const keyIcon = emp.canUploadExcel ? '🔑 ' : '';
        const displayText = `${keyIcon}${emp.displayName}`;
        
        html += `<option value="${emp.name}" data-department="${emp.department}" data-can-upload="${emp.canUploadExcel}">
                    ${displayText}
                 </option>`;
    });

    elements.employeeSelect.innerHTML = html;
}

/**
 * [기능: 직원 선택 핸들러]
 */
function handleEmployeeChange(event) {
    selectedEmployee = event.target.value;
    
    if (selectedEmployee) {
        console.log(`✅ 직원 선택됨: ${selectedEmployee}`);
        
        // 로그인 버튼 활성화
        elements.loginButton.disabled = false;
        
        // 비밀번호 입력란 포커스
        elements.passwordInput.focus();
    } else {
        elements.loginButton.disabled = true;
    }
}

/**
 * [기능: 로그인 처리]
 */
async function handleLogin(event) {
    event.preventDefault();

    const password = elements.passwordInput.value.trim();

    // 유효성 검사
    if (!selectedRole) {
        showToast('역할을 선택해주세요', 'error');
        return;
    }

    if (!selectedEmployee) {
        showToast('직원을 선택해주세요', 'error');
        return;
    }

    if (!password) {
        showToast('비밀번호를 입력해주세요', 'error');
        return;
    }

    // 로그인 버튼 비활성화
    elements.loginButton.disabled = true;
    elements.loginButton.textContent = '로그인 중...';

    try {
        console.log('🔐 로그인 시도:', {
            name: selectedEmployee,  // username → name으로 변경
            role: selectedRole
        });

        // API 로그인 요청 (백엔드 스펙에 맞게 수정)
        const user = await dbManager.login(selectedEmployee, password, selectedRole);

        console.log('✅ 로그인 성공:', user);

        // 선택한 역할 저장
        localStorage.setItem('selectedRole', selectedRole);

        showToast(`환영합니다, ${user.name}님!`, 'success');

        // 역할에 따라 리다이렉트
        setTimeout(() => {
            redirectToMainPage(selectedRole);
        }, 1000);

    } catch (error) {
        console.error('❌ 로그인 실패:', error);
        
        // 에러 메시지 처리
        let errorMessage = '로그인에 실패했습니다';
        
        if (error.message) {
            if (error.message.includes('비밀번호')) {
                errorMessage = '비밀번호가 일치하지 않습니다';
            } else if (error.message.includes('찾을 수 없습니다') || error.message.includes('존재하지 않는')) {
                errorMessage = '직원 정보를 찾을 수 없습니다';
            } else if (error.message.includes('재직') || error.message.includes('퇴사')) {
                errorMessage = '퇴사한 직원은 로그인할 수 없습니다';
            } else if (error.message.includes('역할')) {
                errorMessage = '잘못된 역할 선택입니다';
            } else {
                errorMessage = error.message;
            }
        }

        showToast(errorMessage, 'error');

        // 버튼 복구
        elements.loginButton.disabled = false;
        elements.loginButton.textContent = '로그인';
        
        // 비밀번호 입력란 초기화 및 포커스
        elements.passwordInput.value = '';
        elements.passwordInput.focus();
    }
}

/**
 * [기능: 메인 페이지로 리다이렉트]
 */
function redirectToMainPage(role) {
    if (role === '영업담당') {
        window.location.href = '../03.sales_mode/07_sales_main.html';
    } else if (role === '관리자') {
        window.location.href = '../04.admin_mode/08_admin_main.html';
    } else {
        console.error('❌ 알 수 없는 역할:', role);
        showToast('알 수 없는 역할입니다', 'error');
    }
}

// ============================================
// [SECTION: 페이지 로드 시 실행]
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initLoginPage();
});

// [내용: 단순 로그인 페이지]
// 역할 선택 → 직원 선택 → 비밀번호 입력 → 로그인
// #로그인 #인증 #REST_API
