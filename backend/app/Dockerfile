FROM python:3.13


WORKDIR /server


COPY ./requirements.txt /server/requirements.txt


RUN pip install --no-cache-dir --upgrade -r /server/requirements.txt


COPY . /server/app


CMD ["fastapi", "run", "app/main.py", "--port", "80"]