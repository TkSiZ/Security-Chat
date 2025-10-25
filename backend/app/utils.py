import os
import psycopg2
# from app.encryption_utils import *
from .encryption_utils import * # this is what works for Vini
from dotenv import load_dotenv
from fastapi import WebSocket

# connection for online postgres database
load_dotenv()
DB_HOST = os.getenv('DB_HOST')
DB_USER = os.getenv('DB_USER')
DB_NAME = os.getenv('DB_NAME')
DB_PASSWORD = os.getenv('DB_PASSWORD')
DB_PORT = os.getenv('DB_PORT')

def new_admin(user_id:int, room_id:int):
    """When a user connects to the websocket, this function is called to add them as an admin when the room is empty"""
    # NOTE: this function doesn't check if room is actually empty; this is checked in ConnectionManager.connect()
    conn = psycopg2.connect(host=DB_HOST, dbname=DB_NAME, user=DB_USER, password=DB_PASSWORD, port=DB_PORT)
    cur = conn.cursor()

    cur.execute(
        """UPDATE "Room"
           SET admin = (%s)
           WHERE room_id = (%s);""",
        (user_id, room_id)
    )

    conn.commit()
    cur.close()
    conn.close()
    print(f"[DEBUG] New Admin of room '{room_id}' is '{user_id}'")

def updated_chats(user_name: str):
    conn = psycopg2.connect(
        host=DB_HOST,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
        port=DB_PORT
    )

    cur = conn.cursor()

    cur.execute(
        """SELECT * FROM "User" WHERE username = %s;""",
        (user_name,)
    )

    user = cur.fetchone()

    # Get full user info
    user_info = get_user_info(user_name)

    cur.close()
    conn.close()

    print(f"User {user_name} logged in")

    return {
        "user_rooms": user_info["user_rooms"],
    }


def update_admin(user_id:int, room_id:int, users_in_room : dict[int, WebSocket]):
    """When a user disconnects from a websocket, this function should be called to update admin"""
    conn = psycopg2.connect(host=DB_HOST, dbname=DB_NAME, user=DB_USER, password=DB_PASSWORD, port=DB_PORT)
    cur = conn.cursor()

    cur.execute("""SELECT admin FROM "Room" WHERE room_id = %s""", (room_id,))

    admin = cur.fetchone()
    if user_id == admin[0] or not admin[0]: # if user that left is admin, or if admin is None (should not happen naturally)
        users_in_room = list(users_in_room.keys())
        if users_in_room:
            new_admin = users_in_room[0]
            cur.execute(
                """UPDATE "Room" SET admin = (%s) WHERE room_id = (%s);""",
                (new_admin, room_id)
            )
            msg = {"msg" : f"Room '{room_id}': previous admin '{admin[0]}' replaced by user '{new_admin}'"}
        else:
            cur.execute(
                """UPDATE "Room" SET admin = NULL WHERE room_id = (%s);""",
                (room_id, )
            )
            msg = {"msg": f"Room '{room_id}': previous admin '{admin[0]}' left, leaving chat empty'"}

        conn.commit()
    else:
        msg =  {"msg" : f"User '{user_id}' is not admin '{admin[0]}' of room '{room_id}'. No need to update admin."}

    cur.close()
    conn.close()

    print(f"[DEBUG] {msg["msg"]}")
    return msg


def get_room(room_id:int):
    conn = psycopg2.connect(host=DB_HOST, dbname=DB_NAME, user=DB_USER, password=DB_PASSWORD, port=DB_PORT)

    cur = conn.cursor()

    cur.execute(
        """SELECT *
           FROM "Room"
           WHERE room_id = %s;""",
        (room_id,)
    )

    room = cur.fetchone()
    if not room:
        return {
            "room_name" : "Error: no room",
            "room_admin" : "Error: no room",
            "msg" : f"Room {room_id} doesn't exist"
        }

    return {
        "room_name" : room[2],
        "room_admin" : room[1],
        "msg" : f"Room {room_id} exists!"
    }

def get_public_key_by_username(username:str):
    conn = psycopg2.connect(host=DB_HOST, dbname=DB_NAME, user=DB_USER, password=DB_PASSWORD, port=DB_PORT)

    cur = conn.cursor()

    cur.execute("""SELECT * FROM "User" WHERE username = %s""",
                (username,))

    user = cur.fetchone()
    if not user:
        return {"public_key" : "error"}

    public_key = user[2]

    cur.close()
    conn.close()

    return {"public_key" : public_key}

def get_public_key_by_id(user_id:int):
    conn = psycopg2.connect(host=DB_HOST, dbname=DB_NAME, user=DB_USER, password=DB_PASSWORD, port=DB_PORT)

    cur = conn.cursor()

    cur.execute("""SELECT * FROM "User" WHERE user_id = %s""",
                (user_id,))

    user = cur.fetchone()
    if not user:
        return {"public_key" : "error"}

    public_key = user[2]

    cur.close()
    conn.close()

    return {"public_key" : public_key}

def get_public_keys(users: list[int]):
    conn = psycopg2.connect(host=DB_HOST, dbname=DB_NAME, user=DB_USER, password=DB_PASSWORD, port=DB_PORT)

    cur = conn.cursor()

    cur.execute("""SELECT user_id, public_key
                   FROM "User"
                   WHERE user_id IN %s""",
                (tuple(users),))

    query = cur.fetchall()

    keys_dict = {}
    for row in query:
        keys_dict[row[0]] = row[1]

    cur.close()
    conn.close()

    return keys_dict

def create_room(
        room_id:int,
        room_name:str,
        user_id:int,
):
    conn = psycopg2.connect( host=DB_HOST, dbname=DB_NAME, user=DB_USER, password=DB_PASSWORD, port=DB_PORT)

    cur = conn.cursor()

    # check if room exists
    cur.execute(
        """SELECT * FROM "Room" WHERE room_id = %s;""",
        (room_id,)
    )

    if cur.fetchone():
        print(f"Room '{room_id}'already exists")
        return {"msg" : f"Room '{room_id}'already exists"}

    # check if user exists
    cur.execute(
        """SELECT * FROM "User" WHERE user_id = %s""",
        (user_id,)
    )
    user = cur.fetchone()
    if not user_id:
        print(f"User of ID '{user_id}' does not exist")
        return {"msg": f"User of ID '{user_id}' does not exist"}

    # create room
    cur.execute(
        """INSERT INTO "Room" (room_id, admin, name) VALUES (%s, %s, %s);""",
        (room_id, user_id, room_name)
    )

    # update user in room
    cur.execute(
        """INSERT INTO "User_In_Room" (room_id, user_id) VALUES (%s, %s);""",
        (room_id, user_id)
    )
    # maybe check if user is already in room, which should not happen naturally

    conn.commit()

    cur.close()
    conn.close()

    print(f"Room '{room_id}' created and admin is user '{user[1]}'")
    return {
        "msg": f"Room '{room_id}' created and admin is user '{user[1]}'",
        "room_id": room_id,
        "room_name": room_name,
        "room_admin": user[1]
    }
def get_user_info(username:str):
    conn = psycopg2.connect( host=DB_HOST, dbname=DB_NAME, user=DB_USER, password=DB_PASSWORD, port=DB_PORT)

    cur = conn.cursor()

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
        room_id = row[0]
        cur.execute("""SELECT *
                       FROM "Room"
                       WHERE room_id = %s""", (room_id,))
        room_info = cur.fetchone()
        user_rooms.append({
            "id" : room_info[0],
            "name": room_info[2],
            "admin": room_info[1]
        })

    # rooms user admins
    user_admins = []
    for user_room in user_rooms:
        room_id = user_room["id"]
        cur.execute("""SELECT * FROM "Room" WHERE room_id = %s""", (room_id,))
        room = cur.fetchone()
        if room[1] == user_id:
            user_admins.append(room[0])

    cur.close()
    conn.close()

    return {"user_id" : user_id, "user_rooms": user_rooms, "user_admins": user_admins}

def delete_room(room_id:int):
    conn = psycopg2.connect( host=DB_HOST, dbname=DB_NAME, user=DB_USER, password=DB_PASSWORD, port=DB_PORT)

    cur = conn.cursor()

    cur.execute("""DELETE FROM "User_In_Room" WHERE room_id = %s""",
                (room_id,))

    cur.execute(
        """DELETE FROM "Room" WHERE room_id = %s;""",
        (room_id,)
    )

    conn.commit()

    cur.close()
    conn.close()

    print(f"Room '{room_id}' deleted.")

def join_room(user_id:int, room_id:int):
    conn = psycopg2.connect(host=DB_HOST, dbname=DB_NAME, user=DB_USER, password=DB_PASSWORD, port=DB_PORT)

    cur = conn.cursor()

    cur.execute("""SELECT * FROM "Room" WHERE room_id = %s""", (room_id,))
    room = cur.fetchone()
    if not room:
        return {"msg": f"Room {room_id} doesn't exist"}

    room_id = room[0]

    cur.execute("""SELECT * FROM "User" WHERE user_id = %s""", (user_id,))
    user = cur.fetchone()
    if not user:
        return {"msg": f"User {user_id} doesn't exist"}

    cur.execute("""SELECT * FROM "User_In_Room" WHERE room_id = %s AND user_id = %s""",
                (room_id, user_id))

    check = cur.fetchone()
    if check:
        return {"msg" : f"User {user_id} is already in {room_id}"}

    cur.execute("""INSERT INTO "User_In_Room" (room_id, user_id) VALUES (%s, %s) ON CONFLICT DO NOTHING;""",
                (room_id, user_id))

    conn.commit()
    cur.close()
    conn.close()
    return {"msg" : f"User {user_id} inserted into room {room_id}"}

def login(username:str, public_key:str):
    """Creates/updates user info in database. Requires public_key generated in client frontend"""
    conn = psycopg2.connect( host=DB_HOST, dbname=DB_NAME, user=DB_USER, password=DB_PASSWORD, port=DB_PORT)

    cur = conn.cursor()

    cur.execute(
        """SELECT * FROM "User" WHERE username = %s;""",
        (username,)
    )

    user = cur.fetchone()

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

    cur.close()
    conn.close()

    print(f"User {username} logged in")
    return {
        "msg": msg,
        "user_id": user_info["user_id"],
        "user_rooms": user_info["user_rooms"],
        "user_admins": user_info["user_admins"],
    }

def is_admin_of_room(user_id:int, room_id:int):
    conn = psycopg2.connect(host=DB_HOST, dbname=DB_NAME, user=DB_USER, password=DB_PASSWORD, port=DB_PORT)

    cur = conn.cursor()

    cur.execute("""SELECT * FROM "User" WHERE user_id = %s""", (user_id,))

    user = cur.fetchone()
    if not user:
        return {"status code" : -1, "msg" : f"user {user_id} does not exist"}

    cur.execute("""SELECT * FROM "Room" WHERE room_id = %s""", (room_id,))
    room = cur.fetchone()
    if not room:
        return {"status code" : -1, "msg" : f"room {room_id} does not exist"}

    admin_id = room[1]

    if user_id == admin_id:
        return {"status code" : 1, "msg" : f"User '{user_id}' is admin of room '{room_id}'"}
    else:
        return {"status code": 0, "msg": f"User '{user_id}' is NOT admin of room '{room_id}'. Admin is user '{admin_id}'"}
