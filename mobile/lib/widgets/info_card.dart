import 'package:flutter/material.dart';

import '../theme.dart';

class InfoCard extends StatelessWidget {
  final String title;
  final Widget child;
  final EdgeInsetsGeometry padding;
  const InfoCard({
    super.key,
    required this.title,
    required this.child,
    this.padding = const EdgeInsets.all(20),
  });
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(SpaersRadius.xl),
        border: Border.all(color: SpaersColors.slate200),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0F000000),
            blurRadius: 4,
            offset: Offset(0, 1),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: SpaersColors.slate900,
            ),
          ),
          const SizedBox(height: 12),
          DefaultTextStyle.merge(
            style: const TextStyle(
              fontSize: 15,
              height: 1.5,
              color: SpaersColors.slate600,
            ),
            child: child,
          ),
        ],
      ),
    );
  }
}

class SectionCard extends StatelessWidget {
  final String title;
  final Color accent;
  final Widget? action;
  final List<Widget> tiles;
  const SectionCard({
    super.key,
    required this.title,
    required this.accent,
    required this.tiles,
    this.action,
  });
  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(SpaersRadius.xl),
        border: Border.all(color: SpaersColors.slate200),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0F000000),
            blurRadius: 4,
            offset: Offset(0, 1),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 12, 16, 12),
            child: Row(
              children: [
                Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: accent,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    title.toUpperCase(),
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: SpaersColors.slate500,
                      letterSpacing: 1.65,
                    ),
                  ),
                ),
                if (action != null) action!,
              ],
            ),
          ),
          const Divider(height: 1, color: SpaersColors.slate100),
          ...tiles,
        ],
      ),
    );
  }
}

class DetailTile extends StatelessWidget {
  final String label;
  final String value;
  final bool highlight;
  const DetailTile({
    super.key,
    required this.label,
    required this.value,
    this.highlight = false,
  });
  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 12),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(
          bottom: BorderSide(color: SpaersColors.slate100, width: 0.5),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label.toUpperCase(),
            style: const TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w600,
              color: SpaersColors.slate400,
              letterSpacing: 1.3,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w500,
              color: highlight ? SpaersColors.brand : SpaersColors.slate800,
            ),
          ),
        ],
      ),
    );
  }
}
