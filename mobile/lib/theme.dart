import 'package:flutter/material.dart';

// SPAERS design tokens — mirrors the web app's Tailwind theme.
class SpaersColors {
  static const brand = Color(0xFFDC2626);
  static const brandDark = Color(0xFF991B1B);

  static const slate950 = Color(0xFF020617);
  static const slate900 = Color(0xFF0F172A);
  static const slate800 = Color(0xFF1E293B);
  static const slate700 = Color(0xFF334155);
  static const slate600 = Color(0xFF475569);
  static const slate500 = Color(0xFF64748B);
  static const slate400 = Color(0xFF94A3B8);
  static const slate300 = Color(0xFFCBD5E1);
  static const slate200 = Color(0xFFE2E8F0);
  static const slate100 = Color(0xFFF1F5F9);
  static const slate50 = Color(0xFFF8FAFC);

  static const emerald50 = Color(0xFFECFDF5);
  static const emerald200 = Color(0xFFA7F3D0);
  static const emerald500 = Color(0xFF10B981);
  static const emerald600 = Color(0xFF059669);
  static const emerald700 = Color(0xFF047857);
  static const emerald800 = Color(0xFF065F46);

  static const amber50 = Color(0xFFFFFBEB);
  static const amber200 = Color(0xFFFDE68A);
  static const amber700 = Color(0xFFB45309);
  static const amber800 = Color(0xFF92400E);

  static const red50 = Color(0xFFFEF2F2);
  static const red200 = Color(0xFFFECACA);
  static const red700 = Color(0xFFB91C1C);
  static const red800 = Color(0xFF991B1B);

  static const rose50 = Color(0xFFFFF1F2);
  static const rose100 = Color(0xFFFFE4E6);
  static const rose200 = Color(0xFFFECDD3);
  static const rose500 = Color(0xFFF43F5E);
  static const rose600 = Color(0xFFE11D48);
  static const rose700 = Color(0xFFBE123C);
}

class SpaersRadius {
  static const md = 6.0;
  static const lg = 8.0;
  static const xl = 12.0;
  static const xl2 = 16.0;
}

class SpaersSpacing {
  static const xs = 4.0;
  static const sm = 8.0;
  static const md = 12.0;
  static const lg = 16.0;
  static const xl = 20.0;
  static const xl2 = 24.0;
  static const xl3 = 32.0;
}

ThemeData buildSpaersTheme() {
  const fontFamily = '.SF Pro Text';
  return ThemeData(
    useMaterial3: true,
    fontFamily: fontFamily,
    scaffoldBackgroundColor: SpaersColors.slate50,
    canvasColor: SpaersColors.slate50,
    colorScheme: ColorScheme.fromSeed(
      seedColor: SpaersColors.brand,
      primary: SpaersColors.brand,
      surface: Colors.white,
      onSurface: SpaersColors.slate900,
    ),
    splashFactory: NoSplash.splashFactory,
    appBarTheme: const AppBarTheme(
      backgroundColor: Colors.white,
      foregroundColor: SpaersColors.slate900,
      surfaceTintColor: Colors.white,
      elevation: 0,
      scrolledUnderElevation: 0,
      titleTextStyle: TextStyle(
        color: SpaersColors.slate900,
        fontSize: 16,
        fontWeight: FontWeight.w700,
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      isDense: true,
      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(SpaersRadius.md),
        borderSide: const BorderSide(color: SpaersColors.slate300),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(SpaersRadius.md),
        borderSide: const BorderSide(color: SpaersColors.slate300),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(SpaersRadius.md),
        borderSide: const BorderSide(color: SpaersColors.brand, width: 1.5),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(SpaersRadius.md),
        borderSide: const BorderSide(color: SpaersColors.rose600),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(SpaersRadius.md),
        borderSide: const BorderSide(color: SpaersColors.rose600, width: 1.5),
      ),
      labelStyle: const TextStyle(
        fontSize: 12,
        color: SpaersColors.slate700,
        fontWeight: FontWeight.w500,
      ),
      hintStyle: const TextStyle(
        fontSize: 14,
        color: SpaersColors.slate400,
      ),
    ),
    textTheme: const TextTheme(
      bodyLarge: TextStyle(fontSize: 15, color: SpaersColors.slate700),
      bodyMedium: TextStyle(fontSize: 14, color: SpaersColors.slate700),
      bodySmall: TextStyle(fontSize: 12, color: SpaersColors.slate500),
      titleLarge: TextStyle(
          fontSize: 24,
          fontWeight: FontWeight.w800,
          color: SpaersColors.slate900),
      titleMedium: TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w700,
          color: SpaersColors.slate900),
      titleSmall: TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w600,
          color: SpaersColors.slate800),
      labelSmall: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: SpaersColors.slate500,
          letterSpacing: 1.5),
    ),
  );
}

const eyebrowStyle = TextStyle(
  fontSize: 11,
  fontWeight: FontWeight.w700,
  color: SpaersColors.slate500,
  letterSpacing: 1.65, // ~0.15em
);
