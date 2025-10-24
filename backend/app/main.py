from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from app.ConnectionManager import ConnectionManager
import app.utils as utils
import json
from .encryption_utils import *

app = FastAPI(title="Zap")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

manager = ConnectionManager()

# { user_id : private_key }
app.private_keys = {} # will start empty

@app.get("/test/get_private_keys") # NOTE: this is for test reasons only and should not be in final version
def get_private_keys():
    if not app.private_keys:
        print("[DEBUG] no private keys stored")
        return {"msg" : "No private keys stored"}
    else:
        print(f"[DEBUG] GET PRIVATE KEYS: {app.private_keys}")
        return app.private_keys

@app.get("/user/")
def get_user_info(username: str):
    return utils.get_user_info(username)

@app.post("/users/")
def get_users_info(username_list: list[str]):
    users_info = []
    for username in username_list:
        users_info.append(utils.get_user_info(username))

    return users_info

@app.get("/public_key_by_username")
def get_public_key_by_username(username:str):
    return utils.get_public_key_by_username(username)

@app.get("/public_key_by_id")
def get_public_key_by_id(user_id:int):
    return utils.get_public_key_by_id(user_id)

@app.post("/public_keys")
def get_public_keys(users: list[int]):
    return utils.get_public_keys(users)

@app.post("/login")
def login_route(username: str):
    return_message = utils.login(username)

    user_id = return_message["user_id"]
    user_private_key = return_message["private_key"]
    app.private_keys[user_id] = user_private_key

    print(f"[DEBUG] p_keys: {app.private_keys}")

    del return_message["private_key"] # private key MUST NOT be transmitted

    return return_message

@app.get("/get_room")
def get_room(room_id: int = Query(...)):
    return utils.get_room(room_id)


@app.post("/create_room")
def create_room_route(room_id: int, room_name: str, user_id: int):

    return utils.create_room(room_id, room_name, user_id)


@app.delete("/test/delete_room")
def delete_room(room_id: int):
    utils.delete_room(room_id)
    return {"msg": f"Room {room_id} deleted"}

@app.put("/join_room/{room_id}")
def join_room(user_id:int, room_id:int):
    return utils.join_room(user_id, room_id)


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
            "text" : f"{user_name} has joined the chat.",
            "type" : "MSG",
            "destination": None
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
            "text" : f'{user_name} has left the chat.',
            "type": "MSG", # "KEY" "MSG",
            "destination": None
        }
        await manager.broadcast(payload, room_id, user_id)


@app.get("/is_admin")
def is_admin_of_room(user_id: int, room_id: int):
    return utils.is_admin_of_room(user_id, room_id)

