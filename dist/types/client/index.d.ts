/** Browser half of the AI chatroom plugin. */
import type { Context as ClientContext } from '@deepseek-ai/cordis';
import type { InputTriggerSource } from '@deepseek-ai/dsh-client-ui-input-trigger/client';
import { ChatroomClientStore, type ChatroomPhase } from './store.js';
export declare const inject: string[];
interface NativeDirectoryList {
    getSnapshot(): {
        readonly phase?: 'pending' | 'ready';
        readonly current: string | undefined;
    };
    subscribe(listener: () => void): () => void;
}
interface DeepLinkStore {
    getSnapshot(): {
        readonly phase: ChatroomPhase;
        readonly identity?: {
            readonly participantId: string;
        } | undefined;
    };
    subscribe(listener: () => void): () => void;
}
/**
 * Resolve a URL navigation only after the host has produced its initial
 * directory baseline. A changed current while it is still pending is a user
 * navigation (for example, New Session) and cancels the URL intent. The first
 * pending -> ready snapshot is the host's persisted-selection restoration.
 */
export declare function waitForNativeDirectoryReady(list: NativeDirectoryList, ready: () => void, cancelled: () => void): () => void;
/**
 * Preserve a URL intent across the unauthenticated gate, but consume it at
 * most once for each successful authentication epoch. A pending callback
 * rechecks its epoch so logout/account changes cannot cross into another
 * identity. Ordinary store changes never retry an attempted URL selection.
 */
export declare function scheduleDeepLinkNavigation(store: DeepLinkStore, list: NativeDirectoryList, roomId: string, select: (roomId: string) => void): () => void;
/** Consume the native connection and UI services materialized by the host. */
export declare function apply(ctx: ClientContext): void;
/** Let RC8's shared settings mirror use the authenticated plugin carrier in a remote browser. */
export declare function activateRemoteSettingsMirror(settingsScope: unknown): () => void;
/** Mount one wrapper only after its native renderer exists, independent of client-plugin load order. */
export declare function mountAfterNativeMessageView<T>(readNative: () => T | undefined, subscribe: (listener: () => void) => () => void, mount: (native: T) => () => void): () => void;
/** Build the room-scoped AI source contributed to RC7's native @ menu. */
export declare function createChatroomAiSource(store: ChatroomClientStore): InputTriggerSource;
/** Build the room-scoped human member source contributed to RC7's native @ menu. */
export declare function createChatroomMemberSource(store: ChatroomClientStore): InputTriggerSource;
declare const _default: {
    inject: string[];
    apply: typeof apply;
};
export default _default;
//# sourceMappingURL=index.d.ts.map