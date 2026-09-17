import type { TitleStatus } from '../../api/types'
import { capitalize } from '../../lib/format'
import styles from './ConditionCard.module.css'

interface Props {
  grade: number
  report: string
  damageNotes: string[]
  titleStatus: TitleStatus
}

export function ConditionCard({ grade, report, damageNotes, titleStatus }: Props) {
  const pct = Math.round((grade / 5) * 100)
  return (
    <div className={styles.card}>
      <div className={styles.gradeRow}>
        <div>
          <div className={styles.gradeLabel}>Condition grade</div>
          <div className={styles.grade}>
            {grade.toFixed(1)} <span className={styles.outOf}>/ 5</span>
          </div>
        </div>
        <div className={styles.meter} role="img" aria-label={`Condition grade ${grade.toFixed(1)} out of 5`}>
          <span className={`${styles.fill} ${toneFor(grade)}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
      <p className={styles.report}>{report}</p>

      {titleStatus !== 'clean' && (
        <div className={styles.titleWarning} role="note">
          <strong>{capitalize(titleStatus)} title.</strong>{' '}
          {titleStatus === 'salvage'
            ? 'This vehicle has been declared a total loss by an insurer. Verify repair history before bidding.'
            : 'This vehicle was previously salvaged and has since been repaired and re-certified.'}
        </div>
      )}

      <div>
        <h3 className={styles.subhead}>
          Damage notes{' '}
          <span className={styles.count}>{damageNotes.length === 0 ? 'none reported' : damageNotes.length}</span>
        </h3>
        {damageNotes.length > 0 && (
          <ul className={styles.notes}>
            {damageNotes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function toneFor(grade: number): string {
  if (grade >= 4) return styles.good
  if (grade >= 3) return styles.fair
  return styles.poor
}
