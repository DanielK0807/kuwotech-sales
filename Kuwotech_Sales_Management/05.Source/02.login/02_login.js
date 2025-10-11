/**
 * KUWOTECH 영업관리 시스템 - 단순 로그인
 * Created by: Daniel.K
 * Date: 2025
 *
 * 로그인 플로우:
 * 1. 성명 입력 (텍스트 입력)
 * 2. 역할 선택 (직원의 실제 역할에 따라 동적 표시)
 *    - 단일 역할: 자동 선택되어 표시만
 *    - 복수 역할: 선택 가능하게 표시
 * 3. 비밀번호 입력
 * 4. 확인 버튼 클릭 → 로그인
 */

import { showToast } from '../01.common/14_toast.js';
import dbManager from '../06.database/01_database_manager.js';

// ============================================
// [SECTION: 전역 변수]
// ============================================

let currentEmployee = null;
let selectedRole = null;
let isNameVerified = false;

// ============================================
// [SECTION: DOM 요소]
// ============================================

const elements = {
    employeeNameInput: null,
    roleGroup: null,
    roleRadioGroup: null,
    passwordGroup: null,
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
    // DOM 요소 가져오기
    elements.employeeNameInput = document.getElementById('employeeName');
    elements.roleGroup = document.getElementById('roleGroup');
    elements.roleRadioGroup = document.getElementById('roleRadioGroup');
    elements.passwordGroup = document.getElementById('passwordGroup');
    elements.passwordInput = document.getElementById('password');
    elements.loginButton = document.getElementById('loginButton');
    elements.loginForm = document.getElementById('loginForm');

    // 이벤트 리스너 등록
    attachEventListeners();
}

/**
 * [기능: 이벤트 리스너 등록]
 */
function attachEventListeners() {
    // 이름 입력 이벤트 (Enter 키 또는 포커스 아웃)
    elements.employeeNameInput.addEventListener('keypress', async (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            await handleNameSubmit();
        }
    });

    elements.employeeNameInput.addEventListener('blur', async () => {
        if (elements.employeeNameInput.value.trim() && !isNameVerified) {
            await handleNameSubmit();
        }
    });

    // 이름 입력 변경 시 초기화
    elements.employeeNameInput.addEventListener('input', () => {
        if (isNameVerified) {
            resetForm();
        }
    });

    // 폼 제출 이벤트
    elements.loginForm.addEventListener('submit', handleLogin);
}

// ============================================
// [SECTION: 이름 입력 처리]
// ============================================

/**
 * [기능: 이름 제출 핸들러]
 */
async function handleNameSubmit() {
    const name = elements.employeeNameInput.value.trim();

    if (!name) {
        showToast('이름을 입력해주세요', 'warning');
        return;
    }

    // 로딩 상태
    elements.loginButton.disabled = true;
    elements.loginButton.textContent = '확인 중...';

    try {
        // API를 통해 직원 정보 가져오기 (이름으로 조회)
        const response = await dbManager.getEmployeeByName(name);

        if (!response || !response.employee) {
            showToast('존재하지 않는 직원입니다', 'error');
            elements.loginButton.textContent = '확인';
            elements.loginButton.disabled = false;
            elements.employeeNameInput.focus();
            return;
        }

        const employee = response.employee;

        // 퇴사한 직원 체크
        if (employee.status === '퇴사' || employee.status === 'inactive') {
            showToast('퇴사한 직원은 로그인할 수 없습니다', 'error');
            elements.loginButton.textContent = '확인';
            elements.loginButton.disabled = false;
            elements.employeeNameInput.focus();
            return;
        }

        currentEmployee = employee;
        isNameVerified = true;

        // 역할 선택 UI 표시
        showRoleSelection(employee);

        // 비밀번호 입력 표시
        elements.passwordGroup.style.display = 'block';
        elements.passwordInput.focus();

        // 버튼 텍스트 변경
        elements.loginButton.textContent = '확인';

        showToast(`${employee.name}님, 역할과 비밀번호를 입력해주세요`, 'success');

    } catch (error) {
        console.error('❌ 직원 조회 실패:', error);
        showToast('직원 정보를 확인할 수 없습니다', 'error');
        elements.loginButton.textContent = '확인';
        elements.loginButton.disabled = false;
        elements.employeeNameInput.focus();
    }
}

/**
 * [기능: 역할 선택 UI 표시]
 */
function showRoleSelection(employee) {
    const roles = [];

    // role1과 role2 수집
    if (employee.role1) roles.push(employee.role1);
    if (employee.role2 && employee.role2 !== employee.role1) roles.push(employee.role2);

    if (roles.length === 0) {
        showToast('역할이 지정되지 않은 직원입니다', 'error');
        resetForm();
        return;
    }

    // 역할 그룹 표시
    elements.roleGroup.style.display = 'block';

    // 역할이 1개인 경우: 자동 선택 및 읽기 전용 표시
    if (roles.length === 1) {
        selectedRole = roles[0];
        elements.roleRadioGroup.innerHTML = `
            <div class="radio-option" style="flex: 1;">
                <input type="radio" id="role-auto" name="role" value="${roles[0]}" checked disabled />
                <label class="radio-label" for="role-auto" style="cursor: default; opacity: 0.9;">
                    <i class="fas fa-${getRoleIcon(roles[0])}"></i>
                    ${roles[0]}
                </label>
            </div>
        `;
        elements.loginButton.disabled = false;
    }
    // 역할이 2개인 경우: 선택 가능하게 표시
    else {
        let html = '';
        roles.forEach((role, index) => {
            const roleId = `role-${index}`;
            html += `
                <div class="radio-option">
                    <input type="radio" id="${roleId}" name="role" value="${role}" ${index === 0 ? 'checked' : ''} />
                    <label class="radio-label" for="${roleId}">
                        <i class="fas fa-${getRoleIcon(role)}"></i>
                        ${role}
                    </label>
                </div>
            `;
        });
        elements.roleRadioGroup.innerHTML = html;

        // 역할 선택 이벤트 리스너 추가
        const roleRadios = document.querySelectorAll('input[name="role"]');
        roleRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                selectedRole = e.target.value;
                elements.loginButton.disabled = false;
            });
        });

        // 첫 번째 역할 자동 선택
        selectedRole = roles[0];
        elements.loginButton.disabled = false;
    }
}

/**
 * [기능: 역할 아이콘 반환]
 */
function getRoleIcon(role) {
    const iconMap = {
        '관리자': 'user-shield',
        '영업담당': 'user-tie',
        'admin': 'user-shield',
        'sales': 'user-tie'
    };
    return iconMap[role] || 'user';
}

// ============================================
// [SECTION: 폼 초기화]
// ============================================

/**
 * [기능: 폼 초기화]
 */
function resetForm() {
    isNameVerified = false;
    currentEmployee = null;
    selectedRole = null;

    // UI 초기화
    elements.roleGroup.style.display = 'none';
    elements.passwordGroup.style.display = 'none';
    elements.roleRadioGroup.innerHTML = '';
    elements.passwordInput.value = '';
    elements.loginButton.disabled = true;
    elements.loginButton.textContent = '확인';
}

// ============================================
// [SECTION: 로그인 처리]
// ============================================

/**
 * [기능: 로그인 처리]
 */
async function handleLogin(event) {
    event.preventDefault();

    const name = elements.employeeNameInput.value.trim();
    const password = elements.passwordInput.value.trim();

    // 유효성 검사
    if (!isNameVerified || !currentEmployee) {
        showToast('이름을 먼저 확인해주세요', 'error');
        return;
    }

    if (!selectedRole) {
        showToast('역할을 선택해주세요', 'error');
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
        // API 로그인 요청
        const user = await dbManager.login(name, password, selectedRole);

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
        elements.loginButton.textContent = '확인';

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
// 이름 입력 → 역할 선택 (동적) → 비밀번호 입력 → 로그인
// #로그인 #인증 #REST_API
