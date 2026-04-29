# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tmp\e2e-findings.spec.cjs >> bulk transfer from inventory fails because IT/DR is required but not collected
- Location: tmp\e2e-findings.spec.cjs:37:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Inventory', exact: true })

```

# Page snapshot

```yaml
- generic [active]:
  - generic [ref=e2]:
    - img [ref=e4]
    - heading "Oops! Something went wrong." [level=2] [ref=e6]
    - paragraph [ref=e7]: The application encountered an unexpected error. This usually happens due to a synchronization delay or a temporary connection issue.
    - generic [ref=e8]:
      - paragraph [ref=e9]: Diagnostic Info
      - paragraph [ref=e10]: "Failed to fetch dynamically imported module: http://127.0.0.1:4174/src/pages/GalleryManagementPage.tsx"
    - generic [ref=e11]:
      - button "Try Refresh" [ref=e12]:
        - img [ref=e13]
        - text: Try Refresh
      - button "Reset & Fix" [ref=e18]:
        - img [ref=e19]
        - text: Reset & Fix
    - paragraph [ref=e23]: Artisflow Secure Recovery Protocol
  - generic [ref=e26]:
    - generic [ref=e27]: "[plugin:vite:react-babel] C:\\Users\\willb\\Documents\\artisflow\\src\\pages\\Inventory.tsx: Identifier 'React' has already been declared. (6:7) 9 | import { Artwork, ArtworkStatus, Branch, ExhibitionEvent, SaleRecord, isInTransitStatus, UserPermissions, ReturnType } from '../types';"
    - generic [ref=e28]: C:/Users/willb/Documents/artisflow/src/pages/Inventory.tsx:6:7
    - generic [ref=e29]: "3 | import { utils, writeFile } from 'xlsx'; 4 | /* Optimized Module Transformation | Last Refresh: 2026-04-12 */ 5 | import React, { useState, useMemo, useRef } from 'react'; | ^ 6 | import { utils, writeFile } from 'xlsx'; 7 | import ExcelJS from 'exceljs';"
    - generic [ref=e30]: at constructor (C:\Users\willb\Documents\artisflow\node_modules\@babel\parser\lib\index.js:367:19) at TypeScriptParserMixin.raise (C:\Users\willb\Documents\artisflow\node_modules\@babel\parser\lib\index.js:6624:19) at TypeScriptScopeHandler.checkRedeclarationInScope (C:\Users\willb\Documents\artisflow\node_modules\@babel\parser\lib\index.js:1646:19) at TypeScriptScopeHandler.declareName (C:\Users\willb\Documents\artisflow\node_modules\@babel\parser\lib\index.js:1612:12) at TypeScriptScopeHandler.declareName (C:\Users\willb\Documents\artisflow\node_modules\@babel\parser\lib\index.js:4909:11) at TypeScriptParserMixin.declareNameFromIdentifier (C:\Users\willb\Documents\artisflow\node_modules\@babel\parser\lib\index.js:7594:16) at TypeScriptParserMixin.checkIdentifier (C:\Users\willb\Documents\artisflow\node_modules\@babel\parser\lib\index.js:7590:12) at TypeScriptParserMixin.checkLVal (C:\Users\willb\Documents\artisflow\node_modules\@babel\parser\lib\index.js:7527:12) at TypeScriptParserMixin.finishImportSpecifier (C:\Users\willb\Documents\artisflow\node_modules\@babel\parser\lib\index.js:14342:10) at TypeScriptParserMixin.parseImportSpecifierLocal (C:\Users\willb\Documents\artisflow\node_modules\@babel\parser\lib\index.js:14339:31) at TypeScriptParserMixin.maybeParseDefaultImportSpecifier (C:\Users\willb\Documents\artisflow\node_modules\@babel\parser\lib\index.js:14446:12) at TypeScriptParserMixin.parseImportSpecifiersAndAfter (C:\Users\willb\Documents\artisflow\node_modules\@babel\parser\lib\index.js:14315:29) at TypeScriptParserMixin.parseImport (C:\Users\willb\Documents\artisflow\node_modules\@babel\parser\lib\index.js:14311:17) at TypeScriptParserMixin.parseImport (C:\Users\willb\Documents\artisflow\node_modules\@babel\parser\lib\index.js:9412:26) at TypeScriptParserMixin.parseStatementContent (C:\Users\willb\Documents\artisflow\node_modules\@babel\parser\lib\index.js:12952:27) at TypeScriptParserMixin.parseStatementContent (C:\Users\willb\Documents\artisflow\node_modules\@babel\parser\lib\index.js:9569:18) at TypeScriptParserMixin.parseStatementLike (C:\Users\willb\Documents\artisflow\node_modules\@babel\parser\lib\index.js:12843:17) at TypeScriptParserMixin.parseModuleItem (C:\Users\willb\Documents\artisflow\node_modules\@babel\parser\lib\index.js:12820:17) at TypeScriptParserMixin.parseBlockOrModuleBlockBody (C:\Users\willb\Documents\artisflow\node_modules\@babel\parser\lib\index.js:13392:36) at TypeScriptParserMixin.parseBlockBody (C:\Users\willb\Documents\artisflow\node_modules\@babel\parser\lib\index.js:13385:10) at TypeScriptParserMixin.parseProgram (C:\Users\willb\Documents\artisflow\node_modules\@babel\parser\lib\index.js:12698:10) at TypeScriptParserMixin.parseTopLevel (C:\Users\willb\Documents\artisflow\node_modules\@babel\parser\lib\index.js:12688:25) at TypeScriptParserMixin.parse (C:\Users\willb\Documents\artisflow\node_modules\@babel\parser\lib\index.js:14568:25) at TypeScriptParserMixin.parse (C:\Users\willb\Documents\artisflow\node_modules\@babel\parser\lib\index.js:10183:18) at parse (C:\Users\willb\Documents\artisflow\node_modules\@babel\parser\lib\index.js:14602:38) at parser (C:\Users\willb\Documents\artisflow\node_modules\@babel\core\lib\parser\index.js:41:34) at parser.next (<anonymous>) at normalizeFile (C:\Users\willb\Documents\artisflow\node_modules\@babel\core\lib\transformation\normalize-file.js:64:37) at normalizeFile.next (<anonymous>) at run (C:\Users\willb\Documents\artisflow\node_modules\@babel\core\lib\transformation\index.js:22:50) at run.next (<anonymous>) at transform (C:\Users\willb\Documents\artisflow\node_modules\@babel\core\lib\transform.js:22:33) at transform.next (<anonymous>) at step (C:\Users\willb\Documents\artisflow\node_modules\gensync\index.js:261:32) at C:\Users\willb\Documents\artisflow\node_modules\gensync\index.js:273:13 at async.call.result.err.err (C:\Users\willb\Documents\artisflow\node_modules\gensync\index.js:223:11) at C:\Users\willb\Documents\artisflow\node_modules\gensync\index.js:189:28 at C:\Users\willb\Documents\artisflow\node_modules\@babel\core\lib\gensync-utils\async.js:67:7 at C:\Users\willb\Documents\artisflow\node_modules\gensync\index.js:113:33 at step (C:\Users\willb\Documents\artisflow\node_modules\gensync\index.js:287:14) at C:\Users\willb\Documents\artisflow\node_modules\gensync\index.js:273:13 at async.call.result.err.err (C:\Users\willb\Documents\artisflow\node_modules\gensync\index.js:223:11
    - generic [ref=e31]:
      - text: Click outside, press Esc key, or fix the code to dismiss.
      - text: You can also disable this overlay by setting
      - code [ref=e32]: server.hmr.overlay
      - text: to
      - code [ref=e33]: "false"
      - text: in
      - code [ref=e34]: vite.config.ts
      - text: .
```

# Test source

```ts
  1   | const { test, expect } = require('@playwright/test');
  2   | const path = require('path');
  3   | 
  4   | const APP_URL = 'http://127.0.0.1:4174/';
  5   | 
  6   | async function loginAsAdmin(page) {
  7   |   await page.goto(APP_URL, { waitUntil: 'networkidle' });
  8   |   const options = await page.locator('select option').evaluateAll((nodes) =>
  9   |     nodes.map((n) => ({ text: n.textContent, value: n.value }))
  10  |   );
  11  |   await page.locator('select').selectOption(options.find((o) => /Demo Admin/.test(o.text)).value);
  12  |   await page.getByRole('button', { name: /initialize session/i }).click();
  13  |   await expect(page.getByText(/Dashboard Live/i)).toBeVisible();
  14  | }
  15  | 
  16  | async function openOperationsInventory(page) {
  17  |   await page.getByRole('button', { name: 'Gallery Operations' }).click();
  18  |   await expect(page.getByText(/Gallery Operations/i)).toBeVisible();
> 19  |   await page.getByRole('button', { name: 'Inventory', exact: true }).click();
      |                                                                      ^ Error: locator.click: Test timeout of 30000ms exceeded.
  20  |   await expect(page.getByRole('button', { name: /Select All/i })).toBeVisible();
  21  | }
  22  | 
  23  | test('index.html still requests missing /index.css', async ({ page }) => {
  24  |   const responses = [];
  25  |   page.on('response', (response) => {
  26  |     if (response.url().endsWith('/index.css')) {
  27  |       responses.push({ status: response.status(), url: response.url() });
  28  |     }
  29  |   });
  30  | 
  31  |   await page.goto(APP_URL, { waitUntil: 'networkidle' });
  32  | 
  33  |   expect(responses.length).toBeGreaterThan(0);
  34  |   expect(responses[0].status).toBe(404);
  35  | });
  36  | 
  37  | test('bulk transfer from inventory fails because IT/DR is required but not collected', async ({ page }) => {
  38  |   await loginAsAdmin(page);
  39  | 
  40  |   await page.getByRole('button', { name: 'Artwork T/R' }).click();
  41  |   await expect(page.getByText(/Artwork Transfer Management/i)).toBeVisible();
  42  |   const beforeRows = await page.locator('tbody tr').count();
  43  | 
  44  |   await page.getByRole('button', { name: 'Dashboard' }).click();
  45  |   await openOperationsInventory(page);
  46  | 
  47  |   await page.getByRole('button', { name: /Select All/i }).click();
  48  |   await expect(page.getByText(/Selection/i)).toBeVisible();
  49  |   await page.getByRole('button', { name: 'Transfer', exact: true }).click();
  50  | 
  51  |   const proceedAnyway = page.getByRole('button', { name: /Yes, Proceed Anyway/i });
  52  |   if (await proceedAnyway.isVisible().catch(() => false)) {
  53  |     await proceedAnyway.click();
  54  |   }
  55  | 
  56  |   await expect(page.getByText(/Bulk Transfer/i)).toBeVisible();
  57  |   const transferSelect = page.locator('select').filter({ has: page.locator('option[value=""]') }).last();
  58  |   const transferOptions = await transferSelect.locator('option').evaluateAll((nodes) =>
  59  |     nodes.map((n) => ({ text: n.textContent, value: n.value })).filter((o) => o.value)
  60  |   );
  61  |   await transferSelect.selectOption(transferOptions[0].value);
  62  |   await page.getByRole('button', { name: /Confirm Action/i }).click();
  63  |   await page.waitForTimeout(1200);
  64  | 
  65  |   await page.getByRole('button').filter({ has: page.locator('svg') }).nth(1).click();
  66  |   await expect(page.getByText(/IT\/DR attachment is mandatory for transfers\./i)).toBeVisible();
  67  | 
  68  |   await page.getByRole('button', { name: 'Artwork T/R' }).click();
  69  |   await expect(page.getByText(/Artwork Transfer Management/i)).toBeVisible();
  70  |   const afterRows = await page.locator('tbody tr').count();
  71  |   expect(afterRows).toBe(beforeRows);
  72  | });
  73  | 
  74  | test('sales approval quick action bypasses the detailed checklist', async ({ page }) => {
  75  |   await loginAsAdmin(page);
  76  | 
  77  |   await page.getByRole('button', { name: 'Sales Approval' }).click();
  78  |   await expect(page.getByText(/Review and approve pending sales transactions/i)).toBeVisible();
  79  | 
  80  |   const firstApproveButton = page.getByRole('button', { name: 'Approve', exact: true }).first();
  81  |   await expect(firstApproveButton).toBeDisabled();
  82  | 
  83  |   await page.getByLabel(/I confirm that the buyer has been contacted via contact number or email\./i).first().check();
  84  |   await expect(firstApproveButton).toBeEnabled();
  85  | 
  86  |   await page.getByText(/Pending Approval/i).first().click();
  87  |   await expect(page.getByText(/Approval Checklist/i)).toBeVisible();
  88  | 
  89  |   const modalApproveButton = page.getByRole('button', { name: /Approve Transaction/i });
  90  |   await expect(modalApproveButton).toBeDisabled();
  91  | });
  92  | 
  93  | test('manual return from framer stores a blob URL in the transfer record', async ({ page }) => {
  94  |   await loginAsAdmin(page);
  95  | 
  96  |   await page.getByRole('button', { name: 'Gallery Operations' }).click();
  97  |   await expect(page.getByText(/Gallery Operations/i)).toBeVisible();
  98  |   await page.getByRole('button', { name: 'For Framing', exact: true }).click();
  99  | 
  100 |   if (await page.getByText(/No framing records found/i).isVisible().catch(() => false)) {
  101 |     test.skip(true, 'Demo data has no active framing records to exercise this flow.');
  102 |   }
  103 | 
  104 |   await page.locator('div').filter({ has: page.getByText(/FOR FRAMING/i).first() }).first().click();
  105 |   await expect(page.getByText(/Framer Record Details/i)).toBeVisible();
  106 | 
  107 |   await page.getByRole('button', { name: /Transfer to Another/i }).click();
  108 |   await page.locator('select').last().selectOption({ index: 1 });
  109 | 
  110 |   const uploadInput = page.locator('#itdr-upload-dashboard');
  111 |   await uploadInput.setInputFiles(path.join(process.cwd(), 'src', 'assets', 'art_bg_1.svg'));
  112 |   await expect(page.getByText(/Confirm Return/i)).toBeVisible();
  113 | 
  114 |   await page.getByRole('button', { name: /Confirm Return/i }).click();
  115 |   await page.getByRole('button', { name: /Confirm Final Return/i }).click();
  116 |   await page.waitForTimeout(1200);
  117 | 
  118 |   await page.getByRole('button', { name: 'Artwork T/R' }).click();
  119 |   await expect(page.getByText(/Artwork Transfer Management/i)).toBeVisible();
```