-- ============================================================
-- ARTISFLOW — Full Supabase Migration Script
-- Migrates schema from ProjectGalleria → Galeria
-- Run this in the SQL Editor of your NEW Supabase project
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. PROFILES (User Accounts)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  name TEXT NOT NULL,
  first_name TEXT,
  full_name TEXT,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'Sales Agent',
  branch TEXT,
  status TEXT NOT NULL DEFAULT 'Active',
  permissions JSONB,
  last_login TEXT,
  position TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. ARTWORKS
-- ============================================================
CREATE TABLE IF NOT EXISTS artworks (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  code TEXT,
  title TEXT NOT NULL,
  artist TEXT,
  medium TEXT,
  dimensions TEXT,
  year TEXT,
  price NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Available',
  current_branch TEXT,
  image_url TEXT,
  itdr_image_url TEXT,
  rsa_image_url TEXT,
  or_cr_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  import_period TEXT,
  sheet_name TEXT,
  item_count INTEGER,
  remarks TEXT,
  reservation_expiry TEXT,
  reserved_for_event_id TEXT,
  reserved_for_event_name TEXT,
  size_frame TEXT,
  sold_at_branch TEXT,
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_artworks_status ON artworks(status);
CREATE INDEX IF NOT EXISTS idx_artworks_current_branch ON artworks(current_branch);
CREATE INDEX IF NOT EXISTS idx_artworks_created_at ON artworks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_artworks_import_period ON artworks(import_period);
CREATE INDEX IF NOT EXISTS idx_artworks_code ON artworks(code);

-- ============================================================
-- 3. SALES
-- ============================================================
CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  artwork_id TEXT REFERENCES artworks(id) ON DELETE SET NULL,
  client_name TEXT,
  client_email TEXT,
  client_contact TEXT,
  agent_name TEXT,
  agent_id TEXT,
  sale_date TEXT,
  delivery_date TEXT,
  is_delivered BOOLEAN DEFAULT FALSE,
  is_cancelled BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'For Sale Approval',
  decline_reason TEXT,
  requested_attachments JSONB,
  attachment_url TEXT,
  itdr_url JSONB,
  rsa_url JSONB,
  or_cr_url JSONB,
  sold_at_event_id TEXT,
  sold_at_event_name TEXT,
  downpayment NUMERIC DEFAULT 0,
  is_downpayment BOOLEAN DEFAULT FALSE,
  downpayment_recorded_at TEXT,
  pending_downpayment_edit JSONB,
  installments JSONB DEFAULT '[]'::JSONB,
  artwork_snapshot JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_artwork_id ON sales(artwork_id);
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);
CREATE INDEX IF NOT EXISTS idx_sales_agent_id ON sales(agent_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at DESC);

-- ============================================================
-- 4. EVENTS (Exhibitions & Auctions)
-- ============================================================
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  title TEXT NOT NULL,
  location TEXT,
  start_date TEXT,
  end_date TEXT,
  status TEXT DEFAULT 'Upcoming',
  artwork_ids JSONB DEFAULT '[]'::JSONB,
  type TEXT DEFAULT 'Exhibition',
  is_strict_duration BOOLEAN DEFAULT FALSE,
  is_timeless BOOLEAN DEFAULT FALSE,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. TRANSFERS
-- ============================================================
CREATE TABLE IF NOT EXISTS transfers (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  artwork_id TEXT REFERENCES artworks(id) ON DELETE SET NULL,
  origin TEXT,
  destination TEXT,
  performed_by TEXT,
  timestamp TEXT,
  artwork_title TEXT,
  approved_by TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transfers_artwork_id ON transfers(artwork_id);

-- ============================================================
-- 6. TRANSFER REQUESTS
-- ============================================================
CREATE TABLE IF NOT EXISTS transfer_requests (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  artwork_id TEXT,
  artwork_title TEXT,
  artwork_code TEXT,
  artwork_image TEXT,
  from_branch TEXT,
  to_branch TEXT,
  status TEXT DEFAULT 'Pending',
  requested_by TEXT,
  requested_at TEXT,
  responded_by TEXT,
  responded_at TEXT,
  notes TEXT,
  itdr_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 7. ACTIVITY LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS activity_logs (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  artwork_id TEXT,
  action TEXT,
  "user" TEXT,
  user_id TEXT,
  user_name TEXT,
  timestamp TEXT,
  details TEXT,
  artwork_snapshot JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_artwork_id ON activity_logs(artwork_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);

-- ============================================================
-- 8. INVENTORY AUDITS
-- ============================================================
CREATE TABLE IF NOT EXISTS audits (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  month TEXT,
  confirmed_at TEXT,
  confirmed_by TEXT,
  total_count INTEGER DEFAULT 0,
  available_count INTEGER DEFAULT 0,
  added_count INTEGER DEFAULT 0,
  transferred_count INTEGER DEFAULT 0,
  sold_in_gallery_count INTEGER DEFAULT 0,
  cancelled_count INTEGER DEFAULT 0,
  snapshot JSONB DEFAULT '[]'::JSONB,
  type TEXT DEFAULT 'Monthly Audit',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 9. NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  title TEXT,
  message TEXT,
  timestamp TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  type TEXT DEFAULT 'system',
  artwork_id TEXT,
  agent TEXT,
  user_name TEXT,
  items JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 10. IMPORT RECORDS
-- ============================================================
CREATE TABLE IF NOT EXISTS import_records (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  filename TEXT,
  imported_by TEXT,
  timestamp TEXT,
  record_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'Success',
  details TEXT,
  imported_ids JSONB,
  updated_ids JSONB,
  failed_items JSONB,
  imported_at TEXT,
  total_items INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 11. RETURN RECORDS
-- ============================================================
CREATE TABLE IF NOT EXISTS returns (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  artwork_id TEXT,
  reason TEXT,
  returned_by TEXT,
  return_date TEXT,
  artwork_snapshot JSONB,
  reference_number TEXT,
  proof_image TEXT,
  remarks TEXT,
  return_type TEXT DEFAULT 'Artist Reclaim',
  status TEXT DEFAULT 'Open',
  resolved_at TEXT,
  resolved_to_branch TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 12. FRAMER RECORDS
-- ============================================================
CREATE TABLE IF NOT EXISTS framer_records (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  artwork_id TEXT,
  damage_details TEXT,
  attachment_url TEXT,
  sent_date TEXT,
  artwork_snapshot JSONB,
  status TEXT DEFAULT 'Open',
  resolved_at TEXT,
  resolved_to_branch TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 13. BRANCHES
-- ============================================================
CREATE TABLE IF NOT EXISTS branches (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  name TEXT NOT NULL UNIQUE,
  category TEXT,
  address TEXT,
  logo_url TEXT,
  is_exclusive BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 14. CONVERSATIONS (Chat)
-- ============================================================
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  participant_ids JSONB DEFAULT '[]'::JSONB,
  participant_names JSONB DEFAULT '{}'::JSONB,
  last_message JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  unread_count JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 15. MESSAGES (Chat)
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  conversation_id TEXT REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id TEXT,
  sender_name TEXT,
  text TEXT,
  timestamp TEXT,
  read_by JSONB DEFAULT '[]'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);

-- ============================================================
-- 16. MONITORING SUMMARIES
-- ============================================================
CREATE TABLE IF NOT EXISTS monitoring_summaries (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  month INTEGER,
  year INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,
  beginning_inventory INTEGER DEFAULT 0,
  total_items_in INTEGER DEFAULT 0,
  total_items_out_sold INTEGER DEFAULT 0,
  total_items_out_transfer INTEGER DEFAULT 0,
  available_inventory INTEGER DEFAULT 0,
  sold_pieces_still_in_gallery INTEGER DEFAULT 0,
  total_inventory INTEGER DEFAULT 0,
  items_in JSONB DEFAULT '[]'::JSONB,
  items_out_sold JSONB DEFAULT '[]'::JSONB,
  items_out_transfer JSONB DEFAULT '[]'::JSONB,
  is_physical_check_confirmed BOOLEAN DEFAULT FALSE,
  physical_check_confirmed_at TEXT,
  physical_check_confirmed_by TEXT
);

-- ============================================================
-- 17. ROW LEVEL SECURITY (RLS) — Open Access via anon key
-- ============================================================
-- Enable RLS on all tables but allow full access via anon key
-- (matches your current setup where authentication is app-level)

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE artworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE framer_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_summaries ENABLE ROW LEVEL SECURITY;

-- Full access policies (SELECT, INSERT, UPDATE, DELETE for all)
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'profiles', 'artworks', 'sales', 'events', 'transfers',
      'transfer_requests', 'activity_logs', 'audits',
      'notifications', 'import_records', 'returns',
      'framer_records', 'branches', 'conversations', 'messages',
      'monitoring_summaries'
    ])
  LOOP
    EXECUTE format('CREATE POLICY "Allow full select on %I" ON %I FOR SELECT USING (true)', tbl, tbl);
    EXECUTE format('CREATE POLICY "Allow full insert on %I" ON %I FOR INSERT WITH CHECK (true)', tbl, tbl);
    EXECUTE format('CREATE POLICY "Allow full update on %I" ON %I FOR UPDATE USING (true) WITH CHECK (true)', tbl, tbl);
    EXECUTE format('CREATE POLICY "Allow full delete on %I" ON %I FOR DELETE USING (true)', tbl, tbl);
  END LOOP;
END
$$;

-- ============================================================
-- 18. REALTIME — Enable for tables that need live updates
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE artworks;
ALTER PUBLICATION supabase_realtime ADD TABLE sales;
ALTER PUBLICATION supabase_realtime ADD TABLE events;
ALTER PUBLICATION supabase_realtime ADD TABLE transfers;
ALTER PUBLICATION supabase_realtime ADD TABLE transfer_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE branches;

-- ============================================================
-- DONE! Your new Supabase project is ready.
-- Next steps:
-- 1. Copy the new project URL and anon key
-- 2. Update your .env file
-- 3. Redeploy to Vercel
-- ============================================================
