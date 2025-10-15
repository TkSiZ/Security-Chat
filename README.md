# Database Setup and Testing

This guide explains how to start the Postgres database using Docker and test the connection using `psql`.

---

## 1. Start the Database

1. Install Docker Desktop for Windows: [Docker Installation Guide](https://docs.docker.com/desktop/setup/install/windows-install/).  
2. Open a terminal (PowerShell or Command Prompt) and navigate to the root of the project.  
3. Build and start the database container:

```bash
docker compose up --build

````
## 2. Test the server

1. If the postgres isn't downloaded access this link: [Postgres instalation](https://www.postgresql.org/download/windows/](https://www.enterprisedb.com/downloads/postgres-postgresql-downloads )<br> and download version 17.6
   1.1-After download postgres add the psql to the PATH in environment variables
2. Test in terminal
```bash

psql -h localhost -p 5432 -U app_user -d app_db
````
It will ask for a password, it is: 1234. Then you should see this:
```bash
app_db=>
```
