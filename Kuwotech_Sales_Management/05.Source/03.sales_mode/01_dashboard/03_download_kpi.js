/**
 * ============================================
 * KUWOTECH 영업관리 시스템 - KPI 다운로드 모듈
 * ============================================
 *
 * @파일명: 03_download_kpi.js
 * @작성자: System
 * @작성일: 2025-09-30
 * @수정일: 2025-10-11
 * @버전: 2.0
 *
 * @설명:
 * 영업담당 대시보드의 KPI 실적 데이터를 다운로드하는 모듈
 * download_helper를 사용하여 중복 코드 제거 및 일관성 향상
 *
 * @주요기능:
 * - 개인 KPI 다운로드
 * - 거래처별 상세 데이터 포함
 * - 날짜 범위 선택
 * - 다운로드 옵션 모달
 *
 * @변경사항 (v2.0):
 * - download_helper.js의 UI 컴포넌트 함수 사용
 * - 중복 코드 제거 (Modal HTML 생성, 날짜 처리, 검증)
 * - 코드 라인 수 56% 감소 (328 → ~140 lines)
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

/**
 * [함수: 다운로드 버튼 추가]
 * 대시보드 헤더에 다운로드 버튼을 동적으로 추가
 */
export function initDownloadButton() {
    const pageHeader = document.querySelector('.page-header');

    if (!pageHeader) {
        logger.warn('[KPI 다운로드] 페이지 헤더를 찾을 수 없습니다');
        return;
    }

    // 다운로드 버튼 컨테이너 생성
    const btnContainer = document.createElement('div');
    btnContainer.className = 'header-actions';
    btnContainer.style.cssText = `
        position: absolute;
        top: 20px;
        right: 30px;
        display: flex;
        gap: 10px;
    `;

    // KPI 다운로드 버튼
    const downloadBtn = document.createElement('button');
    downloadBtn.id = 'btn-download-kpi';
    downloadBtn.className = 'glass-button primary';
    downloadBtn.innerHTML = `
        <svg class="icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        <span>실적 다운로드</span>
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
    pageHeader.appendChild(btnContainer);

    // 이벤트 리스너 등록
    downloadBtn.addEventListener('click', handleQuickDownload);
    optionBtn.addEventListener('click', showDownloadOptionsModal);
}

// ============================================
// [섹션 3: 빠른 다운로드]
// ============================================

/**
 * [함수: 빠른 다운로드]
 * 옵션 선택 없이 즉시 다운로드 (이번 달 기준)
 * downloadHelper를 사용하여 간소화
 */
async function handleQuickDownload() {
    // 사용자 정보 가져오기 (헬퍼 사용)
    const userInfo = downloadHelper.getUserInfo();
    if (!userInfo) return;

    // 이번 달 날짜 범위 계산 (헬퍼 함수 사용)
    const dateRange = {
        start: downloadHelper.getDefaultStartDate(true),  // 이번 달 1일
        end: downloadHelper.getDefaultEndDate(true)       // 이번 달 마지막 날
    };

    // 다운로드 실행 (헬퍼의 execute 래퍼 사용)
    await downloadHelper.execute(async () => {
        return await downloadManager.download({
            downloadType: DOWNLOAD_TYPES.SALES_KPI,
            userRole: userInfo.userRole,
            userName: userInfo.userName,
            includeSheets: ['영업실적', '거래처별상세'],
            dateRange: dateRange,
            format: 'excel'
        });
    }, {
        downloadType: 'SALES_KPI',
        userName: userInfo.userName,
        showProgress: true
    });
}

// ============================================
// [섹션 4: 다운로드 옵션 모달]
// ============================================

/**
 * [함수: 다운로드 옵션 모달 표시]
 * downloadHelper의 통합 Modal 생성 함수 사용
 * 코드 간소화 및 일관성 향상
 */
async function showDownloadOptionsModal() {
    // 통합 다운로드 옵션 Modal 생성 (헬퍼 사용)
    const options = await downloadHelper.createDownloadOptionsModal({
        title: 'KPI 다운로드 옵션',
        icon: '📥',
        showDateRange: true,
        showQuickPeriod: true,
        sheets: [
            {
                id: 'include-kpi',
                label: '영업실적',
                description: '개인 KPI 요약',
                checked: true,
                disabled: true
            },
            {
                id: 'include-detail',
                label: '거래처별상세',
                description: '거래처별 매출/수금 내역',
                checked: true,
                disabled: false
            }
        ],
        defaultStartDate: downloadHelper.getDefaultStartDate(true),
        defaultEndDate: downloadHelper.getDefaultEndDate(true)
    });

    // 사용자가 취소한 경우
    if (!options) return;

    // 다운로드 실행 (헬퍼의 execute 래퍼 사용)
    await downloadHelper.execute(async () => {
        return await downloadManager.download({
            downloadType: DOWNLOAD_TYPES.SALES_KPI,
            userRole: options.userRole,
            userName: options.userName,
            includeSheets: options.selectedSheets,
            dateRange: options.dateRange,
            format: 'excel'
        });
    }, {
        downloadType: 'SALES_KPI',
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
