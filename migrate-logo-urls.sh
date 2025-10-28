#!/bin/sh

echo "🔄 Migrating existing logo URLs from /uploads/ to /api/uploads/"
echo "================================================================"

# This script updates existing logo_url in the database
# Run this ONCE after deployment

# Using Prisma Studio or direct SQL
# Option 1: Via Prisma (recommended)
cat << 'EOF' > /tmp/migrate-logo.js
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // Find logo_url setting
  const setting = await prisma.systemSettings.findUnique({
    where: { key: 'logo_url' }
  })
  
  if (setting && setting.value && setting.value.startsWith('/uploads/')) {
    const newValue = setting.value.replace('/uploads/', '/api/uploads/')
    
    await prisma.systemSettings.update({
      where: { key: 'logo_url' },
      data: { value: newValue }
    })
    
    console.log('✅ Updated logo URL from:', setting.value)
    console.log('✅ Updated logo URL to:', newValue)
  } else {
    console.log('ℹ️  No migration needed')
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
EOF

# Run the migration
node /tmp/migrate-logo.js

# Clean up
rm /tmp/migrate-logo.js

echo ""
echo "✅ Migration complete!"
echo ""
echo "📋 Next: Upload a new logo or refresh the page"

