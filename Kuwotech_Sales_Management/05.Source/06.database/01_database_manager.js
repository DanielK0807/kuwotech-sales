/**
 * KUWOTECH 영업관리 시스템 - REST API 데이터베이스 관리자
 * Created by: Daniel.K
 * Date: 2025
 *
 * IndexedDB → Railway MySQL + REST API 전환
 */

// GlobalConfig에서 중앙 환경 감지 함수 import
import { getApiBaseUrl } from '../01.common/01_global_config.js';

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

                // localStorage에 영구 저장 (API Manager가 사용)
                localStorage.setItem('authToken', this.token);
                localStorage.setItem('user', JSON.stringify(this.user));
                localStorage.setItem('loginData', JSON.stringify({ user: this.user, token: this.token }));

                // sessionStorage에 사용자 정보만 임시 저장 (현재 세션용)
                sessionStorage.setItem('user', JSON.stringify(this.user));


                return response.user;
            } else {
                throw new Error(response.message || response.error?.message || '로그인 실패');
            }
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    /**
     * [기능: 로그아웃]
     */
    async logout() {
        // 이미 로그아웃 중이면 중복 호출 방지
        if (this.isLoggingOut) {
            return;
        }

        this.isLoggingOut = true;

        try {
            // 로그아웃 API 호출 (실패해도 로컬 데이터는 삭제)
            await this.request(`${ENDPOINTS.AUTH}/logout`, {
                method: 'POST',
                skipRetry: true // 401 에러 재시도 방지
            });
        } catch (error) {
            console.error('Logout error:', error);
            // 에러가 발생해도 로컬 세션은 정리
        } finally {
            this.token = null;
            this.user = null;
            this.isLoggingOut = false;

            // localStorage에서 영구 저장된 데이터 삭제
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            localStorage.removeItem('loginData');

            // sessionStorage에서 임시 저장된 사용자 정보 삭제
            sessionStorage.removeItem('user');

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
            console.error('Token refresh error:', error);
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

            console.warn('⚠️ 예상과 다른 응답 구조:', response);
            return [];
        } catch (error) {
            console.error('Error fetching employees by role:', error);
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
     */
    async getEmployeeByName(name) {
        try {
            const response = await this.request(`${ENDPOINTS.EMPLOYEES}/${encodeURIComponent(name)}`);
            // 백엔드는 { success: true, employee: {...} } 형태로 반환
            return response;
        } catch (error) {
            console.error('Error fetching employee by name:', error);
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
     */
    async updateClient(id, clientData) {
        const response = await this.request(`${ENDPOINTS.CLIENTS}/${id}`, {
            method: 'PUT',
            body: JSON.stringify(clientData)
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
            console.error('❌ 로그인된 사용자 정보 없음');
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
        console.warn('clear() is not supported in API mode');
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
            console.error('Error fetching user data:', error);
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

        // 인증 토큰 추가
        if (this.token) {
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
            // 단, 인증 엔드포인트(/auth/login, /auth/logout, /auth/refresh)는 제외
            const isAuthEndpoint = endpoint.includes('/auth/login') ||
                                   endpoint.includes('/auth/logout') ||
                                   endpoint.includes('/auth/refresh');

            // skipRetry 옵션이 있거나, 인증 엔드포인트이거나, 이미 갱신/로그아웃 중이면 재시도하지 않음
            if (response.status === 401 && !options.skipRetry && !isAuthEndpoint && !this.isRefreshing && !this.isLoggingOut) {
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
                throw new Error('요청 시간 초과');
            }
            console.error('API Request Error:', error);
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
