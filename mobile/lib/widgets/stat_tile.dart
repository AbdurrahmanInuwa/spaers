import 'package:flutter/material.dart';

import '../theme.dart';

class StatTile extends StatelessWidget {
  final String label;
  final String value;
  final Color valueColor;
  final bool highlight;
  const StatTile({
    super.key,
    required this.label,
    required this.value,
    this.valueColor = SpaersColors.slate900,
    this.highlight = false,
  });
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(SpaersRadius.xl),
        border: Border.all(
          color: highlight ? SpaersColors.brand : SpaersColors.slate200,
          width: highlight ? 1.5 : 1,
        ),
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
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            value,
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w800,
              color: valueColor,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: SpaersColors.slate500,
            ),
          ),
        ],
      ),
    );
  }
}
