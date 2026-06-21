import { PrismaClient } from '@prisma/client'

// Prisma 클라이언트 싱글톤. (개발 중 --watch 재시작 시 커넥션 누수 방지)
const globalForPrisma = globalThis

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
