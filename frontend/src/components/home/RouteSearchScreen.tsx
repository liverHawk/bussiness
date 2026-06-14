"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Header from './Header'
import AuthGuard from '@/components/AuthGuard'
import DestinationList, { type DestinationItem } from './DestinationList'
import TimeSelectorSheet from './TimeSelectorSheet'
import MapSection from './MapSection'
import SearchButton from './SearchButton'
import { generateRoute, searchSpots, type Spot } from '@/lib/api'

export type DepartureItem = {
  storeId: string
  storeName: string
  lat: number
  lng: number
}

export type SearchFormState = {
  departure: DepartureItem
  destinations: DestinationItem[]
  endTime: string
}

const defaultState: SearchFormState = {
  departure: { storeId: '', storeName: '', lat: 0, lng: 0 },
  destinations: [{ storeId: '', storeName: '', lat: 0, lng: 0, genres: [] }],
  endTime: new Date().toTimeString().slice(0, 5),
}

export default function RouteSearchScreen() {
  const router = useRouter()
  const [form, setForm] = useState<SearchFormState>(defaultState)
  const [stores, setStores] = useState<Spot[]>([])
  const [timeSheetOpen, setTimeSheetOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    searchSpots({ congestion: [], genres: [], reviews: [] })
      .then(setStores)
      .catch(() => {})
  }, [])

  const setDeparture = (spot: Spot | null) =>
    setForm((s) => ({
      ...s,
      departure: {
        storeId: spot?.spotId ?? '',
        storeName: spot?.name ?? '',
        lat: spot?.latitude ?? 0,
        lng: spot?.longitude ?? 0,
      },
    }))
  const setDestinations = (destinations: DestinationItem[]) => setForm((s: SearchFormState) => ({ ...s, destinations }))
  const setEndTime = (endTime: string) => setForm((s: SearchFormState) => ({ ...s, endTime }))

  const handleSearch = async () => {
    setError(null)
    setLoading(true)
    try {
      const today = new Date().toISOString().slice(0, 10)
      const specifiedDateTime = new Date(`${today}T${form.endTime}:00`).toISOString()

      if (!form.departure.storeId) {
        setError('出発地を選択してください')
        setLoading(false)
        return
      }
      const filledDests = form.destinations.filter((d) => d.storeId !== '')
      if (filledDests.length === 0) {
        setError('目的地を1つ以上選択してください')
        setLoading(false)
        return
      }

      const result = await generateRoute({
        startLocation: { latitude: form.departure.lat, longitude: form.departure.lng },
        destinations: filledDests.map((d) => ({
          latitude: d.lat,
          longitude: d.lng,
          preferredGenres: d.genres,
        })),
        specifiedDateTime,
        timeType: 'departure',
      })

      sessionStorage.setItem('routeResult', JSON.stringify(result))
      router.push('/route-result')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ルート検索に失敗しました')
      setLoading(false)
    }
  }

  return (
    <AuthGuard>
    <div className="min-h-screen bg-[#fffbf7] text-gray-800">
      <Header />

      <main className="px-4 pb-6 max-w-md mx-auto">
        <section className="space-y-4 mt-6">
          <div className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3">
            <div className="flex-none">
              <span className="inline-block bg-[#d3883f] text-white px-4 py-2 rounded-full text-sm">出発</span>
            </div>
            <div className="flex-1">
              <select
                className="w-full bg-transparent outline-none text-sm text-gray-700 cursor-pointer"
                value={form.departure.storeId}
                onChange={(e) => {
                  const spot = stores.find((s) => s.spotId === e.target.value) ?? null
                  setDeparture(spot)
                }}
              >
                <option value="">出発地を選択</option>
                {stores.map((s) => (
                  <option key={s.spotId} value={s.spotId}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <DestinationList
            destinations={form.destinations}
            setDestinations={setDestinations}
          />

          <LocationInputCard
            label="時間指定"
            value={`${form.endTime} 終了`}
            placeholder="終了時刻を選択"
            onChange={() => {}}
            onFocus={() => setTimeSheetOpen(true)}
            readOnly
          />

          {error && (
            <p className="text-sm text-red-500 px-1">{error}</p>
          )}

          <div className="pt-2">
            <SearchButton onClick={handleSearch} disabled={loading} label={loading ? '検索中...' : undefined} />
          </div>
        </section>

        <div className="mt-6 mb-8 h-64 max-w-md mx-auto overflow-hidden rounded-2xl shadow-sm">
          <MapSection />
        </div>

        <TimeSelectorSheet
          open={timeSheetOpen}
          onClose={() => setTimeSheetOpen(false)}
          endTime={form.endTime}
          onChangeEndTime={setEndTime}
          onConfirm={() => setTimeSheetOpen(false)}
        />
      </main>
    </div>
    </AuthGuard>
  )
}
