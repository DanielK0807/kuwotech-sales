# KUWOTECH 영업관리 시스템

## 프로젝트 개요
KUWOTECH 영업관리 시스템 - Railway 기반 클라우드 배포

## 기술 스택
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Node.js, Express.js
- **Database**: MySQL (Railway)
- **Deployment**: Railway
- **Authentication**: JWT

## 프로젝트 구조
```
KUWOTECH/
├── Kuwotech_Sales_Management/
│   ├── backend/                 # Node.js 백엔드 API
│   │   ├── server.js           # 메인 서버
│   │   ├── config/             # 설정 파일
│   │   ├── controllers/        # API 컨트롤러
│   │   ├── routes/             # API 라우트
│   │   └── middleware/         # 인증 미들웨어
│   ├── 05.Source/              # 프론트엔드 소스
│   │   ├── 01.common/          # 공통 모듈
│   │   ├── 02.login/           # 로그인
│   │   ├── 03.sales_mode/      # 영업담당 모드
│   │   └── 04.admin_mode/      # 관리자 모드
│   └── 04.Program Development Plan/  # 개발 문서
├── Dockerfile                   # Railway 배포 설정
└── .gitignore
```

## 주요 기능
- ✅ JWT 기반 인증 시스템
- ✅ 영업담당/관리자 권한 분리
- ✅ 거래처 관리 (CRUD)
- ✅ 실적보고서 작성/확인
- ✅ KPI 대시보드
- ✅ 데이터 다운로드 (Excel)

## 배포 정보
- **Production URL**: https://kuwotech-sales-production-aa64.up.railway.app
- **환경**: Railway Production
- **자동 배포**: GitHub Push → Railway Auto-Deploy

## 개발 환경 설정

### Backend 로컬 실행
```bash
cd Kuwotech_Sales_Management/backend
npm install
npm start
```

### 환경 변수 (.env)
```
NODE_ENV=development
PORT=3000
DATABASE_URL=mysql://...
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=1d
```

## 최근 업데이트 (2025-10-09)
- 🔴 **HIGH**: employees.js Storage API 불일치 수정
- 🟠 **MEDIUM**: API URL 중앙화 (GlobalConfig 사용)
- 🧹 미사용 코드 정리
- ✅ Syntax 검증 완료

## 라이선스
© 2025 KUWOTECH. All rights reserved.
