using LegalMatterContractPortal.Domain.Entities;
using LegalMatterContractPortal.Domain.Enums;

namespace LegalMatterContractPortal.Infrastructure.Persistence.Seeding;

/// <summary>Static reference data for the seeder.</summary>
internal static class ReferenceData
{
    // ── Practice areas (8) ─────────────────────────────────────────────
    public static readonly (string Name, string Description)[] PracticeAreas =
    {
        ("Litigation",                "Commercial, securities, tort, and complex business litigation."),
        ("Corporate",                  "Entity governance, M&A, equity, board support."),
        ("Intellectual Property",      "Patent prosecution, trademark, copyright, trade secret."),
        ("Labor & Employment",         "Workforce, wage/hour, EEO, employee agreements."),
        ("Commercial Contracts",       "MSA, NDA, SaaS, supply, distributor, channel agreements."),
        ("Regulatory & Compliance",    "Sector regulators, investigations, sanctions, AML/KYC."),
        ("Privacy & Data Protection",   "GDPR/CCPA, DPIAs, data processing, breach response."),
        ("Mergers & Acquisitions",      "Buy-side/sell-side diligence, SPA, warranty & indemnity.")
    };

    // ── Internal clients (15) — business units of the company ──────────
    public static readonly (string Bu, string Industry)[] InternalClients =
    {
        ("Northwind Logistics — Procurement BU",       "Logistics"),
        ("Horizon Energy LLC — Operations BU",          "Energy"),
        ("Apex BioSystems — R&D BU",                    "Biotechnology"),
        ("SilverOak Manufacturing — Supply Chain BU",    "Manufacturing"),
        ("BrightPath Health — Clinical Ops BU",          "Healthcare"),
        ("Cascade Mining Corp — EHS BU",                "Mining"),
        ("Meridian Foods — Quality BU",                 "Food & Beverage"),
        ("Pinecrest Capital — Treasury BU",              "Financial Services"),
        ("Riverstone Insurance — Underwriting BU",       "Insurance"),
        ("Summit Retail Group — Merchandising BU",        "Retail"),
        ("Vanguard Pharma — Clinical BU",                "Pharmaceuticals"),
        ("Cedar Realty Trust — Asset Management BU",      "Real Estate"),
        ("LibraTech Solutions — Engineering BU",         "Software"),
        ("Atlas Maritime — Fleet Operations BU",         "Maritime"),
        ("BlueLeaf AgriTech — Field Ops BU",             "Agriculture")
    };

    // ── External clients (10) — paying external customers ─────────────
    public static readonly (string Name, string Industry)[] ExternalClients =
    {
        ("Quantum Build Systems",        "Construction"),
        ("Sterling Aerospace",            "Aerospace"),
        ("Greenfield Renewables",         "Renewable Energy"),
        ("Harborline Shipping",           "Shipping"),
        ("NorthPeak Insurance",           "Insurance"),
        ("Cypress Hospitality Group",     "Hospitality"),
        ("IronClad Robotics",             "Robotics"),
        ("Meadowlark Biotech",             "Biotechnology"),
        ("Stonebridge Media",             "Media"),
        ("Westend Franchise Holdings",    "Franchise")
    };

    // ── Law firms (18) with city/state and default rate ───────────────
    public static readonly (string Name, string City, string State, FirmTier Tier, decimal DefaultRate, string Focus)[] LawFirms =
    {
        ("Aldridge & Vance LLP",       "New York",      "NY", FirmTier.Strategic, 725, "Commercial litigation & trials"),
        ("Brennan Cole Partners",       "Chicago",        "IL", FirmTier.Preferred, 550, "Labor & employment"),
        ("Castellan Hayes LLP",         "Houston",        "TX", FirmTier.Panel,     475, "Energy & regulatory"),
        ("Delacroix Weiss LLP",         "Washington",     "DC", FirmTier.Strategic, 795, "Regulatory & investigations"),
        ("Easton Marsh Group",          "San Francisco",  "CA", FirmTier.Preferred, 620, "IP & patent"),
        ("Fairchild Brennan LLP",       "Boston",         "MA", FirmTier.Preferred, 565, "M&A and corporate"),
        ("Garrison & Pell LLP",         "Los Angeles",    "CA", FirmTier.Panel,     460, "Entertainment & media"),
        ("Hartwell Stone LLP",          "Atlanta",        "GA", FirmTier.Preferred, 510, "Commercial contracts"),
        ("Ibarra Quintanilla LLP",      "Miami",          "FL", FirmTier.Panel,     470, "International & LATAM"),
        ("Jensen Marsh LLP",            "Seattle",        "WA", FirmTier.Preferred, 540, "Technology & privacy"),
        ("Kessler Rowe Partners",        "Dallas",         "TX", FirmTier.Panel,     450, "Litigation & appeals"),
        ("Lindqvist Holt LLP",           "Minneapolis",    "MN", FirmTier.AdHoc,    395, "Product liability"),
        ("Mercer Donovan LLP",          "Denver",         "CO", FirmTier.Panel,     430, "Real estate & construction"),
        ("Nakamura Reed LLP",            "Portland",       "OR", FirmTier.AdHoc,    405, "Environmental & ESG"),
        ("Okafor Sterling LLP",          "Newark",         "NJ", FirmTier.Preferred, 590, "Corporate & securities"),
        ("Pemberton Hale LLP",           "Philadelphia",   "PA", FirmTier.Panel,     460, "Insurance coverage"),
        ("Quartermaine Burgess LLP",     "San Diego",      "CA", FirmTier.Panel,     455, "Government contracts"),
        ("Rochester Vance LLP",           "Detroit",        "MI", FirmTier.AdHoc,    390, "Manufacturing & supply chain")
    };

    // ── Internal staff (30) — explicit, gendered for realistic name pools ──
    // (FullName, Role, BarJurisdiction?)  — index 0..29
    public static readonly (string FullName, StaffRole Role, string? Bar)[] StaffRoster =
    {
        ("Richard Linwood",       StaffRole.GeneralCounsel,    "DC"),
        ("Thomas Whitfield",      StaffRole.ManagingCounsel,    "DC"),
        ("Amelia Donovan",        StaffRole.ManagingCounsel,    "DC"),
        ("James Okafor",          StaffRole.SeniorCounsel,      "NY"),
        ("Priya Nair",            StaffRole.SeniorCounsel,      "CA"),
        ("Kevin Zhao",            StaffRole.SeniorCounsel,      "IL"),
        ("Olivia Park",           StaffRole.SeniorCounsel,      "IL"),
        ("Andrew Brennan",        StaffRole.SeniorCounsel,      "MA"),
        ("Grace Hartman",         StaffRole.SeniorCounsel,      "MA"),
        ("Marcus Lin",            StaffRole.Counsel,            "CA"),
        ("Sofia Marchetti",       StaffRole.Counsel,            "NY"),
        ("Daniel Reyes",          StaffRole.Counsel,            "TX"),
        ("Hannah Snyder",         StaffRole.Counsel,            "TX"),
        ("Robert Nakamura",       StaffRole.Counsel,            "WA"),
        ("Lily Tanaka",           StaffRole.Counsel,            "WA"),
        ("Nathan Garrison",       StaffRole.Counsel,            "GA"),
        ("Isabella Connor",       StaffRole.Counsel,            "GA"),
        ("Michael Hartwell",      StaffRole.Counsel,            "FL"),
        ("Ava Rodriguez",         StaffRole.Counsel,            "FL"),
        ("Carlos Quintanilla",    StaffRole.Counsel,            "TX"),
        ("Maya Patel",             StaffRole.Counsel,            "NJ"),
        ("Samuel Castellan",      StaffRole.Paralegal,           "NY"),
        ("Zoe Rasmussen",         StaffRole.Paralegal,           "CA"),
        ("Chloe Pemberton",       StaffRole.Counsel,             "PA"),
        ("Natalie Burgess",       StaffRole.Counsel,             "CA"),
        ("David Jenkins",         StaffRole.LegalOps,           null),
        ("Sophia Stanfield",      StaffRole.LegalOps,            null),
        ("Brian Jensen",          StaffRole.ContractAnalyst,     null),
        ("Mia Hernandez",         StaffRole.Compliance,          "TX"),
        ("Emma Larsson",          StaffRole.Counsel,             "MN")
    };

    // ── Counterparty names (30) — distinct from internal clients ─────
    public static readonly string[] Counterparties =
    {
        "Atlas Freight Solutions",
        "GlobalPay Processing Inc",
        "Vertex Cloud Services",
        "Meridian Logistics Partners",
        "Coastal Energy Services",
        "Polarix Analytics LLC",
        "Stone Harbor Capital",
        "Lighthouse Benefits Group",
        "Redwood Robotics",
        "Pinnacle Health Systems",
        "Catalyst Materials Corp",
        "Fielding Software Labs",
        "Brightline Recruitment",
        "Cedar & Ash Hospitality",
        "NorthPoint Vacation Resorts",
        "Cascade Tools Manufacturing",
        "Silverline Aerospace Components",
        "Evergreen Pharma Solutions",
        "BlueWave Telecom",
        "Skyline Coworking",
        "Quantum Foods Distribution",
        "Maplecrest Senior Living",
        "Harborview Specialty Physicians",
        "Ironclad Networking Systems",
        "Pinecrest Wealth Advisors",
        "Riverbend Biotech Partners",
        "Sterling Wide Format Print",
        "Meadowbrook Equipment Finance",
        "Vanguard Mobility Group",
        "Summit Cloud Hosting"
    };

    // ── Contract types ────────────────────────────────────────────────
    public static readonly string[] ContractTypes =
    {
        "MSA", "NDA", "SaaS Agreement", "Service Agreement", "Distributor Agreement",
        "License Agreement", "Teaming Agreement", "Statement of Work",
        "Reseller Agreement", "Equipment Lease", "Data Processing Agreement"
    };

    // ── Matter titles by type (template + counterparty/entity) ────────
    public static readonly (MatterType Type, string TitleTemplate)[] MatterTitleTemplates =
    {
        (MatterType.Contract,      "{0} — {1}"),
        (MatterType.Litigation,    "{0} v. {1}"),
        (MatterType.Advisory,      "{0} Advisory — {1}"),
        (MatterType.Transaction,   "{0} Transaction — {1}"),
        (MatterType.Investigation, "{0} Investigation — {1}")
    };

    // ── UTBMS reference codes (subset) ────────────────────────────────
    // (Code, Type, Description, PracticeArea?)
    public static readonly (string Code, UtbmsCodeType Type, string Description, string? PracticeArea)[] UtbmsCodes =
    {
        ("L110", UtbmsCodeType.Task,    "Fact Investigation / Development",              "Litigation"),
        ("L120", UtbmsCodeType.Task,    "Analysis and Strategy",                          "Litigation"),
        ("L130", UtbmsCodeType.Task,    "Expert Consultation",                            "Litigation"),
        ("L160", UtbmsCodeType.Task,    "Document Drafting and Review",                  "Commercial Contracts"),
        ("L190", UtbmsCodeType.Task,    "Other",                                          null),
        ("L240", UtbmsCodeType.Task,    "Pretrial Hearings / Preparation",              "Litigation"),
        ("L320", UtbmsCodeType.Task,    "Appeals",                                        "Litigation"),
        ("A101", UtbmsCodeType.Activity,"Plan and Organize Matter",                      null),
        ("A104", UtbmsCodeType.Activity,"Draft/Review Contract",                          "Commercial Contracts"),
        ("A107", UtbmsCodeType.Activity,"Communicate with Client",                       null),
        ("A109", UtbmsCodeType.Activity,"Review and Analyze Documents",                  null),
        ("A113", UtbmsCodeType.Activity,"Prepare for Negotiation",                        "Commercial Contracts"),
        ("A140", UtbmsCodeType.Activity,"Conduct Research",                                null),
        ("E101", UtbmsCodeType.Expense, "Filing Fees",                                     null),
        ("E110", UtbmsCodeType.Expense, "Travel",                                          null),
        ("E111", UtbmsCodeType.Expense, "Lodging",                                         null),
        ("E204", UtbmsCodeType.Expense, "Copying/Printing",                                null),
        ("E210", UtbmsCodeType.Expense, "Court Reporter/Transcript",                     "Litigation")
    };

    public static readonly string[] FlagReasons = { "block-billing", "rate-increase", "duplicate", "out-of-scope", "excessive-hours" };

    public static readonly string[] Jurisdictions =
    {
        "S.D.N.Y.", "D.Del.", "N.D.Cal.", "D.Colo.", "E.D.Tex.", "S.D.Tex.",
        "D.N.J.", "N.D.Ill.", "D.Mass.", "C.D.Cal.", "E.D.Pa.", "D.Cir.",
        "Delaware Chancery", "W.D.Wash.", "D.Or."
    };
}
