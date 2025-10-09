/**
 * ============================================
 * KUWOTECH 영업관리 시스템 - Excel Data Loader
 * Created by: Claude AI Assistant
 * Date: 2025-01-27
 * Description: 엑셀 파일을 읽어서 IndexedDB에 저장하는 통합 로더
 * ============================================
 */

// ============================================
// [SECTION: Import Modules]
// ============================================

import { getDB, withTransaction } from './02_schema.js';
import { logChange } from './06_change_history.js';
import { createBackup } from './07_backup.js';
import { showToast, showLoading, hideLoading } from '../01.common/20_common_index.js';

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
        '대표이사 또는 치과의사': 'representativeName',
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
        '사번': 'employeeId',
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
                console.log('[ExcelDataLoader] 백업 생성 중...');
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
            
            console.log('[ExcelDataLoader] 워크북 로드 완료. 시트:', workbook.SheetNames);
            
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
            console.error('[ExcelDataLoader] 파일 로드 실패:', error);
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
        console.log('[ExcelDataLoader] 거래처 데이터 로드 시작');
        
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
        
        console.log(`[ExcelDataLoader] 사용 시트: ${foundSheetName}`);
        
        // JSON으로 변환
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            raw: false,
            dateNF: 'yyyy-mm-dd',
            defval: ''
        });
        
        console.log(`[ExcelDataLoader] ${jsonData.length}개 행 추출`);
        
        // 데이터 변환 및 검증
        this.loadedData.companies = [];
        
        for (let i = 0; i < jsonData.length; i++) {
            const row = jsonData[i];
            const company = this.parseCompanyRow(row, i + 2); // 엑셀 행 번호 (헤더 제외)
            
            if (company) {
                this.loadedData.companies.push(company);
            }
        }
        
        console.log(`[ExcelDataLoader] ${this.loadedData.companies.length}개 거래처 데이터 파싱 완료`);
        
        // IndexedDB에 저장
        if (this.loadedData.companies.length > 0) {
            await this.saveCompaniesToDB();
        }
    }
    
    /**
     * 직원 데이터 로드
     */
    async loadEmployeesData(workbook) {
        console.log('[ExcelDataLoader] 직원 데이터 로드 시작');
        
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
            console.warn('[ExcelDataLoader] 직원 데이터 시트를 찾을 수 없습니다.');
            return;
        }
        
        console.log(`[ExcelDataLoader] 사용 시트: ${foundSheetName}`);
        
        // JSON으로 변환
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            raw: false,
            dateNF: 'yyyy-mm-dd',
            defval: ''
        });
        
        console.log(`[ExcelDataLoader] ${jsonData.length}개 행 추출`);
        
        // 데이터 변환 및 검증
        this.loadedData.employees = [];
        
        for (let i = 0; i < jsonData.length; i++) {
            const row = jsonData[i];
            const employee = this.parseEmployeeRow(row, i + 2);
            
            if (employee) {
                this.loadedData.employees.push(employee);
            }
        }
        
        console.log(`[ExcelDataLoader] ${this.loadedData.employees.length}명 직원 데이터 파싱 완료`);
        
        // IndexedDB에 저장
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
                representativeName: row['대표이사 또는 치과의사'] || row['대표자'] || '',
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
            
            // 데이터 매핑
            const employee = {
                name: name.trim(),
                employeeId: row['사번'] || `EMP${String(rowNum).padStart(3, '0')}`,
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
     * IndexedDB에 거래처 데이터 저장
     */
    async saveCompaniesToDB() {
        try {
            const db = await getDB();
            
            await withTransaction(['companies', 'changeHistory'], 'readwrite', async (tx) => {
                const companiesStore = tx.objectStore('companies');
                const historyStore = tx.objectStore('changeHistory');
                
                // 기존 데이터 클리어 옵션 (필요시)
                // await companiesStore.clear();
                
                let addedCount = 0;
                let updatedCount = 0;
                
                for (const company of this.loadedData.companies) {
                    try {
                        // 기존 데이터 확인
                        const existing = await this.getExisting(companiesStore, company.keyValue);
                        
                        if (existing) {
                            // 업데이트
                            await companiesStore.put({
                                ...existing,
                                ...company,
                                updatedAt: new Date().toISOString()
                            });
                            updatedCount++;
                        } else {
                            // 새로 추가
                            await companiesStore.add(company);
                            addedCount++;
                        }
                        
                        // 변경 이력 기록
                        await historyStore.add({
                            tableName: 'companies',
                            operation: existing ? 'UPDATE' : 'CREATE',
                            recordId: company.keyValue,
                            beforeData: existing || null,
                            afterData: company,
                            timestamp: new Date().toISOString(),
                            userId: sessionStorage.getItem('userId') || 'SYSTEM'
                        });
                        
                    } catch (error) {
                        console.error(`[거래처 저장 오류] ${company.keyValue}:`, error);
                        this.errors.push(`거래처 ${company.finalCompanyName} 저장 실패`);
                    }
                }
                
                console.log(`[ExcelDataLoader] 거래처 DB 저장 완료 - 추가: ${addedCount}, 수정: ${updatedCount}`);
            });
            
        } catch (error) {
            console.error('[ExcelDataLoader] DB 저장 실패:', error);
            throw error;
        }
    }
    
    /**
     * IndexedDB에 직원 데이터 저장
     */
    async saveEmployeesToDB() {
        try {
            const db = await getDB();
            
            await withTransaction(['employees', 'changeHistory'], 'readwrite', async (tx) => {
                const employeesStore = tx.objectStore('employees');
                const historyStore = tx.objectStore('changeHistory');
                
                let addedCount = 0;
                let updatedCount = 0;
                
                for (const employee of this.loadedData.employees) {
                    try {
                        // 기존 데이터 확인 (이름과 사번으로)
                        const existing = await this.getExistingEmployee(employeesStore, employee);
                        
                        if (existing) {
                            // 업데이트
                            await employeesStore.put({
                                ...existing,
                                ...employee,
                                id: existing.id, // ID 유지
                                updatedAt: new Date().toISOString()
                            });
                            updatedCount++;
                        } else {
                            // 새로 추가
                            await employeesStore.add(employee);
                            addedCount++;
                        }
                        
                        // 변경 이력 기록
                        await historyStore.add({
                            tableName: 'employees',
                            operation: existing ? 'UPDATE' : 'CREATE',
                            recordId: employee.employeeId,
                            beforeData: existing || null,
                            afterData: employee,
                            timestamp: new Date().toISOString(),
                            userId: sessionStorage.getItem('userId') || 'SYSTEM'
                        });
                        
                    } catch (error) {
                        console.error(`[직원 저장 오류] ${employee.name}:`, error);
                        this.warnings.push(`직원 ${employee.name} 저장 실패`);
                    }
                }
                
                console.log(`[ExcelDataLoader] 직원 DB 저장 완료 - 추가: ${addedCount}, 수정: ${updatedCount}`);
                
                // 세션스토리지에도 저장 (로그인 프로세스 호환성)
                sessionStorage.setItem('employees_data', JSON.stringify(this.loadedData.employees));
            });
            
        } catch (error) {
            console.error('[ExcelDataLoader] 직원 DB 저장 실패:', error);
            throw error;
        }
    }
    
    /**
     * 기존 데이터 조회
     */
    getExisting(store, keyValue) {
        return new Promise((resolve, reject) => {
            const request = store.get(keyValue);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    
    /**
     * 기존 직원 조회
     */
    getExistingEmployee(store, employee) {
        return new Promise((resolve, reject) => {
            // 이름으로 검색
            const index = store.index('name');
            const request = index.get(employee.name);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
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
    
    /**
     * 샘플 거래처 데이터 로드 (테스트용)
     */
    async loadSampleCompanies() {
        const sampleCompanies = [
            {
                keyValue: 'COMP-001',
                companyNameERP: 'ABC 치과',
                finalCompanyName: 'ABC 치과병원',
                representativeName: '김원장',
                customerRegion: '서울',
                transactionStatus: '활성',
                department: '영업1팀',
                salesProduct: '임플란트',
                internalManager: '홍길동',
                accumulatedSales: 50000000,
                accumulatedCollection: 45000000,
                accountsReceivable: 5000000
            },
            {
                keyValue: 'COMP-002',
                companyNameERP: 'XYZ 병원',
                finalCompanyName: 'XYZ 종합병원',
                representativeName: '이원장',
                customerRegion: '경기',
                transactionStatus: '활성',
                department: '영업2팀',
                salesProduct: '지르코니아',
                internalManager: '김영업',
                accumulatedSales: 80000000,
                accumulatedCollection: 70000000,
                accountsReceivable: 10000000
            }
        ];
        
        this.loadedData.companies = sampleCompanies;
        await this.saveCompaniesToDB();
        
        return {
            success: true,
            data: this.loadedData,
            summary: this.getSummary()
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