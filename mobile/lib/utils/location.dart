import 'package:geolocator/geolocator.dart';

import 'geometry.dart';

class LocationResult {
  final LatLngPoint point;
  final double accuracyM;
  LocationResult(this.point, this.accuracyM);
}

class LocationDeniedException implements Exception {
  final String message;
  LocationDeniedException(this.message);
  @override
  String toString() => message;
}

/// Request permission and a single fix.
Future<LocationResult> getCurrentLocation({bool highAccuracy = true}) async {
  // Service check
  final enabled = await Geolocator.isLocationServiceEnabled();
  if (!enabled) {
    throw LocationDeniedException(
        "Location services are off. Enable them in your device settings.");
  }
  var perm = await Geolocator.checkPermission();
  if (perm == LocationPermission.denied) {
    perm = await Geolocator.requestPermission();
  }
  if (perm == LocationPermission.deniedForever) {
    throw LocationDeniedException(
      'Location permission denied. Enable it in your app settings to use SOS.',
    );
  }
  if (perm == LocationPermission.denied) {
    throw LocationDeniedException(
      'Location permission required to share your position with responders.',
    );
  }
  final pos = await Geolocator.getCurrentPosition(
    locationSettings: LocationSettings(
      accuracy: highAccuracy ? LocationAccuracy.high : LocationAccuracy.medium,
      timeLimit: const Duration(seconds: 12),
    ),
  );
  return LocationResult(LatLngPoint(pos.latitude, pos.longitude), pos.accuracy);
}
