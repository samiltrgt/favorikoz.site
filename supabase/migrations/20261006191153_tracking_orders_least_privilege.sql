-- Customer reads remain controlled by existing owner/admin RLS policies.
-- RLS does not protect TRUNCATE. Only the server service role may write orders.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.orders FROM PUBLIC, anon, authenticated;
