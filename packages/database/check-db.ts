import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('📊 Database Status Check\n');

  const companyCount = await prisma.company.count();
  console.log('Companies:', companyCount);

  const userCount = await prisma.user.count();
  console.log('Users:', userCount);

  const tripCount = await prisma.trip.count();
  console.log('Trips:', tripCount);

  const bookingCount = await prisma.booking.count();
  console.log('Bookings:', bookingCount);

  const rateCardCount = await prisma.rateCard.count();
  console.log('Rate Cards:', rateCardCount);

  const vehicleCount = await prisma.vehicle.count();
  console.log('Vehicles:', vehicleCount);

  const driverProfileCount = await prisma.driverProfile.count();
  console.log('Driver Profiles:', driverProfileCount);

  const routeCount = await prisma.route.count();
  console.log('Routes:', routeCount);

  const roleCount = await prisma.role.count();
  console.log('Roles:', roleCount);

  const permissionCount = await prisma.permission.count();
  console.log('Permissions:', permissionCount);
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
