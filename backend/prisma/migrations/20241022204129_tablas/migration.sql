-- CreateTable
CREATE TABLE `ConfirmedAppointment` (
    `confirmed_appointment_id` INTEGER NOT NULL AUTO_INCREMENT,
    `whatsapp_msg_id` INTEGER NOT NULL,
    `patient_full_name` VARCHAR(191) NOT NULL,
    `patient_id` INTEGER NULL,
    `patient_phone` VARCHAR(191) NULL,
    `doctor_name` VARCHAR(191) NOT NULL,
    `appointment_date` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `confirmation_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`confirmed_appointment_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CancelledAppointment` (
    `cancelled_appointment_id` INTEGER NOT NULL AUTO_INCREMENT,
    `whatsapp_msg_id` INTEGER NOT NULL,
    `patient_full_name` VARCHAR(191) NOT NULL,
    `patient_id` INTEGER NULL,
    `patient_phone` VARCHAR(191) NULL,
    `doctor_name` VARCHAR(191) NOT NULL,
    `cancellation_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reason` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`cancelled_appointment_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
