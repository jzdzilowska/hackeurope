-- Add stale flag to ai_insights + triggers to mark insights stale
-- when new transactions or invoices arrive.

ALTER TABLE ai_insights ADD COLUMN IF NOT EXISTS stale BOOLEAN DEFAULT false;

CREATE OR REPLACE FUNCTION mark_insights_stale()
RETURNS trigger AS $$
BEGIN
  UPDATE ai_insights SET stale = true WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mark insights stale when new transactions arrive
DROP TRIGGER IF EXISTS on_new_transaction ON transactions;
CREATE TRIGGER on_new_transaction
  AFTER INSERT ON transactions
  FOR EACH ROW EXECUTE FUNCTION mark_insights_stale();

-- Mark insights stale when new invoices arrive
DROP TRIGGER IF EXISTS on_new_invoice ON invoices;
CREATE TRIGGER on_new_invoice
  AFTER INSERT ON invoices
  FOR EACH ROW EXECUTE FUNCTION mark_insights_stale();
