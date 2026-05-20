import 'package:flutter/material.dart';

import '../theme.dart';

/// 4-level incident priority — matches the teammate's module.
enum IncidentPriority { low, medium, high, critical }

/// Display-tier status. Maps from the backend's raw `Emergency.status`:
///   active     → pending
///   dispatched → inProgress
///   resolved   → resolved
///   cancelled  → cancelled
///   expired    → expired
enum IncidentStatus { pending, inProgress, resolved, cancelled, expired }

/// Map the raw backend status string onto the display enum. Unknown values
/// fall through to `pending` so a new server-side state never crashes the
/// list.
IncidentStatus mapBackendStatus(String? raw) {
  switch (raw) {
    case 'active':
      return IncidentStatus.pending;
    case 'dispatched':
      return IncidentStatus.inProgress;
    case 'resolved':
      return IncidentStatus.resolved;
    case 'cancelled':
      return IncidentStatus.cancelled;
    case 'expired':
      return IncidentStatus.expired;
    default:
      return IncidentStatus.pending;
  }
}

class IncidentPriorityChip extends StatelessWidget {
  final IncidentPriority priority;
  const IncidentPriorityChip({super.key, required this.priority});

  Color get _bg {
    switch (priority) {
      case IncidentPriority.critical:
        return SpaersColors.brand.withValues(alpha: 0.08);
      case IncidentPriority.high:
        return SpaersColors.rose50;
      case IncidentPriority.medium:
        return SpaersColors.amber50;
      case IncidentPriority.low:
        return SpaersColors.slate100;
    }
  }

  Color get _fg {
    switch (priority) {
      case IncidentPriority.critical:
        return SpaersColors.brand;
      case IncidentPriority.high:
        return SpaersColors.rose700;
      case IncidentPriority.medium:
        return SpaersColors.amber800;
      case IncidentPriority.low:
        return SpaersColors.slate600;
    }
  }

  Color get _dot {
    switch (priority) {
      case IncidentPriority.critical:
        return SpaersColors.brand;
      case IncidentPriority.high:
        return SpaersColors.rose600;
      case IncidentPriority.medium:
        return Color(0xFFF59E0B);
      case IncidentPriority.low:
        return SpaersColors.slate400;
    }
  }

  String get _label {
    switch (priority) {
      case IncidentPriority.critical:
        return 'CRITICAL';
      case IncidentPriority.high:
        return 'HIGH';
      case IncidentPriority.medium:
        return 'MEDIUM';
      case IncidentPriority.low:
        return 'LOW';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: _bg,
        borderRadius: BorderRadius.circular(40),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 6,
            height: 6,
            decoration: BoxDecoration(color: _dot, shape: BoxShape.circle),
          ),
          const SizedBox(width: 6),
          Text(
            _label,
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w700,
              color: _fg,
              letterSpacing: 1.3,
            ),
          ),
        ],
      ),
    );
  }
}

class IncidentStatusChip extends StatelessWidget {
  final IncidentStatus status;
  const IncidentStatusChip({super.key, required this.status});

  Color get _bg {
    switch (status) {
      case IncidentStatus.pending:
        return SpaersColors.amber50;
      case IncidentStatus.inProgress:
        return const Color(0xFFE0F2FE); // sky-100
      case IncidentStatus.resolved:
        return SpaersColors.emerald50;
      case IncidentStatus.cancelled:
      case IncidentStatus.expired:
        return SpaersColors.slate100;
    }
  }

  Color get _fg {
    switch (status) {
      case IncidentStatus.pending:
        return SpaersColors.amber800;
      case IncidentStatus.inProgress:
        return const Color(0xFF075985); // sky-800
      case IncidentStatus.resolved:
        return SpaersColors.emerald700;
      case IncidentStatus.cancelled:
        return SpaersColors.slate600;
      case IncidentStatus.expired:
        return SpaersColors.slate500;
    }
  }

  String get _label {
    switch (status) {
      case IncidentStatus.pending:
        return 'Pending';
      case IncidentStatus.inProgress:
        return 'In Progress';
      case IncidentStatus.resolved:
        return 'Resolved';
      case IncidentStatus.cancelled:
        return 'Cancelled';
      case IncidentStatus.expired:
        return 'Expired';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: _bg,
        borderRadius: BorderRadius.circular(40),
      ),
      child: Text(
        _label,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w700,
          color: _fg,
        ),
      ),
    );
  }
}

class PanicTag extends StatelessWidget {
  const PanicTag({super.key});
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: SpaersColors.brand,
        borderRadius: BorderRadius.circular(SpaersRadius.md),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: const [
          Icon(Icons.warning_amber_rounded, size: 12, color: Colors.white),
          SizedBox(width: 4),
          Text(
            'PANIC',
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w800,
              color: Colors.white,
              letterSpacing: 1.2,
            ),
          ),
        ],
      ),
    );
  }
}

/// Soft red banner shown beneath a panic-sourced report ("My Reports" only).
class PanicBanner extends StatelessWidget {
  const PanicBanner({super.key});
  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: SpaersColors.rose50,
        border: Border.all(color: SpaersColors.rose200),
        borderRadius: BorderRadius.circular(SpaersRadius.md),
      ),
      child: Row(
        children: const [
          Icon(Icons.error_outline, size: 16, color: SpaersColors.rose600),
          SizedBox(width: 8),
          Text(
            'Panic Alert',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: SpaersColors.rose700,
            ),
          ),
        ],
      ),
    );
  }
}
