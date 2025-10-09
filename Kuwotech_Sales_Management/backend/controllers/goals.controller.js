// ============================================
// 목표/실적 조회 컨트롤러
// ============================================

import { getDB } from '../config/database.js';

// GET /api/goals/employee/:id/monthly - 담당자 월간 실적
export const getEmployeeMonthlyGoals = async (req, res) => {
  try {
    const { id } = req.params;
    const { year, month } = req.query;

    if (!year || !month) {
      return res.status(400).json({
        success: false,
        message: 'year와 month 파라미터가 필요합니다'
      });
    }

    const db = await getDB();

    // 직원 정보 및 목표 조회
    const [employees] = await db.query(`
      SELECT
        id, name, department,
        monthlyCollectionGoal, monthlySalesGoal,
        annualCollectionGoal, annualSalesGoal
      FROM employees
      WHERE id = ?
    `, [id]);

    if (employees.length === 0) {
      return res.status(404).json({
        success: false,
        message: '직원을 찾을 수 없습니다'
      });
    }

    const employee = employees[0];

    // 해당 월의 실제 실적 계산 (승인된 reports 기준)
    const [monthlyActuals] = await db.query(`
      SELECT
        COALESCE(SUM(actualCollectionAmount), 0) as actualCollection,
        COALESCE(SUM(CASE
          WHEN includeVAT = 1 THEN ROUND(actualSalesAmount / 1.1, 0)
          ELSE actualSalesAmount
        END), 0) as actualSales
      FROM reports
      WHERE submittedBy = ?
        AND status = '승인'
        AND YEAR(submittedDate) = ?
        AND MONTH(submittedDate) = ?
    `, [employee.name, year, month]);

    // 연간 누적 실적 계산
    const [annualActuals] = await db.query(`
      SELECT
        COALESCE(SUM(actualCollectionAmount), 0) as actualCollection,
        COALESCE(SUM(CASE
          WHEN includeVAT = 1 THEN ROUND(actualSalesAmount / 1.1, 0)
          ELSE actualSalesAmount
        END), 0) as actualSales
      FROM reports
      WHERE submittedBy = ?
        AND status = '승인'
        AND YEAR(submittedDate) = ?
    `, [employee.name, year]);

    const monthlyData = monthlyActuals[0];
    const annualData = annualActuals[0];

    res.json({
      success: true,
      employeeId: employee.id,
      employeeName: employee.name,
      department: employee.department,
      year: parseInt(year),
      month: parseInt(month),
      goals: {
        monthlyCollectionGoal: parseFloat(employee.monthlyCollectionGoal),
        monthlySalesGoal: parseFloat(employee.monthlySalesGoal),
        actualCollection: parseFloat(monthlyData.actualCollection),
        actualSales: parseFloat(monthlyData.actualSales),
        collectionRate: employee.monthlyCollectionGoal > 0
          ? ((monthlyData.actualCollection / employee.monthlyCollectionGoal) * 100).toFixed(1)
          : 0,
        salesRate: employee.monthlySalesGoal > 0
          ? ((monthlyData.actualSales / employee.monthlySalesGoal) * 100).toFixed(1)
          : 0
      },
      annual: {
        annualCollectionGoal: parseFloat(employee.annualCollectionGoal),
        annualSalesGoal: parseFloat(employee.annualSalesGoal),
        actualCollection: parseFloat(annualData.actualCollection),
        actualSales: parseFloat(annualData.actualSales),
        collectionRate: employee.annualCollectionGoal > 0
          ? ((annualData.actualCollection / employee.annualCollectionGoal) * 100).toFixed(1)
          : 0,
        salesRate: employee.annualSalesGoal > 0
          ? ((annualData.actualSales / employee.annualSalesGoal) * 100).toFixed(1)
          : 0
      }
    });

  } catch (error) {
    console.error('담당자 월간 실적 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '담당자 월간 실적 조회에 실패했습니다',
      error: error.message
    });
  }
};

// GET /api/goals/employee/:id/annual - 담당자 연간 실적
export const getEmployeeAnnualGoals = async (req, res) => {
  try {
    const { id } = req.params;
    const { year } = req.query;

    if (!year) {
      return res.status(400).json({
        success: false,
        message: 'year 파라미터가 필요합니다'
      });
    }

    const db = await getDB();

    // 직원 정보 및 목표 조회
    const [employees] = await db.query(`
      SELECT
        id, name, department,
        annualCollectionGoal, annualSalesGoal
      FROM employees
      WHERE id = ?
    `, [id]);

    if (employees.length === 0) {
      return res.status(404).json({
        success: false,
        message: '직원을 찾을 수 없습니다'
      });
    }

    const employee = employees[0];

    // 연간 실적 계산
    const [annualActuals] = await db.query(`
      SELECT
        COALESCE(SUM(actualCollectionAmount), 0) as actualCollection,
        COALESCE(SUM(CASE
          WHEN includeVAT = 1 THEN ROUND(actualSalesAmount / 1.1, 0)
          ELSE actualSalesAmount
        END), 0) as actualSales
      FROM reports
      WHERE submittedBy = ?
        AND status = '승인'
        AND YEAR(submittedDate) = ?
    `, [employee.name, year]);

    const annualData = annualActuals[0];

    res.json({
      success: true,
      employeeId: employee.id,
      employeeName: employee.name,
      department: employee.department,
      year: parseInt(year),
      annual: {
        annualCollectionGoal: parseFloat(employee.annualCollectionGoal),
        annualSalesGoal: parseFloat(employee.annualSalesGoal),
        actualCollection: parseFloat(annualData.actualCollection),
        actualSales: parseFloat(annualData.actualSales),
        collectionRate: employee.annualCollectionGoal > 0
          ? ((annualData.actualCollection / employee.annualCollectionGoal) * 100).toFixed(1)
          : 0,
        salesRate: employee.annualSalesGoal > 0
          ? ((annualData.actualSales / employee.annualSalesGoal) * 100).toFixed(1)
          : 0
      }
    });

  } catch (error) {
    console.error('담당자 연간 실적 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '담당자 연간 실적 조회에 실패했습니다',
      error: error.message
    });
  }
};

// GET /api/goals/company/:id/monthly - 거래처 월간 실적
export const getCompanyMonthlyGoals = async (req, res) => {
  try {
    const { id } = req.params;
    const { year, month } = req.query;

    if (!year || !month) {
      return res.status(400).json({
        success: false,
        message: 'year와 month 파라미터가 필요합니다'
      });
    }

    const db = await getDB();

    // 거래처 정보 및 목표 조회
    const [companies] = await db.query(`
      SELECT
        keyValue, finalCompanyName,
        monthlyCollectionGoal, monthlySalesGoal,
        annualCollectionGoal, annualSalesGoal,
        accumulatedCollection, accumulatedSales
      FROM companies
      WHERE keyValue = ?
    `, [id]);

    if (companies.length === 0) {
      return res.status(404).json({
        success: false,
        message: '거래처를 찾을 수 없습니다'
      });
    }

    const company = companies[0];

    // 해당 월의 실제 실적 계산
    const [monthlyActuals] = await db.query(`
      SELECT
        COALESCE(SUM(actualCollectionAmount), 0) as actualCollection,
        COALESCE(SUM(CASE
          WHEN includeVAT = 1 THEN ROUND(actualSalesAmount / 1.1, 0)
          ELSE actualSalesAmount
        END), 0) as actualSales
      FROM reports
      WHERE companyId = ?
        AND status = '승인'
        AND YEAR(submittedDate) = ?
        AND MONTH(submittedDate) = ?
    `, [id, year, month]);

    const monthlyData = monthlyActuals[0];

    res.json({
      success: true,
      companyId: company.keyValue,
      companyName: company.finalCompanyName,
      year: parseInt(year),
      month: parseInt(month),
      goals: {
        monthlyCollectionGoal: parseFloat(company.monthlyCollectionGoal),
        monthlySalesGoal: parseFloat(company.monthlySalesGoal),
        actualCollection: parseFloat(monthlyData.actualCollection),
        actualSales: parseFloat(monthlyData.actualSales),
        collectionRate: company.monthlyCollectionGoal > 0
          ? ((monthlyData.actualCollection / company.monthlyCollectionGoal) * 100).toFixed(1)
          : 0,
        salesRate: company.monthlySalesGoal > 0
          ? ((monthlyData.actualSales / company.monthlySalesGoal) * 100).toFixed(1)
          : 0
      },
      annual: {
        annualCollectionGoal: parseFloat(company.annualCollectionGoal),
        annualSalesGoal: parseFloat(company.annualSalesGoal),
        actualCollection: parseFloat(company.accumulatedCollection),
        actualSales: parseFloat(company.accumulatedSales),
        collectionRate: company.annualCollectionGoal > 0
          ? ((company.accumulatedCollection / company.annualCollectionGoal) * 100).toFixed(1)
          : 0,
        salesRate: company.annualSalesGoal > 0
          ? ((company.accumulatedSales / company.annualSalesGoal) * 100).toFixed(1)
          : 0
      }
    });

  } catch (error) {
    console.error('거래처 월간 실적 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '거래처 월간 실적 조회에 실패했습니다',
      error: error.message
    });
  }
};

// GET /api/goals/department/:id/monthly - 부서 월간 실적
export const getDepartmentMonthlyGoals = async (req, res) => {
  try {
    const { id } = req.params;
    const { year, month } = req.query;

    if (!year || !month) {
      return res.status(400).json({
        success: false,
        message: 'year와 month 파라미터가 필요합니다'
      });
    }

    const db = await getDB();

    // 부서 정보 조회
    const [departments] = await db.query(`
      SELECT id, department_name
      FROM departments
      WHERE id = ?
    `, [id]);

    if (departments.length === 0) {
      return res.status(404).json({
        success: false,
        message: '부서를 찾을 수 없습니다'
      });
    }

    const department = departments[0];

    // companyGoals에서 부서 목표 조회
    const [companyGoals] = await db.query(`
      SELECT departmentGoals
      FROM companyGoals
      WHERE goalYear = ? AND goalMonth = ?
    `, [year, month]);

    let departmentGoal = null;
    if (companyGoals.length > 0 && companyGoals[0].departmentGoals) {
      const goals = JSON.parse(companyGoals[0].departmentGoals);
      departmentGoal = goals.find(g => g.departmentId === parseInt(id));
    }

    // 부서 소속 직원들의 실적 합계
    const [actuals] = await db.query(`
      SELECT
        COALESCE(SUM(r.actualCollectionAmount), 0) as actualCollection,
        COALESCE(SUM(CASE
          WHEN r.includeVAT = 1 THEN ROUND(r.actualSalesAmount / 1.1, 0)
          ELSE r.actualSalesAmount
        END), 0) as actualSales
      FROM reports r
      INNER JOIN employees e ON r.submittedBy = e.name
      WHERE e.departmentId = ?
        AND r.status = '승인'
        AND YEAR(r.submittedDate) = ?
        AND MONTH(r.submittedDate) = ?
    `, [id, year, month]);

    const actualData = actuals[0];

    const collectionGoal = departmentGoal ? departmentGoal.collectionGoal : 0;
    const salesGoal = departmentGoal ? departmentGoal.salesGoal : 0;

    res.json({
      success: true,
      departmentId: department.id,
      departmentName: department.department_name,
      year: parseInt(year),
      month: parseInt(month),
      goals: {
        monthlyCollectionGoal: collectionGoal,
        monthlySalesGoal: salesGoal,
        actualCollection: parseFloat(actualData.actualCollection),
        actualSales: parseFloat(actualData.actualSales),
        collectionRate: collectionGoal > 0
          ? ((actualData.actualCollection / collectionGoal) * 100).toFixed(1)
          : 0,
        salesRate: salesGoal > 0
          ? ((actualData.actualSales / salesGoal) * 100).toFixed(1)
          : 0
      }
    });

  } catch (error) {
    console.error('부서 월간 실적 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '부서 월간 실적 조회에 실패했습니다',
      error: error.message
    });
  }
};

// GET /api/goals/total/monthly - 전체 월간 실적
export const getTotalMonthlyGoals = async (req, res) => {
  try {
    const { year, month } = req.query;

    if (!year || !month) {
      return res.status(400).json({
        success: false,
        message: 'year와 month 파라미터가 필요합니다'
      });
    }

    const db = await getDB();

    // companyGoals에서 전사 목표 조회
    const [companyGoals] = await db.query(`
      SELECT
        companyCollectionGoal,
        companySalesGoal,
        departmentGoals
      FROM companyGoals
      WHERE goalYear = ? AND goalMonth = ?
    `, [year, month]);

    let totalGoals = {
      companyCollectionGoal: 0,
      companySalesGoal: 0,
      departmentGoals: []
    };

    if (companyGoals.length > 0) {
      totalGoals.companyCollectionGoal = parseFloat(companyGoals[0].companyCollectionGoal);
      totalGoals.companySalesGoal = parseFloat(companyGoals[0].companySalesGoal);
      if (companyGoals[0].departmentGoals) {
        totalGoals.departmentGoals = JSON.parse(companyGoals[0].departmentGoals);
      }
    }

    // 전체 실적 계산
    const [actuals] = await db.query(`
      SELECT
        COALESCE(SUM(actualCollectionAmount), 0) as actualCollection,
        COALESCE(SUM(CASE
          WHEN includeVAT = 1 THEN ROUND(actualSalesAmount / 1.1, 0)
          ELSE actualSalesAmount
        END), 0) as actualSales
      FROM reports
      WHERE status = '승인'
        AND YEAR(submittedDate) = ?
        AND MONTH(submittedDate) = ?
    `, [year, month]);

    const actualData = actuals[0];

    res.json({
      success: true,
      year: parseInt(year),
      month: parseInt(month),
      goals: {
        companyCollectionGoal: totalGoals.companyCollectionGoal,
        companySalesGoal: totalGoals.companySalesGoal,
        actualCollection: parseFloat(actualData.actualCollection),
        actualSales: parseFloat(actualData.actualSales),
        collectionRate: totalGoals.companyCollectionGoal > 0
          ? ((actualData.actualCollection / totalGoals.companyCollectionGoal) * 100).toFixed(1)
          : 0,
        salesRate: totalGoals.companySalesGoal > 0
          ? ((actualData.actualSales / totalGoals.companySalesGoal) * 100).toFixed(1)
          : 0
      },
      departmentGoals: totalGoals.departmentGoals
    });

  } catch (error) {
    console.error('전체 월간 실적 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '전체 월간 실적 조회에 실패했습니다',
      error: error.message
    });
  }
};
