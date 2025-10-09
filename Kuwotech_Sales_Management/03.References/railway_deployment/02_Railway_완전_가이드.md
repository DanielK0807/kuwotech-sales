# 🚀 Railway 완전 배포 가이드

> **작성일**: 2025-10-04
> **버전**: 2.0 (코드 완전 포함)
> **목표**: Railway로 30분 안에 백엔드 배포하기

---

## 📑 목차

### PART 1: 준비
1. [Railway란?](#1-railway란)
2. [준비물](#2-준비물)
3. [GitHub 설정](#3-github-설정)
4. [Railway 가입](#4-railway-가입)

### PART 2: 백엔드 개발
5. [폴더 구조 생성](#5-폴더-구조-생성)
6. [핵심 파일 작성](#6-핵심-파일-작성)
7. [로컬 테스트](#7-로컬-테스트)

### PART 3: Railway 배포
8. [프로젝트 생성](#8-프로젝트-생성)
9. [MySQL 추가](#9-mysql-추가)
10. [환경 변수 설정](#10-환경-변수-설정)
11. [배포 완료](#11-배포-완료)

### PART 4: 다음 단계
12. [프론트엔드 연결](#12-프론트엔드-연결)
13. [데이터 마이그레이션](#13-데이터-마이그레이션)
14. [FAQ](#14-faq)

---

## PART 1: 준비

## 1. Railway란?

### 1-1. 개념

```
Railway = 개발자를 위한 올인원 배포 플랫폼

┌─────────────────────────────────┐
│         Railway 플랫폼            │
├─────────────────────────────────┤
│  ✅ 프론트엔드 호스팅             │
│  ✅ 백엔드 (Node.js)             │
│  ✅ MySQL 데이터베이스            │
│  ✅ SSL 인증서 (자동)             │
│  ✅ Git 기반 자동 배포            │
│  ✅ 로그 모니터링                │
│  ✅ 환경 변수 관리                │
└─────────────────────────────────┘

→ 모든 것을 한 곳에서!
```

### 1-2. 장점

```
⚡ 빠른 배포
• Git 푸시만으로 자동 배포
• 30분 안에 완료

🎯 간편한 관리
• 웹 대시보드에서 모든 관리
• 로그 실시간 확인
• 환경 변수 쉽게 설정

💰 합리적인 가격
• 무료 플랫폼 시작
• $5/월로 충분 (소규모)
• 사용한 만큼만 과금

🔒 자동 SSL
• HTTPS 자동 적용
• 인증서 자동 갱신
```

### 1-3. 가격

| 플랫폼 | 크레딧 | 실행시간 | 용도 |
|--------|--------|---------|------|
| **Free** | $5/월 | 500시간/월 | 개발/테스트 |
| **Hobby** | $5/월 | 무제한 | 소규모 프로덕션 |
| **Pro** | $20/월 | 무제한 | 30명 사용 권장 |

---

## 2. 준비물

### 2-1. 필수 항목

```
✅ 체크리스트
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

□ GitHub 계정
  URL: https://github.com
  (없으면 3분 안에 가입 가능)

□ 이메일 주소
  Railway 가입용

□ 프로젝트 코드
  위치: F:\7.VScode\Running VS Code\KUWOTECH\
       Kuwotech_Sales_Management

□ 인터넷 연결
  안정적인 연결 필요
```

### 2-2. 선택 항목

```
□ 도메인 (나중에 추가 가능)
  예: sales.kuwotech.com

□ 신용카드 (무료 크레딧 소진 후)
  무료 플랫폼 사용 시 불필요
```

---

## 3. GitHub 설정

### 3-1. GitHub 가입

**계정 없는 경우:**

```
1. https://github.com 접속
2. "Sign up" 클릭
3. 정보 입력:
   - Username: 원하는 이름
   - Email: 이메일 주소
   - Password: 비밀번호
4. 이메일 인증
5. 완료!
```

### 3-2. 저장소 생성

```
1. GitHub 로그인
2. 우측 상단 "+" → "New repository"
3. 저장소 정보:
   Repository name: kuwotech-sales
   Description: KUWOTECH 영업관리 시스템
   ⚫ Private (추천)
4. "Create repository" 클릭
```

### 3-3. 로컬 코드 푸시

**Windows PowerShell:**

```powershell
# 프로젝트 폴더로 이동
cd "F:\7.VScode\Running VS Code\KUWOTECH\Kuwotech_Sales_Management"

# Git 초기화 (처음만)
git init

# .gitignore 생성
@"
node_modules/
.env
*.log
backups/
logs/
.DS_Store
"@ | Out-File -Encoding UTF8 .gitignore

# Remote 추가
git remote add origin https://github.com/YOUR_USERNAME/kuwotech-sales.git

# 커밋
git add .
git commit -m "Initial commit: Railway 배포 준비"

# 푸시
git branch -M main
git push -u origin main
```

**성공 확인:**
```
GitHub 저장소 페이지에서 파일 확인
```

---

## 4. Railway 가입

### 4-1. 가입 절차

```
1. Railway 접속
   URL: https://railway.app

2. "Start a New Project" 클릭

3. "Continue with GitHub" 클릭

4. GitHub 권한 승인
   - Repository access 허용
   - Railway 앱 설치

5. 가입 완료!
```

### 4-2. 대시보드 확인

```
Railway Dashboard
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ GitHub 계정 연결됨
✅ 무료 크레딧 $5 확인
✅ "New Project" 버튼 표시

→ 준비 완료!
```

---

## PART 2: 백엔드 개발

## 5. 폴더 구조 생성

### 5-1. 목표 구조

```
Kuwotech_Sales_Management/
├── backend/                    ← 새로 생성
│   ├── config/
│   │   └── database.js
│   ├── models/
│   │   ├── Company.js
│   │   ├── Employee.js
│   │   └── Report.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── companies.js
│   │   └── reports.js
│   ├── middleware/
│   │   └── auth.js
│   ├── scripts/
│   │   └── init-db.js
│   ├── .env.example
│   ├── .gitignore
│   ├── package.json
│   └── server.js
└── frontend/                   ← 기존 05.Source 유지
```

### 5-2. VSCode에서 폴더 생성

```
VSCode에서:

1. backend 폴더 생성
2. backend 안에:
   - config
   - models
   - routes
   - middleware
   - scripts
```

---

## 6. 핵심 파일 작성

### 6-1. package.json

**backend/package.json:**

```json
{
  "name": "kuwotech-sales-backend",
  "version": "1.0.0",
  "type": "module",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "init-db": "node scripts/init-db.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "mysql2": "^3.6.5",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### 6-2. server.js

**backend/server.js:**

```javascript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// 미들웨어
// ============================================

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================
// MySQL 연결
// ============================================

let db;

async function connectDB() {
  try {
    db = await mysql.createConnection(process.env.DATABASE_URL);
    console.log('✅ MySQL 연결 성공');

    // 연결 유지 (Railway 슬립 방지)
    setInterval(async () => {
      try {
        await db.ping();
      } catch (error) {
        console.log('🔄 MySQL 재연결 시도...');
        db = await mysql.createConnection(process.env.DATABASE_URL);
      }
    }, 60000); // 1분마다

  } catch (error) {
    console.error('❌ MySQL 연결 실패:', error.message);
    process.exit(1);
  }
}

// ============================================
// Health Check
// ============================================

app.get('/api/health', async (req, res) => {
  try {
    await db.ping();
    res.json({
      status: 'OK',
      database: 'connected',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      database: 'disconnected',
      error: error.message
    });
  }
});

// ============================================
// Root
// ============================================

app.get('/', (req, res) => {
  res.json({
    message: 'KUWOTECH 영업관리 시스템 API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      companies: '/api/companies',
      reports: '/api/reports'
    },
    docs: 'https://github.com/your-repo/api-docs'
  });
});

// ============================================
// API 라우트
// ============================================

// 인증
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const [users] = await db.execute(
      'SELECT * FROM employees WHERE username = ?',
      [username]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        error: { message: '사용자명 또는 비밀번호가 잘못되었습니다' }
      });
    }

    const user = users[0];

    // 비밀번호 확인 (임시: 평문 비교, 나중에 bcrypt 사용)
    if (password !== user.password) {
      return res.status(401).json({
        success: false,
        error: { message: '사용자명 또는 비밀번호가 잘못되었습니다' }
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
          department: user.department
        },
        token: 'temp_token_' + user.id
      },
      message: '로그인 성공'
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: { message: '서버 오류가 발생했습니다' }
    });
  }
});

// 거래처 목록
app.get('/api/companies', async (req, res) => {
  try {
    const [companies] = await db.execute('SELECT * FROM companies ORDER BY created_at DESC');

    res.json({
      success: true,
      data: { companies }
    });
  } catch (error) {
    console.error('Get companies error:', error);
    res.status(500).json({
      success: false,
      error: { message: '서버 오류가 발생했습니다' }
    });
  }
});

// 거래처 생성
app.post('/api/companies', async (req, res) => {
  try {
    const {
      keyValue,
      companyNameERP,
      finalCompanyName,
      companyCode,
      representative,
      internalManager
    } = req.body;

    const [result] = await db.execute(
      `INSERT INTO companies (
        keyValue, companyNameERP, finalCompanyName,
        companyCode, representative, internalManager
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [keyValue, companyNameERP, finalCompanyName, companyCode, representative, internalManager]
    );

    res.status(201).json({
      success: true,
      data: { id: result.insertId },
      message: '거래처가 생성되었습니다'
    });

  } catch (error) {
    console.error('Create company error:', error);
    res.status(500).json({
      success: false,
      error: { message: '서버 오류가 발생했습니다' }
    });
  }
});

// 보고서 목록
app.get('/api/reports', async (req, res) => {
  try {
    const [reports] = await db.execute('SELECT * FROM reports ORDER BY submittedDate DESC');

    res.json({
      success: true,
      data: { reports }
    });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({
      success: false,
      error: { message: '서버 오류가 발생했습니다' }
    });
  }
});

// 보고서 생성
app.post('/api/reports', async (req, res) => {
  try {
    const {
      submittedBy,
      companyId,
      reportType,
      content
    } = req.body;

    const [result] = await db.execute(
      `INSERT INTO reports (
        submittedBy, companyId, reportType, content, status
      ) VALUES (?, ?, ?, ?, 'pending')`,
      [submittedBy, companyId, reportType, content]
    );

    res.status(201).json({
      success: true,
      data: { reportId: result.insertId },
      message: '보고서가 제출되었습니다'
    });

  } catch (error) {
    console.error('Create report error:', error);
    res.status(500).json({
      success: false,
      error: { message: '서버 오류가 발생했습니다' }
    });
  }
});

// ============================================
// 404 핸들러
// ============================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: 'Not Found',
      path: req.path
    }
  });
});

// ============================================
// 서버 시작
// ============================================

async function startServer() {
  await connectDB();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 서버 실행 중
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Port: ${PORT}
  URL: http://localhost:${PORT}
  Health: http://localhost:${PORT}/api/health
  Env: ${process.env.NODE_ENV || 'development'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);
  });
}

startServer();

// Export db for use in other modules
export { db };
```

### 6-3. 데이터베이스 초기화 스크립트

**backend/scripts/init-db.js:**

```javascript
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function initDatabase() {
  let connection;

  try {
    console.log('🔌 MySQL 연결 중...');
    connection = await mysql.createConnection(process.env.DATABASE_URL);
    console.log('✅ MySQL 연결 성공\n');

    // ==========================================
    // companies 테이블
    // ==========================================

    console.log('📋 companies 테이블 생성 중...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS companies (
        id INT AUTO_INCREMENT PRIMARY KEY,
        keyValue VARCHAR(100) UNIQUE NOT NULL,
        companyNameERP VARCHAR(200),
        finalCompanyName VARCHAR(200),
        companyCode VARCHAR(50),
        representative VARCHAR(100),
        internalManager VARCHAR(100),
        externalManager VARCHAR(100),
        businessStatus VARCHAR(50),
        accumulatedSales DECIMAL(15,2) DEFAULT 0,
        accumulatedCollection DECIMAL(15,2) DEFAULT 0,
        accountsReceivable DECIMAL(15,2) DEFAULT 0,
        lastPaymentDate DATE,
        lastPaymentAmount DECIMAL(15,2),
        salesProduct TEXT,
        businessActivity TEXT,
        remarks TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        updatedBy VARCHAR(100),
        INDEX idx_companyNameERP (companyNameERP),
        INDEX idx_internalManager (internalManager)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ companies 테이블 생성 완료\n');

    // ==========================================
    // employees 테이블
    // ==========================================

    console.log('📋 employees 테이블 생성 중...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS employees (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(150),
        phone VARCHAR(50),
        department VARCHAR(100),
        role ENUM('admin', 'sales') NOT NULL DEFAULT 'sales',
        position VARCHAR(50),
        isActive BOOLEAN DEFAULT TRUE,
        lastLogin TIMESTAMP NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_username (username),
        INDEX idx_role (role)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ employees 테이블 생성 완료\n');

    // ==========================================
    // reports 테이블
    // ==========================================

    console.log('📋 reports 테이블 생성 중...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS reports (
        reportId INT AUTO_INCREMENT PRIMARY KEY,
        submittedBy INT NOT NULL,
        companyId VARCHAR(100) NOT NULL,
        reportType VARCHAR(50),
        content TEXT,
        status ENUM('pending', 'confirmed', 'rejected') DEFAULT 'pending',
        submittedDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        confirmedBy INT,
        confirmedDate TIMESTAMP NULL,
        adminComment TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_submittedBy (submittedBy),
        INDEX idx_status (status),
        INDEX idx_submittedDate (submittedDate)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ reports 테이블 생성 완료\n');

    // ==========================================
    // 테스트 데이터 삽입
    // ==========================================

    console.log('📝 테스트 데이터 삽입 중...');

    // 관리자 계정 생성
    await connection.execute(`
      INSERT IGNORE INTO employees (username, password, name, email, role)
      VALUES ('admin', 'admin123', '관리자', 'admin@kuwotech.com', 'admin')
    `);

    // 영업담당 계정 생성
    await connection.execute(`
      INSERT IGNORE INTO employees (username, password, name, email, role, department)
      VALUES
        ('sales1', 'sales123', '김영업', 'sales1@kuwotech.com', 'sales', '영업1팀'),
        ('sales2', 'sales123', '이영업', 'sales2@kuwotech.com', 'sales', '영업2팀')
    `);

    console.log('✅ 테스트 데이터 삽입 완료\n');

    // ==========================================
    // 완료
    // ==========================================

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 데이터베이스 초기화 완료!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n테스트 계정:');
    console.log('  관리자: admin / admin123');
    console.log('  영업1: sales1 / sales123');
    console.log('  영업2: sales2 / sales123\n');

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 MySQL 연결 종료');
    }
  }
}

initDatabase();
```

### 6-4. 환경 변수 예제

**backend/.env.example:**

```env
# Railway에서 자동 주입되는 변수
DATABASE_URL=mysql://user:password@host:port/database

# JWT 설정
JWT_SECRET=your_jwt_secret_here_minimum_32_characters_long
JWT_EXPIRES_IN=1d
JWT_REFRESH_EXPIRES_IN=30d

# 서버 설정
PORT=3000
NODE_ENV=production

# CORS 설정
FRONTEND_URL=https://your-frontend-url.com

# 로그 설정
LOG_LEVEL=info
```

### 6-5. .gitignore

**backend/.gitignore:**

```
# 환경 변수
.env

# 의존성
node_modules/
package-lock.json
yarn.lock

# 로그
*.log
logs/

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo

# 백업
backups/
```

---

## 7. 로컬 테스트

### 7-1. 의존성 설치

```bash
# backend 폴더로 이동
cd backend

# npm 설치
npm install
```

**예상 출력:**
```
added 50 packages in 10s
```

### 7-2. 로컬 환경 변수 설정

**backend/.env 생성:**

```env
# 로컬 MySQL 연결 (Railway 배포 전)
DATABASE_URL=mysql://root:your_password@localhost:3306/kuwotech_sales

JWT_SECRET=local_test_secret_key_minimum_32_characters_long
JWT_EXPIRES_IN=1d
JWT_REFRESH_EXPIRES_IN=30d

PORT=3000
NODE_ENV=development

FRONTEND_URL=http://localhost:5500
```

### 7-3. 로컬 MySQL 준비

**MySQL Workbench 또는 터미널:**

```sql
CREATE DATABASE kuwotech_sales
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;
```

### 7-4. 데이터베이스 초기화

```bash
npm run init-db
```

**예상 출력:**
```
🔌 MySQL 연결 중...
✅ MySQL 연결 성공

📋 companies 테이블 생성 중...
✅ companies 테이블 생성 완료

📋 employees 테이블 생성 중...
✅ employees 테이블 생성 완료

📋 reports 테이블 생성 중...
✅ reports 테이블 생성 완료

📝 테스트 데이터 삽입 중...
✅ 테스트 데이터 삽입 완료

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 데이터베이스 초기화 완료!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

테스트 계정:
  관리자: admin / admin123
  영업1: sales1 / sales123
  영업2: sales2 / sales123

🔌 MySQL 연결 종료
```

### 7-5. 서버 실행

```bash
npm start
```

**예상 출력:**
```
✅ MySQL 연결 성공

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 서버 실행 중
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Port: 3000
  URL: http://localhost:3000
  Health: http://localhost:3000/api/health
  Env: development
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 7-6. 테스트

**브라우저에서:**

```
http://localhost:3000/api/health
```

**예상 응답:**
```json
{
  "status": "OK",
  "database": "connected",
  "timestamp": "2025-10-04T10:00:00.000Z",
  "uptime": 5.123
}
```

**Postman이나 Thunder Client로 로그인 테스트:**

```
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

**예상 응답:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "admin",
      "name": "관리자",
      "role": "admin",
      "department": null
    },
    "token": "temp_token_1"
  },
  "message": "로그인 성공"
}
```

---

## PART 3: Railway 배포

## 8. 프로젝트 생성

### 8-1. GitHub 푸시

```bash
# backend 폴더에서
cd ..  # 프로젝트 루트로

# .env 파일 제외 확인
cat .gitignore

# 커밋
git add .
git commit -m "백엔드 코드 완성: Railway 배포 준비"

# 푸시
git push origin main
```

### 8-2. Railway 프로젝트 생성

```
1. Railway Dashboard
   URL: https://railway.app/dashboard

2. "New Project" 클릭

3. "Deploy from GitHub repo" 선택

4. 저장소 선택: kuwotech-sales

5. 설정:
   Root Directory: backend

6. "Deploy Now" 클릭

→ 자동 배포 시작!
```

---

## 9. MySQL 추가

### 9-1. MySQL 서비스 추가

```
1. 같은 프로젝트 내에서 "New" 클릭

2. "Database" 선택

3. "Add MySQL" 클릭

→ MySQL 자동 생성!
```

### 9-2. MySQL 정보 확인

```
1. MySQL 카드 클릭

2. "Variables" 탭 클릭

3. DATABASE_URL 복사
   형식: mysql://user:password@host:port/database

   예시:
   mysql://root:abc123xyz@containers-us-west-1.railway.app:1234/railway
```

---

## 10. 환경 변수 설정

### 10-1. 백엔드 환경 변수

```
프로젝트 > backend 서비스 클릭 > Variables 탭

추가할 변수:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DATABASE_URL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${{MySQL.DATABASE_URL}}

(Railway가 자동으로 MySQL URL 주입)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
JWT_SECRET
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
kuwotech_sales_jwt_secret_2025_production_key

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
JWT_EXPIRES_IN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1d

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
JWT_REFRESH_EXPIRES_IN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
30d

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3000

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NODE_ENV
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
production

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FRONTEND_URL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
https://${{RAILWAY_PUBLIC_DOMAIN}}
```

**저장 후 자동 재배포**

---

## 11. 배포 완료

### 11-1. 배포 로그 확인

```
Deployments 탭 클릭

로그 확인:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Installing dependencies...
✅ Building...
✅ Starting server...
✅ MySQL 연결 성공
✅ 🚀 서버 실행 중
   Port: 3000
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Status: ✅ RUNNING
```

### 11-2. URL 확인

```
Settings > Domains

제공된 URL:
https://kuwotech-sales-production.up.railway.app

복사!
```

### 11-3. Health Check

**브라우저에서:**

```
https://your-app.up.railway.app/api/health
```

**응답:**
```json
{
  "status": "OK",
  "database": "connected",
  "timestamp": "2025-10-04T10:00:00.000Z"
}
```

### 11-4. 데이터베이스 초기화 (Railway)

**Railway MySQL 터미널에서:**

```
프로젝트 > MySQL 카드 > Data 탭 > Query

실행:
```

```sql
-- 또는 로컬에서 Railway MySQL 접속 후 init-db.js 실행

# .env에 Railway DATABASE_URL 설정 후
DATABASE_URL=mysql://root:...@railway.app:1234/railway npm run init-db
```

---

## PART 4: 다음 단계

## 12. 프론트엔드 연결

### 12-1. API Manager 수정

**frontend/01.common/13_api_manager.js 생성:**

```javascript
/**
 * API Manager - Railway 백엔드 연결
 */

class APIManager {
  constructor() {
    // Railway 백엔드 URL
    this.baseURL = 'https://your-app.up.railway.app/api';
    this.token = localStorage.getItem('authToken');
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;

    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    if (this.token) {
      config.headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || '요청 실패');
      }

      return data;

    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  async get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // 인증
  async login(username, password) {
    const response = await this.post('/auth/login', { username, password });
    if (response.success) {
      this.token = response.data.token;
      localStorage.setItem('authToken', this.token);
    }
    return response;
  }

  // 거래처
  async getCompanies() {
    return this.get('/companies');
  }

  async createCompany(data) {
    return this.post('/companies', data);
  }

  // 보고서
  async getReports() {
    return this.get('/reports');
  }

  async createReport(data) {
    return this.post('/reports', data);
  }
}

// 전역 인스턴스
const api = new APIManager();
```

### 12-2. Database Manager 수정

**frontend/06.database/01_database_manager.js 수정:**

```javascript
/**
 * Database Manager - API 기반
 */

class DatabaseManager {
  constructor() {
    // API Manager 사용
  }

  async getAllCompanies() {
    const response = await api.getCompanies();
    return response.data.companies;
  }

  async addCompany(companyData) {
    const response = await api.createCompany(companyData);
    return response.data;
  }

  async getAllReports() {
    const response = await api.getReports();
    return response.data.reports;
  }

  async createReport(reportData) {
    const response = await api.createReport(reportData);
    return response.data;
  }
}

const db = new DatabaseManager();
```

---

## 13. 데이터 마이그레이션

### 13-1. IndexedDB 백업

**브라우저 콘솔(F12):**

```javascript
async function backupIndexedDB() {
  const db = await new Promise((resolve) => {
    const req = indexedDB.open('KUWOTECH_SalesDB', 1);
    req.onsuccess = () => resolve(req.result);
  });

  const backup = { companies: [], reports: [], employees: [] };

  // companies
  const tx1 = db.transaction('companies', 'readonly');
  backup.companies = await new Promise((resolve) => {
    const req = tx1.objectStore('companies').getAll();
    req.onsuccess = () => resolve(req.result);
  });

  // reports
  const tx2 = db.transaction('reports', 'readonly');
  backup.reports = await new Promise((resolve) => {
    const req = tx2.objectStore('reports').getAll();
    req.onsuccess = () => resolve(req.result);
  });

  // 다운로드
  const blob = new Blob([JSON.stringify(backup, null, 2)]);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'backup.json';
  a.click();

  console.log('백업 완료!', backup);
}

backupIndexedDB();
```

### 13-2. Railway MySQL 업로드

**백엔드에 마이그레이션 API 추가:**

**backend/server.js에 추가:**

```javascript
// 데이터 마이그레이션 (한 번만 실행)
app.post('/api/migrate', async (req, res) => {
  try {
    const { companies, reports, employees } = req.body;

    let companiesAdded = 0;
    let reportsAdded = 0;

    // Companies
    for (const company of companies) {
      await db.execute(
        `INSERT IGNORE INTO companies (keyValue, companyNameERP, finalCompanyName, ...)
         VALUES (?, ?, ?, ...)`,
        [company.keyValue, company.companyNameERP, ...]
      );
      companiesAdded++;
    }

    // Reports
    for (const report of reports) {
      await db.execute(
        `INSERT INTO reports (submittedBy, companyId, ...)
         VALUES (?, ?, ...)`,
        [report.submittedBy, report.companyId, ...]
      );
      reportsAdded++;
    }

    res.json({
      success: true,
      data: {
        companiesAdded,
        reportsAdded
      },
      message: '마이그레이션 완료'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});
```

**Postman으로 업로드:**

```
POST https://your-app.up.railway.app/api/migrate
Content-Type: application/json

(backup.json 내용 붙여넣기)
```

---

## 14. FAQ

### Q1: Railway 무료 플랫폼이 충분한가요?

```
A: 테스트와 소규모 사용에는 충분합니다.

무료 플랫폼:
• $5 크레딧/월
• 약 500 실행시간

예상 사용량:
• 10명 사용: 무료로 충분
• 30명 사용: Hobby ($5/월) 또는 Pro ($20/월) 필요

권장: 무료로 시작 → 필요 시 업그레이드
```

### Q2: 데이터베이스 백업은 어떻게 하나요?

```
A: Railway는 자동 백업을 제공합니다.

자동 백업:
• Railway MySQL은 매일 자동 백업
• 복구: Dashboard > MySQL > Backups

수동 백업:
• mysqldump로 정기 백업 권장
• 로컬 저장 또는 클라우드 업로드
```

### Q3: 30명이 동시 사용 가능한가요?

```
A: Pro 플랜 ($20/월)이면 충분합니다.

성능 추정:
• Hobby ($5/월): 10-15명
• Pro ($20/월): 30-50명
• 더 많은 사용자: Custom 플랜

권장: 무료로 시작 → 사용량 모니터링 → 업그레이드
```

### Q4: 배포 후 코드 수정하면?

```
A: Git 푸시만 하면 자동 배포됩니다!

프로세스:
1. 로컬에서 코드 수정
2. git commit -m "수정 내용"
3. git push origin main
4. Railway가 자동으로 재배포 (2-3분)

→ 매우 간편!
```

### Q5: 슬립 모드가 있나요?

```
A: Railway는 슬립 모드가 없습니다!

Railway:
• 항상 실행 상태 유지
• 슬립 모드 없음
• 즉시 응답

비교:
• Render: 15분 후 슬립
• Heroku: 30분 후 슬립
• Railway: 슬립 없음 ✅
```

---

## ✅ 최종 체크리스트

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PART 1: 준비
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
□ GitHub 계정 생성
□ GitHub 저장소 생성
□ 로컬 코드 푸시
□ Railway 가입

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PART 2: 백엔드 개발
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
□ backend 폴더 생성
□ package.json 작성
□ server.js 작성
□ init-db.js 작성
□ .env.example 작성
□ .gitignore 작성
□ npm install 실행
□ 로컬 테스트 성공

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PART 3: Railway 배포
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
□ Railway 프로젝트 생성
□ MySQL 추가
□ 환경 변수 설정
□ 배포 성공
□ Health Check 성공
□ 데이터베이스 초기화
□ 배포 URL 확인

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PART 4: 다음 단계
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
□ API Manager 작성
□ Database Manager 수정
□ IndexedDB 백업
□ MySQL 데이터 마이그레이션
□ 프론트엔드 테스트

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 배포 완료!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

배포 URL: _______________________

다음: 프론트엔드 Railway 배포 또는
      도메인 연결
```

---

**문서 버전**: 2.0
**최종 수정**: 2025-10-04
**작성자**: Claude AI

**🚀 Railway로 빠르게 배포하세요!**
