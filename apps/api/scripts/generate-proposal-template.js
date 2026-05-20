/**
 * Script to (re)generate the proposal.docx template.
 * Run from apps/api: node scripts/generate-proposal-template.js
 *
 * Requires: pizzip (already installed)
 * Creates:  apps/api/templates/proposal.docx
 *
 * Placeholder convention: {placeholder_name}  (single braces â€” docxtemplater v3 default)
 * Loop convention: {#items} ... {/items}
 */

const PizZip = require('pizzip');
const path = require('path');
const fs = require('fs');

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');
if (!fs.existsSync(TEMPLATES_DIR)) fs.mkdirSync(TEMPLATES_DIR, { recursive: true });

// â”€â”€ Minimal .docx XML structure â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml"  ContentType="application/xml"/>
  <Override PartName="/word/document.xml"
            ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml"
            ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/settings.xml"
            ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
</Types>`;

const relsRoot = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1"
    Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument"
    Target="word/document.xml"/>
</Relationships>`;

const relsWord = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1"
    Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles"
    Target="styles.xml"/>
  <Relationship Id="rId2"
    Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings"
    Target="settings.xml"/>
</Relationships>`;

const settings = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:defaultTabStop w:val="720"/>
</w:settings>`;

const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
          xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
        <w:sz w:val="22"/>
        <w:szCs w:val="22"/>
      </w:rPr>
    </w:rPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:styleId="Heading1" w:default="0">
    <w:name w:val="heading 1"/>
    <w:rPr>
      <w:b/>
      <w:sz w:val="32"/>
      <w:color w:val="1F3864"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Normal" w:default="1">
    <w:name w:val="Normal"/>
    <w:pPr><w:spacing w:after="120"/></w:pPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="TableHeader">
    <w:name w:val="TableHeader"/>
    <w:rPr><w:b/><w:color w:val="FFFFFF"/></w:rPr>
  </w:style>
</w:styles>`;

// Helper: bold run
function brun(text) {
  return `<w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">${text}</w:t></w:r>`;
}
// Helper: normal run
function run(text) {
  return `<w:r><w:t xml:space="preserve">${text}</w:t></w:r>`;
}
// Helper: paragraph
function para(content, bold = false, size = null, color = null, align = null, spacingAfter = '120') {
  const rpr = [
    bold ? '<w:b/>' : '',
    size ? `<w:sz w:val="${size}"/><w:szCs w:val="${size}"/>` : '',
    color ? `<w:color w:val="${color}"/>` : '',
  ].join('');
  const ppr = [
    align ? `<w:jc w:val="${align}"/>` : '',
    spacingAfter ? `<w:spacing w:after="${spacingAfter}"/>` : '',
  ].join('');
  const rprTag = rpr ? `<w:rPr>${rpr}</w:rPr>` : '';
  const pprTag = ppr ? `<w:pPr>${ppr}</w:pPr>` : '';
  return `<w:p>${pprTag}<w:r>${rprTag}<w:t xml:space="preserve">${content}</w:t></w:r></w:p>`;
}
// Helper: section heading
function sectionHead(title) {
  return `<w:p>
    <w:pPr><w:spacing w:before="240" w:after="60"/></w:pPr>
    <w:r><w:rPr><w:b/><w:sz w:val="26"/><w:color w:val="1F3864"/></w:rPr>
      <w:t>${title}</w:t>
    </w:r>
  </w:p>`;
}
// Helper: label: value row
function labelRow(label, placeholder) {
  return `<w:p>
    <w:pPr><w:spacing w:after="80"/></w:pPr>
    ${brun(label + ': ')}${run(placeholder)}
  </w:p>`;
}
// Helper: table cell
function tc(content, bold = false, bgColor = null, width = null) {
  const tcpr = [
    bgColor ? `<w:shd w:val="clear" w:color="auto" w:fill="${bgColor}"/>` : '',
    width ? `<w:tcW w:w="${width}" w:type="dxa"/>` : '',
  ].join('');
  const rpr = bold ? '<w:rPr><w:b/><w:color w:val="FFFFFF"/></w:rPr>' : '';
  return `<w:tc>${tcpr ? `<w:tcPr>${tcpr}</w:tcPr>` : ''}<w:p><w:r>${rpr}<w:t xml:space="preserve">${content}</w:t></w:r></w:p></w:tc>`;
}
// Helper: table cell (data row)
function tcd(content, width = null) {
  const tcpr = width ? `<w:tcPr><w:tcW w:w="${width}" w:type="dxa"/></w:tcPr>` : '';
  return `<w:tc>${tcpr}<w:p><w:r><w:t xml:space="preserve">${content}</w:t></w:r></w:p></w:tc>`;
}

// â”€â”€ Document Body â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const tblBorders = `
      <w:tblBorders>
        <w:top    w:val="single" w:sz="4" w:color="CCCCCC"/>
        <w:left   w:val="single" w:sz="4" w:color="CCCCCC"/>
        <w:bottom w:val="single" w:sz="4" w:color="CCCCCC"/>
        <w:right  w:val="single" w:sz="4" w:color="CCCCCC"/>
        <w:insideH w:val="single" w:sz="4" w:color="CCCCCC"/>
        <w:insideV w:val="single" w:sz="4" w:color="CCCCCC"/>
      </w:tblBorders>`;
const tblCellMar = `
      <w:tblCellMar>
        <w:top w:w="80" w:type="dxa"/><w:left w:w="120" w:type="dxa"/>
        <w:bottom w:w="80" w:type="dxa"/><w:right w:w="120" w:type="dxa"/>
      </w:tblCellMar>`;
function tblPr(w = 9360) {
  return `<w:tblPr><w:tblW w:w="${w}" w:type="dxa"/>${tblBorders}${tblCellMar}</w:tblPr>`;
}

const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<w:body>

  <!-- â•â• SUBMITTED TO BLOCK â•â• -->
  <w:p><w:pPr><w:spacing w:after="60"/></w:pPr>
    ${brun('SUBMITTED TO: ')}<w:r><w:t xml:space="preserve">{client_name}</w:t></w:r>
  </w:p>
  <w:p><w:pPr><w:spacing w:after="60"/></w:pPr>
    ${brun('SUBMITTED DATE: ')}<w:r><w:t xml:space="preserve">{submitted_date}</w:t></w:r>
  </w:p>
  <w:p><w:pPr><w:spacing w:after="160"/></w:pPr>
    ${brun('PROJECT NAME: ')}<w:r><w:t xml:space="preserve">{project_name}</w:t></w:r>
  </w:p>

  <!-- â•â• COMPANY HEADER â•â• -->
  <w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="60"/></w:pPr>
    <w:r><w:rPr><w:b/><w:sz w:val="36"/><w:color w:val="1F3864"/></w:rPr><w:t>O2CURE PVT. LTD.</w:t></w:r>
  </w:p>
  <w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="60"/></w:pPr>
    <w:r><w:rPr><w:sz w:val="20"/><w:color w:val="444444"/></w:rPr><w:t>{company_address}</w:t></w:r>
  </w:p>
  <w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="200"/></w:pPr>
    <w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t>GSTIN: {company_gstin} | PAN: {company_pan}</w:t></w:r>
  </w:p>

  <!-- â•â• TITLE â•â• -->
  <w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="120"/></w:pPr>
    <w:r><w:rPr><w:b/><w:sz w:val="28"/><w:color w:val="C00000"/></w:rPr><w:t>Best Discounted Offer</w:t></w:r>
  </w:p>

  <!-- â•â• ADDRESSEE â•â• -->
  <w:p><w:pPr><w:spacing w:after="80"/></w:pPr>
    ${brun('KIND ATTENTION: ')}<w:r><w:t xml:space="preserve">{contact_person_name} ({contact_person_phone})</w:t></w:r>
  </w:p>
  <w:p><w:pPr><w:spacing w:after="80"/></w:pPr>
    ${brun('M/S: ')}<w:r><w:t xml:space="preserve">{client_company_name}</w:t></w:r>
  </w:p>
  <w:p><w:pPr><w:spacing w:after="80"/></w:pPr>
    ${brun('DATE: ')}<w:r><w:t xml:space="preserve">{date}</w:t></w:r>
    <w:r><w:t xml:space="preserve">     </w:t></w:r>
    ${brun('REF: ')}<w:r><w:t xml:space="preserve">{ref_number}</w:t></w:r>
  </w:p>
  <w:p><w:pPr><w:spacing w:after="160"/></w:pPr>
    ${brun('SUB: ')}<w:r><w:t xml:space="preserve">OFFER FOR {project_description}</w:t></w:r>
  </w:p>

  <!-- â•â• ABOUT US â•â• -->
  ${sectionHead('About Us')}
  <w:p><w:pPr><w:spacing w:after="160"/></w:pPr>
    <w:r><w:t xml:space="preserve">{about_us}</w:t></w:r>
  </w:p>

  <!-- â•â• PROJECT DETAILS TABLE â•â• -->
  ${sectionHead('Project Details')}
  <w:tbl>${tblPr()}
    <w:tr>${tc('Consultant Name &amp; Location', true, '1F3864', '4680')}${tcd('{consultant_name}', '4680')}</w:tr>
    <w:tr>${tc('Architect', true, '1F3864', '4680')}${tcd('{architect_name}', '4680')}</w:tr>
    <w:tr>${tc('Project Stage', true, '1F3864', '4680')}${tcd('{project_stage}', '4680')}</w:tr>
  </w:tbl>
  <w:p><w:pPr><w:spacing w:after="160"/></w:pPr></w:p>

  <!-- â•â• DEAR SIR â•â• -->
  <w:p><w:pPr><w:spacing w:after="120"/></w:pPr><w:r><w:t>Dear Sir,</w:t></w:r></w:p>
  <w:p><w:pPr><w:spacing w:after="160"/></w:pPr>
    <w:r><w:t xml:space="preserve">With reference to your valued enquiry, we are hereby submitting our Techno-Commercial Offer for supply of following items:</w:t></w:r>
  </w:p>

  <!-- â•â• BRIEF ABOUT â•â• -->
  ${sectionHead('Brief About')}
  <w:p><w:pPr><w:spacing w:after="120"/></w:pPr>
    <w:r><w:t xml:space="preserve">{brief_about}</w:t></w:r>
  </w:p>

  <!-- PRODUCT DESCRIPTIONS - dynamic per selected items -->
  <w:p><w:pPr><w:spacing w:after="60"/></w:pPr>
    <w:r><w:t>{#items}</w:t></w:r>
  </w:p>
  <w:p><w:pPr><w:spacing w:after="60"/></w:pPr>
    <w:r><w:rPr><w:b/><w:color w:val="1F3864"/></w:rPr><w:t xml:space="preserve">{name}</w:t></w:r>
  </w:p>
  <w:p><w:pPr><w:spacing w:after="120"/></w:pPr>
    <w:r><w:t xml:space="preserve">{description}</w:t></w:r>
  </w:p>
  <w:p><w:pPr><w:spacing w:after="60"/></w:pPr>
    <w:r><w:t>{/items}</w:t></w:r>
  </w:p>
  <w:p><w:pPr><w:spacing w:after="160"/></w:pPr></w:p>

  <!-- â•â• PRICING TABLE â•â• -->
  ${sectionHead('Table: Selection &amp; Pricing')}
  <w:tbl>
    <w:tblPr>
      <w:tblW w:w="9360" w:type="dxa"/>
      <w:tblBorders>
        <w:top    w:val="single" w:sz="4" w:color="AAAAAA"/>
        <w:left   w:val="single" w:sz="4" w:color="AAAAAA"/>
        <w:bottom w:val="single" w:sz="4" w:color="AAAAAA"/>
        <w:right  w:val="single" w:sz="4" w:color="AAAAAA"/>
        <w:insideH w:val="single" w:sz="4" w:color="AAAAAA"/>
        <w:insideV w:val="single" w:sz="4" w:color="AAAAAA"/>
      </w:tblBorders>
      ${tblCellMar}
    </w:tblPr>
    <w:tr>
      ${tc('UNIT', true, '1F3864', '4320')}
      ${tc('NO OF QTY', true, '1F3864', '1440')}
      ${tc('TOTAL AMOUNT (Rs)', true, '1F3864', '3600')}
    </w:tr>
    <w:tr>
      ${tcd('{#items}{name}', '4320')}
      ${tcd('{quantity}', '1440')}
      ${tcd('{amount_formatted}{/items}', '3600')}
    </w:tr>
    <w:tr>
      ${tc('TOTAL SUPPLY', true, '2E4057', '4320')}
      ${tc('{total_supply_qty}', true, '2E4057', '1440')}
      ${tc('{total_supply_amount}', true, '2E4057', '3600')}
    </w:tr>
    <w:tr>
      ${tcd('Freight, P&amp;F, Insurance (Till site delivery), Offloading, shifting till site &amp; Installation', '4320')}
      ${tcd('-', '1440')}
      ${tcd('{freight_amount}', '3600')}
    </w:tr>
    <w:tr>
      ${tcd('SPECIAL DISCOUNT (UNIT)', '4320')}
      ${tcd('-', '1440')}
      ${tcd('{special_discount}', '3600')}
    </w:tr>
    <w:tr>
      ${tcd('Project Base Discount', '4320')}
      ${tcd('-', '1440')}
      ${tcd('{project_discount}', '3600')}
    </w:tr>
    <w:tr>
      ${tc('TOTAL PROJECT VALUE (Rs)', true, 'C00000', '4320')}
      ${tc('{total_qty}', true, 'C00000', '1440')}
      ${tc('{total_project_value}', true, 'C00000', '3600')}
    </w:tr>
  </w:tbl>
  <w:p><w:pPr><w:spacing w:after="200"/></w:pPr></w:p>

  <!-- â•â• TERMS & CONDITIONS â•â• -->
  ${sectionHead('Terms &amp; Conditions')}
  <w:tbl>${tblPr()}
    <w:tr>${tc('Prices', true, '2E4057', '3120')}${tcd('{price_basis}', '6240')}</w:tr>
    <w:tr>${tc('GST (Good &amp; Services Taxes)', true, '2E4057', '3120')}${tcd('{gst_text}', '6240')}</w:tr>
    <w:tr>${tc('Installation', true, '2E4057', '3120')}${tcd('{installation_included}', '6240')}</w:tr>
    <w:tr>${tc('Freight', true, '2E4057', '3120')}${tcd('{freight_included}', '6240')}</w:tr>
    <w:tr>${tc('Warranty (*) Manufacturing', true, '2E4057', '3120')}${tcd('{warranty_period}', '6240')}</w:tr>
    <w:tr>${tc('Exact Delivery Timelines', true, '2E4057', '3120')}${tcd('{delivery_timeline}', '6240')}</w:tr>
    <w:tr>${tc('Exact Installation Timelines', true, '2E4057', '3120')}${tcd('{installation_timeline}', '6240')}</w:tr>
    <w:tr>${tc('DLP Period (Defect Liability Period)', true, '2E4057', '3120')}${tcd('{dlp_period}', '6240')}</w:tr>
    <w:tr>${tc('Freight, P&amp;F, Insurance (Till site delivery), Offloading, shifting till site', true, '2E4057', '3120')}${tcd('{freight_terms}', '6240')}</w:tr>
    <w:tr>${tc('Third Party Insurance : Supplier\'s Liability', true, '2E4057', '3120')}${tcd('{third_party_insurance}', '6240')}</w:tr>
    <w:tr>${tc('CAR (Contractors\' All Risk) Policy : Supplier\'s Liability', true, '2E4057', '3120')}${tcd('{car_policy}', '6240')}</w:tr>
    <w:tr>${tc('Water &amp; Electricity', true, '2E4057', '3120')}${tcd('{water_electricity}', '6240')}</w:tr>
    <w:tr>${tc('Payment', true, '2E4057', '3120')}${tcd('{payment_terms}', '6240')}</w:tr>
    <w:tr>${tc('Payment Note', true, '2E4057', '3120')}${tcd('{payment_note}', '6240')}</w:tr>
    <w:tr>${tc('Dispatch', true, '2E4057', '3120')}${tcd('{dispatch_time}', '6240')}</w:tr>
    <w:tr>${tc('Validity', true, '2E4057', '3120')}${tcd('{validity_days} Days', '6240')}</w:tr>
    <w:tr>${tc('PO Address and Other Details Required', true, '2E4057', '3120')}${tcd('{company_address}', '6240')}</w:tr>
    <w:tr>${tc('Billing &amp; Delivery Address', true, '2E4057', '3120')}${tcd('{billing_delivery_note}', '6240')}</w:tr>
    <w:tr>${tc('Site Person Name &amp; Contact Number', true, '2E4057', '3120')}${tcd('{site_person_details}', '6240')}</w:tr>
    <w:tr>${tc('GSTIN', true, '2E4057', '3120')}${tcd('{company_gstin}', '6240')}</w:tr>
    <w:tr>${tc('PAN', true, '2E4057', '3120')}${tcd('{company_pan}', '6240')}</w:tr>
  </w:tbl>
  <w:p><w:pPr><w:spacing w:after="200"/></w:pPr></w:p>

  <!-- â•â• BANK DETAILS â•â• -->
  ${sectionHead('Bank Details')}
  <w:tbl>${tblPr()}
    <w:tr>${tc('1.) Bank Name', true, '2E4057', '3120')}${tcd('{bank_name}', '6240')}</w:tr>
    <w:tr>${tc('2.) Bank Address', true, '2E4057', '3120')}${tcd('{bank_address}', '6240')}</w:tr>
    <w:tr>${tc('3.) Bank Branch IFSC', true, '2E4057', '3120')}${tcd('{bank_ifsc}', '6240')}</w:tr>
    <w:tr>${tc('4.) Bank Account No', true, '2E4057', '3120')}${tcd('{bank_account_number}', '6240')}</w:tr>
  </w:tbl>
  <w:p><w:pPr><w:spacing w:after="200"/></w:pPr></w:p>

  <!-- â•â• SALES PERSON â•â• -->
  ${sectionHead('Sales Person')}
  <w:tbl>${tblPr()}
    <w:tr>${tc('Name', true, '2E4057', '3120')}${tcd('{salesperson_name}', '6240')}</w:tr>
    <w:tr>${tc('Mobile No', true, '2E4057', '3120')}${tcd('{salesperson_phone}', '6240')}</w:tr>
    <w:tr>${tc('Email ID', true, '2E4057', '3120')}${tcd('{salesperson_email}', '6240')}</w:tr>
  </w:tbl>
  <w:p><w:pPr><w:spacing w:after="200"/></w:pPr></w:p>

  <!-- â•â• FOOTER â•â• -->
  <w:p><w:pPr><w:spacing w:after="80"/></w:pPr>
    <w:r><w:rPr><w:i/></w:rPr><w:t xml:space="preserve">{footer_note_1}</w:t></w:r>
  </w:p>
  <w:p><w:pPr><w:spacing w:after="80"/></w:pPr>
    <w:r><w:rPr><w:i/></w:rPr><w:t xml:space="preserve">{footer_note_2}</w:t></w:r>
  </w:p>

  <w:sectPr>
    <w:pgSz w:w="12240" w:h="15840"/>
    <w:pgMar w:top="1080" w:right="1080" w:bottom="1080" w:left="1080"
             w:header="720" w:footer="720" w:gutter="0"/>
  </w:sectPr>
</w:body>
</w:document>`;
// â”€â”€ Pack into ZIP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const zip = new PizZip();
zip.file('[Content_Types].xml', contentTypes);
zip.file('_rels/.rels', relsRoot);
zip.file('word/_rels/document.xml.rels', relsWord);
zip.file('word/document.xml', documentXml);
zip.file('word/styles.xml', styles);
zip.file('word/settings.xml', settings);

const buffer = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
const outPath = path.join(TEMPLATES_DIR, 'proposal-v2.docx');
try { fs.unlinkSync(outPath); } catch (_) {}
fs.writeFileSync(outPath, buffer);

console.log(`✅  Template written to: ${outPath}`);
