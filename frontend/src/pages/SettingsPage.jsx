import { useAuth } from '../context/AuthContext.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import Panel, { PanelHead, PanelBody } from '../components/ui/Panel.jsx'
import ProfileSection from '../components/settings/ProfileSection.jsx'
import ProfileCodeSection from '../components/settings/ProfileCodeSection.jsx'
import ThemeSection from '../components/settings/ThemeSection.jsx'
import VisibilitySection from '../components/settings/VisibilitySection.jsx'
import FeedbackSection from '../components/settings/FeedbackSection.jsx'
import PermissionsSection from '../components/settings/PermissionsSection.jsx'
import AccountSection from '../components/settings/AccountSection.jsx'

export default function SettingsPage() {
  const { user, isGuest } = useAuth()

  return (
    <section className="px-5 md:px-8 py-6 md:py-8 max-w-4xl mx-auto">
      <PageHeader index="03 / SETTINGS" title="Settings" description="Manage your account, appearance, and collaboration preferences." />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        <AccountSection />
        {!isGuest && <ProfileSection user={user} />}
        <ThemeSection isGuest={isGuest} />
        {!isGuest && <ProfileCodeSection />}
        {!isGuest && (
          <>
            <VisibilitySection />
            <PermissionsSection />
          </>
        )}
        {!isGuest && <FeedbackSection className="lg:col-span-2" />}
        {isGuest && (
          <Panel className="lg:col-span-2">
            <PanelHead title="Profile locked" />
            <PanelBody>
              <p className="text-[12.5px] text-textMuted">Log in to manage your profile, visibility, and permissions.</p>
            </PanelBody>
          </Panel>
        )}
      </div>
    </section>
  )
}
