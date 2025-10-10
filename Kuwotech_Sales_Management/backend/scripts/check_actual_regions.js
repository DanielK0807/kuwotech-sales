// ============================================
// 실제 companies 테이블의 customerRegion 값 확인 스크립트
// ============================================

import { getDB } from '../config/database.js';

async function checkActualRegions() {
    try {
        console.log('📊 데이터베이스 연결 중...\n');
        const db = await getDB();

        // 1. 현재 사용 중인 customerRegion 값 조회 (앞 부분만 추출)
        const [rawRegions] = await db.execute(`
            SELECT customerRegion, COUNT(*) as count
            FROM companies
            WHERE customerRegion IS NOT NULL
              AND customerRegion != ''
            GROUP BY customerRegion
            ORDER BY customerRegion
        `);

        // customerRegion에서 첫 번째 공백 이전 값만 추출 (예: "서울 강남구" -> "서울")
        const regionMap = new Map();
        rawRegions.forEach(row => {
            const fullRegion = row.customerRegion;
            const mainRegion = fullRegion.split(' ')[0].trim(); // 첫 번째 공백 이전 값

            if (regionMap.has(mainRegion)) {
                regionMap.set(mainRegion, regionMap.get(mainRegion) + row.count);
            } else {
                regionMap.set(mainRegion, row.count);
            }
        });

        // Map을 배열로 변환하고 정렬
        const regions = Array.from(regionMap.entries())
            .map(([customerRegion, count]) => ({ customerRegion, count }))
            .sort((a, b) => a.customerRegion.localeCompare(b.customerRegion, 'ko'));

        console.log('✅ 현재 companies 테이블에서 사용 중인 고객사 지역:\n');
        console.log('순번 | 지역명 | 거래처 수');
        console.log('-----|--------|----------');
        regions.forEach((row, i) => {
            console.log(`${String(i + 1).padStart(4)} | ${row.customerRegion.padEnd(20)} | ${row.count}개`);
        });

        console.log(`\n총 ${regions.length}개의 지역이 사용 중입니다.\n`);

        // 2. regions 마스터 테이블 현재 데이터 조회
        console.log('📋 현재 regions 마스터 테이블:\n');
        const [masterRegions] = await db.execute(`
            SELECT id, region_name, region_code, display_order, is_active
            FROM regions
            ORDER BY display_order
        `);

        console.log('ID | 지역명 | 코드 | 순서 | 활성');
        console.log('---|--------|------|------|------');
        masterRegions.forEach((row) => {
            console.log(`${String(row.id).padStart(2)} | ${row.region_name.padEnd(20)} | ${(row.region_code || '').padEnd(10)} | ${String(row.display_order).padStart(4)} | ${row.is_active ? 'Y' : 'N'}`);
        });

        console.log(`\n총 ${masterRegions.length}개의 마스터 지역이 등록되어 있습니다.\n`);

        // 3. 불일치 확인
        const actualRegionNames = new Set(regions.map(r => r.customerRegion));
        const masterRegionNames = new Set(masterRegions.map(r => r.region_name));

        const onlyInActual = [...actualRegionNames].filter(r => !masterRegionNames.has(r));
        const onlyInMaster = [...masterRegionNames].filter(r => !actualRegionNames.has(r));

        if (onlyInActual.length > 0) {
            console.log('⚠️  실제 데이터에는 있지만 마스터 테이블에는 없는 지역:');
            onlyInActual.forEach(r => console.log(`   - ${r}`));
            console.log('');
        }

        if (onlyInMaster.length > 0) {
            console.log('⚠️  마스터 테이블에는 있지만 실제 데이터에는 없는 지역:');
            onlyInMaster.forEach(r => console.log(`   - ${r}`));
            console.log('');
        }

        if (onlyInActual.length === 0 && onlyInMaster.length === 0) {
            console.log('✅ 마스터 테이블과 실제 데이터가 일치합니다!\n');
        }

        // 4. UPDATE SQL 생성
        console.log('📝 regions 테이블 업데이트를 위한 SQL:\n');
        console.log('-- Step 1: 기존 데이터 삭제');
        console.log('TRUNCATE TABLE regions;\n');
        console.log('-- Step 2: 실제 데이터 기반으로 INSERT');
        console.log('INSERT INTO regions (region_name, region_code, display_order, is_active) VALUES');

        const insertValues = regions.map((row, i) => {
            const regionName = row.customerRegion;
            const regionCode = regionName.toUpperCase().replace(/\s+/g, '_');
            return `('${regionName}', '${regionCode}', ${i + 1}, TRUE)`;
        });

        console.log(insertValues.join(',\n') + ';\n');

        await db.end();
        console.log('✅ 완료!');

    } catch (error) {
        console.error('❌ 오류 발생:', error);
        process.exit(1);
    }
}

checkActualRegions();
