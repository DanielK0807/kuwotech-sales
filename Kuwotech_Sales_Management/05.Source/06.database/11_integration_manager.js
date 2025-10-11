/**
 * KUWOTECH 영업관리 시스템 - 통합 관리자 (Railway MySQL)
 * Created by: System Administrator
 * Date: 2025-01-28
 * Description: 모든 데이터베이스 모듈 통합 관리
 *
 * Railway MySQL REST API를 사용하여 데이터 관리
 */

// ============================================
// [섹션: 모듈 통합 Import]
// ============================================

import { initDatabase as initDB, getDB } from './01_database_manager.js';
import { CompanyCRUD } from './03_crud.js';
import { ReportCRUD } from './04_report_crud.js';
import { syncExcelToDb, syncDbToExcel } from './05_excel_sync.js';
import { logChange } from './06_change_history.js';
import {
    createBackup,
    restoreBackup,
    listBackups,
    exportBackupToFile
} from './07_backup.js';
import { AutoBackupScheduler, initAutoBackup } from './schedulers/auto_backup_scheduler.js';

// ============================================
// [섹션: 통합 관리 클래스]
// ============================================

export class IntegrationManager {
    constructor() {
        this.isInitialized = false;
        this.companyCrud = null;
        this.reportCrud = null;
        this.backupScheduler = null;
        this.db = null;
    }
    
    /**
     * [기능: 시스템 초기화]
     * 모든 데이터베이스 모듈을 초기화하고 통합
     */
    async initialize() {
        if (this.isInitialized) {
            return;
        }
        
        try {
            
            // 1. 데이터베이스 초기화
            this.db = await initDB();
            
            // 2. CRUD 인스턴스 생성
            this.companyCrud = new CompanyCRUD();
            this.reportCrud = new ReportCRUD();
            
            // 3. 자동 백업 스케줄러 시작
            this.backupScheduler = await initAutoBackup();
            
            // 4. 엑셀 동기화 준비
            await this.checkExcelLibrary();
            
            this.isInitialized = true;
            
            // 초기화 완료 이벤트 발생
            window.dispatchEvent(new CustomEvent('systemReady', {
                detail: { manager: this }
            }));
            
        } catch (error) {
            console.error('[통합관리] 초기화 실패:', error);
            throw error;
        }
    }
    
    /**
     * [기능: 엑셀 라이브러리 체크]
     */
    async checkExcelLibrary() {
        if (typeof XLSX === 'undefined') {
            await this.loadExcelLibrary();
        }
    }
    
    /**
     * [기능: SheetJS 동적 로드]
     */
    async loadExcelLibrary() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js';
            script.onload = () => {
                resolve();
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
    
    // ============================================
    // [섹션: 거래처 관리]
    // ============================================
    
    /**
     * [기능: 거래처 추가]
     */
    async addCompany(companyData) {
        if (!this.isInitialized) await this.initialize();
        
        const keyValue = await this.companyCrud.create(companyData);
        
        // 엑셀 동기화 (옵션)
        if (this.shouldSyncToExcel()) {
            await this.syncToExcel('companies');
        }
        
        return keyValue;
    }
    
    /**
     * [기능: 거래처 수정]
     */
    async updateCompany(keyValue, updates) {
        if (!this.isInitialized) await this.initialize();
        
        const result = await this.companyCrud.update(keyValue, updates);
        
        // 엑셀 동기화
        if (this.shouldSyncToExcel()) {
            await this.syncToExcel('companies');
        }
        
        return result;
    }
    
    /**
     * [기능: 거래처 삭제]
     */
    async deleteCompany(keyValue) {
        if (!this.isInitialized) await this.initialize();
        
        // 백업 생성 (삭제 전)
        await createBackup({
            description: `거래처 삭제 전 백업 (${keyValue})`,
            compress: false
        });
        
        const result = await this.companyCrud.delete(keyValue);
        
        // 엑셀 동기화
        if (this.shouldSyncToExcel()) {
            await this.syncToExcel('companies');
        }
        
        return result;
    }
    
    // ============================================
    // [섹션: 엑셀 동기화]
    // ============================================
    
    /**
     * [기능: 엑셀 파일 업로드]
     */
    async uploadExcel(file, options = {}) {
        if (!this.isInitialized) await this.initialize();
        
        
        // 백업 생성 (업로드 전)
        await createBackup({
            description: '엑셀 업로드 전 자동 백업',
            compress: true
        });
        
        // 엑셀 동기화 실행
        const result = await syncExcelToDb(file, {
            mode: options.mode || 'merge', // replace, merge, append
            createBackup: false // 이미 생성함
        });
        
        
        return result;
    }
    
    /**
     * [기능: 엑셀 파일 다운로드]
     */
    async downloadExcel(options = {}) {
        if (!this.isInitialized) await this.initialize();
        
        
        const result = await syncDbToExcel({
            includeReports: options.includeReports !== false,
            includeHistory: options.includeHistory || false,
            fileName: options.fileName
        });
        
        
        return result;
    }
    
    /**
     * [기능: 실시간 엑셀 동기화]
     */
    async syncToExcel(storeName) {
        // 설정에서 실시간 동기화가 활성화되어 있을 때만
        const config = this.getConfig();
        
        if (!config.realtimeSync) {
            return;
        }
        
        try {
            
            // 비동기로 처리 (UI 블로킹 방지)
            setTimeout(async () => {
                await syncDbToExcel({
                    includeReports: false,
                    includeHistory: false
                });
            }, 100);
            
        } catch (error) {
            console.error('[통합관리] 엑셀 동기화 실패:', error);
        }
    }
    
    // ============================================
    // [섹션: 백업 관리]
    // ============================================
    
    /**
     * [기능: 수동 백업]
     */
    async createManualBackup(description = '수동 백업') {
        if (!this.isInitialized) await this.initialize();
        
        const backup = await createBackup({
            description,
            includeHistory: true,
            compress: true
        });
        
        return backup;
    }
    
    /**
     * [기능: 백업 복원]
     */
    async restoreFromBackup(backupId, options = {}) {
        if (!this.isInitialized) await this.initialize();
        
        const result = await restoreBackup(backupId, {
            createRestorePoint: true,
            ...options
        });
        
        return result;
    }
    
    /**
     * [기능: 백업 목록]
     */
    async getBackupList() {
        if (!this.isInitialized) await this.initialize();
        
        const backups = await listBackups();
        return backups;
    }
    
    /**
     * [기능: 백업 내보내기]
     */
    async exportBackup(backupId) {
        if (!this.isInitialized) await this.initialize();
        
        await exportBackupToFile(backupId);
    }
    
    // ============================================
    // [섹션: 자동 백업 관리]
    // ============================================
    
    /**
     * [기능: 자동 백업 설정 변경]
     */
    async updateBackupSettings(type, settings) {
        if (!this.backupScheduler) {
            await this.initialize();
        }
        
        await this.backupScheduler.updateBackupConfig(type, settings);
    }
    
    /**
     * [기능: 자동 백업 상태 조회]
     */
    getBackupStatus() {
        if (!this.backupScheduler) {
            return { error: '백업 스케줄러가 초기화되지 않았습니다' };
        }
        
        return this.backupScheduler.getBackupStatus();
    }
    
    // ============================================
    // [섹션: 설정 관리]
    // ============================================
    
    /**
     * [기능: 설정 가져오기]
     */
    getConfig() {
        const defaultConfig = {
            realtimeSync: false,
            autoBackup: {
                daily: true,
                weekly: false,
                monthly: false
            }
        };
        
        const saved = localStorage.getItem('integrationConfig');
        
        if (saved) {
            return { ...defaultConfig, ...JSON.parse(saved) };
        }
        
        return defaultConfig;
    }
    
    /**
     * [기능: 설정 저장]
     */
    saveConfig(config) {
        localStorage.setItem('integrationConfig', JSON.stringify(config));
    }
    
    /**
     * [기능: 실시간 동기화 여부 확인]
     */
    shouldSyncToExcel() {
        return this.getConfig().realtimeSync;
    }
    
    // ============================================
    // [섹션: 시스템 상태]
    // ============================================
    
    /**
     * [기능: 시스템 상태 조회]
     * Railway MySQL REST API를 사용하여 시스템 상태 확인
     */
    async getSystemStatus() {
        if (!this.isInitialized) {
            return { status: 'not_initialized' };
        }

        try {
            const db = await getDB();

            // REST API를 통해 레코드 수 확인
            const companiesCount = await this.getStoreCount('companies');
            const reportsCount = await this.getStoreCount('reports');

            return {
                status: 'ready',
                database: {
                    name: 'Railway MySQL',
                    type: 'REST API',
                    endpoint: db.baseURL
                },
                records: {
                    companies: companiesCount,
                    reports: reportsCount
                },
                backup: this.getBackupStatus(),
                config: this.getConfig()
            };

        } catch (error) {
            return {
                status: 'error',
                error: error.message
            };
        }
    }

    /**
     * [기능: 레코드 수 조회]
     * REST API를 사용하여 데이터 개수 확인
     */
    async getStoreCount(storeName) {
        const db = await getDB();

        try {
            if (storeName === 'companies') {
                const companies = await db.getAllClients();
                return companies.length;
            } else if (storeName === 'reports') {
                const reports = await db.getAllReports();
                return reports.length;
            } else {
                console.warn(`[통합관리] 알 수 없는 스토어: ${storeName}`);
                return 0;
            }
        } catch (error) {
            console.error(`[통합관리] ${storeName} 개수 조회 실패:`, error);
            return 0;
        }
    }
}

// ============================================
// [섹션: 싱글톤 인스턴스]
// ============================================

let integrationInstance = null;

/**
 * [기능: 통합 관리자 인스턴스 가져오기]
 */
export function getIntegrationManager() {
    if (!integrationInstance) {
        integrationInstance = new IntegrationManager();
    }
    return integrationInstance;
}

/**
 * [기능: 시스템 초기화]
 */
export async function initSystem() {
    const manager = getIntegrationManager();
    await manager.initialize();
    return manager;
}

// ============================================
// [섹션: 전역 등록]
// ============================================

// window 객체에 전역 등록 (디버깅용)
if (typeof window !== 'undefined') {
    window.IntegrationManager = IntegrationManager;
    window.getIntegrationManager = getIntegrationManager;
    window.initSystem = initSystem;
}

// ============================================
// [섹션: 기본 내보내기]
// ============================================

export default {
    IntegrationManager,
    getIntegrationManager,
    initSystem
};

/**
 * [내용: 통합 관리자 - Railway MySQL]
 * 모든 데이터베이스 모듈을 통합 관리 (REST API 기반)
 * 테스트: 초기화, CRUD, 백업, 동기화
 * #통합관리 #시스템초기화 #Railway
 */
