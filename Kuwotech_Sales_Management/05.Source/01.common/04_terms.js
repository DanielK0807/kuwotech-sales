// ============================================
// [MODULE: 한국어 용어 정의]
// 파일 위치: 05.Source/01.common/08_terms.js
// 구체적 내용: 시스템 전체 한국어 용어 정의
// ============================================

// ============================================
// [SECTION: 비즈니스 용어]
// ============================================

export const BUSINESS_TERMS = {
    // 거래처 관련
    "고객": "거래처",
    "클라이언트": "거래처",
    "customer": "거래처",
    "client": "거래처",
    "company": "거래처",
    "account": "거래처",
    
    // 상태 관련
    "활성": "활동중",
    "비활성": "중단",
    "대기": "보류",
    "active": "활성",
    "inactive": "비활성",
    "pending": "대기",
    "suspended": "중단",
    
    // 매출 관련
    "매출": "판매액",
    "수익": "매출액",
    "revenue": "매출",
    "sales": "매출",
    "income": "수익",
    "profit": "이익",
    
    // 직급 관련
    "매니저": "담당자",
    "영업사원": "영업담당",
    "관리자": "관리자",
    "대표": "대표이사",
    "부장": "부장",
    "차장": "차장",
    "과장": "과장",
    "대리": "대리",
    "사원": "직원",
    
    // 부서 관련
    "영업부": "영업팀",
    "관리부": "경영지원팀",
    "개발부": "개발팀",
    "마케팅부": "마케팅팀",
    "sales": "영업",
    "management": "관리",
    "development": "개발",
    "marketing": "마케팅"
};

// ============================================
// [SECTION: UI/UX 용어]
// ============================================

export const UI_TERMS = {
    // 버튼 관련
    "submit": "제출",
    "cancel": "취소",
    "confirm": "확인",
    "save": "저장",
    "delete": "삭제",
    "edit": "수정",
    "add": "추가",
    "search": "검색",
    "reset": "초기화",
    "close": "닫기",
    
    // 메시지 관련
    "success": "성공",
    "error": "오류",
    "warning": "경고",
    "info": "정보",
    "loading": "로딩중",
    "processing": "처리중",
    
    // 네비게이션 관련
    "dashboard": "대시보드",
    "home": "홈",
    "back": "뒤로",
    "next": "다음",
    "previous": "이전",
    "first": "처음",
    "last": "마지막",
    
    // 필터/정렬 관련
    "filter": "필터",
    "sort": "정렬",
    "ascending": "오름차순",
    "descending": "내림차순",
    "all": "전체",
    "none": "없음",
    "select": "선택"
};

// ============================================
// [SECTION: 시스템 메시지]
// ============================================

export const SYSTEM_MESSAGES = {
    // 성공 메시지
    LOGIN_SUCCESS: "로그인에 성공했습니다.",
    SAVE_SUCCESS: "저장이 완료되었습니다.",
    UPDATE_SUCCESS: "수정이 완료되었습니다.",
    DELETE_SUCCESS: "삭제가 완료되었습니다.",
    UPLOAD_SUCCESS: "업로드가 완료되었습니다.",
    
    // 오류 메시지
    LOGIN_FAILED: "로그인에 실패했습니다. 다시 시도해주세요.",
    SAVE_FAILED: "저장에 실패했습니다. 다시 시도해주세요.",
    NETWORK_ERROR: "네트워크 연결을 확인해주세요.",
    PERMISSION_DENIED: "권한이 없습니다.",
    SESSION_EXPIRED: "세션이 만료되었습니다. 다시 로그인해주세요.",
    
    // 확인 메시지
    DELETE_CONFIRM: "정말로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.",
    LOGOUT_CONFIRM: "로그아웃하시겠습니까?",
    SAVE_CONFIRM: "변경사항을 저장하시겠습니까?",
    CANCEL_CONFIRM: "작성 중인 내용이 사라집니다. 계속하시겠습니까?",
    
    // 안내 메시지
    LOADING: "데이터를 불러오는 중입니다...",
    PROCESSING: "처리 중입니다. 잠시만 기다려주세요...",
    NO_DATA: "표시할 데이터가 없습니다.",
    REQUIRED_FIELD: "필수 입력 항목입니다.",
    INVALID_FORMAT: "올바른 형식이 아닙니다."
};

// ============================================
// [SECTION: 데이터 필드 라벨]
// ============================================

export const FIELD_LABELS = {
    // === Employee 필드 (employees 테이블) ===
    id: "직원ID",
    name: "이름",
    email: "이메일",
    role1: "역할",
    role2: "역할2",
    department: "부서",
    hireDate: "입사일",
    phone: "전화번호",
    status: "재직상태",
    canUploadExcel: "엑셀업로드권한",

    // === Company 필드 (companies 테이블) ===
    keyValue: "거래처ID",
    erpCompanyName: "거래처명(ERP)",
    finalCompanyName: "최종거래처명",
    isClosed: "폐업여부",
    ceoOrDentist: "대표자/의사",
    customerRegion: "고객사지역",
    internalManager: "내부담당자",
    accumulatedCollection: "누적수금금액",
    accumulatedSales: "누적매출금액",
    accountsReceivable: "매출채권잔액",
    activityNotes: "영업활동내역",
    businessStatus: "거래상태",
    salesProduct: "판매제품",
    lastPaymentDate: "마지막결제일",
    lastPaymentAmount: "마지막결제금액",

    // === Report 필드 (reports 테이블) ===
    reportId: "보고서ID",
    submittedBy: "작성자",
    submittedDate: "제출일",
    companyId: "거래처ID",
    targetCollectionAmount: "목표수금금액",
    targetSalesAmount: "목표매출액",
    actualSalesAmount: "실제매출금액",
    actualCollectionAmount: "실제수금금액",
    processedBy: "처리자",
    adminComment: "관리자코멘트",

    // === 기타 공통 필드 ===
    registrationDate: "등록일",
    modifiedDate: "수정일",
    createdAt: "생성일시",
    updatedAt: "수정일시",
    notes: "비고",
    priority: "우선순위"
};

// ============================================
// [SECTION: KPI 용어]
// ============================================

export const KPI_TERMS = {
    // 영업 KPI
    totalCompanies: "전체 거래처",
    activeCompanies: "활성 거래처",
    inactiveCompanies: "비활성 거래처",
    activationRate: "활성화율",
    newCompanies: "신규 거래처",
    lostCompanies: "이탈 거래처",
    
    // 매출 KPI
    totalSales: "전체 매출",
    monthlyGrowth: "월 성장률",
    quarterlyGrowth: "분기 성장률",
    yearlyGrowth: "연간 성장률",
    averageSales: "평균 매출",
    salesTarget: "매출 목표",
    achievementRate: "달성률",
    
    // 제품 KPI
    productSales: "제품별 매출",
    productRatio: "제품 비율",
    topProducts: "인기 제품",
    productGrowth: "제품 성장률",
    
    // 기여도 KPI
    contribution: "기여도",
    teamContribution: "팀 기여도",
    individualContribution: "개인 기여도",
    productContribution: "제품 기여도"
};

// ============================================
// [SECTION: 용어 변환 함수]
// ============================================

/**
 * [기능: 영어를 한국어로 변환]
 * @param {string} text - 변환할 텍스트
 * @returns {string} 변환된 텍스트
 */
export function translateToKorean(text) {
    if (!text) return '';
    
    // 모든 용어 사전 병합
    const allTerms = {
        ...BUSINESS_TERMS,
        ...UI_TERMS,
        ...FIELD_LABELS,
        ...KPI_TERMS
    };
    
    // 대소문자 구분 없이 검색
    const lowerText = text.toLowerCase();
    
    for (const [key, value] of Object.entries(allTerms)) {
        if (key.toLowerCase() === lowerText) {
            return value;
        }
    }
    
    return text; // 매칭되지 않으면 원본 반환
}

/**
 * [기능: 한국어를 영어로 변환]
 * @param {string} text - 변환할 텍스트
 * @returns {string} 변환된 텍스트
 */
export function translateToEnglish(text) {
    if (!text) return '';
    
    // 모든 용어 사전 병합 (역방향)
    const allTerms = {
        ...BUSINESS_TERMS,
        ...UI_TERMS,
        ...FIELD_LABELS,
        ...KPI_TERMS
    };
    
    // 값을 키로 역매핑
    for (const [key, value] of Object.entries(allTerms)) {
        if (value === text) {
            return key;
        }
    }
    
    return text; // 매칭되지 않으면 원본 반환
}

/**
 * [기능: 필드명을 한국어 라벨로 변환]
 * @param {string} fieldName - 필드명
 * @returns {string} 한국어 라벨
 */
export function getFieldLabel(fieldName) {
    return FIELD_LABELS[fieldName] || fieldName;
}

/**
 * [기능: 시스템 메시지 가져오기]
 * @param {string} messageKey - 메시지 키
 * @param {Object} params - 치환 파라미터
 * @returns {string} 메시지
 */
export function getMessage(messageKey, params = {}) {
    let message = SYSTEM_MESSAGES[messageKey] || messageKey;
    
    // 파라미터 치환
    for (const [key, value] of Object.entries(params)) {
        message = message.replace(`{${key}}`, value);
    }
    
    return message;
}

/**
 * [기능: 용어 사전 확장]
 * @param {Object} customTerms - 추가할 용어들
 */
export function extendTerms(customTerms = {}) {
    Object.assign(BUSINESS_TERMS, customTerms);
    console.log('[용어] 사전 확장 완료', customTerms);
}

// ============================================
// [SECTION: 용어 검색]
// ============================================

/**
 * [기능: 용어 검색]
 * @param {string} keyword - 검색 키워드
 * @returns {Array} 매칭된 용어들
 */
export function searchTerms(keyword) {
    if (!keyword) return [];
    
    const results = [];
    const lowerKeyword = keyword.toLowerCase();
    
    // 모든 용어 사전에서 검색
    const allSources = [
        { name: '비즈니스', terms: BUSINESS_TERMS },
        { name: 'UI/UX', terms: UI_TERMS },
        { name: '필드', terms: FIELD_LABELS },
        { name: 'KPI', terms: KPI_TERMS }
    ];
    
    allSources.forEach(source => {
        for (const [key, value] of Object.entries(source.terms)) {
            if (key.toLowerCase().includes(lowerKeyword) || 
                value.toLowerCase().includes(lowerKeyword)) {
                results.push({
                    category: source.name,
                    original: key,
                    translated: value
                });
            }
        }
    });
    
    return results;
}

// ============================================
// [SECTION: 초기화]
// ============================================

/**
 * [기능: 용어 시스템 초기화]
 */
export function initTerms() {
    // 전역 객체에 용어 함수 등록 (선택적)
    window.terms = {
        translate: translateToKorean,
        getLabel: getFieldLabel,
        getMessage: getMessage
    };
    
    console.log('[용어] 시스템 초기화 완료');
    console.log(`[용어] 총 ${Object.keys({...BUSINESS_TERMS, ...UI_TERMS, ...FIELD_LABELS, ...KPI_TERMS}).length}개 용어 등록됨`);
}

// 페이지 로드 시 자동 초기화
document.addEventListener('DOMContentLoaded', initTerms);

// ============================================
// [SECTION: 기본 내보내기]
// ============================================

export default {
    // 용어 사전
    BUSINESS_TERMS,
    UI_TERMS,
    SYSTEM_MESSAGES,
    FIELD_LABELS,
    KPI_TERMS,
    
    // 변환 함수
    translateToKorean,
    translateToEnglish,
    getFieldLabel,
    getMessage,
    extendTerms,
    searchTerms,
    initTerms
};

// [내용: 한국어 용어 정의]
// 테스트 계획: 용어 변환, 메시지 처리, 검색
// #용어 #번역
