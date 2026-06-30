# PowerShell script to rename "overveiw" directories to "overview"
# Run this script from the project root

$basePath = "my-app\src\app\sales\lead-list\lead-detail"

$dirsToRename = @(
    "site-visit\overveiw",
    "negotiation\overveiw",
    "booking\overveiw"
)

foreach ($dir in $dirsToRename) {
    $oldPath = Join-Path $basePath $dir
    $newPath = $oldPath -replace "overveiw", "overview"
    
    if (Test-Path $oldPath) {
        Write-Host "Renaming: $oldPath -> $newPath"
        Rename-Item -Path $oldPath -NewName "overview" -ErrorAction Stop
        Write-Host "Successfully renamed: $dir"
    } else {
        Write-Host "Path not found: $oldPath"
    }
}

Write-Host "`nAll directories renamed successfully!"

