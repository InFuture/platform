Error.stackTraceLimit = Infinity;

var api = require("./api/api");
var bodyParser = require("body-parser");
var common = require("./api/common");
var cookieParser = require("cookie-parser");
var csurf = require("csurf");
var express = require("express");
var fs = require("fs");
var minify = require("express-minify");
var path = require("path");
var session = require("express-session");

var app = express();

app.set("views", path.join(__dirname, "views/pages"));
app.set("view engine", "ejs");

var secret = common.token();
try {
	secret = fs.readFileSync(".secret", { encoding: "utf-8" });
} catch (err) {
	fs.writeFileSync(".secret", secret);
}

var cookie_secret = common.token();
try {
	cookie_secret = fs.readFileSync(".cookie_secret", { encoding: "utf-8" });
} catch (err) {
	fs.writeFileSync(".cookie_secret", cookie_secret);
}

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser(cookie_secret));
app.use(session({
	name: "infuture.session",
	resave: false,
	saveUninitialized: true,
	secret: secret,
	cookie: {
		secure: true
	}
}));

app.use(minify());

api.route(app);
app.use(csurf());

app.use("/", express.static("web"));

require("./router")(app);

app.use(function (err, req, res, next) {
	if (err.code !== "EBADCSRFTOKEN") return next(err)
	
	res.status(403)
	res.send("Bad CSRF token.");
})

app.use(function(req, res, next) {
	var err = new Error("Not Found");
	err.status = 404;
	
	var vars = { };
	common.is_logged_in(req, function(logged_in) {
		if (logged_in) {
			api.user_info(req.signedCookies["email"], function(user_info) {
				vars.extend_object({ user_info: user_info, logged_in: logged_in });
				res.render("404", { page: vars.extend_object({ title: "404" }) });
			});
		} else {
			vars.extend_object({ logged_in: logged_in });
			res.render("404", { page: vars.extend_object({ title: "404" }) });
		}
	});
});

module.exports = app;

var port = process.env.PORT || 3000;
app.listen(port, function() {
	console.log("Listening on port " + port + "...");
});