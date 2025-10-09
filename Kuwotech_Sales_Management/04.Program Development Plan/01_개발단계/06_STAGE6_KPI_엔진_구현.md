# STAGE 6: KPI 엔진 구현 📈

> **단계**: STAGE 6  
> **작성일**: 2025-09-26  
> **목표**: KPI 계산 엔진 및 분석 시스템 구현  
> **예상 소요**: 2일

---

## 📋 목차

1. [개요](#1-개요)
2. [KPI 계산 엔진](#2-kpi-계산-엔진)
3. [영업담당 KPI](#3-영업담당-kpi)
4. [관리자 KPI](#4-관리자-kpi)
5. [주요제품 우선순위](#5-주요제품-우선순위)
6. [현재월수 계산](#6-현재월수-계산)
7. [매출집중도 계산](#7-매출집중도-계산)
8. [기여도 순위](#8-기여도-순위)
9. [캐싱 시스템](#9-캐싱-시스템)
10. [테스트](#10-테스트)

---

## 1. 개요

### 1.1 KPI 엔진 구조

```
KPI 엔진
├── 계산 엔진 (Calculator)
│   ├── 주요제품 우선순위
│   ├── 현재월수 계산
│   └── 매출집중도 계산
│
├── 영업담당 KPI (14개)
│   ├── 거래처 관련 (4개)
│   ├── 달성율 관련 (2개)
│   ├── 매출 관련 (5개)
│   └── 기여도 관련 (3개)
│
├── 관리자 KPI (11개)
│   ├── 전사 거래처 (4개)
│   ├── 전사 달성율 (2개)
│   ├── 전사 매출 (4개)
│   └── 전사 수금 (1개)
│
└── 기여도 순위
    ├── 전체매출 기여도
    └── 주요제품매출 기여도
```

### 1.2 폴더 구조

```
05.Source/
└── 06.kpi/
    ├── 01_kpi_calculator.js     (계산 엔진)
    ├── 02_sales_kpi.js          (영업담당 KPI)
    ├── 03_admin_kpi.js          (관리자 KPI)
    ├── 04_contribution.js       (기여도 계산)
    ├── 05_cache.js              (캐싱 시스템)
    └── test_kpi.js              (테스트)
```

---

## 2. KPI 계산 엔진

### 2.1 기본 계산 엔진

**파일 위치**: `05.Source/06.kpi/01_kpi_calculator.js`

```javascript
// [섹션: Import]
import { getDB } from '../05.database/01_schema.js';

// [섹션: 주요제품 3단계 우선순위]
export function calculateMainProducts(companies) {
  const mainProducts = ['임플란트', '지르코니아', 'Abutment'];
  const results = new Set();
  
  // 1단계: 임플란트 포함
  companies.forEach(company => {
    if (company.salesProduct && company.salesProduct.includes('임플란트')) {
      results.add(company.keyValue);
    }
  });
  
  // 2단계: 지르코니아 포함 (1단계 제외)
  companies.forEach(company => {
    if (!results.has(company.keyValue) && 
        company.salesProduct && 
        company.salesProduct.includes('지르코니아')) {
      results.add(company.keyValue);
    }
  });
  
  // 3단계: Abutment 포함 (1,2단계 제외)
  companies.forEach(company => {
    if (!results.has(company.keyValue) && 
        company.salesProduct && 
        company.salesProduct.includes('Abutment')) {
      results.add(company.keyValue);
    }
  });
  
  console.log(`[주요제품 계산] 1단계: 임플란트, 2단계: 지르코니아, 3단계: Abutment → 총 ${results.size}개`);
  
  return results.size;
}

// [섹션: 현재월수 계산]
export function calculateCurrentMonth(hireDate) {
  const hire = new Date(hireDate);
  const now = new Date();
  
  // 근무 기간 계산 (년 단위)
  const yearsDiff = (now - hire) / (1000 * 60 * 60 * 24 * 365);
  
  if (yearsDiff > 1) {
    // 1년 이상 근무: 올해 1월 1일부터 현재까지
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const monthsSinceYearStart = Math.floor((now - yearStart) / (1000 * 60 * 60 * 24 * 30));
    
    console.log(`[현재월수] 1년 이상 근무자 → 올해 1월 1일부터 ${monthsSinceYearStart}개월`);
    return monthsSinceYearStart;
    
  } else {
    // 1년 미만: 입사일부터 현재까지
    const monthsSinceHire = Math.floor((now - hire) / (1000 * 60 * 60 * 24 * 30));
    
    console.log(`[현재월수] 1년 미만 근무자 → 입사일부터 ${monthsSinceHire}개월`);
    return monthsSinceHire;
  }
}

// [섹션: 매출집중도 계산]
export function calculateSalesConcentration(totalSales, totalCompanies, currentMonth) {
  if (totalCompanies === 0 || currentMonth === 0) {
    console.log('[매출집중도] 거래처 또는 월수가 0 → 0 반환');
    return 0;
  }
  
  // 매출집중도 = 누적매출금액 / 담당거래처 / 현재월수
  const concentration = totalSales / totalCompanies / currentMonth;
  
  console.log(`[매출집중도] ${totalSales.toLocaleString()} / ${totalCompanies} / ${currentMonth} = ${Math.round(concentration).toLocaleString()}`);
  
  return concentration;
}

// [섹션: 활성 거래처 판단]
export function isActiveCompany(company) {
  // 사업현황이 '활성' 이거나 누적매출금액이 0보다 큰 경우
  return company.businessStatus === '활성' || (company.accumulatedSales && company.accumulatedSales > 0);
}

// [섹션: 주요제품 판단]
export function isMainProduct(salesProduct) {
  if (!salesProduct) return false;
  
  const mainProducts = ['임플란트', '지르코니아', 'Abutment'];
  return mainProducts.some(product => salesProduct.includes(product));
}

// [섹션: 달성율 계산]
export function calculateAchievementRate(actual, target) {
  if (target === 0) return 0;
  
  // (실제 / 목표 - 1) × 100
  const rate = ((actual / target) - 1) * 100;
  
  if (rate >= 0) {
    console.log(`[달성율] ${actual} / ${target} = ${rate.toFixed(2)}% 초과`);
  } else {
    console.log(`[달성율] ${actual} / ${target} = (${Math.abs(rate).toFixed(2)})% 미달`);
  }
  
  return rate;
}

// [섹션: 헬퍼 함수 - 직원 목록 조회]
export async function getEmployees() {
  const db = await getDB();
  const tx = db.transaction('employees', 'readonly');
  const store = tx.objectStore('employees');
  return await store.getAll();
}

// [섹션: 헬퍼 함수 - 영업사원 수 조회]
export async function getSalesPersonCount() {
  const employees = await getEmployees();
  return employees.filter(emp => emp.role === 'sales').length;
}
```

---

## 3. 영업담당 KPI

### 3.1 영업담당 KPI 계산

**파일 위치**: `05.Source/06.kpi/02_sales_kpi.js`

```javascript
// [섹션: Import]
import { getDB } from '../05.database/01_schema.js';
import { 
  calculateMainProducts, 
  calculateCurrentMonth, 
  calculateSalesConcentration,
  isActiveCompany,
  isMainProduct,
  calculateAchievementRate,
  getEmployees
} from './01_kpi_calculator.js';

// [섹션: 영업담당 KPI 14개 계산]
export async function calculateSalesKPI(userId) {
  console.log(`=== 영업담당 KPI 계산 시작 (userId: ${userId}) ===`);
  
  try {
    const db = await getDB();
    
    // 사용자 정보 조회
    const user = await getUserInfo(userId);
    console.log(`[사용자] ${user.name} (입사일: ${user.hireDate})`);
    
    // 본인 담당 거래처만 조회
    const companies = await getCompaniesByManager(user.name);
    console.log(`[담당 거래처] 총 ${companies.length}개`);
    
    // === 거래처 관련 KPI (4개) ===
    
    // 1. 담당거래처 (불용 제외)
    const totalCompanies = companies.filter(c => c.businessStatus !== '불용').length;
    console.log(`[KPI 1] 담당거래처: ${totalCompanies}개`);
    
    // 2. 활성거래처
    const activeCompanies = companies.filter(c => isActiveCompany(c)).length;
    console.log(`[KPI 2] 활성거래처: ${activeCompanies}개`);
    
    // 3. 활성화율
    const activationRate = totalCompanies > 0 ? 
      (activeCompanies / totalCompanies * 100).toFixed(2) : '0.00';
    console.log(`[KPI 3] 활성화율: ${activationRate}%`);
    
    // 4. 주요제품판매거래처 (3단계 우선순위)
    const mainProductCompanies = calculateMainProducts(companies);
    console.log(`[KPI 4] 주요제품판매거래처: ${mainProductCompanies}개`);
    
    // === 달성율 관련 KPI (2개) ===
    
    // 5. 회사배정기준대비 달성율 (기준: 80개)
    const targetBase = 80;
    const achievementRate = calculateAchievementRate(totalCompanies, targetBase);
    console.log(`[KPI 5] 회사배정기준대비 달성율: ${achievementRate.toFixed(2)}%`);
    
    // 6. 주요고객처목표달성율 (목표: 40개)
    const mainTarget = 40;
    const mainAchievementRate = (mainProductCompanies / mainTarget) * 100;
    console.log(`[KPI 6] 주요고객처목표달성율: ${mainAchievementRate.toFixed(2)}%`);
    
    // === 매출 관련 KPI (5개) ===
    
    // 7. 누적매출금액
    const totalSales = companies.reduce((sum, c) => sum + (c.accumulatedSales || 0), 0);
    console.log(`[KPI 7] 누적매출금액: ${totalSales.toLocaleString()}원`);
    
    // 8. 주요제품매출액
    const mainProductSales = companies
      .filter(c => isMainProduct(c.salesProduct))
      .reduce((sum, c) => sum + (c.accumulatedSales || 0), 0);
    console.log(`[KPI 8] 주요제품매출액: ${mainProductSales.toLocaleString()}원`);
    
    // 9. 주요제품매출비율
    const mainProductRatio = totalSales > 0 ? 
      (mainProductSales / totalSales * 100).toFixed(2) : '0.00';
    console.log(`[KPI 9] 주요제품매출비율: ${mainProductRatio}%`);
    
    // 10. 매출집중도
    const currentMonth = calculateCurrentMonth(user.hireDate);
    const salesConcentration = calculateSalesConcentration(totalSales, totalCompanies, currentMonth);
    console.log(`[KPI 10] 매출집중도: ${Math.round(salesConcentration).toLocaleString()}원`);
    
    // 11. 누적수금금액
    const totalCollection = companies.reduce((sum, c) => sum + (c.accumulatedCollection || 0), 0);
    console.log(`[KPI 11] 누적수금금액: ${totalCollection.toLocaleString()}원`);
    
    // === 기여도 관련 KPI (3개) ===
    
    // 12. 매출채권잔액
    const receivables = companies.reduce((sum, c) => sum + (c.accountsReceivable || 0), 0);
    console.log(`[KPI 12] 매출채권잔액: ${receivables.toLocaleString()}원`);
    
    // 13. 전체매출기여도 (전사 대비)
    const allSales = await getTotalSales();
    const salesContribution = allSales > 0 ? 
      (totalSales / allSales * 100).toFixed(2) : '0.00';
    console.log(`[KPI 13] 전체매출기여도: ${salesContribution}%`);
    
    // 14. 주요제품매출기여도 (전사 주요제품 대비)
    const allMainSales = await getTotalMainProductSales();
    const mainContribution = allMainSales > 0 ? 
      (mainProductSales / allMainSales * 100).toFixed(2) : '0.00';
    console.log(`[KPI 14] 주요제품매출기여도: ${mainContribution}%`);
    
    console.log('=== 영업담당 KPI 계산 완료 ===');
    
    return {
      totalCompanies,
      activeCompanies,
      activationRate,
      mainProductCompanies,
      achievementRate,
      mainAchievementRate,
      totalSales,
      mainProductSales,
      mainProductRatio,
      salesConcentration,
      totalCollection,
      receivables,
      salesContribution,
      mainContribution,
      currentMonth // 디버깅용
    };
    
  } catch (error) {
    console.error('[영업담당 KPI 계산 실패]', error);
    throw error;
  }
}

// [섹션: 헬퍼 함수 - 사용자 정보]
async function getUserInfo(userId) {
  const db = await getDB();
  const tx = db.transaction('employees', 'readonly');
  const store = tx.objectStore('employees');
  return await store.get(userId);
}

// [섹션: 헬퍼 함수 - 담당 거래처]
async function getCompaniesByManager(managerName) {
  const db = await getDB();
  const tx = db.transaction('companies', 'readonly');
  const store = tx.objectStore('companies');
  const index = store.index('internalManager');
  return await index.getAll(managerName);
}

// [섹션: 헬퍼 함수 - 전사 매출]
async function getTotalSales() {
  const db = await getDB();
  const tx = db.transaction('companies', 'readonly');
  const store = tx.objectStore('companies');
  const allCompanies = await store.getAll();
  
  return allCompanies.reduce((sum, c) => sum + (c.accumulatedSales || 0), 0);
}

// [섹션: 헬퍼 함수 - 전사 주요제품 매출]
async function getTotalMainProductSales() {
  const db = await getDB();
  const tx = db.transaction('companies', 'readonly');
  const store = tx.objectStore('companies');
  const allCompanies = await store.getAll();
  
  return allCompanies
    .filter(c => isMainProduct(c.salesProduct))
    .reduce((sum, c) => sum + (c.accumulatedSales || 0), 0);
}
```

---

## 4. 관리자 KPI

### 4.1 관리자 KPI 계산

**파일 위치**: `05.Source/06.kpi/03_admin_kpi.js`

```javascript
// [섹션: Import]
import { getDB } from '../05.database/01_schema.js';
import { 
  calculateMainProducts, 
  calculateSalesConcentration,
  isActiveCompany,
  isMainProduct,
  calculateAchievementRate,
  getSalesPersonCount
} from './01_kpi_calculator.js';

// [섹션: 관리자 KPI 11개 계산]
export async function calculateAdminKPI() {
  console.log('=== 전사 KPI 계산 시작 ===');
  
  try {
    const db = await getDB();
    
    // 전체 거래처 조회 (관리자 권한)
    const allCompanies = await getAllCompanies();
    console.log(`[전체 거래처] 총 ${allCompanies.length}개`);
    
    // === 전사 거래처 관련 KPI (4개) ===
    
    // 1. 전체거래처 (불용 제외)
    const totalCompanies = allCompanies.filter(c => c.businessStatus !== '불용').length;
    console.log(`[KPI 1] 전체거래처: ${totalCompanies}개`);
    
    // 2. 활성거래처
    const activeCompanies = allCompanies.filter(c => isActiveCompany(c)).length;
    console.log(`[KPI 2] 활성거래처: ${activeCompanies}개`);
    
    // 3. 활성화율
    const activationRate = totalCompanies > 0 ? 
      (activeCompanies / totalCompanies * 100).toFixed(2) : '0.00';
    console.log(`[KPI 3] 활성화율: ${activationRate}%`);
    
    // 4. 주요제품판매거래처 (3단계 우선순위)
    const mainProductCompanies = calculateMainProducts(allCompanies);
    console.log(`[KPI 4] 주요제품판매거래처: ${mainProductCompanies}개`);
    
    // === 전사 달성율 관련 KPI (2개) ===
    
    // 5. 회사배정기준대비 달성율 (기준: 80개 × 영업사원 수)
    const salesCount = await getSalesPersonCount();
    const targetBase = 80 * salesCount;
    const achievementRate = calculateAchievementRate(totalCompanies, targetBase);
    console.log(`[KPI 5] 회사배정기준대비 달성율: ${achievementRate.toFixed(2)}% (기준: ${targetBase}개)`);
    
    // 6. 주요고객처목표달성율 (목표: 40개 × 영업사원 수)
    const mainTarget = 40 * salesCount;
    const mainAchievementRate = (mainProductCompanies / mainTarget) * 100;
    console.log(`[KPI 6] 주요고객처목표달성율: ${mainAchievementRate.toFixed(2)}% (목표: ${mainTarget}개)`);
    
    // === 전사 매출 관련 KPI (4개) ===
    
    // 7. 누적매출금액
    const totalSales = allCompanies.reduce((sum, c) => sum + (c.accumulatedSales || 0), 0);
    console.log(`[KPI 7] 누적매출금액: ${totalSales.toLocaleString()}원`);
    
    // 8. 주요제품매출액
    const mainProductSales = allCompanies
      .filter(c => isMainProduct(c.salesProduct))
      .reduce((sum, c) => sum + (c.accumulatedSales || 0), 0);
    console.log(`[KPI 8] 주요제품매출액: ${mainProductSales.toLocaleString()}원`);
    
    // 9. 주요제품매출비율
    const mainProductRatio = totalSales > 0 ? 
      (mainProductSales / totalSales * 100).toFixed(2) : '0.00';
    console.log(`[KPI 9] 주요제품매출비율: ${mainProductRatio}%`);
    
    // 10. 매출집중도 (전사 기준 - 현재 월 사용)
    const currentMonth = new Date().getMonth() + 1; // 1-12월
    const salesConcentration = calculateSalesConcentration(totalSales, totalCompanies, currentMonth);
    console.log(`[KPI 10] 매출집중도: ${Math.round(salesConcentration).toLocaleString()}원 (${currentMonth}개월 기준)`);
    
    // === 전사 수금 관련 KPI (1개) ===
    
    // 11. 누적수금금액
    const totalCollection = allCompanies.reduce((sum, c) => sum + (c.accumulatedCollection || 0), 0);
    console.log(`[KPI 11] 누적수금금액: ${totalCollection.toLocaleString()}원`);
    
    console.log('=== 전사 KPI 계산 완료 ===');
    
    return {
      totalCompanies,
      activeCompanies,
      activationRate,
      mainProductCompanies,
      achievementRate,
      mainAchievementRate,
      totalSales,
      mainProductSales,
      mainProductRatio,
      salesConcentration,
      totalCollection,
      salesPersonCount: salesCount // 디버깅용
    };
    
  } catch (error) {
    console.error('[전사 KPI 계산 실패]', error);
    throw error;
  }
}

// [섹션: 헬퍼 함수 - 전체 거래처]
async function getAllCompanies() {
  const db = await getDB();
  const tx = db.transaction('companies', 'readonly');
  const store = tx.objectStore('companies');
  return await store.getAll();
}
```

---

## 5. 주요제품 우선순위

### 5.1 3단계 우선순위 로직

```javascript
// [섹션: 주요제품 3단계 우선순위 상세]
export function calculateMainProductsDetailed(companies) {
  const results = {
    step1: new Set(), // 임플란트
    step2: new Set(), // 지르코니아 (1단계 제외)
    step3: new Set(), // Abutment (1,2단계 제외)
    total: new Set()
  };
  
  // 1단계: 임플란트 포함 거래처
  companies.forEach(company => {
    if (company.salesProduct && company.salesProduct.includes('임플란트')) {
      results.step1.add(company.keyValue);
      results.total.add(company.keyValue);
    }
  });
  
  console.log(`[1단계: 임플란트] ${results.step1.size}개`);
  
  // 2단계: 지르코니아 포함 (1단계 제외)
  companies.forEach(company => {
    if (!results.total.has(company.keyValue) && 
        company.salesProduct && 
        company.salesProduct.includes('지르코니아')) {
      results.step2.add(company.keyValue);
      results.total.add(company.keyValue);
    }
  });
  
  console.log(`[2단계: 지르코니아] ${results.step2.size}개 (누적: ${results.total.size}개)`);
  
  // 3단계: Abutment 포함 (1,2단계 제외)
  companies.forEach(company => {
    if (!results.total.has(company.keyValue) && 
        company.salesProduct && 
        company.salesProduct.includes('Abutment')) {
      results.step3.add(company.keyValue);
      results.total.add(company.keyValue);
    }
  });
  
  console.log(`[3단계: Abutment] ${results.step3.size}개 (누적: ${results.total.size}개)`);
  
  return {
    step1Count: results.step1.size,
    step2Count: results.step2.size,
    step3Count: results.step3.size,
    totalCount: results.total.size,
    step1Companies: Array.from(results.step1),
    step2Companies: Array.from(results.step2),
    step3Companies: Array.from(results.step3)
  };
}
```

### 5.2 주요제품 우선순위 예시

```
예시 데이터:
- 거래처 A: 임플란트, 지르코니아
- 거래처 B: 지르코니아
- 거래처 C: Abutment
- 거래처 D: 임플란트
- 거래처 E: 브릿지 (주요제품 아님)

계산 결과:
1단계 (임플란트): A, D → 2개
2단계 (지르코니아): B → 1개 (A는 1단계에서 이미 카운트)
3단계 (Abutment): C → 1개
총 주요제품판매거래처: 4개 (E 제외)
```

---

## 6. 현재월수 계산

### 6.1 현재월수 로직

```javascript
// [섹션: 현재월수 계산 상세]
export function calculateCurrentMonthDetailed(hireDate) {
  const hire = new Date(hireDate);
  const now = new Date();
  
  // 근무 일수
  const daysDiff = (now - hire) / (1000 * 60 * 60 * 24);
  const yearsDiff = daysDiff / 365;
  
  console.log(`[입사일] ${hire.toLocaleDateString()}`);
  console.log(`[현재일] ${now.toLocaleDateString()}`);
  console.log(`[근무기간] ${daysDiff.toFixed(0)}일 (${yearsDiff.toFixed(2)}년)`);
  
  if (yearsDiff > 1) {
    // 1년 이상: 올해 1월 1일 기준
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const daysFromYearStart = (now - yearStart) / (1000 * 60 * 60 * 24);
    const monthsFromYearStart = Math.floor(daysFromYearStart / 30);
    
    console.log(`[판단] 1년 이상 근무 → 올해 1월 1일 기준`);
    console.log(`[계산] ${now.getFullYear()}년 1월 1일부터 ${daysFromYearStart.toFixed(0)}일 = ${monthsFromYearStart}개월`);
    
    return {
      currentMonth: monthsFromYearStart,
      calculationType: '1년 이상',
      baseDate: yearStart,
      days: Math.floor(daysFromYearStart)
    };
    
  } else {
    // 1년 미만: 입사일 기준
    const monthsFromHire = Math.floor(daysDiff / 30);
    
    console.log(`[판단] 1년 미만 근무 → 입사일 기준`);
    console.log(`[계산] 입사일부터 ${daysDiff.toFixed(0)}일 = ${monthsFromHire}개월`);
    
    return {
      currentMonth: monthsFromHire,
      calculationType: '1년 미만',
      baseDate: hire,
      days: Math.floor(daysDiff)
    };
  }
}
```

### 6.2 현재월수 계산 예시

```
예시 1: 2023년 3월 15일 입사 (현재: 2025년 9월 26일)
- 근무기간: 2년 6개월 (1년 이상)
- 기준일: 2025년 1월 1일
- 현재월수: 9개월 (1월 1일 ~ 9월 26일)

예시 2: 2025년 3월 15일 입사 (현재: 2025년 9월 26일)
- 근무기간: 6개월 (1년 미만)
- 기준일: 2025년 3월 15일
- 현재월수: 6개월 (3월 15일 ~ 9월 26일)
```

---

## 7. 매출집중도 계산

### 7.1 매출집중도 로직

```javascript
// [섹션: 매출집중도 계산 상세]
export function calculateSalesConcentrationDetailed(totalSales, totalCompanies, currentMonth) {
  console.log('=== 매출집중도 계산 ===');
  console.log(`누적매출금액: ${totalSales.toLocaleString()}원`);
  console.log(`담당거래처: ${totalCompanies}개`);
  console.log(`현재월수: ${currentMonth}개월`);
  
  // 예외 처리
  if (totalCompanies === 0) {
    console.log('[결과] 거래처 0개 → 매출집중도 0');
    return 0;
  }
  
  if (currentMonth === 0) {
    console.log('[결과] 월수 0개월 → 매출집중도 0');
    return 0;
  }
  
  // 매출집중도 = 누적매출금액 / 담당거래처 / 현재월수
  const concentration = totalSales / totalCompanies / currentMonth;
  
  console.log(`[계산] ${totalSales.toLocaleString()} ÷ ${totalCompanies} ÷ ${currentMonth}`);
  console.log(`[결과] 매출집중도: ${concentration.toLocaleString()}원`);
  console.log(`[의미] 거래처 1개당 월 평균 ${Math.round(concentration).toLocaleString()}원`);
  
  return {
    concentration: concentration,
    perCompany: totalSales / totalCompanies,
    perMonth: totalSales / currentMonth,
    interpretation: `거래처당 월평균 ${Math.round(concentration).toLocaleString()}원`
  };
}
```

### 7.2 매출집중도 예시

```
예시 1: 김영업 (1년 이상 근무)
- 누적매출금액: 280,000,000원
- 담당거래처: 82개
- 현재월수: 9개월 (올해 1월 1일 기준)
- 매출집중도: 280,000,000 ÷ 82 ÷ 9 = 379,506원

예시 2: 이영업 (1년 미만 신입)
- 누적매출금액: 50,000,000원
- 담당거래처: 25개
- 현재월수: 6개월 (입사일 기준)
- 매출집중도: 50,000,000 ÷ 25 ÷ 6 = 333,333원
```

---

## 8. 기여도 순위

### 8.1 기여도 계산

**파일 위치**: `05.Source/06.kpi/04_contribution.js`

```javascript
// [섹션: Import]
import { getEmployees, getSalesPersonCount } from './01_kpi_calculator.js';
import { calculateSalesKPI } from './02_sales_kpi.js';

// [섹션: 영업사원별 기여도 순위]
export async function calculateContributionRanking(type = 'total') {
  console.log(`=== 기여도 순위 계산 시작 (${type}) ===`);
  
  try {
    // 영업사원 목록 조회
    const employees = await getEmployees();
    const salesEmployees = employees.filter(emp => emp.role === 'sales');
    
    console.log(`[영업사원] ${salesEmployees.length}명`);
    
    const rankings = [];
    
    // 각 영업사원별 KPI 계산
    for (const emp of salesEmployees) {
      const kpi = await calculateSalesKPI(emp.id);
      
      if (type === 'total') {
        // 전체매출 기여도
        rankings.push({
          rank: 0, // 나중에 정렬 후 부여
          employeeId: emp.id,
          name: emp.name,
          totalCompanies: kpi.totalCompanies,
          activeCompanies: kpi.activeCompanies,
          sales: kpi.totalSales,
          contribution: parseFloat(kpi.salesContribution)
        });
      } else if (type === 'main') {
        // 주요제품매출 기여도
        rankings.push({
          rank: 0,
          employeeId: emp.id,
          name: emp.name,
          mainProductCompanies: kpi.mainProductCompanies,
          mainSales: kpi.mainProductSales,
          mainContribution: parseFloat(kpi.mainContribution)
        });
      }
    }
    
    // 매출액 기준 정렬 (내림차순)
    if (type === 'total') {
      rankings.sort((a, b) => b.sales - a.sales);
    } else {
      rankings.sort((a, b) => b.mainSales - a.mainSales);
    }
    
    // 순위 부여
    rankings.forEach((item, index) => {
      item.rank = index + 1;
    });
    
    console.log('=== 기여도 순위 계산 완료 ===');
    console.table(rankings);
    
    return rankings;
    
  } catch (error) {
    console.error('[기여도 순위 계산 실패]', error);
    throw error;
  }
}

// [섹션: 부서별 기여도]
export async function calculateDepartmentContribution() {
  // 향후 확장: 부서별 집계
  console.log('[부서별 기여도] 향후 구현 예정');
  return [];
}
```

### 8.2 기여도 순위 예시

```
전체매출 기여도 순위:

순위 | 영업사원 | 담당거래처 | 활성거래처 | 누적매출금액 | 기여도
-----|---------|-----------|-----------|------------|-------
1    | 김영업   | 82개      | 65개      | 280,000,000 | 32.94%
2    | 박영업   | 75개      | 58개      | 250,000,000 | 29.41%
3    | 이영업   | 90개      | 70개      | 320,000,000 | 37.65%
-----|---------|-----------|-----------|------------|-------
합계 |         | 247개     | 193개     | 850,000,000 | 100.00%

주요제품매출 기여도 순위:

순위 | 영업사원 | 주요제품판매처 | 주요제품매출액 | 기여도
-----|---------|--------------|--------------|-------
1    | 이영업   | 45개         | 180,000,000  | 38.30%
2    | 김영업   | 38개         | 150,000,000  | 31.91%
3    | 박영업   | 35개         | 140,000,000  | 29.79%
-----|---------|--------------|--------------|-------
합계 |         | 118개        | 470,000,000  | 100.00%
```

---

## 9. 캐싱 시스템

### 9.1 캐시 구현

**파일 위치**: `05.Source/06.kpi/05_cache.js`

```javascript
// [섹션: KPI 캐시 시스템]
class KPICache {
  constructor() {
    this.cache = new Map();
    this.TTL = 5 * 60 * 1000; // 5분
  }
  
  // [섹션: 캐시 키 생성]
  generateKey(type, userId = null) {
    return userId ? `${type}_${userId}` : type;
  }
  
  // [섹션: 캐시 조회]
  get(type, userId = null) {
    const key = this.generateKey(type, userId);
    const cached = this.cache.get(key);
    
    if (!cached) {
      console.log(`[캐시 미스] ${key}`);
      return null;
    }
    
    // TTL 확인
    if (Date.now() - cached.timestamp > this.TTL) {
      console.log(`[캐시 만료] ${key}`);
      this.cache.delete(key);
      return null;
    }
    
    console.log(`[캐시 히트] ${key}`);
    return cached.data;
  }
  
  // [섹션: 캐시 저장]
  set(type, data, userId = null) {
    const key = this.generateKey(type, userId);
    
    this.cache.set(key, {
      data: data,
      timestamp: Date.now()
    });
    
    console.log(`[캐시 저장] ${key}`);
  }
  
  // [섹션: 캐시 삭제]
  clear(type = null, userId = null) {
    if (type) {
      const key = this.generateKey(type, userId);
      this.cache.delete(key);
      console.log(`[캐시 삭제] ${key}`);
    } else {
      this.cache.clear();
      console.log('[캐시 전체 삭제]');
    }
  }
  
  // [섹션: 캐시 통계]
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      ttl: `${this.TTL / 1000}초`
    };
  }
}

// 싱글톤 인스턴스
export const kpiCache = new KPICache();

// [섹션: 캐시 적용 래퍼]
export async function withCache(type, calculateFn, userId = null) {
  // 캐시 확인
  const cached = kpiCache.get(type, userId);
  if (cached) {
    return cached;
  }
  
  // 계산 실행
  const result = await calculateFn();
  
  // 캐시 저장
  kpiCache.set(type, result, userId);
  
  return result;
}
```

### 9.2 캐시 사용 예시

```javascript
// [섹션: 캐시 적용 예시]
import { withCache, kpiCache } from './05_cache.js';
import { calculateSalesKPI } from './02_sales_kpi.js';
import { calculateAdminKPI } from './03_admin_kpi.js';

// 영업담당 KPI (캐시 적용)
export async function getSalesKPIWithCache(userId) {
  return await withCache('sales_kpi', () => calculateSalesKPI(userId), userId);
}

// 관리자 KPI (캐시 적용)
export async function getAdminKPIWithCache() {
  return await withCache('admin_kpi', () => calculateAdminKPI());
}

// 데이터 변경 시 캐시 무효화
export function invalidateKPICache() {
  kpiCache.clear();
  console.log('[KPI 캐시 무효화] 모든 캐시 삭제');
}

// 특정 사용자 캐시만 무효화
export function invalidateUserKPICache(userId) {
  kpiCache.clear('sales_kpi', userId);
  console.log(`[KPI 캐시 무효화] userId: ${userId}`);
}
```

---

## 10. 테스트

### 10.1 KPI 정확도 테스트

**파일 위치**: `05.Source/06.kpi/test_kpi.js`

```javascript
// [섹션: KPI 엔진 테스트]
export async function testKPIEngine() {
  console.log('=== KPI 엔진 테스트 시작 ===');
  
  const results = [];
  
  // === 1. 주요제품 우선순위 테스트 ===
  try {
    const testCompanies = [
      { keyValue: 'A', salesProduct: '임플란트, 지르코니아' },
      { keyValue: 'B', salesProduct: '지르코니아' },
      { keyValue: 'C', salesProduct: 'Abutment' },
      { keyValue: 'D', salesProduct: '임플란트' },
      { keyValue: 'E', salesProduct: '브릿지' }
    ];
    
    const count = calculateMainProducts(testCompanies);
    
    // 예상: A(1단계), D(1단계), B(2단계), C(3단계) = 4개
    if (count === 4) {
      results.push({ test: '주요제품 우선순위', status: '✅ 통과', expected: 4, actual: count });
    } else {
      throw new Error(`예상: 4, 실제: ${count}`);
    }
  } catch (error) {
    results.push({ test: '주요제품 우선순위', status: '❌ 실패', error: error.message });
  }
  
  // === 2. 현재월수 계산 테스트 ===
  try {
    // 1년 이상 케이스
    const hireDate1 = new Date('2023-03-15');
    const result1 = calculateCurrentMonthDetailed(hireDate1);
    
    if (result1.calculationType === '1년 이상') {
      results.push({ test: '현재월수 (1년 이상)', status: '✅ 통과', months: result1.currentMonth });
    }
    
    // 1년 미만 케이스
    const hireDate2 = new Date('2025-03-15');
    const result2 = calculateCurrentMonthDetailed(hireDate2);
    
    if (result2.calculationType === '1년 미만') {
      results.push({ test: '현재월수 (1년 미만)', status: '✅ 통과', months: result2.currentMonth });
    }
    
  } catch (error) {
    results.push({ test: '현재월수 계산', status: '❌ 실패', error: error.message });
  }
  
  // === 3. 매출집중도 테스트 ===
  try {
    const concentration = calculateSalesConcentration(280000000, 82, 9);
    const expected = Math.round(280000000 / 82 / 9);
    
    if (Math.abs(concentration - expected) < 1) {
      results.push({ test: '매출집중도', status: '✅ 통과', value: Math.round(concentration) });
    } else {
      throw new Error(`예상: ${expected}, 실제: ${Math.round(concentration)}`);
    }
  } catch (error) {
    results.push({ test: '매출집중도', status: '❌ 실패', error: error.message });
  }
  
  // === 4. 영업담당 KPI 테스트 ===
  try {
    const kpi = await calculateSalesKPI(testUserId);
    
    const requiredFields = [
      'totalCompanies', 'activeCompanies', 'activationRate',
      'mainProductCompanies', 'achievementRate', 'mainAchievementRate',
      'totalSales', 'mainProductSales', 'mainProductRatio',
      'salesConcentration', 'totalCollection', 'receivables',
      'salesContribution', 'mainContribution'
    ];
    
    const allPresent = requiredFields.every(field => kpi.hasOwnProperty(field));
    
    if (allPresent) {
      results.push({ test: '영업담당 KPI (14개)', status: '✅ 통과' });
    } else {
      throw new Error('KPI 필드 누락');
    }
  } catch (error) {
    results.push({ test: '영업담당 KPI', status: '❌ 실패', error: error.message });
  }
  
  // === 5. 관리자 KPI 테스트 ===
  try {
    const kpi = await calculateAdminKPI();
    
    const requiredFields = [
      'totalCompanies', 'activeCompanies', 'activationRate',
      'mainProductCompanies', 'achievementRate', 'mainAchievementRate',
      'totalSales', 'mainProductSales', 'mainProductRatio',
      'salesConcentration', 'totalCollection'
    ];
    
    const allPresent = requiredFields.every(field => kpi.hasOwnProperty(field));
    
    if (allPresent) {
      results.push({ test: '관리자 KPI (11개)', status: '✅ 통과' });
    } else {
      throw new Error('KPI 필드 누락');
    }
  } catch (error) {
    results.push({ test: '관리자 KPI', status: '❌ 실패', error: error.message });
  }
  
  // === 6. 기여도 순위 테스트 ===
  try {
    const rankings = await calculateContributionRanking('total');
    
    if (rankings.length > 0 && rankings[0].rank === 1) {
      results.push({ test: '기여도 순위', status: '✅ 통과', count: rankings.length });
    } else {
      throw new Error('순위 계산 오류');
    }
  } catch (error) {
    results.push({ test: '기여도 순위', status: '❌ 실패', error: error.message });
  }
  
  // === 7. 캐시 시스템 테스트 ===
  try {
    kpiCache.set('test', { value: 123 });
    const cached = kpiCache.get('test');
    
    if (cached && cached.value === 123) {
      results.push({ test: '캐시 시스템', status: '✅ 통과' });
    } else {
      throw new Error('캐시 조회 실패');
    }
    
    kpiCache.clear('test');
  } catch (error) {
    results.push({ test: '캐시 시스템', status: '❌ 실패', error: error.message });
  }
  
  console.table(results);
  console.log('=== KPI 엔진 테스트 완료 ===');
  
  return results;
}
```

### 10.2 성능 테스트

```javascript
// [섹션: KPI 계산 성능 테스트]
export async function testKPIPerformance() {
  console.log('=== KPI 성능 테스트 시작 ===');
  
  const performanceResults = [];
  
  // 영업담당 KPI
  const start1 = performance.now();
  await calculateSalesKPI(testUserId);
  const duration1 = performance.now() - start1;
  
  performanceResults.push({
    test: '영업담당 KPI',
    duration: `${duration1.toFixed(2)}ms`,
    target: '500ms',
    status: duration1 < 500 ? '✅' : '❌'
  });
  
  // 관리자 KPI
  const start2 = performance.now();
  await calculateAdminKPI();
  const duration2 = performance.now() - start2;
  
  performanceResults.push({
    test: '관리자 KPI',
    duration: `${duration2.toFixed(2)}ms`,
    target: '500ms',
    status: duration2 < 500 ? '✅' : '❌'
  });
  
  // 기여도 순위
  const start3 = performance.now();
  await calculateContributionRanking('total');
  const duration3 = performance.now() - start3;
  
  performanceResults.push({
    test: '기여도 순위',
    duration: `${duration3.toFixed(2)}ms`,
    target: '1000ms',
    status: duration3 < 1000 ? '✅' : '❌'
  });
  
  console.table(performanceResults);
  console.log('=== KPI 성능 테스트 완료 ===');
  
  return performanceResults;
}
```

---

## ✅ STAGE 6 완료 조건

- [ ] KPI 계산 엔진 구현 완료
- [ ] 영업담당 KPI 14개 정확도 100%
- [ ] 관리자 KPI 11개 정확도 100%
- [ ] 주요제품 3단계 우선순위 검증 완료
- [ ] 현재월수 계산 (1년 미만/이상) 검증 완료
- [ ] 매출집중도 계산 정확도 검증
- [ ] 기여도 순위 계산 정확도 검증
- [ ] 캐싱 시스템 구현 완료
- [ ] 성능 요구사항 충족 (< 500ms)
- [ ] 모든 단위 테스트 통과

---

**다음 단계**: STAGE 7 - 통합 테스트 & 배포

**이 단계 완료. 확인 후 다음 단계 진행 여부 알려주세요. (예: 문제 있음/다음으로)**

---

**Creator**: Daniel.K  
**Contact**: kinggo0807@hotmail.com  
**Owner**: Kang Jung Hwan
