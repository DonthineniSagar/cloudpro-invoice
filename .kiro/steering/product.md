# Product Context

## What is CloudPro Invoice?
A modern invoicing platform for NZ freelancers and small businesses. Create tax invoices, track expenses, manage clients, and get paid faster.

## Target Users
- NZ freelancers and contractors
- Small business owners
- Sole traders needing GST-compliant invoicing

## Key Business Rules
- All monetary amounts are in NZD unless specified
- GST rate is 15% (NZ standard)
- Invoice numbers follow format: INV-YYMM-XXX (auto-generated)
- Status workflow: DRAFT → SENT → PAID / OVERDUE / CANCELLED
- Paid/Cancelled invoices are locked from editing
- PDF must be generated before an invoice can be emailed
- S3 storage is owner-scoped via Cognito identity ID
- SES sender address is server-controlled (no client spoofing)
- Financial year runs April 1 – March 31 (NZ)

## Launch Status
- Launched April 1, 2026
- MVP complete, Phase 2 features in progress (recurring invoices, overdue automation)
