/**
 * ナビゲーション構成の一元定義。
 * 「書く → 組む → 検証・分析」という作業ジャーニーでグルーピングし、
 * 各項目に役割の一言（hint）を添えて「使い所」を伝える。
 * ルートと表示の対応はここを単一の出所とする。
 */
export interface NavItem {
  to: string
  label: string
  /** その画面の役割を1行で（ツールチップ表示） */
  hint: string
}

export interface NavSection {
  id: string
  label: string
  items: NavItem[]
}

export const NAV_SECTIONS: NavSection[] = [
  {
    id: 'draft',
    label: '① 書く',
    items: [
      { to: '/log', label: 'イベント入力', hint: '誰が・どこで・何をしたかを書いて物語を作る' },
      {
        to: '/data',
        label: 'データ入出力',
        hint: '物語データ（JSON）の読込・書き出しとサンプル投入',
      },
    ],
  },
  {
    id: 'build',
    label: '② 組む',
    items: [
      { to: '/entities', label: 'エンティティ編集', hint: '人物・場所・道具・情報と関係を編集' },
      {
        to: '/space',
        label: '空間',
        hint: '場所の配置・接続を編集し、動線と破綻を地図に重ねて確認',
      },
      { to: '/relationships', label: '関係性', hint: '人物相関図を俯瞰する（閲覧専用）' },
    ],
  },
  {
    id: 'verify',
    label: '③ 検証・分析',
    items: [
      { to: '/validation', label: '検証', hint: '矛盾・破綻をリアルタイムに検査' },
      {
        to: '/simulation',
        label: 'シミュレーション',
        hint: '物語を時間軸で再生し、各時刻の居場所と出来事を確認',
      },
      { to: '/opportunity', label: '容疑者・機会', hint: '時刻×場所・道具・情報で逆引き' },
      { to: '/causality', label: '因果関係ビュー', hint: '事実・証言の依存と矛盾を読む' },
    ],
  },
]
