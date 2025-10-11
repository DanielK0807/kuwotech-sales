/**
 * ============================================
 * KUWOTECH 영업관리 시스템 - 영업담당 통합 데이터 다운로드
 * ============================================
 *
 * @파일명: 03_integrated_download.js
 * @작성자: System
 * @작성일: 2025-09-30
 * @수정일: 2025-10-11
 * @버전: 2.0
 *
 * @설명:
 * 영업담당자의 모든 데이터를 통합하여 다운로드하는 기능
 * 거래처, 보고서, 실적 데이터를 하나의 파일로 제공
 *
 * @변경사항 (v2.0):
 * - download_helper.js의 UI 컴포넌트 함수 사용
 * - 중복 코드 제거 (Modal HTML 생성, 173 lines 인라인 CSS, 인라인 스크립트)
 * - additionalContent로 데이터 타입 선택 및 추가 옵션 구현
 * - 날짜 유틸리티 함수 제거 (downloadHelper 사용)
 * - 코드 라인 수 48% 감소 (555 → 290 lines)
 */

// ============================================
// [SECTION: Import]
// ============================================

import downloadManager, { DOWNLOAD_TYPES } from '../../06.database/12_download_manager.js';
import { showToast } from '../../01.common/14_toast.js';
import downloadHelper from '../../01.common/helpers/download_helper.js';
import logger from '../../01.common/23_logger.js';

// ============================================
// [SECTION: 통합 다운로드 초기화]
// ============================================

/**
 * [함수: 통합 다운로드 버튼 초기화]
 */
export function initIntegratedDownload() {
    
    // 빠른 다운로드 카드 이벤트
    setupQuickDownloadCards();
    
    // 전체 다운로드 버튼 이벤트
    const allDownloadBtn = document.getElementById('btn-download-all');
    if (allDownloadBtn) {
        allDownloadBtn.addEventListener('click', showIntegratedDownloadOptions);
    }
}

// ============================================
// [SECTION: 빠른 다운로드 카드]
// ============================================

/**
 * [함수: 빠른 다운로드 카드 설정]
 */
function setupQuickDownloadCards() {
    // 내 거래처 다운로드
    const companiesCard = document.querySelector('[data-download-type="companies"]');
    if (companiesCard) {
        companiesCard.addEventListener('click', () => quickDownload('companies'));
    }
    
    // 내 보고서 다운로드
    const reportsCard = document.querySelector('[data-download-type="reports"]');
    if (reportsCard) {
        reportsCard.addEventListener('click', () => quickDownload('reports'));
    }
    
    // 내 실적 다운로드
    const kpiCard = document.querySelector('[data-download-type="kpi"]');
    if (kpiCard) {
        kpiCard.addEventListener('click', () => quickDownload('kpi'));
    }
}

/**
 * [함수: 빠른 다운로드 실행]
 *
 * @param {string} type - 다운로드 타입 ('companies' | 'reports' | 'kpi')
 */
async function quickDownload(type) {
    // 사용자 정보 가져오기 (헬퍼 사용)
    const userInfo = downloadHelper.getUserInfo();
    if (!userInfo) return;

    let downloadType;
    let typeName;

    switch (type) {
        case 'companies':
            downloadType = DOWNLOAD_TYPES.SALES_COMPANIES;
            typeName = '거래처 정보';
            break;
        case 'reports':
            downloadType = DOWNLOAD_TYPES.SALES_REPORTS;
            typeName = '보고서';
            break;
        case 'kpi':
            downloadType = DOWNLOAD_TYPES.SALES_KPI;
            typeName = '실적 데이터';
            break;
        default:
            return;
    }

    // 이번 달 날짜 범위 (헬퍼 사용)
    const dateRange = {
        start: downloadHelper.getDefaultStartDate(true),
        end: downloadHelper.getDefaultEndDate(true)
    };

    // 다운로드 실행 (헬퍼의 execute 래퍼 사용)
    await downloadHelper.execute(async () => {
        return await downloadManager.download({
            downloadType: downloadType,
            userRole: userInfo.userRole,
            userName: userInfo.userName,
            format: 'excel',
            dateRange: dateRange
        });
    }, {
        downloadType: type.toUpperCase(),
        userName: userInfo.userName,
        showProgress: true
    });
}

// ============================================
// [SECTION: 통합 다운로드 옵션 모달]
// ============================================

/**
 * [함수: 통합 다운로드 옵션 모달]
 * download_helper를 사용한 간소화된 Modal 생성
 * 데이터 타입 선택 및 추가 옵션은 additionalContent로 구현
 */
async function showIntegratedDownloadOptions() {
    const userInfo = downloadHelper.getUserInfo();
    if (!userInfo) return;

    const today = new Date().toLocaleDateString('ko-KR');

    // 데이터 타입 선택 및 추가 옵션 HTML (additionalContent)
    const additionalOptionsHTML = `
        <!-- 포함할 데이터 타입 -->
        <div class="option-group glass-card">
            <h3>📦 포함할 데이터</h3>
            <div class="data-type-options" style="display: flex; flex-direction: column; gap: 12px;">
                <label class="data-type-option" style="display: flex; align-items: center; gap: 12px; padding: 15px; border: 2px solid var(--glass-border); border-radius: 10px; background: white;">
                    <input type="checkbox" id="include-companies" checked disabled style="width: 20px; height: 20px;">
                    <span style="font-size: 32px;">🏢</span>
                    <div style="flex: 1;">
                        <div style="font-weight: 600;">내 거래처 정보</div>
                        <small style="color: var(--text-secondary);">담당 거래처 19개 필드 (필수)</small>
                    </div>
                </label>

                <label class="data-type-option" style="display: flex; align-items: center; gap: 12px; padding: 15px; border: 2px solid var(--glass-border); border-radius: 10px; background: white; cursor: pointer;">
                    <input type="checkbox" id="include-reports" checked style="width: 20px; height: 20px; cursor: pointer;">
                    <span style="font-size: 32px;">📋</span>
                    <div style="flex: 1;">
                        <div style="font-weight: 600;">방문 보고서</div>
                        <small style="color: var(--text-secondary);">작성한 보고서 전체</small>
                    </div>
                </label>

                <label class="data-type-option" style="display: flex; align-items: center; gap: 12px; padding: 15px; border: 2px solid var(--glass-border); border-radius: 10px; background: white; cursor: pointer;">
                    <input type="checkbox" id="include-kpi" checked style="width: 20px; height: 20px; cursor: pointer;">
                    <span style="font-size: 32px;">📊</span>
                    <div style="flex: 1;">
                        <div style="font-weight: 600;">영업 실적</div>
                        <small style="color: var(--text-secondary);">KPI 및 거래처별 상세</small>
                    </div>
                </label>
            </div>
        </div>

        <!-- 추가 옵션 -->
        <div class="option-group glass-card">
            <h3>⚙️ 추가 옵션</h3>
            <div class="additional-options">
                <label class="checkbox-label">
                    <input type="checkbox" id="include-summary" checked>
                    <span class="checkbox-text">
                        <strong>요약 정보 포함</strong>
                        <small>데이터 요약 시트 추가</small>
                    </span>
                </label>
                <label class="checkbox-label">
                    <input type="checkbox" id="include-charts">
                    <span class="checkbox-text">
                        <strong>차트 이미지 포함</strong>
                        <small>시각화 차트 추가 (실험적 기능)</small>
                    </span>
                </label>
            </div>
        </div>

        <!-- 통합 다운로드 안내 -->
        <div class="option-group glass-card" style="background: rgba(0, 151, 167, 0.05); border: 1px solid var(--primary-color);">
            <h3>ℹ️ 통합 다운로드 안내</h3>
            <p><strong>${userInfo.userName}님의 영업 데이터</strong></p>
            <p>다운로드 날짜: <strong>${today}</strong></p>
            <p style="color: var(--text-secondary); font-size: 0.9em; margin-top: 10px;">
                ※ 선택한 모든 데이터를 하나의 엑셀 파일에 담습니다.<br>
                ※ 각 데이터는 별도의 시트로 구분되어 제공됩니다.
            </p>
        </div>
    `;

    // 통합 다운로드 옵션 Modal 생성 (헬퍼 사용)
    const options = await downloadHelper.createDownloadOptionsModal({
        title: '영업 데이터 통합 다운로드',
        icon: '📦',
        showDateRange: true,
        showQuickPeriod: true,
        sheets: [],  // 데이터 타입은 additionalContent로 처리
        additionalContent: additionalOptionsHTML,
        defaultStartDate: downloadHelper.getDefaultStartDate(false),  // 전체 기간 (년 초)
        defaultEndDate: downloadHelper.getDefaultEndDate(true)         // 이번 달 마지막
    });

    // 사용자가 취소한 경우
    if (!options) return;

    // 선택된 데이터 타입 및 추가 옵션 가져오기
    const includeCompanies = true; // 필수
    const includeReports = document.getElementById('include-reports')?.checked || false;
    const includeKPI = document.getElementById('include-kpi')?.checked || false;
    const includeSummary = document.getElementById('include-summary')?.checked || false;
    const includeCharts = document.getElementById('include-charts')?.checked || false;

    // 다운로드 실행
    await executeIntegratedDownload({
        userInfo: options,
        includeCompanies,
        includeReports,
        includeKPI,
        includeSummary,
        includeCharts,
        dateRange: options.dateRange
    });
}

// ============================================
// [SECTION: 통합 다운로드 실행]
// ============================================

/**
 * [함수: 통합 다운로드 실행]
 *
 * @param {Object} options - 다운로드 옵션
 */
async function executeIntegratedDownload(options = {}) {
    const { userInfo, includeCompanies, includeReports, includeKPI, includeSummary, includeCharts, dateRange } = options;

    // 포함할 시트 결정
    const includeSheets = [];
    if (includeCompanies) includeSheets.push('기본정보');
    if (includeReports) includeSheets.push('방문보고서');
    if (includeKPI) includeSheets.push('영업실적');

    // 다운로드 실행 (헬퍼의 execute 래퍼 사용)
    await downloadHelper.execute(async () => {
        return await downloadManager.download({
            downloadType: DOWNLOAD_TYPES.SALES_ALL,
            userRole: userInfo.userRole,
            userName: userInfo.userName,
            format: 'excel',
            includeSheets: includeSheets,
            dateRange: dateRange,
            includeSummary: includeSummary,
            includeCharts: includeCharts
        });
    }, {
        downloadType: 'SALES_ALL',
        userName: userInfo.userName,
        showProgress: true,
        enableRetry: true
    });
}

// ============================================
// [SECTION: Export]
// ============================================

export default {
    initIntegratedDownload,
    showIntegratedDownloadOptions,
    quickDownload,
    executeIntegratedDownload
};
