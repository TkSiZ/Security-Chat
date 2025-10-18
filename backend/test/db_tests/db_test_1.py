import psycopg2

DESCRIPTION = "Test database connection by creating a table"

# connection for my local postgres database, NOT the one in docker container
conn = psycopg2.connect(
    host="localhost",
    dbname="postgres",
    user="postgres",
    password="1234",
    port=5433)

cur = conn.cursor()

cur.execute("""CREATE TABLE IF NOT EXISTS teste (
    id INT PRIMARY KEY,
    name VARCHAR(50)
);
""")

conn.commit()

cur.close()
conn.close()