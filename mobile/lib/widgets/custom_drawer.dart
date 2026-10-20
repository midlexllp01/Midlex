import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config/theme.dart';
import '../providers/auth_provider.dart';
import '../screens/public/about_screen.dart';
import '../screens/public/practice_areas_screen.dart';
import '../screens/public/team_screen.dart';
import '../screens/public/insights_screen.dart';
import '../screens/public/contact_screen.dart';
import '../screens/public/book_consultation_screen.dart';
import '../screens/onboarding/onboarding_screen.dart';
import '../screens/auth/login_screen.dart';
import '../screens/dashboard/dashboard_screen.dart';
import '../screens/dashboard/cases_title_list_screen.dart';
import '../screens/dashboard/profile_screen.dart';

class CustomDrawer extends StatelessWidget {
  const CustomDrawer({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);

    return Drawer(
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          DrawerHeader(
            decoration: const BoxDecoration(color: AppTheme.primary),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Image.asset(
                  'assets/images/logo.jpg',
                  height: 50,
                  errorBuilder: (context, error, stackTrace) =>
                      const Icon(Icons.gavel, size: 50, color: AppTheme.secondary),
                ),
                const SizedBox(height: 10),
                const Text(
                  'MIDLEX LLP',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const Text(
                  'Barristers & Solicitors',
                  style: TextStyle(color: AppTheme.secondary, fontSize: 13),
                ),
              ],
            ),
          ),
          ListTile(
            leading: const Icon(Icons.home_outlined, color: AppTheme.primary),
            title: const Text('Home'),
            onTap: () => Navigator.pushReplacement(
              context,
              MaterialPageRoute(builder: (context) => auth.isAuthenticated ? const DashboardScreen() : const LoginScreen()),
            ),
          ),
          ListTile(
            leading: const Icon(Icons.info_outline, color: AppTheme.primary),
            title: const Text('About Us'),
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (context) => const AboutScreen()),
            ),
          ),
          ListTile(
            leading: const Icon(Icons.account_balance_outlined, color: AppTheme.primary),
            title: const Text('Practice Areas'),
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (context) => const PracticeAreasScreen()),
            ),
          ),
          ListTile(
            leading: const Icon(Icons.people_outline, color: AppTheme.primary),
            title: const Text('Our Team'),
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (context) => const TeamScreen()),
            ),
          ),
          ListTile(
            leading: const Icon(Icons.article_outlined, color: AppTheme.primary),
            title: const Text('Insights'),
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (context) => const InsightsScreen()),
            ),
          ),
          ListTile(
            leading: const Icon(Icons.contact_mail_outlined, color: AppTheme.primary),
            title: const Text('Contact Us'),
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (context) => const ContactScreen()),
            ),
          ),
          ListTile(
            leading: const Icon(Icons.slideshow_outlined, color: AppTheme.primary),
            title: const Text('App Tour & Overview'),
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (context) => const OnboardingScreen()),
            ),
          ),
          const Divider(),
          ListTile(
            leading: const Icon(Icons.calendar_month_outlined, color: AppTheme.secondary),
            title: const Text('Book Consultation', style: TextStyle(fontWeight: FontWeight.bold)),
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (context) => const BookConsultationScreen()),
            ),
          ),
          const Divider(),
          if (auth.isAuthenticated) ...[
            ListTile(
              leading: const Icon(Icons.dashboard, color: AppTheme.primary),
              title: const Text('Dashboard', style: TextStyle(fontWeight: FontWeight.bold)),
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const DashboardScreen()),
              ),
            ),
            ListTile(
              leading: const Icon(Icons.folder_special, color: AppTheme.secondary),
              title: const Text('Cases', style: TextStyle(fontWeight: FontWeight.bold)),
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const CasesTitleListScreen()),
              ),
            ),
            ListTile(
              leading: const Icon(Icons.lock_outline, color: AppTheme.primary),
              title: const Text('Profile & Security', style: TextStyle(fontWeight: FontWeight.bold)),
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const ProfileScreen()),
              ),
            ),
            ListTile(
              leading: const Icon(Icons.logout, color: Colors.red),
              title: const Text('Sign Out', style: TextStyle(color: Colors.red)),
              onTap: () async {
                await auth.logout();
                if (context.mounted) {
                  Navigator.pushReplacement(
                    context,
                    MaterialPageRoute(builder: (context) => const LoginScreen()),
                  );
                }
              },
            ),
          ] else ...[
            ListTile(
              leading: const Icon(Icons.person_outline, color: AppTheme.primary),
              title: const Text('Client Sign In'),
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const LoginScreen()),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
