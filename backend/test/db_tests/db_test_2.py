import psycopg2

DESCRIPTION = "Insert values into a table"

# connection for my local postgres database, NOT the one in docker container
conn = psycopg2.connect(
    host="localhost",
    dbname="postgres",
    user="postgres",
    password="1234",
    port=5433)

cur = conn.cursor()

cur.execute("""INSERT INTO teste (id, name) VALUES
    (1, 'um'),
    (2, 'dois'),
    (3, 'tres')
;
""")

conn.commit()

cur.close()
conn.close()

# now check by using SELECT * FROM teste