/**
 * KUWOTECH 영업관리 시스템 - 백업 시스템
 * Created by: Daniel.K
 * Date: 2025
 */

// ============================================
// [섹션: Import]
// ============================================

import { getDB, withTransaction } from './02_schema.js';
import { logChange } from './06_change_history.js';

// ============================================
// [섹션: 백업 생성]
// ============================================

/**
 * [기능: 백업 생성]
 * @param {Object} options - 백업 옵션
 * @returns {Promise<Object>} 백업 결과
 */
export async function createBackup(options = {}) {
  const {
    description = '수동 백업',
    includeHistory = true,
    compress = false
  } = options;
  
  try {
    const user = getCurrentUser();
    const startTime = Date.now();
    
    console.log('[백업 시작]', new Date().toLocaleString('ko-KR'));
    
    // 모든 데이터 수집
    const backupData = {
      companies: await getAllData('companies'),
      employees: await getAllData('employees'),
      reports: await getAllData('reports')
    };
    
    // 변경 이력 포함 여부
    if (includeHistory) {
      backupData.changeHistory = await getAllData('changeHistory');
    }
    
    // 데이터 압축 (옵션)
    let dataString = JSON.stringify(backupData);
    let compressionRatio = 1;
    
    if (compress) {
      const compressed = compressData(dataString);
      compressionRatio = compressed.length / dataString.length;
      dataString = compressed;
    }
    
    // 백업 레코드 생성
    const backup = {
      createdAt: new Date().toISOString(),
      createdBy: user.id,
      createdByName: user.name,
      description: description,
      data: dataString,
      dataSize: dataString.length,
      compressed: compress,
      compressionRatio: compressionRatio,
      recordCount: {
        companies: backupData.companies.length,
        employees: backupData.employees.length,
        reports: backupData.reports.length,
        changeHistory: backupData.changeHistory?.length || 0,
        total: 0
      },
      dbVersion: 1, // DB_VERSION 상수
      metadata: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        timestamp: Date.now(),
        duration: 0
      }
    };
    
    // 총 레코드 수 계산
    backup.recordCount.total = Object.values(backup.recordCount)
      .filter(v => typeof v === 'number')
      .reduce((sum, count) => sum + count, 0);
    
    // 백업 저장
    const backupId = await withTransaction(['backups'], 'readwrite', async (tx) => {
      const store = tx.objectStore('backups');
      const id = await promisifyRequest(store.add(backup));
      return id;
    });
    
    // 소요 시간 계산
    backup.metadata.duration = Date.now() - startTime;
    
    // 변경 이력 기록
    await logChange({
      tableName: 'backups',
      operation: 'BACKUP',
      recordId: backupId,
      beforeData: null,
      afterData: {
        backupId: backupId,
        description: description,
        recordCount: backup.recordCount,
        dataSize: backup.dataSize
      }
    });
    
    // 오래된 백업 정리
    await cleanOldBackups();
    
    const result = {
      success: true,
      backupId: backupId,
      description: description,
      createdAt: backup.createdAt,
      recordCount: backup.recordCount,
      dataSize: backup.dataSize,
      dataSizeFormatted: formatFileSize(backup.dataSize),
      duration: backup.metadata.duration,
      compressed: compress,
      compressionRatio: compress ? Math.round((1 - compressionRatio) * 100) + '%' : 'N/A'
    };
    
    console.log('[백업 완료]', result);
    
    return result;
    
  } catch (error) {
    console.error('[백업 생성 실패]', error);
    throw error;
  }
}

// ============================================
// [섹션: 백업 복원]
// ============================================

/**
 * [기능: 백업 복원]
 * @param {number} backupId - 백업 ID
 * @param {Object} options - 복원 옵션
 * @returns {Promise<Object>} 복원 결과
 */
export async function restoreBackup(backupId, options = {}) {
  const {
    createRestorePoint = true, // 복원 전 현재 상태 백업
    clearExisting = true, // 기존 데이터 삭제 여부
    tables = ['companies', 'employees', 'reports'] // 복원할 테이블
  } = options;
  
  try {
    const startTime = Date.now();
    console.log('[백업 복원 시작] ID:', backupId);
    
    // 백업 데이터 조회
    const db = await getDB();
    const backupData = await getBackupData(db, backupId);
    
    if (!backupData) {
      throw new Error(`백업을 찾을 수 없습니다: ${backupId}`);
    }
    
    // 데이터 파싱
    let data;
    if (backupData.compressed) {
      const decompressed = decompressData(backupData.data);
      data = JSON.parse(decompressed);
    } else {
      data = JSON.parse(backupData.data);
    }
    
    // 복원 전 백업 (복원 포인트)
    if (createRestorePoint) {
      console.log('[복원 포인트 생성 중...]');
      await createBackup({
        description: `복원 포인트 (백업 #${backupId} 복원 전)`,
        includeHistory: false
      });
    }
    
    // 데이터 복원
    const restoredCounts = {};
    
    await withTransaction(tables, 'readwrite', async (tx) => {
      for (const tableName of tables) {
        const store = tx.objectStore(tableName);
        
        // 기존 데이터 삭제
        if (clearExisting) {
          await promisifyRequest(store.clear());
          console.log(`[${tableName}] 기존 데이터 삭제`);
        }
        
        // 백업 데이터 복원
        const tableData = data[tableName] || [];
        let count = 0;
        
        for (const record of tableData) {
          try {
            await promisifyRequest(store.add(record));
            count++;
          } catch (error) {
            if (error.name === 'ConstraintError' && !clearExisting) {
              // 중복 키 - 병합 모드에서는 무시
              console.warn(`[${tableName}] 중복 레코드 스킵:`, record.keyValue || record.id);
            } else {
              throw error;
            }
          }
        }
        
        restoredCounts[tableName] = count;
        console.log(`[${tableName}] ${count}개 복원`);
      }
    });
    
    // 변경 이력 기록
    await logChange({
      tableName: 'backups',
      operation: 'RESTORE',
      recordId: backupId,
      beforeData: {
        backupId: backupId,
        createdAt: backupData.createdAt
      },
      afterData: {
        restoredCounts: restoredCounts,
        restoredAt: new Date().toISOString()
      }
    });
    
    const duration = Date.now() - startTime;
    
    const result = {
      success: true,
      backupId: backupId,
      restoredAt: new Date().toISOString(),
      restoredCounts: restoredCounts,
      totalRestored: Object.values(restoredCounts).reduce((sum, count) => sum + count, 0),
      duration: duration,
      durationFormatted: formatDuration(duration)
    };
    
    console.log('[백업 복원 완료]', result);
    
    return result;
    
  } catch (error) {
    console.error('[백업 복원 실패]', error);
    throw error;
  }
}

// ============================================
// [섹션: 백업 관리]
// ============================================

/**
 * [기능: 백업 목록 조회]
 * @param {Object} filter - 필터 조건
 * @returns {Promise<Array>} 백업 목록
 */
export async function listBackups(filter = {}) {
  try {
    const db = await getDB();
    const tx = db.transaction(['backups'], 'readonly');
    const store = tx.objectStore('backups');
    
    let results = [];
    
    if (filter.createdBy) {
      const index = store.index('createdBy');
      results = await promisifyRequest(index.getAll(filter.createdBy));
    } else {
      results = await promisifyRequest(store.getAll());
    }
    
    // 날짜 필터
    if (filter.dateRange) {
      const { startDate, endDate } = filter.dateRange;
      results = results.filter(backup => {
        const date = new Date(backup.createdAt);
        return date >= new Date(startDate) && date <= new Date(endDate);
      });
    }
    
    // 정렬 (최신순)
    results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // 포맷팅
    const formatted = results.map(backup => ({
      backupId: backup.backupId,
      description: backup.description,
      createdAt: backup.createdAt,
      createdAtFormatted: new Date(backup.createdAt).toLocaleString('ko-KR'),
      createdBy: backup.createdByName,
      recordCount: backup.recordCount,
      totalRecords: backup.recordCount.total,
      dataSize: backup.dataSize,
      dataSizeFormatted: formatFileSize(backup.dataSize),
      compressed: backup.compressed,
      canRestore: true,
      ageInDays: Math.floor((Date.now() - new Date(backup.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    }));
    
    console.log(`[백업 목록] ${formatted.length}개 조회`);
    
    return formatted;
    
  } catch (error) {
    console.error('[백업 목록 실패]', error);
    throw error;
  }
}

/**
 * [기능: 백업 삭제]
 * @param {number} backupId - 백업 ID
 * @returns {Promise<boolean>} 성공 여부
 */
export async function deleteBackup(backupId) {
  try {
    const db = await getDB();
    
    await withTransaction(['backups'], 'readwrite', async (tx) => {
      const store = tx.objectStore('backups');
      await promisifyRequest(store.delete(backupId));
    });
    
    // 변경 이력 기록
    await logChange({
      tableName: 'backups',
      operation: 'DELETE',
      recordId: backupId,
      beforeData: { backupId },
      afterData: null
    });
    
    console.log('[백업 삭제] ID:', backupId);
    return true;
    
  } catch (error) {
    console.error('[백업 삭제 실패]', error);
    throw error;
  }
}

/**
 * [기능: 오래된 백업 정리]
 * @param {number|Object} options - 유지 기간(일) 또는 옵션 객체
 * @returns {Promise<number>} 삭제된 개수
 */
export async function cleanOldBackups(options = 30) {
  try {
    // 옵션 파라미터 처리
    let cutoffDate;
    let type = null;
    
    if (typeof options === 'number') {
      // 레거시: 숫자로 일수 전달
      cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - options);
    } else if (typeof options === 'object') {
      // 새로운 방식: 객체로 전달
      cutoffDate = options.cutoffDate || new Date();
      type = options.type || null;
    } else {
      // 기본값
      cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30);
    }
    
    const db = await getDB();
    const tx = db.transaction(['backups'], 'readwrite');
    const store = tx.objectStore('backups');
    const index = store.index('createdAt');
    
    let deletedCount = 0;
    const backupsToKeep = 5; // 최소 유지 개수
    
    // 전체 백업 수 확인
    const totalCount = await promisifyRequest(store.count());
    
    if (totalCount <= backupsToKeep) {
      console.log('[백업 정리] 최소 개수 미만, 정리 안 함');
      return 0;
    }
    
    // 오래된 백업 삭제
    const cursor = await promisifyRequest(index.openCursor());
    
    const processNextCursor = async (cursor) => {
      if (!cursor) return;
      
      const backup = cursor.value;
      const backupDate = new Date(backup.createdAt);
      
      // 날짜 조건 및 최소 개수 확인
      if (backupDate < cutoffDate && (totalCount - deletedCount) > backupsToKeep) {
        await promisifyRequest(cursor.delete());
        deletedCount++;
        console.log(`[백업 삭제] ${backup.description} (${backup.createdAt})`);
      }
      
      const nextCursor = await promisifyRequest(cursor.continue());
      if (nextCursor) {
        await processNextCursor(nextCursor);
      }
    };
    
    if (cursor) {
      await processNextCursor(cursor);
    }
    
    if (deletedCount > 0) {
      const ageInfo = type ? `${type} 타입` : `${cutoffDate.toLocaleDateString('ko-KR')} 이전`;
      console.log(`[백업 정리] ${deletedCount}개 삭제 (${ageInfo})`);
    }
    
    return deletedCount;
    
  } catch (error) {
    console.error('[백업 정리 실패]', error);
    return 0;
  }
}

// ============================================
// [섹션: 자동 백업]
// ============================================

let autoBackupInterval = null;

/**
 * [기능: 자동 백업 시작]
 * @param {Object} config - 자동 백업 설정
 */
export function startAutoBackup(config = {}) {
  const {
    intervalHours = 24, // 백업 주기 (시간)
    timeOfDay = 2, // 실행 시간 (0-23)
    enabled = true
  } = config;
  
  if (!enabled) {
    console.log('[자동 백업] 비활성화됨');
    return;
  }
  
  // 기존 인터벌 정리
  if (autoBackupInterval) {
    clearInterval(autoBackupInterval);
  }
  
  // 다음 백업 시간 계산
  const getNextBackupTime = () => {
    const now = new Date();
    const next = new Date();
    next.setHours(timeOfDay, 0, 0, 0);
    
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }
    
    return next;
  };
  
  const scheduleNextBackup = async () => {
    const nextTime = getNextBackupTime();
    const delay = nextTime.getTime() - Date.now();
    
    console.log(`[자동 백업] 다음 백업 예정: ${nextTime.toLocaleString('ko-KR')}`);
    
    setTimeout(async () => {
      try {
        await createBackup({
          description: '자동 백업',
          compress: true
        });
        console.log('[자동 백업] 완료');
      } catch (error) {
        console.error('[자동 백업 실패]', error);
      }
      
      // 다음 백업 스케줄
      scheduleNextBackup();
      
    }, delay);
  };
  
  // 첫 백업 스케줄
  scheduleNextBackup();
  
  // 주기적 체크 (1시간마다)
  autoBackupInterval = setInterval(() => {
    const now = new Date();
    if (now.getHours() === timeOfDay && now.getMinutes() === 0) {
      createBackup({
        description: '자동 백업 (정기)',
        compress: true
      }).catch(error => {
        console.error('[자동 백업 실패]', error);
      });
    }
  }, 60 * 60 * 1000);
  
  console.log('[자동 백업] 활성화됨');
}

/**
 * [기능: 자동 백업 중지]
 */
export function stopAutoBackup() {
  if (autoBackupInterval) {
    clearInterval(autoBackupInterval);
    autoBackupInterval = null;
    console.log('[자동 백업] 중지됨');
  }
}

// ============================================
// [섹션: 백업 내보내기/가져오기]
// ============================================

/**
 * [기능: 백업을 엑셀 파일로 내보내기]
 * @param {Object} backup - 백업 객체
 * @param {string} filename - 파일명
 * @returns {Promise<void>}
 */
export async function exportBackupToExcel(backup, filename) {
  try {
    console.log('[백업 엑셀 내보내기] 시작:', filename);
    
    // 백업 데이터 파싱
    let data;
    if (backup.compressed) {
      const decompressed = decompressData(backup.data);
      data = JSON.parse(decompressed);
    } else {
      data = typeof backup.data === 'string' ? JSON.parse(backup.data) : backup.data;
    }
    
    // 엑셀 워크북 생성 준비
    const workbookData = [];
    
    // 각 테이블별로 시트 데이터 생성
    if (data.companies && data.companies.length > 0) {
      workbookData.push({
        name: '거래처',
        data: convertToExcelData(data.companies, 'companies')
      });
    }
    
    if (data.employees && data.employees.length > 0) {
      workbookData.push({
        name: '직원',
        data: convertToExcelData(data.employees, 'employees')
      });
    }
    
    if (data.reports && data.reports.length > 0) {
      workbookData.push({
        name: '보고서',
        data: convertToExcelData(data.reports, 'reports')
      });
    }
    
    if (data.changeHistory && data.changeHistory.length > 0) {
      workbookData.push({
        name: '변경이력',
        data: convertToExcelData(data.changeHistory, 'changeHistory')
      });
    }
    
    // JSON 파일로 다운로드 (엑셀 라이브러리 없이 임시 구현)
    const jsonBlob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(jsonBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.replace('.xlsx', '.json');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('[백업 엑셀 내보내기] 완료:', filename);
    
  } catch (error) {
    console.error('[백업 엑셀 내보내기 실패]', error);
    throw error;
  }
}

/**
 * [기능: 데이터를 엑셀 형식으로 변환]
 * @param {Array} data - 데이터 배열
 * @param {string} type - 데이터 타입
 * @returns {Array} 엑셀 데이터
 */
function convertToExcelData(data, type) {
  if (!data || data.length === 0) return [];
  
  // 첫 번째 행을 헤더로 사용
  const headers = Object.keys(data[0]);
  const rows = [headers];
  
  // 데이터 행 추가
  data.forEach(item => {
    const row = headers.map(header => {
      const value = item[header];
      // 날짜 객체는 문자열로 변환
      if (value instanceof Date) {
        return value.toISOString();
      }
      // 객체는 JSON 문자열로 변환
      if (typeof value === 'object' && value !== null) {
        return JSON.stringify(value);
      }
      return value;
    });
    rows.push(row);
  });
  
  return rows;
}

/**
 * [기능: 백업 파일로 내보내기]
 * @param {number} backupId - 백업 ID
 * @returns {Promise<void>}
 */
export async function exportBackupToFile(backupId) {
  try {
    const db = await getDB();
    const backup = await getBackupData(db, backupId);
    
    if (!backup) {
      throw new Error(`백업을 찾을 수 없습니다: ${backupId}`);
    }
    
    // 백업 파일 생성
    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      backup: backup
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    
    // 파일명 생성
    const date = new Date(backup.createdAt).toISOString().split('T')[0];
    const fileName = `kuwotech_backup_${date}_${backupId}.json`;
    
    // 다운로드
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('[백업 내보내기] 파일:', fileName);
    
  } catch (error) {
    console.error('[백업 내보내기 실패]', error);
    throw error;
  }
}

/**
 * [기능: 백업 파일에서 가져오기]
 * @param {File} file - 백업 파일
 * @returns {Promise<Object>} 가져오기 결과
 */
export async function importBackupFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const exportData = JSON.parse(e.target.result);
        
        // 버전 확인
        if (exportData.version !== '1.0') {
          throw new Error(`지원하지 않는 백업 버전: ${exportData.version}`);
        }
        
        // 백업 데이터 저장
        const backup = exportData.backup;
        backup.description = `[가져오기] ${backup.description}`;
        backup.importedAt = new Date().toISOString();
        
        const db = await getDB();
        const backupId = await withTransaction(['backups'], 'readwrite', async (tx) => {
          const store = tx.objectStore('backups');
          const id = await promisifyRequest(store.add(backup));
          return id;
        });
        
        const result = {
          success: true,
          backupId: backupId,
          originalDate: backup.createdAt,
          recordCount: backup.recordCount,
          dataSize: backup.dataSize
        };
        
        console.log('[백업 가져오기] 완료', result);
        resolve(result);
        
      } catch (error) {
        console.error('[백업 가져오기 실패]', error);
        reject(error);
      }
    };
    
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
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
 * [기능: 전체 데이터 조회]
 */
async function getAllData(storeName) {
  const db = await getDB();
  const tx = db.transaction([storeName], 'readonly');
  const store = tx.objectStore(storeName);
  return await promisifyRequest(store.getAll());
}

/**
 * [기능: 백업 데이터 조회]
 */
async function getBackupData(db, backupId) {
  const tx = db.transaction(['backups'], 'readonly');
  const store = tx.objectStore('backups');
  return await promisifyRequest(store.get(backupId));
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
 * [기능: 데이터 압축 (간단한 구현)]
 */
function compressData(data) {
  // 실제로는 pako 등의 라이브러리 사용 권장
  // 여기서는 간단한 문자열 압축만 구현
  return btoa(encodeURIComponent(data));
}

/**
 * [기능: 데이터 압축 해제]
 */
function decompressData(compressed) {
  return decodeURIComponent(atob(compressed));
}

/**
 * [기능: 파일 크기 포맷]
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * [기능: 시간 포맷]
 */
function formatDuration(ms) {
  if (ms < 1000) return ms + 'ms';
  if (ms < 60000) return (ms / 1000).toFixed(1) + '초';
  return (ms / 60000).toFixed(1) + '분';
}

// [내용: 백업 시스템]
// 테스트: 생성, 복원, 자동백업, 내보내기
// #데이터베이스 #백업