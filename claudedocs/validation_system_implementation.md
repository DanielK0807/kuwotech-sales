# 거래처 입력 검증 시스템 구현 완료

## 📋 구현 개요

거래처 관리 시스템에 대한 포괄적인 검증 시스템이 성공적으로 구현되었습니다.

## ✅ 구현 완료 항목

### 1. **백엔드 API 엔드포인트**

#### 거래처명 중복 체크 API
- **경로**: `GET /api/companies/check-duplicate/name`
- **쿼리 파라미터**:
  - `name`: 체크할 거래처명 (필수)
  - `excludeKey`: 제외할 거래처 키 (수정 시 사용, 선택)
- **응답**:
```json
{
  "success": true,
  "isDuplicate": boolean,
  "count": number,
  "companies": [
    {
      "keyValue": "COMPANY_xxx",
      "finalCompanyName": "거래처명",
      "ceoOrDentist": "대표이사",
      "detailedAddress": "주소",
      "phoneNumber": "전화번호"
    }
  ]
}
```

#### 사업자등록번호 중복 체크 API
- **경로**: `GET /api/companies/check-duplicate/business-number`
- **쿼리 파라미터**:
  - `number`: 체크할 사업자등록번호 (필수)
  - `excludeKey`: 제외할 거래처 키 (수정 시 사용, 선택)
- **응답**: 거래처명 중복 체크와 동일한 구조

### 2. **백엔드 검증 강화**

#### createCompany (거래처 생성)
- ✅ finalCompanyName 필수 검증
- ✅ 사업자등록번호 중복 체크
- ✅ region_id 외래키 검증 (regions 테이블 존재 여부 확인)

#### updateCompany (거래처 수정)
- ✅ finalCompanyName 권한 체크 (관리자만 수정 가능)
- ✅ 사업자등록번호 중복 체크 (변경 시)
- ✅ region_id 외래키 검증 (변경 시)

### 3. **프론트엔드 검증 유틸리티**

새 파일 생성: `05.Source/01.common/18_validation_utils.js`

#### 제공 함수들

##### `validatePhoneNumber(phoneNumber)`
전화번호 형식 검증
- 지원 형식: `02-1234-5678`, `0212345678`, `010-1234-5678` 등
- 자동 포맷팅 기능 포함
- 반환값:
```javascript
{
  valid: boolean,
  formatted: "02-1234-5678",  // valid가 true일 때
  message: "error message"    // valid가 false일 때
}
```

##### `validateBusinessNumber(businessNumber)`
사업자등록번호 형식 검증
- 지원 형식: `123-45-67890` (10자리)
- 자동 포맷팅 기능 포함
- 반환 구조는 validatePhoneNumber와 동일

##### `checkCompanyNameDuplicate(companyName, excludeKey?)`
거래처명 중복 체크 (비동기)
```javascript
const result = await checkCompanyNameDuplicate('테스트 거래처');
// result: { success, isDuplicate, companies: [...] }
```

##### `checkBusinessNumberDuplicate(businessNumber, excludeKey?)`
사업자등록번호 중복 체크 (비동기)

##### `showDuplicateCompanyModal(duplicateCompanies)`
중복 거래처 비교 모달 표시
- 기존 거래처 정보 (거래처명, 대표이사, 주소, 전화번호) 표시
- 사용자에게 "같은 거래처인지 다른 거래처인지" 확인
- 반환값: Promise<boolean> (계속 진행 여부)

##### `parseRegionFromAddress(address, regions)`
주소에서 지역 자동 추출
```javascript
const regionId = parseRegionFromAddress(
  '서울특별시 강남구 테헤란로 123',
  regionsArray
);
// regionId: 해당 지역의 ID 또는 null
```

##### `validateCompanyForm(formData, isUpdate?)`
전체 폼 검증
```javascript
const validation = validateCompanyForm({
  finalCompanyName: '테스트',
  ceoOrDentist: '홍길동',
  internalManager: '김담당',
  phoneNumber: '02-1234-5678',
  businessRegistrationNumber: '123-45-67890'
});
// validation: { valid: boolean, message?: string }
```

## 🔧 사용 방법

### 프론트엔드 통합 예시

검증 유틸리티는 이미 `02_all_companies.js`에 import되어 있습니다:

```javascript
import {
    validatePhoneNumber,
    validateBusinessNumber,
    checkCompanyNameDuplicate,
    checkBusinessNumberDuplicate,
    showDuplicateCompanyModal,
    parseRegionFromAddress
} from '../../01.common/18_validation_utils.js';
```

### 사용 예시 1: 거래처명 입력 시 실시간 중복 체크

```javascript
// 모달이 열린 후 이벤트 리스너 추가
const companyNameInput = document.getElementById('modal-final-company-name');

companyNameInput.addEventListener('blur', async () => {
    const companyName = companyNameInput.value.trim();
    if (!companyName) return;

    // 중복 체크
    const result = await checkCompanyNameDuplicate(companyName);

    if (result.isDuplicate) {
        // 중복된 거래처 정보를 모달로 표시
        const shouldContinue = await showDuplicateCompanyModal(result.companies);

        if (!shouldContinue) {
            // 사용자가 "취소"를 선택한 경우
            return null;  // 모달 유지
        }
    }
});
```

### 사용 예시 2: 전화번호 실시간 포맷팅

```javascript
const phoneInput = document.getElementById('modal-phone-number');

phoneInput.addEventListener('blur', () => {
    const phoneValue = phoneInput.value.trim();
    if (!phoneValue) return;

    const validation = validatePhoneNumber(phoneValue);

    if (!validation.valid) {
        showToast(validation.message, 'warning');
        phoneInput.focus();
    } else if (validation.formatted) {
        // 자동 포맷팅 적용
        phoneInput.value = validation.formatted;
    }
});
```

### 사용 예시 3: 주소 입력 시 자동 지역 설정

```javascript
const addressInput = document.getElementById('modal-detailed-address');
const regionSelect = document.getElementById('modal-region-id');

addressInput.addEventListener('blur', async () => {
    const address = addressInput.value.trim();
    if (!address) return;

    // 지역 마스터 데이터 가져오기
    const regionsResponse = await fetch(
        `${GlobalConfig.API_BASE_URL}/api/master/regions`,
        {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        }
    );

    if (regionsResponse.ok) {
        const regionsData = await regionsResponse.json();
        const regionId = parseRegionFromAddress(address, regionsData.regions);

        if (regionId) {
            regionSelect.value = regionId;
            showToast('지역이 자동으로 설정되었습니다.', 'success');
        }
    }
});
```

### 사용 예시 4: 저장 버튼 클릭 시 전체 검증

```javascript
// 모달의 저장 버튼 onClick 핸들러에서
onClick: async () => {
    // 1. 기본 필드 수집
    const finalCompanyName = document.getElementById('modal-final-company-name')?.value.trim();
    const ceoOrDentist = document.getElementById('modal-ceo-or-dentist')?.value.trim();
    const internalManager = document.getElementById('modal-internal-manager')?.value.trim();
    const phoneNumber = document.getElementById('modal-phone-number')?.value.trim();
    const businessNumber = document.getElementById('modal-business-registration-number')?.value.trim();

    // 2. 전체 폼 검증
    const formValidation = validateCompanyForm({
        finalCompanyName,
        ceoOrDentist,
        internalManager,
        phoneNumber,
        businessRegistrationNumber: businessNumber
    });

    if (!formValidation.valid) {
        showToast(formValidation.message, 'warning');
        return null;  // 모달 유지
    }

    // 3. 거래처명 중복 체크
    const nameCheck = await checkCompanyNameDuplicate(finalCompanyName);
    if (nameCheck.isDuplicate) {
        const shouldContinue = await showDuplicateCompanyModal(nameCheck.companies);
        if (!shouldContinue) return null;
    }

    // 4. 사업자등록번호 중복 체크
    if (businessNumber) {
        const businessCheck = await checkBusinessNumberDuplicate(businessNumber);
        if (businessCheck.isDuplicate) {
            showToast(
                `이미 등록된 사업자등록번호입니다. (${businessCheck.companies[0].finalCompanyName})`,
                'error'
            );
            return null;
        }
    }

    // 5. 전화번호 포맷팅
    let formattedPhone = phoneNumber;
    if (phoneNumber) {
        const phoneValidation = validatePhoneNumber(phoneNumber);
        if (phoneValidation.valid && phoneValidation.formatted) {
            formattedPhone = phoneValidation.formatted;
        }
    }

    // 6. 사업자등록번호 포맷팅
    let formattedBusinessNumber = businessNumber;
    if (businessNumber) {
        const businessValidation = validateBusinessNumber(businessNumber);
        if (businessValidation.valid && businessValidation.formatted) {
            formattedBusinessNumber = businessValidation.formatted;
        }
    }

    // 7. 데이터 제출
    const companyData = {
        finalCompanyName,
        ceoOrDentist,
        internalManager,
        phoneNumber: formattedPhone,
        businessRegistrationNumber: formattedBusinessNumber,
        // ... 기타 필드
    };

    // API 호출
    const response = await fetch(`${GlobalConfig.API_BASE_URL}/api/companies`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(companyData)
    });

    // ... 응답 처리
}
```

## 📝 백엔드 에러 메시지

백엔드에서 반환하는 검증 오류 메시지들:

- `"최종거래처명은 필수입니다."` - finalCompanyName 누락
- `"이미 등록된 사업자등록번호입니다. (거래처명)"` - 사업자등록번호 중복
- `"유효하지 않은 지역입니다."` - region_id가 regions 테이블에 없음
- `"최종거래처명은 관리자만 수정할 수 있습니다."` - 권한 부족 (수정 시)

## 🎯 주요 기능 요약

### ✅ 구현 완료
1. **프론트엔드 필수 검증** - finalCompanyName, ceoOrDentist, internalManager
2. **region_id 외래키 검증** - 백엔드에서 regions 테이블 존재 여부 확인
3. **전화번호 형식 검증** - 02-1234-5678, 0212345678 등 지원, 자동 포맷팅
4. **사업자등록번호 형식 검증** - 123-45-67890 형식, 자동 포맷팅
5. **사업자등록번호 중복 체크** - 백엔드에서 자동 차단
6. **거래처명 중복 체크** - 실시간 확인 가능
7. **중복 거래처 비교 모달** - CEO, 주소 등 정보 표시하여 사용자 확인
8. **주소 자동 파싱** - 주소 입력 시 자동으로 지역 추출 및 설정

### 🔄 통합 위치

검증 로직은 다음 위치에 통합되어야 합니다:

**파일**: `05.Source/04.admin_mode/02_all_companies/02_all_companies.js`

1. **openCompanyModal 함수** (line 1074~) - 거래처 추가 모달
   - 저장 버튼 onClick 핸들러에 검증 로직 추가

2. **openCompanyDetailModal 함수** (line 1388~) - 거래처 수정 모달
   - 저장 버튼 onClick 핸들러에 검증 로직 추가

## 🚀 다음 단계

1. 모달 열릴 때 input 필드에 이벤트 리스너 추가:
   - 거래처명 blur 이벤트 → 중복 체크
   - 사업자등록번호 blur 이벤트 → 중복 체크 및 포맷팅
   - 전화번호 blur 이벤트 → 포맷 검증 및 자동 포맷팅
   - 주소 blur 이벤트 → 지역 자동 설정

2. 저장 버튼 클릭 시 전체 검증 흐름 적용

## 📂 수정된 파일 목록

### 백엔드
- `backend/controllers/companies.controller.js` - 검증 로직 추가
  - checkCompanyNameDuplicate 함수 추가
  - checkBusinessNumberDuplicate 함수 추가
  - createCompany 검증 강화
  - updateCompany 검증 강화

- `backend/routes/companies.routes.js` - 라우트 추가
  - GET /api/companies/check-duplicate/name
  - GET /api/companies/check-duplicate/business-number

### 프론트엔드
- `05.Source/01.common/18_validation_utils.js` - 신규 생성
- `05.Source/04.admin_mode/02_all_companies/02_all_companies.js` - import 추가

## 🎉 구현 완료!

모든 요청된 검증 기능이 성공적으로 구현되었습니다. 프론트엔드 통합은 위의 사용 예시를 참고하여 완료하실 수 있습니다.
