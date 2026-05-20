import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api/auth_provider.dart';
import '../api/emergency_provider.dart';
import '../theme.dart';
import 'dashboard_emergency_screen.dart';
import 'family_screen.dart';
import 'my_reports_screen.dart';
import 'profile_screen.dart';
import 'volunteer_screen.dart';

class DashboardShell extends StatefulWidget {
  const DashboardShell({super.key});
  @override
  State<DashboardShell> createState() => _DashboardShellState();
}

class _DashboardShellState extends State<DashboardShell> {
  int _index = 0;
  bool _hydratedEmergency = false;
  // Cache page widgets so map state isn't lost when switching tabs.
  late final List<Widget> _pages;

  @override
  void initState() {
    super.initState();
    _pages = const [
      DashboardEmergencyScreen(),
      MyReportsScreen(),
      FamilyScreen(),
      VolunteerScreen(),
      ProfileScreen(),
    ];
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      if (!mounted) return;
      final em = context.read<EmergencyProvider>();
      if (!em.hydrated) {
        await em.hydrate();
      }
      if (mounted) setState(() => _hydratedEmergency = true);
    });
  }

  bool get _isAdult {
    final user = context.read<AuthProvider>().user;
    if (user?.dob == null) return true;
    return (user!.ageYears ?? 0) >= 18;
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    if (!auth.isAuthenticated) {
      return const Scaffold(
        body: Center(
          child: Text('Loading…',
              style: TextStyle(color: SpaersColors.slate500)),
        ),
      );
    }
    if (!_hydratedEmergency) {
      return const Scaffold(
        body: Center(
            child: Text('Loading…',
                style: TextStyle(color: SpaersColors.slate500))),
      );
    }

    final em = context.watch<EmergencyProvider>();
    final isFullBleed = _index == 0 && em.triggered;
    final tabs = _availableTabs();

    return Scaffold(
      backgroundColor: SpaersColors.slate50,
      drawer: _buildDrawer(),
      appBar: isFullBleed
          ? null
          : AppBar(
              title: Text(tabs[_index].title,
                  style: const TextStyle(
                      fontSize: 18, fontWeight: FontWeight.w700)),
            ),
      body: IndexedStack(index: _index, children: _pages),
      bottomNavigationBar: isFullBleed
          ? null
          : NavigationBar(
              selectedIndex: _index,
              backgroundColor: Colors.white,
              elevation: 4,
              indicatorColor: SpaersColors.brand.withValues(alpha: 0.12),
              labelBehavior:
                  NavigationDestinationLabelBehavior.onlyShowSelected,
              onDestinationSelected: (i) {
                final dest = tabs[i];
                if (dest.disabled) {
                  ScaffoldMessenger.of(context)
                    ..clearSnackBars()
                    ..showSnackBar(const SnackBar(
                      backgroundColor: SpaersColors.slate800,
                      content: Text('Available to users 18 and over'),
                    ));
                  return;
                }
                setState(() => _index = i);
              },
              destinations: [
                for (final t in tabs)
                  NavigationDestination(
                    icon: Icon(t.icon,
                        color: t.disabled
                            ? SpaersColors.slate300
                            : SpaersColors.slate500),
                    selectedIcon:
                        Icon(t.icon, color: SpaersColors.brand),
                    label: t.short,
                  ),
              ],
            ),
    );
  }

  List<_NavTab> _availableTabs() {
    final adult = _isAdult;
    return [
      const _NavTab('Emergency', 'SOS', Icons.warning_amber_rounded),
      const _NavTab('My Reports', 'Reports', Icons.list_alt_outlined),
      _NavTab('Family', 'Family', Icons.group_outlined, disabled: !adult),
      _NavTab('Volunteer', 'Volunteer', Icons.volunteer_activism_outlined,
          disabled: !adult),
      const _NavTab('Profile', 'Profile', Icons.person_outline),
    ];
  }

  Widget _buildDrawer() {
    return Drawer(
      backgroundColor: Colors.white,
      child: SafeArea(
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 16),
              alignment: Alignment.centerLeft,
              decoration: const BoxDecoration(
                border: Border(
                  bottom: BorderSide(color: SpaersColors.slate200),
                ),
              ),
              child: const Text(
                'SPAERS',
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  color: SpaersColors.brand,
                  letterSpacing: -0.5,
                ),
              ),
            ),
            const SizedBox(height: 8),
            for (var i = 0; i < _availableTabs().length; i++) ...[
              _drawerItem(_availableTabs()[i], i),
            ],
            const Spacer(),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: const BoxDecoration(
                border: Border(
                  top: BorderSide(color: SpaersColors.slate200),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Builder(builder: (_) {
                    final user = context.watch<AuthProvider>().user;
                    if (user == null) return const SizedBox();
                    return Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 8),
                      child: Text(
                        '${user.firstName} ${user.lastName}',
                        style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: SpaersColors.slate700),
                      ),
                    );
                  }),
                  const SizedBox(height: 8),
                  OutlinedButton(
                    onPressed: () async {
                      Navigator.of(context).pop();
                      await context.read<AuthProvider>().logout();
                      if (!mounted) return;
                      Navigator.of(context).pushNamedAndRemoveUntil(
                          '/home', (_) => false);
                    },
                    style: OutlinedButton.styleFrom(
                      foregroundColor: SpaersColors.slate600,
                      side: const BorderSide(color: SpaersColors.slate200),
                      shape: RoundedRectangleBorder(
                        borderRadius:
                            BorderRadius.circular(SpaersRadius.md),
                      ),
                    ),
                    child: const Align(
                      alignment: Alignment.centerLeft,
                      child: Text('Sign out',
                          style: TextStyle(fontWeight: FontWeight.w600)),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _drawerItem(_NavTab tab, int idx) {
    final selected = _index == idx;
    final disabled = tab.disabled;
    return InkWell(
      onTap: disabled
          ? null
          : () {
              setState(() => _index = idx);
              Navigator.of(context).pop();
            },
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
        padding:
            const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: selected ? SpaersColors.brand : Colors.transparent,
          borderRadius: BorderRadius.circular(SpaersRadius.md),
        ),
        child: Row(
          children: [
            Icon(tab.icon,
                size: 18,
                color: selected
                    ? Colors.white
                    : disabled
                        ? SpaersColors.slate300
                        : SpaersColors.slate600),
            const SizedBox(width: 10),
            Text(
              tab.title,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: selected
                    ? Colors.white
                    : disabled
                        ? SpaersColors.slate300
                        : SpaersColors.slate700,
              ),
            ),
            if (disabled) ...[
              const Spacer(),
              const Text('18+',
                  style: TextStyle(
                      fontSize: 10,
                      color: SpaersColors.slate300,
                      fontWeight: FontWeight.w600)),
            ]
          ],
        ),
      ),
    );
  }
}

class _NavTab {
  final String title;
  final String short;
  final IconData icon;
  final bool disabled;
  const _NavTab(this.title, this.short, this.icon, {this.disabled = false});
}
