interface Chat{
    id : number,
    name: string,
    admin: number
}

interface CreateChat{
    room_name: string,
    user_id: number,
}
export type {Chat, CreateChat}
