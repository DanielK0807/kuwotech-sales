# reports 테이블 스키마 (실적보고서)

## 테이블명
- **Excel 시트명**: 실적보고서_전체
- **Database 테이블명**: reports

## 칼럼 매핑

| 순번 | 한국어 칼럼명 | 영문 칼럼명 | 데이터 타입 | 제약조건 | 수식/산식 | 데이터 생성 방법 | 데이터 생성 장소 |
|------|--------------|------------|-----------|---------|----------|---------------|---------------|
| 1 | 보고서ID | reportId | VARCHAR(100) | PRIMARY KEY, NOT NULL | 자동생성 (UUID) | 자동생성 | 시스템 자동 |
| 2 | 작성자 | submittedBy | VARCHAR(100) | FOREIGN KEY (employees.name), NOT NULL | - | 로그인 사용자 자동입력 | 시스템 자동 (로그인 세션) |
| 3 | 제출일 | submittedDate | DATE | NOT NULL | - | 수동입력 (영업담당) | 영업 > 실적보고서 작성 |
| 4 | 거래처ID | companyId | VARCHAR(100) | FOREIGN KEY (companies.keyValue), NOT NULL | - | 드롭다운 선택 (영업담당) | 영업 > 실적보고서 작성 |
| 5 | 보고서유형 | reportType | VARCHAR(100) | - | - | 드롭다운 선택 (영업담당) | 영업 > 실적보고서 작성 |
| 6 | 목표수금금액 | targetCollectionAmount | DECIMAL(15,2) | DEFAULT 0 | - | 수동입력 (영업담당) | 영업 > 실적보고서 작성 |
| 7 | 목표매출액 | targetSalesAmount | DECIMAL(15,2) | DEFAULT 0 | - | 수동입력 (영업담당) | 영업 > 실적보고서 작성 |
| 8 | 판매목표제품 | targetProducts | VARCHAR(200) | - | - | 수동입력 (영업담당) | 영업 > 실적보고서 작성 |
| 9 | 활동내역 | activityNotes | TEXT | - | - | 수동입력 (영업담당) | 영업 > 실적보고서 작성 |
| 10 | 상태 | status | ENUM('임시저장', '제출완료', '승인', '반려') | DEFAULT '임시저장' | - | 버튼 클릭 (영업담당/관리자) | 영업 > 실적보고서 작성 / 관리자 > 보고서 승인 |
| 11 | 처리자 | processedBy | VARCHAR(100) | FOREIGN KEY (employees.name) | - | 로그인 관리자 자동입력 | 시스템 자동 (관리자 승인/반려 시) |
| 12 | 처리일 | processedDate | TIMESTAMP | - | 상태가 '승인' 또는 '반려'로 변경될 때 자동기록 | 자동생성 | 시스템 자동 (승인/반려 버튼 클릭 시) |
| 13 | 관리자코멘트 | adminComment | TEXT | - | - | 수동입력 (관리자) | 관리자 > 보고서 승인 |
| 14 | 생성일시 | createdAt | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | - | 자동생성 | 시스템 자동 |
| 15 | 수정일시 | updatedAt | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | - | 자동업데이트 | 시스템 자동 |

## 트리거: companies 테이블 자동 업데이트

### 보고서 저장/수정 시 거래처 정보 자동 갱신
```sql
-- INSERT 트리거
DELIMITER //
CREATE TRIGGER after_report_insert
AFTER INSERT ON reports
FOR EACH ROW
BEGIN
  IF NEW.status = '승인' THEN
    -- 판매제품 업데이트
    UPDATE companies
    SET salesProduct = (
      SELECT GROUP_CONCAT(DISTINCT targetProducts SEPARATOR ', ')
      FROM reports WHERE companyId = NEW.companyId AND status = '승인'
    )
    WHERE keyValue = NEW.companyId;

    -- 마지막결제일 업데이트
    UPDATE companies
    SET lastPaymentDate = (
      SELECT MAX(submittedDate)
      FROM reports WHERE companyId = NEW.companyId AND status = '승인'
    )
    WHERE keyValue = NEW.companyId;

    -- 마지막총결제금액 업데이트
    UPDATE companies
    SET lastPaymentAmount = (
      SELECT targetCollectionAmount
      FROM reports
      WHERE companyId = NEW.companyId AND status = '승인'
      ORDER BY submittedDate DESC
      LIMIT 1
    )
    WHERE keyValue = NEW.companyId;

    -- 누적수금금액 업데이트
    UPDATE companies
    SET accumulatedCollection = (
      SELECT COALESCE(SUM(targetCollectionAmount), 0)
      FROM reports WHERE companyId = NEW.companyId AND status = '승인'
    )
    WHERE keyValue = NEW.companyId;

    -- 누적매출금액 업데이트
    UPDATE companies
    SET accumulatedSales = (
      SELECT COALESCE(SUM(targetSalesAmount), 0)
      FROM reports WHERE companyId = NEW.companyId AND status = '승인'
    )
    WHERE keyValue = NEW.companyId;

    -- 영업활동(특이사항) 업데이트
    UPDATE companies
    SET businessActivity = (
      SELECT GROUP_CONCAT(activityNotes SEPARATOR ' | ')
      FROM (
        SELECT activityNotes
        FROM reports
        WHERE companyId = NEW.companyId AND status = '승인'
        ORDER BY submittedDate DESC
        LIMIT 5
      ) AS recent_activities
    )
    WHERE keyValue = NEW.companyId;
  END IF;
END//

-- UPDATE 트리거
CREATE TRIGGER after_report_update
AFTER UPDATE ON reports
FOR EACH ROW
BEGIN
  IF NEW.status = '승인' OR OLD.status = '승인' THEN
    -- (위와 동일한 UPDATE 로직)
    -- 판매제품 업데이트
    UPDATE companies
    SET salesProduct = (
      SELECT GROUP_CONCAT(DISTINCT targetProducts SEPARATOR ', ')
      FROM reports WHERE companyId = NEW.companyId AND status = '승인'
    )
    WHERE keyValue = NEW.companyId;

    -- 마지막결제일 업데이트
    UPDATE companies
    SET lastPaymentDate = (
      SELECT MAX(submittedDate)
      FROM reports WHERE companyId = NEW.companyId AND status = '승인'
    )
    WHERE keyValue = NEW.companyId;

    -- 마지막총결제금액 업데이트
    UPDATE companies
    SET lastPaymentAmount = (
      SELECT targetCollectionAmount
      FROM reports
      WHERE companyId = NEW.companyId AND status = '승인'
      ORDER BY submittedDate DESC
      LIMIT 1
    )
    WHERE keyValue = NEW.companyId;

    -- 누적수금금액 업데이트
    UPDATE companies
    SET accumulatedCollection = (
      SELECT COALESCE(SUM(targetCollectionAmount), 0)
      FROM reports WHERE companyId = NEW.companyId AND status = '승인'
    )
    WHERE keyValue = NEW.companyId;

    -- 누적매출금액 업데이트
    UPDATE companies
    SET accumulatedSales = (
      SELECT COALESCE(SUM(targetSalesAmount), 0)
      FROM reports WHERE companyId = NEW.companyId AND status = '승인'
    )
    WHERE keyValue = NEW.companyId;

    -- 영업활동(특이사항) 업데이트
    UPDATE companies
    SET businessActivity = (
      SELECT GROUP_CONCAT(activityNotes SEPARATOR ' | ')
      FROM (
        SELECT activityNotes
        FROM reports
        WHERE companyId = NEW.companyId AND status = '승인'
        ORDER BY submittedDate DESC
        LIMIT 5
      ) AS recent_activities
    )
    WHERE keyValue = NEW.companyId;
  END IF;
END//

-- DELETE 트리거
CREATE TRIGGER after_report_delete
AFTER DELETE ON reports
FOR EACH ROW
BEGIN
  IF OLD.status = '승인' THEN
    -- (위와 동일한 UPDATE 로직, OLD.companyId 사용)
    UPDATE companies
    SET salesProduct = (
      SELECT GROUP_CONCAT(DISTINCT targetProducts SEPARATOR ', ')
      FROM reports WHERE companyId = OLD.companyId AND status = '승인'
    )
    WHERE keyValue = OLD.companyId;

    UPDATE companies
    SET lastPaymentDate = (
      SELECT MAX(submittedDate)
      FROM reports WHERE companyId = OLD.companyId AND status = '승인'
    )
    WHERE keyValue = OLD.companyId;

    UPDATE companies
    SET lastPaymentAmount = (
      SELECT targetCollectionAmount
      FROM reports
      WHERE companyId = OLD.companyId AND status = '승인'
      ORDER BY submittedDate DESC
      LIMIT 1
    )
    WHERE keyValue = OLD.companyId;

    UPDATE companies
    SET accumulatedCollection = (
      SELECT COALESCE(SUM(targetCollectionAmount), 0)
      FROM reports WHERE companyId = OLD.companyId AND status = '승인'
    )
    WHERE keyValue = OLD.companyId;

    UPDATE companies
    SET accumulatedSales = (
      SELECT COALESCE(SUM(targetSalesAmount), 0)
      FROM reports WHERE companyId = OLD.companyId AND status = '승인'
    )
    WHERE keyValue = OLD.companyId;

    UPDATE companies
    SET businessActivity = (
      SELECT GROUP_CONCAT(activityNotes SEPARATOR ' | ')
      FROM (
        SELECT activityNotes
        FROM reports
        WHERE companyId = OLD.companyId AND status = '승인'
        ORDER BY submittedDate DESC
        LIMIT 5
      ) AS recent_activities
    )
    WHERE keyValue = OLD.companyId;
  END IF;
END//
DELIMITER ;
```

## 인덱스

```sql
CREATE INDEX idx_submittedBy ON reports(submittedBy);
CREATE INDEX idx_companyId ON reports(companyId);
CREATE INDEX idx_submittedDate ON reports(submittedDate);
CREATE INDEX idx_status ON reports(status);
CREATE INDEX idx_reportType ON reports(reportType);
CREATE INDEX idx_processedDate ON reports(processedDate);
```

## 보고서 작성 흐름

1. **보고서 작성 시작**: 영업담당자가 "실적보고서 작성" 메뉴 진입
2. **기본 정보 입력**:
   - submittedDate (제출일)
   - companyId (거래처 선택 - 자신이 담당하는 거래처만)
   - reportType (보고서유형)
3. **목표 설정**:
   - targetCollectionAmount (목표수금금액)
   - targetSalesAmount (목표매출액)
   - targetProducts (판매목표제품)
4. **활동 기록**:
   - activityNotes (활동내역)
5. **임시저장**: status='임시저장'으로 저장
6. **제출**: status='제출완료'로 변경
7. **관리자 승인/반려**:
   - 승인: status='승인', processedDate 자동기록, processedBy 자동입력
   - 반려: status='반려', adminComment 입력
8. **자동업데이트**: 승인 시 companies 테이블의 판매제품, 마지막결제일, 마지막총결제금액, 누적수금/매출, 영업활동(특이사항) 자동 갱신

## 상태 전이도

```
[작성중] → [임시저장] → [제출완료] → [승인] ✓ (companies 테이블 자동 업데이트)
                              ↓
                          [반려] → [임시저장] (재작성)
```

## 권한별 작업

| 작업 | 영업담당 | 관리자 |
|------|---------|--------|
| 보고서 작성 | ✓ (자신의 거래처만) | ✓ (전체) |
| 임시저장 | ✓ | ✓ |
| 제출 | ✓ | ✓ |
| 승인 | ✗ | ✓ |
| 반려 | ✗ | ✓ |
| 수정 | ✓ (임시저장/반려 상태만) | ✓ (전체) |
| 삭제 | ✓ (임시저장 상태만) | ✓ (전체) |
| 조회 | ✓ (자신의 보고서만) | ✓ (전체) |

## 엑셀 시트 구조 (실적보고서_전체)

엑셀 다운로드 시 다음 12개 칼럼으로 구성:

1. 보고서ID (reportId)
2. 작성자 (submittedBy)
3. 제출일 (submittedDate)
4. 보고서유형 (reportType)
5. 목표수금금액 (targetCollectionAmount)
6. 목표매출액 (targetSalesAmount)
7. 판매목표제품 (targetProducts)
8. 활동내역 (activityNotes)
9. 상태 (status)
10. 처리자 (processedBy)
11. 처리일 (processedDate)
12. 관리자코멘트 (adminComment)
