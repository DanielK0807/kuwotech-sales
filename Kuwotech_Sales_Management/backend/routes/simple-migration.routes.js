// 간단한 마이그레이션 API
import express from 'express';
import { getDB } from '../config/database.js';

const router = express.Router();

// POST /api/simple-migration/create-regions
router.post('/create-regions', async (req, res) => {
  try {
    const db = await getDB();

    // 1. regions 테이블 생성
    await db.execute(`
      CREATE TABLE IF NOT EXISTS regions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        region_name VARCHAR(50) NOT NULL UNIQUE,
        region_code VARCHAR(10) NOT NULL UNIQUE,
        display_order INT DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_region_name (region_name),
        INDEX idx_region_code (region_code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 2. 데이터 삽입
    const regions = [
      ['서울특별시', 'SEOUL', 1],
      ['부산광역시', 'BUSAN', 2],
      ['대구광역시', 'DAEGU', 3],
      ['인천광역시', 'INCHEON', 4],
      ['광주광역시', 'GWANGJU', 5],
      ['대전광역시', 'DAEJEON', 6],
      ['울산광역시', 'ULSAN', 7],
      ['세종특별자치시', 'SEJONG', 8],
      ['경기도', 'GYEONGGI', 9],
      ['강원특별자치도', 'GANGWON', 10],
      ['충청북도', 'CHUNGBUK', 11],
      ['충청남도', 'CHUNGNAM', 12],
      ['전북특별자치도', 'JEONBUK', 13],
      ['전라남도', 'JEONNAM', 14],
      ['경상북도', 'GYEONGBUK', 15],
      ['경상남도', 'GYEONGNAM', 16],
      ['제주특별자치도', 'JEJU', 17]
    ];

    for (const [name, code, order] of regions) {
      await db.execute(
        'INSERT IGNORE INTO regions (region_name, region_code, display_order) VALUES (?, ?, ?)',
        [name, code, order]
      );
    }

    // 3. 확인
    const [result] = await db.execute('SELECT * FROM regions ORDER BY display_order');

    res.json({
      success: true,
      message: 'regions 테이블 생성 완료',
      count: result.length,
      regions: result
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      code: error.code
    });
  }
});

// POST /api/simple-migration/add-region-id
router.post('/add-region-id', async (req, res) => {
  try {
    const db = await getDB();

    // SQL 모드 임시 변경 (strict mode 비활성화)
    await db.execute("SET SESSION sql_mode = 'NO_ENGINE_SUBSTITUTION'");

    // companies 테이블에 region_id 컬럼 추가
    try {
      await db.execute(`
        ALTER TABLE companies
        ADD COLUMN region_id INT NULL AFTER customerRegion
      `);
    } catch (err) {
      if (err.code !== 'ER_DUP_FIELDNAME') throw err;
    }

    // 외래키 추가
    try {
      await db.execute(`
        ALTER TABLE companies
        ADD CONSTRAINT fk_companies_region
          FOREIGN KEY (region_id) REFERENCES regions(id)
          ON UPDATE CASCADE ON DELETE SET NULL
      `);
    } catch (err) {
      if (err.code !== 'ER_DUP_KEYNAME') throw err;
    }

    // 인덱스 추가
    try {
      await db.execute(`
        ALTER TABLE companies
        ADD INDEX idx_region_id (region_id)
      `);
    } catch (err) {
      if (err.code !== 'ER_DUP_KEYNAME') throw err;
    }

    res.json({
      success: true,
      message: 'region_id 컬럼 추가 완료'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      code: error.code
    });
  }
});

// POST /api/simple-migration/populate-region-ids
router.post('/populate-region-ids', async (req, res) => {
  try {
    const db = await getDB();

    const mappings = [
      ['서울%', 'SEOUL'],
      ['부산%', 'BUSAN'],
      ['대구%', 'DAEGU'],
      ['인천%', 'INCHEON'],
      ['광주%', 'GWANGJU'],
      ['대전%', 'DAEJEON'],
      ['울산%', 'ULSAN'],
      ['세종%', 'SEJONG'],
      ['경기%', 'GYEONGGI'],
      ['강원%', 'GANGWON'],
      ['충북%', 'CHUNGBUK'],
      ['충남%', 'CHUNGNAM'],
      ['전북%', 'JEONBUK'],
      ['전남%', 'JEONNAM'],
      ['경북%', 'GYEONGBUK'],
      ['경남%', 'GYEONGNAM'],
      ['제주%', 'JEJU']
    ];

    const results = [];

    for (const [pattern, code] of mappings) {
      const [[region]] = await db.execute(
        'SELECT id FROM regions WHERE region_code = ?',
        [code]
      );

      if (region) {
        const [result] = await db.execute(
          'UPDATE companies SET region_id = ? WHERE customerRegion LIKE ? AND region_id IS NULL',
          [region.id, pattern]
        );

        results.push({
          region: code,
          affected: result.affectedRows
        });
      }
    }

    // 통계
    const [[stats]] = await db.execute(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN region_id IS NOT NULL THEN 1 ELSE 0 END) as mapped,
        SUM(CASE WHEN region_id IS NULL AND customerRegion IS NOT NULL THEN 1 ELSE 0 END) as unmapped
      FROM companies
    `);

    res.json({
      success: true,
      message: 'region_id 업데이트 완료',
      results,
      stats
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      code: error.code
    });
  }
});

// POST /api/simple-migration/create-products
router.post('/create-products', async (req, res) => {
  try {
    const db = await getDB();

    // 1. products 테이블 생성
    await db.execute(`
      CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        productName VARCHAR(100) NOT NULL,
        category VARCHAR(50) DEFAULT NULL,
        priority INT DEFAULT 0,
        isActive BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_product_name (productName),
        INDEX idx_category (category),
        INDEX idx_active (isActive)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 2. 기본 제품 데이터 삽입
    const products = [
      ['제품 A', '카테고리1', 100],
      ['제품 B', '카테고리1', 90],
      ['제품 C', '카테고리2', 80],
      ['제품 D', '카테고리2', 70],
      ['제품 E', '카테고리3', 60]
    ];

    for (const [name, category, priority] of products) {
      await db.execute(
        'INSERT IGNORE INTO products (productName, category, priority) VALUES (?, ?, ?)',
        [name, category, priority]
      );
    }

    // 3. 확인
    const [result] = await db.execute('SELECT * FROM products ORDER BY priority DESC, productName ASC');

    res.json({
      success: true,
      message: 'products 테이블 생성 완료',
      count: result.length,
      products: result
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      code: error.code
    });
  }
});

// POST /api/simple-migration/remove-duplicate-columns
router.post('/remove-duplicate-columns', async (req, res) => {
  try {
    const db = await getDB();

    // 중복된 한글 컬럼명 삭제
    try {
      await db.execute(`ALTER TABLE companies DROP COLUMN 사업자등록번호`);
    } catch (err) {
      if (err.code !== 'ER_CANT_DROP_FIELD_OR_KEY') throw err;
    }

    try {
      await db.execute(`ALTER TABLE companies DROP COLUMN 상세주소`);
    } catch (err) {
      if (err.code !== 'ER_CANT_DROP_FIELD_OR_KEY') throw err;
    }

    try {
      await db.execute(`ALTER TABLE companies DROP COLUMN 전화번호`);
    } catch (err) {
      if (err.code !== 'ER_CANT_DROP_FIELD_OR_KEY') throw err;
    }

    try {
      await db.execute(`ALTER TABLE companies DROP COLUMN 소개경로`);
    } catch (err) {
      if (err.code !== 'ER_CANT_DROP_FIELD_OR_KEY') throw err;
    }

    // 테이블 구조 확인
    const [columns] = await db.execute('DESCRIBE companies');

    res.json({
      success: true,
      message: '중복 컬럼 삭제 완료 (영문 컬럼명 사용)',
      columns: columns
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      code: error.code
    });
  }
});

// POST /api/simple-migration/create-history-table
router.post('/create-history-table', async (req, res) => {
  try {
    const db = await getDB();

    // company_history 테이블 생성
    await db.execute(`
      CREATE TABLE IF NOT EXISTS company_history (
        id INT AUTO_INCREMENT PRIMARY KEY COMMENT '이력 ID',
        company_key VARCHAR(100) NOT NULL COMMENT '거래처 키 (companies.keyValue)',
        action VARCHAR(20) NOT NULL COMMENT '작업 유형 (INSERT, UPDATE, DELETE)',
        changed_by VARCHAR(100) NOT NULL COMMENT '변경한 사용자',
        changed_by_role VARCHAR(50) COMMENT '변경자 역할 (영업담당, 관리자)',
        changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '변경 시각',

        old_data JSON COMMENT '변경 전 데이터 (JSON)',
        new_data JSON COMMENT '변경 후 데이터 (JSON)',
        changes JSON COMMENT '변경된 필드만 (JSON)',

        change_reason VARCHAR(500) COMMENT '변경 사유 (옵션)',
        ip_address VARCHAR(45) COMMENT '변경자 IP 주소',
        user_agent TEXT COMMENT '변경자 브라우저 정보',

        INDEX idx_company_key (company_key),
        INDEX idx_changed_by (changed_by),
        INDEX idx_changed_at (changed_at),
        INDEX idx_action (action),

        CONSTRAINT fk_company_history_company
          FOREIGN KEY (company_key) REFERENCES companies(keyValue)
          ON UPDATE CASCADE ON DELETE CASCADE

      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      COMMENT='거래처 변경 이력 테이블'
    `);

    // 테이블 구조 확인
    const [columns] = await db.execute('DESCRIBE company_history');

    res.json({
      success: true,
      message: 'company_history 테이블 생성 완료',
      columns: columns
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      code: error.code
    });
  }
});

// POST /api/simple-migration/delete-test-products
router.post('/delete-test-products', async (req, res) => {
  try {
    const db = await getDB();

    // 테스트 제품 삭제 (제품 A, B, C, D, E)
    const [result] = await db.execute(`
      DELETE FROM products
      WHERE productName IN ('제품 A', '제품 B', '제품 C', '제품 D', '제품 E')
    `);

    // 남은 제품 확인
    const [remaining] = await db.execute('SELECT * FROM products ORDER BY priority DESC, productName ASC');

    res.json({
      success: true,
      message: '테스트 제품 삭제 완료',
      deleted: result.affectedRows,
      remaining: remaining.length,
      products: remaining
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      code: error.code
    });
  }
});

// POST /api/simple-migration/create-departments
router.post('/create-departments', async (req, res) => {
  try {
    const db = await getDB();

    // 1. departments 테이블 생성
    await db.execute(`
      CREATE TABLE IF NOT EXISTS departments (
        id INT AUTO_INCREMENT PRIMARY KEY COMMENT '부서 ID',
        department_name VARCHAR(100) NOT NULL COMMENT '부서명',
        department_code VARCHAR(50) UNIQUE COMMENT '부서코드',
        display_order INT DEFAULT 0 COMMENT '표시 순서',
        is_active BOOLEAN DEFAULT TRUE COMMENT '활성 상태',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
        INDEX idx_department_name (department_name),
        INDEX idx_active (is_active),
        INDEX idx_display_order (display_order)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='부서 마스터'
    `);

    // 2. 기본 부서 데이터 삽입
    const departments = [
      ['영업1팀', 'SALES_1', 1],
      ['영업2팀', 'SALES_2', 2],
      ['영업3팀', 'SALES_3', 3],
      ['관리팀', 'ADMIN', 4],
      ['기술팀', 'TECH', 5]
    ];

    for (const [name, code, order] of departments) {
      await db.execute(
        'INSERT IGNORE INTO departments (department_name, department_code, display_order) VALUES (?, ?, ?)',
        [name, code, order]
      );
    }

    // 3. 확인
    const [result] = await db.execute('SELECT * FROM departments ORDER BY display_order');

    res.json({
      success: true,
      message: 'departments 테이블 생성 완료',
      count: result.length,
      departments: result
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      code: error.code
    });
  }
});

// POST /api/simple-migration/analyze-company-departments
router.post('/analyze-company-departments', async (req, res) => {
  try {
    const db = await getDB();

    // 1. companies 테이블에서 사용 중인 department 값 조회
    const [usedDepartments] = await db.execute(`
      SELECT
        department,
        COUNT(*) as count
      FROM companies
      WHERE department IS NOT NULL AND department != ''
      GROUP BY department
      ORDER BY count DESC
    `);

    // 2. departments 마스터 테이블 조회
    const [masterDepartments] = await db.execute(`
      SELECT * FROM departments ORDER BY display_order
    `);

    // 3. companies 테이블에 있지만 departments 마스터에 없는 부서 찾기
    const masterDeptNames = masterDepartments.map(d => d.department_name);
    const missingInMaster = usedDepartments.filter(
      ud => ud.department && !masterDeptNames.includes(ud.department)
    );

    // 4. departments 마스터에 있지만 companies에서 사용 안 하는 부서
    const usedDeptNames = usedDepartments.map(d => d.department);
    const unusedInMaster = masterDepartments.filter(
      md => !usedDeptNames.includes(md.department_name)
    );

    // 5. 통계
    const [[stats]] = await db.execute(`
      SELECT
        COUNT(*) as total_companies,
        SUM(CASE WHEN department IS NOT NULL AND department != '' THEN 1 ELSE 0 END) as with_department,
        SUM(CASE WHEN department IS NULL OR department = '' THEN 1 ELSE 0 END) as without_department
      FROM companies
    `);

    res.json({
      success: true,
      message: 'companies 테이블 department 분석 완료',
      statistics: stats,
      usedDepartments: usedDepartments,
      masterDepartments: masterDepartments,
      missingInMaster: missingInMaster,
      unusedInMaster: unusedInMaster
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      code: error.code
    });
  }
});

// POST /api/simple-migration/sync-departments-to-master
router.post('/sync-departments-to-master', async (req, res) => {
  try {
    const db = await getDB();

    // 1. companies에서 사용 중인 모든 고유 department 값 가져오기
    const [usedDepartments] = await db.execute(`
      SELECT DISTINCT department
      FROM companies
      WHERE department IS NOT NULL AND department != ''
      ORDER BY department
    `);

    // 2. departments 마스터 테이블의 기존 부서명 조회
    const [existingDepartments] = await db.execute(`
      SELECT department_name FROM departments
    `);
    const existingNames = existingDepartments.map(d => d.department_name);

    // 3. 새로운 부서 추가
    let addedCount = 0;
    let maxOrder = 0;

    // 현재 최대 display_order 조회
    const [[maxOrderResult]] = await db.execute(`
      SELECT COALESCE(MAX(display_order), 0) as max_order FROM departments
    `);
    maxOrder = maxOrderResult.max_order;

    for (const row of usedDepartments) {
      const deptName = row.department;

      if (!existingNames.includes(deptName)) {
        maxOrder++;
        const deptCode = `DEPT_${maxOrder}`;

        await db.execute(`
          INSERT INTO departments (department_name, department_code, display_order)
          VALUES (?, ?, ?)
        `, [deptName, deptCode, maxOrder]);

        addedCount++;
      }
    }

    // 4. 최종 결과 확인
    const [finalDepartments] = await db.execute(`
      SELECT * FROM departments ORDER BY display_order
    `);

    res.json({
      success: true,
      message: 'departments 마스터 테이블 동기화 완료',
      addedCount: addedCount,
      totalDepartments: finalDepartments.length,
      departments: finalDepartments
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      code: error.code
    });
  }
});

// ============================================
// 사용되지 않는 부서 삭제
// ============================================
router.post('/delete-unused-departments', async (req, res) => {
  try {
    const db = await getDB();

    // 1. companies에서 사용 중인 department 값 가져오기
    const [usedDepartments] = await db.execute(`
      SELECT DISTINCT department
      FROM companies
      WHERE department IS NOT NULL AND department != ''
    `);
    const usedDeptNames = usedDepartments.map(d => d.department);

    // 2. departments 마스터 테이블에서 사용되지 않는 부서 찾기
    const [allDepartments] = await db.execute(`
      SELECT id, department_name FROM departments
    `);

    const unusedDepartments = allDepartments.filter(
      dept => !usedDeptNames.includes(dept.department_name)
    );

    // 3. 사용되지 않는 부서 삭제
    let deletedCount = 0;
    const deletedDepartments = [];

    for (const dept of unusedDepartments) {
      await db.execute(
        'DELETE FROM departments WHERE id = ?',
        [dept.id]
      );
      deletedCount++;
      deletedDepartments.push(dept);
    }

    // 4. 최종 부서 목록 조회
    const [finalDepartments] = await db.execute(`
      SELECT * FROM departments ORDER BY display_order
    `);

    res.json({
      success: true,
      message: '사용되지 않는 부서 삭제 완료',
      deletedCount,
      deletedDepartments,
      remainingCount: finalDepartments.length,
      departments: finalDepartments
    });

  } catch (error) {
    console.error('[사용되지 않는 부서 삭제 실패]', error);
    res.status(500).json({
      success: false,
      message: '사용되지 않는 부서 삭제 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

export default router;
