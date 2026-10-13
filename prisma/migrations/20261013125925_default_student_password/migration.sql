-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "defaultStudentPassword" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

