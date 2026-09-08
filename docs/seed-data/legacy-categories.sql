-- ============================================================
-- Categories (7 pillars)
-- ============================================================
insert into public.categories (slug, name, tagline, icon_name, sort_order) values
  ('visa',          'Visa & Immigration',   'Your gateway to legal residency in Indonesia.',           'Plane',       0),
  ('legal',         'Legal & Contracts',    'Expert legal frameworks for confident business.',         'Scale',       1),
  ('company-setup', 'Company Setup',        'Establish your entity with zero friction.',               'Building2',   2),
  ('insurance',     'Insurance',            'Comprehensive coverage for expats and businesses.',       'Shield',      3),
  ('property-advisory', 'Property Advisory', 'Navigate Indonesian property law with confidence.',       'Home',        4),
  ('hr-payroll',    'HR & Payroll',         'Compliant workforce management from day one.',            'Users',       5),
  ('accounting-tax','Accounting & Tax',     'Full financial compliance, zero surprises.',              'Calculator',  6)
on conflict (slug) do nothing;

-- ============================================================
-- Sub-categories — Visa
-- ============================================================
with visa_cat as (select id from public.categories where slug = 'visa')
insert into public.sub_categories (category_id, slug, name, sort_order)
select visa_cat.id, s.slug, s.name, s.sort_order from visa_cat,
(values
  ('investor-kitas',             'Investor KITAS',                  0),
  ('working-remote-kitas',       'Working & Remote KITAS',          1),
  ('retirement-kitas',           'Retirement KITAS',                2),
  ('visit-visas',                'Visit Visas',                     3),
  ('permits-travel',             'Permits & Travel',                4),
  ('administrative-changes',     'Administrative Changes',          5),
  ('tax-registration',           'Tax Registration',                6),
  ('translation',                'Translation',                     7),
  ('reporting',                  'Reporting',                       8),
  ('closing-dissolution',        'Closing & Dissolution PMA',       9),
  ('investor-itas-offshore',     'Investor ITAS Offshore',          10),
  ('investor-itas-onshore',      'Investor ITAS Onshore',           11),
  ('worker-itas-offshore',       'Worker ITAS Offshore',            12),
  ('worker-itas-onshore',        'Worker ITAS Onshore',             13),
  ('freelance-itas',             'Freelance ITAS',                  14),
  ('family-itas-offshore',       'Family ITAS Offshore',            15),
  ('family-itas-onshore',        'Family ITAS Onshore',             16),
  ('family-itas-extension',      'Family ITAS Extension',           17),
  ('retirement-itas-offshore',   'Retirement ITAS Offshore',        18),
  ('retirement-itas-onshore',    'Retirement ITAS Onshore',         19),
  ('kitap',                      'KITAP Permanent Stay Permit',     20),
  ('single-entry-visa',          'Single Entry Visa',               21),
  ('golden-visa',                'Golden Visa',                     22),
  ('multiple-entry-visa',        'Multiple Entry Visa',             23),
  ('pre-investment-visa',        'Pre-Investment Visa',             24),
  ('second-home-visa',           'Second Home Visa',                25),
  ('remote-worker',              'Remote Worker',                   26),
  ('address-mutations',          'Address Mutations in ITAS',       27),
  ('affidavit',                  'Affidavit',                       28),
  ('apostille',                  'Apostille Documents',             29),
  ('brand-registration',         'Brand Registration',              30),
  ('domicile-letter',            'Domicile Letter',                 31),
  ('e-passport',                 'E-Passport',                      32),
  ('erp',                        'ERP',                             33),
  ('passport-mutation',          'Passport Mutation',               34),
  ('skck',                       'SKCK / Police Letter',            35),
  ('sktt',                       'SKTT',                            36)
) as s(slug, name, sort_order)
on conflict (category_id, slug) do nothing;

-- ============================================================
-- Sub-categories — Company Setup
-- ============================================================
with cs_cat as (select id from public.categories where slug = 'company-setup')
insert into public.sub_categories (category_id, slug, name, sort_order)
select cs_cat.id, s.slug, s.name, s.sort_order from cs_cat,
(values
  ('company-set-up',          'Company Set-Up',              0),
  ('changes-restructuring',   'Changes & Restructuring',     1),
  ('yayasan',                 'Yayasan',                     2)
) as s(slug, name, sort_order)
on conflict (category_id, slug) do nothing;

-- ============================================================
-- Sub-categories — Legal
-- ============================================================
with legal_cat as (select id from public.categories where slug = 'legal')
insert into public.sub_categories (category_id, slug, name, sort_order)
select legal_cat.id, s.slug, s.name, s.sort_order from legal_cat,
(values
  ('compliance',              'Compliance',                  0),
  ('agreements',              'Agreements',                  1),
  ('employment-contracts',    'Employment Contracts',        2),
  ('contract-notary',         'Contract & Notary',           3),
  ('management-licensing',    'Management & Licensing',      4),
  ('property-checks',         'Property Information & Checks', 5),
  ('rups',                    'RUPS',                        6),
  ('jbs',                     'JBS Per Transaction',         7)
) as s(slug, name, sort_order)
on conflict (category_id, slug) do nothing;

-- ============================================================
-- Services — Visa > Investor KITAS
-- ============================================================
with sc as (
  select s.id as sub_id, c.id as cat_id
  from public.sub_categories s
  join public.categories c on c.id = s.category_id
  where c.slug = 'visa' and s.slug = 'investor-kitas'
)
insert into public.services (category_id, sub_category_id, slug, name, description, target_client, key_deliverables, estimated_timeline, sort_order)
select sc.cat_id, sc.sub_id, s.slug, s.name, s.description, s.target_client, s.key_deliverables, s.estimated_timeline, s.sort_order
from sc,
(values
  ('investor-kitas-2-years', 'Investor KITAS 2 Years',
   'Full processing for a 2-year Investor Stay Permit (KITAS), allowing foreign investors to reside and manage investments.',
   'Foreign Investors', '2-Year Investor KITAS, MERP', '6–10 Weeks', 0),
  ('investor-kitas-2-years-extension', 'Investor KITAS 2 Years (Extension)',
   'Support for extending an existing 2-year Investor KITAS.',
   'Existing Investor KITAS Holders', 'Extended 2-Year Investor KITAS', '4–8 Weeks', 1),
  ('investor-kitas-1-year-extension', 'Investor KITAS 1 Year (Extension)',
   'Support for extending an existing 1-year Investor KITAS.',
   'Existing Investor KITAS Holders', 'Extended 1-Year Investor KITAS', '4–8 Weeks', 2)
) as s(slug, name, description, target_client, key_deliverables, estimated_timeline, sort_order)
on conflict (slug) do nothing;

-- ============================================================
-- Services — Visa > Working & Remote KITAS
-- ============================================================
with sc as (
  select s.id as sub_id, c.id as cat_id
  from public.sub_categories s
  join public.categories c on c.id = s.category_id
  where c.slug = 'visa' and s.slug = 'working-remote-kitas'
)
insert into public.services (category_id, sub_category_id, slug, name, description, target_client, key_deliverables, estimated_timeline, sort_order)
select sc.cat_id, sc.sub_id, s.slug, s.name, s.description, s.target_client, s.key_deliverables, s.estimated_timeline, s.sort_order
from sc,
(values
  ('working-kitas-6-month', 'Working KITAS 6 Month',
   'Processing for a 6-month Working Stay Permit.',
   'Foreign Employees', '6-Month Working KITAS, IMTA', '6–10 Weeks', 0),
  ('working-kitas-extension-1-year', 'Working KITAS Extension 1 Year',
   'Support for extending a 1-year Working Stay Permit.',
   'Existing Working KITAS Holders', 'Extended 1-Year Working KITAS', '4–8 Weeks', 1),
  ('working-kitas-extension-2-years', 'Working KITAS Extension 2 Years',
   'Support for extending a 2-year Working Stay Permit.',
   'Existing Working KITAS Holders', 'Extended 2-Year Working KITAS', '4–8 Weeks', 2),
  ('digital-nomad-kitas-1-year', 'Remote Worker KITAS — Digital Nomad (E33G) 1 Year',
   'Assistance for obtaining a 1-year Digital Nomad Stay Permit for eligible remote workers.',
   'Digital Nomads', '1-Year Digital Nomad KITAS', '6–10 Weeks', 3)
) as s(slug, name, description, target_client, key_deliverables, estimated_timeline, sort_order)
on conflict (slug) do nothing;

-- ============================================================
-- Services — Visa > Retirement KITAS
-- ============================================================
with sc as (
  select s.id as sub_id, c.id as cat_id
  from public.sub_categories s
  join public.categories c on c.id = s.category_id
  where c.slug = 'visa' and s.slug = 'retirement-kitas'
)
insert into public.services (category_id, sub_category_id, slug, name, description, target_client, key_deliverables, estimated_timeline, sort_order)
select sc.cat_id, sc.sub_id, s.slug, s.name, s.description, s.target_client, s.key_deliverables, s.estimated_timeline, s.sort_order
from sc,
(values
  ('retirement-kitas', 'Retirement KITAS',
   'Processing for a Retirement Stay Permit for eligible foreign nationals.',
   'Foreign Retirees', 'Retirement KITAS', '6–10 Weeks', 0),
  ('retirement-kitas-extension', 'Retirement KITAS Extension',
   'Support for extending an existing Retirement KITAS.',
   'Existing Retirement KITAS Holders', 'Extended Retirement KITAS', '4–8 Weeks', 1)
) as s(slug, name, description, target_client, key_deliverables, estimated_timeline, sort_order)
on conflict (slug) do nothing;

-- ============================================================
-- Services — Visa > Visit Visas
-- ============================================================
with sc as (
  select s.id as sub_id, c.id as cat_id
  from public.sub_categories s
  join public.categories c on c.id = s.category_id
  where c.slug = 'visa' and s.slug = 'visit-visas'
)
insert into public.services (category_id, sub_category_id, slug, name, description, target_client, key_deliverables, estimated_timeline, sort_order)
select sc.cat_id, sc.sub_id, s.slug, s.name, s.description, s.target_client, s.key_deliverables, s.estimated_timeline, s.sort_order
from sc,
(values
  ('visit-visa-single-60-days', 'Visit Visa Single Entry 60 Days (C1)',
   'Application processing for a single-entry visit visa valid for 60 days.',
   'Tourists, Short-term Visits', '60-Day Single Entry Visa', '2–4 Weeks', 0),
  ('visit-visa-single-60-days-extension', 'Visit Visa Single Entry 60 Days (Extension)',
   'Extension services for a 60-day single-entry visit visa.',
   'Existing 60-Day Visa Holders', 'Extended Visit Visa', '1–2 Weeks', 1),
  ('visit-visa-single-180-days', 'Visit Visa Single Entry 180 Days (C12)',
   'Application processing for a single-entry visit visa valid for 180 days.',
   'Longer-term Visitors', '180-Day Single Entry Visa', '2–4 Weeks', 2),
  ('visit-visa-180-days-extension', 'Visit Visa Single/Multiple Entry 180 Days (Extension)',
   'Extension services for 180-day single or multiple-entry visit visas.',
   'Existing 180-Day Visa Holders', 'Extended Visit Visa', '1–2 Weeks', 3),
  ('multiple-entry-visa-1-year', 'Multiple Entry Visit Visa (1 Year) D1 & D2',
   'Processing for a multiple-entry visit visa valid for 1 year.',
   'Frequent Visitors', '1-Year Multiple Entry Visa', '3–5 Weeks', 4),
  ('multiple-entry-visa-2-years', 'Multiple Entry Visit Visa (2 Years) D1 & D2',
   'Processing for a multiple-entry visit visa valid for 2 years.',
   'Frequent Visitors', '2-Year Multiple Entry Visa', '3–5 Weeks', 5),
  ('e-voa', 'Visa On Arrival E-VOA',
   'Assistance with the electronic Visa On Arrival application.',
   'Eligible Nationalities', 'Approved E-VOA', '1–3 Days', 6),
  ('e-voa-extension', 'Visa On Arrival E-VOA Extension',
   'Extension services for an E-VOA.',
   'E-VOA Holders', 'Extended E-VOA', '1–2 Weeks', 7),
  ('e-voa-extension-express', 'Visa On Arrival E-VOA Extension Express',
   'Expedited extension services for an E-VOA.',
   'E-VOA Holders (Urgent)', 'Expedited Extended E-VOA', '3–5 Days', 8),
  ('visitor-visa-subclass-600', 'Visitor Visa (Subclass 600)',
   'Assistance for Indonesian citizens applying for the Australian Visitor Visa (Subclass 600).',
   'Indonesian Travelers', 'Australian Visa Approval', '4–12 Weeks', 9),
  ('internship-visa-180-days', 'Internship Visa 180 Days (C22)',
   'Application processing for a 180-day internship visa.',
   'Foreign Interns', '180-Day Internship Visa', '4–8 Weeks', 10),
  ('entertainment-kitas', 'Entertainment KITAS',
   'Processing for a Stay Permit for foreign nationals in the entertainment industry.',
   'Entertainment Professionals', 'Entertainment KITAS', '6–10 Weeks', 11)
) as s(slug, name, description, target_client, key_deliverables, estimated_timeline, sort_order)
on conflict (slug) do nothing;

-- ============================================================
-- Services — Visa > Permits & Travel
-- ============================================================
with sc as (
  select s.id as sub_id, c.id as cat_id
  from public.sub_categories s
  join public.categories c on c.id = s.category_id
  where c.slug = 'visa' and s.slug = 'permits-travel'
)
insert into public.services (category_id, sub_category_id, slug, name, description, target_client, key_deliverables, estimated_timeline, sort_order)
select sc.cat_id, sc.sub_id, s.slug, s.name, s.description, s.target_client, s.key_deliverables, s.estimated_timeline, s.sort_order
from sc,
(values
  ('mrep-1-year', 'Multiple Re-Entry Permit (MREP) 1 Year',
   'Application for a 1-year MREP allowing multiple exits/entries for KITAS holders.',
   'KITAS Holders', '1-Year MREP', '1–2 Weeks', 0),
  ('mrep-2-years', 'Multiple Re-Entry Permit (MREP) 2 Years',
   'Application for a 2-year MREP.',
   'KITAS Holders', '2-Year MREP', '1–2 Weeks', 1),
  ('mrep-unlimited', 'Multiple Re-Entry Permit (MREP) Unlimited',
   'Application for an unlimited MREP.',
   'Long-term KITAS Holders', 'Unlimited MREP', '1–2 Weeks', 2),
  ('exit-permit-only', 'Exit Permit Only (E.P.O)',
   'Processing for an Exit Permit Only, required when permanently leaving Indonesia.',
   'KITAS/Visa Holders', 'EPO Document', '3–7 Days', 3),
  ('bridging-visa', 'Bridging Visa',
   'Temporary visa status while awaiting a new visa or during status transition.',
   'Special Circumstances', 'Temporary Visa Status', 'Varies', 4)
) as s(slug, name, description, target_client, key_deliverables, estimated_timeline, sort_order)
on conflict (slug) do nothing;

-- ============================================================
-- Services — Visa > Golden Visa
-- ============================================================
with sc as (
  select s.id as sub_id, c.id as cat_id
  from public.sub_categories s
  join public.categories c on c.id = s.category_id
  where c.slug = 'visa' and s.slug = 'golden-visa'
)
insert into public.services (category_id, sub_category_id, slug, name, sort_order)
select sc.cat_id, sc.sub_id, s.slug, s.name, s.sort_order
from sc,
(values
  ('golden-visa-offshore-5-years', 'Golden Visa Offshore 5 Years', 0),
  ('golden-visa-onshore-5-years', 'Golden Visa Onshore 5 Years', 1),
  ('golden-visa-extension', 'Golden Visa Extension', 2)
) as s(slug, name, sort_order)
on conflict (slug) do nothing;

-- ============================================================
-- Services — Visa > Second Home Visa
-- ============================================================
with sc as (
  select s.id as sub_id, c.id as cat_id
  from public.sub_categories s
  join public.categories c on c.id = s.category_id
  where c.slug = 'visa' and s.slug = 'second-home-visa'
)
insert into public.services (category_id, sub_category_id, slug, name, sort_order)
select sc.cat_id, sc.sub_id, s.slug, s.name, s.sort_order
from sc,
(values
  ('second-home-visa-offshore-5-years', 'Second Home Visa Offshore 5 Years', 0),
  ('second-home-visa-onshore-5-years', 'Second Home Visa Onshore 5 Years', 1),
  ('second-home-visa-extension', 'Second Home Visa Extension', 2)
) as s(slug, name, sort_order)
on conflict (slug) do nothing;

-- ============================================================
-- Services — Visa > KITAP
-- ============================================================
with sc as (
  select s.id as sub_id, c.id as cat_id
  from public.sub_categories s
  join public.categories c on c.id = s.category_id
  where c.slug = 'visa' and s.slug = 'kitap'
)
insert into public.services (category_id, sub_category_id, slug, name, sort_order)
select sc.cat_id, sc.sub_id, s.slug, s.name, s.sort_order
from sc,
(values
  ('investor-kitap-5-years', 'Investor KITAP 5 Years', 0),
  ('family-kitap-5-years', 'Family KITAP 5 Years', 1),
  ('retirement-kitap-5-years', 'Retirement KITAP 5 Years', 2)
) as s(slug, name, sort_order)
on conflict (slug) do nothing;

-- ============================================================
-- Services — Company Setup > Company Set-Up
-- ============================================================
with sc as (
  select s.id as sub_id, c.id as cat_id
  from public.sub_categories s
  join public.categories c on c.id = s.category_id
  where c.slug = 'company-setup' and s.slug = 'company-set-up'
)
insert into public.services (category_id, sub_category_id, slug, name, description, target_client, key_deliverables, estimated_timeline, sort_order)
select sc.cat_id, sc.sub_id, s.slug, s.name, s.description, s.target_client, s.key_deliverables, s.estimated_timeline, s.sort_order
from sc,
(values
  ('pt-local-set-up', 'PT Local — Set Up',
   'Comprehensive assistance for establishing a local Limited Liability Company (PT), including all legal and administrative requirements.',
   'Local Entrepreneurs', 'Notarial Deed, NIB, Business Licenses', '4–8 Weeks', 0),
  ('pt-local-hospitality-set-up', 'PT Local — Hospitality Set Up',
   'Specialized support for establishing a local PT for the hospitality sector (hotels, villas).',
   'Hospitality Investors', 'Notarial Deed, NIB, Hospitality Licenses', '6–12 Weeks', 1),
  ('pma-set-up', 'PMA — Set Up',
   'Full-service support for establishing a Foreign Capital Investment Company (PMA).',
   'Foreign Investors', 'Notarial Deed, BKPM Approval, NIB, Business Licenses', '8–16 Weeks', 2),
  ('cv-commanditaire-vennootschap', 'CV (Commanditaire Vennootschap)',
   'Assistance with establishing a limited partnership, including registration and legal documentation.',
   'Small Business Owners', 'Deed of Establishment, Registration', '3–6 Weeks', 3),
  ('pt-perorangan', 'PT Perorangan',
   'Support for establishing a Single-Person Limited Liability Company for individual entrepreneurs.',
   'Individual Entrepreneurs', 'Deed of Establishment, NIB', '2–4 Weeks', 4),
  ('nib-oss-process', 'NIB & OSS Process',
   'Guidance through the Online Single Submission (OSS) system to obtain a Business Identification Number (NIB).',
   'All Businesses', 'NIB, Standard Business Licenses', '1–3 Weeks', 5),
  ('oss-username-password', 'OSS Username & Password',
   'Support for obtaining or recovering OSS system credentials.',
   'All Businesses', 'OSS Account Access', '1–3 Days', 6)
) as s(slug, name, description, target_client, key_deliverables, estimated_timeline, sort_order)
on conflict (slug) do nothing;

-- ============================================================
-- Services — Legal > Compliance
-- ============================================================
with sc as (
  select s.id as sub_id, c.id as cat_id
  from public.sub_categories s
  join public.categories c on c.id = s.category_id
  where c.slug = 'legal' and s.slug = 'compliance'
)
insert into public.services (category_id, sub_category_id, slug, name, description, target_client, key_deliverables, estimated_timeline, sort_order)
select sc.cat_id, sc.sub_id, s.slug, s.name, s.description, s.target_client, s.key_deliverables, s.estimated_timeline, s.sort_order
from sc,
(values
  ('company-legal-documents-review', 'Company Legal Documents Review',
   'Thorough review of a company''s legal documents to ensure compliance and identify risks.',
   'All Businesses', 'Legal Review Report, Recommendations', '1–2 Weeks', 0),
  ('document-review-by-lawyer', 'Document Review By Lawyer',
   'Review of legal documents by a qualified lawyer with professional legal opinion.',
   'Individuals/Businesses', 'Legal Opinion/Advice', '3–7 Days', 1)
) as s(slug, name, description, target_client, key_deliverables, estimated_timeline, sort_order)
on conflict (slug) do nothing;

-- ============================================================
-- Services — Legal > Agreements
-- ============================================================
with sc as (
  select s.id as sub_id, c.id as cat_id
  from public.sub_categories s
  join public.categories c on c.id = s.category_id
  where c.slug = 'legal' and s.slug = 'agreements'
)
insert into public.services (category_id, sub_category_id, slug, name, description, target_client, key_deliverables, estimated_timeline, sort_order)
select sc.cat_id, sc.sub_id, s.slug, s.name, s.description, s.target_client, s.key_deliverables, s.estimated_timeline, s.sort_order
from sc,
(values
  ('prenuptial-postnuptial-agreement', 'Prenuptial & Postnuptial Agreement',
   'Drafting and legal processing of prenuptial or postnuptial agreements regarding asset division.',
   'Couples', 'Notarized Agreement', '2–4 Weeks', 0),
  ('shareholder-agreement', 'Shareholder Agreement',
   'Drafting of an agreement between shareholders outlining rights, obligations, and company management.',
   'Shareholders', 'Shareholder Agreement', '1–3 Weeks', 1)
) as s(slug, name, description, target_client, key_deliverables, estimated_timeline, sort_order)
on conflict (slug) do nothing;

-- ============================================================
-- Services — Legal > Contract & Notary
-- ============================================================
with sc as (
  select s.id as sub_id, c.id as cat_id
  from public.sub_categories s
  join public.categories c on c.id = s.category_id
  where c.slug = 'legal' and s.slug = 'contract-notary'
)
insert into public.services (category_id, sub_category_id, slug, name, description, target_client, key_deliverables, estimated_timeline, sort_order)
select sc.cat_id, sc.sub_id, s.slug, s.name, s.description, s.target_client, s.key_deliverables, s.estimated_timeline, s.sort_order
from sc,
(values
  ('land-building-rental-waarmerking', 'Land/Building Rental Contract With Waarmerking',
   'Drafting of land or building rental contracts with official Waarmerking by a notary.',
   'Landlords/Tenants', 'Waarmerking Contract', '3–7 Days', 0),
  ('notary-verification-lease-contract', 'Notary Verification Lease Contract',
   'Notarial verification of an existing lease contract confirming authenticity of signatures and dates.',
   'Landlords/Tenants', 'Verified Lease Contract', '1–3 Days', 1),
  ('waarmerking', 'Waarmerking',
   'Notarial service to authenticate signatures and the date of a private document.',
   'Individuals/Businesses', 'Waarmerking Document', '1–3 Days', 2),
  ('notary-property-land-leasing', 'Notary For Property/Land Contract Leasing',
   'Services of a notary for drafting and authenticating property or land lease contracts.',
   'Landlords/Tenants', 'Notarized Lease Contract', '3–7 Days', 3)
) as s(slug, name, description, target_client, key_deliverables, estimated_timeline, sort_order)
on conflict (slug) do nothing;

-- ============================================================
-- Services — Legal > Property Information & Checks
-- ============================================================
with sc as (
  select s.id as sub_id, c.id as cat_id
  from public.sub_categories s
  join public.categories c on c.id = s.category_id
  where c.slug = 'legal' and s.slug = 'property-checks'
)
insert into public.services (category_id, sub_category_id, slug, name, description, target_client, key_deliverables, estimated_timeline, sort_order)
select sc.cat_id, sc.sub_id, s.slug, s.name, s.description, s.target_client, s.key_deliverables, s.estimated_timeline, s.sort_order
from sc,
(values
  ('land-due-diligence', 'Land Due Diligence',
   'Comprehensive investigation and verification of land ownership, legal status, zoning, and potential risks.',
   'Property Buyers', 'Due Diligence Report', '1–3 Weeks', 0),
  ('itr-informasi-tata-ruang', 'ITR (Informasi Tata Ruang) Official',
   'Official retrieval of Spatial Planning Information detailing land use regulations and zoning.',
   'Property Buyers', 'ITR Document', '1–2 Weeks', 1)
) as s(slug, name, description, target_client, key_deliverables, estimated_timeline, sort_order)
on conflict (slug) do nothing;

-- ============================================================
-- Services — Visa > Administrative Changes
-- ============================================================
with sc as (
  select s.id as sub_id, c.id as cat_id
  from public.sub_categories s join public.categories c on c.id = s.category_id
  where c.slug = 'visa' and s.slug = 'administrative-changes'
)
insert into public.services (category_id, sub_category_id, slug, name, description, target_client, key_deliverables, estimated_timeline, sort_order)
select sc.cat_id, sc.sub_id, s.slug, s.name, s.description, s.target_client, s.key_deliverables, s.estimated_timeline, s.sort_order
from sc, (values
  ('changing-kitas-address', 'Changing KITAS Address',
   'Assistance with updating the registered address on a KITAS.',
   'KITAS Holders', 'Updated KITAS Details', '1–2 Weeks', 0)
) as s(slug, name, description, target_client, key_deliverables, estimated_timeline, sort_order)
on conflict (slug) do nothing;

-- ============================================================
-- Services — Visa > Tax Registration
-- ============================================================
with sc as (
  select s.id as sub_id, c.id as cat_id
  from public.sub_categories s join public.categories c on c.id = s.category_id
  where c.slug = 'visa' and s.slug = 'tax-registration'
)
insert into public.services (category_id, sub_category_id, slug, name, description, target_client, key_deliverables, estimated_timeline, sort_order)
select sc.cat_id, sc.sub_id, s.slug, s.name, s.description, s.target_client, s.key_deliverables, s.estimated_timeline, s.sort_order
from sc, (values
  ('npwp-company', 'NPWP (Company)',
   'Assistance with obtaining a Taxpayer Identification Number (NPWP) for a company.',
   'All Businesses', 'Company NPWP Certificate', '1–2 Weeks', 0),
  ('npwpd-regional', 'NPWPD (Regional)',
   'Support for obtaining a Regional Taxpayer Identification Number.',
   'Businesses (Regional Tax)', 'Regional Tax ID', '1–3 Weeks', 1),
  ('npwpd-abt-water-wells', 'NPWPD Abt (Underground Water Wells)',
   'Specialized assistance for a Regional Tax ID for underground water well usage.',
   'Businesses (Water Usage)', 'Regional Tax ID (Water)', '2–4 Weeks', 2),
  ('npwp-personal', 'NPWP (Personal)',
   'Assistance for foreign individuals to obtain an Indonesian Taxpayer Identification Number.',
   'Foreign Individuals', 'Personal NPWP Certificate', '1–2 Weeks', 3)
) as s(slug, name, description, target_client, key_deliverables, estimated_timeline, sort_order)
on conflict (slug) do nothing;

-- ============================================================
-- Services — Visa > Translation
-- ============================================================
with sc as (
  select s.id as sub_id, c.id as cat_id
  from public.sub_categories s join public.categories c on c.id = s.category_id
  where c.slug = 'visa' and s.slug = 'translation'
)
insert into public.services (category_id, sub_category_id, slug, name, description, target_client, key_deliverables, estimated_timeline, sort_order)
select sc.cat_id, sc.sub_id, s.slug, s.name, s.description, s.target_client, s.key_deliverables, s.estimated_timeline, s.sort_order
from sc, (values
  ('sworn-translation', 'Sworn Translation',
   'Official translation of documents by a sworn and certified translator.',
   'Individuals/Businesses', 'Certified Translated Document', '3–7 Days', 0)
) as s(slug, name, description, target_client, key_deliverables, estimated_timeline, sort_order)
on conflict (slug) do nothing;

-- ============================================================
-- Services — Visa > Reporting
-- ============================================================
with sc as (
  select s.id as sub_id, c.id as cat_id
  from public.sub_categories s join public.categories c on c.id = s.category_id
  where c.slug = 'visa' and s.slug = 'reporting'
)
insert into public.services (category_id, sub_category_id, slug, name, description, target_client, key_deliverables, estimated_timeline, sort_order)
select sc.cat_id, sc.sub_id, s.slug, s.name, s.description, s.target_client, s.key_deliverables, s.estimated_timeline, s.sort_order
from sc, (values
  ('bkpm-reports-lkpm', 'BKPM Reports (LKPM)',
   'Preparation and submission of Capital Investment Activity Reports (LKPM) to BKPM.',
   'PMA Companies', 'Timely LKPM Submission', 'Per Report Cycle', 0)
) as s(slug, name, description, target_client, key_deliverables, estimated_timeline, sort_order)
on conflict (slug) do nothing;

-- ============================================================
-- Services — Visa > Closing & Dissolution PMA
-- ============================================================
with sc as (
  select s.id as sub_id, c.id as cat_id
  from public.sub_categories s join public.categories c on c.id = s.category_id
  where c.slug = 'visa' and s.slug = 'closing-dissolution'
)
insert into public.services (category_id, sub_category_id, slug, name, description, target_client, key_deliverables, estimated_timeline, sort_order)
select sc.cat_id, sc.sub_id, s.slug, s.name, s.description, s.target_client, s.key_deliverables, s.estimated_timeline, s.sort_order
from sc, (values
  ('closing-local-company', 'Closing Local Company / PT, CV, Firma',
   'Comprehensive support for the legal dissolution and closure of local companies.',
   'Local Companies', 'Dissolution Deed, Tax Clearance, Deregistration', '3–6 Months', 0),
  ('closing-pma', 'Closing PMA',
   'Expert guidance and processing for the legal dissolution of a Foreign Capital Investment Company.',
   'PMA Companies', 'Liquidation Deed, BKPM Clearance, Deregistration', '6–12 Months', 1),
  ('company-valuation', 'Company Valuation',
   'Professional assessment to determine the economic value of a company or its assets.',
   'Businesses (M&A, Funding)', 'Valuation Report', '2–4 Weeks', 2)
) as s(slug, name, description, target_client, key_deliverables, estimated_timeline, sort_order)
on conflict (slug) do nothing;

-- ============================================================
-- Services — Visa > Investor ITAS Offshore / Onshore
-- ============================================================
with sc as (
  select s.id as sub_id, c.id as cat_id
  from public.sub_categories s join public.categories c on c.id = s.category_id
  where c.slug = 'visa' and s.slug = 'investor-itas-offshore'
)
insert into public.services (category_id, sub_category_id, slug, name, sort_order)
select sc.cat_id, sc.sub_id, v.slug, v.name, v.sort_order from sc,
(values ('investor-itas-offshore-1-year','Investor ITAS Offshore 1 Year',0),
        ('investor-itas-offshore-2-years','Investor ITAS Offshore 2 Years',1)) as v(slug,name,sort_order)
on conflict (slug) do nothing;

with sc as (
  select s.id as sub_id, c.id as cat_id
  from public.sub_categories s join public.categories c on c.id = s.category_id
  where c.slug = 'visa' and s.slug = 'investor-itas-onshore'
)
insert into public.services (category_id, sub_category_id, slug, name, sort_order)
select sc.cat_id, sc.sub_id, v.slug, v.name, v.sort_order from sc,
(values ('investor-itas-onshore-1-year','Investor ITAS Onshore 1 Year',0),
        ('investor-itas-onshore-2-years','Investor ITAS Onshore 2 Years',1)) as v(slug,name,sort_order)
on conflict (slug) do nothing;

-- ============================================================
-- Services — Visa > Worker ITAS Offshore / Onshore
-- ============================================================
with sc as (
  select s.id as sub_id, c.id as cat_id
  from public.sub_categories s join public.categories c on c.id = s.category_id
  where c.slug = 'visa' and s.slug = 'worker-itas-offshore'
)
insert into public.services (category_id, sub_category_id, slug, name, sort_order)
select sc.cat_id, sc.sub_id, v.slug, v.name, v.sort_order from sc,
(values ('worker-itas-offshore-6-months','Worker ITAS Offshore 6 Months',0),
        ('worker-itas-offshore-1-year','Worker ITAS Offshore 1 Year',1),
        ('worker-itas-offshore-2-years','Worker ITAS Offshore 2 Years',2)) as v(slug,name,sort_order)
on conflict (slug) do nothing;

with sc as (
  select s.id as sub_id, c.id as cat_id
  from public.sub_categories s join public.categories c on c.id = s.category_id
  where c.slug = 'visa' and s.slug = 'worker-itas-onshore'
)
insert into public.services (category_id, sub_category_id, slug, name, sort_order)
select sc.cat_id, sc.sub_id, v.slug, v.name, v.sort_order from sc,
(values ('worker-itas-onshore-6-months','Worker ITAS Onshore 6 Months',0),
        ('worker-itas-onshore-1-year','Worker ITAS Onshore 1 Year',1),
        ('worker-itas-onshore-2-years','Worker ITAS Onshore 2 Years',2)) as v(slug,name,sort_order)
on conflict (slug) do nothing;

-- ============================================================
-- Services — Visa > Freelance ITAS
-- ============================================================
with sc as (
  select s.id as sub_id, c.id as cat_id
  from public.sub_categories s join public.categories c on c.id = s.category_id
  where c.slug = 'visa' and s.slug = 'freelance-itas'
)
insert into public.services (category_id, sub_category_id, slug, name, sort_order)
select sc.cat_id, sc.sub_id, v.slug, v.name, v.sort_order from sc,
(values ('freelance-itas-6-months','Freelance ITAS 6 Months',0)) as v(slug,name,sort_order)
on conflict (slug) do nothing;

-- ============================================================
-- Services — Visa > Family ITAS (Offshore / Onshore / Extension)
-- ============================================================
with sc as (
  select s.id as sub_id, c.id as cat_id
  from public.sub_categories s join public.categories c on c.id = s.category_id
  where c.slug = 'visa' and s.slug = 'family-itas-offshore'
)
insert into public.services (category_id, sub_category_id, slug, name, sort_order)
select sc.cat_id, sc.sub_id, v.slug, v.name, v.sort_order from sc,
(values ('family-itas-offshore-1-year','Family ITAS Offshore 1 Year',0),
        ('family-itas-offshore-2-years','Family ITAS Offshore 2 Years',1)) as v(slug,name,sort_order)
on conflict (slug) do nothing;

with sc as (
  select s.id as sub_id, c.id as cat_id
  from public.sub_categories s join public.categories c on c.id = s.category_id
  where c.slug = 'visa' and s.slug = 'family-itas-onshore'
)
insert into public.services (category_id, sub_category_id, slug, name, sort_order)
select sc.cat_id, sc.sub_id, v.slug, v.name, v.sort_order from sc,
(values ('family-itas-onshore-1-year','Family ITAS Onshore 1 Year',0),
        ('family-itas-onshore-2-years','Family ITAS Onshore 2 Years',1)) as v(slug,name,sort_order)
on conflict (slug) do nothing;

with sc as (
  select s.id as sub_id, c.id as cat_id
  from public.sub_categories s join public.categories c on c.id = s.category_id
  where c.slug = 'visa' and s.slug = 'family-itas-extension'
)
insert into public.services (category_id, sub_category_id, slug, name, sort_order)
select sc.cat_id, sc.sub_id, v.slug, v.name, v.sort_order from sc,
(values ('family-itas-extension-1-year','Family ITAS Extension 1 Year',0),
        ('family-itas-extension-2-years','Family ITAS Extension 2 Years',1)) as v(slug,name,sort_order)
on conflict (slug) do nothing;

-- ============================================================
-- Services — Visa > Retirement ITAS (Offshore / Onshore)
-- ============================================================
with sc as (
  select s.id as sub_id, c.id as cat_id
  from public.sub_categories s join public.categories c on c.id = s.category_id
  where c.slug = 'visa' and s.slug = 'retirement-itas-offshore'
)
insert into public.services (category_id, sub_category_id, slug, name, sort_order)
select sc.cat_id, sc.sub_id, v.slug, v.name, v.sort_order from sc,
(values ('retirement-itas-offshore-1-year','Retirement ITAS Offshore 1 Year',0)) as v(slug,name,sort_order)
on conflict (slug) do nothing;

with sc as (
  select s.id as sub_id, c.id as cat_id
  from public.sub_categories s join public.categories c on c.id = s.category_id
  where c.slug = 'visa' and s.slug = 'retirement-itas-onshore'
)
insert into public.services (category_id, sub_category_id, slug, name, sort_order)
select sc.cat_id, sc.sub_id, v.slug, v.name, v.sort_order from sc,
(values ('retirement-itas-onshore-1-year','Retirement ITAS Onshore 1 Year',0)) as v(slug,name,sort_order)
on conflict (slug) do nothing;

-- ============================================================
-- Services — Visa > Single Entry Visa
-- ============================================================
with sc as (
  select s.id as sub_id, c.id as cat_id
  from public.sub_categories s join public.categories c on c.id = s.category_id
  where c.slug = 'visa' and s.slug = 'single-entry-visa'
)
insert into public.services (category_id, sub_category_id, slug, name, sort_order)
select sc.cat_id, sc.sub_id, v.slug, v.name, v.sort_order from sc,
(values ('business-single-entry-60-days','Business Single Entry 60 Days',0),
        ('social-volunteer-single-entry-60-days','Social or Volunteer Single Entry 60 Days',1)) as v(slug,name,sort_order)
on conflict (slug) do nothing;

-- ============================================================
-- Services — Visa > Multiple Entry Visa
-- ============================================================
with sc as (
  select s.id as sub_id, c.id as cat_id
  from public.sub_categories s join public.categories c on c.id = s.category_id
  where c.slug = 'visa' and s.slug = 'multiple-entry-visa'
)
insert into public.services (category_id, sub_category_id, slug, name, sort_order)
select sc.cat_id, sc.sub_id, v.slug, v.name, v.sort_order from sc,
(values ('tourist-multiple-entry-1-year','Tourist Multiple Entry 1 Year 60 Days',0),
        ('business-multiple-entry-1-year','Business Multiple Entry 1 Year 60 Days',1),
        ('multiple-entry-visa-extension','Multiple Entry Visa Extension',2)) as v(slug,name,sort_order)
on conflict (slug) do nothing;

-- ============================================================
-- Services — Visa > Pre-Investment Visa
-- ============================================================
with sc as (
  select s.id as sub_id, c.id as cat_id
  from public.sub_categories s join public.categories c on c.id = s.category_id
  where c.slug = 'visa' and s.slug = 'pre-investment-visa'
)
insert into public.services (category_id, sub_category_id, slug, name, sort_order)
select sc.cat_id, sc.sub_id, v.slug, v.name, v.sort_order from sc,
(values ('pre-investment-visa-1-year','Pre-Investment Visa 1 Year 180 Days',0),
        ('pre-investment-visa-2-years','Pre-Investment Visa 2 Years 180 Days',1)) as v(slug,name,sort_order)
on conflict (slug) do nothing;

-- ============================================================
-- Services — Visa > Remote Worker
-- ============================================================
with sc as (
  select s.id as sub_id, c.id as cat_id
  from public.sub_categories s join public.categories c on c.id = s.category_id
  where c.slug = 'visa' and s.slug = 'remote-worker'
)
insert into public.services (category_id, sub_category_id, slug, name, sort_order)
select sc.cat_id, sc.sub_id, v.slug, v.name, v.sort_order from sc,
(values ('remote-worker-offshore-1-year','Remote Worker Offshore 1 Year',0),
        ('remote-worker-onshore-1-year','Remote Worker Onshore 1 Year',1),
        ('remote-worker-extension','Remote Worker Extension',2)) as v(slug,name,sort_order)
on conflict (slug) do nothing;

-- ============================================================
-- Services — Visa > Miscellaneous single-service sub-categories
-- ============================================================
-- address-mutations, affidavit, apostille, brand-registration, domicile-letter,
-- e-passport, erp, passport-mutation, skck, sktt
do $$
declare
  cat_id uuid;
begin
  select id into cat_id from public.categories where slug = 'visa';

  insert into public.services (category_id, sub_category_id, slug, name, sort_order)
  select cat_id, sc.id, v.svc_slug, v.svc_name, 0
  from public.sub_categories sc
  join (values
    ('address-mutations',   'address-mutations-in-itas',  'Address Mutations in ITAS'),
    ('affidavit',           'affidavit',                  'Affidavit'),
    ('apostille',           'apostille-documents',        'Apostille Documents'),
    ('brand-registration',  'brand-registration',         'Brand Registration'),
    ('domicile-letter',     'domicile-letter',            'Domicile Letter'),
    ('erp',                 'erp',                        'ERP'),
    ('passport-mutation',   'passport-mutation',          'Passport Mutation from Old to New'),
    ('skck',                'skck-police-letter',         'SKCK / Police Letter'),
    ('sktt',                'sktt',                       'SKTT')
  ) as v(sub_slug, svc_slug, svc_name) on sc.slug = v.sub_slug
  where sc.category_id = cat_id
  on conflict (slug) do nothing;

  -- e-passport (2 services)
  insert into public.services (category_id, sub_category_id, slug, name, sort_order)
  select cat_id, sc.id, v.slug, v.name, v.sort_order
  from public.sub_categories sc,
  (values ('e-passport-5-years','E-Passport 5 Years',0),
          ('e-passport-10-years','E-Passport 10 Years',1)) as v(slug,name,sort_order)
  where sc.slug = 'e-passport' and sc.category_id = cat_id
  on conflict (slug) do nothing;
end $$;

-- ============================================================
-- Services — Company Setup > Changes & Restructuring
-- ============================================================
with sc as (
  select s.id as sub_id, c.id as cat_id
  from public.sub_categories s join public.categories c on c.id = s.category_id
  where c.slug = 'company-setup' and s.slug = 'changes-restructuring'
)
insert into public.services (category_id, sub_category_id, slug, name, description, target_client, key_deliverables, estimated_timeline, sort_order)
select sc.cat_id, sc.sub_id, s.slug, s.name, s.description, s.target_client, s.key_deliverables, s.estimated_timeline, s.sort_order
from sc, (values
  ('change-acte-pt-pma', 'Change Acte For PT Or PMA',
   'Processing of legal deeds (akta) for fundamental company changes (shareholders, directors, capital, Articles of Association).',
   'Existing Companies', 'Amended Articles of Association, Legal Updates', '3–6 Weeks', 0)
) as s(slug, name, description, target_client, key_deliverables, estimated_timeline, sort_order)
on conflict (slug) do nothing;

-- ============================================================
-- Services — Legal > Employment Contracts
-- ============================================================
with sc as (
  select s.id as sub_id, c.id as cat_id
  from public.sub_categories s join public.categories c on c.id = s.category_id
  where c.slug = 'legal' and s.slug = 'employment-contracts'
)
insert into public.services (category_id, sub_category_id, slug, name, description, target_client, key_deliverables, estimated_timeline, sort_order)
select sc.cat_id, sc.sub_id, s.slug, s.name, s.description, s.target_client, s.key_deliverables, s.estimated_timeline, s.sort_order
from sc, (values
  ('draft-employment-contract', 'Draft Employment Contract',
   'Drafting of legally compliant employment contracts for local employees.',
   'Employers', 'Legal Employment Contract', '3–7 Days', 0)
) as s(slug, name, description, target_client, key_deliverables, estimated_timeline, sort_order)
on conflict (slug) do nothing;

-- ============================================================
-- Services — Legal > Management & Licensing
-- ============================================================
with sc as (
  select s.id as sub_id, c.id as cat_id
  from public.sub_categories s join public.categories c on c.id = s.category_id
  where c.slug = 'legal' and s.slug = 'management-licensing'
)
insert into public.services (category_id, sub_category_id, slug, name, description, target_client, key_deliverables, estimated_timeline, sort_order)
select sc.cat_id, sc.sub_id, s.slug, s.name, s.description, s.target_client, s.key_deliverables, s.estimated_timeline, s.sort_order
from sc, (values
  ('joint-property-management', 'Joint Property Management',
   'Services for managing jointly owned properties, including legal agreements and operational oversight.',
   'Co-Owners', 'Management Agreement', 'Varies', 0),
  ('pondok-wisata-license', 'Pondok Wisata License',
   'Assistance with obtaining a license for small tourist accommodations (Pondok Wisata).',
   'Guesthouse Owners', 'Pondok Wisata License', '6–10 Weeks', 1),
  ('housing-contract-negotiation', 'Housing Contract Price Negotiation',
   'Professional negotiation services to secure favorable terms for housing rental or purchase contracts.',
   'Renters/Buyers', 'Negotiated Contract Terms', 'Varies', 2)
) as s(slug, name, description, target_client, key_deliverables, estimated_timeline, sort_order)
on conflict (slug) do nothing;

-- ============================================================
-- Services — Company Setup > Yayasan (stub — details TBC by client)
-- ============================================================
do $$
declare
  cat_id uuid;
begin
  select id into cat_id from public.categories where slug = 'company-setup';

  insert into public.services (category_id, sub_category_id, slug, name, sort_order)
  select cat_id, sc.id, 'yayasan-foundation-setup', 'Yayasan (Foundation) Setup', 0
  from public.sub_categories sc
  where sc.slug = 'yayasan' and sc.category_id = cat_id
  on conflict (slug) do nothing;
end $$;

-- ============================================================
-- Services — Legal > RUPS, JBS (stub rows — details TBC by client)
-- ============================================================
do $$
declare
  cat_id uuid;
begin
  select id into cat_id from public.categories where slug = 'legal';

  insert into public.services (category_id, sub_category_id, slug, name, sort_order)
  select cat_id, sc.id, v.svc_slug, v.svc_name, 0
  from public.sub_categories sc
  join (values
    ('rups', 'rups-general-meeting',  'RUPS (General Meeting of Shareholders)'),
    ('jbs',  'jbs-per-transaction',   'JBS Per Transaction')
  ) as v(sub_slug, svc_slug, svc_name) on sc.slug = v.sub_slug
  where sc.category_id = cat_id
  on conflict (slug) do nothing;
end $$;
