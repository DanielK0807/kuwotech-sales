/**
 * ============================================
 * KUWOTECH 영업관리 시스템 - 보고서 승인 다운로드
 * ============================================
 * 
 * @파일명: 03_download.js
 * @폴더: 04.admin_mode/03_report_confirm
 * @작성자: System
 * @작성일: 2025-09-30
 * @버전: 1.0
 * 
 * @설명:
 * 관리자 보고서 승인 페이지에서 보고서를 엑셀로 다운로드하는 기능
 * 
 * @주요기능:
 * - 전체 보고서 다운로드
 * - 선택 보고서 다운로드
 * - 필터링된 보고서 다운로드
 * - 담당자별 통계 포함
 */

// ============================================
// [섹션 1: Import]
// ============================================

import downloadManager, { DOWNLOAD_TYPES } from '../../06.database/12_download_manager.js';
import { showToast } from '../../01.common/14_toast.js';
import Modal from '../../01.common/06_modal.js';
import logger from '../../01.common/23_logger.js';

// ============================================
// [섹션 2: 다운로드 옵션 모달]
// ============================================

/**
 * [함수: 다운로드 옵션 모달 표시]
 * 다운로드 전에 사용자에게 옵션을 선택하도록 함
 * 
 * @param {string} type - 'all' (전체), 'selected' (선택), 'filtered' (필터링)
 * @param {Array} selectedReports - 선택된 보고서 ID 배열 (type='selected'인 경우)
 * @returns {Promise<Object>} 선택된 옵션
 */
function showDownloadOptionsModal(type = 'all', selectedReports = []) {
    return new Promise((resolve) => {
        const modal = new Modal({
            size: 'md',
            title: '📥 다운로드 옵션',
            content: `
                <div class="download-options-container">

                    <!-- 다운로드 타입 정보 -->
                    <div class="download-type-info">
                        <h4>
                            ${type === 'all' ? '📋 전체 보고서 다운로드' :
                              type === 'selected' ? '☑️ 선택된 보고서 다운로드' :
                              '🔍 필터링된 보고서 다운로드'}
                        </h4>
                        <p>
                            ${type === 'all' ? '시스템의 모든 보고서를 다운로드합니다.' :
                              type === 'selected' ? `선택된 ${selectedReports.length}개의 보고서를 다운로드합니다.` :
                              '현재 필터 조건에 해당하는 보고서를 다운로드합니다.'}
                        </p>
                    </div>
                    
                    <!-- 포함할 시트 선택 -->
                    <div class="sheet-selection">
                        <h4>포함할 데이터</h4>

                        <label class="option-item">
                            <input type="checkbox" id="include-reports" checked disabled>
                            <div>
                                <strong>보고서 데이터</strong>
                                <p>
                                    전체 방문보고서 내용 (필수)
                                </p>
                            </div>
                        </label>

                        <label class="option-item">
                            <input type="checkbox" id="include-stats" checked>
                            <div>
                                <strong>담당자별 통계</strong>
                                <p>
                                    작성자별 보고서 수, 매출액, 수금액 통계
                                </p>
                            </div>
                        </label>

                        <label class="option-item">
                            <input type="checkbox" id="include-status">
                            <div>
                                <strong>승인 상태별 분류</strong>
                                <p>
                                    대기중, 승인, 반려 시트로 분리
                                </p>
                            </div>
                        </label>
                    </div>
                    
                    <!-- 날짜 범위 선택 -->
                    <div class="date-range-selection">
                        <h4>기간 설정</h4>
                        <div class="grid-2col gap-md">
                            <div>
                                <label>시작일</label>
                                <input type="date" id="download-start-date" class="glass-input w-full"
                                       value="${getDefaultStartDate()}">
                            </div>
                            <div>
                                <label>종료일</label>
                                <input type="date" id="download-end-date" class="glass-input w-full"
                                       value="${getDefaultEndDate()}">
                            </div>
                        </div>
                    </div>
                    
                    <!-- 파일명 미리보기 -->
                    <div class="filename-preview">
                        <strong>📄 파일명:</strong>
                        <p id="filename-preview">
                            방문보고서_전체_${new Date().getFullYear()}.xlsx
                        </p>
                    </div>
                    
                </div>
            `,
            buttons: [
                {
                    text: '취소',
                    className: 'btn-secondary',
                    onClick: () => {
                        resolve(null);
                        return true;
                    }
                },
                {
                    text: '다운로드',
                    className: 'btn-primary',
                    onClick: () => {
                        const options = {
                            type: type,
                            selectedReports: selectedReports,
                            includeSheets: [],
                            includeStats: document.getElementById('include-stats').checked,
                            includeStatus: document.getElementById('include-status').checked,
                            dateRange: {
                                start: document.getElementById('download-start-date').value,
                                end: document.getElementById('download-end-date').value
                            }
                        };
                        
                        // 시트 목록 구성
                        options.includeSheets.push('방문보고서_전체');
                        if (options.includeStats) {
                            options.includeSheets.push('담당자별통계');
                        }
                        if (options.includeStatus) {
                            options.includeSheets.push('대기중', '승인', '반려');
                        }
                        
                        resolve(options);
                        return true;
                    }
                }
            ]
        });
        
        modal.open();
    });
}

/**
 * [함수: 기본 시작일 계산]
 * 올해 1월 1일 반환
 */
function getDefaultStartDate() {
    const now = new Date();
    return `${now.getFullYear()}-01-01`;
}

/**
 * [함수: 기본 종료일 계산]
 * 오늘 날짜 반환
 */
function getDefaultEndDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// ============================================
// [섹션 3: 다운로드 함수들]
// ============================================

/**
 * [함수: 전체 보고서 다운로드]
 * 시스템의 모든 보고서를 다운로드
 * 
 * @export
 */
export async function downloadAllReports() {
    try {
        // 옵션 선택
        const options = await showDownloadOptionsModal('all');
        if (!options) return; // 사용자가 취소
        
        // 다운로드 실행
        const result = await downloadManager.download({
            downloadType: DOWNLOAD_TYPES.ADMIN_ALL_REPORTS,
            userRole: 'admin',
            userName: sessionStorage.getItem('userName'),
            includeSheets: options.includeSheets,
            dateRange: options.dateRange,
            format: 'excel'
        });
        
        if (result.success) {
        }
        
    } catch (error) {
        logger.error('[다운로드 실패] 전체 보고서:', error);
        showToast('다운로드 실패: ' + error.message, 'error');
    }
}

/**
 * [함수: 선택 보고서 다운로드]
 * 사용자가 선택한 보고서만 다운로드
 * 
 * @param {Set} selectedReports - 선택된 보고서 ID Set
 * @export
 */
export async function downloadSelectedReports(selectedReports) {
    try {
        // 선택된 보고서가 없으면 경고
        if (!selectedReports || selectedReports.size === 0) {
            showToast('다운로드할 보고서를 선택해주세요', 'warning');
            return;
        }
        
        // 옵션 선택
        const reportIds = Array.from(selectedReports);
        const options = await showDownloadOptionsModal('selected', reportIds);
        if (!options) return; // 사용자가 취소
        
        // 다운로드 실행 (선택된 보고서만 필터링하도록 확장)
        const result = await downloadManager.download({
            downloadType: DOWNLOAD_TYPES.ADMIN_ALL_REPORTS,
            userRole: 'admin',
            userName: sessionStorage.getItem('userName'),
            includeSheets: options.includeSheets,
            dateRange: options.dateRange,
            filterReportIds: reportIds, // 선택된 보고서만 필터링
            format: 'excel'
        });
        
        if (result.success) {
        }
        
    } catch (error) {
        logger.error('[다운로드 실패] 선택 보고서:', error);
        showToast('다운로드 실패: ' + error.message, 'error');
    }
}

/**
 * [함수: 필터링된 보고서 다운로드]
 * 현재 필터 조건에 해당하는 보고서만 다운로드
 * 
 * @param {Array} filteredReports - 필터링된 보고서 배열
 * @export
 */
export async function downloadFilteredReports(filteredReports) {
    try {
        // 필터링된 보고서가 없으면 경고
        if (!filteredReports || filteredReports.length === 0) {
            showToast('다운로드할 보고서가 없습니다', 'warning');
            return;
        }
        
        // 옵션 선택
        const reportIds = filteredReports.map(r => r.reportId);
        const options = await showDownloadOptionsModal('filtered', reportIds);
        if (!options) return; // 사용자가 취소
        
        // 다운로드 실행
        const result = await downloadManager.download({
            downloadType: DOWNLOAD_TYPES.ADMIN_ALL_REPORTS,
            userRole: 'admin',
            userName: sessionStorage.getItem('userName'),
            includeSheets: options.includeSheets,
            dateRange: options.dateRange,
            filterReportIds: reportIds, // 필터링된 보고서만
            format: 'excel'
        });
        
        if (result.success) {
        }
        
    } catch (error) {
        logger.error('[다운로드 실패] 필터링된 보고서:', error);
        showToast('다운로드 실패: ' + error.message, 'error');
    }
}

/**
 * [함수: 단일 보고서 다운로드]
 * 특정 보고서 하나만 다운로드
 * 
 * @param {number} reportId - 보고서 ID
 * @export
 */
export async function downloadSingleReport(reportId) {
    try {
        // 간단한 확인 모달
        const confirm = await new Promise((resolve) => {
            const modal = new Modal({
                size: 'sm',
                title: '📥 보고서 다운로드',
                content: `
                    <div class="p-lg text-center">
                        <p>선택한 보고서를 다운로드하시겠습니까?</p>
                    </div>
                `,
                buttons: [
                    {
                        text: '취소',
                        className: 'btn-secondary',
                        onClick: () => {
                            resolve(false);
                            return true;
                        }
                    },
                    {
                        text: '다운로드',
                        className: 'btn-primary',
                        onClick: () => {
                            resolve(true);
                            return true;
                        }
                    }
                ]
            });
            modal.open();
        });
        
        if (!confirm) return;
        
        // 다운로드 실행
        const result = await downloadManager.download({
            downloadType: DOWNLOAD_TYPES.ADMIN_ALL_REPORTS,
            userRole: 'admin',
            userName: sessionStorage.getItem('userName'),
            filterReportIds: [reportId],
            format: 'excel'
        });
        
        if (result.success) {
        }
        
    } catch (error) {
        logger.error('[다운로드 실패] 단일 보고서:', error);
        showToast('다운로드 실패: ' + error.message, 'error');
    }
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
