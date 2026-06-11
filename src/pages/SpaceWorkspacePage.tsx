import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import { MapEditor } from '../components/MapEditor'
import { SpaceOverlay } from '../components/Space/SpaceOverlay'
import { SpaceBreakagePanel } from '../components/Space/SpaceBreakagePanel'
import {
  storyDataToMapEditor,
  mapEditorToStoryData,
} from '../components/MapEditor/storyDataAdapter'
import type { MapData } from '../components/MapEditor/types'
import { analyzeStory } from '../modules/consistency'
import { breakageLocationIds, buildMovementPolylines } from '../components/MapBackground/spatial'
import { useAppContext } from '../contexts/AppContext'
import { useLoadSample } from '../hooks/useLoadSample'
import { PageHeader } from '../components/common/PageHeader'
import { EmptyState } from '../components/common/EmptyState'
import { PageGuide } from '../components/common/PageGuide'
import styles from './SpaceWorkspacePage.module.css'

const HINT =
  '場所の配置・接続を編集しながら、人物の動線と破綻地点を同じ地図上で確認できます。編集はそのまま物語データに反映されます。'

export const SpaceWorkspacePage: React.FC = () => {
  const { storyData, setStoryData } = useAppContext()
  const loadSample = useLoadSample()
  const [showMovement, setShowMovement] = useState(true)
  const [showBreakage, setShowBreakage] = useState(true)
  // 詳細パネルで選択中の破綻地点。地図のリングと相互にハイライトする。
  const [highlightLocId, setHighlightLocId] = useState<number | null>(null)

  // 自動保存: 編集（ドラッグ/追加/接続/削除/undo）で mapData が変わるたびに
  // debounce して storyData へ非破壊マージで書き戻す。保存ボタンは無し。
  // MapEditor → storyData の一方向なので（初期 import は一度きり）ループしない。
  // 最新の storyData は ref 経由で参照する（setStoryData が更新関数形を取らないため）。
  const storyDataRef = useRef(storyData)
  storyDataRef.current = storyData
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleMapDataChange = useCallback(
    (mapData: MapData) => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        const current = storyDataRef.current
        if (current) setStoryData(mapEditorToStoryData(mapData, current))
      }, 250)
    },
    [setStoryData],
  )
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [])

  // 重い計算（整合性解析・動線）は storyData に対してメモ化し、
  // pan/zoom のたびに再計算しないようにする。
  const report = useMemo(() => (storyData ? analyzeStory(storyData) : null), [storyData])
  const breakLocs = useMemo(
    () =>
      report && storyData
        ? breakageLocationIds(report.breakages, storyData.acts)
        : new Set<number>(),
    [report, storyData],
  )
  const polylines = useMemo(
    () => (storyData ? buildMovementPolylines(storyData.acts) : []),
    [storyData],
  )

  // MapEditor は initialData をマウント時に一度だけ取り込む。空の /space で
  // サンプルを読み込んだ瞬間（null→非null）に正しい初期データで MapEditor が
  // マウントされるよう storyData に追従させる（取り込みは初回のみなので無害）。
  const initialData = useMemo(
    () => (storyData ? storyDataToMapEditor(storyData) : undefined),
    [storyData],
  )

  if (!storyData) {
    return (
      <div className={`page ${styles.pageRoot}`}>
        <PageHeader eyebrow="組む" title="空間" hint={HINT} />
        <EmptyState
          icon="🗺️"
          title="物語データが読み込まれていません"
          description="場所を作るには、まず物語データが必要です。イベント入力で書き始めるか、サンプルを読み込んでください。"
          actions={[
            { label: 'イベント入力で書き始める', to: '/log' },
            {
              label: 'サンプルを読み込む',
              onClick: () => loadSample('mansion'),
              variant: 'secondary',
            },
          ]}
        />
      </div>
    )
  }

  return (
    <div className={`page ${styles.pageRoot}`}>
      <PageHeader
        eyebrow="組む"
        title="空間"
        hint={HINT}
        actions={
          <div className={styles.layerToggles} role="group" aria-label="重ねて表示">
            <button
              type="button"
              className={`${styles.toggle} ${showMovement ? styles.toggleOn : ''}`}
              aria-pressed={showMovement}
              onClick={() => setShowMovement(v => !v)}
            >
              動線
            </button>
            <button
              type="button"
              className={`${styles.toggle} ${showBreakage ? styles.toggleOn : ''}`}
              aria-pressed={showBreakage}
              onClick={() => setShowBreakage(v => !v)}
            >
              破綻{breakLocs.size > 0 ? `（${breakLocs.size}）` : ''}
            </button>
          </div>
        }
      />

      <PageGuide summary="操作ガイド" storageKey="spaceGuide">
        <ul className={styles.guideList}>
          <li>
            <strong>場所を追加</strong>：空白をダブルクリック
          </li>
          <li>
            <strong>移動</strong>：ノードをドラッグ（編集は自動で保存されます）
          </li>
          <li>
            <strong>接続</strong>：「接続」ボタン → 2つのノードを順にクリック（または
            Ctrl/⌘+クリック）
          </li>
          <li>
            <strong>編集・削除</strong>：ノードをダブルクリックで編集／選択して Delete で削除
          </li>
          <li>
            <strong>表示</strong>：ホイールでズーム、空白ドラッグで移動、Ctrl/⌘+Z で取り消し
          </li>
          <li>
            <strong>重ねて確認</strong>
            ：右上の「動線」「破綻」で人物の動きと破綻地点を地図に重ねられます
          </li>
          <li>
            <strong>補助</strong>
            ：背景画像＝間取り図の下敷き、レイアウト＝自動整列。詳細な属性（種別・収容人数・移動時間）はエンティティ編集で
          </li>
        </ul>
      </PageGuide>

      <div className={styles.canvasWrap}>
        <MapEditor
          initialData={initialData}
          onMapDataChange={handleMapDataChange}
          width={800}
          height={600}
          renderOverlay={info => (
            <SpaceOverlay
              info={info}
              persons={storyData.persons}
              polylines={polylines}
              breakLocs={breakLocs}
              showMovement={showMovement}
              showBreakage={showBreakage}
              highlightLocId={highlightLocId}
            />
          )}
        />
      </div>

      {showBreakage && report && (
        <SpaceBreakagePanel
          storyData={storyData}
          breakages={report.breakages}
          highlightLocId={highlightLocId}
          onSelectLocation={setHighlightLocId}
        />
      )}
    </div>
  )
}
