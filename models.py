from flask.ext.sqlalchemy import SQLAlchemy
from passlib.hash import bcrypt_sha256
import datetime

db = SQLAlchemy()

class Users(db.Model):
	uid = db.Column(db.Integer, primary_key=True)
	first_name = db.Column(db.String(128))
	last_name = db.Column(db.String(128))
	email = db.Column(db.String(64))
	username = db.Column(db.String(16), unique=True)
	password = db.Column(db.String(128))
	school = db.Column(db.String(64))
	date = db.Column(db.DateTime, default=datetime.datetime.utcnow)
	admin = db.Column(db.Boolean)

	def __init__(self, first_name, last_name, email, username, password, school):
		self.first_name = first_name
		self.last_name = last_name
		self.email = email.lower()
		self.username = username
		self.password = bcrypt_sha256.encrypt(str(password))
		self.school = school

class Applications(db.Model):
	aid = db.Column(db.Integer, primary_key=True)
	uid = db.Column(db.Integer)