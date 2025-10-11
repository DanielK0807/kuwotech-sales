/**
 * ============================================
 * KUWOTECH 영업관리 시스템 - 직원 정보 다운로드
 * ============================================
 *
 * @파일명: 03_employee_download.js
 * @작성자: System
 * @작성일: 2025-09-30
 * @수정일: 2025-10-11
 * @버전: 2.0
 *
 * @설명:
 * 관리자의 전체 직원 정보 다운로드 기능
 * download_helper를 사용하여 중복 코드 제거 및 일관성 향상
 *
 * @변경사항 (v2.0):
 * - download_helper.js의 UI 컴포넌트 함수 사용
 * - 중복 코드 제거 (Modal HTML 생성, 149 lines 인라인 CSS, 검증 로직)
 * - additionalContent로 파일 형식 및 필터 옵션 구현
 * - 코드 라인 수 37% 감소 (437 → 276 lines)
 */

// ============================================
// [SECTION: Import]
// ============================================

import downloadManager, { DOWNLOAD_TYPES } from '../../06.database/12_download_manager.js';
import { showToast } from '../../01.common/14_toast.js';
import downloadHelper from '../../01.common/helpers/download_helper.js';
import logger from '../../01.common/23_logger.js';

// ============================================
// [SECTION: 다운로드 버튼 초기화]
// ============================================

/**
 * [함수: 다운로드 버튼 초기화]
 * HTML의 다운로드 버튼에 이벤트 연결
 */
export function initEmployeeDownloadButton() {
    // 다운로드 버튼 찾기 (여러 패턴 지원)
    const downloadBtn = document.getElementById('btnExport') ||
                       document.getElementById('btn-download-employees') ||
                       document.getElementById('btn-export-excel') ||
                       document.querySelector('button[onclick*="exportExcel"]');

    if (downloadBtn) {
        // 기존 onclick 제거
        downloadBtn.removeAttribute('onclick');

        // 새 이벤트 리스너 추가
        downloadBtn.addEventListener('click', showEmployeeDownloadOptions);
    } else {
        logger.warn('[직원정보 다운로드] 다운로드 버튼을 찾을 수 없습니다');
    }
}

// ============================================
// [SECTION: 다운로드 옵션 모달]
// ============================================

/**
 * [함수: 직원 정보 다운로드 옵션 모달]
 * download_helper를 사용한 간소화된 Modal 생성
 * 파일 형식 및 필터 옵션은 additionalContent로 구현
 */
async function showEmployeeDownloadOptions() {
    // 현재 표시된 직원 수 확인
    const employeeRows = document.querySelectorAll('.employee-table tbody tr:not(.no-data)');
    const totalCount = employeeRows.length;

    // 파일 형식 및 필터 옵션 HTML (additionalContent)
    const additionalOptionsHTML = `
        <!-- 파일 형식 선택 -->
        <div class="option-group glass-card">
            <h3>📊 다운로드 형식</h3>
            <div class="format-options" style="display: flex; gap: 10px; flex-wrap: wrap;">
                <label class="format-option glass-card" style="flex: 1; min-width: 150px; padding: 15px; cursor: pointer; border: 2px solid transparent; transition: all 0.3s;">
                    <input type="radio" name="download-format" value="excel" checked style="margin-right: 8px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 24px;">📊</span>
                        <div>
                            <div style="font-weight: 600;">Excel</div>
                            <small style="color: var(--text-secondary);">엑셀 파일 (9개 필드)</small>
                        </div>
                    </div>
                </label>

                <label class="format-option glass-card" style="flex: 1; min-width: 150px; padding: 15px; cursor: pointer; border: 2px solid transparent; transition: all 0.3s;">
                    <input type="radio" name="download-format" value="csv" style="margin-right: 8px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 24px;">📄</span>
                        <div>
                            <div style="font-weight: 600;">CSV</div>
                            <small style="color: var(--text-secondary);">텍스트 파일</small>
                        </div>
                    </div>
                </label>
            </div>
        </div>

        <!-- 필터 옵션 -->
        <div class="option-group glass-card">
            <h3>🔍 필터 옵션</h3>
            <div class="filter-options">
                <label class="checkbox-label">
                    <input type="checkbox" id="filter-active-only">
                    <span class="checkbox-text">
                        <strong>재직 중인 직원만</strong>
                        <small>퇴사자 제외</small>
                    </span>
                </label>
                <label class="checkbox-label">
                    <input type="checkbox" id="filter-sales-only">
                    <span class="checkbox-text">
                        <strong>영업팀만</strong>
                        <small>영업부서만 포함</small>
                    </span>
                </label>
                <label class="checkbox-label">
                    <input type="checkbox" id="include-statistics">
                    <span class="checkbox-text">
                        <strong>부서별 통계 포함</strong>
                        <small>집계 시트 추가</small>
                    </span>
                </label>
            </div>
        </div>

        <!-- 정보 배너 -->
        <div class="option-group glass-card" style="background: rgba(100, 181, 246, 0.05); border: 1px solid var(--primary-color);">
            <h3>👥 다운로드 대상</h3>
            <p>현재 표시된 직원: <strong>${totalCount}명</strong></p>
            <p style="color: #f44336; font-size: 0.9em; margin-top: 10px;">
                ※ 개인정보 보호를 위해 반드시 안전하게 관리해주세요.
            </p>
        </div>
    `;

    // 통합 다운로드 옵션 Modal 생성 (헬퍼 사용)
    const options = await downloadHelper.createDownloadOptionsModal({
        title: '직원 정보 다운로드',
        icon: '👥',
        showDateRange: false,  // 직원 정보는 날짜 범위 불필요
        showQuickPeriod: false,
        sheets: [
            {
                id: 'include-basic-info',
                label: '기본 정보',
                description: '이름, 사번, 입사일자 (필수)',
                checked: true,
                disabled: true
            },
            {
                id: 'include-contact',
                label: '연락처 정보',
                description: '이메일, 전화번호',
                checked: true,
                disabled: false
            },
            {
                id: 'include-department',
                label: '조직 정보',
                description: '부서, 직급, 역할',
                checked: true,
                disabled: false
            },
            {
                id: 'include-status',
                label: '상태 정보',
                description: '재직여부',
                checked: true,
                disabled: false
            }
        ],
        additionalContent: additionalOptionsHTML
    });

    // 사용자가 취소한 경우
    if (!options) return;

    // 관리자 권한 확인
    if (options.userRole !== 'admin') {
        showToast('직원 정보 다운로드는 관리자만 가능합니다.', 'error');
        return;
    }

    // 파일 형식 및 필터 옵션 가져오기
    const format = document.querySelector('input[name="download-format"]:checked')?.value || 'excel';
    const filterActiveOnly = document.getElementById('filter-active-only')?.checked || false;
    const filterSalesOnly = document.getElementById('filter-sales-only')?.checked || false;
    const includeStatistics = document.getElementById('include-statistics')?.checked || false;

    // 다운로드 실행 (헬퍼의 execute 래퍼 사용)
    await downloadHelper.execute(async () => {
        return await downloadManager.download({
            downloadType: DOWNLOAD_TYPES.ADMIN_EMPLOYEES,
            userRole: 'admin',
            userName: options.userName,
            format: format,
            includeSheets: options.selectedSheets,
            filterOptions: {
                activeOnly: filterActiveOnly,
                salesOnly: filterSalesOnly
            },
            includeStats: includeStatistics,
            dateRange: null
        });
    }, {
        downloadType: 'ADMIN_EMPLOYEES',
        userName: options.userName,
        showProgress: true,
        enableRetry: true
    });
}

// ============================================
// [SECTION: 빠른 다운로드]
// ============================================

/**
 * [함수: 빠른 다운로드 (옵션 없이 즉시 다운로드)]
 */
export async function quickDownloadEmployees() {
    // 사용자 정보 가져오기 (헬퍼 사용)
    const userInfo = downloadHelper.getUserInfo();
    if (!userInfo) return;

    if (userInfo.userRole !== 'admin') {
        showToast('직원 정보 다운로드는 관리자만 가능합니다.', 'error');
        return;
    }

    // 다운로드 실행 (헬퍼의 execute 래퍼 사용)
    await downloadHelper.execute(async () => {
        return await downloadManager.download({
            downloadType: DOWNLOAD_TYPES.ADMIN_EMPLOYEES,
            userRole: 'admin',
            userName: userInfo.userName,
            format: 'excel',
            includeSheets: ['직원정보'],
            dateRange: null
        });
    }, {
        downloadType: 'ADMIN_EMPLOYEES',
        userName: userInfo.userName,
        showProgress: true
    });
}

// ============================================
// [SECTION: 레거시 함수 (호환성)]
// ============================================

/**
 * [함수: 레거시 엑셀 내보내기]
 * 기존 코드와의 호환성을 위해 유지
 *
 * @deprecated - showEmployeeDownloadOptions 사용 권장
 */
export async function exportExcel() {
    logger.warn('[직원관리] exportExcel() is deprecated. Use showEmployeeDownloadOptions() instead.');
    await showEmployeeDownloadOptions();
}

// ============================================
// [SECTION: Export]
// ============================================

export default {
    initEmployeeDownloadButton,
    showEmployeeDownloadOptions,
    quickDownloadEmployees,
    exportExcel
};
