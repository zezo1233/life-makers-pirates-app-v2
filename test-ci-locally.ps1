# Test CI locally
Write-Host "🧪 Testing CI pipeline locally..." -ForegroundColor Green

# Change to project directory
cd 'C:\Users\TECHNO\new start'

Write-Host "📁 Current directory: $(Get-Location)" -ForegroundColor Yellow

# Clean environment
Write-Host "🧹 Cleaning environment..." -ForegroundColor Blue
Remove-Item -Path "node_modules" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "package-lock.json" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "yarn.lock" -Force -ErrorAction SilentlyContinue

# Clear npm cache
Write-Host "🗑️ Clearing npm cache..." -ForegroundColor Blue
npm cache clean --force

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Blue
npm install --force --legacy-peer-deps --no-audit --no-fund

# Check installation
Write-Host "✅ Checking installation..." -ForegroundColor Green
if (Test-Path "node_modules") {
    Write-Host "✅ node_modules created successfully" -ForegroundColor Green
    $nodeModulesCount = (Get-ChildItem "node_modules" | Measure-Object).Count
    Write-Host "📊 Found $nodeModulesCount packages in node_modules" -ForegroundColor Yellow
} else {
    Write-Host "❌ node_modules not found" -ForegroundColor Red
}

# Check package.json
Write-Host "📄 Checking package.json..." -ForegroundColor Blue
if (Test-Path "package.json") {
    $packageJson = Get-Content "package.json" | ConvertFrom-Json
    Write-Host "✅ Package name: $($packageJson.name)" -ForegroundColor Green
    Write-Host "✅ Package version: $($packageJson.version)" -ForegroundColor Green
} else {
    Write-Host "❌ package.json not found" -ForegroundColor Red
}

# Test npm commands
Write-Host "🧪 Testing npm commands..." -ForegroundColor Blue

Write-Host "Testing npm test..." -ForegroundColor Yellow
npm test 2>&1 | Out-String | Write-Host

Write-Host "Testing npm run lint..." -ForegroundColor Yellow
npm run lint 2>&1 | Out-String | Write-Host

Write-Host "Testing npm run type-check..." -ForegroundColor Yellow
npm run type-check 2>&1 | Out-String | Write-Host

Write-Host "🎉 Local CI test completed!" -ForegroundColor Green
