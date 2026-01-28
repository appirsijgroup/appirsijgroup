$filePath = "c:\appi-rsi-group-app\src\components\AdminDashboard.tsx"
$content = Get-Content $filePath
# We want to keep lines 1-3584 (indices 0..3583)
# We want to delete lines 3585-3669 (indices 3584..3668)
# We want to keep lines 3670 onwards (indices 3669..Length-1)
$newContent = $content[0..3583] + $content[3669..($content.Length - 1)]
$newContent | Set-Content $filePath
