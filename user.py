from flask import Blueprint, request, render_template
from models import db, Users
from voluptuous import Schema, Length, Required
from schemas import check, verify_to_schema

import json
import utils

blueprint = Blueprint("user", __name__)

@blueprint.route("/register", methods=["GET", "POST"])
def user_register_page():
	if request.method == "POST":
		params = utils.flat_multi(request.form)
		print params
		verify_to_schema(UserSchema, params)

		name = params["name"]
		username = params["username"]
		email = params["email"]
		utype = 1

		user = Users(name, username, email, password, utype)
		with app.app_context():
			db.session.add(user)
			db.session.commit()

		logger.log("registrations", logger.INFO, "%s registered with %s" % (name.encode("utf-8"), email.encode("utf-8")))
		login_user(username, password)

	return render_template("register.html")

__check_username = lambda username: get_user(username_lower=username.lower()).first() is None
__check_email = lambda email: get_user(email=email.lower()).first() is None

UserSchema = Schema({
	Required("email"): check(
		([str, Length(min=4, max=128)], "Your email should be between 4 and 128 characters long."),
		([__check_email], "Someone already registered this email."),
		([utils.__check_email_format], "Please enter a legit email.")
	),
	Required("name"): check(
		([str, Length(min=4, max=128)], "Your name should be between 4 and 128 characters long.")
	),
	Required("password"): check(
		([str, Length(min=4, max=64)], "Your password should be between 4 and 64 characters long."),
		([utils.__check_ascii], "Please only use ASCII characters in your password."),
	),
}, extra=True)