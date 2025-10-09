#!/bin/bash

# ============================================
# KUWOTECH 영업관리 시스템 - 자동 배포 스크립트
# ============================================
# 기능:
# - Git 변경사항 자동 커밋
# - Railway 자동 배포
# - 배포 상태 모니터링
# - Health check 검증
# ============================================

set -e  # 에러 발생시 즉시 중단

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 프로젝트 루트 디렉토리
PROJECT_ROOT="F:/7.VScode/Running VS Code/KUWOTECH"
BACKEND_DIR="$PROJECT_ROOT/Kuwotech_Sales_Management"
RAILWAY_URL="https://kuwotech-sales-production-aa64.up.railway.app"

# 함수: 로그 출력
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 함수: 구분선
print_separator() {
    echo "=================================================="
}

# 커밋 메시지 확인
if [ -z "$1" ]; then
    log_error "커밋 메시지를 입력해주세요."
    echo "사용법: ./deploy.sh \"커밋 메시지\""
    exit 1
fi

COMMIT_MESSAGE="$1"

print_separator
log_info "배포 프로세스 시작"
print_separator

# Step 1: Git 상태 확인
log_info "Step 1: Git 상태 확인"
cd "$PROJECT_ROOT"

if ! git rev-parse --git-dir > /dev/null 2>&1; then
    log_error "Git 저장소가 아닙니다."
    exit 1
fi

# 변경사항 확인
CHANGED_FILES=$(git status --short | grep -v "^\?\?" | wc -l)

if [ "$CHANGED_FILES" -eq 0 ]; then
    log_warning "커밋할 변경사항이 없습니다."
    echo "배포만 진행할까요? (y/n)"
    read -r DEPLOY_ONLY
    if [ "$DEPLOY_ONLY" != "y" ]; then
        log_info "배포 취소"
        exit 0
    fi
    SKIP_COMMIT=true
else
    log_info "변경된 파일: $CHANGED_FILES개"
    git status --short | grep -v "^\?\?"
    SKIP_COMMIT=false
fi

# Step 2: Git 커밋
if [ "$SKIP_COMMIT" = false ]; then
    print_separator
    log_info "Step 2: Git 커밋 진행"

    # 05.Source 디렉토리의 변경사항 스테이징
    cd "$PROJECT_ROOT"

    # .claude/settings.local.json은 제외
    git add "Kuwotech_Sales_Management/05.Source/"

    # 커밋
    git commit -m "$COMMIT_MESSAGE" || {
        log_error "커밋 실패"
        exit 1
    }

    COMMIT_HASH=$(git rev-parse --short HEAD)
    log_success "커밋 완료: $COMMIT_HASH"
else
    print_separator
    log_info "Step 2: 커밋 단계 건너뜀"
    COMMIT_HASH=$(git rev-parse --short HEAD)
fi

# Step 3: Railway 배포
print_separator
log_info "Step 3: Railway 배포 시작"

cd "$BACKEND_DIR"

# Railway 상태 확인
if ! railway status > /dev/null 2>&1; then
    log_error "Railway 프로젝트에 연결되지 않았습니다."
    exit 1
fi

# 배포 시작
log_info "배포 업로드 중..."
DEPLOY_OUTPUT=$(railway up --detach 2>&1)
echo "$DEPLOY_OUTPUT"

# 배포 ID 추출 (선택사항)
if echo "$DEPLOY_OUTPUT" | grep -q "Build Logs:"; then
    log_success "배포 업로드 완료"
else
    log_warning "배포 ID를 확인할 수 없습니다. 계속 진행합니다."
fi

# Step 4: 배포 상태 모니터링
print_separator
log_info "Step 4: 배포 상태 모니터링 (최대 3분)"

MAX_WAIT=180  # 3분
WAIT_INTERVAL=10  # 10초마다 확인
ELAPSED=0

while [ $ELAPSED -lt $MAX_WAIT ]; do
    sleep $WAIT_INTERVAL
    ELAPSED=$((ELAPSED + WAIT_INTERVAL))

    # 최신 배포 상태 확인
    DEPLOYMENT_STATUS=$(railway deployment list | head -2 | tail -1 | awk '{print $3}')

    log_info "배포 상태: $DEPLOYMENT_STATUS (${ELAPSED}초 경과)"

    if [ "$DEPLOYMENT_STATUS" = "SUCCESS" ]; then
        log_success "배포 완료!"
        break
    elif [ "$DEPLOYMENT_STATUS" = "FAILED" ] || [ "$DEPLOYMENT_STATUS" = "CRASHED" ]; then
        log_error "배포 실패: $DEPLOYMENT_STATUS"
        log_info "로그를 확인하세요:"
        railway logs --lines 20
        exit 1
    fi
done

if [ $ELAPSED -ge $MAX_WAIT ]; then
    log_error "배포 타임아웃 (3분 초과)"
    exit 1
fi

# Step 5: Health Check 검증
print_separator
log_info "Step 5: 서비스 Health Check"

# 잠시 대기 (서비스 시작 시간)
sleep 5

HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$RAILWAY_URL/api/health")

if [ "$HTTP_STATUS" -eq 200 ]; then
    log_success "Health Check 성공 (HTTP $HTTP_STATUS)"
else
    log_error "Health Check 실패 (HTTP $HTTP_STATUS)"
    exit 1
fi

# Step 6: 최종 검증
print_separator
log_info "Step 6: 최종 배포 정보"

cd "$BACKEND_DIR"

# 최신 배포 정보
log_info "최신 배포:"
railway deployment list | head -2

# 최신 로그 (마지막 5줄)
log_info "최신 로그:"
railway logs --lines 5 2>/dev/null || log_warning "로그를 가져올 수 없습니다."

# 최종 결과
print_separator
log_success "✅ 배포 완료!"
print_separator
echo ""
echo "📋 배포 요약:"
echo "  - 커밋: $COMMIT_HASH"
echo "  - 메시지: $COMMIT_MESSAGE"
echo "  - URL: $RAILWAY_URL"
echo "  - 상태: ✅ SUCCESS"
echo ""
print_separator

exit 0
