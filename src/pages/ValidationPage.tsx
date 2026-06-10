import React from 'react'
import { ValidationReporter } from '../components/ValidationReporter'
import { useAppContext } from '../contexts/AppContext'
import { PageHeader } from '../components/common/PageHeader'
import { EmptyState } from '../components/common/EmptyState'
import { NextSteps } from '../components/common/NextSteps'
import { useLoadSample } from '../hooks/useLoadSample'

const HINT = '物語の因果・動線・所持・情報の整合性をリアルタイムで検査します。'

export const ValidationPage: React.FC = () => {
  const { storyData } = useAppContext()
  const loadSample = useLoadSample()

  return (
    <div className="page validation-page">
      <div className="page-content">
        <PageHeader eyebrow="検証・分析" title="検証" hint={HINT} />

        {storyData ? (
          <>
            <ValidationReporter storyData={storyData} />
            <NextSteps
              title="破綻を直すには"
              steps={[
                {
                  label: '場所の配置・接続を直す',
                  description: '隣接関係は「空間」で編集し動線・破綻を確認',
                  to: '/space',
                },
                {
                  label: '行動の時刻や内容を直す',
                  description: 'イベント入力で修正',
                  to: '/log',
                },
                {
                  label: '人物・道具・情報を直す',
                  description: 'エンティティ編集で修正',
                  to: '/entities',
                },
              ]}
            />
          </>
        ) : (
          <EmptyState
            icon="✓"
            title="物語データが読み込まれていません"
            description="行動を入力するか、サンプルを読み込むと整合性チェックが走ります。"
            actions={[
              { label: 'イベント入力で書き始める', to: '/log' },
              {
                label: 'サンプルを読み込む',
                onClick: () => loadSample('mansion'),
                variant: 'secondary',
              },
            ]}
          />
        )}
      </div>
    </div>
  )
}
