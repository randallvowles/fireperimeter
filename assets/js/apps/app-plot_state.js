var G = {};
(function () {

    // var json_total = {};
    var windowURL = getWindowArgs();
    var selectedState = windowURL.state;
    // var apiURL = "http://api.mesowest.net/v2/stations/metadata?token=demotoken&status=active&state=" +
    // selectedState;
    // console.log(apiURL);

    // jsonFetch(apiURL, function (d) {


    var M = new Mesonet({
        token: "demotoken",
        service: "metadata",
        status: "active"
    })
    var apiArgs = M.windowArgs();
    M.fetch({
        api_args: apiArgs
    })
    M.printResponse()
    $.when(M.async()).done(function () {
        G = M.response;
    })

})