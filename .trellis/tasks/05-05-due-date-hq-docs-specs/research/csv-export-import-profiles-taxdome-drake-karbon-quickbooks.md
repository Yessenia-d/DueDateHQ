# Research: CSV export/import profiles for TaxDome, Drake, Karbon, and QuickBooks

- Query: CSV export/import formats and documented CSV field expectations relevant to supporting DueDateHQ export/import profiles for TaxDome, Drake, Karbon, and QuickBooks.
- Scope: mixed
- Date: 2026-05-05

## Findings

### Files Found

- `.trellis/tasks/05-05-due-date-hq-docs-specs/prd.md` - active task PRD says DueDateHQ must support TaxDome, Drake, Karbon, and QuickBooks exported CSVs for client import, with key mapping for client name, EIN, state, and entity type.
- `specs/csv-imports.md` - source-specific import adapters are already scoped for TaxDome, Drake, Karbon, and QuickBooks.
- `specs/dashboard.md` - dashboard/task export is scoped for operational workload review.
- `docs/technical/due-date-hq-beta-technical-plan.md` - technical plan defines CSV import adapters, dashboard/task exports, and the canonical client/profile/task data model.
- `apps/**` and `packages/**` - no CSV import/export implementation found yet for `imports.preview`, `dashboard.export`, TaxDome, Drake, Karbon, or QuickBooks.

### Code Patterns

- DueDateHQ import is currently defined as source-specific CSV parsing, not generic blind upload: `specs/csv-imports.md:5`, `specs/csv-imports.md:27`, `specs/csv-imports.md:64`.
- Canonical import shape requires at least client/profile fields useful for tax scheduling: client name, EIN, SSN last four, entity type, states, county, fiscal year type, source system, and source row id: `specs/csv-imports.md:97`.
- Adapter acceptance criteria explicitly call for TaxDome, Drake, Karbon, and QuickBooks client/customer source profiles in `specs/csv-imports.md`.
- Dashboard/task exports are an operational review feature, not a promised third-party task-import integration: `specs/dashboard.md:17`, `specs/dashboard.md:50`, `specs/dashboard.md:123`.
- The technical model separates `Client relationship -> Filing/Tax profile -> Deadline task`, which should drive all CSV transformations: `docs/technical/due-date-hq-beta-technical-plan.md:67`.
- Import batches already model `sourceSystem` as `taxdome | drake | karbon | quickbooks`: `docs/technical/due-date-hq-beta-technical-plan.md:106`.
- Planned API `imports.preview` parses the four products with source-specific adapters and recognizes client name, EIN, state, and entity type where possible: `docs/technical/due-date-hq-beta-technical-plan.md:321`.
- Planned dashboard exports are separate from import adapters: `docs/technical/due-date-hq-beta-technical-plan.md:339`.
- No application code currently implements these adapters, so field mappings below should become fixture/spec inputs before implementation.

### Product Findings

#### TaxDome

Relevant workflow:

- CSV import into TaxDome for accounts and contacts.
- CSV export from TaxDome for accounts, contacts, and task views.
- For DueDateHQ Beta, TaxDome is the strongest official source for both inbound client import fixtures and possible TaxDome-compatible client export profiles. Task export is useful for workload review but not enough evidence for task import into TaxDome.

Official field expectations:

- TaxDome account import fields include `Account Name`, `Account Tags`, `Account Type`, `Team Members`, `Account Role Names`, and account custom fields.
- `Account Name` is required when creating accounts, and capitalization must match exactly for existing-account detection.
- TaxDome contact import fields include `Contact Name`, `First Name`, `Last Name`, `Email`, `Phone Number`, street address fields, contact custom fields, and contact tags.
- Phone values may contain digits and a limited set of punctuation characters, but spaces, square brackets, and braces are not accepted.
- Date custom fields follow the firm's default date format: US mode accepts month/day/year variants; non-US mode accepts day/month/year variants.
- CSV files must be UTF-8 encoded and no larger than 300 KB.
- TaxDome import supports mapping, review, examples per mapped property, skipped-row CSV output, and import history.

Official export fields:

- TaxDome accounts CSV can include account ID, account name, state, type, billing totals, credit, team members, tags, followers, login/created/updated/archive timestamps, active jobs/tasks/proposals/organizers, timezone, account custom fields, and linked-contact data including contact fields, notes, tags, and role names.
- TaxDome contacts CSV can include contact name, first/middle/last name, phone, company, address, notes, created/updated timestamps, tags, email, timezone, custom fields, and linked-account data.
- TaxDome tasks CSV can export pending or completed task data, including account name, task name, start date, due date, created/updated dates, linked job dates, creator, status, subtasks, priority, job name, description, pipeline, stage, tags, linked documents, notes, timezone, and date completed.

DueDateHQ mapping implications:

- `Account Name` maps to `client_relationships.displayName`.
- `Account Type` maps imperfectly to relationship/profile type; `Individual`/`Company` can seed entity-type inference but is not equivalent to tax entity classification.
- TaxDome linked contact names and role names can support individual/business relationship suggestions, but DueDateHQ should not auto-merge them.
- State/address fields are useful for jurisdiction hints, but not enough to infer filing states with high confidence.
- TaxDome custom fields are likely where EIN, entity type, fiscal year, and tax-specific profile fields live. Adapter should allow custom-field alias mapping for `EIN`, `SSN last four`, `entityType`, `states`, `county`, and `fiscalYearType`.

Confidence: High for account/contact import and export fields because official docs disclose field groups, constraints, and export columns. Medium for task import/export interoperability because official docs found task export fields, not a task import schema.

Sources:

- TaxDome, "Prepare your CSV file for import": https://help.taxdome.com/article/1842-prepare-your-csv-file-for-import
- TaxDome, "Importing client data": https://help.taxdome.com/article/122-import
- TaxDome, "Export accounts": https://help.taxdome.com/article/2223-export
- TaxDome, "Export contacts": https://help.taxdome.com/article/2224-export-contacts
- TaxDome, "Export task list": https://help.taxdome.com/article/438-tasks

#### Drake

Relevant workflow:

- Drake Tax has official report/export workflows for client and EF data, especially Client Status Manager views exported to Excel.
- Drake Accounting has official CSV spreadsheet templates for customer, vendor, chart-of-accounts, journal entry, employee, and other accounting imports/exports.
- Drake Tax has a specific official CSV payment-import schema for client payment information.
- For DueDateHQ Beta, "Drake" should likely mean Drake Tax client list exports from Client Status Manager for tax-practice migration. Drake Accounting customer/vendor templates are useful only if the CPA means Drake Accounting contacts, not Drake Tax clients.

Official Drake Tax export/import expectations:

- Drake Tax Client Status Manager can export the current view to Microsoft Excel. Users choose columns through display settings, so there is no stable public fixed CSV schema for a DueDateHQ adapter.
- Drake Tax `Reports > Report Manager` includes client reports and filtering; output can be saved/exported, but official docs found here do not publish a fixed client-list CSV layout.
- Drake Tax payment import requires four columns in order: `TIN`, `PaymentDescription`, `PaymentDate`, and `Payment Amount`.
- Drake Tax payment import can include a header row if import starts at line 2. Date examples allow eight-digit dates with slash or dash separators. Direct-entry validation is stricter: TIN is nine digits without separators, date is MMDDYYYY, and amount uses digits only.

Official Drake Accounting CSV templates:

- Customer template header observed from Drake official linked CSV: `Customer Code`, `First Name`, `Middle Name`, `Last Name`, `Business Name`, `Suffix`, `Country`, `Address Line 1`, `Address Line 2`, `City`, `State/Province`, `Zip`, `Contact`, `Account Type`, `Phone`, `Email`, `Sales Tax Code`, `Customer Web Address`, and customer shipping address fields.
- Vendor template header observed from Drake official linked CSV: `Vendor Code`, `Company Name`, `First Name`, `Middle Name`, `Last Name`, `Address 1`, `Address 2`, `City`, `State`, `Country Code`, `Zip`, `Province`, `Phone`, `Email`, `Client Account Number`, `Doing Business As`, `Federal ID Type`, `Federal ID`, and `Non US Postal Code`.
- Journal entry template header observed from Drake official linked CSV: `Type`, `Date`, `Entity Code`, `Account`, `Debit`, `Credit`, `Description`, `Reference`.
- Drake Accounting spreadsheet import flow lets users download blank templates, select the spreadsheet type, preview, validate, import, and complete a post-import checklist.

DueDateHQ mapping implications:

- Drake Tax client exports should be treated as header-driven and sample-driven. DueDateHQ should support common columns like client code, taxpayer name, spouse name, SSN/EIN/TIN, return type, entity type, federal/state status, preparer, and state fields only after beta-user sample files confirm exact headers.
- Drake Accounting customer/vendor templates are better for accounting contact export profiles than for tax deadline onboarding. They do not disclose filing-state, entity-tax-type, or due-date task fields.
- Drake Tax payment import is out of scope for DueDateHQ deadline/client migration and should not be treated as a supported export target unless a future payments feature exists.

Confidence: Medium-low for Drake Tax client list schema because official docs confirm export workflows but do not disclose fixed public client CSV columns. High for Drake Accounting customer/vendor template headers because they come from official linked CSV templates, but relevance to DueDateHQ tax onboarding is low. High for Drake Tax payment-import schema, but relevance is out of scope.

Sources:

- Drake Tax KB, "Client Status Manager": https://kb.drakesoftware.com/kb/Drake-Tax/20069.htm
- Drake Tax KB, "Importing Client Payment Information to Bill": https://kb.drakesoftware.com/kb/Drake-Tax/11347.htm
- Drake Tax KB, "Tax - All E-mail Address Report": https://kb.drakesoftware.com/kb/Drake-Tax/10354.htm
- Drake Accounting KB, "Spreadsheet Imports": https://kb.drakesoftware.com/kb/DAS/15103.htm
- Drake Accounting official template, "Blank Customer Template.csv": https://kb.drakesoftware.com/kb/Resources/Spreadsheets/Blank%20Customer%20Template.csv
- Drake Accounting official template, "Blank Vendor Template.csv": https://kb.drakesoftware.com/kb/Resources/Spreadsheets/Blank%20Vendor%20Template.csv
- Drake Accounting official template, "Blank Journal Entries Template.csv": https://kb.drakesoftware.com/kb/Resources/Spreadsheets/Blank%20Journal%20Entries%20Template.csv

#### Karbon

Relevant workflow:

- CSV/XLSX import into Karbon for client data: organizations, people, and client groups.
- Bulk contact export/update workflow from Karbon for organizations, people, colleagues, and service types.
- Bulk work creation workflow from CSV/XLSX, but this appears add-on/support-assisted for larger sets.
- For DueDateHQ Beta, Karbon official docs disclose enough fields to support client/contact migration and a possible Karbon work-item export profile, with caveats.

Official client import fields:

- Organization fields include `Organization Name` (required for organizations), `Description`, `Website URL`, `Client Identifier`, `Fiscal Year End Day`, and `Fiscal Year End Month`.
- Person fields include `First Name`, `Middle Name`, `Last Name`, `Preferred Name`, `Date of Birth`, `Person's Email`, `Belongs To`, and `Role`.
- Client group fields include `Client Group Name` and client-group identifier style fields.
- Contact fields can include phones, social profiles, addresses, website URL, full country name, custom fields, and the unique client identifier.
- `Belongs To` must match an existing or same-file organization name exactly to associate a person with an organization.
- Client identifiers must be unique.
- When addresses contain commas, CSV fields must be quoted or otherwise preserved by the spreadsheet export.

Official bulk contact update/export fields:

- Karbon bulk contact update exports an Excel workbook with `Organizations`, `People`, `Colleagues`, and `Service Types` sheets.
- Organization update fields include name, legal name, entity type, contact type, client identifier, client owner/manager, fiscal year end day/month, email, phone numbers, addresses, business number, SIN, custom fields, and Karbon ID.
- People update fields include first/middle/last name, preferred name, date of birth, contact type, client identifier, owner/manager, associated organization, role, email, phone numbers, addresses, SIN, custom fields, and Karbon ID.
- Users should not change Karbon ID, invalid email/phone/address values are not accepted, and fiscal year end day/month must be provided together when changed.

Official work creation fields:

- Karbon bulk work creation templates include work title, optional description, work type, assignee, client type/client key, start date, due date, status, frequency/recurrence, due type/day/month, weekend adjustment, end date, role assignees, and optional client-task recipients.
- Due date cannot be before start date. Status defaults to planned if omitted.
- Self-service creation has a 100-contact limit in the docs reviewed; larger migrations may require paid onboarding/support.

DueDateHQ mapping implications:

- Karbon organizations map well to DueDateHQ business client relationships and filing profiles.
- Karbon people map well to individual client relationships.
- `Belongs To`, `Associated Organization`, and `Role` should seed CPA-confirmed relationship suggestions, not automatic merging.
- `Fiscal Year End Day` and `Fiscal Year End Month` can feed `fiscalYearType` or fiscal year metadata, but need a DueDateHQ representation beyond the current high-level `fiscalYearType`.
- `Entity Type`, `Contact Type`, `Business Number`, and SIN/custom identifiers can seed entity and tax-ID mapping, but US EIN/state tax fields may require custom-field aliases.
- Karbon work creation can receive DueDateHQ deadline-task exports only if the firm wants tasks/work created in Karbon. It should remain a separate optional export profile from client onboarding.

Confidence: High for client/contact import and bulk update fields because official docs disclose the field families and requirements. Medium for work creation because docs disclose many fields but the exact workbook is account/template dependent and may require paid support.

Sources:

- Karbon Help, "Import client data": https://help.karbonhq.com/en/articles/1524435-import-client-data
- Karbon Help, "Prepare your client data": https://help.karbonhq.com/en/articles/1574304-prepare-your-client-data
- Karbon Help, "Importing client data using the Import Wizard": https://help.karbonhq.com/en/articles/6094928-importing-client-data-using-the-import-wizard
- Karbon Help, "Bulk update your contacts": https://help.karbonhq.com/en/articles/7930974-bulk-update-your-contacts
- Karbon Help, "Exporting your data from Karbon": https://help.karbonhq.com/en/articles/8189343-exporting-your-data-from-karbon
- Karbon Help, "Bulk create your work items": https://help.karbonhq.com/en/articles/2913586-bulk-create-your-work-items

#### QuickBooks

Relevant workflow:

- QuickBooks Online imports and exports customer/vendor contact lists via CSV/Excel.
- QuickBooks Desktop imports and exports list data through CSV and Advanced Import, including a downloadable CSV toolkit.
- For DueDateHQ Beta, QuickBooks customer export is useful as a source for client identity/contact migration. It is weaker than TaxDome/Karbon for tax-specific profile fields.

Official QuickBooks Online expectations:

- QuickBooks Online can import customers and vendors from CSV, Excel, Gmail, and Outlook sources.
- QuickBooks Online import docs point users to sample files inside the product and do not publicly disclose a complete static CSV column schema in the docs reviewed.
- QuickBooks Online import limits observed from official docs: file size up to 2 MB or 1000 rows for customer/vendor import.
- QuickBooks Online accepts CSV values separated by comma, semicolon, or other special characters.
- If multicurrency is enabled, imported customers/vendors default to home currency unless a currency column is mapped.
- QuickBooks Online customer records require a customer display name. Official customer management docs describe common customer fields such as company/customer name, email, phone, website, address, tax settings, payment/billing fields, notes/attachments, and subcustomers.
- QuickBooks Online can export customer contact lists to Excel or CSV from the Customer Contact List report/list workflow.

QuickBooks Desktop expectations:

- QuickBooks Desktop official docs support CSV import/export of lists and include an official CSV toolkit with sample files and allowed-field references.
- QuickBooks Desktop can export customer/vendor lists to CSV by selecting customers/vendors, choosing export, and selecting CSV.
- QuickBooks Desktop Advanced Import supports mapping columns and handling duplicate records, but official public pages reviewed do not expose the full allowed field table inline.

Third-party schema examples used because public official QBO docs reviewed do not disclose all CSV columns:

- Common QBO customer import examples usually include display/customer name, company, first/middle/last, email, phone/mobile/fax, billing/shipping address fields, opening balance, opening-balance date, terms, tax settings, and notes.
- Common QBO vendor import examples usually include company/vendor display name, first/middle/last, email, phone/mobile/fax, address fields, opening balance, opening-balance date, terms, tax ID, and notes.
- These examples should become low-priority optional aliases only until confirmed with real QBO sample files from beta users.

DueDateHQ mapping implications:

- `Customer display name`, `Customer`, `Company`, or `Name` should map to `client_relationships.displayName`.
- Address `State` is a weak jurisdiction hint, not a filing-state confirmation.
- QuickBooks usually does not carry entity tax type, EIN, fiscal year, or tax-obligation data in standard customer exports. Those should route to review or custom-field mapping.
- Vendor lists may matter only for firms that track businesses as vendors; default DueDateHQ adapter should prioritize customers.
- QuickBooks is not a task/deadline system. Use QuickBooks exports to create client relationships/profiles, not deadline tasks, unless a user provides custom columns.

Confidence: Medium for QuickBooks Online import/export workflow, limits, and required display-name behavior from official docs. Low-medium for exact customer/vendor CSV field names because public official docs defer sample files to the authenticated product. Medium-high for QuickBooks Desktop workflow because official docs and toolkit exist, but exact allowed fields still require toolkit/sample confirmation.

Sources:

- QuickBooks Online, "Import customer or supplier contacts from Outlook, Excel or Gmail": https://quickbooks.intuit.com/learn-support/en-uk/help-article/customer-list/import-customers-suppliers-email-contacts-online/L12erg8Db_GB_en_GB
- QuickBooks Online, "Add and manage customers in QuickBooks Online": https://quickbooks.intuit.com/learn-support/en-us/help-article/manage-customers/add-manage-customers-quickbooks-online/L0M9mMZmd_US_en_US
- QuickBooks Online, "Get a total number of customers in QuickBooks Online": https://quickbooks.intuit.com/learn-support/en-us/help-article/list-reports/get-total-number-customers-quickbooks-online/L6iy2IDTF_US_en_US
- QuickBooks Desktop, "Import and export CSV files": https://quickbooks.intuit.com/learn-support/en-us/help-article/manage-lists/import-export-csv-files/L9AiGRdT9_US_en_US
- QuickBooks Desktop, "Import customers or vendors from email contacts to QuickBooks Desktop": https://quickbooks.intuit.com/learn-support/en-us/help-article/manage-customers/import-customers-vendors-email-contacts-quickbooks/L1sWUlQGH_US_en_US

### Recommended DueDateHQ Export/Profile Matrix

Use "profile" to mean a named parser/exporter configuration. Some profiles are source import profiles into DueDateHQ; others are optional outgoing exports from DueDateHQ. The product docs should avoid implying two-way compatibility when official docs only support export or only support import.

| Profile name | Direction | Intended use | Minimum columns | Optional columns | Transformations | Gaps needing confirmation |
|---|---|---|---|---|---|---|
| `taxdome-accounts-contacts` | Import into DueDateHQ from TaxDome export; optional DueDateHQ export for TaxDome account/contact import | Client/account migration with contacts and relationships | `Account Name`; `Account Type` when present; at least one contact/name field | Account/contact tags, role names, team members, email, phone, address, notes, custom fields, linked contacts | Account name -> relationship display name; account type -> initial individual/company hint; linked contacts/role names -> relationship suggestions; custom fields -> EIN/entity/state/fiscal aliases | TaxDome custom-field names vary by firm; confirm EIN/entity/fiscal aliases from beta samples |
| `taxdome-tasks-review` | Export from DueDateHQ to CSV only | Operational workload review, not guaranteed TaxDome task import | Client/account name, task title, current due date, status | start date, firm target date, priority, verification badge, source URL, tags, notes, timezone | DueDateHQ task -> flat CSV row; preserve official due date and firm target date separately | Official TaxDome task import schema was not found; do not promise import into TaxDome tasks |
| `drake-tax-client-status` | Import into DueDateHQ from Drake Tax CSM/report export | Drake Tax client migration when users export a client/status view | Header-driven: client name or taxpayer name plus client code/TIN when present | spouse name, SSN/EIN/TIN, return type, federal/state statuses, preparer, state fields, email | Map selected headers by aliases; TIN/EIN -> tax ID review; return type/entity hints -> entity type; state columns -> jurisdiction hints | Official fixed client CSV schema not found; must collect real Drake Tax exports before locking aliases |
| `drake-accounting-customer-vendor` | Import into DueDateHQ from Drake Accounting CSV templates; optional outgoing export | Accounting-contact migration only when CPA uses Drake Accounting contacts as client list | Customer: `Customer Code` or name/business fields. Vendor: `Vendor Code` or company/name fields | address, phone, email, sales tax code, web address, DBA, federal ID type/id, client account number | Business name/company -> relationship display name; federal ID -> EIN/TIN review; address state -> weak jurisdiction hint | Not a Drake Tax client schema; lacks filing state/entity tax type/deadline context |
| `drake-tax-payment-import` | Not recommended for Beta | Payments/import-to-bill only | `TIN`, `PaymentDescription`, `PaymentDate`, `Payment Amount` | none found | Not mapped to deadline/client onboarding | Out of scope unless payments/billing export becomes a product feature |
| `karbon-client-data` | Import into DueDateHQ from Karbon export/import templates; optional DueDateHQ export for Karbon import | Client migration for organizations, people, and client groups | Organization: `Organization Name`; Person: first/last or full name; Group: `Client Group Name` | client identifier, entity type, contact type, fiscal year end day/month, associated organization, role, email, phones, address, business number, SIN/custom fields | Organizations -> business relationships/profiles; people -> individual relationships; associated organization/role -> relationship suggestions; FY end day/month -> fiscal metadata | Exact workbook/tab templates may be account-specific; confirm custom US tax fields and field labels |
| `karbon-work-items` | Export from DueDateHQ to Karbon work creation template | Optional creation of Karbon work items from DueDateHQ deadlines | work title, client key/name, assigned to, start date, due date | description, work type/template, status, frequency, due type/day/month, weekend adjustment, end date, role assignees | Official due date -> due date; firm target date may become start date only if user chooses; source/evidence -> description | Karbon work import may require paid onboarding/support and exact template generation; not a default Beta commitment |
| `quickbooks-online-customers` | Import into DueDateHQ from QBO customer export; optional DueDateHQ export for QBO customer import | Accounting customer list migration | customer/display name or company/name field | email, phone, billing/shipping address, customer type, currency, opening balance/as-of, terms, tax settings, notes | Display name -> relationship display name; company/name -> profile name; state -> weak jurisdiction hint; currency/accounting fields ignored for deadlines | Public official docs do not disclose full QBO CSV columns; obtain sample files from QBO beta users |
| `quickbooks-desktop-customer-vendor` | Import into DueDateHQ from QBD list export; optional DueDateHQ export through Desktop CSV toolkit | Desktop accounting customer/vendor list migration | customer/vendor name or company field | contact info, address, balances, terms, tax ID, notes, customer type | Name/company -> relationship display name; tax ID -> EIN/TIN review; address state -> weak jurisdiction hint | Need toolkit/sample allowed-fields file; not enough official inline schema for exact columns |
| `duedatehq-current-task-view` | Export from DueDateHQ to generic CSV | Workload sharing/review independent of target app | client relationship, filing/tax profile, obligation, jurisdiction/state, current official due date, status, verification badge | original due date, firm target date, days remaining, priority, extension status, source URL, source last verified/changed, notes | Flatten task row with separate official due date and firm target date; include verification state and evidence link | Product-specific task import support is only plausible for Karbon work items; TaxDome/QuickBooks/Drake task import targets not confirmed |

### Recommended Minimum Canonical Columns for DueDateHQ

For all product import profiles into DueDateHQ:

- `sourceSystem`
- `sourceRowId` or stable row hash
- `clientName`
- `profileName`
- `sourceClientId` where present
- `taxIdRaw` and normalized `ein`/`ssnLast4` when present
- `entityTypeRaw`
- `statesRaw`
- `addressState`
- `countyRaw`
- `fiscalYearRaw`
- `email`
- `phone`
- `notes`
- `relationshipHints`
- `customFieldsJson`

For DueDateHQ task/current-view CSV exports:

- `clientRelationship`
- `filingProfile`
- `obligation`
- `jurisdiction`
- `taxCategory`
- `currentOfficialDueDate`
- `originalDueDate`
- `firmTargetDate`
- `status`
- `verificationStatus`
- `sourceType`
- `sourceName`
- `sourceUrl`
- `lastVerifiedAt`
- `sourceLastChangedAt`
- `priority`
- `extensionStatus`
- `notes`

### Related Specs

- `specs/csv-imports.md`
- `specs/dashboard.md`
- `specs/manual-client-and-deadline-entry.md`
- `specs/tax-rule-verification.md`
- `docs/technical/due-date-hq-beta-technical-plan.md`
- `docs/product/due-date-hq-product-plan.md`

### External References

- TaxDome official docs disclose the most actionable TaxDome account/contact import and export field expectations.
- Karbon official docs disclose import/update/work field families, but exact workbook layouts can be account/template dependent.
- Drake official docs disclose CSM/report export workflows and Drake Accounting templates, but not a stable Drake Tax client CSV schema.
- QuickBooks official docs disclose import/export workflows and limits, but QuickBooks Online public docs reviewed defer the exact CSV sample schema to the authenticated product.

## Caveats / Not Found

- No application implementation exists yet for these CSV profiles. This research should feed fixtures, adapter aliases, and spec edits before code work.
- Official Drake Tax docs reviewed did not publish a fixed client-list CSV column schema. Treat Drake Tax support as sample-driven until beta users provide exports.
- Official QuickBooks Online public docs reviewed did not publish a full static customer/vendor CSV schema. Treat third-party field examples as provisional aliases only.
- TaxDome and Karbon custom fields are firm-specific. DueDateHQ must keep custom-field alias mapping and review queues instead of assuming universal EIN/entity/state headers.
- Product-specific task import was only plausibly documented for Karbon work creation. TaxDome, Drake, and QuickBooks should default to generic DueDateHQ task/current-view CSV export unless official task-import schemas are later found.
- Address state is not the same as filing state. All adapters should label address-derived jurisdiction as a weak hint and route uncertain rows to review.
- Accounting customer/vendor exports rarely carry tax-obligation context. Importing them can create client relationships/profiles, but verified deadline tasks still require DueDateHQ tax-rule matching and user review where fields are missing.
