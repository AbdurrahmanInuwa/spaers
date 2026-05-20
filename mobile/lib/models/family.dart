class FamilyMember {
  final String id;
  final String? spaersId;
  final String firstName;
  final String lastName;
  final DateTime? dob;
  final String? email;
  final String? phone;
  final String? country;
  final String? bloodGroup;
  final String? allergies;
  final String? chronicCondition;
  final bool implantDevice;
  final bool familyCallEligible;

  FamilyMember({
    required this.id,
    this.spaersId,
    required this.firstName,
    required this.lastName,
    this.dob,
    this.email,
    this.phone,
    this.country,
    this.bloodGroup,
    this.allergies,
    this.chronicCondition,
    this.implantDevice = false,
    this.familyCallEligible = false,
  });

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

  factory FamilyMember.fromJson(Map<String, dynamic> j) {
    DateTime? parse(dynamic v) {
      if (v == null) return null;
      try {
        return DateTime.parse(v.toString()).toLocal();
      } catch (_) {
        return null;
      }
    }

    return FamilyMember(
      id: j['id']?.toString() ?? '',
      spaersId: j['spaersId']?.toString(),
      firstName: j['firstName']?.toString() ?? '',
      lastName: j['lastName']?.toString() ?? '',
      dob: parse(j['dob']),
      email: j['email']?.toString(),
      phone: j['phone']?.toString(),
      country: j['country']?.toString(),
      bloodGroup: j['bloodGroup']?.toString(),
      allergies: j['allergies']?.toString(),
      chronicCondition: j['chronicCondition']?.toString(),
      implantDevice: j['implantDevice'] == true,
      familyCallEligible: j['familyCallEligible'] == true,
    );
  }
}

class FamilyState {
  final DateTime? ackAt;
  final String? familyId;
  final String? creatorId;
  final List<FamilyMember> members;

  FamilyState({this.ackAt, this.familyId, this.creatorId, this.members = const []});
  bool get acknowledged => ackAt != null;
}
