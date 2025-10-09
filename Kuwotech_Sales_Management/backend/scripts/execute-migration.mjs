// Railway 환경에서 마이그레이션 실행
import mysql from 'mysql2/promise';
import fs from 'fs/promises';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL not found');
  process.exit(1);
}

console.log('Using database:', DATABASE_URL.replace(/:[^:@]+@/, ':***@'));

console.log('Connecting to database...');

try {
  const connection = await mysql.createConnection(DATABASE_URL);
  console.log('✅ Connected!\n');

  // 005 실행
  console.log('Executing 005_create_regions_table.sql...');
  const sql005 = await fs.readFile('migrations/005_create_regions_table.sql', 'utf-8');

  const statements = sql005
    .split(';')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--') && s !== '');

  for (const stmt of statements) {
    try {
      await connection.execute(stmt);
      console.log('✓', stmt.substring(0, 60).replace(/\n/g, ' ') + '...');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME' || err.code === 'ER_TABLE_EXISTS_ERROR') {
        console.log('⊘ Already exists:', stmt.substring(0, 40));
      } else {
        throw err;
      }
    }
  }

  // 확인
  const [regions] = await connection.execute('SELECT * FROM regions ORDER BY display_order');
  console.log('\n=== Regions table ===');
  console.table(regions);

  await connection.end();
  console.log('\n✅ Migration complete!');

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
