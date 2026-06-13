export type CongestionLevel = 1 | 2 | 3 | 4

export type CongestionLevelInfo = {
  level: CongestionLevel
  label: string
  color: string
}

// 空いている場所が一目で分かるよう、青〜オレンジの4段階で表現
// クリーム背景 (#fffbf7) とメインカラー (#d3883f) に馴染むトーンに調整
export const CONGESTION_LEVELS: CongestionLevelInfo[] = [
  { level: 1, label: '空いています', color: '#5b9bd5' },
  { level: 2, label: 'やや混雑', color: '#f4c089' },
  { level: 3, label: '混雑', color: '#d3883f' },
  { level: 4, label: '非常に混雑', color: '#a8541f' },
]

export function getCongestionColor(level: CongestionLevel): string {
  return CONGESTION_LEVELS[level - 1].color
}

export function getCongestionLabel(level: CongestionLevel): string {
  return CONGESTION_LEVELS[level - 1].label
}
