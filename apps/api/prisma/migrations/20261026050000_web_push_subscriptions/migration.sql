-- The push module is named web-push: browser Web Push (VAPID), not push as a verb.
ALTER TABLE "push_subscriptions" RENAME TO "web_push_subscriptions";
ALTER TABLE "web_push_subscriptions" RENAME CONSTRAINT "push_subscriptions_pkey" TO "web_push_subscriptions_pkey";
ALTER TABLE "web_push_subscriptions" RENAME CONSTRAINT "push_subscriptions_user_id_fkey" TO "web_push_subscriptions_user_id_fkey";
ALTER INDEX "push_subscriptions_endpoint_key" RENAME TO "web_push_subscriptions_endpoint_key";
ALTER INDEX "push_subscriptions_user_id_idx" RENAME TO "web_push_subscriptions_user_id_idx";
