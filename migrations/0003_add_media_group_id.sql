-- Telegram sends each photo in a multi-image post ("album") as a separate
-- update, and only ONE of them carries the caption text. Track the shared
-- media_group_id so the webhook can propagate that caption to every photo
-- in the batch, regardless of delivery order.
ALTER TABLE media ADD COLUMN media_group_id TEXT;
CREATE INDEX idx_media_group ON media(media_group_id);
