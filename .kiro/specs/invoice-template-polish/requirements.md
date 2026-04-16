# Requirements Document

## Introduction

This feature polishes the invoice template experience in CloudPro Invoice. Users will be able to preview template thumbnails before selecting one, choose a custom accent color for their invoices, and add custom footer text (e.g. payment terms, legal notices). These enhancements give NZ freelancers and small businesses more control over their invoice branding without requiring design skills.

## Glossary

- **Settings_Page**: The Company Profile settings page at `app/settings/company/page.tsx` where users configure business details and invoice preferences
- **Template_Selector**: The UI section within the Settings_Page that displays available invoice templates for selection
- **Template_Preview**: A visual thumbnail rendering that shows a representative preview of an invoice template's layout and style
- **Accent_Color**: A user-chosen color applied to headings, borders, and highlights in the generated invoice PDF
- **Footer_Text**: User-defined text displayed at the bottom of generated invoice PDFs, typically containing payment terms, legal notices, or thank-you messages
- **Color_Picker**: A UI control that allows users to select a color value via visual palette or hex code input
- **CompanyProfile**: The DynamoDB model storing business details, preferences, and invoice customisation settings
- **PDF_Generator**: The module (`lib/generate-pdf.ts`) responsible for rendering invoice data into PDF documents using the selected template, accent color, and footer text

## Requirements

### Requirement 1: Template Preview Thumbnails

**User Story:** As a freelancer, I want to see visual previews of each invoice template in settings, so that I can make an informed choice about which template suits my brand.

#### Acceptance Criteria

1. WHEN the Settings_Page loads the Invoice Template section, THE Template_Selector SHALL display a visual Template_Preview thumbnail for each available template (Modern, Classic, Minimal)
2. THE Template_Preview SHALL render a simplified representation of the template layout including header area, line item table, and footer area
3. WHEN a user selects a template, THE Template_Selector SHALL visually highlight the selected template with a distinct border and background
4. THE Template_Preview SHALL render correctly in both light mode and dark mode
5. THE Template_Preview SHALL be responsive, stacking vertically on viewports narrower than 768px and displaying in a row on wider viewports

### Requirement 2: Custom Accent Color Picker

**User Story:** As a small business owner, I want to choose a custom accent color for my invoices, so that my invoices match my brand identity.

#### Acceptance Criteria

1. THE Settings_Page SHALL display a Color_Picker control in the Invoice Template section that allows the user to select an Accent_Color
2. THE Color_Picker SHALL accept color input via a visual color selector and a hex code text field
3. WHEN the user selects an Accent_Color, THE Settings_Page SHALL display a live preview swatch of the chosen color
4. THE CompanyProfile model SHALL store the Accent_Color as a hex color string field named `accentColor`
5. WHEN no Accent_Color is set, THE Settings_Page SHALL default to the primary brand color (`#6366F1`)
6. THE Color_Picker SHALL validate that the entered hex code matches the format `#RRGGBB` before saving
7. WHEN an invalid hex code is entered, THE Settings_Page SHALL display a field-level error message stating "Enter a valid hex color (e.g. #6366F1)"
8. THE Color_Picker SHALL render correctly in both light mode and dark mode

### Requirement 3: Custom Footer Text

**User Story:** As a sole trader, I want to add custom footer text to my invoices, so that I can include payment terms, legal notices, or a thank-you message on every invoice.

#### Acceptance Criteria

1. THE Settings_Page SHALL display a text area input for Footer_Text in the Invoice Template section
2. THE CompanyProfile model SHALL store the Footer_Text as a string field named `invoiceFooterText`
3. THE Footer_Text input SHALL accept up to 500 characters
4. THE Settings_Page SHALL display a character count indicator showing the current length relative to the 500-character limit
5. WHEN no Footer_Text is set, THE Settings_Page SHALL display placeholder text suggesting example content such as "e.g. Thank you for your business. Payment due within 14 days."
6. THE Footer_Text input SHALL render correctly in both light mode and dark mode

### Requirement 4: PDF Generation with Custom Accent Color

**User Story:** As a freelancer, I want my chosen accent color to appear on generated invoice PDFs, so that my invoices reflect my brand.

#### Acceptance Criteria

1. WHEN generating an invoice PDF, THE PDF_Generator SHALL apply the Accent_Color to template headings, borders, and highlight elements
2. WHEN no Accent_Color is stored in the CompanyProfile, THE PDF_Generator SHALL use the default color defined by each template
3. THE PDF_Generator SHALL accept the Accent_Color as an optional parameter in the `generateInvoicePDF` function signature
4. WHEN the Accent_Color is applied, THE PDF_Generator SHALL produce a valid PDF document without rendering errors

### Requirement 5: PDF Generation with Custom Footer Text

**User Story:** As a sole trader, I want my custom footer text to appear at the bottom of generated invoice PDFs, so that clients see my payment terms and legal notices.

#### Acceptance Criteria

1. WHEN generating an invoice PDF, THE PDF_Generator SHALL render the Footer_Text at the bottom of the invoice, below the notes section
2. WHEN no Footer_Text is stored in the CompanyProfile, THE PDF_Generator SHALL omit the footer text area from the PDF
3. THE PDF_Generator SHALL accept the Footer_Text as an optional parameter in the `generateInvoicePDF` function signature
4. IF the Footer_Text exceeds the remaining space on the current page, THEN THE PDF_Generator SHALL move the footer text to a new page rather than clipping the content

### Requirement 6: Persist Customisation Settings

**User Story:** As a user, I want my accent color and footer text preferences to be saved with my company profile, so that the settings persist across sessions.

#### Acceptance Criteria

1. WHEN the user saves the Settings_Page form, THE Settings_Page SHALL persist the Accent_Color and Footer_Text values to the CompanyProfile model
2. WHEN the Settings_Page loads, THE Settings_Page SHALL populate the Color_Picker and Footer_Text fields with previously saved values from the CompanyProfile
3. THE CompanyProfile Zod validation schema SHALL validate that `accentColor` matches the hex color format `#RRGGBB` when provided
4. THE CompanyProfile Zod validation schema SHALL validate that `invoiceFooterText` does not exceed 500 characters when provided
