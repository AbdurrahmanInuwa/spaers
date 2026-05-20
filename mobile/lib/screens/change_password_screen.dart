import 'package:flutter/material.dart';

import '../api/api.dart';
import '../theme.dart';
import '../widgets/buttons.dart';
import '../widgets/inputs.dart';
import '../widgets/otp_input.dart';
import '../widgets/toast.dart';

class ChangePasswordScreen extends StatefulWidget {
  final String email;
  const ChangePasswordScreen({super.key, required this.email});
  @override
  State<ChangePasswordScreen> createState() => _ChangePasswordScreenState();
}

class _ChangePasswordScreenState extends State<ChangePasswordScreen> {
  String _step = 'passwords';
  final _current = TextEditingController();
  final _newPassword = TextEditingController();
  final _confirm = TextEditingController();
  String _code = '';
  bool _submitting = false;

  @override
  void dispose() {
    _current.dispose();
    _newPassword.dispose();
    _confirm.dispose();
    super.dispose();
  }

  Future<void> _start() async {
    if (_newPassword.text.length < 6) {
      showToast(context, 'Password must be at least 6 characters', error: true);
      return;
    }
    if (_newPassword.text != _confirm.text) {
      showToast(context, 'New passwords do not match', error: true);
      return;
    }
    if (_newPassword.text == _current.text) {
      showToast(context, 'New password must differ from the current one',
          error: true);
      return;
    }
    setState(() => _submitting = true);
    try {
      final res = await Api.instance.post('/auth/change-password/start', body: {
        'role': 'citizen',
        'email': widget.email,
        'currentPassword': _current.text,
      });
      final data = Api.instance.decode(res);
      if (res.statusCode < 200 || res.statusCode >= 300) {
        if (!mounted) return;
        showToast(context, data['error']?.toString() ?? 'Could not start',
            error: true);
        return;
      }
      if (!mounted) return;
      showToast(context, 'Verification code sent');
      setState(() => _step = 'otp');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _confirmChange() async {
    if (_code.length < 6) return;
    setState(() => _submitting = true);
    try {
      final res =
          await Api.instance.post('/auth/change-password/confirm', body: {
        'role': 'citizen',
        'email': widget.email,
        'code': _code,
        'newPassword': _newPassword.text,
      });
      final data = Api.instance.decode(res);
      if (res.statusCode < 200 || res.statusCode >= 300) {
        if (!mounted) return;
        showToast(context, data['error']?.toString() ?? 'Verification failed',
            error: true);
        return;
      }
      if (!mounted) return;
      showToast(context, 'Password updated');
      Navigator.of(context).pop();
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_step == 'passwords'
            ? 'Change password'
            : 'Confirm with code'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 480),
          child: _step == 'passwords'
              ? Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Text(
                      "We'll email you a 6-digit code to confirm.",
                      style: TextStyle(
                          fontSize: 12, color: SpaersColors.slate500),
                    ),
                    const SizedBox(height: 18),
                    SpaersTextField(
                        label: 'Current password',
                        controller: _current,
                        obscureText: true),
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
                      label: _submitting ? 'Sending code…' : 'Continue',
                      onPressed: _start,
                      loading: _submitting,
                    ),
                  ],
                )
              : Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text('Code sent to ${widget.email}',
                        style: const TextStyle(
                            fontSize: 12, color: SpaersColors.slate500)),
                    const SizedBox(height: 18),
                    OtpInput(onChanged: (v) => setState(() => _code = v)),
                    const SizedBox(height: 18),
                    PrimaryButton(
                      label: _submitting ? 'Verifying…' : 'Update password',
                      onPressed: _code.length == 6 ? _confirmChange : null,
                      loading: _submitting,
                    ),
                  ],
                ),
        ),
      ),
    );
  }
}
