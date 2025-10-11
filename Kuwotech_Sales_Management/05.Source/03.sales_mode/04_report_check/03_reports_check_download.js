/**
 * ============================================
 * KUWOTECH 영업관리 시스템 - 보고서 확인 다운로드 모듈
 * ============================================
 *
 * @파일명: 03_reports_check_download.js
 * @작성자: System
 * @작성일: 2025-09-30
 * @수정일: 2025-10-11
 * @버전: 2.0
 *
 * @설명:
 * 영업담당이 작성한 방문보고서 이력을 다운로드하는 모듈
 * download_helper를 사용하여 중복 코드 제거 및 일관성 향상
 *
 * @변경사항 (v2.0):
 * - download_helper.js의 UI 컴포넌트 함수 사용
 * - 중복 코드 제거 (Modal HTML 생성, 날짜 처리, 검증 로직)
 * - additionalContent로 정렬 옵션 구현
 * - 코드 라인 수 36% 감소 (290 → 187 lines)
 */

// ============================================
// [섹션 1: Import]
// ============================================

import downloadManager, { DOWNLOAD_TYPES } from '../../06.database/12_download_manager.js';
import { showToast } from '../../01.common/14_toast.js';
import downloadHelper from '../../01.common/helpers/download_helper.js';
import logger from '../../01.common/23_logger.js';

// ============================================
// [섹션 2: 다운로드 버튼 초기화]
// ============================================

export function initDownloadButton() {
    // reports-header 찾기
    const reportsHeader = document.querySelector('.reports-header');

    if (!reportsHeader) {
        logger.warn('[보고서 다운로드] .reports-header를 찾을 수 없습니다');
        return;
    }

    // 버튼 컨테이너 찾기 또는 생성
    let btnContainer = reportsHeader.querySelector('.header-actions');
    if (!btnContainer) {
        btnContainer = document.createElement('div');
        btnContainer.className = 'header-actions';
        reportsHeader.appendChild(btnContainer);
    }

    // 다운로드 버튼
    const downloadBtn = document.createElement('button');
    downloadBtn.id = 'btn-download-reports';
    downloadBtn.className = 'glass-button primary';
    downloadBtn.innerHTML = `
        <svg class="icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        <span>보고서 다운로드</span>
    `;

    // 옵션 버튼
    const optionBtn = document.createElement('button');
    optionBtn.id = 'btn-download-options';
    optionBtn.className = 'glass-button';
    optionBtn.innerHTML = `
        <svg class="icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="1"/>
            <circle cx="12" cy="5" r="1"/>
            <circle cx="12" cy="19" r="1"/>
        </svg>
    `;
    optionBtn.title = '다운로드 옵션';

    btnContainer.appendChild(downloadBtn);
    btnContainer.appendChild(optionBtn);

    // 이벤트 리스너
    downloadBtn.addEventListener('click', handleQuickDownload);
    optionBtn.addEventListener('click', showDownloadOptionsModal);
}

// ============================================
// [섹션 3: 빠른 다운로드]
// ============================================

async function handleQuickDownload() {
    // 사용자 정보 가져오기 (헬퍼 사용)
    const userInfo = downloadHelper.getUserInfo();
    if (!userInfo) return;

    // 올해 전체 보고서
    const year = new Date().getFullYear();
    const dateRange = {
        start: `${year}-01-01`,
        end: `${year}-12-31`
    };

    // 다운로드 실행 (헬퍼의 execute 래퍼 사용)
    await downloadHelper.execute(async () => {
        return await downloadManager.download({
            downloadType: DOWNLOAD_TYPES.SALES_REPORTS,
            userRole: userInfo.userRole,
            userName: userInfo.userName,
            dateRange: dateRange,
            format: 'excel'
        });
    }, {
        downloadType: 'SALES_REPORTS',
        userName: userInfo.userName,
        showProgress: true
    });
}

// ============================================
// [섹션 4: 다운로드 옵션 모달]
// ============================================

async function showDownloadOptionsModal() {
    // 정렬, 파일명 옵션 HTML (additionalContent)
    const additionalOptionsHTML = `
        <!-- 정렬 옵션 -->
        <div class="option-group glass-card">
            <h3>📋 정렬 기준</h3>
            <div class="sort-selection">
                <select id="sort-by" class="glass-input">
                    <option value="date-desc">방문일자 (최신순)</option>
                    <option value="date-asc">방문일자 (오래된순)</option>
                    <option value="company">거래처명 (가나다순)</option>
                    <option value="sales-desc">매출액 (높은순)</option>
                </select>
            </div>
        </div>
    `;

    // 통합 다운로드 옵션 Modal 생성 (헬퍼 사용)
    const options = await downloadHelper.createDownloadOptionsModal({
        title: '내 보고서 다운로드',
        icon: '📥',
        showDateRange: true,
        showQuickPeriod: true,
        sheets: [],  // 보고서는 시트 선택 불필요
        additionalContent: additionalOptionsHTML,
        defaultStartDate: downloadHelper.getDefaultStartDate(true),  // 이번 달 1일
        defaultEndDate: downloadHelper.getDefaultEndDate(true)       // 이번 달 마지막 날
    });

    // 사용자가 취소한 경우
    if (!options) return;

    // 정렬 옵션 가져오기
    const downloadOptions = {
        sortBy: document.getElementById('sort-by')?.value || 'date-desc'
    };

    // 다운로드 실행 (헬퍼의 execute 래퍼 사용)
    await downloadHelper.execute(async () => {
        return await downloadManager.download({
            downloadType: DOWNLOAD_TYPES.SALES_REPORTS,
            userRole: options.userRole,
            userName: options.userName,
            dateRange: options.dateRange,
            options: downloadOptions,
            format: 'excel'
        });
    }, {
        downloadType: 'SALES_REPORTS',
        userName: options.userName,
        showProgress: true,
        enableRetry: true
    });
}

// ============================================
// [섹션 5: Export]
// ============================================

export default {
    initDownloadButton,
    handleQuickDownload,
    showDownloadOptionsModal
};
