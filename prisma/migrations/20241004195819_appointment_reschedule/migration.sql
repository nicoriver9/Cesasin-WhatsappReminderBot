-- DropIndex
DROP INDEX `AppointmentReschedule_whatsapp_msg_id_fkey` ON `appointmentreschedule`;

-- AlterTable
ALTER TABLE `appointmentreschedule` ADD COLUMN `confirmed` BOOLEAN NOT NULL DEFAULT false;
