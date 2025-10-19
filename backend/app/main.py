import os
from .encryption_utils import *
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import psycopg2
from dotenv import load_dotenv
from .ConnectionManager import ConnectionManager
from . import crud_utils

load_dotenv()
DB_HOST = os.getenv('DB_HOST')
DB_USER = os.getenv('DB_USER')
DB_NAME = os.getenv('DB_NAME')
DB_PASSWORD = os.getenv('DB_PASSWORD')
DB_PORT = os.getenv('DB_PORT')

# connection for online postgres database
# tables where already created using backend/db/migrations/01_create_tables.sql
conn = psycopg2.connect(
    host=DB_HOST,
    dbname=DB_NAME,
    user=DB_USER,
    password=DB_PASSWORD,
    port=DB_PORT)

cur = conn.cursor()
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
    cur.execute(
        """SELECT * FROM "User" WHERE username = %s;""",
        (username,)
    )

    user = cur.fetchone()
    if not user:
        return {"msg" : f"User '{username}' does not exist"}

    user_id = user[0]

    # rooms where user is
    cur.execute("""SELECT * FROM "User_In_Room" WHERE user_id = %s""", (user_id,))

    user_in_room_rows = cur.fetchall()
    user_rooms = []
    for row in user_in_room_rows:
        user_rooms.append(row[0])

    # rooms user admins
    user_admins = []
    for user_room in user_rooms:
        cur.execute("""SELECT * FROM "Room" WHERE room_id = %s""", (user_room,))
        room = cur.fetchone()
        if room[1] == user_id:
            user_admins.append(room[0])

    return {"user_id" : user_id, "user_rooms": user_rooms, "user_admins": user_admins}

@app.post("/login")
def login(username:str):
    # login currently uses username instead of user_id, this might change
    cur.execute(
        """SELECT * FROM "User" WHERE username = %s;""",
        (username,)
    )

    user = cur.fetchone()

    private_key = generate_private_key()
    public_key = generate_public_key(private_key)

    # private key is stored locally # TODO this must be on client
    with open("local_user_data.txt", "w") as file:
        file.write(str(private_key))

    if not user: # user didn't exist, must be created
        cur.execute(
            """INSERT INTO "User" (username, public_key) VALUES (%s, %s);""",
            (username, public_key)
        )
        msg =  f"User '{username}' was created and has logged in"

    else: # user exists, must be updated
        cur.execute(
            """UPDATE "User" SET public_key = (%s) WHERE username = (%s);""",
            (public_key, username)
        )
        msg = f"User '{username}' has logged in"

    conn.commit()

    user_info = get_user_info(username)

    return {
        "msg": msg,
        "user_id": user_info["user_id"],
        "user_rooms": user_info["user_rooms"],
        "user_admins": user_info["user_admins"],
    }


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