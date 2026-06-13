"use client"

import { useState } from 'react'
import Header from './Header'
import LocationInputCard from './LocationInputCard'
import DestinationList from './DestinationList'
import TimeSelectorSheet from './TimeSelectorSheet'
import MapSection from './MapSection'
import SearchButton from './SearchButton'

export type SearchFormState = {
  departure: string
  destinations: string[]
  endTime: string
}

const defaultState: SearchFormState = {
  departure: '',
  destinations: [''],
  endTime: new Date().toTimeString().slice(0, 5),
}

export default function RouteSearchScreen() {
  const [form, setForm] = useState<SearchFormState>(defaultState)
  const [timeSheetOpen, setTimeSheetOpen] = useState(false)

  const setDeparture = (value: string) => setForm((s: SearchFormState) => ({ ...s, departure: value }))
  const setDestinations = (destinations: string[]) => setForm((s: SearchFormState) => ({ ...s, destinations }))
  const setEndTime = (endTime: string) => setForm((s: SearchFormState) => ({ ...s, endTime }))

  const handleSearch = () => {
    console.log('SearchFormState:', form)
    // future: call frontend/src/lib/api.ts -> searchRoute(form)
  }

  return (
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

          <div className="pt-2">
            <SearchButton onClick={handleSearch} />
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
          onConfirm={() => console.log('SearchFormState:', form)}
        />
      </main>
    </div>
  )
}
