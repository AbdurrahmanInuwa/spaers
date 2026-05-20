import 'package:flutter/foundation.dart';

import '../models/institution.dart';
import '../models/user.dart';
import 'api.dart';

/// Auth state for both citizen and institution roles. The mobile app is a
/// single binary; role is detected at sign-in time and the splash router
/// branches to the right shell.
class AuthProvider extends ChangeNotifier {
  SpaersUser? _citizen;
  SpaersInstitution? _institution;
  String? _role; // 'citizen' | 'institution' | null
  bool _loading = true;

  SpaersUser? get user => _citizen;
  SpaersInstitution? get institution => _institution;
  String? get role => _role;
  bool get loading => _loading;
  bool get isCitizen => _role == 'citizen' && _citizen != null;
  bool get isInstitution => _role == 'institution' && _institution != null;
  bool get isAuthenticated => isCitizen || isInstitution;

  /// Hydrate from /auth/me. Called once at startup and after login.
  Future<void> refresh() async {
    try {
      final res = await Api.instance.get('/auth/me');
      if (res.statusCode == 200) {
        final data = Api.instance.decode(res);
        final role = data['role']?.toString();
        final raw = data['user'];
        if (role == 'citizen' && raw is Map<String, dynamic>) {
          _role = 'citizen';
          _citizen = SpaersUser.fromJson(Map<String, dynamic>.from(raw));
          _institution = null;
        } else if (role == 'institution' && raw is Map<String, dynamic>) {
          _role = 'institution';
          _institution = SpaersInstitution.fromJson(
              Map<String, dynamic>.from(raw));
          _citizen = null;
        } else {
          _role = role;
          _citizen = null;
          _institution = null;
        }
      } else {
        _citizen = null;
        _institution = null;
        _role = null;
      }
    } catch (_) {
      _citizen = null;
      _institution = null;
      _role = null;
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  void setUser(SpaersUser user) {
    _citizen = user;
    _institution = null;
    _role = 'citizen';
    _loading = false;
    notifyListeners();
  }

  void setInstitution(SpaersInstitution inst) {
    _institution = inst;
    _citizen = null;
    _role = 'institution';
    _loading = false;
    notifyListeners();
  }

  /// Optimistic local patch — used after profile mutations to avoid a refetch.
  /// Citizen-only for now; institution profile editing on mobile is not in scope.
  void patch(SpaersUser updated) {
    _citizen = updated;
    notifyListeners();
  }

  Future<void> logout() async {
    try {
      await Api.instance.post('/auth/logout');
    } catch (_) {}
    await Api.instance.clearSession();
    _citizen = null;
    _institution = null;
    _role = null;
    notifyListeners();
  }
}
