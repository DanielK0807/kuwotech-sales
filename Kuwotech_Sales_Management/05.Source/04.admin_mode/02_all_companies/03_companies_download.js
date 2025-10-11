/**
 * ============================================
 * KUWOTECH 영업관리 시스템 - 전체거래처 다운로드 (관리자모드)
 * ============================================
 * 
 * @파일명: 03_companies_download.js
 * @작성자: Daniel.K
 * @작성일: 2025-01-27
 * @버전: 1.0
 * 
 * @설명:
 * 관리자의 전체거래처 데이터 다운로드 기능
 * 통합 다운로드 매니저를 사용하여 체계적인 다운로드 제공
 */

// ============================================
// [SECTION: Import]
// ============================================

import downloadManager, { DOWNLOAD_TYPES } from '../../06.database/12_download_manager.js';
import { showToast } from '../../01.common/14_toast.js';
import { showModal } from '../../01.common/06_modal.js';
import downloadHelper from '../../01.common/helpers/download_helper.js';
import { getCompanyDisplayName } from '../../01.common/02_utils.js';
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
                    
                    <label class="format-option glass-card">
                        <input type="radio" name="download-format" value="json">
                        <div class="format-icon">📝</div>
                        <div class="format-info">
                            <div class="format-name">JSON (개발용)</div>
                            <div class="format-desc">시스템 연동용 JSON 형식</div>
                        </div>
                    </label>
                </div>
            </div>
            
            <div class="download-option-section">
                <h4 class="section-title">⚙️ 다운로드 옵션</h4>
                <div class="download-options">
                    <label class="checkbox-option">
                        <input type="checkbox" id="include-all" checked>
                        <span>전체 거래처 포함</span>
                    </label>
                    <label class="checkbox-option">
                        <input type="checkbox" id="include-inactive">
                        <span>비활성 거래처 포함</span>
                    </label>
                    <label class="checkbox-option">
                        <input type="checkbox" id="include-summary" checked>
                        <span>요약 통계 포함</span>
                    </label>
                </div>
            </div>
            
            <div class="download-info glass-panel">
                <i class="info-icon">ℹ️</i>
                <span>다운로드할 데이터: 전체 거래처 정보</span>
            </div>
        </div>
    `;
    
    const result = await showModal({
        title: '📥 전체거래처 다운로드',
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
                    const format = document.querySelector('input[name="download-format"]:checked')?.value || 'excel';
                    const includeAll = document.getElementById('include-all')?.checked ?? true;
                    const includeInactive = document.getElementById('include-inactive')?.checked ?? false;
                    const includeSummary = document.getElementById('include-summary')?.checked ?? true;
                    
                    // 다운로드 실행
                    await executeDownload({
                        format,
                        includeAll,
                        includeInactive,
                        includeSummary
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
 * 선택된 옵션에 따라 다운로드 실행
 */
async function executeDownload(options) {
    try {
        
        // 현재 표시된 거래처 목록 가져오기
        let companies = window.allCompaniesModule?.companyList || [];
        
        // 필터 적용
        if (!options.includeAll) {
            // 필터된 데이터만 사용
            companies = companies.filter(c => {
                if (!options.includeInactive && c.businessStatus === '비활성') {
                    return false;
                }
                return true;
            });
        }
        
        if (companies.length === 0) {
            showToast('다운로드할 거래처 데이터가 없습니다.', 'warning');
            return;
        }
        
        // 다운로드 매니저 옵션 설정
        const downloadOptions = {
            format: options.format,
            filename: `전체거래처_${new Date().toISOString().split('T')[0]}`,
            columns: [
                { key: 'internalManager', label: '내부담당자' },
                { key: 'department', label: '담당부서' },
                { key: 'companyName', label: '거래처명' },
                { key: 'ceoOrDentist', label: '대표이사' },
                { key: 'customerRegion', label: '고객사 지역' },
                { key: 'businessStatus', label: '거래상태' },
                { key: 'salesProduct', label: '판매제품' },
                { key: 'lastPaymentDate', label: '마지막결제일' },
                { key: 'lastPaymentAmount', label: '마지막총결재금액' },
                { key: 'accumulatedSales', label: '누적매출금액' },
                { key: 'accumulatedCollection', label: '누적수금금액' },
                { key: 'accountsReceivable', label: '매출채권잔액' }
            ]
        };
        
        // 매출채권잔액 및 거래처명 계산
        companies = companies.map(c => ({
            ...c,
            companyName: getCompanyDisplayName(c), // 데이터베이스 스키마에 맞춰 finalCompanyName/erpCompanyName 사용
            accountsReceivable: (c.accumulatedSales || 0) - (c.accumulatedCollection || 0)
        }));
        
        // 요약 통계 추가
        if (options.includeSummary) {
            const summary = {
                totalCount: companies.length,
                totalSales: companies.reduce((sum, c) => sum + (c.accumulatedSales || 0), 0),
                totalCollection: companies.reduce((sum, c) => sum + (c.accumulatedCollection || 0), 0),
                totalReceivable: companies.reduce((sum, c) => sum + (c.accountsReceivable || 0), 0)
            };
            
            downloadOptions.metadata = {
                ...downloadOptions.metadata,
                summary
            };
        }
        
        // 다운로드 실행
        const result = await downloadManager.download(
            DOWNLOAD_TYPES.COMPANY,
            companies,
            downloadOptions
        );
        
        if (result.success) {
            showToast(`${companies.length}개 거래처 데이터를 다운로드했습니다.`, 'success');
        } else {
            throw new Error(result.message || '다운로드 실패');
        }
        
    } catch (error) {
        logger.error('[전체거래처 다운로드] 실패:', error);
        showToast('다운로드 중 오류가 발생했습니다.', 'error');
    }
}

// ============================================
// [SECTION: 엑셀 내보내기/가져오기 (레거시 호환)]
// ============================================

/**
 * [함수: 엑셀 내보내기]
 * 레거시 호환성을 위한 래퍼 함수
 */
export async function exportExcel() {
    await showDownloadOptions();
}

/**
 * [함수: 엑셀 가져오기]
 * 엑셀 파일을 업로드하여 거래처 데이터 가져오기
 */
export async function importExcel() {
    try {
        // 파일 선택 input 생성
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.xlsx,.xls,.csv';
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            // 다운로드 매니저의 업로드 기능 사용
            const result = await downloadManager.upload(
                DOWNLOAD_TYPES.COMPANY,
                file
            );
            
            if (result.success) {
                showToast(`${result.data.length}개 거래처를 가져왔습니다.`, 'success');
                
                // 거래처 목록 새로고침
                if (window.allCompaniesModule?.loadCompanies) {
                    await window.allCompaniesModule.loadCompanies();
                }
            } else {
                showToast(result.message || '파일 가져오기 실패', 'error');
            }
        };
        
        // 파일 선택 창 열기
        input.click();
        
    } catch (error) {
        logger.error('[엑셀 가져오기] 실패:', error);
        showToast('파일 가져오기 중 오류가 발생했습니다.', 'error');
    }
}

// ============================================
// [SECTION: 전역 함수 등록]
// ============================================

// HTML에서 사용할 수 있도록 전역 함수로 등록
if (typeof window !== 'undefined') {
    window.companiesDownload = {
        initDownloadButton,
        exportExcel,
        importExcel,
        showDownloadOptions
    };
}