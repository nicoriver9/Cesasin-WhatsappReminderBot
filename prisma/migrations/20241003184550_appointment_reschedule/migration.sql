-- AlterTable
ALTER TABLE `patientresponses` ADD COLUMN `appointmentReseverd` BOOLEAN NULL DEFAULT false,
    ADD COLUMN `conversationState` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `whatsappmsg` ADD COLUMN `appointmentReseverd` BOOLEAN NULL DEFAULT false,
    ADD COLUMN `reminder_state` INTEGER NULL;

-- CreateTable
CREATE TABLE `AppointmentReschedule` (
    `reschedule_id` INTEGER NOT NULL AUTO_INCREMENT,
    `whatsapp_msg_id` INTEGER NOT NULL,
    `new_appointment_date` DATETIME(3) NOT NULL,
    `reason` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`reschedule_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AppointmentReschedule` ADD CONSTRAINT `AppointmentReschedule_whatsapp_msg_id_fkey` FOREIGN KEY (`whatsapp_msg_id`) REFERENCES `WhatsappMsg`(`whatsapp_msg_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
