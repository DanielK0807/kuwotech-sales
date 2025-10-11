/**
 * ============================================
 * KUWOTECH 영업관리 시스템 - 전사 KPI 다운로드 모듈
 * ============================================
 * 
 * @파일명: 03_download_kpi.js
 * @작성자: System
 * @작성일: 2025-09-30
 * @버전: 1.0
 * 
 * @설명:
 * 관리자 대시보드의 전사 KPI 실적 데이터를 다운로드하는 모듈
 * 
 * @주요기능:
 * - 전사 KPI 다운로드
 * - 담당자별 상세 데이터 포함
 * - 월별 추이 분석
 * - 날짜 범위 선택
 * - 다운로드 옵션 모달 (관리자 테마)
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

/**
 * [함수: 다운로드 버튼 추가]
 * 관리자 대시보드 헤더에 다운로드 버튼을 동적으로 추가
 * 2025-10-05: 기능 비활성화 - 다운로드 버튼 및 옵션 버튼 삭제
 */
export function initDownloadButton() {
    // 기능 비활성화: 다운로드 버튼 및 옵션 버튼 삭제됨
    return;
}

// ============================================
// [섹션 3: 빠른 다운로드]
// ============================================

/**
 * [함수: 빠른 다운로드]
 * 옵션 선택 없이 즉시 다운로드 (이번 달 기준, 전체 시트)
 */
async function handleQuickDownload() {
    const userName = sessionStorage.getItem('userName');
    const userRole = sessionStorage.getItem('userRole');
    
    if (!userName || userRole !== 'admin') {
        showToast('관리자 권한이 필요합니다', 'error');
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
            downloadType: DOWNLOAD_TYPES.ADMIN_COMPANY_KPI,
            userRole: userRole,
            userName: userName,
            includeSheets: ['전사실적', '담당자별상세', '월별추이'],
            dateRange: dateRange,
            format: 'excel'
        });
        
    } catch (error) {
        console.error('[전사 KPI 다운로드] 실패:', error);
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
        <div class="download-options-container admin-modal">
            <h2 class="modal-title">
                <i class="icon">📊</i> 전사 KPI 다운로드 옵션
            </h2>
            
            <!-- 날짜 범위 선택 -->
            <div class="option-group admin-card">
                <h3>📅 기간 선택</h3>
                <div class="date-range-selector">
                    <div class="date-input-group">
                        <label for="start-date">시작일</label>
                        <input type="date" id="start-date" class="glass-input admin-input" 
                               value="${currentYear}-${currentMonth}-01">
                    </div>
                    <div class="date-input-group">
                        <label for="end-date">종료일</label>
                        <input type="date" id="end-date" class="glass-input admin-input" 
                               value="${currentYear}-${currentMonth}-${new Date(currentYear, now.getMonth() + 1, 0).getDate()}">
                    </div>
                </div>
                
                <!-- 빠른 선택 버튼 -->
                <div class="quick-select-buttons">
                    <button class="glass-button small admin-primary" data-period="this-month">이번 달</button>
                    <button class="glass-button small admin-primary" data-period="last-month">지난 달</button>
                    <button class="glass-button small admin-primary" data-period="this-quarter">이번 분기</button>
                    <button class="glass-button small admin-primary" data-period="this-year">올해</button>
                </div>
            </div>
            
            <!-- 포함 시트 선택 -->
            <div class="option-group admin-card">
                <h3>📋 포함 데이터</h3>
                <div class="sheet-selection">
                    <label class="checkbox-label">
                        <input type="checkbox" id="include-company-kpi" checked disabled>
                        <span class="checkbox-text">
                            <strong>전사실적</strong>
                            <small>전체 영업팀 KPI 요약</small>
                        </span>
                    </label>
                    <label class="checkbox-label">
                        <input type="checkbox" id="include-detail" checked>
                        <span class="checkbox-text">
                            <strong>담당자별 상세</strong>
                            <small>영업담당자별 실적 내역</small>
                        </span>
                    </label>
                    <label class="checkbox-label">
                        <input type="checkbox" id="include-trends" checked>
                        <span class="checkbox-text">
                            <strong>월별 추이</strong>
                            <small>매출/수금 월별 트렌드 분석</small>
                        </span>
                    </label>
                    <label class="checkbox-label">
                        <input type="checkbox" id="include-top-companies">
                        <span class="checkbox-text">
                            <strong>Top 거래처</strong>
                            <small>매출 상위 거래처 순위</small>
                        </span>
                    </label>
                </div>
            </div>
            
            <!-- 정렬 옵션 -->
            <div class="option-group admin-card">
                <h3>🔢 정렬 기준</h3>
                <div class="sort-selection">
                    <select id="sort-by" class="glass-input admin-input">
                        <option value="sales">매출액 순</option>
                        <option value="achievement">달성률 순</option>
                        <option value="companies">담당거래처 순</option>
                        <option value="name">이름 순</option>
                    </select>
                </div>
            </div>
            
            <!-- 파일명 설정 -->
            <div class="option-group admin-card">
                <h3>💾 파일명</h3>
                <div class="filename-input-group">
                    <input type="text" id="filename" class="glass-input admin-input" 
                           placeholder="전사실적_${currentYear}-${currentMonth}"
                           value="전사실적_${currentYear}-${currentMonth}">
                    <span class="file-extension">.xlsx</span>
                </div>
            </div>
            
            <!-- 추가 옵션 -->
            <div class="option-group admin-card">
                <h3>⚙️ 추가 옵션</h3>
                <div class="additional-options">
                    <label class="checkbox-label">
                        <input type="checkbox" id="include-charts">
                        <span class="checkbox-text">
                            <strong>차트 포함</strong>
                            <small>Excel 차트 자동 생성 (실험적 기능)</small>
                        </span>
                    </label>
                    <label class="checkbox-label">
                        <input type="checkbox" id="include-summary">
                        <span class="checkbox-text">
                            <strong>요약 시트</strong>
                            <small>주요 지표 요약 시트 추가</small>
                        </span>
                    </label>
                </div>
            </div>
            
            <!-- 액션 버튼 -->
            <div class="modal-actions">
                <button class="glass-button admin-secondary" id="btn-cancel">
                    <i class="icon">❌</i>
                    <span>취소</span>
                </button>
                <button class="glass-button admin-accent" id="btn-download">
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
            setQuickPeriod(period);
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
 * [함수: 빠른 기간 설정]
 */
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
    }
    
    startInput.value = formatDate(start);
    endInput.value = formatDate(end);
    
    showToast(`${getPeriodName(period)}로 설정되었습니다`, 'info');
}

/**
 * [함수: 기간명 가져오기]
 */
function getPeriodName(period) {
    const names = {
        'this-month': '이번 달',
        'last-month': '지난 달',
        'this-quarter': '이번 분기',
        'this-year': '올해'
    };
    return names[period] || period;
}

/**
 * [함수: 커스텀 다운로드 실행]
 */
async function handleCustomDownload(modal) {
    const userName = sessionStorage.getItem('userName');
    const userRole = sessionStorage.getItem('userRole');
    
    if (userRole !== 'admin') {
        showToast('관리자 권한이 필요합니다', 'error');
        return;
    }
    
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
    const includeSheets = ['전사실적'];
    if (document.getElementById('include-detail').checked) {
        includeSheets.push('담당자별상세');
    }
    if (document.getElementById('include-trends').checked) {
        includeSheets.push('월별추이');
    }
    if (document.getElementById('include-top-companies').checked) {
        includeSheets.push('Top거래처');
    }
    
    // 추가 옵션
    const includeCharts = document.getElementById('include-charts').checked;
    const includeSummary = document.getElementById('include-summary').checked;
    
    if (includeSummary) {
        includeSheets.push('요약');
    }
    
    // 정렬 기준
    const sortBy = document.getElementById('sort-by').value;
    
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
            downloadType: DOWNLOAD_TYPES.ADMIN_COMPANY_KPI,
            userRole: userRole,
            userName: userName,
            includeSheets: includeSheets,
            dateRange: dateRange,
            sortBy: sortBy,
            includeCharts: includeCharts,
            format: 'excel'
        });
        
    } catch (error) {
        console.error('[전사 KPI 다운로드] 실패:', error);
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
