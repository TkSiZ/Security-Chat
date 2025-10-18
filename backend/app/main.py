from .encryption_utils import *
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import psycopg2

# connection for my local postgres database, NOT the one in docker container
# tables where already created using backend/db/migrations/01_create_tables.sql
conn = psycopg2.connect(
    host="localhost",
    dbname="postgres",
    user="postgres",
    password="1234",
    port=5433)

cur = conn.cursor()
app = FastAPI(title="Zap")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def is_connected():
    return {"is_connected" : 1}

@app.post("/login")
def login(username:str):
    cur.execute(
        """SELECT * FROM "User" WHERE username = %s;""",
        (username,)
    )

    user = cur.fetchone()

    private_key = generate_private_key()
    public_key = generate_public_key(private_key)

    # private key is stored locally
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
    return {"msg": msg}


@app.post("/create_room")
def create_room(room_id, username):
    cur.execute(
        """SELECT * FROM "Room" WHERE room_id = %s;""",
        (room_id,)
    )

    if cur.fetchone():
        return {"msg" : f"Room '{room_id}'already exists"}

    cur.execute(
        """SELECT user_id FROM "User" WHERE username = %s""",
        (username,)
    )
    user_id = cur.fetchone()
    if not user_id:
        return {"msg": f"User '{username}' does not exist"}

    cur.execute(
        """INSERT INTO "Room" (room_id, admin) VALUES (%s, %s);""",
        (room_id, user_id)
    )

    conn.commit()

    return {"msg": f"Room '{room_id}' created and admin is user '{username}'"}

@app.post("/room/{room_id}")
def send_message(message):
    pass
