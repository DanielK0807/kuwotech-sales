/* ============================================
   데이터 관리 페이지 (관리자)
   파일: 04.admin_mode/05_data_management/02_data_management.js
   작성일: 2025-01-27
   설명: 관리자 데이터 다운로드 관리
============================================ */

// 모듈 import
import { formatCurrency, formatDate, formatDateKorean } from '../../01.common/03_format.js';
import { showToast } from '../../01.common/14_toast.js';
import { themeManager } from '../../01.common/11_theme_manager.js';
import { calculateSalesKPI } from '../../01.common/21_kpi_calculator.js';
import { GlobalConfig } from '../../01.common/01_global_config.js';

// [전역 변수]
let allCompanies = [];
let allEmployees = [];
let salesPeople = [];

// [초기화]
async function init() {
    console.log('[데이터 관리] 초기화 시작');

    try {
        // DOM 요소 확인
        const elementsToCheck = ['totalCompanies', 'companiesLastUpdate', 'totalSalesPeople', 'kpiDate', 'salesPersonSelect', 'btnRefresh'];
        const missingElements = elementsToCheck.filter(id => !document.getElementById(id));

        if (missingElements.length > 0) {
            console.warn('[데이터 관리] 다음 요소들을 찾을 수 없습니다:', missingElements);
            console.log('[데이터 관리] 재시도 중... (500ms 후)');
            setTimeout(init, 500);
            return;
        }

        console.log('[데이터 관리] 모든 DOM 요소 확인 완료');

        // 데이터 로드
        await loadData();

        // 통계 정보 업데이트
        updateStatistics();

        // 영업담당자 셀렉트 박스 초기화
        initSalesPersonSelect();

        // 새로고침 버튼 이벤트
        const btnRefresh = document.getElementById('btnRefresh');
        if (btnRefresh) {
            btnRefresh.addEventListener('click', async () => {
                showToast('데이터를 새로고침하는 중...', 'info');
                await loadData();
                updateStatistics();
                initSalesPersonSelect();
                showToast('새로고침 완료', 'success');
            });
        }

        console.log('[데이터 관리] 초기화 완료');
    } catch (error) {
        console.error('[데이터 관리] 초기화 실패:', error);
        showToast('데이터 로드 중 오류가 발생했습니다', 'error');
    }
}

// [데이터 로드]
async function loadData() {
    try {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            console.error('❌ [데이터 관리] 인증 토큰이 없습니다');
            showToast('로그인이 필요합니다', 'error');
            return;
        }

        // API Base URL 가져오기 (GlobalConfig 사용)
        const API_BASE_URL = GlobalConfig.API_BASE_URL;

        // 거래처 데이터 로드 (전체 데이터 - limit=9999)
        console.log('📡 [거래처] API 호출 시작:', `${API_BASE_URL}/api/companies?limit=9999`);
        const companiesResponse = await fetch(`${API_BASE_URL}/api/companies?limit=9999`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            }
        });

        console.log('📡 [거래처] 응답 상태:', companiesResponse.status, companiesResponse.statusText);

        if (companiesResponse.ok) {
            const companiesData = await companiesResponse.json();
            console.log('📦 [거래처] 응답 데이터 - count:', companiesData.count, 'total:', companiesData.total);

            // API 응답 형식: {success: true, count: 1008, total: 1008, companies: [...]}
            const companiesArray = companiesData.companies || companiesData.data || [];
            console.log('📦 [거래처] companies 필드:', Array.isArray(companiesArray), '길이:', companiesArray.length);

            if (companiesData.success && Array.isArray(companiesArray)) {
                // KPI calculator를 위해 한글 필드명 추가
                allCompanies = companiesArray.map(c => ({
                    ...c,
                    거래상태: c.businessStatus,
                    누적매출금액: c.accumulatedSales,
                    누적수금금액: c.accumulatedCollection,
                    매출채권잔액: c.accountsReceivable,
                    거래처명: c.finalCompanyName || c.companyNameERP
                }));
                console.log('✅ [거래처] 로드 성공:', allCompanies.length, '개 (전체:', companiesData.total, '개)');
            } else {
                console.error('❌ [거래처] 응답 형식 오류:', companiesData);
            }
        } else {
            const errorData = await companiesResponse.json().catch(() => ({}));
            console.error('❌ [거래처] 로드 실패:', companiesResponse.status, errorData);
        }

        // 직원 데이터 로드
        console.log('📡 [직원] API 호출 시작:', `${API_BASE_URL}/api/employees`);
        const employeesResponse = await fetch(`${API_BASE_URL}/api/employees`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            }
        });

        console.log('📡 [직원] 응답 상태:', employeesResponse.status, employeesResponse.statusText);

        if (employeesResponse.ok) {
            const employeesData = await employeesResponse.json();
            console.log('📦 [직원] 응답 데이터:', employeesData);

            // API 응답 형식: {success: true, count: 18, employees: [...]}
            const employeesArray = employeesData.employees || employeesData.data || [];
            console.log('📦 [직원] employees 필드:', Array.isArray(employeesArray), '길이:', employeesArray.length);

            if (employeesData.success && Array.isArray(employeesArray)) {
                allEmployees = employeesArray;

                // role 필드 값 확인
                const role1Values = [...new Set(allEmployees.map(e => e.role1).filter(r => r))];
                const role2Values = [...new Set(allEmployees.map(e => e.role2).filter(r => r))];
                console.log('📋 [직원] role1 필드 값들:', role1Values);
                console.log('📋 [직원] role2 필드 값들:', role2Values);

                // role1 또는 role2에 '영업담당' 또는 '영업'이 있는 직원 필터링
                // (관리자만 있는 경우는 제외, 영업담당+관리자 중복은 포함)
                salesPeople = allEmployees.filter(e => {
                    const roles = [e.role1, e.role2].filter(r => r); // null/undefined 제거
                    return roles.some(r => r === '영업담당' || r === '영업');
                });

                console.log('✅ [직원] 로드 성공:', allEmployees.length, '명 (영업담당:', salesPeople.length, '명)');
                console.log('📋 [영업담당자 목록]:', salesPeople.map(e => `${e.name} (role1: ${e.role1}, role2: ${e.role2})`));

                if (salesPeople.length === 0) {
                    console.warn('⚠️ [직원] 영업담당 직원이 없습니다. role1:', role1Values, 'role2:', role2Values);
                }
            } else {
                console.error('❌ [직원] 응답 형식 오류:', employeesData);
            }
        } else {
            const errorData = await employeesResponse.json().catch(() => ({}));
            console.error('❌ [직원] 로드 실패:', employeesResponse.status, errorData);
        }

        console.log('[데이터 로드] 완료 - 거래처:', allCompanies.length, '직원:', allEmployees.length);
    } catch (error) {
        console.error('[데이터 로드] 실패:', error);
        showToast('데이터 로드 중 오류가 발생했습니다', 'error');
        throw error;
    }
}

// [통계 정보 업데이트]
function updateStatistics() {
    console.log('[통계 업데이트] 시작 - 거래처:', allCompanies.length, '영업담당:', salesPeople.length);

    // 전체거래처 통계
    const activeCompanies = allCompanies.filter(c => c.businessStatus !== '불용');
    const totalCompaniesEl = document.getElementById('totalCompanies');
    const companiesLastUpdateEl = document.getElementById('companiesLastUpdate');

    if (totalCompaniesEl) {
        totalCompaniesEl.textContent = `${activeCompanies.length}개`;
        console.log('[통계 업데이트] 총 거래처:', activeCompanies.length);
    } else {
        console.error('[통계 업데이트] totalCompanies 요소를 찾을 수 없습니다');
    }

    if (companiesLastUpdateEl) {
        companiesLastUpdateEl.textContent = formatDateKorean(new Date());
    } else {
        console.error('[통계 업데이트] companiesLastUpdate 요소를 찾을 수 없습니다');
    }

    // 영업담당자 통계
    const totalSalesPeopleEl = document.getElementById('totalSalesPeople');
    const kpiDateEl = document.getElementById('kpiDate');

    if (totalSalesPeopleEl) {
        totalSalesPeopleEl.textContent = `${salesPeople.length}명`;
        console.log('[통계 업데이트] 총 영업담당자:', salesPeople.length);
    } else {
        console.error('[통계 업데이트] totalSalesPeople 요소를 찾을 수 없습니다');
    }

    if (kpiDateEl) {
        kpiDateEl.textContent = formatDateKorean(new Date());
    } else {
        console.error('[통계 업데이트] kpiDate 요소를 찾을 수 없습니다');
    }

    console.log('[통계 업데이트] 완료');
}

// [영업담당자 셀렉트 박스 초기화]
function initSalesPersonSelect() {
    const select = document.getElementById('salesPersonSelect');

    if (!select) {
        console.error('[영업담당자 셀렉트] salesPersonSelect 요소를 찾을 수 없습니다');
        return;
    }

    // 기존 옵션 제거 (첫 번째 "담당자를 선택하세요" 제외)
    while (select.options.length > 1) {
        select.remove(1);
    }

    // 영업담당자 옵션 추가
    salesPeople.forEach(person => {
        const option = document.createElement('option');
        option.value = person.name;
        option.textContent = person.name;
        select.appendChild(option);
    });

    console.log('[영업담당자 셀렉트] 초기화 완료 -', salesPeople.length, '명');
}

// [전체거래처 다운로드]
window.downloadAllCompanies = async function() {
    try {
        if (!window.XLSX) {
            showToast('Excel 라이브러리를 로드하는 중입니다...', 'info');
            return;
        }

        showToast('전체거래처 데이터를 준비 중입니다...', 'info');

        const activeCompanies = allCompanies.filter(c => c.businessStatus !== '불용');

        if (activeCompanies.length === 0) {
            showToast('다운로드할 거래처가 없습니다', 'warning');
            return;
        }

        // 엑셀 데이터 생성 (모든 컬럼 포함)
        const excelData = activeCompanies.map(c => ({
            'KEY VALUE': c.keyValue || '',
            '최종거래처명': c.finalCompanyName || '',
            '폐업여부': c.isClosed || '',
            '대표자': c.ceoOrDentist || '',
            '지역': c.customerRegion || '',
            '지역ID': c.region_id || '',
            '거래상태': c.businessStatus || '',
            '담당부서': c.department || '',
            '판매제품': c.salesProduct || '',
            '내부담당자': c.internalManager || '',
            'JCW기여도': c.jcwContribution || '',
            '회사기여도': c.companyContribution || '',
            '마지막결제일': c.lastPaymentDate || '',
            '마지막결제금액': c.lastPaymentAmount || 0,
            '매출채권잔액': c.accountsReceivable || 0,
            '누적수금금액': c.accumulatedCollection || 0,
            '누적매출금액': c.accumulatedSales || 0,
            '영업활동': c.activityNotes || '',
            '사업자등록번호': c.businessRegistrationNumber || '',
            '상세주소': c.detailedAddress || '',
            '전화번호': c.phoneNumber || '',
            '추천인': c.referralSource || '',
            '생성일': c.createdAt || '',
            '수정일': c.updatedAt || ''
        }));

        // 워크북 생성
        const ws = XLSX.utils.json_to_sheet(excelData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '전체거래처');

        // 파일 다운로드
        const filename = `전체거래처_${formatDate(new Date())}.xlsx`;
        XLSX.writeFile(wb, filename);

        showToast(`${activeCompanies.length}개 거래처 다운로드 완료`, 'success');

    } catch (error) {
        console.error('[전체거래처 다운로드] 실패:', error);
        showToast('다운로드 중 오류가 발생했습니다', 'error');
    }
};

// [영업담당 KPI 다운로드]
window.downloadSalesPersonKPI = async function() {
    try {
        const select = document.getElementById('salesPersonSelect');
        const selectedName = select.value;

        if (!selectedName) {
            showToast('담당자를 선택해주세요', 'warning');
            return;
        }

        if (!window.XLSX) {
            showToast('Excel 라이브러리를 로드하는 중입니다...', 'info');
            return;
        }

        showToast(`${selectedName} 담당자의 KPI를 계산 중입니다...`, 'info');

        // 담당자의 거래처 필터링
        const managerCompanies = allCompanies.filter(c =>
            c.internalManager === selectedName && c.businessStatus !== '불용'
        );

        if (managerCompanies.length === 0) {
            showToast('해당 담당자의 거래처가 없습니다', 'warning');
            return;
        }

        // KPI 계산
        const employee = { name: selectedName };

        // 전사 집계 데이터 계산 (기여도용)
        const totals = {
            전사누적매출: allCompanies.reduce((sum, c) => sum + (parseFloat(c.accumulatedSales) || 0), 0),
            전사주요제품매출: allCompanies.reduce((sum, c) => {
                let sales = 0;
                if (c.IMPLANT) sales += parseFloat(c.IMPLANT) || 0;
                if (c.ZIRCONIA) sales += parseFloat(c.ZIRCONIA) || 0;
                if (c.ABUTMENT) sales += parseFloat(c.ABUTMENT) || 0;
                return sum + sales;
            }, 0)
        };

        const kpi = calculateSalesKPI(employee, managerCompanies, totals);

        // 엑셀 데이터 생성
        const kpiData = [{
            '담당자': selectedName,
            '계산일': formatDateKorean(new Date()),
            '담당거래처': kpi.담당거래처,
            '활성거래처': kpi.활성거래처,
            '활성화율': `${kpi.활성화율.toFixed(2)}%`,
            '주요제품판매거래처': kpi.주요제품판매거래처,
            '회사배정기준달성율': `${kpi.회사배정기준대비달성율.toFixed(2)}%`,
            '주요고객처목표달성율': `${kpi.주요고객처목표달성율.toFixed(2)}%`,
            '누적매출금액': kpi.누적매출금액,
            '주요제품매출액': kpi.주요제품매출액,
            '주요제품매출비율': `${kpi.주요제품매출비율.toFixed(2)}%`,
            '매출집중도': Math.round(kpi.매출집중도),
            '누적수금금액': kpi.누적수금금액,
            '매출채권잔액': kpi.매출채권잔액,
            '전체매출기여도': `${kpi.전체매출기여도.toFixed(2)}%`,
            '주요매출기여도': `${kpi.주요제품매출기여도.toFixed(2)}%`
        }];

        // 워크북 생성
        const ws = XLSX.utils.json_to_sheet(kpiData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'KPI');

        // 담당거래처 시트 추가
        const companiesData = managerCompanies.map(c => ({
            'KEY VALUE': c.keyValue || '',
            '거래처명(ERP)': c.companyNameERP || '',
            '최종거래처명': c.finalCompanyName || '',
            '거래상태': c.businessStatus || '',
            '지역': c.customerRegion || '',
            '판매제품': c.salesProduct || '',
            '누적매출금액': c.accumulatedSales || 0,
            '누적수금금액': c.accumulatedCollection || 0,
            '매출채권잔액': c.accountsReceivable || 0
        }));
        const wsCompanies = XLSX.utils.json_to_sheet(companiesData);
        XLSX.utils.book_append_sheet(wb, wsCompanies, '담당거래처');

        // 파일 다운로드
        const filename = `영업담당KPI_${selectedName}_${formatDate(new Date())}.xlsx`;
        XLSX.writeFile(wb, filename);

        showToast(`${selectedName} 담당자 KPI 다운로드 완료`, 'success');

    } catch (error) {
        console.error('[영업담당 KPI 다운로드] 실패:', error);
        showToast('다운로드 중 오류가 발생했습니다', 'error');
    }
};

// [회사전체 KPI 다운로드]
window.downloadCompanyKPI = async function() {
    try {
        if (!window.XLSX) {
            showToast('Excel 라이브러리를 로드하는 중입니다...', 'info');
            return;
        }

        showToast('회사전체 KPI를 계산 중입니다...', 'info');

        // 각 영업담당자별 KPI 계산
        const allKPI = [];

        // 전사 집계 데이터 계산 (기여도용)
        const totals = {
            전사누적매출: allCompanies.reduce((sum, c) => sum + (parseFloat(c.accumulatedSales) || 0), 0),
            전사주요제품매출: allCompanies.reduce((sum, c) => {
                let sales = 0;
                if (c.IMPLANT) sales += parseFloat(c.IMPLANT) || 0;
                if (c.ZIRCONIA) sales += parseFloat(c.ZIRCONIA) || 0;
                if (c.ABUTMENT) sales += parseFloat(c.ABUTMENT) || 0;
                return sum + sales;
            }, 0)
        };

        for (const person of salesPeople) {
            const managerCompanies = allCompanies.filter(c =>
                c.internalManager === person.name && c.businessStatus !== '불용'
            );

            if (managerCompanies.length > 0) {
                const employee = { name: person.name, joinDate: person.joinDate };
                const kpi = calculateSalesKPI(employee, managerCompanies, totals);

                allKPI.push({
                    '담당자': person.name,
                    '담당거래처': kpi.담당거래처,
                    '활성거래처': kpi.활성거래처,
                    '활성화율': `${kpi.활성화율.toFixed(2)}%`,
                    '주요제품판매거래처': kpi.주요제품판매거래처,
                    '회사배정기준달성율': `${kpi.회사배정기준대비달성율.toFixed(2)}%`,
                    '주요고객처목표달성율': `${kpi.주요고객처목표달성율.toFixed(2)}%`,
                    '누적매출금액': kpi.누적매출금액,
                    '주요제품매출액': kpi.주요제품매출액,
                    '주요제품매출비율': `${kpi.주요제품매출비율.toFixed(2)}%`,
                    '매출집중도': Math.round(kpi.매출집중도),
                    '누적수금금액': kpi.누적수금금액,
                    '매출채권잔액': kpi.매출채권잔액,
                    '전체매출기여도': `${kpi.전체매출기여도.toFixed(2)}%`,
                    '주요매출기여도': `${kpi.주요제품매출기여도.toFixed(2)}%`
                });
            }
        }

        if (allKPI.length === 0) {
            showToast('KPI 데이터가 없습니다', 'warning');
            return;
        }

        // 회사 전체 합계 계산
        const totalSales = allKPI.reduce((sum, k) => sum + (parseFloat(k.누적매출금액) || 0), 0);
        const totalCollection = allKPI.reduce((sum, k) => sum + (parseFloat(k.누적수금금액) || 0), 0);
        const totalReceivable = allKPI.reduce((sum, k) => sum + (parseFloat(k.매출채권잔액) || 0), 0);

        // 합계 행 추가
        allKPI.push({
            '담당자': '전체 합계',
            '담당거래처': allKPI.reduce((sum, k) => sum + k.담당거래처, 0),
            '활성거래처': allKPI.reduce((sum, k) => sum + k.활성거래처, 0),
            '활성화율': '',
            '주요제품판매거래처': allKPI.reduce((sum, k) => sum + k.주요제품판매거래처, 0),
            '회사배정기준달성율': '',
            '주요고객처목표달성율': '',
            '누적매출금액': totalSales,
            '주요제품매출액': allKPI.reduce((sum, k) => sum + (parseFloat(k.주요제품매출액) || 0), 0),
            '주요제품매출비율': '',
            '매출집중도': '',
            '누적수금금액': totalCollection,
            '매출채권잔액': totalReceivable,
            '전체매출기여도': '100%',
            '주요매출기여도': ''
        });

        // 워크북 생성
        const ws = XLSX.utils.json_to_sheet(allKPI);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '회사전체KPI');

        // 요약 정보 시트 추가
        const summary = [{
            '항목': '기준일',
            '값': formatDateKorean(new Date())
        }, {
            '항목': '총 영업담당자',
            '값': `${salesPeople.length}명`
        }, {
            '항목': '총 거래처',
            '값': `${allCompanies.filter(c => c.businessStatus !== '불용').length}개`
        }, {
            '항목': '총 누적매출',
            '값': formatCurrency(totalSales)
        }, {
            '항목': '총 누적수금',
            '값': formatCurrency(totalCollection)
        }, {
            '항목': '총 매출채권',
            '값': formatCurrency(totalReceivable)
        }];
        const wsSummary = XLSX.utils.json_to_sheet(summary);
        XLSX.utils.book_append_sheet(wb, wsSummary, '요약정보');

        // 파일 다운로드
        const filename = `회사전체KPI_${formatDate(new Date())}.xlsx`;
        XLSX.writeFile(wb, filename);

        showToast('회사전체 KPI 다운로드 완료', 'success');

    } catch (error) {
        console.error('[회사전체 KPI 다운로드] 실패:', error);
        showToast('다운로드 중 오류가 발생했습니다', 'error');
    }
};

// [DOM 로드 완료 시 초기화]
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('[데이터 관리] DOMContentLoaded 이벤트 발생');
        setTimeout(init, 100); // 100ms 지연
    });
} else {
    // DOM이 이미 로드된 경우 약간의 지연 후 실행
    console.log('[데이터 관리] DOM already loaded, executing with delay');
    setTimeout(init, 100);
}
