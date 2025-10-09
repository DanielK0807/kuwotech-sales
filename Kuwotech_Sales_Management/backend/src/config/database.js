// ============================================
// MySQL Connection Pool 설정
// ============================================
// 네비게이션:
// 1. Connection Pool 생성
// 2. 연결 테스트 함수
// 3. 쿼리 실행 헬퍼
// 4. 트랜잭션 헬퍼
// ============================================

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// ============================================
// MySQL Connection Pool 생성
// ============================================
export const pool = mysql.createPool({
  uri: process.env.DATABASE_URL,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  // 추가 설정
  connectTimeout: 10000,
  timezone: '+09:00'
});

// ============================================
// 연결 테스트 함수
// ============================================
export const testConnection = async () => {
  let connection;
  try {
    connection = await pool.getConnection();
    console.log('✅ MySQL Pool 연결 성공');
    await connection.ping();
    console.log('✅ MySQL Pool 핑 성공');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ MySQL Pool 연결 실패:', error.message);
    return false;
  }
};

// ============================================
// 쿼리 실행 헬퍼
// ============================================
export const query = async (sql, params = []) => {
  try {
    const [results] = await pool.execute(sql, params);
    return results;
  } catch (error) {
    console.error('❌ 쿼리 실행 오류:', error);
    console.error('SQL:', sql);
    console.error('Params:', params);
    throw error;
  }
};

// ============================================
// 트랜잭션 헬퍼
// ============================================
export const transaction = async (callback) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    console.error('❌ 트랜잭션 오류:', error);
    throw error;
  } finally {
    connection.release();
  }
};

// ============================================
// 다중 쿼리 실행 헬퍼
// ============================================
export const queryMultiple = async (queries) => {
  const connection = await pool.getConnection();
  
  try {
    const results = [];
    for (const { sql, params } of queries) {
      const [result] = await connection.execute(sql, params || []);
      results.push(result);
    }
    return results;
  } catch (error) {
    console.error('❌ 다중 쿼리 실행 오류:', error);
    throw error;
  } finally {
    connection.release();
  }
};

// ============================================
// Pool 종료 함수
// ============================================
export const closePool = async () => {
  try {
    await pool.end();
    console.log('✅ MySQL Pool 종료 완료');
  } catch (error) {
    console.error('❌ MySQL Pool 종료 실패:', error);
    throw error;
  }
};

// ============================================
// 기본 Export
// ============================================
export default pool;
