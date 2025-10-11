/**
 * KUWOTECH 영업관리 시스템 - 변경 이력 관리 (Railway MySQL)
 * Created by: Daniel.K
 * Date: 2025
 *
 * 변경 이력은 백엔드 API에서 자동으로 처리됩니다.
 * company_history 테이블에 자동 기록됨
 */

// ============================================
// [섹션: Import]
// ============================================

import { getDB } from './01_database_manager.js';
import logger from '../01.common/23_logger.js';

// ============================================
// [섹션: 변경 이력 기록]
// ============================================

/**
 * [기능: 변경 이력 기록]
 * 백엔드 API에서 자동으로 처리되므로 이 함수는 호환성을 위해 유지
 * @param {Object} changeData - 변경 데이터
 * @returns {Promise<number>} 이력 ID (항상 null 반환)
 */
export async function logChange(changeData) {
  // 백엔드 API에서 company_history 테이블에 자동 기록되므로
  // 프론트엔드에서는 별도 처리 불필요


  return null;
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
 * Railway MySQL에서 변경 이력 조회 (추후 구현)
 * @param {Object} filter - 필터 조건
 * @returns {Promise<Array>} 변경 이력
 */
export async function getChangeHistory(filter = {}) {
  try {
    // 백엔드 API에 변경 이력 조회 엔드포인트가 구현되면 사용
    // 현재는 빈 배열 반환
    return [];

  } catch (error) {
    logger.error('[변경 이력 조회 실패]', error);
    return [];
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
    logger.warn('[JSON 파싱 실패]', error);
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
 * Railway MySQL에서 변경 이력 통계 (추후 구현)
 * @param {Object} filter - 필터 조건
 * @returns {Promise<Object>} 통계 데이터
 */
export async function getChangeStatistics(filter = {}) {
  try {
    // 백엔드 API에 변경 이력 통계 엔드포인트가 구현되면 사용

    return {
      totalChanges: 0,
      byOperation: {},
      byTable: {},
      byUser: {},
      byDate: {},
      recentChanges: [],
      mostChangedRecords: []
    };

  } catch (error) {
    logger.error('[변경 통계 실패]', error);
    return {
      totalChanges: 0,
      byOperation: {},
      byTable: {},
      byUser: {},
      byDate: {},
      recentChanges: [],
      mostChangedRecords: []
    };
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
  logger.warn('[중요 작업]', logEntry);
  
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
    logger.warn('[사용자 정보 없음]', error);
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