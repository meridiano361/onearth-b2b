import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const sample = await prisma.product.findMany({
    where: { notes: { not: null } },
    select: { code: true, notes: true, paese: true },
    take: 20,
  });
  console.log(JSON.stringify(sample, null, 2));
  console.log('\nTotal products with notes:', await prisma.product.count({ where: { notes: { not: null } } }));
}
main().catch(console.error).finally(() => prisma.$disconnect());
