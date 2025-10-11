/**
 * KUWOTECH 영업관리 시스템 - 엑셀 동기화 (Railway MySQL)
 * Created by: Daniel.K
 * Date: 2025
 *
 * Railway MySQL 데이터베이스와 엑셀 간 동기화
 */

// ============================================
// [섹션: Import]
// ============================================

import { getDB } from './01_database_manager.js';
import { createBackup } from './07_backup.js';
import { logChange } from './06_change_history.js';
import { getCompanyDisplayName } from '../01.common/02_utils.js';
import { formatNumber, formatDate } from '../01.common/03_format.js';
import logger from '../01.common/23_logger.js';

// ============================================
// [섹션: 엑셀 컬럼 정의]
// ============================================

export const EXCEL_COLUMNS = {
  // 19개 컬럼 매핑
  KEY_VALUE: 'KEY VALUE',
  COMPANY_NAME_ERP: '거래처명(ERP)',
  FINAL_COMPANY_NAME: '최종거래처명',
  COMPANY_CODE: '거래처코드',
  REPRESENTATIVE: '대표자명',
  INTERNAL_MANAGER: '내부담당자',
  EXTERNAL_MANAGER: '외부담당자',
  BUSINESS_STATUS: '사업현황',
  ACCUMULATED_SALES: '누적매출금액',
  ACCUMULATED_COLLECTION: '누적수금금액',
  ACCOUNTS_RECEIVABLE: '외상매출금(잔액)',
  LAST_PAYMENT_DATE: '마지막결제일',
  LAST_PAYMENT_AMOUNT: '마지막결제금액',
  SALES_PRODUCT: '판매제품',
  BUSINESS_ACTIVITY: '영업활동내용',
  REMARKS: '비고',
  CREATED_AT: '생성일',
  UPDATED_AT: '수정일',
  UPDATED_BY: '수정자'
};

// ============================================
// [섹션: 엑셀 파일 파싱]
// ============================================

/**
 * [기능: 엑셀 파일 파싱]
 * @param {File} file - 엑셀 파일
 * @returns {Promise<Array>} 파싱된 데이터
 */
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
          cellStyles: true,
          dateNF: 'yyyy-mm-dd'
        });
        
        // 시트 확인
        const sheetName = '기본정보';
        if (!workbook.SheetNames.includes(sheetName)) {
          // 대체 시트명 시도
          const altNames = ['거래처정보', '거래처', 'Companies', 'Data'];
          const foundSheet = altNames.find(name => workbook.SheetNames.includes(name));
          
          if (foundSheet) {
          } else if (workbook.SheetNames.length > 0) {
            // 첫 번째 시트 사용
            const firstSheet = workbook.SheetNames[0];
          } else {
            throw new Error(`엑셀 파일에서 시트를 찾을 수 없습니다.`);
          }
        }
        
        const sheet = workbook.Sheets[sheetName] || 
                     workbook.Sheets[workbook.SheetNames[0]];
        
        // JSON 변환
        const jsonData = XLSX.utils.sheet_to_json(sheet, {
          raw: false,
          dateNF: 'yyyy-mm-dd',
          defval: '' // 빈 셀 기본값
        });
        
        
        // 데이터 정제
        const cleanedData = jsonData.map(row => cleanExcelRow(row));
        
        resolve(cleanedData);
        
      } catch (error) {
        logger.error('[엑셀 파싱 실패]', error);
        reject(error);
      }
    };
    
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * [기능: 엑셀 행 정제]
 */
function cleanExcelRow(row) {
  const cleaned = {};
  
  Object.keys(row).forEach(key => {
    // 공백 제거
    const cleanKey = key.trim();
    let value = row[key];
    
    // 값 정제
    if (typeof value === 'string') {
      value = value.trim();
      // 엑셀 수식 오류 처리
      if (value === '#N/A' || value === '#REF!' || value === '#VALUE!') {
        value = '';
      }
    }
    
    cleaned[cleanKey] = value;
  });
  
  return cleaned;
}

// ============================================
// [섹션: 데이터 검증]
// ============================================

/**
 * [기능: 엑셀 데이터 검증]
 * @param {Array} data - 검증할 데이터
 * @returns {Object} 검증 결과
 */
export function validateExcelData(data) {
  const errors = [];
  const warnings = [];
  const validRows = [];
  
  data.forEach((row, index) => {
    const rowNum = index + 2; // 엑셀 행 번호 (헤더 제외)
    const rowErrors = [];
    const rowWarnings = [];
    
    // 필수 필드 검증
    if (!row[EXCEL_COLUMNS.KEY_VALUE]) {
      // KEY VALUE 자동 생성 가능
      rowWarnings.push('KEY VALUE가 없습니다. 자동 생성됩니다.');
      row[EXCEL_COLUMNS.KEY_VALUE] = generateKeyValue(row, index);
    }
    
    if (!row[EXCEL_COLUMNS.COMPANY_NAME_ERP] && !row[EXCEL_COLUMNS.FINAL_COMPANY_NAME]) {
      rowErrors.push('거래처명이 없습니다.');
    }
    
    // 숫자 필드 검증
    const numberFields = [
      EXCEL_COLUMNS.ACCUMULATED_SALES,
      EXCEL_COLUMNS.ACCUMULATED_COLLECTION,
      EXCEL_COLUMNS.ACCOUNTS_RECEIVABLE,
      EXCEL_COLUMNS.LAST_PAYMENT_AMOUNT
    ];
    
    numberFields.forEach(field => {
      if (row[field]) {
        const value = String(row[field]).replace(/,/g, '').replace(/원/g, '');
        const num = parseFloat(value);
        
        if (isNaN(num)) {
          rowErrors.push(`${field}가 숫자가 아닙니다: ${row[field]}`);
        } else {
          // 숫자로 변환
          row[field] = num;
        }
      } else {
        // 기본값 0
        row[field] = 0;
      }
    });
    
    // 날짜 필드 검증
    if (row[EXCEL_COLUMNS.LAST_PAYMENT_DATE]) {
      const date = parseExcelDate(row[EXCEL_COLUMNS.LAST_PAYMENT_DATE]);
      if (date) {
        row[EXCEL_COLUMNS.LAST_PAYMENT_DATE] = date.toISOString();
      } else {
        rowWarnings.push(`날짜 형식이 올바르지 않습니다: ${row[EXCEL_COLUMNS.LAST_PAYMENT_DATE]}`);
        row[EXCEL_COLUMNS.LAST_PAYMENT_DATE] = null;
      }
    }
    
    // 사업현황 기본값
    if (!row[EXCEL_COLUMNS.BUSINESS_STATUS]) {
      row[EXCEL_COLUMNS.BUSINESS_STATUS] = '활성';
    }
    
    // 에러 수집
    if (rowErrors.length > 0) {
      errors.push({
        row: rowNum,
        errors: rowErrors,
        data: row
      });
    } else {
      validRows.push(row);
    }
    
    if (rowWarnings.length > 0) {
      warnings.push({
        row: rowNum,
        warnings: rowWarnings
      });
    }
  });
  
  const result = {
    valid: errors.length === 0,
    totalRows: data.length,
    validRows: validRows.length,
    errorRows: errors.length,
    errors: errors,
    warnings: warnings,
    data: validRows
  };
  
    `(유효: ${result.validRows}, 오류: ${result.errorRows})`);
  
  return result;
}

/**
 * [기능: KEY VALUE 생성]
 */
function generateKeyValue(row, index) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 4).toUpperCase();
  const prefix = row[EXCEL_COLUMNS.COMPANY_CODE] ? 
    row[EXCEL_COLUMNS.COMPANY_CODE].substr(0, 3).toUpperCase() : 'CMP';
  return `${prefix}-${timestamp}-${random}-${index}`;
}

/**
 * [기능: 엑셀 날짜 파싱]
 */
function parseExcelDate(value) {
  if (!value) return null;
  
  // 이미 Date 객체인 경우
  if (value instanceof Date) {
    return value;
  }
  
  // 문자열인 경우
  const str = String(value).trim();
  
  // ISO 형식
  if (str.match(/^\d{4}-\d{2}-\d{2}/)) {
    return new Date(str);
  }
  
  // 한국 형식 (2025년 1월 1일)
  if (str.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/)) {
    const match = str.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
    return new Date(match[1], match[2] - 1, match[3]);
  }
  
  // 슬래시 형식 (2025/01/01)
  if (str.match(/^\d{4}\/\d{1,2}\/\d{1,2}/)) {
    return new Date(str.replace(/\//g, '-'));
  }
  
  // 점 형식 (2025.01.01)
  if (str.match(/^\d{4}\.\d{1,2}\.\d{1,2}/)) {
    return new Date(str.replace(/\./g, '-'));
  }
  
  // 엑셀 시리얼 번호 (44197 = 2021-01-01)
  const num = parseFloat(str);
  if (!isNaN(num) && num > 25569 && num < 60000) {
    const date = new Date((num - 25569) * 86400 * 1000);
    return date;
  }
  
  return null;
}

// ============================================
// [섹션: Railway MySQL 동기화]
// ============================================

/**
 * [기능: 엑셀 → Railway MySQL 동기화]
 * @param {Array} excelData - 엑셀 데이터
 * @param {Object} options - 동기화 옵션
 * @returns {Promise<Object>} 동기화 결과
 */
export async function syncExcelToDb(excelData, options = {}) {
  const {
    mode = 'replace', // replace: 전체 교체, merge: 병합, append: 추가
    createBackup: shouldBackup = true
  } = options;

  try {
    const db = await getDB();

    // 데이터 검증
    const validation = validateExcelData(excelData);

    if (!validation.valid && !options.force) {
      throw new Error(`데이터 검증 실패: ${validation.errors.length}개 오류`);
    }

    // 백업 생성
    if (shouldBackup) {
      await createBackup();
    }

    let addedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    // 기존 데이터 조회 (merge 모드에서만 필요)
    let existingCompanies = [];
    let existingMap = new Map();

    if (mode === 'merge') {
      existingCompanies = await db.getAllClients();
      existingCompanies.forEach(c => {
        existingMap.set(c.keyValue, c);
      });
    } else if (mode === 'replace') {
      // replace 모드: 모든 기존 데이터 삭제
      existingCompanies = await db.getAllClients();
      for (const company of existingCompanies) {
        try {
          await db.deleteClient(company.keyValue);
        } catch (error) {
          logger.warn(`[삭제 실패] ${company.keyValue}:`, error.message);
        }
      }
    }

    // 데이터 저장
    for (const row of validation.data) {
      const company = mapExcelToCompany(row);

      try {
        if (mode === 'merge') {
          // 기존 데이터 확인
          const existing = existingMap.get(company.keyValue);

          if (existing) {
            // 병합
            const merged = mergeCompanyData(existing, company);
            await db.updateClient(company.keyValue, merged);
            updatedCount++;
          } else {
            await db.createClient(company);
            addedCount++;
          }
        } else {
          // replace 또는 append - 새로 추가
          await db.createClient(company);
          addedCount++;
        }
      } catch (error) {
        logger.warn(`[저장 실패] ${company.keyValue}:`, error.message);
        skippedCount++;
      }
    }

    // 변경 이력 기록 (백엔드에서 자동 처리)
    await logChange({
      tableName: 'companies',
      operation: 'EXCEL_SYNC',
      recordId: 'BULK',
      beforeData: { mode },
      afterData: { addedCount, updatedCount, skippedCount }
    });

    const syncResult = {
      success: true,
      mode: mode,
      totalRows: excelData.length,
      validRows: validation.validRows,
      added: addedCount,
      updated: updatedCount,
      skipped: skippedCount,
      errors: validation.errors,
      warnings: validation.warnings
    };


    return syncResult;

  } catch (error) {
    logger.error('[엑셀 → DB 동기화 실패]', error);
    throw error;
  }
}

/**
 * [기능: 엑셀 행 → 거래처 객체 변환]
 */
function mapExcelToCompany(row) {
  const now = new Date().toISOString();
  
  return {
    keyValue: row[EXCEL_COLUMNS.KEY_VALUE],
    erpCompanyName: row[EXCEL_COLUMNS.COMPANY_NAME_ERP] || '',
    finalCompanyName: row[EXCEL_COLUMNS.FINAL_COMPANY_NAME] || row[EXCEL_COLUMNS.COMPANY_NAME_ERP] || '',
    companyCode: row[EXCEL_COLUMNS.COMPANY_CODE] || '',
    ceoOrDentist: row[EXCEL_COLUMNS.REPRESENTATIVE] || '',
    internalManager: row[EXCEL_COLUMNS.INTERNAL_MANAGER] || '',
    externalManager: row[EXCEL_COLUMNS.EXTERNAL_MANAGER] || '',
    businessStatus: row[EXCEL_COLUMNS.BUSINESS_STATUS] || '활성',
    accumulatedSales: row[EXCEL_COLUMNS.ACCUMULATED_SALES] || 0,
    accumulatedCollection: row[EXCEL_COLUMNS.ACCUMULATED_COLLECTION] || 0,
    accountsReceivable: row[EXCEL_COLUMNS.ACCOUNTS_RECEIVABLE] || 0,
    lastPaymentDate: row[EXCEL_COLUMNS.LAST_PAYMENT_DATE] || null,
    lastPaymentAmount: row[EXCEL_COLUMNS.LAST_PAYMENT_AMOUNT] || 0,
    salesProduct: row[EXCEL_COLUMNS.SALES_PRODUCT] || '',
    businessActivity: row[EXCEL_COLUMNS.BUSINESS_ACTIVITY] || '',
    remarks: row[EXCEL_COLUMNS.REMARKS] || '',
    createdAt: row[EXCEL_COLUMNS.CREATED_AT] || now,
    updatedAt: row[EXCEL_COLUMNS.UPDATED_AT] || now,
    updatedBy: row[EXCEL_COLUMNS.UPDATED_BY] || 'EXCEL_UPLOAD'
  };
}

/**
 * [기능: 거래처 데이터 병합]
 */
function mergeCompanyData(existing, newData) {
  return {
    ...existing,
    ...newData,
    // 특정 필드는 기존 값 유지
    keyValue: existing.keyValue,
    createdAt: existing.createdAt,
    // 숫자 필드는 누적
    accumulatedSales: existing.accumulatedSales + (newData.accumulatedSales || 0),
    accumulatedCollection: existing.accumulatedCollection + (newData.accumulatedCollection || 0),
    // 업데이트 정보
    updatedAt: new Date().toISOString(),
    updatedBy: 'EXCEL_MERGE'
  };
}

// ============================================
// [섹션: Railway MySQL → 엑셀 내보내기]
// ============================================

/**
 * [기능: Railway MySQL → 엑셀 내보내기]
 * @param {Object} options - 내보내기 옵션
 * @returns {Promise<Object>} 내보내기 결과
 */
export async function syncDbToExcel(options = {}) {
  const {
    includeReports = true,
    includeHistory = false,
    fileName = null
  } = options;

  try {
    const db = await getDB();

    // 데이터 수집

    // 1. 거래처 데이터 (REST API 사용)
    const companies = await db.getAllClients();

    // 2. 보고서 데이터 (REST API 사용)
    let reports = [];
    if (includeReports) {
      reports = await db.getAllReports();
    }

    // 3. 변경 이력 (추후 구현 예정)
    let changeHistory = [];
    if (includeHistory) {
      // 추후 백엔드에서 /api/history 엔드포인트 제공 시 구현
    }
    
    // 엑셀 워크북 생성
    const workbook = XLSX.utils.book_new();
    
    // 1. 기본정보 시트
    const companiesSheet = XLSX.utils.json_to_sheet(
      companies.map(c => mapCompanyToExcel(c))
    );
    
    // 컬럼 너비 설정
    const columnWidths = [
      { wch: 20 }, // KEY VALUE
      { wch: 30 }, // 거래처명(ERP)
      { wch: 30 }, // 최종거래처명
      { wch: 15 }, // 거래처코드
      { wch: 15 }, // 대표자명
      { wch: 10 }, // 내부담당자
      { wch: 15 }, // 외부담당자
      { wch: 10 }, // 사업현황
      { wch: 15 }, // 누적매출금액
      { wch: 15 }, // 누적수금금액
      { wch: 15 }, // 외상매출금
      { wch: 12 }, // 마지막결제일
      { wch: 15 }, // 마지막결제금액
      { wch: 30 }, // 판매제품
      { wch: 50 }, // 영업활동내용
      { wch: 30 }, // 비고
      { wch: 12 }, // 생성일
      { wch: 12 }, // 수정일
      { wch: 10 }  // 수정자
    ];
    companiesSheet['!cols'] = columnWidths;
    
    XLSX.utils.book_append_sheet(workbook, companiesSheet, '기본정보');
    
    // 2. 방문보고서 시트
    if (includeReports && reports.length > 0) {
      const reportsSheet = XLSX.utils.json_to_sheet(
        reports.map(r => mapReportToExcel(r))
      );
      XLSX.utils.book_append_sheet(workbook, reportsSheet, '방문보고서');
    }
    
    // 3. 변경이력 시트
    if (includeHistory && changeHistory.length > 0) {
      const historySheet = XLSX.utils.json_to_sheet(
        changeHistory.map(h => ({
          '변경일시': h.timestamp,
          '사용자': h.userName,
          '테이블': h.tableName,
          '작업': h.operation,
          '레코드ID': h.recordId,
          '변경내용': h.changes
        }))
      );
      XLSX.utils.book_append_sheet(workbook, historySheet, '변경내역');
    }
    
    // 파일 생성
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const user = getCurrentUser();
    const finalFileName = fileName || `영업관리_${user.name}_${timestamp}.xlsx`;
    
    // 파일 다운로드
    XLSX.writeFile(workbook, finalFileName);
    
    const result = {
      success: true,
      fileName: finalFileName,
      companiesCount: companies.length,
      reportsCount: reports.length,
      historyCount: changeHistory.length,
      exportDate: new Date().toISOString()
    };
    
    
    // 변경 이력 기록
    await logChange({
      tableName: 'EXPORT',
      operation: 'EXCEL_EXPORT',
      recordId: finalFileName,
      beforeData: null,
      afterData: result
    });
    
    return result;
    
  } catch (error) {
    logger.error('[DB → 엑셀 실패]', error);
    throw error;
  }
}

/**
 * [기능: 거래처 객체 → 엑셀 행 변환]
 */
function mapCompanyToExcel(company) {
  return {
    [EXCEL_COLUMNS.KEY_VALUE]: company.keyValue,
    [EXCEL_COLUMNS.COMPANY_NAME_ERP]: company.erpCompanyName,
    [EXCEL_COLUMNS.FINAL_COMPANY_NAME]: company.finalCompanyName,
    [EXCEL_COLUMNS.COMPANY_CODE]: company.companyCode,
    [EXCEL_COLUMNS.REPRESENTATIVE]: company.representative,
    [EXCEL_COLUMNS.INTERNAL_MANAGER]: company.internalManager,
    [EXCEL_COLUMNS.EXTERNAL_MANAGER]: company.externalManager,
    [EXCEL_COLUMNS.BUSINESS_STATUS]: company.businessStatus,
    [EXCEL_COLUMNS.ACCUMULATED_SALES]: formatNumber(company.accumulatedSales),
    [EXCEL_COLUMNS.ACCUMULATED_COLLECTION]: formatNumber(company.accumulatedCollection),
    [EXCEL_COLUMNS.ACCOUNTS_RECEIVABLE]: formatNumber(company.accountsReceivable),
    [EXCEL_COLUMNS.LAST_PAYMENT_DATE]: formatDate(company.lastPaymentDate),
    [EXCEL_COLUMNS.LAST_PAYMENT_AMOUNT]: formatNumber(company.lastPaymentAmount),
    [EXCEL_COLUMNS.SALES_PRODUCT]: company.salesProduct,
    [EXCEL_COLUMNS.BUSINESS_ACTIVITY]: company.businessActivity,
    [EXCEL_COLUMNS.REMARKS]: company.remarks,
    [EXCEL_COLUMNS.CREATED_AT]: formatDate(company.createdAt),
    [EXCEL_COLUMNS.UPDATED_AT]: formatDate(company.updatedAt),
    [EXCEL_COLUMNS.UPDATED_BY]: company.updatedBy
  };
}


/**
 * [기능: 보고서 객체 → 엑셀 행 변환]
 */
function mapReportToExcel(report) {
  return {
    '보고서ID': report.reportId,
    '거래처ID': report.companyId,
    '작성자': report.submittedBy,
    '작성일': formatDate(report.submittedDate),
    '방문일': formatDate(report.visitDate),
    '방문목적': report.visitPurpose,
    '방문시간': report.visitDuration,
    '목표수금': report.targetCollection,
    '실제수금': report.actualCollection || 0,
    '최종수금': report.finalCollection || 0,
    '판매제품': report.salesProducts,
    '상태': report.status,
    '확인자': report.confirmedByName || '',
    '확인일': formatDate(report.confirmedDate),
    '평점': report.performanceScore || ''
  };
}

// ============================================
// [섹션: 헬퍼 함수]
// ============================================

/**
 * [기능: 현재 사용자]
 */
function getCurrentUser() {
  try {
    const userStr = sessionStorage.getItem('user') || localStorage.getItem('loginData');
    if (userStr) {
      const userData = JSON.parse(userStr);
      return userData.user || userData;
    }
  } catch (error) {
    logger.warn('[사용자 정보 없음]', error);
  }
  
  return {
    id: 'SYSTEM',
    name: 'SYSTEM',
    role: 'system'
  };
}

// [내용: 엑셀 동기화 - Railway MySQL]
// 테스트: 파싱, 검증, 동기화, 내보내기
// #데이터베이스 #엑셀 #동기화 #Railway