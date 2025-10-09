/**
 * ============================================
 * KUWOTECH 영업관리 시스템 - 보고서 확인 다운로드 모듈
 * ============================================
 * 
 * @파일명: 03_download.js
 * @작성자: System
 * @작성일: 2025-09-30
 * @버전: 1.0
 * 
 * @설명:
 * 영업담당이 작성한 방문보고서 이력을 다운로드하는 모듈
 * (report_write와 동일한 기능)
 */

// ============================================
// [섹션 1: Import]
// ============================================

import downloadManager, { DOWNLOAD_TYPES } from '../../06.database/12_download_manager.js';
import { showToast } from '../../01.common/14_toast.js';
import Modal from '../../01.common/06_modal.js';
import { formatDate } from '../../01.common/03_format.js';

// ============================================
// [섹션 2: 다운로드 버튼 초기화]
// ============================================

export function initDownloadButton() {
    // reports-header 찾기
    const reportsHeader = document.querySelector('.reports-header');
    
    if (!reportsHeader) {
        console.warn('[보고서 다운로드] .reports-header를 찾을 수 없습니다');
        return;
    }
    
    // 버튼 컨테이너 찾기 또는 생성
    let btnContainer = reportsHeader.querySelector('.header-actions');
    if (!btnContainer) {
        btnContainer = document.createElement('div');
        btnContainer.className = 'header-actions';
        reportsHeader.appendChild(btnContainer);
    }
    
    // 다운로드 버튼
    const downloadBtn = document.createElement('button');
    downloadBtn.id = 'btn-download-reports';
    downloadBtn.className = 'glass-button primary';
    downloadBtn.innerHTML = `
        <svg class="icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        <span>보고서 다운로드</span>
    `;
    
    // 옵션 버튼
    const optionBtn = document.createElement('button');
    optionBtn.id = 'btn-download-options';
    optionBtn.className = 'glass-button';
    optionBtn.innerHTML = `
        <svg class="icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="1"/>
            <circle cx="12" cy="5" r="1"/>
            <circle cx="12" cy="19" r="1"/>
        </svg>
    `;
    optionBtn.title = '다운로드 옵션';
    
    btnContainer.appendChild(downloadBtn);
    btnContainer.appendChild(optionBtn);
    
    // 이벤트 리스너
    downloadBtn.addEventListener('click', handleQuickDownload);
    optionBtn.addEventListener('click', showDownloadOptionsModal);
    
    console.log('[보고서 확인 다운로드] 버튼 초기화 완료');
}

// ============================================
// [섹션 3: 빠른 다운로드]
// ============================================

async function handleQuickDownload() {
    const userName = sessionStorage.getItem('userName');
    const userRole = sessionStorage.getItem('userRole');
    
    if (!userName || !userRole) {
        showToast('로그인 정보를 확인할 수 없습니다', 'error');
        return;
    }
    
    // 올해 전체 보고서
    const year = new Date().getFullYear();
    const dateRange = {
        start: `${year}-01-01`,
        end: `${year}-12-31`
    };
    
    try {
        await downloadManager.download({
            downloadType: DOWNLOAD_TYPES.SALES_REPORTS,
            userRole: userRole,
            userName: userName,
            dateRange: dateRange,
            format: 'excel'
        });
        
    } catch (error) {
        console.error('[보고서 다운로드] 실패:', error);
        showToast('다운로드 중 오류가 발생했습니다', 'error');
    }
}

// ============================================
// [섹션 4: 다운로드 옵션 모달]
// ============================================

async function showDownloadOptionsModal() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    
    const modalContent = `
        <div class="download-options-container">
            <h2 class="modal-title">
                <i class="icon">📥</i> 내 보고서 다운로드
            </h2>
            
            <!-- 기간 선택 -->
            <div class="option-group glass-card">
                <h3>📅 기간 선택</h3>
                <div class="date-range-selector">
                    <div class="date-input-group">
                        <label for="start-date">시작일</label>
                        <input type="date" id="start-date" class="glass-input" 
                               value="${currentYear}-${currentMonth}-01">
                    </div>
                    <div class="date-input-group">
                        <label for="end-date">종료일</label>
                        <input type="date" id="end-date" class="glass-input" 
                               value="${formatDate(now)}">
                    </div>
                </div>
                
                <!-- 빠른 선택 -->
                <div class="quick-select-buttons">
                    <button class="glass-button small" data-period="this-month">이번 달</button>
                    <button class="glass-button small" data-period="last-month">지난 달</button>
                    <button class="glass-button small" data-period="this-quarter">이번 분기</button>
                    <button class="glass-button small" data-period="this-year">올해</button>
                    <button class="glass-button small" data-period="last-year">작년</button>
                </div>
            </div>
            
            <!-- 정렬 옵션 -->
            <div class="option-group glass-card">
                <h3>📋 정렬 기준</h3>
                <div class="sort-selection">
                    <select id="sort-by" class="glass-input">
                        <option value="date-desc">방문일자 (최신순)</option>
                        <option value="date-asc">방문일자 (오래된순)</option>
                        <option value="company">거래처명 (가나다순)</option>
                        <option value="sales-desc">매출액 (높은순)</option>
                    </select>
                </div>
            </div>
            
            <!-- 파일명 -->
            <div class="option-group glass-card">
                <h3>💾 파일명</h3>
                <div class="filename-input-group">
                    <input type="text" id="filename" class="glass-input" 
                           value="내보고서_${sessionStorage.getItem('userName')}_${currentYear}">
                    <span class="file-extension">.xlsx</span>
                </div>
            </div>
            
            <!-- 액션 버튼 -->
            <div class="modal-actions">
                <button class="glass-button" id="btn-cancel">
                    <i class="icon">❌</i>
                    <span>취소</span>
                </button>
                <button class="glass-button primary" id="btn-download">
                    <i class="icon">⬇️</i>
                    <span>다운로드</span>
                </button>
            </div>
        </div>
    `;
    
    const modal = new Modal({
        size: 'md',
        content: modalContent,
        showClose: true
    });
    
    modal.open();
    
    // 이벤트 리스너
    setupModalEventListeners(modal);
}

// ============================================
// [섹션 5: 모달 이벤트 리스너]
// ============================================

function setupModalEventListeners(modal) {
    // 빠른 선택 버튼
    const quickButtons = document.querySelectorAll('.quick-select-buttons button');
    quickButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const period = e.currentTarget.dataset.period;
            setQuickPeriod(period);
        });
    });
    
    // 취소
    document.getElementById('btn-cancel').addEventListener('click', () => {
        modal.close();
    });
    
    // 다운로드
    document.getElementById('btn-download').addEventListener('click', () => {
        handleCustomDownload(modal);
    });
}

// ============================================
// [섹션 6: 빠른 기간 설정]
// ============================================

function setQuickPeriod(period) {
    const now = new Date();
    const startInput = document.getElementById('start-date');
    const endInput = document.getElementById('end-date');
    
    let start, end;
    
    switch (period) {
        case 'this-month':
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            break;
            
        case 'last-month':
            start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            end = new Date(now.getFullYear(), now.getMonth(), 0);
            break;
            
        case 'this-quarter':
            const quarter = Math.floor(now.getMonth() / 3);
            start = new Date(now.getFullYear(), quarter * 3, 1);
            end = new Date(now.getFullYear(), quarter * 3 + 3, 0);
            break;
            
        case 'this-year':
            start = new Date(now.getFullYear(), 0, 1);
            end = new Date(now.getFullYear(), 11, 31);
            break;
            
        case 'last-year':
            start = new Date(now.getFullYear() - 1, 0, 1);
            end = new Date(now.getFullYear() - 1, 11, 31);
            break;
    }
    
    startInput.value = formatDate(start);
    endInput.value = formatDate(end);
    
    showToast(`기간이 설정되었습니다`, 'info');
}

// ============================================
// [섹션 7: 커스텀 다운로드]
// ============================================

async function handleCustomDownload(modal) {
    const userName = sessionStorage.getItem('userName');
    const userRole = sessionStorage.getItem('userRole');
    
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    
    if (!startDate || !endDate) {
        showToast('날짜 범위를 선택해주세요', 'warning');
        return;
    }
    
    if (new Date(startDate) > new Date(endDate)) {
        showToast('시작일이 종료일보다 늦습니다', 'error');
        return;
    }
    
    const dateRange = {
        start: startDate,
        end: endDate
    };
    
    const options = {
        sortBy: document.getElementById('sort-by').value
    };
    
    modal.close();
    
    try {
        await downloadManager.download({
            downloadType: DOWNLOAD_TYPES.SALES_REPORTS,
            userRole: userRole,
            userName: userName,
            dateRange: dateRange,
            options: options,
            format: 'excel'
        });
        
    } catch (error) {
        console.error('[보고서 다운로드] 실패:', error);
        showToast('다운로드 중 오류가 발생했습니다', 'error');
    }
}

// ============================================
// [섹션 8: Export]
// ============================================

export default {
    initDownloadButton,
    handleQuickDownload,
    showDownloadOptionsModal
};
