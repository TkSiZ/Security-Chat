from fastapi import WebSocket
from app.utils import create_room, delete_room

class ConnectionManager:
    def __init__(self):
        # store active connections as {room_id: {user_id: WebSocket}}
        self.active_connections: dict[int, dict[int, WebSocket]] = {}

    async def connect(self, websocket: WebSocket, room_id: int, user_id: int):
        """
        Accepts a websocket connection and registers the user in the room.
        Optionally creates the room in the database if it doesn't exist.
        """
        await websocket.accept()
        if room_id not in self.active_connections:
            self.active_connections[room_id] = {}  # creates room
        self.active_connections[room_id][user_id] = websocket

        print(f"WEBSOCKET CONNECTED USER {user_id}; room {room_id}")

    def disconnect(self, room_id: int, user_id: int):
        """
        Disconnects a websocket and removes it from active connections.
        Deletes the room if no users remain.
        """
        if (room_id in self.active_connections) and (user_id in self.active_connections[room_id]):
            del self.active_connections[room_id][user_id]
            if not self.active_connections[room_id]:  # remove empty room
                del self.active_connections[room_id]
        print(f"WEBSOCKET DISCONNECTED USER {user_id}; room {room_id}")

    async def broadcast(self, message: dict, room_id: int, sender_id: int):
        """
        Sends a message to all users in the room.
        """
        if room_id in self.active_connections:
            for user_id, websocket in self.active_connections[room_id].items():
                payload = {
                    "author" : message["author"],
                    "text": message["text"],
                    "type": message["type"],
                    "destination": message["destination"]
                }
                try:
                    await websocket.send_json(payload)
                except Exception as e:
                    print(f"Failed to send message to user {user_id}: {e}")
