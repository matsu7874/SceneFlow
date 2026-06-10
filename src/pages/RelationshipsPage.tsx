import React from 'react'
import { Link } from 'react-router-dom'
import { CharacterRelationshipDiagram } from '../components/CharacterRelationshipDiagram'
import { PageHeader } from '../components/common/PageHeader'
import { EmptyState } from '../components/common/EmptyState'
import { NextSteps } from '../components/common/NextSteps'
import { useAppContext } from '../contexts/AppContext'
import { useLoadSample } from '../hooks/useLoadSample'
import styles from './RelationshipsPage.module.css'

const HINT =
  '人物間の関係を俯瞰します（閲覧専用）。関係の追加・編集は『エンティティ編集』の各人物フォームで行います。'

export const RelationshipsPage: React.FC = () => {
  const { storyData } = useAppContext()
  const loadSample = useLoadSample()

  if (!storyData || storyData.persons.length === 0) {
    return (
      <div className={`page relationships-page ${styles.pageRoot}`}>
        <PageHeader eyebrow="組む" title="関係性" hint={HINT} />
        <EmptyState
          icon="◎"
          title={storyData ? '人物がまだ登録されていません' : 'データが読み込まれていません'}
          description="人物と関係を登録すると、ここに相関図が表示されます。"
          actions={[
            { label: 'エンティティ編集で人物を追加', to: '/entities' },
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
    <div className={`page relationships-page ${styles.pageRoot}`}>
      <PageHeader
        eyebrow="組む"
        title="関係性"
        hint={HINT}
        actions={
          <Link to="/entities" className={styles.editLink}>
            関係を編集（エンティティ編集）→
          </Link>
        }
      />
      <div className={styles.pageContent}>
        <CharacterRelationshipDiagram persons={storyData.persons} />
      </div>
      <NextSteps
        steps={[
          {
            label: '関係を追加・編集する',
            description: '各人物フォームの「関係性」で設定します',
            to: '/entities',
          },
          {
            label: '出来事として物語に反映する',
            description: 'イベント入力で行動を記録します',
            to: '/log',
          },
        ]}
      />
    </div>
  )
}
