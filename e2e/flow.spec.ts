import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { unzipSync, strFromU8 } from 'fflate';

async function newBlankProject(page: Page, name: string, w: string, h: string) {
  await page.goto('/');
  await page.getByRole('button', { name: '+ New project' }).click();
  await page.getByLabel('Project name').fill(name);
  await page.getByRole('button', { name: /Blank wall/ }).click();
  await page.getByLabel('Wall width *').fill(w);
  await page.getByLabel('Wall height *').fill(h);
  await page.getByLabel('Wall height *').press('Enter');
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(page.locator('.wall-canvas canvas').first()).toBeVisible();
}

async function addPreset(page: Page, preset: RegExp) {
  const button = page.getByRole('button', { name: '+ Placeholder' });
  // On phones the tab toggles the bottom sheet; only open it when needed.
  if (!(await button.isVisible())) await page.getByRole('tab', { name: 'Add' }).click();
  await button.click();
  await page.getByRole('button', { name: preset }).click();
}

test('blank wall → placeholders → arrange → undo → PDF + .decorplan → re-import', async ({ page }, info) => {
  test.skip(info.project.name !== 'chromium', 'full flow runs on desktop');
  await newBlankProject(page, 'Living room', '320', '270');

  await addPreset(page, /^40 × 50/);
  await addPreset(page, /^50 × 70/);

  // Second piece (50 × 70) is selected: position it numerically.
  await page.getByRole('tab', { name: /Selection/ }).click();
  await page.getByLabel('From left').fill('150');
  await page.getByLabel('From left').press('Enter');
  await page.getByLabel('From floor').fill('95');
  await page.getByLabel('From floor').press('Enter');
  await expect(page.getByText('← 175 cm · ↑ 165 cm')).toBeVisible();

  // Undo / redo the last move.
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByLabel('From floor')).not.toHaveValue('95');
  await page.getByRole('button', { name: 'Redo' }).click();
  await expect(page.getByLabel('From floor')).toHaveValue('95');

  // Invalid input shows an error and keeps the value.
  await page.getByLabel('From left').fill('abc');
  await page.getByLabel('From left').press('Enter');
  await expect(page.getByRole('alert')).toHaveText('Not a valid length');

  // Export the PDF (placeholders overlap at the centre → warning first).
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const pdfDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF' }).click();
  const anyway = page.getByRole('button', { name: 'Export anyway' });
  if (await anyway.isVisible({ timeout: 1000 }).catch(() => false)) await anyway.click();
  const pdf = await pdfDownload;
  expect(pdf.suggestedFilename()).toBe('Living room - mounting plan.pdf');
  const pdfBytes = readFileSync((await pdf.path())!);
  expect(pdfBytes.subarray(0, 5).toString()).toBe('%PDF-');

  // Export the project file and check its contents.
  const planDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download .decorplan' }).click();
  const plan = await planDownload;
  expect(plan.suggestedFilename()).toBe('Living room.decorplan');
  const files = unzipSync(new Uint8Array(readFileSync((await plan.path())!)));
  const manifest = JSON.parse(strFromU8(files['manifest.json']));
  expect(manifest).toMatchObject({ format: 'decorplan', formatVersion: 1 });
  const project = JSON.parse(strFromU8(files['project.json']));
  expect(project.placements).toHaveLength(2);
  expect(project.placements[1]).toMatchObject({ xMm: 1500, yMm: 950 });
  expect(JSON.parse(strFromU8(files['pieces.json']))).toHaveLength(2);
  await page.getByRole('button', { name: 'Close' }).click();

  // Back to the list: the project shows as exported; import the file as a new project.
  await page.getByRole('button', { name: 'Back to projects' }).click();
  await expect(page.getByText(/Last exported today/)).toBeVisible();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Import' }).click();
  await (await chooser).setFiles((await plan.path())!);
  await expect(page.getByRole('status')).toContainText('Imported “Living room”');
  await expect(page.locator('.project-card')).toHaveCount(2);

  // The library holds each piece once.
  await page.getByRole('link', { name: 'Library' }).click();
  await expect(page.locator('.piece-card')).toHaveCount(2);
});

test('wall from an angled photo is straightened', async ({ page }, info) => {
  test.skip(info.project.name !== 'chromium', 'pointer precision test runs on desktop');
  await page.goto('/');
  await page.getByRole('button', { name: '+ New project' }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: /Choose a photo/ }).click();
  await (await chooser).setFiles('e2e/fixtures/wall-photo.jpg');
  await expect(page.locator('.handle-hit')).toHaveCount(4);
  // Cross two corners → invalid.
  const img = (await page.locator('.corner-canvas img').boundingBox())!;
  const s = img.width / 1600;
  const tl = (await page.locator('.handle-hit').nth(0).boundingBox())!;
  await page.mouse.move(tl.x + tl.width / 2, tl.y + tl.height / 2);
  await page.mouse.down();
  await page.mouse.move(img.x + 1500 * s, img.y + 100 * s, { steps: 5 });
  await page.mouse.up();
  await expect(page.getByText(/corners cross/)).toBeVisible();
  // Put the corners on the wall.
  const targets = [[200, 150], [1400, 260], [1350, 1050], [250, 1120]];
  for (let i = 0; i < 4; i++) {
    const hb = (await page.locator('.handle-hit').nth(i).boundingBox())!;
    await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
    await page.mouse.down();
    await page.mouse.move(img.x + targets[i][0] * s, img.y + targets[i][1] * s, { steps: 5 });
    await page.mouse.up();
  }
  await expect(page.getByRole('button', { name: 'Preview' })).toBeDisabled();
  await page.getByLabel('Wall width *').fill('320');
  await page.getByLabel('Wall height *').fill('270');
  await page.getByLabel('Wall height *').press('Enter');
  await page.getByRole('button', { name: 'Preview' }).click();
  const preview = page.locator('.rectify-preview img');
  await expect(preview).toBeVisible();
  const ratio = await preview.evaluate((el: HTMLImageElement) => el.naturalWidth / el.naturalHeight);
  expect(ratio).toBeCloseTo(320 / 270, 2);
  await page.getByRole('button', { name: 'Use this' }).click();
  await page.getByRole('tab', { name: 'Wall' }).click();
  await expect(page.getByLabel('Wall width')).toHaveValue('320');
  await expect(page.getByRole('button', { name: 'Adjust corners' })).toBeVisible();
});

test('works offline after the first load', async ({ page, context }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    return reg.active?.state;
  });
  await page.reload(); // now controlled by the service worker
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();
  await newBlankProject(page, 'Offline wall', '300', '250');
  await addPreset(page, /^30 × 40/);
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const dl = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF' }).click();
  expect((await dl).suggestedFilename()).toBe('Offline wall - mounting plan.pdf');
});

test('phone layout has no horizontal page scroll', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile', 'mobile only');
  await newBlankProject(page, 'Phone', '300', '250');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await expect(page.getByRole('button', { name: 'Export', exact: true })).toBeInViewport();
});
