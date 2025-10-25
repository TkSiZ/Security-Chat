from fastapi import WebSocket
from app.utils import create_room, delete_room, update_admin, new_admin

class ConnectionManager:
    def __init__(self):
        # store active connections as {room_id: {user_id: WebSocket}}
        self.active_connections: dict[int, dict[int, WebSocket]] = {}

    def get_active_connections(self):
        return self.active_connections

    async def connect(self, websocket: WebSocket, room_id: int, user_id: int):
        """
        Accepts a websocket connection and registers the user in the room.
        Does NOT create rooms in the database.
        Also register new admin of room (when empty room receives a user)
        """
        await websocket.accept()
        if room_id not in self.active_connections: # if room doesn't exist
            self.active_connections[room_id] = {}  # creates room
        else:
            if not self.active_connections[room_id]: # if room is empty
                new_admin(user_id, room_id) # register new admin
        self.active_connections[room_id][user_id] = websocket

        print(f"WEBSOCKET CONNECTED USER {user_id}; room {room_id}")

    def disconnect(self, room_id: int, user_id: int):
        """
        Disconnects a websocket and removes it from active connections.
        Does NOT delete the room if no users remain.
        Updates admin if necessary.
        """
        if (room_id in self.active_connections) and (user_id in (users_in_room := self.active_connections[room_id])):
            del self.active_connections[room_id][user_id]
            update_admin(user_id, room_id, users_in_room)
            # if not self.active_connections[room_id]:  # no longer remove empty rooms
                # del self.active_connections[room_id]
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
