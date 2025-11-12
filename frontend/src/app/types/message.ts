interface Message{
    text: string,
    user_id: number,
    author: string // TO DO: Verify if it really is a string
    type: string, // "MSG" or "KEY"
    destination: number | null // I put it this way because the backend returns user_id or None
}

export type {Message}
