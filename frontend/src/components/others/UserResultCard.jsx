import Avatar from '../ui/Avatar.jsx'
import Button from '../ui/Button.jsx'

export default function UserResultCard({ result, isConnected, canInteract, onView, onConnect, onDisconnect }) {
  return (
    <div className="flex items-center gap-3 px-3.5 py-3 border-b border-border last:border-b-0 hover:bg-surface2/40 transition-colors">
      <Avatar initials={result.initials} size="md" />
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold truncate">{result.name}</div>
        <div className="text-[11px] text-textMuted font-mono truncate">
          {result.userId} · {result.connections} connections
        </div>
      </div>
      <div className="flex gap-1.5 flex-shrink-0">
        <Button onClick={() => onView(result)}>View</Button>
        {canInteract && (
          <>
            {isConnected ? (
              <Button variant="default" onClick={() => onDisconnect(result.id)}>
                Disconnect
              </Button>
            ) : (
              <Button variant="primary" onClick={() => onConnect(result.id)}>
                Add
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
