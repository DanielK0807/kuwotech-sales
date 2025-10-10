// ============================================
// 거래처 컨트롤러
// ============================================

import { getDB } from '../config/database.js';

// GET /api/companies - 전체 거래처 조회 (필터링 지원)
export const getAllCompanies = async (req, res) => {
  try {
    const {
      status,          // 거래상태 (활성/비활성/불용/추가확인)
      region,          // 고객사 지역
      department,      // 담당부서
      isClosed,        // 폐업여부 (Y/N)
      manager,         // 내부담당자
      search,          // 검색어 (회사명)
      limit = 100,     // 페이지당 개수
      offset = 0       // 오프셋
    } = req.query;

    const db = await getDB();

    let query = `
      SELECT
        keyValue, finalCompanyName, isClosed, ceoOrDentist,
        customerRegion, region_id, region_district, businessStatus, department, salesProduct,
        internalManager, jcwContribution, companyContribution,
        lastPaymentDate, lastPaymentAmount, accountsReceivable,
        accumulatedCollection, accumulatedSales, activityNotes,
        businessRegistrationNumber, detailedAddress, phoneNumber,
        referralSource, createdAt, updatedAt
      FROM companies
      WHERE 1=1
    `;

    const params = [];

    // 필터 적용
    if (status) {
      query += ' AND businessStatus = ?';
      params.push(status);
    }

    if (region) {
      query += ' AND customerRegion LIKE ?';
      params.push(`%${region}%`);
    }

    if (department) {
      query += ' AND department = ?';
      params.push(department);
    }

    if (isClosed) {
      query += ' AND isClosed = ?';
      params.push(isClosed);
    }

    if (manager) {
      query += ' AND internalManager = ?';
      params.push(manager);
    }

    if (search) {
      query += ' AND finalCompanyName LIKE ?';
      params.push(`%${search}%`);
    }

    // 정렬 및 페이지네이션
    const limitNum = parseInt(limit) || 100;
    const offsetNum = parseInt(offset) || 0;
    query += ` ORDER BY finalCompanyName ASC LIMIT ${limitNum} OFFSET ${offsetNum}`;

    const [companies] = await db.execute(query, params);

    // 필드명 매핑: 백엔드 → 프론트엔드
    const mappedCompanies = companies.map(company => ({
      ...company,
      companyName: company.finalCompanyName || company.companyName,
      representativeName: company.ceoOrDentist || company.representativeName,
      contact: company.phoneNumber || company.contact,
      address: company.detailedAddress || company.address,
      // 숫자 필드 안전 처리 (NULL → 0)
      accumulatedSales: company.accumulatedSales || 0,
      accumulatedCollection: company.accumulatedCollection || 0,
      lastPaymentAmount: company.lastPaymentAmount || 0,
      accountsReceivable: company.accountsReceivable || 0
    }));

    // 총 개수 조회
    let countQuery = 'SELECT COUNT(*) as total FROM companies WHERE 1=1';
    const countParams = [];

    if (status) {
      countQuery += ' AND businessStatus = ?';
      countParams.push(status);
    }
    if (region) {
      countQuery += ' AND customerRegion LIKE ?';
      countParams.push(`%${region}%`);
    }
    if (department) {
      countQuery += ' AND department = ?';
      countParams.push(department);
    }
    if (isClosed) {
      countQuery += ' AND isClosed = ?';
      countParams.push(isClosed);
    }
    if (manager) {
      countQuery += ' AND internalManager = ?';
      countParams.push(manager);
    }
    if (search) {
      countQuery += ' AND finalCompanyName LIKE ?';
      countParams.push(`%${search}%`);
    }

    const [countResult] = await db.execute(countQuery, countParams);

    res.json({
      success: true,
      count: mappedCompanies.length,
      total: countResult[0].total,
      limit: parseInt(limit),
      offset: parseInt(offset),
      companies: mappedCompanies
    });

  } catch (error) {
    console.error('거래처 목록 조회 오류:', error);
    console.error('오류 상세:', error.message);
    console.error('스택 트레이스:', error.stack);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '거래처 목록 조회 중 오류가 발생했습니다.',
      details: error.message
    });
  }
};

// GET /api/companies/:keyValue - 특정 거래처 조회
export const getCompanyByKey = async (req, res) => {
  try {
    const { keyValue } = req.params;
    const db = await getDB();

    const [companies] = await db.execute(`
      SELECT * FROM companies WHERE keyValue = ?
    `, [keyValue]);

    if (companies.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: '거래처를 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      company: companies[0]
    });

  } catch (error) {
    console.error('거래처 조회 오류:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '거래처 조회 중 오류가 발생했습니다.'
    });
  }
};

// GET /api/companies/manager/:managerName - 담당자별 거래처 조회
export const getCompaniesByManager = async (req, res) => {
  try {
    const { managerName } = req.params;
    const db = await getDB();

    const [companies] = await db.execute(`
      SELECT
        keyValue, finalCompanyName, isClosed, ceoOrDentist,
        customerRegion, region_id, region_district, businessStatus, department, salesProduct,
        internalManager, jcwContribution, companyContribution,
        lastPaymentDate, lastPaymentAmount,
        accountsReceivable, accumulatedCollection, accumulatedSales,
        activityNotes,
        businessRegistrationNumber, detailedAddress, phoneNumber, referralSource,
        createdAt, updatedAt
      FROM companies
      WHERE internalManager = ?
      ORDER BY finalCompanyName ASC
    `, [managerName]);

    // 필드명 매핑: 백엔드 → 프론트엔드
    const mappedCompanies = companies.map(company => ({
      ...company,
      companyName: company.finalCompanyName || company.companyName,
      representativeName: company.ceoOrDentist || company.representativeName,
      // 숫자 필드 안전 처리 (NULL → 0)
      accumulatedSales: company.accumulatedSales || 0,
      accumulatedCollection: company.accumulatedCollection || 0,
      lastPaymentAmount: company.lastPaymentAmount || 0,
      accountsReceivable: company.accountsReceivable || 0
    }));

    res.json({
      success: true,
      count: mappedCompanies.length,
      manager: managerName,
      companies: mappedCompanies
    });

  } catch (error) {
    console.error('담당자별 거래처 조회 오류:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '담당자별 거래처 조회 중 오류가 발생했습니다.'
    });
  }
};

// ============================================
// 이력 저장 헬퍼 함수
// ============================================
async function saveHistory(db, companyKey, action, changedBy, changedByRole, oldData, newData, req) {
  try {
    // 변경된 필드만 추출
    const changes = {};
    if (oldData && newData) {
      for (const key in newData) {
        if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
          changes[key] = {
            from: oldData[key],
            to: newData[key]
          };
        }
      }
    }

    // IP 주소 추출
    const ipAddress = req.headers['x-forwarded-for']?.split(',')[0] ||
                      req.headers['x-real-ip'] ||
                      req.connection?.remoteAddress ||
                      req.socket?.remoteAddress;

    // User Agent 추출
    const userAgent = req.headers['user-agent'];

    await db.execute(`
      INSERT INTO company_history (
        company_key, action, changed_by, changed_by_role,
        old_data, new_data, changes, ip_address, user_agent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      companyKey,
      action,
      changedBy,
      changedByRole,
      JSON.stringify(oldData),
      JSON.stringify(newData),
      JSON.stringify(changes),
      ipAddress,
      userAgent
    ]);
  } catch (error) {
    console.error('이력 저장 실패:', error);
    // 이력 저장 실패해도 메인 작업은 계속 진행
  }
}

// GET /api/companies/check-duplicate/name?name={name}&excludeKey={keyValue} - 거래처명 중복 체크
export const checkCompanyNameDuplicate = async (req, res) => {
  try {
    const { name, excludeKey } = req.query;
    const db = await getDB();

    if (!name) {
      return res.status(400).json({
        error: 'Bad Request',
        message: '거래처명을 입력해주세요.'
      });
    }

    // 중복 검사 (수정 시 본인 제외)
    let query = 'SELECT keyValue, finalCompanyName, ceoOrDentist, detailedAddress, phoneNumber FROM companies WHERE finalCompanyName = ?';
    const params = [name];

    if (excludeKey) {
      query += ' AND keyValue != ?';
      params.push(excludeKey);
    }

    const [duplicates] = await db.execute(query, params);

    res.json({
      success: true,
      isDuplicate: duplicates.length > 0,
      count: duplicates.length,
      companies: duplicates
    });

  } catch (error) {
    console.error('거래처명 중복 체크 오류:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '거래처명 중복 체크 중 오류가 발생했습니다.',
      details: error.message
    });
  }
};

// GET /api/companies/check-duplicate/business-number?number={number}&excludeKey={keyValue} - 사업자등록번호 중복 체크
export const checkBusinessNumberDuplicate = async (req, res) => {
  try {
    const { number, excludeKey } = req.query;
    const db = await getDB();

    if (!number) {
      return res.status(400).json({
        error: 'Bad Request',
        message: '사업자등록번호를 입력해주세요.'
      });
    }

    // 중복 검사 (수정 시 본인 제외)
    let query = 'SELECT keyValue, finalCompanyName, businessRegistrationNumber FROM companies WHERE businessRegistrationNumber = ?';
    const params = [number];

    if (excludeKey) {
      query += ' AND keyValue != ?';
      params.push(excludeKey);
    }

    const [duplicates] = await db.execute(query, params);

    res.json({
      success: true,
      isDuplicate: duplicates.length > 0,
      count: duplicates.length,
      companies: duplicates
    });

  } catch (error) {
    console.error('사업자등록번호 중복 체크 오류:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '사업자등록번호 중복 체크 중 오류가 발생했습니다.',
      details: error.message
    });
  }
};

// 숫자 필드 정규화 헬퍼 함수
function normalizeNumericField(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const num = parseFloat(value);
  return isNaN(num) ? null : num;
}

// POST /api/companies - 거래처 생성
export const createCompany = async (req, res) => {
  try {
    const companyData = req.body;
    const db = await getDB();

    // 필수 필드 검증
    if (!companyData.finalCompanyName) {
      return res.status(400).json({
        error: 'Bad Request',
        message: '최종거래처명은 필수입니다.'
      });
    }

    // 사업자등록번호 중복 체크
    if (companyData.businessRegistrationNumber) {
      const [existingBusiness] = await db.execute(
        'SELECT keyValue, finalCompanyName FROM companies WHERE businessRegistrationNumber = ?',
        [companyData.businessRegistrationNumber]
      );

      if (existingBusiness.length > 0) {
        return res.status(400).json({
          error: 'Duplicate Business Number',
          message: `이미 등록된 사업자등록번호입니다. (${existingBusiness[0].finalCompanyName})`
        });
      }
    }

    // region_id 검증 (외래키 제약)
    if (companyData.region_id) {
      const [regionExists] = await db.execute(
        'SELECT id FROM regions WHERE id = ?',
        [companyData.region_id]
      );

      if (regionExists.length === 0) {
        return res.status(400).json({
          error: 'Invalid Region',
          message: '유효하지 않은 지역입니다.'
        });
      }
    }

    // keyValue 생성 (finalCompanyName 기반)
    const keyValue = companyData.keyValue || `COMPANY_${Date.now()}`;

    // 숫자 필드 정규화
    const jcwContribution = normalizeNumericField(companyData.jcwContribution);
    const companyContribution = normalizeNumericField(companyData.companyContribution);
    const accountsReceivable = normalizeNumericField(companyData.accountsReceivable) || 0;

    const [result] = await db.execute(`
      INSERT INTO companies (
        keyValue, finalCompanyName, isClosed, ceoOrDentist,
        customerRegion, region_id, businessStatus, department,
        internalManager, jcwContribution, companyContribution,
        accountsReceivable,
        businessRegistrationNumber, detailedAddress, phoneNumber, referralSource
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      keyValue,
      companyData.finalCompanyName,
      companyData.isClosed || 'N',
      companyData.ceoOrDentist || null,
      companyData.customerRegion || null,
      companyData.region_id || null,
      companyData.businessStatus || '활성',
      companyData.department || null,
      companyData.internalManager || req.user.name,
      jcwContribution,
      companyContribution,
      accountsReceivable,
      companyData.businessRegistrationNumber || null,
      companyData.detailedAddress || null,
      companyData.phoneNumber || null,
      companyData.referralSource || null
    ]);

    // 이력 저장
    await saveHistory(
      db,
      keyValue,
      'INSERT',
      req.user.name,
      req.user.role,
      null,
      companyData,
      req
    );

    res.status(201).json({
      success: true,
      message: '거래처가 생성되었습니다.',
      keyValue: keyValue
    });

  } catch (error) {
    console.error('거래처 생성 오류:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '거래처 생성 중 오류가 발생했습니다.',
      details: error.message
    });
  }
};

// PUT /api/companies/:keyValue - 거래처 수정
export const updateCompany = async (req, res) => {
  try {
    const { keyValue } = req.params;
    const companyData = req.body;
    const db = await getDB();

    // 기존 데이터 조회 (이력 저장용)
    const [existing] = await db.execute(
      'SELECT * FROM companies WHERE keyValue = ?',
      [keyValue]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: '거래처를 찾을 수 없습니다.'
      });
    }

    const oldData = existing[0];

    // 권한 체크: finalCompanyName은 관리자만 수정 가능
    if (companyData.finalCompanyName &&
        companyData.finalCompanyName !== oldData.finalCompanyName &&
        req.user.role !== '관리자') {
      return res.status(403).json({
        error: 'Forbidden',
        message: '최종거래처명은 관리자만 수정할 수 있습니다.'
      });
    }

    // 사업자등록번호 중복 체크 (변경되는 경우만)
    if (companyData.businessRegistrationNumber &&
        companyData.businessRegistrationNumber !== oldData.businessRegistrationNumber) {
      const [existingBusiness] = await db.execute(
        'SELECT keyValue, finalCompanyName FROM companies WHERE businessRegistrationNumber = ? AND keyValue != ?',
        [companyData.businessRegistrationNumber, keyValue]
      );

      if (existingBusiness.length > 0) {
        return res.status(400).json({
          error: 'Duplicate Business Number',
          message: `이미 등록된 사업자등록번호입니다. (${existingBusiness[0].finalCompanyName})`
        });
      }
    }

    // region_id 검증 (변경되는 경우만)
    if (companyData.region_id && companyData.region_id !== oldData.region_id) {
      const [regionExists] = await db.execute(
        'SELECT id FROM regions WHERE id = ?',
        [companyData.region_id]
      );

      if (regionExists.length === 0) {
        return res.status(400).json({
          error: 'Invalid Region',
          message: '유효하지 않은 지역입니다.'
        });
      }
    }

    // 숫자 필드 정규화
    const jcwContribution = companyData.jcwContribution !== undefined
      ? normalizeNumericField(companyData.jcwContribution)
      : oldData.jcwContribution;
    const companyContribution = companyData.companyContribution !== undefined
      ? normalizeNumericField(companyData.companyContribution)
      : oldData.companyContribution;
    const accountsReceivable = companyData.accountsReceivable !== undefined
      ? (normalizeNumericField(companyData.accountsReceivable) || 0)
      : oldData.accountsReceivable;

    // 업데이트 쿼리
    const [result] = await db.execute(`
      UPDATE companies SET
        finalCompanyName = ?,
        isClosed = ?,
        ceoOrDentist = ?,
        customerRegion = ?,
        region_id = ?,
        businessStatus = ?,
        department = ?,
        internalManager = ?,
        jcwContribution = ?,
        companyContribution = ?,
        accountsReceivable = ?,
        businessRegistrationNumber = ?,
        detailedAddress = ?,
        phoneNumber = ?,
        referralSource = ?
      WHERE keyValue = ?
    `, [
      companyData.finalCompanyName || oldData.finalCompanyName,
      companyData.isClosed || oldData.isClosed,
      companyData.ceoOrDentist || oldData.ceoOrDentist,
      companyData.customerRegion || oldData.customerRegion,
      companyData.region_id || oldData.region_id,
      companyData.businessStatus || oldData.businessStatus,
      companyData.department || oldData.department,
      companyData.internalManager || oldData.internalManager,
      jcwContribution,
      companyContribution,
      accountsReceivable,
      companyData.businessRegistrationNumber || oldData.businessRegistrationNumber,
      companyData.detailedAddress || oldData.detailedAddress,
      companyData.phoneNumber || oldData.phoneNumber,
      companyData.referralSource || oldData.referralSource,
      keyValue
    ]);

    // 이력 저장
    await saveHistory(
      db,
      keyValue,
      'UPDATE',
      req.user.name,
      req.user.role,
      oldData,
      companyData,
      req
    );

    res.json({
      success: true,
      message: '거래처가 수정되었습니다.',
      affected: result.affectedRows
    });

  } catch (error) {
    console.error('거래처 수정 오류:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '거래처 수정 중 오류가 발생했습니다.',
      details: error.message
    });
  }
};

// DELETE /api/companies/:keyValue - 거래처 삭제
export const deleteCompany = async (req, res) => {
  try {
    const { keyValue } = req.params;
    const db = await getDB();

    // 기존 데이터 조회 (이력 저장용)
    const [existing] = await db.execute(
      'SELECT * FROM companies WHERE keyValue = ?',
      [keyValue]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: '거래처를 찾을 수 없습니다.'
      });
    }

    const oldData = existing[0];

    // 삭제 실행
    const [result] = await db.execute(
      'DELETE FROM companies WHERE keyValue = ?',
      [keyValue]
    );

    // 이력 저장
    await saveHistory(
      db,
      keyValue,
      'DELETE',
      req.user.name,
      req.user.role,
      oldData,
      null,
      req
    );

    res.json({
      success: true,
      message: '거래처가 삭제되었습니다.',
      affected: result.affectedRows
    });

  } catch (error) {
    console.error('거래처 삭제 오류:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '거래처 삭제 중 오류가 발생했습니다.',
      details: error.message
    });
  }
};
