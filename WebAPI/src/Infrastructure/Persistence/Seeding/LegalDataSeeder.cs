using Bogus;
using LegalMatterContractPortal.Application.Models;
using LegalMatterContractPortal.Domain.Entities;
using LegalMatterContractPortal.Domain.Enums;

namespace LegalMatterContractPortal.Infrastructure.Persistence.Seeding;

/// <summary>Deterministic showcase seeder (fixed seed, identical volumes each run).</summary>
public static class LegalDataSeeder
{
    public const int Seed = 20260722;

    public static async Task SeedAsync(LegalDbContext db, CancellationToken ct = default)
    {
        // Idempotent — only seed when empty.
        if (db.UtbmsCodes.Any()) return;

        Randomizer.Seed = new Random(Seed);

        var asOf = SystemAsOf.Today;

        // ── UTBMS reference codes ──────────────────────────────────────
        var utbms = ReferenceData.UtbmsCodes.Select(u => new UtbmsCode
        {
            Code = u.Code,
            CodeType = u.Type,
            Description = u.Description,
            PracticeArea = u.PracticeArea
        }).ToList();
        await db.UtbmsCodes.AddRangeAsync(utbms, ct);

        var taskCodes = utbms.Where(c => c.CodeType == UtbmsCodeType.Task).Select(c => c.Code).ToList();
        var activityCodes = utbms.Where(c => c.CodeType == UtbmsCodeType.Activity).Select(c => c.Code).ToList();
        var expenseCodes = utbms.Where(c => c.CodeType == UtbmsCodeType.Expense).Select(c => c.Code).ToList();

        // ── Practice areas ────────────────────────────────────────────
        var practiceAreas = ReferenceData.PracticeAreas
            .Select((p, i) => new PracticeArea { PracticeAreaId = i + 1, Name = p.Name, Description = p.Description })
            .ToList();
        await db.PracticeAreas.AddRangeAsync(practiceAreas, ct);

        // ── Clients (15 internal BUs + 10 external customers) ─────────
        var internalClients = ReferenceData.InternalClients.Select((c, i) => new Client
        {
            ClientId = i + 1,
            Name = c.Bu,
            Type = ClientType.Internal,
            Industry = c.Industry,
            PrimaryContact = NameFaker.Internal(i),
            ContactEmail = $"{c.Bu.Split(' ')[0].ToLower().Replace(",", "")}.legal@example.com",
            CreatedAt = Utc(asOf.ToDateTime(TimeOnly.MinValue).AddDays(-750 + i * 8))
        }).ToList();

        var externalClients = ReferenceData.ExternalClients.Select((c, i) => new Client
        {
            ClientId = 16 + i,
            Name = c.Name,
            Type = ClientType.External,
            Industry = c.Industry,
            PrimaryContact = NameFaker.External(i),
            ContactEmail = $"legaldept@{c.Name.Split(' ')[0].ToLower()}.example.com",
            CreatedAt = Utc(asOf.ToDateTime(TimeOnly.MinValue).AddDays(-600 + i * 10))
        }).ToList();
        var allClients = internalClients.Concat(externalClients).ToList();
        await db.Clients.AddRangeAsync(allClients, ct);

        // ── Internal staff (30) ───────────────────────────────────────
        var staff = ReferenceData.StaffRoster.Select((s, i) => new Staff
        {
            StaffId = i + 1,
            FullName = s.FullName,
            Role = s.Role,
            Email = StaffEmail(s.FullName, i),
            BarJurisdiction = s.Bar,
            Active = i < 28  // 2 inactive
        }).ToList();
        await db.Staff.AddRangeAsync(staff, ct);

        // ── Law firms (18) ────────────────────────────────────────────
        var firms = ReferenceData.LawFirms.Select((f, i) => new LawFirm
        {
            FirmId = i + 1,
            Name = f.Name,
            Tier = f.Tier,
            DefaultRate = f.DefaultRate,
            City = f.City,
            State = f.State,
            PracticeFocus = f.Focus
        }).ToList();
        await db.LawFirms.AddRangeAsync(firms, ct);

        await db.SaveChangesAsync(ct);

        // ── Status distribution (~production) ───────────────────────
        // Intake 8% · Triage 5% · Active 42% · OnHold 7% · Closing 6% · Closed 28% · Rejected 4%
        var matterStatuses = new (MatterStatus Value, int Weight)[]
        {
            (MatterStatus.Intake, 8),
            (MatterStatus.Triage, 5),
            (MatterStatus.Active, 42),
            (MatterStatus.OnHold, 7),
            (MatterStatus.Closing, 6),
            (MatterStatus.Closed, 28),
            (MatterStatus.Rejected, 4)
        };
        var riskLevels = new (RiskLevel, int)[] { (RiskLevel.Low, 55), (RiskLevel.Medium, 32), (RiskLevel.High, 13) };
        var matterTypeWeights = new (MatterType, int)[]
        {
            (MatterType.Contract, 38),
            (MatterType.Litigation, 24),
            (MatterType.Advisory, 16),
            (MatterType.Transaction, 14),
            (MatterType.Investigation, 8)
        };

        // ── 250 Matters ────────────────────────────────────────────
        var openFaker = new Faker();
        var matters = new List<Matter>(250);
        var rng = new Random(Seed);

        // Attorneys eligible to lead a matter (exclude ops/analyst roles and inactive staff).
        var eligibleAttorneys = staff
            .Where(s => s.Role != StaffRole.LegalOps && s.Role != StaffRole.ContractAnalyst && s.Active)
            .ToList();

        for (int i = 0; i < 250; i++)
        {
            var client = allClients[rng.Next(allClients.Count)];
            var area = practiceAreas[rng.Next(practiceAreas.Count)];
            var attorney = eligibleAttorneys[rng.Next(eligibleAttorneys.Count)];
            var inHouse = client.Type == ClientType.Internal || rng.NextDouble() < 0.35;
            var firm = inHouse ? null : firms[rng.Next(firms.Count)];
            var status = WeightedPick(matterStatuses, rng);
            var risk = WeightedPick(riskLevels, rng);
            var matterType = WeightedPick(matterTypeWeights, rng);
            int year = rng.NextDouble() < 0.10 ? asOf.Year - 1 : asOf.Year;
            var openDate = new DateOnly(year, 1, 1).AddDays(rng.Next(0, year == asOf.Year ? asOf.DayOfYear : 365));
            if (openDate > asOf) openDate = asOf.AddDays(-rng.Next(1, 30));  // never future-opened

            DateOnly? closeDate = status == MatterStatus.Closed
                ? openDate.AddDays(rng.Next(30, 240))
                : null;

            // Budgets realistic by type
            decimal budget = matterType switch
            {
                MatterType.Litigation => rng.Next(40_000, 750_000),
                MatterType.Investigation => rng.Next(60_000, 500_000),
                MatterType.Transaction => rng.Next(25_000, 400_000),
                MatterType.Contract => rng.Next(8_000, 120_000),
                _ => rng.Next(10_000, 200_000)
            };

            var counterparty = ReferenceData.Counterparties[rng.Next(ReferenceData.Counterparties.Length)];
            var title = BuildMatterTitle(matterType, client.Name, counterparty, i);

            var matter = new Matter
            {
                MatterId = i + 1,
                MatterNumber = $"MAT-{year}-{(i + 1):D4}",
                Title = title,
                ClientId = client.ClientId,
                Client = client,
                PracticeAreaId = area.PracticeAreaId,
                PracticeArea = area,
                MatterType = matterType,
                ResponsibleStaffId = attorney.StaffId,
                ResponsibleStaff = attorney,
                FirmId = firm?.FirmId,
                Firm = firm,
                Status = status,
                RiskLevel = risk,
                OpenDate = openDate,
                CloseDate = closeDate,
                BudgetAmount = budget,
                Description = BuildMatterDescription(matterType, client.Name, counterparty, area.Name),
                CreatedAt = Utc(openDate),
                UpdatedAt = Utc(closeDate ?? asOf)
            };
            matters.Add(matter);
        }
        await db.Matters.AddRangeAsync(matters, ct);
        await db.SaveChangesAsync(ct);

        // ── Contracts (~1.5 per active/closed matter; ~3 misdemeanours rejected/empty handled by clamping) ─
        var contractFaker = new Faker();
        var contracts = new List<Contract>();
        long contractId = 1;
        foreach (var m in matters)
        {
            int n = m.Status == MatterStatus.Rejected || m.Status == MatterStatus.Intake
                ? (rng.NextDouble() < 0.25 ? 1 : 0)
                : rng.Next(m.Status == MatterStatus.Closed ? 1 : 0, m.Status == MatterStatus.Closed ? 3 : 3);
            for (int k = 0; k < n; k++)
            {
                if (contracts.Count >= 580) break; // cap
                var cp = ReferenceData.Counterparties[rng.Next(ReferenceData.Counterparties.Length)];
                var type = ReferenceData.ContractTypes[rng.Next(ReferenceData.ContractTypes.Length)];
                var effDate = m.OpenDate.AddDays(rng.Next(0, 60));
                if (effDate > asOf) effDate = m.OpenDate;
                var stage = WeightedPickContractStage(m.Status, rng);
                DateOnly? renewal = stage == ContractStage.Active || stage == ContractStage.RenewalDue
                    ? effDate.AddDays(rng.Next(180, 1100))
                    : null;
                if (renewal < asOf && renewal.HasValue && rng.NextDouble() < 0.6) renewal = asOf.AddDays(rng.Next(5, 55));  // ~15% due soon
                decimal value = type switch
                {
                    "MSA" => rng.Next(100_000, 2_500_000),
                    "SaaS Agreement" => rng.Next(25_000, 600_000),
                    "NDA" => 0,
                    "Distributor Agreement" => rng.Next(150_000, 1_800_000),
                    "Teaming Agreement" => rng.Next(50_000, 400_000),
                    "License Agreement" => rng.Next(75_000, 1_200_000),
                    _ => rng.Next(15_000, 350_000)
                };
                var stageEnteredAt = Utc(effDate.AddDays(rng.Next(0, Math.Max(1, (asOf.DayNumber - effDate.DayNumber) / Math.Max(1, (int)stage + 1)))));
                contracts.Add(new Contract
                {
                    ContractId = contractId++,
                    MatterId = m.MatterId,
                    Matter = m,
                    Title = $"{type} — {cp}",
                    ContractType = type,
                    Counterparty = cp,
                    Stage = stage,
                    EffectiveDate = effDate,
                    RenewalDate = renewal,
                    ValueAmount = value,
                    CreatedAt = Utc(effDate),
                    StageEnteredAt = stageEnteredAt
                });
            }
        }
        await db.Contracts.AddRangeAsync(contracts, ct);
        await db.SaveChangesAsync(ct);

        // ── Documents (~900, weighted by matter type; legal document types) ─
        var docFaker = new Faker();
        var docs = new List<Document>();
        long docId = 1;
        var folderTemplates = new (string Folder, string[] Mime)[]
        {
            ("/Contracts",           new[] { "application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }),
            ("/Pleadings",            new[] { "application/pdf" }),
            ("/Correspondence",       new[] { "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }),
            ("/Evidence",             new[] { "application/pdf", "image/png" }),
            ("/Billing",              new[] { "application/pdf", "application/vnd.ms-excel" }),
            ("/Memos",                new[] { "application/vnd.openxmlformats-officedocument.wordprocessingml.document" })
        };
        var contractDocTypeNames = new[] { "MSA", "NDA", "SaaS Agreement", "Service Agreement" };
        var matterDocTypeNames = new[] { "Complaint", "Motion", "Court Filing", "Deposition Transcript" };
        foreach (var m in matters)
        {
            int maxDocs = m.MatterType == MatterType.Litigation ? 8 : m.MatterType == MatterType.Contract ? 5 : 4;
            if (m.Status == MatterStatus.Rejected) maxDocs = m.MatterType == MatterType.Litigation ? 8 : 4;
            int nDocs;
            if (m.Status == MatterStatus.Intake)
                nDocs = rng.Next(0, 3);
            else
                nDocs = rng.Next(maxDocs / 2, maxDocs + 1);
            for (int k = 0; k < nDocs; k++)
            {
                if (docs.Count >= 900) break;
                var folderTpl = folderTemplates[m.MatterType == MatterType.Litigation ? rng.Next(0, 4) : (m.MatterType == MatterType.Contract ? 0 : rng.Next(2, folderTemplates.Length))];
                var mime = folderTpl.Mime[rng.Next(folderTpl.Mime.Length)];
                var ext = mime switch
                {
                    "application/pdf" => ".pdf",
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document" => ".docx",
                    "image/png" => ".png",
                    "application/vnd.ms-excel" => ".xlsx",
                    _ => ".pdf"
                };
                string fileName;
                DocumentType dtype;
                if (folderTpl.Folder == "/Contracts")
                {
                    var dt = contractDocTypeNames[rng.Next(contractDocTypeNames.Length)];
                    fileName = $"{dt}_{m.MatterNumber.Replace("MAT-", "MAT-")}_{k + 1}{ext}";
                    dtype = dt switch { "NDA" => DocumentType.Nda, "MSA" => DocumentType.Msa, "SaaS Agreement" => DocumentType.SaasAgreement, "Service Agreement" => DocumentType.ServiceAgreement, _ => DocumentType.Contract };
                }
                else if (folderTpl.Folder == "/Pleadings" || folderTpl.Folder == "/Evidence")
                {
                    var dt = matterDocTypeNames[rng.Next(matterDocTypeNames.Length)];
                    fileName = $"{dt.Replace(" ", "_")}_{m.MatterNumber}_{k + 1}{ext}";
                    dtype = dt switch { "Complaint" => DocumentType.Complaint, "Motion" => DocumentType.Motion, "Court Filing" => DocumentType.CourtFiling, _ => DocumentType.DepositionTranscript };
                }
                else
                {
                    var dt = new[] { "Memo", "Email", "Correspondence" }[rng.Next(3)];
                    fileName = $"{dt}_{m.MatterNumber}_{k + 1}{ext}";
                    dtype = dt == "Memo" ? DocumentType.Memo : dt == "Email" ? DocumentType.Email : DocumentType.Correspondence;
                }
                var contract = contracts.FirstOrDefault(c => c.MatterId == m.MatterId);
                docs.Add(new Document
                {
                    DocumentId = docId++,
                    MatterId = m.MatterId,
                    Matter = m,
                    ContractId = folderTpl.Folder == "/Contracts" && contract != null ? contract.ContractId : null,
                    Contract = folderTpl.Folder == "/Contracts" && contract != null ? contract : null,
                    FileName = fileName,
                    MimeType = mime,
                    FolderPath = $"{m.MatterNumber}{folderTpl.Folder}",
                    DocumentType = dtype,
                    Version = rng.Next(1, 4),
                    SizeBytes = mime == "application/pdf" ? rng.Next(80_000, 1_200_000) : rng.Next(20_000, 500_000),
                    UploadedByStaffId = m.ResponsibleStaffId,
                    UploadedBy = m.ResponsibleStaff,
                    CreatedAt = Utc(m.OpenDate.AddDays(rng.Next(0, 90)))
                });
            }
        }
        await db.Documents.AddRangeAsync(docs, ct);
        await db.SaveChangesAsync(ct);

        // ── Matter events (~2,500) ─ intake, assignments, status changes, document uploads ─
        var evts = new List<MatterEvent>();
        long evtId = 1;
        foreach (var m in matters)
        {
            evts.Add(NewEvent(ref evtId, m, MatterEventType.IntakeLogged, "Matter submitted for intake review.", m.OpenDate, m.ResponsibleStaff));
            if (m.Status != MatterStatus.Intake && m.Status != MatterStatus.Rejected)
                evts.Add(NewEvent(ref evtId, m, MatterEventType.StaffAssigned, $"Lead counsel assigned: {m.ResponsibleStaff.FullName}.", m.OpenDate.AddDays(rng.Next(1, 7)), m.ResponsibleStaff));
            evts.Add(NewEvent(ref evtId, m, MatterEventType.StatusChanged, $"Status changed to {m.Status}.", m.OpenDate.AddDays(rng.Next(7, 21)), m.ResponsibleStaff));
            if (m.Firm != null)
                evts.Add(NewEvent(ref evtId, m, MatterEventType.NoteAdded, $"Outside counsel engaged: {m.Firm.Name}.", m.OpenDate.AddDays(rng.Next(5, 14)), m.ResponsibleStaff));
            int extra = rng.Next(2, 8);
            for (int k = 0; k < extra; k++)
            {
                var dt = m.OpenDate.AddDays(rng.Next(14, 200));
                if (dt > asOf) dt = asOf.AddDays(-rng.Next(1, 30));
                var type = WeightedPick(new[] { (MatterEventType.DocumentUploaded, 25), (MatterEventType.NoteAdded, 20), (MatterEventType.ContractAdded, 15), (MatterEventType.StatusChanged, 10), (MatterEventType.ApprovalDecided, 10), (MatterEventType.FilingRecorded, 10), (MatterEventType.MatterClosed, 10) }, rng);
                evts.Add(NewEvent(ref evtId, m, type, GenerateEventDescription(type, m), dt, m.ResponsibleStaff));
            }
            if (m.Status == MatterStatus.Closed && m.CloseDate.HasValue)
                evts.Add(NewEvent(ref evtId, m, MatterEventType.MatterClosed, "Matter closed and archived.", m.CloseDate.Value, m.ResponsibleStaff));
        }
        // Cap ~2,500
        if (evts.Count > 2500) evts = evts.Take(2500).ToList();
        await db.MatterEvents.AddRangeAsync(evts, ct);
        await db.SaveChangesAsync(ct);

        // ── Deadlines (~600) ─ litigation-heavy; types and statuses anchored to asOf ─
        var deadlines = new List<Deadline>();
        long dId = 1;
        foreach (var m in matters.Where(x => x.Status != MatterStatus.Rejected && x.Status != MatterStatus.Intake).Take(200))
        {
            int nD = rng.Next(1, 5);
            for (int k = 0; k < nD && deadlines.Count < 600; k++)
            {
                var type = m.MatterType == MatterType.Litigation
                    ? WeightedPick(new[] { (DeadlineType.CourtDate, 25), (DeadlineType.FilingWindow, 18), (DeadlineType.Discovery, 15), (DeadlineType.Deposition, 12), (DeadlineType.Hearing, 12), (DeadlineType.MotionResponse, 10), (DeadlineType.StatuteOfLimitations, 8) }, rng)
                    : m.MatterType == MatterType.Contract
                        ? WeightedPick(new[] { (DeadlineType.Renewal, 40), (DeadlineType.Milestone, 25), (DeadlineType.FilingWindow, 10), (DeadlineType.MotionResponse, 10), (DeadlineType.Hearing, 5), (DeadlineType.Discovery, 10) }, rng)
                        : WeightedPick(new[] { (DeadlineType.Milestone, 40), (DeadlineType.FilingWindow, 20), (DeadlineType.Hearing, 15), (DeadlineType.Renewal, 10), (DeadlineType.Discovery, 15) }, rng);
                var due = m.OpenDate.AddDays(rng.Next(10, 365));
                // Push ~35% into the next 90 days (future) for the calendar/scheduler demo
                if (rng.NextDouble() < 0.35) due = asOf.AddDays(rng.Next(2, 120));
                var status = due < asOf
                    ? (rng.NextDouble() < 0.7 ? DeadlineStatus.Completed : DeadlineStatus.Overdue)
                    : due <= asOf.AddDays(14) ? DeadlineStatus.DueSoon : DeadlineStatus.Upcoming;
                if (status == DeadlineStatus.Overdue && m.Status == MatterStatus.Closed) status = DeadlineStatus.Waived;
                deadlines.Add(new Deadline
                {
                    DeadlineId = dId++,
                    MatterId = m.MatterId,
                    Matter = m,
                    ContractId = type == DeadlineType.Renewal && contracts.Any(c => c.MatterId == m.MatterId && c.RenewalDate.HasValue)
                        ? contracts.First(c => c.MatterId == m.MatterId && c.RenewalDate.HasValue).ContractId : null,
                    Title = BuildDeadlineTitle(type, m),
                    DeadlineType = type,
                    DueDate = due,
                    Status = status,
                    Jurisdiction = ReferenceData.Jurisdictions[rng.Next(ReferenceData.Jurisdictions.Length)],
                    OwnerStaffId = m.ResponsibleStaffId,
                    OwnerStaff = m.ResponsibleStaff,
                    CreatedAt = Utc(m.OpenDate)
                });
            }
        }
        await db.Deadlines.AddRangeAsync(deadlines, ct);
        await db.SaveChangesAsync(ct);

        // ── Invoices (~500) with line items (~4,000) ─ only for matters with firms ─
        var invoices = new List<Invoice>();
        var lineItems = new List<InvoiceLineItem>();
        long invId = 1;
        long liId = 1;
        var mattersWithFirms = matters.Where(m => m.FirmId.HasValue && m.Status != MatterStatus.Rejected).ToList();
        foreach (var m in mattersWithFirms)
        {
            // Target spend as a fraction of budget.
            var band = WeightedPick(new[] { ("under", 70), ("near", 20), ("over", 10) }, rng);
            double targetRatio = band switch
            {
                "under" => 0.35 + rng.NextDouble() * (0.80 - 0.35),
                "near" => 0.85 + rng.NextDouble() * (1.00 - 0.85),
                _ => 1.05 + rng.NextDouble() * (1.40 - 1.05),
            };

            // Buffer invoices so they can be scaled to the target ratio.
            var matterInvoices = new List<Invoice>();
            var matterLinesByInvoice = new List<List<InvoiceLineItem>>();

            int nInv = rng.Next(0, m.Status == MatterStatus.Closed ? 5 : 3);
            for (int k = 0; k < nInv && invoices.Count + matterInvoices.Count < 500; k++)
            {
                var firm = firms.First(f => f.FirmId == m.FirmId);
                var endDate = m.OpenDate.AddDays(rng.Next(20, 300));
                if (endDate > asOf) endDate = asOf.AddDays(-rng.Next(1, 30));
                var startDate = endDate.AddDays(-rng.Next(15, 45));
                int nLines = rng.Next(4, 14);
                var liList = new List<InvoiceLineItem>(nLines);
                for (int l = 0; l < nLines; l++)
                {
                    decimal? hours = l % 3 == 2 ? null : rng.Next(20, 100) / 10m;
                    decimal? rate = firm.DefaultRate + rng.Next(-50, 120);
                    decimal amount = hours.HasValue ? Math.Round(hours.Value * rate.Value, 2) : rng.Next(150, 900);
                    bool flagged = rng.NextDouble() < 0.12;
                    string? reason = flagged ? ReferenceData.FlagReasons[rng.Next(ReferenceData.FlagReasons.Length)] : null;
                    liList.Add(new InvoiceLineItem
                    {
                        LineItemId = liId++,
                        InvoiceId = invId,
                        TaskCode = taskCodes[rng.Next(taskCodes.Count)],
                        ActivityCode = activityCodes[rng.Next(activityCodes.Count)],
                        ExpenseCode = rng.NextDouble() < 0.15 ? expenseCodes[rng.Next(expenseCodes.Count)] : null,
                        Narrative = GenerateNarrative(m.MatterType, rng),
                        Hours = hours,
                        Rate = rate,
                        Amount = amount,
                        Flagged = flagged,
                        FlagReason = reason
                    });
                }
                var invStatus = m.Status == MatterStatus.Closed ? InvoiceStatus.Paid
                              : endDate < asOf.AddDays(-60) && rng.NextDouble() < 0.8 ? InvoiceStatus.Approved
                              : endDate < asOf.AddDays(-30) ? InvoiceStatus.UnderReview
                              : liList.Any(x => x.Flagged) && rng.NextDouble() < 0.5 ? InvoiceStatus.Flagged
                              : InvoiceStatus.Received;
                matterInvoices.Add(new Invoice
                {
                    InvoiceId = invId,
                    InvoiceNumber = $"INV-{endDate.Year}-{invId:D5}",
                    MatterId = m.MatterId,
                    Matter = m,
                    FirmId = firm.FirmId,
                    Firm = firm,
                    InvoiceDate = endDate,
                    PeriodStart = startDate,
                    PeriodEnd = endDate,
                    TotalAmount = 0m, // set after scaling below
                    Status = invStatus,
                    CreatedAt = Utc(endDate)
                });
                matterLinesByInvoice.Add(liList);
                invId++;
            }

            // Scale line amounts to the target spend ratio.
            var rawTotal = matterLinesByInvoice.SelectMany(x => x).Sum(x => x.Amount);
            if (rawTotal > 0m && m.BudgetAmount > 0m)
            {
                var factor = (decimal)targetRatio * m.BudgetAmount / rawTotal;
                foreach (var li in matterLinesByInvoice.SelectMany(x => x))
                {
                    li.Amount = Math.Round(li.Amount * factor, 2);
                    if (li.Rate.HasValue) li.Rate = Math.Round(li.Rate.Value * factor, 2);
                }
            }
            for (int k = 0; k < matterInvoices.Count; k++)
                matterInvoices[k].TotalAmount = matterLinesByInvoice[k].Sum(x => x.Amount);

            invoices.AddRange(matterInvoices);
            foreach (var l in matterLinesByInvoice) lineItems.AddRange(l);
            if (lineItems.Count >= 4000) break;
        }
        await db.Invoices.AddRangeAsync(invoices, ct);
        await db.InvoiceLineItems.AddRangeAsync(lineItems, ct);
        await db.SaveChangesAsync(ct);

        // ── Matter budgets (~1 per matter with budget > 0) ─ chronic per FY/phase ─
        var budgets = new List<MatterBudget>();
        long bId = 1;
        foreach (var m in matters.Where(x => x.Status != MatterStatus.Rejected))
        {
            var spent = invoices.Where(i => i.MatterId == m.MatterId).Sum(i => i.TotalAmount);
            var ptr = spent / m.BudgetAmount;
            // ~70% under, 20% near, 10% over
            // (norming our actual spend because amounts are generated independently)
            budgets.Add(new MatterBudget
            {
                BudgetId = bId++,
                MatterId = m.MatterId,
                Matter = m,
                Phase = m.MatterType == MatterType.Litigation ? "Pretrial" : m.MatterType == MatterType.Transaction ? "Diligence" : "Execution",
                BudgetAmount = m.BudgetAmount,
                SpentAmount = spent,
                Period = m.OpenDate.Year < asOf.Year ? $"FY{m.OpenDate.Year}" : m.OpenDate.Month <= 6 ? $"FY{asOf.Year}-H1" : $"FY{asOf.Year}-H2",
                CreatedAt = Utc(m.OpenDate)
            });
        }
        await db.MatterBudgets.AddRangeAsync(budgets, ct);
        await db.SaveChangesAsync(ct);

        // ── Approvals (~400) — invoice/contract/matter with thresholds & queues ─
        var approvals = new List<Approval>();
        long apId = 1;
        // Invoice approvals
        foreach (var inv in invoices.Take(220))
        {
            if (approvals.Count >= 400) break;
            var queue = inv.TotalAmount > 100_000 ? ApprovalQueue.BudgetOverrun : ApprovalQueue.InvoiceReview;
            var threshold = inv.TotalAmount > 100_000 ? 100_000m : (decimal?)null;
            var approver = staff.Where(s => s.Role == StaffRole.ManagingCounsel || s.Role == StaffRole.GeneralCounsel).ToList()[rng.Next(2)];
            var status = inv.Status == InvoiceStatus.Paid ? ApprovalStatus.Approved
                       : inv.Status == InvoiceStatus.Rejected ? ApprovalStatus.Rejected
                       : inv.Status == InvoiceStatus.Flagged ? ApprovalStatus.Escalated
                       : inv.Status == InvoiceStatus.Approved ? ApprovalStatus.Approved
                       : ApprovalStatus.Pending;
            approvals.Add(new Approval
            {
                ApprovalId = apId++,
                SubjectType = ApprovalSubjectType.Invoice,
                SubjectId = inv.InvoiceNumber,
                SubjectTitle = $"Invoice {inv.InvoiceNumber} — {inv.Firm.Name}",
                Queue = queue,
                Status = status,
                ApproverStaffId = status != ApprovalStatus.Pending ? approver.StaffId : null,
                ApproverStaff = status != ApprovalStatus.Pending ? approver : null,
                ThresholdAmount = threshold,
                MatterNumberRef = inv.Matter.MatterNumber,
                RequestedAt = Utc(inv.InvoiceDate),
                DecidedAt = status != ApprovalStatus.Pending ? Utc(inv.InvoiceDate.AddDays(rng.Next(1, 10))) : null
            });
        }
        // Contract approvals
        foreach (var c in contracts.Where(c => c.Stage == ContractStage.PendingApproval || c.Stage == ContractStage.Executed || c.Stage == ContractStage.Active).Take(110))
        {
            if (approvals.Count >= 400) break;
            var approver = staff.Where(s => s.Role == StaffRole.ManagingCounsel || s.Role == StaffRole.GeneralCounsel).ToList()[rng.Next(2)];
            var status = c.Stage == ContractStage.Executed || c.Stage == ContractStage.Active ? ApprovalStatus.Approved : ApprovalStatus.Pending;
            approvals.Add(new Approval
            {
                ApprovalId = apId++,
                SubjectType = ApprovalSubjectType.Contract,
                SubjectId = $"CON-{c.ContractId:D5}",
                SubjectTitle = c.Title,
                Queue = ApprovalQueue.ContractExecution,
                Status = status,
                ApproverStaffId = status != ApprovalStatus.Pending ? approver.StaffId : null,
                ApproverStaff = status != ApprovalStatus.Pending ? approver : null,
                ThresholdAmount = c.ValueAmount > 500_000 ? 500_000m : null,
                MatterNumberRef = c.Matter.MatterNumber,
                RequestedAt = c.CreatedAt,
                DecidedAt = status != ApprovalStatus.Pending ? c.CreatedAt.AddDays(rng.Next(1, 14)) : null
            });
        }
        // Matter intake approvals (Triage/Active/Closed/Rejected)
        foreach (var m in matters.Where(x => x.Status == MatterStatus.Triage || x.Status == MatterStatus.Active || x.Status == MatterStatus.Closed).Take(70))
        {
            if (approvals.Count >= 400) break;
            var approver = staff.First(s => s.Role == StaffRole.GeneralCounsel);
            var status = m.Status == MatterStatus.Active || m.Status == MatterStatus.Closed ? ApprovalStatus.Approved : ApprovalStatus.Pending;
            approvals.Add(new Approval
            {
                ApprovalId = apId++,
                SubjectType = ApprovalSubjectType.Matter,
                SubjectId = m.MatterNumber,
                SubjectTitle = m.Title,
                Queue = ApprovalQueue.MatterIntake,
                Status = status,
                ApproverStaffId = status != ApprovalStatus.Pending ? approver.StaffId : null,
                ApproverStaff = status != ApprovalStatus.Pending ? approver : null,
                ThresholdAmount = m.BudgetAmount > 200_000 ? 200_000m : null,
                MatterNumberRef = m.MatterNumber,
                RequestedAt = m.CreatedAt,
                DecidedAt = status != ApprovalStatus.Pending ? m.CreatedAt.AddDays(rng.Next(1, 5)) : null
            });
        }
        await db.Approvals.AddRangeAsync(approvals, ct);
        await db.SaveChangesAsync(ct);

        // ── Time entries (~3,000) ─ for staff & matters ─
        var te = new List<TimeEntry>();
        long teId = 1;
        var billableStaff = staff.Where(s => s.Role != StaffRole.LegalOps && s.Role != StaffRole.ContractAnalyst && (s.Active || s.Role == StaffRole.Counsel)).ToList();
        foreach (var m in matters.Where(x => x.Status == MatterStatus.Active || x.Status == MatterStatus.Closing || x.Status == MatterStatus.OnHold).Take(120))
        {
            int nTe = rng.Next(8, 28);
            for (int k = 0; k < nTe && te.Count < 3000; k++)
            {
                var person = billableStaff[rng.Next(billableStaff.Count)];
                var entryDate = m.OpenDate.AddDays(rng.Next(7, 200));
                if (entryDate > asOf) entryDate = asOf.AddDays(-rng.Next(1, 30));
                te.Add(new TimeEntry
                {
                    TimeEntryId = teId++,
                    MatterId = m.MatterId,
                    Matter = m,
                    StaffId = person.StaffId,
                    Staff = person,
                    TaskCode = taskCodes[rng.Next(taskCodes.Count)],
                    Hours = rng.Next(5, 40) / 10m,
                    EntryDate = entryDate,
                    Narrative = GenerateNarrative(m.MatterType, rng)
                });
            }
        }
        await db.TimeEntries.AddRangeAsync(te, ct);
        await db.SaveChangesAsync(ct);
    }

    // ── Helpers ─────────────────────────────────────────────────────

    // Seed timestamps as UTC.
    private static DateTime Utc(DateTime dt) => DateTime.SpecifyKind(dt, DateTimeKind.Utc);
    private static DateTime Utc(DateOnly d) => Utc(d.ToDateTime(TimeOnly.MinValue));

    private static T WeightedPick<T>(IEnumerable<(T Value, int Weight)> items, Random rng)
    {
        var list = items.ToList();
        int total = list.Sum(x => x.Weight);
        double r = rng.NextDouble() * total;
        double acc = 0;
        foreach (var (val, w) in list) { acc += w; if (r <= acc) return val; }
        return list[^1].Value;
    }

    private static ContractStage WeightedPickContractStage(MatterStatus matterStatus, Random rng)
    {
        if (matterStatus == MatterStatus.Closed) return WeightedPick(new[] { (ContractStage.Executed, 35), (ContractStage.Active, 35), (ContractStage.Expired, 15), (ContractStage.Terminated, 15) }, rng);
        if (matterStatus == MatterStatus.Rejected) return ContractStage.Draft;
        // ~15% renewal due within 60 days
        if (rng.NextDouble() < 0.15) return ContractStage.RenewalDue;
        return WeightedPick(new[] { (ContractStage.Draft, 18), (ContractStage.InReview, 18), (ContractStage.InNegotiation, 22), (ContractStage.PendingApproval, 14), (ContractStage.Executed, 14), (ContractStage.Active, 14) }, rng);
    }

    private static string BuildMatterTitle(MatterType type, string client, string counterparty, int idx) => type switch
    {
        MatterType.Litigation => $"{client.Split(' ')[0]} v. {counterparty.Split(' ')[0]} (No. {(2025 + (idx % 2))}-{(idx % 9000) + 1000})",
        MatterType.Advisory => $"{client.Split(' ')[0]} — {counterparty.Split(' ')[0]} Advisory",
        MatterType.Transaction => $"{client.Split(' ')[0]} — {counterparty.Split(' ')[0]} Deal",
        MatterType.Investigation => $"{client.Split(' ')[0]} — {counterparty.Split(' ')[0]} Inquiry",
        _ => $"{counterparty} {ReferenceData.ContractTypes[idx % ReferenceData.ContractTypes.Length]} — {client.Split(' ')[0]}"
    };

    private static string BuildMatterDescription(MatterType type, string client, string counterparty, string area) =>
        $"{type} matter in the {area} practice area for {client}; {(type == MatterType.Litigation ? $"adverse party {counterparty}" : $"counterparty {counterparty}")}. Illustrative showcase record.";

    private static string BuildDeadlineTitle(DeadlineType type, Matter m) => type switch
    {
        DeadlineType.CourtDate => $"Court appearance — {m.Title}",
        DeadlineType.FilingWindow => $"Filing window — {m.Title}",
        DeadlineType.StatuteOfLimitations => $"SOL — {m.Title}",
        DeadlineType.Renewal => $"Contract renewal — {m.Title}",
        DeadlineType.Discovery => $"Discovery cutoff — {m.Title}",
        DeadlineType.Deposition => $"Deposition — {m.Title}",
        DeadlineType.MotionResponse => $"Motion response due — {m.Title}",
        DeadlineType.Hearing => $"Hearing — {m.Title}",
        _ => $"Milestone — {m.Title}"
    };

    private static string GenerateEventDescription(MatterEventType type, Matter m) => type switch
    {
        MatterEventType.DocumentUploaded => $"Document uploaded to {m.MatterNumber} repository.",
        MatterEventType.NoteAdded => $"Internal note added to {m.MatterNumber}.",
        MatterEventType.ContractAdded => $"Contract added under {m.MatterNumber}.",
        MatterEventType.StatusChanged => $"Workflow status updated for {m.MatterNumber}.",
        MatterEventType.ApprovalRequested => $"Approval requested for an item under {m.MatterNumber}.",
        MatterEventType.ApprovalDecided => $"Approval decision logged for {m.MatterNumber}.",
        MatterEventType.FilingRecorded => $"Filing recorded with the court for {m.MatterNumber}.",
        MatterEventType.MatterClosed => $"Matter {m.MatterNumber} resolved and archived.",
        _ => $"Activity recorded on {m.MatterNumber}."
    };

    private static string GenerateNarrative(MatterType type, Random rng) => type switch
    {
        MatterType.Litigation => LitigationNarratives[rng.Next(LitigationNarratives.Length)],
        MatterType.Contract => ContractNarratives[rng.Next(ContractNarratives.Length)],
        _ => AdvisoryNarratives[rng.Next(AdvisoryNarratives.Length)]
    };

    private static readonly string[] LitigationNarratives =
    {
        "Review and analyse subpoenaed records",
        "Draft motion to dismiss",
        "Conference with opposing counsel",
        "Prepare deposition outline",
        "Analyse expert reports",
        "Drafting pleadings"
    };
    private static readonly string[] ContractNarratives =
    {
        "Review and analysis of indemnification provisions",
        "Negotiation of limitation of liability clause",
        "Drafting of service-level schedules",
        "Contract redline exchange with counterparty",
        "Bundling of contract exhibits"
    };
    private static readonly string[] AdvisoryNarratives =
    {
        "Strategy review with client",
        "Regulatory research",
        "Risk assessment memorandum",
        "Stakeholder review meeting",
        "Drafting of advisory memorandum"
    };

    private static MatterEvent NewEvent(ref long id, Matter m, MatterEventType t, string desc, DateOnly date, Staff? actor) =>
        new()
        {
            EventId = id++,
            MatterId = m.MatterId,
            Matter = m,
            EventType = t,
            Description = desc,
            EventDate = date,
            ActorStaffId = actor?.StaffId,
            ActorStaff = actor,
            CreatedAt = Utc(date)
        };

    private static string StaffEmail(string fullName, int idx)
    {
        var parts = fullName.ToLower().Split(' ');
        return $"{parts[0]}.{parts[^1]}@spherelegal.example.com";
    }

    // ── Explicit name pools for client contacts to control gender ───
    private static class NameFaker
    {
        public static string Internal(int i) => (i % 2 == 0) switch
        {
            true => MaleInternal[i / 2 % MaleInternal.Length],
            false => FemaleInternal[i / 2 % FemaleInternal.Length]
        };
        public static string External(int i) => (i % 2 == 0) switch
        {
            true => MaleExternal[i / 2 % MaleExternal.Length],
            false => FemaleExternal[i / 2 % FemaleExternal.Length]
        };

        private static readonly string[] MaleInternal =
        {
            "Robert Hayes", "David Greenwood", "Marcus Bellamy", "Steven Hwang", "Patrick O'Sullivan", "Lee Carmichael", "Gregory Woodward", "Vincent Marchand"
        };
        private static readonly string[] FemaleInternal =
        {
            "Rachel Bauer", "Monica Espinoza", "Helen Castellan", "Sarah Whitcombe", "Diane Sorenson", "Veronica Park", "Janine Aubrey", "Theresa Lindqvist"
        };
        private static readonly string[] MaleExternal =
        {
            "Howard Banks", "Gerald Mancini", "Caleb Strickland", "Raymond Olusegun", "Stanley Reed", "Victor Andersson"
        };
        private static readonly string[] FemaleExternal =
        {
            "Carla Esposito", "Denise Rutherford", "Yvonne Taggart", "Madeleine Côté", "Beverly Holt", "Lucia Vargas"
        };
    }
}
