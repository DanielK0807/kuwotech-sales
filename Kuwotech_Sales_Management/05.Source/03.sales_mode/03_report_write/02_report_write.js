/**
 * KUWOTECH 영업관리 시스템
 * 실적보고서 작성 - JavaScript
 * Railway MySQL 연동
 */

import ApiManager from '../../01.common/13_api_manager.js';

// ============================================
// API Manager 초기화
// ============================================
const apiManager = new ApiManager();

// ============================================
// 전역 상태 관리
// ============================================
const state = {
    currentUser: null,
    companies: [],
    selectedCompany: null,
    isCompanyVerified: false,
    productIdCounter: 1,
    monthlyGoals: null,
    annualGoals: null,
    products: [] // 제품 목록
};

// ============================================
// DOM 요소 참조
// ============================================
const elements = {
    // 헤더
    reportType: null,
    reportDate: null,
    companySelect: null,
    verifyCompanyBtn: null,
    companyAutocompleteList: null,

    // 목표 표시
    goalDisplaySection: null,
    goalTitle: null,
    goalPeriod: null,

    // 목표수금금액 섹션
    enableTargetCollection: null,
    targetCollectionContent: null,
    targetCollectionAmount: null,
    targetCollectionCurrency: null,

    // 목표매출액 섹션
    enableTargetSales: null,
    targetSalesContent: null,
    salesProductList: null,
    addProductBtn: null,

    // 영업활동 섹션
    enableActivity: null,
    activityContent: null,
    activityList: null,
    addActivityBtn: null,

    // 영업활동 모달
    activityModal: null,
    modalActivityType: null,
    activityFormContainer: null,
    cancelActivityBtn: null,
    saveActivityBtn: null,
    btnCloseModal: null,
    modalOverlay: null,

    // 폼
    reportForm: null,
    resetBtn: null,
    cancelBtn: null,
    submitBtn: null
};

// ============================================
// 초기화
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('[Report Write] 페이지 초기화 시작');

    // DOM 요소 캐싱
    cacheElements();

    // API Manager 초기화
    await apiManager.init();

    // 페이지 초기화
    await initializePage();

    // 이벤트 리스너 연결
    attachEventListeners();

    console.log('[Report Write] 페이지 초기화 완료');
});

/**
 * DOM 요소 캐싱
 */
function cacheElements() {
    // 헤더
    elements.reportType = document.getElementById('reportType');
    elements.reportDate = document.getElementById('reportDate');

    // 현재 날짜 즉시 설정 (DOM 로드 직후)
    if (elements.reportDate) {
        const today = new Date().toISOString().split('T')[0];
        elements.reportDate.value = today;
        elements.reportDate.setAttribute('readonly', true);
        console.log('[Report Write] 작성일 자동 설정:', today);
    }
    elements.companySelect = document.getElementById('companySelect');
    elements.verifyCompanyBtn = document.getElementById('verifyCompanyBtn');
    elements.companyAutocompleteList = document.getElementById('companyAutocompleteList');

    // 목표 표시
    elements.goalDisplaySection = document.getElementById('goalDisplaySection');
    elements.goalTitle = document.getElementById('goalTitle');
    elements.goalPeriod = document.getElementById('goalPeriod');

    // 목표수금금액
    elements.enableTargetCollection = document.getElementById('enableTargetCollection');
    elements.targetCollectionContent = document.getElementById('targetCollectionContent');
    elements.targetCollectionAmount = document.getElementById('targetCollectionAmount');
    elements.targetCollectionCurrency = document.getElementById('targetCollectionCurrency');

    // 목표매출액
    elements.enableTargetSales = document.getElementById('enableTargetSales');
    elements.targetSalesContent = document.getElementById('targetSalesContent');
    elements.salesProductList = document.getElementById('salesProductList');
    elements.addProductBtn = document.getElementById('addProductBtn');

    // 영업활동
    elements.enableActivity = document.getElementById('enableActivity');
    elements.activityContent = document.getElementById('activityContent');
    elements.activityList = document.getElementById('activityList');
    elements.addActivityBtn = document.getElementById('addActivityBtn');

    // 영업활동 모달
    elements.activityModal = document.getElementById('activityModal');
    elements.modalActivityType = document.getElementById('modalActivityType');
    elements.activityFormContainer = document.getElementById('activityFormContainer');
    elements.cancelActivityBtn = document.getElementById('cancelActivityBtn');
    elements.saveActivityBtn = document.getElementById('saveActivityBtn');
    elements.btnCloseModal = document.querySelector('.btn-close-modal');
    elements.modalOverlay = document.querySelector('.modal-overlay');

    // 폼
    elements.reportForm = document.getElementById('reportForm');
    elements.resetBtn = document.getElementById('resetBtn');
    elements.cancelBtn = document.getElementById('cancelBtn');
    elements.submitBtn = document.getElementById('submitBtn');
}

/**
 * 페이지 초기화
 */
async function initializePage() {
    try {
        // 로그인 사용자 정보 가져오기
        state.currentUser = JSON.parse(sessionStorage.getItem('user'));

        if (!state.currentUser) {
            if (window.Toast) {
                window.Toast.error('로그인이 필요합니다');
            }
            setTimeout(() => {
                window.location.href = '../../02.login/01_login.html';
            }, 1000);
            return;
        }

        console.log('[Report Write] 현재 사용자:', state.currentUser);

        // ⚠️ CRITICAL: id 필드 검증
        if (!state.currentUser.id) {
            console.error('[Report Write] ❌ 사용자 정보에 id가 없습니다:', state.currentUser);
            if (window.Toast) {
                window.Toast.error('세션 정보가 올바르지 않습니다. 다시 로그인해주세요.');
            }
            setTimeout(() => {
                sessionStorage.clear();
                window.location.href = '../../02.login/01_login.html';
            }, 2000);
            return;
        }

        console.log('[Report Write] ✅ 사용자 ID 확인:', state.currentUser.id);

        // 담당 거래처 목록 로드
        await loadUserCompanies();

        // 제품 목록 로드
        await loadProducts();

        // 전체 실적 표시 (기본)
        await loadEmployeeGoals();

    } catch (error) {
        console.error('[Report Write] 초기화 실패:', error);
        if (window.Toast) {
            window.Toast.error('페이지 초기화에 실패했습니다');
        }
    }
}

/**
 * 이벤트 리스너 연결
 */
function attachEventListeners() {
    // 거래처 입력 시 자동완성
    elements.companySelect.addEventListener('input', handleCompanyInput);
    
    // 거래처 포커스 시 자동완성 표시
    elements.companySelect.addEventListener('focus', handleCompanyFocus);
    
    // 거래처 선택 변경 시 확인 상태 초기화
    elements.companySelect.addEventListener('input', resetVerificationStatus);

    // 거래처 확인 버튼
    elements.verifyCompanyBtn.addEventListener('click', handleVerifyCompany);
    
    // 문서 클릭 시 자동완성 목록 닫기
    document.addEventListener('click', function(e) {
        if (!elements.companySelect.contains(e.target) && 
            !elements.companyAutocompleteList.contains(e.target)) {
            elements.companyAutocompleteList.style.display = 'none';
        }
    });

    // 접기/펼치기 섹션 토글
    setupCollapsibleSections();

    // 제품 추가 버튼
    elements.addProductBtn.addEventListener('click', addProductRow);

    // 활동 추가 버튼
    elements.addActivityBtn.addEventListener('click', openActivityModal);

    // 모달 닫기
    elements.btnCloseModal.addEventListener('click', closeActivityModal);
    elements.cancelActivityBtn.addEventListener('click', closeActivityModal);
    elements.modalOverlay.addEventListener('click', closeActivityModal);

    // 모달 내 활동 유형 선택
    elements.modalActivityType.addEventListener('change', handleModalActivityTypeChange);

    // 모달 저장 버튼
    elements.saveActivityBtn.addEventListener('click', saveActivity);

    // 폼 제출
    elements.reportForm.addEventListener('submit', handleSubmit);

    // 전체 재작성
    elements.resetBtn.addEventListener('click', handleReset);

    // 취소
    elements.cancelBtn.addEventListener('click', handleCancel);
}

// ============================================
// 거래처 관련
// ============================================

/**
 * 제품 목록 로드
 */
async function loadProducts() {
    try {
        console.log('[Report Write] 제품 목록 로드 중...');

        const response = await apiManager.getProducts();

        if (response.success) {
            state.products = response.data || [];
            console.log('[Report Write] ✅ 제품 목록 로드 완료:', state.products.length, '개');
        } else {
            console.error('[Report Write] 제품 목록 로드 실패:', response.message);
            state.products = [];
        }

    } catch (error) {
        console.error('[Report Write] 제품 목록 로드 오류:', error);
        state.products = [];
    }
}

/**
 * 사용자 담당 거래처 목록 로드
 */
async function loadUserCompanies() {
    try {
        console.log('[Report Write] 거래처 목록 로드 중...');
        console.log('[Report Write] 담당자:', state.currentUser.name);

        // 담당자별 거래처 조회 API 호출
        const response = await apiManager.getCompaniesByManager(state.currentUser.name);

        if (response.success) {
            state.companies = response.companies || [];
            console.log('[Report Write] 거래처 목록 로드 성공:', state.companies.length, '개');
        } else {
            console.warn('[Report Write] 거래처 목록 로드 실패:', response.message);
            if (window.Toast) {
                window.Toast.warning(`거래처 목록을 불러오지 못했습니다: ${response.message}`);
            }
        }
    } catch (error) {
        console.error('[Report Write] 거래처 목록 로드 에러:', error);
        if (window.Toast) {
            window.Toast.error('거래처 목록을 불러올 수 없습니다');
        }
    }
}

/**
 * 거래처 입력 시 자동완성 표시
 */
function handleCompanyInput(event) {
    const inputValue = event.target.value.trim().toLowerCase();

    // 입력값이 비어있으면 목록 숨기기
    if (!inputValue) {
        elements.companyAutocompleteList.style.display = 'none';
        return;
    }

    // 일치하는 거래처 필터링
    const filteredCompanies = state.companies.filter(company => {
        const companyName = (company.finalCompanyName || company.companyName || '').toLowerCase();
        return companyName.includes(inputValue);
    });

    // 결과 표시
    displayAutocompleteResults(filteredCompanies, inputValue);
}

/**
 * 거래처 포커스 시 전체 목록 표시
 */
function handleCompanyFocus() {
    const inputValue = elements.companySelect.value.trim();
    
    if (inputValue) {
        // 입력값이 있으면 필터링된 목록 표시
        handleCompanyInput({ target: elements.companySelect });
    } else {
        // 비어있으면 전체 목록 표시
        displayAutocompleteResults(state.companies, '');
    }
}

/**
 * 자동완성 결과 표시
 */
function displayAutocompleteResults(companies, searchTerm) {
    const list = elements.companyAutocompleteList;

    // 목록 초기화
    list.innerHTML = '';

    if (companies.length === 0) {
        list.innerHTML = '<div class="autocomplete-item" style="color: var(--text-secondary); pointer-events: none;">검색 결과가 없습니다</div>';
        list.style.display = 'block';
        return;
    }

    // 결과 항목 추가 (최대 10개)
    companies.slice(0, 10).forEach(company => {
        const companyName = company.finalCompanyName || company.companyName;
        const item = document.createElement('div');
        item.className = 'autocomplete-item';

        // 검색어 하이라이팅
        if (searchTerm) {
            const regex = new RegExp(`(${searchTerm})`, 'gi');
            item.innerHTML = companyName.replace(regex, '<strong>$1</strong>');
        } else {
            item.textContent = companyName;
        }

        // 클릭 이벤트
        item.addEventListener('click', () => selectCompanyFromAutocomplete(company));

        list.appendChild(item);
    });

    list.style.display = 'block';
}

/**
 * 자동완성에서 거래처 선택
 */
function selectCompanyFromAutocomplete(company) {
    const companyName = company.finalCompanyName || company.companyName;
    elements.companySelect.value = companyName;
    state.selectedCompany = company;
    
    // 자동완성 목록 닫기
    elements.companyAutocompleteList.style.display = 'none';
    
    // 확인 상태 초기화
    resetVerificationStatus();
    
    console.log('[Report Write] 거래처 선택:', companyName);
}

/**
 * 확인 상태 초기화
 */
function resetVerificationStatus() {
    state.isCompanyVerified = false;
    elements.companySelect.classList.remove('verified');
    elements.verifyCompanyBtn.classList.remove('verified');
    elements.verifyCompanyBtn.innerHTML = '✅ 확인';
}

/**
 * 거래처 확인 버튼 핸들러
 */
async function handleVerifyCompany() {
    const companyName = elements.companySelect.value.trim();
    
    if (!companyName) {
        if (window.Toast) {
            window.Toast.warning('거래처명을 입력해주세요');
        }
        elements.companySelect.focus();
        return;
    }
    
    // 거래처명으로 검색
    const company = state.companies.find(c => 
        (c.finalCompanyName || c.companyName) === companyName
    );
    
    if (!company) {
        if (window.Toast) {
            window.Toast.error(`❌ 유효하지 않은 거래처입니다: "${companyName}"\n목록에서 선택해주세요.`);
        }
        elements.companySelect.focus();
        return;
    }
    
    // 거래처 확인 성공
    state.selectedCompany = company;
    state.isCompanyVerified = true;
    
    // UI 업데이트
    elements.companySelect.classList.add('verified');
    elements.verifyCompanyBtn.classList.add('verified');
    elements.verifyCompanyBtn.innerHTML = '✅ 확인완료';
    
    // 거래처별 실적 표시
    await loadCompanyGoals(company.keyValue);
    
    if (window.Toast) {
        window.Toast.success(`✅ 거래처 확인 완료: ${companyName}`);
    }
}

// ============================================
// 동적 목표 표시
// ============================================

/**
 * 직원 전체 실적 로드
 */
async function loadEmployeeGoals() {
    try {
        const reportDate = elements.reportDate.value;
        const [year, month] = reportDate.split('-');

        // 사용자 ID 확인
        if (!state.currentUser || !state.currentUser.id) {
            console.error('[Report Write] ❌ 사용자 ID가 없습니다');
            elements.goalDisplaySection.style.display = 'none';
            return;
        }

        console.log('[Report Write] 직원 실적 로드:', { 
            employeeId: state.currentUser.id,
            employeeName: state.currentUser.name,
            year, 
            month 
        });

        // 월간 실적 로드 (연간 실적도 함께 반환됨)
        const response = await apiManager.get(`/goals/employee/${state.currentUser.id}/monthly`, { year, month });

        if (response.success) {
            displayGoals({
                title: '📊 내 전체 실적',
                period: `${year}년 ${month}월`,
                monthly: {
                    collection: {
                        goal: response.goals.monthlyCollectionGoal,
                        actual: response.goals.actualCollection
                    },
                    sales: {
                        goal: response.goals.monthlySalesGoal,
                        actual: response.goals.actualSales
                    }
                },
                annual: {
                    collection: {
                        goal: response.annual.annualCollectionGoal,
                        actual: response.annual.actualCollection
                    },
                    sales: {
                        goal: response.annual.annualSalesGoal,
                        actual: response.annual.actualSales
                    }
                }
            });
        }
    } catch (error) {
        console.error('[Report Write] 직원 실적 로드 에러:', error);
        // 에러 발생 시 목표 섹션 숨김
        elements.goalDisplaySection.style.display = 'none';
    }
}

/**
 * 거래처별 실적 로드
 */
async function loadCompanyGoals(companyId) {
    try {
        const reportDate = elements.reportDate.value;
        const [year, month] = reportDate.split('-');

        console.log('[Report Write] 거래처 실적 로드:', { companyId, year, month });

        const response = await apiManager.get(`/goals/company/${companyId}/monthly`, { year, month });

        if (response.success) {
            displayGoals({
                title: `📊 ${state.selectedCompany.finalCompanyName} 실적`,
                period: `${year}년 ${month}월`,
                monthly: {
                    collection: {
                        goal: response.goals.monthlyCollectionGoal,
                        actual: response.goals.actualCollection
                    },
                    sales: {
                        goal: response.goals.monthlySalesGoal,
                        actual: response.goals.actualSales
                    }
                },
                annual: {
                    collection: {
                        goal: response.annual.annualCollectionGoal,
                        actual: response.annual.actualCollection
                    },
                    sales: {
                        goal: response.annual.annualSalesGoal,
                        actual: response.annual.actualSales
                    }
                }
            });
        }
    } catch (error) {
        console.error('[Report Write] 거래처 실적 로드 에러:', error);
        // 에러 발생 시 직원 전체 실적으로 폴백
        await loadEmployeeGoals();
    }
}

/**
 * 목표 표시
 */
function displayGoals(data) {
    const { title, period, monthly, annual } = data;

    // 제목 및 기간 업데이트
    elements.goalTitle.textContent = title;
    elements.goalPeriod.textContent = period;

    // 연간 실적 표시
    if (annual) {
        updateGoalItem('annualCollection', annual.collection);
        updateGoalItem('annualSales', annual.sales);
    }

    // 월간 실적 표시
    if (monthly) {
        updateGoalItem('monthlyCollection', monthly.collection);
        updateGoalItem('monthlySales', monthly.sales);
    }

    // 목표 표시 섹션 표시
    elements.goalDisplaySection.style.display = 'block';
}

/**
 * 개별 목표 항목 업데이트
 */
function updateGoalItem(prefix, data) {
    const { goal = 0, actual = 0 } = data || {};
    const rate = goal > 0 ? (actual / goal * 100) : 0;

    // 금액 표시
    document.getElementById(`${prefix}Goal`).textContent = formatCurrency(goal);
    document.getElementById(`${prefix}Actual`).textContent = formatCurrency(actual);

    // 달성률 표시
    document.getElementById(`${prefix}Rate`).textContent = `${rate.toFixed(1)}%`;

    // 프로그레스 바 애니메이션
    const progressBar = document.getElementById(`${prefix}Progress`);
    setTimeout(() => {
        progressBar.style.width = `${Math.min(rate, 100)}%`;
    }, 100);
}

/**
 * 통화 포맷 (천 단위 구분)
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('ko-KR').format(amount);
}

// ============================================
// 접기/펼치기 섹션
// ============================================

/**
 * 접기/펼치기 섹션 설정
 */
function setupCollapsibleSections() {
    const collapsibleHeaders = document.querySelectorAll('.section-header.collapsible');

    collapsibleHeaders.forEach((header) => {
        const checkbox = header.querySelector('.section-checkbox');
        const toggleBtn = header.querySelector('.toggle-icon');
        const targetId = header.dataset.target;
        const content = document.getElementById(targetId);

        if (!checkbox) return;

        // 체크박스 변경 이벤트만 사용
        checkbox.addEventListener('change', () => {
            handleSectionCheckbox(header, checkbox.checked);
        });

        // 토글 버튼 클릭
        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();

            const isCurrentlyOpen = content.style.display !== 'none';

            if (isCurrentlyOpen) {
                content.style.display = 'none';
                toggleBtn.classList.remove('open');
                toggleBtn.textContent = '▼';
            } else {
                content.style.display = 'block';
                toggleBtn.classList.add('open');
                toggleBtn.textContent = '▲';
            }
        });
    });
}

/**
 * 섹션 체크박스 핸들러
 */
function handleSectionCheckbox(header, isChecked) {
    const targetId = header.dataset.target;
    const content = document.getElementById(targetId);
    const toggleIcon = header.querySelector('.toggle-icon');

    if (isChecked) {
        // 체크 시 섹션 펼치기
        content.style.display = 'block';
        toggleIcon.classList.add('open');
        toggleIcon.textContent = '▲';
    } else {
        // 체크 해제 시 섹션 접기
        content.style.display = 'none';
        toggleIcon.classList.remove('open');
        toggleIcon.textContent = '▼';
    }
}

// ============================================
// 제품 관리
// ============================================

/**
 * 제품 행 추가
 */
function addProductRow() {
    const productId = state.productIdCounter++;

    const productItem = document.createElement('div');
    productItem.className = 'product-item';
    productItem.dataset.productId = productId;
    productItem.innerHTML = `
        <div class="form-field" style="position: relative;">
            <label class="field-label">제품명 *</label>
            <input type="text" class="glass-input product-name" placeholder="제품명 입력 또는 선택" required autocomplete="off">
            <div class="autocomplete-list product-autocomplete" style="display: none;"></div>
        </div>
        <div class="form-field">
            <label class="field-label">금액 *</label>
            <input type="number" class="glass-input product-amount" min="0" step="1000" placeholder="0" required>
        </div>
        <div class="form-field">
            <label class="field-label">통화</label>
            <select class="glass-input product-currency">
                <option value="KRW" selected>KRW (원)</option>
                <option value="USD">USD (달러)</option>
                <option value="EUR">EUR (유로)</option>
                <option value="JPY">JPY (엔)</option>
            </select>
        </div>
        <div class="form-field">
            <label class="checkbox-label">
                <input type="checkbox" class="product-vat-included" checked>
                <span>부가세포함</span>
            </label>
        </div>
        <div class="form-field">
            <button type="button" class="glass-button danger remove-product-btn" onclick="removeProductRow(${productId})">삭제</button>
        </div>
    `;

    elements.salesProductList.appendChild(productItem);

    // 자동완성 이벤트 연결
    const productNameInput = productItem.querySelector('.product-name');
    const autocompleteList = productItem.querySelector('.product-autocomplete');

    productNameInput.addEventListener('input', (e) => handleProductInput(e, autocompleteList));
    productNameInput.addEventListener('focus', (e) => handleProductFocus(e, autocompleteList));

    // 문서 클릭 시 자동완성 목록 닫기
    document.addEventListener('click', function(e) {
        if (!productNameInput.contains(e.target) && !autocompleteList.contains(e.target)) {
            autocompleteList.style.display = 'none';
        }
    });
}

/**
 * 제품 입력 시 자동완성
 */
function handleProductInput(event, autocompleteList) {
    const inputValue = event.target.value.trim().toLowerCase();

    if (!inputValue) {
        autocompleteList.style.display = 'none';
        return;
    }

    // 제품 필터링
    const filteredProducts = state.products.filter(product =>
        product.productName.toLowerCase().includes(inputValue)
    );

    displayProductAutocomplete(filteredProducts, inputValue, autocompleteList, event.target);
}

/**
 * 제품 포커스 시 전체 목록 표시
 */
function handleProductFocus(event, autocompleteList) {
    const inputValue = event.target.value.trim();

    if (inputValue) {
        handleProductInput(event, autocompleteList);
    } else {
        displayProductAutocomplete(state.products, '', autocompleteList, event.target);
    }
}

/**
 * 제품 자동완성 결과 표시
 */
function displayProductAutocomplete(products, searchTerm, autocompleteList, inputElement) {
    autocompleteList.innerHTML = '';

    if (products.length === 0) {
        const noResult = document.createElement('div');
        noResult.className = 'autocomplete-item';
        noResult.style.cssText = 'color: var(--text-secondary); cursor: default; font-style: italic; padding: 12px;';
        noResult.innerHTML = `
            <div style="text-align: center;">
                <div style="font-size: 14px; margin-bottom: 4px;">🔍 검색 결과 없음</div>
                <div style="font-size: 12px;">입력한 제품명이 저장 시 자동으로 추가됩니다</div>
            </div>
        `;
        autocompleteList.appendChild(noResult);
        autocompleteList.style.display = 'block';
        return;
    }

    // 우선순위 순으로 정렬된 모든 제품 표시 (스크롤 가능)
    products.forEach((product, index) => {
        const item = document.createElement('div');
        item.className = 'autocomplete-item';

        // 우선순위 표시
        let badge = '';
        if (product.priority === 1) {
            badge = '<span style="background: #1976d2; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; margin-left: 6px;">주요</span>';
        } else if (product.priority === 2) {
            badge = '<span style="background: #388e3c; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; margin-left: 6px;">중요</span>';
        }

        // 검색어 하이라이팅
        let displayName = product.productName;
        if (searchTerm) {
            const regex = new RegExp(`(${searchTerm})`, 'gi');
            displayName = product.productName.replace(regex, '<strong style="background: #fff3cd;">$1</strong>');
        }

        item.innerHTML = displayName + badge;

        item.addEventListener('click', () => {
            inputElement.value = product.productName;
            autocompleteList.style.display = 'none';
        });

        autocompleteList.appendChild(item);
    });

    // 안내 메시지 추가 (목록 하단)
    if (searchTerm) {
        const helpItem = document.createElement('div');
        helpItem.className = 'autocomplete-item';
        helpItem.style.cssText = 'background: #f5f5f5; color: #666; font-size: 11px; text-align: center; cursor: default; border-top: 1px solid #e0e0e0;';
        helpItem.textContent = '원하는 제품이 없다면 직접 입력 후 저장하세요';
        autocompleteList.appendChild(helpItem);
    }

    autocompleteList.style.display = 'block';
}

/**
 * 제품 행 삭제 (전역 함수로 노출)
 */
window.removeProductRow = function(productId) {
    const productItem = document.querySelector(`.product-item[data-product-id="${productId}"]`);
    if (productItem) {
        productItem.remove();
    }
};

// ============================================
// 영업활동 모달
// ============================================

/**
 * 활동 모달 열기
 */
function openActivityModal() {
    // 모달 초기화
    elements.modalActivityType.value = '';
    elements.activityFormContainer.innerHTML = '';

    // 모달 표시
    elements.activityModal.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // 배경 스크롤 방지
}

/**
 * 활동 모달 닫기
 */
function closeActivityModal() {
    elements.activityModal.style.display = 'none';
    document.body.style.overflow = ''; // 배경 스크롤 복원

    // 폼 초기화
    elements.modalActivityType.value = '';
    elements.activityFormContainer.innerHTML = '';
}

/**
 * 모달 내 활동 유형 선택 핸들러
 */
function handleModalActivityTypeChange(event) {
    const activityType = event.target.value;

    if (!activityType) {
        elements.activityFormContainer.innerHTML = '';
        return;
    }

    // 선택한 유형의 템플릿 로드
    const templateId = `activity-${activityType}-template`;
    const template = document.getElementById(templateId);

    if (!template) {
        console.error(`템플릿을 찾을 수 없습니다: ${templateId}`);
        return;
    }

    // 템플릿 복제 및 표시
    const clone = template.content.cloneNode(true);
    elements.activityFormContainer.innerHTML = '';
    elements.activityFormContainer.appendChild(clone);

    // 실행자 라디오 버튼 이벤트 바인딩
    bindExecutorRadioEvents(activityType);
}

/**
 * 실행자 라디오 버튼 이벤트 바인딩
 */
function bindExecutorRadioEvents(activityType) {
    const radioName = `${activityType}Executor`;
    const proxyFieldId = `${activityType}ProxyFields`;

    const radios = document.querySelectorAll(`input[name="${radioName}"]`);
    const proxyFields = document.getElementById(proxyFieldId);

    if (!radios.length || !proxyFields) return;

    radios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'proxy') {
                proxyFields.style.display = 'block';
            } else {
                proxyFields.style.display = 'none';
            }
        });
    });
}

/**
 * 활동 저장
 */
function saveActivity() {
    const activityType = elements.modalActivityType.value;

    if (!activityType) {
        if (window.Toast) {
            window.Toast.warning('활동 유형을 선택해주세요');
        }
        return;
    }

    // 유형별 데이터 수집
    const activityData = collectActivityData(activityType);

    if (!activityData) {
        return; // 유효성 검사 실패
    }

    // 활동 목록에 추가
    addActivityToList(activityData);

    // 모달 닫기
    closeActivityModal();

    if (window.Toast) {
        window.Toast.success('활동이 추가되었습니다');
    }
}

/**
 * 활동 데이터 수집
 */
function collectActivityData(activityType) {
    const data = { type: activityType };

    switch (activityType) {
        case 'call':
            const callDate = document.getElementById('callDate')?.value;
            const callTime = document.getElementById('callTime')?.value;
            const callTarget = document.getElementById('callTarget')?.value;
            const callPurpose = document.getElementById('callPurpose')?.value;
            const callExecutor = document.querySelector('input[name="callExecutor"]:checked')?.value;

            if (!callDate || !callTime || !callTarget || !callPurpose) {
                if (window.Toast) {
                    window.Toast.warning('필수 항목을 모두 입력해주세요');
                }
                return null;
            }

            data.date = callDate;
            data.time = callTime;
            data.target = callTarget;
            data.purpose = callPurpose;
            data.executor = callExecutor;

            if (callExecutor === 'proxy') {
                data.proxyName = document.getElementById('callProxyName')?.value;
                data.proxyPhone = document.getElementById('callProxyPhone')?.value;
            }
            break;

        case 'visit':
            const visitDate = document.getElementById('visitDate')?.value;
            const visitLocation = document.getElementById('visitLocation')?.value;
            const visitTarget = document.getElementById('visitTarget')?.value;
            const visitPurpose = document.getElementById('visitPurpose')?.value;
            const visitExecutor = document.querySelector('input[name="visitExecutor"]:checked')?.value;

            if (!visitDate || !visitLocation || !visitTarget || !visitPurpose) {
                if (window.Toast) {
                    window.Toast.warning('필수 항목을 모두 입력해주세요');
                }
                return null;
            }

            data.date = visitDate;
            data.location = visitLocation;
            data.target = visitTarget;
            data.purpose = visitPurpose;
            data.executor = visitExecutor;

            if (visitExecutor === 'proxy') {
                data.proxyName = document.getElementById('visitProxyName')?.value;
            }
            break;

        case 'document':
            const docDate = document.getElementById('docDate')?.value;
            const docMethod = document.getElementById('docMethod')?.value;
            const docName = document.getElementById('docName')?.value;
            const docContent = document.getElementById('docContent')?.value;
            const docExecutor = document.querySelector('input[name="docExecutor"]:checked')?.value;

            if (!docDate || !docMethod || !docName || !docContent) {
                if (window.Toast) {
                    window.Toast.warning('필수 항목을 모두 입력해주세요');
                }
                return null;
            }

            data.date = docDate;
            data.method = docMethod;
            data.name = docName;
            data.content = docContent;
            data.executor = docExecutor;

            if (docExecutor === 'proxy') {
                data.proxyName = document.getElementById('docProxyName')?.value;
            }
            break;

        case 'other':
            const otherContent = document.getElementById('otherContent')?.value;

            if (!otherContent) {
                if (window.Toast) {
                    window.Toast.warning('활동 내용을 입력해주세요');
                }
                return null;
            }

            data.content = otherContent;
            break;
    }

    return data;
}

/**
 * 활동 목록에 추가
 */
let activityIdCounter = 1;

function addActivityToList(activityData) {
    const activityId = activityIdCounter++;

    const activityItem = document.createElement('div');
    activityItem.className = 'activity-item';
    activityItem.dataset.activityId = activityId;

    // 활동 유형별 뱃지 텍스트
    const typeLabels = {
        'call': '📞 전화통화 예정',
        'visit': '🚗 방문예정',
        'document': '📄 문서전달',
        'other': '📝 기타'
    };

    // 활동 요약 생성
    let summary = '';
    switch (activityData.type) {
        case 'call':
            summary = `${activityData.date} ${activityData.time} - ${activityData.target}`;
            break;
        case 'visit':
            summary = `${activityData.date} - ${activityData.location} (${activityData.target})`;
            break;
        case 'document':
            summary = `${activityData.date} - ${activityData.name} (${activityData.method === 'visit' ? '방문' : '이메일'})`;
            break;
        case 'other':
            summary = activityData.content.substring(0, 50) + (activityData.content.length > 50 ? '...' : '');
            break;
    }

    activityItem.innerHTML = `
        <div class="activity-item-content">
            <span class="activity-type-badge">${typeLabels[activityData.type]}</span>
            <div class="activity-summary">${summary}</div>
        </div>
        <button type="button" class="remove-activity-btn" onclick="removeActivity(${activityId})">삭제</button>
    `;

    // 데이터 속성으로 저장
    activityItem.dataset.activityData = JSON.stringify(activityData);

    elements.activityList.appendChild(activityItem);
}

/**
 * 활동 삭제 (전역 함수로 노출)
 */
window.removeActivity = function(activityId) {
    const activityItem = document.querySelector(`.activity-item[data-activity-id="${activityId}"]`);
    if (activityItem) {
        activityItem.remove();

        if (window.Toast) {
            window.Toast.info('활동이 삭제되었습니다');
        }
    }
};

// ============================================
// 폼 처리
// ============================================

/**
 * 폼 제출 핸들러
 */
async function handleSubmit(event) {
    event.preventDefault();

    try {
        // 유효성 검사
        if (!validateForm()) {
            return;
        }

        // 제출 버튼 비활성화
        elements.submitBtn.disabled = true;
        elements.submitBtn.innerHTML = '<span class="btn-icon">⏳</span><span>저장 중...</span>';

        // 폼 데이터 수집 (새 제품 자동 추가 포함)
        const reportData = await collectFormData();

        console.log('[Report Write] 보고서 제출 (원본):', reportData);

        // ⚠️ CRITICAL: 서버가 기대하는 형식으로 데이터 변환
        const serverData = {
            reportId: reportData.reportId,
            submittedBy: reportData.submittedBy,
            submittedDate: reportData.submittedDate,
            companyId: reportData.companyId,
            reportType: reportData.reportType,
            status: reportData.status,

            // 목표 수금 금액 (숫자로 변환)
            targetCollectionAmount: reportData.targetCollection
                ? reportData.targetCollection.amount
                : null,

            // 목표 매출 금액 (숫자로 변환)
            targetSalesAmount: reportData.targetSales
                ? reportData.targetSales.totalAmount
                : null,

            // 제품 목록 (JSON 문자열로 직렬화)
            targetProducts: reportData.targetSales
                ? JSON.stringify(reportData.targetSales.products)
                : null,

            // 영업 활동 (JSON 문자열로 직렬화)
            activityNotes: reportData.activities
                ? JSON.stringify(reportData.activities)
                : null
        };

        console.log('[Report Write] 서버 전송 데이터:', serverData);
        console.log('[Report Write] 📊 상세:');
        console.log('  - reportId:', serverData.reportId, typeof serverData.reportId);
        console.log('  - submittedBy:', serverData.submittedBy, typeof serverData.submittedBy);
        console.log('  - submittedDate:', serverData.submittedDate, typeof serverData.submittedDate);
        console.log('  - companyId:', serverData.companyId, typeof serverData.companyId);
        console.log('  - reportType:', serverData.reportType, typeof serverData.reportType);
        console.log('  - status:', serverData.status, typeof serverData.status);
        console.log('  - targetCollectionAmount:', serverData.targetCollectionAmount, typeof serverData.targetCollectionAmount);
        console.log('  - targetSalesAmount:', serverData.targetSalesAmount, typeof serverData.targetSalesAmount);
        console.log('  - targetProducts:', serverData.targetProducts, typeof serverData.targetProducts);
        console.log('  - activityNotes:', serverData.activityNotes, typeof serverData.activityNotes);

        // API 호출
        const response = await apiManager.createReport(serverData);

        if (response.success) {
            if (window.Toast) {
                window.Toast.success('보고서가 성공적으로 저장되었습니다');
            }

            // 폼 초기화 (확인 메시지 없이 자동 초기화)
            setTimeout(() => {
                handleReset(true);  // skipConfirm = true
            }, 1000);
        } else {
            throw new Error(response.message || '보고서 저장 실패');
        }

    } catch (error) {
        console.error('[Report Write] 보고서 제출 에러:', error);

        if (window.Toast) {
            window.Toast.error('보고서 저장에 실패했습니다: ' + error.message);
        }

        // 제출 버튼 복원
        elements.submitBtn.disabled = false;
        elements.submitBtn.innerHTML = '<span class="btn-icon">💾</span><span>저장</span>';
    }
}

/**
 * 폼 유효성 검사
 */
function validateForm() {
    // 보고서 유형 확인
    if (!elements.reportType.value) {
        if (window.Toast) {
            window.Toast.warning('보고서 유형을 선택해주세요');
        }
        elements.reportType.focus();
        return false;
    }

    // 거래처 선택 확인
    const companyName = elements.companySelect.value.trim();
    if (!companyName) {
        if (window.Toast) {
            window.Toast.warning('거래처를 선택하거나 입력해주세요');
        }
        elements.companySelect.focus();
        return false;
    }

    // 입력한 거래처가 리스트에 있는지 확인
    const company = state.companies.find(c => 
        (c.finalCompanyName || c.companyName) === companyName
    );
    if (!company) {
        if (window.Toast) {
            window.Toast.warning('유효하지 않은 거래처입니다. 목록에서 선택해주세요.');
        }
        elements.companySelect.focus();
        return false;
    }
    
    // 거래처 확인 여부 검증
    if (!state.isCompanyVerified) {
        if (window.Toast) {
            window.Toast.warning('⚠️ 거래처 확인을 먼저 해주세요. "✅ 확인" 버튼을 클릭하세요.');
        }
        elements.companySelect.focus();
        return false;
    }

    // 최소 하나의 섹션 활성화 확인
    const hasTargetCollection = elements.enableTargetCollection.checked;
    const hasTargetSales = elements.enableTargetSales.checked;
    const hasActivity = elements.enableActivity.checked;

    if (!hasTargetCollection && !hasTargetSales && !hasActivity) {
        if (window.Toast) {
            window.Toast.warning('최소 하나의 항목을 입력해주세요');
        }
        return false;
    }

    // 목표수금금액 검증
    if (hasTargetCollection) {
        const amount = parseFloat(elements.targetCollectionAmount.value);
        if (!amount || amount <= 0) {
            if (window.Toast) {
                window.Toast.warning('목표수금금액을 입력해주세요');
            }
            elements.targetCollectionAmount.focus();
            return false;
        }
    }

    // 목표매출액 검증
    if (hasTargetSales) {
        const products = elements.salesProductList.querySelectorAll('.product-item');
        if (products.length === 0) {
            if (window.Toast) {
                window.Toast.warning('제품을 추가해주세요');
            }
            return false;
        }

        // 각 제품의 필수 필드 검증
        for (const product of products) {
            const name = product.querySelector('.product-name').value.trim();
            const amount = parseFloat(product.querySelector('.product-amount').value);

            if (!name) {
                if (window.Toast) {
                    window.Toast.warning('제품명을 입력해주세요');
                }
                product.querySelector('.product-name').focus();
                return false;
            }

            if (!amount || amount <= 0) {
                if (window.Toast) {
                    window.Toast.warning('금액을 입력해주세요');
                }
                product.querySelector('.product-amount').focus();
                return false;
            }
        }
    }

    // 영업활동 검증
    if (hasActivity) {
        const activities = elements.activityList.querySelectorAll('.activity-item');
        if (activities.length === 0) {
            if (window.Toast) {
                window.Toast.warning('최소 하나의 활동을 추가해주세요');
            }
            return false;
        }
    }

    return true;
}

/**
 * 폼 데이터 수집
 */
async function collectFormData() {
    // 거래처명으로 keyValue 찾기
    const companyName = elements.companySelect.value.trim();
    const company = state.companies.find(c =>
        (c.finalCompanyName || c.companyName) === companyName
    );

    if (!company) {
        throw new Error('유효하지 않은 거래처입니다');
    }

    // ⚠️ CRITICAL: 서버가 요구하는 필드명 매칭
    // reportId: UUID 생성
    // submittedBy: 사원 ID (employeeId 대신)
    // submittedDate: 제출 날짜/시간
    // companyId: 거래처 ID

    // UUID 생성 함수
    const generateUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };

    // MySQL 호환 DATETIME 형식으로 변환 (YYYY-MM-DD HH:MM:SS)
    const toMySQLDateTime = (date) => {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const seconds = String(d.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    };

    const now = toMySQLDateTime(new Date());

    const data = {
        reportId: generateUUID(),               // 서버 필수: 보고서 고유 ID
        reportDate: elements.reportDate.value,  // 보고 대상 날짜
        reportType: elements.reportType.value,  // 보고서 유형 (weekly/monthly/yearly)
        companyId: company.keyValue,            // 서버 필수: 거래처 ID (문자열 UUID)
        submittedBy: state.currentUser.name,    // 서버 필수: 제출자 이름 (employees.name 외래키)
        submittedDate: now,                     // 서버 필수: 제출 날짜/시간 (MySQL DATETIME 형식)
        employeeName: state.currentUser.name,   // 제출자 이름
        status: '임시저장'                      // 승인 상태 (임시저장/제출완료/승인/반려)
    };

    // 목표수금금액
    if (elements.enableTargetCollection.checked) {
        data.targetCollection = {
            amount: parseFloat(elements.targetCollectionAmount.value),
            currency: elements.targetCollectionCurrency.value
        };
    }

    // 목표매출액
    if (elements.enableTargetSales.checked) {
        data.targetSales = {
            products: []
        };

        const products = elements.salesProductList.querySelectorAll('.product-item');

        // 각 제품 처리 (새 제품은 자동 추가)
        for (const product of products) {
            const name = product.querySelector('.product-name').value.trim();
            const normalizedName = name.replace(/\s+/g, ' '); // 공백 정규화
            const amount = parseFloat(product.querySelector('.product-amount').value);
            const currency = product.querySelector('.product-currency').value;
            const vatIncluded = product.querySelector('.product-vat-included').checked;

            // 제품이 데이터베이스에 존재하는지 확인 (대소문자 구분 없이)
            const existingProduct = state.products.find(p =>
                p.productName.toLowerCase() === normalizedName.toLowerCase()
            );

            // 존재하지 않으면 추가
            if (!existingProduct) {
                console.log(`[Report Write] 새 제품 추가: ${normalizedName}`);
                try {
                    const response = await apiManager.addProduct(normalizedName);
                    if (response.success && !response.isExisting) {
                        state.products.push(response.data);
                        console.log(`[Report Write] ✅ 제품 추가 성공: ${normalizedName}`);
                    }
                } catch (error) {
                    console.error(`[Report Write] 제품 추가 실패: ${normalizedName}`, error);
                    // 실패해도 계속 진행 (보고서 작성은 허용)
                }
            }

            // 부가세 제외 금액 계산
            const amountExcludingVat = vatIncluded ? amount / 1.1 : amount;

            data.targetSales.products.push({
                name: normalizedName,
                amount,
                currency,
                vatIncluded,
                amountExcludingVat
            });
        }

        // 총 매출액 계산 (부가세 제외 금액으로 합산)
        data.targetSales.totalAmount = data.targetSales.products.reduce(
            (sum, p) => sum + p.amountExcludingVat,
            0
        );
    }

    // 영업활동
    if (elements.enableActivity.checked) {
        const activityItems = elements.activityList.querySelectorAll('.activity-item');
        data.activities = [];

        activityItems.forEach(item => {
            const activityData = JSON.parse(item.dataset.activityData);
            data.activities.push(activityData);
        });
    }

    return data;
}

/**
 * 폼 초기화 핸들러
 * @param {boolean} skipConfirm - true일 경우 확인 메시지 건너뛰기 (저장 성공 후 자동 초기화용)
 */
function handleReset(skipConfirm = false) {
    if (!skipConfirm && !confirm('모든 내용을 초기화하시겠습니까?')) {
        return;
    }

    // 폼 리셋 (날짜와 거래처는 유지)
    const currentDate = elements.reportDate.value;
    const currentCompany = elements.companySelect.value; // 거래처명

    elements.reportForm.reset();

    elements.reportDate.value = currentDate;
    elements.companySelect.value = currentCompany; // input에 거래처명 복원

    // 모든 섹션 체크 해제 및 접기
    elements.enableTargetCollection.checked = false;
    elements.enableTargetSales.checked = false;
    elements.enableActivity.checked = false;

    elements.targetCollectionContent.style.display = 'none';
    elements.targetSalesContent.style.display = 'none';
    elements.activityContent.style.display = 'none';

    document.querySelectorAll('.toggle-icon').forEach(icon => {
        icon.classList.remove('open');
    });

    // 제품 목록 초기화
    elements.salesProductList.innerHTML = '';
    state.productIdCounter = 1;

    // 방문 세부 정보 숨김
    elements.visitDetails.style.display = 'none';
    elements.proxyField.style.display = 'none';

    if (window.Toast) {
        window.Toast.info('폼이 초기화되었습니다');
    }
}

/**
 * 취소 핸들러
 */
function handleCancel() {
    if (confirm('작성을 취소하시겠습니까?')) {
        window.history.back();
    }
}

// ============================================
// 페이지 로드 시 초기화
// ============================================

/**
 * 초기화 실행 함수
 */
async function runInitialization() {
    console.log('[Report Write] 초기화 시작');

    try {
        // API Manager 초기화
        await apiManager.init();
        console.log('[Report Write] API Manager 초기화 완료');

        // DOM 요소 캐싱
        cacheElements();
        console.log('[Report Write] DOM 요소 캐싱 완료');

        // 이벤트 리스너 연결
        attachEventListeners();
        console.log('[Report Write] 이벤트 리스너 연결 완료');

        // 페이지 초기화 (거래처 목록 로드 포함)
        await initializePage();
        console.log('[Report Write] 페이지 초기화 완료');

    } catch (error) {
        console.error('[Report Write] 초기화 중 오류 발생:', error);
        if (window.Toast) {
            window.Toast.error('페이지 초기화에 실패했습니다');
        }
    }
}

// DOM이 이미 로드되었는지 확인
if (document.readyState === 'loading') {
    // 아직 로딩 중이면 DOMContentLoaded 이벤트 대기
    document.addEventListener('DOMContentLoaded', runInitialization);
    console.log('[Report Write] DOMContentLoaded 이벤트 등록');
} else {
    // 이미 로드되었으면 즉시 실행
    console.log('[Report Write] DOM 이미 로드됨 - 즉시 초기화 실행');
    runInitialization();
}
