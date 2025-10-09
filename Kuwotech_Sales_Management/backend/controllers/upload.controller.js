// ============================================
// 엑셀 업로드 컨트롤러
// ============================================
// POST /api/upload/excel - 엑셀 파일 업로드 및 UPSERT
// 권한: canUploadExcel = TRUE
// ============================================

import { upsertCompaniesFromExcel, upsertEmployeesFromExcel } from '../services/excel-upload.service.js';
import { unlink } from 'fs/promises';

// 엑셀 파일 업로드 및 데이터 UPSERT
export const uploadExcel = async (req, res) => {
  let filePath = null;

  try {
    // 파일 존재 확인
    if (!req.file) {
      return res.status(400).json({
        error: 'Bad Request',
        message: '엑셀 파일이 업로드되지 않았습니다.'
      });
    }

    filePath = req.file.path;
    const uploadedBy = req.user.name; // JWT 토큰에서 사용자 이름 추출

    console.log(`📥 엑셀 업로드 시작: ${req.file.originalname} by ${uploadedBy}`);

    // 거래처 데이터 UPSERT
    console.log('🏢 거래처 데이터 처리 중...');
    const companyResults = await upsertCompaniesFromExcel(filePath, uploadedBy);

    // 직원 데이터 UPSERT
    console.log('👥 직원 데이터 처리 중...');
    const employeeResults = await upsertEmployeesFromExcel(filePath, uploadedBy);

    // 업로드된 파일 삭제
    await unlink(filePath);
    console.log(`✅ 임시 파일 삭제 완료: ${filePath}`);

    // 결과 반환
    res.status(200).json({
      success: true,
      message: '엑셀 데이터 업로드 완료',
      uploadedBy,
      results: {
        companies: {
          totalRows: companyResults.totalRows,
          inserted: companyResults.inserted,
          updated: companyResults.updated,
          skipped: companyResults.skipped,
          errors: companyResults.errors,
          changes: companyResults.changes
        },
        employees: {
          totalRows: employeeResults.totalRows,
          inserted: employeeResults.inserted,
          updated: employeeResults.updated,
          skipped: employeeResults.skipped,
          errors: employeeResults.errors,
          changes: employeeResults.changes
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ 엑셀 업로드 실패:', error);

    // 에러 발생 시 임시 파일 삭제
    if (filePath) {
      try {
        await unlink(filePath);
        console.log(`🗑️ 에러 발생 - 임시 파일 삭제: ${filePath}`);
      } catch (unlinkError) {
        console.error('임시 파일 삭제 실패:', unlinkError);
      }
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || '엑셀 업로드 중 오류가 발생했습니다.',
      timestamp: new Date().toISOString()
    });
  }
};
