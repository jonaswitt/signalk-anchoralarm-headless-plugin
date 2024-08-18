/**
 * @typedef {import('@signalk/server-api').ServerAPI} ServerAPI
 * @typedef {import('@signalk/server-api').Plugin} Plugin
 */

module.exports = (
  /** @type {ServerAPI} */
  app
) => {
  let unsubscribes = [];

  /** @type {Plugin} */
  const plugin = {
    id: "signalk-anchoralarm-headless-plugin",
    name: "Anchor Alarm (Headless)",
    start: (settings, restartPlugin) => {
      const updateValues = () => {
        const boatPosition = app.getSelfPath('navigation.position');
        const boatPositionValue = boatPosition?.value?.latitude != null && boatPosition?.value?.longitude != null ? {
          latitude: Number(boatPosition.value.latitude),
          longitude: Number(boatPosition.value.longitude),
        } : undefined;

        const anchorPosition = app.getSelfPath('navigation.anchor.position');
        const anchorPositionValue = anchorPosition?.value?.latitude != null && anchorPosition?.value?.longitude != null ? {
          latitude: Number(anchorPosition.value.latitude),
          longitude: Number(anchorPosition.value.longitude),
        } : undefined;

        const maxRadius = app.getSelfPath('navigation.anchor.maxRadius');
        const maxRadiusValue = maxRadius?.value != null ? Number(maxRadius.value) : undefined

        const heading = app.getSelfPath('navigation.headingTrue');
        const headingValue = heading?.value != null ? Number(heading.value) : undefined

        const fromBow = app.getSelfPath('sensors.gps.fromBow');
        const fromBowValue = fromBow?.value != null ? Number(fromBow.value) : undefined

        const bowPositionValue = boatPositionValue != null && headingValue != null && fromBowValue != null ? getLocationFromBearing(boatPositionValue, fromBowValue, radToDeg(headingValue)) : boatPositionValue;

        const currentRadius = bowPositionValue != null && anchorPositionValue != null ? getDistance(bowPositionValue, anchorPositionValue) : undefined;
        const bearingTrue = bowPositionValue != null && anchorPositionValue != null ? bearing(bowPositionValue, anchorPositionValue) : undefined;

        app.handleMessage(plugin.id, {
          updates: [{
            values: [{
              path: "navigation.anchor.currentRadius",
              value: currentRadius ?? null,
            },
            {
              path: "navigation.anchor.bearingTrue",
              value: bearingTrue != null ? degToRad(bearingTrue) : null,
            },
            {
              path: "notifications.navigation.anchor",
              value: maxRadiusValue != null && currentRadius != null && currentRadius > maxRadiusValue ? {
                state: "alarm",
                method: ["sound"],
                message: "Anchor radius exceeded",
              } : null,
            }]
          }]
        });
      };

      updateValues();

      app.subscriptionmanager.subscribe(
        {
          context: "vessels.self",
          subscribe: [
            {
              path: "navigation.anchor.position",
            },
            {
              path: "navigation.anchor.maxRadius",
            },
            {
              path: "navigation.position",
            },
            {
              path: "navigation.headingTrue",
            },
            {
              path: "sensors.gps.fromBow",
            },
          ],
        },
        unsubscribes,
        subscriptionError => {
          app.error('Error: ' + subscriptionError);
        },
        () => {
          updateValues();
        },
      );
    },
    stop: () => {
      unsubscribes.forEach(f => f());
      unsubscribes = [];
    },
    schema: () => ({
      properties: {
      },
    }),
  };

  return plugin;
};


const EARTH_RADIUS = 6371000; // Radius of the earth in m
const EARTH_CIRCUMFERENCE = EARTH_RADIUS * 2 * Math.PI;

/**
 * Returns the distance between two positions
 *
 * @param lat1 - The latitude of the first position in degrees
 * @param lon1 - The longitude of the first position in degrees
 * @param lat2 - The latitude of the second position in degrees
 * @param lon2 - The longitude of the second position in degrees
 *
 * @return number - The distance in meters
 */
function getDistance(
  { latitude: lat1, longitude: lon1 },
  { latitude: lat2, longitude: lon2 },
) {
  const dLat = degToRad(lat2 - lat1);
  const dLon = degToRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(degToRad(lat1)) *
    Math.cos(degToRad(lat2)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = EARTH_RADIUS * c; // Distance in m
  return d;
}

/**
 * Calculate the bearing between two positions as a value from 0-360
 *
 * @param lat1 - The latitude of the first position in degrees
 * @param lon1 - The longitude of the first position in degrees
 * @param lat2 - The latitude of the second position in degrees
 * @param lon2 - The longitude of the second position in degrees
 *
 * @return number - The bearing in degrees (between 0 and 360)
 */
function bearing(
  { latitude: lat1, longitude: lon1 },
  { latitude: lat2, longitude: lon2 },
) {
  const lat1Rad = degToRad(lat1);
  const lon1Rad = degToRad(lon1);
  const lat2Rad = degToRad(lat2);
  const lon2Rad = degToRad(lon2);

  const dLon = lon2Rad - lon1Rad;
  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
  const brng = radToDeg(Math.atan2(y, x));
  return (brng + 360) % 360;
}

/**
 * convert from degrees into radians
 *
 * @param deg - The degrees to be converted into radians
 * @return radians
 */
function degToRad(deg) {
  return (deg * Math.PI) / 180;
}

/**
 * convert from radians into degrees
 *
 * @param rad - The radians to be converted into degrees
 * @return degrees
 */
function radToDeg(rad) {
  return (rad * 180) / Math.PI;
}

/**
 * Returns the new location calculated from current location, bearing(deg) and distance(meters)
 */
function getLocationFromBearing(startLocation, distance, bearingInDeg) {
  // Convert bearing to radian
  const brng = degToRad(bearingInDeg);
  // Current coords to radians
  let lat = degToRad(startLocation.latitude);
  let lon = degToRad(startLocation.longitude);

  // Do the math
  lat = Math.asin(
    Math.sin(lat) * Math.cos(distance / EARTH_RADIUS) +
    Math.cos(lat) * Math.sin(distance / EARTH_RADIUS) * Math.cos(brng)
  );
  lon += Math.atan2(
    Math.sin(brng) * Math.sin(distance / EARTH_RADIUS) * Math.cos(lat),
    Math.cos(distance / EARTH_RADIUS) - Math.sin(lat) * Math.sin(lat)
  );

  // Coords back to degrees and return
  return {
    latitude: radToDeg(lat),
    longitude: radToDeg(lon),
  }
}

