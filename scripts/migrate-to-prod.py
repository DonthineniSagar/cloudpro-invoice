#!/usr/bin/env python3
"""
Migrate legacy CloudPro invoice-generator data to new CloudPro Invoice prod.

Handles:
- DynamoDB: Clients, Invoices, InvoiceItems, Expenses (field remapping)
- S3: Receipts + Invoice PDFs (path remapping from public/ prefix)
- Backfills companyName on invoices, maps DRAFT→PENDING for expenses

Usage:
  export AWS_PROFILE=314485284702_admins AWS_REGION=ap-southeast-2

  # Dry run
  python3 scripts/migrate-to-prod.py --dry-run

  # Full migration (after prod is deployed)
  python3 scripts/migrate-to-prod.py --target-suffix <NEW_SUFFIX>-NONE --target-bucket <NEW_BUCKET>
"""
import boto3
import argparse
import sys
from decimal import Decimal
from collections import Counter

REGION = 'ap-southeast-2'

# Legacy source
LEGACY_SUFFIX = 'gpvtefxrxvgbbj2kqzt5ri7x5e-NONE'
LEGACY_S3_BUCKET = 'amplify-d3iwgp9cgcxnmn-ma-invoicepdfstoragebucket7-uswjp22ai0zd'
LEGACY_USER_ID = 'c93e3468-4091-70f6-5b3c-2a78041a97f5'

# New prod user ID (from Cognito signup)
NEW_USER_ID = '89fea478-1011-70d2-ac64-d87dda85a7fa'

# Company details to backfill on invoices (set after CompanyProfile is created)
COMPANY_BACKFILL = {
    'companyName': 'CloudPro Digital Limited',
    'companyEmail': '',
    'companyPhone': '',
    'companyAddress': '',
    'gstNumber': '',
    'bankAccount': '',
}

# Legacy irdCategory → new IRD-aligned category mapping
CATEGORY_MAP = {
    'ENTERTAINMENT': 'Entertainment (50% deductible)',
    'TRAVEL': 'Travel & Accommodation',
    'TRAVEL_ACCOMMODATION': 'Travel & Accommodation',
    'OFFICE': 'Office Expenses',
    'SOFTWARE': 'Software & Subscriptions',
    'EQUIPMENT': 'Depreciation',
    'MARKETING': 'Advertising & Marketing',
    'UTILITIES': 'Communication (Phone & Internet)',
    'TELEPHONE': 'Communication (Phone & Internet)',
    'VEHICLE': 'Motor Vehicle',
    'MOTOR_VEHICLE': 'Motor Vehicle',
    'GENERAL_EXPENSES': 'General & Administrative',
    'INSURANCE': 'Insurance',
}

dynamodb = boto3.resource('dynamodb', region_name=REGION)
s3 = boto3.client('s3', region_name=REGION)


# ── Helpers ──

def scan_all(table_name):
    table = dynamodb.Table(table_name)
    items, resp = [], table.scan()
    items.extend(resp['Items'])
    while 'LastEvaluatedKey' in resp:
        resp = table.scan(ExclusiveStartKey=resp['LastEvaluatedKey'])
        items.extend(resp['Items'])
    return items

def put_items(table_name, items, dry_run=False):
    if dry_run:
        return len(items)
    table = dynamodb.Table(table_name)
    for item in items:
        table.put_item(Item=item)
    return len(items)

def remap_s3_path(old_path):
    """Remap legacy S3 paths to new format.
    Legacy:  public/receipts/{userId}/file.jpg  OR  public/users/{userId}/invoices/file.pdf
    New:     receipts/{identityId}/file.jpg     OR  invoices/{identityId}/file.pdf
    """
    if not old_path:
        return old_path
    # Strip public/ prefix
    path = old_path.replace('public/', '', 1)
    # Remap users/{id}/invoices/file → invoices/{id}/file
    path = path.replace(f'users/{LEGACY_USER_ID}/invoices/', f'invoices/{LEGACY_USER_ID}/')
    return path

def remap_owner(item):
    """Remap legacy userId and owner fields to new prod user."""
    if item.get('userId') == LEGACY_USER_ID:
        item['userId'] = NEW_USER_ID
    owner = item.get('owner', '')
    if LEGACY_USER_ID in str(owner):
        item['owner'] = f'{NEW_USER_ID}::{NEW_USER_ID}'
    return item


# ── Table Migrations ──

def migrate_clients(src, tgt, dry_run):
    items = scan_all(f'Client-{src}')
    for item in items:
        remap_owner(item)
        for f in ['clientType', 'website']:
            item.pop(f, None)
    count = put_items(f'Client-{tgt}', items, dry_run)
    print(f'  Clients: {count}')

def migrate_invoices(src, tgt, dry_run):
    items = scan_all(f'Invoice-{src}')
    inv_ids = set()
    for item in items:
        inv_ids.add(item['id'])
        remap_owner(item)
        # Remap legacy field names
        if 'taxRate' in item:
            item['gstRate'] = item.pop('taxRate')
        if 'taxAmount' in item:
            item['gstAmount'] = item.pop('taxAmount')
        if 'terms' in item:
            item['paymentTerms'] = item.pop('terms')
        # Backfill company snapshot
        for k, v in COMPANY_BACKFILL.items():
            item.setdefault(k, v)
        # Set defaults for new fields
        item.setdefault('currency', 'NZD')
        item.setdefault('gstRate', Decimal('15'))
        item.setdefault('portalToken', None)
        item.setdefault('lastReminderSent', None)
        item.setdefault('reminderCount', 0)
        # Remap PDF S3 path
        if item.get('pdfUrl'):
            item['pdfUrl'] = remap_s3_path(item['pdfUrl'])
    count = put_items(f'Invoice-{tgt}', items, dry_run)
    print(f'  Invoices: {count}')
    return inv_ids

def migrate_invoice_items(src, tgt, valid_inv_ids, dry_run):
    items = scan_all(f'InvoiceItem-{src}')
    # Skip orphaned items
    valid = [i for i in items if i.get('invoiceId') in valid_inv_ids]
    for item in valid:
        remap_owner(item)
    skipped = len(items) - len(valid)
    count = put_items(f'InvoiceItem-{tgt}', valid, dry_run)
    print(f'  InvoiceItems: {count} (skipped {skipped} orphaned)')

def migrate_expenses(src, tgt, dry_run):
    items = scan_all(f'Expense-{src}')
    for item in items:
        remap_owner(item)
        # Map legacy category
        if 'irdCategory' in item:
            item['category'] = CATEGORY_MAP.get(item.pop('irdCategory', ''), 'Other')
        item.setdefault('category', 'Other')
        # Map DRAFT → PENDING
        if item.get('status') == 'DRAFT':
            item['status'] = 'PENDING'
        item.setdefault('gstClaimable', True)
        item.setdefault('status', 'APPROVED')
        # Strip legacy mileage fields
        for f in ['vendor', 'isMileage', 'mileagePurpose', 'mileageKm', 'mileageRate',
                   'startLocation', 'endLocation', 'vehicleType', 'tierType',
                   'businessPortion', 'receiptThumbnail']:
            item.pop(f, None)
        # Remap receipt S3 path
        if item.get('receiptUrl'):
            item['receiptUrl'] = remap_s3_path(item['receiptUrl'])
    count = put_items(f'Expense-{tgt}', items, dry_run)
    print(f'  Expenses: {count}')


# ── S3 Migration ──

def migrate_s3(target_bucket, dry_run):
    """Copy receipts and invoice PDFs from legacy bucket to new prod bucket.
    Remaps paths: public/receipts/... → receipts/... and public/users/.../invoices/... → invoices/...
    """
    paginator = s3.get_paginator('list_objects_v2')
    count = 0
    total_size = 0
    for page in paginator.paginate(Bucket=LEGACY_S3_BUCKET):
        for obj in page.get('Contents', []):
            old_key = obj['Key']
            if not (old_key.startswith('public/receipts/') or old_key.startswith('public/users/')):
                continue
            new_key = remap_s3_path(old_key)
            total_size += obj['Size']
            if dry_run:
                print(f'    {old_key} → {new_key} ({obj["Size"]} bytes)')
            else:
                s3.copy_object(
                    Bucket=target_bucket, Key=new_key,
                    CopySource={'Bucket': LEGACY_S3_BUCKET, 'Key': old_key},
                )
            count += 1
    label = '(dry run)' if dry_run else 'copied'
    print(f'  S3 files: {count} {label} ({total_size/1024/1024:.1f} MB)')

# ── Main ──

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Migrate legacy CloudPro data to new prod')
    parser.add_argument('--target-suffix', help='Target DynamoDB table suffix')
    parser.add_argument('--target-bucket', help='Target S3 bucket name')
    parser.add_argument('--dry-run', action='store_true', help='Preview without writing')
    args = parser.parse_args()

    if not args.dry_run and not args.target_suffix:
        print('ERROR: --target-suffix required (or use --dry-run)')
        sys.exit(1)

    tgt = args.target_suffix or 'DRY-RUN'
    prefix = 'DRY RUN — ' if args.dry_run else ''

    print(f'{prefix}Migrating legacy → new prod')
    print(f'  Source tables: *-{LEGACY_SUFFIX}')
    print(f'  Target tables: *-{tgt}')
    print(f'  Source S3: {LEGACY_S3_BUCKET}')
    print(f'  Target S3: {args.target_bucket or "(skipped)"}')
    print()

    print('DynamoDB:')
    migrate_clients(LEGACY_SUFFIX, tgt, args.dry_run)
    inv_ids = migrate_invoices(LEGACY_SUFFIX, tgt, args.dry_run)
    migrate_invoice_items(LEGACY_SUFFIX, tgt, inv_ids, args.dry_run)
    migrate_expenses(LEGACY_SUFFIX, tgt, args.dry_run)

    if args.target_bucket:
        print()
        print('S3:')
        migrate_s3(args.target_bucket, args.dry_run)
    elif not args.dry_run:
        print('\nWARNING: --target-bucket not provided, S3 files not copied')

    print()
    print('Done!' if not args.dry_run else 'Dry run complete. Add --target-suffix and --target-bucket to execute.')
