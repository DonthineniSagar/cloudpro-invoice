#!/usr/bin/env python3
"""Migrate data from prod DynamoDB tables to sandbox tables with field mapping."""
import boto3
import json
import sys
from decimal import Decimal

REGION = 'ap-southeast-2'
PROD_SUFFIX = 'gpvtefxrxvgbbj2kqzt5ri7x5e-NONE'
SANDBOX_SUFFIX = 'kdhpyo3bhnenbm2vgxgy2qo24u-NONE'

# Remap owner from prod user to sandbox user
PROD_USER = 'c93e3468-4091-70f6-5b3c-2a78041a97f5'
SANDBOX_USER = '89ae6498-1061-703b-f7c5-9f210fc70a98'

dynamodb = boto3.resource('dynamodb', region_name=REGION)

def scan_all(table_name):
    table = dynamodb.Table(table_name)
    items = []
    resp = table.scan()
    items.extend(resp['Items'])
    while 'LastEvaluatedKey' in resp:
        resp = table.scan(ExclusiveStartKey=resp['LastEvaluatedKey'])
        items.extend(resp['Items'])
    return items

def remap_owner(item):
    """Replace prod userId/owner with sandbox user."""
    if item.get('userId') == PROD_USER:
        item['userId'] = SANDBOX_USER
    owner = item.get('owner', '')
    if PROD_USER in str(owner):
        item['owner'] = f'{SANDBOX_USER}::{SANDBOX_USER}'
    return item

def migrate_clients():
    prod_table = f'Client-{PROD_SUFFIX}'
    sandbox_table = f'Client-{SANDBOX_SUFFIX}'
    items = scan_all(prod_table)
    table = dynamodb.Table(sandbox_table)
    count = 0
    for item in items:
        item = remap_owner(item)
        # Remove fields not in sandbox schema
        item.pop('clientType', None)
        item.pop('website', None)
        table.put_item(Item=item)
        count += 1
    print(f'  Clients: {count} items migrated')

def migrate_invoices():
    prod_table = f'Invoice-{PROD_SUFFIX}'
    sandbox_table = f'Invoice-{SANDBOX_SUFFIX}'
    items = scan_all(prod_table)
    table = dynamodb.Table(sandbox_table)
    count = 0
    for item in items:
        item = remap_owner(item)
        # Map prod fields to sandbox fields
        if 'taxRate' in item:
            item['gstRate'] = item.pop('taxRate')
        if 'taxAmount' in item:
            item['gstAmount'] = item.pop('taxAmount')
        if 'terms' in item:
            item['paymentTerms'] = item.pop('terms')
        # Set defaults for new sandbox fields
        item.setdefault('currency', 'NZD')
        item.setdefault('companyName', '')
        item.setdefault('companyEmail', '')
        item.setdefault('companyPhone', '')
        item.setdefault('companyAddress', '')
        item.setdefault('gstNumber', '')
        item.setdefault('bankAccount', '')
        item.setdefault('gstRate', Decimal('15'))
        table.put_item(Item=item)
        count += 1
    print(f'  Invoices: {count} items migrated')

def migrate_invoice_items():
    prod_table = f'InvoiceItem-{PROD_SUFFIX}'
    sandbox_table = f'InvoiceItem-{SANDBOX_SUFFIX}'
    items = scan_all(prod_table)
    table = dynamodb.Table(sandbox_table)
    count = 0
    for item in items:
        item = remap_owner(item)
        table.put_item(Item=item)
        count += 1
    print(f'  InvoiceItems: {count} items migrated')

def migrate_expenses():
    prod_table = f'Expense-{PROD_SUFFIX}'
    sandbox_table = f'Expense-{SANDBOX_SUFFIX}'
    items = scan_all(prod_table)
    table = dynamodb.Table(sandbox_table)
    count = 0
    for item in items:
        item = remap_owner(item)
        # Map prod irdCategory to sandbox category
        if 'irdCategory' in item:
            cat_map = {
                'ENTERTAINMENT': 'Meals', 'TRAVEL': 'Travel', 'OFFICE': 'Office',
                'SOFTWARE': 'Software', 'EQUIPMENT': 'Equipment', 'MARKETING': 'Marketing',
                'UTILITIES': 'Utilities', 'VEHICLE': 'Travel',
            }
            item['category'] = cat_map.get(item.pop('irdCategory', ''), 'Other')
        item.setdefault('category', 'Other')
        # Remove fields not in sandbox schema
        for f in ['vendor', 'isMileage', 'mileagePurpose', 'mileageKm', 'mileageRate',
                   'startLocation', 'endLocation', 'vehicleType', 'tierType',
                   'businessPortion', 'receiptThumbnail']:
            item.pop(f, None)
        # Ensure required fields
        item.setdefault('gstClaimable', True)
        item.setdefault('status', 'APPROVED')
        table.put_item(Item=item)
        count += 1
    print(f'  Expenses: {count} items migrated')

if __name__ == '__main__':
    print('Migrating prod data to sandbox...')
    print(f'  Prod suffix: {PROD_SUFFIX}')
    print(f'  Sandbox suffix: {SANDBOX_SUFFIX}')
    print(f'  Remapping user: {PROD_USER} -> {SANDBOX_USER}')
    print()
    migrate_clients()
    migrate_invoices()
    migrate_invoice_items()
    migrate_expenses()
    print()
    print('Done! Refresh your app to see the data.')
