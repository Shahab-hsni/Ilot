import json
from collections import Counter
from pathlib import Path

# Resolve relative to this file so the script runs anywhere, not just the
# machine it was written on (it used to hardcode a D:\ Windows path).
OUT_PATH = Path(__file__).resolve().parent.parent / 'docs' / 'seed-data' / 'raw.json'

def e(s):
    return s.replace('â€“', '–').replace('  ', ' ').strip()

CAT_VISA = ('Visa & Immigration', 'visa', 'Your gateway to legal residency in Indonesia.', 0)
CAT_LEGAL = ('Legal & Contract Advisory', 'legal', 'Expert legal frameworks for confident business.', 1)
CAT_COMPANY = ('Company Set Up', 'company-setup', 'Establish your entity with zero friction.', 2)
CAT_HR = ('Human Resource (HR)', 'hr-payroll', 'Compliant workforce management from day one.', 5)
CAT_ACCOUNTING = ('Accounting & TAX', 'accounting-tax', 'Full financial compliance, zero surprises.', 6)


def row(cat, subcat_name, subcat_slug, subcat_sort, svc_name, svc_slug, svc_sort, desc, target, kd, timeline, rtw='', note=''):
    c_name, c_slug, c_tagline, c_sort = cat
    return {
        'category_name': c_name,
        'category_slug': c_slug,
        'category_tagline': c_tagline,
        'category_sort_order': c_sort,
        'sub_category_name': subcat_name,
        'sub_category_slug': subcat_slug,
        'sub_category_sort_order': subcat_sort,
        'service_name': svc_name,
        'service_slug': svc_slug,
        'service_sort_order': svc_sort,
        'description': e(desc),
        'target_client': e(target),
        'key_deliverables': e(kd),
        'estimated_timeline': e(timeline),
        'real_time_work': e(rtw),
        'note': note,
    }


V = CAT_VISA
L = CAT_LEGAL
C = CAT_COMPANY
H = CAT_HR
A = CAT_ACCOUNTING
NOTE_ACCT = 'All fees stated above are net, excluding VAT and other applicable taxes.'

data = []

# ── VISA & IMMIGRATION ───────────────────────────────────────────────────────
# Investor KITAS
data += [
    row(V, 'Investor KITAS', 'investor-kitas', 0,
        'Investor KITAS 2 Years', 'investor-kitas-2-years', 0,
        'Full processing for a 2-year Investor Stay Permit (KITAS), allowing foreign investors to reside and manage investments.',
        'Foreign Investors', '2-Year Investor KITAS, MERP', '6-10 Weeks'),
    row(V, 'Investor KITAS', 'investor-kitas', 0,
        'Investor KITAS 2 Years (Extension)', 'investor-kitas-2-years-extension', 1,
        'Support for extending an existing 2-year Investor KITAS.',
        'Existing Investor KITAS Holders', 'Extended 2-Year Investor KITAS', '4-8 Weeks'),
    row(V, 'Investor KITAS', 'investor-kitas', 0,
        'Investor KITAS 1 Year (Extension)', 'investor-kitas-1-year-extension', 2,
        'Support for extending an existing 1-year Investor KITAS.',
        'Existing Investor KITAS Holders', 'Extended 1-Year Investor KITAS', '4-8 Weeks'),
]

# Working & Remote KITAS
data += [
    row(V, 'Working & Remote KITAS', 'working-remote-kitas', 1,
        'Working KITAS 6 Month', 'working-kitas-6-month', 0,
        'Processing for a 6-month Working Stay Permit.',
        'Foreign Employees', '6-Month Working KITAS, IMTA', '6-10 Weeks'),
    row(V, 'Working & Remote KITAS', 'working-remote-kitas', 1,
        'Working KITAS (Extension) 1 Year', 'working-kitas-extension-1-year', 1,
        'Support for extending a 1-year Working Stay Permit.',
        'Existing Working KITAS Holders', 'Extended 1-Year Working KITAS', '4-8 Weeks'),
    row(V, 'Working & Remote KITAS', 'working-remote-kitas', 1,
        'Working KITAS (Extension) 2 Years', 'working-kitas-extension-2-years', 2,
        'Support for extending a 2-year Working Stay Permit.',
        'Existing Working KITAS Holders', 'Extended 2-Year Working KITAS', '4-8 Weeks'),
    row(V, 'Working & Remote KITAS', 'working-remote-kitas', 1,
        'Remote Worker KITAS - Digital Nomad (E33G) - 1 Year', 'remote-worker-kitas-digital-nomad-e33g-1-year', 3,
        'Assistance for obtaining a 1-year Digital Nomad Stay Permit for eligible remote workers.',
        'Digital Nomads', '1-Year Digital Nomad KITAS', '6-10 Weeks'),
]

# Retirement KITAS
data += [
    row(V, 'Retirement KITAS', 'retirement-kitas', 2,
        'Retirement KITAS', 'retirement-kitas', 0,
        'Processing for a Retirement Stay Permit for eligible foreign nationals.',
        'Foreign Retirees', 'Retirement KITAS', '6-10 Weeks'),
    row(V, 'Retirement KITAS', 'retirement-kitas', 2,
        'Retirement KITAS (Extension)', 'retirement-kitas-extension', 1,
        'Support for extending an existing Retirement KITAS.',
        'Existing Retirement KITAS Holders', 'Extended Retirement KITAS', '4-8 Weeks'),
]

# Visit Visas
data += [
    row(V, 'Visit Visas', 'visit-visas', 3,
        'Visit Visa Single Entry 60 Days (C1)', 'visit-visa-single-entry-60-days-c1', 0,
        'Application processing for a single-entry visit visa valid for 60 days.',
        'Tourists, Short-term Visits', '60-Day Single Entry Visa', '2-4 Weeks'),
    row(V, 'Visit Visas', 'visit-visas', 3,
        'Visit Visa Single Entry 60 Days (Extension)', 'visit-visa-single-entry-60-days-extension', 1,
        'Extension services for a 60-day single-entry visit visa.',
        'Existing 60-Day Visa Holders', 'Extended Visit Visa', '1-2 Weeks'),
    row(V, 'Visit Visas', 'visit-visas', 3,
        'Visit Visa Single Entry 180 Days (C12)', 'visit-visa-single-entry-180-days-c12', 2,
        'Application processing for a single-entry visit visa valid for 180 days.',
        'Longer-term Visitors', '180-Day Single Entry Visa', '2-4 Weeks'),
    row(V, 'Visit Visas', 'visit-visas', 3,
        'Visit Visa Single/Multiple Entry 180 Days (Extension)', 'visit-visa-single-multiple-entry-180-days-extension', 3,
        'Extension services for 180-day single or multiple-entry visit visas.',
        'Existing 180-Day Visa Holders', 'Extended Visit Visa', '1-2 Weeks'),
    row(V, 'Visit Visas', 'visit-visas', 3,
        'Visa On Arrival E-VOA', 'visa-on-arrival-e-voa', 4,
        'Assistance with the electronic Visa On Arrival application.',
        'Eligible Nationalities', 'Approved E-VOA', '1-3 Days'),
    row(V, 'Visit Visas', 'visit-visas', 3,
        'Visa On Arrival E-VOA (Extension)', 'visa-on-arrival-e-voa-extension', 5,
        'Extension services for an E-VOA.',
        'E-VOA Holders', 'Extended E-VOA', '1-2 Weeks'),
    row(V, 'Visit Visas', 'visit-visas', 3,
        'Internship Visa - 180 Days (C22)', 'internship-visa-180-days-c22', 6,
        'Application processing for a 180-day internship visa.',
        'Foreign Interns', '180-Day Internship Visa', '4-8 Weeks'),
    row(V, 'Visit Visas', 'visit-visas', 3,
        'Entertainment KITAS', 'entertainment-kitas', 7,
        'Processing for a Stay Permit specific to foreign nationals working in the entertainment industry.',
        'Entertainment Professionals', 'Entertainment KITAS', '6-10 Weeks'),
]

# Investor ITAS Offshore
data += [
    row(V, 'Investor ITAS Offshore', 'investor-itas-offshore', 4,
        'Investor ITAS 1 Year', 'investor-itas-1-year', 0,
        'Processing service for Investor ITAS with a validity period of 1 year.',
        'Existing Investor KITAS Holder', 'Approved Investor ITAS', '3-6 Weeks'),
    row(V, 'Investor ITAS Offshore', 'investor-itas-offshore', 4,
        'Investor ITAS 2 Years', 'investor-itas-2-years', 1,
        'Processing service for Investor ITAS with a validity period of 2 years.',
        'Existing Investor KITAS Holder', 'Approved Investor ITAS', '4-8 Weeks'),
]

# Worker ITAS Offshore
data += [
    row(V, 'Worker ITAS Offshore', 'worker-itas-offshore', 5,
        'Worker ITAS 6 Months', 'worker-itas-6-months', 0,
        'Handling and processing of Offshore Worker ITAS application valid for a 6-month period.',
        'Existing Working KITAS Holder', 'Approved Worker ITAS', '3-5 Weeks'),
    row(V, 'Worker ITAS Offshore', 'worker-itas-offshore', 5,
        'Worker ITAS 1 Year', 'worker-itas-1-year', 1,
        'Handling and processing of Offshore Worker ITAS application valid for a 1-year period.',
        'Existing Working KITAS Holder', 'Approved Worker ITAS', '4-6 Weeks'),
    row(V, 'Worker ITAS Offshore', 'worker-itas-offshore', 5,
        'Worker ITAS 2 Years', 'worker-itas-2-years', 2,
        'Handling and processing of Offshore Worker ITAS application valid for a 2-year period.',
        'Existing Working KITAS Holder', 'Approved Worker ITAS', '4-8 Weeks'),
]

# Freelance ITAS
data += [
    row(V, 'Freelance ITAS', 'freelance-itas', 6,
        'Freelance ITAS 6 Months', 'freelance-itas-6-months', 0,
        'Application processing and administrative support for Freelance ITAS valid for a 6-month period.',
        'Worker ITAS Applicant', 'Approved Freelance ITAS', '3-5 Weeks'),
]

# Family ITAS Offshore
data += [
    row(V, 'Family ITAS Offshore', 'family-itas-offshore', 7,
        'Family ITAS 2 Years', 'family-itas-2-years', 0,
        'Application processing and administrative support for Family ITAS Offshore, valid for 2 years.',
        'Family Member of ITAS Holder', 'Approved Family ITAS', '3-6 Weeks'),
]

# Family ITAS Onshore
data += [
    row(V, 'Family ITAS Onshore', 'family-itas-onshore', 8,
        'Family ITAS 1 Year', 'family-itas-1-year', 0,
        'Residence permit for family members processed inside Indonesia.',
        'Spouse/Children of KITAS/KITAP Holders', 'Approved Family ITAS', '3-6 Weeks'),
]

# Family ITAS Extension
data += [
    row(V, 'Family ITAS Extension', 'family-itas-extension', 9,
        'Family ITAS Extension 1 Year', 'family-itas-extension-1-year', 0,
        'Extension of existing Family ITAS for 1 year.',
        'Family of Expatriates', 'Extended ITAS Validity', '2-4 Weeks'),
    row(V, 'Family ITAS Extension', 'family-itas-extension', 9,
        'Family ITAS Extension 2 Years', 'family-itas-extension-2-years', 1,
        'Extension of Family ITAS for longer validity, up to 2 years.',
        'Family of Expatriates', 'ITAS Valid Up to 2 Years', '3-5 Weeks'),
]

# Retirement ITAS Offshore
data += [
    row(V, 'Retirement ITAS Offshore', 'retirement-itas-offshore', 10,
        'Retirement ITAS 1 Year', 'retirement-itas-1-year', 0,
        'Retirement residence permit applied from abroad, valid for 1 year.',
        'Retirees Aged 55+', 'Approved Retirement ITAS', '4-8 Weeks'),
]

# KITAP Permanent Stay Permit — FIXED: swapped descriptions corrected
data += [
    row(V, 'KITAP Permanent Stay Permit', 'kitap', 11,
        'Investor KITAP 5 Years', 'investor-kitap-5-years', 0,
        'Permanent stay permit for eligible foreign investors with long-term residency in Indonesia.',
        'Foreign Investors & Long-term Expatriates', 'KITAP Approval (5 Years)', '2-3 Months'),
    row(V, 'KITAP Permanent Stay Permit', 'kitap', 11,
        'Family KITAP 5 Years', 'family-kitap-5-years', 1,
        'KITAP for family members of existing KITAP holders, granting 5-year permanent residency.',
        'Spouse/Children of KITAP Holder', 'Family KITAP Approval', '2-3 Months'),
    row(V, 'KITAP Permanent Stay Permit', 'kitap', 11,
        'Retirement KITAP 5 Years', 'retirement-kitap-5-years', 2,
        'Permanent stay permit for eligible foreign retirees aged 55+, valid for 5 years.',
        'Foreign Retirees Aged 55+', 'Retirement KITAP Approval', '2-3 Months'),
]

# Single Entry Visa — FIXED: Bussiness -> Business
data += [
    row(V, 'Single Entry Visa', 'single-entry-visa', 12,
        'Single Entry Business Visa 60 Days', 'single-entry-business-60-days', 0,
        'Visa for one-time business entry into Indonesia, valid for 60 days.',
        'Business Travelers', 'Approved Single Entry Visa', '5-10 Working Days'),
    row(V, 'Single Entry Visa', 'single-entry-visa', 12,
        'Single Entry Social / Volunteer Visa 60 Days', 'single-entry-social-60-days', 1,
        'Single entry visa for social visits or volunteer work, valid for 60 days.',
        'Foreign Visitors, Volunteers', 'Legal Entry Permit', '5-10 Working Days'),
]

# Golden Visa — FIXED: disambiguated slugs
data += [
    row(V, 'Golden Visa', 'golden-visa', 13,
        'Golden Visa Offshore 5 Years', 'golden-visa-offshore-5-years', 0,
        'Long-term visa for investors or high net worth individuals, applied from outside Indonesia.',
        'Foreign Investors', 'Long-term Stay Visa', '3-6 Weeks'),
    row(V, 'Golden Visa', 'golden-visa', 13,
        'Golden Visa Onshore 5 Years', 'golden-visa-onshore-5-years', 1,
        'Long-term visa with extended stay benefits, processed while inside Indonesia.',
        'High Net Worth Individuals', 'Long-term Residence Permit', '3-6 Weeks'),
    row(V, 'Golden Visa', 'golden-visa', 13,
        'Golden Visa Extension', 'golden-visa-extension', 2,
        'Extension of an existing Golden Visa for continued long-term stay in Indonesia.',
        'Existing Golden Visa Holders', 'Extended Golden Visa', '3-6 Weeks'),
]

# Multiple Entry Visa — FIXED: disambiguated slugs
data += [
    row(V, 'Multiple Entry Visa', 'multiple-entry-visa', 14,
        'Multiple Entry Tourist Visa 1 Year (60 Days/Stay)', 'multiple-entry-tourist-1-year', 0,
        'Visa allowing multiple tourist visits to Indonesia, each stay up to 60 days, valid for 1 year.',
        'Frequent Travelers', 'Multiple Entry Tourist Permit', '7-14 Working Days'),
    row(V, 'Multiple Entry Visa', 'multiple-entry-visa', 14,
        'Multiple Entry Business Visa 1 Year (60 Days/Stay)', 'multiple-entry-business-1-year', 1,
        'Business multiple entry visa valid for 1 year, each stay up to 60 days.',
        'Business Visitors', 'Valid Multiple Entry Business Visa', '7-14 Working Days'),
    row(V, 'Multiple Entry Visa', 'multiple-entry-visa', 14,
        'Multiple Entry Visa Extension', 'multiple-entry-visa-extension', 2,
        'Extension of an existing Multiple Entry Visa to continue authorized visits.',
        'Existing Multiple Entry Visa Holders', 'Extended Multiple Entry Visa', '7-14 Working Days'),
]

# Pre-Investment Visa — FIXED: Pra-Invenstments -> Pre-Investment
data += [
    row(V, 'Pre-Investment Visa', 'pre-investment-visa', 15,
        'Pre-Investment Visa 1 Year (180 Days/Stay)', 'pre-investment-visa-1-year-180-days', 0,
        'Visa for market research and preparation before committing to investment in Indonesia, valid 1 year.',
        'Potential Investors', 'Legal Stay for Business Exploration', '10-15 Working Days'),
    row(V, 'Pre-Investment Visa', 'pre-investment-visa', 15,
        'Pre-Investment Visa 2 Years (180 Days/Stay)', 'pre-investment-visa-2-years-180-days', 1,
        'Entry permit for extended pre-investment exploration before company establishment, valid 2 years.',
        'Foreign Investors', 'Pre-Investment Visa Approval', '10-15 Working Days'),
]

# Second Home Visa — FIXED: disambiguated slugs
data += [
    row(V, 'Second Home Visa', 'second-home-visa', 16,
        'Second Home Visa Onshore 5 Years', 'second-home-visa-onshore-5-years', 0,
        'Long-term visa based on financial requirements, processed inside Indonesia, valid 5 years.',
        'High Net Worth Individuals', '5-Year Stay Permit', '3-6 Weeks'),
    row(V, 'Second Home Visa', 'second-home-visa', 16,
        'Second Home Visa Extension', 'second-home-visa-extension', 1,
        'Extension of an existing Second Home Visa for continued long-term residence in Indonesia.',
        'Existing Second Home Visa Holders', 'Extended Second Home Visa', '3-6 Weeks'),
]

# Remote Worker — FIXED: disambiguated slugs
data += [
    row(V, 'Remote Worker', 'remote-worker', 17,
        'Remote Worker Visa Offshore 1 Year', 'remote-worker-offshore-1-year', 0,
        'Visa for digital nomads working remotely for overseas companies, applied from outside Indonesia.',
        'Remote Professionals', 'Legal Stay Permit', '2-4 Weeks'),
    row(V, 'Remote Worker', 'remote-worker', 17,
        'Remote Worker Visa Onshore 1 Year', 'remote-worker-onshore-1-year', 1,
        'Visa for overseas-employed freelancers and remote workers, processed inside Indonesia.',
        'Freelancers, Remote Workers', 'Remote Work Authorization', '2-4 Weeks'),
    row(V, 'Remote Worker', 'remote-worker', 17,
        'Remote Worker Visa Extension', 'remote-worker-extension', 2,
        'Extension of an existing Remote Worker Visa for continued digital nomad status.',
        'Existing Remote Worker Visa Holders', 'Approved Remote Visa Extension', '2-4 Weeks'),
]

# Address Mutations in ITAS
data += [
    row(V, 'Address Mutations in ITAS', 'address-mutations', 18,
        'Address Mutations in ITAS', 'address-mutations-in-itas', 0,
        'Update of registered address details on an existing ITAS permit.',
        'ITAS Holders', 'Updated Immigration Record', '5-10 Working Days'),
]

# Affidavit
data += [
    row(V, 'Affidavit', 'affidavit', 19,
        'Affidavit', 'affidavit', 0,
        'Legal statement preparation for mixed-nationality children or other immigration purposes.',
        'Parents of Dual-Nationality Child', 'Issued Affidavit', '5-7 Working Days'),
]

# Apostille Documents — FIXED: Appostile -> Apostille
data += [
    row(V, 'Apostille Documents', 'apostille', 20,
        'Apostille Documents', 'apostille-documents', 0,
        'Legalization of documents for international use through the Apostille process.',
        'Individuals, Companies', 'Apostilled Document', '3-7 Working Days'),
]

# Brand Registration
data += [
    row(V, 'Brand Registration', 'brand-registration', 21,
        'Brand Registration', 'brand-registration', 0,
        'Trademark registration process to protect your brand in Indonesia.',
        'Business Owners', 'Registered Trademark Certificate', '6-12 Months'),
]

# Domicile Letter
data += [
    row(V, 'Domicile Letter', 'domicile-letter', 22,
        'Domicile Letter', 'domicile-letter', 0,
        'Official company or personal domicile address letter from local authorities.',
        'Companies, Individuals', 'Domicile Certificate', '3-5 Working Days'),
]

# E-Passport 5 Years
data += [
    row(V, 'E-Passport 5 Years', 'e-passport-5-years', 23,
        'E-Passport 5 Years', 'e-passport-5-years', 0,
        'Processing assistance for an Indonesian electronic passport with 5-year validity.',
        'Indonesian Citizens', 'Issued E-Passport', '7-14 Working Days'),
]

# E-Passport 10 Years
data += [
    row(V, 'E-Passport 10 Years', 'e-passport-10-years', 24,
        'E-Passport 10 Years', 'e-passport-10-years', 0,
        'Processing assistance for an Indonesian electronic passport with 10-year validity.',
        'Indonesian Citizens', 'Issued E-Passport', '7-14 Working Days'),
]

# ERP
data += [
    row(V, 'ERP', 'erp', 25,
        'ERP (Electronic Residence Permit)', 'erp-electronic-residence-permit', 0,
        'Processing of the Electronic Residence Permit for ITAS and KITAP holders.',
        'ITAS/KITAP Holders', 'Issued ERP Document', '3-7 Working Days'),
]

# Passport Mutation
data += [
    row(V, 'Passport Mutation', 'passport-mutation', 26,
        'Passport Mutation', 'passport-mutation', 0,
        'Transfer of existing visa or permit to a new passport following passport renewal.',
        'Foreign Nationals', 'Updated Permit Linked to New Passport', '5-10 Working Days'),
]

# ── LEGAL & CONTRACT ADVISORY ────────────────────────────────────────────────

# Compliance
data += [
    row(L, 'Compliance', 'compliance', 0,
        'Company Legal Documents Review', 'company-legal-documents-review', 0,
        "Thorough review of a company's legal documents by experts to ensure compliance, identify risks, and provide recommendations.",
        'All Businesses', 'Legal Review Report, Recommendations', '1-2 Weeks', '3-7 Days'),
]

# Changes & Restructuring
data += [
    row(L, 'Changes & Restructuring', 'changes-restructuring', 1,
        'Change Acte For PT Or PMA', 'change-acte-for-pt-or-pma', 0,
        'Processing of legal deeds (akta) for fundamental company changes such as shareholders, directors, capital, or Articles of Association.',
        'Existing Companies', 'Amended Articles of Association, Legal Updates', '3-6 Weeks', '1-2 Weeks'),
]

# Agreements
data += [
    row(L, 'Agreements', 'agreements', 2,
        'Prenuptial & Postnuptial Agreement', 'prenuptial-postnuptial-agreement', 0,
        'Drafting and legal processing of agreements made before or after marriage regarding asset division and financial arrangements.',
        'Couples', 'Notarized Agreement', '2-4 Weeks', '3 Days'),
    row(L, 'Agreements', 'agreements', 2,
        'Shareholder Agreement', 'shareholder-agreement', 1,
        'Drafting of an agreement between shareholders outlining their rights, obligations, and the management of their company.',
        'Shareholders', 'Shareholder Agreement', '1-3 Weeks', '3-7 Days'),
]

# Employment Contracts
data += [
    row(L, 'Employment Contracts', 'employment-contracts', 3,
        'Draft Employment Contract', 'draft-employment-contract', 0,
        'Drafting of legally compliant employment contracts for local employees.',
        'Employers', 'Legal Employment Contract', '3-7 Days', '3-7 Days'),
]

# Tax Registration
data += [
    row(L, 'Tax Registration', 'tax-registration', 4,
        'NPWP (Company)', 'npwp-company', 0,
        'Assistance with obtaining a Taxpayer Identification Number (Nomor Pokok Wajib Pajak) for a company.',
        'All Businesses', 'Company NPWP Certificate', '1-2 Weeks', '1-2 Weeks'),
    row(L, 'Tax Registration', 'tax-registration', 4,
        'NPWPD (Regional)', 'npwpd-regional', 1,
        'Support for obtaining a Regional Taxpayer Identification Number, required for regional tax obligations.',
        'Businesses (Regional Tax)', 'Regional Tax ID', '1-3 Weeks', '1-2 Weeks'),
    row(L, 'Tax Registration', 'tax-registration', 4,
        'NPWPD Abt (Underground Water Wells)', 'npwpd-abt-underground-water-wells', 2,
        'Specialized assistance for obtaining a Regional Taxpayer Identification Number specifically for underground water well usage.',
        'Businesses (Water Usage)', 'Regional Tax ID (Water)', '2-4 Weeks', '1-2 Weeks'),
    row(L, 'Tax Registration', 'tax-registration', 4,
        'NPWP (Personal)', 'npwp-personal', 3,
        'Assistance for foreign individuals to obtain an Indonesian Taxpayer Identification Number.',
        'Foreign Individuals', 'Personal NPWP Certificate', '1-2 Weeks', '1-2 Weeks'),
]

# Contract & Notary
data += [
    row(L, 'Contract & Notary', 'contract-notary', 5,
        'Land/Building Rental Contract With Waarmerking', 'land-building-rental-contract-with-waarmerking', 0,
        'Drafting of land or building rental contracts with official Waarmerking notary authentication.',
        'Landlords/Tenants', 'Waarmerking Contract', '3-7 Days', '3-7 Days'),
    row(L, 'Contract & Notary', 'contract-notary', 5,
        'Notary Verification Lease Contract', 'notary-verification-lease-contract', 1,
        'Notarial verification of an existing lease contract, confirming the authenticity of signatures and dates.',
        'Landlords/Tenants', 'Verified Lease Contract', '1-3 Days', '1-3 Days'),
    row(L, 'Contract & Notary', 'contract-notary', 5,
        'Waarmerking', 'waarmerking', 2,
        'Notarial service to authenticate signatures and the date of a private document, providing legal certainty.',
        'Individuals/Businesses', 'Waarmerking Document', '1-3 Days', '1-3 Days'),
    row(L, 'Contract & Notary', 'contract-notary', 5,
        'Notary For Property/Land Contract Leasing', 'notary-for-property-land-contract-leasing', 3,
        'Services of a notary for drafting and authenticating property or land lease contracts.',
        'Landlords/Tenants', 'Notarized Lease Contract', '3-7 Days', '3-7 Days'),
]

# Property Information & Checks
data += [
    row(L, 'Property Information & Checks', 'property-checks', 6,
        'Land Due Diligence', 'land-due-diligence', 0,
        'Comprehensive investigation and verification of land ownership, legal status, zoning, and potential risks before a transaction.',
        'Individual Property Buyers', 'Due Diligence Report', '1-3 Weeks', '1-2 Weeks'),
    row(L, 'Property Information & Checks', 'property-checks', 6,
        'ITR (Informasi Tata Ruang) Official', 'itr-informasi-tata-ruang-official', 1,
        'Official retrieval of Spatial Planning Information, detailing land use regulations and zoning for a specific area.',
        'Individual Property Buyers', 'ITR Document', '1-2 Weeks', '3-7 Days'),
]

# Yayasan
data += [
    row(L, 'Yayasan', 'yayasan', 7,
        'Yayasan Establishment', 'yayasan-establishment', 0,
        'Assistance with establishing a Foundation (Yayasan), including deed drafting, legal approval, and registration.',
        'Social Organizations, Non-profits', 'Notarial Deed, SK Kemenkumham', '3-6 Weeks', '1-2 Weeks'),
]

# RUPS
data += [
    row(L, 'RUPS', 'rups', 8,
        'Annual RUPS', 'annual-rups', 0,
        'Preparation of Annual General Meeting of Shareholders documents and resolutions.',
        'Companies (PT / PMA)', 'Minutes of Meeting, Shareholders Resolution', '3-7 Days', '2-3 Days'),
]

# JBS Per Transaction
data += [
    row(L, 'JBS Per Transaction', 'jbs', 9,
        'Share Transfer (Jual Beli Saham)', 'share-transfer-jual-beli-saham', 0,
        'Legal assistance for transfer of company shares between shareholders, including preparation of Share Purchase Agreement and corporate resolutions.',
        'Shareholders, Investors', 'Share Purchase Agreement (SPA), Shareholders Resolution', '1-3 Weeks', '3-5 Days'),
]

# ── COMPANY SET UP ───────────────────────────────────────────────────────────

# Company Set-Up – Establishment
data += [
    row(C, 'Company Set-Up – Establishment', 'company-setup-establishment', 0,
        'PT Local - Set Up', 'pt-local-set-up', 0,
        'Comprehensive assistance for establishing a local Limited Liability Company (Perseroan Terbatas), including all legal and administrative requirements.',
        'Local Entrepreneurs', 'Notarial Deed, NIB, Business Licenses', '4-8 Weeks', '1-2 Weeks'),
    row(C, 'Company Set-Up – Establishment', 'company-setup-establishment', 0,
        'PT Local - Hospitality Set Up', 'pt-local-hospitality-set-up', 1,
        'Specialized support for establishing a local PT tailored for the hospitality sector, ensuring industry-specific compliance.',
        'Hospitality Investors', 'Notarial Deed, NIB, Hospitality Licenses', '6-12 Weeks', '2-3 Weeks'),
    row(C, 'Company Set-Up – Establishment', 'company-setup-establishment', 0,
        'PMA - Set Up', 'pma-set-up', 2,
        'Full-service support for establishing a Foreign Capital Investment Company, covering foreign ownership, capital, and necessary permits.',
        'Foreign Investors', 'Notarial Deed, BKPM Approval, NIB, Business Licenses', '8-16 Weeks', '2-4 Weeks'),
    row(C, 'Company Set-Up – Establishment', 'company-setup-establishment', 0,
        'CV (Commanditaire Vennootschap)', 'cv-commanditaire-vennootschap', 3,
        'Assistance with the establishment of a Commanditaire Vennootschap (limited partnership), including registration and legal documentation.',
        'Small Business Owners', 'Deed of Establishment, Registration', '3-6 Weeks', '1 Week'),
    row(C, 'Company Set-Up – Establishment', 'company-setup-establishment', 0,
        'PT Perorangan', 'pt-perorangan', 4,
        'Support for establishing a Single-Person Limited Liability Company, a simplified legal entity for individual entrepreneurs.',
        'Individual Entrepreneurs', 'Deed of Establishment, NIB', '2-4 Weeks', '1 Week'),
]

# Company Set-Up – Licensing
data += [
    row(C, 'Company Set-Up – Licensing', 'company-setup-licensing', 1,
        'NIB & OSS Process', 'nib-oss-process', 0,
        'Guidance and assistance through the Online Single Submission (OSS) system to obtain a Business Identification Number (NIB) and other necessary business licenses.',
        'All Businesses', 'NIB, Standard Business Licenses', '1-3 Weeks', '3 Days'),
    row(C, 'Company Set-Up – Licensing', 'company-setup-licensing', 1,
        'OSS Username & Password', 'oss-username-password', 1,
        'Support for obtaining or recovering OSS system credentials.',
        'All Businesses', 'OSS Account Access', '1-3 Days', '3 Days'),
]

# Closing & Dissolution
data += [
    row(C, 'Closing & Dissolution', 'closing-dissolution', 2,
        'Closing Local Company / PT, CV, Firma', 'closing-local-company-pt-cv-firma', 0,
        'Comprehensive support for the legal dissolution and closure of local companies, ensuring all obligations are met.',
        'Local Companies', 'Dissolution Deed, Tax Clearance, Deregistration', '3-6 Months', '3-4 Weeks'),
    row(C, 'Closing & Dissolution', 'closing-dissolution', 2,
        'Closing PMA', 'closing-pma', 1,
        'Expert guidance and processing for the legal dissolution and liquidation of a Foreign Capital Investment Company (PMA).',
        'PMA Companies', 'Liquidation Deed, BKPM Clearance, Deregistration', '6-12 Months', '4-6 Weeks'),
    row(C, 'Closing & Dissolution', 'closing-dissolution', 2,
        'Company Valuation', 'company-valuation', 2,
        'Professional assessment to determine the economic value of a company or its assets for M&A, investment, or other purposes.',
        'Businesses (M&A, Funding)', 'Valuation Report', '2-4 Weeks', '1-2 Weeks'),
]

# ── HUMAN RESOURCE (HR) ──────────────────────────────────────────────────────

# Recruitment Services
data += [
    row(H, 'Recruitment Services', 'recruitment-services', 0,
        'Staff Recruitment (UMK Salary)', 'staff-recruitment-umk-salary', 0,
        'Full-cycle hiring process from sourcing to placement for staff positions at UMK salary level.',
        'Companies Seeking Talent, Startups Scaling Up', 'Candidate Shortlist, Interview Reports, Reference Checks',
        'Sourcing (W1-2), Screening (W3-4), Interview (W5-6), Hiring (W7-8)'),
    row(H, 'Recruitment Services', 'recruitment-services', 0,
        'Professional Recruitment (Salary > Rp 5jt)', 'professional-recruitment', 1,
        'Recruitment for professional-level positions, fee based on candidate gross salary.',
        'Companies Seeking Specific Talent', 'Candidate Shortlist, Interview Reports, Reference Checks',
        'Sourcing (W1-2), Screening (W3-4), Interview (W5-6), Hiring (W7-8)'),
    row(H, 'Recruitment Services', 'recruitment-services', 0,
        'Executive Search (Managerial / Head)', 'executive-search-managerial-head', 2,
        'Search and placement for specialist or senior-level managerial and head positions.',
        'Companies Seeking Senior Talent', 'Candidate Shortlist, Interview Reports, Reference Checks',
        'Sourcing (W1-2), Screening (W3-4), Interview (W5-6), Hiring (W7-8)'),
    row(H, 'Recruitment Services', 'recruitment-services', 0,
        'Mass Recruitment (Operator/Daily Worker)', 'mass-recruitment-operator-daily-worker', 3,
        'High-volume recruitment for operator and daily worker positions, minimum 5 candidates per project.',
        'Companies with High-Volume Hiring Needs', 'Candidate Shortlist, Interview Reports, Reference Checks',
        'Sourcing (W1-2), Screening (W3-4), Interview (W5-6), Hiring (W7-8)'),
    row(H, 'Recruitment Services', 'recruitment-services', 0,
        'Campus Hiring / Training / Internship', 'campus-hiring-training-internship', 4,
        'Recruitment and placement program for campus graduates, trainees, and interns, per student.',
        'Companies Seeking Fresh Graduates or Interns', 'Candidate Shortlist, Interview Reports, Reference Checks',
        'Sourcing (W1-2), Screening (W3-4), Interview (W5-6), Hiring (W7-8)'),
]

# Assessment & Screening
data += [
    row(H, 'Assessment & Screening', 'assessment-screening', 1,
        'Background Check (Reference Check)', 'background-check-ref-check', 0,
        'Verification of candidate history, credentials, and references.',
        'HR Departments Needing Objective Hiring Data', 'Individual Assessment Reports, Competency Matrix',
        'Testing (Day 1-3), Scoring (Day 4-6), Final Report (Day 7-10)'),
    row(H, 'Assessment & Screening', 'assessment-screening', 1,
        'Psychological Assessment / Psychotes', 'psychological-assessment-psychotes', 1,
        'Comprehensive psychological and aptitude assessment per candidate, including detailed reports.',
        'HR Departments Needing Objective Hiring Data', 'Individual Assessment Reports, Competency Matrix',
        'Testing (Day 1-3), Scoring (Day 4-6), Final Report (Day 7-10)'),
    row(H, 'Assessment & Screening', 'assessment-screening', 1,
        'Assessment Center (Promosi Jabatan)', 'assessment-center-promosi-jabatan', 2,
        'Job simulation and panel interview assessment for internal promotions.',
        'HR Departments for Internal Promotions', 'Individual Assessment Reports, Competency Matrix',
        'Testing (Day 1-3), Scoring (Day 4-6), Final Report (Day 7-10)'),
    row(H, 'Assessment & Screening', 'assessment-screening', 1,
        'Technical Competency Test', 'technical-competency-test', 3,
        'Specific technical proficiency testing for targeted role requirements.',
        'HR Departments Needing Objective Hiring Data', 'Individual Assessment Reports, Competency Matrix',
        'Testing (Day 1-3), Scoring (Day 4-6), Final Report (Day 7-10)'),
]

# HR Compliance
data += [
    row(H, 'HR Compliance', 'hr-compliance', 2,
        'Drafting PKWT / PKWTT (Kontrak Kerja)', 'drafting-pkwt-pkwtt-kontrak-kerja', 0,
        'Drafting of fixed-term (PKWT) or permanent (PKWTT) employment contract templates per contract.',
        'Companies Needing Legal HR Documents', 'Compliance Audit Report, Revised Company Regulations (PP/PKB)',
        'Document Review (W1-2), Gap Analysis (W3-4), Legal Drafting (W5-6)'),
    row(H, 'HR Compliance', 'hr-compliance', 2,
        'HR Admin Managed Services', 'hr-admin-managed-services', 1,
        'Outsourced HR administration including document and leave management, up to 25 employees (flat fee).',
        'Companies Seeking Administrative Support', 'Compliance Audit Report, Revised Company Regulations (PP/PKB)',
        'Document Review (W1-2), Gap Analysis (W3-4), Legal Drafting (W5-6)'),
    row(H, 'HR Compliance', 'hr-compliance', 2,
        'Development of Standard Operating Procedures', 'development-of-standard-operating-procedures', 2,
        'Development of SOPs for specific departments or functional areas.',
        'Companies Needing Structured HR Processes', 'Compliance Audit Report, Revised Company Regulations (PP/PKB)',
        'Document Review (W1-2), Gap Analysis (W3-4), Legal Drafting (W5-6)'),
]

# Management & Outsourcing
data += [
    row(H, 'Management & Outsourcing', 'management-outsourcing', 3,
        'Payroll Outsourcing Service', 'payroll-outsourcing-service', 0,
        'Complete payroll management service, per person per month.',
        'Companies Reducing Administrative Burdens', 'Monthly Payslips, Tax Reports (PPh 21), BPJS Administration',
        'Data Collection (W3), Processing (W4), Disbursement (Date 1)'),
    row(H, 'Management & Outsourcing', 'management-outsourcing', 3,
        'HR Audit & Compliance Check', 'hr-audit-compliance-check', 1,
        'HR regulatory compliance assessment to identify gaps and recommend improvements.',
        'Companies Seeking HR Legal Health Check', 'Monthly Payslips, Tax Reports (PPh 21), BPJS Administration',
        'Data Collection (W3), Processing (W4), Disbursement (Date 1)'),
]

# Training & Development
data += [
    row(H, 'Training & Development', 'training-development', 4,
        'Employee Onboarding Program', 'employee-onboarding-program', 0,
        'Material setup and orientation program design for new employees.',
        'Organizations Upskilling Employees', 'Custom Training Modules for Soft Skills, Leadership, and Technical Growth',
        'Needs Analysis (W1), Development (W2), Delivery (W3-4)'),
]

# HR Strategy & Consulting
data += [
    row(H, 'HR Strategy & Consulting', 'hr-strategy-consulting', 5,
        'Job Analysis & Job Description', 'job-analysis-job-description', 0,
        'Comprehensive job analysis and professional job description creation, per position.',
        'Executives and Business Owners Planning Restructuring',
        'HR Strategic Plan, Organization Structure Design, Manpower Plan',
        'Diagnostic (W1-3), Strategy Design (W4-8), Final Roadmap (W9-12)'),
    row(H, 'HR Strategy & Consulting', 'hr-strategy-consulting', 5,
        'Grading & Salary Structure (Remunerasi)', 'grading-salary-structure-remunerasi', 1,
        'Salary grading and remuneration structure design for medium-sized companies.',
        'Executives and Business Owners',
        'HR Strategic Plan, Organization Structure Design, Manpower Plan',
        'Diagnostic (W1-3), Strategy Design (W4-8), Final Roadmap (W9-12)'),
    row(H, 'HR Strategy & Consulting', 'hr-strategy-consulting', 5,
        'Performance Management System (KPI)', 'performance-management-system-kpi', 2,
        'Design and implementation of a performance evaluation system based on KPIs.',
        'Executives and Business Owners',
        'HR Strategic Plan, Organization Structure Design, Manpower Plan',
        'Diagnostic (W1-3), Strategy Design (W4-8), Final Roadmap (W9-12)'),
    row(H, 'HR Strategy & Consulting', 'hr-strategy-consulting', 5,
        'Employee Engagement Survey', 'employee-engagement-survey', 3,
        'Employee satisfaction and engagement analysis program.',
        'Executives and Business Owners',
        'HR Strategic Plan, Organization Structure Design, Manpower Plan',
        'Diagnostic (W1-3), Strategy Design (W4-8), Final Roadmap (W9-12)'),
    row(H, 'HR Strategy & Consulting', 'hr-strategy-consulting', 5,
        'Culture Transformation Project', 'culture-transformation-project', 4,
        'Development and implementation of a new organizational work culture program.',
        'Executives and Business Owners Planning Transformation',
        'HR Strategic Plan, Organization Structure Design, Manpower Plan',
        'Diagnostic (W1-3), Strategy Design (W4-8), Final Roadmap (W9-12)'),
]

# ── ACCOUNTING & TAX ─────────────────────────────────────────────────────────
data += [
    row(A, 'Accounting & TAX', 'accounting-tax-services', 0,
        'Period Tax Returns', 'period-tax-returns', 0,
        'Preparation and filing of periodic tax returns including Income Tax Article 21, 22, 23, 25, 26, Final Income Tax, Value Added Tax (VAT), and Local Government Tax.',
        'Entrepreneurs, Business Owners', 'Tax Returns Filed, Consultant Tax Advice', '1-2 Weeks', '1 Week', NOTE_ACCT),
    row(A, 'Accounting & TAX', 'accounting-tax-services', 0,
        'Annual Tax Return', 'annual-tax-return', 1,
        'Preparation and filing of annual tax reports (SPT), covering both Personal Annual Tax Return and Corporate Annual Tax Return.',
        'Entrepreneurs, Business Owners', 'Tax Returns Filed (SPT), Consultant Tax Advice', '1 Month', '1 Month', NOTE_ACCT),
    row(A, 'Accounting & TAX', 'accounting-tax-services', 0,
        'Tax Consultancy Service', 'tax-consultancy-service', 2,
        'Free initial tax consultancy session of up to 30 minutes for entrepreneurs and business owners.',
        'Entrepreneurs, Business Owners', 'Consultant Tax Advice', '30 Minutes', '30 Minutes', NOTE_ACCT),
]

# Validation
print(f'Total entries: {len(data)}')
slugs = [r['service_slug'] for r in data]
dupes = {s: c for s, c in Counter(slugs).items() if c > 1}
if dupes:
    print(f'SLUG COLLISIONS: {dupes}')
else:
    print('No slug collisions OK')

with open(OUT_PATH, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
print(f'Written to {OUT_PATH}')
