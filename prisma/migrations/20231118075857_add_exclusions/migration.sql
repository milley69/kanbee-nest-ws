-- AlterTable
ALTER TABLE "users" ADD COLUMN     "exclusions" JSONB[] DEFAULT ARRAY[]::JSONB[];
