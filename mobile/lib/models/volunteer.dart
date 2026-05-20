class Volunteer {
  final String id;
  final String field;
  final String status; // pending | approved | revoked
  final String? decisionNote;

  Volunteer({
    required this.id,
    required this.field,
    required this.status,
    this.decisionNote,
  });

  factory Volunteer.fromJson(Map<String, dynamic> j) => Volunteer(
        id: j['id']?.toString() ?? '',
        field: j['field']?.toString() ?? '',
        status: j['status']?.toString() ?? 'pending',
        decisionNote: j['decisionNote']?.toString(),
      );
}
