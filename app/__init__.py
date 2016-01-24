from flask import Flask

def create_app(config="app.config"):
	app = Flask("InFuture")
	with app.app_context():
		app.config.from_object(config)
		return app