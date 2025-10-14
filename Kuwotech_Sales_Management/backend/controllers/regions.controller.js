// ============================================
// 지역 컨트롤러
// ============================================

import { getDB } from '../config/database.js';

// GET /api/regions - 전체 지역 조회
export const getAllRegions = async (req, res) => {
  try {
    const db = await getDB();

    const [regions] = await db.execute(`
      SELECT id, province, district, description
      FROM regions
      ORDER BY id ASC
    `);

    console.log(`[지역 조회] ${regions.length}개 지역 로드 완료`);

    res.json({
      success: true,
      count: regions.length,
      data: regions
    });

  } catch (error) {
    console.error('지역 조회 오류:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '지역 조회 중 오류가 발생했습니다.',
      details: error.message
    });
  }
};

// GET /api/regions/:id - 특정 지역 조회
export const getRegionById = async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDB();

    const [regions] = await db.execute(`
      SELECT id, province, district, description
      FROM regions
      WHERE id = ?
    `, [id]);

    if (regions.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: '지역을 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      data: regions[0]
    });

  } catch (error) {
    console.error('지역 조회 오류:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '지역 조회 중 오류가 발생했습니다.',
      details: error.message
    });
  }
};
