# KUWOTECH 배포 자동화 스크립트

Git 커밋과 Railway 배포를 한 번에 처리하는 자동화 스크립트입니다.

## 📋 기능

✅ **자동 Git 커밋**
- 05.Source 디렉토리의 변경사항 자동 스테이징
- 커밋 메시지 지정
- 변경사항 없을 시 건너뛰기

✅ **자동 Railway 배포**
- Railway 배포 자동 트리거
- 배포 상태 실시간 모니터링 (최대 3분)
- 배포 완료 대기

✅ **자동 검증**
- Health endpoint 검증 (HTTP 200 확인)
- 배포 성공/실패 자동 감지
- 최종 배포 정보 출력

## 🚀 사용법

### Git Bash 사용 (권장)

```bash
cd "F:/7.VScode/Running VS Code/KUWOTECH/scripts"
./deploy.sh "커밋 메시지"
```

**예시:**
```bash
./deploy.sh "Week 2: 변수명 일관성 수정"
./deploy.sh "fix: 버그 수정 - KPI 계산 오류"
./deploy.sh "feat: 신규 기능 추가"
```

### PowerShell 사용

```powershell
cd "F:\7.VScode\Running VS Code\KUWOTECH\scripts"
.\deploy.ps1 -CommitMessage "커밋 메시지"
```

**예시:**
```powershell
.\deploy.ps1 -CommitMessage "Week 2: 변수명 일관성 수정"
```

## 📖 실행 단계

스크립트는 다음 단계를 자동으로 수행합니다:

### Step 1: Git 상태 확인
- Git 저장소 확인
- 변경된 파일 개수 확인
- 변경사항 목록 출력

### Step 2: Git 커밋
- `05.Source/` 디렉토리 변경사항 스테이징
- 커밋 생성
- 커밋 해시 저장

### Step 3: Railway 배포
- Railway 연결 확인
- 배포 업로드 시작
- 배포 ID 확인

### Step 4: 배포 상태 모니터링
- 10초마다 배포 상태 확인
- 상태 변화 실시간 출력
- SUCCESS/FAILED/CRASHED 감지

### Step 5: Health Check
- 5초 대기 (서비스 시작 시간)
- `/api/health` endpoint 호출
- HTTP 200 응답 확인

### Step 6: 최종 검증
- 최신 배포 정보 출력
- 최신 로그 5줄 출력
- 배포 요약 출력

## ✅ 성공 출력 예시

```
==================================================
[INFO] 배포 프로세스 시작
==================================================
[INFO] Step 1: Git 상태 확인
[INFO] 변경된 파일: 8개
 M Kuwotech_Sales_Management/05.Source/01.common/04_terms.js
 M Kuwotech_Sales_Management/05.Source/05.kpi/01_kpi_calculator.js
 ...
==================================================
[INFO] Step 2: Git 커밋 진행
[SUCCESS] 커밋 완료: bd79af4
==================================================
[INFO] Step 3: Railway 배포 시작
[INFO] 배포 업로드 중...
[SUCCESS] 배포 업로드 완료
==================================================
[INFO] Step 4: 배포 상태 모니터링 (최대 3분)
[INFO] 배포 상태: BUILDING (10초 경과)
[INFO] 배포 상태: BUILDING (20초 경과)
[INFO] 배포 상태: SUCCESS (30초 경과)
[SUCCESS] 배포 완료!
==================================================
[INFO] Step 5: 서비스 Health Check
[SUCCESS] Health Check 성공 (HTTP 200)
==================================================
[INFO] Step 6: 최종 배포 정보
[SUCCESS] ✅ 배포 완료!
==================================================

📋 배포 요약:
  - 커밋: bd79af4
  - 메시지: Week 2: 변수명 일관성 수정
  - URL: https://kuwotech-sales-production-aa64.up.railway.app
  - 상태: ✅ SUCCESS

==================================================
```

## ⚠️ 에러 처리

### 커밋 메시지 누락
```bash
./deploy.sh
# [ERROR] 커밋 메시지를 입력해주세요.
# 사용법: ./deploy.sh "커밋 메시지"
```

### 변경사항 없음
```
[WARNING] 커밋할 변경사항이 없습니다.
배포만 진행할까요? (y/n)
```
- `y` 입력: 커밋 없이 배포만 진행
- `n` 입력: 배포 취소

### 배포 실패
```
[ERROR] 배포 실패: FAILED
[INFO] 로그를 확인하세요:
[최근 20줄 로그 출력]
```

### Health Check 실패
```
[ERROR] Health Check 실패 (HTTP 500)
```

### 배포 타임아웃
```
[ERROR] 배포 타임아웃 (3분 초과)
```

## 🛠️ 문제 해결

### Git Bash에서 실행 권한 오류
```bash
chmod +x deploy.sh
```

### Railway 연결 안됨
```bash
cd "F:/7.VScode/Running VS Code/KUWOTECH/Kuwotech_Sales_Management"
railway status
# Railway 프로젝트 확인
```

### PowerShell 실행 정책 오류
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## 📝 커밋 메시지 컨벤션

권장 커밋 메시지 형식:

```
Week N: [작업 내용]
feat: [새 기능]
fix: [버그 수정]
refactor: [코드 리팩토링]
docs: [문서 수정]
test: [테스트 추가/수정]
```

**예시:**
- `Week 1: Terms.js 통일 및 한글 용어 수정`
- `feat: KPI 대시보드 신규 기능 추가`
- `fix: 매출집중도 계산 오류 수정`
- `refactor: 데이터베이스 연결 로직 개선`

## 🔗 관련 정보

- **Railway 프로젝트**: exciting-freedom
- **Railway 환경**: production
- **서비스 이름**: kuwotech-sales
- **배포 URL**: https://kuwotech-sales-production-aa64.up.railway.app

## 📞 지원

문제 발생 시:
1. 스크립트 실행 로그 확인
2. Railway 로그 확인: `railway logs --lines 50`
3. Git 상태 확인: `git status`
4. Railway 상태 확인: `railway status`

---

**마지막 업데이트**: 2025-10-09
**작성자**: Daniel.K
