-- CreateEnum
CREATE TYPE "PublishStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateTable
CREATE TABLE "Product" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "PublishStatus" NOT NULL DEFAULT 'DRAFT',
    "position" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "pack" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "composition" JSONB NOT NULL,
    "ingredients" TEXT NOT NULL,
    "benefits" TEXT[],
    "packClaims" TEXT[],
    "dosage" TEXT NOT NULL,
    "precautions" TEXT NOT NULL,
    "mrpPaise" INTEGER,
    "pricePaise" INTEGER,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Concern" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "Concern_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConcernProduct" (
    "concernId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "ConcernProduct_pkey" PRIMARY KEY ("concernId","productId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "Product_status_position_idx" ON "Product"("status", "position");

-- CreateIndex
CREATE UNIQUE INDEX "Concern_slug_key" ON "Concern"("slug");

-- CreateIndex
CREATE INDEX "ConcernProduct_productId_idx" ON "ConcernProduct"("productId");

-- AddForeignKey
ALTER TABLE "ConcernProduct" ADD CONSTRAINT "ConcernProduct_concernId_fkey" FOREIGN KEY ("concernId") REFERENCES "Concern"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConcernProduct" ADD CONSTRAINT "ConcernProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
