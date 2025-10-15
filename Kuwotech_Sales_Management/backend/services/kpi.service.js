/**
 * ============================================
 * KUWOTECH 영업관리 시스템 - KPI Service
 * 파일: backend/services/kpi.service.js
 * Created by: Daniel.K
 * Date: 2025-01-28
 * 설명: KPI 계산 및 데이터베이스 업데이트 로직
 * ============================================
 */

import { getDB } from "../config/database.js";

// ============================================
// [영업담당 KPI 업데이트]
// ============================================

/**
 * 특정 영업담당자의 KPI 재계산 및 업데이트
 * @param {string} employeeIdOrName - 직원 ID 또는 이름
 */
export async function refreshSalesKPI(employeeIdOrName) {
  let connection;

  try {
    connection = await getDB();

    console.log("[KPI Service] 영업담당 KPI 갱신:", employeeIdOrName);

    // 1. 직원 정보 조회
    const [employees] = await connection.execute(
      "SELECT * FROM employees WHERE (id = ? OR name = ?) AND status = ?",
      [employeeIdOrName, employeeIdOrName, "재직"]
    );

    if (employees.length === 0) {
      console.warn(`[KPI Service] 직원 정보 없음: ${employeeIdOrName}`);
      return { success: false, message: "직원 정보를 찾을 수 없습니다." };
    }

    const employee = employees[0];

    // 2. 담당 거래처 조회 (활성 + 불용)
    const [companies] = await connection.execute(
      `SELECT * FROM companies
             WHERE internalManager = ?
             AND businessStatus != ?`,
      [employee.name, "불용"]
    );

    // 2-1. 담당 거래처 중 불용 거래처 수 조회
    const [inactiveCompaniesResult] = await connection.execute(
      `SELECT COUNT(*) as count FROM companies
             WHERE internalManager = ?
             AND businessStatus = ?`,
      [employee.name, "불용"]
    );
    const inactiveCompaniesCount = inactiveCompaniesResult[0].count;

    // 3. 전사 집계 데이터 조회 (기여도 계산용)
    const [allCompanies] = await connection.execute(
      `SELECT accumulatedSales, salesProduct
             FROM companies
             WHERE businessStatus != ?`,
      ["불용"]
    );

    const 전사누적매출 = allCompanies.reduce(
      (sum, c) => sum + (parseFloat(c.accumulatedSales) || 0),
      0
    );
    const 전사주요제품매출 = allCompanies
      .filter((c) => {
        if (!c.salesProduct) return false;
        const products = c.salesProduct.toUpperCase();
        return (
          products.includes("임플란트") ||
          products.includes("지르코니아") ||
          products.includes("ABUTMENT") ||
          products.includes("KIS") ||
          products.includes("TL")
        );
      })
      .reduce((sum, c) => sum + (parseFloat(c.accumulatedSales) || 0), 0);

    const totalsData = {
      전사누적매출,
      전사주요제품매출,
    };

    // 4. KPI 계산
    const kpi = calculateSalesKPI(employee, companies, totalsData, inactiveCompaniesCount);

    // 5. 데이터베이스에 UPSERT (영문 컬럼명)
    await connection.execute(
      `INSERT INTO kpi_sales (
                id, employeeId, employeeName,
                assignedCompanies, activeCompanies, activationRate, mainProductCompanies,
                companyTargetAchievementRate, majorCustomerTargetRate,
                accumulatedSales, mainProductSales, salesConcentration,
                accumulatedCollection, accountsReceivable, mainProductSalesRatio,
                totalSalesContribution, mainProductContribution,
                currentMonths
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                employeeId = VALUES(employeeId),
                employeeName = VALUES(employeeName),
                assignedCompanies = VALUES(assignedCompanies),
                activeCompanies = VALUES(activeCompanies),
                activationRate = VALUES(activationRate),
                mainProductCompanies = VALUES(mainProductCompanies),
                companyTargetAchievementRate = VALUES(companyTargetAchievementRate),
                majorCustomerTargetRate = VALUES(majorCustomerTargetRate),
                accumulatedSales = VALUES(accumulatedSales),
                mainProductSales = VALUES(mainProductSales),
                salesConcentration = VALUES(salesConcentration),
                accumulatedCollection = VALUES(accumulatedCollection),
                accountsReceivable = VALUES(accountsReceivable),
                mainProductSalesRatio = VALUES(mainProductSalesRatio),
                totalSalesContribution = VALUES(totalSalesContribution),
                mainProductContribution = VALUES(mainProductContribution),
                currentMonths = VALUES(currentMonths),
                lastUpdated = CURRENT_TIMESTAMP`,
      [
        employee.id,
        employee.id,
        employee.name,
        kpi.담당거래처,
        kpi.활성거래처,
        kpi.활성화율,
        kpi.주요제품판매거래처,
        kpi.회사배정기준대비달성율,
        kpi.주요고객처목표달성율,
        kpi.누적매출금액,
        kpi.주요제품매출액,
        kpi.매출집중도,
        kpi.누적수금금액,
        kpi.매출채권잔액,
        kpi.주요제품매출비율,
        kpi.전체매출기여도,
        kpi.주요제품매출기여도,
        kpi.현재월수,
      ]
    );

    // ✅ FIX: 저장 후, DB에서 최신 데이터를 다시 조회하여 반환
    // 이렇게 해야 프론트엔드가 기대하는 영문 키 데이터를 받을 수 있음
    const [updatedKpiRows] = await connection.execute(
      `SELECT * FROM kpi_sales WHERE id = ?`,
      [employee.id]
    );
    const updatedKpiData = updatedKpiRows[0];

    // 불용거래처 수를 응답에 추가 (DB에 저장하지 않고 동적으로 추가)
    updatedKpiData.inactiveCompanies = inactiveCompaniesCount;

    console.log(`[KPI Service] ${employee.name} KPI 갱신 완료`);
    return { success: true, data: updatedKpiData };
  } catch (error) {
    console.error("[KPI Service] 영업담당 KPI 갱신 실패:", error);
    throw error;
  } finally {
    // Connection is shared, no need to release
  }
}

/**
 * 모든 영업담당자의 KPI 일괄 갱신
 */
export async function refreshAllSalesKPI() {
  let connection;

  try {
    connection = await getDB();

    console.log("[KPI Service] 전체 영업담당 KPI 일괄 갱신 시작");

    // 모든 재직 중인 영업담당자 조회
    const [employees] = await connection.execute(
      `SELECT id, name FROM employees
             WHERE (role1 LIKE '%영업%' OR role2 LIKE '%영업%')
             AND status = ?`,
      ["재직"]
    );

    // 순차적으로 각 직원의 KPI 갱신
    const results = [];
    for (const employee of employees) {
      const result = await refreshSalesKPI(employee.id);
      results.push({ employeeName: employee.name, ...result });
    }

    console.log(
      `[KPI Service] 전체 영업담당 KPI 갱신 완료 (${employees.length}명)`
    );

    // 순위 및 누적기여도 일괄 계산
    console.log("[KPI Service] 순위 및 누적기여도 계산 시작...");
    await updateRankingsAndCumulativeContribution();

    return { success: true, count: employees.length, results };
  } catch (error) {
    console.error("[KPI Service] 전체 KPI 갱신 실패:", error);
    throw error;
  } finally {
    // Connection is shared, no need to release
  }
}

// ============================================
// [전사 KPI 업데이트]
// ============================================

/**
 * 전사 KPI 재계산 및 업데이트
 */
export async function refreshAdminKPI() {
  let connection;

  try {
    connection = await getDB();

    console.log("[KPI Service] 전사 KPI 갱신");

    // 1. 전체 거래처 조회 (불용 제외)
    const [allCompanies] = await connection.execute(
      "SELECT * FROM companies WHERE businessStatus != ?",
      ["불용"]
    );

    // 1-1. 전체 불용 거래처 수 조회
    const [inactiveCompaniesResult] = await connection.execute(
      "SELECT COUNT(*) as count FROM companies WHERE businessStatus = ?",
      ["불용"]
    );
    const inactiveCompaniesCount = inactiveCompaniesResult[0].count;

    // 2. 영업담당자 수 조회
    const [employees] = await connection.execute(
      `SELECT * FROM employees
             WHERE (role1 LIKE '%영업%' OR role2 LIKE '%영업%')
             AND status = ?`,
      ["재직"]
    );

    // 3. KPI 계산
    const kpi = calculateAdminKPI(allCompanies, employees, inactiveCompaniesCount);

    // 4. 데이터베이스에 UPSERT (단일 레코드 유지, 영문 컬럼명)
    await connection.execute(
      `INSERT INTO kpi_admin (
                id,
                totalCompanies, activeCompanies, activationRate, mainProductCompanies,
                companyTargetAchievementRate, majorCustomerTargetRate,
                accumulatedSales, accumulatedCollection, accountsReceivable, mainProductSales, salesConcentration,
                mainProductSalesRatio,
                salesRepCount, currentMonths
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                totalCompanies = VALUES(totalCompanies),
                activeCompanies = VALUES(activeCompanies),
                activationRate = VALUES(activationRate),
                mainProductCompanies = VALUES(mainProductCompanies),
                companyTargetAchievementRate = VALUES(companyTargetAchievementRate),
                majorCustomerTargetRate = VALUES(majorCustomerTargetRate),
                accumulatedSales = VALUES(accumulatedSales),
                accumulatedCollection = VALUES(accumulatedCollection),
                accountsReceivable = VALUES(accountsReceivable),
                mainProductSales = VALUES(mainProductSales),
                salesConcentration = VALUES(salesConcentration),
                mainProductSalesRatio = VALUES(mainProductSalesRatio),
                salesRepCount = VALUES(salesRepCount),
                currentMonths = VALUES(currentMonths),
                lastUpdated = CURRENT_TIMESTAMP`,
      [
        "admin-kpi-singleton",
        kpi.전체거래처,
        kpi.활성거래처,
        kpi.활성화율,
        kpi.주요제품판매거래처,
        kpi.회사배정기준대비달성율,
        kpi.주요고객처목표달성율,
        kpi.누적매출금액,
        kpi.누적수금금액,
        kpi.매출채권잔액,
        kpi.주요제품매출액,
        kpi.매출집중도,
        kpi.주요제품매출비율,
        kpi.영업담당자수,
        kpi.현재월수,
      ]
    );

    // ✅ FIX: 저장 후, DB에서 최신 데이터를 다시 조회하여 반환
    // 이렇게 해야 영문 컬럼명으로 구성된 정확한 데이터를 반환할 수 있음
    const [updatedKpiRows] = await connection.execute(
      `SELECT * FROM kpi_admin WHERE id = ?`,
      ["admin-kpi-singleton"]
    );
    const updatedKpiData = updatedKpiRows[0];

    // 불용거래처 수를 응답에 추가 (DB에 저장하지 않고 동적으로 추가)
    updatedKpiData.inactiveCompanies = inactiveCompaniesCount;

    console.log("[KPI Service] 전사 KPI 갱신 완료");
    return { success: true, data: updatedKpiData };
  } catch (error) {
    console.error("[KPI Service] 전사 KPI 갱신 실패:", error);
    throw error;
  } finally {
    // Connection is shared, no need to release
  }
}

// ============================================
// [KPI 계산 로직 - 내부 함수]
// ============================================

/**
 * 영업담당 KPI 계산 (기존 로직과 동일)
 */
function calculateSalesKPI(employee, companies, totals, inactiveCompaniesCount = 0) {
  const kpi = {};

  // 거래처 관리 지표 (4개)
  kpi.담당거래처 = companies.length;
  kpi.불용거래처 = inactiveCompaniesCount;
  kpi.활성거래처 = companies.filter((c) => c.businessStatus === "활성").length;
  kpi.활성화율 =
    kpi.담당거래처 > 0 ? (kpi.활성거래처 / kpi.담당거래처) * 100 : 0;
  kpi.주요제품판매거래처 = calculateMainProductCompanies(companies);

  // 목표 달성 지표 (2개)
  kpi.회사배정기준대비달성율 = (kpi.담당거래처 / 80 - 1) * 100;
  kpi.주요고객처목표달성율 = (kpi.주요제품판매거래처 / 40 - 1) * 100;

  // 매출 성과 지표 (3개)
  kpi.누적매출금액 = companies.reduce(
    (sum, c) => sum + (parseFloat(c.accumulatedSales) || 0),
    0
  );
  kpi.주요제품매출액 = calculateMainProductSales(companies);

  const 현재월수 = calculateCurrentMonths(employee.hireDate);
  kpi.매출집중도 =
    kpi.담당거래처 > 0 && 현재월수 > 0
      ? kpi.누적매출금액 / kpi.담당거래처 / 현재월수
      : 0;

  // 재무 및 기여도 지표 (5개)
  kpi.누적수금금액 = companies.reduce(
    (sum, c) => sum + (parseFloat(c.accumulatedCollection) || 0),
    0
  );
  kpi.매출채권잔액 = companies.reduce(
    (sum, c) => sum + (parseFloat(c.accountsReceivable) || 0),
    0
  );
  kpi.주요제품매출비율 =
    kpi.누적매출금액 > 0 ? (kpi.주요제품매출액 / kpi.누적매출금액) * 100 : 0;
  kpi.전체매출기여도 =
    totals.전사누적매출 > 0
      ? (kpi.누적매출금액 / totals.전사누적매출) * 100
      : 0;
  kpi.주요제품매출기여도 =
    totals.전사주요제품매출 > 0
      ? (kpi.주요제품매출액 / totals.전사주요제품매출) * 100
      : 0;

  // 추가 정보
  kpi.현재월수 = 현재월수;

  return kpi;
}

/**
 * 전사 KPI 계산 (기존 로직과 동일)
 */
function calculateAdminKPI(allCompanies, employees, inactiveCompaniesCount = 0) {
  const kpi = {};
  const 영업담당자수 = employees.length;

  // 전사 거래처 지표 (4개)
  kpi.전체거래처 = allCompanies.length;
  kpi.불용거래처 = inactiveCompaniesCount;
  kpi.활성거래처 = allCompanies.filter(
    (c) => c.businessStatus === "활성"
  ).length;
  kpi.활성화율 =
    kpi.전체거래처 > 0 ? (kpi.활성거래처 / kpi.전체거래처) * 100 : 0;
  kpi.주요제품판매거래처 = calculateMainProductCompanies(allCompanies);

  // 전사 목표 달성 (2개)
  const 목표거래처수 = 80 * 영업담당자수;
  kpi.회사배정기준대비달성율 =
    목표거래처수 > 0 ? (kpi.전체거래처 / 목표거래처수 - 1) * 100 : 0;

  const 주요고객목표 = 40 * 영업담당자수;
  kpi.주요고객처목표달성율 =
    주요고객목표 > 0 ? (kpi.주요제품판매거래처 / 주요고객목표 - 1) * 100 : 0;

  // 전사 매출 지표 (5개)
  kpi.누적매출금액 = allCompanies.reduce(
    (sum, c) => sum + (parseFloat(c.accumulatedSales) || 0),
    0
  );
  kpi.누적수금금액 = allCompanies.reduce(
    (sum, c) => sum + (parseFloat(c.accumulatedCollection) || 0),
    0
  );
  kpi.매출채권잔액 = allCompanies.reduce(
    (sum, c) => sum + (parseFloat(c.accountsReceivable) || 0),
    0
  );
  kpi.주요제품매출액 = calculateMainProductSales(allCompanies);

  const 현재월수 = new Date().getMonth() + 1; // 1-12
  kpi.매출집중도 =
    kpi.전체거래처 > 0 && 현재월수 > 0
      ? kpi.누적매출금액 / kpi.전체거래처 / 현재월수
      : 0;

  // 전사 기여도 지표 (1개)
  kpi.주요제품매출비율 =
    kpi.누적매출금액 > 0 ? (kpi.주요제품매출액 / kpi.누적매출금액) * 100 : 0;

  // 추가 정보
  kpi.현재월수 = 현재월수;
  kpi.영업담당자수 = 영업담당자수;

  return kpi;
}

/**
 * 주요제품 판매 거래처 계산 (3단계 우선순위 + 중복 제거)
 * 1단계: 임플란트, TL, KIS (임플란트 계열)
 * 2단계: 지르코니아 (1단계 제외)
 * 3단계: Abutment (1,2단계 제외)
 */
function calculateMainProductCompanies(companies) {
  const counted = new Set();

  // 1단계: 임플란트, TL, KIS 포함 거래처
  companies.forEach((c) => {
    if (!c.salesProduct) return;
    const products = c.salesProduct.toUpperCase();
    if (
      products.includes("임플란트") ||
      products.includes("TL") ||
      products.includes("KIS")
    ) {
      counted.add(c.keyValue);
    }
  });

  // 2단계: 지르코니아 포함 (1단계 제외)
  companies.forEach((c) => {
    if (counted.has(c.keyValue)) return; // 이미 카운트됨
    if (!c.salesProduct) return;
    const products = c.salesProduct.toUpperCase();
    if (products.includes("지르코니아")) {
      counted.add(c.keyValue);
    }
  });

  // 3단계: Abutment 포함 (1,2단계 제외)
  companies.forEach((c) => {
    if (counted.has(c.keyValue)) return; // 이미 카운트됨
    if (!c.salesProduct) return;
    const products = c.salesProduct.toUpperCase();
    if (products.includes("ABUTMENT")) {
      counted.add(c.keyValue);
    }
  });

  return counted.size;
}

/**
 * 주요제품 매출액 계산 (3단계 우선순위 적용)
 * 주요제품 거래처(임플란트/TL/KIS/지르코니아/Abutment)의 누적매출금액 합산
 */
function calculateMainProductSales(companies) {
  const mainProductCompanies = new Set();

  // 1단계: 임플란트, TL, KIS
  companies.forEach((c) => {
    if (!c.salesProduct) return;
    const products = c.salesProduct.toUpperCase();
    if (
      products.includes("임플란트") ||
      products.includes("TL") ||
      products.includes("KIS")
    ) {
      mainProductCompanies.add(c.keyValue);
    }
  });

  // 2단계: 지르코니아 (1단계 제외)
  companies.forEach((c) => {
    if (mainProductCompanies.has(c.keyValue)) return;
    if (!c.salesProduct) return;
    const products = c.salesProduct.toUpperCase();
    if (products.includes("지르코니아")) {
      mainProductCompanies.add(c.keyValue);
    }
  });

  // 3단계: Abutment (1,2단계 제외)
  companies.forEach((c) => {
    if (mainProductCompanies.has(c.keyValue)) return;
    if (!c.salesProduct) return;
    const products = c.salesProduct.toUpperCase();
    if (products.includes("ABUTMENT")) {
      mainProductCompanies.add(c.keyValue);
    }
  });

  // 주요제품 거래처들의 누적매출금액 합산
  return companies
    .filter((c) => mainProductCompanies.has(c.keyValue))
    .reduce((sum, c) => sum + (parseFloat(c.accumulatedSales) || 0), 0);
}

/**
 * 현재월수 계산
 * 1년 이상 근무자: 올해 1월 1일 ~ 현재까지 개월 수
 * 1년 미만 근무자: 입사일 ~ 현재까지 개월 수
 */
function calculateCurrentMonths(joinDate) {
  if (!joinDate) return 1; // 기본값

  const join = new Date(joinDate);
  const now = new Date();

  // 입사일부터 현재까지 일수
  const daysSinceJoin = Math.floor((now - join) / (1000 * 60 * 60 * 24));

  // 1년 이상 근무자 (365일 이상)
  if (daysSinceJoin >= 365) {
    // 올해 1월 1일부터 현재까지
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const daysSinceYearStart = Math.floor(
      (now - yearStart) / (1000 * 60 * 60 * 24)
    );
    return Math.max(1, Math.floor(daysSinceYearStart / 30));
  } else {
    // 1년 미만: 입사일부터 현재까지
    return Math.max(1, Math.floor(daysSinceJoin / 30));
  }
}

/**
 * 순위 및 누적기여도 일괄 업데이트
 * 모든 직원의 KPI 업데이트 후 순위 + 누적기여도를 다시 계산
 */
export async function updateRankingsAndCumulativeContribution() {
  let connection;

  try {
    connection = await getDB();

    console.log("[KPI Service] 순위 및 누적기여도 계산 시작");

    // 1. 전체매출기여도 순위별 정렬 조회 (영문 컬럼명)
    const [salesContribution] = await connection.execute(`
            SELECT id, employeeName, totalSalesContribution
            FROM kpi_sales
            ORDER BY totalSalesContribution DESC
        `);

    // 2. 전체매출기여도 순위 + 누적기여도 계산
    let 전체누적 = 0;
    for (let i = 0; i < salesContribution.length; i++) {
      const row = salesContribution[i];
      const 순위 = i + 1;
      전체누적 += parseFloat(row.totalSalesContribution) || 0;

      await connection.execute(
        `UPDATE kpi_sales
                 SET totalSalesContributionRank = ?, cumulativeTotalSalesContribution = ?
                 WHERE id = ?`,
        [순위, 전체누적, row.id]
      );
    }

    console.log(
      `   ✅ 전체매출기여도 순위 및 누적기여도 업데이트 완료 (${salesContribution.length}명)`
    );

    // 3. 주요제품매출기여도 순위별 정렬 조회 (영문 컬럼명)
    const [mainProductContribution] = await connection.execute(`
            SELECT id, employeeName, mainProductContribution
            FROM kpi_sales
            ORDER BY mainProductContribution DESC
        `);

    // 4. 주요제품매출기여도 순위 + 누적기여도 계산
    let 주요누적 = 0;
    for (let i = 0; i < mainProductContribution.length; i++) {
      const row = mainProductContribution[i];
      const 순위 = i + 1;
      주요누적 += parseFloat(row.mainProductContribution) || 0;

      await connection.execute(
        `UPDATE kpi_sales
                 SET mainProductContributionRank = ?, cumulativeMainProductContribution = ?
                 WHERE id = ?`,
        [순위, 주요누적, row.id]
      );
    }

    console.log(
      `   ✅ 주요제품매출기여도 순위 및 누적기여도 업데이트 완료 (${mainProductContribution.length}명)`
    );
    console.log("[KPI Service] 순위 및 누적기여도 계산 완료");

    return { success: true };
  } catch (error) {
    console.error("[KPI Service] 순위 및 누적기여도 업데이트 실패:", error);
    return { success: false, error: error.message };
  }
}

// ============================================
// [전사 KPI 조회]
// ============================================

/**
 * ✅ NEW: 전사 KPI 데이터를 DB에서 조회하는 함수
 */
export async function getAdminKPI() {
  let connection;
  try {
    connection = await getDB();
    const [rows] = await connection.execute(
      `SELECT * FROM kpi_admin WHERE id = ?`,
      ["admin-kpi-singleton"]
    );

    if (rows.length > 0) {
      return { success: true, data: rows[0] };
    } else {
      // 데이터가 없으면 새로고침 후 다시 조회
      await refreshAdminKPI();
      const [refreshedRows] = await connection.execute(
        `SELECT * FROM kpi_admin WHERE id = ?`,
        ["admin-kpi-singleton"]
      );
      return { success: true, data: refreshedRows[0] };
    }
  } catch (error) {
    console.error("[KPI Service] 전사 KPI 조회 실패:", error);
    throw error;
  }
}

/**
 * ✅ NEW: 매출집중도 상세 데이터 조회
 * 영업담당자별 매출집중도 순위 반환 (영업담당자만)
 */
export async function getSalesConcentrationDetail() {
  let connection;
  try {
    connection = await getDB();

    console.log("[KPI Service] 매출집중도 상세 데이터 조회 (영업담당자별 순위)");

    // 영업담당자별 매출집중도 조회 (내림차순 정렬)
    // employees 테이블과 조인하여 영업담당자만 필터링
    const [rankings] = await connection.execute(
      `SELECT
        k.employeeName,
        k.salesConcentration,
        k.assignedCompanies
      FROM kpi_sales k
      INNER JOIN employees e ON k.employeeId = e.id
      WHERE (e.role1 LIKE '%영업%' OR e.role2 LIKE '%영업%')
      AND e.status = '재직'
      ORDER BY k.salesConcentration DESC`
    );

    // 순위 추가
    const details = rankings.map((row, index) => ({
      rank: index + 1,
      employeeName: row.employeeName,
      salesConcentration: parseFloat(row.salesConcentration) || 0,
      assignedCompanies: row.assignedCompanies || 0
    }));

    console.log(`[KPI Service] 매출집중도 상세 데이터 조회 완료 (${details.length}명)`);

    return { success: true, data: details };
  } catch (error) {
    console.error("[KPI Service] 매출집중도 상세 데이터 조회 실패:", error);
    console.error("[KPI Service] Error details:", error.message, error.stack);
    throw error;
  }
}

/**
 * ✅ NEW: 기여도 순위 데이터 조회
 * @param {string} type - 'total' (전체매출) | 'main' (주요제품매출)
 */
export async function getRankingData(type) {
  let connection;
  try {
    connection = await getDB();

    console.log(`[KPI Service] 기여도 순위 데이터 조회 (${type})`);

    let query, sortColumn, contributionColumn, rankColumn, cumulativeColumn;

    if (type === "total") {
      sortColumn = "totalSalesContribution";
      contributionColumn = "totalSalesContribution";
      rankColumn = "totalSalesContributionRank";
      cumulativeColumn = "cumulativeTotalSalesContribution";
    } else if (type === "main") {
      sortColumn = "mainProductContribution";
      contributionColumn = "mainProductContribution";
      rankColumn = "mainProductContributionRank";
      cumulativeColumn = "cumulativeMainProductContribution";
    } else {
      throw new Error(`Invalid ranking type: ${type}`);
    }

    // 순위 데이터 조회
    const [rankings] = await connection.execute(
      `SELECT
        ${rankColumn} as rank,
        employeeName,
        accumulatedSales,
        mainProductSales,
        ${contributionColumn} as contribution,
        ${cumulativeColumn} as cumulativeContribution
      FROM kpi_sales
      WHERE ${rankColumn} IS NOT NULL
      ORDER BY ${rankColumn} ASC`
    );

    // 데이터 변환
    const details = rankings.map((row) => ({
      rank: row.rank,
      employeeName: row.employeeName,
      accumulatedSales: parseFloat(type === "total" ? row.accumulatedSales : row.mainProductSales) || 0,
      totalSalesContribution: parseFloat(row.contribution) || 0,
      mainProductContribution: parseFloat(row.contribution) || 0,
      cumulativeContribution: parseFloat(row.cumulativeContribution) || 0
    }));

    console.log(`[KPI Service] 기여도 순위 데이터 조회 완료 (${details.length}명)`);

    return { success: true, data: details };
  } catch (error) {
    console.error("[KPI Service] 기여도 순위 데이터 조회 실패:", error);
    console.error("[KPI Service] Error details:", error.message, error.stack);
    throw error;
  }
}
