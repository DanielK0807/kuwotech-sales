/**
 * KUWOTECH 영업관리 시스템 - 엑셀 파일 핸들러
 * Created by: Daniel.K  
 * Date: 2025-09-27
 * Description: 엑셀 파일 업로드/다운로드 UI 및 처리
 */

// ============================================
// [섹션: Import]
// ============================================

import { syncExcelToDb, syncDbToExcel, validateExcelData, parseExcelFile, EXCEL_COLUMNS } from './05_excel_sync.js';
import { showToast } from '../01.common/06_toast.js';
import { showModal } from '../01.common/05_modal.js';
import { formatCurrency, formatNumber } from '../01.common/03_format.js';
import GlobalConfig from '../01.common/00_global_config.js';

// ============================================
// [섹션: 엑셀 업로드 UI]
// ============================================

/**
 * [기능: 엑셀 업로드 모달 표시]
 */
export async function showExcelUploadModal() {
    const modalContent = `
        <div class="excel-upload-container">
            <h2 class="modal-title">
                <i class="fas fa-file-excel"></i> 엑셀 파일 업로드
            </h2>
            
            <div class="upload-info glass-card">
                <h3>📋 업로드 전 확인사항</h3>
                <ul>
                    <li>엑셀 파일 형식: .xlsx, .xls</li>
                    <li>필수 시트명: '기본정보' (또는 첫 번째 시트)</li>
                    <li>필수 컬럼: 거래처명(ERP) 또는 최종거래처명</li>
                    <li>중복 데이터는 자동으로 병합됩니다</li>
                </ul>
            </div>
            
            <div class="upload-zone glass-card" id="excelDropZone">
                <i class="fas fa-cloud-upload-alt upload-icon"></i>
                <p class="upload-text">파일을 드래그하거나 클릭하여 선택</p>
                <input type="file" id="excelFileInput" accept=".xlsx,.xls" style="display:none">
                <button class="btn btn-primary" id="selectFileBtn">
                    <i class="fas fa-folder-open"></i> 파일 선택
                </button>
            </div>
            
            <div class="file-info" id="fileInfo" style="display:none">
                <i class="fas fa-file-excel"></i>
                <span id="fileName"></span>
                <span id="fileSize"></span>
            </div>
            
            <div class="upload-options glass-card">
                <label>
                    <input type="checkbox" id="backupBeforeUpload" checked>
                    업로드 전 백업 생성
                </label>
                <label>
                    <input type="checkbox" id="validateBeforeUpload" checked>
                    데이터 유효성 검사
                </label>
                <label>
                    <input type="checkbox" id="mergeExisting" checked>
                    기존 데이터와 병합
                </label>
            </div>
            
            <div class="modal-actions">
                <button class="btn btn-secondary" id="cancelUpload">
                    <i class="fas fa-times"></i> 취소
                </button>
                <button class="btn btn-primary" id="startUpload" disabled>
                    <i class="fas fa-upload"></i> 업로드 시작
                </button>
            </div>
        </div>
    `;
    
    const modal = await showModal({
        title: '엑셀 업로드',
        content: modalContent,
        width: '600px',
        showClose: true
    });
    
    setupUploadEventHandlers(modal);
}

/**
 * [기능: 업로드 이벤트 핸들러 설정]
 */
function setupUploadEventHandlers(modal) {
    const dropZone = document.getElementById('excelDropZone');
    const fileInput = document.getElementById('excelFileInput');
    const selectBtn = document.getElementById('selectFileBtn');
    const startBtn = document.getElementById('startUpload');
    const cancelBtn = document.getElementById('cancelUpload');
    
    let selectedFile = null;
    
    // 파일 선택 버튼    selectBtn.onclick = () => fileInput.click();
    
    // 파일 선택 이벤트
    fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            handleFileSelection(file);
        }
    };
    
    // 드래그 앤 드롭
    dropZone.ondragover = (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    };
    
    dropZone.ondragleave = () => {
        dropZone.classList.remove('drag-over');
    };
    
    dropZone.ondrop = (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        
        const file = e.dataTransfer.files[0];
        if (file) {
            handleFileSelection(file);
        }
    };
    
    // 파일 선택 처리
    function handleFileSelection(file) {
        const validTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel'
        ];
        
        if (!validTypes.includes(file.type)) {
            showToast('엑셀 파일만 업로드 가능합니다', 'error');
            return;
        }
        
        selectedFile = file;
        
        // 파일 정보 표시
        document.getElementById('fileInfo').style.display = 'flex';
        document.getElementById('fileName').textContent = file.name;
        document.getElementById('fileSize').textContent = formatFileSize(file.size);
        
        // 업로드 버튼 활성화
        startBtn.disabled = false;
    }
    
    // 업로드 시작
    startBtn.onclick = async () => {
        if (!selectedFile) {
            showToast('파일을 선택해주세요', 'error');
            return;
        }
        
        await processExcelUpload(selectedFile, modal);
    };
    
    // 취소
    cancelBtn.onclick = () => {
        modal.close();
    };
}

/**
 * [기능: 엑셀 업로드 처리]
 */
async function processExcelUpload(file, modal) {
    const backupOption = document.getElementById('backupBeforeUpload').checked;
    const validateOption = document.getElementById('validateBeforeUpload').checked;
    const mergeOption = document.getElementById('mergeExisting').checked;
    
    try {
        showToast('엑셀 파일 처리 중...', 'info');
        
        // 1. 백업 생성
        if (backupOption) {
            const { createBackup } = await import('./07_backup.js');
            await createBackup('엑셀 업로드 전 백업');
            console.log('백업 생성 완료');
        }
        
        // 2. 파일 파싱
        const data = await parseExcelFile(file);
        console.log(`${data.length}개 데이터 파싱 완료`);
        
        // 3. 유효성 검사
        if (validateOption) {
            const validation = validateExcelData(data);
            
            if (validation.errors.length > 0) {
                await showValidationErrors(validation);
                
                if (!confirm('오류가 발견되었습니다. 계속 진행하시겠습니까?')) {
                    return;
                }
            }
            
            if (validation.warnings.length > 0) {
                console.warn('경고 사항:', validation.warnings);
            }
        }
        
        // 4. 데이터베이스 동기화
        const result = await syncExcelToDb(data, { merge: mergeOption });
        
        // 5. 결과 표시
        await showUploadResult(result);
        
        // 6. 모달 닫기
        modal.close();
        
        // 7. 페이지 새로고침
        if (result.added > 0 || result.updated > 0) {
            showToast(`업로드 완료: 추가 ${result.added}건, 수정 ${result.updated}건`, 'success');
            
            // 데이터 리로드
            if (typeof window.loadCompanyData === 'function') {
                window.loadCompanyData();
            }
        }
        
    } catch (error) {
        console.error('엑셀 업로드 실패:', error);
        showToast('업로드 실패: ' + error.message, 'error');
    }
}

// ============================================
// [섹션: 엑셀 다운로드 UI]
// ============================================
/**
 * [기능: 엑셀 다운로드 모달 표시]
 */
export async function showExcelDownloadModal() {
    const modalContent = `
        <div class="excel-download-container">
            <h2 class="modal-title">
                <i class="fas fa-file-download"></i> 엑셀 파일 다운로드
            </h2>
            
            <div class="download-options glass-card">
                <h3>📥 다운로드 옵션</h3>
                
                <div class="option-group">
                    <label>
                        <input type="checkbox" id="includeBasic" checked disabled>
                        <span>기본정보 (거래처)</span>
                        <span class="option-desc">전체 거래처 정보</span>
                    </label>
                </div>
                
                <div class="option-group">
                    <label>
                        <input type="checkbox" id="includeReports" checked>
                        <span>방문보고서</span>
                        <span class="option-desc">모든 방문 보고서</span>
                    </label>
                </div>
                
                <div class="option-group">
                    <label>
                        <input type="checkbox" id="includeHistory">
                        <span>변경이력</span>
                        <span class="option-desc">데이터 변경 기록</span>
                    </label>
                </div>
            </div>
            
            <div class="filename-input glass-card">
                <label for="downloadFileName">파일명:</label>
                <input type="text" id="downloadFileName" 
                       placeholder="영업관리_${new Date().toISOString().split('T')[0]}"
                       class="form-control">
                <span>.xlsx</span>
            </div>
            
            <div class="modal-actions">
                <button class="btn btn-secondary" id="cancelDownload">
                    <i class="fas fa-times"></i> 취소
                </button>
                <button class="btn btn-primary" id="startDownload">
                    <i class="fas fa-download"></i> 다운로드
                </button>
            </div>
        </div>
    `;
    
    const modal = await showModal({
        title: '엑셀 다운로드',
        content: modalContent,
        width: '500px',
        showClose: true
    });
    
    setupDownloadEventHandlers(modal);
}

/**
 * [기능: 다운로드 이벤트 핸들러 설정]
 */
function setupDownloadEventHandlers(modal) {
    const startBtn = document.getElementById('startDownload');
    const cancelBtn = document.getElementById('cancelDownload');
    const fileNameInput = document.getElementById('downloadFileName');
    
    // 기본 파일명 설정
    const today = new Date().toISOString().split('T')[0];
    const userName = localStorage.getItem('userName') || 'USER';
    fileNameInput.placeholder = `영업관리_${userName}_${today}`;
    
    // 다운로드 시작
    startBtn.onclick = async () => {
        const options = {
            includeReports: document.getElementById('includeReports').checked,
            includeHistory: document.getElementById('includeHistory').checked,
            fileName: fileNameInput.value || fileNameInput.placeholder + '.xlsx'
        };
        
        try {
            showToast('엑셀 파일 생성 중...', 'info');
            
            const result = await syncDbToExcel(options);
            
            showToast(`다운로드 완료: ${result.fileName}`, 'success');
            modal.close();
            
        } catch (error) {
            console.error('다운로드 실패:', error);
            showToast('다운로드 실패: ' + error.message, 'error');
        }
    };
    
    // 취소
    cancelBtn.onclick = () => {
        modal.close();
    };
}

// ============================================
// [섹션: 유효성 검사 결과 표시]
// ============================================

/**
 * [기능: 유효성 검사 오류 표시]
 */
async function showValidationErrors(validation) {
    const errorContent = `
        <div class="validation-result">
            <h3>⚠️ 데이터 검증 결과</h3>
            
            ${validation.errors.length > 0 ? `
                <div class="error-section">
                    <h4>오류 (${validation.errors.length}건)</h4>
                    <ul class="error-list">
                        ${validation.errors.slice(0, 10).map(err => 
                            `<li>${err}</li>`
                        ).join('')}
                        ${validation.errors.length > 10 ? 
                            `<li>... 외 ${validation.errors.length - 10}건</li>` : ''}
                    </ul>
                </div>
            ` : ''}
            
            ${validation.warnings.length > 0 ? `
                <div class="warning-section">
                    <h4>경고 (${validation.warnings.length}건)</h4>
                    <ul class="warning-list">
                        ${validation.warnings.slice(0, 10).map(warn => 
                            `<li>${warn}</li>`
                        ).join('')}
                        ${validation.warnings.length > 10 ? 
                            `<li>... 외 ${validation.warnings.length - 10}건</li>` : ''}
                    </ul>
                </div>
            ` : ''}
            
            <div class="valid-section">
                <p>✅ 유효한 데이터: ${validation.validRows.length}건</p>
            </div>
        </div>
    `;
    
    await showModal({
        title: '데이터 검증 결과',
        content: errorContent,
        width: '600px',
        buttons: [
            {
                text: '확인',
                class: 'btn-primary',
                action: 'close'
            }
        ]
    });
}

/**
 * [기능: 업로드 결과 표시]
 */
async function showUploadResult(result) {
    const resultContent = `
        <div class="upload-result">
            <h3>✅ 업로드 완료</h3>
            
            <div class="result-stats glass-card">
                <div class="stat-item">
                    <span class="stat-label">추가된 데이터</span>
                    <span class="stat-value">${result.added}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">수정된 데이터</span>
                    <span class="stat-value">${result.updated}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">건너뛴 데이터</span>
                    <span class="stat-value">${result.skipped}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">오류 발생</span>
                    <span class="stat-value">${result.failed}</span>
                </div>
            </div>
            
            <p class="result-message">
                총 ${result.total}건 중 ${result.added + result.updated}건이 성공적으로 처리되었습니다.
            </p>
        </div>
    `;
    
    await showModal({
        title: '업로드 결과',
        content: resultContent,
        width: '500px',
        buttons: [
            {
                text: '확인',
                class: 'btn-primary',
                action: 'close'
            }
        ]
    });
}

// ============================================
// [섹션: 유틸리티 함수]
// ============================================

/**
 * [기능: 파일 크기 포맷]
 */
function formatFileSize(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
}

// ============================================
// [섹션: 스타일 추가]
// ============================================

const style = document.createElement('style');
style.textContent = `
    /* 엑셀 업로드/다운로드 스타일 */
    .excel-upload-container,
    .excel-download-container {
        padding: 20px;
    }
    
    .upload-zone {
        border: 2px dashed var(--color-border);
        border-radius: 10px;
        padding: 40px;
        text-align: center;
        cursor: pointer;
        transition: all 0.3s ease;
        margin: 20px 0;
    }
    
    .upload-zone.drag-over {
        border-color: var(--color-primary);
        background: rgba(var(--color-primary-rgb), 0.1);
    }
    
    .upload-icon {
        font-size: 48px;
        color: var(--color-text-secondary);
        margin-bottom: 10px;
    }
    
    .file-info {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 15px;
        background: var(--color-background-light);
        border-radius: 5px;
        margin: 15px 0;
    }
    
    .upload-options,
    .download-options {
        padding: 15px;
        margin: 15px 0;
    }
    
    .upload-options label,
    .download-options label {
        display: flex;
        align-items: center;
        gap: 10px;
        margin: 10px 0;
        cursor: pointer;
    }
    
    .option-group {
        padding: 10px;
        border-radius: 5px;
        transition: background 0.3s ease;
    }
    
    .option-group:hover {
        background: var(--color-background-light);
    }
    
    .option-desc {
        font-size: 0.9em;
        color: var(--color-text-secondary);
        margin-left: auto;
    }
    
    .filename-input {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 15px;
        margin: 15px 0;
    }
    
    .filename-input input {
        flex: 1;
    }
    
    .validation-result,
    .upload-result {
        padding: 20px;
    }
    
    .error-list,
    .warning-list {
        max-height: 200px;
        overflow-y: auto;
        margin: 10px 0;
        padding-left: 20px;
    }
    
    .error-list li {
        color: var(--color-danger);
    }
    
    .warning-list li {
        color: var(--color-warning);
    }
    
    .result-stats {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 15px;
        margin: 20px 0;
        padding: 20px;
    }
    
    .stat-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 5px;
    }
    
    .stat-label {
        font-size: 0.9em;
        color: var(--color-text-secondary);
    }
    
    .stat-value {
        font-size: 1.5em;
        font-weight: bold;
        color: var(--color-primary);
    }
`;

document.head.appendChild(style);

// ============================================
// [섹션: 초기화]
// ============================================

/**
 * [기능: 엑셀 핸들러 초기화]
 */
export function initExcelHandler() {
    console.log('[엑셀 핸들러] 초기화 완료');
    
    // 전역 함수로 등록
    window.KUWOTECH_EXCEL = {
        showUploadModal: showExcelUploadModal,
        showDownloadModal: showExcelDownloadModal,
        parseFile: parseExcelFile,
        validateData: validateExcelData
    };
}

// 자동 초기화
if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', initExcelHandler);
}

export default {
    showExcelUploadModal,
    showExcelDownloadModal,
    initExcelHandler
};
