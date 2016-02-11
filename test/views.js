var common = require("./common");
var user = require("./user");

exports.register = function(req, res, next) {
	if (req.method == "GET") {
		res.render("pages/register");
	} else if (req.method == "POST") {
		try {
			user.register(req, res);
		} catch (error) {
			console.dir(error.message);
			res.render("pages/register", { error: error.message, form: req.body });
		}
	}
};