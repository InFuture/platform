var bodyParser = require("body-parser");
var express = require("express");
var views = require("./views");

var app = express();
app.set("view engine", "ejs");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", function(req, res, next) {
	res.render("pages/index");
});

app.all("/register", views.register);

var port = process.env.PORT || 3000;
app.listen(port, function() {
	console.log("InFuture started on port " + port);
});