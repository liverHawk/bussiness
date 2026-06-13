// React import not required with new JSX transform

type Props = {
  label: string
  value: string
  placeholder?: string
  onChange: (v: string) => void
  onFocus?: () => void
  readOnly?: boolean
}

export default function LocationInputCard({ label, value, placeholder, onChange, onFocus, readOnly }: Props) {
  return (
    <div
      className={`bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3 transition ${
        readOnly ? 'cursor-pointer active:scale-[0.98]' : ''
      }`}
    >
      <div className="flex-none">
        <span className="inline-block bg-[#d3883f] text-white px-4 py-2 rounded-full text-sm">{label}</span>
      </div>

      <div className="flex-1">
        <input
          className="w-full bg-transparent outline-none text-sm"
          value={value}
          placeholder={placeholder}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
          onFocus={onFocus}
          readOnly={readOnly}
        />
      </div>

      <div className="flex-none">
        {!readOnly && (
          <button className="text-gray-400">⋯</button>
        )}
      </div>
    </div>
  )
}
