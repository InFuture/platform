from flask import Flask, send_from_directory
import json
import os

import models
import logger
import user

app = Flask("InFuture")

logger.initialize()

app.register_blueprint(user.blueprint)

@app.route("/", defaults={ "path": "index.html" })
@app.route("/<path:path>")
def static_file(path):
	return send_from_directory("website/dist", path)

if __name__ == "__main__":
	app.run(host="0.0.0.0", port=4000, debug=True)