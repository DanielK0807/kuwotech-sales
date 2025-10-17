// ============================================
// MySQL 데이터베이스 연결 설정 (Connection Pool)
// ============================================

import mysql from "mysql2/promise";

let pool = null;

// 데이터베이스 연결 풀 생성
export const connectDB = async () => {
  if (pool) {
    return pool;
  }

  let retries = 3;
  let lastError = null;

  while (retries > 0) {
    try {
      const poolConfig = {
        uri: process.env.DATABASE_URL,
        waitForConnections: true,
        connectionLimit: 10, // 최대 10개의 동시 연결
        maxIdle: 10,
        idleTimeout: 60000, // 60초
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
        connectTimeout: 30000, // 30초
        acquireTimeout: 30000, // 30초
      };

      pool = mysql.createPool(poolConfig);

      // 연결 테스트
      const conn = await pool.getConnection();
      await conn.ping();
      conn.release();

      console.log("✅ MySQL 데이터베이스 연결 풀 생성 성공");

      // 에러 핸들러 등록
      pool.on("error", (err) => {
        console.error("❌ MySQL 풀 에러:", err.message);
      });

      return pool;
    } catch (error) {
      lastError = error;
      retries--;
      console.error(`❌ MySQL 연결 실패 (${3 - retries}/3):`, error.message);

      if (retries > 0) {
        console.log(`⏳ 5초 후 재시도...`);
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  }

  // 모든 재시도 실패
  console.error("❌ MySQL 연결 최종 실패:", lastError.message);
  throw lastError;
};

// 데이터베이스 연결 가져오기
export const getDB = async () => {
  if (!pool) {
    console.log("🔄 MySQL 풀이 없습니다. 새로 생성합니다...");
    await connectDB();
  }

  try {
    // 연결 테스트
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    return pool;
  } catch (error) {
    console.error("❌ MySQL 풀 연결 테스트 실패:", error.message);
    // 풀 재생성 시도
    pool = null;
    await connectDB();
    return pool;
  }
};

// 데이터베이스 연결 종료
export const closeDB = async () => {
  if (pool) {
    await pool.end();
    pool = null;
    console.log("✅ MySQL 연결 풀 종료");
  }
};
