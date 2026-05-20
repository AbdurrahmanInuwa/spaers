import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:video_player/video_player.dart';

import '../api/api.dart';
import '../models/dispatcher.dart';
import '../models/incident.dart';
import '../models/my_report.dart' show ReportAttachment;
import '../theme.dart';
import '../utils/time_ago.dart';
import '../widgets/incident_chips.dart';
import '../widgets/stat_tile.dart';
import '../widgets/toast.dart';

/// "Incident Command" — institution-facing feed of every emergency in the
/// signed-in institution's coverage polygon. Pulls from
/// `GET /api/emergencies/incidents`, polls every 15 s, and lets the user
/// filter by status and priority client-side.
class IncidentCommandScreen extends StatefulWidget {
  const IncidentCommandScreen({super.key});
  @override
  State<IncidentCommandScreen> createState() => _IncidentCommandScreenState();
}

const _kPollMs = 15_000;

class _IncidentCommandScreenState extends State<IncidentCommandScreen> {
  List<Incident>? _incidents; // null = loading
  String? _error;
  bool _refreshing = false;
  Timer? _poller;

  // Filter state — null means "All".
  IncidentStatus? _statusFilter;
  String? _priorityFilter;

  // Dispatchers — fetched once, reused by the assign bottom sheet.
  List<Dispatcher> _dispatchers = const [];

  @override
  void initState() {
    super.initState();
    _load();
    _loadDispatchers();
    _poller = Timer.periodic(
      const Duration(milliseconds: _kPollMs),
      (_) => _load(silent: true),
    );
  }

  Future<void> _loadDispatchers() async {
    try {
      final res = await Api.instance.get('/dispatchers');
      if (res.statusCode != 200) return;
      final data = Api.instance.decode(res);
      final raw = data['dispatchers'];
      if (raw is! List) return;
      final list = <Dispatcher>[];
      for (final m in raw) {
        if (m is Map<String, dynamic>) list.add(Dispatcher.fromJson(m));
      }
      if (mounted) setState(() => _dispatchers = list);
    } catch (_) {}
  }

  /// Open the bottom sheet, let the responder pick a dispatcher, then run
  /// the two-step backend flow that the legacy emergency dashboard uses:
  /// mint an admin token → POST it to the public dispatch endpoint with the
  /// chosen dispatcherId. On success we reload so the card flips to In
  /// Progress with the assigned dispatcher's name.
  Future<void> _openAssignSheet(Incident incident) async {
    if (_dispatchers.isEmpty) {
      showToast(
        context,
        'No dispatchers on file. Add one on the web dashboard.',
        error: true,
      );
      return;
    }
    final dispatcherId = await showModalBottomSheet<String>(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (_) => _AssignDispatcherSheet(
        incident: incident,
        dispatchers: _dispatchers,
      ),
    );
    if (dispatcherId == null) return;
    await _assignDispatcher(incident, dispatcherId);
  }

  Future<void> _assignDispatcher(
    Incident incident,
    String dispatcherId,
  ) async {
    try {
      final tokenRes = await Api.instance.post(
        '/emergencies/${incident.id}/admin-token',
      );
      final tokenData = Api.instance.decode(tokenRes);
      if (tokenRes.statusCode < 200 || tokenRes.statusCode >= 300) {
        if (!mounted) return;
        showToast(
          context,
          tokenData['error']?.toString() ?? 'Could not open dispatch',
          error: true,
        );
        return;
      }
      final token = tokenData['token']?.toString();
      if (token == null || token.isEmpty) {
        if (!mounted) return;
        showToast(context, 'Bad dispatch token response', error: true);
        return;
      }
      // The /public/e/:token/dispatch endpoint is unauthenticated — the token
      // is the authorization. We bypass Api.instance's cookie handling here
      // and POST directly via the raw http client.
      final base = Api.baseUrl;
      final dispatchRes = await http.post(
        Uri.parse('$base/public/e/$token/dispatch'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'dispatcherId': dispatcherId}),
      );
      Map<String, dynamic> dispatchData = const {};
      try {
        final v = jsonDecode(dispatchRes.body);
        if (v is Map<String, dynamic>) dispatchData = v;
      } catch (_) {}
      if (dispatchRes.statusCode < 200 || dispatchRes.statusCode >= 300) {
        if (!mounted) return;
        showToast(
          context,
          dispatchData['error']?.toString() ?? 'Dispatch failed',
          error: true,
        );
        return;
      }
      if (!mounted) return;
      showToast(context, 'Dispatcher assigned');
      await _load(silent: true);
    } catch (_) {
      if (!mounted) return;
      showToast(context, 'Network error', error: true);
    }
  }

  @override
  void dispose() {
    _poller?.cancel();
    super.dispose();
  }

  Future<void> _load({bool silent = false, bool pull = false}) async {
    if (!silent) {
      setState(() {
        _error = null;
        if (pull) _refreshing = true;
      });
    }
    try {
      final res = await Api.instance.get('/emergencies/incidents');
      final data = Api.instance.decode(res);
      if (res.statusCode < 200 || res.statusCode >= 300) {
        setState(() {
          _error = data['error']?.toString() ?? 'Could not load incidents';
          _incidents = const [];
        });
        return;
      }
      final raw = data['emergencies'];
      final list = <Incident>[];
      if (raw is List) {
        for (final m in raw) {
          if (m is Map<String, dynamic>) list.add(Incident.fromJson(m));
        }
      }
      setState(() => _incidents = list);
    } catch (_) {
      setState(() {
        _error = 'Network error';
        _incidents = _incidents ?? const [];
      });
    } finally {
      if (mounted && _refreshing) setState(() => _refreshing = false);
    }
  }

  List<Incident> _filtered(List<Incident> all) {
    return all.where((i) {
      if (_statusFilter != null && mapBackendStatus(i.status) != _statusFilter) {
        return false;
      }
      if (_priorityFilter != null && i.priority != _priorityFilter) {
        return false;
      }
      return true;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final all = _incidents ?? const <Incident>[];
    final total = all.length;
    final active = all.where(
      (i) => i.status == 'active' || i.status == 'dispatched',
    ).length;
    final critical = all.where((i) => i.priority == 'critical').length;
    final pending = all.where((i) => i.status == 'active').length;
    final filtered = _filtered(all);

    return RefreshIndicator(
      color: SpaersColors.brand,
      onRefresh: () => _load(pull: true),
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
        children: [
          // Stats — 2x2
          Row(
            children: [
              Expanded(child: StatTile(label: 'Total', value: '$total')),
              const SizedBox(width: 10),
              Expanded(
                child: StatTile(
                  label: 'Active',
                  value: '$active',
                  valueColor: SpaersColors.brand,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: StatTile(
                  label: 'Critical',
                  value: '$critical',
                  valueColor: SpaersColors.brand,
                  highlight: critical > 0,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: StatTile(
                  label: 'Pending',
                  value: '$pending',
                  valueColor: SpaersColors.amber800,
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Status filter
          const _FilterLabel('Filter by status'),
          const SizedBox(height: 8),
          _FilterRow<IncidentStatus>(
            current: _statusFilter,
            options: const [
              _FilterOpt(null, 'All'),
              _FilterOpt(IncidentStatus.pending, 'Pending'),
              _FilterOpt(IncidentStatus.inProgress, 'In Progress'),
              _FilterOpt(IncidentStatus.resolved, 'Resolved'),
            ],
            onChanged: (v) => setState(() => _statusFilter = v),
          ),
          const SizedBox(height: 14),

          // Priority filter
          const _FilterLabel('Filter by priority'),
          const SizedBox(height: 8),
          _FilterRow<String>(
            current: _priorityFilter,
            options: const [
              _FilterOpt(null, 'All'),
              _FilterOpt('low', 'Low'),
              _FilterOpt('medium', 'Medium'),
              _FilterOpt('high', 'High'),
              _FilterOpt('critical', 'Critical'),
            ],
            onChanged: (v) => setState(() => _priorityFilter = v),
          ),
          const SizedBox(height: 14),

          // Result count
          Text(
            '${filtered.length} incident${filtered.length == 1 ? '' : 's'} found'
                .toUpperCase(),
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              color: SpaersColors.slate500,
              letterSpacing: 1.4,
            ),
          ),
          const SizedBox(height: 10),

          if (_incidents == null)
            const _LoadingTile()
          else if (filtered.isEmpty)
            _EmptyTile(
              isUnfiltered:
                  _statusFilter == null && _priorityFilter == null,
              error: _error,
            )
          else
            ..._buildCards(filtered),
        ],
      ),
    );
  }

  List<Widget> _buildCards(List<Incident> list) {
    final out = <Widget>[];
    for (var i = 0; i < list.length; i++) {
      final inc = list[i];
      out.add(_IncidentCard(
        incident: inc,
        canAssign: inc.status == 'active' && _dispatchers.isNotEmpty,
        onAssign: () => _openAssignSheet(inc),
      ));
      if (i != list.length - 1) out.add(const SizedBox(height: 12));
    }
    return out;
  }
}

// ── card ─────────────────────────────────────────────────────────────────

class _IncidentCard extends StatelessWidget {
  final Incident incident;
  final bool canAssign;
  final VoidCallback? onAssign;
  const _IncidentCard({
    required this.incident,
    this.canAssign = false,
    this.onAssign,
  });

  IncidentPriority _priorityFromString(String? s) {
    switch (s) {
      case 'critical':
        return IncidentPriority.critical;
      case 'high':
        return IncidentPriority.high;
      case 'medium':
        return IncidentPriority.medium;
      case 'low':
      default:
        return IncidentPriority.low;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isCritical = incident.priority == 'critical';
    final status = mapBackendStatus(incident.status);
    final reporter = incident.anonymous
        ? 'Anonymous'
        : (incident.citizen?.displayName.isNotEmpty == true
            ? incident.citizen!.displayName
            : 'Anonymous');

    return Container(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(SpaersRadius.xl),
        border: Border.all(
          color: isCritical ? SpaersColors.brand : SpaersColors.slate200,
          width: isCritical ? 1.5 : 1,
        ),
        boxShadow: isCritical
            ? const [
                BoxShadow(
                  color: Color(0x33DC2626),
                  blurRadius: 12,
                  offset: Offset(0, 4),
                ),
              ]
            : const [
                BoxShadow(
                  color: Color(0x0F000000),
                  blurRadius: 4,
                  offset: Offset(0, 1),
                ),
              ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Wrap(
                  crossAxisAlignment: WrapCrossAlignment.center,
                  spacing: 8,
                  runSpacing: 4,
                  children: [
                    Text(
                      incident.type,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: SpaersColors.slate900,
                      ),
                    ),
                    if (incident.isPanic) const PanicTag(),
                  ],
                ),
              ),
              if (incident.priority != null)
                IncidentPriorityChip(
                  priority: _priorityFromString(incident.priority),
                ),
            ],
          ),
          const SizedBox(height: 2),
          Text.rich(
            TextSpan(children: [
              TextSpan(
                text: timeAgo(incident.createdAt),
                style: const TextStyle(
                    fontSize: 12, color: SpaersColors.slate500),
              ),
              const TextSpan(
                text: ' · ',
                style: TextStyle(
                    fontSize: 12, color: SpaersColors.slate400),
              ),
              TextSpan(
                text: reporter,
                style: TextStyle(
                  fontSize: 12,
                  color: incident.anonymous
                      ? SpaersColors.slate400
                      : SpaersColors.slate600,
                  fontStyle:
                      incident.anonymous ? FontStyle.italic : null,
                ),
              ),
            ]),
          ),
          if (incident.notes != null && incident.notes!.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              incident.notes!,
              style: const TextStyle(
                fontSize: 14,
                color: SpaersColors.slate700,
                height: 1.4,
              ),
            ),
          ],
          if (incident.dispatch != null) ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.symmetric(
                  horizontal: 10, vertical: 8),
              decoration: BoxDecoration(
                color: SpaersColors.slate50,
                borderRadius: BorderRadius.circular(SpaersRadius.md),
                border: Border.all(color: SpaersColors.slate100),
              ),
              child: Row(
                children: [
                  const Icon(Icons.access_time,
                      size: 14, color: SpaersColors.slate400),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text.rich(
                      TextSpan(
                        children: [
                          const TextSpan(
                            text: 'Dispatcher: ',
                            style: TextStyle(
                                fontSize: 12,
                                color: SpaersColors.slate600),
                          ),
                          TextSpan(
                            text: incident.dispatch!.dispatcherName.isNotEmpty
                                ? incident.dispatch!.dispatcherName
                                : '—',
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: SpaersColors.slate800,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
          if (incident.attachments.isNotEmpty) ...[
            const SizedBox(height: 10),
            _AttachmentsStrip(attachments: incident.attachments),
          ],
          const SizedBox(height: 10),
          Row(
            children: [
              if (incident.address != null && incident.address!.isNotEmpty) ...[
                const Icon(Icons.place_outlined,
                    size: 14, color: SpaersColors.slate400),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    incident.address!,
                    style: const TextStyle(
                        fontSize: 12, color: SpaersColors.slate500),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ] else if (incident.victimLat != null &&
                  incident.victimLng != null) ...[
                Expanded(
                  child: Text(
                    '${incident.victimLat!.toStringAsFixed(4)}, ${incident.victimLng!.toStringAsFixed(4)}',
                    style: const TextStyle(
                      fontSize: 11,
                      fontFamily: 'monospace',
                      color: SpaersColors.slate400,
                    ),
                  ),
                ),
              ] else
                const Spacer(),
              IncidentStatusChip(status: status),
            ],
          ),
          if (canAssign) ...[
            const SizedBox(height: 12),
            const Divider(height: 1, color: SpaersColors.slate100),
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: onAssign,
                style: FilledButton.styleFrom(
                  backgroundColor: SpaersColors.brand,
                  foregroundColor: Colors.white,
                  padding:
                      const EdgeInsets.symmetric(vertical: 11),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(SpaersRadius.md),
                  ),
                ),
                icon: const Icon(Icons.person_add_alt, size: 16),
                label: const Text(
                  'ASSIGN DISPATCHER',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 1.2,
                  ),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

// ── assign dispatcher bottom sheet ──────────────────────────────────────

class _AssignDispatcherSheet extends StatefulWidget {
  final Incident incident;
  final List<Dispatcher> dispatchers;
  const _AssignDispatcherSheet({
    required this.incident,
    required this.dispatchers,
  });
  @override
  State<_AssignDispatcherSheet> createState() => _AssignDispatcherSheetState();
}

class _AssignDispatcherSheetState extends State<_AssignDispatcherSheet> {
  String? _selectedId;

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.65,
      minChildSize: 0.4,
      maxChildSize: 0.9,
      expand: false,
      builder: (_, scroll) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: Column(
          children: [
            // Drag handle
            Container(
              width: 40,
              height: 4,
              margin: const EdgeInsets.only(top: 10, bottom: 10),
              decoration: BoxDecoration(
                color: SpaersColors.slate200,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            // Header
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 4, 20, 12),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Assign dispatcher',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                            color: SpaersColors.slate900,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${widget.incident.type} · pick a responder to send to this incident.',
                          style: const TextStyle(
                            fontSize: 12,
                            color: SpaersColors.slate500,
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    color: SpaersColors.slate400,
                    onPressed: () => Navigator.of(context).pop(),
                    tooltip: 'Close',
                  ),
                ],
              ),
            ),
            const Divider(height: 1, color: SpaersColors.slate200),
            // List
            Expanded(
              child: widget.dispatchers.isEmpty
                  ? const Padding(
                      padding: EdgeInsets.all(24),
                      child: Text(
                        'No dispatchers on file. Add one on the web dashboard.',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontStyle: FontStyle.italic,
                          color: SpaersColors.slate500,
                        ),
                      ),
                    )
                  : RadioGroup<String>(
                      groupValue: _selectedId,
                      onChanged: (v) => setState(() => _selectedId = v),
                      child: ListView.separated(
                        controller: scroll,
                        padding:
                            const EdgeInsets.fromLTRB(20, 12, 20, 8),
                        itemBuilder: (_, i) {
                          final d = widget.dispatchers[i];
                          final isSelected = _selectedId == d.id;
                          return InkWell(
                            onTap: () =>
                                setState(() => _selectedId = d.id),
                            borderRadius:
                                BorderRadius.circular(SpaersRadius.md),
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 12, vertical: 10),
                              decoration: BoxDecoration(
                                color: isSelected
                                    ? const Color(0xFFFFF5F5)
                                    : Colors.white,
                                border: Border.all(
                                  color: isSelected
                                      ? SpaersColors.brand
                                      : SpaersColors.slate200,
                                ),
                                borderRadius: BorderRadius.circular(
                                    SpaersRadius.md),
                              ),
                              child: Row(
                                children: [
                                  Radio<String>(
                                    value: d.id,
                                    activeColor: SpaersColors.brand,
                                  ),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          d.name,
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: const TextStyle(
                                            fontSize: 14,
                                            fontWeight: FontWeight.w700,
                                            color: SpaersColors.slate900,
                                          ),
                                        ),
                                        const SizedBox(height: 2),
                                        Text(
                                          '${d.dispatcherId.toUpperCase()} · ${d.mode}',
                                          style: const TextStyle(
                                            fontSize: 11,
                                            fontFamily: 'monospace',
                                            color: SpaersColors.slate500,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                        separatorBuilder: (_, __) =>
                            const SizedBox(height: 8),
                        itemCount: widget.dispatchers.length,
                      ),
                    ),
            ),
            // Confirm bar
            SafeArea(
              top: false,
              child: Container(
                padding: const EdgeInsets.fromLTRB(20, 12, 20, 16),
                decoration: const BoxDecoration(
                  color: Colors.white,
                  border: Border(
                    top: BorderSide(color: SpaersColors.slate200),
                  ),
                ),
                child: SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: _selectedId == null
                        ? null
                        : () => Navigator.of(context).pop(_selectedId),
                    style: FilledButton.styleFrom(
                      backgroundColor: SpaersColors.brand,
                      foregroundColor: Colors.white,
                      disabledBackgroundColor: SpaersColors.slate200,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius:
                            BorderRadius.circular(SpaersRadius.md),
                      ),
                    ),
                    child: const Text(
                      'Send dispatcher',
                      style: TextStyle(
                          fontSize: 14, fontWeight: FontWeight.w700),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _AttachmentsStrip extends StatelessWidget {
  final List<ReportAttachment> attachments;
  const _AttachmentsStrip({required this.attachments});

  void _open(BuildContext context, ReportAttachment a) {
    Navigator.of(context).push(
      MaterialPageRoute(
        fullscreenDialog: true,
        builder: (_) => _MediaViewerScreen(attachment: a),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 64,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemBuilder: (_, i) {
          final a = attachments[i];
          final isVideo = a.mediaType == 'video';
          return FutureBuilder<String?>(
            future: getSignedDownloadUrl(a.mediaKey),
            builder: (_, snap) {
              final url = snap.data;
              return InkWell(
                borderRadius: BorderRadius.circular(SpaersRadius.md),
                onTap: () => _open(context, a),
                child: Container(
                  width: 64,
                  height: 64,
                  clipBehavior: Clip.antiAlias,
                  decoration: BoxDecoration(
                    color: isVideo ? SpaersColors.slate900 : SpaersColors.slate100,
                    borderRadius: BorderRadius.circular(SpaersRadius.md),
                    border: Border.all(color: SpaersColors.slate200),
                  ),
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      if (url == null)
                        const Center(
                          child: Icon(Icons.image_outlined,
                              color: SpaersColors.slate400, size: 22),
                        )
                      else if (isVideo)
                        // We don't render video frames here — too heavy for a
                        // 64×64 strip. Just show a dark tile with a play badge.
                        const SizedBox.shrink()
                      else
                        Image.network(
                          url,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => const Icon(
                            Icons.broken_image_outlined,
                            color: SpaersColors.slate400,
                            size: 22,
                          ),
                        ),
                      if (isVideo && url != null)
                        const Center(
                          child: Icon(Icons.play_arrow_rounded,
                              color: Colors.white, size: 28),
                        ),
                      if (isVideo)
                        const Positioned(
                          right: 2,
                          bottom: 2,
                          child: _VideoBadge(),
                        ),
                    ],
                  ),
                ),
              );
            },
          );
        },
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemCount: attachments.length,
      ),
    );
  }
}

class _VideoBadge extends StatelessWidget {
  const _VideoBadge();
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.6),
        borderRadius: BorderRadius.circular(3),
      ),
      child: const Text(
        'VIDEO',
        style: TextStyle(
          color: Colors.white,
          fontSize: 8,
          fontWeight: FontWeight.w800,
          letterSpacing: 1.1,
        ),
      ),
    );
  }
}

/// Fullscreen media viewer. Displays a photo with InteractiveViewer pinch-zoom
/// or plays a video using the `video_player` package. Tap outside or use the
/// back arrow to dismiss.
class _MediaViewerScreen extends StatefulWidget {
  final ReportAttachment attachment;
  const _MediaViewerScreen({required this.attachment});
  @override
  State<_MediaViewerScreen> createState() => _MediaViewerScreenState();
}

class _MediaViewerScreenState extends State<_MediaViewerScreen> {
  String? _url;
  VideoPlayerController? _video;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final u = await getSignedDownloadUrl(widget.attachment.mediaKey);
    if (!mounted) return;
    setState(() => _url = u);
    if (u != null && widget.attachment.mediaType == 'video') {
      final c = VideoPlayerController.networkUrl(Uri.parse(u));
      await c.initialize();
      await c.setLooping(false);
      await c.play();
      if (!mounted) {
        await c.dispose();
        return;
      }
      setState(() => _video = c);
    }
  }

  @override
  void dispose() {
    _video?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isVideo = widget.attachment.mediaType == 'video';
    return Scaffold(
      backgroundColor: Colors.black.withValues(alpha: 0.92),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.white),
        title: Text(
          widget.attachment.originalName ?? (isVideo ? 'Video' : 'Photo'),
          style: const TextStyle(
              color: Colors.white,
              fontSize: 14,
              fontWeight: FontWeight.w600),
        ),
      ),
      body: Center(
        child: _url == null
            ? const CircularProgressIndicator(
                color: Colors.white, strokeWidth: 2)
            : isVideo
                ? (_video == null || !_video!.value.isInitialized
                    ? const CircularProgressIndicator(
                        color: Colors.white, strokeWidth: 2)
                    : AspectRatio(
                        aspectRatio: _video!.value.aspectRatio,
                        child: Stack(
                          alignment: Alignment.bottomCenter,
                          children: [
                            VideoPlayer(_video!),
                            _VideoControls(controller: _video!),
                          ],
                        ),
                      ))
                : InteractiveViewer(
                    minScale: 1,
                    maxScale: 4,
                    child: Image.network(
                      _url!,
                      fit: BoxFit.contain,
                      errorBuilder: (_, __, ___) => const Icon(
                        Icons.broken_image_outlined,
                        color: Colors.white54,
                        size: 48,
                      ),
                    ),
                  ),
      ),
    );
  }
}

class _VideoControls extends StatefulWidget {
  final VideoPlayerController controller;
  const _VideoControls({required this.controller});
  @override
  State<_VideoControls> createState() => _VideoControlsState();
}

class _VideoControlsState extends State<_VideoControls> {
  @override
  void initState() {
    super.initState();
    widget.controller.addListener(_listener);
  }

  void _listener() => mounted ? setState(() {}) : null;

  @override
  void dispose() {
    widget.controller.removeListener(_listener);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final v = widget.controller.value;
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Colors.transparent, Colors.black54],
        ),
      ),
      padding: const EdgeInsets.fromLTRB(12, 24, 12, 12),
      child: Row(
        children: [
          IconButton(
            icon: Icon(
              v.isPlaying ? Icons.pause_rounded : Icons.play_arrow_rounded,
              color: Colors.white,
              size: 32,
            ),
            onPressed: () =>
                v.isPlaying ? widget.controller.pause() : widget.controller.play(),
          ),
          Expanded(
            child: VideoProgressIndicator(
              widget.controller,
              allowScrubbing: true,
              colors: const VideoProgressColors(
                playedColor: SpaersColors.brand,
                bufferedColor: Colors.white24,
                backgroundColor: Colors.white10,
              ),
            ),
          ),
          const SizedBox(width: 8),
          Text(
            '${_formatDuration(v.position)} / ${_formatDuration(v.duration)}',
            style: const TextStyle(
                color: Colors.white, fontSize: 12, fontFamily: 'monospace'),
          ),
        ],
      ),
    );
  }

  String _formatDuration(Duration d) {
    String two(int n) => n.toString().padLeft(2, '0');
    final mm = two(d.inMinutes.remainder(60));
    final ss = two(d.inSeconds.remainder(60));
    return '$mm:$ss';
  }
}

// ── filter primitives ────────────────────────────────────────────────────

class _FilterLabel extends StatelessWidget {
  final String text;
  const _FilterLabel(this.text);
  @override
  Widget build(BuildContext context) {
    return Text(
      text.toUpperCase(),
      style: const TextStyle(
        fontSize: 11,
        fontWeight: FontWeight.w700,
        color: SpaersColors.slate500,
        letterSpacing: 1.4,
      ),
    );
  }
}

class _FilterOpt<T> {
  final T? value;
  final String label;
  const _FilterOpt(this.value, this.label);
}

class _FilterRow<T> extends StatelessWidget {
  final T? current;
  final List<_FilterOpt<T>> options;
  final ValueChanged<T?> onChanged;
  const _FilterRow({
    required this.current,
    required this.options,
    required this.onChanged,
  });
  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          for (var i = 0; i < options.length; i++) ...[
            _FilterChip(
              label: options[i].label,
              selected: current == options[i].value,
              onTap: () => onChanged(options[i].value),
            ),
            if (i != options.length - 1) const SizedBox(width: 8),
          ],
        ],
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;
  const _FilterChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });
  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(40),
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 120),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          decoration: BoxDecoration(
            color: selected ? SpaersColors.brand : Colors.white,
            border: Border.all(
              color: selected ? SpaersColors.brand : SpaersColors.slate200,
            ),
            borderRadius: BorderRadius.circular(40),
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

// ── empty / loading ──────────────────────────────────────────────────────

class _LoadingTile extends StatelessWidget {
  const _LoadingTile();
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(SpaersRadius.xl),
        border: Border.all(color: SpaersColors.slate200),
      ),
      child: Row(
        children: const [
          SizedBox(
            width: 14,
            height: 14,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              valueColor: AlwaysStoppedAnimation(SpaersColors.brand),
            ),
          ),
          SizedBox(width: 12),
          Text('Loading…',
              style: TextStyle(
                  fontSize: 13, color: SpaersColors.slate500)),
        ],
      ),
    );
  }
}

class _EmptyTile extends StatelessWidget {
  final bool isUnfiltered;
  final String? error;
  const _EmptyTile({required this.isUnfiltered, this.error});
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(SpaersRadius.xl),
        border: Border.all(color: SpaersColors.slate200),
      ),
      child: Column(
        children: [
          Icon(
            isUnfiltered
                ? Icons.shield_outlined
                : Icons.filter_alt_off_outlined,
            size: 32,
            color: SpaersColors.slate300,
          ),
          const SizedBox(height: 8),
          Text(
            isUnfiltered
                ? 'No incidents in your coverage yet.'
                : 'No incidents match these filters.',
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: SpaersColors.slate700,
            ),
          ),
          if (error != null) ...[
            const SizedBox(height: 8),
            Text(
              error!,
              textAlign: TextAlign.center,
              style: const TextStyle(
                  fontSize: 12, color: SpaersColors.rose700),
            ),
          ]
        ],
      ),
    );
  }
}
