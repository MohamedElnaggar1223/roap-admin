DROP INDEX IF EXISTS "block_branches_block_branch_unique";--> statement-breakpoint
DROP INDEX IF EXISTS "block_coaches_block_coach_unique";--> statement-breakpoint
DROP INDEX IF EXISTS "block_packages_block_package_unique";--> statement-breakpoint
DROP INDEX IF EXISTS "block_sports_block_sport_unique";--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "block_branches_block_branch_unique" ON "block_branches" USING btree ("block_id","branch_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "block_coaches_block_coach_unique" ON "block_coaches" USING btree ("block_id","coach_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "block_packages_block_package_unique" ON "block_packages" USING btree ("block_id","package_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "block_sports_block_sport_unique" ON "block_sports" USING btree ("block_id","sport_id");