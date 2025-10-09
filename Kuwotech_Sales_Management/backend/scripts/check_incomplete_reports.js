#!/usr/bin/env node
// ============================================
// 미완료 보고서 빠른 조회 스크립트
// ============================================

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function checkIncompleteReports() {
  let connection;

  try {
    console.log('🔍 데이터베이스 연결 중...\n');

    connection = await mysql.createConnection({
      uri: process.env.DATABASE_URL,
      timezone: '+09:00'
    });

    console.log('✅ 연결 성공\n');
    console.log('==========================================');
    console.log('  미완료 보고서 조회');
    console.log('==========================================\n');

    // 미완료 보고서 조회 (상태가 '임시저장' 또는 '제출완료')
    const [reports] = await connection.execute(`
      SELECT
        report_id,
        report_type,
        company_name,
        submitted_by,
        submitted_date,
        status,
        target_collection_amount,
        target_sales_amount,
        activity_notes
      FROM reports
      WHERE status IN ('임시저장', '제출완료')
      ORDER BY submitted_date DESC
      LIMIT 10
    `);

    if (reports.length === 0) {
      console.log('✅ 미완료 보고서가 없습니다.\n');
      return;
    }

    console.log(`📊 총 ${reports.length}개의 미완료 보고서 발견\n`);

    reports.forEach((report, index) => {
      console.log(`[${index + 1}] 보고서 ID: ${report.report_id}`);
      console.log(`    유형: ${report.report_type}`);
      console.log(`    거래처: ${report.company_name}`);
      console.log(`    작성자: ${report.submitted_by}`);
      console.log(`    제출일: ${report.submitted_date}`);
      console.log(`    상태: ${report.status}`);
      console.log(`    목표수금: ${report.target_collection_amount?.toLocaleString() || 0}원`);
      console.log(`    목표매출: ${report.target_sales_amount?.toLocaleString() || 0}원`);
      console.log('');
    });

    console.log('==========================================\n');

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    console.error('   스택:', error.stack);
  } finally {
    if (connection) {
      await connection.end();
      console.log('✅ 연결 종료');
    }
  }
}

// 실행
checkIncompleteReports();
