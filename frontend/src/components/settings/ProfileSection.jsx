import Avatar from '../ui/Avatar.jsx'
import Panel, { PanelHead, PanelBody } from '../ui/Panel.jsx'

export default function ProfileSection({ user }) {
  return (
    <Panel>
      <PanelHead title="Profile" description="Your public identity across Colleris." />
      <PanelBody>
        <div className="flex items-center gap-3">
          <Avatar initials={user.initials} size="md" />
          <div className="min-w-0">
            <div className="text-[13.5px] font-bold truncate">{user.name}</div>
            <div className="text-[12px] text-textMuted truncate">{user.email}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 max-w-sm mt-4">
          <div className="bg-surface2 rounded-md px-3 py-2">
            <div className="text-[10px] text-textMuted uppercase tracking-wide">User ID</div>
            <div className="text-[12.5px] font-mono font-semibold mt-0.5 truncate">{user.userId}</div>
          </div>
          <div className="bg-surface2 rounded-md px-3 py-2">
            <div className="text-[10px] text-textMuted uppercase tracking-wide">Connections</div>
            <div className="text-[12.5px] font-mono font-semibold mt-0.5">{user.connections}</div>
          </div>
        </div>
      </PanelBody>
    </Panel>
  )
}
