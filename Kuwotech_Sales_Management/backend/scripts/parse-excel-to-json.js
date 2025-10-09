// ============================================
// 엑셀 → JSON 파싱 스크립트
// ============================================
// 실행: node backend/scripts/parse-excel-to-json.js
// 목적: Excel 데이터를 database_redesign 스키마에 맞게 JSON으로 변환
// ============================================

import XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcrypt';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXCEL_PATH = path.join(__dirname, '../../01.Original_data/영업관리기초자료.xlsx');
const OUTPUT_DIR = path.join(__dirname, '../data');
const COMPANIES_JSON = path.join(OUTPUT_DIR, 'companies.json');
const EMPLOYEES_JSON = path.join(OUTPUT_DIR, 'employees.json');

console.log('📄 엑셀 → JSON 파싱 시작\n');

const parseData = async () => {
  try {
    // ==========================================
    // 1. data 디렉토리 생성
    // ==========================================
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
      console.log('✅ data 디렉토리 생성 완료\n');
    }

    // ==========================================
    // 2. 엑셀 파일 읽기
    // ==========================================
    console.log('1️⃣  엑셀 파일 읽기 중...');
    const workbook = XLSX.readFile(EXCEL_PATH);
    console.log(`   ✅ 파일 로드 완료: ${EXCEL_PATH}\n`);

    // ==========================================
    // 3. 기본정보 시트 → companies 파싱
    // ==========================================
    console.log('2️⃣  "기본정보" 시트 → companies 데이터 변환 중...');

    const 기본정보Sheet = workbook.Sheets['기본정보'];
    if (!기본정보Sheet) {
      throw new Error('기본정보 시트를 찾을 수 없습니다.');
    }

    const 기본정보Data = XLSX.utils.sheet_to_json(기본정보Sheet);
    const companies = [];

    for (const row of 기본정보Data) {
      // 데이터 정제 함수
      const cleanString = (value) => {
        if (value == null) return null;
        return String(value).trim();
      };

      const cleanNumber = (value) => {
        if (value == null || value === '' || value === '거래없음') return 0;
        if (typeof value === 'number') return value;
        const cleaned = String(value).replace(/[^\d.-]/g, '');
        return cleaned ? parseFloat(cleaned) : 0;
      };

      const cleanDate = (value) => {
        if (value == null || value === '') return null;
        const dateStr = String(value).trim();

        // 텍스트 값 처리 (거래없음, 년부터 등)
        if (/거래없음|년부터|없음|미정/.test(dateStr)) return null;

        // "2025.08.28" → "2025-08-28"
        const cleaned = dateStr.replace(/\./g, '-');

        // 날짜 형식 검증 (YYYY-MM-DD)
        if (!/^\d{4}-\d{1,2}-\d{1,2}$/.test(cleaned)) return null;

        // 날짜 유효성 검증 (00일, 00월 등 처리)
        const parts = cleaned.split('-');
        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]);
        const day = parseInt(parts[2]);

        if (month < 1 || month > 12) return null;
        if (day < 1 || day > 31) return null;
        if (year < 1900 || year > 2100) return null;

        // 실제 날짜 객체로 검증
        const date = new Date(year, month - 1, day);
        if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
          return null;
        }

        return cleaned;
      };

      // 거래상태 처리 (폐업인 경우 isClosed 처리)
      let businessStatus = cleanString(row['거래상태']);
      let isClosed = row['폐업여부'] === '영업중' ? 'N' : 'Y';

      if (businessStatus === '폐업') {
        isClosed = 'Y';
        businessStatus = '비활성'; // 폐업은 비활성으로 처리
      }

      // Contribution 값 정규화 (상/중/하만 허용)
      const normalizeContribution = (value) => {
        if (!value) return null;
        const cleaned = value.trim();
        if (cleaned === '상' || cleaned === '싱') return '상'; // 싱은 상의 오타
        if (cleaned === '중') return '중';
        if (cleaned === '하') return '하';
        return null; // 기타 값은 null
      };

      const company = {
        keyValue: cleanString(row['KEYVALUE']),
        erpCompanyName: cleanString(row['거래처명(ERP)']),
        finalCompanyName: cleanString(row['최종거래처명']),
        isClosed: isClosed,
        ceoOrDentist: cleanString(row['대표이사 또는 치과의사']),
        customerRegion: cleanString(row['고객사 지역']),
        businessStatus: businessStatus,
        department: cleanString(row['담당부서']),
        salesProduct: cleanString(row['판매제품']),
        internalManager: cleanString(row['내부담당자']),
        jcwContribution: normalizeContribution(row['정철웅기여\r\n(상.중.하)'] || row['정철웅기여(상.중.하)']),
        companyContribution: normalizeContribution(row['회사기여\r\n(상.중.하)'] || row['회사기여(상.중.하)']),
        lastPaymentDate: cleanDate(row['마지막결제일']),
        lastPaymentAmount: cleanNumber(row['마지막총결재금액']),
        accountsReceivable: cleanNumber(row['매출채권잔액']),
        accumulatedCollection: cleanNumber(row['누적수금금액']),
        accumulatedSales: cleanNumber(row['누적매출금액']),
        businessActivity: cleanString(row['영업활동(특이사항)'])
      };

      companies.push(company);
    }

    console.log(`   ✅ ${companies.length}개 회사 데이터 변환 완료`);
    console.log(`   💾 저장: ${COMPANIES_JSON}\n`);
    fs.writeFileSync(COMPANIES_JSON, JSON.stringify(companies, null, 2), 'utf8');

    // ==========================================
    // 4. 입사일자 시트 → employees 파싱
    // ==========================================
    console.log('3️⃣  "입사일자" 시트 → employees 데이터 변환 중...');

    const 입사일자Sheet = workbook.Sheets['입사일자'];
    if (!입사일자Sheet) {
      throw new Error('입사일자 시트를 찾을 수 없습니다.');
    }

    const 입사일자Data = XLSX.utils.sheet_to_json(입사일자Sheet);
    const employees = [];

    // 비밀번호 해시 생성 (모두 "1234")
    console.log('   🔐 비밀번호 해시 생성 중...');
    const passwordHash = await bcrypt.hash('1234', 10);

    for (const row of 입사일자Data) {
      const name = row['성명']?.trim();
      if (!name) continue;

      // 입사일자 변환 (Excel serial number → Date)
      let hireDate = null;
      if (row['입사일자']) {
        if (typeof row['입사일자'] === 'number') {
          // Excel serial date를 YYYY-MM-DD로 변환
          // Excel: 1900-01-01 = 1 (1900년 윤년 버그 있음)
          const EXCEL_EPOCH = new Date(Date.UTC(1899, 11, 30)); // UTC 기준
          const days = row['입사일자'];
          const excelDate = new Date(EXCEL_EPOCH.getTime() + days * 86400000);

          const year = excelDate.getUTCFullYear();
          const month = String(excelDate.getUTCMonth() + 1).padStart(2, '0');
          const day = String(excelDate.getUTCDate()).padStart(2, '0');
          hireDate = `${year}-${month}-${day}`;
        } else {
          hireDate = String(row['입사일자']).trim();
        }
      }

      // 역할1/역할2 처리
      const role1 = row['영업사원목록']?.trim() || row['관리자목록']?.trim() || null;
      const role2 = (row['영업사원목록'] && row['관리자목록'])
        ? row['관리자목록']?.trim()
        : null;

      // 부서
      const department = row['부서']?.trim() || null;

      const employee = {
        name: name,
        email: null, // 엑셀에 없음
        password: passwordHash,
        role1: role1,
        role2: role2,
        department: department,
        hireDate: hireDate,
        phone: null, // 엑셀에 없음
        status: '재직',
        canUploadExcel: name === '강정환' ? true : false,
        lastLogin: null
      };

      employees.push(employee);
    }

    console.log(`   ✅ ${employees.length}명 직원 데이터 변환 완료`);

    const onlyRole1 = employees.filter(e => e.role1 && !e.role2);
    const multiRole = employees.filter(e => e.role1 && e.role2);

    console.log(`   👥 단일 역할: ${onlyRole1.length}명`);
    onlyRole1.forEach(e => console.log(`      - ${e.name}: ${e.role1}`));

    console.log(`   🎭 복수 역할: ${multiRole.length}명`);
    multiRole.forEach(e => console.log(`      - ${e.name}: ${e.role1} + ${e.role2}`));

    console.log(`   📤 엑셀 업로드 권한: ${employees.filter(e => e.canUploadExcel).map(e => e.name).join(', ')}`);
    console.log(`   💾 저장: ${EMPLOYEES_JSON}\n`);
    fs.writeFileSync(EMPLOYEES_JSON, JSON.stringify(employees, null, 2), 'utf8');

    // ==========================================
    // 5. 파싱 결과 요약
    // ==========================================
    console.log('='.repeat(80));
    console.log('📊 파싱 결과 요약');
    console.log('='.repeat(80));
    console.log(`✅ companies.json: ${companies.length}개 회사`);
    console.log(`✅ employees.json: ${employees.length}명 직원`);
    console.log('='.repeat(80));

    // ==========================================
    // 6. 데이터 품질 검증
    // ==========================================
    console.log('\n🔍 데이터 품질 검증:');
    console.log('-'.repeat(80));

    // UUID 검증
    const invalidUUIDs = companies.filter(c =>
      !c.keyValue || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(c.keyValue)
    );
    if (invalidUUIDs.length > 0) {
      console.log(`⚠️  잘못된 UUID 형식: ${invalidUUIDs.length}개`);
    } else {
      console.log(`✅ UUID 형식: 모두 정상 (${companies.length}개)`);
    }

    // 필수 필드 검증
    const missingFinalName = companies.filter(c => !c.finalCompanyName);
    if (missingFinalName.length > 0) {
      console.log(`⚠️  최종거래처명 누락: ${missingFinalName.length}개`);
    } else {
      console.log(`✅ 최종거래처명: 모두 존재`);
    }

    // 내부담당자 존재 검증
    const employeeNames = new Set(employees.map(e => e.name));
    const invalidManagers = companies.filter(c =>
      c.internalManager && !employeeNames.has(c.internalManager)
    );
    if (invalidManagers.length > 0) {
      console.log(`⚠️  존재하지 않는 내부담당자: ${invalidManagers.length}개`);
      const unknownManagers = [...new Set(invalidManagers.map(c => c.internalManager))];
      console.log(`   미등록 담당자: ${unknownManagers.join(', ')}`);
    } else {
      console.log(`✅ 내부담당자: 모두 유효`);
    }

    // Enum 값 검증
    const invalidStatus = companies.filter(c =>
      c.businessStatus && !['활성', '비활성', '불용', '추가확인'].includes(c.businessStatus)
    );
    if (invalidStatus.length > 0) {
      console.log(`⚠️  잘못된 거래상태: ${invalidStatus.length}개`);
    } else {
      console.log(`✅ 거래상태: 모두 유효`);
    }

    console.log('-'.repeat(80));
    console.log('\n✅ 파싱 완료! 다음 단계:');
    console.log('   1. backend/data/companies.json 파일 확인');
    console.log('   2. backend/data/employees.json 파일 확인');
    console.log('   3. node backend/scripts/import-data.js (MySQL 임포트)\n');

  } catch (error) {
    console.error('\n❌ 파싱 중 오류 발생:');
    console.error('오류 메시지:', error.message);
    console.error('스택 트레이스:', error.stack);
    process.exit(1);
  }
};

// 스크립트 실행
parseData();
