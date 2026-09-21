using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace LegalMatterContractPortal.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "client",
                columns: table => new
                {
                    ClientId = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Type = table.Column<int>(type: "integer", nullable: false),
                    Industry = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    PrimaryContact = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    ContactEmail = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_client", x => x.ClientId);
                });

            migrationBuilder.CreateTable(
                name: "law_firm",
                columns: table => new
                {
                    FirmId = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Tier = table.Column<int>(type: "integer", nullable: false),
                    DefaultRate = table.Column<decimal>(type: "numeric", nullable: false),
                    City = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    State = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    PracticeFocus = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_law_firm", x => x.FirmId);
                });

            migrationBuilder.CreateTable(
                name: "practice_area",
                columns: table => new
                {
                    PracticeAreaId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    Description = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_practice_area", x => x.PracticeAreaId);
                });

            migrationBuilder.CreateTable(
                name: "staff",
                columns: table => new
                {
                    StaffId = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    FullName = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Role = table.Column<int>(type: "integer", nullable: false),
                    Email = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    BarJurisdiction = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: true),
                    Active = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_staff", x => x.StaffId);
                });

            migrationBuilder.CreateTable(
                name: "utbms_code",
                columns: table => new
                {
                    Code = table.Column<string>(type: "character varying(6)", maxLength: 6, nullable: false),
                    CodeType = table.Column<int>(type: "integer", nullable: false),
                    Description = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    PracticeArea = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_utbms_code", x => x.Code);
                });

            migrationBuilder.CreateTable(
                name: "approval",
                columns: table => new
                {
                    ApprovalId = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    SubjectType = table.Column<int>(type: "integer", nullable: false),
                    SubjectId = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    SubjectTitle = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    Queue = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    ApproverStaffId = table.Column<long>(type: "bigint", nullable: true),
                    ThresholdAmount = table.Column<decimal>(type: "numeric(14,2)", precision: 14, scale: 2, nullable: true),
                    MatterNumberRef = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    RequestedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    DecidedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_approval", x => x.ApprovalId);
                    table.ForeignKey(
                        name: "FK_approval_staff_ApproverStaffId",
                        column: x => x.ApproverStaffId,
                        principalTable: "staff",
                        principalColumn: "StaffId",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "matter",
                columns: table => new
                {
                    MatterId = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    MatterNumber = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    ClientId = table.Column<long>(type: "bigint", nullable: false),
                    PracticeAreaId = table.Column<int>(type: "integer", nullable: false),
                    MatterType = table.Column<int>(type: "integer", nullable: false),
                    ResponsibleStaffId = table.Column<long>(type: "bigint", nullable: false),
                    FirmId = table.Column<long>(type: "bigint", nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    RiskLevel = table.Column<int>(type: "integer", nullable: false),
                    OpenDate = table.Column<DateOnly>(type: "date", nullable: false),
                    CloseDate = table.Column<DateOnly>(type: "date", nullable: true),
                    BudgetAmount = table.Column<decimal>(type: "numeric(14,2)", precision: 14, scale: 2, nullable: false),
                    Description = table.Column<string>(type: "character varying(400)", maxLength: 400, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_matter", x => x.MatterId);
                    table.ForeignKey(
                        name: "FK_matter_client_ClientId",
                        column: x => x.ClientId,
                        principalTable: "client",
                        principalColumn: "ClientId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_matter_law_firm_FirmId",
                        column: x => x.FirmId,
                        principalTable: "law_firm",
                        principalColumn: "FirmId",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_matter_practice_area_PracticeAreaId",
                        column: x => x.PracticeAreaId,
                        principalTable: "practice_area",
                        principalColumn: "PracticeAreaId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_matter_staff_ResponsibleStaffId",
                        column: x => x.ResponsibleStaffId,
                        principalTable: "staff",
                        principalColumn: "StaffId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "contract",
                columns: table => new
                {
                    ContractId = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    MatterId = table.Column<long>(type: "bigint", nullable: false),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    ContractType = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    Counterparty = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Stage = table.Column<int>(type: "integer", nullable: false),
                    EffectiveDate = table.Column<DateOnly>(type: "date", nullable: false),
                    RenewalDate = table.Column<DateOnly>(type: "date", nullable: true),
                    ValueAmount = table.Column<decimal>(type: "numeric(14,2)", precision: 14, scale: 2, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_contract", x => x.ContractId);
                    table.ForeignKey(
                        name: "FK_contract_matter_MatterId",
                        column: x => x.MatterId,
                        principalTable: "matter",
                        principalColumn: "MatterId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "invoice",
                columns: table => new
                {
                    InvoiceId = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    InvoiceNumber = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    MatterId = table.Column<long>(type: "bigint", nullable: false),
                    FirmId = table.Column<long>(type: "bigint", nullable: false),
                    InvoiceDate = table.Column<DateOnly>(type: "date", nullable: false),
                    PeriodStart = table.Column<DateOnly>(type: "date", nullable: false),
                    PeriodEnd = table.Column<DateOnly>(type: "date", nullable: false),
                    TotalAmount = table.Column<decimal>(type: "numeric(14,2)", precision: 14, scale: 2, nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_invoice", x => x.InvoiceId);
                    table.ForeignKey(
                        name: "FK_invoice_law_firm_FirmId",
                        column: x => x.FirmId,
                        principalTable: "law_firm",
                        principalColumn: "FirmId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_invoice_matter_MatterId",
                        column: x => x.MatterId,
                        principalTable: "matter",
                        principalColumn: "MatterId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "matter_budget",
                columns: table => new
                {
                    BudgetId = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    MatterId = table.Column<long>(type: "bigint", nullable: false),
                    Phase = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    BudgetAmount = table.Column<decimal>(type: "numeric(14,2)", precision: 14, scale: 2, nullable: false),
                    SpentAmount = table.Column<decimal>(type: "numeric(14,2)", precision: 14, scale: 2, nullable: false),
                    Period = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_matter_budget", x => x.BudgetId);
                    table.ForeignKey(
                        name: "FK_matter_budget_matter_MatterId",
                        column: x => x.MatterId,
                        principalTable: "matter",
                        principalColumn: "MatterId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "matter_event",
                columns: table => new
                {
                    EventId = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    MatterId = table.Column<long>(type: "bigint", nullable: false),
                    EventType = table.Column<int>(type: "integer", nullable: false),
                    Description = table.Column<string>(type: "character varying(400)", maxLength: 400, nullable: false),
                    EventDate = table.Column<DateOnly>(type: "date", nullable: false),
                    ActorStaffId = table.Column<long>(type: "bigint", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_matter_event", x => x.EventId);
                    table.ForeignKey(
                        name: "FK_matter_event_matter_MatterId",
                        column: x => x.MatterId,
                        principalTable: "matter",
                        principalColumn: "MatterId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_matter_event_staff_ActorStaffId",
                        column: x => x.ActorStaffId,
                        principalTable: "staff",
                        principalColumn: "StaffId",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "time_entry",
                columns: table => new
                {
                    TimeEntryId = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    MatterId = table.Column<long>(type: "bigint", nullable: false),
                    StaffId = table.Column<long>(type: "bigint", nullable: false),
                    TaskCode = table.Column<string>(type: "character varying(6)", maxLength: 6, nullable: true),
                    Hours = table.Column<decimal>(type: "numeric(6,2)", precision: 6, scale: 2, nullable: false),
                    EntryDate = table.Column<DateOnly>(type: "date", nullable: false),
                    Narrative = table.Column<string>(type: "character varying(400)", maxLength: 400, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_time_entry", x => x.TimeEntryId);
                    table.ForeignKey(
                        name: "FK_time_entry_matter_MatterId",
                        column: x => x.MatterId,
                        principalTable: "matter",
                        principalColumn: "MatterId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_time_entry_staff_StaffId",
                        column: x => x.StaffId,
                        principalTable: "staff",
                        principalColumn: "StaffId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "deadline",
                columns: table => new
                {
                    DeadlineId = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    MatterId = table.Column<long>(type: "bigint", nullable: false),
                    ContractId = table.Column<long>(type: "bigint", nullable: true),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    DeadlineType = table.Column<int>(type: "integer", nullable: false),
                    DueDate = table.Column<DateOnly>(type: "date", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    Jurisdiction = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    OwnerStaffId = table.Column<long>(type: "bigint", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_deadline", x => x.DeadlineId);
                    table.ForeignKey(
                        name: "FK_deadline_contract_ContractId",
                        column: x => x.ContractId,
                        principalTable: "contract",
                        principalColumn: "ContractId",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_deadline_matter_MatterId",
                        column: x => x.MatterId,
                        principalTable: "matter",
                        principalColumn: "MatterId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_deadline_staff_OwnerStaffId",
                        column: x => x.OwnerStaffId,
                        principalTable: "staff",
                        principalColumn: "StaffId",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "document",
                columns: table => new
                {
                    DocumentId = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    MatterId = table.Column<long>(type: "bigint", nullable: false),
                    ContractId = table.Column<long>(type: "bigint", nullable: true),
                    FileName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    MimeType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    FolderPath = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    DocumentType = table.Column<int>(type: "integer", nullable: false),
                    Version = table.Column<int>(type: "integer", nullable: false),
                    SizeBytes = table.Column<long>(type: "bigint", nullable: false),
                    UploadedByStaffId = table.Column<long>(type: "bigint", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_document", x => x.DocumentId);
                    table.ForeignKey(
                        name: "FK_document_contract_ContractId",
                        column: x => x.ContractId,
                        principalTable: "contract",
                        principalColumn: "ContractId",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_document_matter_MatterId",
                        column: x => x.MatterId,
                        principalTable: "matter",
                        principalColumn: "MatterId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_document_staff_UploadedByStaffId",
                        column: x => x.UploadedByStaffId,
                        principalTable: "staff",
                        principalColumn: "StaffId",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "invoice_line_item",
                columns: table => new
                {
                    LineItemId = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    InvoiceId = table.Column<long>(type: "bigint", nullable: false),
                    TaskCode = table.Column<string>(type: "character varying(6)", maxLength: 6, nullable: true),
                    ActivityCode = table.Column<string>(type: "character varying(6)", maxLength: 6, nullable: true),
                    ExpenseCode = table.Column<string>(type: "character varying(6)", maxLength: 6, nullable: true),
                    Narrative = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Hours = table.Column<decimal>(type: "numeric(6,2)", precision: 6, scale: 2, nullable: true),
                    Rate = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: true),
                    Amount = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    Flagged = table.Column<bool>(type: "boolean", nullable: false),
                    FlagReason = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_invoice_line_item", x => x.LineItemId);
                    table.ForeignKey(
                        name: "FK_invoice_line_item_invoice_InvoiceId",
                        column: x => x.InvoiceId,
                        principalTable: "invoice",
                        principalColumn: "InvoiceId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_approval_ApproverStaffId",
                table: "approval",
                column: "ApproverStaffId");

            migrationBuilder.CreateIndex(
                name: "IX_approval_Queue_Status",
                table: "approval",
                columns: new[] { "Queue", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_approval_SubjectType_SubjectId",
                table: "approval",
                columns: new[] { "SubjectType", "SubjectId" });

            migrationBuilder.CreateIndex(
                name: "IX_client_Name",
                table: "client",
                column: "Name");

            migrationBuilder.CreateIndex(
                name: "IX_contract_MatterId",
                table: "contract",
                column: "MatterId");

            migrationBuilder.CreateIndex(
                name: "IX_contract_RenewalDate",
                table: "contract",
                column: "RenewalDate");

            migrationBuilder.CreateIndex(
                name: "IX_contract_Stage",
                table: "contract",
                column: "Stage");

            migrationBuilder.CreateIndex(
                name: "IX_deadline_ContractId",
                table: "deadline",
                column: "ContractId");

            migrationBuilder.CreateIndex(
                name: "IX_deadline_DueDate",
                table: "deadline",
                column: "DueDate");

            migrationBuilder.CreateIndex(
                name: "IX_deadline_MatterId",
                table: "deadline",
                column: "MatterId");

            migrationBuilder.CreateIndex(
                name: "IX_deadline_OwnerStaffId",
                table: "deadline",
                column: "OwnerStaffId");

            migrationBuilder.CreateIndex(
                name: "IX_deadline_Status",
                table: "deadline",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_document_ContractId",
                table: "document",
                column: "ContractId");

            migrationBuilder.CreateIndex(
                name: "IX_document_FolderPath",
                table: "document",
                column: "FolderPath");

            migrationBuilder.CreateIndex(
                name: "IX_document_MatterId",
                table: "document",
                column: "MatterId");

            migrationBuilder.CreateIndex(
                name: "IX_document_UploadedByStaffId",
                table: "document",
                column: "UploadedByStaffId");

            migrationBuilder.CreateIndex(
                name: "IX_invoice_FirmId",
                table: "invoice",
                column: "FirmId");

            migrationBuilder.CreateIndex(
                name: "IX_invoice_InvoiceDate",
                table: "invoice",
                column: "InvoiceDate");

            migrationBuilder.CreateIndex(
                name: "IX_invoice_InvoiceNumber",
                table: "invoice",
                column: "InvoiceNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_invoice_MatterId",
                table: "invoice",
                column: "MatterId");

            migrationBuilder.CreateIndex(
                name: "IX_invoice_Status",
                table: "invoice",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_invoice_line_item_Flagged",
                table: "invoice_line_item",
                column: "Flagged");

            migrationBuilder.CreateIndex(
                name: "IX_invoice_line_item_InvoiceId",
                table: "invoice_line_item",
                column: "InvoiceId");

            migrationBuilder.CreateIndex(
                name: "IX_law_firm_Name",
                table: "law_firm",
                column: "Name");

            migrationBuilder.CreateIndex(
                name: "IX_matter_ClientId",
                table: "matter",
                column: "ClientId");

            migrationBuilder.CreateIndex(
                name: "IX_matter_FirmId",
                table: "matter",
                column: "FirmId");

            migrationBuilder.CreateIndex(
                name: "IX_matter_MatterNumber",
                table: "matter",
                column: "MatterNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_matter_OpenDate",
                table: "matter",
                column: "OpenDate");

            migrationBuilder.CreateIndex(
                name: "IX_matter_PracticeAreaId",
                table: "matter",
                column: "PracticeAreaId");

            migrationBuilder.CreateIndex(
                name: "IX_matter_ResponsibleStaffId",
                table: "matter",
                column: "ResponsibleStaffId");

            migrationBuilder.CreateIndex(
                name: "IX_matter_Status",
                table: "matter",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_matter_budget_MatterId",
                table: "matter_budget",
                column: "MatterId");

            migrationBuilder.CreateIndex(
                name: "IX_matter_event_ActorStaffId",
                table: "matter_event",
                column: "ActorStaffId");

            migrationBuilder.CreateIndex(
                name: "IX_matter_event_MatterId_EventDate",
                table: "matter_event",
                columns: new[] { "MatterId", "EventDate" });

            migrationBuilder.CreateIndex(
                name: "IX_staff_FullName",
                table: "staff",
                column: "FullName");

            migrationBuilder.CreateIndex(
                name: "IX_time_entry_MatterId",
                table: "time_entry",
                column: "MatterId");

            migrationBuilder.CreateIndex(
                name: "IX_time_entry_StaffId",
                table: "time_entry",
                column: "StaffId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "approval");

            migrationBuilder.DropTable(
                name: "deadline");

            migrationBuilder.DropTable(
                name: "document");

            migrationBuilder.DropTable(
                name: "invoice_line_item");

            migrationBuilder.DropTable(
                name: "matter_budget");

            migrationBuilder.DropTable(
                name: "matter_event");

            migrationBuilder.DropTable(
                name: "time_entry");

            migrationBuilder.DropTable(
                name: "utbms_code");

            migrationBuilder.DropTable(
                name: "contract");

            migrationBuilder.DropTable(
                name: "invoice");

            migrationBuilder.DropTable(
                name: "matter");

            migrationBuilder.DropTable(
                name: "client");

            migrationBuilder.DropTable(
                name: "law_firm");

            migrationBuilder.DropTable(
                name: "practice_area");

            migrationBuilder.DropTable(
                name: "staff");
        }
    }
}
