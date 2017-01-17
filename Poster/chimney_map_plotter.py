# Created by Randall Vowles, MesoWest Research Group, University of Utah
import json
import gmplot

file = open("C:\\fireperimeter\\assets\\js\\chimneytop_a.json")
# final_file = open("C:\\fireperimeter\\assets\\js\\chimneytop_b.json")
file2 = (json.load(file))
# final_file2 = (json.load(final_file))

olat = float(file2["lat"])
olon = float(file2["lon"])
stations = file2["nearest_stations"]
polygons = file2["polygon"]
# fpolygons = final_file2["polygon"]
# print polygons

gmap = gmplot.GoogleMapPlotter(olat, olon, 11)

slat = []
slon = []
for i in range(len(stations)):
    # print stations
    slat.append((float(stations[i]["LAT"])))
    slon.append((float(stations[i]["LON"])))
gmap.scatter(slat, slon, 'navy', marker=False, size=2000, alpha=0.75)

plat = []
plon = []
for j in range(len(polygons)):
    plat.append((float(polygons[j]["lat"])))
    plon.append((float(polygons[j]["lon"])))
gmap.scatter(plat, plon, 'darkred', marker=False, size=200)

# fplat = []
# fplon = []
# for k in range(len(fpolygons)):
#     fplat.append((float(fpolygons[k]["lat"])))
#     fplon.append((float(fpolygons[k]["lon"])))
# gmap.scatter(fplat, fplon, 'k', marker=False, size=200)

# gmap.scatter(olat, olon, 'g', marker=False, size=1000)
gmap.scatter([35.631], [-83.478], 'k', marker=False, size=1000, alpha=0.6)
gmap.draw("chimney_map.html")
