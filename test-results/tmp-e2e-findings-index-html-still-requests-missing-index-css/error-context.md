# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tmp\e2e-findings.spec.cjs >> index.html still requests missing /index.css
- Location: tmp\e2e-findings.spec.cjs:23:1

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 404
Received: 200
```

# Page snapshot

```yaml
- generic [ref=e18]:
  - generic [ref=e19]:
    - heading "Galerie Joaquin" [level=1] [ref=e20]
    - paragraph [ref=e21]: Inventory System
  - generic [ref=e22]:
    - generic [ref=e23]:
      - img [ref=e25]
      - heading "Personnel Authentication" [level=2] [ref=e27]
      - paragraph [ref=e28]: Please select your staff profile to continue
    - generic [ref=e29]:
      - generic [ref=e30]:
        - generic [ref=e31]:
          - generic:
            - img
          - combobox [ref=e32]:
            - option "Select User Profile" [selected]
            - option "Demo Admin — Admin"
            - option "Demo Exclusive — Exclusive"
            - option "Demo Inventory — Inventory Personnel"
            - option "Demo Sales Agent — Sales Agent"
        - generic [ref=e33]:
          - generic:
            - img
          - textbox "Password (Managed by Directory)" [disabled] [ref=e34]: ••••••••••••
      - button "Initialize Session" [disabled] [ref=e35]:
        - generic [ref=e36]: Initialize Session
        - img [ref=e37]
    - button "Sign in with Google" [ref=e41]:
      - generic [ref=e42]: Sign in with Google
    - generic [ref=e43]:
      - generic [ref=e45]: Encrypted
      - generic [ref=e50]: Audit Log
      - generic [ref=e55]: Verified
  - paragraph [ref=e59]: Internal Access Only © 2026 Galerie Joaquin
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
  19  |   await page.getByRole('button', { name: 'Inventory', exact: true }).click();
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
> 34  |   expect(responses[0].status).toBe(404);
      |                               ^ Error: expect(received).toBe(expected) // Object.is equality
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
  120 | 
  121 |   const acceptButtons = page.locator('button[title="Accept Transfer"]');
  122 |   await expect(acceptButtons.last()).toBeVisible();
  123 |   await acceptButtons.last().click();
  124 |   await page.getByRole('button', { name: /Confirm Accept/i }).click();
  125 |   await page.waitForTimeout(1200);
  126 | 
  127 |   await page.getByRole('button', { name: /History Log/i }).click();
  128 |   const detailButtons = page.locator('button[title="View Details"]');
  129 |   await expect(detailButtons.last()).toBeVisible();
  130 |   await detailButtons.last().click();
  131 | 
  132 |   const attachment = page.locator('img[alt="IT/DR Document"]');
  133 |   await expect(attachment).toBeVisible();
  134 |   const src = await attachment.getAttribute('src');
```