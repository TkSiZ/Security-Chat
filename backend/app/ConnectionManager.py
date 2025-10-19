from fastapi import WebSocket
from .crud_utils import create_room, delete_room

class ConnectionManager:
    def __init__(self):
        # store active connections as {room_id: {user_id: WebSocket}}
        self.active_connections: dict[int, dict[int, WebSocket]] = {}

    async def connect(self, websocket: WebSocket, room_id: int, user_id: int):
        await websocket.accept()
        if room_id not in self.active_connections:
            self.active_connections[room_id] = {} # creates room
            create_room(
                room_id,
                user_id,
                # room_name
            ) # creates room in database
        self.active_connections[room_id][user_id] = websocket
        print(f"WEBSOCKET CONNECTED USER {user_id}; room {room_id}")

    def disconnect(self, room_id: int, user_id: int):
        if (room_id in self.active_connections) and (user_id in self.active_connections[room_id]):
            del self.active_connections[room_id][user_id] # removes websocket
            if not self.active_connections[room_id]: # if no websocket in room, deletes room
                del self.active_connections[room_id]
                delete_room(room_id) # deletes room in database
        print(f"WEBSOCKET DISCONNECTED USER {user_id}; room {room_id}")

    async def broadcast(self, message: str, room_id: int, sender_id: int):
        # Sends a message to all users in the room
        if room_id in self.active_connections:
            for user_id, websocket in self.active_connections[room_id].items():
                message_with_class = {
                    "text": message,
                    "is_self": user_id == sender_id
                }
                await websocket.send_json(message_with_class)