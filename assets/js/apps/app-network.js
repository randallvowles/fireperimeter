(function () {
    "use strict";

    var APITOKEN = "demotoken"

    var M = new Mesonet({ token: APITOKEN, service: "TimeSeries" });
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
    var key;
    for (key in sample_fire.nearest_stations){
        stidStack.push(sample_fire.nearest_stations[key]["STID"]);
    };

    console.log(stidStack);
    var stidList = stidStack.join(",");
    console.log(stidList);
    apiArgs.stid = stidList;
    M.fetch({ api_args: apiArgs });

    M.printResponse();
    $.when(M.async()).done(function () {
        _networkTableEmitter(M, tableArgs);
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
        rankedSensors.splice(0, 0, "date_time")
        var stations = [];
        var i = 0;
        var l = _s.length
        while (i < l) {
            // We need to find the last element in the array, since that should be the most
            // current for the text range. Then we populate it with key/value pairs that 
            // contain the most recent value for the time period requested. As we go, we will
            // always be looking for null values and handling them.
            if (typeof _s[i].OBSERVATIONS.date_time === "undefined") { i++; break; }
            
            var last = _s[i].OBSERVATIONS.date_time.length - 1
            var tmp = {};
            tmp.stid = _s[i].STID

            rankedSensors.map(function (d) {
                // Best to use terinary logic here, but for simplicity...
                if (typeof _s[i].OBSERVATIONS[d === "date_time" ? d : d + "_set_1"] === "undefined") {
                    tmp[d] = null;
                }
                else {
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
            .text(function (d) { return d.value })
            .attr("class", function(d) {return d.name;})
    }
})();