import mysql from 'mysql2/promise';

const DATABASE_URL = 'mysql://root:fhaFrmwqCwYyOSjxySzEOyKjSpOGxcwP@mysql.railway.internal:3306/railway';

async function checkReports() {
  try {
    const connection = await mysql.createConnection(DATABASE_URL);
    console.log('✅ 데이터베이스 연결 성공\n');

    const [rows] = await connection.execute(
      `SELECT
        reportId,
        reportType,
        companyName,
        submittedBy,
        submittedDate,
        status,
        targetCollectionAmount,
        targetSalesAmount
      FROM reports
      WHERE submittedBy = ?
      ORDER BY submittedDate DESC`,
      ['강민']
    );

    console.log(`📊 강민님이 작성한 보고서: ${rows.length}개\n`);

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

    await connection.end();
  } catch (error) {
    console.error('❌ 에러 발생:', error.message);
  }
}

checkReports();
