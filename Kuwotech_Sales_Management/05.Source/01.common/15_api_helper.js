/**
 * API Helper - 통합 API 요청 함수
 * 작성일: 2025-10-09
 * 설명: 모든 fetch 호출을 표준화하고 에러 처리를 일관되게 관리
 */

import { GlobalConfig } from './01_global_config.js';

/**
 * API 요청 헬퍼 함수
 * @param {string} endpoint - API 엔드포인트 (예: '/companies', '/employees')
 * @param {Object} options - fetch 옵션
 * @param {string} options.method - HTTP 메서드 (GET, POST, PUT, DELETE)
 * @param {Object} options.body - 요청 바디 (자동으로 JSON.stringify 됨)
 * @param {Object} options.headers - 추가 헤더
 * @param {boolean} options.auth - 인증 토큰 자동 포함 여부 (기본값: true)
 * @returns {Promise<Object>} API 응답 데이터
 */
export async function apiRequest(endpoint, options = {}) {
    const {
        method = 'GET',
        body = null,
        headers = {},
        auth = true,
    } = options;

    // API Base URL
    const baseURL = GlobalConfig.API_BASE_URL;
    const url = `${baseURL}${endpoint}`;

    // 기본 헤더
    const defaultHeaders = {
        'Content-Type': 'application/json',
    };

    // 인증 토큰 추가
    if (auth) {
        const token = localStorage.getItem('authToken');
        if (token) {
            defaultHeaders['Authorization'] = `Bearer ${token}`;
        }
    }

    // 헤더 병합
    const finalHeaders = { ...defaultHeaders, ...headers };

    // fetch 옵션 구성
    const fetchOptions = {
        method,
        headers: finalHeaders,
    };

    // Body 추가 (GET, HEAD 제외)
    if (body && method !== 'GET' && method !== 'HEAD') {
        fetchOptions.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(url, fetchOptions);

        // 응답 처리
        const contentType = response.headers.get('content-type');
        const isJson = contentType && contentType.includes('application/json');

        let data;
        if (isJson) {
            data = await response.json();
        } else {
            data = await response.text();
        }

        // 에러 응답 처리
        if (!response.ok) {
            const error = new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
            error.status = response.status;
            error.data = data;
            throw error;
        }

        return data;

    } catch (error) {
        // 네트워크 에러 또는 HTTP 에러
        console.error(`API Request Failed: ${method} ${endpoint}`, error);
        throw error;
    }
}

/**
 * GET 요청
 * @param {string} endpoint - API 엔드포인트
 * @param {Object} params - 쿼리 파라미터
 * @param {Object} options - 추가 옵션
 * @returns {Promise<Object>} API 응답
 */
export async function apiGet(endpoint, params = {}, options = {}) {
    // 쿼리 파라미터 추가
    const queryString = new URLSearchParams(params).toString();
    const fullEndpoint = queryString ? `${endpoint}?${queryString}` : endpoint;

    return apiRequest(fullEndpoint, {
        method: 'GET',
        ...options,
    });
}

/**
 * POST 요청
 * @param {string} endpoint - API 엔드포인트
 * @param {Object} data - 요청 데이터
 * @param {Object} options - 추가 옵션
 * @returns {Promise<Object>} API 응답
 */
export async function apiPost(endpoint, data = {}, options = {}) {
    return apiRequest(endpoint, {
        method: 'POST',
        body: data,
        ...options,
    });
}

/**
 * PUT 요청
 * @param {string} endpoint - API 엔드포인트
 * @param {Object} data - 요청 데이터
 * @param {Object} options - 추가 옵션
 * @returns {Promise<Object>} API 응답
 */
export async function apiPut(endpoint, data = {}, options = {}) {
    return apiRequest(endpoint, {
        method: 'PUT',
        body: data,
        ...options,
    });
}

/**
 * DELETE 요청
 * @param {string} endpoint - API 엔드포인트
 * @param {Object} options - 추가 옵션
 * @returns {Promise<Object>} API 응답
 */
export async function apiDelete(endpoint, options = {}) {
    return apiRequest(endpoint, {
        method: 'DELETE',
        ...options,
    });
}

/**
 * 파일 업로드 (multipart/form-data)
 * @param {string} endpoint - API 엔드포인트
 * @param {FormData} formData - 폼 데이터
 * @param {Object} options - 추가 옵션
 * @returns {Promise<Object>} API 응답
 */
export async function apiUpload(endpoint, formData, options = {}) {
    const baseURL = GlobalConfig.API_BASE_URL;
    const url = `${baseURL}${endpoint}`;

    // 인증 토큰
    const token = localStorage.getItem('authToken');
    const headers = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    // multipart/form-data는 Content-Type 자동 설정
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: formData, // FormData 객체 그대로 전달
        });

        const data = await response.json();

        if (!response.ok) {
            const error = new Error(data.message || `Upload failed: ${response.status}`);
            error.status = response.status;
            error.data = data;
            throw error;
        }

        return data;

    } catch (error) {
        console.error(`File Upload Failed: ${endpoint}`, error);
        throw error;
    }
}

/**
 * 에러 핸들러 유틸리티
 * @param {Error} error - 에러 객체
 * @param {Function} showToast - 토스트 표시 함수 (선택)
 * @returns {string} 사용자 친화적 에러 메시지
 */
export function handleApiError(error, showToast = null) {
    let message = '알 수 없는 오류가 발생했습니다.';

    if (error.status === 401) {
        message = '인증이 만료되었습니다. 다시 로그인해주세요.';
        // 로그아웃 처리
        localStorage.removeItem('authToken');
        window.location.href = '/05.Source/02.login/01_login.html';
    } else if (error.status === 403) {
        message = '접근 권한이 없습니다.';
    } else if (error.status === 404) {
        message = '요청한 리소스를 찾을 수 없습니다.';
    } else if (error.status === 500) {
        message = '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
    } else if (error.message) {
        message = error.message;
    }

    // 토스트 표시
    if (showToast) {
        showToast(message, 'error');
    }

    return message;
}

/**
 * 배치 요청 (여러 API 동시 호출)
 * @param {Array<Promise>} requests - API 요청 Promise 배열
 * @returns {Promise<Array>} 모든 응답 배열
 */
export async function apiBatch(requests) {
    try {
        const results = await Promise.all(requests);
        return results;
    } catch (error) {
        console.error('Batch API request failed:', error);
        throw error;
    }
}

/**
 * 재시도 로직이 포함된 API 요청
 * @param {string} endpoint - API 엔드포인트
 * @param {Object} options - fetch 옵션
 * @param {number} maxRetries - 최대 재시도 횟수 (기본값: 3)
 * @param {number} retryDelay - 재시도 대기 시간 (ms, 기본값: 1000)
 * @returns {Promise<Object>} API 응답
 */
export async function apiRequestWithRetry(endpoint, options = {}, maxRetries = 3, retryDelay = 1000) {
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await apiRequest(endpoint, options);
        } catch (error) {
            lastError = error;

            // 401, 403, 404는 재시도하지 않음
            if (error.status === 401 || error.status === 403 || error.status === 404) {
                throw error;
            }

            // 마지막 시도가 아니면 대기 후 재시도
            if (attempt < maxRetries) {
                console.warn(`API request failed, retrying... (${attempt + 1}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
        }
    }

    // 모든 재시도 실패
    throw lastError;
}

// 기본 export
export default {
    apiRequest,
    apiGet,
    apiPost,
    apiPut,
    apiDelete,
    apiUpload,
    handleApiError,
    apiBatch,
    apiRequestWithRetry,
};
