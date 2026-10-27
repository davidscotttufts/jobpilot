-- Closed sets stored as free text; the API only ever wrote these values.
CREATE TYPE "salary_period" AS ENUM ('yearly', 'monthly', 'hourly');
CREATE TYPE "salary_currency" AS ENUM ('USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR');

ALTER TABLE "salary_preferences" ALTER COLUMN "period" DROP DEFAULT;
ALTER TABLE "salary_preferences" ALTER COLUMN "period" TYPE "salary_period" USING "period"::"salary_period";
ALTER TABLE "salary_preferences" ALTER COLUMN "period" SET DEFAULT 'yearly';

ALTER TABLE "salary_preferences" ALTER COLUMN "currency" DROP DEFAULT;
ALTER TABLE "salary_preferences" ALTER COLUMN "currency" TYPE "salary_currency" USING "currency"::"salary_currency";
ALTER TABLE "salary_preferences" ALTER COLUMN "currency" SET DEFAULT 'USD';
