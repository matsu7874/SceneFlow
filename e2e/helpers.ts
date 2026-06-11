import { expect, type Page } from '@playwright/test'

/**
 * 物語データ（JSON）を「① 書く → データ入出力」ページから読み込む。
 * 旧 UI では /simulation に同居していた JSON 入力を /data へ分離したため、
 * データ投入は必ずこのヘルパー経由にして導線変更に追従しやすくする。
 */
export async function loadStoryData(page: Page, data: unknown): Promise<void> {
  await page.goto('http://localhost:3000/data')
  await page
    .locator('textarea')
    .first()
    .fill(JSON.stringify(data, null, 2))
  await page.getByRole('button', { name: '物語データをロード' }).click()
  await expect(page.locator('text=データが正常にロードされました')).toBeVisible()
}

/** 各ナビ項目が属するフェーズ（プルダウンのトリガー）を引くための対応表。 */
const SECTION_OF: Record<string, RegExp> = {
  イベント入力: /書く/,
  データ入出力: /書く/,
  エンティティ編集: /組む/,
  空間: /組む/,
  関係性: /組む/,
  検証: /検証・分析/,
  シミュレーション: /検証・分析/,
  '容疑者・機会': /検証・分析/,
  因果関係ビュー: /検証・分析/,
}

/**
 * プルダウン化したグローバルナビで、指定ラベルのページへ遷移する。
 * 該当フェーズのトリガーを開いてからリンクをクリックする。
 */
export async function navTo(
  page: Page,
  linkName: keyof typeof SECTION_OF,
  opts: { exact?: boolean } = {},
): Promise<void> {
  const nav = page.getByRole('navigation')
  await nav.getByRole('button', { name: SECTION_OF[linkName] }).click()
  await nav.getByRole('link', { name: linkName, exact: opts.exact ?? false }).click()
}
