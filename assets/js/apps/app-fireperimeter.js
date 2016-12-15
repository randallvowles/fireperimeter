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
    apiArgs.qc = "all";

    var tableArgs = {
        table_container: "#nettable-container",
        table_id: "nettable",
        table_class: "",
        sensors: rankedSensors
    };
    var headerNames = ["STID", "Distance From Perimeter", "Bearing From Perimeter", "Time From Observation", "Air Temperature", "Relative Humidity", "Wind Speed", "Wind Direction"];
    // d3.json("http://home.chpc.utah.edu/~u0540701/fireserver/sample_fire2.json", function(data){
    var stidStack = [];
    var stidAndDist = [];
    var key;
    for (key in sample_fire.nearest_stations) {
        stidStack.push(sample_fire.nearest_stations[key]["STID"]);
        stidAndDist.push(sample_fire.nearest_stations[key]["DFP"]);

    };

    var stidList = stidStack.join(",");
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
        rankedSensors.splice(0, 0, "dfp")

        rankedSensors.splice(1, 0, "bfp")
        rankedSensors.splice(2, 0, "date_time")

        // Should put all these styles in a class
        var tooltip = d3.select("body")
            .append("div")
            .attr("class", "qc-tooltip")
            .text("");

        // Let's re-organize the response so it's easier to render as a table.
        var qc_active = typeof _s.QC_FLAGGED !== "undefined" ? _s.QC_FLAGGED : false;
        var appendedRSS = ["stid"].concat(rankedSensors);
        var i = 0;
        var l = _s.length;
        var j = 0;
        var lj = appendedRSS.length;
        var qc_bug_fix_1 = qc_active && typeof _s.QC !== "undefined" ? false : true;
        var stations = [];
        while (i < l) {
            // We need to find the last element in the array, since that should be the most
            // current for the text range. Then we populate it with key/value pairs that 
            // contain the most recent value for the time period requested. As we go, we will
            // always be looking for null values and handling them.
            // if (typeof _s[i].OBSERVATIONS.date_time === "undefined") {
            //     i++;
            //     break;
            // }
            // while (j < lj) {

            //     // if (
            //     //         qc_bug_fix_1 ||
            //     //         (!qc_active || typeof _s.QC[appendedRSS[j]] === "undefined")
            //     //     ) {
            //     stations.push(_s[i][appendedRSS[j]]);
            //     //     }
            //     //     else {
            //     //         stations[i][appendedRSS[j]] =
            //     //             [
            //     //                 _s[i][appendedRSS[j]],
            //     //                 _s.QC[appendedRSS[j]][i] === null ?
            //     //                     false : _s.QC[appendedRSS[j]][i]
            //     //             ];
            // // }
            // j++;
            // };

            var last = _s[i].OBSERVATIONS.date_time.length - 1;
            var tmp = {};
            tmp.stid = _s[i].STID;

            rankedSensors.map(function (d) {
                // console.log(d)
                // console.log(stidAndDist[i][0])
                // Best to use terinary logic here, but for simplicity...
                if (d === "dfp") {
                    tmp[d] = (stidAndDist[i][0]).toFixed(2);

                } else if (d === "bfp") {
                    tmp[d] = (stidAndDist[i][1]).toFixed(0);
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

        // console.log("Sorted stations with most recent ob");
        // console.log(stations);

        // Create and append table to DOM, but first check to see if we have a table node.
        d3.select("body " + args.table_container).selectAll("table").remove();
        var table = d3.select("body " + args.table_container).append("table")
            .attr("id", args.table_id)
            // .data(headerNames).enter().append("th")
            // Make the header
        table.append("thead").attr("class", "fixed-header").append("tr")
            .selectAll("th").data(["stid"].concat(rankedSensors)).enter().append("th")
            .html(function (d, i) {
                // console.log(i); 
                return headerNames[i];

            })
            .attr("id", function (d) {
                return d;
            })
            .classed("table-header", true)
            .property("sorted", false)
            .on('click', function (d) {

                var _thisId = d3.select(this).attr("id");
                // console.log(_thisId);
                var _this = this;
                var _state = d3.select(this).property("sorted");
                d3.select(_this).property("sorted", function (d) {
                    return _state ? false : true;
                });

                if (_thisId === "stid") {
                    rows.sort(function (a, b) {
                        return _state ? b.stid.localeCompare(a.stid) : a.stid.localeCompare(b.stid);
                    }); // if (_thisId !== "date_time")
                } else {
                    // console.log("I'm here boss!");

                    rows.sort(function (a, b) {
                        // var newRS = ["stid"].concat(rankedSensors);
                        // var c = newRS[headerNames.indexOf(d)];
                        // console.log(c);
                        // Typeguarding for null values.                   
                        var _a = a[d] === null ? -9999 : typeof a[d] === "object" ? a[d][0] : a[d];
                        var _b = b[d] === null ? -9999 : typeof b[d] === "object" ? b[d][0] : b[d];
                        return _state ? _a - _b : _b - _a;
                    });
                };


                d3.selectAll(".table-header").selectAll("i").classed("fa-chevron-circle-down", false);
                d3.selectAll(".table-header").selectAll("i").classed("fa-chevron-circle-up", false);

                d3.select("#" + _thisId).select("i")
                    .classed("fa-chevron-circle-up", function () {
                        return _state ? true : false;
                    })
                    .classed("fa-chevron-circle-down", function () {
                        return !_state ? true : false;
                    });
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