/*!
 * units.js - Unit configuration settings
 * @author MesoWest/SynopticLabs (2016)
 * @version 1.0.0
 */
var Units = (function () {
    "use strict";

    /** Constructor */
    function Units() {
        return Units;
    }


    /**
     * Returns all avaiable units
     * @returns {object}
     */
    Units.getAll = function () { return unitTable; };


    /**
     * Returns all the details for a given unit class
     * @param {string}, _u - Unit to lookup
     * @param {object}, Unit details 
     */
    Units.get = function (_u) {
        return typeof unitTable[_u] === "undefined" ? unitTable["default"] : unitTable[_u];
    };


    /**
     * Methods to expose unit attributes.
     * @static
     * 
     * These are chainable from the `.get()` method
     */
    Units.get.methods = {

        convention: function () {
            console.log(this);
            return typeof this === "undefined" ? null : unitTable[this].convention;
        },

        precision: function () {
            return typeof this === "undefined" ? 2 : unitTable[this].precision;
        },

        html: function () {
            return typeof this === "undefined" ? "" : unitTable[this].html;
        },

        textLabelLabel: function () {
            return typeof this === "undefined" ? "" : unitTable[this].textLabel;
        }
    };


    // @todo: Add SI base units to the metric values
    var unitTable = {
        "default": {
            convention: null,
            precision: 2,
            html: "",
            textLabel: "",
            unit: ""
        },
        "Celsius": {
            convention: {
                si: false,
                metric: true,
                english: false
            },
            precision: 1,
            html: "&deg;C",
            textLabel: "Degrees C",
            unit: "C"
        },
        "Fahrenheit": {
            convention: {
                si: false,
                metric: false,
                english: true
            },
            precision: 1,
            html: "&deg;F",
            textLabel: "Degrees F",
            unit: "F"
        },
        "Kelvin": {
            convention: {
                si: true,
                metric: true,
                english: false
            },
            precision: 1,
            html: "K",
            textLabel: "Kelvin",
            unit: "K"
        },
        "Meters/second": {
            // @todo: Should be depricated when the API is fixed
            convention: {
                si: true,
                metric: true,
                english: false
            },
            precision: 1,
            html: "m&#8226;s<sup>-1</sup>",
            unit: "m/s",
            textLabel: "Meters/Second"
        },
        "m/s": {
            convention: {
                si: true,
                metric: true,
                english: false
            },
            precision: 1,
            html: "m&#8226;s<sup>-1</sup>",
            unit: "m/s",
            textLabel: "Meters/Second",
        },
        "Kilometers/hour": {
            convention: {
                si: false,
                metric: true,
                english: false
            },
            precision: 1,
            html: "km&#8226;h<sup>-1</sup>",
            unit: "km/h",
            textLabel: "Kilometers/hour",
        },
        "knots": {
            convention: {
                si: false,
                metric: false,
                english: true
            },
            precision: 1,
            html: "kts",
            unit: "kts",
            textLabel: "Natutical Miles/hr"
        },
        "Knots": {
            convention: {
                si: false,
                metric: false,
                english: true
            },
            precision: 1,
            html: "kts",
            unit: "kts",
            textLabel: "Natutical Miles/hr"
        },
        "Miles/hour": {
            convention: {
                si: false,
                metric: false,
                english: true
            },
            precision: 1,
            html: "mph",
            unit: "mph",
            textLabel: "Statute Miles/hr"
        },
        "%": {
            convention: {
                si: true,
                metric: true,
                english: true
            },
            precision: 0,
            html: "&#37;",
            unit: "%",
            textLabel: "Percent"
        },
        "Pascals": {
            convention: {
                si: true,
                metric: true,
                english: false
            },
            precision: 0,
            html: "Pa",
            unit: "Pa",
            textLabel: "Pascals"

        },
        "Millibars": {
            convention: {
                si: false,
                metric: true,
                english: false
            },
            precision: 0,
            html: "mb",
            unit: "mb",
            textLabel: "Millibars"
        },
        "INHG": {
            convention: {
                si: false,
                metric: false,
                english: true
            },
            precision: 2,
            html: "inHg",
            unit: "inHg",
            textLabel: "inHg"
        },
        "W/m**2": {
            convention: {
                si: true,
                metric: true,
                english: false
            },
            html: "W&#8226;m<sup>-2</sup>",
            unit: "W/m^2",
            precision: 0,
            textLabel: "Watts / Meter^2",
        },
        "Degrees": {
            convention: {
                si: true,
                metric: true,
                english: true
            },
            precision: 0,
            html: "Degrees",
            unit: "Degrees",
            textLabel: "Degrees",
        },
        "umol/m**2 s": {
            convention: {
                si: true,
                metric: true,
                english: true
            },
            precision: 1,
            html: "umol&#8226;m<sup>-2</sup>&#8226;s",
            unit: "umol/m^2 s",
            textLabel: "umol/m^2 s"
        },
        "Millimeters": {
            convention: {
                si: false,
                metric: true,
                english: false
            },
            precision: 2,
            html: "mm",
            unit: "mm",
            textLabel: "Millimeters"
        },
        "Centimeters": {
            convention: {
                si: false,
                metric: true,
                english: false
            },
            precision: 2,
            html: "cm",
            unit: "cm",
            textLabel: "Centimeters"
        },
        "Meters": {
            convention: {
                si: true,
                metric: true,
                english: false
            },
            precision: 2,
            html: "m",
            unit: "m",
            textLabel: "Meters"
        },
        "ug/m3": {
            convention: {
                si: true,
                metric: true,
                english: true
            },
            precision: 1,
            html: "ug&#8226;m<sup>3</sup>",
            unit: "ug/m3",
            textLabel: "ug/m3"
        },
        "liters/min": {
            convention: {
                si: true,
                metric: true,
                english: true
            },
            precision: 1,
            html: "L/min",
            unit: "L/min",
            textLabel: "liters/min"
        },
        "code": {
            convention: {
                si: true,
                metric: true,
                english: true
            },
            precision: 0,
            html: "code",
            unit: "code",
            textLabel: "code"
        },
        "Inches": {
            convention: {
                si: false,
                metric: false,
                english: true
            },
            precision: 2,
            html: "in",
            unit: "in",
            textLabel: "liters/min"
        },
        "volts": {
            convention: {
                si: true,
                metric: true,
                english: true
            },
            precision: 2,
            html: "V",
            unit: "V",
            textLabel: "volts"
        },
        "Statute miles": {
            convention: {
                si: false,
                metric: false,
                english: true
            },
            precision: 2,
            html: "mi",
            unit: "mi",
            textLabel: "Statute miles"
        },
        "text": {
            convention: {
                si: true,
                metric: true,
                english: true
            },
            precision: 0,
            html: "",
            unit: "",
            textLabel: "Text"
        }
    };

    return Units;
} ());

// Needed for node.js
// module.exports = Units;