import React from 'react'
import { Link } from 'react-router-dom'
import { useLoadSample } from '../../hooks/useLoadSample'
import { SAMPLES } from '../../data/samples'
import styles from './OnboardingBanner.module.css'

/**
 * 物語データが空のときに表示する歓迎カード。
 * 「最初の一歩」を3択（このページで書く / サンプル読込 / JSON読込）で提示し、
 * 何から始めればよいか分からない状態を防ぐ。
 */
export const OnboardingBanner: React.FC = () => {
  const loadSample = useLoadSample()

  return (
    <section className={styles.banner} aria-label="はじめに">
      <div className={styles.intro}>
        <span className={styles.eyebrow}>はじめに</span>
        <h2 className={styles.title}>SceneFlow へようこそ</h2>
        <p className={styles.lead}>
          複数の登場人物が別々の場所で同時に進む物語を、作って・検証できるツールです。
          まずは下のいずれかから始めましょう。
        </p>
      </div>
      <ol className={styles.steps}>
        <li className={styles.step}>
          <span className={styles.stepNo}>1</span>
          <div className={styles.stepBody}>
            <p className={styles.stepTitle}>このページで書き始める</p>
            <p className={styles.stepDesc}>
              下の入力欄に「誰が・どこで・何をした」を入れるだけで物語データになります。
            </p>
          </div>
        </li>
        <li className={styles.step}>
          <span className={styles.stepNo}>2</span>
          <div className={styles.stepBody}>
            <p className={styles.stepTitle}>サンプルを読み込む</p>
            <div className={styles.sampleButtons}>
              {SAMPLES.map(sample => (
                <button
                  key={sample.id}
                  type="button"
                  className={styles.sampleButton}
                  title={sample.description}
                  onClick={() => loadSample(sample.id)}
                >
                  {sample.label}
                </button>
              ))}
            </div>
          </div>
        </li>
        <li className={styles.step}>
          <span className={styles.stepNo}>3</span>
          <div className={styles.stepBody}>
            <p className={styles.stepTitle}>JSONを貼り付ける</p>
            <p className={styles.stepDesc}>
              既存データは{' '}
              <Link to="/simulation" className={styles.inlineLink}>
                シミュレーション
              </Link>{' '}
              ページで読み込めます。
            </p>
          </div>
        </li>
      </ol>
    </section>
  )
}
