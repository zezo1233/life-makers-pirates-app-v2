# GitHub Labels Setup Script
cd 'C:\Users\TECHNO\new start'

# Feature Labels
& 'C:\Program Files\GitHub CLI\gh.exe' label create "🚀 feature" --color "0052cc" --description "New feature or enhancement"
& 'C:\Program Files\GitHub CLI\gh.exe' label create "✨ enhancement" --color "a2eeef" --description "Improvement to existing feature"
& 'C:\Program Files\GitHub CLI\gh.exe' label create "🎨 ui/ux" --color "f9d0c4" --description "User interface and experience improvements"

# Bug Labels
& 'C:\Program Files\GitHub CLI\gh.exe' label create "🐛 bug" --color "d73a4a" --description "Something is not working"
& 'C:\Program Files\GitHub CLI\gh.exe' label create "🔥 critical" --color "b60205" --description "Critical bug that needs immediate attention"
& 'C:\Program Files\GitHub CLI\gh.exe' label create "⚠️ high priority" --color "ff9500" --description "High priority issue"

# Development Labels
& 'C:\Program Files\GitHub CLI\gh.exe' label create "🔧 maintenance" --color "fef2c0" --description "Code maintenance and refactoring"
& 'C:\Program Files\GitHub CLI\gh.exe' label create "📚 documentation" --color "0075ca" --description "Documentation improvements"
& 'C:\Program Files\GitHub CLI\gh.exe' label create "🧪 testing" --color "d4c5f9" --description "Testing related tasks"

# Platform Labels
& 'C:\Program Files\GitHub CLI\gh.exe' label create "📱 mobile" --color "c2e0c6" --description "Mobile specific issues"
& 'C:\Program Files\GitHub CLI\gh.exe' label create "🤖 android" --color "3ddc84" --description "Android specific"
& 'C:\Program Files\GitHub CLI\gh.exe' label create "🍎 ios" --color "007aff" --description "iOS specific"

# Component Labels
& 'C:\Program Files\GitHub CLI\gh.exe' label create "📅 calendar" --color "fbca04" --description "Calendar system related"
& 'C:\Program Files\GitHub CLI\gh.exe' label create "💬 chat" --color "0e8a16" --description "Chat system related"
& 'C:\Program Files\GitHub CLI\gh.exe' label create "👤 auth" --color "5319e7" --description "Authentication related"
& 'C:\Program Files\GitHub CLI\gh.exe' label create "🔄 workflow" --color "1d76db" --description "Training workflow related"
& 'C:\Program Files\GitHub CLI\gh.exe' label create "🤖 ai" --color "ff6b6b" --description "AI features related"

# Status Labels
& 'C:\Program Files\GitHub CLI\gh.exe' label create "🚧 in progress" --color "fbca04" --description "Work in progress"
& 'C:\Program Files\GitHub CLI\gh.exe' label create "✅ ready for review" --color "0e8a16" --description "Ready for code review"
& 'C:\Program Files\GitHub CLI\gh.exe' label create "🔍 needs investigation" --color "d93f0b" --description "Needs further investigation"
& 'C:\Program Files\GitHub CLI\gh.exe' label create "❓ question" --color "cc317c" --description "Question or discussion needed"

# Language Labels
& 'C:\Program Files\GitHub CLI\gh.exe' label create "🌐 i18n" --color "c5def5" --description "Internationalization (Arabic/English)"
& 'C:\Program Files\GitHub CLI\gh.exe' label create "🇸🇦 arabic" --color "006b75" --description "Arabic language specific"

Write-Host "✅ All labels created successfully!"
