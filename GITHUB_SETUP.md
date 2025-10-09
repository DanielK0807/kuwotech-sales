# GitHub Repository 생성 가이드

## 방법 1: GitHub 웹사이트 (5분)

1. **GitHub 접속**: https://github.com/new
2. **Repository 정보 입력**:
   - Repository name: `KUWOTECH-Sales-Management` (또는 원하는 이름)
   - Description: `KUWOTECH 영업관리 시스템`
   - **Private** 선택 ✓ (소스코드 보호)
   - **Initialize this repository with a README 체크 해제** (이미 코드가 있음)
3. **Create repository** 클릭
4. **생성된 repository URL 복사** (예: `https://github.com/yourusername/KUWOTECH-Sales-Management.git`)

완료 후 이 URL을 Claude에게 알려주세요!

---

## 방법 2: GitHub Desktop (3분) - 권장

1. **GitHub Desktop 실행**
2. **File → Add Local Repository**
3. **경로 선택**: `F:\7.VScode\Running VS Code\KUWOTECH`
4. **"Publish repository" 클릭**
5. **설정**:
   - Name: `KUWOTECH-Sales-Management`
   - Description: `KUWOTECH 영업관리 시스템`
   - **Keep this code private** ✓
6. **Publish repository** 클릭
7. **완료!** Repository URL이 자동으로 설정됩니다

완료되면 "완료"라고 말씀해주세요!

---

## 방법 3: GitHub CLI (설치 필요)

```bash
# GitHub CLI 설치 필요
gh repo create KUWOTECH-Sales-Management --private --source=. --remote=origin
git push -u origin master
```

---

## ✅ 다음 단계 (자동화)

Repository가 생성되면:
1. Claude가 Railway와 GitHub 연동 설정
2. 자동 배포 활성화
3. 이후 `git push`만으로 자동 배포

**어떤 방법을 선택하시겠습니까?**
