/**
 * ============================================
 * KUWOTECH 영업관리 시스템 - 영업담당 통합 데이터 다운로드
 * ============================================
 * 
 * @파일명: 03_download.js
 * @작성자: System
 * @작성일: 2025-09-30
 * @버전: 1.0
 * 
 * @설명:
 * 영업담당자의 모든 데이터를 통합하여 다운로드하는 기능
 * 거래처, 보고서, 실적 데이터를 하나의 파일로 제공
 */

// ============================================
// [SECTION: Import]
// ============================================

import downloadManager, { DOWNLOAD_TYPES } from '../../06.database/12_download_manager.js';
import { showToast } from '../../01.common/14_toast.js';
import { showModal } from '../../01.common/06_modal.js';
import { formatDateKorean } from '../../01.common/03_format.js';

// ============================================
// [SECTION: 통합 다운로드 초기화]
// ============================================

/**
 * [함수: 통합 다운로드 버튼 초기화]
 */
export function initIntegratedDownload() {
    console.log('[영업담당 통합 다운로드] 초기화');
    
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
    try {
        const user = JSON.parse(sessionStorage.getItem('user') || '{}');
        
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
        
        console.log(`[빠른 다운로드] ${typeName} 시작`);
        
        await downloadManager.download({
            downloadType: downloadType,
            userRole: 'sales',
            userName: user.name,
            format: 'excel',
            dateRange: getCurrentMonthRange()
        });
        
    } catch (error) {
        console.error('[빠른 다운로드 오류]', error);
        showToast('다운로드 중 오류가 발생했습니다.', 'error');
    }
}

// ============================================
// [SECTION: 통합 다운로드 옵션 모달]
// ============================================

/**
 * [함수: 통합 다운로드 옵션 모달]
 */
async function showIntegratedDownloadOptions() {
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    const today = formatDateKorean(new Date());
    
    const modalContent = `
        <div class="integrated-download-container">
            <div class="download-option-section">
                <h4 class="section-title">📦 포함할 데이터</h4>
                <div class="checkbox-options">
                    <label class="checkbox-option featured">
                        <input type="checkbox" id="include-companies" checked disabled>
                        <div class="option-icon">🏢</div>
                        <div class="option-info">
                            <span class="option-name">내 거래처 정보</span>
                            <span class="option-desc">담당 거래처 19개 필드</span>
                        </div>
                    </label>
                    
                    <label class="checkbox-option featured">
                        <input type="checkbox" id="include-reports" checked>
                        <div class="option-icon">📋</div>
                        <div class="option-info">
                            <span class="option-name">방문 보고서</span>
                            <span class="option-desc">작성한 보고서 전체</span>
                        </div>
                    </label>
                    
                    <label class="checkbox-option featured">
                        <input type="checkbox" id="include-kpi" checked>
                        <div class="option-icon">📊</div>
                        <div class="option-info">
                            <span class="option-name">영업 실적</span>
                            <span class="option-desc">KPI 및 거래처별 상세</span>
                        </div>
                    </label>
                </div>
            </div>
            
            <div class="download-option-section">
                <h4 class="section-title">📅 기간 설정</h4>
                <div class="date-range-options">
                    <label class="date-option">
                        <input type="radio" name="date-range" value="all" checked>
                        <span>전체 기간</span>
                    </label>
                    
                    <label class="date-option">
                        <input type="radio" name="date-range" value="month">
                        <span>이번 달</span>
                    </label>
                    
                    <label class="date-option">
                        <input type="radio" name="date-range" value="quarter">
                        <span>최근 3개월</span>
                    </label>
                    
                    <label class="date-option">
                        <input type="radio" name="date-range" value="custom">
                        <span>기간 지정</span>
                    </label>
                </div>
                
                <div id="custom-date-range" class="custom-date-range" style="display: none;">
                    <div class="date-input-group">
                        <label>시작일</label>
                        <input type="date" id="start-date" class="date-input">
                    </div>
                    <div class="date-input-group">
                        <label>종료일</label>
                        <input type="date" id="end-date" class="date-input">
                    </div>
                </div>
            </div>
            
            <div class="download-option-section">
                <h4 class="section-title">⚙️ 추가 옵션</h4>
                <div class="checkbox-options">
                    <label class="checkbox-option">
                        <input type="checkbox" id="include-summary" checked>
                        <span>요약 정보 포함</span>
                    </label>
                    
                    <label class="checkbox-option">
                        <input type="checkbox" id="include-charts">
                        <span>차트 이미지 포함</span>
                    </label>
                </div>
            </div>
            
            <div class="download-info glass-card">
                <div class="info-icon">ℹ️</div>
                <div class="info-text">
                    <strong>${user.name}님의 영업 데이터</strong>
                    <br>다운로드 날짜: ${today}
                    <br>
                    <br>통합 다운로드는 선택한 모든 데이터를 하나의 엑셀 파일에 담습니다.
                    <br>각 데이터는 별도의 시트로 구분되어 제공됩니다.
                </div>
            </div>
        </div>
        
        <style>
            .integrated-download-container {
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
            
            .checkbox-options {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            
            .checkbox-option {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 15px;
                background: rgba(0, 0, 0, 0.02);
                border-radius: 10px;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            
            .checkbox-option.featured {
                border: 2px solid var(--glass-border);
                background: white;
            }
            
            .checkbox-option:hover {
                background: rgba(0, 151, 167, 0.05);
                transform: translateX(5px);
            }
            
            .checkbox-option input[type="checkbox"] {
                width: 20px;
                height: 20px;
                cursor: pointer;
            }
            
            .checkbox-option input[type="checkbox"]:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
            
            .option-icon {
                font-size: 32px;
                flex-shrink: 0;
            }
            
            .option-info {
                flex: 1;
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
            
            .option-name {
                font-size: 15px;
                font-weight: 600;
                color: var(--text-primary);
            }
            
            .option-desc {
                font-size: 13px;
                color: var(--text-secondary);
            }
            
            .date-range-options {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 12px;
                margin-bottom: 15px;
            }
            
            .date-option {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 12px 15px;
                background: rgba(0, 0, 0, 0.02);
                border-radius: 8px;
                cursor: pointer;
                border: 2px solid transparent;
                transition: all 0.3s ease;
            }
            
            .date-option:hover {
                background: rgba(0, 151, 167, 0.05);
            }
            
            .date-option input[type="radio"]:checked + span {
                font-weight: 600;
                color: var(--primary-color);
            }
            
            .date-option input[type="radio"] {
                width: 18px;
                height: 18px;
                cursor: pointer;
            }
            
            .custom-date-range {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 15px;
                padding: 15px;
                background: rgba(0, 151, 167, 0.05);
                border-radius: 8px;
            }
            
            .date-input-group {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            
            .date-input-group label {
                font-size: 13px;
                font-weight: 600;
                color: var(--text-primary);
            }
            
            .date-input {
                padding: 10px;
                border: 2px solid var(--glass-border);
                border-radius: 6px;
                font-size: 14px;
                font-family: inherit;
                transition: all 0.3s ease;
            }
            
            .date-input:focus {
                outline: none;
                border-color: var(--primary-color);
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
        
        <script>
            // 기간 지정 옵션 표시/숨김
            document.querySelectorAll('input[name="date-range"]').forEach(radio => {
                radio.addEventListener('change', (e) => {
                    const customRange = document.getElementById('custom-date-range');
                    if (e.target.value === 'custom') {
                        customRange.style.display = 'grid';
                    } else {
                        customRange.style.display = 'none';
                    }
                });
            });
        </script>
    `;
    
    const result = await showModal({
        title: '📦 영업 데이터 통합 다운로드',
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
                    const includeCompanies = true; // 필수
                    const includeReports = document.getElementById('include-reports')?.checked || false;
                    const includeKPI = document.getElementById('include-kpi')?.checked || false;
                    const includeSummary = document.getElementById('include-summary')?.checked || false;
                    const includeCharts = document.getElementById('include-charts')?.checked || false;
                    
                    // 날짜 범위
                    const dateRangeType = document.querySelector('input[name="date-range"]:checked')?.value || 'all';
                    let dateRange = null;
                    
                    if (dateRangeType === 'month') {
                        dateRange = getCurrentMonthRange();
                    } else if (dateRangeType === 'quarter') {
                        dateRange = getQuarterRange();
                    } else if (dateRangeType === 'custom') {
                        const startDate = document.getElementById('start-date')?.value;
                        const endDate = document.getElementById('end-date')?.value;
                        
                        if (!startDate || !endDate) {
                            showToast('기간을 선택해주세요', 'warning');
                            return false;
                        }
                        
                        dateRange = { start: startDate, end: endDate };
                    }
                    
                    // 다운로드 실행
                    await executeIntegratedDownload({
                        includeCompanies,
                        includeReports,
                        includeKPI,
                        includeSummary,
                        includeCharts,
                        dateRange
                    });
                    
                    return true;
                }
            }
        ]
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
    try {
        const user = JSON.parse(sessionStorage.getItem('user') || '{}');
        
        console.log('[통합 다운로드] 시작:', { user: user.name, options });
        
        // 포함할 시트 결정
        const includeSheets = [];
        if (options.includeCompanies) includeSheets.push('기본정보');
        if (options.includeReports) includeSheets.push('방문보고서');
        if (options.includeKPI) includeSheets.push('영업실적');
        
        // 통합 다운로드 매니저 호출
        const result = await downloadManager.download({
            downloadType: DOWNLOAD_TYPES.SALES_ALL,
            userRole: 'sales',
            userName: user.name,
            format: 'excel',
            includeSheets: includeSheets,
            dateRange: options.dateRange,
            includeSummary: options.includeSummary
        });
        
        if (result.success) {
            console.log('[통합 다운로드] 성공');
        } else {
            console.error('[통합 다운로드] 실패:', result.error);
            showToast('다운로드 실패: ' + (result.error || '알 수 없는 오류'), 'error');
        }
        
    } catch (error) {
        console.error('[통합 다운로드] 오류:', error);
        showToast('다운로드 중 오류가 발생했습니다.', 'error');
    }
}

// ============================================
// [SECTION: 날짜 범위 유틸리티]
// ============================================

/**
 * [함수: 현재 월 범위 가져오기]
 */
function getCurrentMonthRange() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    
    return {
        start: `${year}-${month}-01`,
        end: `${year}-${month}-${new Date(year, now.getMonth() + 1, 0).getDate()}`
    };
}

/**
 * [함수: 최근 3개월 범위 가져오기]
 */
function getQuarterRange() {
    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    
    return {
        start: `${threeMonthsAgo.getFullYear()}-${String(threeMonthsAgo.getMonth() + 1).padStart(2, '0')}-01`,
        end: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getDate()}`
    };
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
