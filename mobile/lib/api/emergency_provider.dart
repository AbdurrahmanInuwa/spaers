import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/emergency.dart';
import '../utils/geometry.dart';
import 'api.dart';

const _kPersistKey = 'spaers_active_emergency_v1';
const _kSelectedKey = 'spaers_selected_emergency_v1';
const _kAnonKey = 'spaers_anon_sos_v1';
const _kPullingMs = 4000;
const kPulseMaxM = 10000.0;
const kPulseDurationMs = 4500;

const kEmergencyTypes = ['Shooting', 'Medical', 'Assault', 'Fire', 'Flooding'];

class AnonSOS {
  final String emergencyId;
  final String victimToken;
  final String type;
  final double victimLat;
  final double victimLng;
  final DateTime createdAt;
  final DateTime expiresAt;

  AnonSOS({
    required this.emergencyId,
    required this.victimToken,
    required this.type,
    required this.victimLat,
    required this.victimLng,
    required this.createdAt,
    required this.expiresAt,
  });

  Map<String, dynamic> toJson() => {
        'emergencyId': emergencyId,
        'victimToken': victimToken,
        'type': type,
        'victimLat': victimLat,
        'victimLng': victimLng,
        'createdAt': createdAt.toIso8601String(),
        'expiresAt': expiresAt.toIso8601String(),
      };
  factory AnonSOS.fromJson(Map<String, dynamic> j) => AnonSOS(
        emergencyId: j['emergencyId']?.toString() ?? '',
        victimToken: j['victimToken']?.toString() ?? '',
        type: j['type']?.toString() ?? '',
        victimLat: (j['victimLat'] as num?)?.toDouble() ?? 0,
        victimLng: (j['victimLng'] as num?)?.toDouble() ?? 0,
        createdAt: DateTime.tryParse(j['createdAt']?.toString() ?? '') ??
            DateTime.now(),
        expiresAt: DateTime.tryParse(j['expiresAt']?.toString() ?? '') ??
            DateTime.now().add(const Duration(hours: 4)),
      );
}

class EmergencyProvider extends ChangeNotifier {
  String selected = 'Medical';
  bool submitting = false;
  bool triggered = false;
  LatLngPoint? location;
  String? emergencyId;
  String emergencyStatus = 'active';
  EmergencyDispatch? dispatch;
  List<InstitutionPin> matched = [];
  Timer? _poller;
  bool _hydrated = false;

  bool get dispatchStarted => dispatch?.startedAt != null;
  bool get hydrated => _hydrated;

  Future<void> hydrate() async {
    final p = await SharedPreferences.getInstance();
    selected = p.getString(_kSelectedKey) ?? 'Medical';
    final raw = p.getString(_kPersistKey);
    if (raw != null) {
      try {
        final m = jsonDecode(raw) as Map<String, dynamic>;
        if (m['triggered'] == true) {
          triggered = true;
          emergencyId = m['emergencyId']?.toString();
          emergencyStatus = m['emergencyStatus']?.toString() ?? 'active';
          final lat = (m['lat'] as num?)?.toDouble();
          final lng = (m['lng'] as num?)?.toDouble();
          if (lat != null && lng != null) location = LatLngPoint(lat, lng);
        }
      } catch (_) {}
    }
    _hydrated = true;
    notifyListeners();
    if (emergencyId != null) _startPoller();
  }

  Future<void> _persist() async {
    final p = await SharedPreferences.getInstance();
    await p.setString(_kSelectedKey, selected);
    if (triggered && emergencyId != null && location != null) {
      await p.setString(
          _kPersistKey,
          jsonEncode({
            'triggered': true,
            'emergencyId': emergencyId,
            'emergencyStatus': emergencyStatus,
            'lat': location!.lat,
            'lng': location!.lng,
          }));
    } else {
      await p.remove(_kPersistKey);
    }
  }

  void setSelected(String v) {
    selected = v;
    notifyListeners();
    _persist();
  }

  Future<void> reset() async {
    triggered = false;
    location = null;
    emergencyId = null;
    emergencyStatus = 'active';
    dispatch = null;
    matched = [];
    submitting = false;
    _poller?.cancel();
    _poller = null;
    notifyListeners();
    await _persist();
  }

  /// Trigger an authenticated SOS. Caller provides the user's location.
  Future<bool> triggerSOS(LatLngPoint loc) async {
    submitting = true;
    notifyListeners();
    try {
      final res = await Api.instance.post('/emergencies', body: {
        'type': selected,
        'lat': loc.lat,
        'lng': loc.lng,
      });
      final data = Api.instance.decode(res);
      if (res.statusCode < 200 || res.statusCode >= 300) {
        submitting = false;
        notifyListeners();
        return false;
      }
      final em = data['emergency'] as Map?;
      emergencyId = em?['id']?.toString();
      location = loc;
      triggered = true;
      submitting = false;
      notifyListeners();
      _persist();
      _startPoller();
      _matchInstitutions();
      return true;
    } catch (e) {
      submitting = false;
      notifyListeners();
      return false;
    }
  }

  Future<void> _matchInstitutions() async {
    if (location == null) return;
    try {
      final res = await Api.instance.get('/institutions');
      final data = Api.instance.decode(res);
      final raw = data['institutions'];
      if (raw is! List) return;
      final candidates = <InstitutionPin>[];
      for (final e in raw) {
        if (e is! Map<String, dynamic>) continue;
        final pin = InstitutionPin.fromJson(e);
        final polygonM = minDistanceToPolygonM(location!, pin.coveragePolygon);
        if (polygonM > kPulseMaxM) continue;
        final reachM = haversineMeters(
            location!, LatLngPoint(pin.centerLat, pin.centerLng));
        candidates.add(pin.copyWithDistances(polygonM: polygonM, reachM: reachM));
      }
      candidates.sort((a, b) => a.reachM.compareTo(b.reachM));
      // Reveal in pulse order
      for (final pin in candidates) {
        final delay = (pin.polygonM / kPulseMaxM) * kPulseDurationMs;
        Timer(Duration(milliseconds: delay.toInt().clamp(0, kPulseDurationMs.toInt())), () {
          if (matched.any((m) => m.id == pin.id)) return;
          matched = [...matched, pin];
          notifyListeners();
        });
      }
    } catch (e) {
      if (kDebugMode) print('match institutions error: $e');
    }
  }

  void _startPoller() {
    _poller?.cancel();
    Future<void> tick() async {
      if (emergencyId == null) return;
      try {
        final res = await Api.instance.get('/emergencies/$emergencyId');
        if (res.statusCode != 200) return;
        final data = Api.instance.decode(res);
        final em = data['emergency'];
        if (em is! Map<String, dynamic>) return;
        emergencyStatus = em['status']?.toString() ?? 'active';
        final dispatches = em['dispatches'];
        if (dispatches is List && dispatches.isNotEmpty) {
          dispatch = EmergencyDispatch.fromJson(
              Map<String, dynamic>.from(dispatches.first));
        }
        notifyListeners();
        await _persist();
        if (emergencyStatus == 'resolved' || emergencyStatus == 'cancelled') {
          // Brief delay so user sees terminal state.
          Future.delayed(const Duration(milliseconds: 1500), reset);
        }
      } catch (_) {}
    }

    tick();
    _poller = Timer.periodic(
      const Duration(milliseconds: _kPullingMs),
      (_) => tick(),
    );
  }

  @override
  void dispose() {
    _poller?.cancel();
    super.dispose();
  }
}

/// Persistence helpers for the anonymous SOS overlay.
class AnonSOSStorage {
  static Future<AnonSOS?> load() async {
    final p = await SharedPreferences.getInstance();
    final raw = p.getString(_kAnonKey);
    if (raw == null) return null;
    try {
      final m = jsonDecode(raw) as Map<String, dynamic>;
      final s = AnonSOS.fromJson(m);
      if (s.expiresAt.isBefore(DateTime.now())) {
        await p.remove(_kAnonKey);
        return null;
      }
      return s;
    } catch (_) {
      return null;
    }
  }

  static Future<void> save(AnonSOS sos) async {
    final p = await SharedPreferences.getInstance();
    await p.setString(_kAnonKey, jsonEncode(sos.toJson()));
  }

  static Future<void> clear() async {
    final p = await SharedPreferences.getInstance();
    await p.remove(_kAnonKey);
  }
}
