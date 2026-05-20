import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api/api.dart';
import '../api/auth_provider.dart';
import '../models/institution.dart';
import '../models/user.dart';
import '../theme.dart';
import '../widgets/buttons.dart';
import '../widgets/inputs.dart';
import '../widgets/otp_input.dart';
import '../widgets/toast.dart';

enum _Role { citizen, institution }

class SignInScreen extends StatefulWidget {
  const SignInScreen({super.key});
  @override
  State<SignInScreen> createState() => _SignInScreenState();
}

class _SignInScreenState extends State<SignInScreen> {
  _Role _role = _Role.citizen;
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _submitting = false;
  bool _show2FA = false;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  String get _roleStr => _role == _Role.citizen ? 'citizen' : 'institution';

  Future<void> _submit() async {
    if (_submitting) return;
    setState(() => _submitting = true);
    try {
      final res = await Api.instance.post('/auth/login', body: {
        'role': _roleStr,
        'email': _email.text.trim(),
        'password': _password.text,
      });
      final data = Api.instance.decode(res);
      if (res.statusCode == 202 && data['pending2FA'] == true) {
        if (!mounted) return;
        showToast(context, 'Verification code sent');
        setState(() {
          _show2FA = true;
          _submitting = false;
        });
        return;
      }
      if (res.statusCode < 200 || res.statusCode >= 300) {
        if (!mounted) return;
        showToast(context, data['error']?.toString() ?? 'Login failed',
            error: true);
        return;
      }
      if (!mounted) return;
      _hydrateAuthFrom(data);
      _routeAfterLogin();
    } catch (_) {
      if (!mounted) return;
      showToast(context, 'Network error. Is the server running?',
          error: true);
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  void _hydrateAuthFrom(Map<String, dynamic> data) {
    final auth = context.read<AuthProvider>();
    final role = data['role']?.toString() ?? _roleStr;
    final userRaw = data['user'];
    if (role == 'citizen' && userRaw is Map<String, dynamic>) {
      auth.setUser(SpaersUser.fromJson(Map<String, dynamic>.from(userRaw)));
    } else if (role == 'institution' && userRaw is Map<String, dynamic>) {
      auth.setInstitution(
          SpaersInstitution.fromJson(Map<String, dynamic>.from(userRaw)));
    }
  }

  void _routeAfterLogin() {
    final role = context.read<AuthProvider>().role;
    if (role == 'institution') {
      Navigator.of(context)
          .pushNamedAndRemoveUntil('/responder', (_) => false);
    } else {
      Navigator.of(context)
          .pushNamedAndRemoveUntil('/dashboard', (_) => false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_show2FA) {
      return _TwoFactorPanel(
        email: _email.text.trim().toLowerCase(),
        role: _roleStr,
        onBack: () => setState(() => _show2FA = false),
        onSuccess: () async {
          await context.read<AuthProvider>().refresh();
          if (!mounted) return;
          _routeAfterLogin();
        },
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Sign in'),
        leading: BackButton(onPressed: () => Navigator.of(context).maybePop()),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 480),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 12),
              const Text('Welcome back',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.w800,
                      color: SpaersColors.slate900)),
              const SizedBox(height: 4),
              const Text('Sign in to your SPAERS account.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                      fontSize: 13, color: SpaersColors.slate500)),
              const SizedBox(height: 18),
              Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(SpaersRadius.lg),
                  border: Border.all(color: SpaersColors.slate200),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x14000000),
                      blurRadius: 16,
                      offset: Offset(0, 4),
                    ),
                  ],
                ),
                clipBehavior: Clip.antiAlias,
                child: Column(
                  children: [
                    _roleTabs(),
                    Padding(
                      padding: const EdgeInsets.all(18),
                      child: Column(
                        children: [
                          SpaersTextField(
                            label: 'Email',
                            controller: _email,
                            keyboardType: TextInputType.emailAddress,
                            autofillHint: 'username',
                          ),
                          const SizedBox(height: 14),
                          SpaersTextField(
                            label: 'Password',
                            controller: _password,
                            obscureText: true,
                            autofillHint: 'password',
                          ),
                          const SizedBox(height: 18),
                          PrimaryButton(
                            label: _submitting ? 'Signing in…' : 'Login',
                            onPressed: _submit,
                            loading: _submitting,
                          ),
                          const SizedBox(height: 12),
                          TextButton(
                            onPressed: () =>
                                Navigator.of(context).pushNamed('/forgot'),
                            child: const Text(
                              'Forgot password?',
                              style: TextStyle(
                                  fontSize: 12,
                                  color: SpaersColors.slate500),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              if (_role == _Role.citizen)
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Text("Don't have an account? ",
                        style: TextStyle(
                            fontSize: 12, color: SpaersColors.slate600)),
                    GestureDetector(
                      onTap: () =>
                          Navigator.of(context).pushNamed('/signup'),
                      child: const Text('Create one',
                          style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: SpaersColors.brand)),
                    ),
                  ],
                )
              else
                const Center(
                  child: Text(
                    'Institution accounts are created on the SPAERS website.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                        fontSize: 12, color: SpaersColors.slate500),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _roleTabs() {
    return Row(
      children: [
        for (final r in _Role.values)
          Expanded(child: _roleTabButton(r)),
      ],
    );
  }

  Widget _roleTabButton(_Role r) {
    final active = _role == r;
    return InkWell(
      onTap: () => setState(() => _role = r),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 120),
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: active ? SpaersColors.brand : SpaersColors.slate50,
        ),
        alignment: Alignment.center,
        child: Text(
          r == _Role.citizen ? 'Citizen' : 'Institution',
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w700,
            color: active ? Colors.white : SpaersColors.slate600,
          ),
        ),
      ),
    );
  }
}

class _TwoFactorPanel extends StatefulWidget {
  final String email;
  final String role;
  final VoidCallback onBack;
  final Future<void> Function() onSuccess;
  const _TwoFactorPanel({
    required this.email,
    required this.role,
    required this.onBack,
    required this.onSuccess,
  });
  @override
  State<_TwoFactorPanel> createState() => _TwoFactorPanelState();
}

class _TwoFactorPanelState extends State<_TwoFactorPanel> {
  String _code = '';
  bool _submitting = false;

  Future<void> _submit() async {
    if (_code.length < 6 || _submitting) return;
    setState(() => _submitting = true);
    try {
      final res = await Api.instance.post('/auth/verify-login-otp', body: {
        'role': widget.role,
        'email': widget.email,
        'code': _code,
      });
      final data = Api.instance.decode(res);
      if (res.statusCode < 200 || res.statusCode >= 300) {
        if (!mounted) return;
        showToast(context, data['error']?.toString() ?? 'Verification failed',
            error: true);
        return;
      }
      await widget.onSuccess();
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Two-factor sign-in'),
        leading: BackButton(onPressed: widget.onBack),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 480),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(SpaersRadius.lg),
                  border: Border.all(color: SpaersColors.slate200),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Text(
                      'Enter the 6-digit code',
                      style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: SpaersColors.slate900),
                    ),
                    const SizedBox(height: 4),
                    Text('Sent to ${widget.email}',
                        style: const TextStyle(
                            fontSize: 13, color: SpaersColors.slate500)),
                    const SizedBox(height: 18),
                    OtpInput(onChanged: (v) => setState(() => _code = v)),
                    const SizedBox(height: 18),
                    PrimaryButton(
                      label: _submitting ? 'Verifying…' : 'Sign in',
                      onPressed: _code.length == 6 ? _submit : null,
                      loading: _submitting,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
