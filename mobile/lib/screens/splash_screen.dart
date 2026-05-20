import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api/auth_provider.dart';
import '../theme.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});
  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    _route();
  }

  Future<void> _route() async {
    final auth = context.read<AuthProvider>();
    await auth.refresh();
    if (!mounted) return;
    if (auth.isCitizen) {
      Navigator.of(context).pushReplacementNamed('/dashboard');
    } else if (auth.isInstitution) {
      Navigator.of(context).pushReplacementNamed('/responder');
    } else {
      Navigator.of(context).pushReplacementNamed('/home');
    }
  }

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: Text('SPAERS',
            style: TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.w800,
                color: SpaersColors.brand,
                letterSpacing: -0.5)),
      ),
    );
  }
}
