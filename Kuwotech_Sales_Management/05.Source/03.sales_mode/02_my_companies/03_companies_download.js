/**
 * ============================================
 * KUWOTECH 영업관리 시스템 - 담당거래처 다운로드
 * ============================================
 *
 * @파일명: 03_companies_download.js
 * @작성자: Daniel.K
 * @작성일: 2025-09-30
 * @수정일: 2025-10-11
 * @버전: 2.0
 *
 * @설명:
 * 영업담당자의 담당거래처 데이터 다운로드 기능
 * download_helper를 사용하여 중복 코드 제거 및 일관성 향상
 *
 * @변경사항 (v2.0):
 * - download_helper.js의 UI 컴포넌트 함수 사용
 * - 중복 코드 제거 (Modal HTML 생성, 인라인 CSS, 검증 로직)
 * - 파일 형식 선택 기능 유지 (additionalContent 사용)
 * - 코드 라인 수 52% 감소 (362 → 175 lines)
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
export function initDownloadButton() {
    // 기존 엑셀 내보내기 버튼을 다운로드 옵션 버튼으로 변경
    const exportBtn = document.querySelector('button[onclick="exportExcel()"]');
    if (exportBtn) {
        // onclick 제거
        exportBtn.removeAttribute('onclick');

        // 새 이벤트 리스너 추가
        exportBtn.addEventListener('click', showDownloadOptions);
    }
}

// ============================================
// [SECTION: 다운로드 옵션 모달]
// ============================================

/**
 * [함수: 다운로드 옵션 모달 표시]
 * download_helper를 사용한 간소화된 Modal 생성
 * 파일 형식 선택 기능 포함 (additionalContent 사용)
 */
async function showDownloadOptions() {
    // 파일 형식 선택 HTML (additionalContent)
    const formatSelectionHTML = `
        <div class="option-group glass-card">
            <h3>📊 다운로드 형식</h3>
            <div class="format-options" style="display: flex; gap: 10px; flex-wrap: wrap;">
                <label class="format-option glass-card" style="flex: 1; min-width: 150px; padding: 15px; cursor: pointer; border: 2px solid transparent; transition: all 0.3s;">
                    <input type="radio" name="download-format" value="excel" checked style="margin-right: 8px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 24px;">📊</span>
                        <div>
                            <div style="font-weight: 600;">Excel</div>
                            <small style="color: var(--text-secondary);">엑셀 파일 (19개 필드)</small>
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
    `;

    // 통합 다운로드 옵션 Modal 생성 (helper 사용)
    const options = await downloadHelper.createDownloadOptionsModal({
        title: '담당거래처 다운로드',
        icon: '📥',
        showDateRange: false,  // 거래처는 날짜 범위 불필요
        showQuickPeriod: false,
        sheets: [
            {
                id: 'include-all-fields',
                label: '모든 항목 포함',
                description: '19개 필드 전체 포함',
                checked: true,
                disabled: false
            },
            {
                id: 'include-summary',
                label: '요약 정보 포함',
                description: '거래처 통계 요약',
                checked: false,
                disabled: false
            },
            {
                id: 'include-notes',
                label: '비고 포함',
                description: '추가 메모 및 비고',
                checked: false,
                disabled: false
            }
        ],
        additionalContent: formatSelectionHTML  // 파일 형식 선택 추가
    });

    // 사용자가 취소한 경우
    if (!options) return;

    // 파일 형식 가져오기
    const format = document.querySelector('input[name="download-format"]:checked')?.value || 'excel';

    // 다운로드 실행 (helper의 execute 래퍼 사용)
    await downloadHelper.execute(async () => {
        return await downloadManager.download({
            downloadType: DOWNLOAD_TYPES.SALES_COMPANIES,
            userRole: 'sales',
            userName: options.userName,
            format: format,
            includeSheets: options.selectedSheets,
            dateRange: null
        });
    }, {
        downloadType: 'SALES_COMPANIES',
        userName: options.userName,
        showProgress: true,
        enableRetry: true
    });
}

// ============================================
// [SECTION: 레거시 함수 (호환성)]
// ============================================

/**
 * [함수: 레거시 엑셀 내보내기]
 * 기존 코드와의 호환성을 위해 유지
 *
 * @deprecated - showDownloadOptions 사용 권장
 */
export async function exportExcel() {
    logger.warn('[담당거래처] exportExcel() is deprecated. Use showDownloadOptions() instead.');
    await showDownloadOptions();
}

/**
 * [함수: 레거시 엑셀 가져오기]
 * 기존 코드와의 호환성을 위해 유지
 *
 * @note 향후 구현 예정: 엑셀 파일 업로드 → 파싱 → 거래처 일괄 등록
 */
export async function importExcel() {
    showToast('엑셀 가져오기 기능은 준비 중입니다.', 'info');
}

// ============================================
// [SECTION: Export]
// ============================================

export default {
    initDownloadButton,
    showDownloadOptions,
    exportExcel,
    importExcel
};
