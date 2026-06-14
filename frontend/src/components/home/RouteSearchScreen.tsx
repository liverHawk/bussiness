"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from './Header'
import AuthGuard from '@/components/AuthGuard'
import LocationInputCard from './LocationInputCard'
import DestinationList, { type DestinationItem } from './DestinationList'
import TimeSelectorSheet from './TimeSelectorSheet'
import MapSection from './MapSection'
import SearchButton from './SearchButton'
import { geocodeAddress, generateRoute } from '@/lib/api'

export type SearchFormState = {
  departure: string
  destinations: DestinationItem[]
  endTime: string
}

const defaultState: SearchFormState = {
  departure: '',
  destinations: [{ address: '', genres: [] }],
  endTime: new Date().toTimeString().slice(0, 5),
}

export default function RouteSearchScreen() {
  const router = useRouter()
  const [form, setForm] = useState<SearchFormState>(defaultState)
  const [timeSheetOpen, setTimeSheetOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const setDeparture = (value: string) => setForm((s: SearchFormState) => ({ ...s, departure: value }))
  const setDestinations = (destinations: DestinationItem[]) => setForm((s: SearchFormState) => ({ ...s, destinations }))
  const setEndTime = (endTime: string) => setForm((s: SearchFormState) => ({ ...s, endTime }))

  const handleSearch = async () => {
    setError(null)
    setLoading(true)
    try {
      const today = new Date().toISOString().slice(0, 10)
      const specifiedDateTime = new Date(`${today}T${form.endTime}:00`).toISOString()

      const filledDests = form.destinations.filter((d) => d.address.trim() !== '')

      const [startGeo, ...destGeos] = await Promise.all([
        geocodeAddress(form.departure || '大阪駅'),
        ...filledDests.map((d) => geocodeAddress(d.address)),
      ])

      const result = await generateRoute({
        startLocation: { latitude: startGeo.latitude, longitude: startGeo.longitude },
        destinations: destGeos.map((g, i) => ({
          latitude: g.latitude,
          longitude: g.longitude,
          preferredGenres: filledDests[i].genres,
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
          <LocationInputCard
            label="出発"
            value={form.departure}
            placeholder="出発地を入力"
            onChange={setDeparture}
          />

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
