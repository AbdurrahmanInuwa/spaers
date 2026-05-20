import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../theme.dart';

class SpaersTextField extends StatelessWidget {
  final String label;
  final TextEditingController controller;
  final String? hint;
  final TextInputType? keyboardType;
  final bool obscureText;
  final String? autofillHint;
  final List<TextInputFormatter>? inputFormatters;
  final int? maxLength;
  final int minLines;
  final int maxLines;
  final bool enabled;
  final FocusNode? focusNode;
  final ValueChanged<String>? onChanged;
  final String? errorText;
  final Widget? prefix;
  final Widget? suffix;
  final TextCapitalization textCapitalization;

  const SpaersTextField({
    super.key,
    required this.label,
    required this.controller,
    this.hint,
    this.keyboardType,
    this.obscureText = false,
    this.autofillHint,
    this.inputFormatters,
    this.maxLength,
    this.minLines = 1,
    this.maxLines = 1,
    this.enabled = true,
    this.focusNode,
    this.onChanged,
    this.errorText,
    this.prefix,
    this.suffix,
    this.textCapitalization = TextCapitalization.none,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(bottom: 4),
          child: Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              color: SpaersColors.slate700,
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
        TextField(
          controller: controller,
          focusNode: focusNode,
          enabled: enabled,
          obscureText: obscureText,
          keyboardType: keyboardType,
          autofillHints: autofillHint == null ? null : [autofillHint!],
          inputFormatters: inputFormatters,
          maxLength: maxLength,
          minLines: minLines,
          maxLines: obscureText ? 1 : maxLines,
          textCapitalization: textCapitalization,
          onChanged: onChanged,
          style: const TextStyle(
            fontSize: 14,
            color: SpaersColors.slate900,
          ),
          decoration: InputDecoration(
            hintText: hint,
            counterText: '',
            errorText: errorText,
            prefixIcon: prefix,
            suffixIcon: suffix,
          ),
        ),
      ],
    );
  }
}

class SpaersDropdown<T> extends StatelessWidget {
  final String label;
  final T? value;
  final List<DropdownMenuItem<T>> items;
  final ValueChanged<T?> onChanged;
  final String? hint;
  const SpaersDropdown({
    super.key,
    required this.label,
    required this.value,
    required this.items,
    required this.onChanged,
    this.hint,
  });
  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(bottom: 4),
          child: Text(
            label,
            style: const TextStyle(
                fontSize: 12,
                color: SpaersColors.slate700,
                fontWeight: FontWeight.w500),
          ),
        ),
        InputDecorator(
          decoration: const InputDecoration(),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<T>(
              isExpanded: true,
              value: value,
              hint: Text(hint ?? '',
                  style: const TextStyle(
                      fontSize: 14, color: SpaersColors.slate400)),
              icon: const Icon(Icons.keyboard_arrow_down,
                  color: SpaersColors.slate500),
              items: items,
              onChanged: onChanged,
              style: const TextStyle(
                  fontSize: 14, color: SpaersColors.slate900),
            ),
          ),
        ),
      ],
    );
  }
}

class CheckboxTile extends StatelessWidget {
  final bool value;
  final ValueChanged<bool?> onChanged;
  final Widget label;
  const CheckboxTile({
    super.key,
    required this.value,
    required this.onChanged,
    required this.label,
  });
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: value ? Colors.white : SpaersColors.slate50,
        border: Border.all(
            color: value ? SpaersColors.brand : SpaersColors.slate200),
        borderRadius: BorderRadius.circular(SpaersRadius.md),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            height: 24,
            width: 24,
            child: Checkbox(
              value: value,
              onChanged: onChanged,
              activeColor: SpaersColors.brand,
              materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
            ),
          ),
          const SizedBox(width: 8),
          Expanded(child: label),
        ],
      ),
    );
  }
}
