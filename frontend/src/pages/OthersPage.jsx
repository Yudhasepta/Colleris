import { useState } from 'react'
import Avatar from '../components/ui/Avatar.jsx'
import Button from '../components/ui/Button.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import SearchBar from '../components/others/SearchBar.jsx'
import UserResultCard from '../components/others/UserResultCard.jsx'
import ProfileView from '../components/others/ProfileView.jsx'
import GroupCard from '../components/others/GroupCard.jsx'
import GroupDetailModal from '../components/others/GroupDetailModal.jsx'
import CreateGroupModal from '../components/others/CreateGroupModal.jsx'
import JoinGroupModal from '../components/others/JoinGroupModal.jsx'
import InviteMemberModal from '../components/others/InviteMemberModal.jsx'
import AssignProjectModal from '../components/others/AssignProjectModal.jsx'
import AuthModal from '../components/settings/AuthModal.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useConnections } from '../hooks/useConnections.js'
import { failure } from '../utils/actionStatus.js'

export default function OthersPage() {
  const { user, isGuest } = useAuth()
  const {
    connectionIds,
    groups,
    connectionProfiles,
    search,
    viewProfile,
    addConnection,
    removeConnection,
    createGroup,
    joinGroup,
    inviteMember,
    removeMember,
    leaveGroup,
    updateGroup,
    assignProject,
    updateGroupProject,
    addGroupTask,
    toggleGroupTask,
    updateGroupTask,
    deleteGroupTask,
    reorderGroupTasks,
    completeGroupProject,
    reopenGroupProject,
    requestGroupComplete,
    voteGroupComplete,
    finalizeGroupVote,
    cancelGroupVote,
    refresh: refreshConnections,
  } = useConnections(user?.id)

  const [results, setResults] = useState([])
  const [searched, setSearched] = useState(false)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [viewingProfile, setViewingProfile] = useState(null)
  const [profileError, setProfileError] = useState('')
  const [openGroupId, setOpenGroupId] = useState(null)
  const openGroup = groups.find((g) => String(g.id) === String(openGroupId)) || null
  const [createOpen, setCreateOpen] = useState(false)
  const [joinOpen, setJoinOpen] = useState(false)
  const [inviteGroup, setInviteGroup] = useState(null)
  const [assignGroup, setAssignGroup] = useState(null)
  const [authOpen, setAuthOpen] = useState(false)
  const [actionError, setActionError] = useState('')

  async function handleSearch(mode, query) {
    setSearching(true)
    setSearched(true)
    setSearchError('')
    setProfileError('')
    try {
      setResults(await search(mode, query))
    } catch (err) {
      setResults([])
      setSearchError(isGuest ? err?.message : failure(err).message)
    } finally {
      setSearching(false)
    }
  }

  async function openProfile(userId) {
    setProfileError('')
    setViewingProfile({ id: userId, name: '…', initials: '··' })
    try {
      setViewingProfile(await viewProfile(userId))
    } catch (err) {
      setViewingProfile(null)
      setProfileError(failure(err).message)
    }
  }

  async function handleConnect(userId) {
    setActionError('')
    try {
      await addConnection(userId)
    } catch (err) {
      setActionError(failure(err).message)
    }
  }

  async function handleDisconnect(userId) {
    setActionError('')
    try {
      await removeConnection(userId)
    } catch (err) {
      setActionError(failure(err).message)
    }
  }

  return (
    <section className="px-5 md:px-8 py-6 md:py-8 max-w-6xl mx-auto">
      <PageHeader
        index="02 / OTHERS"
        title="Directory"
        description="Find people by User ID or Profile Code, and manage your groups."
        meta={
          <div className="flex items-center gap-2 text-[11px] font-mono text-textMuted">
            <span>{connectionIds.length} connections</span>
            <span className="text-border">│</span>
            <span>{groups.length} groups</span>
          </div>
        }
      />

      {/* Editorial section marker — directory / discover setting */}
      <div className="flex items-center gap-3 mb-4">
        <span className="font-mono text-[11px] tracking-[0.14em] text-accent-gradient">01</span>
        <span className="h-px flex-1 bg-border" />
        <span className="font-mono text-[11px] tracking-[0.14em] text-textMuted uppercase">Directory</span>
      </div>

      <SearchBar onSearch={handleSearch} />

      <div className="mt-5">
        {!searched && !searchError && (
          <EmptyState
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
            }
            title="Search for someone"
            description="Look up a User ID or a shared Profile Code to view a profile."
          />
        )}
        {searchError && <div className="rounded-md px-3 py-2.5">{searchError}</div>}
        {searched && results.length === 0 && !searching && !searchError && (
          <EmptyState title="No match found" description="Double check the ID or code and try again." />
        )}
        {searched && results.length > 0 && (
          <div className="rounded-md overflow-hidden">
            {results.map((r) => (
              <UserResultCard
                key={r.id}
                result={r}
                isConnected={connectionIds.includes(r.id)}
                canInteract={!isGuest}
                onView={(u) => openProfile(u.id)}
                onConnect={(u) => (isGuest ? setAuthOpen(true) : handleConnect(u))}
                onDisconnect={(id) => handleDisconnect(id)}
              />
            ))}
          </div>
        )}
        {actionError && <div className="text-[12px] text-danger mt-2.5">{actionError}</div>}
        {profileError && <div className="text-[12px] text-danger mt-2.5">{profileError}</div>}
      </div>

      {!isGuest && (
        <section className="mt-9 pt-6 border-t border-border">
          <div className="flex items-center gap-3 mb-4">
            <span className="font-mono text-[11px] tracking-[0.14em] text-accent-gradient">02</span>
            <div className="min-w-0">
              <span className="font-mono text-[11px] tracking-[0.14em] text-textMuted uppercase block leading-none mb-1">Network</span>
              <h2 className="font-display text-[16px] font-bold leading-none">My Connections · {connectionProfiles.length}</h2>
            </div>
            <span className="h-px flex-1 bg-border" />
          </div>

          {connectionProfiles.length === 0 ? (
            <EmptyState
              title="No connections yet"
              description="Search for someone by User ID or Profile Code above to connect."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {connectionProfiles.map((c) => (
                <div
                  key={c.id}
                  className="rounded-md p-3.5 cursor-pointer hover:border-accentBorder hover:bg-surfaceHover transition-colors"
                  onClick={() => openProfile(c.id)}
                >
                  <div className="flex items-start gap-3">
                    <Avatar initials={c.initials || '··'} size="md" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-semibold truncate">{c.name}</div>
                      <div className="text-[11px] text-textMuted font-mono truncate">{c.userId || '—'}</div>
                      <div className="text-[10px] text-textMuted font-mono mt-0.5">{c.visibilityLabel || c.visibility}</div>
                    </div>
                    <Button variant="ghost" className="!px-2 !py-1 !text-[11px] flex-shrink-0 ml-auto" onClick={(e) => { e.stopPropagation(); handleDisconnect(c.id) }}>
                      Disconnect
                    </Button>
                  </div>
                  <div className="text-[11px] text-textMuted font-mono mt-2">{c.connections} connections</div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="mt-9 pt-6 border-t border-border">
        <div className="flex items-center gap-3 mb-4">
          <span className="font-mono text-[11px] tracking-[0.14em] text-accent-gradient">02</span>
          <div className="min-w-0">
            <span className="font-mono text-[11px] tracking-[0.14em] text-textMuted uppercase block leading-none mb-1">Collaboration</span>
            <h2 className="font-display text-[16px] font-bold leading-none">Groups</h2>
          </div>
          <span className="h-px flex-1 bg-border" />
          {!isGuest && (
            <div className="flex gap-2">
              <Button variant="default" onClick={() => setJoinOpen(true)}>
                Join by code
              </Button>
              <Button onClick={() => setCreateOpen(true)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                New group
              </Button>
            </div>
          )}
        </div>

        {isGuest ? (
          <EmptyState
            title="Log in to see your groups"
            action={
              <Button variant="primary" onClick={() => setAuthOpen(true)}>
                Log in / Register
              </Button>
            }
          />
        ) : groups.length === 0 ? (
          <EmptyState
            title="No groups yet"
            description="Create one or join with a shared code to start assigning and monitoring work together."
            action={
              <Button variant="primary" onClick={() => setJoinOpen(true)}>
                Join by code
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {groups.map((g) => (
              <GroupCard
                key={g.id}
                group={g}
                onOpen={(group) => {
                  refreshConnections()
                  setOpenGroupId(group.id)
                }}
              />
            ))}
          </div>
        )}
      </section>

      <ProfileView
        open={!!viewingProfile}
        onClose={() => setViewingProfile(null)}
        profile={viewingProfile}
        loading={!!viewingProfile && viewingProfile.name === '…'}
        isConnected={viewingProfile ? connectionIds.includes(viewingProfile.id) : false}
        canSendReminder={!isGuest && viewingProfile && connectionIds.includes(viewingProfile.id)}
        onDisconnect={(id) => handleDisconnect(id)}
      />
      <GroupDetailModal
        key={openGroup?.id ?? 'closed'}
        open={!!openGroup}
        onClose={() => setOpenGroupId(null)}
        group={openGroup}
        onAssign={(g) => {
          setOpenGroupId(null)
          setAssignGroup(g)
        }}
        onInvite={(g) => {
          setInviteGroup(g)
        }}
        onRemoveMember={removeMember}
        onLeave={leaveGroup}
        onUpdateProject={updateGroupProject}
        onAddTask={addGroupTask}
        onToggleTask={toggleGroupTask}
        onUpdateTask={updateGroupTask}
        onDeleteTask={deleteGroupTask}
        onReorderTasks={reorderGroupTasks}
        onComplete={completeGroupProject}
        onReopen={reopenGroupProject}
        onRequestComplete={requestGroupComplete}
        onVote={voteGroupComplete}
        onFinalizeVote={finalizeGroupVote}
        onCancelVote={cancelGroupVote}
      />
      <CreateGroupModal open={createOpen} onClose={() => setCreateOpen(false)} onCreate={createGroup} currentUserId={user?.id} />
      <JoinGroupModal open={joinOpen} onClose={() => setJoinOpen(false)} onJoin={joinGroup} />
      <InviteMemberModal
        open={!!inviteGroup}
        onClose={() => setInviteGroup(null)}
        group={inviteGroup}
        onInvite={{ search, invite: inviteMember, updateGroup }}
      />
      <AssignProjectModal open={!!assignGroup} onClose={() => setAssignGroup(null)} group={assignGroup} onAssign={assignProject} />
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </section>
  )
}
