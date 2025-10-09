#!/bin/bash

# ============================================
# 빠른 배포 스크립트
# 현재 디렉토리에서 실행 가능
# ============================================

SCRIPT_DIR="F:/7.VScode/Running VS Code/KUWOTECH/scripts"

if [ -z "$1" ]; then
    echo "❌ 커밋 메시지를 입력해주세요."
    echo ""
    echo "사용법:"
    echo "  ./quick-deploy.sh \"커밋 메시지\""
    echo ""
    echo "예시:"
    echo "  ./quick-deploy.sh \"Week 2: 변수명 수정\""
    echo "  ./quick-deploy.sh \"fix: KPI 계산 버그 수정\""
    exit 1
fi

# deploy.sh 실행
bash "$SCRIPT_DIR/deploy.sh" "$1"
