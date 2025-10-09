# 🚀 완전 자동화 배포 가이드

## 1️⃣ GitHub Repository 생성 (1회만)

### 방법 A: GitHub Desktop (권장 - 가장 쉬움)
```
1. GitHub Desktop 실행
2. File → Add Local Repository
3. 경로: F:\7.VScode\Running VS Code\KUWOTECH
4. "Publish repository" 클릭
5. Private ✓
6. Publish
```

### 방법 B: GitHub 웹사이트
```
1. https://github.com/new 접속
2. Repository name: KUWOTECH-Sales-Management
3. Private ✓
4. Initialize with README 체크 해제
5. Create repository
6. 다음 명령어 실행:
```

```bash
cd "F:\7.VScode\Running VS Code\KUWOTECH"
git remote add origin https://github.com/YOUR_USERNAME/KUWOTECH-Sales-Management.git
git push -u origin master
```

---

## 2️⃣ Railway 자동 배포 연결 (1회만)

### Railway Dashboard 설정
```
1. https://railway.app 접속
2. 프로젝트 "exciting-freedom" 선택
3. Service "kuwotech-sales" 선택
4. Settings 탭 클릭
5. "Connect GitHub Repo" 클릭
6. 방금 생성한 repository 선택
7. Branch: master 선택
8. Auto-deploy 활성화 ✓
9. Save
```

### Railway Token 설정 (GitHub Actions용)
```
1. Railway Dashboard → Account Settings
2. Tokens 탭
3. "Create New Token" 클릭
4. Token 복사
5. GitHub Repository → Settings → Secrets and variables → Actions
6. "New repository secret" 클릭
7. Name: RAILWAY_TOKEN
8. Value: (복사한 token 붙여넣기)
9. Add secret
```

---

## 3️⃣ 이후 배포 방법 (완전 자동화)

### 로컬 개발 → 자동 배포
```bash
# 1. 코드 수정
# 2. Git 커밋
git add .
git commit -m "feat: 새로운 기능 추가"

# 3. GitHub 푸시 (자동 배포 시작!)
git push

# 끝! Railway가 자동으로 배포합니다.
```

### 배포 확인
```
- GitHub: Actions 탭에서 워크플로우 진행 상황 확인
- Railway: Dashboard에서 배포 로그 확인
- Production: https://kuwotech-sales-production-aa64.up.railway.app
```

---

## ✅ 설정 완료 체크리스트

- [ ] GitHub Repository 생성 완료
- [ ] Railway GitHub 연결 완료
- [ ] Railway Token 설정 완료 (GitHub Actions용)
- [ ] 첫 번째 git push 성공
- [ ] Railway 자동 배포 확인
- [ ] Production URL 접속 확인

---

## 🔧 트러블슈팅

### 배포 실패 시
```bash
# Railway 로그 확인
cd "F:\7.VScode\Running VS Code\KUWOTECH\Kuwotech_Sales_Management\backend"
railway logs

# 최근 배포 상태 확인
railway deployment list
```

### Database 문제 시
```bash
# Database 변수 확인
railway variables

# Database 초기화 (주의!)
railway run npm run init-db-v2
```

---

## 📊 배포 플로우

```
코드 수정
    ↓
git commit
    ↓
git push
    ↓
GitHub (자동 감지)
    ↓
GitHub Actions (빌드)
    ↓
Railway (자동 배포)
    ↓
Production 업데이트 완료!
```

**소요 시간**: 약 2-3분

---

## 🎯 현재 상태

- ✅ 코드 수정 완료 (Storage 불일치, API URL 중앙화)
- ✅ Git 커밋 완료 (2개 커밋)
- ⏳ GitHub Repository 생성 대기 중
- ⏳ Railway 자동 배포 연결 대기 중

**다음 단계**: GitHub Repository 생성 후 알려주세요!
