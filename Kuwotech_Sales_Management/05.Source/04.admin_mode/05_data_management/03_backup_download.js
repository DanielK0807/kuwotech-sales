/**
 * ============================================
 * KUWOTECH 영업관리 시스템 - 관리자 전체 백업 다운로드
 * ============================================
 * 
 * @파일명: 03_download.js
 * @작성자: System
 * @작성일: 2025-09-30
 * @버전: 1.0
 * 
 * @설명:
 * 관리자의 전체 시스템 데이터를 통합하여 백업하는 기능
 * 거래처, 보고서, 직원, 실적, 이력, 설정 등 전체 데이터를 하나의 파일로 제공
 */

// ============================================
// [SECTION: Import]
// ============================================

import downloadManager, { DOWNLOAD_TYPES } from '../../06.database/12_download_manager.js';
import dbManager from '../../06.database/01_database_manager.js';
import { showToast } from '../../01.common/14_toast.js';
import { showModal } from '../../01.common/06_modal.js';
import { formatDateKorean, formatNumber } from '../../01.common/03_format.js';
import logger from '../../01.common/23_logger.js';

// ============================================
// [SECTION: 전체 백업 초기화]
// ============================================

/**
 * [함수: 전체 백업 버튼 초기화]
 */
export function initFullBackup() {
    
    // 빠른 다운로드 카드 이벤트
    setupQuickDownloadCards();
    
    // 전체 백업 버튼 이벤트
    const fullBackupBtn = document.getElementById('btn-full-backup');
    if (fullBackupBtn) {
        fullBackupBtn.addEventListener('click', showFullBackupOptions);
    }
    
    // 예약 백업 버튼 이벤트
    const scheduleBtn = document.getElementById('btn-schedule-backup');
    if (scheduleBtn) {
        scheduleBtn.addEventListener('click', showScheduleBackupOptions);
    }
}

// ============================================
// [SECTION: 빠른 다운로드 카드]
// ============================================

/**
 * [함수: 빠른 다운로드 카드 설정]
 */
function setupQuickDownloadCards() {
    // 전체 거래처 다운로드
    const companiesCard = document.querySelector('[data-download-type="companies"]');
    if (companiesCard) {
        companiesCard.addEventListener('click', () => quickDownload('companies'));
    }
    
    // 전체 보고서 다운로드
    const reportsCard = document.querySelector('[data-download-type="reports"]');
    if (reportsCard) {
        reportsCard.addEventListener('click', () => quickDownload('reports'));
    }
    
    // 전사 KPI 다운로드
    const kpiCard = document.querySelector('[data-download-type="kpi"]');
    if (kpiCard) {
        kpiCard.addEventListener('click', () => quickDownload('kpi'));
    }
    
    // 직원 정보 다운로드
    const employeesCard = document.querySelector('[data-download-type="employees"]');
    if (employeesCard) {
        employeesCard.addEventListener('click', () => quickDownload('employees'));
    }
}

/**
 * [함수: 빠른 다운로드 실행]
 * 
 * @param {string} type - 다운로드 타입
 */
async function quickDownload(type) {
    try {
        const user = JSON.parse(sessionStorage.getItem('user') || '{}');
        
        let downloadType;
        let typeName;
        
        switch (type) {
            case 'companies':
                downloadType = DOWNLOAD_TYPES.ADMIN_ALL_COMPANIES;
                typeName = '전체 거래처';
                break;
            case 'reports':
                downloadType = DOWNLOAD_TYPES.ADMIN_ALL_REPORTS;
                typeName = '전체 보고서';
                break;
            case 'kpi':
                downloadType = DOWNLOAD_TYPES.ADMIN_COMPANY_KPI;
                typeName = '전사 KPI';
                break;
            case 'employees':
                downloadType = DOWNLOAD_TYPES.ADMIN_EMPLOYEES;
                typeName = '직원 정보';
                break;
            default:
                return;
        }
        
        
        await downloadManager.download({
            downloadType: downloadType,
            userRole: 'admin',
            userName: user.name,
            format: 'excel',
            dateRange: getCurrentMonthRange()
        });
        
    } catch (error) {
        logger.error('[빠른 다운로드 오류]', error);
        showToast('다운로드 중 오류가 발생했습니다.', 'error');
    }
}

// ============================================
// [SECTION: 전체 백업 옵션 모달]
// ============================================

/**
 * [함수: 전체 백업 옵션 모달]
 */
async function showFullBackupOptions() {
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    const today = formatDateKorean(new Date());
    
    // 현재 데이터 통계 가져오기 (샘플)
    const stats = await getDataStatistics();
    
    const modalContent = `
        <div class="full-backup-container">
            <div class="backup-stats glass-card">
                <div class="stats-header">
                    <div class="stats-icon">📊</div>
                    <div class="stats-title">백업 대상 데이터</div>
                </div>
                <div class="stats-grid">
                    <div class="stat-item">
                        <div class="stat-value">${formatNumber(stats.companies || 0)}개</div>
                        <div class="stat-label">거래처</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${formatNumber(stats.reports || 0)}건</div>
                        <div class="stat-label">보고서</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${formatNumber(stats.employees || 0)}명</div>
                        <div class="stat-label">직원</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${formatNumber(stats.history || 0)}건</div>
                        <div class="stat-label">변경이력</div>
                    </div>
                </div>
            </div>
            
            <div class="backup-option-section">
                <h4 class="section-title">📦 백업 범위</h4>
                <div class="checkbox-options">
                    <label class="checkbox-option featured">
                        <input type="checkbox" id="include-companies" checked>
                        <div class="option-icon">🏢</div>
                        <div class="option-info">
                            <span class="option-name">전체 거래처</span>
                            <span class="option-desc">기본정보 19개 필드</span>
                        </div>
                    </label>
                    
                    <label class="checkbox-option featured">
                        <input type="checkbox" id="include-reports" checked>
                        <div class="option-icon">📋</div>
                        <div class="option-info">
                            <span class="option-name">방문 보고서</span>
                            <span class="option-desc">전체 보고서 데이터</span>
                        </div>
                    </label>
                    
                    <label class="checkbox-option featured">
                        <input type="checkbox" id="include-employees" checked>
                        <div class="option-icon">👥</div>
                        <div class="option-info">
                            <span class="option-name">직원 정보</span>
                            <span class="option-desc">전체 직원 9개 필드</span>
                        </div>
                    </label>
                    
                    <label class="checkbox-option featured">
                        <input type="checkbox" id="include-kpi" checked>
                        <div class="option-icon">📊</div>
                        <div class="option-info">
                            <span class="option-name">전사 실적</span>
                            <span class="option-desc">KPI 및 통계 데이터</span>
                        </div>
                    </label>
                    
                    <label class="checkbox-option">
                        <input type="checkbox" id="include-history">
                        <div class="option-icon">📝</div>
                        <div class="option-info">
                            <span class="option-name">변경 이력</span>
                            <span class="option-desc">데이터 변경 기록</span>
                        </div>
                    </label>
                    
                    <label class="checkbox-option">
                        <input type="checkbox" id="include-settings">
                        <div class="option-icon">⚙️</div>
                        <div class="option-info">
                            <span class="option-name">시스템 설정</span>
                            <span class="option-desc">전역 설정 정보</span>
                        </div>
                    </label>
                </div>
            </div>
            
            <div class="backup-option-section">
                <h4 class="section-title">📅 기간 설정</h4>
                <div class="date-range-options">
                    <label class="date-option">
                        <input type="radio" name="date-range" value="all" checked>
                        <span>전체 기간</span>
                    </label>
                    
                    <label class="date-option">
                        <input type="radio" name="date-range" value="year">
                        <span>올해</span>
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
            
            <div class="backup-option-section">
                <h4 class="section-title">📝 백업 메모</h4>
                <textarea 
                    id="backup-memo" 
                    class="backup-memo-input"
                    placeholder="백업 사유나 특이사항을 입력하세요 (선택사항)"
                    rows="2"
                ></textarea>
            </div>
            
            <div class="backup-info glass-card">
                <div class="info-icon">⚠️</div>
                <div class="info-text">
                    <strong>중요 안내:</strong>
                    <br>• 전체 백업은 모든 데이터를 포함하므로 시간이 소요될 수 있습니다.
                    <br>• 백업 파일은 <strong>안전한 장소</strong>에 보관해주세요.
                    <br>• 정기적인 백업을 권장합니다 (주 1회 이상).
                    <br>• 백업 관리자: <strong>${user.name}</strong>
                </div>
            </div>
        </div>
        
        <style>
            .full-backup-container {
                padding: 10px;
            }
            
            .backup-stats {
                padding: 20px;
                margin-bottom: 25px;
                background: linear-gradient(135deg, rgba(100, 181, 246, 0.1) 0%, rgba(0, 230, 118, 0.1) 100%);
                border: 2px solid var(--primary-color);
                border-radius: 12px;
            }
            
            .stats-header {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 20px;
            }
            
            .stats-icon {
                font-size: 32px;
            }
            
            .stats-title {
                font-size: 18px;
                font-weight: 700;
                color: var(--text-primary);
            }
            
            .stats-grid {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 15px;
            }
            
            .stat-item {
                text-align: center;
                padding: 15px;
                background: white;
                border-radius: 8px;
                border: 1px solid rgba(0, 0, 0, 0.05);
            }
            
            .stat-value {
                font-size: 24px;
                font-weight: 700;
                color: var(--primary-color);
                margin-bottom: 6px;
            }
            
            .stat-label {
                font-size: 12px;
                color: var(--text-secondary);
            }
            
            .backup-option-section {
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
                gap: 10px;
            }
            
            .checkbox-option {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 12px 15px;
                background: rgba(0, 0, 0, 0.02);
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            
            .checkbox-option.featured {
                border: 2px solid var(--glass-border);
                background: white;
            }
            
            .checkbox-option:hover {
                background: rgba(100, 181, 246, 0.05);
                transform: translateX(5px);
            }
            
            .checkbox-option input[type="checkbox"] {
                width: 20px;
                height: 20px;
                cursor: pointer;
            }
            
            .option-icon {
                font-size: 28px;
                flex-shrink: 0;
            }
            
            .option-info {
                flex: 1;
                display: flex;
                flex-direction: column;
                gap: 3px;
            }
            
            .option-name {
                font-size: 14px;
                font-weight: 600;
                color: var(--text-primary);
            }
            
            .option-desc {
                font-size: 12px;
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
                background: rgba(100, 181, 246, 0.05);
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
                background: rgba(100, 181, 246, 0.05);
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
            
            .backup-memo-input {
                width: 100%;
                padding: 12px 15px;
                border: 2px solid var(--glass-border);
                border-radius: 8px;
                font-size: 14px;
                font-family: inherit;
                resize: vertical;
                transition: all 0.3s ease;
            }
            
            .backup-memo-input:focus {
                outline: none;
                border-color: var(--primary-color);
                background: rgba(100, 181, 246, 0.02);
            }
            
            .backup-info {
                padding: 15px;
                display: flex;
                gap: 12px;
                background: rgba(255, 152, 0, 0.05);
                border: 1px solid #FF9800;
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
                line-height: 1.8;
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
        title: '🔒 전체 시스템 백업',
        content: modalContent,
        size: 'large',
        buttons: [
            {
                text: '취소',
                type: 'secondary',
                onClick: () => false
            },
            {
                text: '백업 시작',
                type: 'primary',
                onClick: async () => {
                    // 선택된 옵션 가져오기
                    const includeCompanies = document.getElementById('include-companies')?.checked || false;
                    const includeReports = document.getElementById('include-reports')?.checked || false;
                    const includeEmployees = document.getElementById('include-employees')?.checked || false;
                    const includeKPI = document.getElementById('include-kpi')?.checked || false;
                    const includeHistory = document.getElementById('include-history')?.checked || false;
                    const includeSettings = document.getElementById('include-settings')?.checked || false;
                    const memo = document.getElementById('backup-memo')?.value || '';
                    
                    // 최소 하나는 선택되어야 함
                    if (!includeCompanies && !includeReports && !includeEmployees && !includeKPI && !includeHistory && !includeSettings) {
                        showToast('최소 하나 이상의 백업 항목을 선택해주세요', 'warning');
                        return false;
                    }
                    
                    // 날짜 범위
                    const dateRangeType = document.querySelector('input[name="date-range"]:checked')?.value || 'all';
                    let dateRange = null;
                    
                    if (dateRangeType === 'year') {
                        dateRange = getCurrentYearRange();
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
                    
                    // 백업 실행
                    await executeFullBackup({
                        includeCompanies,
                        includeReports,
                        includeEmployees,
                        includeKPI,
                        includeHistory,
                        includeSettings,
                        memo,
                        dateRange
                    });
                    
                    return true;
                }
            }
        ]
    });
}

// ============================================
// [SECTION: 전체 백업 실행]
// ============================================

/**
 * [함수: 전체 백업 실행]
 * 
 * @param {Object} options - 백업 옵션
 */
async function executeFullBackup(options = {}) {
    try {
        const user = JSON.parse(sessionStorage.getItem('user') || '{}');
        
        // 관리자 권한 확인
        if (user.role !== 'admin') {
            showToast('전체 백업은 관리자만 가능합니다.', 'error');
            return;
        }
        
        
        // 통합 다운로드 매니저 호출
        const result = await downloadManager.download({
            downloadType: DOWNLOAD_TYPES.ADMIN_FULL_BACKUP,
            userRole: 'admin',
            userName: user.name,
            format: 'excel',
            includeSheets: getIncludeSheets(options),
            backupOptions: {
                memo: options.memo,
                backupBy: user.name,
                backupAt: new Date().toISOString()
            },
            dateRange: options.dateRange
        });
        
        if (result.success) {
            
            // 백업 이력 저장
            await saveBackupHistory({
                options,
                backupBy: user.name,
                backupAt: new Date().toISOString()
            });
        } else {
            logger.error('[전체 백업] 실패:', result.error);
            showToast('백업 실패: ' + (result.error || '알 수 없는 오류'), 'error');
        }
        
    } catch (error) {
        logger.error('[전체 백업] 오류:', error);
        showToast('백업 중 오류가 발생했습니다.', 'error');
    }
}

/**
 * [함수: 포함할 시트 결정]
 */
function getIncludeSheets(options) {
    const sheets = [];
    
    if (options.includeCompanies) sheets.push('기본정보');
    if (options.includeReports) sheets.push('방문보고서_전체');
    if (options.includeEmployees) sheets.push('직원정보');
    if (options.includeKPI) sheets.push('전사실적');
    if (options.includeHistory) sheets.push('변경이력');
    if (options.includeSettings) sheets.push('시스템설정');
    
    // 메타정보는 항상 포함
    sheets.push('메타정보');
    
    return sheets;
}

// ============================================
// [SECTION: 백업 예약]
// ============================================

/**
 * [함수: 백업 예약 옵션 모달]
 *
 * @note 향후 구현 예정: 자동 백업 스케줄 설정 (일일/주간/월간)
 */
async function showScheduleBackupOptions() {
    showToast('백업 예약 기능은 준비 중입니다', 'info');
}

// ============================================
// [SECTION: 백업 이력 관리]
// ============================================

/**
 * [함수: 백업 이력 저장]
 */
async function saveBackupHistory(backupInfo) {
    try {
        
        const history = JSON.parse(localStorage.getItem('full_backup_history') || '[]');
        history.unshift(backupInfo);
        
        // 최근 20개만 유지
        if (history.length > 20) {
            history.splice(20);
        }
        
        localStorage.setItem('full_backup_history', JSON.stringify(history));
        
    } catch (error) {
        logger.error('[백업 이력 저장 오류]', error);
    }
}

/**
 * [함수: 백업 이력 조회]
 */
export function getBackupHistory() {
    try {
        return JSON.parse(localStorage.getItem('full_backup_history') || '[]');
    } catch (error) {
        logger.error('[백업 이력 조회 오류]', error);
        return [];
    }
}

// ============================================
// [SECTION: 통계 정보]
// ============================================

/**
 * [함수: 데이터 통계 조회]
 */
async function getDataStatistics() {
    try {
        // 실제 데이터베이스에서 데이터 개수 조회
        const companies = await dbManager.getAllClients({ limit: 100000 });
        const reports = await dbManager.getAllReports({ limit: 100000 });
        const employees = await dbManager.getAllEmployees({ limit: 100000 });

        return {
            companies: companies?.length || 0,
            reports: reports?.length || 0,
            employees: employees?.length || 0,
            history: 0 // TODO: 변경이력 API 구현 시 추가
        };
    } catch (error) {
        logger.error('[통계 조회 오류]', error);
        return {
            companies: 0,
            reports: 0,
            employees: 0,
            history: 0
        };
    }
}

// ============================================
// [SECTION: 날짜 범위 유틸리티]
// ============================================

/**
 * [함수: 현재 월 범위]
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
 * [함수: 올해 범위]
 */
function getCurrentYearRange() {
    const year = new Date().getFullYear();
    return {
        start: `${year}-01-01`,
        end: `${year}-12-31`
    };
}

/**
 * [함수: 최근 3개월 범위]
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
    initFullBackup,
    showFullBackupOptions,
    showScheduleBackupOptions,
    quickDownload,
    executeFullBackup,
    getBackupHistory,
    saveBackupHistory
};
