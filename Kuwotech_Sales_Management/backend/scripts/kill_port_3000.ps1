# Kill process using port 3000
$connections = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
if ($connections) {
    $pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($pid in $pids) {
        Write-Output "Killing process $pid"
        Stop-Process -Id $pid -Force
    }
    Write-Output "All processes on port 3000 killed"
} else {
    Write-Output "No process found on port 3000"
}
