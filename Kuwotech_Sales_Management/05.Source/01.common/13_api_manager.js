/**
 * KUWOTECH 영업관리 시스템
 * API 관리자 - 서버 통신 관리
 * 작성일: 2025-01-27
 * 업데이트: 2025-10-06 - 자동 재연결 및 모니터링 기능 추가
 */

import Storage from './15_storage_manager.js';
import { detectEnvironment, getApiBaseUrl } from './01_global_config.js';
import logger from './23_logger.js';
import errorHandler, { NetworkError, ValidationError } from './24_error_handler.js';

// ============================================
// API 설정
// ============================================
const API_CONFIG = {
    // 개발 서버 (로컬)
    development: {
        baseURL: 'http://localhost:3000/api',
        timeout: 10000,
        headers: {
            'Content-Type': 'application/json'
        }
    },
    
    // 테스트 서버
    staging: {
        baseURL: 'https://test-api.kuwotech.com/api',
        timeout: 15000,
        headers: {
            'Content-Type': 'application/json'
        }
    },
    
    // 운영 서버 (Railway)
    production: {
        baseURL: 'https://kuwotech-sales-production-aa64.up.railway.app/api',
        timeout: 20000,
        headers: {
            'Content-Type': 'application/json'
        }
    }
};

// ============================================
// API Manager 클래스 (싱글톤 패턴)
// ============================================
class ApiManager {
    // 싱글톤 인스턴스
    static instance = null;

    /**
     * 싱글톤 인스턴스 가져오기
     * @param {string} environment - 환경 (선택)
     * @returns {ApiManager} API Manager 인스턴스
     */
    static getInstance(environment) {
        if (!ApiManager.instance) {
            ApiManager.instance = new ApiManager(environment);
        }
        return ApiManager.instance;
    }

    constructor(environment) {
        // 싱글톤 패턴: 이미 인스턴스가 있으면 기존 인스턴스 반환
        if (ApiManager.instance) {
            return ApiManager.instance;
        }

        // 환경 자동 감지 (GlobalConfig의 중앙 함수 사용)
        if (!environment) {
            environment = detectEnvironment();
        }

        // GlobalConfig에서 API BaseURL 가져오기 (중앙화)
        const baseURL = getApiBaseUrl();

        // API 설정 (GlobalConfig 기반)
        this.config = {
            baseURL: `${baseURL}/api`,  // /api prefix 추가
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        this.currentEnvironment = environment;
        this.storage = new Storage();
        this.interceptors = {
            request: [],
            response: []
        };

        // 서버 상태 관리
        this.serverStatus = {
            isOnline: false,
            lastCheck: null,
            reconnectAttempts: 0,
            maxReconnectAttempts: 5
        };

        // 재시도 설정
        this.retryConfig = {
            maxRetries: 3,
            retryDelay: 1000, // 1초
            retryMultiplier: 2 // 지수 백오프
        };

        // 모니터링 간격 (30초)
        this.monitoringInterval = null;
        this.monitoringIntervalTime = 30000;

        // 초기화 상태
        this.isInitialized = false;
        this.isInitializing = false;

        // 싱글톤 인스턴스 저장
        ApiManager.instance = this;
    }

    /**
     * 초기화
     */
    async init() {

        // API 헬스 체크
        const isConnected = await this.checkServerConnection();

        if (isConnected) {
            this.startMonitoring();
        } else {
            await errorHandler.handle(
                new NetworkError('백엔드 서버 연결 실패', null, {
                    userMessage: '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.',
                    context: { module: 'api_manager', action: 'init', baseURL: this.config.baseURL }
                }),
                { showToUser: false } // UI는 showConnectionError()에서 처리
            );
            this.showConnectionError();
            this.startReconnection();
        }

        return isConnected;
    }

    /**
     * 서버 연결 확인
     */
    async checkServerConnection(silent = false) {
        try {
            if (!silent) {
            }
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(`${this.config.baseURL}/health`, {
                method: 'GET',
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                this.serverStatus.isOnline = true;
                this.serverStatus.lastCheck = new Date();
                this.serverStatus.reconnectAttempts = 0;
                
                if (!silent) {
                }
                
                // 연결 성공 시 에러 UI 숨김
                this.hideConnectionError();
                
                return true;
            }
            
            throw new Error('Server responded with error');
            
        } catch (error) {
            this.serverStatus.isOnline = false;
            this.serverStatus.lastCheck = new Date();

            if (!silent) {
                await errorHandler.handle(
                    new NetworkError('서버 연결 실패', error, {
                        userMessage: '서버에 연결할 수 없습니다.',
                        context: {
                            module: 'api_manager',
                            action: 'checkServerConnection',
                            baseURL: this.config.baseURL,
                            errorType: error.name
                        }
                    }),
                    { showToUser: false } // Silent check, UI handled elsewhere
                );
            }

            return false;
        }
    }

    /**
     * 서버 모니터링 시작
     */
    startMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }
        
        
        this.monitoringInterval = setInterval(async () => {
            const isOnline = await this.checkServerConnection(true);

            if (!isOnline && this.serverStatus.isOnline) {
                logger.warn('⚠️ [API Manager] 서버 연결 끊김 감지');
                this.showConnectionError();
                this.startReconnection();
            }
        }, this.monitoringIntervalTime);
    }

    /**
     * 재연결 시도
     */
    async startReconnection() {

        const reconnectInterval = setInterval(async () => {
            if (this.serverStatus.reconnectAttempts >= this.serverStatus.maxReconnectAttempts) {
                clearInterval(reconnectInterval);
                await errorHandler.handle(
                    new NetworkError(
                        `최대 재연결 시도 횟수(${this.serverStatus.maxReconnectAttempts}) 초과`,
                        null,
                        {
                            userMessage: '서버 연결을 복구할 수 없습니다. 서버 상태를 확인해주세요.',
                            context: {
                                module: 'api_manager',
                                action: 'startReconnection',
                                attempts: this.serverStatus.reconnectAttempts,
                                maxAttempts: this.serverStatus.maxReconnectAttempts
                            },
                            severity: 'HIGH'
                        }
                    ),
                    { showToUser: false } // UI는 showMaxReconnectError()에서 처리
                );
                this.showMaxReconnectError();
                return;
            }
            
            this.serverStatus.reconnectAttempts++;
            
            const isConnected = await this.checkServerConnection(true);
            
            if (isConnected) {
                clearInterval(reconnectInterval);
                this.showReconnectSuccess();
                this.startMonitoring();
            }
        }, 5000); // 5초마다 재시도
    }

    /**
     * 헬스 체크
     */
    async healthCheck() {
        return this.get('/health');
    }
    
    /**
     * 연결 에러 UI 표시
     */
    showConnectionError() {
        // 기존 에러 메시지 제거
        this.hideConnectionError();
        
        const errorDiv = document.createElement('div');
        errorDiv.id = 'api-connection-error';
        errorDiv.className = 'api-error-banner';
        errorDiv.innerHTML = `
            <div class="api-error-content">
                <span class="api-error-icon">⚠️</span>
                <div class="api-error-text">
                    <strong>백엔드 서버 연결 실패</strong>
                    <p>서버에 연결할 수 없습니다. 백엔드 서버가 실행 중인지 확인해주세요.</p>
                    <small>서버 주소: ${this.config.baseURL}</small>
                </div>
                <button class="api-error-retry" onclick="window.apiManager?.retryConnection()">
                    🔄 재연결 시도
                </button>
            </div>
        `;
        
        document.body.insertBefore(errorDiv, document.body.firstChild);
        
        // 스타일 추가
        this.addErrorStyles();
        
        // Toast 알림
        if (window.Toast) {
            window.Toast.error('백엔드 서버에 연결할 수 없습니다.');
        }
    }
    
    /**
     * 연결 에러 UI 숨김
     */
    hideConnectionError() {
        const errorDiv = document.getElementById('api-connection-error');
        if (errorDiv) {
            errorDiv.remove();
        }
    }
    
    /**
     * 재연결 성공 알림
     */
    showReconnectSuccess() {
        if (window.Toast) {
            window.Toast.success('서버 연결이 복구되었습니다.');
        }
    }
    
    /**
     * 최대 재연결 시도 초과 에러
     */
    showMaxReconnectError() {
        const errorDiv = document.getElementById('api-connection-error');
        if (errorDiv) {
            const textDiv = errorDiv.querySelector('.api-error-text p');
            if (textDiv) {
                textDiv.innerHTML = `
                    자동 재연결 시도가 실패했습니다.<br>
                    <strong>백엔드 서버를 수동으로 시작해주세요:</strong><br>
                    <code>F:\\7.VScode\\Running VS Code\\KUWOTECH\\Kuwotech_Sales_Management\\backend\\START_SERVER.bat</code>
                `;
            }
        }
        
        if (window.Toast) {
            window.Toast.error('자동 재연결 실패. 서버를 수동으로 시작해주세요.');
        }
    }
    
    /**
     * 수동 재연결 시도
     */
    async retryConnection() {
        
        const isConnected = await this.checkServerConnection();
        
        if (isConnected) {
            this.startMonitoring();
            return true;
        } else {
            if (window.Toast) {
                window.Toast.warning('서버에 연결할 수 없습니다. 서버 실행 상태를 확인해주세요.');
            }
            return false;
        }
    }
    
    /**
     * 에러 스타일 추가
     */
    addErrorStyles() {
        if (document.getElementById('api-error-styles')) {
            return;
        }
        
        const style = document.createElement('style');
        style.id = 'api-error-styles';
        style.textContent = `
            .api-error-banner {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
                color: white;
                padding: 15px 20px;
                z-index: 10000;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                animation: slideDown 0.3s ease-out;
            }
            
            @keyframes slideDown {
                from {
                    transform: translateY(-100%);
                    opacity: 0;
                }
                to {
                    transform: translateY(0);
                    opacity: 1;
                }
            }
            
            .api-error-content {
                display: flex;
                align-items: center;
                gap: 15px;
                max-width: 1400px;
                margin: 0 auto;
            }
            
            .api-error-icon {
                font-size: 24px;
                flex-shrink: 0;
            }
            
            .api-error-text {
                flex: 1;
            }
            
            .api-error-text strong {
                display: block;
                font-size: 16px;
                margin-bottom: 5px;
            }
            
            .api-error-text p {
                margin: 5px 0;
                font-size: 14px;
                opacity: 0.95;
            }
            
            .api-error-text small {
                display: block;
                margin-top: 5px;
                font-size: 12px;
                opacity: 0.8;
                font-family: var(--font-mono);
            }
            
            .api-error-text code {
                background: rgba(0,0,0,0.2);
                padding: 2px 6px;
                border-radius: 3px;
                font-size: 12px;
            }
            
            .api-error-retry {
                padding: 10px 20px;
                background: white;
                color: #ff6b6b;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 600;
                font-size: 14px;
                transition: all 0.2s;
                flex-shrink: 0;
            }
            
            .api-error-retry:hover {
                background: #f8f9fa;
                transform: translateY(-2px);
                box-shadow: 0 4px 8px rgba(0,0,0,0.2);
            }
            
            .api-error-retry:active {
                transform: translateY(0);
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * 요청 인터셉터 추가
     */
    addRequestInterceptor(interceptor) {
        this.interceptors.request.push(interceptor);
    }

    /**
     * 응답 인터셉터 추가
     */
    addResponseInterceptor(interceptor) {
        this.interceptors.response.push(interceptor);
    }

    /**
     * 요청 전처리
     */
    async beforeRequest(config) {
        // 인증 토큰 추가
        const token = this.storage.get('authToken');
        if (token) {
            config.headers = {
                ...config.headers,
                'Authorization': `Bearer ${token}`
            };
        }

        // 요청 인터셉터 실행
        for (const interceptor of this.interceptors.request) {
            config = await interceptor(config);
        }

        return config;
    }

    /**
     * 응답 후처리
     */
    async afterResponse(response) {
        // 응답 인터셉터 실행
        for (const interceptor of this.interceptors.response) {
            response = await interceptor(response);
        }

        return response;
    }

    /**
     * 기본 요청 메서드 (자동 재시도 포함)
     */
    async request(endpoint, options = {}) {
        const config = {
            ...this.config,
            ...options,
            headers: {
                ...this.config.headers,
                ...options.headers
            }
        };

        // 요청 전처리
        const finalConfig = await this.beforeRequest(config);

        let lastError;
        for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
            try {
                const url = `${this.config.baseURL}${endpoint}`;

                const response = await fetch(url, {
                    method: finalConfig.method || 'GET',
                    headers: finalConfig.headers,
                    body: finalConfig.body ? JSON.stringify(finalConfig.body) : undefined,
                    signal: AbortSignal.timeout(finalConfig.timeout || this.config.timeout)
                });

                // 응답 처리
                const data = await this.handleResponse(response);
                
                // 응답 후처리
                return await this.afterResponse(data);

            } catch (error) {
                lastError = error;
                
                // 네트워크 에러인 경우 재시도
                if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
                    if (attempt < this.retryConfig.maxRetries) {
                        const delay = this.retryConfig.retryDelay * Math.pow(this.retryConfig.retryMultiplier, attempt);
                        logger.warn(`[API Manager] 재시도 ${attempt + 1}/${this.retryConfig.maxRetries} (${delay}ms 후)`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                        continue;
                    }
                }
                
                // 재시도하지 않을 에러는 즉시 throw
                break;
            }
        }

        // 모든 재시도 실패 - ErrorHandler로 처리
        await this.handleError(lastError, {
            module: 'api_manager',
            action: 'request',
            endpoint,
            method: finalConfig.method || 'GET',
            retryAttempts: this.retryConfig.maxRetries
        });
        throw lastError;
    }

    /**
     * GET 요청
     */
    async get(endpoint, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const finalEndpoint = queryString ? `${endpoint}?${queryString}` : endpoint;
        
        return this.request(finalEndpoint, {
            method: 'GET'
        });
    }

    /**
     * POST 요청
     */
    async post(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body: data
        });
    }

    /**
     * PUT 요청
     */
    async put(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'PUT',
            body: data
        });
    }

    /**
     * DELETE 요청
     */
    async delete(endpoint) {
        return this.request(endpoint, {
            method: 'DELETE'
        });
    }

    /**
     * 응답 처리
     */
    async handleResponse(response) {
        // 상태 코드 체크
        if (!response.ok) {
            const error = new Error(`HTTP Error ${response.status}`);
            error.status = response.status;
            error.statusText = response.statusText;
            
            try {
                error.data = await response.json();
            } catch {
                error.data = null;
            }
            
            throw error;
        }

        // 응답 파싱
        try {
            return await response.json();
        } catch {
            return response.text();
        }
    }

    /**
     * 에러 처리 (ErrorHandler 통합)
     */
    async handleError(error, context = {}) {
        // NetworkError로 변환
        let appError = error;

        if (!(error instanceof NetworkError)) {
            // HTTP 에러 상세 정보 로깅
            if (error.status === 400 && error.data) {
                logger.error('❌ 400 에러 상세:', error.data);
            }

            if (error.status === 500 && error.data) {
                logger.error('❌ 500 서버 에러 상세:', error.data);
            }

            // 적절한 에러 타입으로 변환
            if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
                appError = new NetworkError('네트워크 연결 실패', error, {
                    userMessage: '네트워크 연결을 확인해주세요.',
                    context
                });
                this.showConnectionError();
            } else if (error.name === 'AbortError') {
                appError = new NetworkError('요청 시간 초과', error, {
                    userMessage: '요청 시간이 초과되었습니다. 다시 시도해주세요.',
                    context
                });
            } else {
                appError = new NetworkError(
                    error.message || 'API 요청 실패',
                    error,
                    {
                        userMessage: error.data?.message || 'API 요청 중 오류가 발생했습니다.',
                        context: {
                            ...context,
                            status: error.status,
                            statusText: error.statusText,
                            data: error.data
                        }
                    }
                );
            }
        }

        // ErrorHandler로 처리
        return await errorHandler.handle(appError, {
            showToUser: true,
            context
        });
    }

    // ============================================
    // 인증 관련 API
    // ============================================
    
    /**
     * 로그인
     */
    async login(credentials) {
        const response = await this.post('/auth/login', credentials);
        
        // 토큰 저장
        if (response.token) {
            this.storage.set('authToken', response.token);
            this.storage.set('userData', response.user);
        }
        
        return response;
    }

    /**
     * 로그아웃
     */
    async logout() {
        try {
            await this.post('/auth/logout');
        } finally {
            // 로컬 데이터 삭제
            this.storage.remove('authToken');
            this.storage.remove('userData');
        }
    }

    /**
     * 토큰 검증
     */
    async verifyToken(token) {
        return this.post('/auth/verify', { token });
    }

    /**
     * 토큰 갱신
     */
    async refreshToken() {
        const response = await this.post('/auth/refresh');
        
        if (response.token) {
            this.storage.set('authToken', response.token);
        }
        
        return response;
    }

    // ============================================
    // 거래처 관련 API
    // ============================================
    
    /**
     * 거래처 목록 조회
     */
    async getCompanies(params = {}) {
        return this.get('/companies', params);
    }

    /**
     * 거래처 상세 조회
     */
    async getCompany(id) {
        return this.get(`/companies/${id}`);
    }

    /**
     * 거래처 생성
     */
    async createCompany(data) {
        return this.post('/companies', data);
    }

    /**
     * 거래처 수정
     */
    async updateCompany(id, data) {
        return this.put(`/companies/${id}`, data);
    }

    /**
     * 거래처 삭제
     */
    async deleteCompany(id) {
        return this.delete(`/companies/${id}`);
    }

    /**
     * 담당자별 거래처 조회
     */
    async getCompaniesByManager(managerName) {
        return this.get(`/companies/manager/${encodeURIComponent(managerName)}`);
    }

    // ============================================
    // 직원 관련 API
    // ============================================

    /**
     * 직원 목록 조회
     */
    async getEmployees(params = {}) {
        return this.get('/employees', params);
    }

    /**
     * 직원 상세 조회
     */
    async getEmployee(name) {
        return this.get(`/employees/${encodeURIComponent(name)}`);
    }

    /**
     * 역할별 직원 조회 (관리자 권한 불필요)
     */
    async getEmployeesByRole(role) {
        if (!role) {
            throw new ValidationError(
                '역할(role)은 필수 매개변수입니다.',
                null,
                {
                    userMessage: '직원 역할을 지정해주세요.',
                    context: { module: 'api_manager', action: 'getEmployeesByRole', field: 'role' }
                }
            );
        }
        return this.get(`/auth/employees-by-role/${encodeURIComponent(role)}`);
    }

    // ============================================
    // 보고서 관련 API
    // ============================================
    
    /**
     * 보고서 목록 조회
     */
    async getReports(params = {}) {
        return this.get('/reports', params);
    }

    /**
     * 보고서 생성
     */
    async createReport(data) {
        return this.post('/reports', data);
    }

    /**
     * 보고서 수정
     */
    async updateReport(id, data) {
        return this.put(`/reports/${id}`, data);
    }

    /**
     * 보고서 삭제
     */
    async deleteReport(id) {
        return this.delete(`/reports/${id}`);
    }

    /**
     * 보고서 확인 데이터 업데이트 (실적 입력용)
     */
    async updateReportConfirmation(reportId, data) {
        return this.put(`/reports/${reportId}`, data);
    }

    // ============================================
    // 사용자 관련 API
    // ============================================
    
    /**
     * 사용자 목록 조회
     */
    async getUsers(params = {}) {
        return this.get('/users', params);
    }

    /**
     * 사용자 상세 조회
     */
    async getUser(id) {
        return this.get(`/users/${id}`);
    }

    /**
     * 사용자 생성
     */
    async createUser(data) {
        return this.post('/users', data);
    }

    /**
     * 사용자 수정
     */
    async updateUser(id, data) {
        return this.put(`/users/${id}`, data);
    }

    /**
     * 사용자 삭제
     */
    async deleteUser(id) {
        return this.delete(`/users/${id}`);
    }

    /**
     * 비밀번호 변경
     */
    async changePassword(data) {
        return this.post('/users/change-password', data);
    }

    // ============================================
    // 대시보드 관련 API
    // ============================================
    
    /**
     * 대시보드 데이터 조회
     */
    async getDashboard(type = 'admin') {
        return this.get(`/dashboard/${type}`);
    }

    /**
     * KPI 데이터 조회
     */
    async getKPI(params = {}) {
        return this.get('/dashboard/kpi', params);
    }

    /**
     * 차트 데이터 조회
     */
    async getChartData(chartType, params = {}) {
        return this.get(`/dashboard/charts/${chartType}`, params);
    }

    // ============================================
    // 파일 업로드 관련 API
    // ============================================
    
    /**
     * 파일 업로드
     */
    async uploadFile(file, type = 'document') {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', type);

        const response = await fetch(`${this.config.baseURL}/files/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.storage.get('authToken')}`
            },
            body: formData
        });

        return this.handleResponse(response);
    }

    /**
     * 파일 다운로드
     */
    async downloadFile(fileId) {
        const response = await fetch(`${this.config.baseURL}/files/${fileId}`, {
            headers: {
                'Authorization': `Bearer ${this.storage.get('authToken')}`
            }
        });

        if (!response.ok) {
            throw new NetworkError(
                '파일 다운로드 실패',
                null,
                {
                    userMessage: '파일을 다운로드할 수 없습니다.',
                    context: {
                        module: 'api_manager',
                        action: 'downloadFile',
                        fileId,
                        status: response.status
                    }
                }
            );
        }

        return response.blob();
    }

    // ============================================
    // 제품 관련 API
    // ============================================

    /**
     * 제품 목록 조회
     */
    async getProducts() {
        return this.get('/products');
    }

    /**
     * 새 제품 추가
     */
    async addProduct(productName, category = '일반제품') {
        return this.post('/products', { productName, category });
    }

    // ============================================
    // KPI 관련 API
    // ============================================

    /**
     * 영업담당 개인 KPI 조회
     * @param {string} employeeId - 직원 ID 또는 이름
     */
    async getSalesKPI(employeeId) {
        return this.get(`/kpi/sales/${encodeURIComponent(employeeId)}`);
    }

    /**
     * 전사 KPI 조회
     */
    async getAdminKPI() {
        return this.get('/kpi/admin');
    }

    /**
     * 전체매출 기여도 순위 조회
     */
    async getTotalSalesRanking() {
        return this.get('/kpi/admin/ranking/total');
    }

    /**
     * 주요제품매출 기여도 순위 조회
     */
    async getMainProductRanking() {
        return this.get('/kpi/admin/ranking/main');
    }
}

// ============================================
// Export
// ============================================
export default ApiManager;