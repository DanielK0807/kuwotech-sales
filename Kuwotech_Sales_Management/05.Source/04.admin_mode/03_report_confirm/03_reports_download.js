/**
 * ============================================
 * KUWOTECH 영업관리 시스템 - 보고서 승인 다운로드
 * ============================================
 *
 * @파일명: 03_reports_download.js
 * @폴더: 04.admin_mode/03_report_confirm
 * @작성자: System
 * @작성일: 2025-09-30
 * @수정일: 2025-10-11
 * @버전: 2.0
 *
 * @설명:
 * 관리자 보고서 승인 페이지에서 보고서를 엑셀로 다운로드하는 기능
 * download_helper를 사용하여 중복 코드 제거 및 일관성 향상
 *
 * @주요기능:
 * - 전체 보고서 다운로드
 * - 선택 보고서 다운로드
 * - 필터링된 보고서 다운로드
 * - 담당자별 통계 포함
 *
 * @변경사항 (v2.0):
 * - download_helper.js의 UI 컴포넌트 함수 사용
 * - 중복 코드 제거 (Modal HTML, 날짜 처리, 검증)
 * - 다운로드 타입별 정보 표시 (additionalContent 사용)
 * - 코드 라인 수 55% 감소 (379 → ~170 lines)
 */

// ============================================
// [섹션 1: Import]
// ============================================

import downloadManager, { DOWNLOAD_TYPES } from '../../06.database/12_download_manager.js';
import { showToast } from '../../01.common/14_toast.js';
import downloadHelper from '../../01.common/helpers/download_helper.js';
import logger from '../../01.common/23_logger.js';

// ============================================
// [섹션 2: 다운로드 옵션 모달]
// ============================================

/**
 * [함수: 다운로드 옵션 모달 표시]
 * download_helper를 사용한 간소화된 Modal 생성
 * 다운로드 타입에 따라 다른 정보 표시 (additionalContent 사용)
 *
 * @param {string} type - 'all' (전체), 'selected' (선택), 'filtered' (필터링)
 * @param {Array} selectedReports - 선택된 보고서 ID 배열
 * @returns {Promise<Object|null>} 선택된 옵션 or null (취소 시)
 */
async function showDownloadOptionsModal(type = 'all', selectedReports = []) {
    // 다운로드 타입 정보 HTML (additionalContent)
    const typeInfoHTML = `
        <div class="option-group glass-card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; margin-bottom: 20px; border-radius: 12px;">
            <h3 style="margin: 0 0 10px 0; font-size: 1.2em;">
                ${type === 'all' ? '📋 전체 보고서 다운로드' :
                  type === 'selected' ? '☑️ 선택된 보고서 다운로드' :
                  '🔍 필터링된 보고서 다운로드'}
            </h3>
            <p style="margin: 0; opacity: 0.9; font-size: 0.95em;">
                ${type === 'all' ? '시스템의 모든 보고서를 다운로드합니다.' :
                  type === 'selected' ? `선택된 ${selectedReports.length}개의 보고서를 다운로드합니다.` :
                  '현재 필터 조건에 해당하는 보고서를 다운로드합니다.'}
            </p>
        </div>
    `;

    // 통합 다운로드 옵션 Modal 생성 (helper 사용)
    const options = await downloadHelper.createDownloadOptionsModal({
        title: '보고서 다운로드 옵션',
        icon: '📥',
        showDateRange: true,
        showQuickPeriod: false,  // Reports는 빠른 기간 선택 불필요
        sheets: [
            {
                id: 'include-reports',
                label: '방문보고서_전체',
                description: '전체 방문보고서 내용 (필수)',
                checked: true,
                disabled: true
            },
            {
                id: 'include-stats',
                label: '담당자별통계',
                description: '작성자별 보고서 수, 매출액, 수금액 통계',
                checked: true,
                disabled: false
            },
            {
                id: 'include-status',
                label: '승인 상태별 분류',
                description: '대기중, 승인, 반려 시트로 분리',
                checked: false,
                disabled: false
            }
        ],
        additionalContent: typeInfoHTML,
        defaultStartDate: downloadHelper.getDefaultStartDate(false),  // 올해 1월 1일
        defaultEndDate: downloadHelper.getDefaultEndDate(false)       // 오늘
    });

    // 사용자가 취소한 경우
    if (!options) return null;

    // 승인 상태별 분류 처리
    const includeStatus = options.selectedSheets.includes('승인 상태별 분류');
    if (includeStatus) {
        // '승인 상태별 분류' 대신 '대기중', '승인', '반려' 시트 추가
        const index = options.selectedSheets.indexOf('승인 상태별 분류');
        options.selectedSheets.splice(index, 1, '대기중', '승인', '반려');
    }

    return {
        type: type,
        selectedReports: selectedReports,
        userName: options.userName,
        userRole: options.userRole,
        includeSheets: options.selectedSheets,
        dateRange: options.dateRange
    };
}

// ============================================
// [섹션 3: 다운로드 함수들]
// ============================================

/**
 * [함수: 전체 보고서 다운로드]
 * 시스템의 모든 보고서를 다운로드
 */
export async function downloadAllReports() {
    // 옵션 선택
    const options = await showDownloadOptionsModal('all');
    if (!options) return;

    // 다운로드 실행 (helper의 execute 래퍼 사용)
    await downloadHelper.execute(async () => {
        return await downloadManager.download({
            downloadType: DOWNLOAD_TYPES.ADMIN_ALL_REPORTS,
            userRole: 'admin',
            userName: options.userName,
            includeSheets: options.includeSheets,
            dateRange: options.dateRange,
            format: 'excel'
        });
    }, {
        downloadType: 'ADMIN_ALL_REPORTS',
        userName: options.userName,
        showProgress: true,
        enableRetry: true
    });
}

/**
 * [함수: 선택 보고서 다운로드]
 * 사용자가 선택한 보고서만 다운로드
 *
 * @param {Set} selectedReports - 선택된 보고서 ID Set
 */
export async function downloadSelectedReports(selectedReports) {
    // 선택된 보고서가 없으면 경고
    if (!selectedReports || selectedReports.size === 0) {
        showToast('다운로드할 보고서를 선택해주세요', 'warning');
        return;
    }

    // 옵션 선택
    const reportIds = Array.from(selectedReports);
    const options = await showDownloadOptionsModal('selected', reportIds);
    if (!options) return;

    // 다운로드 실행 (helper의 execute 래퍼 사용)
    await downloadHelper.execute(async () => {
        return await downloadManager.download({
            downloadType: DOWNLOAD_TYPES.ADMIN_ALL_REPORTS,
            userRole: 'admin',
            userName: options.userName,
            includeSheets: options.includeSheets,
            dateRange: options.dateRange,
            filterReportIds: reportIds,  // 선택된 보고서만 필터링
            format: 'excel'
        });
    }, {
        downloadType: 'ADMIN_SELECTED_REPORTS',
        userName: options.userName,
        showProgress: true,
        enableRetry: true
    });
}

/**
 * [함수: 필터링된 보고서 다운로드]
 * 현재 필터 조건에 해당하는 보고서만 다운로드
 *
 * @param {Array} filteredReports - 필터링된 보고서 배열
 */
export async function downloadFilteredReports(filteredReports) {
    // 필터링된 보고서가 없으면 경고
    if (!filteredReports || filteredReports.length === 0) {
        showToast('다운로드할 보고서가 없습니다', 'warning');
        return;
    }

    // 옵션 선택
    const reportIds = filteredReports.map(r => r.reportId);
    const options = await showDownloadOptionsModal('filtered', reportIds);
    if (!options) return;

    // 다운로드 실행 (helper의 execute 래퍼 사용)
    await downloadHelper.execute(async () => {
        return await downloadManager.download({
            downloadType: DOWNLOAD_TYPES.ADMIN_ALL_REPORTS,
            userRole: 'admin',
            userName: options.userName,
            includeSheets: options.includeSheets,
            dateRange: options.dateRange,
            filterReportIds: reportIds,  // 필터링된 보고서만
            format: 'excel'
        });
    }, {
        downloadType: 'ADMIN_FILTERED_REPORTS',
        userName: options.userName,
        showProgress: true,
        enableRetry: true
    });
}

/**
 * [함수: 단일 보고서 다운로드]
 * 특정 보고서 하나만 다운로드
 *
 * @param {number} reportId - 보고서 ID
 */
export async function downloadSingleReport(reportId) {
    // 간단한 확인 (helper의 confirm 사용)
    const confirmed = await downloadHelper.confirm(
        '선택한 보고서를 다운로드하시겠습니까?',
        '📥 보고서 다운로드'
    );

    if (!confirmed) return;

    // 사용자 정보 가져오기
    const userInfo = downloadHelper.getUserInfo();
    if (!userInfo) return;

    // 다운로드 실행 (helper의 execute 래퍼 사용)
    await downloadHelper.execute(async () => {
        return await downloadManager.download({
            downloadType: DOWNLOAD_TYPES.ADMIN_ALL_REPORTS,
            userRole: 'admin',
            userName: userInfo.userName,
            filterReportIds: [reportId],
            format: 'excel'
        });
    }, {
        downloadType: 'ADMIN_SINGLE_REPORT',
        userName: userInfo.userName,
        showProgress: true,
        enableRetry: true
    });
}

// ============================================
// [섹션 4: Export]
// ============================================

export default {
    downloadAllReports,
    downloadSelectedReports,
    downloadFilteredReports,
    downloadSingleReport
};
