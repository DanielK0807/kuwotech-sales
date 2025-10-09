// ============================================
// 엑셀 업로드 라우트
// ============================================
// POST /api/upload/excel
// - 권한: canUploadExcel = TRUE (강정환만)
// - 파일: .xlsx, .xls
// - UPSERT: 신규 추가 + 기존 업데이트
// - 변경 추적: change_history 테이블에 기록
// ============================================

import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { authenticate, requireExcelPermission } from '../middleware/auth.middleware.js';
import { uploadExcel } from '../controllers/upload.controller.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================
// Multer 설정 (파일 업로드)
// ============================================

// 임시 저장 디렉토리 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // backend/uploads 디렉토리에 임시 저장
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: (req, file, cb) => {
    // 파일명: timestamp_originalname
    const uniqueName = `${Date.now()}_${file.originalname}`;
    cb(null, uniqueName);
  }
});

// 파일 필터 (Excel만 허용)
const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.xlsx', '.xls'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedExtensions.includes(ext)) {
    cb(null, true); // 허용
  } else {
    cb(new Error('엑셀 파일만 업로드 가능합니다 (.xlsx, .xls)'), false);
  }
};

// Multer 인스턴스
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB 제한
  }
});

// ============================================
// 라우트 정의
// ============================================

// POST /api/upload/excel
// - 인증 필요 (authenticate)
// - 엑셀 업로드 권한 필요 (requireExcelPermission)
// - 단일 파일 업로드 (upload.single('file'))
router.post(
  '/excel',
  authenticate,
  requireExcelPermission,
  upload.single('file'),
  uploadExcel
);

export default router;
