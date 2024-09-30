-- CreateTable
CREATE TABLE `PatientResponses` (
    `response_id` INTEGER NOT NULL AUTO_INCREMENT,
    `patient_full_name` VARCHAR(255) NOT NULL,
    `patient_phone` VARCHAR(20) NOT NULL,
    `appointment_date` DATETIME(3) NULL,
    `response` ENUM('Confirmed', 'Rescheduled', 'Cancelled', 'Invalid') NOT NULL,
    `doctor_name` VARCHAR(255) NULL,
    `received_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`response_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
