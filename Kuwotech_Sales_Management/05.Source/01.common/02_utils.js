// ============================================
// [MODULE: 공통 유틸리티 함수]
// 파일 위치: 05.Source/01.common/02_utils.js
// 작성일: 2025-01-30
// 설명: 시스템 전반에서 사용하는 공통 유틸리티 함수들
// ============================================

import { formatNumber } from './03_format.js';

/**
 * 고유 ID 생성
 * @param {string} prefix - ID 접두사 (선택)
 * @returns {string} 생성된 고유 ID
 */
export function generateId(prefix = 'id') {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return `${prefix}-${timestamp}-${random}`;
}

/**
 * 디바운스 함수
 * @param {Function} func - 실행할 함수
 * @param {number} wait - 대기 시간(ms)
 * @returns {Function} 디바운스된 함수
 */
export function debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * 스로틀 함수
 * @param {Function} func - 실행할 함수
 * @param {number} limit - 제한 시간(ms)
 * @returns {Function} 스로틀된 함수
 */
export function throttle(func, limit = 300) {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * 깊은 복사
 * @param {*} obj - 복사할 객체
 * @returns {*} 복사된 객체
 */
export function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => deepClone(item));
    if (obj instanceof Object) {
        const clonedObj = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                clonedObj[key] = deepClone(obj[key]);
            }
        }
        return clonedObj;
    }
}

/**
 * 객체 병합 (깊은 병합)
 * @param {Object} target - 대상 객체
 * @param {Object} source - 소스 객체
 * @returns {Object} 병합된 객체
 */
export function deepMerge(target, source) {
    const output = { ...target };
    
    if (isObject(target) && isObject(source)) {
        Object.keys(source).forEach(key => {
            if (isObject(source[key])) {
                if (!(key in target)) {
                    output[key] = source[key];
                } else {
                    output[key] = deepMerge(target[key], source[key]);
                }
            } else {
                output[key] = source[key];
            }
        });
    }
    
    return output;
}

/**
 * 객체 여부 확인
 * @param {*} item - 확인할 항목
 * @returns {boolean} 객체 여부
 */
export function isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
}

/**
 * 배열 여부 확인
 * @param {*} item - 확인할 항목
 * @returns {boolean} 배열 여부
 */
export function isArray(item) {
    return Array.isArray(item);
}

/**
 * 빈 값 확인
 * @param {*} value - 확인할 값
 * @returns {boolean} 빈 값 여부
 */
export function isEmpty(value) {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim() === '';
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
}

/**
 * 클래스 이름 결합
 * @param {...string} classes - 클래스 이름들
 * @returns {string} 결합된 클래스 이름
 */
export function classNames(...classes) {
    return classes.filter(Boolean).join(' ');
}

/**
 * 요소가 뷰포트에 보이는지 확인
 * @param {HTMLElement} element - 확인할 요소
 * @returns {boolean} 보임 여부
 */
export function isElementInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

/**
 * 스크롤을 특정 위치로 부드럽게 이동
 * @param {number} targetPosition - 목표 위치
 * @param {number} duration - 지속 시간(ms)
 */
export function smoothScrollTo(targetPosition, duration = 300) {
    const startPosition = window.pageYOffset;
    const distance = targetPosition - startPosition;
    let startTime = null;

    function animation(currentTime) {
        if (startTime === null) startTime = currentTime;
        const timeElapsed = currentTime - startTime;
        const run = ease(timeElapsed, startPosition, distance, duration);
        window.scrollTo(0, run);
        if (timeElapsed < duration) requestAnimationFrame(animation);
    }

    function ease(t, b, c, d) {
        t /= d / 2;
        if (t < 1) return c / 2 * t * t + b;
        t--;
        return -c / 2 * (t * (t - 2) - 1) + b;
    }

    requestAnimationFrame(animation);
}

/**
 * 로컬 스토리지에 데이터 저장
 * @param {string} key - 키
 * @param {*} value - 값
 */
export function setStorage(key, value) {
    try {
        const serializedValue = JSON.stringify(value);
        localStorage.setItem(key, serializedValue);
    } catch (error) {
        console.error('Storage save error:', error);
    }
}

/**
 * 로컬 스토리지에서 데이터 불러오기
 * @param {string} key - 키
 * @param {*} defaultValue - 기본값
 * @returns {*} 저장된 값 또는 기본값
 */
export function getStorage(key, defaultValue = null) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.error('Storage load error:', error);
        return defaultValue;
    }
}

/**
 * 로컬 스토리지에서 데이터 삭제
 * @param {string} key - 키
 */
export function removeStorage(key) {
    try {
        localStorage.removeItem(key);
    } catch (error) {
        console.error('Storage remove error:', error);
    }
}

/**
 * JSON 문자열을 안전하게 파싱
 * @param {string|Object} jsonString - 파싱할 JSON 문자열 또는 객체
 * @param {*} defaultValue - 파싱 실패 시 반환할 기본값 (기본값: null)
 * @returns {*} 파싱된 객체 또는 기본값
 *
 * @example
 * parseJSON('{"name": "test"}') // { name: "test" }
 * parseJSON('[1,2,3]') // [1, 2, 3]
 * parseJSON('invalid json', []) // []
 * parseJSON({ already: 'parsed' }) // { already: 'parsed' }
 */
export function parseJSON(jsonString, defaultValue = null) {
    if (!jsonString) return defaultValue;

    try {
        // 이미 객체인 경우 그대로 반환
        if (typeof jsonString === 'string') {
            return JSON.parse(jsonString);
        }
        return jsonString;
    } catch (e) {
        console.warn('[parseJSON] JSON 파싱 실패:', e);
        return defaultValue;
    }
}

/**
 * URL 파라미터 파싱
 * @param {string} search - search 문자열 (기본값: window.location.search)
 * @returns {Object} 파라미터 객체
 */
export function parseUrlParams(search = window.location.search) {
    const params = {};
    const urlSearchParams = new URLSearchParams(search);
    for (const [key, value] of urlSearchParams) {
        params[key] = value;
    }
    return params;
}

/**
 * 객체를 URL 파라미터 문자열로 변환
 * @param {Object} params - 파라미터 객체
 * @returns {string} URL 파라미터 문자열
 */
export function objectToUrlParams(params) {
    return Object.entries(params)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');
}

/**
 * 현재 날짜/시간 포맷
 * @param {string} format - 포맷 문자열
 * @param {Date} date - 날짜 객체 (기본값: 현재 날짜)
 * @returns {string} 포맷된 날짜 문자열
 */
export function formatDateTime(format = 'YYYY-MM-DD HH:mm:ss', date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return format
        .replace('YYYY', year)
        .replace('MM', month)
        .replace('DD', day)
        .replace('HH', hours)
        .replace('mm', minutes)
        .replace('ss', seconds);
}

/**
 * 숫자를 천단위 구분자로 포맷
 * @param {number} num - 숫자
 * @returns {string} 포맷된 문자열
 * @deprecated 03_format.js의 formatNumber를 사용하세요
 */
export { formatNumber };

/**
 * 지연 실행
 * @param {number} ms - 지연 시간(ms)
 * @returns {Promise} Promise
 */
export function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 랜덤 정수 생성
 * @param {number} min - 최소값
 * @param {number} max - 최대값
 * @returns {number} 랜덤 정수
 */
export function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 배열 섞기
 * @param {Array} array - 배열
 * @returns {Array} 섞인 배열
 */
export function shuffle(array) {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

/**
 * 중복 제거
 * @param {Array} array - 배열
 * @returns {Array} 중복이 제거된 배열
 */
export function unique(array) {
    return [...new Set(array)];
}

/**
 * 배열을 청크로 분할
 * @param {Array} array - 배열
 * @param {number} size - 청크 크기
 * @returns {Array} 청크 배열
 */
export function chunk(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}

/**
 * 이벤트 리스너 추가 (한 번만 실행)
 * @param {HTMLElement} element - 요소
 * @param {string} eventName - 이벤트 이름
 * @param {Function} handler - 핸들러
 */
export function once(element, eventName, handler) {
    const onceHandler = (event) => {
        handler(event);
        element.removeEventListener(eventName, onceHandler);
    };
    element.addEventListener(eventName, onceHandler);
}

/**
 * 파일 확장자 추출
 * @param {string} filename - 파일명
 * @returns {string} 확장자
 */
export function getFileExtension(filename) {
    return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
}

/**
 * 바이트를 읽기 쉬운 형식으로 변환
 * @param {number} bytes - 바이트 수
 * @returns {string} 포맷된 문자열
 */
export function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 텍스트를 클립보드에 복사
 * @param {string} text - 복사할 텍스트
 * @returns {Promise<boolean>} 성공 여부
 */
export async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (error) {
        console.error('Clipboard copy error:', error);
        return false;
    }
}

/**
 * 거래처 표시명 가져오기
 * @param {Object} company - 거래처 객체
 * @returns {string} 표시할 거래처명
 */
export function getCompanyDisplayName(company) {
    if (!company) return '';

    // 최종거래처명 우선, 없으면 ERP거래처명 사용
    return company.finalCompanyName || company.erpCompanyName || '';
}

/**
 * 표준 API 에러 처리
 * @param {Error} error - 에러 객체
 * @param {string} context - 에러 발생 컨텍스트 (예: '거래처 로드')
 * @param {boolean} showToast - Toast 알림 표시 여부 (기본값: true)
 */
export function handleApiError(error, context = '', showToast = true) {
    const errorMessage = error?.message || error?.error || '알 수 없는 오류가 발생했습니다';
    const fullMessage = context ? `${context} 중 오류: ${errorMessage}` : errorMessage;

    console.error(`[API Error]${context ? ` ${context}:` : ''}`, error);

    if (showToast && window.Toast) {
        window.Toast.error(fullMessage);
    }

    return {
        success: false,
        error: errorMessage,
        context
    };
}

/**
 * 현재 로그인된 사용자 정보 가져오기
 * @returns {Object|null} 사용자 객체 또는 null
 */
export function getCurrentUser() {
    try {
        const userJson = sessionStorage.getItem('user');
        if (!userJson) return null;

        const user = JSON.parse(userJson);
        return user;
    } catch (error) {
        console.error('사용자 정보 파싱 오류:', error);
        return null;
    }
}

/**
 * 인증 체크 - 로그인하지 않은 경우 로그인 페이지로 리다이렉트
 * @param {string} redirectUrl - 리다이렉트할 로그인 페이지 URL (기본값: ../../02.login/01_login.html)
 * @param {boolean} showToast - Toast 알림 표시 여부 (기본값: true)
 * @returns {Object|null} 인증된 사용자 객체 또는 null (리다이렉트 시)
 */
export function ensureAuthenticated(redirectUrl = '../../02.login/01_login.html', showToast = true) {
    const user = getCurrentUser();

    if (!user) {
        if (showToast && window.Toast) {
            window.Toast.error('로그인이 필요합니다');
        }

        setTimeout(() => {
            window.location.href = redirectUrl;
        }, 1000);

        return null;
    }

    return user;
}

/**
 * 전역 유틸리티 객체로 노출
 */
if (typeof window !== 'undefined') {
    window.Utils = {
        generateId,
        debounce,
        throttle,
        deepClone,
        deepMerge,
        isObject,
        isArray,
        isEmpty,
        classNames,
        isElementInViewport,
        smoothScrollTo,
        setStorage,
        getStorage,
        removeStorage,
        parseJSON,
        parseUrlParams,
        objectToUrlParams,
        formatDateTime,
        formatNumber,
        delay,
        randomInt,
        shuffle,
        unique,
        chunk,
        once,
        getFileExtension,
        formatBytes,
        copyToClipboard,
        getCompanyDisplayName,
        handleApiError,
        getCurrentUser,
        ensureAuthenticated
    };
}

// 기본 export
export default {
    generateId,
    debounce,
    throttle,
    deepClone,
    deepMerge,
    isObject,
    isArray,
    isEmpty,
    classNames,
    isElementInViewport,
    smoothScrollTo,
    setStorage,
    getStorage,
    removeStorage,
    parseJSON,
    parseUrlParams,
    objectToUrlParams,
    formatDateTime,
    formatNumber,
    delay,
    randomInt,
    shuffle,
    unique,
    chunk,
    once,
    getFileExtension,
    formatBytes,
    copyToClipboard,
    getCompanyDisplayName,
    handleApiError,
    getCurrentUser,
    ensureAuthenticated
};
