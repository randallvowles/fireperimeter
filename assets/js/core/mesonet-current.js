/*!
 * MesonetJS - a Mesonet API JavaScript SDK
 * @author MesoWest/SynopticLabs
 * @version 0.7.9
 */
var Mesonet = (function() {

    "use strict";

    /** Constructor */
    function Mesonet(args) {
        // Data containers & configuration objects used in the class
        this.response = {
            station: [],
            summary: {},
            tableOfContents: {},
            sensor: {
                stack: [],
                metadata: {},
                units: {}
            },
            qc: {
                flags: {},
                stack: [],
                active: [],
                metadata: {}
            }
        };

        this.config = {
            fetch: {
                service: "TimeSeries",
                api_token: "not-set",
                getVariableMetadata: true,
                getQcMetadata: true,
                getNetworkMetadata: false
            }
        };


        this.config.fetch.api_token = args.token;
        this.config.fetch.service = args.service;
        this.urlArgs = this._urlArgs();
    }

    var VERSION = "0.7.9";
    var activeRequest = {};

    /** Internal pointer to connect public & private functions */
    var __this = this;

    /**
     * @summary  Gets the query paramters from the Url
     * @returns  urlArgs {object} or "undefined"
     */
    Mesonet.prototype._urlArgs = (function() {
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
    });

    /**
     * Returns the keys of a JSON stack
     * @private
     *
     * @param    JSON/Object    {object}
     * @returns  Object keys    {array}
     */
    Mesonet.prototype._getKeys = function(obj) {
        var keys = [];
        for (var i in obj) {
            keys.push(i);
        }
        return keys;
    };

    /** Returns the URL arguments */
    Mesonet.prototype.windowArgs = function() {
        return this.urlArgs;
    };

    /**
     * Prints mesonet.response (API Results) to console
     */
    Mesonet.prototype.printResponse = function() {
        var __this = this;
        $.when(activeRequest).done(function() {
            console.log("#nxmao - Mesonet API response.");
            console.log(__this.response);
        });
        return 0;
    };

    /**
     * We use this to keep tabs on the async processes
     */
    Mesonet.prototype.async = function() {
        $.when(activeRequest).done();
        return activeRequest;
    };

    /**
     * Set API token for global use in object
     * @param {string} token - API token
     */
    Mesonet.prototype.setApiToken = function(token) {
        this.config.fetch.api_token = token;
        return true;
    };

    /**
     * Sets the API service
     * @method
     * @memberof mesonet
     */
    Mesonet.prototype.setService = function(service) {
        try {
            this.config.fetch.service = service;
        } catch (err) {
            console.log("#a2q48 - Failed to set API service.");
            return false;
        }
        return true;
    };

    /**
     * Sorts array and returns sorted unique values
     * @param {array}
     */
    Mesonet.prototype._sortUnique = function(arr) {
        if (arr.length === 0) return arr;
        arr = arr.sort(function(a, b) {
            return (a * 1) - (b * 1);
        });
        var ret = [arr[0]];
        for (var i = 1; i < arr.length; i++) {
            if (arr[i - 1] !== arr[i]) {
                ret.push(arr[i]);
            }
        }
        return ret;
    };
    /**
     * Epoch Date methods
     * @param {date | string | number}
     * @returns {number | date}
     */
    Mesonet.prototype.epochDate = function(_date) {

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

    /**
     * Convert API time format to Epoch/Unix time.  Whole day only!
     * @param {number | string} apiDate - API time format `YYYYMMDDHHMM`
     * @param {bool} time - Return HH:SS in unix time
     * @returns {number | bool} - unix date, bool if fail
     */
    Mesonet.prototype.apiDateToEpoch = function(apiDate, time) {
        var a = "";

        // Input checking. If fail then bail out.
        if (typeof time === "undefined") {
            time = false;
        }

        if (typeof apiDate === "undefined") {
            return false;
        } else if (typeof apiDate === "number") {
            a = apiDate.toString();
        }

        var _d = new Date(0);

        _d.setUTCFullYear(Number(a.slice(0, 4)));
        _d.setUTCMonth(Number(a.slice(4, 6)) - 1);
        _d.setUTCDate(Number(a.slice(6, 8)));

        if (time) {
            _d.setUTCHours(Number(a.slice(8, 10)));
            _d.setUTCMinutes(Number(a.slice(10, 12)));
            _d.setUTCSeconds(0);
        }

        return this.epochDate(_d);
    };


    /**
     * Converts epoch date to API date.
     */
    Mesonet.prototype.epochToApi = function(epoch) {
        var _s = typeof epoch === "number" ?
            this.epochDate(epoch).toJSON() : Number(this.epochDate(epoch)).toJSON();

        return (_s.split(".")[0]).replace(/[:T-]/g, "").slice(0, 12);
    };


    /**
     * Returns the UTC Unix time from our odd-ball time format response
     *
     * `dateString` has the timezone format of `%s|%z|%Z` so we
     * need to break apart the values and then get the parts from it.
     *
     * @param {string} dateString
     * @returns {number}
     */
    Mesonet.prototype._parseTime = function(dateString) {
        var _p = dateString.split("|");

        var _h = [3];
        _h[0] = _p[1].slice(0, 1) === "-" ? -1 : 1;
        _h[1] = Number(_p[1].slice(1, 3)) * 3600;
        _h[2] = Number(_p[1].slice(3, 5)) * 60;

        var _date = _p === -1 ? null : Number(_p[0]) - _h[0] * (_h[1] + _h[2]);
        return _date;
    };
    /**
     * Does the array contain?
     * @param {any} - What to look for
     * @param {array} - Array to look inside
     * @returns {bool} - Boolean
     */
    Mesonet.prototype._has = (function(item, arr) {
        if (typeof arr === "undefined") {
            return false;
        }
        var i = 0;
        var l = arr.length;
        for (i = 0; i < l; i++) {
            if (arr[i] === item) {
                return true;
            }
        }
        return false;
    });
    /**
     * Manages API calls and data processing
     */
    Mesonet.prototype.fetch = function(args) {

        // Check user arguments.  If needed get default values set by other functions.
        args = typeof args === "undefined" ? {} : args;
        args.diagnostic = typeof args.diagnostic === "undefined" ? false : args.diagnostic;

        // Determine web service
        if (typeof this.config.fetch.service === "undefined" && typeof args.service === "undefined") {
            console.log("#uil4z - No Mesonet web service set.");
            return false;
        } else {
            // Give priority to `args.service`, then default to
            // the global option.  This does NOT modify the global settings.
            args.service = typeof args.service === "undefined" ? this.config.fetch.service : args.service;
        }

        // Determine API parameters
        // NOTE: This will cause problems when moving to node.js.  Should consider
        // adding a "node_env" variable to bypass browser window interactions.
        var key;
        if (typeof args.api_args === "undefined") {
            var obj = this.urlArgs;
            args.api_args = {};
            for (key in obj) {
                args.api_args[key] = obj[key];
            }
        }

        // If no API token set, then bail.  We have to do this after the args
        // block above, because of the testing method.
        if (
            typeof this.config.fetch.api_token === "undefined" &&
            typeof args.api_args.token === "undefined"
        ) {
            console.log("#6sgcf - No Mesonet API token set.");
            return false;
        } else {
            // Give priority to the passed token, then default to
            // the setApiToken location.This does NOT set the global token.
            args.api_args.token = typeof args.api_args.token === "undefined" ?
                this.config.fetch.api_token : args.api_args.token;
        }

        // Initialize the broker engine
        activeRequest = this._apiBrokerAsyncManager(args);
        $.when(activeRequest).done();
        return activeRequest;
    };

    /**
     * API async broker
     * @returns {promise}
     */
    Mesonet.prototype._apiBrokerAsyncManager = function(args) {

        var deferred = $.Deferred();
        var __this = this;

        // If no arguments passed, then bail!
        if (typeof args === "undefined") {
            console.log("#u6jpy - No arguments passed.");
            deferred.resolve();
            return deferred.promise();
        }

        if (args.diagnostic === true) {
            var t0; // Time start
            var t1; // Ajax call complete
            var t2; // Worker complete
        }

        // Process ids
        var p1, p2, p3, p4, p5;

        // Webservice arguments (will be passed)
        var ws = {
            diagnostic: args.diagnostic,
            web_service: args.service,
            api_args: args.api_args
        };

        // !! For dev only
        // Should consider removal before production
        if (this.urlArgs.dev !== undefined) {
            ws.base_url = "http://dev2.mesowest.net:" + this.urlArgs.dev + "/";
            console.log("#uym79 - " + ws.web_service + " -> Dev Port: " + this.urlArgs.dev);
        } else {
            ws.base_url = "https://api.mesowest.net/v2/";
        }

        // What service to use?
        if (args.service === "TimeSeries") {
            ws.web_service_url = "stations/timeseries?callback=?";
        } else if (args.service === "Latest") {
            ws.web_service_url = "stations/latest?callback=?";
        } else if (args.service === "Metadata") {
            ws.web_service_url = "stations/metadata?callback=?";
            this.config.fetch.qcTypes = false;
        } else if (args.service === "QcSegments") {
            ws.web_service_url = "qcsegments?callback=?";
        } else if (args.service === "Statistics") {
            ws.web_service_url = "stations/statistics?callback=?";
        } else {
            // TODO: Add error here!
            return false;
        }
        p1 = __apiBrokerWorker(ws);

        if (args.diagnostic === true) {
            console.log("#8bd2v - Diagnostic: Webservice arguments.");
            console.log(ws);
        }

        // Use QC Types?
        if (this.config.fetch.getQcMetadata) {
            p2 = __apiBrokerWorker({
                web_service: "QcTypes",
                base_url: ws.base_url,
                web_service_url: "qctypes?callback=?",
                api_args: {token: args.api_args.token}
            });
        } else {
            p2 = __dummyLoad();
        }

        // For now we will always get the variable names
        if (this.config.fetch.getVariableMetadata) {
            p3 = __apiBrokerWorker({
                web_service: "Variables",
                base_url: ws.base_url,
                web_service_url: "variables?callback=?",
                api_args: {token: args.api_args.token}
            });
        } else {
            p3 = __dummyLoad();
        }

        // Network names
        if (this.config.fetch.getNetworkMetadata) {
            p4 = __apiBrokerWorker({
                web_service: "Networks",
                base_url: ws.base_url,
                web_service_url: "networks?callback=?",
                api_args: {token: args.api_args.token}
            });
            p5 = __apiBrokerWorker({
                web_service: "NetworkTypes",
                base_url: ws.base_url,
                web_service_url: "networktypes?callback=?",
                api_args: {token: args.api_args.token}
            });
        } else {
            p4 = __dummyLoad();
            p5 = __dummyLoad();
        }

        // Wait for all the async processes to complete
        $.when(p1, p2, p3, p4, p5).done(function() {
            deferred.resolve();
        });
        return deferred.promise();

        /** We just need the promise back */
        function __dummyLoad() {
            var deferred = $.Deferred();
            deferred.resolve();
            return deferred.promise();
        }


        /**
         * Fetches the M-API.
         * @returns {promise} async promise
         */
        function __apiBrokerWorker(args) {

            var deferred = $.Deferred();
            if (args.diagnostic === true) {
                t0 = performance.now();
            }

            // Attempt to access the Mesonet API
            try {
                $.ajax({
                    url: args.base_url + args.web_service_url,
                    type: 'GET',
                    dataType: 'JSON',
                    data: args.api_args,
                    beforeSend: function() {
                        if (args.diagnostic === true) {
                            console.log("#dextb - Mesonet API request started.");
                        }
                    },
                    complete: function(response) {
                        deferred.notify(this.url);

                        if (args.diagnostic === true) {
                            t1 = performance.now();
                            console.log("#mbgyx - apiBrokerEngine.ajaxCall time: " + (t1 - t0) + " ms.");
                            console.log(this.url);
                        }

                        try {
                            response = response.responseJSON;
                        } catch (err) {
                            console.log("#9ds8t - Failed to convert response to JSON.");
                        }

                        // Do we even have a good response from the server?
                        if (args.diagnostic && response.SUMMARY.RESPONSE_CODE !== 1) {
                            console.log("#vu0s5 - Error code issued from Mesonet API.");
                            console.log(response.SUMMARY.RESPONSE_MESSAGE);
                            console.log(this.url);
                        }
                        __haveResponse(args, response);

                        deferred.resolve();
                    },
                    fail: function() {
                        console.log("#5gigu - Fatal Ajax error. ");
                        console.log(this.url);
                        console.log(this.fail);
                        return deferred.promise();
                    }
                });
            } catch (err) {
                console.log("#gl2fx - Failed to connect to Mesonet API.");
                console.log(this.url);
            }
            return deferred.promise();


            /**
             * Process the response and deliver back to the namespace
             */
            function __haveResponse(args, obj) {

                if (args.diagnostic === true) {
                    console.log(" #2yib4 - Response parser arguments: ");
                    console.log(args);
                }

                var _r = __this.response;
                var i = 0;
                var l = 0;
                var j = 0;
                var lj = 0;
                var sortedKeys = [];
                var key = "";

                // Do we even have a good response from the server?
                if (obj.SUMMARY.RESPONSE_CODE !== 1) {
                    console.log("#oggi1 - Error code issued from Mesonet API.");
                    console.log(obj.SUMMARY.RESPONSE_MESSAGE);
                    // console.log(args)
                    _r.summary = obj.SUMMARY;
                    return false;
                }

                /** Handle the data response from a given service */
                if (args.web_service === "QcTypes") {
                    /** Service: QcTypes */
                    l = obj.QCTYPES.length;
                    for (i = 0; i < l; i++) {
                        _r.qc.metadata[Number(obj.QCTYPES[i].ID)] = obj.QCTYPES[i];
                    }
                } else if (args.web_service === "Variables") {
                    /** Service: Variables */

                    // Rank is an array of the sensor names in their order
                    _r.sensor.metadata.rank = [];
                    _r.sensor.metadata.meta = {};
                    _r.sensor.metadata.meta_vid = {};
                    l = obj.VARIABLES.length;
                    for (i = 0; i < l; i++) {
                        _r.sensor.metadata.rank[i] = __this._getKeys(obj.VARIABLES[i])[0];
                        _r.sensor
                            .metadata.meta[__this._getKeys(obj.VARIABLES[i])] =
                            obj.VARIABLES[i][__this._getKeys(obj.VARIABLES[i])];
                        _r.sensor.metadata
                            .meta_vid[obj.VARIABLES[i][__this._getKeys(obj.VARIABLES[i])].vid] =
                            obj.VARIABLES[i][__this._getKeys(obj.VARIABLES[i])];
                    }
                } else if (args.web_service === "Networks") {
                    /** Service: Networks */
                    if (typeof _r.network === "undefined") {
                        _r.network = {};
                    }
                    _r.network.networks = {};
                    l = obj.MNET.length;
                    for (i = 0; i < l; i++) {
                        _r.network.networks[Number(obj.MNET[i].ID)] = obj.MNET[i];
                    }
                } else if (args.web_service === "NetworkTypes") {
                    /** Service: Network Types */

                    if (typeof _r.network === "undefined") {
                        _r.network = {};
                    }
                    _r.network.types = {};
                    l = obj.MNETCAT.length;
                    for (i = 0; i < l; i++) {
                        _r.network.types[Number(obj.MNETCAT[i].ID)] = obj.MNETCAT[i];
                    }
                } else if (args.web_service === "QcSegments") {
                    /** Service: QcSegments */

                    delete _r.sensor.units;
                    delete _r.sensor.stack;
                    delete _r.qc.active;
                    delete _r.qc.flags;
                    delete _r.qc.stack;

                    _r.summary = obj.SUMMARY;
                    _r.qc.local = {};
                    _r.qc.local.source_name = obj.QC_SOURCENAMES;
                    _r.qc.local.api_name = obj.QC_SHORTNAMES;
                    _r.qc.local.flag_name = obj.QC_NAMES;

                    var tmp = [];
                    l = obj.STATION.length;
                    while (i < l) {
                        _r.tableOfContents[obj.STATION[i].STID] = i;
                        _r.station[i] = obj.STATION[i];
                        i++;
                    }

                } else if (args.web_service === "Metadata") {
                    /** Service: Metadata */
                    delete _r.qc;
                    delete _r.sensor.units;

                    l = obj.STATION.length;
                    for (i = 0; i < l; i++) {
                        _r.station[i] = obj.STATION[i];
                        _r.tableOfContents[obj.STATION[i].STID] = i;
                    }
                    _r.summary = obj.SUMMARY;
                } else if (args.web_service === "TimeSeries" || args.web_service === "Latest") {
                    /** Services: TimeSeries, Latest */
                    _r.summary = obj.SUMMARY;
                    _r.qc.active.push(false);
                    l = obj.STATION.length;
                    for (i = 0; i < l; i++) {

                        // Reverse the stack order so they display correctly
                        //
                        // Sometimes we have multiples of sensors in the same stack.
                        // i.e. `air_temp_set_1`, `air_temp_set_2` etc. We want to
                        // sort them by their order.
                        // @TODO: Depending on the service call, the `_set_`
                        //        signature might cause some trouble.

                        // *** We really should depreciate this. Need to know what the downstream
                        //     effects are.
                        _r.sensor.stack[i] = [];
                        for (key in obj.STATION[i].SENSOR_VARIABLES) {
                            sortedKeys = Object.keys(obj.STATION[i].SENSOR_VARIABLES[key]).sort();
                            for (j = 0; j < sortedKeys.length; j++) {
                                _r.sensor.stack[i].push(sortedKeys[j]);
                            }
                        }
                        // ***

                        _r.qc.active[i] = obj.STATION[i].QC_FLAGGED;
                        _r.station[i] = obj.STATION[i];
                        _r.sensor.units[i] = obj.UNITS;
                        _r.tableOfContents[obj.STATION[i].STID] = i;

                        // Get the UI helper if asked for.  This should be an undocumented feature
                        // since the service will not be documented for public use.
                        if (typeof obj.UIMODE !== "undefined") {
                            _r.ui = obj.UIMODE;
                            _r.ui.toc = {};
                            _r.ui.build = {
                                _o: [], // Order {string}
                                _d: [], // Default {boolean}
                                _n: [], // Mesonet API Name {string}
                                _r: [] // Reduced Rank {string}
                            };
                            var _i = 0;
                            var _l = _r.ui.sensors.length;
                            var _ii = 0;
                            var _ll = 0;
                            var _list = [];
                            while (_i < _l) {
                                // Update the table of contents, and create the build stacks.
                                _r.ui.toc[_r.ui.sensors[_i].apiname] = _i;
                                _r.ui.build._r.push(_r.ui.sensors[_i].apiname);
                                if (typeof _r.station[i].SENSOR_VARIABLES[_r.ui.sensors[_i].apiname] !== "undefined") {
                                    _list = Object.keys(_r.station[i].SENSOR_VARIABLES[_r.ui.sensors[_i].apiname]).sort();
                                    _ii = 0;
                                    _ll = _list.length;
                                    while (_ii < _ll) {
                                        if (typeof _r.station[i].OBSERVATIONS[_list[_ii]] !== "undefined") {
                                            _r.ui.build._o.push(_list[_ii]);
                                            _r.ui.build._d.push(!_r.ui.sensors[_i].default || _ii > 0 ? false : true);
                                            _r.ui.build._n.push(_r.ui.sensors[_i].apiname);
                                        }    
                                        _ii++;
                                    }
                                }
                                _i++;
                            }
                        }

                        if (_r.qc.active[i]) {
                            _r.qc.stack[i] = __this._getKeys(obj.STATION[i].QC);
                            _r.qc.flags[i] = obj.STATION[i].QC;
                        }
                    }
                } else if (args.web_service === "Statistics") {
                    /** Services: Statistics */
                    delete _r.qc;
                    delete _r.sensor.metadata;

                    _r.summary = obj.SUMMARY;
                    l = obj.STATION.length;
                    for (i = 0; i < l; i++) {

                        // Reverse the stack order so they display correctly
                        //
                        // Sometimes we have multiples of sensors in the same stack.
                        // i.e. `air_temp_set_1`, `air_temp_set_2` etc. We want to
                        // sort them by their order.
                        // @TODO: Depending on the service call, the `_set_`
                        //        signature might cause some trouble.

                        _r.sensor.stack[i] = [];
                        for (key in obj.STATION[i].SENSOR_VARIABLES) {
                            sortedKeys = Object.keys(obj.STATION[i].SENSOR_VARIABLES[key]).sort();
                            for (j = 0; j < sortedKeys.length; j++) {
                                _r.sensor.stack[i].push(sortedKeys[j]);
                            }
                        }

                        _r.station[i] = obj.STATION[i];
                        _r.sensor.units[i] = obj.UNITS;
                        _r.tableOfContents[obj.STATION[i].STID] = i;
                    }
                } else {
                    console.log("#34wjt - Unsupported Mesonet service.");
                    return false;
                }

                if (args.diagnostic === true) {
                    t2 = performance.now();
                    console.log("#xk6zr - apiBrokerEngine.haveResponse time: " + (t2 - t1) + " ms");
                }

            } // End __haveResponse
        } // End __apiBrokerWorker
    }; // End _apiBroker


    return Mesonet;
}());
