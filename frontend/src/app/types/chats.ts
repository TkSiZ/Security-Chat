interface Chat{
    id : number,
    name: string,
    admin: number
}

interface CreateChat{
    room_id: number,
    room_name: string,
    user_id: number,
}
export type {Chat, CreateChat}