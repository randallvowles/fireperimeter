#!/uufs/chpc.utah.edu/common/home/u0540701/MyVenv/bin/python
# encoding: utf-8
"""Provides the `Active Fires` API"""

def desc_regexr(string):
    """Pulls out metadata from description text with regex"""
    import re
    remove_spaces = re.sub(r'\n\s+', "", string)
    remove_hrefs = re.sub(r'<a href(.*?)<\/a>', "", remove_spaces)
    junk = re.sub(r'<br \/>', r'\n', remove_hrefs)
    junk = re.sub(r'<b>(.*?)</b>', "", junk)
    junk = re.sub(r'\n', ",", junk)
    agency = (re.search(r'Agency(.*?)(\w+)', junk).group(0)).split(': ')
    unit_id = (re.search(r'Unit Identifer(.*?)(\w+)',
                         junk).group(0)).split(': ')
    fire_code = (re.search(r'Fire Code:(.*?)(\w+)',
                           junk).group(0)).split(': ')
    fire_name = (re.search(r'Fire Name(.*?)(\w+)(?=,)',
                           junk).group(0)).split(': ')
    acres = (re.search(r'Acres(.*?)(\d+)', junk).group(0)).split(': ')
    start_date = (re.search(r'Perimeter Date(.*?)(\d+\/\d+\/\d+)',
                            junk).group(0)).split(': ')
    unique_id = (re.search(r'Unique(.*?)(\d+)(-\w+)(-\d+)',
                           junk).group(0)).split(': ')
    # Package this all back up.
    metadata = {agency[0]: agency[1], unit_id[0]: unit_id[1],
                fire_code[0]: fire_code[1], fire_name[0]: fire_name[1],
                acres[0]: acres[1], start_date[0]: start_date[1],
                unique_id[0]: unique_id[1]}
    return metadata

def parser(response):
    """Active fires KML parser"""
    from 'C:\\FireWeatherNow\\server\\src\\xmltodict.py import' xmltodict
    import urllib
    source = "C:\\FireWeatherNow\\server\\src\\ActiveFirePerimeters.kml"
    url = 'https://www.geomac.gov/asp-bin/GeoMACKML/kmlHelper.htm?http://rmgsc.cr.usgs.gov/outgoing/GeoMAC/current_year_fire_data/KMLS/TNGSP-016062%20CHIMNEY%20TOPS%202%2011-29-2016%201940.kml'
    # Initiate the parser's working vars
    response = urllib.urlopen(url).read()

    this = xmltodict.parse(response)
    that = {}
    tmp = dict()
    nkeys = len(this['kml']['Document']['Placemark'])
    for x in xrange(nkeys):
        if this['kml']['Document']['Placemark'][x]['name'] not in that and\
                'Point' in this['kml']['Document']['Placemark'][x]:
            tmp['name'] = this['kml']['Document']['Placemark'][x]['name']
            tmp['lon'] = this['kml']['Document']['Placemark'][x][
                'LookAt']['longitude']
            tmp['lat'] = this['kml']['Document']['Placemark'][x][
                'LookAt']['latitude']
            tmp['desc'] = desc_regexr(this['kml']['Document'][
                'Placemark'][x]['description'])
            tmp['n_nearest_stations'] = []
        else:
            poly_keys = []
            if 'Polygon' in this['kml']['Document']['Placemark'][x]:
                _coord = ((this['kml']['Document']['Placemark'][x][
                    'Polygon']['outerBoundaryIs'][
                        'LinearRing']['coordinates']).split('\n'))
                _coords = [i.split(',') for i in _coord]
                n_polygon_elements = len(_coords)
                tmp['n_polygon_elements'] = str(n_polygon_elements)
                tmp['polygon'] = []
                for j in xrange(len(_coords)):
                    _junk = (_coords[j])
                    poly_keys = ({'lat': (str(_junk[1])).strip(),
                                  'lon': (str(_junk[0])).strip()})
                    tmp['polygon'].append(poly_keys)
                that[this['kml']['Document']['Placemark'][x][
                    'name'].split(" ")[0]] = tmp
                tmp = dict()
            elif 'Polygon' in this['kml']['Document']['Placemark'][x]['MultiGeometry']:
                n_polygons = len(this['kml']['Document']['Placemark'][x][
                    'MultiGeometry']['Polygon'])
                tmp['n_polygons'] = n_polygons
                for i in xrange(n_polygons):
                    _coord = (this['kml']['Document']['Placemark'][x][
                        'MultiGeometry']['Polygon'][i][
                            'outerBoundaryIs']['LinearRing'][
                                'coordinates']).split('\n')
                    _coords = [k.split(',') for k in _coord]
                    tmp['polygon'] = []
                    for j in xrange(len(_coords)):
                        _junk = (_coords[j])
                        poly_keys.append({'lat': (str(_junk[1])).strip(),
                                          'lon': (str(_junk[0])).strip()})
                        tmp['polygon'].append(poly_keys)
                that[this['kml']['Document']['Placemark'][x][
                    'name'].split(" ")[0]] = tmp
                tmp = dict()
            else:
                print('Error in '+str(x)+' key, ' +
                      str(this['kml']['Document']['Placemark'][x]['name']))
            tmp = dict()
    return that


def haversine(lon1, lat1, lon2, lat2):
    from math import radians, cos, sin, asin, sqrt, atan2, degrees
    """
    Calculate the great circle distance between two points
    on the earth (specified in decimal degrees)
    http://stackoverflow.com/questions/4913349/haversine-formula-in-python-bearing-and-distance-between-two-gps-points
    """
    # convert decimal degrees to radians
    lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
    # haversine formula
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = sin(dlat / 2)**2 + cos(lat1) * cos(lat2) * sin(dlon / 2)**2
    c = 2 * asin(sqrt(a))
    r = 3959  # Radius of earth in miles. Use 6371 for kilometers
    distance = c * r
    bearing = atan2(sin(lon2 - lon1) * cos(lat2), cos(lat1) *
                    sin(lat2) - sin(lat1) * cos(lat2) * cos(lon2 - lon1))
    bearing = degrees(bearing)
    bearing = (bearing + 360) % 360
    if distance is None or bearing is None:
        print('Error calculating with lat/lon '+str(lat1)+','+str(lon1)+','+str(lat2)+','+str(lon2))
    else:
        return distance, bearing

def nearest_peri_point (dict_, lat, lon):
    """Calculates shortest distance from station to perimeter"""
    import sys
    poly_dict = dict_
    st_lat = float(lat)
    st_lon = float(lon)
    DFPa = []
    for i in range(len(poly_dict)):
        try:
            plat = float(poly_dict[i]['lat'])
            plon = float(poly_dict[i]['lon'])
            DFP = haversine(st_lon, st_lat, plon, plat)
            if i == 0:
                DFPa = DFP
            else:
                if DFP[0] < DFPa[0]:
                    DFPa = DFP
        except(TypeError):
            for j in range(len(poly_dict[i])):
                plat = float(poly_dict[i][j]['lat'])
                plon = float(poly_dict[i][j]['lon'])
                DFP = haversine(st_lon, st_lat, plon, plat)
                if i == 0:
                    DFPa = DFP
                else:
                    if DFP[0] < DFPa[0]:
                        DFPa = DFP
    return DFPa


def stationquery():
    """Queries for nearest stations for each polygon element"""
    import urllib
    import json
    args = {"source": "C:\FireWeatherNow\server\src\ActiveFirePerimeters.kml"}
    firedict = parser(args)
    for i in firedict:
        firedict[i]['nearest_stations'] = []
        lat = firedict[i]['lat']
        lon = firedict[i]['lon']
        query = urllib.urlopen(base_url+urllib.urlencode(params)+
                               '&radius='+(lat)+','+(lon)+',200').read()
        response = json.loads(query)
        for j in range(len(response["STATION"])):
            stid = response["STATION"][j]["STID"]
            slat = response["STATION"][j]["LATITUDE"]
            slon = response["STATION"][j]["LONGITUDE"]
            distance = str(response["STATION"][j]["DISTANCE"])
            name = response["STATION"][j]["NAME"]
            DFP = nearest_peri_point(firedict[i]['polygon'], slat, slon)
            nearest_stations = {'STID': stid, 'LAT': slat, 'LON': slon,
                                'DFO': distance, 'NAME': name, 'DFP': DFP}
            firedict[i]['nearest_stations'].append(nearest_stations)
        firedict[i]['n_nearest_stations'].append(str(len(response["STATION"])))
    emitter(firedict, 'AF_NS_current', False)
    emitter(firedict, 'AF_NS', True)
    return firedict

def emitter(dict_, filename, timestamp):
    """Emit the file"""
    import json
    import time
    if timestamp is True:
        timestamp = time.strftime('%Y%m%d%H%M', time.gmtime())
    else:
        timestamp = ''
    # !! This is where problems can occur.
    # This should be surfaced as an option.
    filename1 = str(timestamp) + str(filename) + '.json'
    output_dir = 'C:\\FireWeatherNow\\storage\\fire_data\\'
    # output_dir = '../storage/fire_data/'
    file_out = output_dir + filename1
    with open(file_out, 'w') as file_out:
        # json.dump(dict_, file_out, sort_keys=True, separators=(',', ':'),
                #   encoding="utf-8")/
        json.dump(dict_, file_out, sort_keys=True, indent=4)

api_token = 'c5213a1102b8422c80378944e1246d10' # replace with config.parser
base_url = 'http://api.mesowest.net/v2/stations/latest?'
params = {'network': '1,2', 'complete': '1', 'status': 'active',
          'token': api_token, 'recent': '720'}


# Init.
# update_fires()
stationquery()
