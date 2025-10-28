#!/bin/bash

echo "🔍 Debug Script voor Logo Uploads"
echo "=================================="
echo ""

echo "1️⃣ Checking working directory..."
echo "Current dir: $(pwd)"
echo ""

echo "2️⃣ Checking public folder structure..."
ls -laR /app/public/ 2>/dev/null || ls -laR public/ 2>/dev/null || echo "❌ Public folder not found"
echo ""

echo "3️⃣ Checking uploads folder..."
ls -la /app/public/uploads/ 2>/dev/null || ls -la public/uploads/ 2>/dev/null || echo "❌ Uploads folder not found"
echo ""

echo "4️⃣ Checking file permissions..."
stat /app/public/uploads/*.* 2>/dev/null || stat public/uploads/*.* 2>/dev/null || echo "ℹ️  No files in uploads folder"
echo ""

echo "5️⃣ Checking process user..."
echo "Running as: $(whoami)"
echo "User ID: $(id)"
echo ""

echo "6️⃣ Checking Next.js build..."
ls -la .next/ 2>/dev/null || echo "❌ .next folder not found"
ls -la .next/standalone/public 2>/dev/null || echo "ℹ️  Standalone public folder not found"
echo ""

echo "7️⃣ Testing file access..."
if [ -d "/app/public/uploads" ]; then
    touch /app/public/uploads/test-write.txt 2>/dev/null && echo "✅ Can write to uploads folder" || echo "❌ Cannot write to uploads folder"
    rm /app/public/uploads/test-write.txt 2>/dev/null
fi
echo ""

echo "8️⃣ Checking environment..."
echo "NODE_ENV: $NODE_ENV"
echo "PORT: $PORT"
echo ""

echo "✅ Debug complete!"
echo ""
echo "📋 Next steps:"
echo "   - If uploads folder is empty → Volume not mounted correctly"
echo "   - If files exist but 404 → Next.js not serving public folder"
echo "   - If permission denied → Run: chown -R nextjs:nodejs /app/public/uploads"

