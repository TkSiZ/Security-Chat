from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
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

class Users(BaseModel):
    payload: list[str]
    room_id: int


class LoginInfo(BaseModel):
    username: str
    public_key: str
    password_hash_bytes: list[int]


@app.get("/all_users")
def get_all_users():
    """Returns list with the usernames and user ids of all users"""
    users = utils.get_all_users()

    return {"users": users}

@app.put("/update_user_in_room")
def update_user_in_room_rows(users: Users):
    utils.update_user_in_room_rows(users)
    return
    

@app.put("/create_account")
def create_account(login_info: LoginInfo):
    print("Chegamos no create account")
    return utils.create_account(login_info.username, login_info.public_key, login_info.password_hash_bytes)


@app.post("/login")
def login_route(username: str, public_key: str, password:str):
    print("Chegamos no login")
    return utils.login(username, public_key, password)


@app.get("/user/")
def get_user_info(username: str):
    return utils.get_user_info(username)

@app.get("/users_in_room")
def get_users_in_room(room_id:int):
    """Returns users connected to the room websocket, NOT the users through User_In_Room table"""
    ac = manager.get_active_connections()
    if room_id not in ac or not ac[room_id]:
        return {"msg": f"Room {room_id} has no users or doesn't exist"}
    else:
        return {"users" : list(ac[room_id].keys())}
    

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

@app.get("/get_room")
def get_room(room_id: int = Query(...)):
    return utils.get_room(room_id)


@app.post("/create_room")
def create_room(room_id: int, room_name: str, user_id: int):
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

    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            await manager.broadcast(message, room_id, user_id)
    except WebSocketDisconnect:
        manager.disconnect(room_id, user_id)
        payload = {
            "author" : "server",
            "user_id": user_id,
            "text" : f'{user_name} has left the chat.',
            "type": "EXIT", # "KEY" "MSG" "JOIN" "EXIT",
            "destination": None
        }
        await manager.broadcast(payload, room_id, user_id)


@app.get("/is_admin")
def is_admin_of_room(user_id: int, room_id: int):
    return utils.is_admin_of_room(user_id, room_id)

@app.get("/updatedChat")
def get_updated_chat(user_name : str):
    return utils.updated_chats(user_name)