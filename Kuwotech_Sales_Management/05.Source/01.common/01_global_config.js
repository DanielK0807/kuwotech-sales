// ============================================
// [MODULE: 전역 설정 - 모든 공통 설정 중앙화]
// 파일 위치: 05.Source/01.common/00_global_config.js
// 작성일: 2025-01-27
// 수정일: 2025-01-27
// 설명: 시스템 전체에서 사용하는 모든 설정을 중앙화
// ============================================

// ============================================
// [SECTION 1: 시스템 기본 설정]
// ============================================
export const SYSTEM = {
  NAME: "KUWOTECH 영업관리 시스템",
  VERSION: "1.0.0",
  COMPANY: "KUWOTECH",
  CREATOR: "Daniel.K",
  CONTACT: "kinggo0807@hotmail.com",
  OWNER: "Kang Jung Hwan",
  LOCALE: "ko-KR",
  TIMEZONE: "Asia/Seoul",
  ENCODING: "UTF-8",

  // 로고 경로
  LOGO: {
    PATH: "../../02.Fonts_Logos/logo.png",
    ALT: "KUWOTECH",
    WIDTH: "auto",
    HEIGHT: "40px",
    FAVICON: "../../02.Fonts_Logos/favicon.ico",
  },

  // 글꼴 설정
  FONTS: {
    PRIMARY:
      "'Paperlogy', 'Noto Sans KR', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    SECONDARY: "'Nanum Gothic', 'Malgun Gothic', sans-serif",
    CODE: "'D2Coding', 'Consolas', 'Monaco', monospace",
    // 글꼴 크기
    SIZE: {
      XS: "12px",
      SM: "14px",
      BASE: "16px",
      LG: "18px",
      XL: "20px",
      XXL: "24px",
      XXXL: "32px",
    },
    // 글꼴 굵기
    WEIGHT: {
      LIGHT: 300,
      NORMAL: 400,
      MEDIUM: 500,
      SEMIBOLD: 600,
      BOLD: 700,
      EXTRABOLD: 800,
    },
    // 줄 높이
    LINE_HEIGHT: {
      TIGHT: 1.2,
      NORMAL: 1.5,
      RELAXED: 1.75,
      LOOSE: 2,
    },
  },
};

// ============================================
// [SECTION 2: 숫자 형식 설정]
// ============================================
export const NUMBER_FORMAT = {
  // 천단위 구분자
  THOUSANDS_SEPARATOR: ",",
  DECIMAL_SEPARATOR: ".",

  // 통화 설정
  CURRENCY: {
    SYMBOL: "₩",
    POSITION: "prefix", // prefix | suffix
    SPACE: false, // 기호와 숫자 사이 공백
    DECIMALS: 0, // 소수점 자리수
    FORMAT: (value) => {
      const formatted = Number(value).toLocaleString("ko-KR");
      return `₩${formatted}`;
    },
  },

  // 퍼센트 설정
  PERCENT: {
    DECIMALS: 1, // 기본 소수점 자리수
    SYMBOL: "%",
    FORMAT: (value, decimals = 1) => {
      return `${Number(value).toFixed(decimals)}%`;
    },
  },

  // 숫자 포맷 함수
  FORMAT_NUMBER: (num) => {
    if (num === null || num === undefined) return "0";
    return Number(num).toLocaleString("ko-KR");
  },

  // 소수점 포맷 함수
  FORMAT_DECIMAL: (num, decimals = 2) => {
    if (num === null || num === undefined) return "0";
    return Number(num).toFixed(decimals);
  },
};

// ============================================
// [SECTION 3: 날짜/시간 형식 설정]
// ============================================
export const DATE_TIME_FORMAT = {
  // 날짜 형식
  DATE: {
    SHORT: "YYYY-MM-DD",
    LONG: "YYYY년 MM월 DD일",
    WITH_DAY: "YYYY-MM-DD (ddd)",
    FULL: "YYYY년 MM월 DD일 dddd",
  },

  // 시간 형식
  TIME: {
    SHORT: "HH:mm",
    MEDIUM: "HH:mm:ss",
    LONG: "HH시 mm분 ss초",
    TWELVE_HOUR: "A h:mm",
  },

  // 날짜시간 형식
  DATETIME: {
    SHORT: "YYYY-MM-DD HH:mm",
    LONG: "YYYY년 MM월 DD일 HH:mm:ss",
  },

  // 요일 배열
  WEEKDAYS: ["일", "월", "화", "수", "목", "금", "토"],
  WEEKDAYS_LONG: [
    "일요일",
    "월요일",
    "화요일",
    "수요일",
    "목요일",
    "금요일",
    "토요일",
  ],
};

// ============================================
// [SECTION 4: 시계 표시 설정]
// ============================================
export const CLOCK_CONFIG = {
  // 시계 표시 형식
  FORMAT: "YYYY년 MM월 DD일 (ddd) HH:mm:ss",
  UPDATE_INTERVAL: 1000, // 1초마다 업데이트

  // 시계 스타일
  STYLE: {
    fontSize: "14px",
    fontWeight: "500",
    color: "#ffffff",
    background: "rgba(0, 0, 0, 0.3)",
    padding: "8px 16px",
    borderRadius: "4px",
    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
  },

  // 위치 설정
  POSITION: {
    top: "20px",
    right: "20px",
    position: "fixed",
    zIndex: 9999,
  },

  // 표시 옵션
  OPTIONS: {
    showDate: true,
    showTime: true,
    showSeconds: true,
    showWeekday: true,
    use24Hour: true,
  },
};

// ============================================
// [SECTION 5: 스크롤 설정]
// ============================================
export const SCROLL_CONFIG = {
  // 스크롤바 스타일
  SCROLLBAR: {
    width: "8px",
    height: "8px",
    trackColor: "#2a2a2a",
    thumbColor: "#555555",
    thumbHoverColor: "#777777",
    borderRadius: "4px",
  },

  // 스무스 스크롤 설정
  SMOOTH: {
    enabled: true,
    duration: 300,
    easing: "cubic-bezier(0.4, 0.0, 0.2, 1)",
    offset: 0, // 고정 헤더 높이만큼 오프셋
  },

  // 스크롤 애니메이션
  ANIMATION: {
    fadeIn: true,
    fadeInDelay: 100,
    fadeInDuration: 500,
  },

  // 무한 스크롤
  INFINITE: {
    threshold: 200, // 하단에서 200px 전에 로드
    pageSize: 20,
  },
};

// ============================================
// [SECTION 6: 모달창 설정]
// ============================================
export const MODAL_CONFIG = {
  // 모달 기본 스타일
  STYLE: {
    background: "#2d2d2d",
    border: "1px solid #444444",
    borderRadius: "8px",
    padding: "30px",
    maxWidth: "600px",
    maxHeight: "80vh",
    overflow: "auto",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.5)",
  },

  // 배경 오버레이
  OVERLAY: {
    background: "rgba(0, 0, 0, 0.7)",
    backdropFilter: "blur(2px)",
    zIndex: 9998,
  },

  // 애니메이션
  ANIMATION: {
    show: {
      duration: 300,
      easing: "ease-out",
      from: { opacity: 0, transform: "translate(-50%, -48%)" },
      to: { opacity: 1, transform: "translate(-50%, -50%)" },
    },
    hide: {
      duration: 200,
      easing: "ease-in",
    },
  },

  // 모달 옵션
  OPTIONS: {
    closeOnEsc: true,
    closeOnOverlayClick: true,
    showCloseButton: true,
    preventScroll: true, // 모달 열릴 때 body 스크롤 방지
    focusTrap: true, // 포커스 트랩
  },

  // 모달 사이즈 프리셋
  SIZES: {
    small: { width: "400px" },
    medium: { width: "600px" },
    large: { width: "800px" },
    xlarge: { width: "1000px" },
    full: { width: "90vw", height: "90vh" },
  },
};

// ============================================
// [SECTION 7: 토스트 메시지 설정]
// ============================================
export const TOAST_CONFIG = {
  // 토스트 위치
  POSITION: "top-right", // top-left | top-center | top-right | bottom-left | bottom-center | bottom-right

  // 표시 시간
  DURATION: {
    short: 2000,
    medium: 3000,
    long: 5000,
    permanent: 0, // 0이면 자동으로 사라지지 않음
  },

  // 스타일
  STYLE: {
    minWidth: "300px",
    maxWidth: "500px",
    padding: "16px",
    borderRadius: "8px",
    fontSize: "14px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
  },

  // 타입별 색상
  TYPES: {
    success: {
      background: "#4CAF50",
      color: "#ffffff",
      icon: "✓",
    },
    error: {
      background: "#F44336",
      color: "#ffffff",
      icon: "✕",
    },
    warning: {
      background: "#FF9800",
      color: "#ffffff",
      icon: "⚠",
    },
    info: {
      background: "#2196F3",
      color: "#ffffff",
      icon: "ℹ",
    },
  },

  // 애니메이션
  ANIMATION: {
    show: "slideIn 0.3s ease-out",
    hide: "slideOut 0.2s ease-in",
  },

  // 최대 표시 개수
  MAX_COUNT: 5,

  // 스택 방식
  STACK: true, // true: 위로 쌓임, false: 기존 것 교체
  STACK_SPACING: 10, // 스택 간격
};

// ============================================
// [SECTION 8: 로딩 표시 설정]
// ============================================
export const LOADING_CONFIG = {
  // 로딩 오버레이
  OVERLAY: {
    background: "rgba(0, 0, 0, 0.8)",
    backdropFilter: "blur(2px)",
    zIndex: 10000,
  },

  // 스피너 스타일
  SPINNER: {
    size: "50px",
    borderWidth: "4px",
    borderColor: "#ffffff",
    borderTopColor: "transparent",
    animationDuration: "1s",
  },

  // 로딩 텍스트
  TEXT: {
    default: "처리 중...",
    loading: "데이터를 불러오는 중...",
    saving: "저장 중...",
    deleting: "삭제 중...",
    uploading: "업로드 중...",
    downloading: "다운로드 중...",
  },

  // 최소 표시 시간
  MIN_DURATION: 500, // 최소 0.5초는 표시

  // 자동 숨김
  AUTO_HIDE: true,
  AUTO_HIDE_DELAY: 300, // 작업 완료 후 0.3초 후 숨김
};

// ============================================
// [SECTION 9: 애니메이션 설정]
// ============================================
export const ANIMATION_CONFIG = {
  // 기본 지속 시간
  DURATION: {
    instant: 0,
    fast: 200,
    normal: 300,
    slow: 500,
    verySlow: 1000,
  },

  // 이징 함수
  EASING: {
    linear: "linear",
    ease: "ease",
    easeIn: "ease-in",
    easeOut: "ease-out",
    easeInOut: "ease-in-out",
    cubic: "cubic-bezier(0.4, 0.0, 0.2, 1)",
    bounce: "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
  },

  // 페이드 효과
  FADE: {
    duration: 300,
    easing: "ease-in-out",
  },

  // 슬라이드 효과
  SLIDE: {
    duration: 300,
    easing: "ease-out",
  },

  // 확대/축소 효과
  SCALE: {
    duration: 200,
    easing: "ease-out",
    hoverScale: 1.05,
    activeScale: 0.95,
  },
};

// ============================================
// [SECTION 10: 입력 필드 설정]
// ============================================
export const INPUT_CONFIG = {
  // 기본 스타일
  STYLE: {
    background: "#1a1a1a",
    color: "#ffffff",
    border: "1px solid #444444",
    borderRadius: "4px",
    padding: "10px 12px",
    fontSize: "14px",
    transition: "all 0.3s ease",
  },

  // 포커스 스타일
  FOCUS: {
    borderColor: "var(--primary-color)",
    boxShadow: "0 0 0 2px var(--primary-alpha)",
    outline: "none",
  },

  // 에러 스타일
  ERROR: {
    borderColor: "#F44336",
    background: "rgba(244, 67, 54, 0.1)",
  },

  // 비활성화 스타일
  DISABLED: {
    opacity: 0.5,
    cursor: "not-allowed",
    background: "#0a0a0a",
  },

  // 유효성 검사 메시지
  VALIDATION: {
    required: "필수 입력 항목입니다.",
    email: "올바른 이메일 형식이 아닙니다.",
    phone: "올바른 전화번호 형식이 아닙니다.",
    number: "숫자만 입력 가능합니다.",
    minLength: "최소 {min}자 이상 입력해주세요.",
    maxLength: "최대 {max}자까지 입력 가능합니다.",
  },
};

// ============================================
// [SECTION 11: 테이블 설정]
// ============================================
export const TABLE_CONFIG = {
  // 기본 스타일
  STYLE: {
    background: "#2d2d2d",
    border: "1px solid #444444",
    borderRadius: "8px",
    overflow: "hidden",
  },

  // 헤더 스타일
  HEADER: {
    background: "#1a1a1a",
    color: "#ffffff",
    fontWeight: "600",
    padding: "15px",
    borderBottom: "2px solid #444444",
  },

  // 셀 스타일
  CELL: {
    padding: "12px 15px",
    borderBottom: "1px solid #444444",
    fontSize: "14px",
    color: "#ffffff",
  },

  // 행 호버
  ROW_HOVER: {
    background: "#363636",
    transition: "background 0.2s ease",
  },

  // 정렬
  ALIGN: {
    left: "left",
    center: "center",
    right: "right",
  },

  // 페이지네이션
  PAGINATION: {
    pageSize: 20,
    pageSizeOptions: [10, 20, 50, 100],
    showTotal: true,
    showSizeChanger: true,
    showQuickJumper: true,
  },

  // 정렬 아이콘
  SORT_ICONS: {
    asc: "▲",
    desc: "▼",
    default: "⇅",
  },
};

// ============================================
// [SECTION 12: KPI 목표 설정]
// ============================================
export const KPI_TARGETS = {
  // 월간 목표
  MONTHLY_SALES: 50000000, // 5천만원
  MONTHLY_COMPANIES: 80, // 80개사
  MONTHLY_MAIN_PRODUCTS: 40, // 주요제품 40개사

  // 분기 목표
  QUARTERLY_SALES: 150000000, // 1.5억원
  QUARTERLY_GROWTH: 10, // 10% 성장

  // 연간 목표
  YEARLY_SALES: 600000000, // 6억원
  YEARLY_COMPANIES: 100, // 100개사
  YEARLY_ACTIVATION: 60, // 60% 활성화율

  // 수금 목표
  COLLECTION_RATE: 90, // 90% 수금률
  PAYMENT_DAYS: 30, // 30일 이내 수금
};

// ============================================
// [SECTION 13: 비즈니스 용어]
// ============================================
export const BUSINESS_TERMS = {
  // 주요 제품
  MAIN_PRODUCTS: ["임플란트", "지르코니아", "Abutment"],

  // 거래처 상태
  COMPANY_STATUS: {
    ACTIVE: "활성",
    PENDING: "보류",
    SUSPENDED: "중단",
    NEW: "신규",
    DORMANT: "불용",
  },

  // 직급
  POSITIONS: {
    CEO: "대표이사",
    DIRECTOR: "이사",
    MANAGER: "부장",
    DEPUTY: "차장",
    SECTION_CHIEF: "과장",
    ASSISTANT: "대리",
    STAFF: "직원",
  },
};

// ============================================
// [SECTION 14: 파일 업로드 설정]
// ============================================
export const FILE_CONFIG = {
  // 최대 파일 크기
  MAX_SIZE: 10 * 1024 * 1024, // 10MB

  // 허용 파일 확장자
  ALLOWED_TYPES: {
    excel: [".xlsx", ".xls"],
    image: [".jpg", ".jpeg", ".png", ".gif", ".webp"],
    document: [".pdf", ".doc", ".docx"],
    all: ["*"],
  },

  // 드래그 앤 드롭 영역 스타일
  DROPZONE: {
    border: "2px dashed #444444",
    borderRadius: "8px",
    padding: "40px",
    background: "#1a1a1a",
    hoverBorder: "2px dashed var(--primary-color)",
    hoverBackground: "rgba(var(--primary-rgb), 0.1)",
  },

  // 업로드 메시지
  MESSAGES: {
    drag: "파일을 드래그하여 업로드",
    click: "또는 클릭하여 파일 선택",
    uploading: "업로드 중...",
    success: "업로드 완료",
    error: "업로드 실패",
    sizeError: "파일 크기가 너무 큽니다.",
    typeError: "허용되지 않은 파일 형식입니다.",
  },
};

// ============================================
// [SECTION 13: 세션 관리 설정]
// ============================================
export const SESSION_CONFIG = {
  // 세션 타임아웃 (분)
  TIMEOUT: 30,

  // 경고 시간 (타임아웃 5분 전)
  WARNING_TIME: 5,

  // 자동 연장
  AUTO_EXTEND: true,

  // 세션 저장 키
  STORAGE_KEY: "kuwotech_session",

  // 세션 체크 간격 (밀리초)
  CHECK_INTERVAL: 60000, // 1분마다 체크

  // 세션 메시지
  MESSAGES: {
    warning: "세션이 {time}분 후 만료됩니다.",
    expired: "세션이 만료되었습니다. 다시 로그인해주세요.",
    extended: "세션이 연장되었습니다.",
  },
};

// ============================================
// [SECTION 14: API 설정]
// ============================================

// 환경에 따른 API URL 자동 감지
export function getApiBaseUrl() {
  if (typeof window === "undefined") return "http://localhost:3000";

  const hostname = window.location.hostname;
  const port = window.location.port;

  // Railway 프로덕션
  if (hostname.includes("railway.app")) {
    return "https://kuwotech-sales-production-aa64.up.railway.app";
  }

  // 로컬 서버 (포트 3000) - 개발 환경
  if (
    (hostname === "localhost" || hostname === "127.0.0.1") &&
    port === "3000"
  ) {
    return "http://localhost:3000";
  }

  // Live Server (포트 5500) - Railway 프로덕션 백엔드 사용
  if (
    (hostname === "localhost" || hostname === "127.0.0.1") &&
    port === "5500"
  ) {
    return "https://kuwotech-sales-production-aa64.up.railway.app";
  }

  // 기본값: Railway 프로덕션
  return "https://kuwotech-sales-production-aa64.up.railway.app";
}

// 환경 자동 감지 (environment 이름 반환)
export function detectEnvironment() {
  if (typeof window === "undefined") return "development";

  const hostname = window.location.hostname;
  const port = window.location.port;

  // Railway 프로덕션
  if (hostname.includes("railway.app")) {
    return "production";
  }

  // 로컬 서버 (포트 3000)
  if (
    (hostname === "localhost" || hostname === "127.0.0.1") &&
    port === "3000"
  ) {
    return "development";
  }

  // Live Server (포트 5500) - Railway 프로덕션 사용
  if (
    (hostname === "localhost" || hostname === "127.0.0.1") &&
    port === "5500"
  ) {
    return "production";
  }

  // 기본값: 프로덕션
  return "production";
}

export const API_CONFIG = {
  // API 기본 URL (환경 자동 감지)
  BASE_URL: getApiBaseUrl(),

  // API 엔드포인트
  ENDPOINTS: {
    // 인증
    LOGIN: "/api/auth/login",
    LOGOUT: "/api/auth/logout",
    REFRESH: "/api/auth/refresh",

    // 거래처
    COMPANIES: "/api/companies",
    COMPANIES_BY_MANAGER: "/api/companies/manager",

    // 실적보고서
    REPORTS: "/api/reports",
    REPORTS_BY_WRITER: "/api/reports/writer",

    // 직원
    EMPLOYEES: "/api/employees",

    // KPI
    KPI: "/api/kpi",
    KPI_SUMMARY: "/api/kpi/summary",

    // 업로드
    UPLOAD: "/api/upload",
  },

  // 타임아웃 설정
  TIMEOUT: {
    DEFAULT: 30000, // 30초
    UPLOAD: 60000, // 60초
    DOWNLOAD: 120000, // 120초
  },

  // 재시도 설정
  RETRY: {
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000, // 1초
    RETRY_STATUS_CODES: [408, 429, 500, 502, 503, 504],
  },

  // 헤더 설정
  HEADERS: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
};

// ============================================
// [SECTION 15: 데이터베이스 설정]
// ============================================
export const DATABASE_CONFIG = {
  NAME: "KuwotechSalesDB",
  VERSION: 1,

  // 테이블 이름
  STORES: {
    companies: "companies",
    reports: "reports",
    employees: "employees",
    changeHistory: "changeHistory",
    settings: "settings",
  },

  // 자동 저장
  AUTO_SAVE: {
    enabled: true,
    interval: 60000, // 1분마다
    onClose: true, // 창 닫을 때 저장
  },

  // 백업
  BACKUP: {
    enabled: true,
    interval: 86400000, // 24시간마다
    maxBackups: 7, // 최대 7개 백업 유지
    compress: true, // 압축 여부
  },
};

// ============================================
// [SECTION 15: 라우팅 설정]
// ============================================
export const ROUTE_CONFIG = {
  // 기본 경로
  BASE_PATH: "/",

  // 로그인 경로
  LOGIN: "/02.login/01_login.html",

  // 영업담당 모드 경로
  SALES: {
    DASHBOARD: "/03.sales_mode/01_dashboard/01_dashboard.html",
    MY_COMPANIES: "/03.sales_mode/02_my_companies/01_my_companies.html",
    REPORT_WRITE: "/03.sales_mode/03_report_write/01_report_write.html",
    REPORT_CHECK: "/03.sales_mode/05_report_check/01_report_check.html",
    DATA_MANAGEMENT:
      "/03.sales_mode/06_data_management/01_data_management.html",
    SETTINGS: "/03.sales_mode/07_system_settings/01_settings.html",
  },

  // 관리자 모드 경로
  ADMIN: {
    DASHBOARD: "/04.admin_mode/01_dashboard/01_dashboard.html",
    ALL_COMPANIES: "/04.admin_mode/02_all_companies/01_all_companies.html",
    REPORT_CONFIRM: "/04.admin_mode/05_report_confirm/01_report_confirm.html",
    PRESENTATION: "/04.admin_mode/06_presentation/01_presentation.html",
    DATA_MANAGEMENT:
      "/04.admin_mode/07_data_management/01_data_management.html",
    EMPLOYEE_MANAGEMENT:
      "/04.admin_mode/08_employee_management/01_employees.html",
    SETTINGS: "/04.admin_mode/09_system_settings/01_settings.html",
  },

  // 리다이렉트 규칙
  REDIRECT: {
    afterLogin: "dashboard",
    afterLogout: "login",
    unauthorized: "login",
  },
};

// ============================================
// [SECTION 16: 전역 유틸리티 함수]
// ============================================
export const GLOBAL_UTILS = {
  /**
   * 설정값 가져오기
   * @param {string} path - 설정 경로 (예: 'NUMBER_FORMAT.CURRENCY.SYMBOL')
   * @param {*} defaultValue - 기본값
   * @returns {*} 설정값
   */
  getConfig(path, defaultValue = null) {
    const keys = path.split(".");
    let value = window.KUWOTECH_CONFIG;

    for (const key of keys) {
      if (value && value[key] !== undefined) {
        value = value[key];
      } else {
        return defaultValue;
      }
    }

    return value;
  },

  /**
   * 설정값 설정하기
   * @param {string} path - 설정 경로
   * @param {*} value - 설정할 값
   */
  setConfig(path, value) {
    const keys = path.split(".");
    let config = window.KUWOTECH_CONFIG;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!config[key]) {
        config[key] = {};
      }
      config = config[key];
    }

    config[keys[keys.length - 1]] = value;
  },

  /**
   * 설정 병합하기
   * @param {Object} newConfig - 병합할 설정
   */
  mergeConfig(newConfig) {
    window.KUWOTECH_CONFIG = this.deepMerge(window.KUWOTECH_CONFIG, newConfig);
  },

  /**
   * 깊은 병합
   * @param {Object} target - 대상 객체
   * @param {Object} source - 소스 객체
   * @returns {Object} 병합된 객체
   */
  deepMerge(target, source) {
    const output = { ...target };

    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach((key) => {
        if (this.isObject(source[key])) {
          if (!(key in target)) {
            output[key] = source[key];
          } else {
            output[key] = this.deepMerge(target[key], source[key]);
          }
        } else {
          output[key] = source[key];
        }
      });
    }

    return output;
  },

  /**
   * 객체 여부 확인
   * @param {*} item - 확인할 항목
   * @returns {boolean} 객체 여부
   */
  isObject(item) {
    return item && typeof item === "object" && !Array.isArray(item);
  },
};

// ============================================
// [SECTION 17: 초기화]
// ============================================

// KUWOTECH_CONFIG 전역 변수 선언
export let KUWOTECH_CONFIG = null;

/**
 * 전역 설정 초기화
 */
export function initGlobalConfig() {
  // 전역 객체에 설정 등록
  KUWOTECH_CONFIG = {
    SYSTEM,
    NUMBER_FORMAT,
    DATE_TIME_FORMAT,
    CLOCK_CONFIG,
    SCROLL_CONFIG,
    MODAL_CONFIG,
    TOAST_CONFIG,
    LOADING_CONFIG,
    ANIMATION_CONFIG,
    INPUT_CONFIG,
    TABLE_CONFIG,
    KPI_TARGETS,
    BUSINESS_TERMS,
    FILE_CONFIG,
    SESSION_CONFIG,
    API_CONFIG,
    DATABASE_CONFIG,
    ROUTE_CONFIG,
  };

  // 전역 객체에도 설정 등록
  window.KUWOTECH_CONFIG = KUWOTECH_CONFIG;

  // 전역 유틸리티 등록
  window.KUWOTECH = GLOBAL_UTILS;

  return KUWOTECH_CONFIG;
}

// 페이지 로드 시 자동 초기화
if (typeof window !== "undefined") {
  document.addEventListener("DOMContentLoaded", initGlobalConfig);
}

// ============================================
// ============================================
// [SECTION: 자동 백업 설정]
// ============================================

export const AUTO_BACKUP = {
  AUTO_START: true, // 시스템 시작 시 자동 백업 시작
  EXPORT_TO_EXCEL: true, // 백업을 엑셀 파일로 내보내기
  SHOW_NOTIFICATION: true, // 백업 완료 알림 표시

  // 백업 주기 설정
  SCHEDULES: {
    DAILY: {
      ENABLED: true,
      TIME: "00:00", // 매일 자정
      RETENTION_DAYS: 30, // 30일 보관
    },
    WEEKLY: {
      ENABLED: false,
      DAY: 0, // 0=일요일, 1=월요일...
      TIME: "23:00",
      RETENTION_DAYS: 90, // 90일 보관
    },
    MONTHLY: {
      ENABLED: false,
      DAY: "last", // 'last'=말일, 1~31=해당 일
      TIME: "23:00",
      RETENTION_DAYS: 365, // 1년 보관
    },
  },

  // 백업 파일 경로
  BACKUP_PATH: "./backups/",

  // 최대 백업 파일 수
  MAX_BACKUP_FILES: {
    DAILY: 30,
    WEEKLY: 12,
    MONTHLY: 12,
  },
};

// 기본 내보내기
// ============================================
export default {
  SYSTEM,
  NUMBER_FORMAT,
  DATE_TIME_FORMAT,
  CLOCK_CONFIG,
  SCROLL_CONFIG,
  MODAL_CONFIG,
  TOAST_CONFIG,
  LOADING_CONFIG,
  ANIMATION_CONFIG,
  INPUT_CONFIG,
  TABLE_CONFIG,
  KPI_TARGETS,
  BUSINESS_TERMS,
  FILE_CONFIG,
  SESSION_CONFIG,
  API_CONFIG,
  DATABASE_CONFIG,
  ROUTE_CONFIG,
  GLOBAL_UTILS,
  AUTO_BACKUP,
  initGlobalConfig,
};

// GlobalConfig로 명시적 내보내기 추가
export const GlobalConfig = {
  SYSTEM,
  NUMBER_FORMAT,
  DATE_TIME_FORMAT,
  CLOCK_CONFIG,
  SCROLL_CONFIG,
  MODAL_CONFIG,
  TOAST_CONFIG,
  LOADING_CONFIG,
  ANIMATION_CONFIG,
  INPUT_CONFIG,
  TABLE_CONFIG,
  KPI_TARGETS,
  BUSINESS_TERMS,
  FILE_CONFIG,
  SESSION_CONFIG,
  API_CONFIG,
  DATABASE_CONFIG,
  ROUTE_CONFIG,
  GLOBAL_UTILS,
  AUTO_BACKUP,
  initGlobalConfig,
  // 편의성을 위한 alias
  API_BASE_URL: API_CONFIG.BASE_URL,
};

// [내용: 전역 설정]
// 테스트 계획: 모든 설정 중앙화 확인
// #설정 #중앙화 #공통
