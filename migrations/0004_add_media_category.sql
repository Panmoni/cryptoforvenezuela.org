-- Approving a group with no itemized items (e.g. a general-evidence video,
-- not a photo of specific supplies) previously had nowhere to persist a
-- category, since the public gallery derived it solely from `impact` rows
-- — a group with zero items was invisible on the public site. Stamp the
-- admin-confirmed category directly onto `media` at approve time instead.
ALTER TABLE media ADD COLUMN category TEXT;
