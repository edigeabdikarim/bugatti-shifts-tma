interface StatusBadgeProps {
  status: string
  label: string
}

const STATUS_COLORS: Record<string, string> = {
  planned: 'bg-gray-200 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-800',
  attended: 'bg-green-100 text-green-800',
  late: 'bg-yellow-100 text-yellow-800',
  needs_review: 'bg-red-100 text-red-800',
}

export default function StatusBadge({ status, label }: StatusBadgeProps) {
  const colorClass = STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
      {label}
    </span>
  )
}
