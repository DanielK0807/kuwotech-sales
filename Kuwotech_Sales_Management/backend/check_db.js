import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function checkReports() {
  let connection;
  try {
    console.log('🔗 데이터베이스 연결 시도...');
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? '설정됨' : '없음');

    connection = await mysql.createConnection({
      host: 'mysql.railway.internal',
      user: 'root',
      password: 'fhaFrmwqCwYyOSjxySzEOyKjSpOGxcwP',
      database: 'railway',
      connectTimeout: 10000
    });

    console.log('✅ 데이터베이스 연결 성공\n');

    // 전체 보고서 수 확인
    const [countResult] = await connection.execute(
      'SELECT COUNT(*) as total FROM reports'
    );
    console.log(`📊 전체 보고서 수: ${countResult[0].total}개\n`);

    // 강민의 보고서 조회
    const [rows] = await connection.execute(
      `SELECT
        reportId,
        reportType,
        companyName,
        submittedBy,
        DATE_FORMAT(submittedDate, '%Y-%m-%d') as submittedDate,
        status,
        targetCollectionAmount,
        targetSalesAmount
      FROM reports
      WHERE submittedBy = ?
      ORDER BY submittedDate DESC`,
      ['강민']
    );

    console.log(`📋 강민님이 작성한 보고서: ${rows.length}개\n`);

    if (rows.length === 0) {
      console.log('❌ 보고서가 없습니다.');
    } else {
      rows.forEach((report, index) => {
        console.log(`\n[보고서 #${index + 1}]`);
        console.log(`  - ID: ${report.reportId}`);
        console.log(`  - 유형: ${report.reportType}`);
        console.log(`  - 거래처: ${report.companyName}`);
        console.log(`  - 제출일: ${report.submittedDate}`);
        console.log(`  - 상태: ${report.status}`);
        console.log(`  - 목표수금액: ${report.targetCollectionAmount}원`);
        console.log(`  - 목표매출액: ${report.targetSalesAmount}원`);
      });
    }

  } catch (error) {
    console.error('❌ 에러 발생:', error.message);
    console.error('에러 코드:', error.code);
    console.error('전체 에러:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 데이터베이스 연결 종료');
    }
  }
}

checkReports();
