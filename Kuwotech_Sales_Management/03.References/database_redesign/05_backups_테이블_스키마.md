# backups 테이블 스키마

## 테이블명
- **Excel 시트명**: (백업 기능, Excel에는 별도 시트 없음)
- **Database 테이블명**: backups

## 칼럼 매핑

| 순번 | 한국어 칼럼명 | 영문 칼럼명 | 데이터 타입 | 제약조건 | 수식/산식 | 데이터 생성 방법 | 데이터 생성 장소 |
|------|--------------|------------|-----------|---------|----------|---------------|---------------|
| 1 | 백업ID | id | INT | PRIMARY KEY, AUTO_INCREMENT | - | 자동생성 | 시스템 자동 |
| 2 | 백업명 | backupName | VARCHAR(200) | NOT NULL | `백업_YYYYMMDD_HHMMSS` 형식 자동생성 | 자동생성 | 시스템 자동 |
| 3 | 백업유형 | backupType | ENUM('수동', '자동', '시스템') | DEFAULT '수동' | - | 백업 트리거 방식에 따라 자동설정 | 시스템 자동 |
| 4 | 백업데이터 | backupData | LONGTEXT | NOT NULL | JSON.stringify(전체 데이터) | 자동생성 (DB 전체 데이터) | 시스템 자동 |
| 5 | 백업크기 | dataSize | BIGINT | - | `LENGTH(backupData)` 바이트 | 자동계산 | 시스템 자동 |
| 6 | 레코드수 | recordCount | INT | - | companies + reports + employees 총 레코드 수 | 자동계산 | 시스템 자동 |
| 7 | 생성자 | createdBy | VARCHAR(100) | NOT NULL | - | 로그인 관리자 자동입력 | 시스템 자동 (세션) |
| 8 | 생성일시 | createdAt | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | - | 자동생성 | 시스템 자동 |
| 9 | 설명 | description | TEXT | - | - | 수동입력 (관리자, 선택사항) | 관리자 > 데이터 백업 |
| 10 | 복원여부 | isRestored | BOOLEAN | DEFAULT FALSE | - | 복원 실행 시 TRUE로 변경 | 시스템 자동 (복원 시) |
| 11 | 복원일시 | restoredAt | TIMESTAMP | - | - | 복원 실행 시 자동기록 | 시스템 자동 (복원 시) |
| 12 | 복원자 | restoredBy | VARCHAR(100) | - | - | 복원 실행한 관리자 자동입력 | 시스템 자동 (복원 시) |

## 백업 데이터 구조 (JSON)

```json
{
  "timestamp": "2024-01-15T14:30:00.000Z",
  "version": "1.0",
  "tables": {
    "companies": [
      {
        "keyValue": "COMP-001",
        "companyNameERP": "ABC회사",
        "finalCompanyName": "ABC주식회사",
        // ... 전체 19개 칼럼
      },
      // ... 모든 companies 레코드
    ],
    "reports": [
      {
        "reportId": "RPT-001",
        "submittedBy": "홍길동",
        "companyId": "COMP-001",
        // ... 전체 18개 칼럼
      },
      // ... 모든 reports 레코드
    ],
    "employees": [
      {
        "id": 1,
        "name": "관리자",
        "email": "admin@kuwotech.com",
        // ... 전체 12개 칼럼 (password 포함)
      },
      // ... 모든 employees 레코드
    ],
    "change_history": [
      // ... 선택적으로 포함 (용량 고려)
    ]
  },
  "metadata": {
    "totalRecords": 1234,
    "companiesCount": 500,
    "reportsCount": 700,
    "employeesCount": 34,
    "backupSize": 5242880,
    "backupBy": "관리자",
    "backupType": "수동"
  }
}
```

## 백업 생성 프로세스

### 수동 백업 (관리자 요청)

```javascript
// API: POST /api/admin/backup
async function createBackup(req, res) {
  try {
    // 1. 모든 테이블 데이터 조회
    const [companies] = await db.execute('SELECT * FROM companies');
    const [reports] = await db.execute('SELECT * FROM reports');
    const [employees] = await db.execute('SELECT * FROM employees');

    // 2. JSON 구조 생성
    const backupData = {
      timestamp: new Date().toISOString(),
      version: '1.0',
      tables: { companies, reports, employees },
      metadata: {
        totalRecords: companies.length + reports.length + employees.length,
        companiesCount: companies.length,
        reportsCount: reports.length,
        employeesCount: employees.length,
        backupBy: req.user.name,
        backupType: '수동'
      }
    };

    // 3. JSON 문자열로 변환
    const backupString = JSON.stringify(backupData);
    const dataSize = Buffer.byteLength(backupString, 'utf8');

    // 4. backups 테이블에 저장
    const backupName = `백업_${new Date().toISOString().replace(/[:.]/g, '-')}`;

    await db.execute(`
      INSERT INTO backups (backupName, backupType, backupData, dataSize, recordCount, createdBy, description)
      VALUES (?, '수동', ?, ?, ?, ?, ?)
    `, [
      backupName,
      backupString,
      dataSize,
      backupData.metadata.totalRecords,
      req.user.name,
      req.body.description || null
    ]);

    res.json({ success: true, backupName, dataSize, recordCount: backupData.metadata.totalRecords });

  } catch (error) {
    console.error('백업 생성 실패:', error);
    res.status(500).json({ error: '백업 생성 중 오류 발생' });
  }
}
```

### 자동 백업 (스케줄러)

```javascript
// 매일 자정 자동 백업 (node-cron 사용)
import cron from 'node-cron';

// 매일 00:00에 실행
cron.schedule('0 0 * * *', async () => {
  console.log('자동 백업 시작...');

  try {
    // 위와 동일한 백업 로직, backupType='자동'
    // ...

    // 7일 이상 된 자동 백업 삭제
    await db.execute(`
      DELETE FROM backups
      WHERE backupType = '자동'
        AND createdAt < DATE_SUB(NOW(), INTERVAL 7 DAY)
    `);

    console.log('자동 백업 완료 및 오래된 백업 정리 완료');
  } catch (error) {
    console.error('자동 백업 실패:', error);
  }
});
```

## 복원 프로세스

```javascript
// API: POST /api/admin/restore/:backupId
async function restoreBackup(req, res) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // 1. 백업 데이터 조회
    const [backups] = await connection.execute(
      'SELECT backupData FROM backups WHERE id = ?',
      [req.params.backupId]
    );

    if (backups.length === 0) {
      throw new Error('백업을 찾을 수 없습니다.');
    }

    const backupData = JSON.parse(backups[0].backupData);

    // 2. 현재 데이터 백업 (복원 전 안전장치)
    await createBackup(req, res); // 시스템 백업 생성

    // 3. 기존 데이터 삭제
    await connection.execute('DELETE FROM reports'); // FK 먼저
    await connection.execute('DELETE FROM companies');
    await connection.execute('DELETE FROM employees');

    // 4. 백업 데이터 복원
    for (const company of backupData.tables.companies) {
      await connection.execute(`
        INSERT INTO companies (keyValue, companyNameERP, finalCompanyName, ...)
        VALUES (?, ?, ?, ...)
      `, [company.keyValue, company.companyNameERP, company.finalCompanyName, ...]);
    }

    for (const report of backupData.tables.reports) {
      await connection.execute(`
        INSERT INTO reports (reportId, submittedBy, companyId, ...)
        VALUES (?, ?, ?, ...)
      `, [report.reportId, report.submittedBy, report.companyId, ...]);
    }

    for (const employee of backupData.tables.employees) {
      await connection.execute(`
        INSERT INTO employees (id, name, email, password, ...)
        VALUES (?, ?, ?, ?, ...)
      `, [employee.id, employee.name, employee.email, employee.password, ...]);
    }

    // 5. 복원 정보 기록
    await connection.execute(`
      UPDATE backups
      SET isRestored = TRUE, restoredAt = NOW(), restoredBy = ?
      WHERE id = ?
    `, [req.user.name, req.params.backupId]);

    await connection.commit();

    res.json({
      success: true,
      message: '데이터 복원 완료',
      restoredRecords: backupData.metadata.totalRecords
    });

  } catch (error) {
    await connection.rollback();
    console.error('복원 실패:', error);
    res.status(500).json({ error: '데이터 복원 중 오류 발생' });
  } finally {
    connection.release();
  }
}
```

## 인덱스

```sql
CREATE INDEX idx_backupType ON backups(backupType);
CREATE INDEX idx_createdBy ON backups(createdBy);
CREATE INDEX idx_createdAt ON backups(createdAt);
CREATE INDEX idx_isRestored ON backups(isRestored);
```

## 백업 관리 정책

### 보존 정책
```sql
-- 수동 백업: 30일 보관
-- 자동 백업: 7일 보관
-- 시스템 백업 (복원 전): 영구 보관

DELETE FROM backups
WHERE backupType = '수동' AND createdAt < DATE_SUB(NOW(), INTERVAL 30 DAY);

DELETE FROM backups
WHERE backupType = '자동' AND createdAt < DATE_SUB(NOW(), INTERVAL 7 DAY);
```

### 백업 다운로드 (선택사항)
```javascript
// API: GET /api/admin/backup/download/:backupId
app.get('/api/admin/backup/download/:backupId', async (req, res) => {
  const [backups] = await db.execute(
    'SELECT backupName, backupData FROM backups WHERE id = ?',
    [req.params.backupId]
  );

  if (backups.length === 0) {
    return res.status(404).json({ error: '백업을 찾을 수 없습니다.' });
  }

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="${backups[0].backupName}.json"`);
  res.send(backups[0].backupData);
});
```

## 관리자 화면 표시 예시

| 백업ID | 백업명 | 유형 | 레코드수 | 크기 | 생성자 | 생성일시 | 복원여부 | 작업 |
|--------|--------|------|---------|------|--------|---------|---------|------|
| 5 | 백업_20240115_143000 | 수동 | 1234 | 5.0MB | 관리자 | 2024-01-15 14:30 | ✗ | [복원] [다운로드] [삭제] |
| 4 | 백업_20240115_000000 | 자동 | 1200 | 4.8MB | 시스템 | 2024-01-15 00:00 | ✗ | [복원] [다운로드] [삭제] |
| 3 | 백업_20240114_143000 | 수동 | 1150 | 4.6MB | 관리자 | 2024-01-14 14:30 | ✓ | [다운로드] |
