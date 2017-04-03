(function () {
    "use strict";

    var APITOKEN = "c5213a1102b8422c80378944e1246d10"

    var M = new Mesonet({
        token: APITOKEN,
        service: "TimeSeries"
    });
    var apiArgs = M.windowArgs();

    // Force a set of variables
    var rankedSensors = ["air_temp", "relative_humidity", "wind_speed", "wind_gust", "wind_direction", "weather_condition"]
    apiArgs.vars = rankedSensors.join(",");
    apiArgs.units = "english,speed|mph";
    apiArgs.qc = "all";
    apiArgs.recent = "61";
    apiArgs.timeformat = "%s";
    // // Forced time for presentation purposes
    // apiArgs.start = "201611282245";
    // apiArgs.end = "201611290100";
    // apiArgs.uimode = "default"

    var tableArgs = {
        table_container: "#nettable-container",
        table_id: "nettable",
        table_class: "",
        sensors: rankedSensors
    };
    var headerNames = ["Station ID", "Distance To Fire Perimeter", "Bearing To Fire Perimeter",
        "Time From Observation", "Air Temperature", "Relative Humidity",
        "Wind Speed", "Wind Gust", "Wind Direction", "Weather Condition"
    ];
    var stidStack = [];
    var stidAndDist = [];


    var state = {
        baseUrl: 'http://home.chpc.utah.edu/~u0540701/storage/fire_data/',
        thisJSONFile: "AF_NS_current.json"
    }

    function HTTPFetch(url, callback) {
        var request = new XMLHttpRequest();
        request.open("GET", url)
        request.onreadystatechange = function () {
            if (request.readyState === 4 && request.status === 200) {
                json_total = JSON.parse(request.responseText)
                callback(JSON.parse(request.responseText))
            }
        }
        request.send(null);
    }
    function printResponse(a) {
        var current_json = a
        console.log('URL To Fetch')
        console.log(state.baseUrl + state.thisJSONFile)
        console.log(a)
    }
    function getWindowArgs() {
        var a = {};
        var b = window.location.search.substring(1).split("&");
        var pair;
        var c;
        var l = b.length;

        if (window.location.search.substring(1).split("=") === 1) {
            return "undefined";
        } else {
            for (var i = 0; i < l; i++) {
                // Grab the values and add a key
                pair = b[i].split("=");
                if (typeof a[pair[0]] === "undefined") {
                    a[pair[0]] = decodeURIComponent(pair[1]);
                    // if (pair[1].split(",").length > 1) {
                    //     a[pair[0]] = pair[1].split(",");
                    // }
                }
            }
            return a;
        }
    }

    var windowURL = getWindowArgs();
    var fireID = windowURL.fire;

    HTTPFetch(state.baseUrl + state.thisJSONFile, printResponse)

    var key;
    for (key in current_json.fireID.nearest_stations) {
        stidStack.push(current_json.fireID.nearest_stations[key]["STID"]);
        stidAndDist.push(ccurrent_json.fireID.nearest_stations[key]["DFP"]);
    };

    var stidList = stidStack.join(",");
    apiArgs.stid = stidList;
    M.fetch({
        api_args: apiArgs
    });
    var filter = M.windowArgs()[""] !== "undefined" && typeof M.windowArgs().select !== "undefined" ? JSON.parse(M.windowArgs().select) : {};
    // console.log(filter)
    M.printResponse();
    $.when(M.async()).done(function () {
        //timestamp and map function
        M.response.sensor.units[0].bfp = "Degrees"
        M.response.sensor.units[0].dfp = "Statute miles"
        M.response.sensor.units[0].date_time = "Minutes"
        M.response.sensor.units[0].wind_direction = "code"
        M.response.sensor.units[0].weather_condition = "code"
        M.response.ui.toc["bfp"] = 4
        M.response.ui.toc["dfp"] = 5
        M.response.ui.toc["stid"] = 6
        M.response.ui.toc["weather_condition"] = 7
        M.response.ui.toc["time"] = 8
        M.response.ui.sensors[4] = {
            "apiname": "bfp",
            "default": "true",
            "group": 99,
            "longname": "Bearing From Perimeter",
            "pos": 99,
            "shortname": "BFP",
            "vid": 99
        }
        M.response.ui.sensors[5] = {
            "apiname": "dfp",
            "default": "true",
            "group": 99,
            "longname": "Distance From Perimeter",
            "pos": 99,
            "shortname": "DFP",
            "vid": 99
        }
        M.response.ui.sensors[6] = {
            "apiname": "stid",
            "default": "true",
            "group": 99,
            "longname": "Station ID",
            "pos": 99,
            "shortname": "STID",
            "vid": 99
        }
        M.response.ui.sensors[7] = {
            "apiname": "weather_condition",
            "default": "true",
            "group": 99,
            "longname": "Weather Condition",
            "pos": 99,
            "shortname": "WC",
            "vid": 99
        }
        M.response.ui.sensors[8] = {
            "apiname": "time",
            "default": "true",
            "group": 99,
            "longname": "Time From Observation",
            "pos": 99,
            "shortname": "TFO",
            "vid": 99
        }
        _networkTableEmitter(M, tableArgs);
        _highlightCells(filter);
        _highlightQC(M.response);
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
        var U = new Units();

        var rankedSensors = args.sensors;
        // var baseURL = ["http://mesowest.utah.edu/cgi-bin/droman/meso_base_dyn.cgi?stn="];
        var new_baseURL = ["https://synopticlabs.org/demos/qc/tabtable.html?override_units=1&units=english,speed|mph&recent=1440&stid="];
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

            var last = _s[i].OBSERVATIONS.date_time.length - 1;
            var tmp = {};
            tmp.stid = _s[i].STID;
            rankedSensors.map(function (d) {
                    // Best to use terinary logic here, but for simplicity...
                    if (d === "dfp") {
                        tmp[d] = [stidAndDist[i][0]];
                    } else if (d === "bfp") {
                        tmp[d] = [stidAndDist[i][1]];
                    } else if (d === "weather_condition") {
                        try {
                            tmp[d] = [_s[i].OBSERVATIONS[d + "_set_1d"][last]] // add to include cardinal direction
                        } catch (e) {
                            tmp[d] = [null];
                        }
                    } else if (typeof _s[i].OBSERVATIONS[d === "date_time" ? d : d + "_set_1"] === "undefined") {
                        tmp[d] = [null];
                    } else if (_s[i]["QC_FLAGGED"] == true && d !== "date_time") {
                        // console.log(_s[i])
                        var _d = _s[i].OBSERVATIONS[d + "_set_1"][last]
                            // var j = 0;
                        for (var j in _s[i].QC) {
                            // console.log(_s[i].QC);
                            // console.log(d);
                            if (typeof _s[i].QC[d + "_set_1"] !== "undefined") {
                                // var _qcFlag = _s[i].QC
                                // console.log(_s[i].QC[d + "_set_1"])
                                tmp[d] = [_d, _s[i].QC[d + "_set_1"][last]]
                            } else {
                                tmp[d] = [_d]
                            }
                        }

                    } else {
                        tmp[d] = [_s[i].OBSERVATIONS[d === "date_time" ? d : d + "_set_1"][last]]
                    }
                })
                // Append to our new `stations` array
            stations.push(tmp);
            tmp = []
                // console.log(stations)
            i++;
        }

        // Create and append table to DOM, but first check to see if we have a table node.
        d3.select("body " + args.table_container).selectAll("table").remove();
        var table = d3.select("body " + args.table_container).append("table")
            .attr("id", args.table_id).classed("table table-condensed", true)
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
            // .html(function (d) {
            //     if (d !== "date_time") {
            //         var _v = d.split("_set_");
            //     } else {
            //         var _v = d
            //     }
            //     // Number of similar sensors
            //     var _n = 1;
            //     _n = _n === 1 ? "" : " #" + _n;
            //     // Is variable derived? Look for `d`.
            //     var _w = typeof _v[1] !== "undefined" && _v[1].split("d").length > 1 ?
            //         "<sup>&#8226;</sup>" : "";
            //     d3.select(this).classed("derived-variable", function () {
            //         return _w === "<sup>&#8226;</sup>" ? true : false;
            //     });
            //     // Updated for the UI helper
            //     console.log(d)
            //     return d === "date_time" ? "Time" : _r.ui.sensors[_r.ui.toc[_v[0]]].shortname + _w + _n;
            // })
            // .on("mouseover", function (d) {
            //     if (d !== "date_time") {
            //         $(this).tooltip({
            //             "title": _fmtSensor(_r.ui.sensors[_r.ui.toc[d.split("_set_")[0]]].longname) +
            //                 (typeof _s.SENSOR_VARIABLES[d.split("_set_")[0]][d].position === "undefined" ||
            //                     _s.SENSOR_VARIABLES[d.split("_set_")[0]][d].position === null ?
            //                     "" :
            //                     "<br/>Height: " + _s.SENSOR_VARIABLES[d.split("_set_")[0]][d].position + "m"),
            //             "placement": "top",
            //             "html": true,
            //             "container": "body"
            //         }).tooltip("show");
            //     }
            // })
            .classed("table-header", true)
            .property("sorted", false)
            .on('click', function (d) {
                var _thisId = d3.select(this).attr("id");
                var _this = this;
                var _state = d3.select(this).property("sorted");
                d3.select(_this).property("sorted", function (d) {
                    return _state ? false : true;
                });
                if (_thisId === "stid") {
                    rows.sort(function (a, b) {
                        return _state ? b.stid.localeCompare(a.stid) : a.stid.localeCompare(b.stid);
                    });
                } else {
                    rows.sort(function (a, b) {
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
                        if (d === "weather_condition" || d === "wind_cardinal_direction") {
                            return null
                        } else {
                            return _state ? true : false;
                        }
                    })
                    .classed("fa-chevron-circle-down", function () {
                        if (d === "weather_condition" || d === "wind_cardinal_direction") {
                            return null
                        } else {
                            return !_state ? true : false;
                        }
                    });
            })
            .append("i").attr("class", function (d) {
                if (d === "weather_condition" || d === "wind_cardinal_direction") {
                    return null
                } else {
                    return "sort-icon fa"
                }
            })
            .classed("fa-chevron-circle-down", function (d) {
                return d === "dfp" ? true : false;
            })

        // Add the units to the table. We add this as a `TD` in the `THEAD` node.  If you change 
        // this to `TH` you will need to update the filtering of `TH` elements in the update 
        // table width routine.
        table.select("thead").append("tr")
            .selectAll("th").data(["stid"].concat(rankedSensors)).enter().append("td")
            .classed("tabtable-units", true)
            .html(function (d) {
                var _n = 1;
                return d === "stid" ? null :
                    typeof U.get(_r.sensor.units[0][d.split("_set_")[0]]).html === "undefined" ?
                    _r.sensor.units[0][d.split("_set_")[0]] :
                    U.get(_r.sensor.units[0][d.split("_set_")[0]]).html;
            })

        // Create the rows
        var rows = table.append("tbody").attr("class", "scrollable")
            .selectAll("tr").data(stations).enter().append("tr");
        // Create and populate the cells
        var cells = rows.selectAll('td')
            .data(function (row) {

                return ["stid"].concat(rankedSensors).map(function (d) {
                    if (d !== "wind_direction") {
                        return {
                            name: d,
                            value: row[d] === null ? "" : row[d],
                        };
                    } else if (d === "wind_direction") {
                        return {
                            name: d,
                            value: row[d] === null ? "" : row[d],
                            text: _fmtWindDirection(row[d][0])
                        }
                    }
                });
            })
            .enter().append("td")
            .text(function (d) {
                var _v = (d.name).split("_set_");
                _v = typeof d.value === "undefined" ? "" : typeof d.value === "object" ?
                    d.value[0] : d.value;
                _v = typeof _v === "boolean" ? "" : _v;
                var _p = typeof _r.sensor.units[0][d.name.split("_set_")[0]] === "undefined" ?
                    2 : U.get(_r.sensor.units[0][d.name.split("_set_")[0]]).precision;
                return d.name === "date_time" ?
                    d.value : d.name === "wind_direction" ? d.text : typeof _v === "number" ? Number(_v).toFixed(_p) : _v;
                // return d.value;
            })
            .attr("class", function (d) {
                return (d.name)
            })
            .on("mouseover", function (d) {
                // Call Bootstrap tooltip, this is one of the few jQuery dependencies
                if (d3.select(this).classed("boom") === true || d3.select(this).classed("qcbang") === true) {
                    if (typeof d.value === "object" && !!d.value[1] && d.name !== "date_time") {
                        var s = "<div class=\"qc-tooltip\"><ul class=\"qc-tooltip\">";
                        d.value[1].forEach(function (_d) {
                            s += "<li>" + _r.qc.metadata[_d].NAME + "</li>";
                        });
                        s += "</ul></div>";
                        $(this).tooltip({
                            "title": "Observation has QC Flag: " + s,
                            "placement": "top",
                            "html": true,
                            "container": "body"
                        }).tooltip("show");
                    }
                }
            })

        var hyperlink = d3.selectAll(".stid")
            .on("click", function () {
                // window.open(baseURL + d3.select(this).text());
                window.open(new_baseURL + d3.select(this).text());
            });
        var timeConversion = d3.selectAll(".date_time")
            .text(function (d) {
                // var timeNow = String(Date.now()).slice(0, -3);
                var timeNow = String(Date.parse("Nov 29, 2016 01:05:00 UTC")).slice(0, -3);
                return ((timeNow - d.value) / 60).toFixed(0);
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
        d3.selectAll("td").classed("bang", function () {
            return false
        });
        var key;
        for (key in Object.keys(filter)) {
            var selector = (Object.keys(filter))[key];
            console.log("Variable selected = " + selector);
            // assign min/max values, test for null
            var A = typeof filter[selector].min === "undefined" || filter[selector].min === 0 ? null : filter[
                selector].min;
            var B = typeof filter[selector].max === "undefined" || filter[selector].max === 0 ? null : filter[
                selector].max;
            console.log("Min = " + A);
            console.log("Max = " + B);
            if (typeof selector === "undefined") {
                return false;
            };
            // if (typeof A !== "undefined" || A !== null && typeof B !== "undefined" || B !== null) {
            if (A !== null && B !== null) {
                // range code, given a min and a max
                d3.selectAll('.' + selector).classed("bang", function () {
                    return Number(d3.select(this).text()) > A &&
                        Number(d3.select(this).text()) < B ? true : false;
                });
                // } else if (typeof A !== "undefined" || A !== null && typeof B === "undefined" || B === null) {
            } else if (A !== null && B === null) {
                // greater-than code, min but no max
                d3.selectAll('.' + selector).classed("bang", function () {
                    return Number(d3.select(this).text()) > A ? true : false;
                });
                // } else if (typeof A === "undefined" || A === null && typeof B !== "undefined" || B !== null) {
            } else if (A === null && B !== null) {
                // less-than code, max but no min
                d3.selectAll('.' + selector).classed("bang", function () {
                    return Number(d3.select(this).text()) < B ? true : false;
                });
            } else if (A === null && B === null) {
                continue;
            } else {
                console.log("Bang! Bang! Something went terribly wrong!")
            };
        };

        d3.select("tbody").selectAll("td").classed("boom", function (d) {
            try {
                return d.value.length > 1 && !!d.value[1] && d.name !== "stid" ? true : false;
            } catch (e) {
                console.log(d.value)
            }
        })
        d3.selectAll("td").classed("qcbang", function (d) {
            if (d3.select(this).classed("boom") === true && d3.select(this).classed("bang") === true) {
                return true
            } else {
                return false
            }
        })
    };


    /**
     * Highlights Cells based on API QC flags
     * @param {object} API response
     */
    function _highlightQC(object) {
        d3.select("tbody").selectAll("td").classed("boom", function (d) {
            return d.value.length > 1 && !!d.value[1] && d.name !== "stid" ? true : false;
        })
        d3.selectAll("td").classed("qcbang", function (d) {
            if (d3.select(this).classed("boom") === true && d3.select(this).classed("bang") === true) {
                return true
            } else {
                return false
            }
        })
    }


    /**
     * Pretty formatter for defaulted Mesonet API sensor names
     * @param a {string} - sensor name
     */
    function _fmtSensor(a) {
        return (typeof a !== "string" || a.split("_").length === 1) ? a :
            a.split("_").map(function (d) {
                return d.charAt(0).toUpperCase() + d.slice(1);
            }).join(" ");
    }

    /**
     * Converts wind direction value from degrees to cardinal direction
     * @param a {number} - wind direction (degrees)
     */
    function _fmtWindDirection(b) {
        if (typeof b !== undefined) {
            var DirTable = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW", "N"];
            var r = Math.round(parseInt(b));
            var _c = DirTable[Math.floor((r + 11.25) / 22.5)];
            return _c
        } else {
            return ""
        }
    }


})();