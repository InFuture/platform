var subscribe_form = function(id) {
	$.post(
		"/subscribe",
		{
			"email": $("#sub-form" + id + " > input").val()
		},
		function (data) {
			data = $.parseJSON(data);
			if (data["success"] == 1) {
				// Good
				$('.footer > .containeraction="submit"').append("<p class=\"response good\">" + data["message"] + "</p>");
				console.log("good");
			}

			else {
				// Bad
				$(".footer > .container").append("<p class=\"response bad\">" + data["message"] + "</p>");
				console.log("bad");
			}
		},
		"json"
	);
};