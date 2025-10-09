/**
 * KUWOTECH 영업관리 시스템 - 변경 이력 관리
 * Created by: Daniel.K
 * Date: 2025
 */

// ============================================
// [섹션: Import]
// ============================================

import { getDB, withTransaction } from './02_schema.js';

// ============================================
// [섹션: 변경 이력 기록]
// ============================================

/**
 * [기능: 변경 이력 기록]
 * @param {Object} changeData - 변경 데이터
 * @returns {Promise<number>} 이력 ID
 */
export async function logChange(changeData) {
  const {
    tableName,
    operation,
    recordId,
    beforeData,
    afterData,
    metadata = {}
  } = changeData;
  
  try {
    const user = getCurrentUser();
    
    // 변경 이력 레코드 생성
    const changeRecord = {
      timestamp: new Date().toISOString(),
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      tableName: tableName,
      operation: operation, // CREATE, UPDATE, DELETE, CONFIRM, SYNC, EXPORT, etc.
      recordId: recordId,
      beforeData: beforeData ? JSON.stringify(beforeData) : null,
      afterData: afterData ? JSON.stringify(afterData) : null,
      changes: getChangedFields(beforeData, afterData),
      changeCount: 0,
      metadata: JSON.stringify(metadata),
      ipAddress: getClientIP(),
      userAgent: navigator.userAgent,
      sessionId: getSessionId()
    };
    
    // 변경 필드 수 계산
    if (changeRecord.changes) {
      const changesArray = JSON.parse(changeRecord.changes);
      changeRecord.changeCount = changesArray.length;
    }
    
    // DB에 저장
    const result = await withTransaction(['changeHistory'], 'readwrite', async (tx) => {
      const store = tx.objectStore('changeHistory');
      const id = await promisifyRequest(store.add(changeRecord));
      return id;
    });
    
    console.log(`[변경 이력] ${operation} - ${tableName}:${recordId} (ID: ${result})`);
    
    // 중요 작업은 추가 로깅
    if (isImportantOperation(operation)) {
      await logImportantAction(operation, tableName, recordId, user);
    }
    
    return result;
    
  } catch (error) {
    console.error('[변경 이력 기록 실패]', error);
    // 변경 이력 실패는 원본 작업에 영향 없음
    return null;
  }
}

/**
 * [기능: 변경된 필드 추출]
 */
function getChangedFields(before, after) {
  if (!before || !after) return null;
  
  const changes = [];
  const ignoredFields = ['updatedAt', 'updatedBy']; // 무시할 필드
  
  Object.keys(after).forEach(key => {
    if (ignoredFields.includes(key)) return;
    
    const beforeValue = before[key];
    const afterValue = after[key];
    
    // 값이 변경된 경우
    if (!isEqual(beforeValue, afterValue)) {
      changes.push({
        field: key,
        fieldLabel: getFieldLabel(key),
        before: formatValue(beforeValue),
        after: formatValue(afterValue),
        changeType: getChangeType(beforeValue, afterValue)
      });
    }
  });
  
  // 삭제된 필드 확인
  Object.keys(before).forEach(key => {
    if (ignoredFields.includes(key)) return;
    
    if (!(key in after)) {
      changes.push({
        field: key,
        fieldLabel: getFieldLabel(key),
        before: formatValue(before[key]),
        after: null,
        changeType: 'deleted'
      });
    }
  });
  
  return changes.length > 0 ? JSON.stringify(changes) : null;
}

/**
 * [기능: 값 비교]
 */
function isEqual(a, b) {
  // null/undefined 처리
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  
  // 날짜 비교
  if (a instanceof Date || b instanceof Date) {
    return new Date(a).getTime() === new Date(b).getTime();
  }
  
  // 배열 비교
  if (Array.isArray(a) && Array.isArray(b)) {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  
  // 객체 비교
  if (typeof a === 'object' && typeof b === 'object') {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  
  // 기본 비교
  return a === b;
}

/**
 * [기능: 변경 타입 판별]
 */
function getChangeType(before, after) {
  if (before == null && after != null) return 'created';
  if (before != null && after == null) return 'deleted';
  
  // 숫자 변경
  if (typeof before === 'number' && typeof after === 'number') {
    if (after > before) return 'increased';
    if (after < before) return 'decreased';
  }
  
  return 'modified';
}

/**
 * [기능: 값 포맷팅]
 */
function formatValue(value) {
  if (value == null) return null;
  
  // 날짜
  if (value instanceof Date || (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/))) {
    return new Date(value).toLocaleString('ko-KR');
  }
  
  // 숫자 (금액)
  if (typeof value === 'number' && value > 1000) {
    return value.toLocaleString('ko-KR') + '원';
  }
  
  // 배열
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  
  // 객체
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  
  return String(value);
}

/**
 * [기능: 필드 라벨]
 */
function getFieldLabel(field) {
  const labels = {
    keyValue: 'KEY VALUE',
    companyNameERP: '거래처명(ERP)',
    finalCompanyName: '최종거래처명',
    companyCode: '거래처코드',
    representative: '대표자명',
    internalManager: '내부담당자',
    externalManager: '외부담당자',
    businessStatus: '사업현황',
    accumulatedSales: '누적매출금액',
    accumulatedCollection: '누적수금금액',
    accountsReceivable: '외상매출금',
    lastPaymentDate: '마지막결제일',
    lastPaymentAmount: '마지막결제금액',
    salesProduct: '판매제품',
    businessActivity: '영업활동내용',
    remarks: '비고',
    status: '상태',
    targetCollection: '목표수금',
    actualCollection: '실제수금',
    finalCollection: '최종수금'
  };
  
  return labels[field] || field;
}

// ============================================
// [섹션: 변경 이력 조회]
// ============================================

/**
 * [기능: 변경 이력 조회]
 * @param {Object} filter - 필터 조건
 * @returns {Promise<Array>} 변경 이력
 */
export async function getChangeHistory(filter = {}) {
  try {
    const db = await getDB();
    const tx = db.transaction(['changeHistory'], 'readonly');
    const store = tx.objectStore('changeHistory');
    
    let results = [];
    
    // 인덱스 사용
    if (filter.userId) {
      const index = store.index('userId');
      results = await promisifyRequest(index.getAll(filter.userId));
      
    } else if (filter.tableName) {
      const index = store.index('tableName');
      results = await promisifyRequest(index.getAll(filter.tableName));
      
    } else if (filter.operation) {
      const index = store.index('operation');
      results = await promisifyRequest(index.getAll(filter.operation));
      
    } else {
      results = await promisifyRequest(store.getAll());
    }
    
    // 날짜 필터
    if (filter.dateRange) {
      const { startDate, endDate } = filter.dateRange;
      results = results.filter(record => {
        const timestamp = new Date(record.timestamp);
        return timestamp >= new Date(startDate) && timestamp <= new Date(endDate);
      });
    }
    
    // recordId 필터
    if (filter.recordId) {
      results = results.filter(record => record.recordId === filter.recordId);
    }
    
    // 작업 타입 필터
    if (filter.operationTypes) {
      results = results.filter(record => 
        filter.operationTypes.includes(record.operation)
      );
    }
    
    // 정렬 (최신순)
    results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // 페이징
    if (filter.pagination) {
      const { page = 1, pageSize = 50 } = filter.pagination;
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      
      const totalCount = results.length;
      results = results.slice(start, end);
      
      return {
        data: results.map(formatHistoryRecord),
        pagination: {
          page,
          pageSize,
          totalCount,
          totalPages: Math.ceil(totalCount / pageSize)
        }
      };
    }
    
    console.log(`[변경 이력] ${results.length}개 조회`);
    return results.map(formatHistoryRecord);
    
  } catch (error) {
    console.error('[변경 이력 조회 실패]', error);
    throw error;
  }
}

/**
 * [기능: 이력 레코드 포맷팅]
 */
function formatHistoryRecord(record) {
  const formatted = {
    ...record,
    changesParsed: null,
    beforeDataParsed: null,
    afterDataParsed: null,
    metadataParsed: null
  };
  
  // JSON 파싱
  try {
    if (record.changes) {
      formatted.changesParsed = JSON.parse(record.changes);
    }
    if (record.beforeData) {
      formatted.beforeDataParsed = JSON.parse(record.beforeData);
    }
    if (record.afterData) {
      formatted.afterDataParsed = JSON.parse(record.afterData);
    }
    if (record.metadata) {
      formatted.metadataParsed = JSON.parse(record.metadata);
    }
  } catch (error) {
    console.warn('[JSON 파싱 실패]', error);
  }
  
  // 작업 라벨
  formatted.operationLabel = getOperationLabel(record.operation);
  
  // 시간 포맷
  formatted.timestampFormatted = new Date(record.timestamp).toLocaleString('ko-KR');
  
  return formatted;
}

/**
 * [기능: 작업 라벨]
 */
function getOperationLabel(operation) {
  const labels = {
    CREATE: '생성',
    UPDATE: '수정',
    DELETE: '삭제',
    HARD_DELETE: '완전삭제',
    CONFIRM: '확인',
    EXCEL_SYNC: '엑셀동기화',
    EXCEL_EXPORT: '엑셀내보내기',
    BACKUP: '백업',
    RESTORE: '복원',
    LOGIN: '로그인',
    LOGOUT: '로그아웃'
  };
  
  return labels[operation] || operation;
}

// ============================================
// [섹션: 변경 이력 통계]
// ============================================

/**
 * [기능: 변경 이력 통계]
 * @param {Object} filter - 필터 조건
 * @returns {Promise<Object>} 통계 데이터
 */
export async function getChangeStatistics(filter = {}) {
  try {
    const history = await getChangeHistory(filter);
    const list = history.data || history;
    
    const stats = {
      totalChanges: list.length,
      byOperation: {},
      byTable: {},
      byUser: {},
      byDate: {},
      recentChanges: [],
      mostChangedRecords: []
    };
    
    const recordChangeCounts = {};
    
    list.forEach(record => {
      // 작업별
      stats.byOperation[record.operation] = 
        (stats.byOperation[record.operation] || 0) + 1;
      
      // 테이블별
      stats.byTable[record.tableName] = 
        (stats.byTable[record.tableName] || 0) + 1;
      
      // 사용자별
      stats.byUser[record.userName] = 
        (stats.byUser[record.userName] || 0) + 1;
      
      // 날짜별
      const date = new Date(record.timestamp).toISOString().split('T')[0];
      stats.byDate[date] = (stats.byDate[date] || 0) + 1;
      
      // 레코드별 변경 횟수
      const recordKey = `${record.tableName}:${record.recordId}`;
      recordChangeCounts[recordKey] = (recordChangeCounts[recordKey] || 0) + 1;
    });
    
    // 최근 변경 (최대 10개)
    stats.recentChanges = list.slice(0, 10).map(record => ({
      timestamp: record.timestampFormatted,
      user: record.userName,
      operation: record.operationLabel,
      table: record.tableName,
      recordId: record.recordId,
      changeCount: record.changeCount
    }));
    
    // 가장 많이 변경된 레코드
    stats.mostChangedRecords = Object.entries(recordChangeCounts)
      .map(([key, count]) => {
        const [table, recordId] = key.split(':');
        return { table, recordId, changeCount: count };
      })
      .sort((a, b) => b.changeCount - a.changeCount)
      .slice(0, 10);
    
    return stats;
    
  } catch (error) {
    console.error('[변경 통계 실패]', error);
    throw error;
  }
}

// ============================================
// [섹션: 중요 작업 로깅]
// ============================================

/**
 * [기능: 중요 작업 여부]
 */
function isImportantOperation(operation) {
  const importantOps = [
    'HARD_DELETE',
    'EXCEL_SYNC',
    'BACKUP',
    'RESTORE',
    'LOGIN',
    'LOGOUT'
  ];
  
  return importantOps.includes(operation);
}

/**
 * [기능: 중요 작업 로깅]
 */
async function logImportantAction(operation, tableName, recordId, user) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level: 'IMPORTANT',
    operation: operation,
    table: tableName,
    recordId: recordId,
    user: {
      id: user.id,
      name: user.name,
      role: user.role
    },
    session: getSessionId(),
    ip: getClientIP()
  };
  
  // 콘솔 로깅
  console.warn('[중요 작업]', logEntry);
  
  // 추가 알림 (필요시)
  if (operation === 'HARD_DELETE') {
    if (window.confirm(`⚠️ 완전 삭제가 수행되었습니다.\n\n테이블: ${tableName}\n레코드: ${recordId}\n사용자: ${user.name}\n\n계속하시겠습니까?`)) {
      // 계속
    } else {
      throw new Error('작업이 취소되었습니다.');
    }
  }
}

// ============================================
// [섹션: 헬퍼 함수]
// ============================================

/**
 * [기능: Promise 변환]
 */
function promisifyRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

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
    console.warn('[사용자 정보 없음]', error);
  }
  
  return {
    id: 'SYSTEM',
    name: 'SYSTEM',
    role: 'system'
  };
}

/**
 * [기능: 세션 ID]
 */
function getSessionId() {
  let sessionId = sessionStorage.getItem('sessionId');
  
  if (!sessionId) {
    sessionId = 'SID_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    sessionStorage.setItem('sessionId', sessionId);
  }
  
  return sessionId;
}

/**
 * [기능: 클라이언트 IP (시뮬레이션)]
 */
function getClientIP() {
  // 실제 환경에서는 서버에서 처리
  return 'LOCAL_CLIENT';
}

// [내용: 변경 이력 관리]
// 테스트: 기록, 조회, 통계
// #데이터베이스 #변경이력