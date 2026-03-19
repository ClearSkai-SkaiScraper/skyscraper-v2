// Quick test: Verify Supabase storage upload works
require("dotenv").config({ path: [".env.vercel-prod", ".env.local", ".env"] });
const { createClient } = require("@supabase/supabase-js");

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log("URL:", url ? url.substring(0, 30) + "..." : "MISSING");
console.log("Key:", key ? key.substring(0, 10) + "..." : "MISSING");

if (!url || !key) {
  console.log("MISSING ENV VARS — cannot test");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

async function test() {
  // List buckets
  const { data: buckets, error: bucketsErr } = await supabase.storage.listBuckets();
  if (bucketsErr) {
    console.log("List buckets failed:", bucketsErr.message);
    return;
  }
  console.log("Buckets:", buckets.map((b) => b.name).join(", "));

  // Try uploading a test PDF to claim-photos
  const testPdf = Buffer.from("%PDF-1.4 test content for supabase upload verification");
  const testKey = "test/pdf-test-" + Date.now() + ".pdf";
  const { error } = await supabase.storage
    .from("claim-photos")
    .upload(testKey, testPdf, { contentType: "application/pdf", upsert: true });

  if (error) {
    console.log("Upload FAILED:", error.message);
    console.log("Error details:", JSON.stringify(error));
  } else {
    console.log("Upload SUCCEEDED:", testKey);
    // Get public URL
    const { data: urlData } = supabase.storage.from("claim-photos").getPublicUrl(testKey);
    console.log("Public URL:", urlData.publicUrl);
    // Clean up
    await supabase.storage.from("claim-photos").remove([testKey]);
    console.log("Cleaned up test file");
  }
}

test().catch((e) => console.log("Error:", e.message));
