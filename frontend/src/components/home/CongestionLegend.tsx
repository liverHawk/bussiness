import { CONGESTION_LEVELS } from '@/lib/congestion'

export default function CongestionLegend() {
  return (
    <div className="absolute bottom-3 left-3 z-[1000] rounded-2xl bg-white/95 px-3 py-2 shadow-md">
      <p className="mb-1 text-xs font-semibold text-[#2f2419]">混雑状況</p>
      <ul className="space-y-0.5">
        {CONGESTION_LEVELS.map(({ level, label, color }) => (
          <li key={level} className="flex items-center gap-2 text-xs text-gray-600">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
            {label}
          </li>
        ))}
      </ul>
    </div>
  )
}
