import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api/api.dart';
import '../api/auth_provider.dart';
import '../theme.dart';
import '../widgets/buttons.dart';
import '../widgets/inputs.dart';
import '../widgets/toast.dart';

class TwoFactorScreen extends StatefulWidget {
  final bool currentlyEnabled;
  const TwoFactorScreen({super.key, required this.currentlyEnabled});
  @override
  State<TwoFactorScreen> createState() => _TwoFactorScreenState();
}

class _TwoFactorScreenState extends State<TwoFactorScreen> {
  final _password = TextEditingController();
  bool _submitting = false;

  @override
  void dispose() {
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_password.text.isEmpty) return;
    setState(() => _submitting = true);
    try {
      final res = await Api.instance.post('/auth/2fa/toggle', body: {
        'enabled': !widget.currentlyEnabled,
        'currentPassword': _password.text,
      });
      final data = Api.instance.decode(res);
      if (res.statusCode < 200 || res.statusCode >= 300) {
        if (!mounted) return;
        showToast(context, data['error']?.toString() ?? 'Could not update',
            error: true);
        return;
      }
      final newVal = data['twoFactorEnabled'] == true;
      if (!mounted) return;
      final auth = context.read<AuthProvider>();
      if (auth.user != null) {
        auth.patch(auth.user!.copyWith(twoFactorEnabled: newVal));
      }
      showToast(context,
          newVal ? 'Two-factor auth enabled' : 'Two-factor auth disabled');
      Navigator.of(context).pop();
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final action = widget.currentlyEnabled ? 'Disable' : 'Enable';
    return Scaffold(
      appBar: AppBar(title: Text('$action two-factor auth')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 480),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                widget.currentlyEnabled
                    ? "We'll stop asking for an email code on sign-in."
                    : "After every sign-in, we'll email a 6-digit code you must enter to finish.",
                style: const TextStyle(
                    fontSize: 13, color: SpaersColors.slate500),
              ),
              const SizedBox(height: 18),
              SpaersTextField(
                  label: 'Current password',
                  controller: _password,
                  obscureText: true),
              const SizedBox(height: 18),
              PrimaryButton(
                label: _submitting ? '$action…' : action,
                onPressed: _submit,
                loading: _submitting,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
