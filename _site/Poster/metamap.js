var M = new mesonet(); // Outside so we can see it from the console

function initMap() {
    "use strict";

    // Set up mesonet interface
    M.setApiToken("demotoken");
    M.setService("Metadata");
    if (M.windowArgs()[''] === "undefined") {
        console.log("boom")
        M.fetch({
            state: "ut",
            complete: 1,
            sensorvars: 1
        });
    } else {
        M.fetch(0);
    }

    /*
     * When the async handler comes back complete we can move on
     */
    var ready = M.async();
    $.when(ready).done(function() {

        var numStations = Object.keys(M.response.station).length;
        console.log("Number of stations retrieved: " + numStations);


        var active = [];
        var latitude = [];
        var longitude = [];
        var geoQc = [];

        var i = 0;
        var a, b, t;
        for (i = 0; i < numStations; i++) {
            /*
             * Here's where we want to test against crazy values,
             * then we dump them in the middle of the ocean with a slight
             * offset so we can see them all.
             */
            t = M.response.station[i].LATITUDE;
            a = (t === null || isNaN(Number(t) && (t > -90 && t < 90))) ? 0 : t;

            t = M.response.station[i].LONGITUDE;
            b = (t === null || isNaN(Number(t) && (t > -180 && t < 180))) ? 0 : t;

            if (a == 0 || b == 0) {
                latitude[i] = 0 - (i / 1000);
                longitude[i] = 0 - (i / 1000);
                geoQc[i] = true;
            } else {
                latitude[i] = Number(a);
                longitude[i] = Number(b);
                geoQc[i] = false;
            }

            /* Get the station's activity status */
            if (M.response.station[i].STATUS === "INACTIVE") {
                active[i] = 0;
            } else {
                active[i] = 1;
            }

        }

        var map = L.map('map', {
            zoom: 22
        });

        /* Download and set the map tiles */
        // L.tileLayer('https://api.mapbox.com/styles/v1/aidugan/' +
        //     'ciq3yatcu007nccniterrlj46/tiles/256/{z}/{x}/{y}?' +
        //     'access_token=pk.eyJ1IjoiYWlkdWdhbiIsImEiOiJjaXEzeHBnYXIwMW03ZmhubnZsY3AwNGl1In0.mEGW7FBrgALjyTC0ph41ew', {
        //         attribution: 'Map data &copy; <a href= "http://openstreetmap.org">OpenStreetMap</a> contributors'
        //     }).addTo(map)

        L.tileLayer('https://api.mapbox.com/styles/v1/adamabernathy/' +
            'ciqmga21z0018bonj3h95dpr7/tiles/256/{z}/{x}/{y}?' +
            'access_token=pk.eyJ1IjoiYWRhbWFiZXJuYXRoeSIsImEiOiJjaXB0cGVjZWEwNjY0aDFucmFrdjVsY296In0.G4MDlsymFjYx1z6bcFfRWQ', {
                attribution: 'Map data &copy; <a href= "http://openstreetmap.org">OpenStreetMap</a> contributors'
            }).addTo(map)

        function onMapClick(e) {
            map.setView(e.latlng, 13);
        }

        var blueIcon = L.icon({
            iconUrl: '../../assets/img/success.svg',

            iconSize: [12, 12],
            popupAnchor: [0, -8]
        })

        var redIcon = L.icon({
            iconUrl: '../../assets/img/error.svg',

            iconSize: [12, 12],
            popupAnchor: [0, -8]
        })

        var badIcon = L.icon({
            iconUrl: '../../assets/img/bad-station.svg',

            iconSize: [12, 12],
            popupAnchor: [0, -8]
        })

        /*
         * Pop the values to the map
         */
        var bounds = [];
//<<<<<<< HEAD


//=======
        var markers = L.markerClusterGroup({
            chunkedLoading: true,
            spiderfyOnMaxZoom: true,
            chuckedLoading: true,
            disableClusteringAtZoom: 11,
            maxClusterRadius: 80,

            iconCreateFunction: function(cluster) {
                // get the number of items in the cluster
                var count = cluster.getChildCount();

      // figure out how many digits long the number is
                var digits = (count+'').length;

      // return a new L.DivIcon with our classes so we can
      // style them with CSS. Take a look at the CSS in
      // the <head> to see these styles. You have to set
      // iconSize to null if you want to use CSS to set the
      // width and height.
                return new L.divIcon({
                  html: count,
                  className:'cluster digits-'+digits,
                  iconSize: null
                  });
                }

        });
        // var markers = L.markerClusterGroup({ iconCreateFunction: function(cluster)
        //               {var markers = cluster.getAllChildMarkers();
        //                var n = 0;
        //               for (var i = 0; i<markers.length; i++) {
        //                 n = n+ markers[i].number;
        //               }
        //                 console.log(n)
        //               return L.divIcon( {html: n, className: 'mycluster',
        //               iconSize: L.point(40,40) } );
        //             }
        //             });
//>>>>>>> a0da5a7235458bee5cb06b73b3fc64d5328b1103

        for (var i = 0; i < latitude.length; i++) {
            // if (active[i] === 1 && showActiveFlag >= 0 && geoQc[i] === false) {
            if (active[i] === 1 && geoQc[i] === false) {
                var tableData = "Station Table-view Data";
                var tableDataURL = "<a href =" + "\"http://dev2.mesowest.net/mesonet-js/table-view.html?stid=" +
                    M.response.station[i].STID + "&recent=120\"" + "target = \"_blank\">Station Table View</a>";

                var title = M.response.station[i].NAME + "<br>" +
                    M.response.station[i].STID + " (ID #" +
                    M.response.station[i].ID + ") <br>" + "Latitude: " +
                    M.response.station[i].LATITUDE + "<br> Longitude: " +
                    M.response.station[i].LONGITUDE + "<br> Status: " +
                    M.response.station[i].STATUS + "<br>" +
                    tableDataURL;

                var marker = L.marker([latitude[i], longitude[i]], {
                    icon: blueIcon,
                    title: title
                });
                marker.bindPopup(title);
                markers.addLayer(marker);
                bounds.push([latitude[i], longitude[i]])

            } else if (active[i] === 0 && geoQc[i] === false) {

                var title = M.response.station[i].NAME + "<br>" +
                    M.response.station[i].STID + " (ID #" +
                    M.response.station[i].ID + ") <br>" + "Latitude: " +
                    M.response.station[i].LATITUDE + "<br> Longitude: " +
                    M.response.station[i].LONGITUDE + "<br> Status: " +
                    M.response.station[i].STATUS
                var marker = L.marker([latitude[i], longitude[i]], {
                    icon: redIcon,
                    title: title
                });
                marker.bindPopup(title);
                markers.addLayer(marker);
                bounds.push([latitude[i], longitude[i]])

            } else if (geoQc[i] === true){
                var title = M.response.station[i].NAME;
                var marker = L.marker([latitude[i], longitude[i]], {
                    icon: badIcon,
                    title: title
                }).addTo(map);
                //if want to know index of null stations, uncomment next line
                //console.log(i);

            }
        }




        map.addLayer(markers);
        map.fitBounds(bounds);

    });
}
