var bcrypt = require("bcrypt");
var common = require("./common");
var moment = require("moment");
var net = require("net");
var request = require("request");
var validator = require("validator");

var get_user_ip = function(req) {
	return (req.headers["x-forwarded-for"] || "").split(",")[0] || req.connection.remoteAddress;
};

exports.login = function(req, res) {
	var email = req.body.email;
	var password = req.body.password;
	
	if (!(email && email.length > 0 && password && password.length > 0)) {
		return res.send({ success: 0, message: "Please fill out all the fields." });
	}
	
	login_user(req, email, password, function(result) {
		if (result.success == 1 && "sid" in result) {
			res.cookie("sid", result.sid, { signed: true });
			res.cookie("email", unescape(email), { signed: true });
		}
		res.send(result);
	});
};

exports.logout = function(req, res) {
	common.db.collection("tokens").update({
		type: "login",
		sid: req.signedCookies["sid"],
	}, {
		$set: {
			expired: true,
			expireTime: ~~(moment().format("X"))
		}
	}, function() {
		res.clearCookie("sid", { signed: true });
		res.clearCookie("email", { signed: true });
		req.session.destroy();
		res.redirect("/");
	});
};

exports.register = function(req, res) {
	var first_name = req.body.first_name;
	var last_name = req.body.last_name;
	var email = req.body.email;
	var password = req.body.password;
	var gender = req.body.gender;
	
	if (!(first_name && first_name.length && email && email.length > 0 && password && password.length > 0)) {
		return res.send({ success: 0, message: "Please fill out all the fields." });
	}
	
	if (!validator.isEmail(email)) {
		return res.send({ success: 0, message: "That doesn't look like an email to me!" });
	}
	
	common.db.collection("users").find({
		email: email
	}).count(function(err, count) {
		if (err) { return res.send({ success: 0, message: "Internal error (1)." }); }
		if (count != 0) {
			return res.send ({ success: 0, message: "Someone's already registered this email." });
		} else {
			var uid = common.token();
			var salt = bcrypt.genSaltSync(10);
			var phash = bcrypt.hashSync(password, salt);
			var teamname = "Team " + common.token(8);
			var doc = {
				uid: uid,
				first_name: first_name,
				last_name: last_name,
				email: email.toLowerCase(),
				password: phash,
				gender: gender,
				timestamp: ~~(moment().format("X")),
			};
			common.db.collection("users").insert(doc, { w: 1 }, function(err2, doc) {
				if (err2) { return res.send({ success: 0, message: "Internal error (2)." }); }
				exports.send_verification(email, function(mail_success) {
					if (mail_success) {
						login_user(req, email, password, function(result) {
							if (result.success == 1 && "sid" in result) {
								res.cookie("sid", result.sid, { signed: true });
								res.cookie("email", unescape(email), { signed: true });
							}
							var application = {
								uid: uid,
								first_name: first_name,
								last_name: last_name,
								email: email.toLowerCase(),
								gender: gender
							};
							common.db.collection("applications").insert(application, { w: 1 }, function(err3, doc2) {
								if (err3) { return res.send({ success: 0, message: "Internal error (7)." }); }
								return res.send({ success: 1, message: "Registered!" });
							});
						});
					} else {
						return res.send({ success: 0, message: "Failed to send verification email." });
					}
				});
			});
		}
	});
};

exports.verify_email = function(req, res) {
	var code = req.params.code;
	if (!(code && code.length > 0)) {
		return res.send({ success: 0, message: "Code is missing or broken (1)." });
	}
	common.db.collection("users").update({
		verify_code: code
	}, {
		$set: { email_verified: true },
		$unset: { verify_code: "" },
	}, function(err, result) {
		if (err) { console.log(err); return res.send({ success: 0, message: "Internal error (10)." }); }
		res.redirect("/verified");
		// console.log(result["result"]["nModified"]);
		/*if (result["result"]["nModified"] != 1) {
			return res.send({ success: 0, message: "Code is missing or broken (2)." });
		} else {
			res.redirect("/verified");
		}*/
	});
};

exports.send_verification = function(email, callback) {
	common.db.collection("users").find({
		email: email
	}).toArray(function(err, users) {
		if (err) { console.log(err); }
		if (users.length != 1) { return callback(false); }
		var user_info = users[0];
		var verify_code = common.token();
		var url = "http://" + common.DOMAIN + "/api/verify_email/" + verify_code;
		request.post({
				url: "https://api.sendgrid.com/api/mail.send.json",
				headers: {
					Authorization: "Bearer " + process.env.SENDGRID_APIKEY
				},
				form: {
					to: user_info["email"],
					from: common.EMAIL,
					subject: "[ACTION REQUIRED] InFuture - Please verify your email.",
					html: "<h1>Welcome to InFuture</h1> <p>We're super excited to have you on board our new platform. Click the following link to verify your email.</p> <p><a href=\"" + url + "\">" + url + "</a></p> <p>Cheers,<br />The InFuture Team</p>"
				},
			}, function(error, response, body) {
				if (error) console.log("error = " + error);
				var doc = {
					email_verified: false,
					verify_code: verify_code,
				}
				common.db.collection("users").update({
					email: email,
				}, { $set: doc }, function(err2, doc) {
					if (err2) { callback(false); }
					return callback(true);
				});
			}
		);
	});
};

exports.resend_verification = function(req, res) {
	common.is_logged_in(req, function(logged_in) {
		if (logged_in) {
			common.db.collection("users").find({
				email: req.signedCookies["email"]
			}).toArray(function(err, users) {
				if (users.length != 1) { return res.send({ success: 0, message: "You're not logged in." }); }
				var user_info = users[0];
				exports.send_verification(user_info["email"], function(mail_success) {
					if (mail_success) {
						return res.send({ success: 1, message: "Resent!" });
					} else {
						return res.send({ success: 0, message: "Failed." });
					}
				});
			});
		}
	});
};

exports.forgot = function(req, res) {
	var email = req.body.email;
	if (!(email && email.length > 0 && validator.isEmail(email))) {
		return res.send({ success: 0, message: "Invalid email." });
	}
	common.db.collection("forgot_password").update({
		email: email.toLowerCase()
	}, {
		$set: { active: false }
	}, function(err) {
		if (err) { return res.send({ success: 0, message: "Internal error." }); }
		var code = common.token();
		var ticket = {
			email: email.toLowerCase(),
			expires: ~~(moment().add(2, "hours").format("X")),
			code: code,
			active: true
		};
		common.db.collection("forgot_password").insert(ticket, function() {
			var url = "http://" + common.DOMAIN + "/recover#" + code;
			request.post({
				url: "https://api.sendgrid.com/api/mail.send.json",
				headers: {
					Authorization: "Bearer " + process.env.SENDGRID_APIKEY
				},
				form: {
					to: email,
					from: common.EMAIL,
					subject: "Password Recovery Request for InFuture",
					html: "<h1>Forgot Password</h1> <p>Someone requested a password recovery for this email on <b>InFuture</b>. Click the following link to reset your password:</p> <p><a href=\"" + url + "\">" + url + "</a></p> <p>Cheers,<br />The InFuture Team</p>"
				},
				}, function(error, response, body) {
					if (error) { console.log("error = " + error); return res.send({ success: 0, message: "Internal error." }); }
					return res.send({ success: 1, message: "An email with a password recovery code was sent to the email you supplied." });
				}
			);
		});
	});
};

exports.recover = function(req, res) {
	var code = req.body.code;
	var password = req.body.password;
	var password2 = req.body.password2;
	
	if (!(code && code.length > 0
			&& password && password.length > 3
			&& password2 && (password2 == password))) {
		return res.send({ success: 0, message: "Please fill out all the fields, and make sure your passwords match." });
	}
	
	common.db.collection("forgot_password").find({
		code: code
	}).toArray(function(err, doc) {
		if (err) { return res.send({ success: 0, message: "Internal error." }); }
		if (doc.length != 1) { return res.send({ success: 0, message: "Code isn't valid." }); }
		var ticket = doc[0];
		if (!(ticket["active"] == true && ~~(moment().format("X")) < ticket["expires"])) { return res.send({ success: 0, message: "Code isn't valid." }); }
		common.db.collection("users").find({
			email: ticket["email"]
		}).toArray(function(err2, doc2) {
			if (err2) { return res.send({ success: 0, message: "Internal error." }); }
			if (doc2.length != 1) { return res.send({ success: 0, message: "No user found for this code." }); }
			var user = doc2[0];
			var salt = bcrypt.genSaltSync(10);
			var phash = bcrypt.hashSync(password, salt);
			common.db.collection("users").update({
				email: ticket["email"]
			}, {
				$set: { password: phash }
			}, function() {
				common.db.collection("forgot_password").remove({
					email: ticket["email"]
				}, function() {
					return res.send({ success: 1, message: "Successfully updated your password!" });
				});
			});
		});
	});
};

var login_user = function(req, email, password, callback) {
	common.db.collection("users").find({
		email: email
	}).toArray(function(err, users) {
		if (err) { return callback({ success: 0, message: "Internal error (3)." }); }
		if (users.length != 1) {
			return callback({ success: 0, message: "Please check if your email and password are correct." });
		} else {
			var user = users[0];
			var correct = bcrypt.compareSync(password, user["password"]);
			if (correct) {
				var sid = common.token();
				var session_information = {
					type: "login",
					uid: user["uid"],
					sid: sid,
					created: ~~(moment().format("X")),
					expired: false,
					ua: req.headers["user-agent"],
					ip: get_user_ip(req)
				};
				common.db.collection("tokens").insert(session_information, { w: 1 }, function(err2, doc) {
					if (err2) { return callback({ success: 0, message: "Internal error (4)." }); }
					return callback({ success: 1, message: "Successfully logged in.", sid: sid });
				});
			} else {
				return callback({ success: 0, message: "Please check if your email and password are correct." });
			}
		}
	});
};