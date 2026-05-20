import 'dart:async';

import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

import '../api/api.dart';
import '../api/emergency_provider.dart';
import '../models/emergency.dart';
import '../theme.dart';
import '../utils/geometry.dart';
import '../widgets/eyebrow.dart';
import '../widgets/toast.dart';

class AnonymousEmergencyScreen extends StatefulWidget {
  final AnonSOS active;
  final VoidCallback onClear;
  const AnonymousEmergencyScreen({
    super.key,
    required this.active,
    required this.onClear,
  });
  @override
  State<AnonymousEmergencyScreen> createState() =>
      _AnonymousEmergencyScreenState();
}

class _AnonymousEmergencyScreenState extends State<AnonymousEmergencyScreen> {
  EmergencyRecord? _emergency;
  List<InstitutionPin> _matched = [];
  bool _cancelling = false;
  Timer? _pollTimer;
  GoogleMapController? _mapCtrl;

  LatLng get _victim => LatLng(widget.active.victimLat, widget.active.victimLng);

  @override
  void initState() {
    super.initState();
    _poll();
    _matchInstitutions();
    _pollTimer = Timer.periodic(const Duration(seconds: 4), (_) => _poll());
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    super.dispose();
  }

  Future<void> _poll() async {
    try {
      final res = await Api.instance
          .get('/emergencies/anonymous/${widget.active.victimToken}');
      if (res.statusCode != 200) {
        if (!mounted) return;
        showToast(context, 'Your SOS session is no longer active',
            error: true);
        widget.onClear();
        return;
      }
      final data = Api.instance.decode(res);
      final em = data['emergency'];
      if (em is! Map<String, dynamic>) return;
      final rec = EmergencyRecord.fromJson(em);
      if (!mounted) return;
      setState(() => _emergency = rec);
      if (['resolved', 'cancelled', 'expired'].contains(rec.status)) {
        final msg = rec.status == 'resolved'
            ? 'Help has arrived. Stay safe.'
            : rec.status == 'cancelled'
                ? 'SOS cancelled.'
                : 'SOS expired without resolution.';
        showToast(context, msg);
        Future.delayed(const Duration(milliseconds: 1800), () {
          if (mounted) widget.onClear();
        });
      }
    } catch (_) {}
  }

  Future<void> _matchInstitutions() async {
    try {
      final victim = LatLngPoint(_victim.latitude, _victim.longitude);
      final res = await Api.instance.get('/institutions');
      if (res.statusCode != 200) return;
      final data = Api.instance.decode(res);
      final raw = data['institutions'];
      if (raw is! List) return;
      final list = <InstitutionPin>[];
      for (final e in raw) {
        if (e is! Map<String, dynamic>) continue;
        final pin = InstitutionPin.fromJson(e);
        final polygonM = minDistanceToPolygonM(victim, pin.coveragePolygon);
        if (polygonM > kPulseMaxM) continue;
        final reachM = haversineMeters(
            victim, LatLngPoint(pin.centerLat, pin.centerLng));
        list.add(pin.copyWithDistances(polygonM: polygonM, reachM: reachM));
      }
      list.sort((a, b) => a.reachM.compareTo(b.reachM));
      for (final pin in list) {
        final delay =
            (pin.polygonM / kPulseMaxM) * kPulseDurationMs.toDouble();
        Timer(
            Duration(
                milliseconds:
                    delay.toInt().clamp(0, kPulseDurationMs.toInt())), () {
          if (!mounted) return;
          if (_matched.any((m) => m.id == pin.id)) return;
          setState(() => _matched = [..._matched, pin]);
        });
      }
    } catch (_) {}
  }

  Future<void> _cancel() async {
    if (_cancelling) return;
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Cancel this SOS?'),
        content: const Text(
          'Any responders en route will be told to stand down.',
          style: TextStyle(color: SpaersColors.slate600),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('Keep active')),
          FilledButton(
              style:
                  FilledButton.styleFrom(backgroundColor: SpaersColors.brand),
              onPressed: () => Navigator.of(context).pop(true),
              child: const Text('Cancel SOS')),
        ],
      ),
    );
    if (ok != true) return;
    setState(() => _cancelling = true);
    try {
      final res = await Api.instance.post(
        '/emergencies/anonymous/${widget.active.victimToken}/cancel',
      );
      if (res.statusCode < 200 || res.statusCode >= 300) {
        if (!mounted) return;
        final data = Api.instance.decode(res);
        showToast(context, data['error']?.toString() ?? 'Could not cancel',
            error: true);
        setState(() => _cancelling = false);
        return;
      }
      if (!mounted) return;
      showToast(context, 'SOS cancelled');
      widget.onClear();
    } catch (e) {
      if (!mounted) return;
      showToast(context, 'Network error', error: true);
      setState(() => _cancelling = false);
    }
  }

  String _statusLabel() {
    final s = _emergency?.status ?? 'active';
    if (s == 'resolved') return 'Help has arrived';
    if (s == 'cancelled') return 'Cancelled';
    if (s == 'expired') return 'Expired';
    final disp = _emergency?.latestDispatch;
    if (disp != null && disp.startedAt != null) {
      return 'On the way · ${disp.dispatcherName}';
    }
    if (disp != null) {
      return 'Dispatcher notified · ${disp.dispatcherName}';
    }
    return 'Emergency · ${widget.active.type}';
  }

  @override
  Widget build(BuildContext context) {
    final markers = <Marker>{
      Marker(
        markerId: const MarkerId('victim'),
        position: _victim,
        infoWindow: const InfoWindow(title: 'You'),
        icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed),
      ),
      for (final inst in _matched)
        Marker(
          markerId: MarkerId(inst.id),
          position: LatLng(inst.centerLat, inst.centerLng),
          infoWindow: InfoWindow(title: inst.name, snippet: inst.type),
          icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueAzure),
        ),
    };

    return Scaffold(
      body: Stack(
        children: [
          GoogleMap(
            initialCameraPosition: CameraPosition(target: _victim, zoom: 15),
            mapType: MapType.satellite,
            myLocationEnabled: true,
            myLocationButtonEnabled: false,
            zoomControlsEnabled: false,
            onMapCreated: (c) => _mapCtrl = c,
            markers: markers,
            circles: {
              Circle(
                circleId: const CircleId('pulse'),
                center: _victim,
                radius: kPulseMaxM,
                fillColor: SpaersColors.brand.withValues(alpha: 0.06),
                strokeColor: SpaersColors.brand.withValues(alpha: 0.4),
                strokeWidth: 1,
              ),
            },
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            StatusPill(label: _statusLabel()),
                            const SizedBox(height: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 10, vertical: 6),
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.95),
                                borderRadius:
                                    BorderRadius.circular(SpaersRadius.md),
                              ),
                              child: const Text(
                                'Reported as Anonymous',
                                style: TextStyle(
                                    fontSize: 11,
                                    color: SpaersColors.slate600,
                                    fontWeight: FontWeight.w500),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      Column(
                        children: [
                          _RoundIconButton(
                            icon: Icons.my_location,
                            onPressed: () {
                              _mapCtrl?.animateCamera(
                                  CameraUpdate.newLatLngZoom(_victim, 15));
                            },
                          ),
                          const SizedBox(height: 8),
                          ElevatedButton(
                            onPressed: _cancelling ||
                                    !(_emergency?.status == 'active' ||
                                        _emergency?.status == 'dispatched' ||
                                        _emergency == null)
                                ? null
                                : _cancel,
                            style: ElevatedButton.styleFrom(
                              foregroundColor: SpaersColors.rose700,
                              backgroundColor: Colors.white,
                              elevation: 4,
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 16, vertical: 12),
                              shape: RoundedRectangleBorder(
                                borderRadius:
                                    BorderRadius.circular(SpaersRadius.md),
                              ),
                            ),
                            child: Text(_cancelling ? 'Cancelling…' : 'Cancel',
                                style: const TextStyle(
                                    fontWeight: FontWeight.w700)),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const Spacer(),
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(SpaersRadius.lg),
                      boxShadow: const [
                        BoxShadow(
                          color: Color(0x33000000),
                          blurRadius: 12,
                          offset: Offset(0, 4),
                        )
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Padding(
                          padding: const EdgeInsets.fromLTRB(12, 10, 12, 6),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Eyebrow('Notified institutions'),
                              const SizedBox(height: 2),
                              Text(
                                _matched.isEmpty
                                    ? 'Searching coverage areas…'
                                    : '${_matched.length} can respond',
                                style: const TextStyle(
                                    fontSize: 11,
                                    color: SpaersColors.slate400),
                              ),
                            ],
                          ),
                        ),
                        ConstrainedBox(
                          constraints: const BoxConstraints(maxHeight: 240),
                          child: ListView.separated(
                            shrinkWrap: true,
                            padding: EdgeInsets.zero,
                            itemBuilder: (_, i) => _matchedItem(_matched[i]),
                            separatorBuilder: (_, __) => const Divider(
                                height: 1, color: SpaersColors.slate100),
                            itemCount: _matched.length,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _matchedItem(InstitutionPin inst) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            inst.name,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: SpaersColors.slate800),
          ),
          Text(inst.type,
              style: const TextStyle(
                  fontSize: 11, color: SpaersColors.slate500)),
          const SizedBox(height: 4),
          Row(
            children: [
              const Eyebrow('Distance'),
              const Spacer(),
              Text(
                '${inst.reachM.round()} m',
                style: const TextStyle(
                    fontFamily: 'monospace',
                    fontSize: 11,
                    color: SpaersColors.slate700),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _RoundIconButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onPressed;
  const _RoundIconButton({required this.icon, required this.onPressed});
  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      elevation: 4,
      borderRadius: BorderRadius.circular(SpaersRadius.md),
      child: InkWell(
        onTap: onPressed,
        borderRadius: BorderRadius.circular(SpaersRadius.md),
        child: SizedBox(
          width: 44,
          height: 44,
          child: Icon(icon, size: 18, color: SpaersColors.slate700),
        ),
      ),
    );
  }
}
