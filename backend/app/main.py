from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from .ConnectionManager import ConnectionManager
from . import crud_utils

app = FastAPI(title="Zap")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

manager = ConnectionManager()


@app.get("/user/")
def get_user_info(username):
    return_msg = crud_utils.get_user_info(username)
    return return_msg


@app.post("/login")
def login(username:str):
    return_msg = crud_utils.login(username)
    return return_msg


@app.post("/create_room")
def create_room(
        room_id,
        # room_name,
        user_id,
):
    return_msg = crud_utils.create_room(
        room_id,
        # room_name,
        user_id,
    )
    return return_msg


@app.websocket("/ws/{room_id}/{user_id}")
async def websocket_endpoint(
        websocket: WebSocket,
        room_id: int,
        user_id: int,
        # username:str
):
    await manager.connect(websocket, room_id, user_id)
    await manager.broadcast(f"'{user_id}' has joined the chat.", room_id, user_id)

    try:
        while True:
            data = await websocket.receive_text()
            await manager.broadcast(f"'{user_id}': {data}", room_id, user_id)
    except WebSocketDisconnect:
        manager.disconnect(room_id, user_id)
        await manager.broadcast(f"'{user_id}' has left the chat.", room_id, user_id)


@app.websocket("/fds")
async def test_websocket(websocket: WebSocket):
    print("test websocket", websocket)
    await websocket.accept()


@app.delete("/test/delete_room")
def delete_room(room_id):
    crud_utils.delete_room(room_id)