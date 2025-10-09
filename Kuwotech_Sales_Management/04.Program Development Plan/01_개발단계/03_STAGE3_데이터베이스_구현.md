# STAGE 3: 데이터베이스 시스템 구현 💾

> **단계**: STAGE 3  
> **작성일**: 2025-09-26  
> **목표**: IndexedDB 스키마 설계 및 데이터 처리 시스템 구현  
> **예상 소요**: 2일

---

## 📋 목차

1. [개요](#1-개요)
2. [IndexedDB 스키마 설계](#2-indexeddb-스키마-설계)
3. [CRUD 시스템 구현](#3-crud-시스템-구현)
4. [엑셀 동기화 시스템](#4-엑셀-동기화-시스템)
5. [변경 이력 관리](#5-변경-이력-관리)
6. [백업 시스템](#6-백업-시스템)
7. [테스트 및 검증](#7-테스트-및-검증)

---

## 1. 개요

### 1.1 목적

**IndexedDB를 활용한 로컬 데이터베이스 시스템 구축**
- 엑셀 데이터를 구조화된 DB로 저장
- 빠른 검색 및 필터링
- 변경 이력 자동 기록
- 양방향 엑셀 동기화

### 1.2 주요 기능

```
[엑셀 파일] → [파싱] → [IndexedDB] → [화면 표시]
     ↑                       ↓
     └────────[내보내기]──────┘
```

### 1.3 데이터 흐름

```
1. 엑셀 업로드
   ├── SheetJS 파싱
   ├── 데이터 검증
   └── IndexedDB 저장

2. 데이터 조회
   ├── 역할별 필터링 (관리자: 전체, 영업: 본인)
   ├── IndexedDB 쿼리
   └── 화면 렌더링

3. 데이터 수정
   ├── 변경 전 백업
   ├── IndexedDB 업데이트
   └── 변경 이력 기록

4. 엑셀 내보내기
   ├── IndexedDB 전체 조회
   ├── SheetJS 변환
   └── 파일 다운로드
```

---

## 2. IndexedDB 스키마 설계

### 2.1 데이터베이스 스키마

**파일 위치**: `05.Source/05.database/01_schema.js`

```javascript
// [섹션: IndexedDB 스키마 정의]
export const DB_SCHEMA = {
  name: 'KuwotechSalesDB',
  version: 3,
  stores: [
    {
      name: 'companies',
      keyPath: 'keyValue',
      indexes: [
        { name: 'companyNameERP', keyPath: 'companyNameERP', unique: false },
        { name: 'finalCompanyName', keyPath: 'finalCompanyName', unique: false },
        { name: 'internalManager', keyPath: 'internalManager', unique: false },
        { name: 'businessStatus', keyPath: 'businessStatus', unique: false },
        { name: 'accumulatedSales', keyPath: 'accumulatedSales', unique: false },
        { name: 'lastPaymentDate', keyPath: 'lastPaymentDate', unique: false }
      ]
    },
    {
      name: 'employees',
      keyPath: 'id',
      autoIncrement: true,
      indexes: [
        { name: 'name', keyPath: 'name', unique: false },
        { name: 'role', keyPath: 'role', unique: false },
        { name: 'hireDate', keyPath: 'hireDate', unique: false }
      ]
    },
    {
      name: 'reports',
      keyPath: 'reportId',
      autoIncrement: true,
      indexes: [
        { name: 'submittedBy', keyPath: 'submittedBy', unique: false },
        { name: 'companyId', keyPath: 'companyId', unique: false },
        { name: 'status', keyPath: 'status', unique: false },
        { name: 'submittedDate', keyPath: 'submittedDate', unique: false }
      ]
    },
    {
      name: 'changeHistory',
      keyPath: 'id',
      autoIncrement: true,
      indexes: [
        { name: 'timestamp', keyPath: 'timestamp', unique: false },
        { name: 'userId', keyPath: 'userId', unique: false },
        { name: 'tableName', keyPath: 'tableName', unique: false },
        { name: 'operation', keyPath: 'operation', unique: false }
      ]
    },
    {
      name: 'backups',
      keyPath: 'backupId',
      autoIncrement: true,
      indexes: [
        { name: 'createdAt', keyPath: 'createdAt', unique: false },
        { name: 'createdBy', keyPath: 'createdBy', unique: false }
      ]
    }
  ]
};

// [섹션: DB 초기화]
export async function initDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_SCHEMA.name, DB_SCHEMA.version);
    
    request.onerror = () => {
      console.error('[DB 오류]', request.error);
      reject(request.error);
    };
    
    request.onsuccess = () => {
      console.log('[DB 연결 성공]');
      resolve(request.result);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      console.log('[DB 업그레이드] 버전:', event.newVersion);
      
      // 기존 스토어 삭제 (클린 업그레이드)
      DB_SCHEMA.stores.forEach(storeConfig => {
        if (db.objectStoreNames.contains(storeConfig.name)) {
          db.deleteObjectStore(storeConfig.name);
        }
      });
      
      // 스토어 재생성
      DB_SCHEMA.stores.forEach(storeConfig => {
        const store = db.createObjectStore(storeConfig.name, {
          keyPath: storeConfig.keyPath,
          autoIncrement: storeConfig.autoIncrement || false
        });
        
        // 인덱스 생성
        if (storeConfig.indexes) {
          storeConfig.indexes.forEach(index => {
            store.createIndex(index.name, index.keyPath, {
              unique: index.unique
            });
          });
        }
        
        console.log(`[스토어 생성] ${storeConfig.name}`);
      });
    };
  });
}

// [섹션: DB 연결 헬퍼]
export async function getDB() {
  return await initDatabase();
}
```

### 2.2 거래처 데이터 구조 (19개 컬럼)

```javascript
// [섹션: 거래처 데이터 모델]
export const CompanyModel = {
  keyValue: 'string',              // KEY VALUE (PK)
  companyNameERP: 'string',        // 거래처명(ERP)
  finalCompanyName: 'string',      // 최종거래처명
  companyCode: 'string',           // 거래처코드
  representative: 'string',        // 대표자명
  internalManager: 'string',       // 내부담당자
  externalManager: 'string',       // 외부담당자
  businessStatus: 'string',        // 사업현황
  accumulatedSales: 'number',      // 누적매출금액
  accumulatedCollection: 'number', // 누적수금금액
  accountsReceivable: 'number',    // 외상매출금(잔액)
  lastPaymentDate: 'date',         // 마지막결제일
  lastPaymentAmount: 'number',     // 마지막결제금액
  salesProduct: 'string',          // 판매제품
  businessActivity: 'string',      // 영업활동내용
  remarks: 'string',               // 비고
  createdAt: 'date',               // 생성일
  updatedAt: 'date',               // 수정일
  updatedBy: 'string'              // 수정자
};
```

### 2.3 인덱스 전략

**검색 성능 최적화를 위한 인덱스**

| 인덱스명 | 용도 | 사용 예시 |
|---------|------|----------|
| `internalManager` | 담당자별 필터링 | 영업담당 본인 거래처 조회 |
| `businessStatus` | 사업현황 필터링 | 활성/불용/신규 필터 |
| `accumulatedSales` | 매출액 정렬 | 고액 거래처 상위 조회 |
| `lastPaymentDate` | 최근 결제일 정렬 | 최근 거래 거래처 조회 |
| `companyNameERP` | 거래처명 검색 | 자동완성, 검색 |

---

## 3. CRUD 시스템 구현

### 3.1 CRUD 클래스

**파일 위치**: `05.Source/05.database/02_crud.js`

```javascript
// [섹션: Import]
import { getDB } from './01_schema.js';
import { logChange } from './05_change_history.js';

// [섹션: 거래처 CRUD]
export class CompanyCRUD {
  constructor() {
    this.dbPromise = getDB();
  }
  
  // [섹션: 생성 (CREATE)]
  async create(company) {
    const db = await this.dbPromise;
    const tx = db.transaction('companies', 'readwrite');
    const store = tx.objectStore('companies');
    
    try {
      // 타임스탬프 추가
      const now = new Date();
      const user = JSON.parse(sessionStorage.getItem('user'));
      
      const newCompany = {
        ...company,
        createdAt: now,
        updatedAt: now,
        updatedBy: user.name
      };
      
      const result = await store.add(newCompany);
      
      // 변경 이력 기록
      await logChange({
        tableName: 'companies',
        operation: 'CREATE',
        recordId: result,
        beforeData: null,
        afterData: newCompany
      });
      
      console.log('[거래처 생성] KEY VALUE:', result);
      return result;
      
    } catch (error) {
      console.error('[거래처 생성 실패]', error);
      throw error;
    }
  }
  
  // [섹션: 조회 (READ)]
  async read(keyValue) {
    const db = await this.dbPromise;
    const tx = db.transaction('companies', 'readonly');
    const store = tx.objectStore('companies');
    
    try {
      const company = await store.get(keyValue);
      console.log('[거래처 조회]', company ? '성공' : '없음');
      return company;
      
    } catch (error) {
      console.error('[거래처 조회 실패]', error);
      throw error;
    }
  }
  
  // [섹션: 업데이트 (UPDATE)]
  async update(keyValue, updates) {
    const db = await this.dbPromise;
    const tx = db.transaction('companies', 'readwrite');
    const store = tx.objectStore('companies');
    
    try {
      const existing = await store.get(keyValue);
      
      if (!existing) {
        throw new Error('거래처를 찾을 수 없습니다.');
      }
      
      const user = JSON.parse(sessionStorage.getItem('user'));
      const updated = {
        ...existing,
        ...updates,
        updatedAt: new Date(),
        updatedBy: user.name
      };
      
      await store.put(updated);
      
      // 변경 이력 기록
      await logChange({
        tableName: 'companies',
        operation: 'UPDATE',
        recordId: keyValue,
        beforeData: existing,
        afterData: updated
      });
      
      console.log('[거래처 수정] KEY VALUE:', keyValue);
      return updated;
      
    } catch (error) {
      console.error('[거래처 수정 실패]', error);
      throw error;
    }
  }
  
  // [섹션: 삭제 (DELETE) - 소프트 삭제]
  async delete(keyValue) {
    const db = await this.dbPromise;
    const tx = db.transaction('companies', 'readwrite');
    const store = tx.objectStore('companies');
    
    try {
      const existing = await store.get(keyValue);
      
      if (!existing) {
        throw new Error('거래처를 찾을 수 없습니다.');
      }
      
      // 소프트 삭제 (사업현황을 '불용'으로 변경)
      const deleted = {
        ...existing,
        businessStatus: '불용',
        updatedAt: new Date(),
        updatedBy: JSON.parse(sessionStorage.getItem('user')).name
      };
      
      await store.put(deleted);
      
      // 변경 이력 기록
      await logChange({
        tableName: 'companies',
        operation: 'DELETE',
        recordId: keyValue,
        beforeData: existing,
        afterData: deleted
      });
      
      console.log('[거래처 삭제] KEY VALUE:', keyValue);
      return deleted;
      
    } catch (error) {
      console.error('[거래처 삭제 실패]', error);
      throw error;
    }
  }
  
  // [섹션: 목록 조회 (LIST)]
  async list(filter = {}) {
    const db = await this.dbPromise;
    const tx = db.transaction('companies', 'readonly');
    const store = tx.objectStore('companies');
    
    try {
      let results = [];
      
      // 인덱스 사용 여부 결정
      if (filter.internalManager) {
        const index = store.index('internalManager');
        results = await index.getAll(filter.internalManager);
      } else if (filter.businessStatus) {
        const index = store.index('businessStatus');
        results = await index.getAll(filter.businessStatus);
      } else {
        results = await store.getAll();
      }
      
      // 추가 필터 적용
      if (filter.minSales) {
        results = results.filter(c => c.accumulatedSales >= filter.minSales);
      }
      
      if (filter.searchKeyword) {
        const keyword = filter.searchKeyword.toLowerCase();
        results = results.filter(c => 
          c.finalCompanyName?.toLowerCase().includes(keyword) ||
          c.companyNameERP?.toLowerCase().includes(keyword)
        );
      }
      
      console.log(`[거래처 목록] ${results.length}개 조회`);
      return results;
      
    } catch (error) {
      console.error('[거래처 목록 실패]', error);
      throw error;
    }
  }
  
  // [섹션: 활성 거래처 조회]
  async getActive(internalManager = null) {
    const filter = {
      businessStatus: '활성'
    };
    
    if (internalManager) {
      filter.internalManager = internalManager;
    }
    
    return await this.list(filter);
  }
  
  // [섹션: 주요제품 판매 거래처 조회]
  async getMainProductCompanies(internalManager = null) {
    const companies = await this.list({ internalManager });
    const mainProducts = ['임플란트', '지르코니아', 'Abutment'];
    
    return companies.filter(c => {
      if (!c.salesProduct) return false;
      return mainProducts.some(product => c.salesProduct.includes(product));
    });
  }
}
```

### 3.2 보고서 CRUD

**파일 위치**: `05.Source/05.database/03_report_crud.js`

```javascript
// [섹션: 보고서 CRUD]
export class ReportCRUD {
  constructor() {
    this.dbPromise = getDB();
  }
  
  // [섹션: 보고서 작성]
  async create(report) {
    const db = await this.dbPromise;
    const tx = db.transaction('reports', 'readwrite');
    const store = tx.objectStore('reports');
    
    try {
      const user = JSON.parse(sessionStorage.getItem('user'));
      
      const newReport = {
        ...report,
        submittedBy: user.id,
        submittedByName: user.name,
        submittedDate: new Date(),
        status: 'pending' // 미확인
      };
      
      const reportId = await store.add(newReport);
      
      console.log('[보고서 작성] ID:', reportId);
      return reportId;
      
    } catch (error) {
      console.error('[보고서 작성 실패]', error);
      throw error;
    }
  }
  
  // [섹션: 보고서 확인 (관리자)]
  async confirm(reportId, confirmData) {
    const db = await this.dbPromise;
    const tx = db.transaction(['reports', 'companies'], 'readwrite');
    const reportStore = tx.objectStore('reports');
    const companyStore = tx.objectStore('companies');
    
    try {
      const report = await reportStore.get(reportId);
      
      if (!report) {
        throw new Error('보고서를 찾을 수 없습니다.');
      }
      
      const user = JSON.parse(sessionStorage.getItem('user'));
      
      // 보고서 상태 업데이트
      const confirmedReport = {
        ...report,
        status: 'confirmed',
        confirmedBy: user.id,
        confirmedByName: user.name,
        confirmedDate: new Date(),
        finalCollection: confirmData.finalCollection,
        activityStatus: confirmData.activityStatus,
        additionalContent: confirmData.additionalContent
      };
      
      await reportStore.put(confirmedReport);
      
      // 거래처 정보 자동 업데이트 (6개 컬럼)
      const company = await companyStore.get(report.companyId);
      
      if (company) {
        const updatedCompany = {
          ...company,
          // 1. 누적수금금액 += 최종수금
          accumulatedCollection: (company.accumulatedCollection || 0) + confirmData.finalCollection,
          // 2. 외상매출금(잔액) = 목표수금 - 최종수금
          accountsReceivable: report.targetCollection - confirmData.finalCollection,
          // 3. 마지막결제일
          lastPaymentDate: new Date(),
          // 4. 마지막결제금액
          lastPaymentAmount: confirmData.finalCollection,
          // 5. 판매제품 (기존 + 신규)
          salesProduct: this.mergeSalesProducts(company.salesProduct, report.salesProducts),
          // 6. 영업활동내용 (기존 + 신규)
          businessActivity: this.mergeActivity(company.businessActivity, confirmData.additionalContent),
          updatedAt: new Date(),
          updatedBy: user.name
        };
        
        await companyStore.put(updatedCompany);
        
        console.log('[거래처 자동 업데이트] KEY VALUE:', report.companyId);
      }
      
      console.log('[보고서 확인 완료] ID:', reportId);
      return confirmedReport;
      
    } catch (error) {
      console.error('[보고서 확인 실패]', error);
      throw error;
    }
  }
  
  // [섹션: 판매제품 병합]
  mergeSalesProducts(existing, newProducts) {
    if (!existing) return newProducts;
    if (!newProducts) return existing;
    
    const existingSet = new Set(existing.split(',').map(p => p.trim()));
    const newSet = new Set(newProducts.split(',').map(p => p.trim()));
    
    const merged = new Set([...existingSet, ...newSet]);
    return Array.from(merged).join(', ');
  }
  
  // [섹션: 영업활동 병합]
  mergeActivity(existing, newActivity) {
    if (!existing) return newActivity;
    if (!newActivity) return existing;
    
    const timestamp = new Date().toLocaleString('ko-KR');
    return `${existing}\n\n[${timestamp}]\n${newActivity}`;
  }
  
  // [섹션: 미확인 보고서 조회]
  async getPending() {
    const db = await this.dbPromise;
    const tx = db.transaction('reports', 'readonly');
    const store = tx.objectStore('reports');
    const index = store.index('status');
    
    try {
      const reports = await index.getAll('pending');
      console.log(`[미확인 보고서] ${reports.length}개`);
      return reports;
      
    } catch (error) {
      console.error('[미확인 보고서 조회 실패]', error);
      throw error;
    }
  }
}
```

---

## 4. 엑셀 동기화 시스템

### 4.1 엑셀 → IndexedDB

**파일 위치**: `05.Source/05.database/04_excel_sync.js`

```javascript
// [섹션: Import]
import * as XLSX from 'xlsx';
import { getDB } from './01_schema.js';
import { EXCEL_COLUMNS } from '../01.common/01_config.js';

// [섹션: 엑셀 파일 파싱]
export async function parseExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, {
          type: 'array',
          cellDates: true,
          cellNF: true,
          cellStyles: true
        });
        
        // 기본정보 시트
        const sheetName = '기본정보';
        if (!workbook.SheetNames.includes(sheetName)) {
          throw new Error(`'${sheetName}' 시트를 찾을 수 없습니다.`);
        }
        
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, {
          raw: false,
          dateNF: 'yyyy-mm-dd'
        });
        
        console.log(`[엑셀 파싱] ${jsonData.length}개 행 추출`);
        resolve(jsonData);
        
      } catch (error) {
        console.error('[엑셀 파싱 실패]', error);
        reject(error);
      }
    };
    
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

// [섹션: 엑셀 데이터 검증]
function validateExcelData(data) {
  const errors = [];
  
  data.forEach((row, index) => {
    // KEY VALUE 필수
    if (!row[EXCEL_COLUMNS.KEY_VALUE]) {
      errors.push(`${index + 2}행: KEY VALUE가 없습니다.`);
    }
    
    // 거래처명 필수
    if (!row[EXCEL_COLUMNS.COMPANY_NAME_ERP] && !row[EXCEL_COLUMNS.FINAL_COMPANY_NAME]) {
      errors.push(`${index + 2}행: 거래처명이 없습니다.`);
    }
    
    // 숫자 필드 검증
    const numberFields = [
      EXCEL_COLUMNS.ACCUMULATED_SALES,
      EXCEL_COLUMNS.ACCUMULATED_COLLECTION,
      EXCEL_COLUMNS.ACCOUNTS_RECEIVABLE,
      EXCEL_COLUMNS.LAST_PAYMENT_AMOUNT
    ];
    
    numberFields.forEach(field => {
      if (row[field] && isNaN(parseFloat(row[field]))) {
        errors.push(`${index + 2}행: ${field}가 숫자가 아닙니다.`);
      }
    });
  });
  
  if (errors.length > 0) {
    console.error('[데이터 검증 실패]', errors);
    throw new Error(`데이터 검증 실패:\n${errors.slice(0, 5).join('\n')}\n...외 ${errors.length - 5}개`);
  }
  
  console.log('[데이터 검증] 통과');
}

// [섹션: IndexedDB 저장]
export async function syncExcelToDb(excelData) {
  const db = await getDB();
  
  try {
    // 데이터 검증
    validateExcelData(excelData);
    
    // 백업 생성
    await createBackup();
    
    const tx = db.transaction('companies', 'readwrite');
    const store = tx.objectStore('companies');
    
    // 기존 데이터 전체 삭제
    await store.clear();
    console.log('[기존 데이터] 삭제 완료');
    
    // 새 데이터 저장
    for (const row of excelData) {
      const company = mapExcelToCompany(row);
      await store.add(company);
    }
    
    console.log(`[엑셀 → DB] ${excelData.length}개 저장 완료`);
    
    return {
      success: true,
      count: excelData.length
    };
    
  } catch (error) {
    console.error('[엑셀 → DB 동기화 실패]', error);
    throw error;
  }
}

// [섹션: 엑셀 행 → 거래처 객체 변환]
function mapExcelToCompany(row) {
  return {
    keyValue: row[EXCEL_COLUMNS.KEY_VALUE],
    companyNameERP: row[EXCEL_COLUMNS.COMPANY_NAME_ERP] || '',
    finalCompanyName: row[EXCEL_COLUMNS.FINAL_COMPANY_NAME] || '',
    companyCode: row[EXCEL_COLUMNS.COMPANY_CODE] || '',
    representative: row[EXCEL_COLUMNS.REPRESENTATIVE] || '',
    internalManager: row[EXCEL_COLUMNS.INTERNAL_MANAGER] || '',
    externalManager: row[EXCEL_COLUMNS.EXTERNAL_MANAGER] || '',
    businessStatus: row[EXCEL_COLUMNS.BUSINESS_STATUS] || '',
    accumulatedSales: parseFloat(row[EXCEL_COLUMNS.ACCUMULATED_SALES]) || 0,
    accumulatedCollection: parseFloat(row[EXCEL_COLUMNS.ACCUMULATED_COLLECTION]) || 0,
    accountsReceivable: parseFloat(row[EXCEL_COLUMNS.ACCOUNTS_RECEIVABLE]) || 0,
    lastPaymentDate: row[EXCEL_COLUMNS.LAST_PAYMENT_DATE] ? new Date(row[EXCEL_COLUMNS.LAST_PAYMENT_DATE]) : null,
    lastPaymentAmount: parseFloat(row[EXCEL_COLUMNS.LAST_PAYMENT_AMOUNT]) || 0,
    salesProduct: row[EXCEL_COLUMNS.SALES_PRODUCT] || '',
    businessActivity: row[EXCEL_COLUMNS.BUSINESS_ACTIVITY] || '',
    remarks: row[EXCEL_COLUMNS.REMARKS] || '',
    createdAt: new Date(),
    updatedAt: new Date(),
    updatedBy: 'EXCEL_UPLOAD'
  };
}
```

### 4.2 IndexedDB → 엑셀

```javascript
// [섹션: IndexedDB → 엑셀 내보내기]
export async function syncDbToExcel() {
  const db = await getDB();
  
  try {
    // 모든 데이터 수집
    const companies = await getAllCompanies(db);
    const reports = await getAllReports(db);
    const changeHistory = await getAllChangeHistory(db);
    
    // 엑셀 워크북 생성
    const workbook = XLSX.utils.book_new();
    
    // 1. 기본정보 시트
    const companiesSheet = XLSX.utils.json_to_sheet(
      companies.map(c => mapCompanyToExcel(c))
    );
    XLSX.utils.book_append_sheet(workbook, companiesSheet, '기본정보');
    
    // 2. 방문보고서 시트
    const reportsSheet = XLSX.utils.json_to_sheet(reports);
    XLSX.utils.book_append_sheet(workbook, reportsSheet, '방문보고서');
    
    // 3. 변경이력 시트
    const historySheet = XLSX.utils.json_to_sheet(changeHistory);
    XLSX.utils.book_append_sheet(workbook, historySheet, '변경내역');
    
    // 파일 다운로드
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const user = JSON.parse(sessionStorage.getItem('user'));
    const filename = `영업관리_${user.name}_${timestamp}.xlsx`;
    
    XLSX.writeFile(workbook, filename);
    
    console.log(`[DB → 엑셀] ${filename} 생성 완료`);
    
    return {
      success: true,
      filename: filename,
      companiesCount: companies.length,
      reportsCount: reports.length,
      historyCount: changeHistory.length
    };
    
  } catch (error) {
    console.error('[DB → 엑셀 실패]', error);
    throw error;
  }
}

// [섹션: 거래처 객체 → 엑셀 행 변환]
function mapCompanyToExcel(company) {
  return {
    [EXCEL_COLUMNS.KEY_VALUE]: company.keyValue,
    [EXCEL_COLUMNS.COMPANY_NAME_ERP]: company.companyNameERP,
    [EXCEL_COLUMNS.FINAL_COMPANY_NAME]: company.finalCompanyName,
    [EXCEL_COLUMNS.COMPANY_CODE]: company.companyCode,
    [EXCEL_COLUMNS.REPRESENTATIVE]: company.representative,
    [EXCEL_COLUMNS.INTERNAL_MANAGER]: company.internalManager,
    [EXCEL_COLUMNS.EXTERNAL_MANAGER]: company.externalManager,
    [EXCEL_COLUMNS.BUSINESS_STATUS]: company.businessStatus,
    [EXCEL_COLUMNS.ACCUMULATED_SALES]: company.accumulatedSales,
    [EXCEL_COLUMNS.ACCUMULATED_COLLECTION]: company.accumulatedCollection,
    [EXCEL_COLUMNS.ACCOUNTS_RECEIVABLE]: company.accountsReceivable,
    [EXCEL_COLUMNS.LAST_PAYMENT_DATE]: company.lastPaymentDate ? 
      company.lastPaymentDate.toISOString().split('T')[0] : '',
    [EXCEL_COLUMNS.LAST_PAYMENT_AMOUNT]: company.lastPaymentAmount,
    [EXCEL_COLUMNS.SALES_PRODUCT]: company.salesProduct,
    [EXCEL_COLUMNS.BUSINESS_ACTIVITY]: company.businessActivity,
    [EXCEL_COLUMNS.REMARKS]: company.remarks
  };
}

// [섹션: 헬퍼 함수들]
async function getAllCompanies(db) {
  const tx = db.transaction('companies', 'readonly');
  const store = tx.objectStore('companies');
  return await store.getAll();
}

async function getAllReports(db) {
  const tx = db.transaction('reports', 'readonly');
  const store = tx.objectStore('reports');
  return await store.getAll();
}

async function getAllChangeHistory(db) {
  const tx = db.transaction('changeHistory', 'readonly');
  const store = tx.objectStore('changeHistory');
  return await store.getAll();
}
```

---

## 5. 변경 이력 관리

### 5.1 변경 이력 기록

**파일 위치**: `05.Source/05.database/05_change_history.js`

```javascript
// [섹션: 변경 이력 기록]
export async function logChange({ tableName, operation, recordId, beforeData, afterData }) {
  const db = await getDB();
  const tx = db.transaction('changeHistory', 'readwrite');
  const store = tx.objectStore('changeHistory');
  
  try {
    const user = JSON.parse(sessionStorage.getItem('user'));
    
    const changeRecord = {
      timestamp: new Date(),
      userId: user.id,
      userName: user.name,
      tableName: tableName,
      operation: operation, // CREATE, UPDATE, DELETE
      recordId: recordId,
      beforeData: beforeData ? JSON.stringify(beforeData) : null,
      afterData: afterData ? JSON.stringify(afterData) : null,
      changes: getChangedFields(beforeData, afterData)
    };
    
    await store.add(changeRecord);
    console.log(`[변경 이력] ${operation} - ${tableName}:${recordId}`);
    
  } catch (error) {
    console.error('[변경 이력 기록 실패]', error);
    // 변경 이력 실패는 원본 작업에 영향 없음
  }
}

// [섹션: 변경된 필드 추출]
function getChangedFields(before, after) {
  if (!before || !after) return null;
  
  const changes = [];
  
  Object.keys(after).forEach(key => {
    if (before[key] !== after[key]) {
      changes.push({
        field: key,
        before: before[key],
        after: after[key]
      });
    }
  });
  
  return changes.length > 0 ? JSON.stringify(changes) : null;
}

// [섹션: 변경 이력 조회]
export async function getChangeHistory(filter = {}) {
  const db = await getDB();
  const tx = db.transaction('changeHistory', 'readonly');
  const store = tx.objectStore('changeHistory');
  
  try {
    let results = [];
    
    if (filter.userId) {
      const index = store.index('userId');
      results = await index.getAll(filter.userId);
    } else if (filter.tableName) {
      const index = store.index('tableName');
      results = await index.getAll(filter.tableName);
    } else {
      results = await store.getAll();
    }
    
    // 시간 범위 필터
    if (filter.startDate || filter.endDate) {
      results = results.filter(record => {
        const timestamp = record.timestamp;
        if (filter.startDate && timestamp < filter.startDate) return false;
        if (filter.endDate && timestamp > filter.endDate) return false;
        return true;
      });
    }
    
    // 최신순 정렬
    results.sort((a, b) => b.timestamp - a.timestamp);
    
    console.log(`[변경 이력] ${results.length}개 조회`);
    return results;
    
  } catch (error) {
    console.error('[변경 이력 조회 실패]', error);
    throw error;
  }
}
```

---

## 6. 백업 시스템

### 6.1 자동 백업

**파일 위치**: `05.Source/05.database/06_backup.js`

```javascript
// [섹션: 백업 생성]
export async function createBackup() {
  const db = await getDB();
  
  try {
    const user = JSON.parse(sessionStorage.getItem('user'));
    
    // 모든 데이터 수집
    const allData = {
      companies: await getAllData(db, 'companies'),
      employees: await getAllData(db, 'employees'),
      reports: await getAllData(db, 'reports'),
      changeHistory: await getAllData(db, 'changeHistory')
    };
    
    // 백업 레코드 생성
    const backup = {
      createdAt: new Date(),
      createdBy: user.id,
      createdByName: user.name,
      data: JSON.stringify(allData),
      dataSize: JSON.stringify(allData).length,
      recordCount: {
        companies: allData.companies.length,
        employees: allData.employees.length,
        reports: allData.reports.length,
        changeHistory: allData.changeHistory.length
      }
    };
    
    // 백업 저장
    const tx = db.transaction('backups', 'readwrite');
    const store = tx.objectStore('backups');
    const backupId = await store.add(backup);
    
    console.log('[백업 생성] ID:', backupId, '크기:', (backup.dataSize / 1024).toFixed(2), 'KB');
    
    // 오래된 백업 삭제 (30일 이상)
    await cleanOldBackups(30);
    
    return backupId;
    
  } catch (error) {
    console.error('[백업 생성 실패]', error);
    throw error;
  }
}

// [섹션: 백업 복원]
export async function restoreBackup(backupId) {
  const db = await getDB();
  
  try {
    // 백업 데이터 조회
    const tx1 = db.transaction('backups', 'readonly');
    const backupStore = tx1.objectStore('backups');
    const backup = await backupStore.get(backupId);
    
    if (!backup) {
      throw new Error('백업을 찾을 수 없습니다.');
    }
    
    const data = JSON.parse(backup.data);
    
    // 현재 데이터 백업 (복원 전)
    await createBackup();
    
    // 데이터 복원
    const tx2 = db.transaction(['companies', 'employees', 'reports'], 'readwrite');
    
    // 기존 데이터 삭제
    await tx2.objectStore('companies').clear();
    await tx2.objectStore('employees').clear();
    await tx2.objectStore('reports').clear();
    
    // 백업 데이터 복원
    for (const company of data.companies) {
      await tx2.objectStore('companies').add(company);
    }
    for (const employee of data.employees) {
      await tx2.objectStore('employees').add(employee);
    }
    for (const report of data.reports) {
      await tx2.objectStore('reports').add(report);
    }
    
    console.log('[백업 복원] ID:', backupId);
    
    return {
      success: true,
      recordCount: backup.recordCount
    };
    
  } catch (error) {
    console.error('[백업 복원 실패]', error);
    throw error;
  }
}

// [섹션: 오래된 백업 삭제]
async function cleanOldBackups(daysToKeep) {
  const db = await getDB();
  const tx = db.transaction('backups', 'readwrite');
  const store = tx.objectStore('backups');
  const index = store.index('createdAt');
  
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const cursor = await index.openCursor();
    let deletedCount = 0;
    
    while (cursor) {
      if (cursor.value.createdAt < cutoffDate) {
        await cursor.delete();
        deletedCount++;
      }
      cursor = await cursor.continue();
    }
    
    if (deletedCount > 0) {
      console.log(`[백업 정리] ${deletedCount}개 삭제 (${daysToKeep}일 이상)`);
    }
    
  } catch (error) {
    console.error('[백업 정리 실패]', error);
  }
}

// [섹션: 자동 백업 스케줄러]
export function startAutoBackup() {
  // 매일 새벽 2시 자동 백업
  setInterval(async () => {
    const now = new Date();
    if (now.getHours() === 2 && now.getMinutes() === 0) {
      try {
        await createBackup();
        console.log('[자동 백업] 완료');
      } catch (error) {
        console.error('[자동 백업 실패]', error);
      }
    }
  }, 60 * 1000); // 1분마다 체크
}

// [섹션: 헬퍼 함수]
async function getAllData(db, storeName) {
  const tx = db.transaction(storeName, 'readonly');
  const store = tx.objectStore(storeName);
  return await store.getAll();
}
```

---

## 7. 테스트 및 검증

### 7.1 단위 테스트

**파일 위치**: `05.Source/05.database/test_database.js`

```javascript
// [섹션: 데이터베이스 테스트]
export async function testDatabase() {
  console.log('=== 데이터베이스 테스트 시작 ===');
  
  const results = [];
  
  // 1. DB 초기화 테스트
  try {
    await initDatabase();
    results.push({ test: 'DB 초기화', status: '✅ 통과' });
  } catch (error) {
    results.push({ test: 'DB 초기화', status: '❌ 실패', error: error.message });
  }
  
  // 2. CRUD 테스트
  const crud = new CompanyCRUD();
  
  // CREATE
  try {
    const testCompany = {
      keyValue: 'TEST-001',
      companyNameERP: '테스트거래처',
      finalCompanyName: '테스트거래처',
      internalManager: '테스터',
      businessStatus: '활성',
      accumulatedSales: 1000000,
      accumulatedCollection: 800000,
      accountsReceivable: 200000
    };
    
    await crud.create(testCompany);
    results.push({ test: 'CREATE', status: '✅ 통과' });
  } catch (error) {
    results.push({ test: 'CREATE', status: '❌ 실패', error: error.message });
  }
  
  // READ
  try {
    const company = await crud.read('TEST-001');
    if (company && company.keyValue === 'TEST-001') {
      results.push({ test: 'READ', status: '✅ 통과' });
    } else {
      throw new Error('데이터 불일치');
    }
  } catch (error) {
    results.push({ test: 'READ', status: '❌ 실패', error: error.message });
  }
  
  // UPDATE
  try {
    await crud.update('TEST-001', { accumulatedSales: 1500000 });
    const updated = await crud.read('TEST-001');
    if (updated.accumulatedSales === 1500000) {
      results.push({ test: 'UPDATE', status: '✅ 통과' });
    } else {
      throw new Error('업데이트 실패');
    }
  } catch (error) {
    results.push({ test: 'UPDATE', status: '❌ 실패', error: error.message });
  }
  
  // DELETE
  try {
    await crud.delete('TEST-001');
    const deleted = await crud.read('TEST-001');
    if (deleted.businessStatus === '불용') {
      results.push({ test: 'DELETE', status: '✅ 통과' });
    } else {
      throw new Error('삭제 실패');
    }
  } catch (error) {
    results.push({ test: 'DELETE', status: '❌ 실패', error: error.message });
  }
  
  // 3. 인덱스 성능 테스트
  try {
    const start = performance.now();
    await crud.list({ internalManager: '테스터' });
    const duration = performance.now() - start;
    
    if (duration < 100) {
      results.push({ test: '인덱스 성능', status: '✅ 통과', time: `${duration.toFixed(2)}ms` });
    } else {
      throw new Error(`성능 기준 미달: ${duration.toFixed(2)}ms`);
    }
  } catch (error) {
    results.push({ test: '인덱스 성능', status: '❌ 실패', error: error.message });
  }
  
  console.table(results);
  console.log('=== 데이터베이스 테스트 완료 ===');
  
  return results;
}
```

### 7.2 통합 테스트

```javascript
// [섹션: 엑셀 동기화 통합 테스트]
export async function testExcelSync() {
  console.log('=== 엑셀 동기화 테스트 시작 ===');
  
  // 1. 엑셀 → DB
  const file = document.getElementById('test-file').files[0];
  const excelData = await parseExcelFile(file);
  const syncResult = await syncExcelToDb(excelData);
  
  console.log('[엑셀 → DB]', syncResult);
  
  // 2. DB → 엑셀
  const exportResult = await syncDbToExcel();
  
  console.log('[DB → 엑셀]', exportResult);
  
  // 3. 데이터 무결성 검증
  const db = await getDB();
  const companies = await getAllData(db, 'companies');
  
  console.log(`[무결성 검증] 원본: ${excelData.length}, DB: ${companies.length}`);
  
  if (excelData.length === companies.length) {
    console.log('✅ 동기화 성공');
  } else {
    console.error('❌ 데이터 손실 발생');
  }
}
```

---

## ✅ STAGE 3 완료 조건

- [ ] IndexedDB 스키마 정의 완료
- [ ] 거래처 CRUD 구현 완료
- [ ] 보고서 CRUD 구현 완료
- [ ] 엑셀 → DB 동기화 완료
- [ ] DB → 엑셀 동기화 완료
- [ ] 변경 이력 자동 기록 완료
- [ ] 백업/복원 시스템 완료
- [ ] 모든 단위 테스트 통과
- [ ] 통합 테스트 통과
- [ ] 성능 요구사항 충족 (쿼리 < 100ms)

---

**다음 단계**: STAGE 4 - 영업담당모드 구현

**이 단계 완료. 확인 후 다음 단계 진행 여부 알려주세요. (예: 문제 있음/다음으로)**

---

**Creator**: Daniel.K  
**Contact**: kinggo0807@hotmail.com  
**Owner**: Kang Jung Hwan
