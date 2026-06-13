type Props = {
  onClick: () => void
  disabled?: boolean
  label?: string
}

export default function SearchButton({ onClick, disabled, label }: Props) {
  return (
    <div className="max-w-md mx-auto">
      <button
        onClick={onClick}
        disabled={disabled}
        className="w-full bg-[#d3883f] text-white rounded-full py-3 text-lg shadow-md transition hover:bg-[#c2792f] active:scale-[0.98] disabled:opacity-60"
      >
        {label ?? 'AIルート検索'}
      </button>
    </div>
  )
}
