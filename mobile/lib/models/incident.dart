import 'my_report.dart' show ReportAttachment;

/// Citizen identity attached to an incident as seen by an institution. When
/// the report was filed anonymously the backend redacts the identifying
/// fields (firstName/lastName become 'Anonymous Reporter'; email/phone are
/// nulled) but medical fields are preserved because they can be life-critical.
class IncidentCitizen {
  final String? id;
  final String? spaersId;
  final String firstName;
  final String lastName;
  final String? email;
  final String? phone;
  final String? bloodGroup;
  final String? allergies;
  final String? chronicCondition;
  final bool implantDevice;

  IncidentCitizen({
    this.id,
    this.spaersId,
    required this.firstName,
    required this.lastName,
    this.email,
    this.phone,
    this.bloodGroup,
    this.allergies,
    this.chronicCondition,
    this.implantDevice = false,
  });

  factory IncidentCitizen.fromJson(Map<String, dynamic> j) => IncidentCitizen(
        id: j['id']?.toString(),
        spaersId: j['spaersId']?.toString(),
        firstName: j['firstName']?.toString() ?? '',
        lastName: j['lastName']?.toString() ?? '',
        email: j['email']?.toString(),
        phone: j['phone']?.toString(),
        bloodGroup: j['bloodGroup']?.toString(),
        allergies: j['allergies']?.toString(),
        chronicCondition: j['chronicCondition']?.toString(),
        implantDevice: j['implantDevice'] == true,
      );

  String get displayName => '$firstName $lastName'.trim();
}

/// Latest dispatch for this institution on an incident — just the bits the
/// responder card needs to surface.
class IncidentDispatch {
  final String id;
  final String dispatcherName;
  final DateTime? startedAt;
  final DateTime? arrivedAt;
  IncidentDispatch({
    required this.id,
    required this.dispatcherName,
    this.startedAt,
    this.arrivedAt,
  });

  factory IncidentDispatch.fromJson(Map<String, dynamic> j) {
    DateTime? parse(dynamic v) {
      if (v == null) return null;
      try {
        return DateTime.parse(v.toString()).toLocal();
      } catch (_) {
        return null;
      }
    }

    return IncidentDispatch(
      id: j['id']?.toString() ?? '',
      dispatcherName: (j['dispatcher'] as Map?)?['name']?.toString() ?? '',
      startedAt: parse(j['startedAt']),
      arrivedAt: parse(j['arrivedAt']),
    );
  }
}

/// One row from `GET /api/emergencies/incidents`. Powers the responder
/// Incident Command screen.
class Incident {
  final String id;
  final String type;
  final String status; // raw backend status
  final String source; // 'sos_panic' | 'report'
  final String? priority;
  final bool anonymous;
  final String? notes;
  final String? address;
  final double? victimLat;
  final double? victimLng;
  final DateTime createdAt;
  final DateTime? resolvedAt;
  final IncidentCitizen? citizen;
  final IncidentDispatch? dispatch;
  final List<ReportAttachment> attachments;

  Incident({
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
    this.citizen,
    this.dispatch,
    this.attachments = const [],
  });

  bool get isPanic => source == 'sos_panic';

  factory Incident.fromJson(Map<String, dynamic> j) {
    DateTime? parse(dynamic v) {
      if (v == null) return null;
      try {
        return DateTime.parse(v.toString()).toLocal();
      } catch (_) {
        return null;
      }
    }

    final citizenRaw = j['citizen'];
    final dispatchesRaw = j['dispatches'];
    IncidentDispatch? dispatch;
    if (dispatchesRaw is List && dispatchesRaw.isNotEmpty) {
      final first = dispatchesRaw.first;
      if (first is Map<String, dynamic>) {
        dispatch = IncidentDispatch.fromJson(first);
      }
    }

    final atts = <ReportAttachment>[];
    final aRaw = j['attachments'];
    if (aRaw is List) {
      for (final a in aRaw) {
        if (a is Map<String, dynamic>) atts.add(ReportAttachment.fromJson(a));
      }
    }

    return Incident(
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
      citizen: citizenRaw is Map<String, dynamic>
          ? IncidentCitizen.fromJson(citizenRaw)
          : null,
      dispatch: dispatch,
      attachments: atts,
    );
  }
}
