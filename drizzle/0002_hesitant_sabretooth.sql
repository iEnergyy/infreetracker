DROP INDEX "invoices_subscription_id_due_date_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_subscription_id_due_date_unique" ON "invoices" USING btree ("subscription_id","due_date");