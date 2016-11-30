(function () {
    "use strict";

    var APITOKEN = "demotoken"

    var M = new Mesonet({
        token: APITOKEN,
        service: "TimeSeries"
    });
    var apiArgs = M.windowArgs();

    // Force a set of variables
    var rankedSensors = ["air_temp", "relative_humidity", "wind_speed", "wind_direction"]
    apiArgs.vars = rankedSensors.join(",");
    apiArgs.units = "english";

    var tableArgs = {
        table_container: "#nettable-container",
        table_id: "nettable",
        table_class: "",
        sensors: rankedSensors
    };
    // d3.json("http://home.chpc.utah.edu/~u0540701/fireserver/sample_fire2.json", function(data){
    var stidStack = [];
    var stidAndDist = [];
    var key;
    for (key in sample_fire.nearest_stations) {
        stidStack.push(sample_fire.nearest_stations[key]["STID"]);
        stidAndDist.push(sample_fire.nearest_stations[key]["DFP"]);

    };

    // console.log(stidAndDist);
    var stidList = stidStack.join(",");
    // console.log(stidList);
    apiArgs.stid = stidList;
    M.fetch({
        api_args: apiArgs
    });
    var filter = JSON.parse(M.windowArgs().select)
    // console.log(filter);
    // console.log(Object.keys(filter).length);

    M.printResponse();
    $.when(M.async()).done(function () {
        _networkTableEmitter(M, tableArgs);
        _highlightCells(filter);
    });


    return

    /**
     * Emits HTML table in terms of stations vs. values.
     * @param {object} M - MesonetJS pointer
     * @param {object} args - Table configuration arguments
     */
    function _networkTableEmitter(M, args) {

        var _r = M.response;
        var _s = _r.station;
        var rankedSensors = args.sensors;

        // Insert the `date_time` value into `rankedSensors`, we do this to make sure 
        // we generate the table correctly.  We also want an array to put our sorted keys
        // back in to.  Once the sensors are ranked, we will create a sorted output that
        // will be ready to generate a table from.
        rankedSensors.splice(0,0, "dfp")
        
        rankedSensors.splice(1,0, "bfp")
        rankedSensors.splice(2,0, "date_time")
        var stations = [];
        var i = 0;
        var l = _s.length;
        while (i < l) {
            // We need to find the last element in the array, since that should be the most
            // current for the text range. Then we populate it with key/value pairs that 
            // contain the most recent value for the time period requested. As we go, we will
            // always be looking for null values and handling them.
            if (typeof _s[i].OBSERVATIONS.date_time === "undefined") {
                i++;
                break;
            }

            var last = _s[i].OBSERVATIONS.date_time.length - 1
            var tmp = {};
            tmp.stid = _s[i].STID;

            rankedSensors.map(function (d) {
                // console.log(d)
                // console.log(stidAndDist[i][0])
                // Best to use terinary logic here, but for simplicity...
                if (d === "bfp" || d === "dfp") {
                    tmp[d] = (stidAndDist[i][0]).toFixed(2);
                    tmp[d] = (stidAndDist[i][1]).toFixed(2);
                    
                } else if (typeof _s[i].OBSERVATIONS[d === "date_time" ? d : d + "_set_1"] === "undefined") {
                    tmp[d] = null;
                

                } else {
                    tmp[d] = _s[i].OBSERVATIONS[d === "date_time" ? d : d + "_set_1"][last]
                }
            })

            // Append to our new `stations` array            
            stations.push(tmp);

            i++;
        }

        console.log("Sorted stations with most recent ob");
        console.log(stations);

        // Create and append table to DOM, but first check to see if we have a table node.
        d3.select("body " + args.table_container).selectAll("table").remove();
        var table = d3.select("body " + args.table_container).append("table")
            .attr("id", args.table_id)

        // Make the header
        table.append("thead").attr("class", "fixed-header").append("tr")
            .selectAll("th").data(["stid"].concat(rankedSensors)).enter().append("th")
            .html(function (d) {
                return d;
            })
            .attr("id", function (d) { return d; })
            .classed("table-header", true)
            .property("sorted", false)
            .on('click', function (d) {

                var _thisId = d3.select(this).attr("id");
                var _this = this;
                var _state = d3.select(this).property("sorted");
                d3.select(_this).property("sorted", function (d) { return _state ? false : true; });

                if (_thisId !== "date_time") {
                    rows.sort(function (a, b) {
                        // Typeguarding for null values.                   
                        var _a = a[d] === null ? -9999 : typeof a[d] === "object" ? a[d][0] : a[d];
                        var _b = b[d] === null ? -9999 : typeof b[d] === "object" ? b[d][0] : b[d];
                        return _state ? _a - _b : _b - _a;
                    });
                } else if (_thisId === "stid"){
                    rows.sort(a, b); 
                };
                
        
                d3.selectAll(".table-header").selectAll("i").classed("fa-chevron-circle-down", false);
                d3.selectAll(".table-header").selectAll("i").classed("fa-chevron-circle-up", false);

                d3.select("#" + _thisId).select("i")
                    .classed("fa-chevron-circle-up", function () { return _state ? true : false; })
                    .classed("fa-chevron-circle-down", function () { return !_state ? true : false; });
            })
            .append("i").attr("class", "sort-icon fa")
            .classed("fa-chevron-circle-down", function (d) {
                return d === "dfp" ? true : false;
            });

        // Create the rows
        var rows = table.append("tbody").attr("class", "scrollable")
            .selectAll("tr").data(stations).enter().append("tr");

        // Create and populate the cells
        var cells = rows.selectAll('td')
            .data(function (row) {
                return ["stid"].concat(rankedSensors).map(function (d) {
                    return {
                        name: d,
                        value: row[d] === null ? "" : row[d]
                    };
                });
            })
            .enter().append("td")
            .text(function (d) {
                return d.value
            })
            .attr("class", function (d) {
                return (d.name)
            })
    }

    /**
     * Highlights Cells based on user-defined parameters
     * @param {object} Selector, Min, Max
     */
    function _highlightCells(object) {
        //     object in the form:
        //     {selector: {"min": A, max": B}}
        var i = 0;
        var li = Object.keys(filter).length
        var key;
        // while (i < li) {
        for (key in Object.keys(filter)) {
            var selector = (Object.keys(filter))[key];
            console.log("Variable selected = " + selector);
            // assign min/max values, test for null
            var A = typeof filter[selector].min === "undefined" ? null : filter[selector].min;
            var B = typeof filter[selector].max === "undefined" ? null : filter[selector].max;
            console.log("Min = " + A)
            console.log("Max = " + B);
            if (typeof selector === "undefined") {
                return false;
            };
            // if (typeof A !== "undefined" || A !== null && typeof B !== "undefined" || B !== null) {
            if (A !== null && B !== null) {
                // range code, given a min and a max
                d3.selectAll("." + selector).classed("bang", function () {
                    return Number(d3.select(this).text()) > A &&
                        Number(d3.select(this).text()) < B ? true : false;
                });
                // } else if (typeof A !== "undefined" || A !== null && typeof B === "undefined" || B === null) {
            } else if (A !== null && B === null) {
                // greater-than code, min but no max
                d3.selectAll("." + selector).classed("bang", function () {
                    return Number(d3.select(this).text()) > A ? true : false;
                });
                // } else if (typeof A === "undefined" || A === null && typeof B !== "undefined" || B !== null) {
            } else if (A === null && B !== null) {
                // less-than code, max but no min
                d3.selectAll("." + selector).classed("bang", function () {
                    return Number(d3.select(this).text()) < B ? true : false;
                });
            } else if (A === null && B === null) {
                // return false;
                continue;
            } else {
                console.log("Bang! Bang! Something went terribly wrong!!!!!")
            };
            // i++;
        };
    };
})();