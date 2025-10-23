interface Message{
    text: string,
    author: string // TO DO: Verify if it really is a string
    type: string, // "MSG" or "KEY"
    destination: number | null // I put it this way because the backend return user_id or None
}

export type {Message}
