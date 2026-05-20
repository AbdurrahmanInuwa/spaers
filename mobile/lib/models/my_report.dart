/// A media file attached to a report. Returned as part of `/emergencies/mine`.
class ReportAttachment {
  final String id;
  final String mediaKey;
  final String mediaType; // 'image' | 'video' | 'audio'
  final int? sizeBytes;
  final String? originalName;
  final DateTime createdAt;

  ReportAttachment({
    required this.id,
    required this.mediaKey,
    required this.mediaType,
    this.sizeBytes,
    this.originalName,
    required this.createdAt,
  });

  factory ReportAttachment.fromJson(Map<String, dynamic> j) {
    DateTime parse(dynamic v) {
      try {
        return DateTime.parse(v.toString()).toLocal();
      } catch (_) {
        return DateTime.now();
      }
    }

    return ReportAttachment(
      id: j['id']?.toString() ?? '',
      mediaKey: j['mediaKey']?.toString() ?? '',
      mediaType: j['mediaType']?.toString() ?? 'image',
      sizeBytes: (j['sizeBytes'] as num?)?.toInt(),
      originalName: j['originalName']?.toString(),
      createdAt: parse(j['createdAt']),
    );
  }
}

/// One row from `GET /api/emergencies/mine`. Used to render the citizen's
/// "My Reports" list. Tracks the raw backend status so callers can map it
/// to display tiers (see `mapBackendStatus`).
class MyReport {
  final String id;
  final String type;
  final String status; // raw backend status
  final String source; // 'sos_panic' | 'report'
  final String? priority; // 'low' | 'medium' | 'high' | 'critical' | null
  final bool anonymous;
  final String? notes;
  final String? address;
  final double? victimLat;
  final double? victimLng;
  final DateTime createdAt;
  final DateTime? resolvedAt;
  final List<ReportAttachment> attachments;

  MyReport({
    required this.id,
    required this.type,
    required this.status,
    required this.source,
    this.priority,
    this.anonymous = false,
    this.notes,
    this.address,
    this.victimLat,
    this.victimLng,
    required this.createdAt,
    this.resolvedAt,
    this.attachments = const [],
  });

  bool get isPanic => source == 'sos_panic';
  bool get isCancellable => status == 'active';

  factory MyReport.fromJson(Map<String, dynamic> j) {
    DateTime? parse(dynamic v) {
      if (v == null) return null;
      try {
        return DateTime.parse(v.toString()).toLocal();
      } catch (_) {
        return null;
      }
    }

    final atts = <ReportAttachment>[];
    final raw = j['attachments'];
    if (raw is List) {
      for (final a in raw) {
        if (a is Map<String, dynamic>) atts.add(ReportAttachment.fromJson(a));
      }
    }

    return MyReport(
      id: j['id']?.toString() ?? '',
      type: j['type']?.toString() ?? '',
      status: j['status']?.toString() ?? 'active',
      source: j['source']?.toString() ?? 'sos_panic',
      priority: j['priority']?.toString(),
      anonymous: j['anonymous'] == true,
      notes: j['notes']?.toString(),
      address: j['address']?.toString(),
      victimLat: (j['victimLat'] as num?)?.toDouble(),
      victimLng: (j['victimLng'] as num?)?.toDouble(),
      createdAt: parse(j['createdAt']) ?? DateTime.now(),
      resolvedAt: parse(j['resolvedAt']),
      attachments: atts,
    );
  }
}
