# 🚀 배포 가이드

## 빠른 시작

프로젝트 루트에서 한 줄로 배포:

```bash
./deploy.sh "커밋 메시지"
```

## 사용 예시

```bash
# Week별 작업
./deploy.sh "Week 1: Terms.js 통일 및 한글 용어 수정"
./deploy.sh "Week 2: 변수명 일관성 수정 완료"

# 기능 추가
./deploy.sh "feat: KPI 대시보드 차트 추가"

# 버그 수정
./deploy.sh "fix: 매출집중도 계산 오류 수정"

# 리팩토링
./deploy.sh "refactor: 데이터베이스 쿼리 최적화"
```

## 배포 프로세스

스크립트가 자동으로 처리하는 작업:

1. ✅ Git 변경사항 확인
2. ✅ 자동 커밋 (05.Source 디렉토리)
3. ✅ Railway 배포
4. ✅ 배포 상태 모니터링
5. ✅ Health Check 검증
6. ✅ 배포 결과 리포트

## 상세 문서

더 자세한 정보는 다음 파일을 참조하세요:

📖 **[scripts/README.md](./scripts/README.md)** - 전체 사용 설명서

---

**배포 URL**: https://kuwotech-sales-production-aa64.up.railway.app
