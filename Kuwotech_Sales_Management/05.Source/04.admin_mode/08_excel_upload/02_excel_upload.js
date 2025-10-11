/**
 * ============================================
 * KUWOTECH 영업관리 시스템 - 엑셀 업로드 (강정환 전용)
 * 파일: 02_excel_upload.js
 * Created by: Daniel.K
 * Date: 2025-01-27
 * 
 * [NAVIGATION: 파일 개요]
 * - 강정환 관리자 전용 거래처 엑셀 업로드 페이지
 * - ExcelDataLoader를 사용하여 실제 데이터 저장
 * - 변경사항 자동 감지 및 표시
 * - 업로드 이력 관리
 * 
 * [NAVIGATION: 주요 함수]
 * - initExcelUpload(): 페이지 초기화
 * - handleFileSelect(): 파일 선택 처리
 * - uploadToDatabase(): 데이터베이스 업로드
 * - showChanges(): 변경사항 표시
 * - loadUploadHistory(): 업로드 이력 로드
 * ============================================
 */

// ============================================
// [SECTION: 공통 모듈 임포트]
// ============================================

import {
    showToast,
    showLoading,
    hideLoading,
    formatDate,
    formatNumber
} from '../../01.common/20_common_index.js';

import { ExcelDataLoader } from '../../06.database/10_excel_data_loader.js';
import { getDB } from '../../06.database/01_database_manager.js';
import logger from '../../01.common/23_logger.js';

// ============================================
// [SECTION: 전역 변수]
// ============================================

let selectedFile = null;
let excelLoader = null;
let currentData = null;
let uploadHistory = [];

// ============================================
// [SECTION: 초기화]
// ============================================

async function initExcelUpload() {
    try {
        // DOM 요소들이 존재하는지 확인
        const requiredElements = {
            'upload-zone': document.getElementById('upload-zone'),
            'excel-file-input': document.getElementById('excel-file-input'),
            'select-file-btn': document.getElementById('select-file-btn'),
            'current-count': document.getElementById('current-count'),
            'last-upload': document.getElementById('last-upload'),
            'storage-status': document.getElementById('storage-status')
        };

        // 필수 요소가 없으면 에러
        if (!requiredElements['upload-zone'] || !requiredElements['excel-file-input']) {
            throw new Error('필수 DOM 요소를 찾을 수 없습니다.');
        }

        // ExcelDataLoader 인스턴스 생성
        excelLoader = new ExcelDataLoader();

        // 현재 상태 로드
        await loadCurrentStatus();

        // 업로드 이력 로드
        await loadUploadHistory();

        // 이벤트 리스너 설정
        setupEventListeners();
        
    } catch (error) {
        logger.error('========================================');
        logger.error('[엑셀 업로드] 초기화 실패:', error);
        logger.error('========================================');
        showToast('페이지 초기화 중 오류가 발생했습니다.', 'error');
    }
}

// ============================================
// [SECTION: 현재 상태 로드]
// ============================================

async function loadCurrentStatus() {
    try {
        const db = await getDB();

        // REST API를 사용하여 거래처 수 조회
        const companies = await db.getAllClients();

        const count = companies.length;

        document.getElementById('current-count').textContent = `${formatNumber(count)}개사`;

        // 마지막 업로드 시간 표시 (REST API에서는 변경 이력이 없으므로 간단하게 처리)
        if (count > 0) {
            // 가장 최근에 업데이트된 거래처의 날짜 찾기
            const sortedCompanies = companies
                .filter(c => c.updatedAt)
                .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

            const lastUpdate = sortedCompanies.length > 0 ? sortedCompanies[0].updatedAt : null;

            document.getElementById('last-upload').textContent = lastUpdate ? formatDate(new Date(lastUpdate)) : formatDate(new Date());
            document.getElementById('storage-status').innerHTML = `
                <span class="color-success">
                    <i class="fas fa-check-circle"></i> 데이터 있음
                </span>
            `;
        } else {
            document.getElementById('last-upload').textContent = '데이터 없음';
            document.getElementById('storage-status').innerHTML = `
                <span class="color-warning">
                    <i class="fas fa-exclamation-circle"></i> 데이터 없음
                </span>
            `;
        }

    } catch (error) {
        logger.error('[현재 상태] 로드 실패:', error);
        logger.error('[현재 상태] 에러 스택:', error.stack);
        document.getElementById('current-count').textContent = '-';
        document.getElementById('last-upload').textContent = '-';
        document.getElementById('storage-status').innerHTML = `
            <span class="color-danger">
                <i class="fas fa-exclamation-circle"></i> 확인 불가: ${error.message}
            </span>
        `;
    }
}

// ============================================
// [SECTION: 이벤트 리스너 설정]
// ============================================

function setupEventListeners() {
    const uploadZone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('excel-file-input');
    const selectFileBtn = document.getElementById('select-file-btn');
    const removeFileBtn = document.getElementById('remove-file-btn');
    const uploadBtn = document.getElementById('upload-btn');
    const closeModalBtn = document.getElementById('close-changes-modal');

    // 파일 선택 버튼
    if (selectFileBtn && fileInput) {
        selectFileBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            fileInput.click();
        });
    } else {
        logger.error('[이벤트 설정] 파일 선택 버튼 또는 input을 찾을 수 없음!', {
            selectFileBtn,
            fileInput
        });
    }

    // 파일 선택
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                handleFileSelect(file);
            }
        });
    }
    
    // 드래그 앤 드롭
    if (uploadZone) {
        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('drag-over');
        });
        
        uploadZone.addEventListener('dragleave', () => {
            uploadZone.classList.remove('drag-over');
        });
        
        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('drag-over');
            
            const file = e.dataTransfer.files[0];
            if (file) {
                // 엑셀 파일 확인
                if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                    handleFileSelect(file);
                } else {
                    showToast('엑셀 파일만 업로드 가능합니다.', 'error');
                }
            }
        });
        
        // 업로드 존 클릭으로도 파일 선택
        uploadZone.addEventListener('click', (e) => {
            // 버튼이 클릭된 경우는 제외 (이벤트 버블링)
            if (e.target === uploadZone || e.target.closest('.upload-zone')) {
                if (fileInput) {
                    fileInput.click();
                }
            }
        });
    }

    // 파일 제거
    if (removeFileBtn && fileInput) {
        removeFileBtn.addEventListener('click', () => {
            selectedFile = null;
            currentData = null;
            const fileInfo = document.getElementById('file-info');
            const uploadZoneEl = document.getElementById('upload-zone');
            const previewDiv = document.getElementById('excel-preview');

            if (fileInfo) fileInfo.style.display = 'none';
            if (uploadZoneEl) uploadZoneEl.style.display = 'block';
            if (previewDiv) {
                previewDiv.style.display = 'none';
                previewDiv.innerHTML = '';
            }
            fileInput.value = '';
        });
    }

    // 업로드 버튼
    if (uploadBtn) {
        uploadBtn.addEventListener('click', () => {
            uploadToDatabase();
        });
    }

    // 모달 닫기
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            const modal = document.getElementById('changes-modal');
            if (modal) modal.style.display = 'none';
        });
    }
}

// ============================================
// [SECTION: 파일 선택 처리]
// ============================================

async function handleFileSelect(file) {
    try {
        selectedFile = file;
        
        // 파일 정보 표시
        document.getElementById('file-name').textContent = file.name;
        document.getElementById('file-size').textContent = formatFileSize(file.size);
        document.getElementById('file-date').textContent = formatDate(new Date(file.lastModified));
        
        // UI 전환
        document.getElementById('upload-zone').style.display = 'none';
        document.getElementById('file-info').style.display = 'block';
        
        showToast('엑셀 파일 데이터를 읽는 중...', 'info');
        showLoading('엑셀 데이터 미리보기 생성 중...');
        
        // 엑셀 파일 미리 읽기
        await previewExcelData(file);
        
        hideLoading();
        showToast('파일을 확인하고 업로드 버튼을 클릭하세요.', 'success');
        
    } catch (error) {
        hideLoading();
        logger.error('[파일 선택] 오류:', error);
        showToast('파일 선택 중 오류가 발생했습니다: ' + error.message, 'error');
    }
}

// ============================================
// [SECTION: 엑셀 데이터 미리보기]
// ============================================

async function previewExcelData(file) {
    try {
        // XLSX 라이브러리 확인
        if (typeof XLSX === 'undefined') {
            throw new Error('XLSX 라이브러리가 로드되지 않았습니다.');
        }

        // 파일 읽기
        const data = await readFileAsArrayBuffer(file);
        const workbook = XLSX.read(data, {
            type: 'array',
            cellDates: true
        });

        // 기본정보 시트 찾기
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
            defval: ''
        });

        // 미리보기 표시
        displayPreview(jsonData, foundSheetName);
        
    } catch (error) {
        logger.error('[미리보기] 오류:', error);
        throw error;
    }
}

// 파일을 ArrayBuffer로 읽기
function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(new Uint8Array(e.target.result));
        reader.onerror = () => reject(new Error('파일을 읽을 수 없습니다.'));
        reader.readAsArrayBuffer(file);
    });
}

// ============================================
// [SECTION: 미리보기 표시]
// ============================================

function displayPreview(data, sheetName) {
    
    // 미리보기 영역 생성
    let previewDiv = document.getElementById('excel-preview');
    if (!previewDiv) {
        previewDiv = document.createElement('div');
        previewDiv.id = 'excel-preview';
        previewDiv.className = 'excel-preview glass-card';
        
        // file-info 다음에 삽입
        const fileInfo = document.getElementById('file-info');
        fileInfo.parentNode.insertBefore(previewDiv, fileInfo.nextSibling);
    }
    
    // 통계 정보
    const stats = analyzeData(data);
    
    // 미리보기 HTML 생성
    let html = `
        <div class="mb-lg">
            <h3 class="text-primary d-flex align-items-center gap-sm mb-md">
                <i class="fas fa-table"></i> 데이터 미리보기
                <span class="text-md text-secondary font-normal">
                    (시트: ${sheetName})
                </span>
            </h3>

            <!-- 통계 정보 -->
            <div class="preview-stats grid-auto-fit gap-md mb-lg">
                <div class="stat-card glass-effect-light">
                    <div class="stat-card-value color-info">
                        ${formatNumber(data.length)}
                    </div>
                    <div class="stat-card-label">
                        총 데이터 행
                    </div>
                </div>

                <div class="stat-card glass-effect-light">
                    <div class="stat-card-value color-success">
                        ${formatNumber(stats.validRows)}
                    </div>
                    <div class="stat-card-label">
                        유효한 데이터
                    </div>
                </div>

                <div class="stat-card glass-effect-light">
                    <div class="stat-card-value color-warning">
                        ${Object.keys(data[0] || {}).length}
                    </div>
                    <div class="stat-card-label">
                        컬럼 수
                    </div>
                </div>
            </div>

            ${stats.warnings.length > 0 ? `
                <div class="preview-warnings bg-warning-light border-left-warning p-md border-radius-sm mb-lg">
                    <div class="color-warning font-semibold mb-xs">
                        <i class="fas fa-exclamation-triangle"></i> 주의사항 (${stats.warnings.length}개)
                    </div>
                    <div class="text-sm text-secondary max-h-100 overflow-y-auto">
                        ${stats.warnings.slice(0, 5).map(w => `• ${w}`).join('<br>')}
                        ${stats.warnings.length > 5 ? `<br>• ... 외 ${stats.warnings.length - 5}개` : ''}
                    </div>
                </div>
            ` : ''}

            <!-- 데이터 테이블 -->
            <div class="text-secondary text-sm mb-sm">
                처음 10행의 데이터를 표시합니다:
            </div>
            <div class="preview-table-wrapper max-h-400 overflow-auto border-radius-sm bg-dark-30">
                ${generatePreviewTable(data.slice(0, 10))}
            </div>
        </div>
    `;
    
    previewDiv.innerHTML = html;
    previewDiv.style.display = 'block';
}

// ============================================
// [SECTION: 데이터 분석]
// ============================================

function analyzeData(data) {
    const warnings = [];
    let validRows = 0;
    
    // 필수 컬럼 확인
    const requiredColumns = ['KEY VALUE', '거래처명(ERP)', '최종거래처명'];
    const firstRow = data[0] || {};
    const columns = Object.keys(firstRow);
    
    // 필수 컬럼 중 하나라도 있는지 확인
    const hasKeyValue = columns.includes('KEY VALUE');
    const hasCompanyName = columns.includes('거래처명(ERP)') || columns.includes('최종거래처명');
    
    if (!hasKeyValue) {
        warnings.push('KEY VALUE 컬럼이 없습니다. 자동으로 생성됩니다.');
    }
    
    if (!hasCompanyName) {
        warnings.push('거래처명 컬럼이 없습니다. 데이터를 확인해주세요.');
    }
    
    // 데이터 검증
    data.forEach((row, index) => {
        const companyName = row['거래처명(ERP)'] || row['최종거래처명'];
        if (companyName && companyName.trim()) {
            validRows++;
        }
        
        // 빈 행 확인
        const isEmpty = Object.values(row).every(val => !val || val.toString().trim() === '');
        if (isEmpty && index < data.length - 5) { // 마지막 5행은 제외
            warnings.push(`행 ${index + 2}: 빈 행이 발견되었습니다.`);
        }
    });
    
    return {
        totalRows: data.length,
        validRows,
        warnings
    };
}

// ============================================
// [SECTION: 미리보기 테이블 생성]
// ============================================

function generatePreviewTable(data) {
    if (!data || data.length === 0) {
        return '<div class="no-data">데이터가 없습니다.</div>';
    }

    const columns = Object.keys(data[0]);

    // 주요 컬럼만 표시 (너무 많으면 가독성 저하)
    const displayColumns = columns.filter(col => {
        // 빈 컬럼명 제외
        if (!col || col.trim() === '') return false;

        // 중요 컬럼 우선 표시
        const importantCols = [
            'KEY VALUE',
            '거래처명(ERP)',
            '최종거래처명',
            '거래처코드',
            '내부담당자',
            '고객사 지역',
            '거래상태',
            '담당부서'
        ];

        return importantCols.includes(col) || importantCols.length < 8;
    }).slice(0, 8); // 최대 8개 컬럼

    let html = `
        <table class="preview-table">
            <thead>
                <tr>
                    <th>#</th>
                    ${displayColumns.map(col => `<th>${col}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
                ${data.map((row, index) => `
                    <tr>
                        <td class="text-tertiary">${index + 1}</td>
                        ${displayColumns.map(col => {
                            const value = row[col] || '';
                            const displayValue = value.toString().length > 30
                                ? value.toString().substring(0, 30) + '...'
                                : value;
                            return `<td title="${value}">${displayValue}</td>`;
                        }).join('')}
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    if (columns.length > displayColumns.length) {
        html += `
            <div class="p-sm text-center text-tertiary text-xs" style="background: rgba(0, 0, 0, 0.2);">
                ${columns.length - displayColumns.length}개의 추가 컬럼이 더 있습니다.
            </div>
        `;
    }

    return html;
}

// ============================================
// [SECTION: 데이터베이스 업로드]
// ============================================

async function uploadToDatabase() {
    if (!selectedFile) {
        showToast('파일을 먼저 선택해주세요.', 'warning');
        return;
    }
    
    try {
        showLoading('엑셀 파일 처리 중...');
        
        // 엑셀 파일 처리
        const result = await excelLoader.loadExcelFile(selectedFile, {
            dataType: 'companies', // 거래처 데이터만
            createBackupFirst: true // 백업 먼저 생성
        });
        
        hideLoading();
        
        if (result.success) {
            // 변경사항이 있는 경우
            if (result.hasChanges) {
                currentData = result;
                showChanges(result);
            } else {
                // 첫 업로드 또는 변경사항 없음
                await showUploadResult(result);
                
                // 상태 새로고침
                await loadCurrentStatus();
                await loadUploadHistory();
                
                // 파일 초기화
                selectedFile = null;
                currentData = null;
                document.getElementById('file-info').style.display = 'none';
                document.getElementById('upload-zone').style.display = 'block';
                document.getElementById('excel-file-input').value = '';
            }
        } else {
            // 오류 처리
            showToast(result.message || '업로드 중 오류가 발생했습니다.', 'error');
            
            if (result.validation && result.validation.errors) {
                showValidationErrors(result.validation);
            }
        }
        
    } catch (error) {
        hideLoading();
        logger.error('[데이터베이스 업로드] 오류:', error);
        showToast('업로드 중 오류가 발생했습니다.', 'error');
    }
}

// ============================================
// [SECTION: 변경사항 표시]
// ============================================

function showChanges(result) {
    const { changes, validation } = result;
    const totalChanges = (changes.added?.length || 0) +
                        (changes.modified?.length || 0) +
                        (changes.removed?.length || 0);

    let html = `
        <div class="changes-summary">
            <h3 class="text-white mb-lg">
                🔄 변경사항 요약
            </h3>
            <div class="grid-3col gap-lg mb-xl">
    `;

    if (changes.added && changes.added.length > 0) {
        html += `
            <div class="change-card bg-success-light">
                <div class="change-card-value color-success">
                    +${changes.added.length}
                </div>
                <div class="text-white">신규 추가</div>
            </div>
        `;
    }

    if (changes.modified && changes.modified.length > 0) {
        html += `
            <div class="change-card bg-warning-light">
                <div class="change-card-value color-warning">
                    ${changes.modified.length}
                </div>
                <div class="text-white">정보 수정</div>
            </div>
        `;
    }

    if (changes.removed && changes.removed.length > 0) {
        html += `
            <div class="change-card bg-danger-light">
                <div class="change-card-value color-danger">
                    -${changes.removed.length}
                </div>
                <div class="text-white">삭제됨</div>
            </div>
        `;
    }

    html += `
            </div>
        </div>

        <div class="changes-details max-h-400 overflow-y-auto mb-xl">
            ${generateChangeDetails(changes)}
        </div>

        <div class="d-flex gap-md justify-center pt-lg" style="border-top: 2px solid rgba(255, 255, 255, 0.1);">
            <button class="btn btn-success" id="apply-changes-btn" style="padding: var(--spacing-md) var(--spacing-xl);">
                <i class="fas fa-check"></i> 변경사항 적용
            </button>
            <button class="btn btn-secondary" id="cancel-changes-btn" style="padding: var(--spacing-md) var(--spacing-xl);">
                <i class="fas fa-times"></i> 취소
            </button>
        </div>
    `;

    const modalBody = document.getElementById('changes-modal-body');
    modalBody.innerHTML = html;

    // 모달 표시
    document.getElementById('changes-modal').style.display = 'flex';

    // 이벤트 리스너
    document.getElementById('apply-changes-btn')?.addEventListener('click', async () => {
        await applyChanges(result);
    });

    document.getElementById('cancel-changes-btn')?.addEventListener('click', () => {
        document.getElementById('changes-modal').style.display = 'none';
        currentData = null;
    });
}

// ============================================
// [SECTION: 변경사항 상세]
// ============================================

function generateChangeDetails(changes) {
    let html = '';

    if (changes.added && changes.added.length > 0) {
        html += `
            <div class="mb-lg">
                <h4 class="color-success mb-md">
                    <i class="fas fa-plus-circle"></i> 신규 추가 (${changes.added.length}개)
                </h4>
                <div class="d-grid gap-sm" style="margin-left: var(--spacing-lg);">
        `;

        changes.added.slice(0, 10).forEach(item => {
            const company = item.employee || item.company;
            html += `
                <div class="bg-white-05 p-sm border-radius-sm">
                    • ${company.finalCompanyName || company.erpCompanyName || company.name}
                    ${company.internalManager ? `(담당: ${company.internalManager})` : ''}
                </div>
            `;
        });

        if (changes.added.length > 10) {
            html += `<div class="mt-xs" style="color: rgba(255, 255, 255, 0.7);">... 외 ${changes.added.length - 10}개</div>`;
        }

        html += `</div></div>`;
    }

    if (changes.modified && changes.modified.length > 0) {
        html += `
            <div class="mb-lg">
                <h4 class="color-warning mb-md">
                    <i class="fas fa-edit"></i> 정보 수정 (${changes.modified.length}개)
                </h4>
                <div class="d-grid gap-sm" style="margin-left: var(--spacing-lg);">
        `;

        changes.modified.slice(0, 5).forEach(item => {
            const company = item.employee || item.company;
            html += `
                <div class="bg-white-05 p-sm border-radius-sm">
                    • ${company.finalCompanyName || company.erpCompanyName || company.name}
                    ${item.changes ? `<div class="text-sm" style="margin-left: var(--spacing-md); color: rgba(255, 255, 255, 0.7);">
                        ${item.changes.map(c => `- ${c.field}: ${c.old} → ${c.new}`).join('<br>')}
                    </div>` : ''}
                </div>
            `;
        });

        if (changes.modified.length > 5) {
            html += `<div class="mt-xs" style="color: rgba(255, 255, 255, 0.7);">... 외 ${changes.modified.length - 5}개</div>`;
        }

        html += `</div></div>`;
    }

    if (changes.removed && changes.removed.length > 0) {
        html += `
            <div>
                <h4 class="color-danger mb-md">
                    <i class="fas fa-minus-circle"></i> 삭제됨 (${changes.removed.length}개)
                </h4>
                <div class="d-grid gap-sm" style="margin-left: var(--spacing-lg);">
        `;

        changes.removed.slice(0, 10).forEach(item => {
            const company = item.employee || item.company;
            html += `
                <div class="bg-white-05 p-sm border-radius-sm" style="text-decoration: line-through;">
                    • ${company.finalCompanyName || company.erpCompanyName || company.name}
                </div>
            `;
        });

        if (changes.removed.length > 10) {
            html += `<div class="mt-xs" style="color: rgba(255, 255, 255, 0.7);">... 외 ${changes.removed.length - 10}개</div>`;
        }

        html += `</div></div>`;
    }

    return html;
}

// ============================================
// [SECTION: 변경사항 적용]
// ============================================

async function applyChanges(result) {
    try {
        showLoading('변경사항 적용 중...');
        
        // 새로운 데이터 저장
        await excelLoader.applyChanges(result.newEmployees || result.companies);
        
        hideLoading();
        
        // 모달 닫기
        document.getElementById('changes-modal').style.display = 'none';
        
        // 결과 표시
        await showUploadResult(result);
        
        // 상태 새로고침
        await loadCurrentStatus();
        await loadUploadHistory();
        
        // 파일 초기화
        selectedFile = null;
        currentData = null;
        document.getElementById('file-info').style.display = 'none';
        document.getElementById('upload-zone').style.display = 'block';
        document.getElementById('excel-file-input').value = '';
        
        // 미리보기 제거
        const previewDiv = document.getElementById('excel-preview');
        if (previewDiv) {
            previewDiv.style.display = 'none';
            previewDiv.innerHTML = '';
        }

    } catch (error) {
        hideLoading();
        logger.error('[변경사항 적용] 오류:', error);
        showToast('변경사항 적용 중 오류가 발생했습니다.', 'error');
    }
}

// ============================================
// [SECTION: 업로드 결과 표시]
// ============================================

async function showUploadResult(result) {
    const resultDiv = document.getElementById('upload-result');

    const summary = result.summary || {
        companies: {
            total: result.data?.companies?.length || 0
        }
    };

    let html = `
        <div class="glass-card p-xl bg-success-light border-left-success">
            <h3 class="color-success mb-md">
                <i class="fas fa-check-circle"></i> 업로드 완료!
            </h3>
            <div class="text-white text-lg" style="line-height: 1.8;">
                <p><strong>${formatNumber(summary.companies.total)}개</strong>의 거래처 데이터가 데이터베이스에 저장되었습니다.</p>
                ${result.validation && result.validation.warnings?.length > 0 ? `
                    <p class="color-warning mt-sm">
                        <i class="fas fa-exclamation-triangle"></i> ${result.validation.warnings.length}개의 경고가 있습니다.
                    </p>
                ` : ''}
                <p class="mt-md text-md" style="color: rgba(255, 255, 255, 0.8);">
                    모든 관리자와 영업담당이 이 데이터를 즉시 사용할 수 있습니다.
                </p>
            </div>
        </div>
    `;

    resultDiv.innerHTML = html;
    resultDiv.style.display = 'block';

    // 3초 후 페이드아웃
    setTimeout(() => {
        resultDiv.style.transition = 'opacity 1s ease';
        resultDiv.style.opacity = '0';
        setTimeout(() => {
            resultDiv.style.display = 'none';
            resultDiv.style.opacity = '1';
        }, 1000);
    }, 5000);

    showToast('데이터베이스 업로드 완료!', 'success');
}

// ============================================
// [SECTION: 검증 오류 표시]
// ============================================

function showValidationErrors(validation) {
    const resultDiv = document.getElementById('upload-result');

    let html = `
        <div class="glass-card p-xl bg-danger-light border-left-danger">
            <h3 class="color-danger mb-md">
                <i class="fas fa-exclamation-circle"></i> 데이터 검증 실패
            </h3>
            <div class="text-white">
                <p class="mb-md">
                    ${validation.errors.length}개의 오류가 발견되었습니다.
                </p>
                <div class="p-md border-radius-sm" style="max-height: 300px; overflow-y: auto; background: rgba(0, 0, 0, 0.3);">
    `;

    validation.errors.slice(0, 20).forEach((error, index) => {
        html += `<div class="mb-xs">${index + 1}. ${error}</div>`;
    });

    if (validation.errors.length > 20) {
        html += `<div class="mt-sm color-warning">... 외 ${validation.errors.length - 20}개 더</div>`;
    }

    html += `
                </div>
            </div>
        </div>
    `;

    resultDiv.innerHTML = html;
    resultDiv.style.display = 'block';
}

// ============================================
// [SECTION: 업로드 이력 로드]
// ============================================

async function loadUploadHistory() {
    try {
        const historyList = document.getElementById('history-list');

        // REST API에서는 변경 이력을 추적하지 않으므로 간단하게 처리
        // 추후 서버에서 이력 API가 제공되면 해당 엔드포인트 사용 가능

        historyList.innerHTML = `
            <div class="no-data text-center p-lg">
                <i class="fas fa-info-circle text-lg mb-sm" style="color: rgba(255, 255, 255, 0.5);"></i>
                <div style="color: rgba(255, 255, 255, 0.7);">
                    업로드 이력 기능은 준비 중입니다.
                </div>
            </div>
        `;

    } catch (error) {
        logger.error('[업로드 이력] 로드 실패:', error);
        document.getElementById('history-list').innerHTML = '<div class="no-data">이력을 불러올 수 없습니다.</div>';
    }
}

// ============================================
// [SECTION: 유틸리티 함수]
// ============================================

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// ============================================
// [SECTION: 페이지 로드 이벤트]
// ============================================

let isPageInitialized = false;

/**
 * 페이지 초기화 함수 (중복 실행 방지)
 */
function initializePageSafe() {
    if (isPageInitialized) {
        return;
    }

    const isExcelUploadPage = document.querySelector('.excel-upload-page');
    if (!isExcelUploadPage) {
        return;
    }

    isPageInitialized = true;
    initExcelUpload();
}

// pageLoaded 이벤트 리스너
window.addEventListener('pageLoaded', (e) => {
    if (e.detail && e.detail.page === 'excel-upload') {
        // 이벤트로 초기화되면 플래그 리셋
        isPageInitialized = false;
        setTimeout(() => initializePageSafe(), 100);
    }
});

// DOM이 이미 로드된 경우
if (document.readyState !== 'loading') {
    setTimeout(() => initializePageSafe(), 200);
} else {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => initializePageSafe(), 200);
    });
}

// ============================================
// [SECTION: 전역 노출]
// ============================================

window.excelUploadModule = {
    init: initExcelUpload,
    loadStatus: loadCurrentStatus,
    loadHistory: loadUploadHistory
};
