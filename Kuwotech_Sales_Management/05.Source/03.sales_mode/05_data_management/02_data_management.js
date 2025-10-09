/* ============================================
   데이터 관리 페이지
   파일: 03.sales_mode/05_data_management/02_data_management.js
   작성일: 2025-01-27
   설명: 영업담당자 데이터 다운로드 및 백업 관리
============================================ */

// 모듈 import
import { formatCurrency, formatDate, formatDateKorean } from '../../01.common/03_format.js';
import { showToast } from '../../01.common/06_toast.js';
import { Clock } from '../../01.common/04_clock.js';
import { themeManager } from '../../01.common/12_theme_manager.js';
import { CRUDManager } from '../../06.database/03_crud.js';
import { ExcelSync } from '../../06.database/05_excel_sync.js';
import { downloadCompanies, downloadReports, downloadKPI, createBackup, initDownloadButton } from './03_integrated_download.js';

// [전역 변수]
let crudManager = null;
let excelSync = null;
let downloadHistory = [];

// [초기화]
async function init() {
    console.log('[데이터 관리] 초기화 시작');
    
    // 테마 설정
    themeManager.applyTheme('sales');
    
    // 시계 초기화
    new Clock('currentTime');
    
    // 사용자 정보 표시
    displayUserInfo();
    
    // 데이터베이스 연결
    await initDatabase();
    
    // 통계 정보 로드
    await loadStatistics();
    
    // 다운로드 이력 로드
    loadDownloadHistory();
    
    console.log('[데이터 관리] 초기화 완료');
}

// [데이터베이스 초기화]
async function initDatabase() {
    try {
        crudManager = new CRUDManager('KuwotechSalesDB', 3);
        await crudManager.openDB();
        excelSync = new ExcelSync(crudManager);
        console.log('[DB] 연결 성공');
    } catch (error) {
        console.error('[DB] 연결 실패:', error);
        showToast('데이터베이스 연결 실패', 'error');
    }
}

// [사용자 정보 표시]
function displayUserInfo() {
    const userInfo = document.getElementById('userInfo');
    const userName = sessionStorage.getItem('userName') || '영업담당자';
    const userRole = sessionStorage.getItem('userRole') || 'sales';
    
    userInfo.textContent = `${userName} (${userRole === 'sales' ? '영업담당' : '관리자'})`;
}

// [통계 정보 로드]
async function loadStatistics() {
    try {
        const currentUser = sessionStorage.getItem('userName');
        
        // 거래처 통계
        const companies = await crudManager.getAll('companies');
        const myCompanies = companies.filter(c => 
            c.internalManager === currentUser && c.businessStatus !== '불용'
        );
        document.getElementById('companyCount').textContent = `${myCompanies.length}개`;
        document.getElementById('companyUpdate').textContent = formatDateKorean(new Date());
        
        // 보고서 통계
        const reports = await crudManager.getAll('reports');
        const myReports = reports.filter(r => r.submittedBy === currentUser);
        document.getElementById('reportCount').textContent = `${myReports.length}개`;
        
        // KPI 날짜
        document.getElementById('kpiDate').textContent = formatDateKorean(new Date());
        
    } catch (error) {
        console.error('[통계] 로드 실패:', error);
        // 기본값 설정
        document.getElementById('companyCount').textContent = '0개';
        document.getElementById('reportCount').textContent = '0개';
    }
}

// [다운로드 이력 로드]
function loadDownloadHistory() {
    // localStorage에서 이력 로드
    const savedHistory = localStorage.getItem('downloadHistory');
    if (savedHistory) {
        downloadHistory = JSON.parse(savedHistory);
    }
    
    renderHistoryTable();
}

// [다운로드 이력 저장]
function saveDownloadHistory() {
    // 최대 20개 이력 유지
    if (downloadHistory.length > 20) {
        downloadHistory = downloadHistory.slice(0, 20);
    }
    localStorage.setItem('downloadHistory', JSON.stringify(downloadHistory));
}

// [다운로드 이력 테이블 렌더링]
function renderHistoryTable() {
    const tbody = document.getElementById('historyTableBody');
    tbody.innerHTML = '';
    
    if (downloadHistory.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 30px; color: var(--text-secondary);">
                    다운로드 이력이 없습니다.
                </td>
            </tr>
        `;
        return;
    }
    
    downloadHistory.forEach(history => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${formatDateKorean(history.date)} ${new Date(history.date).toLocaleTimeString('ko-KR')}</td>
            <td>${history.filename}</td>
            <td>${history.type}</td>
            <td>${formatFileSize(history.size)}</td>
            <td><span class="glass-badge success">완료</span></td>
        `;
    });
}

// [파일 크기 포맷팅]
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// [내 거래처 다운로드] - 통합 다운로드 매니저 사용
// window.downloadCompanies = async function() {
    try {
        showToast('거래처 데이터 다운로드를 준비중입니다...', 'info');
        
        const currentUser = sessionStorage.getItem('userName');
        const companies = await crudManager.getAll('companies');
        const myCompanies = companies.filter(c => 
            c.internalManager === currentUser && c.businessStatus !== '불용'
        );
        
        if (myCompanies.length === 0) {
            showToast('다운로드할 거래처가 없습니다', 'warning');
            return;
        }
        
        // SheetJS 사용하여 엑셀 생성
        const ws = XLSX.utils.json_to_sheet(myCompanies.map(c => ({
            'KEY VALUE': c.keyValue,
            '거래처명(ERP)': c.companyNameERP,
            '최종거래처명': c.finalCompanyName,
            '폐업여부': c.isClosed,
            '대표자': c.ceoOrDentist,
            '지역': c.customerRegion,
            '거래상태': c.businessStatus,
            '담당부서': c.department,
            '판매제품': c.salesProduct,
            '내부담당자': c.internalManager,
            '누적매출금액': c.accumulatedSales,
            '누적수금금액': c.accumulatedCollection,
            '매출채권잔액': c.accountsReceivable,
            '마지막결제일': c.lastPaymentDate,
            '영업활동': c.businessActivity
        })));
        
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '담당거래처');
        
        // 파일 다운로드
        const filename = `담당거래처_${currentUser}_${formatDate(new Date())}.xlsx`;
        XLSX.writeFile(wb, filename);
        
        // 이력 추가
        downloadHistory.unshift({
            date: new Date().toISOString(),
            filename: filename,
            type: '거래처',
            size: myCompanies.length * 500 // 예상 크기
        });
        saveDownloadHistory();
        renderHistoryTable();
        
        showToast(`${myCompanies.length}개 거래처 다운로드 완료`, 'success');
        
    } catch (error) {
        console.error('[거래처 다운로드] 실패:', error);
        showToast('다운로드 중 오류가 발생했습니다', 'error');
    }
// };

// [보고서 다운로드] - 통합 다운로드 매니저 사용
// window.downloadReports = async function() {
    try {
        showToast('보고서 다운로드를 준비중입니다...', 'info');
        
        const currentUser = sessionStorage.getItem('userName');
        const period = document.getElementById('reportPeriod').value;
        const reports = await crudManager.getAll('reports');
        
        // 본인 보고서 필터링
        let myReports = reports.filter(r => r.submittedBy === currentUser);
        
        // 기간 필터링
        if (period !== 'all') {
            const monthsAgo = new Date();
            monthsAgo.setMonth(monthsAgo.getMonth() - parseInt(period));
            myReports = myReports.filter(r => new Date(r.submittedDate) >= monthsAgo);
        }
        
        if (myReports.length === 0) {
            showToast('다운로드할 보고서가 없습니다', 'warning');
            return;
        }
        
        // 엑셀 생성
        const ws = XLSX.utils.json_to_sheet(myReports.map(r => ({
            '보고서ID': r.reportId,
            '작성일': formatDate(r.submittedDate),
            '보고서유형': r.reportType,
            '거래처': r.companyName,
            '목표수금': r.targetCollectionAmount,
            '목표매출': r.targetSalesAmount,
            '판매제품': r.soldProducts,
            '활동내역': r.activityNotes,
            '상태': r.status === 'pending' ? '대기' : r.status === 'approved' ? '승인' : '반려',
            '처리자': r.processedBy || '',
            '처리일': r.processedDate ? formatDate(r.processedDate) : '',
            '코멘트': r.adminComment || ''
        })));
        
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '실적보고서');
        
        // 파일 다운로드
        const filename = `실적보고서_${currentUser}_${formatDate(new Date())}.xlsx`;
        XLSX.writeFile(wb, filename);
        
        // 이력 추가
        downloadHistory.unshift({
            date: new Date().toISOString(),
            filename: filename,
            type: '보고서',
            size: myReports.length * 300
        });
        saveDownloadHistory();
        renderHistoryTable();
        
        showToast(`${myReports.length}개 보고서 다운로드 완료`, 'success');
        
    } catch (error) {
        console.error('[보고서 다운로드] 실패:', error);
        showToast('다운로드 중 오류가 발생했습니다', 'error');
    }
// };

// [KPI 다운로드] - 통합 다운로드 매니저 사용
// window.downloadKPI = async function() {
    try {
        showToast('KPI 데이터 다운로드를 준비중입니다...', 'info');
        
        const currentUser = sessionStorage.getItem('userName');
        
        // KPI 계산 (실제 로직은 07.kpi 모듈 사용)
        const kpiData = {
            '담당자': currentUser,
            '계산일': formatDateKorean(new Date()),
            '담당거래처': 85,
            '활성거래처': 72,
            '활성화율': '84.7%',
            '주요제품판매거래처': 45,
            '회사배정기준달성율': '106.25%',
            '주요고객처목표달성율': '112.5%',
            '누적매출금액': 1234567890,
            '주요제품매출액': 987654321,
            '주요제품매출비율': '80%',
            '매출집중도': 14526855,
            '누적수금금액': 1100000000,
            '매출채권잔액': 134567890,
            '전체매출기여도': '15.3%',
            '주요매출기여도': '18.7%'
        };
        
        // 엑셀 생성
        const ws = XLSX.utils.json_to_sheet([kpiData]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'KPI현황');
        
        // 파일 다운로드
        const filename = `KPI현황_${currentUser}_${formatDate(new Date())}.xlsx`;
        XLSX.writeFile(wb, filename);
        
        // 이력 추가
        downloadHistory.unshift({
            date: new Date().toISOString(),
            filename: filename,
            type: 'KPI',
            size: 5000
        });
        saveDownloadHistory();
        renderHistoryTable();
        
        showToast('KPI 다운로드 완료', 'success');
        
    } catch (error) {
        console.error('[KPI 다운로드] 실패:', error);
        showToast('다운로드 중 오류가 발생했습니다', 'error');
    }
// };

// [전체 백업 생성] - 통합 다운로드 매니저 사용
// window.createBackup = async function() {
    try {
        if (!confirm('전체 데이터 백업을 생성하시겠습니까?')) return;
        
        showToast('백업 생성중... 잠시만 기다려주세요', 'info');
        
        const currentUser = sessionStorage.getItem('userName');
        
        // 모든 데이터 수집
        const companies = await crudManager.getAll('companies');
        const myCompanies = companies.filter(c => c.internalManager === currentUser);
        
        const reports = await crudManager.getAll('reports');
        const myReports = reports.filter(r => r.submittedBy === currentUser);
        
        // 워크북 생성
        const wb = XLSX.utils.book_new();
        
        // 거래처 시트
        const wsCompanies = XLSX.utils.json_to_sheet(myCompanies);
        XLSX.utils.book_append_sheet(wb, wsCompanies, '거래처');
        
        // 보고서 시트
        const wsReports = XLSX.utils.json_to_sheet(myReports);
        XLSX.utils.book_append_sheet(wb, wsReports, '보고서');
        
        // 파일 다운로드
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `전체백업_${currentUser}_${timestamp}.xlsx`;
        XLSX.writeFile(wb, filename);
        
        // 백업 정보 업데이트
        document.getElementById('lastBackup').textContent = formatDateKorean(new Date());
        const backupSize = (myCompanies.length * 500 + myReports.length * 300);
        document.getElementById('backupSize').textContent = formatFileSize(backupSize);
        
        // 이력 추가
        downloadHistory.unshift({
            date: new Date().toISOString(),
            filename: filename,
            type: '전체백업',
            size: backupSize
        });
        saveDownloadHistory();
        renderHistoryTable();
        
        showToast('전체 백업이 완료되었습니다', 'success');
        
    } catch (error) {
        console.error('[백업 생성] 실패:', error);
        showToast('백업 생성 중 오류가 발생했습니다', 'error');
    }
// };

// [SheetJS 라이브러리 로드]
function loadSheetJS() {
    if (!window.XLSX) {
        const script = document.createElement('script');
        script.src = 'https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js';
        document.head.appendChild(script);
    }
}

// SheetJS 로드
loadSheetJS();

// [통합 다운로드 매니저 함수 등록]
window.downloadCompanies = downloadCompanies;
window.downloadReports = downloadReports;
window.downloadKPI = downloadKPI;
window.createBackup = createBackup;

// [DOM 로드 완료 시 초기화]
document.addEventListener('DOMContentLoaded', init);