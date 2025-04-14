# Fix-NodePath.ps1

# Get current user profile path
$UserProfile = [Environment]::GetFolderPath("UserProfile")

# Define expected nvm paths
$nvmPath = "$UserProfile\AppData\Local\nvm"
$nodeVersion = "v20.19.0"
$nodeBinPath = "$nvmPath\$nodeVersion"
$npmGlobalPath = "$UserProfile\AppData\Local\npm"  # Optional: where global npm CLIs go

# Get current PATH entries (User scope)
$envName = "Path"
$paths = [Environment]::GetEnvironmentVariable($envName, "User").Split(";") | Where-Object { $_ -ne "" }

# Create a new list with updated paths
$newPaths = @()

# Add Node.js version path if missing
if (-not ($paths -contains $nodeBinPath)) {
    Write-Host "✅ Adding Node.js binary path: $nodeBinPath"
    $newPaths += $nodeBinPath
}

# Add nvm path if missing
if (-not ($paths -contains $nvmPath)) {
    Write-Host "✅ Adding nvm path: $nvmPath"
    $newPaths += $nvmPath
}

# Add npm global bin path if missing
if (-not ($paths -contains $npmGlobalPath)) {
    Write-Host "✅ Adding npm global path: $npmGlobalPath"
    $newPaths += $npmGlobalPath
}

# Add existing paths back in
$newPaths += $paths

# Join and set new PATH variable
$newPathValue = ($newPaths | Select-Object -Unique) -join ";"
[Environment]::SetEnvironmentVariable($envName, $newPathValue, "User")

Write-Host "`n🎉 PATH successfully updated. Please restart your terminal or log out/in to apply changes."