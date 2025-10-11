/**
 * ============================================
 * KUWOTECH 영업관리 시스템 - Excel Data Loader
 * Created by: Claude AI Assistant
 * Date: 2025-01-27
 * Description: 엑셀 파일을 읽어서 Railway MySQL에 저장하는 통합 로더 (REST API)
 * ============================================
 */

// ============================================
// [SECTION: Import Modules]
// ============================================

import { getDB } from './01_database_manager.js';
import { logChange } from './06_change_history.js';
import { createBackup } from './07_backup.js';
import { showToast, showLoading, hideLoading } from '../01.common/20_common_index.js';
import logger from '../01.common/23_logger.js';

// ============================================
// [SECTION: 엑셀 컬럼 매핑]
// ============================================

const COLUMN_MAPPING = {
    // 거래처 정보 컬럼
    COMPANIES: {
        'KEY VALUE': 'keyValue',
        '거래처명(ERP)': 'companyNameERP',
        '최종거래처명': 'finalCompanyName',
        '거래처코드': 'companyCode',
        '폐업여부': 'isClosedBusiness',
        '대표이사 또는 치과의사': 'ceoOrDentist',
        '고객사 지역': 'customerRegion',
        '거래상태': 'transactionStatus',
        '담당부서': 'department',
        '판매제품': 'salesProduct',
        '내부담당자': 'internalManager',
        '정철웅기여(상.중.하)': 'ceoContribution',
        '회사기여(상.중.하)': 'companyContribution',
        '마지막결제일': 'lastPaymentDate',
        '마지막총결재금액': 'lastPaymentAmount',
        '매출채권잔액': 'accountsReceivable',
        '누적수금액': 'accumulatedCollection',
        '누적매출액': 'accumulatedSales',
        '계약금액(년)': 'annualContractAmount',
        '원장': 'ledger'
    },
    
    // 직원 정보 컬럼
    EMPLOYEES: {
        '이름': 'name',
        '사번': 'id',  // 데이터베이스 스키마에 맞춰 id 사용
        '부서': 'department',
        '직급': 'position',
        '입사일': 'joinDate',
        '이메일': 'email',
        '연락처': 'contact',
        '역할': 'role',
        '영업담당목록': 'isSales',
        '관리자목록': 'isAdmin'
    }
};

// ============================================
// [SECTION: ExcelDataLoader 클래스]
// ============================================

export class ExcelDataLoader {
    constructor() {
        this.db = null;
        this.loadedData = {
            companies: [],
            employees: [],
            reports: []
        };
        this.errors = [];
        this.warnings = [];
    }
    
    /**
     * 엑셀 파일 로드 및 파싱
     */
    async loadExcelFile(file, options = {}) {
        const {
            sheetName = '기본정보',
            dataType = 'companies', // 'companies', 'employees', 'all'
            createBackupFirst = true
        } = options;
        
        try {
            showLoading('엑셀 파일 읽는 중...');
            
            // XLSX 라이브러리 확인
            if (typeof XLSX === 'undefined') {
                throw new Error('XLSX 라이브러리가 로드되지 않았습니다.');
            }
            
            // 백업 생성
            if (createBackupFirst) {
                await createBackup('엑셀 업로드 전 백업');
            }
            
            // 파일 읽기
            const data = await this.readFile(file);
            const workbook = XLSX.read(data, {
                type: 'array',
                cellDates: true,
                cellNF: true,
                cellStyles: true,
                dateNF: 'yyyy-mm-dd'
            });
            
            
            // 데이터 타입별 처리
            if (dataType === 'companies' || dataType === 'all') {
                await this.loadCompaniesData(workbook);
            }
            
            if (dataType === 'employees' || dataType === 'all') {
                await this.loadEmployeesData(workbook);
            }
            
            hideLoading();
            
            // 결과 반환
            return {
                success: true,
                data: this.loadedData,
                errors: this.errors,
                warnings: this.warnings,
                summary: this.getSummary()
            };
            
        } catch (error) {
            hideLoading();
            logger.error('[ExcelDataLoader] 파일 로드 실패:', error);
            throw error;
        }
    }
    
    /**
     * 파일 읽기
     */
    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                resolve(new Uint8Array(e.target.result));
            };
            
            reader.onerror = () => {
                reject(new Error('파일을 읽을 수 없습니다.'));
            };
            
            reader.readAsArrayBuffer(file);
        });
    }
    
    /**
     * 거래처 데이터 로드
     */
    async loadCompaniesData(workbook) {
        
        // 가능한 시트명들
        const possibleSheetNames = ['기본정보', '거래처정보', '거래처', 'Companies', 'Data'];
        let worksheet = null;
        let foundSheetName = '';
        
        for (const sheetName of possibleSheetNames) {
            if (workbook.Sheets[sheetName]) {
                worksheet = workbook.Sheets[sheetName];
                foundSheetName = sheetName;
                break;
            }
        }
        
        // 첫 번째 시트 사용
        if (!worksheet && workbook.SheetNames.length > 0) {
            foundSheetName = workbook.SheetNames[0];
            worksheet = workbook.Sheets[foundSheetName];
        }
        
        if (!worksheet) {
            throw new Error('거래처 데이터 시트를 찾을 수 없습니다.');
        }
        
        
        // JSON으로 변환
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            raw: false,
            dateNF: 'yyyy-mm-dd',
            defval: ''
        });
        
        
        // 데이터 변환 및 검증
        this.loadedData.companies = [];
        
        for (let i = 0; i < jsonData.length; i++) {
            const row = jsonData[i];
            const company = this.parseCompanyRow(row, i + 2); // 엑셀 행 번호 (헤더 제외)
            
            if (company) {
                this.loadedData.companies.push(company);
            }
        }
        

        // Railway MySQL에 저장 (REST API)
        if (this.loadedData.companies.length > 0) {
            await this.saveCompaniesToDB();
        }
    }
    
    /**
     * 직원 데이터 로드
     */
    async loadEmployeesData(workbook) {
        
        // 가능한 시트명들
        const possibleSheetNames = ['직원정보', '직원명단', '사원정보', '입사일자', 'Employees'];
        let worksheet = null;
        let foundSheetName = '';
        
        for (const sheetName of possibleSheetNames) {
            if (workbook.Sheets[sheetName]) {
                worksheet = workbook.Sheets[sheetName];
                foundSheetName = sheetName;
                break;
            }
        }
        
        if (!worksheet) {
            logger.warn('[ExcelDataLoader] 직원 데이터 시트를 찾을 수 없습니다.');
            return;
        }
        
        
        // JSON으로 변환
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            raw: false,
            dateNF: 'yyyy-mm-dd',
            defval: ''
        });
        
        
        // 데이터 변환 및 검증
        this.loadedData.employees = [];
        
        for (let i = 0; i < jsonData.length; i++) {
            const row = jsonData[i];
            const employee = this.parseEmployeeRow(row, i + 2);
            
            if (employee) {
                this.loadedData.employees.push(employee);
            }
        }
        

        // Railway MySQL에 저장 (REST API)
        if (this.loadedData.employees.length > 0) {
            await this.saveEmployeesToDB();
        }
    }
    
    /**
     * 거래처 행 파싱
     */
    parseCompanyRow(row, rowNum) {
        try {
            // KEY VALUE가 없으면 생성
            let keyValue = row['KEY VALUE'] || row['keyValue'];
            if (!keyValue) {
                keyValue = this.generateKeyValue('COMP', rowNum);
                this.warnings.push(`행 ${rowNum}: KEY VALUE 자동 생성 - ${keyValue}`);
            }
            
            // 거래처명 확인
            const companyName = row['거래처명(ERP)'] || row['최종거래처명'] || row['거래처명'];
            if (!companyName) {
                this.errors.push(`행 ${rowNum}: 거래처명이 없습니다.`);
                return null;
            }
            
            // 데이터 매핑
            const company = {
                keyValue: keyValue,
                companyNameERP: row['거래처명(ERP)'] || companyName,
                finalCompanyName: row['최종거래처명'] || companyName,
                companyCode: row['거래처코드'] || '',
                isClosedBusiness: this.parseBoolean(row['폐업여부']),
                ceoOrDentist: row['대표이사 또는 치과의사'] || row['대표자'] || '',
                customerRegion: row['고객사 지역'] || row['지역'] || '',
                transactionStatus: row['거래상태'] || '활성',
                department: row['담당부서'] || '',
                salesProduct: row['판매제품'] || '',
                internalManager: row['내부담당자'] || '',
                ceoContribution: row['정철웅기여(상.중.하)'] || '',
                companyContribution: row['회사기여(상.중.하)'] || '',
                lastPaymentDate: this.parseDate(row['마지막결제일']),
                lastPaymentAmount: this.parseNumber(row['마지막총결재금액']),
                accountsReceivable: this.parseNumber(row['매출채권잔액']),
                accumulatedCollection: this.parseNumber(row['누적수금액']),
                accumulatedSales: this.parseNumber(row['누적매출액']),
                annualContractAmount: this.parseNumber(row['계약금액(년)']),
                ledger: row['원장'] || '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            return company;
            
        } catch (error) {
            this.errors.push(`행 ${rowNum}: 파싱 오류 - ${error.message}`);
            return null;
        }
    }
    
    /**
     * 직원 행 파싱
     */
    parseEmployeeRow(row, rowNum) {
        try {
            // 이름 확인
            const name = row['이름'] || row['직원명'] || row['성명'] || Object.values(row)[0];
            if (!name || !name.trim()) {
                return null;
            }
            
            // 역할 결정
            let role = '';
            if (row['영업담당목록'] || row['영업담당']) {
                role = '영업담당';
            }
            if (row['관리자목록'] || row['관리자']) {
                role = role ? `${role},관리자` : '관리자';
            }
            if (!role && row['역할']) {
                role = row['역할'];
            }
            
            // 데이터 매핑 (데이터베이스 스키마에 맞춰 id 필드 사용)
            const employee = {
                name: name.trim(),
                id: row['사번'] || `EMP${String(rowNum).padStart(3, '0')}`,
                department: row['부서'] || '미지정',
                position: row['직급'] || '',
                joinDate: this.parseDate(row['입사일'] || row['입사일자']),
                email: row['이메일'] || '',
                contact: row['연락처'] || '',
                role: role || '미지정',
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            return employee;
            
        } catch (error) {
            this.warnings.push(`행 ${rowNum}: 직원 파싱 경고 - ${error.message}`);
            return null;
        }
    }
    
    /**
     * Railway MySQL에 거래처 데이터 저장 (REST API)
     */
    async saveCompaniesToDB() {
        try {
            const db = await getDB();

            // 기존 데이터 조회
            const existingCompanies = await db.getAllClients();

            // keyValue로 빠른 검색을 위한 맵 생성
            const existingMap = new Map();
            existingCompanies.forEach(c => {
                existingMap.set(c.keyValue, c);
            });

            let addedCount = 0;
            let updatedCount = 0;
            let errorCount = 0;


            for (const company of this.loadedData.companies) {
                try {
                    // 백엔드 API 스키마에 맞게 필드명 변환
                    const companyData = {
                        keyValue: company.keyValue,
                        finalCompanyName: company.finalCompanyName,
                        isClosed: company.isClosedBusiness ? 'Y' : 'N', // boolean → Y/N
                        ceoOrDentist: company.ceoOrDentist || null,
                        customerRegion: company.customerRegion || null,
                        businessStatus: company.transactionStatus || '활성',
                        department: company.department || null,
                        internalManager: company.internalManager || null,
                        jcwContribution: company.ceoContribution || null, // 정철웅기여
                        companyContribution: company.companyContribution || null,
                        accountsReceivable: company.accountsReceivable || 0,
                        // 백엔드 API에서 지원하지 않는 필드들은 제외
                        // salesProduct, lastPaymentDate, lastPaymentAmount 등은 추후 추가 필요
                    };

                    // 기존 데이터 확인
                    const existing = existingMap.get(company.keyValue);

                    if (existing) {
                        // 업데이트
                        await db.updateClient(company.keyValue, companyData);
                        updatedCount++;
                    } else {
                        // 새로 추가
                        await db.createClient(companyData);
                        addedCount++;
                    }

                } catch (error) {
                    errorCount++;
                    logger.error(`[거래처 저장 오류] ${company.keyValue}:`, error);
                    this.errors.push(`거래처 ${company.finalCompanyName} 저장 실패: ${error.message}`);
                }
            }


        } catch (error) {
            logger.error('[ExcelDataLoader] DB 저장 실패:', error);
            throw error;
        }
    }
    
    /**
     * Railway MySQL에 직원 데이터 저장 (REST API)
     */
    async saveEmployeesToDB() {
        try {
            const db = await getDB();

            // 기존 데이터 조회
            const existingEmployees = await db.getAllEmployees();

            // 이름으로 빠른 검색을 위한 맵 생성
            const existingMap = new Map();
            existingEmployees.forEach(e => {
                existingMap.set(e.name, e);
            });

            let addedCount = 0;
            let updatedCount = 0;
            let errorCount = 0;


            for (const employee of this.loadedData.employees) {
                try {
                    // 백엔드 API 스키마에 맞게 데이터 준비
                    const employeeData = {
                        name: employee.name,
                        department: employee.department || '미지정',
                        position: employee.position || null,
                        joinDate: employee.joinDate || null,
                        email: employee.email || null,
                        contact: employee.contact || null,
                        role: employee.role || '미지정',
                        isActive: employee.isActive !== false
                    };

                    // 기존 데이터 확인 (이름으로)
                    const existing = existingMap.get(employee.name);

                    if (existing) {
                        // 업데이트
                        await db.updateEmployee(existing.id, employeeData);
                        updatedCount++;
                    } else {
                        // 새로 추가
                        await db.createEmployee(employeeData);
                        addedCount++;
                    }

                } catch (error) {
                    errorCount++;
                    logger.error(`[직원 저장 오류] ${employee.name}:`, error);
                    this.warnings.push(`직원 ${employee.name} 저장 실패: ${error.message}`);
                }
            }


            // 세션스토리지에도 저장 (로그인 프로세스 호환성)
            sessionStorage.setItem('employees_data', JSON.stringify(this.loadedData.employees));

        } catch (error) {
            logger.error('[ExcelDataLoader] 직원 DB 저장 실패:', error);
            throw error;
        }
    }
    
    /**
     * 유틸리티: KEY VALUE 생성
     */
    generateKeyValue(prefix, index) {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 4).toUpperCase();
        return `${prefix}-${timestamp}-${random}-${index}`;
    }
    
    /**
     * 유틸리티: Boolean 파싱
     */
    parseBoolean(value) {
        if (!value) return false;
        const str = String(value).toLowerCase().trim();
        return str === 'true' || str === '예' || str === 'y' || str === '1';
    }
    
    /**
     * 유틸리티: 날짜 파싱
     */
    parseDate(value) {
        if (!value) return null;
        
        // 이미 Date 객체인 경우
        if (value instanceof Date) {
            return value.toISOString();
        }
        
        // 문자열 파싱
        const str = String(value).trim();
        
        // ISO 형식
        if (str.match(/^\d{4}-\d{2}-\d{2}/)) {
            return new Date(str).toISOString();
        }
        
        // 한국 형식
        if (str.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/)) {
            const match = str.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
            return new Date(match[1], match[2] - 1, match[3]).toISOString();
        }
        
        // 엑셀 시리얼 번호
        const num = parseFloat(str);
        if (!isNaN(num) && num > 25569 && num < 60000) {
            const date = new Date((num - 25569) * 86400 * 1000);
            return date.toISOString();
        }
        
        return null;
    }
    
    /**
     * 유틸리티: 숫자 파싱
     */
    parseNumber(value) {
        if (!value) return 0;
        const str = String(value).replace(/[^0-9.-]/g, '');
        const num = parseFloat(str);
        return isNaN(num) ? 0 : num;
    }
    
    /**
     * 요약 정보 생성
     */
    getSummary() {
        return {
            companies: {
                total: this.loadedData.companies.length,
                active: this.loadedData.companies.filter(c => c.transactionStatus === '활성').length,
                inactive: this.loadedData.companies.filter(c => c.transactionStatus !== '활성').length
            },
            employees: {
                total: this.loadedData.employees.length,
                sales: this.loadedData.employees.filter(e => e.role?.includes('영업')).length,
                admin: this.loadedData.employees.filter(e => e.role?.includes('관리자')).length
            },
            errors: this.errors.length,
            warnings: this.warnings.length
        };
    }
}

// ============================================
// [SECTION: 전역 함수 등록]
// ============================================

// 전역 인스턴스 생성
const excelDataLoader = new ExcelDataLoader();

// 전역 함수로 노출
if (typeof window !== 'undefined') {
    window.ExcelDataLoader = ExcelDataLoader;
    window.excelDataLoader = excelDataLoader;
}

// ============================================
// [SECTION: Export]
// ============================================

export default excelDataLoader;