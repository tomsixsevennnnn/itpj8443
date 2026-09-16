import { PrismaService } from './src/prisma/prisma.service'
import { AuditService } from './src/audit/audit.service'

async function main() {
  const prisma = new PrismaService()
  await prisma.$connect()
  const audit = new AuditService(prisma as any)

  console.log('--- existing auth0Sub ---')
  await audit.log('auth0|6a707847275c708a0cd8f6ff', 'package.update', 'Package', 'set-2000', { a: 1 }, { a: 2 })

  console.log('--- nonexistent auth0Sub ---')
  await audit.log('auth0|does-not-exist-xyz', 'menu.delete', 'MenuItem', 'test-id', { name: 'x' }, undefined)

  const rows = await prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 5 })
  console.log('latest rows:', JSON.stringify(rows.map(r => ({ id: r.id, action: r.action, entityId: r.entityId })), null, 2))
  await prisma.$disconnect()
}
main().catch(e => { console.error('TOP LEVEL ERROR', e); process.exit(1) })
