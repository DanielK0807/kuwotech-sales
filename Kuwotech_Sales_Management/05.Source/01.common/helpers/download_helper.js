/**
 * ============================================
 * KUWOTECH 영업관리 시스템 - 다운로드 헬퍼
 * ============================================
 * 
 * @파일명: download_helper.js
 * @작성자: System
 * @작성일: 2025-09-30
 * @버전: 2.0
 * 
 * @설명:
 * 다운로드 기능의 오류 처리, 로딩 UI, 로그 기록을 통합 관리하는 헬퍼
 * 
 * @주요기능:
 * - 강화된 오류 처리
 * - 자동 로딩 UI 표시
 * - 상세 로그 기록
 * - 재시도 메커니즘
 */

// ============================================
// [SECTION: Import]
// ============================================

import logger from '../23_logger.js';
import { showToast } from '../14_toast.js';
import Modal from '../06_modal.js';
import { DownloadProgress } from '../../06.database/13_download_progress.js';

// ============================================
// [SECTION: 다운로드 로거 클래스]
// ============================================

class DownloadLogger {
    constructor() {
        this.logs = [];
        this.maxLogs = 100;
    }
    
    /**
     * 로그 기록
     */
    log(level, message, data = {}) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            data,
            user: sessionStorage.getItem('userName') || 'SYSTEM',
            role: sessionStorage.getItem('userRole') || 'UNKNOWN'
        };
        
        this.logs.push(logEntry);
        
        // 최대 로그 수 초과시 오래된 것 제거
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }

        // 로거 출력
        const logMethod = {
            'info': 'info',
            'warn': 'warn',
            'error': 'error',
            'success': 'info'
        }[level] || 'info';

        logger[logMethod](`[다운로드 ${level.toUpperCase()}] ${message}`, data);
        
        // localStorage에 저장 (선택적)
        this.saveToLocalStorage();
    }
    
    /**
     * 로컬 스토리지에 저장
     */
    saveToLocalStorage() {
        try {
            const recentLogs = this.logs.slice(-50); // 최근 50개만 저장
            localStorage.setItem('downloadLogs', JSON.stringify(recentLogs));
        } catch (error) {
            logger.warn('로그 저장 실패:', error);
        }
    }
    
    /**
     * 로그 조회
     */
    getLogs(filter = {}) {
        let filteredLogs = [...this.logs];
        
        if (filter.level) {
            filteredLogs = filteredLogs.filter(log => log.level === filter.level);
        }
        
        if (filter.startDate) {
            filteredLogs = filteredLogs.filter(log => 
                new Date(log.timestamp) >= new Date(filter.startDate)
            );
        }
        
        if (filter.endDate) {
            filteredLogs = filteredLogs.filter(log => 
                new Date(log.timestamp) <= new Date(filter.endDate)
            );
        }
        
        return filteredLogs;
    }
    
    /**
     * 로그 내보내기
     */
    exportLogs() {
        const logsText = this.logs.map(log => 
            `[${log.timestamp}] [${log.level}] ${log.user}: ${log.message}`
        ).join('\n');
        
        const blob = new Blob([logsText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `download_logs_${new Date().toISOString().split('T')[0]}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    }
    
    /**
     * 로그 초기화
     */
    clearLogs() {
        this.logs = [];
        localStorage.removeItem('downloadLogs');
    }
}

// 싱글톤 인스턴스
const downloadLogger = new DownloadLogger();

// ============================================
// [SECTION: 다운로드 헬퍼 클래스]
// ============================================

class DownloadHelper {
    constructor() {
        this.progress = new DownloadProgress();
        this.logger = downloadLogger;
        this.retryCount = 3;
        this.retryDelay = 1000;
    }
    
    /**
     * 다운로드 실행 (강화된 오류 처리 포함)
     * 
     * @param {Function} downloadFn - 다운로드 함수
     * @param {Object} options - 옵션
     * @returns {Promise<{success: boolean, data?: any, error?: string}>}
     */
    async execute(downloadFn, options = {}) {
        const {
            downloadType = 'UNKNOWN',
            userName = sessionStorage.getItem('userName') || 'SYSTEM',
            showProgress = true,
            enableRetry = true,
            onProgress = null
        } = options;
        
        // 로그 기록
        this.logger.log('info', '다운로드 시작', {
            downloadType,
            userName,
            timestamp: new Date().toISOString()
        });
        
        // 로딩 UI 표시
        if (showProgress) {
            this.progress.show();
            this.progress.update(0, '다운로드를 준비하고 있습니다...');
        }
        
        let lastError = null;
        let attempt = 0;
        const maxAttempts = enableRetry ? this.retryCount : 1;
        
        // 재시도 루프
        while (attempt < maxAttempts) {
            attempt++;
            
            try {
                // 재시도인 경우 메시지 표시
                if (attempt > 1) {
                    this.logger.log('warn', `다운로드 재시도 ${attempt}/${maxAttempts}`, {
                        downloadType,
                        previousError: lastError
                    });
                    
                    if (showProgress) {
                        this.progress.update(
                            10 * attempt, 
                            `재시도 중... (${attempt}/${maxAttempts})`
                        );
                    }
                    
                    // 재시도 전 대기
                    await this.delay(this.retryDelay * attempt);
                }
                
                // 단계별 진행 상태 업데이트
                if (showProgress && onProgress) {
                    this.setupProgressCallbacks(onProgress);
                }
                
                // 실제 다운로드 실행
                const result = await this.executeWithTimeout(downloadFn, 60000); // 60초 타임아웃
                
                // 성공 처리
                if (showProgress) {
                    this.progress.update(100, '다운로드 완료!');
                    this.progress.showSuccess('파일이 성공적으로 다운로드되었습니다.');
                    setTimeout(() => this.progress.hide(), 1500);
                }
                
                this.logger.log('success', '다운로드 성공', {
                    downloadType,
                    userName,
                    attempt,
                    timestamp: new Date().toISOString()
                });
                
                showToast('다운로드가 완료되었습니다!', 'success');
                
                return {
                    success: true,
                    data: result,
                    attempt
                };
                
            } catch (error) {
                lastError = error;
                
                this.logger.log('error', `다운로드 실패 (시도 ${attempt}/${maxAttempts})`, {
                    downloadType,
                    userName,
                    error: error.message,
                    stack: error.stack
                });
                
                // 마지막 시도가 아니면 계속
                if (attempt < maxAttempts) {
                    continue;
                }
                
                // 모든 재시도 실패
                break;
            }
        }
        
        // 실패 처리
        const errorMessage = this.getErrorMessage(lastError);
        
        if (showProgress) {
            this.progress.showError(errorMessage);
            setTimeout(() => this.progress.hide(), 3000);
        }
        
        this.logger.log('error', '다운로드 최종 실패', {
            downloadType,
            userName,
            attempts: attempt,
            error: errorMessage,
            timestamp: new Date().toISOString()
        });
        
        // 사용자에게 상세 오류 모달 표시
        await this.showErrorModal(errorMessage, lastError, downloadType);
        
        return {
            success: false,
            error: errorMessage,
            attempts: attempt
        };
    }
    
    /**
     * 타임아웃 포함 실행
     */
    async executeWithTimeout(fn, timeout) {
        return Promise.race([
            fn(),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('다운로드 시간 초과')), timeout)
            )
        ]);
    }
    
    /**
     * 진행 상태 콜백 설정
     */
    setupProgressCallbacks(onProgress) {
        const stages = [
            { percent: 20, message: '데이터를 수집하는 중...' },
            { percent: 40, message: '데이터를 처리하는 중...' },
            { percent: 60, message: '파일을 생성하는 중...' },
            { percent: 80, message: '최종 검증 중...' }
        ];
        
        stages.forEach((stage, index) => {
            setTimeout(() => {
                this.progress.update(stage.percent, stage.message);
                if (onProgress) {
                    onProgress(stage.percent, stage.message);
                }
            }, index * 2000);
        });
    }
    
    /**
     * 사용자 친화적 오류 메시지 생성
     */
    getErrorMessage(error) {
        if (!error) {
            return '알 수 없는 오류가 발생했습니다.';
        }
        
        const errorMap = {
            'NetworkError': '네트워크 연결을 확인해주세요.',
            'TimeoutError': '다운로드 시간이 초과되었습니다. 다시 시도해주세요.',
            'PermissionError': '다운로드 권한이 없습니다. 관리자에게 문의하세요.',
            'DataError': '데이터 처리 중 오류가 발생했습니다.',
            'StorageError': '저장 공간이 부족합니다.',
            'QuotaExceededError': '저장 공간이 부족합니다.'
        };
        
        // 에러 타입별 메시지
        for (const [type, message] of Object.entries(errorMap)) {
            if (error.name === type || error.message.includes(type)) {
                return message;
            }
        }
        
        // 기본 메시지
        return error.message || '다운로드 중 오류가 발생했습니다.';
    }
    
    /**
     * 오류 상세 모달 표시
     */
    async showErrorModal(errorMessage, error, downloadType) {
        const modal = new Modal({
            title: '❌ 다운로드 실패',
            size: 'md',
            content: `
                <div class="error-modal-content">
                    <div class="error-icon">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#f44336" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="12" y1="8" x2="12" y2="12"/>
                            <line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                    </div>
                    
                    <div class="error-message">
                        <h4>다운로드 중 문제가 발생했습니다</h4>
                        <p>${errorMessage}</p>
                    </div>
                    
                    <div class="error-details glass-card">
                        <strong>다운로드 유형:</strong> ${downloadType}<br>
                        <strong>발생 시간:</strong> ${new Date().toLocaleString('ko-KR')}<br>
                        <strong>사용자:</strong> ${sessionStorage.getItem('userName') || 'UNKNOWN'}
                    </div>
                    
                    <div class="error-suggestions">
                        <h5>💡 해결 방법:</h5>
                        <ul>
                            <li>네트워크 연결 상태를 확인해주세요</li>
                            <li>브라우저 캐시를 지우고 다시 시도해주세요</li>
                            <li>문제가 계속되면 관리자에게 문의하세요</li>
                        </ul>
                    </div>
                </div>
                
                <style>
                    .error-modal-content {
                        text-align: center;
                        padding: 20px;
                    }
                    
                    .error-icon {
                        margin-bottom: 20px;
                        animation: shake 0.5s ease;
                    }
                    
                    @keyframes shake {
                        0%, 100% { transform: translateX(0); }
                        25% { transform: translateX(-10px); }
                        75% { transform: translateX(10px); }
                    }
                    
                    .error-message h4 {
                        color: #f44336;
                        margin-bottom: 10px;
                        font-size: 1.2em;
                    }
                    
                    .error-message p {
                        color: var(--text-secondary);
                        margin-bottom: 20px;
                    }
                    
                    .error-details {
                        text-align: left;
                        padding: 15px;
                        background: rgba(244, 67, 54, 0.05);
                        border: 1px solid rgba(244, 67, 54, 0.2);
                        border-radius: 8px;
                        margin-bottom: 20px;
                        font-size: 0.9em;
                        line-height: 1.8;
                    }
                    
                    .error-suggestions {
                        text-align: left;
                        padding: 15px;
                        background: rgba(255, 193, 7, 0.05);
                        border-radius: 8px;
                    }
                    
                    .error-suggestions h5 {
                        margin-bottom: 10px;
                        color: var(--text-primary);
                    }
                    
                    .error-suggestions ul {
                        margin: 0;
                        padding-left: 20px;
                    }
                    
                    .error-suggestions li {
                        margin-bottom: 8px;
                        color: var(--text-secondary);
                    }
                </style>
            `,
            buttons: [
                {
                    text: '로그 보기',
                    className: 'btn-secondary',
                    onClick: () => {
                        this.showLogViewer();
                        return false;
                    }
                },
                {
                    text: '다시 시도',
                    className: 'btn-primary',
                    onClick: () => {
                        window.location.reload();
                        return true;
                    }
                },
                {
                    text: '닫기',
                    className: 'btn-secondary',
                    onClick: () => true
                }
            ]
        });
        
        modal.open();
    }
    
    /**
     * 로그 뷰어 표시
     */
    showLogViewer() {
        const logs = this.logger.getLogs();
        const logsHtml = logs.slice(-20).reverse().map(log => `
            <div class="log-entry log-${log.level}">
                <span class="log-time">${new Date(log.timestamp).toLocaleTimeString('ko-KR')}</span>
                <span class="log-level">${log.level.toUpperCase()}</span>
                <span class="log-message">${log.message}</span>
            </div>
        `).join('');
        
        const modal = new Modal({
            title: '📋 다운로드 로그',
            size: 'lg',
            content: `
                <div class="log-viewer">
                    <div class="log-header">
                        <button class="btn-small" onclick="window.downloadHelper.logger.exportLogs()">
                            내보내기
                        </button>
                        <button class="btn-small" onclick="window.downloadHelper.logger.clearLogs(); window.location.reload();">
                            초기화
                        </button>
                    </div>
                    <div class="log-list">
                        ${logsHtml || '<p class="no-logs">로그가 없습니다.</p>'}
                    </div>
                </div>
                
                <style>
                    .log-viewer {
                        max-height: 500px;
                    }
                    
                    .log-header {
                        display: flex;
                        justify-content: flex-end;
                        gap: 10px;
                        margin-bottom: 15px;
                    }
                    
                    .btn-small {
                        padding: 6px 12px;
                        font-size: 0.85em;
                        border: 1px solid var(--glass-border);
                        background: var(--glass-bg);
                        border-radius: 6px;
                        cursor: pointer;
                        transition: all 0.3s ease;
                    }
                    
                    .btn-small:hover {
                        background: var(--primary-color);
                        color: white;
                        border-color: var(--primary-color);
                    }
                    
                    .log-list {
                        max-height: 400px;
                        overflow-y: auto;
                        border: 1px solid var(--glass-border);
                        border-radius: 8px;
                        padding: 10px;
                        background: rgba(0, 0, 0, 0.02);
                    }
                    
                    .log-entry {
                        padding: 10px;
                        margin-bottom: 8px;
                        border-left: 3px solid #ccc;
                        background: white;
                        border-radius: 4px;
                        font-size: 0.9em;
                        display: flex;
                        gap: 10px;
                        align-items: center;
                    }
                    
                    .log-entry.log-info { border-left-color: #2196F3; }
                    .log-entry.log-warn { border-left-color: #FF9800; }
                    .log-entry.log-error { border-left-color: #F44336; }
                    .log-entry.log-success { border-left-color: #4CAF50; }
                    
                    .log-time {
                        color: var(--text-muted);
                        font-size: 0.85em;
                        white-space: nowrap;
                    }
                    
                    .log-level {
                        font-weight: 600;
                        padding: 2px 8px;
                        border-radius: 4px;
                        font-size: 0.75em;
                        white-space: nowrap;
                    }
                    
                    .log-entry.log-info .log-level { background: #E3F2FD; color: #1976D2; }
                    .log-entry.log-warn .log-level { background: #FFF3E0; color: #F57C00; }
                    .log-entry.log-error .log-level { background: #FFEBEE; color: #C62828; }
                    .log-entry.log-success .log-level { background: #E8F5E9; color: #2E7D32; }
                    
                    .log-message {
                        flex: 1;
                        color: var(--text-primary);
                    }
                    
                    .no-logs {
                        text-align: center;
                        color: var(--text-muted);
                        padding: 40px;
                    }
                </style>
            `,
            buttons: [
                {
                    text: '닫기',
                    className: 'btn-primary'
                }
            ]
        });
        
        modal.open();
    }
    
    /**
     * 딜레이 함수
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * 사용자 확인 대화상자
     */
    async confirm(message, title = '확인') {
        return new Promise((resolve) => {
            const modal = new Modal({
                title,
                size: 'sm',
                content: `<p>${message}</p>`,
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
                        text: '확인',
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
    }
}

// 싱글톤 인스턴스
const downloadHelper = new DownloadHelper();

// 전역 노출 (로그 뷰어에서 사용)
if (typeof window !== 'undefined') {
    window.downloadHelper = downloadHelper;
}

// ============================================
// [SECTION: Export]
// ============================================

export default downloadHelper;
export { DownloadHelper, DownloadLogger, downloadLogger };
