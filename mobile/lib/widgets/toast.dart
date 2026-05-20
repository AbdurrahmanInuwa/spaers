import 'package:flutter/material.dart';

import '../theme.dart';

void showToast(BuildContext context, String message,
    {bool error = false}) {
  final messenger = ScaffoldMessenger.of(context);
  messenger
    ..clearSnackBars()
    ..showSnackBar(
      SnackBar(
        backgroundColor: error ? SpaersColors.red50 : SpaersColors.emerald50,
        elevation: 0,
        behavior: SnackBarBehavior.floating,
        margin: const EdgeInsets.fromLTRB(16, 12, 16, 24),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(SpaersRadius.md),
          side: BorderSide(
            color: error ? SpaersColors.red200 : SpaersColors.emerald200,
          ),
        ),
        duration: const Duration(seconds: 3),
        content: Text(
          message,
          style: TextStyle(
            color: error ? SpaersColors.red800 : SpaersColors.emerald800,
            fontSize: 14,
            fontWeight: FontWeight.w500,
          ),
        ),
      ),
    );
}
