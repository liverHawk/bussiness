import type { CongestionLevel } from './congestion'

export type SpotCategory = 'restaurant' | 'tourist' | 'facility'

export type Spot = {
  id: string
  name: string
  category: SpotCategory
  lat: number
  lng: number
  congestion: CongestionLevel
}

// 検索機能: 表示範囲全体に分布する飲食店・観光地・施設のピン（デモ用データ）
export const SEARCH_SPOTS: Spot[] = [
  { id: 'spot-1', name: '杉本町食堂', category: 'restaurant', lat: 34.53736, lng: 135.49599, congestion: 2 },
  { id: 'spot-2', name: '帝塚山カフェ', category: 'restaurant', lat: 34.53637, lng: 135.49995, congestion: 1 },
  { id: 'spot-3', name: '万代ラーメン', category: 'restaurant', lat: 34.53618, lng: 135.5059, congestion: 3 },
  { id: 'spot-4', name: '苅田中華料理店', category: 'restaurant', lat: 34.53745, lng: 135.5129, congestion: 2 },
  { id: 'spot-5', name: '我孫子定食屋', category: 'restaurant', lat: 34.53577, lng: 135.51781, congestion: 1 },
  { id: 'spot-6', name: '浅香ベーカリー', category: 'restaurant', lat: 34.54098, lng: 135.49436, congestion: 1 },
  { id: 'spot-7', name: '北畠居酒屋', category: 'restaurant', lat: 34.54087, lng: 135.50059, congestion: 1 },
  { id: 'spot-8', name: '山坂うどん', category: 'restaurant', lat: 34.53982, lng: 135.50747, congestion: 3 },
  { id: 'spot-9', name: '沢之町喫茶店', category: 'restaurant', lat: 34.54148, lng: 135.51211, congestion: 1 },
  { id: 'spot-10', name: '住吉焼肉店', category: 'restaurant', lat: 34.54009, lng: 135.51631, congestion: 2 },
  { id: 'spot-11', name: '東粉浜そば', category: 'restaurant', lat: 34.54448, lng: 135.49529, congestion: 1 },
  { id: 'spot-12', name: '南田辺洋食店', category: 'restaurant', lat: 34.54529, lng: 135.502, congestion: 1 },
  { id: 'spot-13', name: '清水丘食堂', category: 'restaurant', lat: 34.5437, lng: 135.5064, congestion: 3 },
  { id: 'spot-14', name: '長居カフェ', category: 'restaurant', lat: 34.54524, lng: 135.5108, congestion: 1 },
  { id: 'spot-15', name: '万代池公園', category: 'tourist', lat: 34.54456, lng: 135.5175, congestion: 2 },
  { id: 'spot-16', name: '苅田神社', category: 'tourist', lat: 34.54802, lng: 135.49649, congestion: 3 },
  { id: 'spot-17', name: '帝塚山公園', category: 'tourist', lat: 34.54949, lng: 135.5007, congestion: 4 },
  { id: 'spot-18', name: '住吉公園', category: 'tourist', lat: 34.54786, lng: 135.50533, congestion: 2 },
  { id: 'spot-19', name: '北畠展望台', category: 'tourist', lat: 34.54879, lng: 135.5122, congestion: 1 },
  { id: 'spot-20', name: '山坂緑地', category: 'tourist', lat: 34.54905, lng: 135.51844, congestion: 4 },
  { id: 'spot-21', name: '浅香史跡公園', category: 'tourist', lat: 34.55174, lng: 135.495, congestion: 2 },
  { id: 'spot-22', name: '我孫子庭園', category: 'tourist', lat: 34.55342, lng: 135.4999, congestion: 2 },
  { id: 'spot-23', name: '東粉浜緑地', category: 'tourist', lat: 34.55226, lng: 135.5069, congestion: 1 },
  { id: 'spot-24', name: '長居公園', category: 'tourist', lat: 34.55229, lng: 135.51286, congestion: 4 },
  { id: 'spot-25', name: '杉本町図書館', category: 'facility', lat: 34.5534, lng: 135.51681, congestion: 3 },
  { id: 'spot-26', name: '沢之町市民センター', category: 'facility', lat: 34.53473, lng: 135.4925, congestion: 2 },
  { id: 'spot-27', name: '南田辺体育館', category: 'facility', lat: 34.55408, lng: 135.52007, congestion: 3 },
  { id: 'spot-28', name: '清水丘コミュニティホール', category: 'facility', lat: 34.53526, lng: 135.51424, congestion: 4 },
  { id: 'spot-29', name: '苅田資料館', category: 'facility', lat: 34.55339, lng: 135.49865, congestion: 3 },
  { id: 'spot-30', name: '帝塚山ホール', category: 'facility', lat: 34.5455, lng: 135.49213, congestion: 4 },
]
