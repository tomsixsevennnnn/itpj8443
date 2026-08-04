-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "categoryOrder" TEXT[] DEFAULT ARRAY['snack', 'appetizer', 'soup', 'salad', 'main', 'fish', 'rice-noodle', 'hotpot', 'dessert']::TEXT[];
