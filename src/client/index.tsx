/** Browser half of the AI chatroom plugin. */

import type { ComponentType } from 'react'
import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client'
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { ISessions } from '@deepseek-ai/dsh-api-session-controller/client'
import type { IWorkspaces } from '@deepseek-ai/dsh-api-workspace-controller/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { ChatNodeViewProps } from '@deepseek-ai/dsh-client-ui-chat/client'
import type { ComposerAttachmentsProps } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { InputTriggerServiceContract, InputTriggerSource } from '@deepseek-ai/dsh-client-ui-input-trigger/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-workspace/client'
import { ChatroomEntry } from './ChatroomEntry.js'
import { ChatroomSettingsSection } from './ChatroomAccountPanels.js'
import { ChatroomAssistantReplyAction } from './ChatroomAssistantReplyAction.js'
import { ChatroomAssistantNodeView } from './ChatroomAssistantNodeView.js'
import { ChatroomComposerAttachments, ChatroomComposerDock, ChatroomFileAction, ChatroomSessionControls } from './ChatroomComposer.js'
import {
  ChatroomSteeringMessageNodeView,
  ChatroomUserMessageNodeView,
} from './ChatroomMessageNodeView.js'
import { installNativePromptIdentity } from './native-prompt.js'
import { createNativeIdentitySync } from './native-identity-sync.js'
import { watchNativeSessionSync } from './native-session-sync.js'
import { createSessionReentryDiagnostics } from './session-reentry-diagnostics.js'
import { createClientRuntimeFailureReporter, installClientRuntimeDiagnostics, type ClientRuntimeFailureReporter } from './runtime-diagnostics.js'
import { CHATROOM_RECONNECTED } from './RecoverableImage.js'
import { watchAdminAccess, watchAdminControls } from './admin-access.js'
import { ModelProgress } from './ModelProgress.js'
import { PersonalAccountButton } from './PersonalAccountButton.js'
import { installWelcomeNoticeSuppression } from './welcome-notice.js'
import { installNativeMentionAvatarImages } from './mention-avatars.js'
import { createChatroomAgentProfileSource } from './agent-mention-source.js'
import { installFreshSessionStart } from './fresh-session.js'
import { NewGroupSetupDock } from './NewGroupSetupDock.js'
import { RoomIdentityAction } from './RoomIdentityAction.js'
import { ServerConnectionStatus } from './ServerConnectionStatus.js'
import { installSidebarRoomRows } from './sidebar-rooms.js'
import { registerChatroomSettingsNavIcon } from './settings-nav-icon.js'
import { ChatroomClientStore, type ChatroomPhase, newGroupMentionName } from './store.js'
import { CHATROOM_STYLES } from './styles.js'
import { ChatroomSidebarBackdrop, ChatroomStyleSwitch, createChatroomStyleStore } from './ChatroomStyleSwitch.js'
import { QQ2007_STYLES } from './qq2007-styles.js'
import {
  branchFrameSwitchFromMessage,
  branchFrameFromLocation,
  invitedRoomFromLocation,
  clearBranchFrameReady,
  notifyBranchFrameReady,
  restoreParentSessionSelection,
  sameBranchFrame,
  stageBranchFrameSession,
} from './branch-frame.js'

const roomServices = ['connection', 'inputTriggers', 'sessions', 'settingsScope', 'slots', 'workspaces', 'uiWorkspace', 'layout']
export const inject: string[] = []

/** Official client factory supplied by the build, not a second transport implementation. */
declare const nativeConnection: { apply(ctx: ClientContext): void }

interface NativeDirectoryList {
  getSnapshot(): { readonly phase?: 'pending' | 'ready'; readonly current: string | undefined }
  subscribe(listener: () => void): () => void
}

interface DeepLinkStore {
  getSnapshot(): { readonly phase: ChatroomPhase; readonly identity?: { readonly participantId: string } | undefined }
  subscribe(listener: () => void): () => void
}

/**
 * Resolve a URL navigation only after the host has produced its initial
 * directory baseline. A changed current while it is still pending is a user
 * navigation (for example, New Session) and cancels the URL intent. The first
 * pending -> ready snapshot is the host's persisted-selection restoration.
 */
export function waitForNativeDirectoryReady(
  list: NativeDirectoryList,
  ready: () => void,
  cancelled: () => void,
): () => void {
  let done = false
  const baselineCurrent = list.getSnapshot().current
  let unsubscribe: (() => void) | undefined
  const finish = (callback: () => void) => {
    if (done) return
    done = true
    unsubscribe?.()
    unsubscribe = undefined
    callback()
  }
  const check = () => {
    if (done) return
    const snapshot = list.getSnapshot()
    if (snapshot.phase === 'ready') return finish(ready)
    if (snapshot.current !== baselineCurrent) finish(cancelled)
  }
  const off = list.subscribe(check)
  unsubscribe = off
  if (done) off()
  else check()
  return () => {
    if (done) return
    done = true
    unsubscribe?.()
    unsubscribe = undefined
  }
}

/**
 * Preserve a URL intent across the unauthenticated gate, but consume it at
 * most once for each successful authentication epoch. A pending callback
 * rechecks its epoch so logout/account changes cannot cross into another
 * identity. Ordinary store changes never retry an attempted URL selection.
 */
export function scheduleDeepLinkNavigation(
  store: DeepLinkStore,
  list: NativeDirectoryList,
  roomId: string,
  select: (roomId: string) => void,
): () => void {
  let disposed = false
  let identityEpoch = 0
  let eligibleIdentity: string | undefined
  let scheduled = false
  let stopDirectoryWait: (() => void) | undefined
  const cancelDirectoryWait = () => {
    stopDirectoryWait?.()
    stopDirectoryWait = undefined
  }
  const reconcile = () => {
    if (disposed) return
    const snapshot = store.getSnapshot()
    const identity = snapshot.phase === 'ready' ? snapshot.identity : undefined
    if (identity === undefined) {
      cancelDirectoryWait()
      eligibleIdentity = undefined
      scheduled = false
      return
    }
    if (eligibleIdentity !== identity.participantId) {
      cancelDirectoryWait()
      eligibleIdentity = identity.participantId
      identityEpoch += 1
      scheduled = false
    }
    if (scheduled) return
    scheduled = true
    const epoch = identityEpoch
    const participantId = identity.participantId
    stopDirectoryWait = waitForNativeDirectoryReady(
      list,
      () => {
        stopDirectoryWait = undefined
        const current = store.getSnapshot()
        if (!disposed && epoch === identityEpoch && current.phase === 'ready'
          && current.identity?.participantId === participantId) select(roomId)
      },
      () => { stopDirectoryWait = undefined },
    )
  }
  const unsubscribe = store.subscribe(reconcile)
  reconcile()
  return () => {
    if (disposed) return
    disposed = true
    unsubscribe()
    cancelDirectoryWait()
  }
}

/** Consume the native connection and UI services materialized by the host. */
export function apply(ctx: ClientContext): void {
  // No network/identity dependency: this preference applies on every page start.
  ctx.inject(['slots'], installWelcomeNoticeSuppression)
  ctx.plugin({ name: 'chatroom-native-connection', apply: nativeConnection.apply })
  ctx.inject(roomServices, roomCtx => installChatroom(roomCtx))
}

/** Add room identity and navigation around the existing Harness conversation UI. */
function installChatroom(ctx: ClientContext): void {
  const styles = createChatroomStyleStore()
  let runtimeFailureReporter: ClientRuntimeFailureReporter | undefined
  const connection = ctx.get('connection') as ConnectionHandle | undefined
  if (connection === undefined) throw new Error('chatroom: client connection service unavailable')
  const sessions = ctx.get('sessions') as ISessions | undefined
  if (sessions === undefined) throw new Error('chatroom: client sessions service unavailable')
  const workspaces = ctx.get('workspaces') as IWorkspaces | undefined
  if (workspaces === undefined) throw new Error('chatroom: client workspaces service unavailable')
  const inputTriggers = ctx.get('inputTriggers') as InputTriggerServiceContract | undefined
  if (inputTriggers === undefined) throw new Error('chatroom: input trigger service unavailable')
  const branchFrame = typeof location === 'undefined' ? undefined : branchFrameFromLocation(location)
  const store = new ChatroomClientStore((rawSessionId) => {
    const sessionId = rawSessionId as SessionId
    const list = sessions.list.getSnapshot()
    if (list.current === sessionId) return true
    if (list.byId[sessionId] === undefined) return false
    sessions.open(sessionId)
    return true
  }, branchFrame, (source, error) => { runtimeFailureReporter?.(source, error) })
  ctx.effect(() => installFreshSessionStart(ctx.uiWorkspace, async (workspaceId) => {
    const snapshot = store.getSnapshot()
    if (snapshot.phase === 'loading') throw new Error('chatroom identity is still loading')
    const reservedSessionId = snapshot.auth.enabled ? await store.reserveSoloSession() : undefined
    try {
      const sessionId = await sessions.create({
        workspaceId,
        ...(reservedSessionId === undefined ? {} : { sessionId: reservedSessionId as SessionId }),
      })
      if (reservedSessionId !== undefined && String(sessionId) !== reservedSessionId) {
        throw new Error('native Session id does not match its Solo reservation')
      }
      store.registerNewSession(String(sessionId))
      return sessionId
    } catch (error) {
      if (reservedSessionId !== undefined) await store.releaseSoloSession(reservedSessionId)
      throw error
    }
  }), 'chatroom: distinct native New Session')
  ctx.effect(() => {
    const reporter = runtimeFailureReporter = createClientRuntimeFailureReporter({
      canReport: () => {
        const view = store.getSnapshot()
        return view.phase === 'ready' && view.identity !== undefined
      },
    })
    const restoreRuntimeDiagnostics = installClientRuntimeDiagnostics(reporter)
    document.documentElement.setAttribute('data-dsh-chatroom-installed', '')
    if (branchFrame !== undefined) document.documentElement.setAttribute('data-dsh-chatroom-branch-frame', '')
    const markBranchShell = () => {
      if (branchFrame === undefined) return
      document.querySelector('[data-shell-overlay]')?.parentElement?.setAttribute('data-dsh-chatroom-branch-shell', '')
    }
    const shellObserver = branchFrame === undefined ? undefined : new MutationObserver(markBranchShell)
    shellObserver?.observe(document.body, { childList: true, subtree: true })
    markBranchShell()
    const style = document.createElement('style')
    style.dataset.dshChatroomStyles = ''
    style.textContent = CHATROOM_STYLES + QQ2007_STYLES
    document.head.append(style)
    const restoreAdminControls = watchAdminControls(store, document.documentElement)
    const restoreStyle = styles.install()
    const restoreSettingsMirror = activateRemoteSettingsMirror(ctx.get('settingsScope'))
    const restorePrompt = installNativePromptIdentity(connection, store)
    const restoreSidebarRoomRows = installSidebarRoomRows(store, sessions)
    const restoreMentionAvatars = installNativeMentionAvatarImages(store)
    let disposed = false
    let stopDeepLinkNavigation: () => void = () => undefined
    let activeBranchFrame = branchFrame
    let branchStaged = false
    const stageBranch = () => {
      const frame = activeBranchFrame
      if (frame === undefined || branchStaged) return
      const list = sessions.list.getSnapshot()
      const staged = stageBranchFrameSession(frame, {
        current: list.current === undefined ? undefined : String(list.current),
        byId: list.byId,
      }, sessionId => { sessions.open(sessionId as SessionId) })
      if (!staged) return
      branchStaged = true
      restoreParentSessionSelection(frame.parentSessionId)
      notifyBranchFrameReady(frame)
    }
    const receiveBranchSwitch = (event: MessageEvent) => {
      if (branchFrame === undefined
        || event.origin !== globalThis.location.origin
        || event.source !== globalThis.parent) return
      const next = branchFrameSwitchFromMessage(event.data)
      if (next === undefined) return
      if (activeBranchFrame !== undefined && sameBranchFrame(activeBranchFrame, next)) {
        stageBranch()
        return
      }
      activeBranchFrame = next
      branchStaged = false
      clearBranchFrameReady()
      store.switchBranchFrame(next)
      stageBranch()
    }
    globalThis.addEventListener('message', receiveBranchSwitch)
    const sessionReentryDiagnostics = createSessionReentryDiagnostics()
    const reconcileSession = () => {
      stageBranch()
      store.resumeOpen()
      const list = sessions.list.getSnapshot()
      const current = list.current
      const summary = current === undefined ? undefined : list.byId[current]
      store.activateSession(
        current === undefined ? undefined : String(current),
        summary?.displayTitle ?? '新会话',
        branchFrame === undefined && summary?.origin !== 'subagent',
        summary?.parentId === undefined ? undefined : String(summary.parentId),
      )
      const snapshot = store.getSnapshot()
      if (current !== undefined && snapshot.auth.enabled && snapshot.phase !== 'loading'
        && (snapshot.phase !== 'ready'
          || store.roomForSession(String(current)) === undefined
            && !store.canPromptNativeSession(String(current)))) {
        if (snapshot.phase !== 'ready') sessions.clear()
        else void store.resolveNativeOwnership(String(current)).then(allowed => {
          if (sessions.list.getSnapshot().current !== current) return
          if (allowed) syncSession()
          else sessions.clear()
        })
        return
      }
      if (current !== undefined && summary?.blank === true && summary.origin !== 'subagent'
        && store.roomForSession(String(current)) === undefined
        && store.newSessionMode(String(current)) === undefined) {
        store.registerNewSession(String(current))
      }
    }
    const syncSession = () => {
      const leave = sessionReentryDiagnostics.enter()
      try { reconcileSession() } finally { leave() }
    }
    const unsubscribeSessions = sessions.list.subscribe(syncSession)
    const unsubscribeNativeSessionSync = watchNativeSessionSync(store, connection, () => sessions.refresh())
    const retryNativeSessionSync = () => { unsubscribeNativeSessionSync.retry() }
    window.addEventListener(CHATROOM_RECONNECTED, retryNativeSessionSync)
    const syncNativeIdentity = createNativeIdentitySync(() => connection.reconnect())
    syncNativeIdentity(store.getSnapshot())
    let synchronizedPhase = store.getSnapshot().phase
    const unsubscribeSessionGuard = store.subscribe(() => {
      const snapshot = store.getSnapshot()
      syncNativeIdentity(snapshot)
      const phase = snapshot.phase
      if (phase === synchronizedPhase) return
      synchronizedPhase = phase
      syncSession()
    })
    void store.start().then(async () => {
      if (disposed) return
      syncSession()
      if (typeof location === 'undefined') return
      const invitedRoomId = invitedRoomFromLocation(location, branchFrame)
      if (invitedRoomId === undefined) return
      stopDeepLinkNavigation = scheduleDeepLinkNavigation(
        store,
        sessions.list,
        invitedRoomId,
        roomId => { void store.selectRoom(roomId) },
      )
    })
    return () => {
      disposed = true
      restoreRuntimeDiagnostics()
      if (runtimeFailureReporter === reporter) runtimeFailureReporter = undefined
      stopDeepLinkNavigation()
      unsubscribeSessions()
      sessionReentryDiagnostics.dispose()
      unsubscribeNativeSessionSync()
      window.removeEventListener(CHATROOM_RECONNECTED, retryNativeSessionSync)
      unsubscribeSessionGuard()
      globalThis.removeEventListener('message', receiveBranchSwitch)
      restorePrompt()
      restoreMentionAvatars()
      restoreSidebarRoomRows()
      restoreSettingsMirror()
      restoreAdminControls()
      store.stop()
      style.remove()
      restoreStyle()
      shellObserver?.disconnect()
      document.documentElement.removeAttribute('data-dsh-chatroom-installed')
      if (branchFrame !== undefined) {
        clearBranchFrameReady()
        document.documentElement.removeAttribute('data-dsh-chatroom-branch-frame')
      }
    }
  }, 'chatroom: browser state and styles')

  if (branchFrame === undefined) ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
    name: 'sidebar.footer.action', id: 'chatroom-server-connection', order: 0,
    inject: () => ({ connection, store, nativeCatalogue: sessions.list }),
  }, ServerConnectionStatus))
  if (branchFrame === undefined) ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
    name: 'sidebar.footer.action', id: 'chatroom-personal-account', order: 5,
    inject: () => ({ hooks: { chatroom: store }, openAccount: store.openAccount }),
  }, PersonalAccountButton))
  ctx.slots.inject('sidebar.settings', () => watchAdminAccess(store, () => ctx.slots.register({
    name: 'sidebar.settings', priority: -100,
  }, () => null)))
  ctx.slots.inject('conversation.input.model', () => watchAdminAccess(store, () => ctx.slots.register({
    name: 'conversation.input.model', priority: -100,
  }, () => null)))
  ctx.slots.inject('conversation.input.dock', () => ctx.slots.register({
    name: 'conversation.input.dock', id: 'chatroom-model-progress', order: -50,
    inject: () => ({ hooks: { chatroom: store } }),
  }, ModelProgress))
  ctx.slots.inject('conversation.session.header.utilities', () => ctx.slots.register({
    name: 'conversation.session.header.utilities', id: 'chatroom-style', order: 10,
    inject: () => ({ styles }),
  }, ChatroomStyleSwitch))
  ctx.slots.inject('shell.overlay', () => ctx.slots.register({
    name: 'shell.overlay', id: 'chatroom-sidebar-backdrop', order: -10,
    inject: () => ({ close: () => ctx.layout.toggleSidebar() }),
  }, ChatroomSidebarBackdrop))
  ctx.slots.inject('shell.overlay', () => ctx.slots.register({
    name: 'shell.overlay', id: 'chatroom-style-fallback', order: 20,
    inject: () => ({ styles, fallback: true }),
  }, ChatroomStyleSwitch))

  const aiSource = createChatroomAiSource(store)
  const agentProfileSource = createChatroomAgentProfileSource(store)
  const memberSource = createChatroomMemberSource(store)
  ctx.effect(() => inputTriggers.registerSource(aiSource), 'chatroom: AI mention source')
  ctx.effect(() => inputTriggers.registerSource(agentProfileSource), 'chatroom: room AI participant mention source')
  ctx.effect(() => inputTriggers.registerSource(memberSource), 'chatroom: member mention source')

  ctx.slots.inject('shell.overlay', () => ctx.slots.register({
    name: 'shell.overlay',
    id: 'chatroom',
    order: 0,
    inject: () => ({
      hooks: { chatroom: store },
      openRoom: store.openRoom,
      closeRoom: store.closeRoom,
      join: store.join,
      login: store.login,
      register: store.register,
      logout: store.logout,
      openAccount: store.openAccount,
      closeAccount: store.closeAccount,
      changePassword: store.changePassword,
      selectRoom: store.selectRoom,
      createRoom: store.createRoom,
      resetIdentity: store.resetIdentity,
      retry: store.retry,
      closeMembers: store.closeMembers,
      openAgents: store.openAgents,
      closeAgents: store.closeAgents,
      loadAgentProfiles: store.loadAgentProfiles,
      saveAgentProfile: store.saveAgentProfile,
      deleteAgentProfile: store.deleteAgentProfile,
      cancelAgentProfile: store.cancelAgentProfile,
      renameRoom: store.renameRoom,
      setMemberRole: store.setMemberRole,
      addRoomMembers: store.addRoomMembers,
      setRoomAutoTrigger: store.setRoomAutoTrigger,
      closeThread: store.closeThread,
      setThreadReply: store.setThreadReply,
      clearThreadReply: store.clearThreadReply,
      sendThreadMessage: store.sendThreadMessage,
      enableSystemNotifications: store.enableSystemNotifications,
      dismissToast: store.dismissToast,
      toggleReaction: store.toggleReaction,
      recallMessage: store.recallMessage,
      openForward: store.openForward,
      closeForward: store.closeForward,
      forwardSelected: store.forwardSelected,
      toggleMessageSelection: store.toggleMessageSelection,
      clearMessageSelection: store.clearMessageSelection,
      openAdmin: store.openAdmin,
      closeAdmin: store.closeAdmin,
      adminCreateUser: store.adminCreateUser,
      adminUpdateUser: store.adminUpdateUser,
      adminSetSelfRegistration: store.adminSetSelfRegistration,
      adminSetAutoRedirectProvider: store.adminSetAutoRedirectProvider,
      adminSaveProvider: store.adminSaveProvider,
      adminDeleteProvider: store.adminDeleteProvider,
      loadAutomation: store.loadAutomation,
      saveAutomation: store.saveAutomation,
      openDirect: store.openDirect,
      closeDirect: store.closeDirect,
      sendDirect: store.sendDirect,
      toggleDirectReaction: store.toggleDirectReaction,
      quickDirectMeeting: store.quickDirectMeeting,
      loadWecomAuthorization: store.loadWecomAuthorization,
      startWecomAuthorization: store.startWecomAuthorization,
      disconnectWecomAuthorization: store.disconnectWecomAuthorization,
      rebindWecomAuthorization: store.rebindWecomAuthorization,
      closeWecomAuthorization: store.closeWecomAuthorization,
      closeSearch: store.closeSearch,
      searchAll: store.searchAll,
      openSearchResult: store.openSearchResult,
    }),
  }, ChatroomEntry))

  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'chatroom',
    order: 30,
    label: () => '群聊与账号',
    inject: () => ({
      hooks: { chatroom: store },
      logout: store.logout,
      closeAccount: store.closeAccount,
      changePassword: store.changePassword,
      openAdmin: store.openAdmin,
      closeAdmin: store.closeAdmin,
      adminCreateUser: store.adminCreateUser,
      adminUpdateUser: store.adminUpdateUser,
      adminSetSelfRegistration: store.adminSetSelfRegistration,
      adminSetAutoRedirectProvider: store.adminSetAutoRedirectProvider,
      adminSaveProvider: store.adminSaveProvider,
      adminDeleteProvider: store.adminDeleteProvider,
      loadAutomation: store.loadAutomation,
      saveAutomation: store.saveAutomation,
      loadManageableRooms: store.loadManageableRooms,
      loadAgentProfiles: store.loadAgentProfiles,
      saveAgentProfile: store.saveAgentProfile,
      deleteAgentProfile: store.deleteAgentProfile,
      cancelAgentProfile: store.cancelAgentProfile,
      openDirect: store.openDirect,
      closeDirect: store.closeDirect,
      sendDirect: store.sendDirect,
      quickDirectMeeting: store.quickDirectMeeting,
      loadWecomAuthorization: store.loadWecomAuthorization,
      startWecomAuthorization: store.startWecomAuthorization,
      disconnectWecomAuthorization: store.disconnectWecomAuthorization,
      rebindWecomAuthorization: store.rebindWecomAuthorization,
      closeWecomAuthorization: store.closeWecomAuthorization,
    }),
  }, ChatroomSettingsSection))

  // DSH 0.1.x renders a gear for every external settings section because the
  // slot contract has no icon field. Mark this localized row after the modal
  // mounts; styles.ts then paints the group/account glyph while the disposer
  // keeps HMR and plugin disable cleanup deterministic.
  ctx.effect(
    () => registerChatroomSettingsNavIcon(() => '群聊与账号'),
    'chatroom: settings navigation icon',
  )

  ctx.slots.inject('conversation.session.header.actions', () => ctx.slots.register({
    name: 'conversation.session.header.actions',
    id: 'chatroom-identity',
    order: -5,
    inject: () => ({
      hooks: { chatroom: store },
      openMembers: store.openMembers,
      openAgents: store.openAgents,
      sessions,
    }),
  }, RoomIdentityAction))

  ctx.slots.inject('conversation.input.left', () => ctx.slots.register({
    name: 'conversation.input.left',
    id: 'chatroom-files',
    order: -20,
    inject: () => ({
      hooks: { chatroom: store },
      addFiles: store.addFiles,
      removeFile: store.removeFile,
      clearReply: store.clearReply,
      sendFiles: store.sendFiles,
      resolveTarget: store.agentTargetForSession.bind(store),
    }),
  }, ChatroomFileAction))

  ctx.slots.inject('conversation.input.right', () => ctx.slots.register({
    name: 'conversation.input.right',
    id: 'chatroom-session-controls',
    order: -30,
    inject: () => ({
      hooks: { chatroom: store },
      resolveTarget: store.agentTargetForSession.bind(store),
      stopRoomSession: store.stopRoomSession,
      newRoomSession: store.newRoomSession,
      quickMeeting: store.quickMeeting,
      quickThreadMeeting: store.quickThreadMeeting,
    }),
  }, ChatroomSessionControls))

  ctx.slots.inject('conversation.input.dock', () => ctx.slots.register({
    name: 'conversation.input.dock',
    id: 'chatroom-group-setup',
    order: -30,
    inject: () => ({
      hooks: { chatroom: store },
      registerNewSession: store.registerNewSession,
      newSessionMode: store.newSessionMode,
      chooseNewSessionMode: store.chooseNewSessionMode,
    }),
  }, NewGroupSetupDock))

  ctx.slots.inject('conversation.input.dock', () => ctx.slots.register({
    name: 'conversation.input.dock',
    id: 'chatroom-composition',
    order: -20,
    inject: () => ({
      hooks: { chatroom: store },
      addFiles: store.addFiles,
      removeFile: store.removeFile,
      clearReply: store.clearReply,
      sendFiles: store.sendFiles,
      updateQueuedPrompt: store.updateQueuedPrompt,
      resolveTarget: store.agentTargetForSession.bind(store),
    }),
  }, ChatroomComposerDock))

  ctx.slots.inject('conversation.input.attachments', () => mountAfterNativeMessageView(
    () => ctx.slots.entries('conversation.input.attachments').find(entry =>
      (entry.options.priority ?? 0) === 0)?.component as ComponentType<ComposerAttachmentsProps> | undefined,
    listener => ctx.slots.subscribe('conversation.input.attachments', listener),
    nativeAttachmentsView => ctx.slots.register({
      name: 'conversation.input.attachments',
      priority: -10,
      locale: 'conversation',
      inject: () => ({
        hooks: { chatroom: store },
        nativeAttachmentsView,
        clearReply: store.clearReply,
        resolveTarget: store.agentTargetForSession.bind(store),
      }),
    }, ChatroomComposerAttachments),
  ))

  ctx.slots.inject('conversation.chat.assistant-actions', () => ctx.slots.register({
    name: 'conversation.chat.assistant-actions',
    id: 'chatroom-reply',
    order: 5,
    inject: () => ({
      hooks: { chatroom: store },
      resolveTarget: store.agentTargetForSession.bind(store),
      setReply: store.setReply,
      openThread: store.openThread,
      toggleReaction: store.toggleReaction,
      recallMessage: store.recallMessage,
      openForward: store.openForward,
      toggleMessageSelection: store.toggleMessageSelection,
    }),
  }, ChatroomAssistantReplyAction))

  ctx.slots.inject('conversation.chat.node', () => mountAfterNativeMessageView(
    () => ctx.slots.entries('conversation.chat.node').find(entry =>
      entry.options.key === 'assistant-step' && (entry.options.priority ?? 0) === 0)?.component as
        | ComponentType<ChatNodeViewProps<'assistant-step'>>
        | undefined,
    listener => ctx.slots.subscribe('conversation.chat.node', listener),
    nativeMessageView => ctx.slots.register({
      name: 'conversation.chat.node',
      key: 'assistant-step',
      priority: -10,
      locale: 'chat',
      inject: () => ({
        hooks: { chatroom: store },
        nativeMessageView,
        resolveTarget: store.agentTargetForSession.bind(store),
        setReply: store.setReply,
        openThread: store.openThread,
        toggleReaction: store.toggleReaction,
        recallMessage: store.recallMessage,
        updateQueuedPrompt: store.updateQueuedPrompt,
        openForward: store.openForward,
        toggleMessageSelection: store.toggleMessageSelection,
      }),
    }, ChatroomAssistantNodeView),
  ))

  ctx.slots.inject('conversation.chat.node', () => mountAfterNativeMessageView(
    () => ctx.slots.entries('conversation.chat.node').find(entry =>
      entry.options.key === 'user' && (entry.options.priority ?? 0) === 0)?.component as
        | ComponentType<ChatNodeViewProps<'user'>>
        | undefined,
    listener => ctx.slots.subscribe('conversation.chat.node', listener),
    nativeMessageView => ctx.slots.register({
      name: 'conversation.chat.node',
      key: 'user',
      priority: -10,
      locale: 'chat',
      inject: () => chatroomMessageInjection(store, nativeMessageView),
    }, ChatroomUserMessageNodeView),
  ))

  ctx.slots.inject('conversation.chat.node', () => mountAfterNativeMessageView(
    () => ctx.slots.entries('conversation.chat.node').find(entry =>
      entry.options.key === 'steering' && (entry.options.priority ?? 0) === 0)?.component as
        | ComponentType<ChatNodeViewProps<'steering'>>
        | undefined,
    listener => ctx.slots.subscribe('conversation.chat.node', listener),
    nativeMessageView => ctx.slots.register({
      name: 'conversation.chat.node',
      key: 'steering',
      priority: -10,
      locale: 'chat',
      inject: () => chatroomMessageInjection(store, nativeMessageView),
    }, ChatroomSteeringMessageNodeView),
  ))
}

interface RemoteSettingsMirror {
  persistence: 'host' | 'memory'
  load(): Promise<void>
}

interface SettingsScopeWithDescribe {
  describe(): RemoteSettingsMirror
}

/** Let RC8's shared settings mirror use the authenticated plugin carrier in a remote browser. */
export function activateRemoteSettingsMirror(settingsScope: unknown): () => void {
  if (!hasSettingsDescribe(settingsScope)) return () => undefined
  const mirror = settingsScope.describe()
  if (!isRemoteSettingsMirror(mirror) || mirror.persistence !== 'memory') return () => undefined
  mirror.persistence = 'host'
  void mirror.load()
  return () => {
    if (mirror.persistence === 'host') mirror.persistence = 'memory'
  }
}

function hasSettingsDescribe(value: unknown): value is SettingsScopeWithDescribe {
  return value !== null && typeof value === 'object'
    && typeof (value as Record<string, unknown>).describe === 'function'
}

function isRemoteSettingsMirror(value: unknown): value is RemoteSettingsMirror {
  return value !== null && typeof value === 'object'
    && ((value as Record<string, unknown>).persistence === 'host'
      || (value as Record<string, unknown>).persistence === 'memory')
    && typeof (value as Record<string, unknown>).load === 'function'
}

/** Mount one wrapper only after its native renderer exists, independent of client-plugin load order. */
export function mountAfterNativeMessageView<T>(
  readNative: () => T | undefined,
  subscribe: (listener: () => void) => () => void,
  mount: (native: T) => () => void,
): () => void {
  let mountedNative: T | undefined
  let disposeMounted: (() => void) | undefined
  const reconcile = (): void => {
    const native = readNative()
    if (native === mountedNative) return
    const dispose = disposeMounted
    disposeMounted = undefined
    mountedNative = undefined
    dispose?.()
    if (native === undefined) return
    mountedNative = native
    disposeMounted = mount(native)
  }
  const unsubscribe = subscribe(reconcile)
  reconcile()
  return () => {
    unsubscribe()
    disposeMounted?.()
    disposeMounted = undefined
    mountedNative = undefined
  }
}

function chatroomMessageInjection<T extends 'user' | 'steering'>(
  store: ChatroomClientStore,
  nativeMessageView: ComponentType<ChatNodeViewProps<T>>,
) {
  return {
    hooks: { chatroom: store },
    resolveTarget: store.agentTargetForSession.bind(store),
    nativeMessageView,
    setReply: store.setReply,
    openThread: store.openThread,
    toggleReaction: store.toggleReaction,
    recallMessage: store.recallMessage,
    openForward: store.openForward,
    toggleMessageSelection: store.toggleMessageSelection,
  }
}

/** Build the room-scoped AI source contributed to RC7's native @ menu. */
export function createChatroomAiSource(store: ChatroomClientStore): InputTriggerSource {
  return {
    trigger: '@',
    name: 'AI 助手',
    order: -100,
    async candidates(session, { query }) {
      const room = store.roomForSession(String(session.sessionId))
      const newGroup = room === undefined && store.newSessionMode(String(session.sessionId)) === 'group'
      if (room === undefined && !newGroup) return []
      const candidates = [{
        name: aiMentionMenuName(room?.aiDisplayName ?? 'DeepSeek'),
        hint: '',
        description: room === undefined ? '创建群聊后立即回复' : '提及后回复',
      }]
      const needle = query.toLocaleLowerCase()
      return candidates.filter(candidate => candidate.name.toLocaleLowerCase().includes(needle))
    },
    lexicon(session) {
      const room = store.roomForSession(String(session.sessionId))
      if (room === undefined) {
        if (store.newSessionMode(String(session.sessionId)) !== 'group') return []
        return ['AI', 'DeepSeek']
      }
      return [...new Set(['AI', room.aiDisplayName])]
    },
    subscribeLexicon(_session, listener) {
      return store.subscribe(listener)
    },
    onPick({ candidate }) {
      return { text: `@${mentionToken(candidate.name)} ` }
    },
  }
}

/** Build the room-scoped human member source contributed to RC7's native @ menu. */
export function createChatroomMemberSource(store: ChatroomClientStore): InputTriggerSource {
  return {
    trigger: '@',
    name: '群聊成员',
    order: -90,
    async candidates(session, { query }) {
      const room = store.roomForSession(String(session.sessionId))
      const newGroup = room === undefined && store.newSessionMode(String(session.sessionId)) === 'group'
      if (room === undefined && !newGroup) return []
      if (newGroup && store.getSnapshot().directPeers.length === 0) await store.loadDirectDirectory()
      const snapshot = store.getSnapshot()
      const candidates = room === undefined
        ? snapshot.directPeers
          .filter(peer => peer.participantId !== snapshot.identity?.participantId)
          .map(peer => ({
            name: newGroupMentionName(peer, snapshot.directPeers),
            hint: '',
            description: `创建群聊时自动邀请 · @${peer.username}`,
          }))
        : snapshot.members
          .filter(member => member.participantId !== snapshot.identity?.participantId)
          .map(member => ({
            name: member.displayName,
            hint: '',
            description: member.online ? '在线成员' : '群成员',
          }))
      const needle = query.toLocaleLowerCase()
      return candidates
        .filter((candidate, index, all) => all.findIndex(item => item.name === candidate.name) === index)
        .filter(candidate => candidate.name.toLocaleLowerCase().includes(needle))
    },
    lexicon(session) {
      const room = store.roomForSession(String(session.sessionId))
      const snapshot = store.getSnapshot()
      if (room === undefined) {
        if (store.newSessionMode(String(session.sessionId)) !== 'group') return []
        return [...new Set(snapshot.directPeers
          .filter(peer => peer.participantId !== snapshot.identity?.participantId)
          .map(peer => newGroupMentionName(peer, snapshot.directPeers)))]
      }
      return [...new Set(snapshot.members
        .filter(member => member.participantId !== snapshot.identity?.participantId)
        .map(member => member.displayName))]
    },
    subscribeLexicon(_session, listener) {
      return store.subscribe(listener)
    },
    onPick({ candidate }) {
      return { text: `@${candidate.name} ` }
    },
  }
}

const AI_MENTION_MENU_SUFFIX = '（AI 助手）'

function aiMentionMenuName(name: string): string {
  return `${name}${AI_MENTION_MENU_SUFFIX}`
}

function mentionToken(menuName: string): string {
  return menuName.endsWith(AI_MENTION_MENU_SUFFIX)
    ? menuName.slice(0, -AI_MENTION_MENU_SUFFIX.length)
    : menuName
}

export default { inject, apply }
