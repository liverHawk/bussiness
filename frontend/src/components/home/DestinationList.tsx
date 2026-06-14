import { useState } from 'react'
import { GENRES } from '@/lib/genres'

export type DestinationItem = {
  address: string
  genres: string[]
}

type Props = {
  destinations: DestinationItem[]
  setDestinations: (d: DestinationItem[]) => void
}

export default function DestinationList({ destinations, setDestinations }: Props) {
  const [openGenreIdx, setOpenGenreIdx] = useState<number | null>(null)

  const updateAddress = (idx: number, address: string) => {
    const copy = destinations.map((d, i) => i === idx ? { ...d, address } : d)
    setDestinations(copy)
  }

  const toggleGenre = (idx: number, genreId: string) => {
    const copy = destinations.map((d, i) => {
      if (i !== idx) return d
      const genres = d.genres.includes(genreId)
        ? d.genres.filter((g) => g !== genreId)
        : [...d.genres, genreId]
      return { ...d, genres }
    })
    setDestinations(copy)
  }

  const add = () => setDestinations([...destinations, { address: '', genres: [] }])
  const remove = (idx: number) => setDestinations(destinations.filter((_, i) => i !== idx))

  return (
    <div className="space-y-3">
      {destinations.map((d, i) => (
        <div key={i} className="bg-white rounded-2xl shadow-sm p-4 space-y-2">
          {/* 目的地入力行 */}
          <div className="flex items-center gap-3">
            <div className="flex-none">
              <span className="inline-block bg-[#d3883f] text-white px-4 py-2 rounded-full text-sm">目的地</span>
            </div>
            <div className="flex-1">
              <input
                className="w-full bg-transparent outline-none text-sm"
                value={d.address}
                placeholder="目的地を入力"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateAddress(i, e.target.value)}
              />
            </div>
            <div className="flex-none flex items-center gap-1">
              <button
                type="button"
                onClick={() => setOpenGenreIdx(openGenreIdx === i ? null : i)}
                className="text-xs text-[#d3883f] border border-[#d3883f] rounded-full px-2 py-0.5 transition hover:bg-orange-50"
                aria-label="ジャンル選択"
              >
                {d.genres.length > 0 ? `ジャンル(${d.genres.length})` : 'ジャンル'}
              </button>
              {i > 0 && (
                <button onClick={() => remove(i)} className="text-gray-400 px-2 transition active:scale-90">✕</button>
              )}
            </div>
          </div>

          {/* ジャンルチップ（展開時） */}
          {openGenreIdx === i && (
            <div className="flex flex-wrap gap-2 pt-1">
              {GENRES.map((genre) => {
                const selected = d.genres.includes(genre.id)
                return (
                  <button
                    key={genre.id}
                    type="button"
                    onClick={() => toggleGenre(i, genre.id)}
                    className={`flex items-center gap-1 text-xs px-3 py-1 rounded-full border transition ${
                      selected
                        ? 'bg-[#d3883f] text-white border-[#d3883f]'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-[#d3883f]'
                    }`}
                  >
                    <span>{genre.icon}</span>
                    <span>{genre.name}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      ))}

      <div className="flex justify-center">
        <button
          onClick={add}
          className="w-12 h-12 rounded-full bg-[#d3883f] text-white flex items-center justify-center shadow-md transition hover:bg-[#c2792f] active:scale-95"
        >
          +
        </button>
      </div>
    </div>
  )
}
