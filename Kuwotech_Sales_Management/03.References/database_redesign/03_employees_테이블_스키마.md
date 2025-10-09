# employees 테이블 스키마

## 테이블명
- **Excel 시트명**: 직원정보
- **Database 테이블명**: employees

## 칼럼 매핑

| 순번 | 한국어 칼럼명 | 영문 칼럼명 | 데이터 타입 | 제약조건 | 수식/산식 | 데이터 생성 방법 | 데이터 생성 장소 |
|------|--------------|------------|-----------|---------|----------|---------------|---------------|
| 1 | 직원ID | id | INT | PRIMARY KEY, AUTO_INCREMENT | - | 자동생성 | 시스템 자동 |
| 2 | 직원명 | name | VARCHAR(100) | NOT NULL | - | 수동입력 (관리자) | 관리자 > 직원 관리 |
| 3 | 이메일 | email | VARCHAR(200) | UNIQUE, NOT NULL | - | 수동입력 (관리자) | 관리자 > 직원 관리 |
| 4 | 비밀번호 | password | VARCHAR(255) | NOT NULL | bcrypt 해시 (salt rounds=10) | 수동입력 (관리자) | 관리자 > 직원 관리 (초기 비밀번호) |
| 5 | 역할 | role | ENUM('관리자', '영업담당') | NOT NULL | - | 드롭다운 선택 (관리자) | 관리자 > 직원 관리 |
| 6 | 부서 | department | VARCHAR(100) | - | - | 수동입력 (관리자) | 관리자 > 직원 관리 |
| 7 | 입사일 | hireDate | DATE | - | - | 수동입력 (관리자) | 관리자 > 직원 관리 |
| 8 | 전화번호 | phone | VARCHAR(50) | - | - | 수동입력 (관리자) | 관리자 > 직원 관리 |
| 9 | 상태 | status | ENUM('재직', '휴직', '퇴사') | DEFAULT '재직' | - | 드롭다운 선택 (관리자) | 관리자 > 직원 관리 |
| 10 | 마지막로그인 | lastLogin | TIMESTAMP | - | 로그인 성공 시 자동기록 | 자동업데이트 | 시스템 자동 (로그인 시) |
| 11 | 생성일시 | createdAt | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | - | 자동생성 | 시스템 자동 |
| 12 | 수정일시 | updatedAt | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | - | 자동업데이트 | 시스템 자동 |

## 비밀번호 해싱

```javascript
// bcrypt를 사용한 비밀번호 해싱
import bcrypt from 'bcryptjs';

// 비밀번호 해싱 (직원 등록 시)
const saltRounds = 10;
const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);

// 비밀번호 검증 (로그인 시)
const isValid = await bcrypt.compare(inputPassword, employee.password);
```

## 인덱스

```sql
CREATE UNIQUE INDEX idx_email ON employees(email);
CREATE INDEX idx_role ON employees(role);
CREATE INDEX idx_status ON employees(status);
CREATE INDEX idx_department ON employees(department);
```

## 역할별 권한

### 관리자 권한
- 모든 거래처 조회/수정
- 모든 보고서 조회/승인/반려
- 직원 관리 (등록/수정/삭제)
- KPI 대시보드 (전체 직원)
- 변경이력 조회 (전체)
- 데이터 백업/복원
- ERP 연동

### 영업담당 권한
- 자신의 담당 거래처만 조회/수정
- 자신의 보고서만 작성/조회/수정
- KPI 대시보드 (자신의 실적만)
- 변경이력 조회 (자신의 활동만)

## 직원 등록 흐름

1. **직원 등록**: 관리자가 "직원 관리" 메뉴에서 신규 직원 정보 입력
   - name, email, password (초기 비밀번호), role, department, hireDate, phone 입력
   - password는 bcrypt로 해싱하여 저장
   - status는 기본값 '재직'으로 자동설정

2. **첫 로그인**: 직원이 email과 초기 비밀번호로 로그인
   - 비밀번호 변경 권장 (선택사항)
   - lastLogin 자동업데이트

3. **비밀번호 변경**: 직원이 "내 정보" 메뉴에서 비밀번호 변경 가능

4. **직원 상태 변경**: 관리자가 휴직/퇴사 처리
   - status를 '휴직' 또는 '퇴사'로 변경
   - 퇴사 시 로그인 불가

## 로그인 프로세스

```javascript
// 로그인 API
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "plainPassword"
}

// 응답
{
  "token": "JWT_TOKEN",
  "user": {
    "id": 1,
    "name": "홍길동",
    "email": "user@example.com",
    "role": "영업담당",
    "department": "영업1팀"
  }
}

// JWT 토큰에 포함되는 정보
{
  "userId": 1,
  "email": "user@example.com",
  "role": "영업담당",
  "name": "홍길동"
}
```

## 데이터 생성 예시

```sql
-- 관리자 계정 생성
INSERT INTO employees (name, email, password, role, department, hireDate, phone, status)
VALUES
('관리자', 'admin@kuwotech.com', '$2a$10$...', '관리자', '경영지원팀', '2024-01-01', '010-1234-5678', '재직');

-- 영업담당 계정 생성
INSERT INTO employees (name, email, password, role, department, hireDate, phone, status)
VALUES
('홍길동', 'hong@kuwotech.com', '$2a$10$...', '영업담당', '영업1팀', '2024-01-15', '010-2345-6789', '재직'),
('김영희', 'kim@kuwotech.com', '$2a$10$...', '영업담당', '영업2팀', '2024-02-01', '010-3456-7890', '재직');
```

## companies 테이블과의 연동

```sql
-- 영업담당자별 담당 거래처 조회
SELECT c.*
FROM companies c
WHERE c.salesPerson = (SELECT name FROM employees WHERE id = [로그인한 직원 ID]);

-- 영업담당자별 보고서 조회
SELECT r.*
FROM reports r
WHERE r.submittedBy = (SELECT name FROM employees WHERE id = [로그인한 직원 ID]);
```

## 퇴사자 처리

```sql
-- 퇴사 처리 시
UPDATE employees SET status = '퇴사' WHERE id = [직원ID];

-- 퇴사자의 담당 거래처 재배정 필요
UPDATE companies
SET salesPerson = [새로운 담당자명]
WHERE salesPerson = [퇴사자명];
```
