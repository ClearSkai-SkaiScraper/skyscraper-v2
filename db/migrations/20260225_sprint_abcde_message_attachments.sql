-- Sprint B: Add attachments column to Message table
-- Stores array of URLs (S3/Supabase storage) for file attachments in messages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Message' AND column_name = 'attachments'
  ) THEN
    ALTER TABLE "Message" ADD COLUMN "attachments" TEXT[] DEFAULT '{}';
    RAISE NOTICE '✅ Added attachments column to Message';
  ELSE
    RAISE NOTICE '⏭️  attachments column already exists on Message';
  END IF;
END $$;
