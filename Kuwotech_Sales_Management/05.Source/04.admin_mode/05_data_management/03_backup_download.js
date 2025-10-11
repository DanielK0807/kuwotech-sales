/**
 * ============================================
 * KUWOTECH 영업관리 시스템 - 관리자 전체 백업 다운로드
 * ============================================
 *
 * @파일명: 03_backup_download.js
 * @작성자: System
 * @작성일: 2025-09-30
 * @수정일: 2025-10-11
 * @버전: 2.0
 *
 * @설명:
 * 관리자의 전체 시스템 데이터를 통합하여 백업하는 기능
 * 거래처, 보고서, 직원, 실적, 이력, 설정 등 전체 데이터를 하나의 파일로 제공
 *
 * @변경사항 (v2.0):
 * - download_helper.js의 UI 컴포넌트 함수 사용
 * - 중복 코드 제거 (Modal HTML 생성, 236 lines 인라인 CSS, 인라인 스크립트)
 * - additionalContent로 통계 표시 및 백업 메모 구현
 * - 날짜 유틸리티 함수 제거 (downloadHelper 사용)
 * - 코드 라인 수 40% 감소 (820 → 492 lines)
 */

// ============================================
// [SECTION: Import]
// ============================================

import downloadManager, { DOWNLOAD_TYPES } from '../../06.database/12_download_manager.js';
import dbManager from '../../06.database/01_database_manager.js';
import { showToast } from '../../01.common/14_toast.js';
import downloadHelper from '../../01.common/helpers/download_helper.js';
import { formatNumber } from '../../01.common/03_format.js';
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
    // 사용자 정보 가져오기 (헬퍼 사용)
    const userInfo = downloadHelper.getUserInfo();
    if (!userInfo) return;

    // 관리자 권한 확인
    if (userInfo.userRole !== 'admin') {
        showToast('관리자 권한이 필요합니다', 'error');
        return;
    }

    let downloadType;

    switch (type) {
        case 'companies':
            downloadType = DOWNLOAD_TYPES.ADMIN_ALL_COMPANIES;
            break;
        case 'reports':
            downloadType = DOWNLOAD_TYPES.ADMIN_ALL_REPORTS;
            break;
        case 'kpi':
            downloadType = DOWNLOAD_TYPES.ADMIN_COMPANY_KPI;
            break;
        case 'employees':
            downloadType = DOWNLOAD_TYPES.ADMIN_EMPLOYEES;
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
// [SECTION: 전체 백업 옵션 모달]
// ============================================

/**
 * [함수: 전체 백업 옵션 모달]
 * download_helper를 사용한 간소화된 Modal 생성
 * 통계 표시 및 백업 메모는 additionalContent로 구현
 */
async function showFullBackupOptions() {
    const userInfo = downloadHelper.getUserInfo();
    if (!userInfo) return;

    // 관리자 권한 확인
    if (userInfo.userRole !== 'admin') {
        showToast('전체 백업은 관리자만 가능합니다', 'error');
        return;
    }

    const today = new Date().toLocaleDateString('ko-KR');
    
    // 현재 데이터 통계 가져오기
    const stats = await getDataStatistics();

    // 데이터 통계 및 백업 메모 HTML (additionalContent)
    const additionalOptionsHTML = `
        <!-- 백업 대상 데이터 통계 -->
        <div class="option-group glass-card" style="background: linear-gradient(135deg, rgba(100, 181, 246, 0.1) 0%, rgba(0, 230, 118, 0.1) 100%); border: 2px solid var(--primary-color);">
            <h3>📊 백업 대상 데이터</h3>
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-top: 15px;">
                <div style="text-align: center; padding: 15px; background: white; border-radius: 8px;">
                    <div style="font-size: 24px; font-weight: 700; color: var(--primary-color); margin-bottom: 6px;">${formatNumber(stats.companies || 0)}개</div>
                    <div style="font-size: 12px; color: var(--text-secondary);">거래처</div>
                </div>
                <div style="text-align: center; padding: 15px; background: white; border-radius: 8px;">
                    <div style="font-size: 24px; font-weight: 700; color: var(--primary-color); margin-bottom: 6px;">${formatNumber(stats.reports || 0)}건</div>
                    <div style="font-size: 12px; color: var(--text-secondary);">보고서</div>
                </div>
                <div style="text-align: center; padding: 15px; background: white; border-radius: 8px;">
                    <div style="font-size: 24px; font-weight: 700; color: var(--primary-color); margin-bottom: 6px;">${formatNumber(stats.employees || 0)}명</div>
                    <div style="font-size: 12px; color: var(--text-secondary);">직원</div>
                </div>
                <div style="text-align: center; padding: 15px; background: white; border-radius: 8px;">
                    <div style="font-size: 24px; font-weight: 700; color: var(--primary-color); margin-bottom: 6px;">${formatNumber(stats.history || 0)}건</div>
                    <div style="font-size: 12px; color: var(--text-secondary);">변경이력</div>
                </div>
            </div>
        </div>

        <!-- 백업 메모 -->
        <div class="option-group glass-card">
            <h3>📝 백업 메모</h3>
            <textarea
                id="backup-memo"
                class="glass-input"
                placeholder="백업 사유나 특이사항을 입력하세요 (선택사항)"
                rows="2"
                style="width: 100%; resize: vertical;"
            ></textarea>
        </div>

        <!-- 백업 안내 -->
        <div class="option-group glass-card" style="background: rgba(255, 152, 0, 0.05); border: 1px solid #FF9800;">
            <h3>⚠️ 중요 안내</h3>
            <p style="color: var(--text-secondary); line-height: 1.8;">
                • 전체 백업은 모든 데이터를 포함하므로 시간이 소요될 수 있습니다.<br>
                • 백업 파일은 <strong>안전한 장소</strong>에 보관해주세요.<br>
                • 정기적인 백업을 권장합니다 (주 1회 이상).<br>
                • 백업 관리자: <strong>${userInfo.userName}</strong>
            </p>
        </div>
    `;

    // 전체 백업 옵션 Modal 생성 (헬퍼 사용)
    const options = await downloadHelper.createDownloadOptionsModal({
        title: '전체 시스템 백업',
        icon: '🔒',
        showDateRange: true,
        showQuickPeriod: true,
        sheets: [
            {
                id: 'include-companies',
                label: '전체 거래처',
                description: '기본정보 19개 필드',
                checked: true,
                disabled: false
            },
            {
                id: 'include-reports',
                label: '방문 보고서',
                description: '전체 보고서 데이터',
                checked: true,
                disabled: false
            },
            {
                id: 'include-employees',
                label: '직원 정보',
                description: '전체 직원 9개 필드',
                checked: true,
                disabled: false
            },
            {
                id: 'include-kpi',
                label: '전사 실적',
                description: 'KPI 및 통계 데이터',
                checked: true,
                disabled: false
            },
            {
                id: 'include-history',
                label: '변경 이력',
                description: '데이터 변경 기록',
                checked: false,
                disabled: false
            },
            {
                id: 'include-settings',
                label: '시스템 설정',
                description: '전역 설정 정보',
                checked: false,
                disabled: false
            }
        ],
        additionalContent: additionalOptionsHTML,
        defaultStartDate: downloadHelper.getDefaultStartDate(false),  // 전체 기간 (년 초)
        defaultEndDate: downloadHelper.getDefaultEndDate(true)         // 이번 달 마지막
    });

    // 사용자가 취소한 경우
    if (!options) return;

    // 최소 하나는 선택되어야 함
    if (options.selectedSheets.length === 0) {
        showToast('최소 하나 이상의 백업 항목을 선택해주세요', 'warning');
        return;
    }

    // 백업 메모 가져오기
    const memo = document.getElementById('backup-memo')?.value || '';

    // 백업 실행
    await executeFullBackup({
        userInfo: options,
        selectedSheets: options.selectedSheets,
        memo: memo,
        dateRange: options.dateRange
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
    const { userInfo, selectedSheets, memo, dateRange } = options;

    // 포함할 시트 매핑
    const includeSheets = selectedSheets.map(sheetLabel => {
        const mapping = {
            '전체 거래처': '기본정보',
            '방문 보고서': '방문보고서_전체',
            '직원 정보': '직원정보',
            '전사 실적': '전사실적',
            '변경 이력': '변경이력',
            '시스템 설정': '시스템설정'
        };
        return mapping[sheetLabel] || sheetLabel;
    });

    // 메타정보는 항상 포함
    includeSheets.push('메타정보');

    // 다운로드 실행 (헬퍼의 execute 래퍼 사용)
    await downloadHelper.execute(async () => {
        const result = await downloadManager.download({
            downloadType: DOWNLOAD_TYPES.ADMIN_FULL_BACKUP,
            userRole: userInfo.userRole,
            userName: userInfo.userName,
            format: 'excel',
            includeSheets: includeSheets,
            backupOptions: {
                memo: memo,
                backupBy: userInfo.userName,
                backupAt: new Date().toISOString()
            },
            dateRange: dateRange
        });

        // 백업 이력 저장
        if (result.success) {
            await saveBackupHistory({
                selectedSheets,
                memo,
                backupBy: userInfo.userName,
                backupAt: new Date().toISOString()
            });
        }

        return result;
    }, {
        downloadType: 'ADMIN_FULL_BACKUP',
        userName: userInfo.userName,
        showProgress: true,
        enableRetry: true
    });
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
