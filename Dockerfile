FROM ubuntu:14.04
RUN apt-get upgrade && apt-get update
RUN DEBIAN_FRONTEND=noninteractive apt-get install -y python python-pip python-dev libffi-dev

COPY . /platform
WORKDIR /platform

RUN pip install Flask SQLAlchemy bcrypt requests PyMySQL gunicorn

CMD ["gunicorn", "--bind", "0.0.0.0:8000", "-w", "4", "platform:create_app()"]
EXPOSE 8000
