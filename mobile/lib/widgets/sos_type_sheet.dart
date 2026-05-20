import 'package:flutter/material.dart';

import '../theme.dart';

const _types = ['Shooting', 'Medical', 'Assault', 'Fire', 'Flooding'];

/// Bottom sheet for picking the emergency type. Returns the chosen string,
/// or null if the user dismissed the sheet.
Future<String?> showSosTypeSheet(BuildContext context) async {
  return showModalBottomSheet<String>(
    context: context,
    backgroundColor: Colors.transparent,
    builder: (_) => Container(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 40,
              height: 4,
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(
                color: SpaersColors.slate200,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const Text(
              'What is the emergency?',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: SpaersColors.slate900,
              ),
            ),
            const SizedBox(height: 4),
            const Text(
              'Tap an option — a 5-second countdown will start.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 12, color: SpaersColors.slate500),
            ),
            const SizedBox(height: 16),
            for (final t in _types) ...[
              InkWell(
                borderRadius: BorderRadius.circular(SpaersRadius.lg),
                onTap: () => Navigator.of(context).pop(t),
                child: Container(
                  width: double.infinity,
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  margin: const EdgeInsets.only(bottom: 8),
                  decoration: BoxDecoration(
                    color: SpaersColors.slate50,
                    border: Border.all(color: SpaersColors.slate200),
                    borderRadius: BorderRadius.circular(SpaersRadius.lg),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(
                          t,
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                            color: SpaersColors.slate800,
                          ),
                        ),
                      ),
                      const Icon(Icons.arrow_forward_ios,
                          size: 14, color: SpaersColors.slate400),
                    ],
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    ),
  );
}

/// Modal countdown overlay. Returns true when the countdown completes (the
/// SOS should fire), false if the user cancelled.
Future<bool> showSosCountdown(BuildContext context, String type,
    {int seconds = 5}) async {
  final result = await showDialog<bool>(
    context: context,
    barrierDismissible: false,
    barrierColor: Colors.black87,
    builder: (_) => _CountdownDialog(type: type, seconds: seconds),
  );
  return result ?? false;
}

class _CountdownDialog extends StatefulWidget {
  final String type;
  final int seconds;
  const _CountdownDialog({required this.type, required this.seconds});
  @override
  State<_CountdownDialog> createState() => _CountdownDialogState();
}

class _CountdownDialogState extends State<_CountdownDialog> {
  late int _left;

  @override
  void initState() {
    super.initState();
    _left = widget.seconds;
    _tick();
  }

  Future<void> _tick() async {
    while (mounted && _left > 0) {
      await Future.delayed(const Duration(seconds: 1));
      if (!mounted) return;
      setState(() => _left -= 1);
    }
    if (mounted) Navigator.of(context).pop(true);
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(SpaersRadius.xl),
      ),
      insetPadding: const EdgeInsets.all(24),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(24, 28, 24, 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'SENDING SOS',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: SpaersColors.rose600,
                letterSpacing: 2.2,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              widget.type,
              style: const TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.w800,
                color: SpaersColors.slate900,
              ),
            ),
            const SizedBox(height: 4),
            const Text(
              'Reporting your location to nearby institutions.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 13, color: SpaersColors.slate500),
            ),
            const SizedBox(height: 24),
            Container(
              width: 128,
              height: 128,
              decoration: const BoxDecoration(
                color: SpaersColors.rose50,
                shape: BoxShape.circle,
              ),
              alignment: Alignment.center,
              child: Text(
                '$_left',
                style: const TextStyle(
                  fontSize: 56,
                  fontWeight: FontWeight.w800,
                  color: SpaersColors.rose600,
                ),
              ),
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: () => Navigator.of(context).pop(false),
                style: OutlinedButton.styleFrom(
                  foregroundColor: SpaersColors.slate700,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  side: const BorderSide(color: SpaersColors.slate300),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(SpaersRadius.md),
                  ),
                ),
                child: const Text('Cancel',
                    style: TextStyle(
                        fontSize: 14, fontWeight: FontWeight.w700)),
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'SOS will fire in $_left second${_left == 1 ? '' : 's'}.',
              style: const TextStyle(
                  fontSize: 11, color: SpaersColors.slate400),
            ),
          ],
        ),
      ),
    );
  }
}
