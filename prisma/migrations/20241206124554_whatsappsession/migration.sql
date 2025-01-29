/*
  Warnings:

  - You are about to drop the column `sessionId` on the `whatsappsession` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[sessionName]` on the table `WhatsappSession` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX `WhatsappSession_sessionId_key` ON `whatsappsession`;

-- AlterTable
ALTER TABLE `whatsappsession` DROP COLUMN `sessionId`,
    ADD COLUMN `sessionName` VARCHAR(191) NULL,
    MODIFY `data` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `WhatsappSession_sessionName_key` ON `WhatsappSession`(`sessionName`);
