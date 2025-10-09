# Railway 배포 가이드

## 📦 프로젝트 구조

이 프로젝트는 **통합 배포** 방식을 사용합니다:
- **백엔드**: Express 서버 (API)
- **프론트엔드**: Static 파일 서빙 (05.Source)
- **데이터베이스**: Railway MySQL

Railway에 배포하면 **하나의 URL**로 프론트엔드와 백엔드 모두 사용 가능합니다.

---

## 🚀 배포 방법

### 1단계: 변경사항 커밋

```bash
git add .
git commit -m "프론트엔드 통합 배포 설정"
git push origin main
```

### 2단계: Railway 자동 배포

Railway는 git push를 감지하고 자동으로 배포합니다:

1. **빌드 시작**: Railway가 코드를 받아서 빌드
2. **의존성 설치**: `npm install`
3. **서버 시작**: `npm start`
4. **배포 완료**: 몇 분 후 완료

---

## 🌐 접속 URL

### Railway 프로덕션
```
https://kuwotech-sales-production.up.railway.app
```

- **루트 (/)**: 자동으로 로그인 페이지로 리다이렉트
- **로그인**: `/02.login/01_login.html`
- **API**: `/api/*`
- **헬스체크**: `/api/health`

---

## 🔧 환경 설정

### Railway 환경 변수

Railway 대시보드에서 설정:

```env
DATABASE_URL=mysql://root:password@host:port/database
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=1d
PORT=8080
NODE_ENV=production
```

**중요**: Railway는 `PORT` 환경 변수를 자동으로 제공합니다.

---

## 📂 배포되는 파일

```
Kuwotech_Sales_Management/
├── backend/              ← 백엔드 코드
│   ├── server.js         ← 진입점
│   ├── package.json
│   ├── controllers/
│   ├── routes/
│   └── config/
├── 05.Source/            ← 프론트엔드 (정적 파일로 서빙)
│   ├── 02.login/
│   ├── 03.sales_mode/
│   ├── 04.admin_mode/
│   └── 06.database/
└── 02.Fonts_Logos/       ← 로고 및 폰트
```

---

## 🔍 로컬 테스트

배포 전 로컬에서 테스트:

### 방법 1: npm 스크립트 사용

```bash
cd backend
npm run dev
```

브라우저에서 `http://localhost:3000` 접속

### 방법 2: 배치 파일 사용

```bash
backend/START_SERVER.bat 더블클릭
```

---

## ✅ 배포 확인

1. **서버 상태 확인**
   ```
   https://kuwotech-sales-production.up.railway.app/api/health
   ```

   응답:
   ```json
   {
     "status": "OK",
     "database": "connected",
     "server": "running",
     "timestamp": "..."
   }
   ```

2. **로그인 페이지 접속**
   ```
   https://kuwotech-sales-production.up.railway.app
   ```

3. **API 테스트**
   ```
   https://kuwotech-sales-production.up.railway.app/api
   ```

---

## 🐛 문제 해결

### 문제 1: 프론트엔드가 로드되지 않음

**원인**: 05.Source 폴더가 배포되지 않음

**해결**:
1. `.gitignore` 확인 - `05.Source/`가 주석 처리되어 있는지 확인
2. `git add 05.Source/` 명령 실행
3. 다시 커밋 및 푸시

### 문제 2: API 연결 오류

**원인**: CORS 또는 URL 설정 문제

**해결**:
1. 브라우저 콘솔에서 `🔗 API 서버 연결` 로그 확인
2. `/api`로 시작하는지 확인 (상대 경로)
3. Railway 로그에서 CORS 에러 확인

### 문제 3: 데이터베이스 연결 실패

**원인**: 환경 변수 누락

**해결**:
1. Railway 대시보드 → Variables 확인
2. `DATABASE_URL` 설정 확인
3. MySQL 서비스가 실행 중인지 확인

---

## 📊 배포 흐름도

```
로컬 개발
   ↓ git push
Railway Git Trigger
   ↓
자동 빌드
   ↓
npm install
   ↓
npm start (server.js)
   ↓
서버 시작
   ├─ API 서버 (/api/*)
   └─ Static 파일 서빙 (/)
   ↓
배포 완료 ✅
```

---

## 🔒 보안

### 환경 변수 관리

**절대 커밋하지 말 것**:
- `.env` 파일
- 데이터베이스 비밀번호
- JWT Secret

### CORS 정책

- **프로덕션**: Railway 도메인만 허용
- **개발**: localhost 허용
- **같은 서버**: origin 없음 (CORS 불필요)

---

## 📝 체크리스트

배포 전 확인사항:

- [ ] `.gitignore` 확인
- [ ] 환경 변수 설정 (Railway)
- [ ] 로컬 테스트 완료
- [ ] 커밋 메시지 작성
- [ ] git push
- [ ] Railway 배포 로그 확인
- [ ] 프로덕션 URL 접속 테스트
- [ ] 로그인 기능 테스트
- [ ] API 엔드포인트 테스트

---

## 🎉 완료!

이제 Railway에서 프론트엔드와 백엔드가 통합되어 서비스됩니다.

- **컴퓨터를 껐다 켜도 문제없음** ✅
- **별도 서버 실행 불필요** ✅
- **CORS 문제 해결** ✅
- **하나의 URL로 모두 접속** ✅

---

**문의**: 개발팀
**마지막 업데이트**: 2025-10-05
