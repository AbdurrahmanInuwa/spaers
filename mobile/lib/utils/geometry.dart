import 'dart:math' as math;

class LatLngPoint {
  final double lat;
  final double lng;
  const LatLngPoint(this.lat, this.lng);
}

double haversineMeters(LatLngPoint a, LatLngPoint b) {
  const r = 6371000.0;
  double toRad(double v) => v * math.pi / 180;
  final dLat = toRad(b.lat - a.lat);
  final dLng = toRad(b.lng - a.lng);
  final lat1 = toRad(a.lat);
  final lat2 = toRad(b.lat);
  final s =
      math.pow(math.sin(dLat / 2), 2) +
      math.cos(lat1) * math.cos(lat2) * math.pow(math.sin(dLng / 2), 2);
  return 2 * r * math.asin(math.sqrt(s));
}

bool pointInPolygon(LatLngPoint p, List<List<double>> poly) {
  if (poly.length < 3) return false;
  bool inside = false;
  for (int i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    final xi = poly[i][1], yi = poly[i][0];
    final xj = poly[j][1], yj = poly[j][0];
    final intersect = ((yi > p.lat) != (yj > p.lat)) &&
        (p.lng < (xj - xi) * (p.lat - yi) / ((yj - yi) == 0 ? 1e-12 : (yj - yi)) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

double _distancePointToSegmentMeters(
  LatLngPoint p,
  LatLngPoint a,
  LatLngPoint b,
) {
  // Project to a local ENU plane, treat segment + point as 2D.
  const mPerDegLat = 111320.0;
  final mPerDegLng = 111320.0 * math.cos(p.lat * math.pi / 180);
  final px = p.lng * mPerDegLng;
  final py = p.lat * mPerDegLat;
  final ax = a.lng * mPerDegLng;
  final ay = a.lat * mPerDegLat;
  final bx = b.lng * mPerDegLng;
  final by = b.lat * mPerDegLat;
  final dx = bx - ax;
  final dy = by - ay;
  if (dx == 0 && dy == 0) {
    return math.sqrt((px - ax) * (px - ax) + (py - ay) * (py - ay));
  }
  final t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy);
  final tt = t.clamp(0.0, 1.0);
  final cx = ax + tt * dx;
  final cy = ay + tt * dy;
  return math.sqrt((px - cx) * (px - cx) + (py - cy) * (py - cy));
}

double minDistanceToPolygonM(LatLngPoint p, List<List<double>> poly) {
  if (poly.length < 3) return double.infinity;
  if (pointInPolygon(p, poly)) return 0;
  double best = double.infinity;
  for (int i = 0; i < poly.length; i++) {
    final a = LatLngPoint(poly[i][0], poly[i][1]);
    final j = (i + 1) % poly.length;
    final b = LatLngPoint(poly[j][0], poly[j][1]);
    final d = _distancePointToSegmentMeters(p, a, b);
    if (d < best) best = d;
  }
  return best;
}
