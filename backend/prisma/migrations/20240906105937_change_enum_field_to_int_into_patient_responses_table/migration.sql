/*
  Warnings:

  - You are about to alter the column `response` on the `patientresponses` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(0))` to `Int`.

*/
-- AlterTable
ALTER TABLE `patientresponses` MODIFY `response` INTEGER NOT NULL;
