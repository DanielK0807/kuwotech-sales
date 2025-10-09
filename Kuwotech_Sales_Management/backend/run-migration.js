/**
 * KPI 테이블 마이그레이션 실행 스크립트
 * 사용법: node run-migration.js
 */

import dotenv from 'dotenv';
dotenv.config(); // 환경변수 먼저 로드!

import { getDB } from './config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
    let connection;

    try {
        console.log('🚀 KPI 테이블 마이그레이션 시작...\n');

        // SQL 파일 읽기
        const sqlFilePath = path.join(__dirname, 'migrations', '004_create_kpi_tables.sql');
        const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

        // SQL 문을 세미콜론으로 분리
        const statements = sqlContent
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

        connection = await getDB(); // getDB()가 이미 connection을 반환

        console.log(`📄 총 ${statements.length}개의 SQL 문 실행 중...\n`);

        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < statements.length; i++) {
            const stmt = statements[i];

            // 주석 및 빈 문장 스킵
            if (stmt.startsWith('--') || stmt.length < 10) continue;

            try {
                // SELECT 문은 결과 출력
                if (stmt.trim().toUpperCase().startsWith('SELECT')) {
                    const [rows] = await connection.query(stmt);
                    console.log(`✅ [${i + 1}/${statements.length}] SELECT 실행 완료`);
                    console.log('   결과:', rows);
                } else {
                    await connection.query(stmt);

                    // 실행된 명령 타입 감지
                    let cmdType = 'QUERY';
                    if (stmt.includes('CREATE TABLE')) cmdType = 'CREATE TABLE';
                    else if (stmt.includes('CREATE VIEW')) cmdType = 'CREATE VIEW';
                    else if (stmt.includes('DROP TABLE')) cmdType = 'DROP TABLE';
                    else if (stmt.includes('DROP VIEW')) cmdType = 'DROP VIEW';
                    else if (stmt.includes('INSERT')) cmdType = 'INSERT';
                    else if (stmt.includes('ALTER TABLE')) cmdType = 'ALTER TABLE';

                    console.log(`✅ [${i + 1}/${statements.length}] ${cmdType} 실행 완료`);
                }

                successCount++;
            } catch (error) {
                errorCount++;
                console.error(`❌ [${i + 1}/${statements.length}] 실행 실패:`, error.message);
                console.error('   SQL:', stmt.substring(0, 100) + '...');
            }
        }

        console.log('\n' + '='.repeat(50));
        console.log(`✅ 성공: ${successCount}개`);
        console.log(`❌ 실패: ${errorCount}개`);
        console.log('='.repeat(50) + '\n');

        // 생성된 테이블 확인
        console.log('📊 생성된 테이블 확인:\n');

        const [tables] = await connection.query("SHOW TABLES LIKE 'kpi%'");
        console.log('테이블:', tables);

        const [views] = await connection.query("SHOW FULL TABLES WHERE TABLE_TYPE LIKE 'VIEW'");
        console.log('뷰:', views);

        console.log('\n✅ 마이그레이션 완료!');
        console.log('\n다음 단계: npm run dev 로 서버 시작 후');
        console.log('curl -X POST http://localhost:3000/api/kpi/refresh-all 실행\n');

    } catch (error) {
        console.error('❌ 마이그레이션 실패:', error);
        throw error;
    } finally {
        // connection.release()는 필요 없음 (Pool이 아니므로)
        process.exit(0);
    }
}

runMigration();
