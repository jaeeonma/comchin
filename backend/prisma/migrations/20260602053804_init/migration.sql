-- CreateEnum
CREATE TYPE "PartCategory" AS ENUM ('CPU', 'CPU_COOLER', 'MEMORY', 'MOTHERBOARD', 'GPU', 'SSD', 'HDD', 'PSU', 'CASE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "nickname" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parts" (
    "id" TEXT NOT NULL,
    "category" "PartCategory" NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "price" INTEGER NOT NULL,
    "tdp" INTEGER NOT NULL DEFAULT 0,
    "imageUrl" TEXT,
    "socket" TEXT,
    "memoryType" TEXT,
    "specs" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "builds" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '내 견적',
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "builds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "build_parts" (
    "id" TEXT NOT NULL,
    "buildId" TEXT NOT NULL,
    "partId" TEXT NOT NULL,

    CONSTRAINT "build_parts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "parts_category_idx" ON "parts"("category");

-- CreateIndex
CREATE INDEX "builds_userId_idx" ON "builds"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "build_parts_buildId_partId_key" ON "build_parts"("buildId", "partId");

-- AddForeignKey
ALTER TABLE "builds" ADD CONSTRAINT "builds_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "build_parts" ADD CONSTRAINT "build_parts_buildId_fkey" FOREIGN KEY ("buildId") REFERENCES "builds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "build_parts" ADD CONSTRAINT "build_parts_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
