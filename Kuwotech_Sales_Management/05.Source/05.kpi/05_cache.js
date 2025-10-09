/**
 * KUWOTECH 영업관리 시스템 - KPI 캐싱 시스템
 * Created by: Daniel.K
 * Date: 2025-09-27
 * Owner: Kang Jung Hwan
 * 
 * 기능:
 * - KPI 계산 결과 캐싱
 * - TTL 기반 캐시 무효화
 * - 캐시 통계 관리
 */

// ============================================
// [섹션: KPI 캐시 클래스]
// ============================================

class KPICache {
    constructor() {
        this.cache = new Map();
        this.TTL = 5 * 60 * 1000; // 5분 (기본값)
        this.hitCount = 0;
        this.missCount = 0;
        this.initTime = Date.now();
        
        console.log(`[KPI 캐시] 초기화 완료 (TTL: ${this.TTL/1000}초)`);
    }
    
    // ============================================
    // [섹션: 캐시 키 생성]
    // ============================================
    
    /**
     * 캐시 키 생성
     * @param {string} type - 캐시 타입
     * @param {string} userId - 사용자 ID (선택)
     * @returns {string} 캐시 키
     */
    generateKey(type, userId = null) {
        return userId ? `${type}_${userId}` : type;
    }
    
    // ============================================
    // [섹션: 캐시 조회]
    // ============================================
    
    /**
     * 캐시 조회
     * @param {string} type - 캐시 타입
     * @param {string} userId - 사용자 ID (선택)
     * @returns {any} 캐시된 데이터 또는 null
     */
    get(type, userId = null) {
        const key = this.generateKey(type, userId);
        const cached = this.cache.get(key);
        
        if (!cached) {
            this.missCount++;
            console.log(`[캐시 미스] ${key} (미스율: ${this.getMissRate()}%)`);
            return null;
        }
        
        // TTL 확인
        const age = Date.now() - cached.timestamp;
        if (age > this.TTL) {
            this.cache.delete(key);
            this.missCount++;
            console.log(`[캐시 만료] ${key} (나이: ${Math.round(age/1000)}초)`);
            return null;
        }
        
        this.hitCount++;
        console.log(`[캐시 히트] ${key} (히트율: ${this.getHitRate()}%)`);
        return cached.data;
    }
    
    // ============================================
    // [섹션: 캐시 저장]
    // ============================================
    
    /**
     * 캐시 저장
     * @param {string} type - 캐시 타입
     * @param {any} data - 저장할 데이터
     * @param {string} userId - 사용자 ID (선택)
     */
    set(type, data, userId = null) {
        const key = this.generateKey(type, userId);
        
        this.cache.set(key, {
            data: data,
            timestamp: Date.now(),
            hits: 0
        });
        
        console.log(`[캐시 저장] ${key} (크기: ${this.cache.size})`);
        
        // 메모리 관리 - 최대 100개 항목
        if (this.cache.size > 100) {
            this.evictOldest();
        }
    }
    
    // ============================================
    // [섹션: 캐시 삭제]
    // ============================================
    
    /**
     * 캐시 삭제
     * @param {string} type - 캐시 타입 (선택)
     * @param {string} userId - 사용자 ID (선택)
     */
    clear(type = null, userId = null) {
        if (type) {
            const key = this.generateKey(type, userId);
            const deleted = this.cache.delete(key);
            if (deleted) {
                console.log(`[캐시 삭제] ${key}`);
            }
        } else {
            const size = this.cache.size;
            this.cache.clear();
            console.log(`[캐시 전체 삭제] ${size}개 항목 삭제`);
        }
    }
    
    // ============================================
    // [섹션: 패턴 기반 삭제]
    // ============================================
    
    /**
     * 패턴 기반 캐시 삭제
     * @param {string} pattern - 삭제할 패턴 (예: 'sales_*')
     */
    clearByPattern(pattern) {
        const regex = new RegExp(pattern.replace('*', '.*'));
        let count = 0;
        
        for (const key of this.cache.keys()) {
            if (regex.test(key)) {
                this.cache.delete(key);
                count++;
            }
        }
        
        console.log(`[패턴 삭제] ${pattern} → ${count}개 삭제`);
    }
    
    // ============================================
    // [섹션: TTL 설정]
    // ============================================
    
    /**
     * TTL 변경
     * @param {number} seconds - TTL (초)
     */
    setTTL(seconds) {
        this.TTL = seconds * 1000;
        console.log(`[TTL 변경] ${seconds}초`);
    }
    
    // ============================================
    // [섹션: 메모리 관리]
    // ============================================
    
    /**
     * 가장 오래된 캐시 항목 제거
     */
    evictOldest() {
        let oldestKey = null;
        let oldestTime = Infinity;
        
        for (const [key, value] of this.cache.entries()) {
            if (value.timestamp < oldestTime) {
                oldestTime = value.timestamp;
                oldestKey = key;
            }
        }
        
        if (oldestKey) {
            this.cache.delete(oldestKey);
            console.log(`[캐시 축출] ${oldestKey} (LRU)`);
        }
    }
    
    // ============================================
    // [섹션: 캐시 통계]
    // ============================================
    
    /**
     * 캐시 통계 조회
     */
    getStats() {
        const totalRequests = this.hitCount + this.missCount;
        const uptime = Math.round((Date.now() - this.initTime) / 1000);
        
        return {
            size: this.cache.size,
            hits: this.hitCount,
            misses: this.missCount,
            totalRequests,
            hitRate: this.getHitRate(),
            missRate: this.getMissRate(),
            ttl: `${this.TTL / 1000}초`,
            uptime: `${uptime}초`,
            avgRequestsPerMinute: totalRequests > 0 ? Math.round((totalRequests / uptime) * 60) : 0,
            memoryUsage: this.getMemoryUsage()
        };
    }
    
    /**
     * 히트율 계산
     */
    getHitRate() {
        const total = this.hitCount + this.missCount;
        return total > 0 ? ((this.hitCount / total) * 100).toFixed(2) : '0.00';
    }
    
    /**
     * 미스율 계산
     */
    getMissRate() {
        const total = this.hitCount + this.missCount;
        return total > 0 ? ((this.missCount / total) * 100).toFixed(2) : '0.00';
    }
    
    /**
     * 메모리 사용량 추정
     */
    getMemoryUsage() {
        // 대략적인 메모리 사용량 추정 (바이트)
        let totalSize = 0;
        for (const [key, value] of this.cache.entries()) {
            totalSize += key.length * 2; // 문자열 크기
            totalSize += JSON.stringify(value.data).length * 2; // 데이터 크기
            totalSize += 100; // 메타데이터
        }
        return `약 ${Math.round(totalSize / 1024)}KB`;
    }
    
    /**
     * 캐시 덤프 (디버깅용)
     */
    dump() {
        const items = [];
        for (const [key, value] of this.cache.entries()) {
            const age = Math.round((Date.now() - value.timestamp) / 1000);
            items.push({
                key,
                age: `${age}초`,
                hits: value.hits,
                dataSize: JSON.stringify(value.data).length
            });
        }
        console.table(items);
        return items;
    }
}

// ============================================
// [섹션: 싱글톤 인스턴스]
// ============================================

// 싱글톤 패턴으로 단일 인스턴스 관리
export const kpiCache = new KPICache();

// ============================================
// [섹션: 캐시 적용 래퍼]
// ============================================

/**
 * 캐시 적용 래퍼 함수
 * @param {string} type - 캐시 타입
 * @param {function} calculateFn - 계산 함수
 * @param {string} userId - 사용자 ID (선택)
 * @returns {any} 캐시된 또는 계산된 결과
 */
export async function withCache(type, calculateFn, userId = null) {
    // 캐시 확인
    const cached = kpiCache.get(type, userId);
    if (cached) {
        return cached;
    }
    
    // 계산 실행
    console.log(`[캐시 계산] ${type} 계산 시작...`);
    const startTime = performance.now();
    const result = await calculateFn();
    const duration = performance.now() - startTime;
    console.log(`[캐시 계산] ${type} 완료 (${duration.toFixed(2)}ms)`);
    
    // 캐시 저장
    kpiCache.set(type, result, userId);
    
    return result;
}

// ============================================
// [섹션: 캐시 관리 함수]
// ============================================

/**
 * 데이터 변경 시 캐시 무효화
 */
export function invalidateKPICache() {
    kpiCache.clear();
    console.log('[KPI 캐시 무효화] 모든 캐시 삭제');
}

/**
 * 특정 사용자 캐시만 무효화
 * @param {string} userId - 사용자 ID
 */
export function invalidateUserKPICache(userId) {
    kpiCache.clearByPattern(`.*_${userId}`);
    console.log(`[KPI 캐시 무효화] 사용자: ${userId}`);
}

/**
 * 영업담당 KPI 캐시 무효화
 */
export function invalidateSalesKPICache() {
    kpiCache.clearByPattern('sales_kpi_.*');
    console.log('[KPI 캐시 무효화] 모든 영업담당 KPI');
}

/**
 * 관리자 KPI 캐시 무효화
 */
export function invalidateAdminKPICache() {
    kpiCache.clear('admin_kpi');
    console.log('[KPI 캐시 무효화] 관리자 KPI');
}

// ============================================
// [섹션: 캐시 적용 예시]
// ============================================

import { calculateSalesKPI } from './02_sales_kpi.js';
import { calculateAdminKPI } from './03_admin_kpi.js';
import { calculateContributionRanking } from './04_contribution.js';

/**
 * 영업담당 KPI (캐시 적용)
 */
export async function getSalesKPIWithCache(userId) {
    return await withCache('sales_kpi', 
        () => calculateSalesKPI(userId), 
        userId
    );
}

/**
 * 관리자 KPI (캐시 적용)
 */
export async function getAdminKPIWithCache() {
    return await withCache('admin_kpi', 
        () => calculateAdminKPI()
    );
}

/**
 * 기여도 순위 (캐시 적용)
 */
export async function getContributionRankingWithCache(type) {
    return await withCache(`contribution_${type}`, 
        () => calculateContributionRanking(type)
    );
}

// ============================================
// [섹션: 자동 캐시 갱신]
// ============================================

/**
 * 자동 캐시 갱신 시작
 * @param {number} interval - 갱신 주기 (초)
 */
export function startCacheRefresh(interval = 300) {
    setInterval(() => {
        console.log('[자동 갱신] KPI 캐시 갱신 시작');
        
        // 오래된 캐시 항목만 갱신
        const stats = kpiCache.getStats();
        console.log(`[자동 갱신] 현재 캐시: ${stats.size}개, 히트율: ${stats.hitRate}%`);
        
        // 히트율이 낮으면 캐시 전체 삭제
        if (parseFloat(stats.hitRate) < 50) {
            kpiCache.clear();
            console.log('[자동 갱신] 히트율 낮음 → 전체 삭제');
        }
        
    }, interval * 1000);
}

// ============================================
// [섹션: 캐시 모니터링]
// ============================================

/**
 * 캐시 모니터링 정보 출력
 */
export function monitorCache() {
    const stats = kpiCache.getStats();
    
    console.log('=== KPI 캐시 모니터링 ===');
    console.log(`캐시 크기: ${stats.size}개`);
    console.log(`히트/미스: ${stats.hits}/${stats.misses}`);
    console.log(`히트율: ${stats.hitRate}%`);
    console.log(`TTL: ${stats.ttl}`);
    console.log(`메모리: ${stats.memoryUsage}`);
    console.log(`가동시간: ${stats.uptime}`);
    console.log(`분당 요청: ${stats.avgRequestsPerMinute}`);
    console.log('========================');
    
    return stats;
}

// 전역 접근을 위한 window 객체 등록 (디버깅용)
if (typeof window !== 'undefined') {
    window.kpiCache = kpiCache;
    window.monitorKPICache = monitorCache;
}

// [내용: KPI 캐싱 시스템]
// 테스트: 캐시 히트/미스, TTL, 메모리 관리, 통계
// #캐시 #성능최적화