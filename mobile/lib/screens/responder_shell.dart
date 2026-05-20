import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api/auth_provider.dart';
import '../theme.dart';
import 'incident_command_screen.dart';

/// Top-level scaffold for the institution (responder) side of the mobile
/// app. For MVP it hosts a single page — Incident Command — with the
/// institution's branding in the app bar and a sign-out action.
class ResponderShell extends StatelessWidget {
  const ResponderShell({super.key});

  Future<void> _confirmSignOut(BuildContext context) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Sign out?'),
        content: const Text(
          "You'll need to enter your password to get back in.",
          style: TextStyle(color: SpaersColors.slate600),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Stay signed in'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
                backgroundColor: SpaersColors.brand),
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Sign out'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    if (!context.mounted) return;
    await context.read<AuthProvider>().logout();
    if (!context.mounted) return;
    Navigator.of(context).pushNamedAndRemoveUntil('/home', (_) => false);
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    if (!auth.isInstitution) {
      // Defensive: if the auth state shifts mid-session, bounce to splash.
      WidgetsBinding.instance.addPostFrameCallback((_) {
        Navigator.of(context).pushNamedAndRemoveUntil('/', (_) => false);
      });
      return const Scaffold(
        body: Center(
          child: Text('Loading…',
              style: TextStyle(color: SpaersColors.slate500)),
        ),
      );
    }
    final inst = auth.institution!;
    return Scaffold(
      backgroundColor: SpaersColors.slate50,
      appBar: AppBar(
        titleSpacing: 16,
        toolbarHeight: 72,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text(
              'Incident Command',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w800,
                color: SpaersColors.slate900,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              inst.name,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: 12,
                color: SpaersColors.slate500,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
        actions: [
          PopupMenuButton<String>(
            tooltip: 'More',
            icon: const Icon(Icons.more_vert,
                color: SpaersColors.slate600),
            onSelected: (v) {
              if (v == 'logout') _confirmSignOut(context);
            },
            itemBuilder: (_) => const [
              PopupMenuItem<String>(
                value: 'logout',
                child: Row(
                  children: [
                    Icon(Icons.logout, size: 16, color: SpaersColors.slate600),
                    SizedBox(width: 8),
                    Text('Sign out'),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: const SafeArea(
        top: false,
        child: IncidentCommandScreen(),
      ),
    );
  }
}
