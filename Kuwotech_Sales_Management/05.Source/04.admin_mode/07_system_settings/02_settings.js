/**
 * ============================================
 * KUWOTECH 영업관리 시스템 - 시스템 설정
 * ============================================
 *
 * @파일명: 02_settings.js
 * @작성일: 2025-01-10
 * @설명: 비밀번호 변경 및 본인 정보 관리
 */

// ============================================
// [SECTION: Import]
// ============================================

import { showToast } from '../../01.common/14_toast.js';
import { themeManager } from '../../01.common/11_theme_manager.js';
import { initGlassmorphism } from '../../01.common/07_design.js';
import { showModal } from '../../01.common/06_modal.js';
import { validateEmail, validatePhone } from '../../01.common/18_validation_utils.js';
import GlobalConfig from '../../01.common/01_global_config.js';

// ============================================
// [SECTION: 전역 변수]
// ============================================

let currentUser = null;

// ============================================
// [SECTION: 초기화]
// ============================================

async function initializePage() {

    try {
        // 테마 적용
        themeManager.applyTheme('admin');

        // 글래스모피즘 초기화
        initGlassmorphism();

        // 부서 목록 로드
        await loadDepartments();

        // 사용자 정보 로드
        loadUserInfo();

        // 이벤트 리스너 설정
        setupEventListeners();

    } catch (error) {
        console.error('[시스템 설정] 초기화 오류:', error);
        showToast('페이지 초기화 중 오류가 발생했습니다', 'error');
    }
}

// ============================================
// [SECTION: 부서 목록 로드]
// ============================================

async function loadDepartments() {
    try {
        const token = localStorage.getItem('authToken');
        if (!token) {
            console.warn('[부서 목록] 인증 토큰이 없습니다');
            return;
        }

        // 직원 테이블에서 부서 목록 추출
        const response = await fetch(`${GlobalConfig.API_CONFIG.BASE_URL}/api/employees`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('부서 목록 로드 실패');
        }

        const data = await response.json();

        // employees 배열 추출
        const employees = data.employees || [];

        // 부서 목록 추출 (중복 제거)
        const departments = [...new Set(employees.map(emp => emp.department).filter(Boolean))];

        // Select 옵션 추가
        const departmentSelect = document.getElementById('userDepartment');
        if (departmentSelect) {
            // 기존 옵션 유지 (첫 번째 옵션: "부서를 선택하세요")
            departments.forEach(dept => {
                const option = document.createElement('option');
                option.value = dept;
                option.textContent = dept;
                departmentSelect.appendChild(option);
            });
        }

    } catch (error) {
        console.error('[부서 목록] 로드 오류:', error);
        // 오류가 나도 계속 진행 (부서 선택 불가능하지만 다른 기능은 작동)
    }
}

// ============================================
// [SECTION: 사용자 정보 로드]
// ============================================

function loadUserInfo() {
    // localStorage에서 사용자 정보 가져오기
    const userStr = localStorage.getItem('user');
    if (!userStr) {
        showToast('사용자 정보를 찾을 수 없습니다', 'error');
        return;
    }

    currentUser = JSON.parse(userStr);

    // 폼 필드에 정보 표시
    document.getElementById('userName').value = currentUser.name || '';
    document.getElementById('userEmail').value = currentUser.email || '';
    document.getElementById('userPhone').value = currentUser.phone || '';
    document.getElementById('userDepartment').value = currentUser.department || '';
    document.getElementById('userRole').value = currentUser.role || '';
}

// ============================================
// [SECTION: 이벤트 리스너 설정]
// ============================================

function setupEventListeners() {
    // 새로고침 버튼
    const refreshBtn = document.getElementById('btnRefresh');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            loadUserInfo();
            showToast('정보를 새로고침했습니다', 'success');
        });
    }

    // 비밀번호 강도 체크
    const newPasswordInput = document.getElementById('newPassword');
    if (newPasswordInput) {
        newPasswordInput.addEventListener('input', checkPasswordStrength);
    }
}

// ============================================
// [SECTION: 본인 정보 저장]
// ============================================

window.saveUserInfo = async function() {
    try {
        const email = document.getElementById('userEmail').value.trim();
        const phone = document.getElementById('userPhone').value.trim();
        const department = document.getElementById('userDepartment').value;
        const role = document.getElementById('userRole').value;

        // 유효성 검사
        if (email && !validateEmail(email)) {
            showToast('올바른 이메일 형식을 입력해주세요', 'error');
            return;
        }

        if (phone && !validatePhone(phone)) {
            showToast('올바른 전화번호 형식을 입력해주세요 (예: 010-0000-0000)', 'error');
            return;
        }

        if (!department) {
            showToast('부서를 선택해주세요', 'error');
            return;
        }

        if (!role) {
            showToast('역할을 선택해주세요', 'error');
            return;
        }

        // 확인 모달
        const confirmed = await showModal({
            title: '본인 정보 변경',
            content: `
                <div class="settings-confirm-container">
                    <p>변경된 정보를 저장하시겠습니까?</p>
                    <div class="settings-info-box">
                        <p><strong>이메일:</strong> ${email || '(없음)'}</p>
                        <p><strong>전화번호:</strong> ${phone || '(없음)'}</p>
                        <p><strong>부서:</strong> ${department}</p>
                        <p><strong>역할:</strong> ${role}</p>
                    </div>
                </div>
            `,
            size: 'small',
            buttons: [
                {
                    text: '취소',
                    type: 'secondary',
                    onClick: () => false
                },
                {
                    text: '저장',
                    type: 'primary',
                    onClick: () => true
                }
            ]
        });

        if (!confirmed) return;

        // API 호출
        const token = localStorage.getItem('authToken');
        if (!token) {
            showToast('인증 토큰이 없습니다', 'error');
            return;
        }

        const response = await fetch(`${GlobalConfig.API_CONFIG.BASE_URL}/api/employees/${currentUser.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                email: email || null,
                phone: phone || null,
                department: department,
                role: role
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || '정보 변경 실패');
        }

        const result = await response.json();

        // 로컬 스토리지 업데이트
        currentUser.email = email;
        currentUser.phone = phone;
        currentUser.department = department;
        currentUser.role = role;
        localStorage.setItem('user', JSON.stringify(currentUser));

        showToast('본인 정보가 성공적으로 변경되었습니다', 'success');

    } catch (error) {
        console.error('[정보 변경] 오류:', error);
        showToast(error.message || '정보 변경 중 오류가 발생했습니다', 'error');
    }
};

// ============================================
// [SECTION: 비밀번호 변경]
// ============================================

window.changePassword = async function() {
    try {
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        // 유효성 검사
        if (!currentPassword || !newPassword || !confirmPassword) {
            showToast('모든 필드를 입력해주세요', 'error');
            return;
        }

        if (newPassword !== confirmPassword) {
            showToast('새 비밀번호가 일치하지 않습니다', 'error');
            return;
        }

        if (!validatePassword(newPassword)) {
            showToast('비밀번호는 최소 8자, 영문/숫자를 포함해야 합니다', 'error');
            return;
        }

        if (currentPassword === newPassword) {
            showToast('새 비밀번호는 현재 비밀번호와 달라야 합니다', 'error');
            return;
        }

        // 확인 모달
        const confirmed = await showModal({
            title: '비밀번호 변경',
            content: `
                <div class="settings-confirm-container">
                    <p>비밀번호를 변경하시겠습니까?</p>
                    <p class="settings-note-text">
                        보안을 위해 변경 후 다시 로그인해야 합니다.
                    </p>
                </div>
            `,
            size: 'small',
            buttons: [
                {
                    text: '취소',
                    type: 'secondary',
                    onClick: () => false
                },
                {
                    text: '변경',
                    type: 'primary',
                    onClick: () => true
                }
            ]
        });

        if (!confirmed) return;

        // API 호출
        const token = localStorage.getItem('authToken');
        if (!token) {
            showToast('인증 토큰이 없습니다', 'error');
            return;
        }

        const response = await fetch(`${GlobalConfig.API_CONFIG.BASE_URL}/api/employees/${currentUser.id}/password`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                currentPassword: currentPassword,
                newPassword: newPassword
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || '비밀번호 변경 실패');
        }

        const result = await response.json();

        // 입력 필드 초기화
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmPassword').value = '';

        // 비밀번호 강도 표시 초기화
        const strengthIndicator = document.getElementById('strengthIndicator');
        const strengthText = document.getElementById('strengthText');
        if (strengthIndicator && strengthText) {
            strengthIndicator.className = 'strength-fill';
            strengthText.textContent = '-';
            strengthText.className = 'strength-text';
        }

        showToast('비밀번호가 성공적으로 변경되었습니다', 'success');

        // 3초 후 로그아웃
        setTimeout(() => {
            showToast('보안을 위해 다시 로그인해주세요', 'info');
            setTimeout(() => {
                // 로그아웃 처리
                localStorage.removeItem('authToken');
                localStorage.removeItem('user');
                window.location.href = '../../02.login/01_login.html';
            }, 2000);
        }, 1000);

    } catch (error) {
        console.error('[비밀번호 변경] 오류:', error);
        showToast(error.message || '비밀번호 변경 중 오류가 발생했습니다', 'error');
    }
};

// ============================================
// [SECTION: 비밀번호 강도 체크]
// ============================================

function checkPasswordStrength() {
    const password = document.getElementById('newPassword').value;
    const strengthIndicator = document.getElementById('strengthIndicator');
    const strengthText = document.getElementById('strengthText');

    if (!password) {
        strengthIndicator.className = 'strength-fill';
        strengthText.textContent = '-';
        strengthText.className = 'strength-text';
        return;
    }

    let strength = 0;

    // 길이 체크
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;

    // 영문 체크
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;

    // 숫자 체크
    if (/[0-9]/.test(password)) strength++;

    // 특수문자 체크
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    // 강도 표시
    if (strength <= 2) {
        strengthIndicator.className = 'strength-fill weak';
        strengthText.textContent = '약함';
        strengthText.className = 'strength-text weak';
    } else if (strength <= 4) {
        strengthIndicator.className = 'strength-fill medium';
        strengthText.textContent = '보통';
        strengthText.className = 'strength-text medium';
    } else {
        strengthIndicator.className = 'strength-fill strong';
        strengthText.textContent = '강함';
        strengthText.className = 'strength-text strong';
    }
}

// ============================================
// [SECTION: 유효성 검사]
// ============================================

function validatePassword(password) {
    // 최소 8자, 영문과 숫자 포함
    const re = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;
    return re.test(password);
}

// ============================================
// [SECTION: 페이지 로드]
// ============================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePage);
} else {
    // DOM이 이미 로드된 경우 (동적 로딩)
    setTimeout(initializePage, 100);
}
