# CSV Source Export Format Research

Date: 2026-05-05

Scope: DueDateHQ Beta needs to import client/profile data from CSV or spreadsheet exports produced by TaxDome, Drake, Karbon, and QuickBooks. This note treats those products as source systems, not destinations. The implementation target is a source adapter per product that normalizes source rows into:

```txt
Client relationship -> Filing/Tax profile -> Deadline task
```

## Summary

There is no single stable CSV schema across the four products.

- TaxDome has the most explicit official export documentation. Account and contact exports are zipped CSV files with default fields, custom fields as extra columns, and linked accounts/contacts as numbered columns.
- Drake officially supports exporting all client data files or EF database files to CSV, but public docs do not publish the actual column layout. A Drake adapter should be sample-driven and tolerant, with official documentation only used to prove the export path and CSV capability.
- Karbon documents a contact export plus richer import/bulk-update spreadsheets. For DueDateHQ, support two shapes: self-service import/contact-list CSV and exported bulk contact update tabs converted to CSV.
- QuickBooks has several CSV-adjacent export surfaces. For client onboarding, use QuickBooks Online Customer Contact List / customer export and QuickBooks Desktop Customer/Vendor list exports, not bank transaction CSVs.

## Recommended Adapter Matrix

| Source profile | Intended user flow | Minimum fields to recognize | Useful optional fields | Confidence |
|---|---|---|---|---|
| `taxdome_accounts_v1` | CPA exports TaxDome Clients > Accounts, uploads zipped or extracted CSV | account name, state, type | account ID, tags, linked contacts, custom account fields, timezone, active jobs/tasks counts | High for field families; medium for exact headers |
| `taxdome_contacts_v1` | CPA exports TaxDome Clients > Contacts, uploads zipped or extracted CSV | contact name or first/last name, state/province | phone, email, company name, street/city/country/zip, tags, linked accounts, custom contact fields | High for field families; medium for exact headers |
| `taxdome_tasks_jobs_v1` | Optional future enrichment from TaxDome tasks/jobs exports | account, task/job name, due date/status | pipeline, stage, priority, internal deadline, timezone | High for field families; lower priority for Beta client import |
| `drake_client_export_v1` | CPA exports Drake Tools > File Maintenance > Export Client/EF Data with Export to CSV | client name and SSN/EIN/client id aliases if present | address, phone, email, return type/entity hints, state | Medium for export capability; low for exact public headers |
| `karbon_import_file_v1` | CPA supplies Karbon-compatible import/contact list CSV | organization name or first/last name | client identifier, fiscal year end, email, phone, address, belongs to, role, client group | High for documented import fields |
| `karbon_bulk_update_v1` | CPA exports Karbon Bulk Contact Update File and converts Organizations/People tabs to CSV | organization/person name, Karbon ID/client identifier | entity type, contact type, client owner/manager, business number, SIN, service types, custom fields | High for documented fields; medium because native file may be multi-tab spreadsheet rather than single CSV |
| `quickbooks_online_customer_contact_v1` | CPA exports QBO Customer Contact List as CSV or Excel-converted CSV | customer/name or company/full name | phone, email, billing street/city/state/zip/country, customer type/entity type, notes, website | High for export flow; medium for exact customizable columns |
| `quickbooks_desktop_customer_vendor_v1` | CPA exports QBD Customer/Vendor list as CSV | name/customer name | balance, contact information, address, phone, email | High for export capability; medium for exact headers |

## TaxDome

Official source: [Export your TaxDome data](https://help.taxdome.com/article/278-how-do-i-back-up-all-my-account-data).

### Export surfaces

TaxDome can export multiple CSV datasets by email link, usually zipped. Relevant datasets for DueDateHQ:

- Accounts: Clients > Accounts export.
- Contacts: Clients > Contacts export.
- Jobs: Workflow > Jobs export.
- Job recurrences: Workflow > Job recurrences export.
- Tasks: Workflow > Tasks export.

### Account export fields

Official docs describe account export contents as:

- Account ID.
- Account name.
- State.
- Type.
- Total bills and credit.
- Assigned team members, tags, followers.
- Last login, creation/update dates, archived date.
- Login credentials.
- Counts of active jobs, tasks, proposals, organizers.
- Account timezone.
- Custom account fields as extra columns.
- Linked contacts as `Linked contact #1`, `Linked contact #2`, etc.
- Linked notes and account roles.

DueDateHQ should treat `account name` as the best initial `client_relationship.displayName`. `state` maps to profile state when unambiguous. `type` is a source hint, not automatically a tax entity type unless values are verified against sample files. EIN, SSN, tax return type, fiscal year, and entity tax type are likely to appear only in custom account/contact fields for many firms.

### Contact export fields

Official docs describe contact export contents as:

- Contact name.
- First, middle, last name.
- Phone number.
- Company name.
- Street address, city, state/province, country, zip code.
- Notes.
- Account creation/update dates.
- Tags.
- Email address.
- Contact timezone.
- Custom contact fields as extra columns.
- Linked accounts as `Linked account #1`, `Linked account #2`, etc.

DueDateHQ should use linked account columns to suggest relationships, but must not auto-merge a person and an account. This matches the existing product decision that import may suggest possible relationships but CPA confirmation is required.

### Adapter notes

- Accept zipped CSV or extracted CSV.
- Preserve leading zeros in IDs, ZIP codes, EINs, SSNs, and phone numbers as strings.
- Header aliases should include case/space-insensitive forms of `Account ID`, `Account Name`, `State`, `Type`, `Contact Name`, `First Name`, `Last Name`, `Email`, `Phone`, and `Linked account/contact #n`.
- Custom fields should be surfaced in mapping preview, with deterministic suggestions for names containing `EIN`, `FEIN`, `SSN`, `entity`, `tax type`, `state`, `return`, `form`, or `fiscal`.
- TaxDome jobs/tasks are useful only as optional workflow enrichment; they are not sufficient to create verified official deadline tasks.

## Drake

Official source: [Drake Tax - Export Client/EF Data](https://kb.drakesoftware.com/kb/Drake-Tax/20069.htm).

Supporting migration source: [TaxTools - Importing clients from CSV file, Drake Tax Preparation Software](https://help.taxtools.com/article/0wemf24tww-generic-ascii-file-client-list).

### Export surface

Drake Tax exposes Tools > File Maintenance > Export Client/EF Data. It can export:

- Client data files.
- E-file data files.

The official Drake article says each can be exported to comma-delimited text or CSV. The client data file export operates on all client data files rather than a user-selected subset. The EF export asks for a record-layout location, but public docs do not disclose the field list.

The TaxTools migration doc states that Drake can create a delimited file containing client demographic data and that a standard Drake export can be recognized by an importer. It also notes the imported information is client information such as names and addresses.

### Adapter notes

- Treat Drake support as a tolerant source adapter, not a fixed contract until real sample exports are collected.
- Do not rely on an exact public header list. Build header scoring around likely aliases: `Client ID`, `Client Number`, `SSN`, `EIN`, `Name`, `Taxpayer`, `Spouse`, `Company`, `Address`, `City`, `State`, `ZIP`, `Phone`, `Email`, `Return Type`, `Package`, `Entity`.
- If no headers are present, show manual mapping rather than attempting blind positional import.
- Preserve SSN/EIN and ZIP as strings.
- Split individual and business rows only when source fields are strong enough; otherwise send to review.
- Record a product gap: DueDateHQ needs at least 2-3 anonymized Drake client export samples before claiming high-confidence exact-format support.

## Karbon

Official sources:

- [Export, download and edit contact data](https://help.karbonhq.com/en/articles/1524449-export-download-and-edit-contact-data/)
- [Import client data](https://help.karbonhq.com/en/articles/1524435-import-client-data)
- [Import your client list](https://help.karbonhq.com/en/articles/7021103-import-your-client-list)
- [Bulk Update your Contacts](https://help.karbonhq.com/en/articles/6143054-bulk-update-your-contacts)

### Export and import surfaces

Karbon documents exporting contact data from Contacts via a cloud icon. It also documents:

- Self-service import from Excel or CSV.
- Organization and people contact imports as separate processes.
- A Bulk Contact Update File with multiple tabs: Colleagues, Organizations, People, and Service Types.

For DueDateHQ, the practical adapter should accept a CSV exported from Contacts, a Karbon import file, or a CSV converted from a relevant bulk-update tab.

### Documented import/contact fields

Karbon's self-service import documentation lists these useful fields:

- Organization Name.
- Description.
- Website URL.
- Client Identifier.
- Fiscal Year End Day.
- Fiscal Year End Month.
- First, Middle, Last Name.
- Preferred Name.
- Date of Birth.
- Person's Email.
- Belongs To.
- Role.
- Phone numbers.
- Social Media Profiles.
- Addresses.
- Client Group Name.

Karbon's client list import notes that the first row must contain column headings. It imports person/organization name, emails, phone numbers, and address, and duplicate names are ignored.

### Bulk update fields

Karbon's bulk update docs list updateable organization fields:

- Name.
- Legal name.
- Entity Type.
- Contact Type.
- Client Identifier.
- Client Owner and Client Manager.
- Financial Year End Day and Month.
- Email.
- Phone numbers.
- Address parts.
- Business Number.
- Social Insurance Number.
- Custom Contact Fields.

People fields include:

- First, Middle, Last Name.
- Preferred Name.
- Date of Birth.
- Contact Type.
- Client Identifier.
- Client Owner and Client Manager.
- Associated Organization.
- Role in organization.
- Email.
- Phone numbers.
- Address parts.
- Social Insurance Number.
- Custom Contact Fields.

### Adapter notes

- Karbon organizations and people should be imported as separate row classes when possible.
- `Client Group Name` maps well to DueDateHQ relationship suggestions, not automatic merge.
- `Belongs To` and `Associated Organization` should create pending relationship suggestions for CPA confirmation.
- `Client Identifier` maps to source row external ID, not a tax ID unless values prove otherwise.
- `Business Number` is not always a US EIN. Keep a jurisdiction-aware tax ID classifier.
- Native bulk update files may be XLSX with tabs. If Beta only supports CSV upload, document that users must export/convert the Organizations and People tabs to CSV, or add XLSX parsing as a later improvement.

## QuickBooks

Official sources:

- [Export customer data to Excel](https://quickbooks.intuit.com/learn-support/en-us/help-article/import-export-data-files/export-customer-data-excel/L0ZerVWiO_US_en_US)
- [Get the total number of customers in QuickBooks Online](https://quickbooks.intuit.com/learn-support/en-us/help-article/list-reports/get-total-number-customers-quickbooks-online/L6iy2IDTF_US_en_US)
- [Export your QuickBooks Online data](https://quickbooks.intuit.com/learn-support/en-us/help-article/list-management/export-reports-lists-data-quickbooks-online/L1xleDrLp_US_en_US)
- [Import/export CSV files in QuickBooks Desktop](https://quickbooks.intuit.com/learn-support/en-us/help-article/manage-lists/import-export-csv-files/L9AiGRdT9_US_en_US)

Useful third-party field checklist: [Firm360 QBO Client Data Export](https://firm360.zendesk.com/hc/en-us/articles/4409146443927-QBO-Client-Data-Export).

### QuickBooks Online export surfaces

QuickBooks Online supports customer export from:

- Customers page export. Official docs list fields such as Name, Company, Address, Phone number, Email Address, Customer type, Attachment, Currency, Balance, and Notes.
- Reports > Customer Contact List. Official docs state the report can be customized by changing columns, then exported. Another official customer-count article notes CSV may be available from Export/Print depending on preferences.
- Settings > Export data exports reports/lists as Excel files in a zip. Users can convert to CSV.

For DueDateHQ, the preferred source is Customer Contact List because the CPA can customize columns and export or convert the report.

### Useful Customer Contact List columns

Official docs do not publish a complete fixed column list because the report is customizable. The Firm360 migration checklist is useful because it targets client migration from QBO and asks users to select:

- Customer.
- Phone Numbers.
- Email.
- Full Name.
- Billing Address.
- Phone.
- Company Name.
- Billing Street.
- Billing City.
- Billing State.
- Billing Zip.
- Billing Country.
- Last Name.
- First Name.
- Customer Type or Entity Type.

DueDateHQ should support these aliases plus QuickBooks Desktop-style contact fields.

### QuickBooks Desktop export surface

QuickBooks Desktop officially supports list/report CSV exports. For Customer/Vendor lists, users open Customer/Vendor Center, choose the Excel dropdown, and create a comma-separated values file. Official docs describe exported customer/vendor lists as including names, balances, and contact information.

### Adapter notes

- QuickBooks customer exports are mostly contact/accounting data, not tax-profile data.
- `Customer Type` or `Entity Type` is the best entity hint when present.
- EIN/SSN is usually absent from standard QBO Customer Contact List exports; if a firm stores it in `Other`, `Notes`, or a custom field, send suggested mapping to review.
- Billing state maps to profile state only when there is no better tax-state field.
- QuickBooks bank-transaction CSV formats are not relevant for DueDateHQ client onboarding. Do not let `Date, Description, Amount` bank files pass as client import files.

## Canonical Field Mapping Recommendations

| Canonical field | TaxDome aliases | Drake aliases | Karbon aliases | QuickBooks aliases |
|---|---|---|---|---|
| `sourceRowId` | Account ID, Contact ID, custom ID | Client ID, Client Number, SSN/EIN when used as Drake id | Karbon ID, Client Identifier | Customer, Customer ID, Name |
| `clientName` | Account Name, Contact Name, Company Name, First Name + Last Name | Name, Client Name, Taxpayer Name, Company Name | Organization Name, Name, First Name + Last Name, Client Group Name | Customer, Name, Company Name, Full Name, First Name + Last Name |
| `ein` | custom fields containing EIN/FEIN | EIN, SSN/EIN, ID Number | Business Number when US-classified, custom EIN field | custom/Other/Notes containing EIN |
| `ssnLast4` | custom fields containing SSN | SSN, SSN/EIN | Social Insurance Number only for non-US context; custom SSN field for US | custom/Other/Notes containing SSN |
| `entityType` | Type, custom entity/tax type fields | Return Type, Package, Entity, Business Type | Entity Type, Contact Type | Customer Type, Entity Type |
| `states` | State, State/Province, custom tax state fields | State, resident state, business state aliases | Address State, custom state fields | Billing State, Shipping State, custom tax state |
| `email` | Email, Email Address | Email | Person's Email, Email | Email |
| `phone` | Phone Number, Phone | Phone | Phone numbers, Work, Office, Mobile, Home | Phone Numbers, Phone |
| `relationshipSuggestion` | Linked contact #n, Linked account #n | spouse/business relation only if present | Belongs To, Associated Organization, Client Group Name | parent/customer hierarchy if present |

## Parsing and Validation Requirements

- Accept UTF-8, UTF-8 BOM, and common Windows encodings.
- Preserve all identifiers as strings, especially leading-zero ZIP, SSN, EIN, account IDs, and phone values.
- Use a real CSV parser with quoted field support.
- Prefer header-based mapping. If Drake sample files lack headers, require manual mapping before commit.
- Show unmapped custom/source columns in preview.
- Block only structurally invalid files; send missing/uncertain canonical fields to review.
- Keep adapter versions in import batches so future source-format changes are debuggable.
- Add source-format fixture tests once anonymized sample files are available.

## Product Gaps to Confirm

1. Collect anonymized exports:
   - TaxDome Accounts CSV.
   - TaxDome Contacts CSV.
   - Drake Client Data CSV.
   - Karbon Contact export or Bulk Contact Update Organizations/People tabs.
   - QBO Customer Contact List CSV.
   - QuickBooks Desktop Customer/Vendor CSV if Desktop support is in P0.
2. Decide whether Beta upload accepts zipped CSV for TaxDome.
3. Decide whether Beta upload accepts XLSX for Karbon and QBO, or requires user conversion to CSV.
4. Define sample-data policy for tax IDs in fixtures; use fake but format-valid identifiers only.
5. Confirm whether Drake support means Drake Tax client exports only, or also Drake Accounting / Drake Scheduler exports.

## Spec Impact

`specs/csv-imports.md` should not claim exact fixed schemas for all products. It should state:

- TaxDome, Karbon, and QuickBooks have known source adapter profiles with documented field families.
- Drake support starts as sample-driven header/alias recognition because public docs confirm CSV export capability but not a stable public column contract.
- The CSV import UI must show detected source profile, adapter version, recognized columns, unmapped columns, and fields requiring review.
