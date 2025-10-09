// ============================================
// MySQL 데이터베이스 연결 설정
// ============================================

import mysql from 'mysql2/promise';

let connection = null;

// 연결 상태 확인
const isConnectionAlive = async (conn) => {
  try {
    await conn.ping();
    return true;
  } catch (error) {
    return false;
  }
};

// 데이터베이스 연결 생성
export const connectDB = async () => {
  // 기존 연결이 있고 살아있으면 반환
  if (connection && await isConnectionAlive(connection)) {
    return connection;
  }

  // 기존 연결이 죽었으면 정리
  if (connection) {
    try {
      await connection.end();
    } catch (error) {
      // 이미 끊어진 연결이므로 무시
    }
    connection = null;
  }

  try {
    connection = await mysql.createConnection(process.env.DATABASE_URL);
    console.log('✅ MySQL 데이터베이스 연결 성공');

    // 연결 에러 핸들러 등록
    connection.on('error', (err) => {
      console.error('❌ MySQL 연결 에러:', err);
      if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNRESET') {
        connection = null;
      }
    });

    return connection;
  } catch (error) {
    console.error('❌ MySQL 연결 실패:', error.message);
    throw error;
  }
};

// 데이터베이스 연결 가져오기 (재연결 로직 포함)
export const getDB = async () => {
  // 연결이 없거나 죽었으면 재연결
  if (!connection || !(await isConnectionAlive(connection))) {
    console.log('🔄 MySQL 재연결 시도...');
    await connectDB();
  }
  return connection;
};

// 데이터베이스 연결 종료
export const closeDB = async () => {
  if (connection) {
    await connection.end();
    connection = null;
    console.log('✅ MySQL 연결 종료');
  }
};
