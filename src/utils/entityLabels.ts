// 参照先が見つからない／未設定のエンティティを人間可読なラベルに変換する。
// 生の「#0」のような表示を避け、原因（未設定か、存在しないidの参照か）を区別する。
// エンティティの id は 1 始まりのため、0 以下は「未設定」とみなす。
export type MissingEntityKind = '人物' | '場所' | '小道具' | '情報'

export function missingEntityLabel(kind: MissingEntityKind, id: number): string {
  return id > 0 ? `不明な${kind}（#${id}）` : `${kind}未設定`
}
