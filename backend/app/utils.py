import json
import os
import bcrypt
import psycopg2
import random
import smtplib
from email.mime.text import MIMEText
# from app.encryption_utils import *
# from .encryption_utils import * # this is what works for Vini
from dotenv import load_dotenv
from fastapi import WebSocket
from pydantic import BaseModel
import time

def saveOtp(user_id: int, code: str, app):
    app.state.otp_storage[user_id] = {
        "code": code,
        "expires": time.time() + 300
    }

def otpVerification(user_id: int, otpCode: str, app) -> bool:
    otp_storage = app.state.otp_storage
    print(otp_storage)
    if user_id not in otp_storage:
        print("Erro no id")
        return False

    stored = otp_storage[user_id]

    # Verifica expiração
    if time.time() > stored["expires"]:
        print("Erro no Tempo")
        del otp_storage[user_id]
        return False

    # Verifica código
    if stored["code"] != otpCode:
        print("Erro no código")
        return False

    # Tudo OK ✔️
    print("deu tudo certo papai")
    del otp_storage[user_id]
    return True

def send_email_code(recipient, user_id, app):
    code = generate_otp()
    msg = MIMEText(f"Seu código de verificação é: {code}")
    msg["Subject"] = "Seu código 2FA"
    msg["From"] = "siithard2005@gmail.com"
    msg["To"] = recipient

    with smtplib.SMTP("smtp.gmail.com", 587) as server:
        server.starttls()
        server.login("siithard2005@gmail.com", "pryi lrix yhxr gtlg")
        server.send_message(msg)
        print("Código Enviado")
        saveOtp(user_id, code, app)

class Users(BaseModel):
    payload: list[str]
    room_id: int


class LoginInfo(BaseModel):
    username: str
    public_key: str
    password_hash_bytes: list[int]

# connection for online postgres database
load_dotenv()
DB_HOST = os.getenv('DB_HOST')
DB_USER = os.getenv('DB_USER')
DB_NAME = os.getenv('DB_NAME')
DB_PASSWORD = os.getenv('DB_PASSWORD')
DB_PORT = os.getenv('DB_PORT')


def generate_otp():
    return str(random.randint(100000, 999999))



def update_user_in_room_rows(users: Users):
    conn = psycopg2.connect(host=DB_HOST, dbname=DB_NAME, user=DB_USER, password=DB_PASSWORD, port=DB_PORT)
    cur = conn.cursor()

    room_id = users.room_id

    for user in users.payload:
        json_user = json.loads(user)
        cur.execute(
            """INSERT INTO "User_In_Room" (room_id, user_id)
            VALUES (%s, %s) ON CONFLICT DO NOTHING""",
            (room_id, json_user["user_id"])
        )

    conn.commit()

    cur.close()
    conn.close()


def get_all_users():
    conn = psycopg2.connect(host=DB_HOST, dbname=DB_NAME, user=DB_USER, password=DB_PASSWORD, port=DB_PORT)
    cur = conn.cursor()

    cur.execute("""SELECT username, user_id FROM "User" """)

    users = cur.fetchall()
    usernames = []

    cur.close()
    conn.close()

    # print(f"[DEBUG] All users:")
    for user in users:
        # print(user[0], user[1])
        usernames.append({"username": user[0], "user_id": user[1]})

    return usernames


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
    # Get full user info
    user_info = get_user_info(user_name)

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

def get_usernames(user_ids: list[int]):
    conn = psycopg2.connect(host=DB_HOST, dbname=DB_NAME, user=DB_USER, password=DB_PASSWORD, port=DB_PORT)
    cur = conn.cursor()

    cur.execute("""SELECT user_id, username
                   FROM "User"
                   WHERE user_id IN %s""",
                (tuple(user_ids),))

    query = cur.fetchall()
    usernames = []
    for user in query:
        usernames.append(user[1])

    cur.close()
    conn.close()

    return usernames

def get_usernames_in_room(room_id :int):
    conn = psycopg2.connect(host=DB_HOST, dbname=DB_NAME, user=DB_USER, password=DB_PASSWORD, port=DB_PORT)
    cur = conn.cursor()

    cur.execute("""SELECT username
                   FROM "User"
                   WHERE user_id IN (SELECT user_id
                                     FROM "User_In_Room"
                                     WHERE room_id = %s)""",
                (room_id,))

    users = cur.fetchall()

    usernames = []
    for user in users:
        usernames.append(user[0])

    cur.close()
    conn.close()

    return usernames


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
        return {
            "msg" : -1,
            "description" : f"Room '{room_id}'already exists",
        }

    # check if user exists
    cur.execute(
        """SELECT * FROM "User" WHERE user_id = %s""",
        (user_id,)
    )
    user = cur.fetchone()
    if not user_id:
        print(f"User of ID '{user_id}' does not exist")
        return {
            "msg": -2,
            "description": f"User of ID '{user_id}' does not exist"
        }

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

def get_user_email(username: str):
    conn = psycopg2.connect( host=DB_HOST, dbname=DB_NAME, user=DB_USER, password=DB_PASSWORD, port=DB_PORT)

    cur = conn.cursor()

    cur.execute(
        """SELECT email FROM "User" WHERE username = %s;""",
        (username,)
    )

    user = cur.fetchone()
    if not user:
        return {
            "msg" : f"User '{username}' does not exist",
            "user_id": -1,
        }

    user_email = user[0]

    return  user_email

def get_user_info_via_id(id: int):
    conn = psycopg2.connect( host=DB_HOST, dbname=DB_NAME, user=DB_USER, password=DB_PASSWORD, port=DB_PORT)

    cur = conn.cursor()

    user_id = id

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

def get_user_info(username:str):
    conn = psycopg2.connect( host=DB_HOST, dbname=DB_NAME, user=DB_USER, password=DB_PASSWORD, port=DB_PORT)

    cur = conn.cursor()

    cur.execute(
        """SELECT * FROM "User" WHERE username = %s;""",
        (username,)
    )

    user = cur.fetchone()
    if not user:
        return {
            "msg" : f"User '{username}' does not exist",
            "user_id": -1,
        }

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

def create_account(username:str, public_key:str, password_hash:list[int], email:str):
    """Creates user in database. Requires public_key generated in client frontend"""
    conn = psycopg2.connect( host=DB_HOST, dbname=DB_NAME, user=DB_USER, password=DB_PASSWORD, port=DB_PORT)

    cur = conn.cursor()

    cur.execute(
        """SELECT * FROM "User" WHERE username = %s;""",
        (username,)
    )

    user = cur.fetchone()

    if not user: # user didn't exist, must be created
        password_hash_bytes = bytes(password_hash)

        cur.execute(
            """INSERT INTO "User" (username, public_key, password_hash, email) VALUES (%s, %s, %s, %s);""",
            (username, public_key, password_hash_bytes, email)
        )
        msg =  f"User '{username}' was created"
    else:
        return {
            "msg": f"User '{username}' already exists",
            "user_id": -1,
            "user_rooms": None,
            "user_admins": None,
        }

    conn.commit()

    user_info = get_user_info(username)

    cur.close()
    conn.close()

    return {
        "msg": msg,
        "user_id": user_info["user_id"],
        "user_rooms": user_info["user_rooms"],
        "user_admins": user_info["user_admins"],
    }

def login(username:str, public_key:str, password:str, app):
    """Logs user in. Requires public_key generated in client frontend"""
    conn = psycopg2.connect( host=DB_HOST, dbname=DB_NAME, user=DB_USER, password=DB_PASSWORD, port=DB_PORT)

    cur = conn.cursor()

    cur.execute(
        """SELECT * FROM "User" WHERE username = %s;""",
        (username,)
    )

    user = cur.fetchone()

    if not user: # user didn't exist
        return {
            "msg": f"User '{username}' doesn't exist",
            "user_id": -1,
            "user_rooms": None,
            "user_admins": None,
        }

    else: # user exists, must be validated and updated
        # validate
        user_db_password_hash = bytes(user[3])

        if bcrypt.checkpw(password.encode('utf-8'), user_db_password_hash):
            # update
            cur.execute(
                """UPDATE "User"
                   SET public_key = (%s)
                   WHERE username = (%s);""",
                (public_key, username)
            )
            msg = f"User '{username}' has logged in"
        else: # password doesn't match
            cur.close()
            conn.close()
            return {
                "msg": f"Incorrect Password for user '{username}'",
                "user_id": -2,
                "user_rooms": None,
                "user_admins": None,
            }

    conn.commit()

    user_info = get_user_info(username)
    user_email = get_user_email(username)
    send_email_code(user_email, user_info['user_id'], app)


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
