// React import not required with new JSX transform

type Props = {
  onClick: () => void
}

export default function SearchButton({ onClick }: Props) {
  return (
    <div className="max-w-md mx-auto">
      <button onClick={onClick} className="w-full bg-[#d3883f] text-white rounded-full py-3 text-lg shadow-md transition hover:bg-[#c2792f] active:scale-[0.98]">AIルート検索</button>
    </div>
  )
}
