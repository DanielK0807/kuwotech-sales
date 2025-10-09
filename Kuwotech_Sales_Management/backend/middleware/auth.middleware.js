// ============================================
// 인증 미들웨어
// ============================================

import jwt from 'jsonwebtoken';

// JWT 토큰 검증 미들웨어
export const authenticate = (req, res, next) => {
  try {
    // Authorization 헤더에서 토큰 추출
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: '인증 토큰이 필요합니다.'
      });
    }

    const token = authHeader.substring(7); // "Bearer " 제거

    // 토큰 검증
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // req.user에 사용자 정보 저장
    req.user = {
      name: decoded.name,
      role: decoded.role,
      canUploadExcel: decoded.canUploadExcel
    };

    next();

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: '토큰이 만료되었습니다. 다시 로그인해주세요.'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: '유효하지 않은 토큰입니다.'
      });
    }

    console.error('인증 미들웨어 오류:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: '인증 처리 중 오류가 발생했습니다.'
    });
  }
};

// 역할 기반 접근 제어 미들웨어
export const requireRole = (requiredRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: '인증이 필요합니다.'
      });
    }

    if (req.user.role !== requiredRole) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `${requiredRole} 권한이 필요합니다.`
      });
    }

    next();
  };
};

// 엑셀 업로드 권한 확인 미들웨어
export const requireExcelPermission = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: '인증이 필요합니다.'
    });
  }

  if (!req.user.canUploadExcel) {
    return res.status(403).json({
      error: 'Forbidden',
      message: '엑셀 업로드 권한이 없습니다.'
    });
  }

  next();
};
