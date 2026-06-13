// React import not required with new JSX transform

type Props = {
  destinations: string[]
  setDestinations: (d: string[]) => void
}

export default function DestinationList({ destinations, setDestinations }: Props) {
  const updateAt = (idx: number, v: string) => {
    const copy = [...destinations]
    copy[idx] = v
    setDestinations(copy)
  }

  const add = () => setDestinations([...destinations, ''])
  const remove = (idx: number) => setDestinations(destinations.filter((_, i) => i !== idx))

  return (
    <div className="space-y-3">
      {destinations.map((d, i) => (
        <div key={i} className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3">
          <div className="flex-none">
            <span className="inline-block bg-[#d3883f] text-white px-4 py-2 rounded-full text-sm">行きたいところ</span>
          </div>

          <div className="flex-1">
            <input
              className="w-full bg-transparent outline-none text-sm"
              value={d}
              placeholder="目的地を入力"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateAt(i, e.target.value)}
            />
          </div>

          <div className="flex-none">
            {i > 0 && (
              <button onClick={() => remove(i)} className="text-gray-400 px-2 transition active:scale-90">✕</button>
            )}
          </div>
        </div>
      ))}

      <div className="flex justify-center">
        <button onClick={add} className="w-12 h-12 rounded-full bg-[#d3883f] text-white flex items-center justify-center shadow-md transition hover:bg-[#c2792f] active:scale-95">+</button>
      </div>
    </div>
  )
}
