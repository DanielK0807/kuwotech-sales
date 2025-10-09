# 데이터베이스 UUID 기반 완전 리셋 가이드

## 현재 상황
- Railway 데이터베이스가 부분적으로 마이그레이션되어 불완전한 상태입니다
- employees 테이블에 id 컬럼이 없어서 오류가 발생합니다

## 해결 방법: 완전 리셋 (자동)

### 1단계: Railway 환경변수 설정

Railway 대시보드에서:
1. 프로젝트 선택
2. **Variables** 탭 클릭
3. **New Variable** 버튼 클릭
4. 다음 환경변수 추가:

```
RESET_DATABASE=true
```

5. **Add** 버튼 클릭

### 2단계: 자동 배포 대기

Railway 대시보드에서:
1. Deployments 탭
2. "Redeploy" 버튼 클릭

서버가 시작되면서 자동으로:
- ✅ UUID 기반 employees 테이블 생성 (id: VARCHAR(36) PRIMARY KEY)
- ✅ UUID 기반 kpi_sales 테이블 생성
- ✅ 엑셀 데이터 자동 임포트 (UUID 자동 할당)
- ✅ 모든 테이블 깨끗하게 재생성

### 3단계: KPI 재계산

서버가 재시작된 후:
```bash
curl -X POST https://kuwotech-sales-production-aa64.up.railway.app/api/kpi/refresh-all
```

## 확인사항

서버 재시작 후 로그에서 다음을 확인:
```
✅ employees 생성 완료
✅ 직원 16명 임포트 완료
✅ kpi_sales 생성 완료
```

## 최종 결과

- **employees.id**: VARCHAR(36) UUID (Primary Key)
- **kpi_sales.id**: VARCHAR(36) UUID
- 모든 직원: UUID 자동 할당
- KPI: UUID 기반으로 정상 작동

## 영구적 추적

이제부터:
- ✅ 직원 ID가 UUID로 영구 추적됨
- ✅ 거래처 keyValue와 동일한 방식
- ✅ 엑셀 업로드 시에도 UUID 유지
- ✅ 깨끗하고 안정적인 UUID 아키텍처
