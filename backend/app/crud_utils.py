import os
import psycopg2
from dotenv import load_dotenv

# connection for online postgres database
# tables where already created using backend/db/migrations/01_create_tables.sql
load_dotenv()
DB_HOST = os.getenv('DB_HOST')
DB_USER = os.getenv('DB_USER')
DB_NAME = os.getenv('DB_NAME')
DB_PASSWORD = os.getenv('DB_PASSWORD')
DB_PORT = os.getenv('DB_PORT')

def create_room(
        room_id,
        # room_name,
        user_id,
):
    conn = psycopg2.connect(
        host=DB_HOST,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
        port=DB_PORT)

    cur = conn.cursor()

    room_name = "DEFAULT"
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

def delete_room(room_id):
    conn = psycopg2.connect(
        host=DB_HOST,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
        port=DB_PORT)

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