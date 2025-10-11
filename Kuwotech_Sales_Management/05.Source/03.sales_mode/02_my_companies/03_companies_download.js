/**
 * ============================================
 * KUWOTECH 영업관리 시스템 - 담당거래처 다운로드
 * ============================================
 * 
 * @파일명: 03_download.js
 * @작성자: Daniel.K
 * @작성일: 2025-09-30
 * @버전: 1.0
 * 
 * @설명:
 * 영업담당자의 담당거래처 데이터 다운로드 기능
 * 통합 다운로드 매니저를 사용하여 체계적인 다운로드 제공
 */

// ============================================
// [SECTION: Import]
// ============================================

import downloadManager, { DOWNLOAD_TYPES } from '../../06.database/12_download_manager.js';
import { showToast } from '../../01.common/14_toast.js';
import { showModal } from '../../01.common/06_modal.js';
import downloadHelper from '../../01.common/helpers/download_helper.js';

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
 * 사용자가 다운로드 형식과 옵션을 선택할 수 있는 모달
 */
async function showDownloadOptions() {
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    
    const modalContent = `
        <div class="download-options-container">
            <div class="download-option-section">
                <h4 class="section-title">📊 다운로드 형식</h4>
                <div class="format-options">
                    <label class="format-option glass-card">
                        <input type="radio" name="download-format" value="excel" checked>
                        <div class="format-icon">📊</div>
                        <div class="format-info">
                            <div class="format-name">Excel (엑셀)</div>
                            <div class="format-desc">거래처 정보를 엑셀 파일로 다운로드</div>
                        </div>
                    </label>
                    
                    <label class="format-option glass-card">
                        <input type="radio" name="download-format" value="csv">
                        <div class="format-icon">📄</div>
                        <div class="format-info">
                            <div class="format-name">CSV (텍스트)</div>
                            <div class="format-desc">쉼표로 구분된 데이터 파일</div>
                        </div>
                    </label>
                </div>
            </div>
            
            <div class="download-option-section">
                <h4 class="section-title">🎯 다운로드 옵션</h4>
                <div class="checkbox-options">
                    <label class="checkbox-option">
                        <input type="checkbox" id="include-all-fields" checked>
                        <span>모든 항목 포함 (19개 필드)</span>
                    </label>
                    
                    <label class="checkbox-option">
                        <input type="checkbox" id="include-summary">
                        <span>요약 정보 포함</span>
                    </label>
                    
                    <label class="checkbox-option">
                        <input type="checkbox" id="include-notes">
                        <span>비고 포함</span>
                    </label>
                </div>
            </div>
            
            <div class="download-info glass-card">
                <div class="info-icon">ℹ️</div>
                <div class="info-text">
                    <strong>${user.name || '사용자'}님</strong>의 담당거래처 데이터를 다운로드합니다.
                    <br>엑셀 형식은 19개 필드를 포함한 상세 정보를 제공합니다.
                </div>
            </div>
        </div>
        
        <style>
            .download-options-container {
                padding: 10px;
            }
            
            .download-option-section {
                margin-bottom: 25px;
            }
            
            .section-title {
                font-size: 16px;
                font-weight: 700;
                color: var(--text-primary);
                margin-bottom: 15px;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .format-options {
                display: grid;
                gap: 15px;
            }
            
            .format-option {
                display: flex;
                align-items: center;
                gap: 15px;
                padding: 20px;
                border-radius: 12px;
                border: 2px solid var(--glass-border);
                cursor: pointer;
                transition: all 0.3s ease;
            }
            
            .format-option:hover {
                border-color: var(--primary-color);
                background: rgba(0, 151, 167, 0.05);
                transform: translateX(5px);
            }
            
            .format-option input[type="radio"] {
                width: 20px;
                height: 20px;
                cursor: pointer;
            }
            
            .format-option input[type="radio"]:checked + .format-icon {
                transform: scale(1.2);
            }
            
            .format-icon {
                font-size: 36px;
                transition: transform 0.3s ease;
            }
            
            .format-info {
                flex: 1;
            }
            
            .format-name {
                font-size: 16px;
                font-weight: 600;
                color: var(--text-primary);
                margin-bottom: 4px;
            }
            
            .format-desc {
                font-size: 13px;
                color: var(--text-secondary);
            }
            
            .checkbox-options {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            
            .checkbox-option {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 12px 15px;
                background: rgba(0, 0, 0, 0.02);
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            
            .checkbox-option:hover {
                background: rgba(0, 151, 167, 0.05);
            }
            
            .checkbox-option input[type="checkbox"] {
                width: 18px;
                height: 18px;
                cursor: pointer;
            }
            
            .checkbox-option span {
                font-size: 14px;
                color: var(--text-primary);
            }
            
            .download-info {
                padding: 15px;
                display: flex;
                gap: 12px;
                background: rgba(0, 151, 167, 0.05);
                border: 1px solid var(--primary-color);
                border-radius: 10px;
                margin-top: 20px;
            }
            
            .info-icon {
                font-size: 24px;
                flex-shrink: 0;
            }
            
            .info-text {
                font-size: 13px;
                color: var(--text-secondary);
                line-height: 1.6;
            }
            
            .info-text strong {
                color: var(--primary-color);
            }
        </style>
    `;
    
    const result = await showModal({
        title: '📥 거래처 데이터 다운로드',
        content: modalContent,
        size: 'medium',
        buttons: [
            {
                text: '취소',
                type: 'secondary',
                onClick: () => false
            },
            {
                text: '다운로드',
                type: 'primary',
                onClick: async () => {
                    // 선택된 옵션 가져오기
                    const format = document.querySelector('input[name="download-format"]:checked')?.value || 'excel';
                    const includeAll = document.getElementById('include-all-fields')?.checked || false;
                    const includeSummary = document.getElementById('include-summary')?.checked || false;
                    const includeNotes = document.getElementById('include-notes')?.checked || false;
                    
                    // 다운로드 실행
                    await executeDownload(format, {
                        includeAll,
                        includeSummary,
                        includeNotes
                    });
                    
                    return true;
                }
            }
        ]
    });
}

// ============================================
// [SECTION: 다운로드 실행]
// ============================================

/**
 * [함수: 다운로드 실행]
 * 통합 다운로드 매니저를 사용하여 실제 다운로드 수행
 * 강화된 오류 처리, 로딩 UI, 로그 기록 포함
 * 
 * @param {string} format - 다운로드 형식 ('excel' | 'csv')
 * @param {Object} options - 다운로드 옵션
 */
async function executeDownload(format, options = {}) {
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    
    // 사용자 정보 확인
    if (!user.name) {
        showToast('사용자 정보를 찾을 수 없습니다.', 'error');
        return;
    }
    
    // 강화된 다운로드 헬퍼 사용
    const result = await downloadHelper.execute(
        async () => {
            // 실제 다운로드 로직
            return await downloadManager.download({
                downloadType: DOWNLOAD_TYPES.SALES_COMPANIES,
                userRole: 'sales',
                userName: user.name,
                format: format,
                includeSheets: options.includeAll ? ['기본정보'] : [],
                dateRange: null
            });
        },
        {
            downloadType: 'SALES_COMPANIES',
            userName: user.name,
            showProgress: true,
            enableRetry: true,
            onProgress: (percent, message) => {
            }
        }
    );
    
    // 결과 처리는 downloadHelper가 자동으로 처리
    return result;
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
    console.warn('[담당거래처] exportExcel() is deprecated. Use showDownloadOptions() instead.');
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
    executeDownload,
    exportExcel,
    importExcel
};
