import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

const SETUP_SECRET = process.env.SETUP_SECRET;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get('secret');
  if (!SETUP_SECRET || secret !== SETUP_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const collection = await prisma.collection.upsert({ where: { slug: 'casa-2027' }, update: {}, create: { name: 'CASA 2027', slug: 'casa-2027', season: 'FW', year: 2027, isActive: true } });
    const catLiving = await prisma.category.upsert({ where: { slug_collectionId: { slug: 'living', collectionId: collection.id } }, update: {}, create: { name: 'Living', slug: 'living', order: 1, collectionId: collection.id } });
    const catBedroom = await prisma.category.upsert({ where: { slug_collectionId: { slug: 'bedroom', collectionId: collection.id } }, update: {}, create: { name: 'Bedroom', slug: 'bedroom', order: 2, collectionId: collection.id } });
    const catOutdoor = await prisma.category.upsert({ where: { slug_collectionId: { slug: 'outdoor', collectionId: collection.id } }, update: {}, create: { name: 'Outdoor', slug: 'outdoor', order: 3, collectionId: collection.id } });
    const catDecor = await prisma.category.upsert({ where: { slug_collectionId: { slug: 'decor', collectionId: collection.id } }, update: {}, create: { name: 'Decor & Accessories', slug: 'decor', order: 4, collectionId: collection.id } });
    const catSofas = await prisma.category.upsert({ where: { slug_collectionId: { slug: 'sofas', collectionId: collection.id } }, update: {}, create: { name: 'Sofas & Seating', slug: 'sofas', parentId: catLiving.id, order: 1, collectionId: collection.id } });
    const catTables = await prisma.category.upsert({ where: { slug_collectionId: { slug: 'tables', collectionId: collection.id } }, update: {}, create: { name: 'Tables', slug: 'tables', parentId: catLiving.id, order: 2, collectionId: collection.id } });
    const catLighting = await prisma.category.upsert({ where: { slug_collectionId: { slug: 'lighting', collectionId: collection.id } }, update: {}, create: { name: 'Lighting', slug: 'lighting', parentId: catDecor.id, order: 1, collectionId: collection.id } });
    const catTextiles = await prisma.category.upsert({ where: { slug_collectionId: { slug: 'textiles', collectionId: collection.id } }, update: {}, create: { name: 'Textiles', slug: 'textiles', parentId: catBedroom.id, order: 1, collectionId: collection.id } });
    const adminHash = await bcrypt.hash('admin123', 12);
          update: { passwordHash: adminHash, isActive: true }, create: { companyName: 'Meridiano 361', customerCode: 'ADMIN001', email: 'admin@meridiano361.com', passwordHash: adminHash, role: 'ADMIN', isActive: true } });
    const customerHash = await bcrypt.hash('customer123', 12);
    await prisma.customer.upsert({ where: { email: 'showroom@designstore.it' }, update: {}, create: { companyName: 'Design Store Milano', customerCode: 'DSM001', email: 'showroom@designstore.it', passwordHash: customerHash, role: 'CUSTOMER', isActive: true, city: 'Milano', country: 'Italy' } });
    await prisma.customer.upsert({ where: { email: 'orders@luxtrade.de' }, update: {}, create: { companyName: 'Lux Trade GmbH', customerCode: 'LTG001', email: 'orders@luxtrade.de', passwordHash: customerHash, role: 'CUSTOMER', isActive: true, city: 'Berlin', country: 'Germany' } });
    const products = [
      { code: 'OE-SOF-001', name: 'Anima Sofa 3-Seater', costPrice: 1850, retailPrice: 3700, lotSize: 1, categoryId: catSofas.id },
      { code: 'OE-SOF-002', name: 'Anima Sofa 2-Seater', costPrice: 1350, retailPrice: 2700, lotSize: 1, categoryId: catSofas.id },
      { code: 'OE-SOF-003', name: 'Pietra Armchair', costPrice: 780, retailPrice: 1560, lotSize: 2, categoryId: catSofas.id },
      { code: 'OE-TAB-001', name: 'Terra Coffee Table Large', costPrice: 920, retailPrice: 1840, lotSize: 1, categoryId: catTables.id },
      { code: 'OE-TAB-002', name: 'Terra Coffee Table Small', costPrice: 540, retailPrice: 1080, lotSize: 1, categoryId: catTables.id },
      { code: 'OE-TAB-003', name: 'Luce Dining Table 200cm', costPrice: 2100, retailPrice: 4200, lotSize: 1, categoryId: catTables.id },
      { code: 'OE-LIG-001', name: 'Soffio Pendant Light', costPrice: 380, retailPrice: 760, lotSize: 2, categoryId: catLighting.id },
      { code: 'OE-LIG-002', name: 'Soffio Floor Lamp', costPrice: 490, retailPrice: 980, lotSize: 1, categoryId: catLighting.id },
      { code: 'OE-LIG-003', name: 'Filo Wall Sconce', costPrice: 195, retailPrice: 390, lotSize: 2, categoryId: catLighting.id },
      { code: 'OE-BED-001', name: 'Riposo Bed Frame King', costPrice: 1650, retailPrice: 3300, lotSize: 1, categoryId: catBedroom.id },
      { code: 'OE-BED-002', name: 'Riposo Bed Frame Queen', costPrice: 1380, retailPrice: 2760, lotSize: 1, categoryId: catBedroom.id },
      { code: 'OE-TEX-001', name: 'Nebbia Throw Blanket', costPrice: 145, retailPrice: 290, lotSize: 4, categoryId: catTextiles.id },
      { code: 'OE-TEX-002', name: 'Alba Linen Cushion Set', costPrice: 95, retailPrice: 190, lotSize: 4, categoryId: catTextiles.id },
      { code: 'OE-OUT-001', name: 'Giardino Lounge Chair', costPrice: 520, retailPrice: 1040, lotSize: 2, categoryId: catOutdoor.id },
      { code: 'OE-OUT-002', name: 'Giardino Side Table', costPrice: 285, retailPrice: 570, lotSize: 2, categoryId: catOutdoor.id },
    ];
    let seeded = 0;
    for (const p of products) {
      await prisma.product.upsert({ where: { code: p.code }, update: {}, create: { ...p, collectionId: collection.id, isActive: true } });
      seeded++;
    }
    return NextResponse.json({ ok: true, message: 'Database seeded successfully', data: { products: seeded, admin: 'admin@meridiano361.com / admin123' } });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
