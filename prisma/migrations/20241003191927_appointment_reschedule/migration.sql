/*
  Warnings:

  - You are about to drop the column `reason` on the `appointmentreschedule` table. All the data in the column will be lost.
  - Added the required column `message` to the `AppointmentReschedule` table without a default value. This is not possible if the table is not empty.
  - Added the required column `patient_full_name` to the `AppointmentReschedule` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `appointmentreschedule` DROP COLUMN `reason`,
    ADD COLUMN `message` VARCHAR(191) NOT NULL,
    ADD COLUMN `patient_full_name` VARCHAR(191) NOT NULL,
    ADD COLUMN `patient_id` INTEGER NULL,
    ADD COLUMN `patient_phone` VARCHAR(191) NULL;
