import React from 'react'
import { JsonDataInput } from '../components/JsonDataInput'
import { useAppContext } from '../contexts/AppContext'
import { PageHeader } from '../components/common/PageHeader'
import type { StoryData } from '../types/StoryData'

const HINT =
  '物語データ（JSON）の読み込み・書き出しと、サンプルの投入を行います。ここで読み込んだデータは全画面で共有され、各ビューの編集にも追従します。'

/**
 * データ入出力ページ。
 * 旧シミュレーション画面に同居していた JSON 入力を「① 書く」配下の独立メニューに分離し、
 * 「データの出し入れ」と「再生（シミュレーション）」の役割を切り分ける。
 */
export const DataPage: React.FC = () => {
  const { storyData, setStoryData } = useAppContext()

  const handleDataLoad = (data: StoryData): void => {
    if (data) setStoryData(data)
  }

  return (
    <div className="page">
      <PageHeader eyebrow="書く" title="データ入出力" hint={HINT} />
      <JsonDataInput onDataLoad={handleDataLoad} currentData={storyData} />
    </div>
  )
}
