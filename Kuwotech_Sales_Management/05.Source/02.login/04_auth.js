// ============================================
// [MODULE: 인증 관리]
// 파일 위치: 05.Source/02.login/04_auth.js
// 작성일: 2025-01-28
// 설명: 로그인 인증 및 세션 관리 (REST API 기반)
// ============================================

// ============================================
// [공통 모듈 임포트]
// ============================================

import { showToast } from '../01.common/14_toast.js';
import { formatDateKorean } from '../01.common/03_format.js';
import { getDB } from '../06.database/01_database_manager.js';
import logger from '../01.common/23_logger.js';
import errorHandler, { AuthError, NetworkError } from '../01.common/24_error_handler.js';

// ============================================
// [보안 설정]
// ============================================

const AUTH_CONFIG = {
    // 세션 만료 시간 (30분)
    SESSION_TIMEOUT: 30 * 60 * 1000,

    // 로그인 시도 제한
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_DURATION: 15 * 60 * 1000, // 15분

    // 비밀번호 규칙
    PASSWORD_MIN_LENGTH: 8,
    PASSWORD_REQUIRE_UPPERCASE: true,
    PASSWORD_REQUIRE_NUMBER: true,
    PASSWORD_REQUIRE_SPECIAL: true,

    // API는 DatabaseManager를 통해 호출
    // (DatabaseManager가 환경에 맞는 API URL 자동 설정)
};

// ============================================
// [CLASS: AuthManager - 인증 관리]
// ============================================

export class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.loginAttempts = new Map(); // IP별 로그인 시도 추적
        this.sessionTimer = null;
        this.dbManager = null; // DatabaseManager 인스턴스
        this.init();
    }

    // ============================================
    // [초기화]
    // ============================================

    async init() {
        // DatabaseManager 인스턴스 가져오기
        this.dbManager = await getDB();

        // 세션 체크
        this.checkSession();

        // 자동 로그아웃 타이머 설정
        this.setupAutoLogout();

        // 보안 이벤트 리스너
        this.setupSecurityListeners();
    }
    
    // ============================================
    // [로그인 처리 - 서버 API 연동]
    // ============================================
    
    async login(username, password) {
        
        // 입력 검증
        if (!this.validateInput(username, password)) {
            return {
                success: false,
                message: '올바르지 않은 입력입니다.'
            };
        }
        
        // 로그인 시도 제한 확인
        if (this.isLockedOut(username)) {
            return {
                success: false,
                message: '너무 많은 로그인 시도로 계정이 일시적으로 잠겼습니다. 15분 후 다시 시도해주세요.'
            };
        }
        
        try {
            // 서버 API 호출
            const response = await this.authenticateWithServer(username, password);
            
            if (response.success) {
                // 로그인 성공
                this.handleLoginSuccess(response.user, response.token);
                
                // 성공 토스트 메시지 표시
                showToast(`환영합니다, ${response.user.name}님!`, 'success');
                
                return {
                    success: true,
                    user: response.user,
                    redirectUrl: this.getRedirectUrl(response.user.role)
                };
            } else {
                // 로그인 실패
                this.handleLoginFailure(username);
                
                // 실패 토스트 메시지 표시
                showToast(response.message || '인증에 실패했습니다.', 'error');
                
                return {
                    success: false,
                    message: response.message || '인증에 실패했습니다.'
                };
            }
            
        } catch (error) {
            // ErrorHandler를 통한 에러 처리
            await errorHandler.handle(
                new AuthError('로그인 처리 오류', error, {
                    userMessage: '로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
                    context: {
                        module: 'auth',
                        action: 'login',
                        username,
                        isDevelopmentMode: this.isDevelopmentMode()
                    }
                }),
                { showToUser: false } // showToast로 직접 표시
            );

            // 개발 모드에서만 임시 로그인 허용
            if (this.isDevelopmentMode()) {
                return this.developmentLogin(username, password);
            }

            // 오류 토스트 메시지 표시
            showToast('서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.', 'error');

            return {
                success: false,
                message: '서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.'
            };
        }
    }
    
    // ============================================
    // [서버 인증 - DatabaseManager 사용]
    // ============================================

    async authenticateWithServer(username, password) {
        // DatabaseManager를 통한 로그인 API 호출
        try {
            // DatabaseManager의 login 메서드 사용
            const user = await this.dbManager.login(username, password);

            // 로그인 성공 시 user 객체 반환
            if (user) {
                return {
                    success: true,
                    user: user,
                    token: this.dbManager.token // DatabaseManager가 저장한 토큰
                };
            } else {
                return {
                    success: false,
                    message: '사용자명 또는 비밀번호가 올바르지 않습니다.'
                };
            }
            
        } catch (error) {
            // ErrorHandler를 통한 에러 처리
            await errorHandler.handle(
                new AuthError('서버 인증 실패', error, {
                    userMessage: '인증 서버와 통신할 수 없습니다.',
                    context: {
                        module: 'auth',
                        action: 'authenticateWithServer',
                        username
                    }
                }),
                { showToUser: false } // 호출자가 메시지 처리
            );

            // 인증 실패 반환
            return {
                success: false,
                message: error.message || '서버 연결에 실패했습니다.'
            };
        }
    }
    
    // ============================================
    // [개발 모드 임시 로그인]
    // ============================================
    
    isDevelopmentMode() {
        return window.location.hostname === 'localhost' || 
               window.location.hostname === '127.0.0.1';
    }
    
    developmentLogin(username, password) {
        logger.warn('⚠️ 개발 모드: 임시 로그인 사용');
        
        // 개발용 임시 계정 (프로덕션에서는 절대 사용 안 됨)
        const devAccounts = {
            'admin': { 
                role: 'admin', 
                name: '개발 관리자',
                department: '개발팀'
            },
            'sales': { 
                role: 'sales', 
                name: '개발 영업담당',
                department: '영업팀'
            }
        };
        
        if (devAccounts[username] && password === 'dev2025!') {
            const user = {
                id: username,
                ...devAccounts[username],
                email: `${username}@dev.kuwotech.com`
            };
            
            this.handleLoginSuccess(user, 'dev-token-' + Date.now());
            
            return {
                success: true,
                user: user,
                redirectUrl: this.getRedirectUrl(user.role)
            };
        }
        
        return {
            success: false,
            message: '개발 모드: 인증 실패'
        };
    }
    
    // ============================================
    // [비밀번호 해싱]
    // ============================================
    
    async hashPassword(password) {
        // Web Crypto API 사용
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hash = await crypto.subtle.digest('SHA-256', data);
        
        return Array.from(new Uint8Array(hash))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }
    
    // ============================================
    // [디바이스 핑거프린트]
    // ============================================
    
    async getDeviceFingerprint() {
        const fingerprint = {
            userAgent: navigator.userAgent,
            language: navigator.language,
            platform: navigator.platform,
            screenResolution: `${screen.width}x${screen.height}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            colorDepth: screen.colorDepth
        };
        
        const json = JSON.stringify(fingerprint);
        const hash = await this.hashPassword(json);
        
        return hash.substring(0, 16); // 16자로 제한
    }
    
    // ============================================
    // [로그인 성공 처리]
    // ============================================
    
    handleLoginSuccess(user, token) {
        // 사용자 정보 저장 (민감한 정보 제외)
        this.currentUser = {
            id: user.id,
            name: user.name,
            role: user.role,
            department: user.department,
            email: user.email
        };
        
        this.isAuthenticated = true;
        
        // 세션 저장
        this.saveSession(this.currentUser, token);
        
        // ✅ FIX: 사용자 정보를 별도로 저장 (sales_layout.js와 admin_layout.js에서 사용)
        sessionStorage.setItem('user', JSON.stringify(this.currentUser));
        localStorage.setItem('userName', this.currentUser.name); // 이름 별도 저장
        localStorage.setItem('userRole', this.currentUser.role); // 역할 별도 저장
        
        // 로그인 시도 초기화
        this.loginAttempts.delete(user.id);
        
        // 로그인 시간 기록
        this.recordLoginTime();
        
        // 보안 로그
        this.logSecurityEvent('LOGIN_SUCCESS', {
            userId: user.id,
            timestamp: new Date().toISOString()
        });
        
    }
    
    // ============================================
    // [로그인 실패 처리]
    // ============================================
    
    handleLoginFailure(username) {
        // 로그인 시도 횟수 증가
        const attempts = (this.loginAttempts.get(username) || 0) + 1;
        this.loginAttempts.set(username, attempts);
        
        // 보안 로그
        this.logSecurityEvent('LOGIN_FAILURE', {
            username: username,
            attempts: attempts,
            timestamp: new Date().toISOString()
        });
        
    }
    
    // ============================================
    // [계정 잠금 확인]
    // ============================================
    
    isLockedOut(username) {
        const attempts = this.loginAttempts.get(username) || 0;
        return attempts >= AUTH_CONFIG.MAX_LOGIN_ATTEMPTS;
    }
    
    // ============================================
    // [입력 검증]
    // ============================================
    
    validateInput(username, password) {
        // XSS 방지를 위한 특수문자 체크
        const dangerousPattern = /<script|javascript:|on\w+=/i;
        
        if (!username || !password) {
            return false;
        }
        
        if (dangerousPattern.test(username) || dangerousPattern.test(password)) {
            this.logSecurityEvent('SUSPICIOUS_INPUT', {
                timestamp: new Date().toISOString()
            });
            return false;
        }
        
        // 길이 체크
        if (username.length < 2 || username.length > 50) {
            return false;
        }
        
        if (password.length < AUTH_CONFIG.PASSWORD_MIN_LENGTH) {
            return false;
        }
        
        return true;
    }
    
    // ============================================
    // [세션 관리]
    // ============================================
    
    async saveSession(user, token) {
        const sessionData = {
            user: user,
            token: token,
            createdAt: Date.now(),
            expiresAt: Date.now() + AUTH_CONFIG.SESSION_TIMEOUT
        };

        // 세션 스토리지 (탭 닫으면 삭제)
        sessionStorage.setItem('session', JSON.stringify(sessionData));

        // 로컬 스토리지 (Remember Me 옵션 시)
        if (document.getElementById('rememberMe')?.checked) {
            const encryptedData = await this.encryptData(sessionData);
            if (encryptedData) {
                localStorage.setItem('session', encryptedData);
            }
        }
    }
    
    async checkSession() {
        try {
            // 세션 스토리지 우선 확인
            let sessionData = sessionStorage.getItem('session');

            if (!sessionData) {
                // 로컬 스토리지 확인
                const encryptedData = localStorage.getItem('session');
                if (encryptedData) {
                    sessionData = await this.decryptData(encryptedData);
                }
            }
            
            if (sessionData) {
                const session = JSON.parse(sessionData);
                
                // 세션 만료 확인
                if (session.expiresAt > Date.now()) {
                    this.currentUser = session.user;
                    this.isAuthenticated = true;
                    
                    // 세션 갱신
                    this.refreshSession();
                } else {
                    // 만료된 세션 정리
                    this.clearSession();
                }
            }
            
        } catch (error) {
            // ErrorHandler를 통한 에러 처리
            await errorHandler.handle(
                new AuthError('세션 확인 실패', error, {
                    userMessage: '세션 정보를 확인할 수 없습니다.',
                    context: {
                        module: 'auth',
                        action: 'checkSession'
                    },
                    severity: 'MEDIUM'
                }),
                { showToUser: false } // Silent session check
            );
            this.clearSession();
        }
    }
    
    refreshSession() {
        if (this.isAuthenticated && this.currentUser) {
            const sessionData = {
                user: this.currentUser,
                token: localStorage.getItem('authToken'),
                createdAt: Date.now(),
                expiresAt: Date.now() + AUTH_CONFIG.SESSION_TIMEOUT
            };

            sessionStorage.setItem('session', JSON.stringify(sessionData));
        }
    }
    
    clearSession() {
        this.currentUser = null;
        this.isAuthenticated = false;
        sessionStorage.clear();
        localStorage.removeItem('session');
        
        // ✅ FIX: 추가된 사용자 정보도 정리
        localStorage.removeItem('userName');
        localStorage.removeItem('userRole');
        localStorage.removeItem('loginData');
        
        // 타이머 정리
        if (this.sessionTimer) {
            clearTimeout(this.sessionTimer);
            this.sessionTimer = null;
        }
    }
    
    // ============================================
    // [자동 로그아웃]
    // ============================================
    
    setupAutoLogout() {
        // 기존 타이머 정리
        if (this.sessionTimer) {
            clearTimeout(this.sessionTimer);
        }
        
        // 세션 만료 5분 전 경고
        const warningTime = AUTH_CONFIG.SESSION_TIMEOUT - (5 * 60 * 1000);
        
        this.sessionTimer = setTimeout(() => {
            this.showSessionWarning();
        }, warningTime);
        
        // 사용자 활동 감지
        this.resetActivityTimer();
    }
    
    resetActivityTimer() {
        const events = ['mousedown', 'keypress', 'scroll', 'touchstart'];
        
        events.forEach(event => {
            document.addEventListener(event, () => {
                if (this.isAuthenticated) {
                    this.refreshSession();
                    this.setupAutoLogout();
                }
            }, { once: true });
        });
    }
    
    showSessionWarning() {
        if (confirm('세션이 5분 후 만료됩니다. 계속 사용하시겠습니까?')) {
            this.refreshSession();
            this.setupAutoLogout();
        } else {
            setTimeout(() => this.logout(), 5 * 60 * 1000);
        }
    }
    
    // ============================================
    // [로그아웃]
    // ============================================
    
    async logout() {

        // DatabaseManager를 통한 로그아웃
        try {
            await this.dbManager.logout();
        } catch (error) {
            // ErrorHandler를 통한 에러 처리
            await errorHandler.handle(
                new NetworkError('로그아웃 API 호출 실패', error, {
                    userMessage: '서버 로그아웃 처리에 실패했습니다.',
                    context: {
                        module: 'auth',
                        action: 'logout',
                        userId: this.currentUser?.id
                    },
                    severity: 'LOW' // 로컬 세션은 정리됨
                }),
                { showToUser: false } // 로그아웃은 계속 진행
            );
        }

        // 보안 로그
        this.logSecurityEvent('LOGOUT', {
            userId: this.currentUser?.id,
            timestamp: new Date().toISOString()
        });

        // 세션 정리
        this.clearSession();

        // 로그아웃 메시지 표시
        showToast('안전하게 로그아웃 되었습니다.', 'info');

        // 로그인 페이지로 리다이렉트
        setTimeout(() => {
            window.location.href = '/02.login/01_login.html';
        }, 500);
    }
    
    // ============================================
    // [보안 이벤트 리스너]
    // ============================================
    
    setupSecurityListeners() {
        // 다른 탭에서 로그아웃 감지
        window.addEventListener('storage', (e) => {
            if (e.key === 'session' && !e.newValue) {
                this.clearSession();
                window.location.href = '/02.login/01_login.html';
            }
        });
        
        // 페이지 떠나기 전 확인
        window.addEventListener('beforeunload', (e) => {
            if (this.isAuthenticated && this.hasUnsavedChanges()) {
                e.preventDefault();
                e.returnValue = '저장하지 않은 변경사항이 있습니다. 정말 나가시겠습니까?';
            }
        });
        
        // 네트워크 상태 감지
        window.addEventListener('online', () => {
            this.refreshSession();
        });
        
        window.addEventListener('offline', () => {
        });
    }
    
    // ============================================
    // [보안 로그]
    // ============================================
    
    logSecurityEvent(eventType, data) {
        const logEntry = {
            type: eventType,
            data: data,
            timestamp: Date.now(),
            fingerprint: this.getDeviceFingerprint()
        };
        
        // 로컬 로그 (디버깅용)
        
        // 서버로 전송 (백그라운드)
        this.sendSecurityLog(logEntry).catch(async (err) => {
            await errorHandler.handle(
                new NetworkError('보안 로그 전송 실패', err, {
                    userMessage: '보안 로그를 서버로 전송하지 못했습니다.',
                    context: {
                        module: 'auth',
                        action: 'sendSecurityLog',
                        eventType: eventType
                    },
                    severity: 'LOW' // 백그라운드 작업, 중요하지 않음
                }),
                { showToUser: false, silent: true }
            );
        });
    }
    
    async sendSecurityLog(logEntry) {
        // TODO: DatabaseManager를 통한 보안 로그 전송
        // 현재는 콘솔 로그만 사용

        // 추후 백엔드 보안 로그 API 구현 시 활성화
        // try {
        //     await this.dbManager.request(`${ENDPOINTS.SECURITY}/log`, {
        //         method: 'POST',
        //         body: JSON.stringify(logEntry)
        //     });
        // } catch (error) {
        //     // 로그 전송 실패는 무시 (사용자 경험에 영향 없음)
        // }
    }
    
    // ============================================
    // [유틸리티]
    // ============================================
    
    getRedirectUrl(role) {
        const redirectMap = {
            'admin': '/04.admin_mode/03_admin_main.html',
            'sales': '/03.sales_mode/04_sales_main.html',
            'dev': '/dev/dashboard.html'
        };
        
        return redirectMap[role] || '/index.html';
    }
    
    hasUnsavedChanges() {
        // 저장하지 않은 변경사항 확인 로직
        return false; // 구현 필요
    }
    
    async encryptData(data) {
        // 간단한 암호화 (프로덕션에서는 더 강력한 암호화 필요)
        try {
            const jsonStr = JSON.stringify(data);
            return btoa(encodeURIComponent(jsonStr));
        } catch (error) {
            await errorHandler.handle(
                new AuthError('데이터 암호화 실패', error, {
                    userMessage: '데이터를 안전하게 저장할 수 없습니다.',
                    context: {
                        module: 'auth',
                        action: 'encryptData'
                    },
                    severity: 'MEDIUM'
                }),
                { showToUser: false }
            );
            return null;
        }
    }
    
    async decryptData(encryptedData) {
        // 복호화
        try {
            const jsonStr = decodeURIComponent(atob(encryptedData));
            return jsonStr;
        } catch (error) {
            await errorHandler.handle(
                new AuthError('데이터 복호화 실패', error, {
                    userMessage: '저장된 데이터를 읽을 수 없습니다.',
                    context: {
                        module: 'auth',
                        action: 'decryptData'
                    },
                    severity: 'MEDIUM'
                }),
                { showToUser: false }
            );
            return null;
        }
    }
    
    recordLoginTime() {
        const loginHistory = JSON.parse(localStorage.getItem('loginHistory') || '[]');
        
        loginHistory.push({
            userId: this.currentUser.id,
            timestamp: Date.now(),
            formattedTime: formatDateKorean(new Date()),
            fingerprint: this.getDeviceFingerprint()
        });
        
        // 최근 10개만 유지
        if (loginHistory.length > 10) {
            loginHistory.shift();
        }
        
        localStorage.setItem('loginHistory', JSON.stringify(loginHistory));
    }
    
    // ============================================
    // [캐시된 자격 증명 (오프라인 모드)]
    // ============================================
    
    async checkCachedCredentials(username, hashedPassword) {
        // 오프라인 모드에서 캐시된 자격 증명 확인
        // 보안상 제한적으로만 사용
        
        const cached = localStorage.getItem('cachedAuth');
        
        if (!cached) {
            return { success: false, message: '오프라인 상태에서는 로그인할 수 없습니다.' };
        }
        
        try {
            const decrypted = await this.decryptData(cached);
            const cachedAuth = JSON.parse(decrypted);
            
            if (cachedAuth.username === username && 
                cachedAuth.password === hashedPassword &&
                cachedAuth.expiresAt > Date.now()) {
                
                return {
                    success: true,
                    user: cachedAuth.user,
                    token: 'offline-token-' + Date.now()
                };
            }
        } catch (error) {
            await errorHandler.handle(
                new AuthError('캐시 확인 실패', error, {
                    userMessage: '저장된 인증 정보를 확인할 수 없습니다.',
                    context: {
                        module: 'auth',
                        action: 'checkCachedCredentials',
                        username
                    },
                    severity: 'MEDIUM'
                }),
                { showToUser: false }
            );
        }

        return { success: false, message: '인증 정보를 확인할 수 없습니다.' };
    }
}

// ============================================
// [싱글톤 인스턴스]
// ============================================

let authInstance = null;

export function getAuthManager() {
    if (!authInstance) {
        authInstance = new AuthManager();
    }
    return authInstance;
}

// ============================================
// [내보내기]
// ============================================

export default {
    AuthManager,
    getAuthManager,
    AUTH_CONFIG
};
