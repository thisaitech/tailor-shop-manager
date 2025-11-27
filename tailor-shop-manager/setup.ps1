# Quick Setup Script for Tailor Shop Manager

Write-Host "🚀 Tailor Shop Manager - Quick Setup" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
Write-Host "Checking Node.js installation..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js $nodeVersion installed" -ForegroundColor Green
} catch {
    Write-Host "✗ Node.js not found. Please install Node.js from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Check if npm is installed
Write-Host "Checking npm installation..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version
    Write-Host "✓ npm $npmVersion installed" -ForegroundColor Green
} catch {
    Write-Host "✗ npm not found" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm install

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Dependencies installed successfully" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🔥 Installing Firebase CLI..." -ForegroundColor Yellow
npm install -g firebase-tools

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Firebase CLI installed successfully" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to install Firebase CLI" -ForegroundColor Red
}

Write-Host ""
Write-Host "📝 Setup Instructions:" -ForegroundColor Cyan
Write-Host "1. Create a .env file based on .env.example" -ForegroundColor White
Write-Host "2. Add your Firebase configuration to .env" -ForegroundColor White
Write-Host "3. Run 'firebase login' to authenticate" -ForegroundColor White
Write-Host "4. Run 'firebase init' to initialize your project" -ForegroundColor White
Write-Host "5. Run 'npm run build' to build the project" -ForegroundColor White
Write-Host "6. Run 'firebase deploy' to deploy to Firebase" -ForegroundColor White

Write-Host ""
Write-Host "📱 Mobile App Setup (Optional):" -ForegroundColor Cyan
Write-Host "Android: npm run cap:add:android" -ForegroundColor White
Write-Host "iOS:     npm run cap:add:ios" -ForegroundColor White
Write-Host "Sync:    npm run cap:sync" -ForegroundColor White

Write-Host ""
Write-Host "📚 For detailed instructions, see DEPLOYMENT_GUIDE.md" -ForegroundColor Yellow
Write-Host ""
Write-Host "✨ Setup complete! Happy coding!" -ForegroundColor Green
