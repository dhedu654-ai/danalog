$dest = "danalog_deploy_FINAL.zip"
$files = @(
    "dist",
    "server.js",
    "db.json",
    "package.json",
    "danalog_deploy.sh",
    "README_DEPLOY.md"
)

if (Test-Path $dest) { Remove-Item $dest }

Compress-Archive -Path $files -DestinationPath $dest
Write-Host "Created $dest containing:"
$files | ForEach-Object { Write-Host " - $_" }
