BASEDIR=$(pwd)

docker stop $(docker ps --filter "ancestor=platform" -q)
docker rm $(docker ps -q -f status=exited)
docker build -t platform $BASEDIR
tmux kill-session -t plaform
docker rm platform
# tmux new-session -s platform -d "docker run -it -p 8000:4000 --name platform platform"
docker run -it -p 8000:4000 --name platform platform
