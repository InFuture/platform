var bcrypt = require("bcrypt");
var assert = require("assert");
var moment = require("moment");
var validator = require("validator");

exports.register = function(req, res) {
	var errors = [];
	console.dir(req.body);

	assert.ok(req.body.first_name && req.body.first_name.length > 0, "Please fill out all the fields.");
	assert.ok(req.body.last_name && req.body.last_name.length > 0, "Please fill out all the fields.");
	assert.ok(req.body.email && req.body.email.length > 0, "Please fill out all the fields.");
	assert.ok(req.body.password && req.body.password.length > 0, "Please fill out all the fields.");
	assert.ok(req.body.password_confirm && req.body.password_confirm.length > 0, "Please fill out all the fields.");
	assert.ok(req.body.gender && req.body.gender.length > 0, "Please fill out all the fields.");

	assert.ok(req.body.password_confirm == req.body.password, "Your passwords don't match.");

	var first_name = req.body.first_name;
	var last_name = req.body.last_name;
	var email = req.body.email.toLowerCase();
	var password = req.body.password;
	var gender = req.body.gender;

	assert.ok(validator.isEmail(email), "That doesn't look like an email to me!");

	common.db.collection("users").find({
		email: email
	}).count(function(err, count) {
		try {
			if (err) {
				console.dir(err);
				assert.ok(false, "Internal error (1).");
			} else {
				assert.ok(count == 0, "This email's already registered!");

				var uid = common.token();
				var salt = bcrypt.genSaltSync(10);
				var phash = bcrypt.hashSync(password, salt);
				var userdoc = {
					uid: uid,
					first_name: first_name,
					last_name: last_name,
					email: email,
					password: phash,
					gender: gender,
					timestamp: ~~(moment().format("X")),
				}

				common.db.collection("users").insert(userdoc, { w: 1 }, function(err2, doc) {
					if (err2) {
						console.dir(err2);
						return res.render("pages/register", { error: "Internal error (2).", form: req.body });
					} else {
						send_verification(email, function(mail_success) {
							if (mail_success) {
								exports.login_user(req, email, password, function(result) {
									if (result.success == 1 && "sid" in result) {
										res.cookie("sid", result.sid, { signed: true });
										res.cookie("email", unescape(email), { signed: true });
										return res.redirect("/account");
									} else {
										return res.render("pages/register", { error: "Internal error (4).", form: req.body });
									}
								});
							} else {
								return res.render("pages/register", { error: "Internal error (3).", form: req.body });
							}
						});
					}
				});
			}	
		} catch (error) {
			console.dir(error.message);
			res.render("pages/register", { error: error.message, form: req.body });
		}
	});
};

var verify_email = function(req, res) {
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
		if (err) { console.log(err); return res.send({ success: 0, message: "Internal error (5)." }); }
		if (result["result"]["nModified"] != 1) {
			return res.send({ success: 0, message: "Code is missing or broken (2)." });
		} else {
			res.redirect("/verified");
		}
	});
};

var send_verification = function(email, callback) {
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
					subject: "[ACTION REQUIRED] pls enjoy tournament - Please verify your email.",
					html: "<p>Click this link to verify your email: <a href='" + url + "'>" + url + "</a></p>";
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
					return callback({ success: 1, message: "Successfully logged in.", sid: sid, username: user["username"] });
				});
			} else {
				return callback({ success: 0, message: "Please check if your email and password are correct." });
			}
		}
	});
};