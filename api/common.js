var crypto = require("crypto");
var mongodb = require("mongodb");
require("dotenv").load();

Object.prototype.extend_object = function(obj) {
	for(var key in obj) {
		// overwrite
		this[key] = obj[key];
	}
	return this;
}

exports.DOMAIN = "infuture.io";
exports.EMAIL = "team@infuture.io"

exports.db = new mongodb.Db("infuture", new mongodb.Server("localhost", 27017, { auto_reconnect: true }), { w: 1 });

exports.db.open(function(err, db) {
	if (err) {
		console.dir(err);
	} else {
		console.log("[api/common.js] connected to mongo db");
	}
});

exports.is_logged_in = function(req, callback) {
	if (!("cookies" in req && "sid" in req.signedCookies && "email" in req.signedCookies)) return callback(false);
	var sid = unescape(req.signedCookies["sid"]);
	var email = unescape(req.signedCookies["email"]);
	var ua = req.headers["user-agent"];
	var ip = (req.headers["x-forwarded-for"] || "").split(",")[0] || req.connection.remoteAddress;
	exports.db.collection("tokens").find({
		type: "login",
		sid: sid
	}).toArray(function(err, sessions) {
		if (err) { return callback(false); }
		if (sessions.length != 1) {
			return callback(false);
		} else {
			var session = sessions[0];
			exports.db.collection("users").find({
				uid: session["uid"]
			}).toArray(function(err2, users) {
				if (err2) { return callback(false); }
				if (users.length != 1) {
					return callback(false);
				} else {
					var user = users[0];
					if (unescape(email) != unescape(user["email"])) return callback(false);
					if (session["expired"]) return callback(false);
					if (ua != session["ua"]) return callback(false);
					if (ip != session["ip"]) return callback(false);
					return callback(true);
				}
			});
		}
	});
};

exports.token = function(length) {
	var length = length || 25;
	var chars = "abcdefghijklmnopqrstuvwxyz0123456789";
	var token = "";
	for(var i=0; i<length; i++) {
		var R = Math.floor(Math.random()*chars.length);
		token += chars.substring(R, R+1);
	}
	return token;
};

exports.hash = function(algorithm, string) {
	var shasum = crypto.createHash(algorithm);
	shasum.update(string);
	return shasum.digest("hex");
};