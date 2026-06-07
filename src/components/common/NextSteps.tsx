import React from 'react'
import { Link } from 'react-router-dom'
import styles from './NextSteps.module.css'

export interface NextStep {
  label: string
  description?: string
  /** 遷移先ルート */
  to: string
  /** 遷移先へ渡す文脈（location.state で受け取る。例: 対象 locationId） */
  state?: unknown
}

interface NextStepsProps {
  title?: string
  steps: NextStep[]
}

/**
 * 分析・検証ページの末尾に置く「問題→解決」出口導線。
 * 読み取り専用ページから「次に何をすべきか・どのページへ行くか」を明示する。
 */
export const NextSteps: React.FC<NextStepsProps> = ({ title = '次にできること', steps }) => {
  if (steps.length === 0) return null
  return (
    <section className={styles.nextSteps} aria-label={title}>
      <h3 className={styles.heading}>{title}</h3>
      <ul className={styles.list}>
        {steps.map((step, i) => (
          <li key={i}>
            <Link to={step.to} state={step.state} className={styles.link}>
              <span className={styles.text}>
                <span className={styles.label}>{step.label}</span>
                {step.description && <span className={styles.desc}>{step.description}</span>}
              </span>
              <span className={styles.arrow} aria-hidden="true">
                →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
