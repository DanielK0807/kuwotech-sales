# ============================================
# KUWOTECH 영업관리 시스템 - 자동 배포 스크립트 (PowerShell)
# ============================================
# 기능:
# - Git 변경사항 자동 커밋
# - Railway 자동 배포
# - 배포 상태 모니터링
# - Health check 검증
# ============================================

param(
    [Parameter(Mandatory=$true)]
    [string]$CommitMessage
)

$ErrorActionPreference = "Stop"

# 프로젝트 경로 설정
$PROJECT_ROOT = "F:\7.VScode\Running VS Code\KUWOTECH"
$BACKEND_DIR = "$PROJECT_ROOT\Kuwotech_Sales_Management"
$RAILWAY_URL = "https://kuwotech-sales-production-aa64.up.railway.app"

# 함수: 로그 출력
function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning-Custom {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error-Custom {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

function Write-Separator {
    Write-Host "==================================================" -ForegroundColor Cyan
}

# 배포 시작
Write-Separator
Write-Info "배포 프로세스 시작"
Write-Separator

# Step 1: Git 상태 확인
Write-Info "Step 1: Git 상태 확인"
Set-Location $PROJECT_ROOT

if (!(Test-Path ".git")) {
    Write-Error-Custom "Git 저장소가 아닙니다."
    exit 1
}

# 변경사항 확인
$changedFiles = git status --short | Where-Object { $_ -notmatch '^\?\?' }
$changedCount = ($changedFiles | Measure-Object).Count

if ($changedCount -eq 0) {
    Write-Warning-Custom "커밋할 변경사항이 없습니다."
    $deployOnly = Read-Host "배포만 진행할까요? (y/n)"
    if ($deployOnly -ne "y") {
        Write-Info "배포 취소"
        exit 0
    }
    $skipCommit = $true
} else {
    Write-Info "변경된 파일: $changedCount 개"
    git status --short | Where-Object { $_ -notmatch '^\?\?' }
    $skipCommit = $false
}

# Step 2: Git 커밋
if (-not $skipCommit) {
    Write-Separator
    Write-Info "Step 2: Git 커밋 진행"

    # 05.Source 디렉토리 스테이징
    git add "Kuwotech_Sales_Management\05.Source\"

    # 커밋
    try {
        git commit -m $CommitMessage
        $commitHash = git rev-parse --short HEAD
        Write-Success "커밋 완료: $commitHash"
    } catch {
        Write-Error-Custom "커밋 실패"
        exit 1
    }
} else {
    Write-Separator
    Write-Info "Step 2: 커밋 단계 건너뜀"
    $commitHash = git rev-parse --short HEAD
}

# Step 3: Railway 배포
Write-Separator
Write-Info "Step 3: Railway 배포 시작"

Set-Location $BACKEND_DIR

# Railway 상태 확인
try {
    railway status | Out-Null
} catch {
    Write-Error-Custom "Railway 프로젝트에 연결되지 않았습니다."
    exit 1
}

# 배포 시작
Write-Info "배포 업로드 중..."
$deployOutput = railway up --detach 2>&1
Write-Host $deployOutput

if ($deployOutput -match "Build Logs:") {
    Write-Success "배포 업로드 완료"
} else {
    Write-Warning-Custom "배포 ID를 확인할 수 없습니다. 계속 진행합니다."
}

# Step 4: 배포 상태 모니터링
Write-Separator
Write-Info "Step 4: 배포 상태 모니터링 (최대 3분)"

$maxWait = 180  # 3분
$waitInterval = 10  # 10초
$elapsed = 0

while ($elapsed -lt $maxWait) {
    Start-Sleep -Seconds $waitInterval
    $elapsed += $waitInterval

    # 최신 배포 상태 확인
    $deploymentList = railway deployment list
    $latestDeployment = $deploymentList | Select-Object -Skip 1 | Select-Object -First 1

    if ($latestDeployment -match '\|\s+(\w+)\s+\|') {
        $deploymentStatus = $matches[1]
        Write-Info "배포 상태: $deploymentStatus ($elapsed 초 경과)"

        if ($deploymentStatus -eq "SUCCESS") {
            Write-Success "배포 완료!"
            break
        } elseif ($deploymentStatus -eq "FAILED" -or $deploymentStatus -eq "CRASHED") {
            Write-Error-Custom "배포 실패: $deploymentStatus"
            Write-Info "로그를 확인하세요:"
            railway logs --lines 20
            exit 1
        }
    }
}

if ($elapsed -ge $maxWait) {
    Write-Error-Custom "배포 타임아웃 (3분 초과)"
    exit 1
}

# Step 5: Health Check
Write-Separator
Write-Info "Step 5: 서비스 Health Check"

Start-Sleep -Seconds 5

try {
    $response = Invoke-WebRequest -Uri "$RAILWAY_URL/api/health" -Method Get -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Success "Health Check 성공 (HTTP $($response.StatusCode))"
    } else {
        Write-Error-Custom "Health Check 실패 (HTTP $($response.StatusCode))"
        exit 1
    }
} catch {
    Write-Error-Custom "Health Check 실패: $_"
    exit 1
}

# Step 6: 최종 검증
Write-Separator
Write-Info "Step 6: 최종 배포 정보"

# 최신 배포 정보
Write-Info "최신 배포:"
railway deployment list | Select-Object -First 2

# 최신 로그
Write-Info "최신 로그:"
try {
    railway logs --lines 5 2>$null
} catch {
    Write-Warning-Custom "로그를 가져올 수 없습니다."
}

# 최종 결과
Write-Separator
Write-Success "✅ 배포 완료!"
Write-Separator
Write-Host ""
Write-Host "📋 배포 요약:" -ForegroundColor Cyan
Write-Host "  - 커밋: $commitHash"
Write-Host "  - 메시지: $CommitMessage"
Write-Host "  - URL: $RAILWAY_URL"
Write-Host "  - 상태: ✅ SUCCESS"
Write-Host ""
Write-Separator

exit 0
