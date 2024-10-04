/*
  Warnings:

  - Added the required column `doctor_name` to the `AppointmentReschedule` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `appointmentreschedule` ADD COLUMN `doctor_name` VARCHAR(191) NOT NULL;
