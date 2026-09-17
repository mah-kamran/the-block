import { useState } from 'react'
import styles from './Gallery.module.css'

export function Gallery({ images, alt }: { images: string[]; alt: string }) {
  const [index, setIndex] = useState(0)
  const current = images[index] ?? images[0]
  if (!current) return <div className={styles.main} />
  return (
    <div className={styles.gallery}>
      <div className={styles.main}>
        <img src={current} alt={`${alt}, photo ${index + 1} of ${images.length}`} width={800} height={600} />
        <span className={styles.counter}>{index + 1} / {images.length}</span>
      </div>
      {images.length > 1 && (
        <ul className={styles.thumbs}>
          {images.map((src, i) => (
            <li key={src}>
              <button
                type="button"
                className={`${styles.thumb} ${i === index ? styles.thumbActive : ''}`}
                onClick={() => setIndex(i)}
                aria-label={`Show photo ${i + 1}`}
                aria-current={i === index}
              >
                <img src={src} alt="" loading="lazy" width={160} height={120} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
