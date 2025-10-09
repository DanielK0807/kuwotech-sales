// ============================================
// 마스터 데이터 컨트롤러 (제품, 지역 등)
// ============================================

import { getDB } from '../config/database.js';

/**
 * 전체 제품 목록 조회
 * GET /api/master/products
 */
export const getAllProducts = async (req, res) => {
  try {
    const db = await getDB();
    
    const [products] = await db.execute(
      'SELECT id, productName, category, priority, isActive FROM products ORDER BY priority DESC, productName ASC'
    );
    
    res.json({
      success: true,
      products
    });
    
  } catch (error) {
    console.error('[제품 목록 조회 실패]', error);
    res.status(500).json({
      success: false,
      message: '제품 목록 조회 중 오류가 발생했습니다.'
    });
  }
};

/**
 * 활성 제품만 조회
 * GET /api/master/products/active
 */
export const getActiveProducts = async (req, res) => {
  try {
    const db = await getDB();
    
    const [products] = await db.execute(
      'SELECT id, productName, category, priority FROM products WHERE isActive = TRUE ORDER BY priority DESC, productName ASC'
    );
    
    res.json({
      success: true,
      products
    });
    
  } catch (error) {
    console.error('[활성 제품 조회 실패]', error);
    res.status(500).json({
      success: false,
      message: '활성 제품 조회 중 오류가 발생했습니다.'
    });
  }
};

/**
 * 시/도 지역 목록 조회
 * GET /api/master/regions
 */
export const getRegions = async (req, res) => {
  try {
    const db = await getDB();
    
    const [regions] = await db.execute(
      'SELECT id, region_name, region_code, display_order FROM regions WHERE is_active = TRUE ORDER BY display_order ASC'
    );
    
    res.json({
      success: true,
      regions
    });
    
  } catch (error) {
    console.error('[지역 목록 조회 실패]', error);
    res.status(500).json({
      success: false,
      message: '지역 목록 조회 중 오류가 발생했습니다.'
    });
  }
};

/**
 * 부서 목록 조회
 * GET /api/master/departments
 */
export const getDepartments = async (req, res) => {
  try {
    const db = await getDB();
    
    const [departments] = await db.execute(
      'SELECT id, department_name, department_code, display_order FROM departments WHERE is_active = TRUE ORDER BY display_order ASC'
    );
    
    res.json({
      success: true,
      departments
    });
    
  } catch (error) {
    console.error('[부서 목록 조회 실패]', error);
    res.status(500).json({
      success: false,
      message: '부서 목록 조회 중 오류가 발생했습니다.'
    });
  }
};
