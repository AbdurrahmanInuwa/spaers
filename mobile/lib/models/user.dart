class SpaersUser {
  final String id;
  final String? spaersId;
  final String firstName;
  final String lastName;
  final DateTime? dob;
  final String email;
  final String? phone;
  final String? country;
  final String? bloodGroup;
  final String? allergies;
  final String? chronicCondition;
  final bool implantDevice;
  final String? avatarKey;
  final String? familyId;
  final DateTime? familyAckAt;
  final bool familyCallEligible;
  final bool twoFactorEnabled;
  final bool emailVerified;

  SpaersUser({
    required this.id,
    this.spaersId,
    required this.firstName,
    required this.lastName,
    this.dob,
    required this.email,
    this.phone,
    this.country,
    this.bloodGroup,
    this.allergies,
    this.chronicCondition,
    this.implantDevice = false,
    this.avatarKey,
    this.familyId,
    this.familyAckAt,
    this.familyCallEligible = false,
    this.twoFactorEnabled = false,
    this.emailVerified = true,
  });

  factory SpaersUser.fromJson(Map<String, dynamic> j) => SpaersUser(
        id: j['id']?.toString() ?? '',
        spaersId: j['spaersId']?.toString(),
        firstName: j['firstName']?.toString() ?? '',
        lastName: j['lastName']?.toString() ?? '',
        dob: _parseDate(j['dob']),
        email: j['email']?.toString() ?? '',
        phone: j['phone']?.toString(),
        country: j['country']?.toString(),
        bloodGroup: j['bloodGroup']?.toString(),
        allergies: j['allergies']?.toString(),
        chronicCondition: j['chronicCondition']?.toString(),
        implantDevice: j['implantDevice'] == true,
        avatarKey: j['avatarKey']?.toString(),
        familyId: j['familyId']?.toString(),
        familyAckAt: _parseDate(j['familyAckAt']),
        familyCallEligible: j['familyCallEligible'] == true,
        twoFactorEnabled: j['twoFactorEnabled'] == true,
        emailVerified: j['emailVerifiedAt'] != null,
      );

  SpaersUser copyWith({
    String? avatarKey,
    bool clearAvatarKey = false,
    bool? twoFactorEnabled,
    DateTime? familyAckAt,
    String? familyId,
    bool clearFamilyId = false,
  }) {
    return SpaersUser(
      id: id,
      spaersId: spaersId,
      firstName: firstName,
      lastName: lastName,
      dob: dob,
      email: email,
      phone: phone,
      country: country,
      bloodGroup: bloodGroup,
      allergies: allergies,
      chronicCondition: chronicCondition,
      implantDevice: implantDevice,
      avatarKey: clearAvatarKey ? null : (avatarKey ?? this.avatarKey),
      familyId:
          clearFamilyId ? null : (familyId ?? this.familyId),
      familyAckAt: familyAckAt ?? this.familyAckAt,
      familyCallEligible: familyCallEligible,
      twoFactorEnabled: twoFactorEnabled ?? this.twoFactorEnabled,
      emailVerified: emailVerified,
    );
  }

  String get initials {
    final f = firstName.isNotEmpty ? firstName[0] : '?';
    final l = lastName.isNotEmpty ? lastName[0] : '';
    return '$f$l'.toUpperCase();
  }

  int? get ageYears {
    if (dob == null) return null;
    final now = DateTime.now();
    var a = now.year - dob!.year;
    final m = now.month - dob!.month;
    if (m < 0 || (m == 0 && now.day < dob!.day)) a--;
    return a;
  }
}

DateTime? _parseDate(dynamic v) {
  if (v == null) return null;
  try {
    return DateTime.parse(v.toString()).toLocal();
  } catch (_) {
    return null;
  }
}
