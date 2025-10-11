/**
 * ============================================
 * KUWOTECH 영업관리 시스템 - 로고 및 폰트 관리 모듈
 * 파일: 05.Source/01.common/21_logo_font_manager.js
 * 작성일: 2025-01-30
 * 설명: 로고 생성, 업데이트 및 폰트 로드 기능
 * ============================================
 */

import logger from './23_logger.js';

// ============================================
// [SECTION: 상수 정의]
// ============================================

const LOGO_CONFIG = {
    // 환경별 로고 경로 자동 감지
    path: (() => {
        // 프로덕션 환경 (Railway) - Express 정적 파일 서빙
        if (window.location.hostname.includes('railway.app')) {
            return '/02.Fonts_Logos/logo.png';
        }
        // 로컬 개발 환경 - 상대 경로 사용
        return '../../02.Fonts_Logos/logo.png';
    })(),
    defaultHeight: 40,
    defaultClassName: 'logo',
    filter: {
        white: 'brightness(0) invert(1)',  // 하얀색으로 변환
        original: 'none'
    }
};

const FONT_CONFIG = {
    basePath: '../../02.Fonts_Logos/Paperlogy/',
    fonts: [
        { name: 'Paperlogy-4Regular', file: 'Paperlogy-4Regular.ttf', weight: 400 },
        { name: 'Paperlogy-5Medium', file: 'Paperlogy-5Medium.ttf', weight: 500 },
        { name: 'Paperlogy-6SemiBold', file: 'Paperlogy-6SemiBold.ttf', weight: 600 },
        { name: 'Paperlogy-7Bold', file: 'Paperlogy-7Bold.ttf', weight: 700 },
        { name: 'Paperlogy-8ExtraBold', file: 'Paperlogy-8ExtraBold.ttf', weight: 800 },
        { name: 'Paperlogy-9Black', file: 'Paperlogy-9Black.ttf', weight: 900 }
    ]
};

// ============================================
// [SECTION: 로고 관리 클래스]
// ============================================

class LogoManager {
    constructor() {
        this.logos = new Set();
        this.initialized = false;
    }

    /**
     * 로고 요소 생성
     * @param {Object} options - 옵션
     * @param {string} options.className - CSS 클래스명
     * @param {number} options.height - 높이 (픽셀)
     * @param {string} options.alt - 대체 텍스트
     * @param {boolean} options.white - 하얀색 필터 적용 여부 (기본값: false - 원본 색상 사용)
     * @param {string} options.id - 요소 ID
     * @returns {HTMLImageElement} 로고 이미지 요소
     */
    createLogoElement(options = {}) {
        const {
            className = LOGO_CONFIG.defaultClassName,
            height = LOGO_CONFIG.defaultHeight,
            alt = 'KUWOTECH',
            white = false,  // 기본값을 false로 변경 - 원본 로고 색상 사용
            id = null
        } = options;

        const logo = document.createElement('img');
        logo.src = LOGO_CONFIG.path;
        logo.alt = alt;
        logo.className = className;
        logo.style.height = `${height}px`;
        logo.style.width = 'auto';
        
        if (id) {
            logo.id = id;
        }

        // 하얀색 필터 적용
        if (white) {
            logo.style.filter = LOGO_CONFIG.filter.white;
        }

        // 로고 추적을 위해 Set에 추가
        this.logos.add(logo);

        return logo;
    }

    /**
     * 모든 로고 업데이트
     * @param {Object} options - 업데이트 옵션
     */
    updateAllLogos(options = {}) {
        this.logos.forEach(logo => {
            if (options.height !== undefined) {
                logo.style.height = `${options.height}px`;
            }
            if (options.white !== undefined) {
                logo.style.filter = options.white ? 
                    LOGO_CONFIG.filter.white : 
                    LOGO_CONFIG.filter.original;
            }
            if (options.className !== undefined) {
                logo.className = options.className;
            }
        });

    }

    /**
     * 특정 컨테이너에 로고 삽입
     * @param {string|HTMLElement} container - 컨테이너 선택자 또는 요소
     * @param {Object} options - 로고 옵션
     * @returns {HTMLImageElement} 생성된 로고 요소
     */
    insertLogo(container, options = {}) {
        const element = typeof container === 'string' ? 
            document.querySelector(container) : container;

        if (!element) {
            logger.error(`❌ 로고 컨테이너를 찾을 수 없습니다: ${container}`);
            return null;
        }

        const logo = this.createLogoElement(options);
        element.appendChild(logo);

        return logo;
    }

    /**
     * 로고 제거
     * @param {HTMLImageElement} logo - 제거할 로고 요소
     */
    removeLogo(logo) {
        if (this.logos.has(logo)) {
            this.logos.delete(logo);
            if (logo.parentNode) {
                logo.parentNode.removeChild(logo);
            }
        }
    }

    /**
     * 모든 로고 제거
     */
    removeAllLogos() {
        this.logos.forEach(logo => {
            if (logo.parentNode) {
                logo.parentNode.removeChild(logo);
            }
        });
        this.logos.clear();
    }

    /**
     * 로고 개수 반환
     * @returns {number} 로고 개수
     */
    getLogoCount() {
        return this.logos.size;
    }
}

// ============================================
// [SECTION: 폰트 관리 클래스]
// ============================================

class FontManager {
    constructor() {
        this.loaded = false;
        this.loadingPromise = null;
    }

    /**
     * 폰트 로드
     * @returns {Promise<boolean>} 로드 성공 여부
     */
    async loadFonts() {
        // 이미 로드 중이면 기존 Promise 반환
        if (this.loadingPromise) {
            return this.loadingPromise;
        }

        // 이미 로드됨
        if (this.loaded) {
            return true;
        }


        this.loadingPromise = this._loadFontsInternal();
        return this.loadingPromise;
    }

    /**
     * 내부 폰트 로드 구현
     * @private
     */
    async _loadFontsInternal() {
        try {
            // CSS에서 이미 @font-face로 정의된 경우
            if (document.fonts && document.fonts.check) {
                // 폰트가 로드되었는지 확인
                const fontCheckPromises = FONT_CONFIG.fonts.map(font => {
                    return document.fonts.load(`${font.weight} 16px Paperlogy`);
                });

                await Promise.all(fontCheckPromises);
                
                this.loaded = true;
                
                // 폰트 로드 이벤트 발생
                window.dispatchEvent(new CustomEvent('fontsLoaded', {
                    detail: { fonts: FONT_CONFIG.fonts }
                }));

                return true;
            } else {
                // Font Loading API를 지원하지 않는 브라우저
                logger.warn('⚠️ Font Loading API 미지원 - CSS로 폰트 로드 대체');
                await this._loadFontsViaCSS();
                return true;
            }
        } catch (error) {
            logger.error('❌ 폰트 로드 실패:', error);
            this.loaded = false;
            return false;
        }
    }

    /**
     * CSS를 통한 폰트 로드 (폴백)
     * @private
     */
    async _loadFontsViaCSS() {
        const styleId = 'paperlogy-fonts-fallback';
        
        // 이미 스타일이 있으면 반환
        if (document.getElementById(styleId)) {
            this.loaded = true;
            return;
        }

        const style = document.createElement('style');
        style.id = styleId;
        
        const fontFaces = FONT_CONFIG.fonts.map(font => `
            @font-face {
                font-family: 'Paperlogy';
                src: url('${FONT_CONFIG.basePath}${font.file}') format('truetype');
                font-weight: ${font.weight};
                font-style: normal;
                font-display: swap;
            }
        `).join('\n');

        style.textContent = fontFaces;
        document.head.appendChild(style);

        // 폰트 로드 대기 (최대 3초)
        await new Promise(resolve => setTimeout(resolve, 100));
        
        this.loaded = true;
    }

    /**
     * 특정 요소에 폰트 적용
     * @param {string|HTMLElement} element - 요소 선택자 또는 요소
     * @param {number} weight - 폰트 무게 (400-900)
     */
    applyFont(element, weight = 400) {
        const el = typeof element === 'string' ? 
            document.querySelector(element) : element;

        if (!el) {
            logger.error('❌ 요소를 찾을 수 없습니다:', element);
            return;
        }

        el.style.fontFamily = "'Paperlogy', -apple-system, 'Noto Sans KR', sans-serif";
        el.style.fontWeight = weight;
    }

    /**
     * body에 기본 폰트 적용
     */
    applyToBody() {
        document.body.style.fontFamily = "'Paperlogy', -apple-system, 'Noto Sans KR', sans-serif";
        document.body.style.fontWeight = 400;
    }

    /**
     * 폰트 로드 상태 확인
     * @returns {boolean} 로드 여부
     */
    isLoaded() {
        return this.loaded;
    }

    /**
     * 사용 가능한 폰트 목록 반환
     * @returns {Array} 폰트 정보 배열
     */
    getAvailableFonts() {
        return FONT_CONFIG.fonts.map(font => ({
            name: font.name,
            weight: font.weight,
            loaded: this.loaded
        }));
    }
}

// ============================================
// [SECTION: 싱글톤 인스턴스]
// ============================================

const logoManager = new LogoManager();
const fontManager = new FontManager();

// ============================================
// [SECTION: 통합 초기화 함수]
// ============================================

/**
 * 로고 및 폰트 시스템 통합 초기화
 * @param {Object} options - 초기화 옵션
 */
export async function initLogoAndFont(options = {}) {
    const {
        loadFonts: shouldLoadFonts = true,
        applyToBody: shouldApplyToBody = true,
        autoInsertLogo = false,
        logoContainer = null,
        logoOptions = {}
    } = options;


    try {
        // 1. 폰트 로드
        if (shouldLoadFonts) {
            await fontManager.loadFonts();
            
            if (shouldApplyToBody) {
                fontManager.applyToBody();
            }
        }

        // 2. 로고 자동 삽입
        if (autoInsertLogo && logoContainer) {
            logoManager.insertLogo(logoContainer, logoOptions);
        }

        return true;

    } catch (error) {
        logger.error('❌ 로고 및 폰트 시스템 초기화 실패:', error);
        return false;
    }
}

// ============================================
// [SECTION: 편의 함수 Export]
// ============================================

/**
 * 로고 요소 생성 (편의 함수)
 */
export function createLogoElement(options = {}) {
    return logoManager.createLogoElement(options);
}

/**
 * 모든 로고 업데이트 (편의 함수)
 */
export function updateAllLogos(options = {}) {
    return logoManager.updateAllLogos(options);
}

/**
 * 폰트 로드 (편의 함수)
 */
export function loadFonts() {
    return fontManager.loadFonts();
}

/**
 * 로고 삽입 (편의 함수)
 */
export function insertLogo(container, options = {}) {
    return logoManager.insertLogo(container, options);
}

/**
 * 폰트 적용 (편의 함수)
 */
export function applyFont(element, weight = 400) {
    return fontManager.applyFont(element, weight);
}

// ============================================
// [SECTION: 전역 노출]
// ============================================

if (typeof window !== 'undefined') {
    window.logoManager = logoManager;
    window.fontManager = fontManager;
    window.createLogoElement = createLogoElement;
    window.updateAllLogos = updateAllLogos;
    window.loadFonts = loadFonts;
}

// ============================================
// [SECTION: Export]
// ============================================

export {
    logoManager,
    fontManager,
    LogoManager,
    FontManager,
    LOGO_CONFIG,
    FONT_CONFIG
};

export default {
    logoManager,
    fontManager,
    createLogoElement,
    updateAllLogos,
    loadFonts,
    insertLogo,
    applyFont,
    initLogoAndFont
};

// ============================================
// [파일 끝]
// ============================================
