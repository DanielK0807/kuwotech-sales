/**
 * ============================================
 * 관리자모드 - 실적보고서 확인 (Admin Report Confirmation)
 * ============================================
 * Railway 데이터베이스 연동 - 실제 데이터 사용
 *
 * 기능:
 * 1. 금주 실적보고서 제출현황 표시
 * 2. 보고서 상태별 필터링 (미실행/일부완료/완료)
 * 3. 금주 보고서 우선 표시
 * 4. 보고서 상세 보기
 * 5. 관리자 의견 작성 및 저장
 */

import ApiManager from '../../01.common/13_api_manager.js';
import { USER_ROLES, STATUS_MAP, REPORT_TYPE_MAP } from '../../01.common/05_constants.js';

// ============================================
// 전역 변수 및 상수
// ============================================
const apiManager = new ApiManager();

let allReports = [];           // 전체 보고서 데이터
let allEmployees = [];         // 전체 직원 데이터
let currentFilter = 'partial'; // 현재 선택된 필터 (기본: 일부완료)
let selectedReportId = null;   // 현재 선택된 보고서 ID

// ============================================
// 유틸리티 함수
// ============================================

/**
 * 금주의 시작일과 종료일을 반환
 */
function getCurrentWeekRange() {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // 월요일 기준

    const monday = new Date(now.setDate(diff));
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    return { start: monday, end: sunday };
}

/**
 * 날짜가 금주 범위 내에 있는지 확인
 */
function isThisWeek(dateString) {
    if (!dateString) return false;

    const date = new Date(dateString);
    const { start, end } = getCurrentWeekRange();

    return date >= start && date <= end;
}

/**
 * 보고서 상태 계산 (실제 로직)
 */
function calculateReportStatus(report) {
    // PRIORITY: Check DB status first
    // "임시저장" = temporary save = not submitted = incomplete
    if (report.status === '임시저장') {
        return 'incomplete';
    }

    // Only calculate from field values if report was submitted
    const hasCollection = report.targetCollectionAmount && report.targetCollectionAmount > 0;
    const hasSales = report.targetSalesAmount && report.targetSalesAmount > 0;
    const hasProducts = report.targetProducts && report.targetProducts.trim().length > 0;

    const completedCount = [hasCollection, hasSales, hasProducts].filter(Boolean).length;

    if (completedCount === 0) return 'incomplete';
    if (completedCount === 3) return 'complete';
    return 'partial';
}

/**
 * 숫자를 통화 형식으로 포맷
 */
function formatCurrency(value) {
    if (!value || value === 0) return '0원';
    return new Intl.NumberFormat('ko-KR').format(value) + '원';
}

/**
 * 날짜 포맷 (YYYY-MM-DD)
 */
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
}

/**
 * 상태 배지 HTML 생성
 */
function getStatusBadgeHTML(status) {
    const badgeMap = {
        incomplete: '<span class="status-badge incomplete">❌ 미실행</span>',
        partial: '<span class="status-badge partial">⚠️ 일부완료</span>',
        complete: '<span class="status-badge complete">✅ 완료</span>'
    };
    return badgeMap[status] || badgeMap.partial;
}

// ============================================
// 데이터 로드 함수
// ============================================

/**
 * 전체 보고서 데이터 로드
 */
async function loadReports() {
    try {
        console.log('📊 보고서 데이터 로드 시작...');
        console.log('API Manager 상태:', apiManager);
        showLoading(true);

        // 타임아웃 추가 (30초)
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('API 호출 타임아웃 (30초)')), 30000);
        });

        const response = await Promise.race([
            apiManager.getReports(),
            timeoutPromise
        ]);

        console.log('API 응답:', response);
        console.log('응답 타입:', typeof response);
        console.log('응답이 배열인가?', Array.isArray(response));

        // API 응답 처리
        let reportsData = [];

        if (Array.isArray(response)) {
            // 배열로 직접 옴
            console.log('✓ 응답이 배열 형식');
            reportsData = response;
        } else if (response && Array.isArray(response.reports)) {
            // { success: true, reports: [...] } 형식
            console.log('✓ response.reports 배열 발견');
            reportsData = response.reports;
        } else if (response && response.data && Array.isArray(response.data.reports)) {
            // { success: true, data: { reports: [...] } } 형식 (중첩)
            console.log('✓ response.data.reports 배열 발견');
            reportsData = response.data.reports;
        } else if (response && Array.isArray(response.data)) {
            // { success: true, data: [...] } 형식
            console.log('✓ response.data 배열 발견');
            reportsData = response.data;
        } else if (response && typeof response === 'object') {
            // 객체인 경우 모든 키 확인
            console.warn('⚠️ 응답 형식이 예상과 다름');
            const keys = Object.keys(response);
            console.log('response 키들:', keys);

            // 각 키의 값이 배열인지 확인
            for (const key of keys) {
                if (Array.isArray(response[key])) {
                    console.log(`✓ ${key} 키에 배열 발견 (길이: ${response[key].length})`);
                    reportsData = response[key];
                    break;
                }
            }

            if (reportsData.length === 0) {
                console.error('❌ 배열 데이터를 찾을 수 없음');
                console.log('전체 response:', JSON.stringify(response, null, 2));
            }
        } else {
            console.error('❌ 알 수 없는 응답 형식');
            reportsData = [];
        }

        allReports = reportsData.map(report => ({
            ...report,
            calculatedStatus: calculateReportStatus(report)
        }));

        console.log(`✅ 로드된 보고서: ${allReports.length}건`);
        if (allReports.length > 0) {
            console.log('첫 번째 보고서 샘플:', allReports[0]);

            // 보고서 상태별 개수 확인
            const statusCounts = {
                incomplete: allReports.filter(r => r.calculatedStatus === 'incomplete').length,
                partial: allReports.filter(r => r.calculatedStatus === 'partial').length,
                complete: allReports.filter(r => r.calculatedStatus === 'complete').length
            };
            console.log('📊 보고서 상태별 개수:');
            console.log(`  - 미실행: ${statusCounts.incomplete}건`);
            console.log(`  - 일부완료: ${statusCounts.partial}건`);
            console.log(`  - 완료: ${statusCounts.complete}건`);

            // 각 보고서의 상태 계산 상세 로그
            console.log('📋 보고서별 상태:');
            allReports.forEach(report => {
                console.log(`  - ${report.reportId || report.id}: ${report.calculatedStatus} (수금:${report.targetCollectionAmount}, 매출:${report.targetSalesAmount}, 상품:${report.targetProducts ? '있음' : '없음'})`);
            });
        }
        return true;
    } catch (error) {
        console.error('❌ 보고서 로드 에러:', error);
        console.error('에러 스택:', error.stack);
        alert('보고서 데이터를 불러오는데 실패했습니다:\n' + error.message + '\n\n브라우저 콘솔(F12)을 확인하세요.');
        showLoading(false);
        return false;
    }
}

/**
 * 전체 직원 데이터 로드
 */
async function loadEmployees() {
    try {
        console.log('👥 직원 데이터 로드 시작...');
        // 역할별 직원 조회 API 사용 (관리자 권한 불필요)
        const response = await apiManager.getEmployeesByRole(USER_ROLES.SALES);
        console.log('직원 API 응답:', response);

        if (response.success && response.data && Array.isArray(response.data.employees)) {
            // API 응답 형식: { success, data: { role, count, employees: [...] } }
            allEmployees = response.data.employees.map(emp => ({
                name: emp.name,
                role1: USER_ROLES.SALES,
                department: emp.department,
                canUploadExcel: emp.canUploadExcel
            }));
            console.log(`✅ ${USER_ROLES.SALES} 직원: ${allEmployees.length}명`);

            if (allEmployees.length > 0) {
                console.log('직원 데이터 샘플:', allEmployees[0]);
            }
        } else {
            console.warn('⚠️ 직원 데이터 형식 오류, 보고서에서 추출');
            extractEmployeesFromReports();
        }

        return true;
    } catch (error) {
        console.error('❌ 직원 로드 에러:', error);
        // 직원 데이터 로드 실패시 보고서에서 추출
        console.log('⚠️ Fallback: 보고서에서 직원 추출');
        extractEmployeesFromReports();
        return true;
    }
}

/**
 * 보고서에서 직원 정보 추출 (fallback)
 * 보고서를 제출한 사람은 모두 영업담당으로 간주
 */
function extractEmployeesFromReports() {
    const uniqueNames = [...new Set(allReports.map(r => r.submittedBy))];
    allEmployees = uniqueNames.map(name => ({
        name,
        role1: USER_ROLES.SALES  // 보고서 제출자는 영업담당으로 간주
    }));
    console.log(`📋 보고서에서 추출된 직원: ${allEmployees.length}명 (${USER_ROLES.SALES}으로 설정)`);
}

// ============================================
// UI 렌더링 함수
// ============================================

/**
 * 영업담당 여부 확인 (관리자이면서 영업담당인 경우 포함)
 */
function isSalesEmployee(employee) {
    // role 또는 role1에 '영업'이 포함되어 있으면 영업담당
    const role = String(employee.role || '');
    const role1 = String(employee.role1 || '');

    return role.includes('영업') || role1.includes('영업');
}

/**
 * 금주 제출현황 렌더링
 */
function renderSubmissionStatus() {
    const weeklyReports = allReports.filter(r => isThisWeek(r.submittedDate));
    const submitters = [...new Set(weeklyReports.map(r => r.submittedBy))];

    // 영업담당 직원만 필터링 (관리자 제외, 단 영업담당 역할도 있으면 포함)
    const salesEmployees = allEmployees.filter(emp => isSalesEmployee(emp));

    const nonSubmitters = salesEmployees
        .map(e => e.name)
        .filter(name => !submitters.includes(name));

    console.log('전체 직원:', allEmployees.length);
    console.log('영업담당 직원:', salesEmployees.length);
    console.log('제출자:', submitters.length);
    console.log('미제출자:', nonSubmitters.length);

    // 제출자 렌더링 (영업담당만)
    const salesSubmitters = submitters.filter(name =>
        salesEmployees.some(emp => emp.name === name)
    );

    const submittersListEl = document.getElementById('submittersList');
    const submittersCountEl = document.getElementById('submittersCount');

    console.log('제출자 목록 요소:', submittersListEl);
    console.log('제출자 카운트 요소:', submittersCountEl);

    if (submittersCountEl) {
        submittersCountEl.textContent = salesSubmitters.length;
    }

    if (submittersListEl) {
        submittersListEl.innerHTML = salesSubmitters.length > 0
            ? salesSubmitters.map(name => `<li class="submitter-item">✅ ${name}</li>`).join('')
            : '<li class="empty-message">제출자가 없습니다</li>';
        console.log('제출자 목록 HTML:', submittersListEl.innerHTML);
    }

    // 미제출자 렌더링
    const nonSubmittersListEl = document.getElementById('nonSubmittersList');
    const nonSubmittersCountEl = document.getElementById('nonSubmittersCount');

    console.log('미제출자 목록 요소:', nonSubmittersListEl);
    console.log('미제출자 카운트 요소:', nonSubmittersCountEl);

    if (nonSubmittersCountEl) {
        nonSubmittersCountEl.textContent = nonSubmitters.length;
    }

    if (nonSubmittersListEl) {
        nonSubmittersListEl.innerHTML = nonSubmitters.length > 0
            ? nonSubmitters.map(name => `<li class="non-submitter-item">❌ ${name}</li>`).join('')
            : '<li class="empty-message">모두 제출했습니다</li>';
        console.log('미제출자 목록 HTML:', nonSubmittersListEl.innerHTML);
    }
}

/**
 * 상태별 카운트 업데이트
 */
function updateStatusCounts() {
    const counts = {
        incomplete: allReports.filter(r => r.calculatedStatus === 'incomplete').length,
        partial: allReports.filter(r => r.calculatedStatus === 'partial').length,
        complete: allReports.filter(r => r.calculatedStatus === 'complete').length
    };

    document.getElementById('incompleteCount').textContent = counts.incomplete;
    document.getElementById('partialCount').textContent = counts.partial;
    document.getElementById('completeCount').textContent = counts.complete;
}

/**
 * 금주 보고서 렌더링
 */
function renderWeeklyReports() {
    const weeklyReports = allReports.filter(r => isThisWeek(r.submittedDate));
    const container = document.getElementById('weeklyReportsContainer');

    if (weeklyReports.length === 0) {
        container.innerHTML = '<p class="empty-message">금주 제출된 보고서가 없습니다</p>';
        return;
    }

    container.innerHTML = weeklyReports.map(report => createReportItemHTML(report)).join('');
}

/**
 * 필터링된 보고서 렌더링
 */
function renderFilteredReports() {
    const filteredReports = allReports.filter(r => r.calculatedStatus === currentFilter);
    const container = document.getElementById('filteredReportsContainer');
    const titleEl = document.getElementById('filteredSectionTitle');
    const countEl = document.getElementById('filteredReportsCount');

    // 제목 업데이트
    titleEl.textContent = `▼ ${STATUS_MAP[currentFilter]} 보고서`;
    countEl.textContent = `(총 ${filteredReports.length}건)`;

    // 리스트 렌더링
    if (filteredReports.length === 0) {
        container.innerHTML = '<p class="empty-message">해당 상태의 보고서가 없습니다</p>';
        return;
    }

    container.innerHTML = filteredReports.map(report => createReportItemHTML(report)).join('');
}

/**
 * 보고서 아이템 HTML 생성
 */
function createReportItemHTML(report) {
    const isSelected = report.reportId === selectedReportId;

    return `
        <div class="report-item ${isSelected ? 'selected' : ''}"
             data-report-id="${report.reportId}"
             onclick="handleReportClick('${report.reportId}')">
            <div class="report-item-header">
                <span class="report-type">${REPORT_TYPE_MAP[report.reportType] || report.reportType}</span>
                ${getStatusBadgeHTML(report.calculatedStatus)}
            </div>
            <div class="report-item-body">
                <div class="report-company">${report.companyName || '회사명 없음'}</div>
                <div class="report-meta">
                    <span class="report-author">👤 ${report.submittedBy}</span>
                    <span class="report-date">📅 ${formatDate(report.submittedDate)}</span>
                </div>
            </div>
        </div>
    `;
}

/**
 * 보고서 상세 패널 렌더링
 */
function renderReportDetail(reportId) {
    const report = allReports.find(r => r.reportId === reportId);

    if (!report) {
        showDetailPlaceholder();
        return;
    }

    // 플레이스홀더 숨기고 상세 내용 표시
    document.getElementById('detailPlaceholder').style.display = 'none';
    document.getElementById('detailContent').style.display = 'block';

    // 기본 정보
    document.getElementById('detailReportId').textContent = report.reportId || '-';
    document.getElementById('detailReportType').textContent = REPORT_TYPE_MAP[report.reportType] || report.reportType;
    document.getElementById('detailCompany').textContent = report.companyName || '-';
    document.getElementById('detailSubmitter').textContent = report.submittedBy || '-';
    document.getElementById('detailSubmitDate').textContent = formatDate(report.submittedDate);
    document.getElementById('detailStatus').innerHTML = getStatusBadgeHTML(report.calculatedStatus);

    // 목표수금금액
    document.getElementById('detailCollectionGoal').textContent = formatCurrency(report.targetCollectionAmount);

    // 목표매출금액
    document.getElementById('detailSalesGoal').textContent = formatCurrency(report.targetSalesAmount);

    // 목표상품 (목표매출액 헤더에 표시)
    try {
        const productsData = typeof report.targetProducts === 'string'
            ? JSON.parse(report.targetProducts)
            : report.targetProducts;

        if (Array.isArray(productsData) && productsData.length > 0) {
            document.getElementById('detailSalesProduct').textContent =
                productsData.map(p => p.productName).join(', ');
        } else {
            document.getElementById('detailSalesProduct').textContent = '-';
        }
    } catch (e) {
        document.getElementById('detailSalesProduct').textContent = report.targetProducts || '-';
    }

    // 영업활동(특이사항) - activityNotes는 JSON 배열
    const activityListEl = document.getElementById('detailActivityList');
    if (activityListEl) {
        try {
            const activities = typeof report.activityNotes === 'string'
                ? JSON.parse(report.activityNotes)
                : report.activityNotes;

            if (Array.isArray(activities) && activities.length > 0) {
                activityListEl.innerHTML = activities.map(activity => `
                    <div class="activity-item glass-card" style="padding: 12px; margin-bottom: 8px;">
                        <div style="font-weight: 500; color: var(--primary-color); margin-bottom: 4px;">
                            ${activity.companyName || '회사명 없음'}
                        </div>
                        <div style="font-size: 0.9em; color: var(--text-color);">
                            ${activity.content || '-'}
                        </div>
                    </div>
                `).join('');
            } else {
                activityListEl.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 20px;">활동 내역이 없습니다</p>';
            }
        } catch (e) {
            console.error('활동내역 파싱 에러:', e);
            activityListEl.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 20px;">-</p>';
        }
    }

    // 관리자 의견 (기존 의견 표시)
    document.getElementById('adminComment').value = report.adminComment || '';
}

/**
 * 상세 패널 플레이스홀더 표시
 */
function showDetailPlaceholder() {
    document.getElementById('detailPlaceholder').style.display = 'flex';
    document.getElementById('detailContent').style.display = 'none';
}

/**
 * 로딩 상태 표시/숨김
 */
function showLoading(show) {
    const loadingState = document.getElementById('loadingState');
    const mainLayout = document.getElementById('mainLayout');

    if (show) {
        loadingState.style.display = 'flex';
        mainLayout.style.display = 'none';
    } else {
        loadingState.style.display = 'none';
        mainLayout.style.display = 'flex';
    }
}

// ============================================
// 이벤트 핸들러
// ============================================

/**
 * 보고서 아이템 클릭 핸들러
 */
window.handleReportClick = function(reportId) {
    selectedReportId = reportId;

    // 모든 아이템에서 selected 클래스 제거
    document.querySelectorAll('.report-item').forEach(item => {
        item.classList.remove('selected');
    });

    // 클릭된 아이템에 selected 클래스 추가
    const clickedItem = document.querySelector(`[data-report-id="${reportId}"]`);
    if (clickedItem) {
        clickedItem.classList.add('selected');
    }

    // 상세 패널 렌더링
    renderReportDetail(reportId);
};

/**
 * 상태 필터 클릭 핸들러
 */
function handleFilterClick(status) {
    currentFilter = status;

    // 모든 필터 버튼에서 active 클래스 제거
    document.querySelectorAll('.status-filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // 클릭된 필터 버튼에 active 클래스 추가
    const filterItem = document.querySelector(`[data-status="${status}"]`);
    if (filterItem) {
        const button = filterItem.querySelector('.status-filter-btn');
        button.classList.add('active');
    }

    // 필터링된 보고서 렌더링
    renderFilteredReports();
}

/**
 * 관리자 의견 저장 핸들러
 */
async function handleSaveComment() {
    if (!selectedReportId) {
        alert('보고서를 선택해주세요.');
        return;
    }

    const comment = document.getElementById('adminComment').value.trim();

    // 현재 로그인한 관리자 정보 가져오기
    const userJson = localStorage.getItem('user');
    console.log('🔍 [디버깅] localStorage user (원본):', userJson);

    if (!userJson) {
        alert('❌ 로그인 정보를 찾을 수 없습니다. 다시 로그인해주세요.');
        return;
    }

    let processedBy;
    try {
        const user = JSON.parse(userJson);
        console.log('🔍 [디버깅] 파싱된 user 객체:', user);
        console.log('🔍 [디버깅] user.name:', user.name);
        console.log('🔍 [디버깅] user.role:', user.role);
        console.log('🔍 [디버깅] user의 모든 키:', Object.keys(user));

        processedBy = user.name;
        console.log('🔍 [디버깅] processedBy 설정됨:', processedBy);

        if (!processedBy) {
            alert('❌ 사용자 이름을 찾을 수 없습니다.');
            return;
        }
    } catch (e) {
        console.error('user 데이터 파싱 실패:', e);
        alert('❌ 사용자 정보를 읽을 수 없습니다. 다시 로그인해주세요.');
        return;
    }

    try {
        console.log('📤 전송 데이터:', {
            reportId: selectedReportId,
            adminComment: comment,
            processedBy: processedBy,
            commentLength: comment.length
        });

        const response = await apiManager.updateReport(selectedReportId, {
            adminComment: comment,
            processedBy: processedBy
        });

        console.log('📥 API 응답:', response);

        if (response.success) {
            alert('✅ 관리자 의견이 저장되었습니다.');

            // 로컬 데이터 업데이트
            const report = allReports.find(r => r.reportId === selectedReportId);
            if (report) {
                report.adminComment = comment;
                report.processedBy = processedBy;
                report.processedDate = new Date().toISOString();
            }
        } else {
            throw new Error(response.message || '저장 실패');
        }
    } catch (error) {
        console.error('❌ 의견 저장 에러:', error);
        alert('의견 저장에 실패했습니다: ' + error.message);
    }
}

/**
 * 새로고침 핸들러
 */
async function handleRefresh() {
    selectedReportId = null;
    await initializePage();
    alert('✅ 데이터가 새로고침되었습니다.');
}

// ============================================
// 초기화 함수
// ============================================

/**
 * 페이지 초기화
 */
async function initializePage() {
    console.log('🚀 관리자모드 실적보고서 확인 페이지 초기화...');

    try {
        // 데이터 로드
        const reportsLoaded = await loadReports();

        // 보고서 로드 실패시에도 직원은 로드 시도
        await loadEmployees();

        // 보고서가 없어도 UI는 표시
        if (!reportsLoaded || allReports.length === 0) {
            console.warn('⚠️ 보고서 데이터가 없습니다');
            showLoading(false);

            // 빈 상태로 UI 렌더링
            renderSubmissionStatus();
            updateStatusCounts();
            renderWeeklyReports();
            renderFilteredReports();
            showDetailPlaceholder();

            return;
        }

        // UI 렌더링
        renderSubmissionStatus();
        updateStatusCounts();
        renderWeeklyReports();
        renderFilteredReports();
        showDetailPlaceholder();

        showLoading(false);

        console.log('✅ 페이지 초기화 완료');
    } catch (error) {
        console.error('❌ 초기화 중 에러:', error);
        showLoading(false);
        alert('페이지 초기화 중 오류가 발생했습니다: ' + error.message);
    }
}

/**
 * 이벤트 리스너 등록
 */
function attachEventListeners() {
    // 상태 필터 버튼 클릭
    document.querySelectorAll('.status-filter-item').forEach(item => {
        const button = item.querySelector('.status-filter-btn');
        const status = item.dataset.status;

        button.addEventListener('click', () => handleFilterClick(status));
    });

    // 관리자 의견 저장 버튼
    const saveCommentBtn = document.getElementById('saveCommentBtn');
    if (saveCommentBtn) {
        saveCommentBtn.addEventListener('click', handleSaveComment);
    }

    // 새로고침 버튼
    const refreshBtn = document.getElementById('btnRefresh');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', handleRefresh);
    }
}

// ============================================
// 페이지 로드시 실행
// ============================================

/**
 * 메인 초기화 함수
 */
async function main() {
    console.log('📋 관리자모드 - 실적보고서 확인 페이지 로드');

    try {
        // API Manager 초기화 대기
        console.log('API Manager 초기화 중...');

        // API Manager가 이미 초기화되었는지 확인
        if (typeof apiManager.init === 'function') {
            await apiManager.init();
        }
        console.log('✅ API Manager 초기화 완료');

        attachEventListeners();
        await initializePage();
    } catch (error) {
        console.error('❌ 페이지 로드 에러:', error);
        showLoading(false);
        alert('페이지 초기화에 실패했습니다: ' + error.message);
    }
}

// DOMContentLoaded가 이미 발생했는지 확인하고 실행
if (document.readyState === 'loading') {
    // 아직 로딩 중이면 이벤트 리스너 등록
    document.addEventListener('DOMContentLoaded', main);
} else {
    // 이미 로드 완료되었으면 즉시 실행
    console.log('📄 Document already loaded, executing immediately');
    main();
}
