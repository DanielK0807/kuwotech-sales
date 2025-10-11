/**
 * ============================================
 * KUWOTECH 영업관리 시스템 - 시스템 설정 백업
 * ============================================
 * 
 * @파일명: 03_download.js
 * @작성자: System
 * @작성일: 2025-09-30
 * @버전: 1.0
 * 
 * @설명:
 * 관리자의 시스템 설정 백업 및 다운로드 기능
 * 통합 다운로드 매니저를 사용하여 체계적인 백업 제공
 */

// ============================================
// [SECTION: Import]
// ============================================

import downloadManager, { DOWNLOAD_TYPES } from '../../06.database/12_download_manager.js';
import { showToast } from '../../01.common/14_toast.js';
import { showModal } from '../../01.common/06_modal.js';

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
        console.warn('[시스템설정 백업] 백업 버튼을 찾을 수 없습니다');
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
 */
async function showBackupOptions() {
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    const today = new Date().toLocaleDateString('ko-KR');
    
    const modalContent = `
        <div class="backup-options-container">
            <div class="backup-option-section">
                <h4 class="section-title">💾 백업 형식</h4>
                <div class="format-options">
                    <label class="format-option glass-card">
                        <input type="radio" name="backup-format" value="excel" checked>
                        <div class="format-icon">📊</div>
                        <div class="format-info">
                            <div class="format-name">Excel (엑셀)</div>
                            <div class="format-desc">시스템 설정을 엑셀 파일로 백업</div>
                        </div>
                    </label>
                    
                    <label class="format-option glass-card">
                        <input type="radio" name="backup-format" value="json">
                        <div class="format-icon">📄</div>
                        <div class="format-info">
                            <div class="format-name">JSON (구조화)</div>
                            <div class="format-desc">복원에 최적화된 JSON 형식</div>
                        </div>
                    </label>
                </div>
            </div>
            
            <div class="backup-option-section">
                <h4 class="section-title">🎯 백업 범위</h4>
                <div class="checkbox-options">
                    <label class="checkbox-option">
                        <input type="checkbox" id="include-user-settings" checked>
                        <span>사용자 설정 (권한, 테마 등)</span>
                    </label>
                    
                    <label class="checkbox-option">
                        <input type="checkbox" id="include-system-settings" checked>
                        <span>시스템 설정 (전역 설정)</span>
                    </label>
                    
                    <label class="checkbox-option">
                        <input type="checkbox" id="include-menu-settings" checked>
                        <span>메뉴 및 권한 설정</span>
                    </label>
                    
                    <label class="checkbox-option">
                        <input type="checkbox" id="include-notification-settings">
                        <span>알림 설정</span>
                    </label>
                    
                    <label class="checkbox-option">
                        <input type="checkbox" id="include-integration-settings">
                        <span>외부 연동 설정</span>
                    </label>
                </div>
            </div>
            
            <div class="backup-option-section">
                <h4 class="section-title">📝 백업 메모</h4>
                <textarea 
                    id="backup-memo" 
                    class="backup-memo-input"
                    placeholder="백업 사유나 특이사항을 입력하세요 (선택사항)"
                    rows="3"
                ></textarea>
            </div>
            
            <div class="backup-info glass-card">
                <div class="info-icon">ℹ️</div>
                <div class="info-text">
                    <strong>백업 정보:</strong>
                    <br>백업 일시: <strong>${today}</strong>
                    <br>백업 관리자: <strong>${user.name || '시스템'}</strong>
                    <br>
                    <br>백업 파일은 <strong>안전한 장소</strong>에 보관해주세요.
                    <br>설정 복원 시 이 파일이 필요합니다.
                    <br>
                    <br><em>※ 정기적인 백업을 권장합니다 (주 1회 이상)</em>
                </div>
            </div>
        </div>
        
        <style>
            .backup-options-container {
                padding: 10px;
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
            
            .checkbox-option span {
                font-size: 14px;
                color: var(--text-primary);
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
                color: #00E676;
                font-style: normal;
                font-size: 12px;
            }
        </style>
    `;
    
    const result = await showModal({
        title: '💾 시스템 설정 백업',
        content: modalContent,
        size: 'medium',
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
                    const format = document.querySelector('input[name="backup-format"]:checked')?.value || 'excel';
                    const includeUser = document.getElementById('include-user-settings')?.checked || false;
                    const includeSystem = document.getElementById('include-system-settings')?.checked || false;
                    const includeMenu = document.getElementById('include-menu-settings')?.checked || false;
                    const includeNotification = document.getElementById('include-notification-settings')?.checked || false;
                    const includeIntegration = document.getElementById('include-integration-settings')?.checked || false;
                    const memo = document.getElementById('backup-memo')?.value || '';
                    
                    // 최소 하나는 선택되어야 함
                    if (!includeUser && !includeSystem && !includeMenu && !includeNotification && !includeIntegration) {
                        showToast('최소 하나 이상의 백업 항목을 선택해주세요', 'warning');
                        return false;
                    }
                    
                    // 백업 실행
                    await executeBackup(format, {
                        includeUser,
                        includeSystem,
                        includeMenu,
                        includeNotification,
                        includeIntegration,
                        memo
                    });
                    
                    return true;
                }
            }
        ]
    });
}

// ============================================
// [SECTION: 백업 실행]
// ============================================

/**
 * [함수: 시스템 설정 백업 실행]
 * 
 * @param {string} format - 백업 형식 ('excel' | 'json')
 * @param {Object} options - 백업 옵션
 */
async function executeBackup(format, options = {}) {
    try {
        const user = JSON.parse(sessionStorage.getItem('user') || '{}');
        
        // 관리자 권한 확인
        if (user.role !== 'admin') {
            showToast('시스템 설정 백업은 관리자만 가능합니다.', 'error');
            return;
        }
        
        
        // 통합 다운로드 매니저 호출
        const result = await downloadManager.download({
            downloadType: DOWNLOAD_TYPES.ADMIN_SETTINGS,
            userRole: 'admin',
            userName: user.name,
            format: format,
            includeSheets: ['시스템설정'],
            backupOptions: {
                includeUser: options.includeUser,
                includeSystem: options.includeSystem,
                includeMenu: options.includeMenu,
                includeNotification: options.includeNotification,
                includeIntegration: options.includeIntegration,
                memo: options.memo
            },
            dateRange: null
        });
        
        if (result.success) {
            
            // 백업 이력 저장 (TODO: 구현 필요)
            await saveBackupHistory({
                format,
                options,
                backupBy: user.name,
                backupAt: new Date().toISOString()
            });
            
            // 성공 메시지는 downloadManager에서 표시
        } else {
            console.error('[시스템설정 백업] 실패:', result.error);
            showToast('백업 실패: ' + (result.error || '알 수 없는 오류'), 'error');
        }
        
    } catch (error) {
        console.error('[시스템설정 백업] 오류:', error);
        showToast('백업 중 오류가 발생했습니다.', 'error');
    }
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
        // TODO: IndexedDB에 백업 이력 저장
        
        // localStorage에 임시 저장 (TODO: IndexedDB로 이전)
        const history = JSON.parse(localStorage.getItem('backup_history') || '[]');
        history.unshift(backupInfo);
        
        // 최근 20개만 유지
        if (history.length > 20) {
            history.splice(20);
        }
        
        localStorage.setItem('backup_history', JSON.stringify(history));
        
    } catch (error) {
        console.error('[백업 이력 저장 오류]', error);
    }
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
    
    /*
    const modalContent = `
        <div class="restore-options-container">
            <div class="file-upload-section">
                <h4 class="section-title">📂 백업 파일 선택</h4>
                <input type="file" id="restore-file" accept=".xlsx,.json">
            </div>
            
            <div class="restore-options">
                <h4 class="section-title">⚙️ 복원 옵션</h4>
                <label>
                    <input type="checkbox" id="restore-overwrite" checked>
                    기존 설정 덮어쓰기
                </label>
                <label>
                    <input type="checkbox" id="restore-backup-current">
                    현재 설정 백업 후 복원
                </label>
            </div>
        </div>
    `;
    */
}

// ============================================
// [SECTION: 빠른 백업]
// ============================================

/**
 * [함수: 빠른 백업 (옵션 없이 즉시 백업)]
 */
export async function quickBackup() {
    try {
        const user = JSON.parse(sessionStorage.getItem('user') || '{}');
        
        if (user.role !== 'admin') {
            showToast('시스템 설정 백업은 관리자만 가능합니다.', 'error');
            return;
        }
        
        
        await downloadManager.download({
            downloadType: DOWNLOAD_TYPES.ADMIN_SETTINGS,
            userRole: 'admin',
            userName: user.name,
            format: 'excel',
            includeSheets: ['시스템설정'],
            dateRange: null
        });
        
    } catch (error) {
        console.error('[빠른 백업] 오류:', error);
        showToast('백업 중 오류가 발생했습니다.', 'error');
    }
}

// ============================================
// [SECTION: 백업 이력 조회]
// ============================================

/**
 * [함수: 백업 이력 조회]
 * 
 * @returns {Array} 백업 이력 배열
 */
export function getBackupHistory() {
    try {
        return JSON.parse(localStorage.getItem('backup_history') || '[]');
    } catch (error) {
        console.error('[백업 이력 조회 오류]', error);
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
    executeBackup,
    quickBackup,
    getBackupHistory,
    saveBackupHistory
};
