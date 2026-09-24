import { expect, test, type Locator, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

const WALL = 'e2e/fixtures/wall-photo.jpg';

test.skip(({ isMobile }) => isMobile, 'drag and drop from files is a desktop feature');

/** Build a DataTransfer carrying a file, as when dragging from the desktop. */
async function fileTransfer(page: Page, bytes: Buffer, name: string, type: string) {
  return page.evaluateHandle(
    ({ b64, name, type }) => {
      const bin = atob(b64);
      const arr = Uint8Array.from(bin, (c) => c.charCodeAt(0));
      const dt = new DataTransfer();
      dt.items.add(new File([arr], name, { type }));
      return dt;
    },
    { b64: bytes.toString('base64'), name, type },
  );
}

async function dropFile(page: Page, target: Locator, path: string, name = 'wall.jpg', type = 'image/jpeg') {
  const dataTransfer = await fileTransfer(page, readFileSync(path), name, type);
  await target.dispatchEvent('dragenter', { dataTransfer });
  await target.dispatchEvent('dragover', { dataTransfer });
  await target.dispatchEvent('drop', { dataTransfer });
}

async function straighten(page: Page, w: string, h: string, widthLabel: string, heightLabel: string) {
  await expect(page.locator('.handle-hit')).toHaveCount(4);
  await page.getByLabel(widthLabel).fill(w);
  await page.getByLabel(heightLabel).fill(h);
  await page.getByLabel(heightLabel).press('Enter');
  await page.getByRole('button', { name: 'Preview' }).click();
  await page.getByRole('button', { name: 'Use this' }).click();
}

async function newBlankProject(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: '+ New project' }).click();
  await page.getByRole('button', { name: /Blank wall/ }).click();
  await page.getByLabel('Wall width *').fill('300');
  await page.getByLabel('Wall height *').fill('250');
  await page.getByLabel('Wall height *').press('Enter');
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(page.locator('.wall-canvas canvas').first()).toBeVisible();
}

test('drop a wall photo onto the New project dialog', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '+ New project' }).click();
  const dialog = page.locator('.modal .drop-zone');

  // Drop target appears while dragging and clears when the drag leaves.
  const dt = await fileTransfer(page, readFileSync(WALL), 'wall.jpg', 'image/jpeg');
  await dialog.dispatchEvent('dragenter', { dataTransfer: dt });
  await expect(page.getByText('Drop a photo of the wall')).toBeVisible();
  await dialog.dispatchEvent('dragleave', { dataTransfer: dt });
  await expect(page.getByText('Drop a photo of the wall')).toBeHidden();

  await dropFile(page, dialog, WALL);
  await straighten(page, '320', '270', 'Wall width *', 'Wall height *');
  await page.getByRole('tab', { name: 'Wall' }).click();
  await expect(page.getByLabel('Wall width')).toHaveValue('320');
  await expect(page.getByRole('button', { name: 'Replace photo' })).toBeVisible();
});

test('drop a photo onto the Wall panel replaces the wall photo (undoable)', async ({ page }) => {
  await newBlankProject(page);
  await page.getByRole('button', { name: '+ Placeholder' }).click();
  await page.getByRole('button', { name: /^30 × 40/ }).click();
  await page.getByRole('tab', { name: /Selection/ }).click();
  await page.getByLabel('From left').fill('85');
  await page.getByLabel('From left').press('Enter');

  await page.getByRole('tab', { name: 'Wall' }).click();
  const panel = page.locator('.side-panel .drop-zone');

  // Cancelling after a drop leaves the wall unchanged.
  await dropFile(page, panel, WALL);
  await expect(page.locator('.handle-hit')).toHaveCount(4);
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('button', { name: 'Choose photo' })).toBeVisible();

  await dropFile(page, panel, WALL);
  await straighten(page, '320', '270', 'Wall width *', 'Wall height *');
  await expect(page.getByRole('button', { name: 'Replace photo' })).toBeVisible();
  await expect(page.getByLabel('Wall width')).toHaveValue('320');
  await page.getByRole('tab', { name: /Selection/ }).click();
  await expect(page.getByLabel('From left')).toHaveValue('85');

  await page.getByRole('button', { name: 'Undo' }).click();
  await page.getByRole('tab', { name: 'Wall' }).click();
  await expect(page.getByRole('button', { name: 'Choose photo' })).toBeVisible();
  await expect(page.getByLabel('Wall width')).toHaveValue('300');
});

test('drop an image onto the piece editor', async ({ page }) => {
  await page.goto('/#/library');
  await page.getByRole('button', { name: '+ Piece' }).click();
  const editor = page.locator('.modal .drop-zone');
  const dt = await fileTransfer(page, readFileSync(WALL), 'print.jpg', 'image/jpeg');
  await editor.dispatchEvent('dragenter', { dataTransfer: dt });
  await expect(page.getByText('Drop an image of the piece')).toBeVisible();
  await editor.dispatchEvent('drop', { dataTransfer: dt });

  await straighten(page, '40', '50', 'Real width *', 'Real height *');
  await expect(page.getByLabel('Outer width *')).toHaveValue('40');
  await expect(page.getByLabel('Outer height *')).toHaveValue('50');
  await page.getByLabel('Name *').fill('Harbour print');
  await page.getByRole('button', { name: 'Save' }).click();
  const card = page.locator('.piece-card', { hasText: 'Harbour print' });
  await expect(card).toBeVisible();
  await expect(card.locator('img')).toBeVisible();
});

test('non-image drops show an error; stray drops are blocked', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '+ New project' }).click();
  await dropFile(page, page.locator('.modal .drop-zone'), 'package.json', 'plan.pdf', 'application/pdf');
  await expect(page.getByText('Only image files can be used.')).toBeVisible();
  await page.getByRole('button', { name: 'OK' }).click();
  await expect(page.getByRole('heading', { name: 'Set up the wall' })).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();

  // A drop outside any drop zone must not let the browser open the file.
  const prevented = await page.evaluate(() => {
    const dt = new DataTransfer();
    dt.items.add(new File(['x'], 'wall.jpg', { type: 'image/jpeg' }));
    const ev = new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true });
    document.querySelector('.card-grid, .empty, main')!.dispatchEvent(ev);
    return ev.defaultPrevented;
  });
  expect(prevented).toBe(true);
  await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();
});
