import 'package:flutter/material.dart';

import '../theme.dart';

class HardwareScreen extends StatelessWidget {
  const HardwareScreen({super.key});
  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: SpaersColors.brand.withValues(alpha: 0.08),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.bluetooth_searching,
                color: SpaersColors.brand,
              ),
            ),
            const SizedBox(height: 12),
            const Text('Hardware pairing',
                style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: SpaersColors.slate900)),
            const SizedBox(height: 6),
            const Text(
              'SPAERS-compatible wearables and panic buttons will appear here. Pairing is coming soon.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 13, color: SpaersColors.slate500),
            ),
          ],
        ),
      ),
    );
  }
}
