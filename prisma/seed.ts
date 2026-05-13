import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create collection
  const collection = await prisma.collection.upsert({
    where: { slug: 'casa-2027' },
    update: {},
    create: {
      name: 'CASA 2027',
      slug: 'casa-2027',
      season: 'FW',
      year: 2027,
      isActive: true,
    },
  });

  console.log('Collection created:', collection.name);

  // Create categories
  const catLiving = await prisma.category.upsert({
    where: { slug_collectionId: { slug: 'living', collectionId: collection.id } },
    update: {},
    create: {
      name: 'Living',
      slug: 'living',
      order: 1,
      collectionId: collection.id,
    },
  });

  const catBedroom = await prisma.category.upsert({
    where: { slug_collectionId: { slug: 'bedroom', collectionId: collection.id } },
    update: {},
    create: {
      name: 'Bedroom',
      slug: 'bedroom',
      order: 2,
      collectionId: collection.id,
    },
  });

  const catOutdoor = await prisma.category.upsert({
    where: { slug_collectionId: { slug: 'outdoor', collectionId: collection.id } },
    update: {},
    create: {
      name: 'Outdoor',
      slug: 'outdoor',
      order: 3,
      collectionId: collection.id,
    },
  });

  const catDecor = await prisma.category.upsert({
    where: { slug_collectionId: { slug: 'decor', collectionId: collection.id } },
    update: {},
    create: {
      name: 'Decor & Accessories',
      slug: 'decor',
      order: 4,
      collectionId: collection.id,
    },
  });

  // Sub-categories
  const catSofas = await prisma.category.upsert({
    where: { slug_collectionId: { slug: 'sofas', collectionId: collection.id } },
    update: {},
    create: {
      name: 'Sofas & Seating',
      slug: 'sofas',
      parentId: catLiving.id,
      order: 1,
      collectionId: collection.id,
    },
  });

  const catTables = await prisma.category.upsert({
    where: { slug_collectionId: { slug: 'tables', collectionId: collection.id } },
    update: {},
    create: {
      name: 'Tables',
      slug: 'tables',
      parentId: catLiving.id,
      order: 2,
      collectionId: collection.id,
    },
  });

  const catLighting = await prisma.category.upsert({
    where: { slug_collectionId: { slug: 'lighting', collectionId: collection.id } },
    update: {},
    create: {
      name: 'Lighting',
      slug: 'lighting',
      parentId: catDecor.id,
      order: 1,
      collectionId: collection.id,
    },
  });

  const catTextiles = await prisma.category.upsert({
    where: { slug_collectionId: { slug: 'textiles', collectionId: collection.id } },
    update: {},
    create: {
      name: 'Textiles',
      slug: 'textiles',
      parentId: catBedroom.id,
      order: 1,
      collectionId: collection.id,
    },
  });

  console.log('Categories created');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.customer.upsert({
    where: { email: 'admin@meridiano361.com' },
    update: {},
    create: {
      companyName: 'Meridiano 361',
      customerCode: 'ADMIN001',
      email: 'admin@meridiano361.com',
      passwordHash: adminPassword,
      role: Role.ADMIN,
      isActive: true,
    },
  });

  // Create sample customers
  const customer1Password = await bcrypt.hash('customer123', 12);
  await prisma.customer.upsert({
    where: { email: 'showroom@designstore.it' },
    update: {},
    create: {
      companyName: 'Design Store Milano',
      customerCode: 'DSM001',
      email: 'showroom@designstore.it',
      passwordHash: customer1Password,
      role: Role.CUSTOMER,
      isActive: true,
      phone: '+39 02 1234567',
      city: 'Milano',
      country: 'Italy',
      vatNumber: 'IT12345678901',
    },
  });

  await prisma.customer.upsert({
    where: { email: 'orders@luxtrade.de' },
    update: {},
    create: {
      companyName: 'Lux Trade GmbH',
      customerCode: 'LTG001',
      email: 'orders@luxtrade.de',
      passwordHash: customer1Password,
      role: Role.CUSTOMER,
      isActive: true,
      phone: '+49 30 9876543',
      city: 'Berlin',
      country: 'Germany',
      vatNumber: 'DE123456789',
    },
  });

  await prisma.customer.upsert({
    where: { email: 'buy@maison-interieur.fr' },
    update: {},
    create: {
      companyName: 'Maison Intérieur Paris',
      customerCode: 'MIP001',
      email: 'buy@maison-interieur.fr',
      passwordHash: customer1Password,
      role: Role.CUSTOMER,
      isActive: true,
      phone: '+33 1 2345678',
      city: 'Paris',
      country: 'France',
    },
  });

  console.log('Customers created:', admin.email);

  // Create sample products
  const products = [
    {
      code: 'OE-SOF-001',
      name: 'Anima Sofa 3-Seater',
      description: 'Premium Italian linen upholstered sofa with solid oak frame. A timeless silhouette with organic softness.',
      costPrice: 1850.00,
      retailPrice: 3700.00,
      lotSize: 1,
      categoryId: catSofas.id,
      collectionId: collection.id,
      notes: 'Available in 6 fabric options',
    },
    {
      code: 'OE-SOF-002',
      name: 'Anima Sofa 2-Seater',
      description: 'Two-seater companion to the Anima collection. Same premium craftsmanship, intimate scale.',
      costPrice: 1350.00,
      retailPrice: 2700.00,
      lotSize: 1,
      categoryId: catSofas.id,
      collectionId: collection.id,
      notes: 'Available in 6 fabric options',
    },
    {
      code: 'OE-SOF-003',
      name: 'Pietra Armchair',
      description: 'Sculptural armchair in stone-washed linen. Inspired by Mediterranean coastal architecture.',
      costPrice: 780.00,
      retailPrice: 1560.00,
      lotSize: 2,
      categoryId: catSofas.id,
      collectionId: collection.id,
      notes: 'Min. order 2 pieces per color',
    },
    {
      code: 'OE-TAB-001',
      name: 'Terra Coffee Table Large',
      description: 'Hand-cast travertine coffee table with brass inlays. Each piece unique.',
      costPrice: 920.00,
      retailPrice: 1840.00,
      lotSize: 1,
      categoryId: catTables.id,
      collectionId: collection.id,
      notes: 'Natural stone — variations expected',
    },
    {
      code: 'OE-TAB-002',
      name: 'Terra Coffee Table Small',
      description: 'Smaller companion to the Terra series. Perfect for layered arrangements.',
      costPrice: 540.00,
      retailPrice: 1080.00,
      lotSize: 1,
      categoryId: catTables.id,
      collectionId: collection.id,
    },
    {
      code: 'OE-TAB-003',
      name: 'Luce Dining Table 200cm',
      description: 'Solid white oak dining table with hand-oiled finish. Seats 8 comfortably.',
      costPrice: 2100.00,
      retailPrice: 4200.00,
      lotSize: 1,
      categoryId: catTables.id,
      collectionId: collection.id,
      notes: '10-12 weeks lead time',
    },
    {
      code: 'OE-LIG-001',
      name: 'Soffio Pendant Light',
      description: 'Blown glass pendant in warm amber. Handcrafted by Murano artisans.',
      costPrice: 380.00,
      retailPrice: 760.00,
      lotSize: 2,
      categoryId: catLighting.id,
      collectionId: collection.id,
      notes: 'Min. 2 pcs. Canopy included.',
    },
    {
      code: 'OE-LIG-002',
      name: 'Soffio Floor Lamp',
      description: 'Standing floor lamp with matching blown glass shade. Marble base.',
      costPrice: 490.00,
      retailPrice: 980.00,
      lotSize: 1,
      categoryId: catLighting.id,
      collectionId: collection.id,
    },
    {
      code: 'OE-LIG-003',
      name: 'Filo Wall Sconce',
      description: 'Minimal brass wall sconce with fabric-wrapped cable. Adjustable arm.',
      costPrice: 195.00,
      retailPrice: 390.00,
      lotSize: 2,
      categoryId: catLighting.id,
      collectionId: collection.id,
      notes: 'Sold in pairs',
    },
    {
      code: 'OE-BED-001',
      name: 'Riposo Bed Frame King',
      description: 'King-size bed frame in natural linen headboard with solid walnut base frame.',
      costPrice: 1650.00,
      retailPrice: 3300.00,
      lotSize: 1,
      categoryId: catBedroom.id,
      collectionId: collection.id,
      notes: 'Mattress not included',
    },
    {
      code: 'OE-BED-002',
      name: 'Riposo Bed Frame Queen',
      description: 'Queen-size variant of the Riposo collection.',
      costPrice: 1380.00,
      retailPrice: 2760.00,
      lotSize: 1,
      categoryId: catBedroom.id,
      collectionId: collection.id,
      notes: 'Mattress not included',
    },
    {
      code: 'OE-TEX-001',
      name: 'Nebbia Throw Blanket',
      description: 'Hand-loomed merino wool throw in fog grey. 140x200cm.',
      costPrice: 145.00,
      retailPrice: 290.00,
      lotSize: 4,
      categoryId: catTextiles.id,
      collectionId: collection.id,
      notes: 'Min. 4 pcs per color',
    },
    {
      code: 'OE-TEX-002',
      name: 'Alba Linen Cushion Set',
      description: 'Set of 2 stonewashed linen cushions with feather insert. 50x50cm.',
      costPrice: 95.00,
      retailPrice: 190.00,
      lotSize: 4,
      categoryId: catTextiles.id,
      collectionId: collection.id,
      notes: 'Sold as set of 2. Min. 4 sets per color.',
    },
    {
      code: 'OE-OUT-001',
      name: 'Giardino Lounge Chair',
      description: 'Outdoor lounge chair in powder-coated aluminum with Sunbrella cushion.',
      costPrice: 520.00,
      retailPrice: 1040.00,
      lotSize: 2,
      categoryId: catOutdoor.id,
      collectionId: collection.id,
      notes: 'Weather-resistant. Min. 2 pcs.',
    },
    {
      code: 'OE-OUT-002',
      name: 'Giardino Side Table',
      description: 'Companion side table in brushed aluminum with teak top.',
      costPrice: 285.00,
      retailPrice: 570.00,
      lotSize: 2,
      categoryId: catOutdoor.id,
      collectionId: collection.id,
    },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { code: product.code },
      update: {},
      create: product as any,
    });
  }

  console.log(`${products.length} products created`);
  console.log('Seed complete!');
  console.log('\nCredentials:');
  console.log('Admin: admin@meridiano361.com / admin123');
  console.log('Customer: showroom@designstore.it / customer123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
