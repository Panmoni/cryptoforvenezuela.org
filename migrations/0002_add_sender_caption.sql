-- The text a volunteer sends alongside a photo in Telegram (message.caption)
-- was being dropped entirely. Store it distinctly from the AI's own
-- scene_description — it's human-provided context, not a model guess.
ALTER TABLE media ADD COLUMN sender_caption TEXT;
