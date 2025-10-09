/**
 * ============================================
 * KUWOTECH 영업관리 시스템 - 통합 다운로드 매니저
 * ============================================
 * 
 * @파일명: 12_download_manager.js
 * @작성자: System
 * @작성일: 2025-09-30
 * @버전: 1.0
 * 
 * @설명:
 * 영업담당모드와 관리자모드의 모든 사이드메뉴에서 체계적이고
 * 일관된 다운로드 기능을 제공하는 통합 매니저
 * 
 * @주요기능:
 * - 역할별 다운로드 권한 관리
 * - 다양한 다운로드 타입 지원 (거래처, 보고서, KPI, 백업)
 * - 엑셀/PPT 파일 생성
 * - 다운로드 진행 상태 표시
 * - 다운로드 이력 관리
 */

// ============================================
// [섹션 1: Import]
// ============================================

// 전역 라이브러리 사용 (CDN에서 로드됨)
// window.XLSX - 엑셀 라이브러리
// window.idb.openDB - IndexedDB 라이브러리
const XLSX = window.XLSX;
const { openDB } = window.idb;

import { formatCurrency, formatNumber, formatDate, formatDateKorean, formatPhone } from '../01.common/03_format.js';
import { showToast } from '../01.common/14_toast.js';
import GlobalConfig from '../01.common/01_global_config.js';
import { DownloadProgress } from './13_download_progress.js';
import { getCompanyDisplayName } from '../01.common/02_utils.js';

// ============================================
// [섹션 2: 상수 정의]
// ============================================

/**
 * [상수: 다운로드 타입 정의]
 */
export const DOWNLOAD_TYPES = {
    // 영업담당 모드
    SALES_COMPANIES: 'sales_companies',      // 내 거래처
    SALES_REPORTS: 'sales_reports',          // 내 보고서
    SALES_KPI: 'sales_kpi',                  // 내 실적
    SALES_ALL: 'sales_all',                  // 통합 데이터
    
    // 관리자 모드
    ADMIN_ALL_COMPANIES: 'admin_all_companies',  // 전체 거래처
    ADMIN_ALL_REPORTS: 'admin_all_reports',      // 전체 보고서
    ADMIN_COMPANY_KPI: 'admin_company_kpi',      // 전사 KPI
    ADMIN_EMPLOYEES: 'admin_employees',          // 직원 정보
    ADMIN_SETTINGS: 'admin_settings',            // 시스템 설정
    ADMIN_FULL_BACKUP: 'admin_full_backup',      // 전체 백업
    
    // PPT
    PRESENTATION: 'presentation'                  // PPT 발표자료
};

/**
 * [상수: 시트 구조 정의]
 */
export const SHEET_STRUCTURES = {
    // 거래처 기본정보 (19개 컬럼)
    COMPANY_BASIC: {
        name: '기본정보',
        columns: [
            { header: '거래처명(ERP)', key: 'erpCompanyName', width: 20 },
            { header: '거래처 전체명', key: 'companyNameFull', width: 25 },
            { header: '최종거래처명', key: 'finalCustomer', width: 25 },
            { header: '시도', key: 'sido', width: 10 },
            { header: '시군구', key: 'sigungu', width: 12 },
            { header: '주소', key: 'address', width: 35 },
            { header: '업종', key: 'industry', width: 15 },
            { header: '담당부서', key: 'department', width: 15 },
            { header: '내부담당자', key: 'internalManager', width: 12 },
            { header: '담당자명', key: 'managerName', width: 12 },
            { header: '담당자 직책', key: 'managerPosition', width: 12 },
            { header: '담당자 연락처', key: 'managerPhone', width: 15 },
            { header: '거래처(ERP) 거래담당자', key: 'erpManager', width: 15 },
            { header: 'OEM/ODM 구분', key: 'oemOdm', width: 12 },
            { header: 'On-Line/Off-Line 구분', key: 'onlineOffline', width: 15 },
            { header: '주요 제품', key: 'mainProduct', width: 20 },
            { header: '비고', key: 'remark', width: 25 },
            { header: '등록일', key: 'createdAt', width: 12 },
            { header: '최종 수정일', key: 'updatedAt', width: 12 }
        ]
    },
    
    // 방문보고서 (12개 컬럼)
    VISIT_REPORT: {
        name: '방문보고서',
        columns: [
            { header: '보고서 ID', key: 'reportId', width: 15 },
            { header: '작성자', key: 'author', width: 12 },
            { header: '방문일자', key: 'visitDate', width: 12 },
            { header: '거래처명', key: 'companyName', width: 20 },
            { header: '방문목적', key: 'purpose', width: 20 },
            { header: '면담자', key: 'contact', width: 12 },
            { header: '면담내용', key: 'content', width: 40 },
            { header: '매출액', key: 'salesAmount', width: 15 },
            { header: '수금액', key: 'collectionAmount', width: 15 },
            { header: '특이사항', key: 'note', width: 30 },
            { header: '작성일', key: 'createdAt', width: 12 },
            { header: '수정일', key: 'updatedAt', width: 12 }
        ]
    },
    
    // 영업실적 (8개 컬럼)
    SALES_KPI: {
        name: '영업실적',
        columns: [
            { header: '담당자', key: 'salesperson', width: 12 },
            { header: '기간', key: 'period', width: 12 },
            { header: '담당거래처수', key: 'companyCount', width: 15 },
            { header: '총 매출액', key: 'totalSales', width: 18 },
            { header: '총 수금액', key: 'totalCollection', width: 18 },
            { header: '수금률', key: 'collectionRate', width: 12 },
            { header: '방문건수', key: 'visitCount', width: 12 },
            { header: '평균수금액', key: 'avgCollection', width: 18 }
        ]
    },
    
    // 전사실적 (15개 컬럼)
    COMPANY_KPI: {
        name: '전사실적',
        columns: [
            { header: '담당자', key: 'salesperson', width: 12 },
            { header: '부서', key: 'department', width: 12 },
            { header: '담당거래처수', key: 'companyCount', width: 15 },
            { header: '월 매출액', key: 'monthlySales', width: 18 },
            { header: '월 수금액', key: 'monthlyCollection', width: 18 },
            { header: '수금률', key: 'collectionRate', width: 12 },
            { header: '목표 매출액', key: 'targetSales', width: 18 },
            { header: '달성률', key: 'achievementRate', width: 12 },
            { header: '방문건수', key: 'visitCount', width: 12 },
            { header: '신규거래처', key: 'newCompanies', width: 12 },
            { header: 'Top 거래처', key: 'topCompany', width: 20 },
            { header: 'Top 매출액', key: 'topSales', width: 18 },
            { header: '평균 거래액', key: 'avgSales', width: 18 },
            { header: '활성 거래처', key: 'activeCompanies', width: 15 },
            { header: '비고', key: 'remark', width: 25 }
        ]
    },
    
    // 직원정보 (9개 컬럼)
    EMPLOYEE: {
        name: '직원정보',
        columns: [
            { header: '이름', key: 'name', width: 12 },
            { header: '사번', key: 'id', width: 12 },  // 데이터베이스 스키마에 맞춰 id 사용
            { header: '입사일자', key: 'hireDate', width: 12 },
            { header: '부서', key: 'department', width: 15 },
            { header: '직급', key: 'position', width: 12 },
            { header: '역할', key: 'role', width: 12 },
            { header: '이메일', key: 'email', width: 25 },
            { header: '연락처', key: 'phone', width: 15 },
            { header: '상태', key: 'status', width: 10 }
        ]
    },
    
    // 시스템설정 (6개 컬럼)
    SYSTEM_SETTINGS: {
        name: '시스템설정',
        columns: [
            { header: '설정 ID', key: 'settingId', width: 15 },
            { header: '설정항목', key: 'settingName', width: 20 },
            { header: '설정값', key: 'settingValue', width: 30 },
            { header: '설명', key: 'description', width: 35 },
            { header: '수정일', key: 'updatedAt', width: 12 },
            { header: '수정자', key: 'updatedBy', width: 12 }
        ]
    },
    
    // 변경이력 (8개 컬럼)
    CHANGE_HISTORY: {
        name: '변경이력',
        columns: [
            { header: '변경일시', key: 'changedAt', width: 18 },
            { header: '변경자', key: 'changedBy', width: 12 },
            { header: '변경유형', key: 'changeType', width: 12 },
            { header: '대상', key: 'targetType', width: 12 },
            { header: '대상 ID', key: 'targetId', width: 15 },
            { header: '변경 전', key: 'beforeValue', width: 30 },
            { header: '변경 후', key: 'afterValue', width: 30 },
            { header: '사유', key: 'reason', width: 25 }
        ]
    }
};

/**
 * [상수: 권한 매핑]
 */
const PERMISSION_MAP = {
    // 영업담당자 접근 가능
    sales: [
        DOWNLOAD_TYPES.SALES_COMPANIES,
        DOWNLOAD_TYPES.SALES_REPORTS,
        DOWNLOAD_TYPES.SALES_KPI,
        DOWNLOAD_TYPES.SALES_ALL
    ],
    
    // 관리자 접근 가능 (전체)
    admin: Object.values(DOWNLOAD_TYPES)
};

// ============================================
// [섹션 3: 메인 다운로드 매니저 클래스]
// ============================================

class DownloadManager {
    constructor() {
        this.db = null;
        this.progress = null;
    }
    
    /**
     * [메서드: 데이터베이스 초기화]
     */
    async initDB() {
        if (this.db) return this.db;
        
        this.db = await openDB(GlobalConfig.DB_NAME, GlobalConfig.DB_VERSION);
        return this.db;
    }
    
    /**
     * [메서드: 권한 확인]
     */
    hasPermission(userRole, downloadType) {
        const permissions = PERMISSION_MAP[userRole] || [];
        return permissions.includes(downloadType);
    }
    
    /**
     * [메서드: 통합 다운로드 함수]
     * 
     * @param {Object} options - 다운로드 옵션
     * @param {string} options.downloadType - 다운로드 타입
     * @param {string} options.userRole - 사용자 역할
     * @param {string} options.userName - 사용자 이름
     * @param {Array} options.includeSheets - 포함할 시트 배열
     * @param {Object} options.dateRange - 날짜 범위 {start, end}
     * @param {string} options.format - 파일 형식 ('excel' or 'ppt')
     */
    async download(options) {
        const {
            downloadType,
            userRole = sessionStorage.getItem('userRole'),
            userName = sessionStorage.getItem('userName'),
            includeSheets = [],
            dateRange = null,
            format = 'excel'
        } = options;
        
        try {
            // 1. 권한 확인
            if (!this.hasPermission(userRole, downloadType)) {
                throw new Error('해당 다운로드 권한이 없습니다.');
            }
            
            // 2. 진행 상태 표시 시작
            this.progress = new DownloadProgress();
            this.progress.show();
            this.progress.update(0, '다운로드 준비 중...');
            
            // 3. 데이터베이스 초기화
            await this.initDB();
            this.progress.update(10, '데이터 수집 중...');
            
            // 4. 데이터 수집
            const data = await this.collectData(downloadType, userName, dateRange);
            this.progress.update(40, '데이터 처리 중...');
            
            // 5. 파일 생성
            if (format === 'excel') {
                await this.generateExcel(downloadType, data, userName, includeSheets);
            } else if (format === 'ppt') {
                await this.generatePPT(data, userName);
            }
            
            this.progress.update(100, '완료!');
            
            // 6. 다운로드 이력 저장
            await this.saveDownloadHistory(downloadType, userName);
            
            // 7. 성공 메시지
            setTimeout(() => {
                this.progress.hide();
                showToast('다운로드가 완료되었습니다', 'success');
            }, 1000);
            
            return { success: true };
            
        } catch (error) {
            console.error('[다운로드 실패]', error);
            
            if (this.progress) {
                this.progress.hide();
            }
            
            showToast('다운로드 실패: ' + error.message, 'error');
            return { success: false, error: error.message };
        }
    }
    
    /**
     * [메서드: 데이터 수집]
     */
    async collectData(downloadType, userName, dateRange) {
        const db = await this.initDB();
        let data = {};
        
        switch (downloadType) {
            // === 영업담당 모드 ===
            case DOWNLOAD_TYPES.SALES_COMPANIES:
                data.companies = await this.getMyCompanies(userName);
                break;
                
            case DOWNLOAD_TYPES.SALES_REPORTS:
                data.reports = await this.getMyReports(userName, dateRange);
                break;
                
            case DOWNLOAD_TYPES.SALES_KPI:
                data.companies = await this.getMyCompanies(userName);
                data.reports = await this.getMyReports(userName, dateRange);
                data.kpi = await this.calculateSalesKPI(userName, dateRange);
                break;
                
            case DOWNLOAD_TYPES.SALES_ALL:
                data.companies = await this.getMyCompanies(userName);
                data.reports = await this.getMyReports(userName, dateRange);
                data.kpi = await this.calculateSalesKPI(userName, dateRange);
                break;
            
            // === 관리자 모드 ===
            case DOWNLOAD_TYPES.ADMIN_ALL_COMPANIES:
                data.companies = await this.getAllCompanies();
                data.employees = await this.getAllEmployees();
                data.stats = await this.getCompanyStats();
                break;
                
            case DOWNLOAD_TYPES.ADMIN_ALL_REPORTS:
                data.reports = await this.getAllReports(dateRange);
                data.stats = await this.getReportStats();
                break;
                
            case DOWNLOAD_TYPES.ADMIN_COMPANY_KPI:
                data.companyKPI = await this.getCompanyKPI(dateRange);
                data.trends = await this.getMonthlyTrends();
                data.topCompanies = await this.getTopCompanies();
                break;
                
            case DOWNLOAD_TYPES.ADMIN_EMPLOYEES:
                data.employees = await this.getAllEmployees();
                break;
                
            case DOWNLOAD_TYPES.ADMIN_SETTINGS:
                data.settings = await this.getSystemSettings();
                break;
                
            case DOWNLOAD_TYPES.ADMIN_FULL_BACKUP:
                data.companies = await this.getAllCompanies();
                data.reports = await this.getAllReports();
                data.employees = await this.getAllEmployees();
                data.history = await this.getChangeHistory();
                data.settings = await this.getSystemSettings();
                data.kpi = await this.getCompanyKPI();
                break;
                
            default:
                throw new Error('알 수 없는 다운로드 타입입니다.');
        }
        
        return data;
    }
    
    /**
     * [메서드: 내 거래처 조회]
     */
    async getMyCompanies(userName) {
        const db = await this.initDB();
        const tx = db.transaction('companies', 'readonly');
        const store = tx.objectStore('companies');
        const all = await store.getAll();
        
        // 내부담당자가 userName인 거래처만 필터링
        return all.filter(company => company.internalManager === userName);
    }
    
    /**
     * [메서드: 내 보고서 조회]
     */
    async getMyReports(userName, dateRange = null) {
        const db = await this.initDB();
        const tx = db.transaction('reports', 'readonly');
        const store = tx.objectStore('reports');
        const all = await store.getAll();
        
        let filtered = all.filter(report => report.author === userName);
        
        // 날짜 범위 필터링
        if (dateRange) {
            filtered = filtered.filter(report => {
                const visitDate = new Date(report.visitDate);
                const startDate = new Date(dateRange.start);
                const endDate = new Date(dateRange.end);
                return visitDate >= startDate && visitDate <= endDate;
            });
        }
        
        return filtered;
    }
    
    /**
     * [메서드: 전체 거래처 조회]
     */
    async getAllCompanies() {
        const db = await this.initDB();
        const tx = db.transaction('companies', 'readonly');
        const store = tx.objectStore('companies');
        return await store.getAll();
    }
    
    /**
     * [메서드: 전체 보고서 조회]
     */
    async getAllReports(dateRange = null) {
        const db = await this.initDB();
        const tx = db.transaction('reports', 'readonly');
        const store = tx.objectStore('reports');
        let all = await store.getAll();
        
        // 날짜 범위 필터링
        if (dateRange) {
            all = all.filter(report => {
                const visitDate = new Date(report.visitDate);
                const startDate = new Date(dateRange.start);
                const endDate = new Date(dateRange.end);
                return visitDate >= startDate && visitDate <= endDate;
            });
        }
        
        return all;
    }
    
    /**
     * [메서드: 전체 직원 조회]
     */
    async getAllEmployees() {
        const db = await this.initDB();
        
        // employees 테이블이 있으면 조회
        if (db.objectStoreNames.contains('employees')) {
            const tx = db.transaction('employees', 'readonly');
            const store = tx.objectStore('employees');
            return await store.getAll();
        }
        
        // 없으면 거래처에서 담당자 목록 추출
        const companies = await this.getAllCompanies();
        const managers = new Set();
        
        companies.forEach(company => {
            if (company.internalManager) {
                managers.add(company.internalManager);
            }
        });
        
        return Array.from(managers).map(name => ({
            name: name,
            department: '영업팀',
            role: 'sales',
            status: 'active'
        }));
    }
    
    /**
     * [메서드: 개인 KPI 계산]
     */
    async calculateSalesKPI(userName, dateRange = null) {
        const companies = await this.getMyCompanies(userName);
        const reports = await this.getMyReports(userName, dateRange);
        
        const totalSales = reports.reduce((sum, r) => sum + (r.salesAmount || 0), 0);
        const totalCollection = reports.reduce((sum, r) => sum + (r.collectionAmount || 0), 0);
        const collectionRate = totalSales > 0 ? (totalCollection / totalSales * 100).toFixed(2) : 0;  /* ✅ % 소수점 2자리 */
        
        return {
            salesperson: userName,
            period: dateRange ? `${dateRange.start} ~ ${dateRange.end}` : '전체',
            companyCount: companies.length,
            totalSales: totalSales,
            totalCollection: totalCollection,
            collectionRate: collectionRate + '%',
            visitCount: reports.length,
            avgCollection: reports.length > 0 ? Math.round(totalCollection / reports.length) : 0
        };
    }
    
    /**
     * [메서드: 전사 KPI 조회]
     */
    async getCompanyKPI(dateRange = null) {
        const companies = await this.getAllCompanies();
        const reports = await this.getAllReports(dateRange);
        
        // 담당자별로 그룹화
        const salesByPerson = {};
        
        companies.forEach(company => {
            const manager = company.internalManager || '미지정';
            if (!salesByPerson[manager]) {
                salesByPerson[manager] = {
                    salesperson: manager,
                    companies: [],
                    reports: []
                };
            }
            salesByPerson[manager].companies.push(company);
        });
        
        reports.forEach(report => {
            const author = report.author || '미지정';
            if (!salesByPerson[author]) {
                salesByPerson[author] = {
                    salesperson: author,
                    companies: [],
                    reports: []
                };
            }
            salesByPerson[author].reports.push(report);
        });
        
        // KPI 계산
        return Object.values(salesByPerson).map(person => {
            const totalSales = person.reports.reduce((sum, r) => sum + (r.salesAmount || 0), 0);
            const totalCollection = person.reports.reduce((sum, r) => sum + (r.collectionAmount || 0), 0);
            const collectionRate = totalSales > 0 ? (totalCollection / totalSales * 100).toFixed(2) : 0;  /* ✅ % 소수점 2자리 */
            
            return {
                salesperson: person.salesperson,
                department: '영업팀',
                companyCount: person.companies.length,
                monthlySales: totalSales,
                monthlyCollection: totalCollection,
                collectionRate: collectionRate + '%',
                targetSales: 0,
                achievementRate: '0%',
                visitCount: person.reports.length,
                newCompanies: 0,
                topCompany: '-',
                topSales: 0,
                avgSales: person.reports.length > 0 ? Math.round(totalSales / person.reports.length) : 0,
                activeCompanies: person.companies.length,
                remark: ''
            };
        });
    }
    
    /**
     * [메서드: 월별 추이 조회]
     */
    async getMonthlyTrends() {
        // TODO: 구현 필요
        return [];
    }
    
    /**
     * [메서드: Top 거래처 조회]
     */
    async getTopCompanies() {
        // TODO: 구현 필요
        return [];
    }
    
    /**
     * [메서드: 거래처 통계]
     */
    async getCompanyStats() {
        const companies = await this.getAllCompanies();
        
        // 담당자별 통계
        const statsByManager = {};
        
        companies.forEach(company => {
            const manager = company.internalManager || '미지정';
            if (!statsByManager[manager]) {
                statsByManager[manager] = {
                    manager: manager,
                    count: 0,
                    active: 0
                };
            }
            statsByManager[manager].count++;
            if (company.status === 'active') {
                statsByManager[manager].active++;
            }
        });
        
        return Object.values(statsByManager);
    }
    
    /**
     * [메서드: 보고서 통계]
     */
    async getReportStats() {
        const reports = await this.getAllReports();
        
        // 작성자별 통계
        const statsByAuthor = {};
        
        reports.forEach(report => {
            const author = report.author || '미지정';
            if (!statsByAuthor[author]) {
                statsByAuthor[author] = {
                    author: author,
                    count: 0,
                    totalSales: 0,
                    totalCollection: 0
                };
            }
            statsByAuthor[author].count++;
            statsByAuthor[author].totalSales += report.salesAmount || 0;
            statsByAuthor[author].totalCollection += report.collectionAmount || 0;
        });
        
        return Object.values(statsByAuthor);
    }
    
    /**
     * [메서드: 시스템 설정 조회]
     */
    async getSystemSettings() {
        const db = await this.initDB();
        
        if (db.objectStoreNames.contains('settings')) {
            const tx = db.transaction('settings', 'readonly');
            const store = tx.objectStore('settings');
            return await store.getAll();
        }
        
        return [];
    }
    
    /**
     * [메서드: 변경 이력 조회]
     */
    async getChangeHistory() {
        const db = await this.initDB();
        
        if (db.objectStoreNames.contains('changeHistory')) {
            const tx = db.transaction('changeHistory', 'readonly');
            const store = tx.objectStore('changeHistory');
            return await store.getAll();
        }
        
        return [];
    }
    
    /**
     * [메서드: 엑셀 파일 생성]
     */
    async generateExcel(downloadType, data, userName, includeSheets = []) {
        const workbook = XLSX.utils.book_new();
        
        // 파일명 생성
        const today = formatDate(new Date());
        let fileName = '';
        
        // 다운로드 타입별 처리
        switch (downloadType) {
            // === 영업담당 모드 ===
            case DOWNLOAD_TYPES.SALES_COMPANIES:
                fileName = `거래처정보_${userName}_${today}.xlsx`;
                this.addCompanySheet(workbook, data.companies);
                break;
                
            case DOWNLOAD_TYPES.SALES_REPORTS:
                fileName = `방문보고서_${userName}_${today.split('-')[0]}.xlsx`;
                this.addReportSheet(workbook, data.reports);
                break;
                
            case DOWNLOAD_TYPES.SALES_KPI:
                fileName = `영업실적_${userName}_${today.split('-')[0]}-${today.split('-')[1]}.xlsx`;
                this.addSalesKPISheet(workbook, data.kpi);
                this.addCompanyDetailSheet(workbook, data.companies, data.reports);
                break;
                
            case DOWNLOAD_TYPES.SALES_ALL:
                fileName = `영업데이터_${userName}_${today}.xlsx`;
                this.addCompanySheet(workbook, data.companies);
                this.addReportSheet(workbook, data.reports);
                this.addSalesKPISheet(workbook, data.kpi);
                break;
            
            // === 관리자 모드 ===
            case DOWNLOAD_TYPES.ADMIN_ALL_COMPANIES:
                fileName = `전체거래처_${today}.xlsx`;
                this.addCompanySheet(workbook, data.companies);
                this.addEmployeeSheet(workbook, data.employees);
                this.addCompanyStatsSheet(workbook, data.stats);
                break;
                
            case DOWNLOAD_TYPES.ADMIN_ALL_REPORTS:
                fileName = `방문보고서_전체_${today.split('-')[0]}.xlsx`;
                this.addReportSheet(workbook, data.reports, '방문보고서_전체');
                this.addReportStatsSheet(workbook, data.stats);
                break;
                
            case DOWNLOAD_TYPES.ADMIN_COMPANY_KPI:
                fileName = `전사실적_${today.split('-')[0]}-${today.split('-')[1]}.xlsx`;
                this.addCompanyKPISheet(workbook, data.companyKPI);
                break;
                
            case DOWNLOAD_TYPES.ADMIN_EMPLOYEES:
                fileName = `직원정보_${today}.xlsx`;
                this.addEmployeeSheet(workbook, data.employees);
                break;
                
            case DOWNLOAD_TYPES.ADMIN_SETTINGS:
                fileName = `시스템설정_${today}.xlsx`;
                this.addSettingsSheet(workbook, data.settings);
                break;
                
            case DOWNLOAD_TYPES.ADMIN_FULL_BACKUP:
                fileName = `영업관리_전체백업_${today}.xlsx`;
                this.addCompanySheet(workbook, data.companies);
                this.addReportSheet(workbook, data.reports, '방문보고서_전체');
                this.addEmployeeSheet(workbook, data.employees);
                this.addChangeHistorySheet(workbook, data.history);
                this.addCompanyKPISheet(workbook, data.kpi);
                this.addSettingsSheet(workbook, data.settings);
                this.addMetaSheet(workbook);
                break;
        }
        
        // 진행 상태 업데이트
        this.progress.update(80, '파일 저장 중...');
        
        // 파일 저장
        XLSX.writeFile(workbook, fileName);
        
        return fileName;
    }
    
    /**
     * [메서드: 거래처 시트 추가]
     */
    addCompanySheet(workbook, companies, sheetName = '기본정보') {
        const structure = SHEET_STRUCTURES.COMPANY_BASIC;
        
        // 데이터 변환
        const rows = companies.map(company => {
            const row = {};
            structure.columns.forEach(col => {
                let value = company[col.key];
                
                // 날짜 포맷팅
                if (col.key === 'createdAt' || col.key === 'updatedAt') {
                    value = value ? formatDate(new Date(value)) : '';
                }
                
                row[col.header] = value || '';
            });
            return row;
        });
        
        // 시트 생성
        const worksheet = XLSX.utils.json_to_sheet(rows);
        
        // 열 너비 설정
        worksheet['!cols'] = structure.columns.map(col => ({ wch: col.width }));
        
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    }
    
    /**
     * [메서드: 보고서 시트 추가]
     */
    addReportSheet(workbook, reports, sheetName = '방문보고서') {
        const structure = SHEET_STRUCTURES.VISIT_REPORT;
        
        const rows = reports.map(report => {
            const row = {};
            structure.columns.forEach(col => {
                let value = report[col.key];
                
                // 날짜 포맷팅
                if (col.key === 'visitDate' || col.key === 'createdAt' || col.key === 'updatedAt') {
                    value = value ? formatDate(new Date(value)) : '';
                }
                
                // 금액 포맷팅
                if (col.key === 'salesAmount' || col.key === 'collectionAmount') {
                    value = value ? formatCurrency(value) : '₩0';
                }
                
                row[col.header] = value || '';
            });
            return row;
        });
        
        const worksheet = XLSX.utils.json_to_sheet(rows);
        worksheet['!cols'] = structure.columns.map(col => ({ wch: col.width }));
        
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    }
    
    /**
     * [메서드: 개인 KPI 시트 추가]
     */
    addSalesKPISheet(workbook, kpi) {
        const structure = SHEET_STRUCTURES.SALES_KPI;
        
        const row = {};
        structure.columns.forEach(col => {
            let value = kpi[col.key];
            
            // 금액 포맷팅
            if (col.key === 'totalSales' || col.key === 'totalCollection' || col.key === 'avgCollection') {
                value = value ? formatCurrency(value) : '₩0';
            }
            
            // 숫자 포맷팅
            if (col.key === 'companyCount' || col.key === 'visitCount') {
                value = value ? formatNumber(value) : 0;
            }
            
            row[col.header] = value || '';
        });
        
        const worksheet = XLSX.utils.json_to_sheet([row]);
        worksheet['!cols'] = structure.columns.map(col => ({ wch: col.width }));
        
        XLSX.utils.book_append_sheet(workbook, worksheet, '영업실적');
    }
    
    /**
     * [메서드: 거래처별 상세 시트 추가]
     */
    addCompanyDetailSheet(workbook, companies, reports) {
        const rows = companies.map(company => {
            // 데이터베이스 스키마에 맞춰 finalCompanyName/erpCompanyName 사용
            const companyName = getCompanyDisplayName(company);
            const companyReports = reports.filter(r =>
                (r.finalCompanyName || r.erpCompanyName) === (company.finalCompanyName || company.erpCompanyName)
            );
            const totalSales = companyReports.reduce((sum, r) => sum + (r.salesAmount || 0), 0);
            const totalCollection = companyReports.reduce((sum, r) => sum + (r.collectionAmount || 0), 0);

            return {
                '거래처명': company.erpCompanyName || '',
                '방문횟수': companyReports.length,
                '총 매출액': formatCurrency(totalSales),
                '총 수금액': formatCurrency(totalCollection),
                '수금률': totalSales > 0 ? ((totalCollection / totalSales * 100).toFixed(2) + '%') : '0%',  /* ✅ % 소수점 2자리 */
                '최근 방문일': companyReports.length > 0 ? formatDate(new Date(companyReports[0].visitDate)) : '-'
            };
        });
        
        const worksheet = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(workbook, worksheet, '거래처별상세');
    }
    
    /**
     * [메서드: 전사 KPI 시트 추가]
     */
    addCompanyKPISheet(workbook, kpiData) {
        const structure = SHEET_STRUCTURES.COMPANY_KPI;
        
        const rows = kpiData.map(kpi => {
            const row = {};
            structure.columns.forEach(col => {
                let value = kpi[col.key];
                
                // 금액 포맷팅
                if (col.key.includes('Sales') || col.key.includes('Collection') || col.key === 'avgSales') {
                    value = value ? formatCurrency(value) : '₩0';
                }
                
                // 숫자 포맷팅
                if (col.key.includes('Count') || col.key === 'newCompanies' || col.key === 'activeCompanies') {
                    value = value ? formatNumber(value) : 0;
                }
                
                row[col.header] = value || '';
            });
            return row;
        });
        
        // 합계 행 추가
        const totalRow = {};
        structure.columns.forEach(col => {
            if (col.key === 'salesperson') {
                totalRow[col.header] = '전체 합계';
            } else if (col.key === 'companyCount') {
                totalRow[col.header] = formatNumber(rows.reduce((sum, r) => sum + (parseInt(r[col.header].replace(/,/g, '')) || 0), 0));
            } else if (col.key.includes('Sales') || col.key.includes('Collection')) {
                const sum = rows.reduce((sum, r) => {
                    const val = r[col.header].replace(/[₩,]/g, '');
                    return sum + (parseInt(val) || 0);
                }, 0);
                totalRow[col.header] = formatCurrency(sum);
            } else {
                totalRow[col.header] = '';
            }
        });
        rows.push(totalRow);
        
        const worksheet = XLSX.utils.json_to_sheet(rows);
        worksheet['!cols'] = structure.columns.map(col => ({ wch: col.width }));
        
        XLSX.utils.book_append_sheet(workbook, worksheet, '전사실적');
    }
    
    /**
     * [메서드: 직원 정보 시트 추가]
     */
    addEmployeeSheet(workbook, employees) {
        const structure = SHEET_STRUCTURES.EMPLOYEE;
        
        const rows = employees.map(emp => {
            const row = {};
            structure.columns.forEach(col => {
                let value = emp[col.key];
                
                if (col.key === 'hireDate') {
                    value = value ? formatDate(new Date(value)) : '';
                }
                
                if (col.key === 'status') {
                    value = value === 'active' ? '활성' : '비활성';
                }
                
                row[col.header] = value || '';
            });
            return row;
        });
        
        const worksheet = XLSX.utils.json_to_sheet(rows);
        worksheet['!cols'] = structure.columns.map(col => ({ wch: col.width }));
        
        XLSX.utils.book_append_sheet(workbook, worksheet, '직원정보');
    }
    
    /**
     * [메서드: 시스템 설정 시트 추가]
     */
    addSettingsSheet(workbook, settings) {
        const structure = SHEET_STRUCTURES.SYSTEM_SETTINGS;
        
        const rows = settings.map(setting => {
            const row = {};
            structure.columns.forEach(col => {
                let value = setting[col.key];
                
                if (col.key === 'updatedAt') {
                    value = value ? formatDate(new Date(value)) : '';
                }
                
                row[col.header] = value || '';
            });
            return row;
        });
        
        const worksheet = XLSX.utils.json_to_sheet(rows);
        worksheet['!cols'] = structure.columns.map(col => ({ wch: col.width }));
        
        XLSX.utils.book_append_sheet(workbook, worksheet, '시스템설정');
    }
    
    /**
     * [메서드: 변경 이력 시트 추가]
     */
    addChangeHistorySheet(workbook, history) {
        const structure = SHEET_STRUCTURES.CHANGE_HISTORY;
        
        const rows = history.map(change => {
            const row = {};
            structure.columns.forEach(col => {
                let value = change[col.key];
                
                if (col.key === 'changedAt') {
                    value = value ? formatDate(new Date(value)) + ' ' + new Date(value).toLocaleTimeString() : '';
                }
                
                row[col.header] = value || '';
            });
            return row;
        });
        
        const worksheet = XLSX.utils.json_to_sheet(rows);
        worksheet['!cols'] = structure.columns.map(col => ({ wch: col.width }));
        
        XLSX.utils.book_append_sheet(workbook, worksheet, '변경이력');
    }
    
    /**
     * [메서드: 거래처 통계 시트 추가]
     */
    addCompanyStatsSheet(workbook, stats) {
        const rows = stats.map(stat => ({
            '담당자': stat.manager,
            '담당 거래처수': formatNumber(stat.count),
            '활성 거래처수': formatNumber(stat.active),
            '비활성 거래처수': formatNumber(stat.count - stat.active)
        }));
        
        const worksheet = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(workbook, worksheet, '거래처통계');
    }
    
    /**
     * [메서드: 보고서 통계 시트 추가]
     */
    addReportStatsSheet(workbook, stats) {
        const rows = stats.map(stat => ({
            '작성자': stat.author,
            '보고서 수': formatNumber(stat.count),
            '총 매출액': formatCurrency(stat.totalSales),
            '총 수금액': formatCurrency(stat.totalCollection),
            '수금률': stat.totalSales > 0 ? ((stat.totalCollection / stat.totalSales * 100).toFixed(2) + '%') : '0%'  /* ✅ % 소수점 2자리 */
        }));
        
        const worksheet = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(workbook, worksheet, '담당자별통계');
    }
    
    /**
     * [메서드: 메타 정보 시트 추가]
     */
    addMetaSheet(workbook) {
        const meta = [
            { '항목': '시스템명', '값': 'KUWOTECH 영업관리 시스템' },
            { '항목': '백업일시', '값': formatDate(new Date()) + ' ' + new Date().toLocaleTimeString() },
            { '항목': '백업 사용자', '값': sessionStorage.getItem('userName') || 'SYSTEM' },
            { '항목': '버전', '값': '1.0' }
        ];
        
        const worksheet = XLSX.utils.json_to_sheet(meta);
        XLSX.utils.book_append_sheet(workbook, worksheet, '메타정보');
    }
    
    /**
     * [메서드: PPT 생성]
     */
    async generatePPT(data, userName) {
        showToast('PPT 생성 기능은 준비 중입니다', 'info');
        // TODO: PptxGenJS 라이브러리를 사용한 PPT 생성 구현
    }
    
    /**
     * [메서드: 다운로드 이력 저장]
     */
    async saveDownloadHistory(downloadType, userName) {
        const db = await this.initDB();
        
        // downloadHistory 테이블이 없으면 생성 스킵
        if (!db.objectStoreNames.contains('downloadHistory')) {
            return;
        }
        
        const tx = db.transaction('downloadHistory', 'readwrite');
        const store = tx.objectStore('downloadHistory');
        
        const history = {
            downloadType: downloadType,
            userName: userName,
            downloadedAt: new Date().toISOString(),
            status: 'success'
        };
        
        await store.add(history);
        await tx.done;
    }
}

// ============================================
// [섹션 4: Export]
// ============================================

// 싱글톤 인스턴스 생성
const downloadManager = new DownloadManager();

export default downloadManager;
export { DownloadManager, PERMISSION_MAP };
