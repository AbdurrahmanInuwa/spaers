import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api/api.dart';
import '../api/auth_provider.dart';
import '../theme.dart';
import '../widgets/toast.dart';

const _kPhrase = 'Delete my account';

class DeleteAccountScreen extends StatefulWidget {
  const DeleteAccountScreen({super.key});
  @override
  State<DeleteAccountScreen> createState() => _DeleteAccountScreenState();
}

class _DeleteAccountScreenState extends State<DeleteAccountScreen> {
  final _ctrl = TextEditingController();
  bool _submitting = false;

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  Future<void> _delete() async {
    if (_ctrl.text != _kPhrase || _submitting) return;
    setState(() => _submitting = true);
    try {
      final res = await Api.instance.delete('/citizens/me', body: {
        'confirmation': _kPhrase,
      });
      final data = Api.instance.decode(res);
      if (res.statusCode < 200 || res.statusCode >= 300) {
        if (!mounted) return;
        showToast(context, data['error']?.toString() ?? 'Could not delete',
            error: true);
        setState(() => _submitting = false);
        return;
      }
      if (!mounted) return;
      await context.read<AuthProvider>().logout();
      if (!mounted) return;
      Navigator.of(context).pushNamedAndRemoveUntil('/home', (_) => false);
    } catch (e) {
      if (!mounted) return;
      showToast(context, 'Network error', error: true);
      setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final canDelete = _ctrl.text == _kPhrase;
    return Scaffold(
      appBar: AppBar(title: const Text('Delete account')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 520),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: SpaersColors.slate50,
                  borderRadius: BorderRadius.circular(SpaersRadius.md),
                  border: Border.all(color: SpaersColors.slate200),
                ),
                child: const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('You will lose:',
                        style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: SpaersColors.slate900)),
                    SizedBox(height: 6),
                    Text(
                      '• Your SPAERS ID and medical profile\n'
                      '• Family membership (if you created the family, it transfers to another member)\n'
                      '• Volunteer status, if any\n'
                      '• Profile photo',
                      style: TextStyle(
                          fontSize: 12, color: SpaersColors.slate700),
                    ),
                    SizedBox(height: 8),
                    Text(
                      'Past emergency records are kept anonymously for audit purposes.',
                      style: TextStyle(
                          fontSize: 11,
                          color: SpaersColors.slate500),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              const Text.rich(
                TextSpan(
                  text: 'Type ',
                  style: TextStyle(fontSize: 13, color: SpaersColors.slate700),
                  children: [
                    TextSpan(
                      text: _kPhrase,
                      style: TextStyle(
                          fontFamily: 'monospace',
                          fontWeight: FontWeight.w700,
                          color: SpaersColors.rose700),
                    ),
                    TextSpan(text: ' to confirm.'),
                  ],
                ),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: _ctrl,
                onChanged: (_) => setState(() {}),
                autocorrect: false,
                decoration: const InputDecoration(hintText: _kPhrase),
              ),
              const SizedBox(height: 18),
              FilledButton(
                onPressed: canDelete && !_submitting ? _delete : null,
                style: FilledButton.styleFrom(
                  backgroundColor: SpaersColors.rose600,
                  foregroundColor: Colors.white,
                  disabledBackgroundColor: SpaersColors.slate200,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(SpaersRadius.md),
                  ),
                ),
                child: Text(_submitting ? 'Deleting…' : 'Delete account',
                    style: const TextStyle(
                        fontSize: 14, fontWeight: FontWeight.w700)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
