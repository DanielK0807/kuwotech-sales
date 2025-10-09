# KPI 캐시 테이블 마이그레이션 가이드

## 📋 개요

KPI 계산 성능을 개선하기 위해 **캐시 테이블** 기반 시스템으로 전환합니다.

### 기존 방식 (느림)
```
요청 → 실시간 계산 (companies 테이블 스캔 + 복잡한 집계) → 응답
소요시간: 500ms ~ 2초
```

### 새로운 방식 (빠름)
```
요청 → SELECT * FROM kpi_sales → 응답
소요시간: 10ms ~ 50ms (약 20배 빠름!)
```

---

## 🚀 설치 단계

### **1단계: 마이그레이션 SQL 실행**

Railway MySQL에 접속하여 마이그레이션 스크립트를 실행합니다:

```bash
# 방법 1: MySQL CLI 사용
mysql -h switchback.proxy.rlwy.net -P 49081 -u root -p railway < migrations/004_create_kpi_tables.sql

# 방법 2: MySQL Workbench 사용
# 1. Railway MySQL 연결
# 2. migrations/004_create_kpi_tables.sql 파일 열기
# 3. Execute 실행
```

**실행 결과 확인:**
```sql
SHOW TABLES LIKE 'kpi%';
-- 결과:
-- kpi_sales
-- kpi_admin

SHOW FULL TABLES WHERE TABLE_TYPE LIKE 'VIEW';
-- 결과:
-- view_kpi_ranking_total_sales
-- view_kpi_ranking_main_product_sales
```

---

### **2단계: 백엔드 파일 교체**

```bash
# 1. 기존 파일 백업
cd backend
cp controllers/kpi.controller.js controllers/kpi.controller.old.js
cp routes/kpi.routes.js routes/kpi.routes.old.js

# 2. 새 파일로 교체
mv controllers/kpi.controller.new.js controllers/kpi.controller.js
mv routes/kpi.routes.new.js routes/kpi.routes.js
```

---

### **3단계: 초기 KPI 데이터 생성**

서버를 시작하고 초기 KPI 데이터를 생성합니다:

```bash
# 서버 시작
npm run dev

# 전체 KPI 일괄 생성 (모든 영업담당 + 전사 KPI)
curl -X POST http://localhost:3000/api/kpi/refresh-all
```

**응답 예시:**
```json
{
  "success": true,
  "message": "KPI가 갱신되었습니다.",
  "salesCount": 5,
  "results": [
    {"employeeName": "강석규", "success": true},
    {"employeeName": "김영희", "success": true},
    ...
  ],
  "admin": {...}
}
```

---

## 📊 새로운 API 엔드포인트

### **영업담당 KPI**

```bash
# 1. KPI 조회 (캐시에서 즉시 조회)
GET /api/kpi/sales/:employeeId

# 2. KPI 강제 갱신 (실시간 재계산 + 캐시 업데이트)
POST /api/kpi/sales/:employeeId/refresh

# 예시
curl http://localhost:3000/api/kpi/sales/강석규
curl -X POST http://localhost:3000/api/kpi/sales/강석규/refresh
```

### **관리자 KPI**

```bash
# 1. 전사 KPI 조회
GET /api/kpi/admin

# 2. 전사 KPI 강제 갱신
POST /api/kpi/admin/refresh

# 3. 전체매출 기여도 순위 조회 (관리자 모드용)
GET /api/kpi/admin/ranking/total

# 4. 주요제품매출 기여도 순위 조회 (관리자 모드용)
GET /api/kpi/admin/ranking/main

# 예시
curl http://localhost:3000/api/kpi/admin
curl http://localhost:3000/api/kpi/admin/ranking/total
```

### **전체 KPI 관리**

```bash
# 전체 KPI 일괄 갱신 (모든 영업담당 + 전사)
POST /api/kpi/refresh-all

curl -X POST http://localhost:3000/api/kpi/refresh-all
```

---

## 🔄 KPI 업데이트 전략

### **자동 업데이트 (권장)**

companies 테이블이 변경될 때마다 자동으로 KPI를 업데이트합니다:

```javascript
// backend/controllers/companies.controller.js 수정 예시

import { refreshSalesKPI, refreshAdminKPI } from '../services/kpi.service.js';

export const updateCompany = async (req, res) => {
    try {
        const { id } = req.params;
        const oldCompany = await getCompanyById(id);

        // 회사 정보 업데이트
        await connection.execute(
            'UPDATE companies SET ... WHERE id = ?',
            [id]
        );

        // 영향받는 담당자의 KPI 갱신
        if (oldCompany.internalManager) {
            await refreshSalesKPI(oldCompany.internalManager);
        }

        if (req.body.internalManager && req.body.internalManager !== oldCompany.internalManager) {
            await refreshSalesKPI(req.body.internalManager);
        }

        // 전사 KPI 갱신
        await refreshAdminKPI();

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
```

### **수동 업데이트 (임시)**

필요할 때마다 수동으로 갱신:

```bash
# 특정 영업담당 KPI만 갱신
curl -X POST http://localhost:3000/api/kpi/sales/강석규/refresh

# 전체 갱신 (데이터가 많으면 시간 소요)
curl -X POST http://localhost:3000/api/kpi/refresh-all
```

### **스케줄러 사용 (고급)**

매일 자정에 전체 KPI 자동 갱신:

```javascript
// backend/schedulers/kpi.scheduler.js (신규 파일)

import cron from 'node-cron';
import { refreshAllSalesKPI, refreshAdminKPI } from '../services/kpi.service.js';

// 매일 자정 (00:00)에 전체 KPI 갱신
cron.schedule('0 0 * * *', async () => {
    console.log('[스케줄러] KPI 일괄 갱신 시작');

    try {
        await refreshAllSalesKPI();
        await refreshAdminKPI();
        console.log('[스케줄러] KPI 일괄 갱신 완료');
    } catch (error) {
        console.error('[스케줄러] KPI 갱신 실패:', error);
    }
});

export default cron;
```

---

## 🗄️ 테이블 구조

### `kpi_sales` (영업담당별 KPI)

| 필드명 | 타입 | 설명 |
|--------|------|------|
| id | VARCHAR(36) | Primary Key |
| employeeId | VARCHAR(36) | 직원 ID (FK) |
| employeeName | VARCHAR(50) | 직원 이름 |
| 담당거래처 | INT | 담당 거래처 수 |
| 활성거래처 | INT | 활성 거래처 수 |
| 활성화율 | DECIMAL(5,2) | 활성화율 (%) |
| ... | ... | (14개 KPI 지표) |
| lastUpdated | TIMESTAMP | 최종 업데이트 시간 |

### `kpi_admin` (전사 KPI)

| 필드명 | 타입 | 설명 |
|--------|------|------|
| id | VARCHAR(36) | 'admin-kpi-singleton' (고정) |
| 전체거래처 | INT | 전체 거래처 수 |
| 활성거래처 | INT | 활성 거래처 수 |
| ... | ... | (12개 KPI 지표) |
| lastUpdated | TIMESTAMP | 최종 업데이트 시간 |

### 뷰 (순위 조회용)

- `view_kpi_ranking_total_sales`: 전체매출 기여도 순위
- `view_kpi_ranking_main_product_sales`: 주요제품매출 기여도 순위

---

## 🎯 관리자 모드 순위 조회

관리자 대시보드에서 "전체매출기여도" / "주요제품매출기여도" 클릭 시:

```javascript
// 프론트엔드 예시

async function showTotalSalesRanking() {
    const response = await fetch('http://localhost:3000/api/kpi/admin/ranking/total');
    const data = await response.json();

    // data.data 배열 예시:
    // [
    //   {rank: 1, employeeName: "강석규", 누적매출금액: 5000000, 전체매출기여도: 25.5},
    //   {rank: 2, employeeName: "김영희", 누적매출금액: 3000000, 전체매출기여도: 15.2},
    //   ...
    // ]

    displayRankingTable(data.data);
}
```

---

## ✅ 테스트 체크리스트

### 마이그레이션 확인
- [ ] `kpi_sales` 테이블 생성 확인
- [ ] `kpi_admin` 테이블 생성 확인
- [ ] 뷰 2개 생성 확인

### 초기 데이터 생성
- [ ] `POST /api/kpi/refresh-all` 실행
- [ ] `kpi_sales` 테이블에 데이터 존재 확인
- [ ] `kpi_admin` 테이블에 데이터 존재 확인

### API 테스트
- [ ] `GET /api/kpi/sales/강석규` - 200 OK
- [ ] `GET /api/kpi/admin` - 200 OK
- [ ] `GET /api/kpi/admin/ranking/total` - 순위 배열 반환
- [ ] `GET /api/kpi/admin/ranking/main` - 순위 배열 반환

### 프론트엔드 확인
- [ ] 영업담당 대시보드 - KPI 카드 정상 표시
- [ ] 관리자 대시보드 - KPI 카드 정상 표시
- [ ] 순위 팝업 - 클릭 시 순위 표시

---

## 🔧 문제 해결

### Q: KPI 값이 0으로 나옵니다
```bash
# 해결 방법: KPI 강제 갱신
curl -X POST http://localhost:3000/api/kpi/refresh-all
```

### Q: 순위가 표시되지 않습니다
```sql
-- MySQL에서 직접 확인
SELECT * FROM view_kpi_ranking_total_sales;
SELECT * FROM view_kpi_ranking_main_product_sales;

-- 뷰가 없으면 마이그레이션 재실행
```

### Q: 업데이트 시간이 오래되었습니다
```bash
# lastUpdated 필드를 확인하여 자동 갱신이 작동하는지 확인
# 필요시 수동 갱신
curl -X POST http://localhost:3000/api/kpi/refresh-all
```

---

## 📝 롤백 방법

문제가 발생하면 기존 방식으로 되돌릴 수 있습니다:

```bash
# 1. 파일 복구
cd backend
mv controllers/kpi.controller.old.js controllers/kpi.controller.js
mv routes/kpi.routes.old.js routes/kpi.routes.js

# 2. 테이블 삭제 (선택사항)
# DROP TABLE kpi_sales;
# DROP TABLE kpi_admin;
# DROP VIEW view_kpi_ranking_total_sales;
# DROP VIEW view_kpi_ranking_main_product_sales;

# 3. 서버 재시작
npm run dev
```

---

## 🎉 완료!

이제 KPI 조회가 **10~20배 빠르게** 작동합니다!

궁금한 점이 있으면 Daniel.K에게 문의하세요.
