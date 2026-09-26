/** Classic QQ choices; the image bytes belong only to the browser bundle. */
export declare const CHATROOM_AVATARS: {
    id: `qq-${number}`;
    label: string;
    imageIndex: number;
}[];
declare const LEGACY_AVATARS: {
    readonly whale: "qq-1";
    readonly panda: "qq-2";
    readonly fox: "qq-3";
    readonly cat: "qq-4";
    readonly dog: "qq-5";
    readonly rabbit: "qq-6";
    readonly octopus: "qq-7";
    readonly unicorn: "qq-8";
};
/** Stable id of one built-in chatroom avatar. */
export type ChatroomAvatarId = (typeof CHATROOM_AVATARS)[number]['id'] | keyof typeof LEGACY_AVATARS;
/** Whether an untrusted string names one built-in avatar. */
export declare function isChatroomAvatarId(value: unknown): value is ChatroomAvatarId;
/** Deterministic fallback for identities and old transcript markers without an avatar. */
export declare function fallbackAvatarId(seed: string): ChatroomAvatarId;
/** Display metadata for one validated or historical avatar id. */
export declare function chatroomAvatar(value: string | undefined, seed: string): {
    id: `qq-${number}`;
    label: string;
    imageIndex: number;
};
export {};
//# sourceMappingURL=avatars.d.ts.map