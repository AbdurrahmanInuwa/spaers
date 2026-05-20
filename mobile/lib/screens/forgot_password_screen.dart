import 'package:flutter/material.dart';

import '../api/api.dart';
import '../theme.dart';
import '../widgets/buttons.dart';
import '../widgets/inputs.dart';
import '../widgets/otp_input.dart';
import '../widgets/toast.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});
  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _email = TextEditingController();
  final _newPassword = TextEditingController();
  final _confirm = TextEditingController();

  String _step = 'email'; // 'email' | 'reset'
  String _code = '';
  bool _submitting = false;

  @override
  void dispose() {
    _email.dispose();
    _newPassword.dispose();
    _confirm.dispose();
    super.dispose();
  }

  Future<void> _start() async {
    if (_email.text.trim().isEmpty || _submitting) return;
    setState(() => _submitting = true);
    try {
      // Backend always returns 200 — never reveals whether the email exists
      await Api.instance.post('/auth/forgot-password/start', body: {
        'role': 'citizen',
        'email': _email.text.trim().toLowerCase(),
      });
      if (!mounted) return;
      showToast(context, 'If that email exists, a code was sent.');
      setState(() => _step = 'reset');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _confirmReset() async {
    if (_code.length < 6) return;
    if (_newPassword.text != _confirm.text) {
      showToast(context, 'Passwords do not match', error: true);
      return;
    }
    if (_newPassword.text.length < 6) {
      showToast(context, 'Password must be at least 6 characters',
          error: true);
      return;
    }
    setState(() => _submitting = true);
    try {
      final res =
          await Api.instance.post('/auth/forgot-password/confirm', body: {
        'role': 'citizen',
        'email': _email.text.trim().toLowerCase(),
        'code': _code,
        'newPassword': _newPassword.text,
      });
      final data = Api.instance.decode(res);
      if (res.statusCode < 200 || res.statusCode >= 300) {
        if (!mounted) return;
        showToast(context, data['error']?.toString() ?? 'Reset failed',
            error: true);
        return;
      }
      if (!mounted) return;
      showToast(context, 'Password reset. Sign in with your new password.');
      Navigator.of(context).pushNamedAndRemoveUntil('/signin', (_) => false);
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Reset password'),
        leading: BackButton(onPressed: () => Navigator.of(context).pop()),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 480),
          child: Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(SpaersRadius.lg),
              border: Border.all(color: SpaersColors.slate200),
            ),
            child: _step == 'email'
                ? Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const Text(
                        'Reset your password',
                        style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: SpaersColors.slate900),
                      ),
                      const SizedBox(height: 4),
                      const Text(
                        "Enter your email and we'll send you a 6-digit code.",
                        style: TextStyle(
                            fontSize: 12, color: SpaersColors.slate500),
                      ),
                      const SizedBox(height: 18),
                      SpaersTextField(
                          label: 'Email',
                          controller: _email,
                          keyboardType: TextInputType.emailAddress),
                      const SizedBox(height: 18),
                      PrimaryButton(
                        label: _submitting ? 'Sending…' : 'Send code',
                        onPressed: _start,
                        loading: _submitting,
                      ),
                    ],
                  )
                : Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const Text(
                        'Enter the code & a new password',
                        style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: SpaersColors.slate900),
                      ),
                      const SizedBox(height: 4),
                      Text('Code sent to ${_email.text.trim()}',
                          style: const TextStyle(
                              fontSize: 12, color: SpaersColors.slate500)),
                      const SizedBox(height: 18),
                      OtpInput(onChanged: (v) => setState(() => _code = v)),
                      const SizedBox(height: 14),
                      SpaersTextField(
                          label: 'New password',
                          controller: _newPassword,
                          obscureText: true),
                      const SizedBox(height: 14),
                      SpaersTextField(
                          label: 'Confirm new password',
                          controller: _confirm,
                          obscureText: true),
                      const SizedBox(height: 18),
                      PrimaryButton(
                        label: _submitting ? 'Updating…' : 'Update password',
                        onPressed: _code.length == 6 ? _confirmReset : null,
                        loading: _submitting,
                      ),
                    ],
                  ),
          ),
        ),
      ),
    );
  }
}
