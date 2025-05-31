/*
  Warnings:

  - Added the required column `mediaType` to the `PostImage` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PostImage" ADD COLUMN     "mediaType" TEXT NOT NULL;
