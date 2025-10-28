import { PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    create: {
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'ADMIN',
      identityProvider: 'MANUAL',
      status: 'ACTIVE',
      twoFactorEnabled: false,
    },
    update: {},
  });

  console.log('✅ Created admin user:', admin.email);

  // Create sample allowed tenant
  const tenant = await prisma.allowedTenant.upsert({
    where: { tenantId: '00000000-0000-0000-0000-000000000001' },
    create: {
      tenantId: '00000000-0000-0000-0000-000000000001',
      name: 'Example Company',
      active: true,
    },
    update: {},
  });

  console.log('✅ Created allowed tenant:', tenant.name);

  // Create sample rooms
  const rooms = [
    {
      name: 'Conference Room A',
      capacity: 12,
      location: 'Floor 2',
      active: true,
      msResourceEmail: 'room-a@example.com',
      hourlyRateCents: 0,
    },
    {
      name: 'Meeting Room B',
      capacity: 6,
      location: 'Floor 1',
      active: true,
      msResourceEmail: null,
      hourlyRateCents: 0,
    },
    {
      name: 'Training Room C',
      capacity: 20,
      location: 'Floor 3',
      active: true,
      msResourceEmail: null,
      hourlyRateCents: 0,
    },
    {
      name: 'Brainstorming Space',
      capacity: 8,
      location: 'Floor 2',
      active: true,
      msResourceEmail: null,
      hourlyRateCents: 0,
    },
  ];

  for (const roomData of rooms) {
    const room = await prisma.room.upsert({
      where: { id: 'seed-' + roomData.name.replace(/\s+/g, '-').toLowerCase() },
      create: {
        name: roomData.name,
        capacity: roomData.capacity,
        location: roomData.location,
        active: roomData.active,
        msResourceEmail: roomData.msResourceEmail,
        hourlyRateCents: roomData.hourlyRateCents,
      },
      update: {},
    });
    console.log('✅ Created room:', room.name);
  }

  console.log('\n🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
