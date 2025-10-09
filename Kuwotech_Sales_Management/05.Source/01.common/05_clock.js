// ============================================
// [MODULE: 시계 표시 - 전역 설정 완전 통합]
// 파일 위치: 05.Source/01.common/05_clock.js
// 수정일: 2025-01-27
// 설명: 전역 설정과 완전히 통합된 시계 모듈
//
// [NAVIGATION: 배경 설명]
// - 이 모듈은 2가지 모드로 작동:
//   1. 특정 요소에 시계 표시: startClock('element-id')
//   2. Floating 시계 생성: startClock() 또는 initClock({autoStart: true})
// - 현재 설정: autoStart=false로 설정되어 floating 시계 자동 생성 방지
// - 각 레이아웃에서 startClock('current-time')을 호출하여 헤더에만 시계 표시
// ============================================

import { CLOCK_CONFIG, DATE_TIME_FORMAT } from './01_global_config.js';

// ============================================
// [SECTION: 시계 상태 관리]
// ============================================

let clockInterval = null;
let clockElement = null;
let clockConfig = { ...CLOCK_CONFIG };

// ============================================
// [SECTION: 시계 포맷팅]
// ============================================

/**
 * 시계 표시 포맷팅
 * @param {Date} date - 날짜 객체
 * @param {Object} options - 옵션
 * @returns {Object} 포맷된 날짜/시간
 */
function formatClockDisplay(date, options = {}) {
    const config = { ...CLOCK_CONFIG.OPTIONS, ...options };
    const result = {};
    
    // 날짜 포맷
    if (config.showDate) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        
        result.date = `${year}년 ${month}월 ${day}일`;
        
        // 요일 추가
        if (config.showWeekday) {
            const weekday = DATE_TIME_FORMAT.WEEKDAYS[date.getDay()];
            result.date += ` (${weekday})`;
        }
    }
    
    // 시간 포맷
    if (config.showTime) {
        if (config.use24Hour) {
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            
            result.time = config.showSeconds 
                ? `${hours}:${minutes}:${seconds}`
                : `${hours}:${minutes}`;
        } else {
            let hours = date.getHours();
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            const ampm = hours >= 12 ? 'PM' : 'AM';
            
            hours = hours % 12;
            hours = hours ? hours : 12;
            
            result.time = config.showSeconds 
                ? `${hours}:${minutes}:${seconds} ${ampm}`
                : `${hours}:${minutes} ${ampm}`;
        }
    }
    
    return result;
}

// ============================================
// [SECTION: 시계 생성 및 관리]
// ============================================

/**
 * 시계 요소 생성
 * @param {Object} options - 옵션
 * @returns {HTMLElement} 시계 요소
 */
function createClock(options = {}) {
    // 기존 시계 제거
    if (clockElement) {
        destroyClock();
    }
    
    // 설정 병합
    const config = { ...clockConfig, ...options };
    
    // 시계 컨테이너 생성
    const container = document.createElement('div');
    container.className = 'system-clock-container';
    container.id = 'system-clock';
    
    // 스타일 적용 (전역 설정 사용)
    Object.assign(container.style, {
        ...CLOCK_CONFIG.STYLE,
        ...CLOCK_CONFIG.POSITION,
        ...config.style
    });
    
    // 날짜 요소
    if (config.OPTIONS.showDate) {
        const dateElement = document.createElement('div');
        dateElement.className = 'clock-date';
        dateElement.id = 'clock-date';
        dateElement.style.cssText = `
            font-size: 14px;
            margin-bottom: 4px;
            opacity: 0.9;
        `;
        container.appendChild(dateElement);
    }
    
    // 시간 요소
    if (config.OPTIONS.showTime) {
        const timeElement = document.createElement('div');
        timeElement.className = 'clock-time';
        timeElement.id = 'clock-time';
        timeElement.style.cssText = `
            font-size: 18px;
            font-weight: 600;
            letter-spacing: 1px;
        `;
        container.appendChild(timeElement);
    }
    
    clockElement = container;
    return container;
}

/**
 * 시계 업데이트
 */
function updateClock() {
    if (!clockElement) return;
    
    const now = new Date();
    const formatted = formatClockDisplay(now, clockConfig.OPTIONS);
    
    // 날짜 업데이트
    const dateElement = clockElement.querySelector('#clock-date');
    if (dateElement && formatted.date) {
        dateElement.textContent = formatted.date;
    }
    
    // 시간 업데이트
    const timeElement = clockElement.querySelector('#clock-time');
    if (timeElement && formatted.time) {
        timeElement.textContent = formatted.time;
    }
    
    // 커스텀 포맷 적용 (설정된 경우)
    if (clockConfig.customFormat && typeof clockConfig.customFormat === 'function') {
        const customFormatted = clockConfig.customFormat(now);
        if (customFormatted) {
            clockElement.innerHTML = customFormatted;
        }
    }
}

/**
 * 시계 시작 
 * @param {string|Object} elementIdOrOptions - 요소 ID 또는 옵션
 * @param {Object} additionalOptions - 추가 옵션 (elementId가 문자열인 경우)
 */
function startClock(elementIdOrOptions = {}, additionalOptions = {}) {
    let options = {};
    let targetElement = null;
    
    // 파라미터 처리
    if (typeof elementIdOrOptions === 'string') {
        // 요소 ID가 전달된 경우
        targetElement = document.getElementById(elementIdOrOptions);
        options = { ...additionalOptions, elementId: elementIdOrOptions };
    } else {
        // 옵션 객체가 전달된 경우
        options = elementIdOrOptions;
        if (options.elementId) {
            targetElement = document.getElementById(options.elementId);
        }
    }
    
    // 설정 업데이트
    clockConfig = { ...clockConfig, ...options };
    
    // 기존 인터벌 제거
    if (clockInterval) {
        clearInterval(clockInterval);
    }
    
    // 타겟 요소가 지정된 경우
    if (targetElement) {
        clockElement = targetElement;
        
        // 시계 업데이트 함수 (간단 버전)
        const updateSimpleClock = () => {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const weekday = DATE_TIME_FORMAT.WEEKDAYS[now.getDay()];
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            
            targetElement.textContent = `${year}년 ${month}월 ${day}일 (${weekday}) ${hours}:${minutes}:${seconds}`;
        };
        
        // 즉시 업데이트
        updateSimpleClock();
        
        // 인터벌 설정
        clockInterval = setInterval(updateSimpleClock, 1000);
    } else {
        // 시계 요소가 없으면 생성
        if (!clockElement) {
            clockElement = createClock(options);
            document.body.appendChild(clockElement);
        }
        
        // 즉시 업데이트
        updateClock();
        
        // 인터벌 설정 (전역 설정 사용)
        clockInterval = setInterval(updateClock, CLOCK_CONFIG.UPDATE_INTERVAL);
    }
    
    console.log('[시계] 시작됨');
    return clockElement;
}

/**
 * 시계 정지
 */
function stopClock() {
    if (clockInterval) {
        clearInterval(clockInterval);
        clockInterval = null;
        console.log('[시계] 정지됨');
    }
}

/**
 * 시계 제거
 */
function destroyClock() {
    stopClock();
    
    if (clockElement && clockElement.parentNode) {
        clockElement.parentNode.removeChild(clockElement);
        clockElement = null;
        console.log('[시계] 제거됨');
    }
}

/**
 * 시계 표시/숨김 토글
 */
function toggleClock() {
    if (clockElement) {
        const isVisible = clockElement.style.display !== 'none';
        clockElement.style.display = isVisible ? 'none' : 'block';
        
        if (isVisible) {
            stopClock();
        } else {
            startClock();
        }
        
        return !isVisible;
    }
    return false;
}

/**
 * 시계 위치 변경
 * @param {string} position - 위치 (top-left, top-right, bottom-left, bottom-right)
 */
function setClockPosition(position) {
    if (!clockElement) return;
    
    // 모든 위치 속성 초기화
    clockElement.style.top = 'auto';
    clockElement.style.bottom = 'auto';
    clockElement.style.left = 'auto';
    clockElement.style.right = 'auto';
    
    // 새 위치 적용
    switch (position) {
        case 'top-left':
            clockElement.style.top = '20px';
            clockElement.style.left = '20px';
            break;
        case 'top-right':
            clockElement.style.top = '20px';
            clockElement.style.right = '20px';
            break;
        case 'bottom-left':
            clockElement.style.bottom = '20px';
            clockElement.style.left = '20px';
            break;
        case 'bottom-right':
            clockElement.style.bottom = '20px';
            clockElement.style.right = '20px';
            break;
        default:
            // 기본 위치 (전역 설정 사용)
            Object.assign(clockElement.style, CLOCK_CONFIG.POSITION);
    }
}

/**
 * 시계 스타일 업데이트
 * @param {Object} styles - 스타일 객체
 */
function updateClockStyle(styles) {
    if (!clockElement) return;
    
    Object.assign(clockElement.style, styles);
    clockConfig.style = { ...clockConfig.style, ...styles };
}

/**
 * 시계 옵션 업데이트
 * @param {Object} options - 옵션
 */
function updateClockOptions(options) {
    clockConfig.OPTIONS = { ...clockConfig.OPTIONS, ...options };
    
    // 시계 재생성
    if (clockElement) {
        const parent = clockElement.parentNode;
        destroyClock();
        clockElement = createClock(clockConfig);
        if (parent) {
            parent.appendChild(clockElement);
        }
        startClock(clockConfig);
    }
}

// ============================================
// [SECTION: 미니 시계 (위젯)]
// ============================================

/**
 * 미니 시계 생성
 * @param {HTMLElement} targetElement - 대상 요소
 * @param {Object} options - 옵션
 * @returns {Object} 미니 시계 인스턴스
 */
function createMiniClock(targetElement, options = {}) {
    const miniConfig = {
        showDate: false,
        showTime: true,
        showSeconds: false,
        showWeekday: false,
        use24Hour: true,
        ...options
    };
    
    const miniElement = document.createElement('span');
    miniElement.className = 'mini-clock';
    miniElement.style.cssText = `
        display: inline-block;
        padding: 4px 8px;
        background: rgba(0, 0, 0, 0.2);
        border-radius: 4px;
        font-size: 12px;
        color: inherit;
    `;
    
    let miniInterval = null;
    
    const updateMini = () => {
        const now = new Date();
        const formatted = formatClockDisplay(now, miniConfig);
        miniElement.textContent = formatted.time || formatted.date || '';
    };
    
    const start = () => {
        updateMini();
        miniInterval = setInterval(updateMini, 1000);
    };
    
    const stop = () => {
        if (miniInterval) {
            clearInterval(miniInterval);
            miniInterval = null;
        }
    };
    
    const destroy = () => {
        stop();
        if (miniElement.parentNode) {
            miniElement.parentNode.removeChild(miniElement);
        }
    };
    
    // 대상 요소에 추가
    if (targetElement) {
        targetElement.appendChild(miniElement);
        start();
    }
    
    return {
        element: miniElement,
        start,
        stop,
        destroy,
        update: updateMini
    };
}

// ============================================
// [SECTION: 타임존 지원]
// ============================================

/**
 * 특정 타임존의 시간 가져오기
 * @param {string} timezone - 타임존 (예: 'Asia/Seoul')
 * @returns {Date} 타임존 적용된 날짜
 */
function getTimeInTimezone(timezone = 'Asia/Seoul') {
    const now = new Date();
    const options = {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    };
    
    const formatter = new Intl.DateTimeFormat('en-US', options);
    const parts = formatter.formatToParts(now);
    
    const dateParts = {};
    parts.forEach(part => {
        if (part.type !== 'literal') {
            dateParts[part.type] = part.value;
        }
    });
    
    return new Date(
        `${dateParts.year}-${dateParts.month}-${dateParts.day}T` +
        `${dateParts.hour}:${dateParts.minute}:${dateParts.second}`
    );
}

// ============================================
// [SECTION: 초기화]
// ============================================

/**
 * 시계 시스템 초기화
 * @param {Object} options - 초기화 옵션
 */
function initClock(options = {}) {
    // 전역 설정과 옵션 병합
    clockConfig = { ...CLOCK_CONFIG, ...options };
    
    // 자동 시작 옵션
    if (options.autoStart !== false) {
        // DOM 준비 확인
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                startClock(clockConfig);
            });
        } else {
            startClock(clockConfig);
        }
    }
    
    // 전역 객체에 등록
    if (typeof window !== 'undefined') {
        window.SystemClock = {
            start: startClock,
            stop: stopClock,
            toggle: toggleClock,
            destroy: destroyClock,
            setPosition: setClockPosition,
            updateStyle: updateClockStyle,
            updateOptions: updateClockOptions,
            createMini: createMiniClock,
            getTimeInTimezone
        };
    }
    
    console.log('[시계] 시스템 초기화 완료');
}

// ============================================
// 기본 내보내기
// ============================================

// 개별 함수 내보내기
export { 
    initClock,
    createClock,
    startClock,
    stopClock,
    destroyClock,
    toggleClock,
    setClockPosition,
    updateClockStyle,
    updateClockOptions,
    createMiniClock,
    getTimeInTimezone,
    formatClockDisplay,
    startClock as updateClock  // 별칭
};

// default export
export default {
    createClock,
    startClock,
    stopClock,
    destroyClock,
    toggleClock,
    setClockPosition,
    updateClockStyle,
    updateClockOptions,
    createMiniClock,
    getTimeInTimezone,
    formatClockDisplay,
    initClock  // 그대로 사용
};

// ============================================
// [NAVIGATION: 파일 정보]
// ============================================
// [내용: 시계 표시 모듈]
// [기능: 헤더 시계 표시 및 floating 시계 생성 (autoStart 옵션)]
// [사용법:
//   - 헤더 시계: startClock('current-time')
//   - Floating 시계: startClock() 또는 initClock({autoStart: true})
//   - 현재 설정: autoStart=false (헤더 전용)
// ]
// [테스트 계획: 전역 설정 통합, 다양한 시계 옵션, 중복 방지]
// #시계 #시간 #헤더