import { Chat} from "./chats"

interface User {
    id: number
    name : string,
    chats: Chat[],
    public_key : string
    currentChat: Chat | null
}


interface UserBackendResponse {
    msg: string,
    user_id: number,
    user_rooms: {[key:string] : string}
    user_admins: string,
    user_public_key: string
}
// TO DO ADD PUBLIC KEY
export type {User, UserBackendResponse}
