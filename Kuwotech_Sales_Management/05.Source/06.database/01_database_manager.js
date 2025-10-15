/**
 * KUWOTECH 영업관리 시스템 - REST API 데이터베이스 관리자
 * Created by: Daniel.K
 * Date: 2025
 *
 * IndexedDB → Railway MySQL + REST API 전환
 */

// GlobalConfig에서 중앙 환경 감지 함수 import
import { getApiBaseUrl } from '../01.common/01_global_config.js';
import logger from '../01.common/23_logger.js';
import errorHandler, { DatabaseError, NetworkError, AuthError } from '../01.common/24_error_handler.js';

// ============================================
// [SECTION: API 설정]
// ============================================

const API_CONFIG = {
    BASE_URL: getApiBaseUrl() + '/api',  // GlobalConfig의 URL + /api 경로
    TIMEOUT: 30000, // 30초
};


// 스토어 → API 엔드포인트 매핑
const ENDPOINTS = {
    EMPLOYEES: '/employees',
    CLIENTS: '/companies',      // 백엔드의 companies 테이블과 매핑
    SALES: '/sales',
    REPORTS: '/reports',
    KPI: '/kpi',
    AUTH: '/auth',
    SYSTEM: '/system'
};

// ============================================
// [SECTION: REST API 데이터베이스 관리자]
// ============================================

export class DatabaseManager {
    constructor() {
        this.baseURL = API_CONFIG.BASE_URL;
        this.token = localStorage.getItem('authToken');
        this.user = this.getCurrentUser();
        this.accessLogId = null; // 📊 웹사용기록: 접속 로그 ID
        this.isRefreshing = false; // 토큰 갱신 중복 방지 플래그
        this.isLoggingOut = false; // 로그아웃 중복 방지 플래그
    }

    // ============================================
    // [인증 관련 메서드]
    // ============================================

    /**
     * [기능: 로그인]
     * @param {string} name - 직원 이름
     * @param {string} password - 비밀번호
     * @param {string} selectedRole - 선택한 역할 (영업담당 또는 관리자)
     */
    async login(name, password, selectedRole) {
        try {
            const response = await this.request(`${ENDPOINTS.AUTH}/login`, {
                method: 'POST',
                body: JSON.stringify({ name, password, selectedRole })
            });

            if (response.success) {
                this.token = response.token;
                this.user = response.user;
                this.accessLogId = response.accessLogId; // 📊 웹사용기록: 접속 로그 ID 저장

                // localStorage에 영구 저장 (API Manager가 사용)
                localStorage.setItem('authToken', this.token);
                localStorage.setItem('user', JSON.stringify(this.user));
                localStorage.setItem('loginData', JSON.stringify({ user: this.user, token: this.token }));

                // sessionStorage에 사용자 정보만 임시 저장 (현재 세션용)
                sessionStorage.setItem('user', JSON.stringify(this.user));

                // 📊 웹사용기록: 로그아웃 시 사용할 접속 로그 ID를 sessionStorage에 저장
                sessionStorage.setItem('accessLogId', response.accessLogId);

                return response.user;
            } else {
                throw new Error(response.message || response.error?.message || '로그인 실패');
            }
        } catch (error) {
            await errorHandler.handle(
                new AuthError('로그인 요청 실패', error, {
                    userMessage: '로그인 처리 중 오류가 발생했습니다.',
                    context: {
                        module: 'database_manager',
                        action: 'login',
                        username: name
                    }
                }),
                { showToUser: false }
            );
            throw error;
        }
    }

    /**
     * [기능: 로그아웃]
     * @param {number} accessLogId - 접속 로그 ID (웹사용기록용)
     */
    async logout(accessLogId) {
        // 이미 로그아웃 중이면 중복 호출 방지
        if (this.isLoggingOut) {
            return;
        }

        this.isLoggingOut = true;

        try {
            // 로그아웃 API 호출 (실패해도 로컬 데이터는 삭제)
            await this.request(`${ENDPOINTS.AUTH}/logout`, {
                method: 'POST',
                body: JSON.stringify({ accessLogId }), // 📊 웹사용기록: 접속 로그 ID 전송
                skipRetry: true // 401 에러 재시도 방지
            });
        } catch (error) {
            await errorHandler.handle(
                new NetworkError('로그아웃 API 요청 실패', error, {
                    userMessage: '서버 로그아웃 처리에 실패했습니다.',
                    context: {
                        module: 'database_manager',
                        action: 'logout',
                        userId: this.user?.id
                    },
                    severity: 'LOW'
                }),
                { showToUser: false }
            );
            // 에러가 발생해도 로컬 세션은 정리
        } finally {
            this.token = null;
            this.user = null;
            this.accessLogId = null; // 📊 웹사용기록: 접속 로그 ID 초기화
            this.isLoggingOut = false;

            // localStorage에서 영구 저장된 데이터 삭제
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            localStorage.removeItem('loginData');

            // sessionStorage에서 임시 저장된 사용자 정보 삭제
            sessionStorage.removeItem('user');
            sessionStorage.removeItem('accessLogId'); // 📊 웹사용기록: 접속 로그 ID 삭제

        }
    }

    /**
     * [기능: 현재 사용자 정보 가져오기]
     */
    getCurrentUser() {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    }

    /**
     * [기능: 인증 여부 확인]
     */
    isAuthenticated() {
        return !!this.token && !!this.user;
    }

    /**
     * [기능: 토큰 갱신]
     */
    async refreshToken() {
        // 이미 토큰 갱신 중이거나 로그아웃 중이면 중복 호출 방지
        if (this.isRefreshing || this.isLoggingOut) {
            return false;
        }

        this.isRefreshing = true;

        try {
            const refreshToken = localStorage.getItem('refreshToken');
            if (!refreshToken) {
                throw new Error('No refresh token');
            }

            const response = await this.request(`${ENDPOINTS.AUTH}/refresh`, {
                method: 'POST',
                body: JSON.stringify({ refreshToken }),
                skipRetry: true // 401 에러 재시도 방지
            });

            if (response.success) {
                this.token = response.data.token;
                localStorage.setItem('authToken', this.token);
                this.isRefreshing = false;
                return true;
            }

            throw new Error('Token refresh failed');
        } catch (error) {
            await errorHandler.handle(
                new AuthError('토큰 갱신 실패', error, {
                    userMessage: '인증이 만료되었습니다. 다시 로그인해주세요.',
                    context: {
                        module: 'database_manager',
                        action: 'refreshToken'
                    },
                    severity: 'HIGH'
                }),
                { showToUser: false }
            );
            this.isRefreshing = false;

            // 로그아웃 중이 아닐 때만 로그아웃 호출
            if (!this.isLoggingOut) {
                await this.logout();
            }
            return false;
        }
    }

    /**
     * [기능: 역할별 직원 목록 조회]
     * @param {string} role - 조회할 역할 ('영업담당' 또는 '관리자')
     * @returns {Promise<Array>} 직원 목록
     */
    async getEmployeesByRole(role) {
        try {
            const response = await this.request(`${ENDPOINTS.AUTH}/employees-by-role/${encodeURIComponent(role)}`);

            // 백엔드 응답 구조: { success: true, data: { employees: [...] } }
            if (response.success && response.data && response.data.employees) {
                return response.data.employees;
            }

            logger.warn('⚠️ 예상과 다른 응답 구조:', response);
            return [];
        } catch (error) {
            await errorHandler.handle(
                new DatabaseError('역할별 직원 조회 실패', error, {
                    userMessage: '직원 목록을 불러올 수 없습니다.',
                    context: {
                        module: 'database_manager',
                        action: 'getEmployeesByRole',
                        role
                    }
                }),
                { showToUser: false }
            );
            return [];
        }
    }

    // ============================================
    // [직원(Employees) 관련 메서드]
    // ============================================

    /**
     * [기능: 모든 직원 조회]
     */
    async getAllEmployees(filters = {}) {
        // limit이 없으면 10000으로 설정하여 모든 데이터 가져오기
        if (!filters.limit) {
            filters.limit = 10000;
        }

        const query = new URLSearchParams(filters).toString();
        const url = `${ENDPOINTS.EMPLOYEES}${query ? '?' + query : ''}`;

        const response = await this.request(url);
        // 백엔드는 { success: true, employees: [...] } 형태로 반환
        return response.employees || [];
    }

    /**
     * [기능: 이름으로 직원 조회]
     * @param {string} name - 직원 이름
     * @returns {Promise<Object>} 직원 정보 { success: true, employee: {...} }
     * @note 로그인 전 단계에서 호출되므로 비인증 요청(skipAuth: true)
     */
    async getEmployeeByName(name) {
        try {
            const response = await this.request(`${ENDPOINTS.EMPLOYEES}/${encodeURIComponent(name)}`, {
                skipAuth: true  // 비인증 호출 (로그인 전 단계)
            });
            // 백엔드는 { success: true, employee: {...} } 형태로 반환
            return response;
        } catch (error) {
            await errorHandler.handle(
                new DatabaseError('직원 정보 조회 실패', error, {
                    userMessage: '직원 정보를 불러올 수 없습니다.',
                    context: {
                        module: 'database_manager',
                        action: 'getEmployeeByName',
                        name
                    }
                }),
                { showToUser: false }
            );
            throw error;
        }
    }

    /**
     * [기능: 로그인 전 직원 프리체크]
     * @param {string} name - 직원 이름
     * @returns {Promise<Object>} 최소한의 직원 정보 { success: true, employee: { name, status, role1, role2 } }
     * @note 로그인 페이지 전용 공개 엔드포인트 - 인증 불필요
     */
    async preCheckEmployee(name) {
        try {
            const response = await this.request(`${ENDPOINTS.EMPLOYEES}/precheck/${encodeURIComponent(name)}`, {
                skipAuth: true  // 비인증 호출 (공개 엔드포인트)
            });
            // 백엔드는 { success: true, employee: { name, status, role1, role2 } } 형태로 반환
            return response;
        } catch (error) {
            await errorHandler.handle(
                new DatabaseError('직원 프리체크 실패', error, {
                    userMessage: error.message || '직원 정보를 확인할 수 없습니다.',
                    context: {
                        module: 'database_manager',
                        action: 'preCheckEmployee',
                        name
                    }
                }),
                { showToUser: false }
            );
            throw error;
        }
    }

    /**
     * [기능: 직원 생성]
     */
    async createEmployee(employeeData) {
        const response = await this.request(ENDPOINTS.EMPLOYEES, {
            method: 'POST',
            body: JSON.stringify(employeeData)
        });
        // 백엔드는 { success: true, ... } 형태로 반환
        return response;
    }

    /**
     * [기능: 직원 수정]
     */
    async updateEmployee(id, employeeData) {
        const response = await this.request(`${ENDPOINTS.EMPLOYEES}/${id}`, {
            method: 'PUT',
            body: JSON.stringify(employeeData)
        });
        // 백엔드는 { success: true, ... } 형태로 반환
        return response;
    }

    /**
     * [기능: 직원 삭제]
     */
    async deleteEmployee(id) {
        await this.request(`${ENDPOINTS.EMPLOYEES}/${id}`, {
            method: 'DELETE'
        });
        return true;
    }

    // ============================================
    // [거래처(Clients/Companies) 관련 메서드]
    // ============================================

    /**
     * [기능: 모든 거래처 조회]
     */
    async getAllClients(filters = {}) {
        // limit이 없으면 10000으로 설정하여 모든 데이터 가져오기
        if (!filters.limit) {
            filters.limit = 10000;
        }

        const query = new URLSearchParams(filters).toString();
        const url = `${ENDPOINTS.CLIENTS}${query ? '?' + query : ''}`;

        const response = await this.request(url);
        // 백엔드는 { success: true, companies: [...], total: xxx } 형태로 반환
        return response.companies || [];
    }

    /**
     * [기능: 내 담당 거래처 조회]
     */
    async getMyClients() {
        const response = await this.request(`${ENDPOINTS.CLIENTS}/my`);
        // 백엔드는 { success: true, companies: [...] } 형태로 반환
        return response.companies || [];
    }

    /**
     * [기능: 거래처 ID로 조회]
     */
    async getClientById(id) {
        const response = await this.request(`${ENDPOINTS.CLIENTS}/${id}`);
        // 백엔드는 { success: true, company: {...} } 형태로 반환
        return response.company;
    }

    /**
     * [기능: 거래처 생성]
     */
    async createClient(clientData) {
        const response = await this.request(ENDPOINTS.CLIENTS, {
            method: 'POST',
            body: JSON.stringify(clientData)
        });
        // 백엔드는 { success: true, keyValue: ... } 형태로 반환
        return response;
    }

    /**
     * [기능: 거래처 수정]
     * @param {string} id - 거래처 ID (keyValue)
     * @param {object} clientData - 수정할 데이터
     * @param {object} options - 옵션 { isExcelUpload: true } 등
     */
    async updateClient(id, clientData, options = {}) {
        // 엑셀 업로드인 경우 body에 플래그 포함
        const requestBody = options.isExcelUpload
            ? { ...clientData, isExcelUpload: true }
            : clientData;

        const response = await this.request(`${ENDPOINTS.CLIENTS}/${id}`, {
            method: 'PUT',
            body: JSON.stringify(requestBody)
        });
        // 백엔드는 { success: true, affected: ... } 형태로 반환
        return response;
    }

    /**
     * [기능: 거래처 삭제]
     */
    async deleteClient(id) {
        await this.request(`${ENDPOINTS.CLIENTS}/${id}`, {
            method: 'DELETE'
        });
        return true;
    }

    // ============================================
    // [보고서(Reports) 관련 메서드]
    // ============================================

    /**
     * [기능: 모든 보고서 조회]
     */
    async getAllReports(filters = {}) {
        // limit이 없으면 10000으로 설정하여 모든 데이터 가져오기
        if (!filters.limit) {
            filters.limit = 10000;
        }

        const query = new URLSearchParams(filters).toString();
        const url = `${ENDPOINTS.REPORTS}${query ? '?' + query : ''}`;

        const response = await this.request(url);
        // 백엔드는 { success: true, reports: [...] } 형태로 반환
        return response.reports || [];
    }

    /**
     * [기능: 내 보고서 조회]
     */
    async getMyReports() {
        const response = await this.request(`${ENDPOINTS.REPORTS}/my`);
        // 백엔드는 { success: true, reports: [...] } 형태로 반환
        return response.reports || [];
    }

    /**
     * [기능: 보고서 생성]
     */
    async createReport(reportData) {
        const response = await this.request(ENDPOINTS.REPORTS, {
            method: 'POST',
            body: JSON.stringify(reportData)
        });
        // 백엔드는 { success: true, ... } 형태로 반환
        return response;
    }

    /**
     * [기능: 보고서 수정]
     */
    async updateReport(id, reportData) {
        const response = await this.request(`${ENDPOINTS.REPORTS}/${id}`, {
            method: 'PUT',
            body: JSON.stringify(reportData)
        });
        // 백엔드는 { success: true, ... } 형태로 반환
        return response;
    }

    /**
     * [기능: 보고서 승인]
     */
    async approveReport(id, comment = '') {
        const response = await this.request(`${ENDPOINTS.REPORTS}/${id}/approve`, {
            method: 'PUT',
            body: JSON.stringify({ comment })
        });
        // 백엔드는 { success: true, ... } 형태로 반환
        return response;
    }

    /**
     * [기능: 보고서 반려]
     */
    async rejectReport(id, comment) {
        if (!comment) throw new Error('반려 사유를 입력해주세요');

        const response = await this.request(`${ENDPOINTS.REPORTS}/${id}/reject`, {
            method: 'PUT',
            body: JSON.stringify({ comment })
        });
        // 백엔드는 { success: true, ... } 형태로 반환
        return response;
    }

    // ============================================
    // [KPI 관련 메서드]
    // ============================================

    /**
     * [기능: 내 KPI 조회]
     */
    async getMyKPI() {
        if (!this.user || !this.user.name) {
            await errorHandler.handle(
                new AuthError('사용자 정보 없음', null, {
                    userMessage: '로그인된 사용자 정보가 없습니다.',
                    context: {
                        module: 'database_manager',
                        action: 'getMyKPI'
                    },
                    severity: 'MEDIUM'
                }),
                { showToUser: false }
            );
            return null;
        }

        const response = await this.request(`${ENDPOINTS.KPI}/sales/${encodeURIComponent(this.user.name)}`);
        // 백엔드는 { success: true, data: {...} } 형태로 반환
        return response.data || response;
    }

    /**
     * [기능: 전체 KPI 조회 (관리자)]
     */
    async getAllKPI() {
        const response = await this.request(`${ENDPOINTS.KPI}/admin`);
        // 백엔드는 { success: true, data: {...} } 형태로 반환
        return response.data || response;
    }

    // ============================================
    // [범용 CRUD 메서드 - 하위 호환성]
    // ============================================

    /**
     * [기능: 데이터 추가 - 하위 호환성]
     */
    async add(storeName, data) {
        const endpoint = this.getEndpoint(storeName);
        return await this.createByStore(endpoint, data);
    }

    /**
     * [기능: 데이터 가져오기 - 하위 호환성]
     */
    async get(storeName, key) {
        const endpoint = this.getEndpoint(storeName);
        const response = await this.request(`${endpoint}/${key}`);
        return response.data;
    }

    /**
     * [기능: 모든 데이터 가져오기 - 하위 호환성]
     */
    async getAll(storeName, filter = null) {
        const endpoint = this.getEndpoint(storeName);
        const response = await this.request(endpoint);

        // 백엔드는 { success: true, companies: [...] } 형태로 반환 (data 래퍼 없음)
        let results = [];
        if (response.companies) results = response.companies;
        else if (response.employees) results = response.employees;
        else if (response.reports) results = response.reports;
        else results = response.data || [];

        // 필터 적용
        if (filter && typeof filter === 'function') {
            results = results.filter(filter);
        }

        return results;
    }

    /**
     * [기능: 인덱스로 검색 - 하위 호환성]
     */
    async getByIndex(storeName, indexName, value) {
        const endpoint = this.getEndpoint(storeName);
        const filters = { [indexName]: value };
        const query = new URLSearchParams(filters).toString();

        const response = await this.request(`${endpoint}?${query}`);
        return response.data || [];
    }

    /**
     * [기능: 데이터 업데이트]
     * 모든 엔티티는 id 필드 사용 (employeeId, clientId, reportId 통일됨)
     */
    async update(storeName, data) {
        const endpoint = this.getEndpoint(storeName);

        if (!data.id) {
            throw new Error('업데이트할 데이터의 ID가 필요합니다');
        }

        const response = await this.request(`${endpoint}/${data.id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
        return response.data;
    }

    /**
     * [기능: 데이터 삭제 - 하위 호환성]
     */
    async delete(storeName, key) {
        const endpoint = this.getEndpoint(storeName);
        await this.request(`${endpoint}/${key}`, {
            method: 'DELETE'
        });
        return true;
    }

    /**
     * [기능: 스토어 비우기 - 하위 호환성]
     */
    async clear(storeName) {
        logger.warn('clear() is not supported in API mode');
        return true;
    }

    // ============================================
    // [엑셀 관련 메서드]
    // ============================================

    /**
     * [기능: 엑셀 데이터 일괄 가져오기]
     */
    async importFromExcel(excelData) {
        try {
            const response = await this.request('/import/excel', {
                method: 'POST',
                body: JSON.stringify(excelData)
            });

            return {
                success: true,
                results: response.data
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                results: {}
            };
        }
    }

    // ============================================
    // [사용자 데이터 조회]
    // ============================================

    /**
     * [기능: 사용자별 데이터 필터링]
     */
    async getUserData(employeeId, role) {
        const userData = {
            employees: [],
            clients: [],
            sales: [],
            reports: [],
            kpi: []
        };

        try {
            // 관리자는 모든 데이터 접근
            if (role === 'admin') {
                userData.employees = await this.getAllEmployees();
                userData.clients = await this.getAllClients();
                userData.reports = await this.getAllReports();
                userData.kpi = await this.getAllKPI();
            }
            // 영업담당은 본인 데이터만
            else {
                userData.clients = await this.getMyClients();
                userData.reports = await this.getMyReports();
                userData.kpi = await this.getMyKPI();
            }

            return userData;
        } catch (error) {
            await errorHandler.handle(
                new DatabaseError('사용자 데이터 조회 실패', error, {
                    userMessage: '사용자 데이터를 불러올 수 없습니다.',
                    context: {
                        module: 'database_manager',
                        action: 'getUserData',
                        employeeId,
                        role
                    }
                }),
                { showToUser: false }
            );
            return userData;
        }
    }

    // ============================================
    // [백업 관련 - API는 서버에서 처리]
    // ============================================

    /**
     * [기능: 백업 생성]
     */
    async createBackup() {
        try {
            const response = await this.request('/backup/create', {
                method: 'POST'
            });

            return {
                success: true,
                backup: response.data
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * [기능: 백업 복원]
     */
    async restoreBackup(backupData) {
        try {
            const response = await this.request('/backup/restore', {
                method: 'POST',
                body: JSON.stringify(backupData)
            });

            return {
                success: true,
                message: '백업이 성공적으로 복원되었습니다.'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // ============================================
    // [헬퍼 메서드]
    // ============================================

    /**
     * [기능: 스토어명 → API 엔드포인트 변환]
     */
    getEndpoint(storeName) {
        const map = {
            'employees': ENDPOINTS.EMPLOYEES,
            'clients': ENDPOINTS.CLIENTS,
            'sales_records': ENDPOINTS.SALES,
            'reports': ENDPOINTS.REPORTS,
            'kpi_data': ENDPOINTS.KPI,
            'system_config': ENDPOINTS.SYSTEM
        };
        return map[storeName] || `/${storeName}`;
    }

    /**
     * [기능: 스토어별 생성 메서드]
     */
    async createByStore(endpoint, data) {
        const response = await this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        return response.data;
    }

    /**
     * [기능: HTTP 요청 헬퍼]
     * @param {string} endpoint - API 엔드포인트
     * @param {Object} options - 요청 옵션
     * @param {boolean} options.skipAuth - true면 인증 헤더를 붙이지 않음 (비인증 호출)
     * @param {boolean} options.skipRetry - true면 401 발생 시 토큰 갱신을 시도하지 않음
     */
    async request(endpoint, options = {}) {
        const url = endpoint.startsWith('http')
            ? endpoint
            : `${this.baseURL}${endpoint}`;

        const config = {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        };

        // 인증 토큰 추가 (skipAuth가 true면 추가하지 않음)
        if (this.token && !options.skipAuth) {
            config.headers['Authorization'] = `Bearer ${this.token}`;
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

            const response = await fetch(url, {
                ...config,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            // 401 Unauthorized - 토큰 갱신 시도
            // 단, 인증 엔드포인트(/auth/login, /auth/logout, /auth/refresh)나 비인증 호출(skipAuth)은 제외
            const isAuthEndpoint = endpoint.includes('/auth/login') ||
                                   endpoint.includes('/auth/logout') ||
                                   endpoint.includes('/auth/refresh');

            // skipRetry, skipAuth 옵션이 있거나, 인증 엔드포인트이거나, 이미 갱신/로그아웃 중이면 재시도하지 않음
            if (response.status === 401 && !options.skipRetry && !options.skipAuth && !isAuthEndpoint && !this.isRefreshing && !this.isLoggingOut) {
                const refreshed = await this.refreshToken();

                // 토큰 갱신 성공 시에만 재시도
                if (refreshed) {
                    return await this.request(endpoint, { ...options, skipRetry: true });
                } else {
                    throw new Error('인증이 만료되었습니다. 다시 로그인해주세요.');
                }
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error?.message || data.message || '요청 실패');
            }

            return data;

        } catch (error) {
            if (error.name === 'AbortError') {
                const timeoutError = new NetworkError('API 요청 시간 초과', error, {
                    userMessage: '요청 시간이 초과되었습니다. 다시 시도해주세요.',
                    context: {
                        module: 'database_manager',
                        action: 'request',
                        endpoint,
                        timeout: API_CONFIG.TIMEOUT
                    }
                });
                await errorHandler.handle(timeoutError, { showToUser: false });
                throw new Error('요청 시간 초과');
            }

            await errorHandler.handle(
                new NetworkError('API 요청 실패', error, {
                    userMessage: 'API 요청 중 오류가 발생했습니다.',
                    context: {
                        module: 'database_manager',
                        action: 'request',
                        endpoint,
                        method: options.method || 'GET'
                    }
                }),
                { showToUser: false }
            );
            throw error;
        }
    }

    /**
     * [기능: 요청 헤더 생성]
     */
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        return headers;
    }

    // ============================================
    // [초기화 메서드 - 하위 호환성]
    // ============================================

    /**
     * [기능: 초기화 - API는 초기화 불필요]
     */
    async init() {
        // API 모드에서는 초기화 불필요
        // 하위 호환성을 위해 메서드만 유지
        return Promise.resolve();
    }
}

// ============================================
// [SECTION: 싱글톤 인스턴스]
// ============================================

const dbManager = new DatabaseManager();

// Named export for getDB (하위 호환성)
export const getDB = async () => {
    return dbManager;
};

export default dbManager;

// [내용: REST API 기반 데이터베이스 관리]
// IndexedDB → Railway MySQL + REST API 전환
// #데이터베이스 #REST_API #MySQL
