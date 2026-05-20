import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../theme.dart';

class OtpInput extends StatefulWidget {
  final int length;
  final ValueChanged<String> onChanged;
  final ValueChanged<String>? onCompleted;
  const OtpInput({
    super.key,
    this.length = 6,
    required this.onChanged,
    this.onCompleted,
  });

  @override
  State<OtpInput> createState() => _OtpInputState();
}

class _OtpInputState extends State<OtpInput> {
  late final List<TextEditingController> _ctrls;
  late final List<FocusNode> _focus;

  @override
  void initState() {
    super.initState();
    _ctrls = List.generate(widget.length, (_) => TextEditingController());
    _focus = List.generate(widget.length, (_) => FocusNode());
  }

  @override
  void dispose() {
    for (final c in _ctrls) {
      c.dispose();
    }
    for (final f in _focus) {
      f.dispose();
    }
    super.dispose();
  }

  void _emit() {
    final code = _ctrls.map((c) => c.text).join();
    widget.onChanged(code);
    if (code.length == widget.length) widget.onCompleted?.call(code);
  }

  void _handle(int i, String v) {
    // Paste handling: a single keystroke might land 6 chars at once
    if (v.length > 1) {
      final digits = v.replaceAll(RegExp(r'\D'), '');
      for (int k = 0; k < widget.length; k++) {
        _ctrls[k].text = k < digits.length ? digits[k] : '';
      }
      final firstEmpty =
          _ctrls.indexWhere((c) => c.text.isEmpty);
      final target = firstEmpty == -1 ? widget.length - 1 : firstEmpty;
      _focus[target].requestFocus();
      _emit();
      return;
    }
    if (v.isNotEmpty && i < widget.length - 1) {
      _focus[i + 1].requestFocus();
    }
    if (v.isEmpty && i > 0) _focus[i - 1].requestFocus();
    _emit();
  }

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        for (int i = 0; i < widget.length; i++)
          Container(
            width: 44,
            height: 52,
            margin: EdgeInsets.only(right: i == widget.length - 1 ? 0 : 6),
            child: TextField(
              controller: _ctrls[i],
              focusNode: _focus[i],
              maxLength: 1,
              autofocus: i == 0,
              textAlign: TextAlign.center,
              keyboardType: TextInputType.number,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              onChanged: (v) => _handle(i, v),
              style: const TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w700,
                color: SpaersColors.slate900,
              ),
              decoration: const InputDecoration(
                counterText: '',
                contentPadding:
                    EdgeInsets.symmetric(horizontal: 4, vertical: 4),
              ),
            ),
          ),
      ],
    );
  }
}
