/*!
 * tabtable.js - Tabular table application for SynopticLabs
 * @author MesoWest/SynopticLabs (2016)
 * @version 0.1.0
 */
(function () {
    "use strict";

    // Start off by hiding app while we load the canons
    d3.selectAll(".app-hide-on-load").classed("hide", true);

    var P = new User({ cookie_name: "mesowest", cookie_ttl: 1 });
    var APITOKEN = typeof P.getToken() === null ? P.getToken() : "demotoken";
    var M = new Mesonet({ token: APITOKEN, service: "TimeSeries" });
    var apiArgs = M.windowArgs();

    P.deleteCookie(P.VERSION !== "0.3.1");
    P = new User({ cookie_name: "mesowest", cookie_ttl: 1 });

    // Since we want to force the time format to Epoch/Unix time, we need to do a bit more work at
    // this level.  We should consider setting MesonetJS to default as this.  If so then other code
    // will need to be updated to reflect the upstream changes.
    apiArgs.timeformat = "%s|%z|%Z";
    apiArgs.obtimezone = "local";
    apiArgs.qc = "all";
    apiArgs.uimode = "default";
    apiArgs["24hsummary"] = 1; // Argh!
    apiArgs.sensorvars = 1;
    apiArgs.complete = 1;
    apiArgs.precip = 1;
    apiArgs.pmode = "interval";
    apiArgs.units = P.getUnits();
    apiArgs.dev = 8089;

    M.config.fetch.getVariableMetadata = false;
    M.fetch({ api_args: apiArgs });
    M.printResponse();
    $.when(M.async()).done(function () {

        // For demo only!
        // M.response.station[0].QC.air_temp_set_1 = [];
        // M.response.station[0].QC.air_temp_set_1[5] = [1,2,6,18];

        // Check the API response to make sure we have data and not just an error message.
        if (M.response.summary.RESPONSE_CODE !== 1) {
            d3.select("#tabtable-progress").classed("hide", true);
            d3.select("#tabtable-message").text("Rhut Rho!");
            d3.select("#page-is-loading").append("p").text(M.response.summary.RESPONSE_MESSAGE);
            return;
        }

        var _s = M.response.station[0];

        var tableArgs = {
            table_container: "#tabtable-container",
            table_class: "tabtable",
            time_utc: P._isUTC(),
            descend: true
        };

        // Render table & update text fields
        d3.select(".app-container").classed("hide", true);
        d3.select(".station-info").append("p").classed("lead", true)
            .text(_s.NAME + " (" + _s.STID + ")")
            .append("p").classed("small", true)
            .text(_s.COUNTY + " County, " + _s.STATE + ", " + _s.COUNTRY);

        d3.select(".station-info").append("p").classed("small", true).text(
            "Operated by " + _s.MNET_LONGNAME
        );
        d3.select(".station-info").append("p").classed("small", true).classed("small", true).text(
            _s.LATITUDE + "N, " + _s.LONGITUDE + "E, Elevation " + _s.ELEVATION + "ft."
        );

        d3.selectAll(".app-hide-on-load").classed("hide", false);
        d3.select("#page-is-loading").classed("hide", true);

        _weatherSummaryEmitter(M);
        _tabTableEmitter(M, tableArgs);


        // Set global listeners
        d3.selectAll("#show-preferences, #show-sensor-menu").on("click", function (d) {
            _showSettingsModal(d3.select(this).attr("id"), tableArgs);
        });
    });


    function _weatherSummaryEmitter(M) {

        var U = new Units();

        var containerId = "weather-summary-container";
        var tableId = "weather-summary";

        var _r = M.response;
        var _s = _r.station[0]["24H_SUMMARY"];

        var tableHeaders = ["sensor", "min", "min_time", "max", "max_time"];
        var tableHeadersName = ["", "Minimum", "Maximum"];
        var tableColspan = [1, 2, 2];
        var rankedSensors = _r.ui.build._o;
        var whiteList = [
            "air_temp", "dew_point_temperature", "relative_humidity",
            "wind_speed", "wind_gust", "solar_radiation"
        ];

        var tooltip = d3.select("body")
            .append("div")
            .attr("class", "qc-tooltip")
            .text("");

        // Create and append table to DOM, but first check to see if we have a table node.
        d3.select("#" + containerId).selectAll("table").remove();
        var table = d3.select("#" + containerId).append("table").attr("id", tableId)
            .classed("weather-summary-table", true)
            .classed("table table-condensed table-bordered", true);

        // Make the header, then rows, then cells
        table.append("thead").append("tr").selectAll("th").data(tableHeadersName).enter().append("th")
            .attr("colspan", function (d, i) { return tableColspan[i]; })
            .text(function (d, i) { return tableHeadersName[i]; })
            .classed("text-center", function (d, i) { return tableColspan[i] > 1 ? true : false; });

        var rows = table.append("tbody").selectAll("tr").data(rankedSensors).enter()
            .append("tr")
            .classed("empty-row", function (d) {
                return typeof _s[d] === "undefined" ? true : false;
            })
            .classed("hidden", function (d) {
                // If not on the white list, or we have multiples.  The 3rd set, handles the
                // derived variables problem.
                return whiteList.indexOf(d.split("_set_")[0]) === -1 ||
                    Number(d.split("_set_")[1].split("d")[0]) > 1 ||
                    d.split("_set_")[1].split("d").length > 1 ? true : false;
            });

        var cells = rows.selectAll('td')
            .data(function (row) {
                return tableHeaders.map(function (d) {
                    // A bit of error checking
                    if (typeof _s[row] !== "undefined") {
                        return {
                            name: d,
                            value: d === "sensor" ? row : _s[row][d],
                            type: row.split("_set_")[0]
                        };
                    }
                    return {};
                });
            })
            .enter().append("td")
            .html(function (d) {
                // Escape plan for METAR values
                if (typeof d.value === "boolean" && !d.value) { return; }
                var _t = {};
                switch (d.name) {
                    case "sensor":
                        var _n = Number(d.value.split("_set_")[1].split("d")[0]);
                        _n = _n === 1 ? "" : " #" + _n;
                        return _r.ui.sensors[_r.ui.toc[d.value.split("_set_")[0]]].shortname + _n;
                    case "min_time":
                        _t = M.parseTime(d.value, !P._isUTC());
                        return _t.monthName + " " + _t.day + " " + _t.hour + ":" + _t.min;
                    case "max_time":
                        _t = M.parseTime(d.value, !P._isUTC());
                        return _t.monthName + " " + _t.day + " " + _t.hour + ":" + _t.min;;
                    default:
                        return typeof d.value === "undefined" ?
                            "" :
                            Number(d.value).toFixed(U.get(_r.sensor.units[0][d.type]).precision) +
                            "&nbsp;" + U.get(_r.sensor.units[0][d.type]).html;
                }
            })
            .on("mouseover", function (d) {
                // Call Bootstrap tooltip, this is one of the few jQuery dependencies
                if (d.name === "sensor") {
                    $(this).tooltip({
                        "title": _fmtSensor(
                            _r.ui.sensors[_r.ui.toc[d.value.split("_set_")[0]]].longname
                        ),
                        "placement": "right",
                        "html": true,
                        "container": "body"
                    }).tooltip("show");
                }
            });

        stripeTable(tableId, "hidden");
    }


    /**
     * Enables the "sticky" header for scrolling tabular data
     */
    function _setStickyHeader(tableContainer, tableId) {
        // Reset the view port, if the user hits the refresh button
        // window.onbeforeunload = function () { window.scrollTo(0, 0); }

        // Accounts for the table's border
        var tdOffset = 0.5;

        var thisAnchor = document.getElementById(tableContainer).querySelector("table > thead").querySelectorAll("tr")[0].querySelectorAll("th")[0];
        var anchorTopOffset = thisAnchor.getBoundingClientRect().top;
        var anchorLeftOffset = thisAnchor.getBoundingClientRect().left;

        // Create the header clone
        var _fh = document.getElementById(tableContainer).querySelector("table > thead").cloneNode(true);
        document.getElementById(tableContainer).appendChild(document.createElement("div"))
            .setAttribute("id", "fixed-top-container");
        document.getElementById("fixed-top-container").appendChild(document.createElement("TABLE"))
            .appendChild(_fh).setAttribute("id", "fixed-top");

        // Deliberatly clone the classes.
        if (navigator.platform === "iPad") {
            document.getElementById("fixed-top-container").querySelector("table").classList.add(document.getElementById(tableContainer).querySelector("table").classList.value);
        }
        // else if (navigator.platform === "iPhone") {
        //     var _cl = document.getElementById(tableContainer).querySelector("table").classList.value.split(" ");
        //     _cl.forEach(function (d){
        //         cout(d);
        //         document.getElementById("fixed-top-container").querySelector("table").classList.add(d);
        //         cout(document.getElementById(tableContainer).querySelector("table").classList.value);
        //     });
        // }
        else {
            document.getElementById("fixed-top-container").querySelector("table").classList = document.getElementById(tableContainer).querySelector("table").classList.value;
        }

        document.getElementById("fixed-top").querySelectorAll("tr")[1].parentNode.removeChild(document.getElementById("fixed-top").querySelectorAll("tr")[1]);

        // Since we cloned the table header, all the Id's are duplicates, so lets fix that.
        var list = document.querySelectorAll("#fixed-top > tr")[0].querySelectorAll("th");
        var i = 0;
        var l = list.length;
        while (i < l) {
            list[i].id = list[i].id + "-h";
            i++;
        }

        // Listen for the scroll
        var ticking = false;
        window.addEventListener("scroll", function (e) {
            if (!ticking && thisAnchor.getBoundingClientRect().width > 1) {
                window.requestAnimationFrame(function () {
                    var offsetY = window.scrollY;
                    if (offsetY > anchorTopOffset) {
                        document.getElementById("fixed-top").style.display = "block";
                        document.getElementById("fixed-top").style.left =
                            (anchorLeftOffset + (-1 * window.scrollX) - tdOffset) + "px";
                    }
                    else if (offsetY < anchorTopOffset) {
                        document.getElementById("fixed-top").style.display = "none";
                    }
                    window.scrollX > 0 ? _autoScale(findTheRightWindowSize(30)) : _autoScale("100%");
                    ticking = false;
                });
                _updateTdWidth(tableId, "fixed-top");
            }
            ticking = true;
        });

        function _autoScale(a) {
            // Faster version!
            document.querySelector("body").style.width = a;

            // Reuseable version
            // document.querySelectorAll(".window-auto-scale").forEach(function (d) { 
            //     d.style.width = a; 
            // });
        }

        function _updateTdWidth(srcId, destId) {
            var q = document.getElementById(srcId).getElementsByTagName("th");
            var i = 0;
            var l = q.length;
            var _w = 0;
            while (i < l) {
                _w = Math.ceil(document.getElementById(q[i].id).getBoundingClientRect().width);
                document.getElementById(q[i].id + "-h").style.minWidth = _w + "px";
                document.getElementById(q[i].id).style.minWidth = _w + "px";
                i++;
            }
            return;
        }
    }


    /**
     * Emits the time series table
     * 
     * @param {any} M
     * @param {any} args
     * @returns
     */
    function _tabTableEmitter(M, args) {

        var _r = M.response;
        var _s = _r.station[0];
        var whiteList = P.getSensors();
        var U = new Units();

        // Get the ranked sensors
        var rankedSensorStack = prepend("date_time", _r.ui.build._o);

        // Should put all these styles in a class
        var tooltip = d3.select("body")
            .append("div")
            .attr("class", "qc-tooltip")
            .text("");

        // Let's re-organize the response so it's easier to render as a table.
        var qc_active = typeof _s.QC_FLAGGED !== "undefined" ? _s.QC_FLAGGED : false;
        var obsByTime = [];
        var i = 0;
        var li = _s.OBSERVATIONS.date_time.length;
        var j = 0;
        var lj = rankedSensorStack.length;

        // See commit #98ea8e4 - Fix for QC disconnect 
        var qc_bug_fix_1 = qc_active && typeof _s.QC !== "undefined" ? false : true;

        while (i < li) {
            obsByTime.push({ idx: i });
            while (j < lj) {

                // See commit #22e5ea2 - Added correction for incorrect `SENSOR_VARIABLES` block.
                if (typeof _s.OBSERVATIONS[rankedSensorStack[j]] === "undefined") { j++; continue; }

                // If we have a QC stack associated with this variable then we need to append 
                // it to the response as `[ob, [QC1, QC2, QCn]]`
                if (
                    qc_bug_fix_1 ||
                    (!qc_active || typeof _s.QC[rankedSensorStack[j]] === "undefined")
                ) {
                    obsByTime[i][rankedSensorStack[j]] = _s.OBSERVATIONS[rankedSensorStack[j]][i];
                }
                else {
                    obsByTime[i][rankedSensorStack[j]] =
                        [
                            _s.OBSERVATIONS[rankedSensorStack[j]][i],
                            _s.QC[rankedSensorStack[j]][i] === null ?
                                false : _s.QC[rankedSensorStack[j]][i]
                        ];
                }
                j++;
            }
            j = 0;
            i++;
        }

        // Descending array?
        obsByTime = args.descend ? obsByTime.reverse() : obsByTime;

        // Create and append table to DOM, but first check to see if we have a table node. This is
        // not the best method, but it works for now.
        var firstTime = true;
        d3.select("body " + args.table_container).selectAll("table").remove();
        var table = d3.select("body " + args.table_container).append("table")
            .attr("id", "tabtable")
            .attr("class", args.table_class +
            " table table-condensed table-striped table-hover pull-left table-bordered");

        // Make the header
        table.append("thead").attr("class", "fixed-header").append("tr")
            .selectAll("th").data(rankedSensorStack).enter().append("th")
            .attr("id", function (d) { return d; })
            .classed("tabtable-header pull-left", true)
            .attr("class", function (d) { return d.split("_set_")[0]; }, true)
            .classed("hidden hidden-sensor", function (d) {
                var _s = d.split("_set_")[0];
                return !(
                    P.displaySensor(_s) === null ?
                        _r.ui.sensors[_r.ui.toc[_s]].default : P.displaySensor(_s)
                );
            })
            .classed("first-column", function (d) { return d === "date_time" ? true : false; })
            .html(function (d) {
                var _v = d.split("_set_");

                // Number of similar sensors
                var _n = d !== "date_time" ? Number(d.split("_set_")[1].split("d")[0]) : 1;
                d3.select(this).classed(
                    "multi-sensor multi-" + _v[0] + "-sensor-" + _n,
                    function () { return _n > 1 ? true : false; }
                );
                // _n = _n === 1 ? "" : " (" + _n + ")";
                _n = _n === 1 ? "" : " #" + _n;

                // Is variable derived? Look for `d`.
                var _w = typeof _v[1] !== "undefined" && _v[1].split("d").length > 1 ?
                    "<sup>&#8226;</sup>" : "";

                d3.select(this).classed("derived-variable", function () {
                    return _w === "<sup>&#8226;</sup>" ? true : false;
                });

                // Updated for the UI helper
                return d === "date_time" ? "Time" : _r.ui.sensors[_r.ui.toc[_v[0]]].shortname + _w + _n;
            })

            .on("mouseover", function (d) {
                if (d !== "date_time") {
                    $(this).tooltip({
                        "title": _fmtSensor(_r.ui.sensors[_r.ui.toc[d.split("_set_")[0]]].longname) +
                        (typeof _s.SENSOR_VARIABLES[d.split("_set_")[0]][d].position === "undefined"
                            || _s.SENSOR_VARIABLES[d.split("_set_")[0]][d].position === null
                            ? ""
                            : "<br/>Height: " + _s.SENSOR_VARIABLES[d.split("_set_")[0]][d].position + "m"),
                        "placement": "top",
                        "html": true,
                        "container": "body"
                    }).tooltip("show");
                }
            })

            .property("sorted", false)
            .on("click", function (d) {
                var _thisId = d3.select(this).attr("id");
                var _this = this;
                var _state = d3.select(this).property("sorted");
                d3.select(_this).property("sorted", function (d) { return _state ? false : true; });

                if (_thisId !== "date_time") {
                    rows.sort(function (a, b) {
                        // Typeguarding for null values.  See commit #90eb9ea                  
                        var _a = a[d] === null ? -9999 : typeof a[d] === "object" ? a[d][0] : a[d];
                        var _b = b[d] === null ? -9999 : typeof b[d] === "object" ? b[d][0] : b[d];
                        return _state ? _a - _b : _b - _a;
                    });
                }
                else {
                    args.descend = args.descend ? false : true;
                    _tabTableEmitter(M, args);
                    _state = args.descend ? false : true;
                }

                // Remove (hide) all the filter icons
                d3.selectAll(".fixed-header").selectAll("i").each(function () {
                    d3.select(this).classed("fa-chevron-circle-up", false);
                    d3.select(this).classed("fa-chevron-circle-down", false);
                });

                d3.select("#" + _thisId).select("i")
                    .classed("fa-chevron-circle-up", function () { return _state ? true : false; })
                    .classed("fa-chevron-circle-down", function () { return !_state ? true : false; });
            })
            .append("i").attr("class", "sort-icon fa")
            .classed("fa-chevron-circle-down", function (d) {
                // Set inital icon state
                return d === "date_time" ? true : false;
            });


        // Add the units to the table. We add this as a `TD` in the `THEAD` node.  If you change 
        // this to `TH` you will need to update the filtering of `TH` elements in the update 
        // table width routine.
        table.select("thead").append("tr")
            .selectAll("th").data(rankedSensorStack).enter().append("td")
            .attr("id", function (d) {
                return d === "date_time" ? "date-time-locale" : "";
            })
            .classed("tabtable-units", true)
            .classed("hidden", function (d) {
                var _s = d.split("_set_")[0];
                return !(
                    P.displaySensor(_s) === null ?
                        _r.ui.sensors[_r.ui.toc[_s]].default : P.displaySensor(_s)
                );
            })
            .html(function (d) {
                var _v = d.split("_set_");

                // Number of similar sensors
                var _n = d !== "date_time" ? Number(d.split("_set_")[1].split("d")[0]) : 1;
                d3.select(this).classed(
                    "multi-sensor multi-" + _v[0] + "-sensor-" + _n,
                    function () { return _n > 1 ? true : false; }
                );

                return d === "date_time" ?
                    null :
                    typeof U.get(_r.sensor.units[0][d.split("_set_")[0]]).html === "undefined" ?
                        _r.sensor.units[0][d.split("_set_")[0]] :
                        U.get(_r.sensor.units[0][d.split("_set_")[0]]).html;
            })
            .on("click", function (d) { _showSettingsModal(d3.select(this).attr("class"), args); });

        // Create the rows
        var rows = table.append("tbody").selectAll("tr").data(obsByTime).enter().append("tr");

        // Create and populate the cells
        var cells = rows.selectAll('td')
            .data(function (row) {
                return rankedSensorStack.map(function (d) {
                    return {
                        name: d,
                        value: row[d] === null ? false : row[d]
                    };
                });
            })
            .enter().append("td")
            .attr("id", function (d) {
                return d.name === "date_time" ? "t" + M._parseTime(d.value) : null;
            })
            .attr("class", function (d) { return d.name; })
            .classed("hidden", function (d) {
                var _s = d.name.split("_set_")[0];
                return !(
                    P.displaySensor(_s) === null ?
                        _r.ui.sensors[_r.ui.toc[_s]].default : P.displaySensor(_s)
                );
            })
            .classed("first-column", function (d) {
                return d.name === "date_time" ? true : false;
            })
            .text(function (d) {
                var _v = (d.name).split("_set_");
                // Number of similar sensors
                var _n = d.name !== "date_time" ? Number(((d.name).split("_set_")[1]).split("d")[0]) : 1;
                d3.select(this).classed(
                    "multi-sensor multi-" + (d.name).split("_set_")[0] + "-sensor-" + _n,
                    function () { return _n > 1 ? true : false; }
                );

                _v = typeof d.value === "undefined" ? "" : typeof d.value === "object" ?
                    d.value[0] : d.value;

                _v = typeof _v === "boolean" ? "" : _v;

                // Unit precision
                var _p = typeof _r.sensor.units[0][d.name.split("_set_")[0]] === "undefined" ?
                    2 : U.get(_r.sensor.units[0][d.name.split("_set_")[0]]).precision;

                return d.name === "date_time" ?
                    __fmtDate(_v, args.time_utc) : typeof _v === "number" ? Number(_v).toFixed(_p) : _v;
            })
            .classed("metar-message", function (d) {
                return d.name.split("_set_")[0] === "metar" ? true : false;
            })
            .classed("bang", function (d) {
                return typeof d.value === "object" && !!d.value[1] ? true : false;
            })
            .on("mouseover", function (d) {
                if (typeof d.value === "object" && !!d.value[1] && d.name !== "date_time") {
                    var s = "<div class=\"qc-tooltip\"><ul class=\"qc-tooltip\">";
                    d.value[1].forEach(function (_d) {
                        s += "<li>" + _r.qc.metadata[_d].NAME + "</li>";
                    });
                    s += "</ul></div>";

                    $(this).tooltip({
                        "title": s,
                        "placement": "top",
                        "html": true,
                        "container": "body"
                    }).tooltip("show");
                }
            })
            .on("click", function (d) {

                // Recend this feature for now.
                if (1 === 1) { return; }

                // Does this element have QC if not, bail out.
                if (!d3.select(this).classed("bang")) { return; }

                // We need to get the time stamp for this observation, so we have to work back up 
                // the DOM tree and get the `ID` we buried with the time stamp.
                var _ti = (d3.select(this.parentNode)._groups[0][0]); // string
                var _t = Number(d3.select(_ti).select(".date_time").attr("id").split("t")[1]); // int

                var M2 = new Mesonet({ token: APITOKEN, service: "QcSegments" });
                M2.fetch({
                    d3_compat: true,
                    api_args: {
                        stid: apiArgs.stid,
                        start: M.epochToApi(_t),
                        end: M.epochToApi(_t + 1),
                        vars: d.name.split("_set_")[0],
                        units: P.getUnits(),
                        timeformat: apiArgs.timeformat,
                        obtimezone: apiArgs.obtimezone
                    }
                });

                $("#qc-inspector").modal('show');
                $.when(M2.async()).done(function () {

                    var _r2 = M2.response.station[0].QC;

                    // Number of similar sensors
                    var _v = d.name.split("_set_");
                    var _n = d.name !== "date_time" ? Number(_v[1].split("d")[0]) : 1;
                    _n = _n === 1 ? "" : " (" + _n + ")";

                    // Is variable derived? Look for `d`.
                    var _w = typeof _v[1] !== "undefined" && _v[1].split("d").length > 1 ? "^" : "";
                    $("#qc-inspector-title").text(_r.sensor.metadata.meta[_v[0]].long_name + _n + _w);

                    d3.select("#qc-inspector-table-container").selectAll("table").remove();
                    var _table = d3.select("#qc-inspector-table-container").append("table")
                        .attr("class", "table table-condensed table-striped qc-inspector-table");

                    var _theaders = ["Start", "Finish", "QC Flag"];
                    var _tstack = ["start", "end", "qc_flag"];

                    _table.append("thead").append("tr")
                        .selectAll("th").data(_theaders).enter().append("th")
                        .text(function (d) { return d; });

                    // Create the rows
                    var _rows = _table.append("tbody").selectAll("tr").data(_r2).enter().append("tr");

                    // Create and populate the cells
                    var _cells = _rows.selectAll("td")
                        .data(function (_row) {
                            return _tstack.map(function (d) {
                                return {
                                    name: d,
                                    value: _row[d] === null ? false : _row[d]
                                };
                            });
                        })
                        .enter().append("td")
                        .text(function (d) {

                            switch (d.name) {
                                case "start":
                                    // @FIXME: for some reason calling the API with the Epoch time 
                                    // format breaks this.
                                    return __fmtDate(d.value, args.time_utc, true);
                                case "end":
                                    return __fmtDate(d.value, args.time_utc, true);
                                case "sensor":
                                    return _r.sensor.metadata.meta[d.value.split("_qc_")[0]].long_name;
                                case "qc_flag":
                                    return _r.qc.metadata[d.value].NAME;
                                default:
                                    console.log("Sorry, we are out of " + d.name + ".");
                            }

                        });
                    $("#qc-inspector-progress").hide();
                });

                var M3 = new Mesonet({ token: APITOKEN, service: "TimeSeries" });
                M3.fetch({
                    d3_compat: true,
                    api_args: {
                        stid: apiArgs.stid,
                        start: apiArgs.start,
                        end: apiArgs.end,
                        vars: d.name.split("_set_")[0],
                        timeformat: "%s",
                        //obtimezone: apiArgs.obtimezone,
                        qc: "all",
                        units: P.getUnits()
                    }
                });

                // Time series plot
                $.when(M3.async()).done(function () {
                    var _r3 = M3.response.station[0];
                    var data = [];
                    var i = 0;
                    var l = _r3.OBSERVATIONS.date_time.length;
                    while (i < l) {
                        data.push({
                            date: M.epochDate(Number(_r3.OBSERVATIONS.date_time[i])),
                            value: _r3.OBSERVATIONS[d.name][i],
                            qc_flag: _r3.QC[d.name][i],
                            units: M3.response.sensor.units[0][d.name.split("_set_")[0]]
                        });
                        i++;
                    }

                    d3.select("#qc-inspector-plot-container").selectAll("svg").remove();
                    var _ps = plotSettings(
                        M3.response.sensor.units[0][d.name.split("_set_")[0]],
                        d.name.split("_set_")[0]
                    );
                    var _psd = {
                        range_min: (d3.min(data, function (d) { return d.value; }) - 15).toFixed(2),
                        range_max: (d3.max(data, function (d) { return d.value; }) + 15).toFixed(2),
                        center: function () { return ((this.range_min + this.range_max) / 2); },
                        text: "Unknown!",
                    };
                    _ps = !_ps ? _psd : _ps;

                    var modalWidth = $("#qc-inspector .modal-header").width();
                    var margin = { top: 10, right: 10, bottom: 35, left: 30 };
                    var width = modalWidth - 10 - margin.left - margin.right;
                    var height = 300 - margin.top - margin.bottom;

                    var x = d3.scaleTime().range([0, width]);
                    var y = d3.scaleLinear().range([height, 0]);

                    var xAxis = d3.axisBottom().scale(x).ticks(3);
                    var yAxis = d3.axisLeft().scale(y).ticks(10);

                    var dataLine = d3.line()
                        .x(function (d) { return x(d.date); })
                        .y(function (d) { return y(d.value); });

                    var centerLine = _ps.center !== null ? d3.line()
                        .x(function (d) { return x(d.date); })
                        .y(function (d) { return y(_ps.center); }) : false;

                    var svg = d3.select("#qc-inspector-plot-container").append("svg")
                        .attr("width", width + margin.left + margin.right)
                        .attr("height", height + margin.top + margin.bottom)
                        .append("g")
                        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

                    x.domain(d3.extent(data, function (d) { return d.date; }));
                    y.domain([_ps.range_min, _ps.range_max]);

                    svg.append("g").attr("class", "x axis")
                        .attr("transform", "translate(0," + height + ")").call(xAxis);

                    svg.append("g").attr("class", "y axis").call(yAxis).append("text")
                        .attr("transform", "rotate(-90)").attr("y", 6).attr("dy", ".71em")
                        .style("text-anchor", "end").text(_ps.text);

                    svg.append("path").datum(data).attr("class", "data-line").attr("d", dataLine);

                    if (centerLine) {
                        svg.append("path").datum(data).attr("class", "center-line")
                            .attr("d", centerLine);
                    }

                    svg.selectAll("circle").data([_t, d.value[0]]).enter().append("circle")
                        .attr("cx", x(M.epochDate(_t))).attr("cy", y(d.value[0]))
                        .attr("r", "8px").attr("fill", "red");

                });
                return;
            });

        // Do we want the "best case" selection
        d3.selectAll(".multi-sensor").classed("hide", P.isSensorBestChoice());
        _updateHiddenSensorCount();

        // If the users has unselected all the sensors, then hide the table.  We have to 
        // let the table render, else the data binding in the DOM, goes away and we don't 
        // have a page anymore. After all that, then set the sticky headers.

        table.classed("hidden", function (d) { return whiteList.length < 2 ? true : false; });
        _setStickyHeader("tabtable-container", "tabtable");

        return;


        /* --- Supporting functions --- */

        /** Updates the number of sensors that are not shown */
        function _updateHiddenSensorCount() {

            var _h = d3.selectAll(".hidden-sensor");
            var _hc = _h._groups[0].length;

            if (_hc > 0) {
                d3.select("#hidden-sensor-count").classed("hidden", false);
                d3.select("#hidden-sensor-count").text(_hc);
            }
            else {
                d3.select("#hidden-sensor-count").classed("hidden", true);
            }
        }


        /**
         * Formats the date
         *
         * @param {string | object<Date> | number} - Date in either string, Date or Epoch integer
         * @param {bool} - UTC timezone? Default is true
         * @return {string} - Formatted time
         */
        function __fmtDate(_date, UTC, YEAR) {
            UTC = typeof UTC === "undefined" ? true : UTC;
            var _p = _date.split("|").length > 1 ? _date.split("|") : null;
            var _t = M.parseTime(_date, !UTC);

            // @todo: Really need to move this out!
            d3.select("#date-time-locale")
                .html(function (d) {
                    var _s = [
                        "<span class=\"event-tip\">UTC<br/>Change to " + _p[2] + "</span>",
                        "<span class=\"event-tip\">" + _p[2] + "<br/>Change to UTC</span>"
                    ];

                    return d === "date_time" && UTC ? _s[0] : _s[1];
                })
                .on("click", function (d) {
                    // @note: It's important to know that the `apiArgs` are hoisted from above.
                    d3.selectAll("#tabtable-message, #tabtable-progress").classed("hide", false);
                    d3.selectAll("#tabtable-container").classed("hide", true);

                    args.time_utc = args.time_utc ? false : true;
                    P.setValue("options.time_utc", args.time_utc);

                    M.fetch({ api_args: apiArgs });
                    $.when(M.async()).done(function () {
                        d3.selectAll("#tabtable-container").classed("hide", false);
                        d3.selectAll("#tabtable-message, #tabtable-progress").classed("hide", true);
                        _tabTableEmitter(M, args);
                    });
                });

            return _t.monthName + " " + _t.day + " " + _t.hour + ":" + _t.min;
        }
    }


    /**
     * Pretty formatter for defaulted Mesonet API sensor names
     * @param a {string} - sensor name
     */
    function _fmtSensor(a) {
        return (typeof a !== "string" || a.split("_").length === 1) ? a :
            a.split("_").map(function (d) { return d.charAt(0).toUpperCase() + d.slice(1); }).join(" ");
    }


    /**
     * Stripes HTML table.
     * Used when you are show/hiding rows dynamically.  If your table is static, recommend using
     * CSS stylings.
     *
     * @param tableId {string} - Id of table to apply styling to.
     * @param hideClass {string} - CSS class of hidden rows.  These will be skipped.
     */
    function stripeTable(tableId, hideClass, altClass) {
        altClass = typeof altClass === "undefined" ? "alt" : altClass;
        var rows = document.getElementById(tableId).querySelectorAll("table tbody tr");
        var offset = 0;
        var i = 0;
        var l = rows.length;
        while (i < l) {

            // If the row we are looking at is already marked as `hidden` then move on.        
            if (rows[i].className.match(hideClass)) {
                offset++;
                i++;
                continue;
            }

            // We want to apply our CSS to the even rows        
            var _l = rows[i].className.split(" ").length;
            if ((i - offset) % 2 === 0) {
                rows[i].className = rows[i].className + _space(_l) + altClass;
            }
            else {
                rows[i].className = rows[i].className.replace(_space(_l), null);
            }

            i++;
        }

        function _space(_l) {
            return typeof _l === "undefined" ? " " : _l > 1 ? " " : "";
        }

    }


    /**
     * Returns a HH:MM (am/pm) formatted date string for display
     * @param a {number} - Our odd-ball time format.
     */
    function _timeFmt(a) {
        var _t = M.epochDate(M._parseTime(a)).toString().substring(16, 21);
        var _a = Number(_t.substring(0, 2));
        return _a > 12 ? (_a - 12) + _t.substring(2, 5) + " pm" : _a + _t.substring(2, 5) + " am";
    }

    /**
     * Returns the correction for the window sizing
     * @param offset {number} - pixel offset.  Usually for correcting CSS styles.
     * @return {string} - pixel width in "px".
     */
    function findTheRightWindowSize(offset) {
        offset = typeof offset === "undefined" ? 0 : offset;
        var _a = document.getElementById("tabtable").scrollWidth + offset;
        var _b = document.querySelector("body").getBoundingClientRect().width;
        return Math.max(_a, _b) + "px";
    }


    /**
     * Prepends a value to an array. 
     * 
     * @param v {any} - Value to prepend
     * @param a {Array} - Array to prepend to
     * @returns {Array}
     * 
     * See http://stackoverflow.com/a/6195753/4835631
     */
    function prepend(v, a) {
        var _a = a.slice(0);
        _a.unshift(v);
        return _a;
    }


    /**
     * Displays the settings menu
     * 
     * @param {string} tab
     * @param {object} tableArgs
     * @returns {boolean} - True: Good, False: Fail
     */
    function _showSettingsModal(tab, tableArgs) {
        var __this = this;
        var _ui = M.response.ui;

        // A bit of error checking and type guarding...
        var _selected = tab.split(" ")[0];

        _buildSensorSelectors();
        _buildUnitSelectors();

        // Modal behaviors
        var reloadPage = false;
        var reEmitTable = false;

        /** Register button listeners */

        // Unit selector listener.  Listens for any unit selector
        d3.selectAll(".units-selector").on("click", function () {
            reloadPage = true;

            var _p = d3.select(this).attr("id").split("-");
            P.setValue("options.units." + _p[1], _p[2]);
        });

        // Listener: Settings -> Sensors -> Best Choice 
        d3.select("#sensors-best-choice").on("click", function () {
            d3.selectAll(".multi-sensor").classed("hide", function () {
                return d3.select(this).property("checked");
            });
            P.setSensorBestChoice(d3.select(this).property("checked"));
        });

        // Set the default state of the unit convention
        // Listens for the `units-conv` class
        d3.selectAll(".units-conv").on("click", function () {
            reloadPage = true;

            var isMetric = d3.select(this).property("value") === "0" ? true : false;

            // Update cookie and API arguments
            P._isMetric(isMetric);
            apiArgs.units = P.getUnits();

            // Now some UI stuff
            var _state = isMetric ? 0 : 1;
            var _u = [
                ["hpa", "m", "c", "mm", "hpa", "mps"],
                ["inhg", "ft", "f", "in", "inhg", "kts"]
            ];

            P.getUnits(-1).map(function (d, i) {
                d3.select("#units-" + d + "-" + _u[_state][i]).property("checked", true);
                P.setValue("options.units." + d, _u[_state][i]);
            });
        });

        // Select default (`whiteList`) sensors
        d3.select("#sensors-default-set").on("click", function () {
            reEmitTable = true;
            d3.select("#settings-sensor-list").selectAll("input").each(function () {
                if (this.value !== "parent") {
                    // cout(this.value);
                    d3.select(this).property("checked", function (d) {
                        P.setSensor(this.value, _ui.sensors[_ui.toc[this.value]].default);
                        return _ui.sensors[_ui.toc[this.value]].default;
                    });
                    _updateParentSelectors();
                }
            });
        });

        // Select all sensors
        d3.select("#sensors-select-all").on("click", function () {
            reEmitTable = true;
            var _b = d3.selectAll("#settings-sensor-list").selectAll("input").property("checked", true);
            for (var el in _b._groups[0]) {
                if (_b._groups[0][el].value !== "date_time") { P.addSensor(_b._groups[0][el].value); }
            }
        });

        // Unselect all Sensors
        d3.select("#sensors-unselect-all").on("click", function () {
            reEmitTable = true;
            P.removeAllSensors();
            d3.select("#settings-sensor-list").selectAll("input").each(function () {
                d3.select(this).property("indeterminate", false);
                d3.select(this).property("checked", false);
            });
        });

        // View sensors for just this station
        d3.select("#sensor-list-this-station").on("click", function () {
            d3.selectAll("#settings-sensor-list").selectAll("li").classed("hidden", function (d) {
                return (d3.select("." + d))._groups[0][0] !== null ? false : true;
            });
        });

        // View the global sensor inventory
        d3.select("#sensor-list-full-inventory").on("click", function () {
            d3.selectAll("#settings-sensor-list").selectAll("li").classed("hidden", false);
        });

        // Now show the modal
        $("#settings-editor").on('shown.bs.modal', function () {

            var _tab = "";
            switch (tab.split(" ")[0]) {
                case "show-preferences":
                    _tab = "general";
                    break;
                case "show-sensor-menu":
                    _tab = "sensors";
                    break;
                case "tabtable-units":
                    _tab = "units";
                    break;
                default:
                    _tab = "general";
            }

            $("a[href=\"#prefs-" + _tab + "\"]").tab('show');
        });
        $("#settings-editor").modal("show");

        $("#settings-editor").on('hidden.bs.modal', function () {
            if (reloadPage) {
                location.reload(true);
            }
            else if (reEmitTable) {
                _tabTableEmitter(M, tableArgs);
            }
            else {
                _tabTableEmitter(M, tableArgs);
            }
        });

        return;

        /** Generate the unit configuration */
        function _buildUnitSelectors() {
            P.getUnits(-1).map(function (d) {
                d3.select("#units-" + d + "-" + P.getUnits(d)).property("checked", true);
            });
        }

        /** Generate the avaiable sensor list */
        function _buildSensorSelectors() {

            d3.select("#sensors-best-choice").property("checked", P.isSensorBestChoice());

            var classPrefix = "sensor-group-";
            d3.selectAll("#settings-sensor-list").select("ol").remove();
            var _ul = d3.selectAll("#settings-sensor-list").append("ol");

            var _t = {};
            var i = 0;
            var l = _ui.sensors.length;
            var currentGroup = -1;
            while (i < l) {
                _t = _ui.sensors[i];

                if (_t.group !== currentGroup) {
                    // Determine if we have moved into a new group and if so then set the new name.
                    currentGroup = _t.group;

                    _ul.append("li").classed(classPrefix + currentGroup, true)
                        .append("input").attr("type", "checkbox")
                        .attr("id", classPrefix + currentGroup)
                        .classed("sensor-parent", true)
                        // .property("value", _ui.group_name[currentGroup]);
                        .property("value", "parent");

                    d3.select("#" + classPrefix + currentGroup).each(function (d) {
                        d3.select(this.parentNode).append("label")
                            .attr("for", "#" + classPrefix + currentGroup)
                            .text(_ui.group_name[currentGroup]);
                    });

                    d3.selectAll("." + classPrefix + currentGroup).append("ol");

                }

                // Append the sensor since the group is already set
                d3.selectAll("." + classPrefix + currentGroup).select("ol").append("li")
                    .classed("nested-selector", true).append("input")
                    .attr("type", "checkbox")
                    .property("checked", function () {
                        return P.displaySensor(_t.apiname) === null ?
                            _t.default : P.displaySensor(_t.apiname);
                    })
                    .attr("id", "sensor-selector__" + _t.apiname)
                    .classed("sensor-selector", true)
                    .property("parent", classPrefix + currentGroup)
                    .property("value", _t.apiname)
                    .on("change", function (d) {
                        if (d3.select(this).property("checked")) {
                            P.addSensor(d3.select(this).property("value"));
                        }
                        else {
                            P.removeSensor(d3.select(this).property("value"));
                        }
                    });

                d3.select("#sensor-selector__" + _t.apiname).each(function (d) {
                    d3.select(this.parentNode).append("label")
                        .classed("sensor-selector", true)
                        .attr("for", "#sensor-selector__" + _t.apiname)
                        .text(_fmtSensor(_t.longname));
                });

                i++;
            }

            // Set the inital state of the parent checkboxes.
            _updateParentSelectors();

            // If the parent is selected, select all the children
            d3.selectAll(".sensor-parent").each(function () {
                // Find the parent
                d3.select(this).on("change", function () {
                    var _state = d3.select(this).property("checked");
                    d3.selectAll("." + this.id + " > ol > li > input").each(function (d) {
                        P.setSensor(this.value, _state);
                        d3.select(this).property("checked", _state);
                    });
                });
            });

            // **ParentCheckbox**, If the child is selected, then determine the parent's checked state
            d3.selectAll(".sensor-selector").each(function () {
                // Find the parent
                d3.select(this).on("change", function () {
                    // Now that we have the parent, see if any or all of the children are selected
                    d3.select("#" + d3.select(this).property("parent")).property("checked", function () {
                        // At this point we are at the parent level.
                        var n = 0;
                        var n0 = 0;
                        d3.selectAll("." + this.id).each(function () {
                            return d3.select(this).selectAll(".nested-selector > input").each(function () {
                                n += d3.select(this).property("checked") ? 1 : 0;
                                n0++;

                                // console.log(this.value + ", " + d3.select(this).property("checked"));
                                P.setSensor(this.value, d3.select(this).property("checked"));

                                // This is the value of the children elements
                                return d3.select(this).property("checked");
                            });
                        });

                        // For debugging...
                        // console.log(n0 + " --> " + n);
                        // console.log(n === 0 ? "No" : n < n0 ? "Indi" : "Yes");

                        var _f = function (id, b) {
                            d3.select("#" + id).property("indeterminate", false);
                            d3.select("#" + id).property("checked", b);
                        };
                        var _f2 = function (id) { d3.select("#" + id).property("indeterminate", true); };
                        n === 0 ? _f(this.id, false) : n < n0 ? _f2(this.id) : _f(this.id, true);
                    });
                });
            });
        }

        /**
         * Set the inital state of the parent checkboxes.  See the **ParentCheckbox**, for
         * notes about the process.
         */
        function _updateParentSelectors() {
            d3.selectAll(".sensor-selector").each(function () {
                d3.select("#" + d3.select(this).property("parent")).property("checked", function () {
                    var n = 0;
                    var n0 = 0;
                    d3.selectAll("." + this.id).each(function () {
                        return d3.select(this).selectAll(".nested-selector > input").each(function () {
                            n += d3.select(this).property("checked") ? 1 : 0;
                            n0++;
                            return d3.select(this).property("checked");
                        });
                    });
                    var _f = function (id, b) {
                        d3.select("#" + id).property("indeterminate", false);
                        d3.select("#" + id).property("checked", b);
                    };
                    var _f2 = function (id) { d3.select("#" + id).property("indeterminate", true); };
                    n === 0 ? _f(this.id, false) : n < n0 ? _f2(this.id) : _f(this.id, true);
                });
            });
        }
    }
})();


/**
 * Converts epoch date to API date.
 */
Mesonet.prototype.epochToApi = function (epoch) {
    var _s = typeof epoch === "number" ?
        this.epochDate(epoch).toJSON() : Number(this.epochDate(epoch)).toJSON();

    return (_s.split(".")[0]).replace(/[:T-]/g, "").slice(0, 12);
};


// Little helper...
// Remove me before production.
function cout(s) {
    if (typeof s === "undefined") {
        console.log("BANG!");
    }
    else {
        console.log(s);
    }
}


function plotSettings(unit, sensor) {

    // Test and bail
    sensor = typeof sensor === "undefined" ? null : sensor;
    if (typeof unit === "undefined") { return false; }

    // Because some of our units contain characters that are not valid variables names, we have to
    // ensure that they are passed as a string.
    unit = typeof unit === "string" ? unit : unit.toString();

    var lookup = {
        "Celsius": {
            range_min: -50,
            range_max: 50,
            center: 0,
            precision: 1,
            text: "Degrees C",
            exceptions: {
                dew_point_temperature: {
                    center: 8
                }
            }
        },
        "Fahrenheit": {
            range_min: -40,
            range_max: 135,
            center: 32,
            precision: 1,
            text: "Degrees F",
            exceptions: {
                dew_point_temperature: {
                    center: 50
                }
            }
        },
        "Kelvin": {
            range_min: -315,
            range_max: -133,
            center: -125,
            precision: 1,
            text: "Kelvin",
            exceptions: {}
        },
        "Meters/second": {
            range_min: 0,
            range_max: 100,
            center: 20,
            precision: 1,
            text: "Knots",
            exceptions: {}
        },
        "knots": {
            range_min: 0,
            range_max: 100,
            center: 20,
            precision: 1,
            text: "Knots",
            exceptions: {}
        },
        "%": {
            range_min: 0,
            range_max: 110,
            center: 50,
            precision: 0,
            text: "Percent (%)",
            exceptions: {}
        },
        "Pascals": {
            range_min: 8000,
            range_max: 10200,
            center: 10000,
            precision: 0,
            text: "Pascals",
            exceptions: {}
        },
        "Millibars": {
            range_min: 800,
            range_max: 1020,
            center: 1000,
            precision: 0,
            text: "Millibars (mb)",
            exceptions: {}
        },
        "W/m**2": {
            range_min: 0,
            range_max: 1000,
            center: 500,
            precision: 0,
            text: "Watts / Meter^2",
            exceptions: {}
        },
        "Degrees": {
            range_min: 0,
            range_max: 360,
            center: null,
            precision: 0,
            text: "Degrees",
            labels: [
                "N", "NNE", "NE", "E",
                "SE", "SSE", "S",
                "SSW", "SW", "W",
                "NW", "NNW", "N"
            ],
            exceptions: {}
        }
    }

    // Make any exception updates and pass it back 
    var _r = lookup[unit];
    if (typeof _r === "undefined") { return false; }
    if (sensor !== null && typeof lookup[unit].exceptions[sensor] !== "undefined") {
        var key;
        for (key in lookup[unit].exceptions[sensor]) {
            _r[key] = lookup[unit].exceptions[sensor][key];
        }
    }
    delete _r.exceptions;
    return _r;
}


// *** these are used to test new functions for MesonetJS **

/**
 * Returns the UTC Unix time from our odd-ball time format response
 *
 * `dateString` has the timezone format of `%s|%z|%Z` so we
 * need to break apart the values and then get the parts from it.
 *
 * @param {string} dateString
 * @returns {number}
 */
Mesonet.prototype._parseTime = function (dateString, local) {
    /**
     * We expect the response to look like:
     *     `1451580960|-0800|PST`
     * The first segment is the _local unix time_ not the UTC unix time. This
     * is a by product of the Mesonet API.  The following is the UTC offset
     * which we will convert to milliseconds and simple add to the local unix
     * time.
     */
    var _p = dateString.split("|");

    var _h = [3];
    _h[0] = _p[1].slice(0, 1) === "-" ? -1 : 1;
    _h[1] = Number(_p[1].slice(1, 3)) * 3600;
    _h[2] = Number(_p[1].slice(3, 5)) * 60;

    var _date = null;
    if (typeof local === "undefined" || !local) {
        _date = _p === -1 ? null : Number(_p[0]) - _h[0] * (_h[1] + _h[2]);
    }
    else {
        _date = _p === -1 ? null : Number(_p[0]);
    }

    return _date;
};
/**
 * Epoch Date methods
 * @param {date | string | number}
 * @returns {number | date}
 */
Mesonet.prototype.epochDate = function (_date) {

    /**    
     * Logic    
     * if UTC    
     *     if _date is Date object
     *     if _date is a string
     *     if _date is a Unix time
     * Not UTC
     *     if _date is Date object
     *     if _date is a string
     *     if _date is a Unix time
     */


    if (Object.prototype.toString.call(_date) === "[object Date]") {
        return Math.round(new Date(_date).getTime() / 1000.0);
    } else if (typeof _date === "number") {
        return new Date(_date * 1000);
    } else {
        return Math.round(new Date(_date).getTime() / 1000.0);
    }

};


Mesonet.prototype.parseTime = function (t, local) {
    // needs to accept either a number (unix time, utc) or an api string

    // Determine the `local` time option    
    local = typeof local === "undefined" || typeof local !== "boolean" ? false : local;

    var _tz = local ? t.split("|")[2] : "UTC";
    var _tzo = local ? t.split("|")[1].slice(0, 3) + ":" + t.split("|")[1].slice(3, 5) : "+00:00";

    // Create a Date object
    _t = new Date(this._parseTime(t, local) * 1000).toISOString();
    _tISO = local ? _t.split("Z")[0] + _tzo : _t;

    var _m = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];

    // 012345678901234567892123
    // 2015-12-31T16:56:00.000Z

    // ISO 8601 format
    // 2016-12-31T14:02:00+00:00

    return {
        iso8601: _tISO,
        year: pad(Number(_tISO.slice(0, 4)), 4),
        month: pad(Number(_tISO.slice(5, 7)), 2),
        monthName: _m[Number(_tISO.slice(5, 7)) - 1],
        day: pad(Number(_tISO.slice(8, 10)), 2),
        hour: pad(Number(_tISO.slice(11, 13)), 2),
        min: pad(Number(_tISO.slice(14, 16)), 2),
        sec: pad(Number(_tISO.slice(17, 19)), 2),
        msec: pad(Number(_tISO.slice(20, 23)), 3),
        tzone: _tz,
        tzo: _tzo
    };

    // http://stackoverflow.com/a/10073788/4835631
    function pad(n, width, c) {
        c = typeof c === "undefined" ? "0" : c;
        n = n.toString();
        return n.length >= width ? n : new Array(width - n.length + 1).join(c) + n;
    }
};