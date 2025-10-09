// ============================================
// 엑셀 파일 구조 분석 스크립트
// ============================================
// 실행: node backend/scripts/analyze-excel.js
// 목적: Excel 파일 구조 분석 및 JSON 출력
// ============================================

import XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXCEL_PATH = path.join(__dirname, '../../01.Original_data/영업관리기초자료.xlsx');
const OUTPUT_DIR = path.join(__dirname, '../logs');
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'excel-structure.json');

console.log('📊 엑셀 파일 구조 분석 시작\n');

try {
  // ==========================================
  // 1. logs 디렉토리 생성
  // ==========================================
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log('✅ logs 디렉토리 생성 완료\n');
  }

  // ==========================================
  // 2. 엑셀 파일 읽기
  // ==========================================
  console.log('1️⃣  엑셀 파일 읽기 중...');
  const workbook = XLSX.readFile(EXCEL_PATH);
  console.log(`   ✅ 파일 로드 완료: ${EXCEL_PATH}`);
  console.log(`   📋 시트 목록: ${workbook.SheetNames.join(', ')}\n`);

  const analysisResult = {
    fileName: '영업관리기초자료.xlsx',
    analyzedAt: new Date().toISOString(),
    sheets: []
  };

  // ==========================================
  // 3. 각 시트 분석
  // ==========================================
  for (const sheetName of workbook.SheetNames) {
    console.log(`2️⃣  "${sheetName}" 시트 분석 중...`);

    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    const sheetAnalysis = {
      sheetName,
      rowCount: data.length,
      columns: [],
      sampleData: data.slice(0, 3), // 처음 3개 행
      dataTypes: {},
      statistics: {}
    };

    if (data.length > 0) {
      // 칼럼 정보 추출
      const firstRow = data[0];
      sheetAnalysis.columns = Object.keys(firstRow);

      // 데이터 타입 분석
      for (const col of sheetAnalysis.columns) {
        const values = data.map(row => row[col]).filter(v => v != null);
        const nonEmptyCount = values.length;
        const emptyCount = data.length - nonEmptyCount;

        // 타입 추정
        const types = new Set(values.map(v => {
          if (typeof v === 'number') return 'number';
          if (typeof v === 'string') {
            // UUID 형식 체크 (8-4-4-4-12)
            if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)) {
              return 'uuid';
            }
            // 날짜 형식 체크
            if (/^\d{4}-\d{2}-\d{2}/.test(v)) return 'date';
            // 숫자 문자열 체크
            if (/^[\d,]+$/.test(v)) return 'numeric-string';
            return 'string';
          }
          if (v instanceof Date) return 'date';
          return 'unknown';
        }));

        sheetAnalysis.dataTypes[col] = {
          types: Array.from(types),
          nonEmptyCount,
          emptyCount,
          fillRate: ((nonEmptyCount / data.length) * 100).toFixed(1) + '%'
        };

        // UUID 필드인 경우 추가 정보
        if (types.has('uuid')) {
          sheetAnalysis.dataTypes[col].isUUID = true;
          sheetAnalysis.dataTypes[col].sampleUUID = values[0];
        }

        // 통계 정보
        if (types.has('number')) {
          const numbers = values.filter(v => typeof v === 'number');
          sheetAnalysis.statistics[col] = {
            min: Math.min(...numbers),
            max: Math.max(...numbers),
            avg: (numbers.reduce((a, b) => a + b, 0) / numbers.length).toFixed(2)
          };
        }

        // 고유값 개수 (카디널리티)
        const uniqueValues = new Set(values);
        sheetAnalysis.dataTypes[col].uniqueCount = uniqueValues.size;
        sheetAnalysis.dataTypes[col].cardinality = uniqueValues.size === data.length ? 'high' :
                                                    uniqueValues.size < 10 ? 'low' : 'medium';
      }

      console.log(`   ✅ ${data.length}개 행, ${sheetAnalysis.columns.length}개 칼럼 분석 완료`);
      console.log(`   📋 칼럼: ${sheetAnalysis.columns.join(', ')}\n`);
    } else {
      console.log(`   ⚠️  데이터 없음\n`);
    }

    analysisResult.sheets.push(sheetAnalysis);
  }

  // ==========================================
  // 4. 분석 결과 저장
  // ==========================================
  console.log('3️⃣  분석 결과 저장 중...');
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(analysisResult, null, 2), 'utf8');
  console.log(`   ✅ 저장 완료: ${OUTPUT_PATH}\n`);

  // ==========================================
  // 5. 분석 결과 요약 출력
  // ==========================================
  console.log('='.repeat(80));
  console.log('📊 엑셀 구조 분석 요약');
  console.log('='.repeat(80));

  for (const sheet of analysisResult.sheets) {
    console.log(`\n📄 시트명: ${sheet.sheetName}`);
    console.log(`   총 행 수: ${sheet.rowCount}개`);
    console.log(`   총 칼럼 수: ${sheet.columns.length}개`);

    // UUID 칼럼 확인
    const uuidColumns = Object.entries(sheet.dataTypes)
      .filter(([_, info]) => info.isUUID)
      .map(([col, _]) => col);

    if (uuidColumns.length > 0) {
      console.log(`   🔑 UUID 칼럼: ${uuidColumns.join(', ')}`);
    }

    // 필수 칼럼 확인 (100% 채워진 칼럼)
    const requiredColumns = Object.entries(sheet.dataTypes)
      .filter(([_, info]) => info.fillRate === '100.0%')
      .map(([col, _]) => col);

    if (requiredColumns.length > 0) {
      console.log(`   ✅ 필수 칼럼 (100% 채움): ${requiredColumns.length}개`);
    }

    // 선택 칼럼 확인
    const optionalColumns = Object.entries(sheet.dataTypes)
      .filter(([_, info]) => info.fillRate !== '100.0%')
      .map(([col, info]) => `${col} (${info.fillRate})`);

    if (optionalColumns.length > 0) {
      console.log(`   📝 선택 칼럼: ${optionalColumns.length}개`);
    }
  }

  console.log('\n' + '='.repeat(80));

  // ==========================================
  // 6. 데이터베이스 매핑 힌트
  // ==========================================
  console.log('\n💡 데이터베이스 매핑 힌트:');
  console.log('-'.repeat(80));

  const 기본정보Sheet = analysisResult.sheets.find(s => s.sheetName === '기본정보');
  if (기본정보Sheet) {
    console.log('\n📋 기본정보 시트 → companies 테이블 매핑:');
    for (const col of 기본정보Sheet.columns) {
      const info = 기본정보Sheet.dataTypes[col];
      const typeHint = info.types.includes('uuid') ? 'VARCHAR(100) PRIMARY KEY' :
                       info.types.includes('number') ? 'DECIMAL or INT' :
                       info.types.includes('date') ? 'DATE' :
                       'VARCHAR or TEXT';

      console.log(`   ${col}: ${typeHint} (채움: ${info.fillRate}, 고유값: ${info.uniqueCount})`);
    }
  }

  const 직원Sheet = analysisResult.sheets.find(s => s.sheetName === '입사일자' || s.sheetName === '직원정보');
  if (직원Sheet) {
    console.log(`\n👥 ${직원Sheet.sheetName} 시트 → employees 테이블 매핑:`);
    for (const col of 직원Sheet.columns) {
      const info = 직원Sheet.dataTypes[col];
      const typeHint = info.types.includes('date') ? 'DATE' :
                       info.types.includes('number') ? 'INT' :
                       'VARCHAR';

      console.log(`   ${col}: ${typeHint} (채움: ${info.fillRate}, 고유값: ${info.uniqueCount})`);
    }
  }

  console.log('\n' + '-'.repeat(80));
  console.log('\n✅ 분석 완료! 다음 단계:');
  console.log('   1. logs/excel-structure.json 파일 확인');
  console.log('   2. node backend/scripts/parse-excel-to-json.js (엑셀 파싱)');
  console.log('   3. node backend/scripts/import-data.js (데이터 임포트)\n');

} catch (error) {
  console.error('\n❌ 분석 중 오류 발생:');
  console.error('오류 메시지:', error.message);
  console.error('스택 트레이스:', error.stack);
  process.exit(1);
}
