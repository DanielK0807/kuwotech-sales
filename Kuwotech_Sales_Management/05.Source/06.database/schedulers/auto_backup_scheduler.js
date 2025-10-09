/**
 * KUWOTECH 영업관리 시스템 - 자동 백업 스케줄러
 * Created by: Daniel.K
 * Date: 2025-01-27
 * Description: 정기적인 자동 백업 실행 및 관리
 */

// ============================================
// [섹션: Import]
// ============================================

import { createBackup, exportBackupToExcel, cleanOldBackups } from '../07_backup.js';
import { showToast } from '../../01.common/14_toast.js';
import GlobalConfig from '../../01.common/01_global_config.js';

// ============================================
// [섹션: 자동 백업 스케줄러 클래스]
// ============================================

export class AutoBackupScheduler {
    constructor() {
        this.schedules = {
            daily: '0 0 * * *',     // 매일 자정
            weekly: '0 23 * * 0',   // 일요일 23시
            monthly: '0 23 L * *'   // 월말 23시
        };
        
        this.backupConfig = {
            daily: {
                enabled: true,
                retentionDays: 30,
                lastRun: null,
                interval: 24 * 60 * 60 * 1000 // 24시간
            },
            weekly: {
                enabled: false,
                retentionDays: 90,
                lastRun: null,
                interval: 7 * 24 * 60 * 60 * 1000 // 7일
            },
            monthly: {
                enabled: false,
                retentionDays: 365,
                lastRun: null,
                interval: 30 * 24 * 60 * 60 * 1000 // 30일
            }
        };
        
        this.isRunning = false;
        this.timers = {};
        
        // 설정 로드
        this.loadSettings();
    }
    
    // ============================================
    // [섹션: 초기화 및 시작]
    // ============================================
    
    /**
     * [기능: 스케줄러 시작]
     */
    async start() {
        if (this.isRunning) {
            console.log('[자동 백업] 이미 실행 중입니다');
            return;
        }
        
        this.isRunning = true;
        console.log('[자동 백업] 스케줄러 시작');
        
        // 각 백업 유형별로 스케줄 설정
        for (const [type, config] of Object.entries(this.backupConfig)) {
            if (config.enabled) {
                await this.scheduleBackup(type);
            }
        }
        
        // 페이지 로드 시 백업 체크
        await this.checkAndRunBackups();
        
        // 1시간마다 백업 체크
        this.timers.checker = setInterval(() => {
            this.checkAndRunBackups();
        }, 60 * 60 * 1000); // 1시간
        
        console.log('[자동 백업] 스케줄러 시작 완료');
    }
    
    /**
     * [기능: 스케줄러 정지]
     */
    stop() {
        this.isRunning = false;
        
        // 모든 타이머 정리
        Object.values(this.timers).forEach(timer => {
            clearInterval(timer);
        });
        
        this.timers = {};
        console.log('[자동 백업] 스케줄러 정지');
    }
    
    // ============================================
    // [섹션: 백업 실행]
    // ============================================
    
    /**
     * [기능: 백업 체크 및 실행]
     */
    async checkAndRunBackups() {
        const now = Date.now();
        
        for (const [type, config] of Object.entries(this.backupConfig)) {
            if (!config.enabled) continue;
            
            const lastRun = config.lastRun ? new Date(config.lastRun).getTime() : 0;
            const timeSinceLastRun = now - lastRun;
            
            // 백업 간격이 지났는지 확인
            if (timeSinceLastRun >= config.interval) {
                console.log(`[자동 백업] ${type} 백업 실행 필요`);
                await this.executeBackup(type);
            }
        }
    }
    
    /**
     * [기능: 백업 스케줄 설정]
     * @param {string} type - 백업 유형 (daily/weekly/monthly)
     */
    async scheduleBackup(type) {
        const config = this.backupConfig[type];
        
        if (!config || !config.enabled) {
            console.log(`[자동 백업] ${type} 백업 비활성화됨`);
            return;
        }
        
        // 다음 실행 시간 계산
        const nextRunTime = this.calculateNextRunTime(type);
        const delay = nextRunTime - Date.now();
        
        if (delay > 0) {
            console.log(`[자동 백업] ${type} 백업 예약: ${new Date(nextRunTime).toLocaleString('ko-KR')}`);
            
            this.timers[type] = setTimeout(async () => {
                await this.executeBackup(type);
                // 다음 백업 재스케줄
                await this.scheduleBackup(type);
            }, delay);
        }
    }
    
    /**
     * [기능: 백업 실행]
     * @param {string} type - 백업 유형
     */
    async executeBackup(type) {
        try {
            console.log(`[자동 백업] ${type} 백업 시작`);
            
            const timestamp = new Date().toISOString();
            const filename = this.generateFilename(type, timestamp);
            
            // 백업 생성
            const backup = await createBackup({
                description: `${type} 자동 백업`,
                includeHistory: type !== 'daily', // 일일 백업은 이력 제외
                compress: type === 'monthly' // 월간 백업만 압축
            });
            
            // 엑셀 파일로 내보내기
            if (GlobalConfig.AUTO_BACKUP.EXPORT_TO_EXCEL) {
                await exportBackupToExcel(backup, filename);
            }
            
            // 백업 성공 기록
            this.backupConfig[type].lastRun = timestamp;
            await this.saveSettings();
            
            // 오래된 백업 삭제
            await this.cleanOldBackups(type);
            
            console.log(`[자동 백업] ${type} 백업 완료`);
            
            // 알림 표시 (옵션)
            if (GlobalConfig.AUTO_BACKUP.SHOW_NOTIFICATION) {
                this.showBackupNotification(type, 'success');
            }
            
        } catch (error) {
            console.error(`[자동 백업] ${type} 백업 실패:`, error);
            
            // 에러 알림
            if (GlobalConfig.AUTO_BACKUP.SHOW_NOTIFICATION) {
                this.showBackupNotification(type, 'error', error.message);
            }
        }
    }
    
    // ============================================
    // [섹션: 유틸리티 메서드]
    // ============================================
    
    /**
     * [기능: 다음 실행 시간 계산]
     * @param {string} type - 백업 유형
     * @returns {number} 타임스탬프
     */
    calculateNextRunTime(type) {
        const now = new Date();
        let nextRun = new Date();
        
        switch (type) {
            case 'daily':
                // 다음날 자정
                nextRun.setDate(nextRun.getDate() + 1);
                nextRun.setHours(0, 0, 0, 0);
                break;
                
            case 'weekly':
                // 다음 일요일 23시
                const daysToSunday = (7 - now.getDay()) || 7;
                nextRun.setDate(nextRun.getDate() + daysToSunday);
                nextRun.setHours(23, 0, 0, 0);
                break;
                
            case 'monthly':
                // 다음달 말일 23시
                nextRun.setMonth(nextRun.getMonth() + 1);
                nextRun.setDate(0); // 말일
                nextRun.setHours(23, 0, 0, 0);
                break;
        }
        
        return nextRun.getTime();
    }
    
    /**
     * [기능: 파일명 생성]
     * @param {string} type - 백업 유형
     * @param {string} timestamp - 타임스탬프
     * @returns {string} 파일명
     */
    generateFilename(type, timestamp) {
        const date = new Date(timestamp);
        const dateStr = date.toISOString().split('T')[0];
        const timeStr = date.toTimeString().split(' ')[0].replace(/:/g, '');
        
        return `영업관리기초자료_${type}_백업_${dateStr}_${timeStr}.xlsx`;
    }
    
    /**
     * [기능: 오래된 백업 정리]
     * @param {string} type - 백업 유형
     */
    async cleanOldBackups(type) {
        const config = this.backupConfig[type];
        const retentionMs = config.retentionDays * 24 * 60 * 60 * 1000;
        const cutoffDate = Date.now() - retentionMs;
        
        try {
            await cleanOldBackups({
                type: type,
                cutoffDate: new Date(cutoffDate)
            });
            
            console.log(`[자동 백업] ${type} 백업 정리 완료 (${config.retentionDays}일 이상)`);
            
        } catch (error) {
            console.error(`[자동 백업] ${type} 백업 정리 실패:`, error);
        }
    }
    
    /**
     * [기능: 백업 알림 표시]
     * @param {string} type - 백업 유형
     * @param {string} status - 성공/실패
     * @param {string} message - 추가 메시지
     */
    showBackupNotification(type, status, message = '') {
        const typeNames = {
            daily: '일일',
            weekly: '주간',
            monthly: '월간'
        };
        
        const typeName = typeNames[type] || type;
        
        if (status === 'success') {
            showToast(`${typeName} 백업이 완료되었습니다`, 'success');
        } else {
            showToast(`${typeName} 백업 실패: ${message}`, 'error');
        }
    }
    
    // ============================================
    // [섹션: 설정 저장/로드]
    // ============================================
    
    /**
     * [기능: 설정 저장]
     */
    async saveSettings() {
        try {
            const settings = {
                backupConfig: this.backupConfig,
                lastSaved: new Date().toISOString()
            };
            
            localStorage.setItem('autoBackupSettings', JSON.stringify(settings));
            
        } catch (error) {
            console.error('[자동 백업] 설정 저장 실패:', error);
        }
    }
    
    /**
     * [기능: 설정 로드]
     */
    loadSettings() {
        try {
            const saved = localStorage.getItem('autoBackupSettings');
            
            if (saved) {
                const settings = JSON.parse(saved);
                
                // 기존 설정과 병합
                Object.assign(this.backupConfig, settings.backupConfig || {});
                
                console.log('[자동 백업] 설정 로드 완료');
            }
            
        } catch (error) {
            console.error('[자동 백업] 설정 로드 실패:', error);
        }
    }
    
    // ============================================
    // [섹션: 설정 관리 API]
    // ============================================
    
    /**
     * [기능: 백업 설정 변경]
     * @param {string} type - 백업 유형
     * @param {Object} config - 설정
     */
    async updateBackupConfig(type, config) {
        if (!this.backupConfig[type]) {
            throw new Error(`잘못된 백업 유형: ${type}`);
        }
        
        const wasEnabled = this.backupConfig[type].enabled;
        
        // 설정 업데이트
        Object.assign(this.backupConfig[type], config);
        
        // 설정 저장
        await this.saveSettings();
        
        // 스케줄 재설정
        if (wasEnabled !== config.enabled) {
            if (config.enabled) {
                // 백업 활성화
                await this.scheduleBackup(type);
            } else {
                // 백업 비활성화
                if (this.timers[type]) {
                    clearTimeout(this.timers[type]);
                    delete this.timers[type];
                }
            }
        }
        
        console.log(`[자동 백업] ${type} 설정 변경 완료`);
    }
    
    /**
     * [기능: 수동 백업 실행]
     * @param {string} type - 백업 유형
     */
    async runManualBackup(type = 'manual') {
        try {
            console.log('[자동 백업] 수동 백업 실행');
            
            const backup = await createBackup({
                description: '수동 백업',
                includeHistory: true,
                compress: false
            });
            
            const timestamp = new Date().toISOString();
            const filename = `영업관리기초자료_수동백업_${timestamp.split('T')[0]}.xlsx`;
            
            await exportBackupToExcel(backup, filename);
            
            showToast('백업이 완료되었습니다', 'success');
            
            return backup;
            
        } catch (error) {
            console.error('[자동 백업] 수동 백업 실패:', error);
            showToast('백업 중 오류가 발생했습니다', 'error');
            throw error;
        }
    }
    
    /**
     * [기능: 백업 상태 조회]
     * @returns {Object} 백업 상태
     */
    getBackupStatus() {
        const status = {};
        
        for (const [type, config] of Object.entries(this.backupConfig)) {
            status[type] = {
                enabled: config.enabled,
                lastRun: config.lastRun,
                nextRun: config.enabled ? new Date(this.calculateNextRunTime(type)).toISOString() : null,
                retentionDays: config.retentionDays
            };
        }
        
        status.isRunning = this.isRunning;
        
        return status;
    }
}

// ============================================
// [섹션: 싱글톤 인스턴스]
// ============================================

let schedulerInstance = null;

/**
 * [기능: 스케줄러 인스턴스 가져오기]
 * @returns {AutoBackupScheduler} 스케줄러 인스턴스
 */
export function getScheduler() {
    if (!schedulerInstance) {
        schedulerInstance = new AutoBackupScheduler();
    }
    return schedulerInstance;
}

// ============================================
// [섹션: 초기화]
// ============================================

/**
 * [기능: 자동 백업 시스템 초기화]
 */
export async function initAutoBackup() {
    try {
        const scheduler = getScheduler();
        await scheduler.start();
        
        console.log('[자동 백업] 시스템 초기화 완료');
        
        return scheduler;
        
    } catch (error) {
        console.error('[자동 백업] 초기화 실패:', error);
        throw error;
    }
}

// 페이지 로드 시 자동 시작 (옵션)
if (GlobalConfig.AUTO_BACKUP?.AUTO_START) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAutoBackup);
    } else {
        initAutoBackup();
    }
}

// ============================================
// [섹션: 내보내기]
// ============================================

export default {
    AutoBackupScheduler,
    getScheduler,
    initAutoBackup
};

/**
 * [내용: 자동 백업 스케줄러]
 * 테스트: 일일/주간/월간 백업, 오래된 백업 정리
 * #백업 #스케줄러 #자동화
 */
