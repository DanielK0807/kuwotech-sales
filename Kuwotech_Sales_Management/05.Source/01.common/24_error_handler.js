/**
 * ============================================
 * KUWOTECH 영업관리 시스템 - 중앙화된 에러 핸들러
 * ============================================
 * 파일: 01.common/24_error_handler.js
 * 작성일: 2025-01-27
 *
 * 목적: 애플리케이션 전역 에러 처리 표준화
 *
 * 주요 기능:
 * - 에러 타입 분류 및 처리
 * - 사용자 친화적 메시지 자동 생성
 * - 에러 복구 및 재시도 로직
 * - 통합 로깅 및 모니터링
 * ============================================
 */

import logger from './23_logger.js';
import { showToast } from './14_toast.js';
import { showModal } from './06_modal.js';

// ============================================
// [SECTION: 에러 타입 정의]
// ============================================

/**
 * 애플리케이션 에러 타입
 */
export const ErrorType = {
    NETWORK: 'NETWORK',
    AUTH: 'AUTH',
    VALIDATION: 'VALIDATION',
    DATABASE: 'DATABASE',
    PERMISSION: 'PERMISSION',
    NOT_FOUND: 'NOT_FOUND',
    BUSINESS_LOGIC: 'BUSINESS_LOGIC',
    UNKNOWN: 'UNKNOWN'
};

/**
 * 에러 심각도
 */
export const ErrorSeverity = {
    LOW: 'LOW',           // 경고 수준
    MEDIUM: 'MEDIUM',     // 일반 에러
    HIGH: 'HIGH',         // 심각한 에러
    CRITICAL: 'CRITICAL'  // 치명적 에러
};

// ============================================
// [SECTION: 커스텀 에러 클래스]
// ============================================

/**
 * 기본 애플리케이션 에러 클래스
 */
export class AppError extends Error {
    constructor(message, type = ErrorType.UNKNOWN, originalError = null, options = {}) {
        super(message);
        this.name = 'AppError';
        this.type = type;
        this.originalError = originalError;
        this.timestamp = new Date().toISOString();
        this.severity = options.severity || ErrorSeverity.MEDIUM;
        this.recoverable = options.recoverable !== false; // 기본값 true
        this.userMessage = options.userMessage || this.getDefaultUserMessage();
        this.context = options.context || {};
    }

    /**
     * 기본 사용자 메시지 생성
     */
    getDefaultUserMessage() {
        const messages = {
            [ErrorType.NETWORK]: '네트워크 연결을 확인해주세요.',
            [ErrorType.AUTH]: '인증에 실패했습니다. 다시 로그인해주세요.',
            [ErrorType.VALIDATION]: '입력하신 정보를 확인해주세요.',
            [ErrorType.DATABASE]: '데이터 처리 중 오류가 발생했습니다.',
            [ErrorType.PERMISSION]: '접근 권한이 없습니다.',
            [ErrorType.NOT_FOUND]: '요청하신 정보를 찾을 수 없습니다.',
            [ErrorType.BUSINESS_LOGIC]: '작업을 처리할 수 없습니다.',
            [ErrorType.UNKNOWN]: '알 수 없는 오류가 발생했습니다.'
        };
        return messages[this.type] || messages[ErrorType.UNKNOWN];
    }
}

/**
 * 네트워크 에러
 */
export class NetworkError extends AppError {
    constructor(message, originalError = null, options = {}) {
        super(message, ErrorType.NETWORK, originalError, {
            ...options,
            severity: options.severity || ErrorSeverity.HIGH,
            recoverable: true
        });
        this.name = 'NetworkError';
    }
}

/**
 * 인증 에러
 */
export class AuthError extends AppError {
    constructor(message, originalError = null, options = {}) {
        super(message, ErrorType.AUTH, originalError, {
            ...options,
            severity: options.severity || ErrorSeverity.HIGH,
            recoverable: false
        });
        this.name = 'AuthError';
    }
}

/**
 * 유효성 검증 에러
 */
export class ValidationError extends AppError {
    constructor(message, originalError = null, options = {}) {
        super(message, ErrorType.VALIDATION, originalError, {
            ...options,
            severity: options.severity || ErrorSeverity.LOW,
            recoverable: true
        });
        this.name = 'ValidationError';
    }
}

/**
 * 데이터베이스 에러
 */
export class DatabaseError extends AppError {
    constructor(message, originalError = null, options = {}) {
        super(message, ErrorType.DATABASE, originalError, {
            ...options,
            severity: options.severity || ErrorSeverity.HIGH,
            recoverable: true
        });
        this.name = 'DatabaseError';
    }
}

/**
 * 권한 에러
 */
export class PermissionError extends AppError {
    constructor(message, originalError = null, options = {}) {
        super(message, ErrorType.PERMISSION, originalError, {
            ...options,
            severity: options.severity || ErrorSeverity.MEDIUM,
            recoverable: false
        });
        this.name = 'PermissionError';
    }
}

/**
 * Not Found 에러
 */
export class NotFoundError extends AppError {
    constructor(message, originalError = null, options = {}) {
        super(message, ErrorType.NOT_FOUND, originalError, {
            ...options,
            severity: options.severity || ErrorSeverity.LOW,
            recoverable: true
        });
        this.name = 'NotFoundError';
    }
}

// ============================================
// [SECTION: ErrorHandler 클래스]
// ============================================

class ErrorHandler {
    constructor() {
        this.errorListeners = [];
        this.retryAttempts = new Map(); // 재시도 카운터
        this.maxRetries = 3;
        this.retryDelay = 1000; // 1초
    }

    /**
     * 에러 처리 (메인 진입점)
     * @param {Error} error - 원본 에러
     * @param {Object} options - 처리 옵션
     */
    async handle(error, options = {}) {
        const {
            context = {},
            showToUser = true,
            allowRetry = false,
            retryFn = null,
            fallbackFn = null,
            silent = false
        } = options;

        // AppError로 변환
        const appError = this.normalizeError(error, context);

        // 로깅
        this.logError(appError, context);

        // 사용자에게 표시
        if (showToUser && !silent) {
            this.showErrorToUser(appError);
        }

        // 재시도 로직
        if (allowRetry && retryFn && appError.recoverable) {
            const retryKey = this.getRetryKey(context);
            const attempts = this.retryAttempts.get(retryKey) || 0;

            if (attempts < this.maxRetries) {
                this.retryAttempts.set(retryKey, attempts + 1);
                logger.debug(`[에러 핸들러] 재시도 ${attempts + 1}/${this.maxRetries}`, { context });

                await this.delay(this.retryDelay * (attempts + 1)); // 지수 백오프

                try {
                    const result = await retryFn();
                    this.retryAttempts.delete(retryKey); // 성공 시 카운터 리셋
                    return { success: true, data: result };
                } catch (retryError) {
                    return this.handle(retryError, options);
                }
            } else {
                this.retryAttempts.delete(retryKey);
                logger.error('[에러 핸들러] 최대 재시도 횟수 초과', { context });
            }
        }

        // 폴백 함수 실행
        if (fallbackFn) {
            try {
                const fallbackResult = await fallbackFn();
                return { success: true, data: fallbackResult, usedFallback: true };
            } catch (fallbackError) {
                logger.error('[에러 핸들러] 폴백 함수 실패:', fallbackError);
            }
        }

        // 에러 리스너 알림
        this.notifyListeners(appError);

        return { success: false, error: appError };
    }

    /**
     * 에러를 AppError로 정규화
     */
    normalizeError(error, context = {}) {
        // 이미 AppError인 경우
        if (error instanceof AppError) {
            error.context = { ...error.context, ...context };
            return error;
        }

        // TypeError, ReferenceError 등
        if (error instanceof TypeError || error instanceof ReferenceError) {
            return new AppError(
                error.message,
                ErrorType.BUSINESS_LOGIC,
                error,
                {
                    context,
                    severity: ErrorSeverity.HIGH,
                    userMessage: '프로그램 오류가 발생했습니다. 개발팀에 문의해주세요.'
                }
            );
        }

        // HTTP 에러 감지
        if (error.message && (
            error.message.includes('fetch') ||
            error.message.includes('network') ||
            error.message.includes('Failed to fetch')
        )) {
            return new NetworkError(
                error.message,
                error,
                { context }
            );
        }

        // 401, 403 에러 감지
        if (error.status === 401 || error.message?.includes('unauthorized')) {
            return new AuthError(
                error.message || '인증이 만료되었습니다',
                error,
                { context }
            );
        }

        if (error.status === 403 || error.message?.includes('forbidden')) {
            return new PermissionError(
                error.message || '접근 권한이 없습니다',
                error,
                { context }
            );
        }

        // 404 에러
        if (error.status === 404 || error.message?.includes('not found')) {
            return new NotFoundError(
                error.message || '데이터를 찾을 수 없습니다',
                error,
                { context }
            );
        }

        // 기본 에러
        return new AppError(
            error.message || '알 수 없는 오류가 발생했습니다',
            ErrorType.UNKNOWN,
            error,
            { context }
        );
    }

    /**
     * 에러 로깅
     */
    logError(appError, context = {}) {
        const logData = {
            type: appError.type,
            severity: appError.severity,
            message: appError.message,
            timestamp: appError.timestamp,
            context: { ...appError.context, ...context },
            stack: appError.originalError?.stack || appError.stack
        };

        switch (appError.severity) {
            case ErrorSeverity.CRITICAL:
            case ErrorSeverity.HIGH:
                logger.error(`[${appError.type}] ${appError.message}`, logData);
                break;
            case ErrorSeverity.MEDIUM:
                logger.warn(`[${appError.type}] ${appError.message}`, logData);
                break;
            case ErrorSeverity.LOW:
                logger.debug(`[${appError.type}] ${appError.message}`, logData);
                break;
        }
    }

    /**
     * 사용자에게 에러 표시
     */
    showErrorToUser(appError) {
        const toastType = this.getToastType(appError.severity);

        // 심각한 에러는 모달로 표시
        if (appError.severity === ErrorSeverity.CRITICAL) {
            showModal({
                title: '⚠️ 시스템 오류',
                content: `
                    <div style="padding: 20px; text-align: center;">
                        <p style="font-size: 16px; margin-bottom: 15px;">${appError.userMessage}</p>
                        <p style="font-size: 14px; color: var(--text-secondary);">
                            문제가 지속되면 시스템 관리자에게 문의하세요.
                        </p>
                    </div>
                `,
                size: 'small',
                buttons: [
                    {
                        text: '확인',
                        type: 'primary',
                        onClick: () => true
                    }
                ]
            });
        } else {
            // 일반 에러는 토스트로 표시
            showToast(appError.userMessage, toastType);
        }
    }

    /**
     * 에러 심각도에 따른 토스트 타입 결정
     */
    getToastType(severity) {
        switch (severity) {
            case ErrorSeverity.CRITICAL:
            case ErrorSeverity.HIGH:
                return 'error';
            case ErrorSeverity.MEDIUM:
                return 'warning';
            case ErrorSeverity.LOW:
                return 'info';
            default:
                return 'error';
        }
    }

    /**
     * 재시도 키 생성
     */
    getRetryKey(context) {
        return `${context.module || 'unknown'}_${context.action || 'unknown'}`;
    }

    /**
     * 지연 함수
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 에러 리스너 등록
     */
    addListener(listener) {
        this.errorListeners.push(listener);
    }

    /**
     * 에러 리스너 제거
     */
    removeListener(listener) {
        const index = this.errorListeners.indexOf(listener);
        if (index > -1) {
            this.errorListeners.splice(index, 1);
        }
    }

    /**
     * 리스너들에게 에러 알림
     */
    notifyListeners(appError) {
        this.errorListeners.forEach(listener => {
            try {
                listener(appError);
            } catch (error) {
                logger.error('[에러 핸들러] 리스너 실행 실패:', error);
            }
        });
    }

    /**
     * 전역 에러 핸들러 설정
     */
    setupGlobalHandlers() {
        // 전역 unhandledrejection 핸들러
        window.addEventListener('unhandledrejection', (event) => {
            event.preventDefault();
            logger.error('[전역 에러] Unhandled Promise Rejection:', event.reason);
            this.handle(event.reason, {
                context: { source: 'unhandledrejection' },
                showToUser: true
            });
        });

        // 전역 error 핸들러
        window.addEventListener('error', (event) => {
            event.preventDefault();
            logger.error('[전역 에러] Uncaught Error:', event.error);
            this.handle(event.error, {
                context: { source: 'uncaught', filename: event.filename, lineno: event.lineno },
                showToUser: true
            });
        });

        logger.debug('[에러 핸들러] 전역 에러 핸들러 설정 완료');
    }
}

// ============================================
// [SECTION: 싱글톤 인스턴스 및 Export]
// ============================================

const errorHandler = new ErrorHandler();

// 전역 에러 핸들러 자동 설정
if (typeof window !== 'undefined') {
    errorHandler.setupGlobalHandlers();
}

export default errorHandler;

// ============================================
// [SECTION: 유틸리티 함수]
// ============================================

/**
 * 에러를 안전하게 처리하는 헬퍼 함수
 * @param {Function} fn - 실행할 함수
 * @param {Object} options - 에러 처리 옵션
 */
export async function safeExecute(fn, options = {}) {
    try {
        const result = await fn();
        return { success: true, data: result };
    } catch (error) {
        return errorHandler.handle(error, options);
    }
}

/**
 * 재시도 로직이 포함된 안전한 실행
 * @param {Function} fn - 실행할 함수
 * @param {Object} options - 옵션
 */
export async function safeExecuteWithRetry(fn, options = {}) {
    return errorHandler.handle(null, {
        ...options,
        allowRetry: true,
        retryFn: fn
    });
}

/**
 * try-catch 블록을 대체하는 래퍼
 *
 * @example
 * const result = await handleError(
 *   async () => await apiCall(),
 *   { context: { module: 'api', action: 'fetchData' } }
 * );
 * if (result.success) {
 *   // 성공 처리
 * }
 */
export async function handleError(fn, options = {}) {
    return safeExecute(fn, {
        showToUser: true,
        ...options
    });
}
