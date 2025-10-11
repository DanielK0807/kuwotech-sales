/**
 * 세션 매니저 - 사용자 세션 관리
 * 작성일: 2025-01-29
 * 버전: 1.0.0
 */

import StorageManager from './15_storage_manager.js';
import logger from './23_logger.js';

class SessionManager {
    constructor() {
        this.storage = new StorageManager('session_');
        this.storage.useSessionStorage(); // 세션 스토리지 사용
        
        this.sessionTimeout = 30 * 60 * 1000; // 30분
        this.warningTime = 5 * 60 * 1000; // 5분 전 경고
        this.checkInterval = 60 * 1000; // 1분마다 체크
        
        this.lastActivity = Date.now();
        this.sessionTimer = null;
        this.warningShown = false;
        
        // 활동 감지 이벤트 등록
        this.setupActivityListeners();
        
        // 세션 타이머 시작
        this.startSessionTimer();
    }
    
    /**
     * 사용자 활동 감지 설정
     */
    setupActivityListeners() {
        const events = ['click', 'keypress', 'mousemove', 'scroll', 'touchstart'];
        
        events.forEach(event => {
            document.addEventListener(event, () => {
                this.updateActivity();
            }, { passive: true });
        });
        
        // 페이지 가시성 변경 감지
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.updateActivity();
            }
        });
    }
    
    /**
     * 활동 시간 업데이트
     */
    updateActivity() {
        this.lastActivity = Date.now();
        this.warningShown = false;
        this.storage.set('lastActivity', this.lastActivity);
    }
    
    /**
     * 세션 타이머 시작
     */
    startSessionTimer() {
        this.sessionTimer = setInterval(() => {
            this.checkSession();
        }, this.checkInterval);
    }
    
    /**
     * 세션 타이머 중지
     */
    stopSessionTimer() {
        if (this.sessionTimer) {
            clearInterval(this.sessionTimer);
            this.sessionTimer = null;
        }
    }
    
    /**
     * 세션 상태 확인
     */
    checkSession() {
        const now = Date.now();
        const timeSinceActivity = now - this.lastActivity;
        const timeRemaining = this.sessionTimeout - timeSinceActivity;
        
        // 세션 만료
        if (timeRemaining <= 0) {
            this.expireSession();
            return;
        }
        
        // 경고 표시
        if (timeRemaining <= this.warningTime && !this.warningShown) {
            this.showSessionWarning(timeRemaining);
            this.warningShown = true;
        }
    }
    
    /**
     * 세션 경고 표시
     */
    showSessionWarning(timeRemaining) {
        const minutes = Math.floor(timeRemaining / 60000);
        const message = `세션이 ${minutes}분 후 만료됩니다. 계속하시려면 화면을 클릭하세요.`;
        
        // Toast 또는 Modal로 경고 표시
        if (window.Toast) {
            window.Toast.show(message, 'warning');
        } else {
            logger.warn(message);
        }
    }
    
    /**
     * 세션 만료 처리
     */
    expireSession() {
        this.stopSessionTimer();
        this.clear();
        
        if (window.Toast) {
            window.Toast.show('세션이 만료되었습니다. 다시 로그인해주세요.', 'error');
        }
        
        setTimeout(() => {
            window.location.href = '/02.login/01_login.html';
        }, 2000);
    }
    
    /**
     * 사용자 정보 설정
     */
    setUser(user) {
        this.storage.set('user', user);
        this.updateActivity();
    }
    
    /**
     * 사용자 정보 조회
     */
    getUser() {
        return this.storage.get('user');
    }
    
    /**
     * 토큰 설정
     */
    setToken(token) {
        this.storage.set('token', token);
        this.storage.set('tokenTime', Date.now());
    }
    
    /**
     * 토큰 조회
     */
    getToken() {
        return this.storage.get('token');
    }
    
    /**
     * 토큰 유효성 확인
     */
    isTokenValid() {
        const token = this.getToken();
        if (!token) return false;
        
        const tokenTime = this.storage.get('tokenTime');
        if (!tokenTime) return false;
        
        // 토큰 만료 시간 확인 (24시간)
        const tokenAge = Date.now() - tokenTime;
        const maxAge = 24 * 60 * 60 * 1000;
        
        return tokenAge < maxAge;
    }
    
    /**
     * 권한 정보 설정
     */
    setPermissions(permissions) {
        this.storage.set('permissions', permissions);
    }
    
    /**
     * 권한 정보 조회
     */
    getPermissions() {
        return this.storage.get('permissions') || [];
    }
    
    /**
     * 특정 권한 확인
     */
    hasPermission(permission) {
        const permissions = this.getPermissions();
        return permissions.includes(permission);
    }
    
    /**
     * 세션 데이터 설정
     */
    set(key, value) {
        this.storage.set(key, value);
    }
    
    /**
     * 세션 데이터 조회
     */
    get(key) {
        return this.storage.get(key);
    }
    
    /**
     * 세션 데이터 제거
     */
    remove(key) {
        this.storage.remove(key);
    }
    
    /**
     * 세션 복원
     */
    async restore() {
        try {
            const user = this.getUser();
            const token = this.getToken();
            
            if (user && token && this.isTokenValid()) {
                // 서버에 토큰 검증 요청 (옵션)
                // await this.verifyTokenWithServer(token);
                
                this.lastActivity = this.storage.get('lastActivity') || Date.now();
                return true;
            }
            
            return false;
        } catch (error) {
            logger.error('세션 복원 실패:', error);
            return false;
        }
    }
    
    /**
     * 세션 갱신
     */
    async refresh() {
        try {
            const token = this.getToken();
            if (!token) return false;
            
            // 서버에 토큰 갱신 요청
            // const newToken = await this.refreshTokenWithServer(token);
            // this.setToken(newToken);
            
            this.updateActivity();
            return true;
        } catch (error) {
            logger.error('세션 갱신 실패:', error);
            return false;
        }
    }
    
    /**
     * 세션 클리어
     */
    clear() {
        this.stopSessionTimer();
        this.storage.clear();
        this.lastActivity = Date.now();
        this.warningShown = false;
    }
    
    /**
     * 세션 정보 출력 (디버깅용)
     */
    debug() {
        const user = this.getUser();
        const token = this.getToken();
        const isValid = this.isTokenValid();
        const timeSinceActivity = Date.now() - this.lastActivity;

        logger.debug('Session Debug Info', {
            user,
            hasToken: !!token,
            isValid,
            timeSinceActivity,
            lastActivity: new Date(this.lastActivity).toLocaleString()
        });
    }
}

// 싱글톤 인스턴스 생성
const sessionManager = new SessionManager();

// 전역으로 노출
window.sessionManager = sessionManager;

// 헬퍼 함수들
export function startSessionMonitoring() {
    sessionManager.startSessionTimer();
}

export function handleLogout() {
    
    // 현재 로그인 데이터 백업 (역할선택 단계로 돌아가기 위해)
    const user = sessionManager.getUser();
    
    // 세션 클리어
    sessionManager.clear();
    sessionManager.stopSessionTimer();
    
    // ✅ Stage 5에서 저장한 user 데이터도 삭제
    sessionStorage.removeItem('user');
    
    // 역할선택 단계(Stage 3)로 돌아가기 위해 필요한 데이터 복원
    if (user) {
        // Stage 0, 1, 2는 완료된 것으로 표시
        sessionStorage.setItem('stage0_completed', 'true');
        sessionStorage.setItem('stage1_completed', 'true');
        sessionStorage.setItem('stage2_completed', 'true');
        
        // Stage 0 데이터 (회사 인증) 복원
        if (user.companyCode) {
            sessionStorage.setItem('stage0_data', JSON.stringify({
                companyCode: user.companyCode
            }));
            sessionStorage.setItem('stage0_verified', 'true');
        }
        
        // Stage 2 데이터 (엑셀 업로드) 복원
        if (user.employeesData || user.fileName) {
            sessionStorage.setItem('stage2_verified', 'true');
            sessionStorage.setItem('employees_data', user.employeesData || '[]');
        }
        
    }
    
    // 로그인 페이지로 리다이렉트 (자동으로 Stage 3으로 이동됨)
    window.location.href = '../../02.login/01_login.html';
}

export function isAuthenticated() {
    return sessionManager.getUser() !== null && sessionManager.isTokenValid();
}

export function hasRole(role) {
    const user = sessionManager.getUser();
    if (!user) return false;
    
    const userRole = (user.role || user.type || '').toLowerCase();
    const checkRole = role.toLowerCase();
    
    return userRole === checkRole;
}

export function debugSession() {
    sessionManager.debug();
}

export default sessionManager;