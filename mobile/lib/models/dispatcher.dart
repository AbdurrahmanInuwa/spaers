/// One row from `GET /api/dispatchers`. Used by Incident Command's assign
/// dispatcher sheet on mobile.
class Dispatcher {
  final String id;
  final String dispatcherId; // human-readable, e.g. "DSP-1234"
  final String name;
  final String mode; // 'vehicle' | 'motorcycle' | 'foot'

  Dispatcher({
    required this.id,
    required this.dispatcherId,
    required this.name,
    required this.mode,
  });

  factory Dispatcher.fromJson(Map<String, dynamic> j) => Dispatcher(
        id: j['id']?.toString() ?? '',
        dispatcherId: j['dispatcherId']?.toString() ?? '',
        name: j['name']?.toString() ?? '',
        mode: j['mode']?.toString() ?? 'vehicle',
      );
}
