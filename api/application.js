var common = require("./common");

exports.get = function(req, res) {
	common.is_logged_in(req, function(logged_in) {
		if (logged_in) {
			common.db.collection("users").find({
				email: req.signedCookies["email"]
			}).toArray(function(err, doc) {
				if (err || doc.length != 1) {
					return res.send({ success: 0, message: "Internal error (8)." });
				}
				get_current_application_by_uid(doc[0]["uid"], function(application) {
					res.send({ success: 1, application: application });
				});
			});
		} else {
			return res.send({ success: 0, message: "You're not logged in." });
		}
	});
};

exports.save = function(req, res) {
	var application = { };
	var keys = [ "first_name", "last_name", "gender", "location", "school", "email", "question1", "question2", "question3" ];
	for(var i=0; i<keys.length; i++) {
		if (keys[i] in req.body) {
			application[keys[i]] = req.body[keys[i]];
		}
	}
	common.is_logged_in(req, function(logged_in) {
		if (logged_in) {
			common.db.collection("users").find({
				email: req.signedCookies["email"]
			}).toArray(function(err, doc) {
				if (err || doc.length != 1) {
					return res.send({ success: 0, message: "Internal error (9)." });
				}
				save_current_application(doc[0]["uid"], application, function(result) {
					res.send({ success: result ? 1 : 0, message: result ? "Saved!" : "Internal error (11)." });
				});
			});
		} else {
			return res.send({ success: 0, message: "You're not logged in." });
		}
	});
};

exports.submit = function(req, res) {
	common.is_logged_in(req, function(logged_in) {
		if (logged_in) {
			common.db.collection("users").find({
				email: req.signedCookies["email"]
			}).toArray(function(err, doc) {
				if (err || doc.length != 1) {
					return res.send({ success: 0, message: "Internal error (9)." });
				}
				get_current_application_by_uid(doc[0]["uid"], function(application) {
					var result = validate(application);
					if (result === true) {
						common.db.collection("applications").update({
							uid: doc[0]["uid"]
						}, {
							$set: { submitted: true }
						}, function() {
							return res.send({ success: 1, message: "Submitted!" });
						});
					} else {
						var html = "Please fix the following errors: <ul><li>" + result.join("</li><li>") + "</li>";
						return res.send({ success: 0, message: html });
					}
				});
			});
		} else {
			return res.send({ success: 0, message: "You're not logged in." });
		}
	});	
};

exports.get_current_application = function(req, callback) {
	common.db.collection("users").find({
		email: req.signedCookies["email"]
	}).toArray(function(err, doc) {
		if (err || doc.length != 1) {
			return res.send({ success: 0, message: "Internal error (12)." });
		}
		get_current_application_by_uid(doc[0]["uid"], callback);
	});
};

var get_current_application_by_uid = function(uid, callback) {
	common.db.collection("applications").find({
		uid: uid,
	}).toArray(function(err, doc) {
		if (err || doc.length != 1) {
			callback({});
		} else {
			if (doc[0]["submitted"] == true) {
				callback({ submitted: true });
			} else {
				var obj = { };
				var keys = [ "first_name", "last_name", "gender", "location", "school", "email", "question1", "question2", "question3" ];
				for(var i=0; i<keys.length; i++) {
					if (keys[i] in doc[0]) {
						obj[keys[i]] = doc[0][keys[i]];
					}
				}
				if (!("gender" in obj) || (obj["gender"] != "male" && obj["gender"] != "female")) {
					obj["gender"] = "female";
				}
				callback(obj);
			}
		}
	});
};

var save_current_application = function(uid, application, callback) {
	console.log(application);
	common.db.collection("applications").find({
		uid: uid,
		submitted: true
	}).toArray(function(err, doc) {
		if (err || doc.length != 0) {
			callback(false);
		} else {
			common.db.collection("applications").update({
				uid: uid
			}, {
				$set: application
			}, {
				upsert: true
			}, function(err, count) {
				if (err) {
					callback(false);
				} else {
					callback(true);
				}
			});
		}
	})
};

var validate = function(application) {
	var errors = [];
	var keys = [ "first_name", "last_name", "gender", "location", "school", "email", "question1", "question2" ];
	for(var i=0; i<keys.length; i++) {
		if (!(keys[i] in application && application[keys[i]].trim().length > 0)) {
			errors.push("Missing " + keys[i]);
		}
	}
	if (errors.length > 0) return errors;
	if (application["question1"].split(" ").length > 200) errors.push("Please enter 200 words or less for question 1.");
	if (application["question2"].split(" ").length > 200) errors.push("Please enter 200 words or less for question 2.");
	if ("question3" in application && application["question3"].split(" ").length > 200) errors.push("Please enter 200 words or less for question 3.");
	if (errors.length > 0) return errors;
	return true;
};