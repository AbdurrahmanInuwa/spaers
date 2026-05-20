// Relative-time formatter — matches the web vocabulary so cards read the
// same on both platforms ("about 8 hours ago", "1 day ago", "25 days ago").

String timeAgo(DateTime? t) {
  if (t == null) return '';
  final diff = DateTime.now().difference(t);
  if (diff.inSeconds < 30) return 'just now';
  if (diff.inMinutes < 60) {
    final m = diff.inMinutes;
    return '$m minute${m == 1 ? '' : 's'} ago';
  }
  if (diff.inHours < 24) {
    final h = diff.inHours;
    return 'about $h hour${h == 1 ? '' : 's'} ago';
  }
  if (diff.inDays < 7) {
    final d = diff.inDays;
    return '$d day${d == 1 ? '' : 's'} ago';
  }
  if (diff.inDays < 30) {
    final w = (diff.inDays / 7).round();
    return '$w week${w == 1 ? '' : 's'} ago';
  }
  if (diff.inDays < 365) {
    final mo = (diff.inDays / 30).round();
    return '$mo month${mo == 1 ? '' : 's'} ago';
  }
  final y = (diff.inDays / 365).round();
  return '$y year${y == 1 ? '' : 's'} ago';
}
