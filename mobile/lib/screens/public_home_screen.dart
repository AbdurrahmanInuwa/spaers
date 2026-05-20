import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../api/api.dart';
import '../api/emergency_provider.dart';
import '../theme.dart';
import '../utils/geometry.dart';
import '../utils/location.dart';
import '../widgets/sos_button.dart';
import '../widgets/sos_type_sheet.dart';
import '../widgets/toast.dart';
import 'anonymous_emergency_screen.dart';

const _kTypes = ['Shooting', 'Medical', 'Assault', 'Fire', 'Flooding'];

class PublicHomeScreen extends StatefulWidget {
  const PublicHomeScreen({super.key});
  @override
  State<PublicHomeScreen> createState() => _PublicHomeScreenState();
}

class _PublicHomeScreenState extends State<PublicHomeScreen> {
  LatLngPoint? _location;
  AnonSOS? _activeSOS;
  String _selectedType = 'Medical';
  bool _firing = false;

  @override
  void initState() {
    super.initState();
    _bootstrap();
  }

  Future<void> _bootstrap() async {
    final restored = await AnonSOSStorage.load();
    if (!mounted) return;
    if (restored != null) {
      setState(() => _activeSOS = restored);
      return;
    }
    // Silent prefetch; permission popup is OS-driven. If the user denies,
    // tapping SOS will surface the denial via toast.
    _ensureLocation(silent: true);
  }

  Future<bool> _ensureLocation({bool silent = false}) async {
    try {
      final loc = await getCurrentLocation();
      if (!mounted) return false;
      setState(() => _location = loc.point);
      return true;
    } on LocationDeniedException catch (e) {
      if (!silent && mounted) {
        showToast(context, e.message, error: true);
      }
      return false;
    } catch (_) {
      if (!silent && mounted) {
        showToast(context, 'Could not get your location.', error: true);
      }
      return false;
    }
  }

  Future<void> _fireSOS() async {
    if (_firing) return;
    _firing = true;
    try {
      if (_location == null) {
        final ok = await _ensureLocation();
        if (!ok || _location == null) return;
      }
      if (!mounted) return;
      final go = await showSosCountdown(context, _selectedType);
      if (!go || !mounted) return;
      final res = await Api.instance.post('/emergencies/anonymous', body: {
        'type': _selectedType,
        'lat': _location!.lat,
        'lng': _location!.lng,
      });
      final data = Api.instance.decode(res);
      if (res.statusCode < 200 || res.statusCode >= 300) {
        if (!mounted) return;
        showToast(context, data['error']?.toString() ?? 'Could not send SOS',
            error: true);
        return;
      }
      final sos = AnonSOS(
        emergencyId: data['emergencyId']?.toString() ?? '',
        victimToken: data['victimToken']?.toString() ?? '',
        type: data['type']?.toString() ?? _selectedType,
        victimLat: (data['victimLat'] as num?)?.toDouble() ?? _location!.lat,
        victimLng: (data['victimLng'] as num?)?.toDouble() ?? _location!.lng,
        createdAt: DateTime.tryParse(data['createdAt']?.toString() ?? '') ??
            DateTime.now(),
        expiresAt: DateTime.tryParse(data['expiresAt']?.toString() ?? '') ??
            DateTime.now().add(const Duration(hours: 4)),
      );
      await AnonSOSStorage.save(sos);
      if (!mounted) return;
      setState(() => _activeSOS = sos);
    } catch (e) {
      if (!mounted) return;
      showToast(context, 'Network error. Please try again.', error: true);
    } finally {
      _firing = false;
    }
  }

  void _clearAnonymousSOS() {
    AnonSOSStorage.clear();
    if (!mounted) return;
    setState(() => _activeSOS = null);
  }

  @override
  Widget build(BuildContext context) {
    if (_activeSOS != null) {
      return AnonymousEmergencyScreen(
        active: _activeSOS!,
        onClear: _clearAnonymousSOS,
      );
    }
    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'SPAERS',
          style: TextStyle(
            color: SpaersColors.brand,
            fontWeight: FontWeight.w800,
            letterSpacing: -0.5,
            fontSize: 22,
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pushNamed('/signin'),
            child: const Text(
              'Sign in',
              style: TextStyle(
                color: SpaersColors.brand,
                fontWeight: FontWeight.w700,
                fontSize: 13,
              ),
            ),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Center(
            child: LayoutBuilder(builder: (context, constraints) {
            // Fit the radial layout to the smaller dimension of the viewport,
            // capped so it never feels oversized on tablets.
            final available = math.min(
              constraints.maxWidth - 24,
              constraints.maxHeight - 24,
            );
            final side = available.clamp(280.0, 380.0).toDouble();
            return _RadialSosLayout(
              side: side,
              selected: _selectedType,
              onSelect: (t) => setState(() => _selectedType = t),
              onFire: _fireSOS,
            );
            }),
          ),
        ),
      ),
    );
  }
}

class _RadialSosLayout extends StatelessWidget {
  final double side;
  final String selected;
  final ValueChanged<String> onSelect;
  final VoidCallback onFire;

  const _RadialSosLayout({
    required this.side,
    required this.selected,
    required this.onSelect,
    required this.onFire,
  });

  @override
  Widget build(BuildContext context) {
    // Geometry: 5 chips evenly distributed around a circle, starting at -90°
    // (top) and stepping by 72°. Chip orbit radius is ~42% of the container
    // side; SOS button is ~46% of the side and centered.
    final chipRadius = side * 0.42;
    final sosSize = side * 0.46;
    const chipWidth = 110.0;
    const chipHeight = 40.0;
    const startAngleDeg = -90.0;
    const stepDeg = 360.0 / 5;

    final positionedChips = <Widget>[];
    for (var i = 0; i < _kTypes.length; i++) {
      final type = _kTypes[i];
      final angleRad = (startAngleDeg + i * stepDeg) * math.pi / 180;
      final dx = chipRadius * math.cos(angleRad);
      final dy = chipRadius * math.sin(angleRad);
      // Chip center sits at (side/2 + dx, side/2 + dy)
      positionedChips.add(Positioned(
        left: side / 2 + dx - chipWidth / 2,
        top: side / 2 + dy - chipHeight / 2,
        width: chipWidth,
        height: chipHeight,
        child: _TypeChip(
          label: type,
          selected: selected == type,
          onTap: () => onSelect(type),
        ),
      ));
    }

    return SizedBox(
      width: side,
      height: side,
      child: Stack(
        alignment: Alignment.center,
        clipBehavior: Clip.none,
        children: [
          ...positionedChips,
          SosButton(
            size: sosSize,
            onPressed: onFire,
          ),
        ],
      ),
    );
  }
}

class _TypeChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;
  const _TypeChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });
  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(SpaersRadius.md),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 120),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: selected ? SpaersColors.brand : Colors.white,
            border: Border.all(
              color: selected ? SpaersColors.brand : SpaersColors.slate200,
            ),
            borderRadius: BorderRadius.circular(SpaersRadius.md),
            boxShadow: const [
              BoxShadow(
                color: Color(0x14000000),
                blurRadius: 4,
                offset: Offset(0, 1),
              ),
            ],
          ),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: selected ? Colors.white : SpaersColors.slate700,
            ),
          ),
        ),
      ),
    );
  }
}
