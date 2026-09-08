-- Deployment migration; not executed automatically or against production by this patch.
-- Change the default for FUTURE inserts only. Preserve every existing configured rate.
ALTER TABLE artists ALTER COLUMN commission_rate SET DEFAULT 0.60;

-- The application now uses a fixed 60% pool regardless of legacy per-artist values.
-- Existing rates/financial records are retained for audit; no historical data backfill.
