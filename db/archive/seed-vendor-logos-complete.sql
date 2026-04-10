-- ============================================================
-- COMPLETE Vendor Logo Seed — All 68 Missing Logos
-- Uses Clearbit Logo API: https://logo.clearbit.com/{domain}
-- Only updates rows where logo IS NULL or empty
-- ============================================================

SET search_path TO app;

BEGIN;

-- ── Building Materials & Lumber ────────────────────────────────────────
UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/84lumber.com'
  WHERE "slug" = '84-lumber' AND ("logo" IS NULL OR "logo" = '');

UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/buildwithbmc.com'
  WHERE "slug" = 'bmc-building' AND ("logo" IS NULL OR "logo" = '');

UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/bc.com'
  WHERE "slug" = 'boise-cascade' AND ("logo" IS NULL OR "logo" = '');

UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/menards.com'
  WHERE "slug" = 'menards' AND ("logo" IS NULL OR "logo" = '');

UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/weyerhaeuser.com'
  WHERE "slug" = 'weyerhaeuser' AND ("logo" IS NULL OR "logo" = '');

UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/fastenal.com'
  WHERE "slug" = 'fastenal' AND ("logo" IS NULL OR "logo" = '');

UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/grainger.com'
  WHERE "slug" = 'grainger' AND ("logo" IS NULL OR "logo" = '');

UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/sunbeltrentals.com'
  WHERE "slug" = 'sunbelt-rentals' AND ("logo" IS NULL OR "logo" = '');

UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/wesco.com'
  WHERE "slug" = 'wesco' AND ("logo" IS NULL OR "logo" = '');

UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/strongtie.com'
  WHERE "slug" = 'simpson-strong-tie' AND ("logo" IS NULL OR "logo" = '');

-- ── Gypsum & Drywall ──────────────────────────────────────────────────
UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/buildgp.com'
  WHERE "slug" = 'georgia-pacific-gypsum' AND ("logo" IS NULL OR "logo" = '');

UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/nationalgypsum.com'
  WHERE "slug" = 'national-gypsum' AND ("logo" IS NULL OR "logo" = '');

UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/usg.com'
  WHERE "slug" = 'usg' AND ("logo" IS NULL OR "logo" = '');

-- ── HVAC & Distribution ───────────────────────────────────────────────
UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/bakerdist.com'
  WHERE "slug" = 'baker-distributing' AND ("logo" IS NULL OR "logo" = '');

UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/carrierenterprise.com'
  WHERE "slug" = 'carrier-enterprise' AND ("logo" IS NULL OR "logo" = '');

UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/remichel.com'
  WHERE "slug" = 're-michel' AND ("logo" IS NULL OR "logo" = '');

UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/watsco.com'
  WHERE "slug" = 'watsco' AND ("logo" IS NULL OR "logo" = '');

UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/fwwebb.com'
  WHERE "slug" = 'fw-webb' AND ("logo" IS NULL OR "logo" = '');

-- ── Electrical ─────────────────────────────────────────────────────────
UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/borderstates.com'
  WHERE "slug" = 'border-states' AND ("logo" IS NULL OR "logo" = '');

UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/cedcareers.com'
  WHERE "slug" = 'ced-electrical' AND ("logo" IS NULL OR "logo" = '');

-- ── Solar ──────────────────────────────────────────────────────────────
UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/baywa-re.us'
  WHERE "slug" = 'baywa-re' AND ("logo" IS NULL OR "logo" = '');

UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/cedgreentech.com'
  WHERE "slug" = 'ced-greentech' AND ("logo" IS NULL OR "logo" = '');

UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/enphase.com'
  WHERE "slug" = 'enphase' AND ("logo" IS NULL OR "logo" = '');

UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/q-cells.us'
  WHERE "slug" = 'qcells' AND ("logo" IS NULL OR "logo" = '');

UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/solaredge.com'
  WHERE "slug" = 'solaredge' AND ("logo" IS NULL OR "logo" = '');

UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/tesla.com'
  WHERE "slug" = 'tesla-solar' AND ("logo" IS NULL OR "logo" = '');

-- ── Plumbing & Water ───────────────────────────────────────────────────
UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/coreandmain.com'
  WHERE "slug" = 'core-main' AND ("logo" IS NULL OR "logo" = '');

-- ── Restoration & Remediation ──────────────────────────────────────────
UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/belfor.com'
  WHERE "slug" = 'belfor' AND ("logo" IS NULL OR "logo" = '');

UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/biooneinc.com'
  WHERE "slug" = 'bio-one' AND ("logo" IS NULL OR "logo" = '');

UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/dri-eaz.com'
  WHERE "slug" = 'dri-eaz' AND ("logo" IS NULL OR "logo" = '');

UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/fiberlock.com'
  WHERE "slug" = 'fiberlock' AND ("logo" IS NULL OR "logo" = '');

UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/firedawgs.com'
  WHERE "slug" = 'fire-dawgs' AND ("logo" IS NULL OR "logo" = '');

UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/servicemasterrestore.com'
  WHERE "slug" = 'servicemaster' AND ("logo" IS NULL OR "logo" = '');

UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/verisk.com'
  WHERE "slug" = 'xactimate-verisk' AND ("logo" IS NULL OR "logo" = '');

UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/verisk.com'
  WHERE "slug" = 'xactimate-water' AND ("logo" IS NULL OR "logo" = '');

-- ── Hardscape & Masonry ────────────────────────────────────────────────
UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/belgard.com'
  WHERE "slug" = 'belgard' AND ("logo" IS NULL OR "logo" = '');

UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/boralamerica.com'
  WHERE "slug" = 'boral-concrete' AND ("logo" IS NULL OR "logo" = '');

UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/calportland.com'
  WHERE "slug" = 'calportland' AND ("logo" IS NULL OR "logo" = '');

UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/eldoradostone.com'
  WHERE "slug" = 'eldorado-stone' AND ("logo" IS NULL OR "logo" = '');

UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/sakrete.com'
  WHERE "slug" = 'sakrete' AND ("logo" IS NULL OR "logo" = '');

UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/techo-bloc.com'
  WHERE "slug" = 'techo-bloc' AND ("logo" IS NULL OR "logo" = '');

-- ── Stucco & Coatings ──────────────────────────────────────────────────
UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/lahabra.com'
  WHERE "slug" = 'lahabra' AND ("logo" IS NULL OR "logo" = '');

UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/omega-products.com'
  WHERE "slug" = 'omega-products' AND ("logo" IS NULL OR "logo" = '');

-- ── Countertops & Surfaces ─────────────────────────────────────────────
UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/caesarstoneus.com'
  WHERE "slug" = 'caesarstone' AND ("logo" IS NULL OR "logo" = '');

UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/cambriausa.com'
  WHERE "slug" = 'cambria' AND ("logo" IS NULL OR "logo" = '');

UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/msisurfaces.com'
  WHERE "slug" = 'msi-surfaces' AND ("logo" IS NULL OR "logo" = '');

UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/silestone.com'
  WHERE "slug" = 'silestone' AND ("logo" IS NULL OR "logo" = '');

UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/daltile.com'
  WHERE "slug" = 'daltile' AND ("logo" IS NULL OR "logo" = '');

-- ── Cabinets & Storage ─────────────────────────────────────────────────
UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/kraftmaid.com'
  WHERE "slug" = 'kraftmaid' AND ("logo" IS NULL OR "logo" = '');

UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/merillat.com'
  WHERE "slug" = 'merillat' AND ("logo" IS NULL OR "logo" = '');

UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/rev-a-shelf.com'
  WHERE "slug" = 'rev-a-shelf' AND ("logo" IS NULL OR "logo" = '');

-- ── Appliances ─────────────────────────────────────────────────────────
UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/bosch-home.com'
  WHERE "slug" = 'bosch-home' AND ("logo" IS NULL OR "logo" = '');

UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/geappliances.com'
  WHERE "slug" = 'ge-appliances' AND ("logo" IS NULL OR "logo" = '');

UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/whirlpool.com'
  WHERE "slug" = 'whirlpool-pro' AND ("logo" IS NULL OR "logo" = '');

-- ── Fencing & Decking ──────────────────────────────────────────────────
UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/bufftech.com'
  WHERE "slug" = 'bufftech' AND ("logo" IS NULL OR "logo" = '');

UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/masterhalco.com'
  WHERE "slug" = 'master-halco' AND ("logo" IS NULL OR "logo" = '');

UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/trexfencing.com'
  WHERE "slug" = 'trex-fencing' AND ("logo" IS NULL OR "logo" = '');

-- ── Pools & Outdoor ────────────────────────────────────────────────────
UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/hayward.com'
  WHERE "slug" = 'hayward' AND ("logo" IS NULL OR "logo" = '');

UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/lesliespool.com'
  WHERE "slug" = 'leslies-pool' AND ("logo" IS NULL OR "logo" = '');

UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/pebbletec.com'
  WHERE "slug" = 'pebble-tec' AND ("logo" IS NULL OR "logo" = '');

UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/pentair.com'
  WHERE "slug" = 'pentair' AND ("logo" IS NULL OR "logo" = '');

-- ── Landscaping & Irrigation ───────────────────────────────────────────
UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/ewingirrigation.com'
  WHERE "slug" = 'ewing-outdoor' AND ("logo" IS NULL OR "logo" = '');

UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/rainbird.com'
  WHERE "slug" = 'rain-bird' AND ("logo" IS NULL OR "logo" = '');

UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/siteone.com'
  WHERE "slug" = 'siteone' AND ("logo" IS NULL OR "logo" = '');

-- ── Foundation ─────────────────────────────────────────────────────────
UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/foundationsupportworks.com'
  WHERE "slug" = 'foundation-supportworks' AND ("logo" IS NULL OR "logo" = '');

UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/ramjack.com'
  WHERE "slug" = 'ram-jack' AND ("logo" IS NULL OR "logo" = '');

-- ── Equipment ──────────────────────────────────────────────────────────
UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/bobcat.com'
  WHERE "slug" = 'bobcat' AND ("logo" IS NULL OR "logo" = '');

UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/cat.com'
  WHERE "slug" = 'cat-equipment' AND ("logo" IS NULL OR "logo" = '');

COMMIT;

-- ── Verify ─────────────────────────────────────────────────────────────
SELECT count(*) AS still_missing FROM "Vendor" WHERE "logo" IS NULL OR "logo" = '';
