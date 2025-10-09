/**
 * ============================================
 * KUWOTECH 영업관리 시스템 - 직원 정보 다운로드
 * ============================================
 * 
 * @파일명: 03_download.js
 * @작성자: System
 * @작성일: 2025-09-30
 * @버전: 1.0
 * 
 * @설명:
 * 관리자의 전체 직원 정보 다운로드 기능
 * 통합 다운로드 매니저를 사용하여 체계적인 다운로드 제공
 */

// ============================================
// [SECTION: Import]
// ============================================

import downloadManager, { DOWNLOAD_TYPES } from '../../06.database/12_download_manager.js';
import { showToast } from '../../01.common/14_toast.js';
import { showModal } from '../../01.common/06_modal.js';

// ============================================
// [SECTION: 다운로드 버튼 초기화]
// ============================================

/**
 * [함수: 다운로드 버튼 초기화]
 * HTML의 다운로드 버튼에 이벤트 연결
 */
export function initEmployeeDownloadButton() {
    console.log('[직원정보 다운로드] 버튼 초기화');

    // 다운로드 버튼 찾기 (여러 패턴 지원)
    const downloadBtn = document.getElementById('btnExport') ||
                       document.getElementById('btn-download-employees') ||
                       document.getElementById('btn-export-excel') ||
                       document.querySelector('button[onclick*="exportExcel"]');

    if (downloadBtn) {
        // 기존 onclick 제거
        downloadBtn.removeAttribute('onclick');

        // 새 이벤트 리스너 추가
        downloadBtn.addEventListener('click', showEmployeeDownloadOptions);

        console.log('[직원정보 다운로드] 버튼 이벤트 연결 완료:', downloadBtn.id || downloadBtn.className);
    } else {
        console.warn('[직원정보 다운로드] 다운로드 버튼을 찾을 수 없습니다');
    }
}

// ============================================
// [SECTION: 다운로드 옵션 모달]
// ============================================

/**
 * [함수: 직원 정보 다운로드 옵션 모달]
 */
async function showEmployeeDownloadOptions() {
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    
    // 현재 표시된 직원 수 확인
    const employeeRows = document.querySelectorAll('.employee-table tbody tr:not(.no-data)');
    const totalCount = employeeRows.length;
    
    const modalContent = `
        <div class="employee-download-container">
            <div class="download-option-section">
                <h4 class="section-title">📊 다운로드 형식</h4>
                <div class="format-options">
                    <label class="format-option glass-card">
                        <input type="radio" name="download-format" value="excel" checked>
                        <div class="format-icon">📊</div>
                        <div class="format-info">
                            <div class="format-name">Excel (엑셀)</div>
                            <div class="format-desc">전체 직원 정보를 엑셀 파일로 다운로드</div>
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
                <h4 class="section-title">🎯 포함 항목</h4>
                <div class="checkbox-options">
                    <label class="checkbox-option">
                        <input type="checkbox" id="include-basic-info" checked disabled>
                        <span>기본 정보 (이름, 사번, 입사일자)</span>
                    </label>
                    
                    <label class="checkbox-option">
                        <input type="checkbox" id="include-contact" checked>
                        <span>연락처 정보 (이메일, 전화번호)</span>
                    </label>
                    
                    <label class="checkbox-option">
                        <input type="checkbox" id="include-department" checked>
                        <span>조직 정보 (부서, 직급, 역할)</span>
                    </label>
                    
                    <label class="checkbox-option">
                        <input type="checkbox" id="include-status" checked>
                        <span>상태 정보 (재직여부)</span>
                    </label>
                </div>
            </div>
            
            <div class="download-option-section">
                <h4 class="section-title">🔍 필터 옵션</h4>
                <div class="checkbox-options">
                    <label class="checkbox-option">
                        <input type="checkbox" id="filter-active-only">
                        <span>재직 중인 직원만</span>
                    </label>
                    
                    <label class="checkbox-option">
                        <input type="checkbox" id="filter-sales-only">
                        <span>영업팀만</span>
                    </label>
                    
                    <label class="checkbox-option">
                        <input type="checkbox" id="include-statistics">
                        <span>부서별 통계 포함</span>
                    </label>
                </div>
            </div>
            
            <div class="employee-info glass-card">
                <div class="info-icon">👥</div>
                <div class="info-text">
                    <strong>다운로드 대상:</strong>
                    <br>현재 표시된 직원: <strong>${totalCount}명</strong>
                    <br>엑셀 형식은 9개 필드를 포함한 상세 정보를 제공합니다.
                    <br>
                    <br><em>※ 개인정보 보호를 위해 반드시 안전하게 관리해주세요.</em>
                </div>
            </div>
        </div>
        
        <style>
            .employee-download-container {
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
                background: rgba(100, 181, 246, 0.05);
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
                background: rgba(100, 181, 246, 0.05);
            }
            
            .checkbox-option input[type="checkbox"] {
                width: 18px;
                height: 18px;
                cursor: pointer;
            }
            
            .checkbox-option input[type="checkbox"]:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
            
            .checkbox-option span {
                font-size: 14px;
                color: var(--text-primary);
            }
            
            .employee-info {
                padding: 15px;
                display: flex;
                gap: 12px;
                background: rgba(100, 181, 246, 0.05);
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
            
            .info-text em {
                color: #f44336;
                font-style: normal;
                font-size: 12px;
            }
        </style>
    `;
    
    const result = await showModal({
        title: '👥 직원 정보 다운로드',
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
                    const includeContact = document.getElementById('include-contact')?.checked || false;
                    const includeDepartment = document.getElementById('include-department')?.checked || false;
                    const includeStatus = document.getElementById('include-status')?.checked || false;
                    const filterActiveOnly = document.getElementById('filter-active-only')?.checked || false;
                    const filterSalesOnly = document.getElementById('filter-sales-only')?.checked || false;
                    const includeStatistics = document.getElementById('include-statistics')?.checked || false;
                    
                    // 다운로드 실행
                    await executeEmployeeDownload(format, {
                        includeContact,
                        includeDepartment,
                        includeStatus,
                        filterActiveOnly,
                        filterSalesOnly,
                        includeStatistics
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
 * [함수: 직원 정보 다운로드 실행]
 * 
 * @param {string} format - 다운로드 형식 ('excel' | 'csv')
 * @param {Object} options - 다운로드 옵션
 */
async function executeEmployeeDownload(format, options = {}) {
    try {
        const user = JSON.parse(sessionStorage.getItem('user') || '{}');
        
        // 관리자 권한 확인
        if (user.role !== 'admin') {
            showToast('직원 정보 다운로드는 관리자만 가능합니다.', 'error');
            return;
        }
        
        console.log('[직원정보 다운로드] 시작:', { format, user: user.name, options });
        
        // 통합 다운로드 매니저 호출
        const result = await downloadManager.download({
            downloadType: DOWNLOAD_TYPES.ADMIN_EMPLOYEES,
            userRole: 'admin',
            userName: user.name,
            format: format,
            includeSheets: ['직원정보'],
            filterOptions: {
                activeOnly: options.filterActiveOnly,
                salesOnly: options.filterSalesOnly
            },
            includeStats: options.includeStatistics,
            dateRange: null
        });
        
        if (result.success) {
            console.log('[직원정보 다운로드] 성공');
            // 성공 메시지는 downloadManager에서 표시
        } else {
            console.error('[직원정보 다운로드] 실패:', result.error);
            showToast('다운로드 실패: ' + (result.error || '알 수 없는 오류'), 'error');
        }
        
    } catch (error) {
        console.error('[직원정보 다운로드] 오류:', error);
        showToast('다운로드 중 오류가 발생했습니다.', 'error');
    }
}

// ============================================
// [SECTION: 빠른 다운로드]
// ============================================

/**
 * [함수: 빠른 다운로드 (옵션 없이 즉시 다운로드)]
 */
export async function quickDownloadEmployees() {
    try {
        const user = JSON.parse(sessionStorage.getItem('user') || '{}');
        
        if (user.role !== 'admin') {
            showToast('직원 정보 다운로드는 관리자만 가능합니다.', 'error');
            return;
        }
        
        console.log('[직원정보 빠른 다운로드] 시작');
        
        await downloadManager.download({
            downloadType: DOWNLOAD_TYPES.ADMIN_EMPLOYEES,
            userRole: 'admin',
            userName: user.name,
            format: 'excel',
            includeSheets: ['직원정보'],
            dateRange: null
        });
        
    } catch (error) {
        console.error('[직원정보 빠른 다운로드] 오류:', error);
        showToast('다운로드 중 오류가 발생했습니다.', 'error');
    }
}

// ============================================
// [SECTION: 레거시 함수 (호환성)]
// ============================================

/**
 * [함수: 레거시 엑셀 내보내기]
 * 기존 코드와의 호환성을 위해 유지
 * 
 * @deprecated - showEmployeeDownloadOptions 사용 권장
 */
export async function exportExcel() {
    console.warn('[직원관리] exportExcel() is deprecated. Use showEmployeeDownloadOptions() instead.');
    await showEmployeeDownloadOptions();
}

// ============================================
// [SECTION: Export]
// ============================================

export default {
    initEmployeeDownloadButton,
    showEmployeeDownloadOptions,
    executeEmployeeDownload,
    quickDownloadEmployees,
    exportExcel
};
