/**
 * ============================================
 * KUWOTECH 영업관리 시스템 - 시스템 설정 백업
 * ============================================
 *
 * @파일명: 03_settings_download.js
 * @작성자: System
 * @작성일: 2025-09-30
 * @수정일: 2025-10-11
 * @버전: 2.0
 *
 * @설명:
 * 관리자의 시스템 설정 백업 및 다운로드 기능
 * download_helper를 사용하여 중복 코드 제거 및 일관성 향상
 *
 * @변경사항 (v2.0):
 * - download_helper.js의 UI 컴포넌트 함수 사용
 * - 중복 코드 제거 (Modal HTML 생성, 인라인 CSS, 검증 로직)
 * - additionalContent로 백업 형식 및 메모 입력 구현
 * - executeBackup() 함수 제거 (통합)
 * - 코드 라인 수 38% 감소 (537 → 335 lines)
 */

// ============================================
// [SECTION: Import]
// ============================================

import downloadManager, { DOWNLOAD_TYPES } from '../../06.database/12_download_manager.js';
import { showToast } from '../../01.common/14_toast.js';
import downloadHelper from '../../01.common/helpers/download_helper.js';
import logger from '../../01.common/23_logger.js';

// ============================================
// [SECTION: 백업 버튼 초기화]
// ============================================

/**
 * [함수: 백업 버튼 초기화]
 * HTML의 백업/다운로드 버튼에 이벤트 연결
 */
export function initSettingsBackupButton() {
    // 백업 버튼 찾기 (여러 패턴 지원)
    const backupBtn = document.getElementById('btn-backup-settings') ||
                     document.getElementById('btn-export-settings') ||
                     document.querySelector('button[onclick*="backup"]');

    if (backupBtn) {
        // 기존 onclick 제거
        backupBtn.removeAttribute('onclick');

        // 새 이벤트 리스너 추가
        backupBtn.addEventListener('click', showBackupOptions);
    } else {
        logger.warn('[시스템설정 백업] 백업 버튼을 찾을 수 없습니다');
    }

    // 복원 버튼도 있다면 초기화
    const restoreBtn = document.getElementById('btn-restore-settings');
    if (restoreBtn) {
        restoreBtn.addEventListener('click', showRestoreOptions);
    }
}

// ============================================
// [SECTION: 백업 옵션 모달]
// ============================================

/**
 * [함수: 시스템 설정 백업 옵션 모달]
 * download_helper를 사용한 간소화된 Modal 생성
 * 백업 형식 및 메모 입력은 additionalContent로 구현
 */
async function showBackupOptions() {
    const userInfo = downloadHelper.getUserInfo();
    if (!userInfo) return;

    const today = new Date().toLocaleDateString('ko-KR');

    // 백업 형식 및 메모 HTML (additionalContent)
    const additionalOptionsHTML = `
        <!-- 백업 형식 선택 -->
        <div class="option-group glass-card">
            <h3>💾 백업 형식</h3>
            <div class="format-options" style="display: flex; gap: 10px; flex-wrap: wrap;">
                <label class="format-option glass-card" style="flex: 1; min-width: 150px; padding: 15px; cursor: pointer; border: 2px solid transparent; transition: all 0.3s;">
                    <input type="radio" name="backup-format" value="excel" checked style="margin-right: 8px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 24px;">📊</span>
                        <div>
                            <div style="font-weight: 600;">Excel</div>
                            <small style="color: var(--text-secondary);">엑셀 파일</small>
                        </div>
                    </div>
                </label>

                <label class="format-option glass-card" style="flex: 1; min-width: 150px; padding: 15px; cursor: pointer; border: 2px solid transparent; transition: all 0.3s;">
                    <input type="radio" name="backup-format" value="json" style="margin-right: 8px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 24px;">📄</span>
                        <div>
                            <div style="font-weight: 600;">JSON</div>
                            <small style="color: var(--text-secondary);">복원용 구조화 파일</small>
                        </div>
                    </div>
                </label>
            </div>
        </div>

        <!-- 백업 메모 -->
        <div class="option-group glass-card">
            <h3>📝 백업 메모</h3>
            <textarea
                id="backup-memo"
                class="glass-input"
                placeholder="백업 사유나 특이사항을 입력하세요 (선택사항)"
                rows="3"
                style="width: 100%; resize: vertical;"
            ></textarea>
        </div>

        <!-- 백업 정보 배너 -->
        <div class="option-group glass-card" style="background: rgba(100, 181, 246, 0.05); border: 1px solid var(--primary-color);">
            <h3>ℹ️ 백업 정보</h3>
            <p>백업 일시: <strong>${today}</strong></p>
            <p>백업 관리자: <strong>${userInfo.userName}</strong></p>
            <p style="color: #f44336; font-size: 0.9em; margin-top: 10px;">
                ※ 백업 파일은 안전한 장소에 보관해주세요.<br>
                ※ 정기적인 백업을 권장합니다 (주 1회 이상).
            </p>
        </div>
    `;

    // 통합 다운로드 옵션 Modal 생성 (헬퍼 사용)
    const options = await downloadHelper.createDownloadOptionsModal({
        title: '시스템 설정 백업',
        icon: '💾',
        showDateRange: false,  // 백업은 현재 상태만
        showQuickPeriod: false,
        sheets: [
            {
                id: 'include-user-settings',
                label: '사용자 설정',
                description: '권한, 테마 등',
                checked: true,
                disabled: false
            },
            {
                id: 'include-system-settings',
                label: '시스템 설정',
                description: '전역 설정',
                checked: true,
                disabled: false
            },
            {
                id: 'include-menu-settings',
                label: '메뉴 및 권한 설정',
                description: '메뉴 구조 및 권한',
                checked: true,
                disabled: false
            },
            {
                id: 'include-notification-settings',
                label: '알림 설정',
                description: '알림 규칙',
                checked: false,
                disabled: false
            },
            {
                id: 'include-integration-settings',
                label: '외부 연동 설정',
                description: 'API 및 연동',
                checked: false,
                disabled: false
            }
        ],
        additionalContent: additionalOptionsHTML
    });

    // 사용자가 취소한 경우
    if (!options) return;

    // 관리자 권한 확인
    if (options.userRole !== 'admin') {
        showToast('시스템 설정 백업은 관리자만 가능합니다.', 'error');
        return;
    }

    // 백업 형식 및 메모 가져오기
    const format = document.querySelector('input[name="backup-format"]:checked')?.value || 'excel';
    const memo = document.getElementById('backup-memo')?.value || '';

    // 백업 옵션 매핑
    const backupOptions = {
        includeUser: options.selectedSheets.includes('사용자 설정'),
        includeSystem: options.selectedSheets.includes('시스템 설정'),
        includeMenu: options.selectedSheets.includes('메뉴 및 권한 설정'),
        includeNotification: options.selectedSheets.includes('알림 설정'),
        includeIntegration: options.selectedSheets.includes('외부 연동 설정'),
        memo: memo
    };

    // 백업 실행 (헬퍼의 execute 래퍼 사용)
    await downloadHelper.execute(async () => {
        const result = await downloadManager.download({
            downloadType: DOWNLOAD_TYPES.ADMIN_SETTINGS,
            userRole: 'admin',
            userName: options.userName,
            format: format,
            includeSheets: ['시스템설정'],
            backupOptions: backupOptions,
            dateRange: null
        });

        // 백업 이력 저장
        if (result.success) {
            await saveBackupHistory({
                format,
                options: backupOptions,
                backupBy: options.userName,
                backupAt: new Date().toISOString()
            });
        }

        return result;
    }, {
        downloadType: 'ADMIN_SETTINGS',
        userName: options.userName,
        showProgress: true,
        enableRetry: true
    });
}

// ============================================
// [SECTION: 백업 이력 저장]
// ============================================

/**
 * [함수: 백업 이력 저장]
 *
 * @param {Object} backupInfo - 백업 정보
 */
async function saveBackupHistory(backupInfo) {
    try {
        // 백엔드 API를 통해 DB에 저장
        const response = await fetch('/api/admin/backup-history', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                backupType: 'settings',
                backupBy: backupInfo.backupBy,
                format: backupInfo.format,
                memo: backupInfo.options?.memo,
                selectedSheets: Object.entries(backupInfo.options || {})
                    .filter(([key, value]) => key.startsWith('include') && value)
                    .map(([key]) => key),
                metadata: {
                    backupAt: backupInfo.backupAt
                }
            })
        });

        if (!response.ok) {
            throw new Error('백업 이력 저장 실패');
        }

        const result = await response.json();
        logger.info('[백업 이력 저장 성공]', result);

    } catch (error) {
        logger.error('[백업 이력 저장 오류]', error);
        // 실패해도 백업 자체는 성공이므로 에러를 표시하지 않음
    }
}

// ============================================
// [SECTION: 빠른 백업]
// ============================================

/**
 * [함수: 빠른 백업 (옵션 없이 즉시 백업)]
 */
export async function quickBackup() {
    // 사용자 정보 가져오기 (헬퍼 사용)
    const userInfo = downloadHelper.getUserInfo();
    if (!userInfo) return;

    if (userInfo.userRole !== 'admin') {
        showToast('시스템 설정 백업은 관리자만 가능합니다.', 'error');
        return;
    }

    // 백업 실행 (헬퍼의 execute 래퍼 사용)
    await downloadHelper.execute(async () => {
        return await downloadManager.download({
            downloadType: DOWNLOAD_TYPES.ADMIN_SETTINGS,
            userRole: 'admin',
            userName: userInfo.userName,
            format: 'excel',
            includeSheets: ['시스템설정'],
            dateRange: null
        });
    }, {
        downloadType: 'ADMIN_SETTINGS',
        userName: userInfo.userName,
        showProgress: true
    });
}

// ============================================
// [SECTION: 복원 옵션 모달]
// ============================================

/**
 * [함수: 시스템 설정 복원 옵션 모달]
 *
 * @note 향후 구현 예정: 백업 파일 업로드 → 파싱 → 시스템 설정 복원
 */
async function showRestoreOptions() {
    showToast('설정 복원 기능은 준비 중입니다', 'info');
}

// ============================================
// [SECTION: 백업 이력 조회]
// ============================================

/**
 * [함수: 백업 이력 조회]
 *
 * @param {string} backupType - 백업 타입 ('settings', 'full_backup')
 * @returns {Promise<Array>} 백업 이력 배열
 */
export async function getBackupHistory(backupType = 'settings') {
    try {
        const response = await fetch(`/api/admin/backup-history?backupType=${backupType}&limit=20`);

        if (!response.ok) {
            throw new Error('백업 이력 조회 실패');
        }

        const result = await response.json();
        return result.history || [];

    } catch (error) {
        logger.error('[백업 이력 조회 오류]', error);
        return [];
    }
}

// ============================================
// [SECTION: Export]
// ============================================

export default {
    initSettingsBackupButton,
    showBackupOptions,
    showRestoreOptions,
    quickBackup,
    getBackupHistory,
    saveBackupHistory
};
