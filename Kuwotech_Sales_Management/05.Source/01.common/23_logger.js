/**
 * ============================================
 * KUWOTECH 영업관리 시스템 - Logger 유틸리티
 * ============================================
 *
 * @파일명: 23_logger.js
 * @작성일: 2025-01-27
 * @설명: 환경별 로깅 시스템 (개발/프로덕션 자동 전환)
 *
 * @기능:
 * - 환경별 로그 레벨 관리
 * - 프로덕션: error, warn만 출력
 * - 개발: 모든 로그 출력
 * - 컬러 구분 및 타임스탬프
 */

// ============================================
// Import
// ============================================
import { detectEnvironment } from './01_global_config.js';

// ============================================
// 로그 레벨 정의
// ============================================
const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    NONE: 4
};

// ============================================
// Logger 클래스
// ============================================
class Logger {
    constructor() {
        // 환경 자동 감지
        this.environment = detectEnvironment();

        // 환경별 로그 레벨 설정
        this.currentLevel = this.environment === 'production'
            ? LOG_LEVELS.WARN  // 프로덕션: warn, error만
            : LOG_LEVELS.DEBUG; // 개발: 모든 로그

        // 로그 스타일
        this.styles = {
            debug: 'color: #9E9E9E; font-weight: normal;',
            info: 'color: #2196F3; font-weight: normal;',
            warn: 'color: #FF9800; font-weight: bold;',
            error: 'color: #F44336; font-weight: bold;',
            timestamp: 'color: #757575; font-weight: normal;'
        };

        // 프로덕션 환경 알림
        if (this.environment === 'production') {
            console.info(
                '%c[Logger] 프로덕션 모드 - WARN/ERROR 로그만 출력됩니다',
                'color: #FF9800; font-weight: bold;'
            );
        }
    }

    /**
     * 로그 레벨 설정
     * @param {string} level - 'debug', 'info', 'warn', 'error', 'none'
     */
    setLevel(level) {
        const upperLevel = level.toUpperCase();
        if (LOG_LEVELS[upperLevel] !== undefined) {
            this.currentLevel = LOG_LEVELS[upperLevel];
            console.info(`[Logger] 로그 레벨 변경: ${level}`);
        } else {
            console.warn(`[Logger] 잘못된 로그 레벨: ${level}`);
        }
    }

    /**
     * 현재 로그 레벨 가져오기
     * @returns {string}
     */
    getLevel() {
        const levels = Object.keys(LOG_LEVELS);
        return levels.find(key => LOG_LEVELS[key] === this.currentLevel) || 'UNKNOWN';
    }

    /**
     * 타임스탬프 생성
     * @returns {string}
     */
    getTimestamp() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const ms = String(now.getMilliseconds()).padStart(3, '0');
        return `${hours}:${minutes}:${seconds}.${ms}`;
    }

    /**
     * 로그 출력 헬퍼
     * @private
     */
    _log(level, levelName, args) {
        if (this.currentLevel > level) return;

        const timestamp = this.getTimestamp();
        const prefix = `[${timestamp}] [${levelName}]`;

        // 스타일 적용 (브라우저만)
        if (typeof window !== 'undefined') {
            console.log(
                `%c${prefix}`,
                this.styles[levelName.toLowerCase()],
                ...args
            );
        } else {
            // Node.js 환경
            console.log(prefix, ...args);
        }
    }

    /**
     * DEBUG 레벨 로그
     * 개발 환경에서만 출력됩니다.
     */
    debug(...args) {
        this._log(LOG_LEVELS.DEBUG, 'DEBUG', args);
    }

    /**
     * INFO 레벨 로그
     * 개발 환경에서만 출력됩니다.
     */
    info(...args) {
        this._log(LOG_LEVELS.INFO, 'INFO', args);
    }

    /**
     * WARN 레벨 로그
     * 모든 환경에서 출력됩니다.
     */
    warn(...args) {
        this._log(LOG_LEVELS.WARN, 'WARN', args);
    }

    /**
     * ERROR 레벨 로그
     * 모든 환경에서 출력됩니다.
     */
    error(...args) {
        this._log(LOG_LEVELS.ERROR, 'ERROR', args);
    }

    /**
     * 그룹 로그 시작
     * @param {string} label - 그룹 레이블
     */
    group(label) {
        if (this.currentLevel <= LOG_LEVELS.DEBUG) {
            console.group(`📂 ${label}`);
        }
    }

    /**
     * 그룹 로그 종료
     */
    groupEnd() {
        if (this.currentLevel <= LOG_LEVELS.DEBUG) {
            console.groupEnd();
        }
    }

    /**
     * 테이블 형식 로그
     * @param {Array|Object} data - 테이블 데이터
     */
    table(data) {
        if (this.currentLevel <= LOG_LEVELS.DEBUG) {
            console.table(data);
        }
    }

    /**
     * 시간 측정 시작
     * @param {string} label - 타이머 레이블
     */
    time(label) {
        if (this.currentLevel <= LOG_LEVELS.DEBUG) {
            console.time(`⏱️ ${label}`);
        }
    }

    /**
     * 시간 측정 종료
     * @param {string} label - 타이머 레이블
     */
    timeEnd(label) {
        if (this.currentLevel <= LOG_LEVELS.DEBUG) {
            console.timeEnd(`⏱️ ${label}`);
        }
    }

    /**
     * 조건부 로그 (assert)
     * @param {boolean} condition - 조건
     * @param  {...any} args - 로그 내용
     */
    assert(condition, ...args) {
        if (!condition) {
            this.error('❌ Assertion failed:', ...args);
        }
    }
}

// ============================================
// 싱글톤 인스턴스
// ============================================
const logger = new Logger();

// ============================================
// Export
// ============================================
export { logger, LOG_LEVELS };
export default logger;

// 전역 노출 (선택적)
if (typeof window !== 'undefined') {
    window.Logger = logger;
}
