# change_history 테이블 스키마

## 테이블명
- **Excel 시트명**: 변경이력
- **Database 테이블명**: change_history

## 칼럼 매핑

| 순번 | 한국어 칼럼명 | 영문 칼럼명 | 데이터 타입 | 제약조건 | 수식/산식 | 데이터 생성 방법 | 데이터 생성 장소 |
|------|--------------|------------|-----------|---------|----------|---------------|---------------|
| 1 | 이력ID | id | INT | PRIMARY KEY, AUTO_INCREMENT | - | 자동생성 | 시스템 자동 |
| 2 | 테이블명 | tableName | VARCHAR(50) | NOT NULL | - | 자동입력 (트리거) | 시스템 자동 (트리거) |
| 3 | 작업유형 | operation | ENUM('INSERT', 'UPDATE', 'DELETE') | NOT NULL | - | 자동입력 (트리거) | 시스템 자동 (트리거) |
| 4 | 레코드ID | recordId | VARCHAR(100) | NOT NULL | - | 자동입력 (트리거) | 시스템 자동 (트리거) |
| 5 | 변경자 | changedBy | VARCHAR(100) | NOT NULL | - | 로그인 사용자 자동입력 | 시스템 자동 (세션) |
| 6 | 변경전데이터 | oldData | JSON | - | - | 자동입력 (UPDATE/DELETE 시) | 시스템 자동 (트리거) |
| 7 | 변경후데이터 | newData | JSON | - | - | 자동입력 (INSERT/UPDATE 시) | 시스템 자동 (트리거) |
| 8 | 변경일시 | changedAt | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | - | 자동생성 | 시스템 자동 |
| 9 | IP주소 | ipAddress | VARCHAR(50) | - | - | 자동입력 (요청 IP) | 시스템 자동 (HTTP 요청) |
| 10 | 사용자에이전트 | userAgent | TEXT | - | - | 자동입력 (브라우저 정보) | 시스템 자동 (HTTP 요청) |

## 트리거: 자동 변경이력 기록

### companies 테이블 변경 추적

```sql
DELIMITER //

-- INSERT 트리거
CREATE TRIGGER companies_after_insert
AFTER INSERT ON companies
FOR EACH ROW
BEGIN
  INSERT INTO change_history (tableName, operation, recordId, changedBy, newData, changedAt)
  VALUES (
    'companies',
    'INSERT',
    NEW.keyValue,
    @current_user,
    JSON_OBJECT(
      'keyValue', NEW.keyValue,
      'companyNameERP', NEW.companyNameERP,
      'finalCompanyName', NEW.finalCompanyName,
      'industry', NEW.industry,
      'businessType', NEW.businessType,
      'businessItem', NEW.businessItem,
      'salesPerson', NEW.salesPerson,
      'address', NEW.address,
      'phone', NEW.phone,
      'fax', NEW.fax,
      'email', NEW.email,
      'contactPerson', NEW.contactPerson,
      'contactPhone', NEW.contactPhone,
      'status', NEW.status
    ),
    NOW()
  );
END//

-- UPDATE 트리거
CREATE TRIGGER companies_after_update
AFTER UPDATE ON companies
FOR EACH ROW
BEGIN
  INSERT INTO change_history (tableName, operation, recordId, changedBy, oldData, newData, changedAt)
  VALUES (
    'companies',
    'UPDATE',
    NEW.keyValue,
    @current_user,
    JSON_OBJECT(
      'keyValue', OLD.keyValue,
      'companyNameERP', OLD.companyNameERP,
      'finalCompanyName', OLD.finalCompanyName,
      'industry', OLD.industry,
      'businessType', OLD.businessType,
      'businessItem', OLD.businessItem,
      'salesPerson', OLD.salesPerson,
      'address', OLD.address,
      'phone', OLD.phone,
      'fax', OLD.fax,
      'email', OLD.email,
      'contactPerson', OLD.contactPerson,
      'contactPhone', OLD.contactPhone,
      'status', OLD.status
    ),
    JSON_OBJECT(
      'keyValue', NEW.keyValue,
      'companyNameERP', NEW.companyNameERP,
      'finalCompanyName', NEW.finalCompanyName,
      'industry', NEW.industry,
      'businessType', NEW.businessType,
      'businessItem', NEW.businessItem,
      'salesPerson', NEW.salesPerson,
      'address', NEW.address,
      'phone', NEW.phone,
      'fax', NEW.fax,
      'email', NEW.email,
      'contactPerson', NEW.contactPerson,
      'contactPhone', NEW.contactPhone,
      'status', NEW.status
    ),
    NOW()
  );
END//

-- DELETE 트리거
CREATE TRIGGER companies_after_delete
AFTER DELETE ON companies
FOR EACH ROW
BEGIN
  INSERT INTO change_history (tableName, operation, recordId, changedBy, oldData, changedAt)
  VALUES (
    'companies',
    'DELETE',
    OLD.keyValue,
    @current_user,
    JSON_OBJECT(
      'keyValue', OLD.keyValue,
      'companyNameERP', OLD.companyNameERP,
      'finalCompanyName', OLD.finalCompanyName,
      'industry', OLD.industry,
      'businessType', OLD.businessType,
      'businessItem', OLD.businessItem,
      'salesPerson', OLD.salesPerson,
      'address', OLD.address,
      'phone', OLD.phone,
      'fax', OLD.fax,
      'email', OLD.email,
      'contactPerson', OLD.contactPerson,
      'contactPhone', OLD.contactPhone,
      'status', OLD.status
    ),
    NOW()
  );
END//

DELIMITER ;
```

### reports 테이블 변경 추적

```sql
DELIMITER //

CREATE TRIGGER reports_after_insert
AFTER INSERT ON reports
FOR EACH ROW
BEGIN
  INSERT INTO change_history (tableName, operation, recordId, changedBy, newData, changedAt)
  VALUES (
    'reports',
    'INSERT',
    NEW.reportId,
    @current_user,
    JSON_OBJECT(
      'reportId', NEW.reportId,
      'submittedBy', NEW.submittedBy,
      'companyId', NEW.companyId,
      'companyName', NEW.companyName,
      'visitDate', NEW.visitDate,
      'activityType', NEW.activityType,
      'productName', NEW.productName,
      'collectionAmount', NEW.collectionAmount,
      'salesAmount', NEW.salesAmount,
      'paymentDate', NEW.paymentDate,
      'visitContent', NEW.visitContent,
      'status', NEW.status
    ),
    NOW()
  );
END//

-- UPDATE, DELETE 트리거 (동일 패턴)

DELIMITER ;
```

### employees 테이블 변경 추적 (민감정보 제외)

```sql
DELIMITER //

CREATE TRIGGER employees_after_update
AFTER UPDATE ON employees
FOR EACH ROW
BEGIN
  INSERT INTO change_history (tableName, operation, recordId, changedBy, oldData, newData, changedAt)
  VALUES (
    'employees',
    'UPDATE',
    NEW.id,
    @current_user,
    JSON_OBJECT(
      'id', OLD.id,
      'name', OLD.name,
      'email', OLD.email,
      'role', OLD.role,
      'department', OLD.department,
      'hireDate', OLD.hireDate,
      'phone', OLD.phone,
      'status', OLD.status
      -- password는 보안상 이력에 기록하지 않음
    ),
    JSON_OBJECT(
      'id', NEW.id,
      'name', NEW.name,
      'email', NEW.email,
      'role', NEW.role,
      'department', NEW.department,
      'hireDate', NEW.hireDate,
      'phone', NEW.phone,
      'status', NEW.status
    ),
    NOW()
  );
END//

DELIMITER ;
```

## 세션 변수 설정 (API에서 자동 실행)

```javascript
// Node.js API에서 모든 DB 작업 전 실행
await db.execute('SET @current_user = ?', [req.user.name]);
```

## 인덱스

```sql
CREATE INDEX idx_tableName ON change_history(tableName);
CREATE INDEX idx_operation ON change_history(operation);
CREATE INDEX idx_recordId ON change_history(recordId);
CREATE INDEX idx_changedBy ON change_history(changedBy);
CREATE INDEX idx_changedAt ON change_history(changedAt);
```

## 변경이력 조회 쿼리

### 특정 거래처의 모든 변경이력
```sql
SELECT * FROM change_history
WHERE tableName = 'companies' AND recordId = [거래처 keyValue]
ORDER BY changedAt DESC;
```

### 특정 사용자의 모든 활동
```sql
SELECT * FROM change_history
WHERE changedBy = [사용자명]
ORDER BY changedAt DESC;
```

### 특정 기간의 변경이력
```sql
SELECT * FROM change_history
WHERE changedAt BETWEEN '2024-01-01' AND '2024-01-31'
ORDER BY changedAt DESC;
```

### 특정 보고서의 상태 변경 이력
```sql
SELECT
  changedAt,
  changedBy,
  JSON_EXTRACT(oldData, '$.status') AS old_status,
  JSON_EXTRACT(newData, '$.status') AS new_status
FROM change_history
WHERE tableName = 'reports' AND recordId = [보고서 ID]
  AND (
    JSON_EXTRACT(oldData, '$.status') != JSON_EXTRACT(newData, '$.status')
    OR oldData IS NULL
  )
ORDER BY changedAt;
```

## 데이터 보존 정책

```sql
-- 90일 이상 된 이력 삭제 (선택사항)
DELETE FROM change_history
WHERE changedAt < DATE_SUB(NOW(), INTERVAL 90 DAY);

-- 또는 아카이빙
CREATE TABLE change_history_archive LIKE change_history;

INSERT INTO change_history_archive
SELECT * FROM change_history
WHERE changedAt < DATE_SUB(NOW(), INTERVAL 90 DAY);

DELETE FROM change_history
WHERE changedAt < DATE_SUB(NOW(), INTERVAL 90 DAY);
```

## 감사 추적 활용

1. **데이터 복구**: oldData를 사용하여 이전 상태로 복구 가능
2. **책임 추적**: changedBy로 모든 변경 작업자 추적
3. **규정 준수**: 모든 데이터 변경 이력을 법적으로 보관
4. **보안 감사**: 의심스러운 활동 패턴 탐지
5. **분쟁 해결**: 데이터 변경 시점과 내용 확인

## 관리자 화면 표시 예시

| 일시 | 작업자 | 테이블 | 작업 | 레코드 | 변경내용 |
|------|--------|--------|------|--------|---------|
| 2024-01-15 14:30 | 홍길동 | companies | UPDATE | ABC회사 | 전화번호: 02-1234-5678 → 02-9876-5432 |
| 2024-01-15 14:25 | 홍길동 | reports | INSERT | RPT-001 | 방문보고서 신규 작성 |
| 2024-01-15 14:20 | 관리자 | employees | UPDATE | 김영희 | 부서: 영업1팀 → 영업2팀 |
