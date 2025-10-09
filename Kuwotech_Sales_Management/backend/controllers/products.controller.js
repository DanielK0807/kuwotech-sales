// ============================================
// 제품 컨트롤러
// ============================================

import { getDB } from '../config/database.js';

// GET /api/products - 제품 목록 조회
export const getProducts = async (req, res) => {
  try {
    const db = await getDB();

    // 활성 제품만 조회, 우선순위와 이름 순으로 정렬
    const [products] = await db.execute(
      `SELECT id, productName, category, priority
       FROM products
       WHERE isActive = TRUE
       ORDER BY priority DESC, productName ASC`
    );

    res.json({
      success: true,
      data: products
    });

  } catch (error) {
    console.error('제품 목록 조회 오류:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '제품 목록 조회 중 오류가 발생했습니다.'
    });
  }
};

// POST /api/products - 새 제품 추가
export const addProduct = async (req, res) => {
  try {
    const { productName, category } = req.body;

    // 입력 검증
    if (!productName || !productName.trim()) {
      return res.status(400).json({
        error: 'Bad Request',
        message: '제품명을 입력해주세요.'
      });
    }

    // 제품명 정규화 (앞뒤 공백 제거, 중간 공백 하나로 통일)
    const normalizedName = productName.trim().replace(/\s+/g, ' ');

    const db = await getDB();

    // 중복 확인 (대소문자 구분 없이)
    const [existing] = await db.execute(
      'SELECT id, productName FROM products WHERE LOWER(productName) = LOWER(?)',
      [normalizedName]
    );

    if (existing.length > 0) {
      // 이미 존재하는 제품 반환
      return res.json({
        success: true,
        message: '이미 등록된 제품입니다.',
        data: existing[0],
        isExisting: true
      });
    }

    // 새 제품 추가
    const [result] = await db.execute(
      `INSERT INTO products (productName, category, priority, isActive)
       VALUES (?, ?, 0, TRUE)`,
      [normalizedName, category || '일반제품']
    );

    // 추가된 제품 조회
    const [newProduct] = await db.execute(
      'SELECT id, productName, category, priority FROM products WHERE id = ?',
      [result.insertId]
    );

    console.log(`✅ 새 제품 추가: ${normalizedName}`);

    res.status(201).json({
      success: true,
      message: '제품이 등록되었습니다.',
      data: newProduct[0],
      isExisting: false
    });

  } catch (error) {
    console.error('제품 추가 오류:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '제품 추가 중 오류가 발생했습니다.'
    });
  }
};
