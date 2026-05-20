import 'package:flutter/material.dart';

import '../theme.dart';

/// Pulsing brand SOS button with two outward-rippling rings.
class SosButton extends StatefulWidget {
  final double size;
  final VoidCallback? onPressed;
  final bool loading;
  final String label;

  const SosButton({
    super.key,
    this.size = 240,
    required this.onPressed,
    this.loading = false,
    this.label = 'SOS',
  });

  @override
  State<SosButton> createState() => _SosButtonState();
}

class _SosButtonState extends State<SosButton>
    with TickerProviderStateMixin {
  late final AnimationController _ring1;
  late final AnimationController _ring2;

  @override
  void initState() {
    super.initState();
    _ring1 = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat();
    _ring2 = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    );
    Future.delayed(const Duration(seconds: 1), () {
      if (mounted) _ring2.repeat();
    });
  }

  @override
  void dispose() {
    _ring1.dispose();
    _ring2.dispose();
    super.dispose();
  }

  Widget _ring(Animation<double> a) {
    return AnimatedBuilder(
      animation: a,
      builder: (_, __) {
        final t = a.value;
        return IgnorePointer(
          child: Transform.scale(
            scale: 0.9 + (1.55 - 0.9) * t,
            child: Opacity(
              opacity: (0.55 * (1 - t)).clamp(0, 1),
              child: Container(
                width: widget.size,
                height: widget.size,
                decoration: const BoxDecoration(
                  color: SpaersColors.brand,
                  shape: BoxShape.circle,
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: widget.size,
      height: widget.size,
      child: Stack(
        alignment: Alignment.center,
        children: [
          _ring(_ring1),
          _ring(_ring2),
          Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: widget.loading ? null : widget.onPressed,
              customBorder: const CircleBorder(),
              child: Container(
                width: widget.size,
                height: widget.size,
                decoration: BoxDecoration(
                  color: SpaersColors.brand,
                  shape: BoxShape.circle,
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x80DC2626),
                      blurRadius: 60,
                      spreadRadius: 0,
                      offset: Offset(0, 25),
                    ),
                  ],
                ),
                child: Center(
                  child: widget.loading
                      ? const SizedBox(
                          height: 36,
                          width: 36,
                          child: CircularProgressIndicator(
                            strokeWidth: 3,
                            valueColor:
                                AlwaysStoppedAnimation(Colors.white),
                          ),
                        )
                      : Text(
                          widget.label,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 36,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 4,
                          ),
                        ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
