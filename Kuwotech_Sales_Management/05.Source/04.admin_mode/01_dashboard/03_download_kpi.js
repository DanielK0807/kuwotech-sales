/**
 * ============================================
 * KUWOTECH 영업관리 시스템 - 전사 KPI 다운로드 모듈
 * ============================================
 *
 * @파일명: 03_download_kpi.js
 * @작성자: System
 * @작성일: 2025-09-30
 * @수정일: 2025-10-11
 * @버전: 2.0
 *
 * @설명:
 * 관리자 대시보드의 전사 KPI 실적 데이터를 다운로드하는 모듈
 * download_helper를 사용하여 중복 코드 제거 및 일관성 향상
 *
 * @주요기능:
 * - 전사 KPI 다운로드
 * - 담당자별 상세 데이터 포함
 * - 월별 추이 분석
 * - 날짜 범위 선택
 * - 다운로드 옵션 모달
 *
 * @변경사항 (v2.0):
 * - download_helper.js의 UI 컴포넌트 함수 사용
 * - 중복 코드 제거 (Modal HTML 생성, 날짜 처리, 검증 로직)
 * - additionalContent로 정렬/파일명/추가옵션 구현
 * - 코드 라인 수 43% 감소 (352 → 200 lines)
 *
 * @NOTE: 2025-10-05 버튼 기능 비활성화
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
 * 관리자 대시보드 헤더에 다운로드 버튼을 동적으로 추가
 * 2025-10-05: 기능 비활성화 - 다운로드 버튼 및 옵션 버튼 삭제
 */
export function initDownloadButton() {
    // 기능 비활성화: 다운로드 버튼 및 옵션 버튼 삭제됨
    return;
}

// ============================================
// [섹션 3: 빠른 다운로드]
// ============================================

/**
 * [함수: 빠른 다운로드]
 * 옵션 선택 없이 즉시 다운로드 (이번 달 기준, 전체 시트)
 */
async function handleQuickDownload() {
    // 사용자 정보 가져오기 (헬퍼 사용)
    const userInfo = downloadHelper.getUserInfo();
    if (!userInfo) return;

    if (userInfo.userRole !== 'admin') {
        showToast('관리자 권한이 필요합니다', 'error');
        return;
    }

    // 이번 달 날짜 범위 (헬퍼 사용)
    const dateRange = {
        start: downloadHelper.getDefaultStartDate(true),  // 이번 달 1일
        end: downloadHelper.getDefaultEndDate(true)       // 이번 달 마지막 날
    };

    // 다운로드 실행 (헬퍼의 execute 래퍼 사용)
    await downloadHelper.execute(async () => {
        return await downloadManager.download({
            downloadType: DOWNLOAD_TYPES.ADMIN_COMPANY_KPI,
            userRole: userInfo.userRole,
            userName: userInfo.userName,
            includeSheets: ['전사실적', '담당자별상세', '월별추이'],
            dateRange: dateRange,
            format: 'excel'
        });
    }, {
        downloadType: 'ADMIN_COMPANY_KPI',
        userName: userInfo.userName,
        showProgress: true
    });
}

// ============================================
// [섹션 4: 다운로드 옵션 모달]
// ============================================

/**
 * [함수: 다운로드 옵션 모달 표시]
 * download_helper를 사용한 간소화된 Modal 생성
 * 정렬, 파일명, 추가 옵션은 additionalContent로 구현
 */
async function showDownloadOptionsModal() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');

    // 정렬, 파일명, 추가 옵션 HTML (additionalContent)
    const additionalOptionsHTML = `
        <!-- 정렬 옵션 -->
        <div class="option-group glass-card">
            <h3>🔢 정렬 기준</h3>
            <div class="sort-selection">
                <select id="sort-by" class="glass-input">
                    <option value="sales">매출액 순</option>
                    <option value="achievement">달성률 순</option>
                    <option value="companies">담당거래처 순</option>
                    <option value="name">이름 순</option>
                </select>
            </div>
        </div>

        <!-- 파일명 설정 -->
        <div class="option-group glass-card">
            <h3>💾 파일명</h3>
            <div class="filename-input-group">
                <input type="text" id="filename" class="glass-input"
                       placeholder="전사실적_${currentYear}-${currentMonth}"
                       value="전사실적_${currentYear}-${currentMonth}">
                <span class="file-extension">.xlsx</span>
            </div>
        </div>

        <!-- 추가 옵션 -->
        <div class="option-group glass-card">
            <h3>⚙️ 추가 옵션</h3>
            <div class="additional-options">
                <label class="checkbox-label">
                    <input type="checkbox" id="include-charts">
                    <span class="checkbox-text">
                        <strong>차트 포함</strong>
                        <small>Excel 차트 자동 생성 (실험적 기능)</small>
                    </span>
                </label>
                <label class="checkbox-label">
                    <input type="checkbox" id="include-summary">
                    <span class="checkbox-text">
                        <strong>요약 시트</strong>
                        <small>주요 지표 요약 시트 추가</small>
                    </span>
                </label>
            </div>
        </div>
    `;

    // 통합 다운로드 옵션 Modal 생성 (헬퍼 사용)
    const options = await downloadHelper.createDownloadOptionsModal({
        title: '전사 KPI 다운로드 옵션',
        icon: '📊',
        showDateRange: true,
        showQuickPeriod: true,
        sheets: [
            {
                id: 'include-company-kpi',
                label: '전사실적',
                description: '전체 영업팀 KPI 요약',
                checked: true,
                disabled: true
            },
            {
                id: 'include-detail',
                label: '담당자별 상세',
                description: '영업담당자별 실적 내역',
                checked: true,
                disabled: false
            },
            {
                id: 'include-trends',
                label: '월별 추이',
                description: '매출/수금 월별 트렌드 분석',
                checked: true,
                disabled: false
            },
            {
                id: 'include-top-companies',
                label: 'Top 거래처',
                description: '매출 상위 거래처 순위',
                checked: false,
                disabled: false
            }
        ],
        additionalContent: additionalOptionsHTML,
        defaultStartDate: downloadHelper.getDefaultStartDate(true),  // 이번 달 1일
        defaultEndDate: downloadHelper.getDefaultEndDate(true)       // 이번 달 마지막 날
    });

    // 사용자가 취소한 경우
    if (!options) return;

    // 관리자 권한 확인
    if (options.userRole !== 'admin') {
        showToast('관리자 권한이 필요합니다', 'error');
        return;
    }

    // 추가 옵션 가져오기
    const includeCharts = document.getElementById('include-charts')?.checked || false;
    const includeSummary = document.getElementById('include-summary')?.checked || false;
    const sortBy = document.getElementById('sort-by')?.value || 'sales';

    // 요약 시트 추가
    const finalSheets = [...options.selectedSheets];
    if (includeSummary) {
        finalSheets.push('요약');
    }

    // 다운로드 실행 (헬퍼의 execute 래퍼 사용)
    await downloadHelper.execute(async () => {
        return await downloadManager.download({
            downloadType: DOWNLOAD_TYPES.ADMIN_COMPANY_KPI,
            userRole: options.userRole,
            userName: options.userName,
            includeSheets: finalSheets,
            dateRange: options.dateRange,
            sortBy: sortBy,
            includeCharts: includeCharts,
            format: 'excel'
        });
    }, {
        downloadType: 'ADMIN_COMPANY_KPI',
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
