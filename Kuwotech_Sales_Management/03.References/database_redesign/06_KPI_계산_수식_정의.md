# KPI 계산 수식 정의

## KPI 개요
- **용도**: 영업담당자 및 관리자의 성과 지표를 실시간 계산하여 대시보드에 표시
- **계산 시점**: 보고서 제출/승인 시 자동 갱신
- **권한**: 영업담당은 자신의 KPI만, 관리자는 전체 직원 KPI 조회 가능

---

## 영업담당 KPI (14개)

### 기본 활동 지표

| KPI명 | 영문명 | 수식 | 데이터 소스 | 생성 장소 |
|-------|--------|------|-----------|----------|
| 총 방문 횟수 | totalVisits | `COUNT(reports WHERE submittedBy = 영업담당명)` | reports 테이블 | 시스템 자동계산 |
| 이번 달 방문 횟수 | monthlyVisits | `COUNT(reports WHERE submittedBy = 영업담당명 AND MONTH(visitDate) = 현재월)` | reports 테이블 | 시스템 자동계산 |
| 이번 주 방문 횟수 | weeklyVisits | `COUNT(reports WHERE submittedBy = 영업담당명 AND WEEK(visitDate) = 현재주)` | reports 테이블 | 시스템 자동계산 |
| 오늘 방문 횟수 | todayVisits | `COUNT(reports WHERE submittedBy = 영업담당명 AND DATE(visitDate) = 오늘)` | reports 테이블 | 시스템 자동계산 |

### 매출 지표

| KPI명 | 영문명 | 수식 | 데이터 소스 | 생성 장소 |
|-------|--------|------|-----------|----------|
| 총 매출 금액 | totalSales | `SUM(reports.salesAmount WHERE submittedBy = 영업담당명)` | reports.salesAmount | 시스템 자동계산 |
| 이번 달 매출 | monthlySales | `SUM(reports.salesAmount WHERE submittedBy = 영업담당명 AND MONTH(visitDate) = 현재월)` | reports.salesAmount | 시스템 자동계산 |
| 이번 주 매출 | weeklySales | `SUM(reports.salesAmount WHERE submittedBy = 영업담당명 AND WEEK(visitDate) = 현재주)` | reports.salesAmount | 시스템 자동계산 |
| 오늘 매출 | todaySales | `SUM(reports.salesAmount WHERE submittedBy = 영업담당명 AND DATE(visitDate) = 오늘)` | reports.salesAmount | 시스템 자동계산 |

### 수금 지표

| KPI명 | 영문명 | 수식 | 데이터 소스 | 생성 장소 |
|-------|--------|------|-----------|----------|
| 총 수금 금액 | totalCollection | `SUM(reports.collectionAmount WHERE submittedBy = 영업담당명)` | reports.collectionAmount | 시스템 자동계산 |
| 이번 달 수금 | monthlyCollection | `SUM(reports.collectionAmount WHERE submittedBy = 영업담당명 AND MONTH(visitDate) = 현재월)` | reports.collectionAmount | 시스템 자동계산 |
| 이번 주 수금 | weeklyCollection | `SUM(reports.collectionAmount WHERE submittedBy = 영업담당명 AND WEEK(visitDate) = 현재주)` | reports.collectionAmount | 시스템 자동계산 |
| 오늘 수금 | todayCollection | `SUM(reports.collectionAmount WHERE submittedBy = 영업담당명 AND DATE(visitDate) = 오늘)` | reports.collectionAmount | 시스템 자동계산 |

### 거래처 관리 지표

| KPI명 | 영문명 | 수식 | 데이터 소스 | 생성 장소 |
|-------|--------|------|-----------|----------|
| 담당 거래처 수 | assignedCompanies | `COUNT(companies WHERE salesPerson = 영업담당명)` | companies.salesPerson | 시스템 자동계산 |
| 활성 거래처 수 | activeCompanies | `COUNT(DISTINCT reports.companyId WHERE submittedBy = 영업담당명 AND visitDate >= DATE_SUB(NOW(), INTERVAL 30 DAY))` | reports.companyId | 시스템 자동계산 (최근 30일 방문) |

---

## 관리자 KPI (14개)

### 팀 활동 지표

| KPI명 | 영문명 | 수식 | 데이터 소스 | 생성 장소 |
|-------|--------|------|-----------|----------|
| 전체 방문 횟수 | totalVisits | `COUNT(reports)` | reports 테이블 | 시스템 자동계산 |
| 이번 달 방문 횟수 | monthlyVisits | `COUNT(reports WHERE MONTH(visitDate) = 현재월)` | reports 테이블 | 시스템 자동계산 |
| 이번 주 방문 횟수 | weeklyVisits | `COUNT(reports WHERE WEEK(visitDate) = 현재주)` | reports 테이블 | 시스템 자동계산 |
| 오늘 방문 횟수 | todayVisits | `COUNT(reports WHERE DATE(visitDate) = 오늘)` | reports 테이블 | 시스템 자동계산 |

### 팀 매출 지표

| KPI명 | 영문명 | 수식 | 데이터 소스 | 생성 장소 |
|-------|--------|------|-----------|----------|
| 전체 매출 금액 | totalSales | `SUM(reports.salesAmount)` | reports.salesAmount | 시스템 자동계산 |
| 이번 달 매출 | monthlySales | `SUM(reports.salesAmount WHERE MONTH(visitDate) = 현재월)` | reports.salesAmount | 시스템 자동계산 |
| 이번 주 매출 | weeklySales | `SUM(reports.salesAmount WHERE WEEK(visitDate) = 현재주)` | reports.salesAmount | 시스템 자동계산 |
| 오늘 매출 | todaySales | `SUM(reports.salesAmount WHERE DATE(visitDate) = 오늘)` | reports.salesAmount | 시스템 자동계산 |

### 팀 수금 지표

| KPI명 | 영문명 | 수식 | 데이터 소스 | 생성 장소 |
|-------|--------|------|-----------|----------|
| 전체 수금 금액 | totalCollection | `SUM(reports.collectionAmount)` | reports.collectionAmount | 시스템 자동계산 |
| 이번 달 수금 | monthlyCollection | `SUM(reports.collectionAmount WHERE MONTH(visitDate) = 현재월)` | reports.collectionAmount | 시스템 자동계산 |
| 이번 주 수금 | weeklyCollection | `SUM(reports.collectionAmount WHERE WEEK(visitDate) = 현재주)` | reports.collectionAmount | 시스템 자동계산 |
| 오늘 수금 | todayCollection | `SUM(reports.collectionAmount WHERE DATE(visitDate) = 오늘)` | reports.collectionAmount | 시스템 자동계산 |

### 조직 관리 지표

| KPI명 | 영문명 | 수식 | 데이터 소스 | 생성 장소 |
|-------|--------|------|-----------|----------|
| 전체 거래처 수 | totalCompanies | `COUNT(companies)` | companies 테이블 | 시스템 자동계산 |
| 활성 거래처 수 | activeCompanies | `COUNT(DISTINCT reports.companyId WHERE visitDate >= DATE_SUB(NOW(), INTERVAL 30 DAY))` | reports.companyId | 시스템 자동계산 (최근 30일 방문) |

---

## KPI 계산 구현 (Node.js)

### 영업담당 KPI 조회 API

```javascript
// GET /api/kpi/sales/:employeeName
async function getSalesKPI(req, res) {
  const { employeeName } = req.params;

  try {
    // 권한 확인: 본인 또는 관리자만
    if (req.user.name !== employeeName && req.user.role !== '관리자') {
      return res.status(403).json({ error: '권한이 없습니다.' });
    }

    const [kpi] = await db.execute(`
      SELECT
        -- 방문 지표
        COUNT(*) AS totalVisits,
        SUM(CASE WHEN MONTH(visitDate) = MONTH(NOW()) AND YEAR(visitDate) = YEAR(NOW()) THEN 1 ELSE 0 END) AS monthlyVisits,
        SUM(CASE WHEN WEEK(visitDate) = WEEK(NOW()) AND YEAR(visitDate) = YEAR(NOW()) THEN 1 ELSE 0 END) AS weeklyVisits,
        SUM(CASE WHEN DATE(visitDate) = CURDATE() THEN 1 ELSE 0 END) AS todayVisits,

        -- 매출 지표
        COALESCE(SUM(salesAmount), 0) AS totalSales,
        COALESCE(SUM(CASE WHEN MONTH(visitDate) = MONTH(NOW()) AND YEAR(visitDate) = YEAR(NOW()) THEN salesAmount ELSE 0 END), 0) AS monthlySales,
        COALESCE(SUM(CASE WHEN WEEK(visitDate) = WEEK(NOW()) AND YEAR(visitDate) = YEAR(NOW()) THEN salesAmount ELSE 0 END), 0) AS weeklySales,
        COALESCE(SUM(CASE WHEN DATE(visitDate) = CURDATE() THEN salesAmount ELSE 0 END), 0) AS todaySales,

        -- 수금 지표
        COALESCE(SUM(collectionAmount), 0) AS totalCollection,
        COALESCE(SUM(CASE WHEN MONTH(visitDate) = MONTH(NOW()) AND YEAR(visitDate) = YEAR(NOW()) THEN collectionAmount ELSE 0 END), 0) AS monthlyCollection,
        COALESCE(SUM(CASE WHEN WEEK(visitDate) = WEEK(NOW()) AND YEAR(visitDate) = YEAR(NOW()) THEN collectionAmount ELSE 0 END), 0) AS weeklyCollection,
        COALESCE(SUM(CASE WHEN DATE(visitDate) = CURDATE() THEN collectionAmount ELSE 0 END), 0) AS todayCollection

      FROM reports
      WHERE submittedBy = ? AND status = '승인'
    `, [employeeName]);

    // 거래처 지표 (별도 쿼리)
    const [companyKPI] = await db.execute(`
      SELECT
        COUNT(*) AS assignedCompanies
      FROM companies
      WHERE salesPerson = ?
    `, [employeeName]);

    const [activeCompanyKPI] = await db.execute(`
      SELECT
        COUNT(DISTINCT companyId) AS activeCompanies
      FROM reports
      WHERE submittedBy = ?
        AND visitDate >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        AND status = '승인'
    `, [employeeName]);

    res.json({
      ...kpi[0],
      assignedCompanies: companyKPI[0].assignedCompanies,
      activeCompanies: activeCompanyKPI[0].activeCompanies
    });

  } catch (error) {
    console.error('KPI 조회 실패:', error);
    res.status(500).json({ error: 'KPI 조회 중 오류 발생' });
  }
}
```

### 관리자 전체 KPI 조회 API

```javascript
// GET /api/kpi/admin/all
async function getAdminKPI(req, res) {
  try {
    // 관리자 권한 확인
    if (req.user.role !== '관리자') {
      return res.status(403).json({ error: '관리자만 접근 가능합니다.' });
    }

    // 전체 팀 KPI
    const [teamKPI] = await db.execute(`
      SELECT
        -- 방문 지표
        COUNT(*) AS totalVisits,
        SUM(CASE WHEN MONTH(visitDate) = MONTH(NOW()) AND YEAR(visitDate) = YEAR(NOW()) THEN 1 ELSE 0 END) AS monthlyVisits,
        SUM(CASE WHEN WEEK(visitDate) = WEEK(NOW()) AND YEAR(visitDate) = YEAR(NOW()) THEN 1 ELSE 0 END) AS weeklyVisits,
        SUM(CASE WHEN DATE(visitDate) = CURDATE() THEN 1 ELSE 0 END) AS todayVisits,

        -- 매출 지표
        COALESCE(SUM(salesAmount), 0) AS totalSales,
        COALESCE(SUM(CASE WHEN MONTH(visitDate) = MONTH(NOW()) AND YEAR(visitDate) = YEAR(NOW()) THEN salesAmount ELSE 0 END), 0) AS monthlySales,
        COALESCE(SUM(CASE WHEN WEEK(visitDate) = WEEK(NOW()) AND YEAR(visitDate) = YEAR(NOW()) THEN salesAmount ELSE 0 END), 0) AS weeklySales,
        COALESCE(SUM(CASE WHEN DATE(visitDate) = CURDATE() THEN salesAmount ELSE 0 END), 0) AS todaySales,

        -- 수금 지표
        COALESCE(SUM(collectionAmount), 0) AS totalCollection,
        COALESCE(SUM(CASE WHEN MONTH(visitDate) = MONTH(NOW()) AND YEAR(visitDate) = YEAR(NOW()) THEN collectionAmount ELSE 0 END), 0) AS monthlyCollection,
        COALESCE(SUM(CASE WHEN WEEK(visitDate) = WEEK(NOW()) AND YEAR(visitDate) = YEAR(NOW()) THEN collectionAmount ELSE 0 END), 0) AS weeklyCollection,
        COALESCE(SUM(CASE WHEN DATE(visitDate) = CURDATE() THEN collectionAmount ELSE 0 END), 0) AS todayCollection

      FROM reports
      WHERE status = '승인'
    `);

    // 거래처 지표
    const [companyKPI] = await db.execute(`
      SELECT COUNT(*) AS totalCompanies
      FROM companies
    `);

    const [activeCompanyKPI] = await db.execute(`
      SELECT COUNT(DISTINCT companyId) AS activeCompanies
      FROM reports
      WHERE visitDate >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        AND status = '승인'
    `);

    // 직원별 KPI
    const [employeeKPIs] = await db.execute(`
      SELECT
        e.name AS employeeName,
        e.department,
        COUNT(r.reportId) AS monthlyVisits,
        COALESCE(SUM(r.salesAmount), 0) AS monthlySales,
        COALESCE(SUM(r.collectionAmount), 0) AS monthlyCollection
      FROM employees e
      LEFT JOIN reports r ON e.name = r.submittedBy
        AND MONTH(r.visitDate) = MONTH(NOW())
        AND YEAR(r.visitDate) = YEAR(NOW())
        AND r.status = '승인'
      WHERE e.role = '영업담당' AND e.status = '재직'
      GROUP BY e.id, e.name, e.department
      ORDER BY monthlySales DESC
    `);

    res.json({
      teamKPI: {
        ...teamKPI[0],
        totalCompanies: companyKPI[0].totalCompanies,
        activeCompanies: activeCompanyKPI[0].activeCompanies
      },
      employeeKPIs
    });

  } catch (error) {
    console.error('관리자 KPI 조회 실패:', error);
    res.status(500).json({ error: 'KPI 조회 중 오류 발생' });
  }
}
```

---

## KPI 캐싱 (선택사항 - 성능 최적화)

### kpi_cache 테이블 (선택사항)

```sql
CREATE TABLE IF NOT EXISTS kpi_cache (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employeeName VARCHAR(100) NOT NULL,
  kpiType ENUM('daily', 'weekly', 'monthly', 'total') NOT NULL,
  kpiData JSON NOT NULL,
  calculatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_employee_type (employeeName, kpiType)
);
```

### 캐시 갱신 트리거

```sql
-- reports 테이블에 변경 발생 시 해당 직원의 캐시 무효화
DELIMITER //
CREATE TRIGGER invalidate_kpi_cache
AFTER INSERT ON reports
FOR EACH ROW
BEGIN
  DELETE FROM kpi_cache WHERE employeeName = NEW.submittedBy;
END//
DELIMITER ;
```

---

## 대시보드 표시 예시

### 영업담당 대시보드

| 구분 | 오늘 | 이번 주 | 이번 달 | 전체 |
|------|------|---------|---------|------|
| **방문 횟수** | 3회 | 12회 | 45회 | 234회 |
| **매출 금액** | 5,000,000원 | 25,000,000원 | 120,000,000원 | 1,500,000,000원 |
| **수금 금액** | 3,000,000원 | 18,000,000원 | 80,000,000원 | 1,200,000,000원 |

**거래처 정보**
- 담당 거래처: 45개
- 활성 거래처 (최근 30일): 32개

### 관리자 대시보드

**팀 전체 실적**

| 구분 | 오늘 | 이번 주 | 이번 달 | 전체 |
|------|------|---------|---------|------|
| **방문 횟수** | 15회 | 80회 | 320회 | 2,500회 |
| **매출 금액** | 30,000,000원 | 150,000,000원 | 800,000,000원 | 12,000,000,000원 |
| **수금 금액** | 20,000,000원 | 100,000,000원 | 500,000,000원 | 8,000,000,000원 |

**조직 정보**
- 전체 거래처: 500개
- 활성 거래처 (최근 30일): 320개

**직원별 이번 달 실적**

| 직원명 | 부서 | 방문 횟수 | 매출 금액 | 수금 금액 |
|--------|------|----------|----------|----------|
| 홍길동 | 영업1팀 | 45회 | 120,000,000원 | 80,000,000원 |
| 김영희 | 영업2팀 | 38회 | 95,000,000원 | 70,000,000원 |
| 이철수 | 영업1팀 | 42회 | 110,000,000원 | 75,000,000원 |
