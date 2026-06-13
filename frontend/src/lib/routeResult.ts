export type RouteWaypoint = {
  id: string
  name: string
  emoji: string
  arrival: string
  stay: string
  lat: number
  lng: number
}

export type TimelineStep = {
  id: string
  icon: string
  title: string
  subtitle?: string
}

export type RouteResultData = {
  departureName: string
  departureTime: string
  destinationNames: string[]
  finalDestinationName: string
  arrivalTime: string
  distanceKm: number
  durationLabel: string
  startPosition: [number, number]
  endPosition: [number, number]
  path: [number, number][]
  waypoints: RouteWaypoint[]
  timeline: TimelineStep[]
}

// AIルート検索の結果（デモ用データ）
export const ROUTE_RESULT: RouteResultData = {
  departureName: '杉本町',
  departureTime: '9:30',
  destinationNames: ['帝塚山カフェ', '万代池公園', '住吉公園'],
  finalDestinationName: '住吉公園',
  arrivalTime: '13:45',
  distanceKm: 6.8,
  durationLabel: '約4時間15分',
  startPosition: [34.5446, 135.5064],
  endPosition: [34.54786, 135.50533],
  path: [
    [34.5446, 135.5064],
    [34.53637, 135.49995],
    [34.54456, 135.5175],
    [34.54786, 135.50533],
  ],
  waypoints: [
    { id: 'w1', name: '帝塚山カフェ', emoji: '☕', arrival: '10:05頃', stay: '約45分', lat: 34.53637, lng: 135.49995 },
    { id: 'w2', name: '万代池公園', emoji: '🍃', arrival: '12:00頃', stay: '約1時間', lat: 34.54456, lng: 135.5175 },
  ],
  timeline: [
    { id: 't1', icon: '🔵', title: '杉本町', subtitle: '出発 9:30' },
    { id: 't2', icon: '🚶', title: '徒歩 12分' },
    { id: 't3', icon: '☕', title: '帝塚山カフェ', subtitle: '10:05頃到着・滞在約45分' },
    { id: 't4', icon: '🚃', title: '電車で移動 20分' },
    { id: 't5', icon: '🍃', title: '万代池公園', subtitle: '12:00頃到着・滞在約1時間' },
    { id: 't6', icon: '🚶', title: '徒歩 15分' },
    { id: 't7', icon: '🔴', title: '住吉公園', subtitle: '到着 13:45頃' },
  ],
}
