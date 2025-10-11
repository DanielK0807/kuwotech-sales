/**
 * 스토리지 매니저 - localStorage/sessionStorage 통합 관리
 * 작성일: 2025-01-30
 * 버전: 1.0.0
 */

import logger from './23_logger.js';

class StorageManager {
    constructor(prefix = '') {
        this.prefix = prefix;
        this.storage = localStorage; // 기본값: localStorage
    }
    
    /**
     * localStorage 사용
     */
    useLocalStorage() {
        this.storage = localStorage;
    }
    
    /**
     * sessionStorage 사용
     */
    useSessionStorage() {
        this.storage = sessionStorage;
    }
    
    /**
     * 키에 prefix 적용
     */
    getKey(key) {
        return `${this.prefix}${key}`;
    }
    
    /**
     * 데이터 저장
     */
    set(key, value) {
        try {
            const data = JSON.stringify(value);
            this.storage.setItem(this.getKey(key), data);
            return true;
        } catch (error) {
            logger.error('[StorageManager] 저장 실패:', error);
            return false;
        }
    }
    
    /**
     * 데이터 조회
     */
    get(key) {
        try {
            const data = this.storage.getItem(this.getKey(key));
            if (!data) return null;

            // JSON 파싱 시도
            try {
                return JSON.parse(data);
            } catch (parseError) {
                // JSON 파싱 실패 시 원본 문자열 반환 (JWT 토큰 등)
                return data;
            }
        } catch (error) {
            logger.error('[StorageManager] 조회 실패:', error);
            return null;
        }
    }
    
    /**
     * 데이터 제거
     */
    remove(key) {
        try {
            this.storage.removeItem(this.getKey(key));
            return true;
        } catch (error) {
            logger.error('[StorageManager] 제거 실패:', error);
            return false;
        }
    }
    
    /**
     * 모든 데이터 제거
     */
    clear() {
        try {
            // prefix가 있는 키만 제거
            if (this.prefix) {
                Object.keys(this.storage).forEach(key => {
                    if (key.startsWith(this.prefix)) {
                        this.storage.removeItem(key);
                    }
                });
            } else {
                this.storage.clear();
            }
            return true;
        } catch (error) {
            logger.error('[StorageManager] 클리어 실패:', error);
            return false;
        }
    }
    
    /**
     * 키 존재 여부 확인
     */
    has(key) {
        return this.storage.getItem(this.getKey(key)) !== null;
    }
    
    /**
     * 모든 데이터 조회
     */
    getAll() {
        const data = {};
        Object.keys(this.storage).forEach(key => {
            if (key.startsWith(this.prefix)) {
                const originalKey = key.replace(this.prefix, '');
                data[originalKey] = this.get(originalKey);
            }
        });
        return data;
    }
    
    /**
     * 저장 공간 크기 확인 (바이트)
     */
    getSize() {
        let size = 0;
        Object.keys(this.storage).forEach(key => {
            if (key.startsWith(this.prefix)) {
                size += this.storage.getItem(key).length + key.length;
            }
        });
        return size;
    }
}

export default StorageManager;
