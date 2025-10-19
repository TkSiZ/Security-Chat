import { Chat} from "./chats"

interface UserContext {
    name : string,
    chats: Chat[],
    currentChat: Chat | null
}

// TO DO ADD PUBLIC KEY
export type {UserContext}