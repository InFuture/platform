var crypto = require("crypto");
var MongoDB = require("mongodb").Db;
var Server = require("mongodb").Server;
require("dotenv").load();

exports.db = new MongoDB(process.env.MONGO_DB, new Server(process.env.MONGO_HOST, ~~(process.env.MONGO_PORT), { auto_reconnect: true }), {w: 1});

exports.db.open(function(err, db) {
	if (err) {
		console.dir(err);
		process.exit(1);
	}
	console.log("Connected to mongo db");
});

exports.get_user_ip = function(req) {
	return (req.headers["x-forwarded-for"] || "").split(",")[0] || req.connection.remoteAddress;
};

exports.APIError = function(msg) {
	this.message = msg;
	this.name = "APIError";
	const err = Error(msg);
	this.stack = err.stack;
};
exports.APIError.prototype = Object.create(Error.prototype);
exports.APIError.prototype.constructor = exports.APIError;

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