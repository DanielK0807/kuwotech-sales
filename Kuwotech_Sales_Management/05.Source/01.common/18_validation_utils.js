/**
 * ============================================
 * 거래처 입력 검증 유틸리티
 * 파일: 01.common/18_validation_utils.js
 * 작성일: 2025-01-27
 * ============================================
 */

import { GlobalConfig, showToast, showModal } from './10_index.js';

/**
 * 전화번호 형식 검증
 * 지원 형식: 02-1234-5678, 0212345678, 031-123-4567, 010-1234-5678 등
 */
export function validatePhoneNumber(phoneNumber) {
    if (!phoneNumber) return { valid: true }; // 선택 필드

    // 하이픈 제거
    const cleanNumber = phoneNumber.replace(/-/g, '');

    // 숫자만 있는지 확인
    if (!/^\d+$/.test(cleanNumber)) {
        return {
            valid: false,
            message: '전화번호는 숫자만 입력 가능합니다.'
        };
    }

    // 길이 검증 (지역번호 포함 9-11자리)
    if (cleanNumber.length < 9 || cleanNumber.length > 11) {
        return {
            valid: false,
            message: '올바른 전화번호 형식이 아닙니다. (예: 02-1234-5678)'
        };
    }

    // 형식화된 전화번호 반환
    let formatted = cleanNumber;
    if (cleanNumber.startsWith('02')) {
        // 서울 지역번호
        if (cleanNumber.length === 9) {
            formatted = cleanNumber.replace(/(\d{2})(\d{3})(\d{4})/, '$1-$2-$3');
        } else if (cleanNumber.length === 10) {
            formatted = cleanNumber.replace(/(\d{2})(\d{4})(\d{4})/, '$1-$2-$3');
        }
    } else if (cleanNumber.startsWith('010') || cleanNumber.startsWith('011') || cleanNumber.startsWith('016') || cleanNumber.startsWith('017') || cleanNumber.startsWith('018') || cleanNumber.startsWith('019')) {
        // 휴대전화
        formatted = cleanNumber.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
    } else {
        // 기타 지역번호
        if (cleanNumber.length === 10) {
            formatted = cleanNumber.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
        } else if (cleanNumber.length === 11) {
            formatted = cleanNumber.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
        }
    }

    return {
        valid: true,
        formatted: formatted
    };
}

/**
 * 사업자등록번호 형식 검증
 * 형식: 000-00-00000 (10자리)
 */
export function validateBusinessNumber(businessNumber) {
    if (!businessNumber) return { valid: true }; // 선택 필드

    // 하이픈 제거
    const cleanNumber = businessNumber.replace(/-/g, '');

    // 숫자만 있는지 확인
    if (!/^\d+$/.test(cleanNumber)) {
        return {
            valid: false,
            message: '사업자등록번호는 숫자만 입력 가능합니다.'
        };
    }

    // 길이 검증 (10자리)
    if (cleanNumber.length !== 10) {
        return {
            valid: false,
            message: '사업자등록번호는 10자리입니다. (예: 123-45-67890)'
        };
    }

    // 형식화된 사업자등록번호 반환
    const formatted = cleanNumber.replace(/(\d{3})(\d{2})(\d{5})/, '$1-$2-$3');

    return {
        valid: true,
        formatted: formatted
    };
}

/**
 * 거래처명 중복 체크
 * @param {string} companyName - 체크할 거래처명
 * @param {string} excludeKey - 제외할 거래처 키 (수정 시)
 * @returns {Promise<object>} - { isDuplicate: boolean, companies: array }
 */
export async function checkCompanyNameDuplicate(companyName, excludeKey = null) {
    try {
        let url = `${GlobalConfig.API_BASE_URL}/api/companies/check-duplicate/name?name=${encodeURIComponent(companyName)}`;

        if (excludeKey) {
            url += `&excludeKey=${excludeKey}`;
        }

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });

        if (!response.ok) {
            throw new Error('중복 체크 실패');
        }

        return await response.json();

    } catch (error) {
        console.error('[거래처명 중복 체크 오류]', error);
        showToast('거래처명 중복 체크 중 오류가 발생했습니다.', 'error');
        return { success: false, isDuplicate: false, companies: [] };
    }
}

/**
 * 사업자등록번호 중복 체크
 * @param {string} businessNumber - 체크할 사업자등록번호
 * @param {string} excludeKey - 제외할 거래처 키 (수정 시)
 * @returns {Promise<object>} - { isDuplicate: boolean, companies: array }
 */
export async function checkBusinessNumberDuplicate(businessNumber, excludeKey = null) {
    try {
        let url = `${GlobalConfig.API_BASE_URL}/api/companies/check-duplicate/business-number?number=${encodeURIComponent(businessNumber)}`;

        if (excludeKey) {
            url += `&excludeKey=${excludeKey}`;
        }

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });

        if (!response.ok) {
            throw new Error('중복 체크 실패');
        }

        return await response.json();

    } catch (error) {
        console.error('[사업자등록번호 중복 체크 오류]', error);
        showToast('사업자등록번호 중복 체크 중 오류가 발생했습니다.', 'error');
        return { success: false, isDuplicate: false, companies: [] };
    }
}

/**
 * 거래처명 중복 확인 모달 표시
 * @param {array} duplicateCompanies - 중복된 거래처 목록
 * @returns {Promise<boolean>} - 사용자가 계속 진행을 선택하면 true
 */
export async function showDuplicateCompanyModal(duplicateCompanies) {
    if (!duplicateCompanies || duplicateCompanies.length === 0) {
        return true;
    }

    const companyListHtml = duplicateCompanies.map(company => `
        <div class="duplicate-company-item">
            <div class="company-info-row">
                <div class="info-label">거래처명:</div>
                <div class="info-value"><strong>${company.finalCompanyName}</strong></div>
            </div>
            <div class="company-info-row">
                <div class="info-label">대표이사:</div>
                <div class="info-value">${company.ceoOrDentist || '-'}</div>
            </div>
            <div class="company-info-row">
                <div class="info-label">주소:</div>
                <div class="info-value">${company.detailedAddress || '-'}</div>
            </div>
            <div class="company-info-row">
                <div class="info-label">전화번호:</div>
                <div class="info-value">${company.phoneNumber || '-'}</div>
            </div>
        </div>
    `).join('');

    const modalContent = `
        <div class="duplicate-warning">
            <div class="warning-header">
                ⚠️ <strong>동일한 거래처명이 이미 존재합니다</strong>
            </div>
            <div class="warning-message">
                아래 거래처와 동일한 거래처인지 확인해주세요.
            </div>
            <div class="duplicate-companies-list">
                ${companyListHtml}
            </div>
            <div class="warning-question">
                <strong>위 거래처와 다른 거래처가 맞나요?</strong><br>
                <span class="sub-text">같은 거래처라면 "취소"를 누르고 기존 거래처를 수정해주세요.</span>
            </div>
        </div>
        <style>
            .duplicate-warning {
                padding: 20px;
                max-width: 600px;
                margin: 0 auto;
            }
            .warning-header {
                font-size: 18px;
                color: #e74c3c;
                margin-bottom: 15px;
                padding: 12px;
                background: #fee;
                border-radius: 6px;
                text-align: center;
            }
            .warning-message {
                margin-bottom: 20px;
                color: #555;
                font-size: 15px;
            }
            .duplicate-companies-list {
                max-height: 400px;
                overflow-y: auto;
                margin-bottom: 20px;
            }
            .duplicate-company-item {
                background: var(--glass-bg);
                border: 1px solid var(--glass-border);
                border-radius: 8px;
                padding: 15px;
                margin-bottom: 12px;
            }
            .company-info-row {
                display: flex;
                padding: 6px 0;
                border-bottom: 1px solid #eee;
            }
            .company-info-row:last-child {
                border-bottom: none;
            }
            .info-label {
                width: 100px;
                font-weight: 600;
                color: #666;
            }
            .info-value {
                flex: 1;
                color: #333;
            }
            .warning-question {
                background: #fffbea;
                padding: 15px;
                border-radius: 6px;
                border-left: 4px solid #f39c12;
                text-align: center;
            }
            .sub-text {
                font-size: 13px;
                color: #888;
            }
        </style>
    `;

    return await showModal({
        title: '⚠️ 거래처명 중복 확인',
        content: modalContent,
        size: 'lg',
        buttons: [
            {
                text: '취소 (같은 거래처임)',
                type: 'secondary',
                onClick: () => false
            },
            {
                text: '계속 진행 (다른 거래처임)',
                type: 'primary',
                onClick: () => true
            }
        ]
    });
}

/**
 * 주소에서 지역 자동 추출
 * @param {string} address - 주소 문자열
 * @param {array} regions - 지역 마스터 데이터
 * @returns {number|null} - 매칭된 region_id 또는 null
 */
export function parseRegionFromAddress(address, regions) {
    if (!address || !regions || regions.length === 0) {
        return null;
    }

    // 주소 문자열 정규화 (공백 제거, 소문자 변환)
    const normalizedAddress = address.trim();

    // 지역 마스터 데이터에서 매칭 시도 (긴 이름부터 검사)
    const sortedRegions = [...regions].sort((a, b) => b.region_name.length - a.region_name.length);

    for (const region of sortedRegions) {
        // region_name으로 검사 (예: "서울특별시", "경기도")
        if (normalizedAddress.includes(region.region_name)) {
            return region.id;
        }

        // region_code로도 검사 (예: "서울", "경기")
        if (normalizedAddress.includes(region.region_code)) {
            return region.id;
        }
    }

    // 매칭 실패
    return null;
}

/**
 * 전체 폼 검증 (거래처 추가/수정)
 * @param {object} formData - 폼 데이터 객체
 * @param {boolean} isUpdate - 수정 모드 여부
 * @returns {object} - { valid: boolean, message: string }
 */
export function validateCompanyForm(formData, isUpdate = false) {
    // 필수 필드 검증
    if (!formData.finalCompanyName || !formData.finalCompanyName.trim()) {
        return {
            valid: false,
            message: '최종거래처명은 필수입니다.'
        };
    }

    if (!formData.ceoOrDentist || !formData.ceoOrDentist.trim()) {
        return {
            valid: false,
            message: '대표이사/치과의사는 필수입니다.'
        };
    }

    if (!formData.internalManager || !formData.internalManager.trim()) {
        return {
            valid: false,
            message: '내부담당자는 필수입니다.'
        };
    }

    // 전화번호 형식 검증
    if (formData.phoneNumber) {
        const phoneValidation = validatePhoneNumber(formData.phoneNumber);
        if (!phoneValidation.valid) {
            return {
                valid: false,
                message: phoneValidation.message
            };
        }
    }

    // 사업자등록번호 형식 검증
    if (formData.businessRegistrationNumber) {
        const businessValidation = validateBusinessNumber(formData.businessRegistrationNumber);
        if (!businessValidation.valid) {
            return {
                valid: false,
                message: businessValidation.message
            };
        }
    }

    return { valid: true };
}
