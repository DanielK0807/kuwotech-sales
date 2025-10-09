@echo off
chcp 65001 >nul
echo.
echo ============================================================
echo 🚀 KUWOTECH 영업관리 시스템 - Railway 배포
echo ============================================================
echo.

cd /d "%~dp0\.."

echo 📝 Git 상태 확인...
git status
echo.

set /p confirm="배포를 진행하시겠습니까? (y/n): "
if /i not "%confirm%"=="y" (
    echo 배포가 취소되었습니다.
    pause
    exit /b
)

echo.
echo 📦 변경사항 스테이징...
git add .

echo.
set /p message="커밋 메시지 입력: "
if "%message%"=="" set message="배포 업데이트"

echo.
echo 💾 커밋 생성...
git commit -m "%message%"

echo.
echo 🚀 Railway로 푸시...
git push origin main

echo.
echo ============================================================
echo ✅ 배포 완료!
echo ============================================================
echo.
echo Railway에서 자동으로 빌드 및 배포가 진행됩니다.
echo.
echo 배포 상태: https://railway.app
echo 프로덕션 URL: https://kuwotech-sales-production.up.railway.app
echo.
pause
