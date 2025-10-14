/**
 * KPI 테이블 컬럼명 영문화 마이그레이션 실행 스크립트
 * 파일: backend/scripts/run-migration-013.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDB } from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
    let connection;

    try {
        console.log('🔄 마이그레이션 013: KPI 테이블 컬럼명 영문화 시작...\n');

        // 데이터베이스 연결
        connection = await getDB();
        console.log('✅ 데이터베이스 연결 성공\n');

        // 마이그레이션 파일 읽기
        const migrationPath = path.join(__dirname, '../migrations/013_rename_kpi_columns_to_english.sql');
        const sqlContent = fs.readFileSync(migrationPath, 'utf8');

        // SQL을 세미콜론으로 분리 (주석 제거)
        const statements = sqlContent
            .split('\n')
            .filter(line => !line.trim().startsWith('--') && line.trim() !== '')
            .join('\n')
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0);

        console.log(`📄 총 ${statements.length}개의 SQL 문 발견\n`);

        // 각 SQL 문 실행
        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];

            // SELECT 문은 결과를 출력
            if (statement.trim().toUpperCase().startsWith('SELECT')) {
                try {
                    const [rows] = await connection.execute(statement);
                    if (rows && rows.length > 0) {
                        console.log(rows[0].status || rows[0].info || JSON.stringify(rows[0]));
                    }
                    successCount++;
                } catch (error) {
                    console.error(`❌ SQL 실행 오류 (${i + 1}/${statements.length}):`, error.message);
                    errorCount++;
                }
            } else {
                // 다른 SQL 문은 조용히 실행
                try {
                    await connection.execute(statement);
                    successCount++;

                    // 진행 상황 표시 (ALTER, DROP, CREATE 문만)
                    if (statement.toUpperCase().includes('ALTER') ||
                        statement.toUpperCase().includes('DROP') ||
                        statement.toUpperCase().includes('CREATE')) {
                        const firstLine = statement.split('\n')[0].substring(0, 80);
                        console.log(`✓ ${firstLine}${statement.length > 80 ? '...' : ''}`);
                    }
                } catch (error) {
                    console.error(`❌ SQL 실행 오류 (${i + 1}/${statements.length}):`, error.message);
                    console.error(`   SQL: ${statement.substring(0, 100)}...`);
                    errorCount++;

                    // 치명적인 오류인 경우 중단
                    if (error.message.includes('Unknown column') ||
                        error.message.includes('Table') && error.message.includes("doesn't exist")) {
                        throw error;
                    }
                }
            }
        }

        console.log(`\n📊 마이그레이션 결과:`);
        console.log(`   ✅ 성공: ${successCount}개`);
        console.log(`   ❌ 실패: ${errorCount}개`);

        if (errorCount === 0) {
            console.log('\n✅ 마이그레이션 013 완료!\n');

            // 검증: 테이블 구조 확인
            console.log('🔍 변경사항 검증 중...\n');

            const [salesCols] = await connection.execute('SHOW COLUMNS FROM kpi_sales');
            const [adminCols] = await connection.execute('SHOW COLUMNS FROM kpi_admin');

            console.log('📋 KPI_SALES 테이블 컬럼 (처음 5개):');
            salesCols.slice(0, 5).forEach(col => {
                console.log(`   - ${col.Field} (${col.Type})`);
            });

            console.log('\n📋 KPI_ADMIN 테이블 컬럼 (처음 5개):');
            adminCols.slice(0, 5).forEach(col => {
                console.log(`   - ${col.Field} (${col.Type})`);
            });

            // 영문 컬럼명 확인
            const englishColumns = [
                'assignedCompanies', 'activeCompanies', 'activationRate',
                'mainProductCompanies', 'accumulatedSales'
            ];

            const hasEnglishCols = englishColumns.every(col =>
                salesCols.some(c => c.Field === col)
            );

            if (hasEnglishCols) {
                console.log('\n✅ 영문 컬럼명 변경 확인 완료!');
            } else {
                console.log('\n⚠️ 일부 컬럼명이 변경되지 않았습니다.');
            }

        } else {
            console.log('\n⚠️ 일부 SQL 문 실행에 실패했습니다. 로그를 확인해주세요.');
        }

    } catch (error) {
        console.error('\n❌ 마이그레이션 실패:', error.message);
        console.error(error.stack);
        process.exit(1);
    } finally {
        console.log('\n🔚 마이그레이션 스크립트 종료');
        process.exit(0);
    }
}

// 실행
runMigration();
