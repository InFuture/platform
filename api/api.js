var application = require("./application");
var async = require("async");
var common = require("./common");
var request = require("request");
var user = require("./user");

var api = { };

api.route = function(app) {
	app.get("/api/application/get", application.get);
	app.post("/api/application/save", application.save);
	app.post("/api/application/submit", application.submit);
	app.post("/api/user/login", user.login);
	app.get("/logout", user.logout);
	app.post("/api/user/register", user.register);
	app.post("/api/user/resend_verification", user.resend_verification);
	app.post("/api/user/forgot", user.forgot);
	app.post("/api/user/recover", user.recover);
	app.get("/api/verify_email/:code", user.verify_email);
};

api.user_info = function(email, callback) {
	common.db.collection("users").find({
		email: email
	}).toArray(function(err, users) {
		if (err) { return callback({ message: "Internal error (5)." }); }
		if (users.length != 1) {
			return callback({ message: "Internal error (6)." });
		} else {
			var userdoc = users[0];
			var userobj = {
				uid: userdoc["uid"],
				firstname: userdoc["first_name"],
				lastname: userdoc["last_name"],
				email: userdoc["email"],
				email_md5: common.hash("md5", email),
				email_verified: userdoc["email_verified"] || false,
			};
			callback(userobj);
		}
	});
}

module.exports = api;