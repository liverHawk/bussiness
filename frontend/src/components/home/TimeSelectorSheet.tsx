// React import not required with new JSX transform

type Props = {
  open: boolean
  onClose: () => void
  endTime: string
  onChangeEndTime: (t: string) => void
  onConfirm: () => void
}

export default function TimeSelectorSheet({ open, onClose, endTime, onChangeEndTime, onConfirm }: Props) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[1200] flex items-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative w-full max-w-md mx-auto rounded-t-3xl bg-white p-6 pb-8 shadow-2xl">
        <div className="mx-auto mb-5 h-1.5 w-10 rounded-full bg-gray-200" />

        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#2f2419]">終了時刻を指定</h2>
          <button onClick={onClose} className="text-sm text-gray-400 transition active:scale-95">
            閉じる
          </button>
        </div>

        <div className="flex flex-col items-center gap-3 rounded-2xl bg-[#fffbf7] p-6">
          <span className="text-sm text-gray-500">この時刻までに到着する</span>
          <input
            type="time"
            className="w-full max-w-[220px] rounded-2xl border-2 border-[#d3883f]/30 bg-white px-4 py-3 text-center text-3xl font-bold text-[#2f2419] outline-none transition focus:border-[#d3883f]"
            value={endTime}
            onChange={e => onChangeEndTime(e.target.value)}
          />
        </div>

        <button
          onClick={() => {
            onConfirm()
            onClose()
          }}
          className="mt-6 w-full rounded-full bg-[#d3883f] py-3 text-lg font-semibold text-white shadow-md transition hover:bg-[#c2792f] active:scale-[0.98]"
        >
          この時刻で検索
        </button>
      </div>
    </div>
  )
}
