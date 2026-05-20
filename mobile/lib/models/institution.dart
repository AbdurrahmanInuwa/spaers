/// Minimal institution model — what we need to render the responder shell
/// and identify the logged-in actor. The full institution record (coverage
/// polygon, dispatcher list, etc.) lives on the backend and we fetch it on
/// demand if a future screen needs it.
class SpaersInstitution {
  final String id;
  final String name;
  final String type;
  final String email;
  final String? country;
  final bool twoFactorEnabled;
  final bool emailVerified;

  SpaersInstitution({
    required this.id,
    required this.name,
    required this.type,
    required this.email,
    this.country,
    this.twoFactorEnabled = false,
    this.emailVerified = true,
  });

  factory SpaersInstitution.fromJson(Map<String, dynamic> j) =>
      SpaersInstitution(
        id: j['id']?.toString() ?? '',
        name: j['name']?.toString() ?? '',
        type: j['type']?.toString() ?? '',
        email: j['email']?.toString() ?? '',
        country: j['country']?.toString(),
        twoFactorEnabled: j['twoFactorEnabled'] == true,
        emailVerified: j['emailVerifiedAt'] != null,
      );
}
