#!/bin/bash

# ============================================
# 배포 환경 검증 스크립트
# 실제 배포 없이 환경만 체크
# ============================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_ROOT="F:/7.VScode/Running VS Code/KUWOTECH"
BACKEND_DIR="$PROJECT_ROOT/Kuwotech_Sales_Management"
RAILWAY_URL="https://kuwotech-sales-production-aa64.up.railway.app"

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_separator() {
    echo "=================================================="
}

print_separator
echo "🔍 배포 환경 검증"
print_separator
echo ""

ERROR_COUNT=0

# 1. Git 저장소 확인
log_info "1. Git 저장소 확인"
cd "$PROJECT_ROOT"
if git rev-parse --git-dir > /dev/null 2>&1; then
    log_success "Git 저장소 정상"
    CURRENT_BRANCH=$(git branch --show-current)
    echo "   현재 브랜치: $CURRENT_BRANCH"
else
    log_error "Git 저장소를 찾을 수 없습니다"
    ERROR_COUNT=$((ERROR_COUNT + 1))
fi
echo ""

# 2. Git 변경사항 확인
log_info "2. Git 변경사항 확인"
CHANGED_FILES=$(git status --short | grep -v "^\?\?" | wc -l)
if [ "$CHANGED_FILES" -gt 0 ]; then
    log_success "변경된 파일: $CHANGED_FILES개"
    git status --short | grep -v "^\?\?" | head -5
    if [ "$CHANGED_FILES" -gt 5 ]; then
        echo "   ... (나머지 $(($CHANGED_FILES - 5))개 파일)"
    fi
else
    echo "   커밋할 변경사항 없음"
fi
echo ""

# 3. Railway CLI 확인
log_info "3. Railway CLI 확인"
if command -v railway > /dev/null 2>&1; then
    log_success "Railway CLI 설치됨"
    RAILWAY_VERSION=$(railway --version 2>&1 | head -1)
    echo "   버전: $RAILWAY_VERSION"
else
    log_error "Railway CLI가 설치되지 않았습니다"
    ERROR_COUNT=$((ERROR_COUNT + 1))
fi
echo ""

# 4. Railway 프로젝트 연결 확인
log_info "4. Railway 프로젝트 연결"
cd "$BACKEND_DIR"
if railway status > /dev/null 2>&1; then
    log_success "Railway 프로젝트 연결됨"
    railway status | grep -E "Project|Environment|Service"
else
    log_error "Railway 프로젝트에 연결되지 않았습니다"
    ERROR_COUNT=$((ERROR_COUNT + 1))
fi
echo ""

# 5. Railway 서비스 상태 확인
log_info "5. Railway 서비스 상태"
LATEST_DEPLOYMENT=$(railway deployment list 2>/dev/null | head -2 | tail -1)
if [ -n "$LATEST_DEPLOYMENT" ]; then
    log_success "최신 배포 정보:"
    echo "$LATEST_DEPLOYMENT"
else
    log_error "배포 정보를 가져올 수 없습니다"
    ERROR_COUNT=$((ERROR_COUNT + 1))
fi
echo ""

# 6. Health Check
log_info "6. 서비스 Health Check"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$RAILWAY_URL/api/health" 2>/dev/null)
if [ "$HTTP_STATUS" -eq 200 ]; then
    log_success "서비스 정상 작동 (HTTP $HTTP_STATUS)"
else
    log_error "서비스 응답 없음 (HTTP $HTTP_STATUS)"
    ERROR_COUNT=$((ERROR_COUNT + 1))
fi
echo ""

# 7. 스크립트 파일 확인
log_info "7. 배포 스크립트 확인"
if [ -f "$PROJECT_ROOT/scripts/deploy.sh" ]; then
    log_success "deploy.sh 존재"
    if [ -x "$PROJECT_ROOT/scripts/deploy.sh" ]; then
        echo "   실행 권한: ✓"
    else
        echo "   실행 권한: ✗ (chmod +x 필요)"
    fi
else
    log_error "deploy.sh 파일이 없습니다"
    ERROR_COUNT=$((ERROR_COUNT + 1))
fi
echo ""

# 최종 결과
print_separator
if [ $ERROR_COUNT -eq 0 ]; then
    echo -e "${GREEN}✅ 모든 검증 통과!${NC}"
    echo ""
    echo "배포 준비 완료. 다음 명령으로 배포할 수 있습니다:"
    echo "  cd \"$PROJECT_ROOT\""
    echo "  ./deploy.sh \"커밋 메시지\""
else
    echo -e "${RED}❌ $ERROR_COUNT 개의 오류 발견${NC}"
    echo ""
    echo "위의 오류를 수정한 후 다시 시도하세요."
fi
print_separator
