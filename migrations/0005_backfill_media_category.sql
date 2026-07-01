-- 0004 added media.category but only NEW approvals set it going forward.
-- listPublicMedia/listLive now read category from this column instead of
-- deriving it from impact rows, so every already-approved ('live') group
-- from before 0004 would otherwise vanish from the public gallery and the
-- admin corrections list. Backfill it from each group's impact rows —
-- impact rows only exist on the group's primary media id, so look it up
-- via the shared media_group_id rather than a naive per-row join.
UPDATE media
SET category = (
  SELECT i.category
  FROM impact i
  JOIN media m2 ON m2.id = i.media_id
  WHERE COALESCE(m2.media_group_id, m2.id) = COALESCE(media.media_group_id, media.id)
  LIMIT 1
)
WHERE status = 'live' AND category IS NULL;
