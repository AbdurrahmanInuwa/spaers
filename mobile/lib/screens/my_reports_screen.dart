import 'package:flutter/material.dart';

import '../api/api.dart';
import '../models/my_report.dart';
import '../theme.dart';
import '../utils/time_ago.dart';
import '../widgets/incident_chips.dart';
import '../widgets/stat_tile.dart';
import '../widgets/toast.dart';
import 'new_report_screen.dart';

/// "My Reports" — citizen-facing list of their own emergency reports + SOS
/// presses. Pulls from `GET /api/emergencies/mine`. Active = anything not in
/// a terminal state (resolved/cancelled/expired).
class MyReportsScreen extends StatefulWidget {
  const MyReportsScreen({super.key});
  @override
  State<MyReportsScreen> createState() => _MyReportsScreenState();
}

class _MyReportsScreenState extends State<MyReportsScreen> {
  static const _terminal = {'resolved', 'cancelled', 'expired'};

  List<MyReport>? _reports; // null = loading
  String? _error;
  bool _refreshing = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _openNewReport() async {
    final created = await Navigator.of(context).push<bool>(
      MaterialPageRoute(builder: (_) => const NewReportScreen()),
    );
    if (created == true) {
      // Refresh after a successful submit so the new row appears at the top.
      await _load();
    }
  }

  Future<void> _cancel(MyReport r) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Cancel this report?'),
        content: const Text(
          'Responders will be told to stand down. This can only be done while the report is still pending.',
          style: TextStyle(color: SpaersColors.slate600),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Keep'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
                backgroundColor: SpaersColors.brand),
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Cancel report'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    try {
      final res = await Api.instance.post('/emergencies/${r.id}/cancel');
      final data = Api.instance.decode(res);
      if (res.statusCode < 200 || res.statusCode >= 300) {
        if (!mounted) return;
        showToast(context, data['error']?.toString() ?? 'Could not cancel',
            error: true);
        return;
      }
      if (!mounted) return;
      showToast(context, 'Report cancelled');
      await _load();
    } catch (e) {
      if (!mounted) return;
      showToast(context, 'Network error', error: true);
    }
  }

  Future<void> _load({bool isPullToRefresh = false}) async {
    if (!isPullToRefresh) {
      setState(() {
        _error = null;
      });
    } else {
      setState(() => _refreshing = true);
    }
    try {
      final res = await Api.instance.get('/emergencies/mine');
      final data = Api.instance.decode(res);
      if (res.statusCode < 200 || res.statusCode >= 300) {
        setState(() {
          _error = data['error']?.toString() ?? 'Could not load reports';
          _reports = const [];
        });
        return;
      }
      final raw = data['emergencies'];
      final list = <MyReport>[];
      if (raw is List) {
        for (final m in raw) {
          if (m is Map<String, dynamic>) list.add(MyReport.fromJson(m));
        }
      }
      setState(() => _reports = list);
    } catch (e) {
      setState(() {
        _error = 'Network error';
        _reports = const [];
      });
    } finally {
      if (mounted) setState(() => _refreshing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final reports = _reports;
    final total = reports?.length ?? 0;
    final active = (reports ?? const [])
        .where((r) => !_terminal.contains(r.status))
        .length;

    return Scaffold(
      backgroundColor: SpaersColors.slate50,
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openNewReport,
        backgroundColor: SpaersColors.brand,
        foregroundColor: Colors.white,
        elevation: 4,
        icon: const Icon(Icons.add, size: 20),
        label: const Text(
          'New report',
          style: TextStyle(fontWeight: FontWeight.w700),
        ),
      ),
      body: SafeArea(
        child: RefreshIndicator(
          color: SpaersColors.brand,
          onRefresh: () => _load(isPullToRefresh: true),
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
            children: [
              // Header + refresh button
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: const [
                        Text(
                          'My Reports',
                          style: TextStyle(
                            fontSize: 26,
                            fontWeight: FontWeight.w800,
                            color: SpaersColors.slate900,
                            height: 1.1,
                          ),
                        ),
                        SizedBox(height: 4),
                        Text(
                          'Track the status of your emergency reports',
                          style: TextStyle(
                            fontSize: 13,
                            color: SpaersColors.slate500,
                          ),
                        ),
                      ],
                    ),
                  ),
                  _RefreshButton(
                    busy: _refreshing,
                    onPressed: _load,
                  ),
                ],
              ),
              const SizedBox(height: 18),

              // Stats
              Row(
                children: [
                  Expanded(
                    child: StatTile(label: 'Total Reports', value: '$total'),
                  ),
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
              const SizedBox(height: 18),

              // Body
              if (reports == null)
                _LoadingTile()
              else if (reports.isEmpty)
                _EmptyTile(error: _error)
              else
                ..._buildCards(reports),
            ],
          ),
        ),
      ),
    );
  }

  List<Widget> _buildCards(List<MyReport> reports) {
    final widgets = <Widget>[];
    for (var i = 0; i < reports.length; i++) {
      widgets.add(_ReportCard(
        report: reports[i],
        onCancel: () => _cancel(reports[i]),
      ));
      if (i != reports.length - 1) widgets.add(const SizedBox(height: 12));
    }
    return widgets;
  }
}

class _ReportCard extends StatelessWidget {
  final MyReport report;
  final VoidCallback onCancel;
  const _ReportCard({required this.report, required this.onCancel});

  @override
  Widget build(BuildContext context) {
    final status = mapBackendStatus(report.status);
    final priority = report.priority;
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(SpaersRadius.xl),
        border: Border.all(color: SpaersColors.slate200),
        boxShadow: const [
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
            children: [
              Expanded(
                child: Wrap(
                  crossAxisAlignment: WrapCrossAlignment.center,
                  spacing: 8,
                  runSpacing: 4,
                  children: [
                    Text(
                      report.type,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: SpaersColors.slate900,
                      ),
                    ),
                    if (priority != null)
                      IncidentPriorityChip(
                        priority: _priorityFromString(priority),
                      ),
                    if (report.anonymous)
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: SpaersColors.slate100,
                          borderRadius: BorderRadius.circular(40),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: const [
                            Icon(Icons.visibility_off_outlined,
                                size: 10,
                                color: SpaersColors.slate600),
                            SizedBox(width: 4),
                            Text(
                              'ANONYMOUS',
                              style: TextStyle(
                                fontSize: 9,
                                fontWeight: FontWeight.w700,
                                color: SpaersColors.slate600,
                                letterSpacing: 1.2,
                              ),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
              ),
              IncidentStatusChip(status: status),
            ],
          ),
          const SizedBox(height: 2),
          Text(
            timeAgo(report.createdAt),
            style: const TextStyle(
              fontSize: 12,
              color: SpaersColors.slate500,
            ),
          ),
          if (report.notes != null && report.notes!.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              report.notes!,
              style: const TextStyle(
                fontSize: 14,
                color: SpaersColors.slate700,
                height: 1.4,
              ),
            ),
          ],
          if (report.isPanic) ...[
            const SizedBox(height: 10),
            const PanicBanner(),
          ],
          if (report.attachments.isNotEmpty) ...[
            const SizedBox(height: 10),
            _AttachmentsStrip(attachments: report.attachments),
          ],
          if (report.address != null && report.address!.isNotEmpty) ...[
            const SizedBox(height: 10),
            Row(
              children: [
                const Icon(Icons.place_outlined,
                    size: 14, color: SpaersColors.slate400),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    report.address!,
                    style: const TextStyle(
                      fontSize: 12,
                      color: SpaersColors.slate500,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ],
          if (report.isCancellable && !report.isPanic) ...[
            const SizedBox(height: 10),
            Align(
              alignment: Alignment.centerRight,
              child: TextButton.icon(
                onPressed: onCancel,
                style: TextButton.styleFrom(
                  foregroundColor: SpaersColors.rose700,
                  padding: const EdgeInsets.symmetric(
                      horizontal: 12, vertical: 6),
                ),
                icon: const Icon(Icons.close, size: 14),
                label: const Text('Cancel report',
                    style: TextStyle(
                        fontSize: 12, fontWeight: FontWeight.w700)),
              ),
            ),
          ],
        ],
      ),
    );
  }

  IncidentPriority _priorityFromString(String s) {
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
}

class _AttachmentsStrip extends StatelessWidget {
  final List<ReportAttachment> attachments;
  const _AttachmentsStrip({required this.attachments});
  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 64,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemBuilder: (_, i) {
          final a = attachments[i];
          return FutureBuilder<String?>(
            future: getSignedDownloadUrl(a.mediaKey),
            builder: (_, snap) {
              final url = snap.data;
              return Container(
                width: 64,
                height: 64,
                clipBehavior: Clip.antiAlias,
                decoration: BoxDecoration(
                  color: SpaersColors.slate100,
                  borderRadius: BorderRadius.circular(SpaersRadius.md),
                  border: Border.all(color: SpaersColors.slate200),
                ),
                child: url == null
                    ? const Icon(Icons.image_outlined,
                        color: SpaersColors.slate400, size: 22)
                    : Image.network(
                        url,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => const Icon(
                            Icons.broken_image_outlined,
                            color: SpaersColors.slate400,
                            size: 22),
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

class _LoadingTile extends StatelessWidget {
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
  final String? error;
  const _EmptyTile({this.error});
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(SpaersRadius.xl),
        border: Border.all(
          color: SpaersColors.slate200,
          width: 1,
          // Dashed look approximated via standard border; full dashed is in
          // family_screen.dart if we ever want to share it.
        ),
      ),
      child: Column(
        children: [
          const Icon(Icons.list_alt_outlined,
              size: 32, color: SpaersColors.slate300),
          const SizedBox(height: 8),
          const Text(
            'No reports yet.',
            style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: SpaersColors.slate700),
          ),
          const SizedBox(height: 4),
          const Text(
            'Triggering an SOS will list it here.',
            textAlign: TextAlign.center,
            style:
                TextStyle(fontSize: 12, color: SpaersColors.slate500),
          ),
          if (error != null) ...[
            const SizedBox(height: 12),
            Text(
              error!,
              textAlign: TextAlign.center,
              style: const TextStyle(
                  fontSize: 12, color: SpaersColors.rose700),
            ),
          ],
        ],
      ),
    );
  }
}

class _RefreshButton extends StatelessWidget {
  final bool busy;
  final VoidCallback onPressed;
  const _RefreshButton({required this.busy, required this.onPressed});
  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      shape: const CircleBorder(
        side: BorderSide(color: SpaersColors.slate200),
      ),
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: busy ? null : onPressed,
        child: SizedBox(
          width: 38,
          height: 38,
          child: busy
              ? const Padding(
                  padding: EdgeInsets.all(11),
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    valueColor:
                        AlwaysStoppedAnimation(SpaersColors.brand),
                  ),
                )
              : const Icon(Icons.refresh,
                  size: 18, color: SpaersColors.slate600),
        ),
      ),
    );
  }
}
