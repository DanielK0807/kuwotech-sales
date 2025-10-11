/**
 * ============================================
 * KUWOTECH 영업관리 시스템 - KPI 다운로드 모듈
 * ============================================
 * 
 * @파일명: 03_download_kpi.js
 * @작성자: System
 * @작성일: 2025-09-30
 * @버전: 1.0
 * 
 * @설명:
 * 영업담당 대시보드의 KPI 실적 데이터를 다운로드하는 모듈
 * 
 * @주요기능:
 * - 개인 KPI 다운로드
 * - 거래처별 상세 데이터 포함
 * - 날짜 범위 선택
 * - 다운로드 옵션 모달
 */

// ============================================
// [섹션 1: Import]
// ============================================

import downloadManager, { DOWNLOAD_TYPES } from '../../06.database/12_download_manager.js';
import { showToast } from '../../01.common/14_toast.js';
import Modal from '../../01.common/06_modal.js';
import { formatDate } from '../../01.common/03_format.js';
import { setQuickPeriod } from '../../01.common/02_utils.js';
import logger from '../../01.common/23_logger.js';

// ============================================
// [섹션 2: 다운로드 버튼 초기화]
// ============================================

/**
 * [함수: 다운로드 버튼 추가]
 * 대시보드 헤더에 다운로드 버튼을 동적으로 추가
 */
export function initDownloadButton() {
    const pageHeader = document.querySelector('.page-header');
    
    if (!pageHeader) {
        logger.warn('[KPI 다운로드] 페이지 헤더를 찾을 수 없습니다');
        return;
    }
    
    // 다운로드 버튼 컨테이너 생성
    const btnContainer = document.createElement('div');
    btnContainer.className = 'header-actions';
    btnContainer.style.cssText = `
        position: absolute;
        top: 20px;
        right: 30px;
        display: flex;
        gap: 10px;
    `;
    
    // KPI 다운로드 버튼
    const downloadBtn = document.createElement('button');
    downloadBtn.id = 'btn-download-kpi';
    downloadBtn.className = 'glass-button primary';
    downloadBtn.innerHTML = `
        <svg class="icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        <span>실적 다운로드</span>
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
    pageHeader.appendChild(btnContainer);
    
    // 이벤트 리스너 등록
    downloadBtn.addEventListener('click', handleQuickDownload);
    optionBtn.addEventListener('click', showDownloadOptionsModal);
    
}

// ============================================
// [섹션 3: 빠른 다운로드]
// ============================================

/**
 * [함수: 빠른 다운로드]
 * 옵션 선택 없이 즉시 다운로드 (이번 달 기준)
 */
async function handleQuickDownload() {
    const userName = sessionStorage.getItem('userName');
    const userRole = sessionStorage.getItem('userRole');
    
    if (!userName || !userRole) {
        showToast('로그인 정보를 확인할 수 없습니다', 'error');
        return;
    }
    
    // 이번 달 날짜 범위 계산
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
    
    const dateRange = {
        start: `${year}-${month}-01`,
        end: `${year}-${month}-${lastDay}`
    };
    
    try {
        await downloadManager.download({
            downloadType: DOWNLOAD_TYPES.SALES_KPI,
            userRole: userRole,
            userName: userName,
            includeSheets: ['영업실적', '거래처별상세'],
            dateRange: dateRange,
            format: 'excel'
        });
        
    } catch (error) {
        logger.error('[KPI 다운로드] 실패:', error);
        showToast('다운로드 중 오류가 발생했습니다', 'error');
    }
}

// ============================================
// [섹션 4: 다운로드 옵션 모달]
// ============================================

/**
 * [함수: 다운로드 옵션 모달 표시]
 */
async function showDownloadOptionsModal() {
    // 현재 날짜
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    
    const modalContent = `
        <div class="download-options-container">
            <h2 class="modal-title">
                <i class="icon">📥</i> KPI 다운로드 옵션
            </h2>
            
            <!-- 날짜 범위 선택 -->
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
                               value="${currentYear}-${currentMonth}-${new Date(currentYear, now.getMonth() + 1, 0).getDate()}">
                    </div>
                </div>
                
                <!-- 빠른 선택 버튼 -->
                <div class="quick-select-buttons">
                    <button class="glass-button small" data-period="this-month">이번 달</button>
                    <button class="glass-button small" data-period="last-month">지난 달</button>
                    <button class="glass-button small" data-period="this-quarter">이번 분기</button>
                    <button class="glass-button small" data-period="this-year">올해</button>
                </div>
            </div>
            
            <!-- 포함 시트 선택 -->
            <div class="option-group glass-card">
                <h3>📊 포함 데이터</h3>
                <div class="sheet-selection">
                    <label class="checkbox-label">
                        <input type="checkbox" id="include-kpi" checked disabled>
                        <span class="checkbox-text">
                            <strong>영업실적</strong>
                            <small>개인 KPI 요약</small>
                        </span>
                    </label>
                    <label class="checkbox-label">
                        <input type="checkbox" id="include-detail" checked>
                        <span class="checkbox-text">
                            <strong>거래처별 상세</strong>
                            <small>거래처별 매출/수금 내역</small>
                        </span>
                    </label>
                </div>
            </div>
            
            <!-- 파일명 설정 -->
            <div class="option-group glass-card">
                <h3>💾 파일명</h3>
                <div class="filename-input-group">
                    <input type="text" id="filename" class="glass-input" 
                           placeholder="영업실적_${sessionStorage.getItem('userName')}_${currentYear}-${currentMonth}"
                           value="영업실적_${sessionStorage.getItem('userName')}_${currentYear}-${currentMonth}">
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
    
    // 이벤트 리스너 설정
    setupModalEventListeners(modal);
}

/**
 * [함수: 모달 이벤트 리스너 설정]
 */
function setupModalEventListeners(modal) {
    // 빠른 선택 버튼
    const quickButtons = document.querySelectorAll('.quick-select-buttons button');
    quickButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const period = e.currentTarget.dataset.period;
            setQuickPeriod(period, 'start-date', 'end-date');
            showToast('기간이 설정되었습니다', 'info');
        });
    });

    // 취소 버튼
    document.getElementById('btn-cancel').addEventListener('click', () => {
        modal.close();
    });

    // 다운로드 버튼
    document.getElementById('btn-download').addEventListener('click', () => {
        handleCustomDownload(modal);
    });
}

/**
 * [함수: 커스텀 다운로드 실행]
 */
async function handleCustomDownload(modal) {
    const userName = sessionStorage.getItem('userName');
    const userRole = sessionStorage.getItem('userRole');
    
    // 날짜 범위
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
    
    // 포함 시트
    const includeSheets = ['영업실적'];
    if (document.getElementById('include-detail').checked) {
        includeSheets.push('거래처별상세');
    }
    
    // 날짜 범위
    const dateRange = {
        start: startDate,
        end: endDate
    };
    
    // 모달 닫기
    modal.close();
    
    // 다운로드 실행
    try {
        await downloadManager.download({
            downloadType: DOWNLOAD_TYPES.SALES_KPI,
            userRole: userRole,
            userName: userName,
            includeSheets: includeSheets,
            dateRange: dateRange,
            format: 'excel'
        });
        
    } catch (error) {
        logger.error('[KPI 다운로드] 실패:', error);
        showToast('다운로드 중 오류가 발생했습니다', 'error');
    }
}

// ============================================
// [섹션 5: Export]
// ============================================

export default {
    initDownloadButton,
    handleQuickDownload,
    showDownloadOptionsModal
};
