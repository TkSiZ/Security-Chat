from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from app.ConnectionManager import ConnectionManager
import app.crud_utils as crud_utils
import json

app = FastAPI(title="Zap")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

manager = ConnectionManager()


@app.get("/user/")
def get_user_info(username: str):
    return crud_utils.get_user_info(username)


@app.post("/users/")
def get_users_info(username_list: list[str]):
    users_info = []
    for username in username_list:
        users_info.append(crud_utils.get_user_info(username))
    return users_info

@app.post("/users/")
def get_users_info(username_list: list[str]):
    users_info = []
    for username in username_list:
        users_info.append(crud_utils.get_user_info(username))

    return users_info

@app.get("/public_key")
def get_public_key(username):
    return crud_utils.get_public_key(username)

@app.post("/login")
def login_route(username: str):
    return crud_utils.login(username)

@app.get("/get_room")
def get_room(room_id: int = Query(...)):
    return crud_utils.get_room(room_id)


@app.post("/create_room")
def create_room_route(room_id: int, room_name: str, user_id: int):
    return crud_utils.create_room(room_id, room_name, user_id)


@app.delete("/test/delete_room")
def delete_room_route(room_id: int):
    crud_utils.delete_room(room_id)
    return {"msg": f"Room {room_id} deleted"}

@app.put("/join_room/{room_id}")
def join_room(user_id, room_id):
    return crud_utils.join_room(user_id, room_id)


@app.websocket("/ws/{room_id}/{user_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    room_id: int,
    user_id: int,
    user_name: str = Query(...)
):
    """
    WebSocket endpoint to connect a user to a room.
    Optional `room_name` query param to create room on first connect.
    """
    await manager.connect(websocket, room_id, user_id)
    payload = {
            "author" : "server",
            "text" : f"{user_name} has joined the chat."
        }
    await manager.broadcast(payload, room_id, user_id)

    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            await manager.broadcast(message, room_id, user_id)
    except WebSocketDisconnect:
        manager.disconnect(room_id, user_id)
        payload = {
            "author" : "server",
            "text" : f'{user_name} has left the chat.'
        }
        await manager.broadcast(payload, room_id, user_id)


@app.websocket("/fds")
async def test_websocket(websocket: WebSocket):
    print("test websocket", websocket)
    await websocket.accept()
