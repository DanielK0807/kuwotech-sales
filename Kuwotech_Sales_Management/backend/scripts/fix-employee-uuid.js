/**
 * 긴급 복구: employees.id를 UUID로 수동 변환
 * 사용법: node backend/scripts/fix-employee-uuid.js
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function fixEmployeeUuid() {
  let connection;

  try {
    console.log('🔧 employees.id UUID 복구 시작...');

    connection = await mysql.createConnection(process.env.DATABASE_URL);

    // 1. 현재 상태 확인
    const [idCol] = await connection.execute(`
      SELECT DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'employees'
        AND COLUMN_NAME = 'id'
    `);

    console.log('현재 employees.id 타입:', idCol[0]?.DATA_TYPE || 'NOT EXISTS');

    if (!idCol[0]) {
      console.log('❌ employees.id 컬럼이 존재하지 않습니다!');
      console.log('복구 시작...');

      // id 컬럼이 없으면 uuid를 id로 변경
      await connection.execute(`
        ALTER TABLE employees
        ADD COLUMN id VARCHAR(36) NOT NULL FIRST,
        DROP PRIMARY KEY,
        ADD PRIMARY KEY (id)
      `);

      await connection.execute(`
        UPDATE employees SET id = uuid WHERE id IS NULL OR id = ''
      `);

      await connection.execute(`
        ALTER TABLE employees DROP COLUMN IF EXISTS uuid
      `);

      console.log('✅ employees 테이블 복구 완료');
    } else if (idCol[0].DATA_TYPE === 'int') {
      console.log('employees.id가 INT입니다. UUID로 변환 시작...');

      // uuid 컬럼 확인
      const [uuidCol] = await connection.execute(`
        SELECT DATA_TYPE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'employees'
          AND COLUMN_NAME = 'uuid'
      `);

      if (!uuidCol[0]) {
        console.log('❌ uuid 컬럼이 없습니다. 먼저 UUID를 생성해야 합니다.');
        return;
      }

      // kpi_sales 업데이트
      console.log('kpi_sales 업데이트 중...');

      await connection.execute(`
        ALTER TABLE kpi_sales
        ADD COLUMN id_new VARCHAR(36)
      `).catch(() => {});

      await connection.execute(`
        UPDATE kpi_sales k
        INNER JOIN employees e ON k.employeeName = e.name
        SET k.id_new = e.uuid
      `);

      await connection.execute(`ALTER TABLE kpi_sales DROP PRIMARY KEY`);
      await connection.execute(`ALTER TABLE kpi_sales DROP COLUMN id`);
      await connection.execute(`
        ALTER TABLE kpi_sales
        CHANGE COLUMN id_new id VARCHAR(36) NOT NULL,
        ADD PRIMARY KEY (id)
      `);

      // employees 업데이트
      console.log('employees 업데이트 중...');

      await connection.execute(`
        ALTER TABLE employees
        ADD COLUMN id_new VARCHAR(36)
      `).catch(() => {});

      await connection.execute(`UPDATE employees SET id_new = uuid`);

      await connection.execute(`ALTER TABLE employees DROP PRIMARY KEY`);
      await connection.execute(`ALTER TABLE employees DROP COLUMN id`);
      await connection.execute(`
        ALTER TABLE employees
        CHANGE COLUMN id_new id VARCHAR(36) NOT NULL,
        ADD PRIMARY KEY (id)
      `);

      await connection.execute(`ALTER TABLE employees DROP COLUMN uuid`);

      console.log('✅ UUID 변환 완료');
    } else {
      console.log('✅ employees.id가 이미 VARCHAR입니다.');

      // uuid 컬럼 제거
      await connection.execute(`ALTER TABLE employees DROP COLUMN IF EXISTS uuid`).catch(() => {});
    }

    // 최종 확인
    const [finalCheck] = await connection.execute(`
      SELECT DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'employees'
        AND COLUMN_NAME = 'id'
    `);

    console.log('\n✅ 최종 상태: employees.id =', finalCheck[0].DATA_TYPE);

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    console.error(error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

fixEmployeeUuid();
