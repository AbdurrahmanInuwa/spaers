import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:provider/provider.dart';

import '../api/emergency_provider.dart';
import '../models/emergency.dart';
import '../theme.dart';
import '../utils/location.dart';
import '../widgets/eyebrow.dart';
import '../widgets/sos_button.dart';
import '../widgets/toast.dart';

class DashboardEmergencyScreen extends StatefulWidget {
  const DashboardEmergencyScreen({super.key});
  @override
  State<DashboardEmergencyScreen> createState() =>
      _DashboardEmergencyScreenState();
}

class _DashboardEmergencyScreenState extends State<DashboardEmergencyScreen> {
  GoogleMapController? _mapCtrl;

  Future<void> _trigger(EmergencyProvider em) async {
    try {
      final loc = await getCurrentLocation();
      final ok = await em.triggerSOS(loc.point);
      if (!mounted) return;
      if (!ok) {
        showToast(context, 'Could not send SOS', error: true);
      }
    } on LocationDeniedException catch (e) {
      if (!mounted) return;
      showToast(context, e.message, error: true);
    } catch (e) {
      if (!mounted) return;
      showToast(context, 'Could not get your location', error: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final em = context.watch<EmergencyProvider>();
    if (em.triggered && em.location != null) {
      return _TriggeredView(mapCtrlSetter: (c) => _mapCtrl = c, mapCtrlGetter: () => _mapCtrl);
    }
    return _DefaultView(onTrigger: () => _trigger(em));
  }
}

class _DefaultView extends StatelessWidget {
  final VoidCallback onTrigger;
  const _DefaultView({required this.onTrigger});
  @override
  Widget build(BuildContext context) {
    final em = context.watch<EmergencyProvider>();
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Eyebrow('Choose emergency type'),
            const SizedBox(height: 14),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final t in kEmergencyTypes)
                  _TypeChip(
                    label: t,
                    selected: em.selected == t,
                    onTap: () => em.setSelected(t),
                  ),
              ],
            ),
            const Spacer(),
            Center(
              child: SosButton(
                size: 240,
                loading: em.submitting,
                onPressed: em.submitting ? null : onTrigger,
              ),
            ),
            const Spacer(flex: 2),
          ],
        ),
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
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(SpaersRadius.md),
      child: Container(
        padding:
            const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
        decoration: BoxDecoration(
          color: selected ? SpaersColors.brand : Colors.white,
          border: Border.all(
              color: selected ? SpaersColors.brand : SpaersColors.slate200),
          borderRadius: BorderRadius.circular(SpaersRadius.md),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: selected ? Colors.white : SpaersColors.slate700,
            fontSize: 13,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }
}

class _TriggeredView extends StatelessWidget {
  final void Function(GoogleMapController) mapCtrlSetter;
  final GoogleMapController? Function() mapCtrlGetter;
  const _TriggeredView({
    required this.mapCtrlSetter,
    required this.mapCtrlGetter,
  });

  String _statusLabel(EmergencyProvider em) {
    if (em.emergencyStatus == 'resolved') return 'Resolved';
    final disp = em.dispatch;
    if (disp != null && disp.startedAt != null) {
      return 'On the way · ${disp.dispatcherName}';
    }
    if (disp != null) return 'Dispatcher notified · ${disp.dispatcherName}';
    return 'Emergency · ${em.selected}';
  }

  @override
  Widget build(BuildContext context) {
    final em = context.watch<EmergencyProvider>();
    final loc = em.location!;
    final markers = <Marker>{
      Marker(
        markerId: const MarkerId('me'),
        position: LatLng(loc.lat, loc.lng),
        icon:
            BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed),
        infoWindow: const InfoWindow(title: 'You'),
      ),
      for (final inst in em.matched)
        Marker(
          markerId: MarkerId(inst.id),
          position: LatLng(inst.centerLat, inst.centerLng),
          icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueAzure),
          infoWindow: InfoWindow(title: inst.name, snippet: inst.type),
        ),
    };
    return Stack(
      children: [
        GoogleMap(
          initialCameraPosition: CameraPosition(
            target: LatLng(loc.lat, loc.lng),
            zoom: 15,
          ),
          mapType: MapType.satellite,
          myLocationEnabled: true,
          myLocationButtonEnabled: false,
          zoomControlsEnabled: false,
          markers: markers,
          circles: {
            Circle(
              circleId: const CircleId('pulse'),
              center: LatLng(loc.lat, loc.lng),
              radius: kPulseMaxM,
              fillColor: SpaersColors.brand.withValues(alpha: 0.06),
              strokeColor: SpaersColors.brand.withValues(alpha: 0.4),
              strokeWidth: 1,
            ),
          },
          onMapCreated: mapCtrlSetter,
        ),
        SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(child: StatusPill(label: _statusLabel(em))),
                const SizedBox(width: 8),
                Column(
                  children: [
                    _CircleAction(
                      icon: Icons.my_location,
                      onPressed: () {
                        mapCtrlGetter()?.animateCamera(
                            CameraUpdate.newLatLngZoom(
                                LatLng(loc.lat, loc.lng), 15));
                      },
                    ),
                    const SizedBox(height: 8),
                    ElevatedButton(
                      onPressed: em.dispatchStarted ? null : em.reset,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.white,
                        foregroundColor: SpaersColors.slate700,
                        elevation: 4,
                        padding: const EdgeInsets.symmetric(
                            horizontal: 16, vertical: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius:
                              BorderRadius.circular(SpaersRadius.md),
                        ),
                      ),
                      child: const Text('Cancel',
                          style: TextStyle(fontWeight: FontWeight.w700)),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
        Align(
          alignment: Alignment.bottomCenter,
          child: SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              child: _MatchedList(matched: em.matched),
            ),
          ),
        ),
      ],
    );
  }
}

class _MatchedList extends StatelessWidget {
  final List<InstitutionPin> matched;
  const _MatchedList({required this.matched});
  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(SpaersRadius.lg),
        boxShadow: const [
          BoxShadow(
              color: Color(0x33000000),
              blurRadius: 12,
              offset: Offset(0, 4))
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
                const Eyebrow('Available institutions'),
                Text(
                  matched.isEmpty
                      ? 'Searching coverage areas…'
                      : '${matched.length} can respond',
                  style: const TextStyle(
                      fontSize: 11, color: SpaersColors.slate400),
                ),
              ],
            ),
          ),
          ConstrainedBox(
            constraints: const BoxConstraints(maxHeight: 220),
            child: ListView.separated(
              shrinkWrap: true,
              padding: EdgeInsets.zero,
              itemBuilder: (_, i) {
                final inst = matched[i];
                return Padding(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(inst.name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: SpaersColors.slate800)),
                      Text(inst.type,
                          style: const TextStyle(
                              fontSize: 11, color: SpaersColors.slate500)),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          const Eyebrow('Distance'),
                          const Spacer(),
                          Text('${inst.reachM.round()} m',
                              style: const TextStyle(
                                  fontFamily: 'monospace',
                                  fontSize: 11,
                                  color: SpaersColors.slate700)),
                        ],
                      ),
                      if (inst.insideCoverage) ...[
                        const SizedBox(height: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: SpaersColors.emerald50,
                            border:
                                Border.all(color: SpaersColors.emerald200),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Container(
                                width: 6,
                                height: 6,
                                decoration: const BoxDecoration(
                                    color: SpaersColors.emerald500,
                                    shape: BoxShape.circle),
                              ),
                              const SizedBox(width: 6),
                              Text('You are within ${inst.name}',
                                  style: const TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.w600,
                                      color: SpaersColors.emerald700)),
                            ],
                          ),
                        ),
                      ]
                    ],
                  ),
                );
              },
              separatorBuilder: (_, __) =>
                  const Divider(height: 1, color: SpaersColors.slate100),
              itemCount: matched.length,
            ),
          ),
        ],
      ),
    );
  }
}

class _CircleAction extends StatelessWidget {
  final IconData icon;
  final VoidCallback onPressed;
  const _CircleAction({required this.icon, required this.onPressed});
  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      elevation: 4,
      borderRadius: BorderRadius.circular(SpaersRadius.md),
      child: InkWell(
        onTap: onPressed,
        borderRadius: BorderRadius.circular(SpaersRadius.md),
        child: const SizedBox(
          width: 44,
          height: 44,
          child: Icon(Icons.my_location,
              size: 18, color: SpaersColors.slate700),
        ),
      ),
    );
  }
}
