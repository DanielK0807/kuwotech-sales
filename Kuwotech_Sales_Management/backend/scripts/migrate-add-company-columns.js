#!/usr/bin/env node
/**
 * Companies 테이블 컬럼 추가 마이그레이션
 * 추가 컬럼:
 * - 사업자등록번호 VARCHAR(12)
 * - 상세주소 TEXT
 * - 전화번호 VARCHAR(20)
 * - 소개경로 VARCHAR(100)
 */

import { getDB } from '../config/database.js';

async function addCompanyColumns() {
    let connection;

    try {
        console.log('🔄 Companies 테이블 컬럼 추가 시작...\n');

        connection = await getDB();

        // 현재 테이블 구조 확인
        console.log('📊 현재 테이블 구조 확인 중...');
        const [currentColumns] = await connection.execute(
            `SHOW COLUMNS FROM companies`
        );

        console.log('현재 컬럼 목록:');
        currentColumns.forEach(col => {
            console.log(`  - ${col.Field} (${col.Type})`);
        });
        console.log('');

        // 컬럼 추가
        console.log('➕ 새 컬럼 추가 중...');

        const alterQueries = [
            {
                name: '사업자등록번호',
                query: `ALTER TABLE companies ADD COLUMN IF NOT EXISTS 사업자등록번호 VARCHAR(12) COMMENT '사업자등록번호 (형식: 123-45-67890)'`
            },
            {
                name: '상세주소',
                query: `ALTER TABLE companies ADD COLUMN IF NOT EXISTS 상세주소 TEXT COMMENT '회사 상세 주소'`
            },
            {
                name: '전화번호',
                query: `ALTER TABLE companies ADD COLUMN IF NOT EXISTS 전화번호 VARCHAR(20) COMMENT '회사 대표 전화번호'`
            },
            {
                name: '소개경로',
                query: `ALTER TABLE companies ADD COLUMN IF NOT EXISTS 소개경로 VARCHAR(100) COMMENT '소개해준 사람 또는 방법'`
            }
        ];

        // MySQL 8.0.12 미만에서는 IF NOT EXISTS를 지원하지 않으므로
        // 각 컬럼이 존재하는지 먼저 확인
        const existingColumns = currentColumns.map(col => col.Field);

        for (const { name, query } of alterQueries) {
            if (existingColumns.includes(name)) {
                console.log(`  ⏭️  ${name} 컬럼 이미 존재 - 건너뜀`);
            } else {
                // IF NOT EXISTS 제거한 쿼리 사용
                const simpleQuery = query.replace(' IF NOT EXISTS', '');
                await connection.execute(simpleQuery);
                console.log(`  ✅ ${name} 컬럼 추가 완료`);
            }
        }

        console.log('\n📊 업데이트된 테이블 구조:');
        const [updatedColumns] = await connection.execute(
            `SHOW COLUMNS FROM companies`
        );

        updatedColumns.forEach(col => {
            const isNew = !existingColumns.includes(col.Field);
            const marker = isNew ? '🆕' : '  ';
            console.log(`${marker} ${col.Field} (${col.Type})`);
        });

        console.log('\n✅ 마이그레이션 완료!');
        process.exit(0);

    } catch (error) {
        console.error('\n❌ 마이그레이션 실패:', error.message);
        console.error(error);
        process.exit(1);
    }
}

// 스크립트 실행
addCompanyColumns();
