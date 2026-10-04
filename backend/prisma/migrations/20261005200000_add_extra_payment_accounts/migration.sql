-- AlterTable
ALTER TABLE "Settings" ADD COLUMN "extraBankAccounts" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN "extraPromptPays" JSONB NOT NULL DEFAULT '[]';
