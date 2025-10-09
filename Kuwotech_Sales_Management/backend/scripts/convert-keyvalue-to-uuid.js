// ============================================
// 엑셀 파일의 KEY VALUE를 UUID로 변경하는 스크립트
// ============================================
// 실행: node backend/scripts/convert-keyvalue-to-uuid.js
// ============================================

import XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXCEL_PATH = path.join(__dirname, '../../01.Original_data/영업관리기초자료.xlsx');
const OUTPUT_PATH = path.join(__dirname, '../../01.Original_data/영업관리기초자료_UUID.xlsx');

console.log('📄 엑셀 파일 KEY VALUE → UUID 변환 시작\n');

try {
  // ==========================================
  // 1. 엑셀 파일 읽기
  // ==========================================
  console.log('1️⃣  엑셀 파일 읽기 중...');
  const workbook = XLSX.readFile(EXCEL_PATH);
  console.log(`   ✅ 파일 로드 완료: ${EXCEL_PATH}`);
  console.log(`   📊 시트 목록: ${workbook.SheetNames.join(', ')}\n`);

  // ==========================================
  // 2. 기본정보 시트 처리
  // ==========================================
  const sheetName = '기본정보';

  if (!workbook.SheetNames.includes(sheetName)) {
    console.error(`❌ "${sheetName}" 시트를 찾을 수 없습니다.`);
    process.exit(1);
  }

  console.log(`2️⃣  "${sheetName}" 시트 처리 중...`);
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);

  console.log(`   📊 총 ${data.length}개 행 발견`);

  // KEY VALUE 컬럼 찾기
  const keyValueColumn = Object.keys(data[0] || {}).find(key =>
    key.toLowerCase().includes('key') && key.toLowerCase().includes('value')
  ) || 'KEY VALUE';

  console.log(`   🔑 KEY VALUE 컬럼명: "${keyValueColumn}"`);

  // ==========================================
  // 3. KEY VALUE를 UUID로 변경
  // ==========================================
  console.log('\n3️⃣  KEY VALUE를 UUID로 변환 중...');

  let convertedCount = 0;
  const oldToNewMap = {}; // 기존 KEY VALUE → 새 UUID 매핑

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const oldKeyValue = row[keyValueColumn];

    if (oldKeyValue) {
      // 새 UUID 생성
      const newUUID = uuidv4();

      // 매핑 저장
      oldToNewMap[oldKeyValue] = newUUID;

      // 변경
      row[keyValueColumn] = newUUID;
      convertedCount++;

      // 진행 상황 출력 (10% 단위)
      if ((i + 1) % Math.ceil(data.length / 10) === 0) {
        console.log(`   ⏳ ${i + 1}/${data.length} 처리 중... (${Math.round((i + 1) / data.length * 100)}%)`);
      }
    } else {
      console.log(`   ⚠️  행 ${i + 1}: KEY VALUE가 비어있음 - UUID 생성하여 할당`);
      row[keyValueColumn] = uuidv4();
      convertedCount++;
    }
  }

  console.log(`   ✅ ${convertedCount}개 KEY VALUE → UUID 변환 완료\n`);

  // ==========================================
  // 4. 직원정보 시트 처리 (있을 경우)
  // ==========================================
  const employeeSheetNames = ['직원정보', '입사일자'];
  let employeeSheetName = null;

  for (const name of employeeSheetNames) {
    if (workbook.SheetNames.includes(name)) {
      employeeSheetName = name;
      break;
    }
  }

  if (employeeSheetName) {
    console.log(`4️⃣  "${employeeSheetName}" 시트 확인...`);
    const employeeSheet = workbook.Sheets[employeeSheetName];
    const employeeData = XLSX.utils.sheet_to_json(employeeSheet);
    console.log(`   📊 총 ${employeeData.length}명 직원 정보 확인`);
    console.log(`   ✅ 직원 정보는 그대로 유지\n`);
  }

  // ==========================================
  // 5. 새 엑셀 파일로 저장
  // ==========================================
  console.log('5️⃣  새 엑셀 파일 저장 중...');

  // 수정된 데이터를 시트로 변환
  const newWorksheet = XLSX.utils.json_to_sheet(data);
  workbook.Sheets[sheetName] = newWorksheet;

  // 파일 저장
  XLSX.writeFile(workbook, OUTPUT_PATH);
  console.log(`   ✅ 저장 완료: ${OUTPUT_PATH}\n`);

  // ==========================================
  // 6. 변환 결과 요약
  // ==========================================
  console.log('📊 변환 결과 요약');
  console.log('='.repeat(60));
  console.log(`✅ 원본 파일: ${EXCEL_PATH}`);
  console.log(`✅ 새 파일:   ${OUTPUT_PATH}`);
  console.log(`✅ 변환된 행: ${convertedCount}개`);
  console.log(`✅ KEY VALUE 형식: UUID (36자)`);
  console.log('='.repeat(60));

  console.log('\n💡 다음 단계:');
  console.log('   1. 원본 파일 백업 확인');
  console.log('   2. 새 파일(영업관리기초자료_UUID.xlsx) 확인');
  console.log('   3. 문제 없으면 원본 파일을 새 파일로 교체:');
  console.log(`      copy "${OUTPUT_PATH}" "${EXCEL_PATH}"`);
  console.log('\n🎉 변환 완료!\n');

  // ==========================================
  // 7. 샘플 출력 (처음 5개)
  // ==========================================
  console.log('📋 변환 샘플 (처음 5개):');
  console.log('-'.repeat(80));

  const sampleData = data.slice(0, 5);
  sampleData.forEach((row, index) => {
    const companyName = row['최종거래처명'] || row['회사명(ERP)'] || '(이름없음)';
    console.log(`${index + 1}. ${companyName}`);
    console.log(`   KEY VALUE: ${row[keyValueColumn]}`);
  });

  console.log('-'.repeat(80));

} catch (error) {
  console.error('\n❌ 오류 발생:');
  console.error('오류 메시지:', error.message);
  console.error('스택 트레이스:', error.stack);
  process.exit(1);
}
