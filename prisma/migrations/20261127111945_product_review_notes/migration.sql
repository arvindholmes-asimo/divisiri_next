-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "reviewNotes" TEXT[] DEFAULT ARRAY[]::TEXT[];
