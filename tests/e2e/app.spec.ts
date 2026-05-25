import { test, expect } from '@playwright/test'

test('renders header with VoiceIndia branding', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('VoiceIndia')).toBeVisible()
  await expect(page.getByText('बोलो, लिखो')).toBeVisible()
})

test('language selector shows all languages', async ({ page }) => {
  await page.goto('/')
  const select = page.getByRole('combobox', { name: /select language/i })
  await expect(select).toBeVisible()
  const options = await select.locator('option').count()
  expect(options).toBeGreaterThanOrEqual(23) // 22 Indian + English
})

test('export buttons are disabled when transcript is empty', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: /copy to clipboard/i })).toBeDisabled()
  await expect(page.getByRole('button', { name: /\.txt/i })).toBeDisabled()
})

test('export buttons enable after entering text in preview', async ({ page }) => {
  await page.goto('/')
  const textarea = page.getByRole('textbox', { name: /transcription text/i })
  await textarea.fill('नमस्ते दुनिया')
  await expect(page.getByRole('button', { name: /copy to clipboard/i })).toBeEnabled()
  await expect(page.getByRole('button', { name: /\.txt/i })).toBeEnabled()
})

test('AI correction toggle is present and toggleable', async ({ page }) => {
  await page.goto('/')
  const toggle = page.getByRole('switch', { name: '' })
  await expect(toggle).toHaveAttribute('aria-checked', 'false')
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-checked', 'true')
})

test('mobile layout renders record button prominently', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/')
  const recordBtn = page.getByRole('button', { name: /start recording/i })
  await expect(recordBtn).toBeVisible()
  const box = await recordBtn.boundingBox()
  expect(box?.width).toBeGreaterThan(200) // full-width on mobile
})
