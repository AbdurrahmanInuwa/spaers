class EmergencyDispatch {
  final String id;
  final DateTime? startedAt;
  final DateTime? arrivedAt;
  final String dispatcherName;

  EmergencyDispatch({
    required this.id,
    this.startedAt,
    this.arrivedAt,
    this.dispatcherName = '',
  });

  factory EmergencyDispatch.fromJson(Map<String, dynamic> j) {
    DateTime? parse(dynamic v) {
      if (v == null) return null;
      try {
        return DateTime.parse(v.toString()).toLocal();
      } catch (_) {
        return null;
      }
    }

    return EmergencyDispatch(
      id: j['id']?.toString() ?? '',
      startedAt: parse(j['startedAt']),
      arrivedAt: parse(j['arrivedAt']),
      dispatcherName: (j['dispatcher'] as Map?)?['name']?.toString() ?? '',
    );
  }
}

class EmergencyRecord {
  final String id;
  final String type;
  final double victimLat;
  final double victimLng;
  final String status; // active, dispatched, resolved, cancelled, expired
  final DateTime createdAt;
  final List<EmergencyDispatch> dispatches;

  EmergencyRecord({
    required this.id,
    required this.type,
    required this.victimLat,
    required this.victimLng,
    required this.status,
    required this.createdAt,
    this.dispatches = const [],
  });

  EmergencyDispatch? get latestDispatch =>
      dispatches.isEmpty ? null : dispatches.first;

  factory EmergencyRecord.fromJson(Map<String, dynamic> j) {
    final list = <EmergencyDispatch>[];
    final raw = j['dispatches'];
    if (raw is List) {
      for (final d in raw) {
        if (d is Map<String, dynamic>) list.add(EmergencyDispatch.fromJson(d));
      }
    }
    return EmergencyRecord(
      id: j['id']?.toString() ?? '',
      type: j['type']?.toString() ?? '',
      victimLat: (j['victimLat'] as num?)?.toDouble() ?? 0,
      victimLng: (j['victimLng'] as num?)?.toDouble() ?? 0,
      status: j['status']?.toString() ?? 'active',
      createdAt: DateTime.tryParse(j['createdAt']?.toString() ?? '')?.toLocal() ??
          DateTime.now(),
      dispatches: list,
    );
  }
}

class InstitutionPin {
  final String id;
  final String name;
  final String type;
  final double centerLat;
  final double centerLng;
  final List<List<double>> coveragePolygon; // [[lat,lng]]
  final double polygonM; // distance from victim to polygon edge (0 if inside)
  final double reachM; // straight-line to centerLat/Lng

  InstitutionPin({
    required this.id,
    required this.name,
    required this.type,
    required this.centerLat,
    required this.centerLng,
    required this.coveragePolygon,
    this.polygonM = 0,
    this.reachM = 0,
  });

  bool get insideCoverage => polygonM == 0;

  factory InstitutionPin.fromJson(Map<String, dynamic> j) {
    final poly = <List<double>>[];
    final raw = j['coveragePolygon'];
    if (raw is List) {
      for (final p in raw) {
        if (p is Map) {
          final lat = (p['lat'] as num?)?.toDouble();
          final lng = (p['lng'] as num?)?.toDouble();
          if (lat != null && lng != null) poly.add([lat, lng]);
        }
      }
    }
    return InstitutionPin(
      id: j['id']?.toString() ?? '',
      name: j['name']?.toString() ?? '',
      type: j['type']?.toString() ?? '',
      centerLat: (j['centerLat'] as num?)?.toDouble() ?? 0,
      centerLng: (j['centerLng'] as num?)?.toDouble() ?? 0,
      coveragePolygon: poly,
    );
  }

  InstitutionPin copyWithDistances({double? polygonM, double? reachM}) {
    return InstitutionPin(
      id: id,
      name: name,
      type: type,
      centerLat: centerLat,
      centerLng: centerLng,
      coveragePolygon: coveragePolygon,
      polygonM: polygonM ?? this.polygonM,
      reachM: reachM ?? this.reachM,
    );
  }
}

class NearbySummary {
  final int total;
  final List<NearbyResponder> list;
  final NearbyResponder? nearest;
  NearbySummary({required this.total, required this.list, this.nearest});

  factory NearbySummary.fromJson(Map<String, dynamic> j) {
    final list = <NearbyResponder>[];
    final raw = j['list'];
    if (raw is List) {
      for (final e in raw) {
        if (e is Map<String, dynamic>) list.add(NearbyResponder.fromJson(e));
      }
    }
    NearbyResponder? nearest;
    final n = j['nearest'];
    if (n is Map<String, dynamic>) nearest = NearbyResponder.fromJson(n);
    return NearbySummary(
        total: (j['total'] as num?)?.toInt() ?? list.length,
        list: list,
        nearest: nearest);
  }
}

class NearbyResponder {
  final String id;
  final String name;
  final String type;
  final double distanceM;
  NearbyResponder(
      {required this.id,
      required this.name,
      required this.type,
      required this.distanceM});
  factory NearbyResponder.fromJson(Map<String, dynamic> j) => NearbyResponder(
        id: j['id']?.toString() ?? '',
        name: j['name']?.toString() ?? '',
        type: j['type']?.toString() ?? '',
        distanceM: (j['distanceM'] as num?)?.toDouble() ?? 0,
      );
}
