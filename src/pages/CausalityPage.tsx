import React from 'react'
import { CausalityView } from '../components/CausalityView'
import { useAppContext } from '../contexts/AppContext'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { PageHeader } from '../components/common/PageHeader'
import { EmptyState } from '../components/common/EmptyState'
import { NextSteps } from '../components/common/NextSteps'
import { useLoadSample } from '../hooks/useLoadSample'

const HINT = '事実・証言の依存グラフ。ノードを選択すると上流・下流が強調されます。'

export const CausalityPage: React.FC = () => {
  const { storyData, setStoryData } = useAppContext()
  const loadSample = useLoadSample()

  if (!storyData) {
    return (
      <div className="page causality-page">
        <PageHeader eyebrow="検証・分析" title="因果関係ビュー" hint={HINT} />
        <EmptyState
          icon="◎"
          title="物語データが読み込まれていません"
          description="行動を入力するか、サンプルを読み込むと因果グラフが表示されます。"
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
    <div className="page causality-page">
      <PageHeader eyebrow="検証・分析" title="因果関係ビュー" hint={HINT} />
      <div className="page-content">
        <ErrorBoundary>
          <CausalityView storyData={storyData} onStoryDataChange={setStoryData} />
        </ErrorBoundary>
      </div>
      <NextSteps
        steps={[
          {
            label: '破綻の詳細を確認する',
            description: 'カテゴリ別に矛盾・破綻を一覧',
            to: '/validation',
          },
          {
            label: '行動や情報を修正する',
            description: '人物・情報はエンティティ編集で',
            to: '/entities',
          },
        ]}
      />
    </div>
  )
}
