import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Link,
  Divider,
  useTheme,
  alpha,
} from '@mui/material';
import { AutoGraph, ArrowBack } from '@mui/icons-material';
import { motion } from 'framer-motion';

const MotionBox = motion(Box);

const Section = ({ title, children }) => (
  <Box sx={{ mb: 4 }}>
    <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
      {title}
    </Typography>
    {children}
  </Box>
);

const PrivacyPolicy = () => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        py: 4,
        background: `radial-gradient(ellipse at top right, ${alpha(theme.palette.secondary.main, 0.1)} 0%, transparent 50%),
                     radial-gradient(ellipse at bottom left, ${alpha(theme.palette.primary.main, 0.08)} 0%, transparent 50%),
                     ${theme.palette.background.default}`,
      }}
    >
      <Container maxWidth="md">
        <MotionBox
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <Box sx={{ mb: 4 }}>
            <Link
              component={RouterLink}
              to="/"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                color: 'text.secondary',
                textDecoration: 'none',
                mb: 3,
                '&:hover': { color: 'primary.main' },
              }}
            >
              <ArrowBack fontSize="small" />
              Back to Home
            </Link>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AutoGraph sx={{ color: 'white', fontSize: 24 }} />
              </Box>
              <Typography variant="h5" fontWeight={700}>
                CommentIQ
              </Typography>
            </Box>

            <Typography variant="h4" fontWeight={700} sx={{ mb: 1 }}>
              Privacy Policy
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Last updated: February 12, 2026
            </Typography>
          </Box>

          <Divider sx={{ mb: 4 }} />

          {/* Content */}
          <Box
            sx={{
              p: { xs: 3, sm: 4 },
              borderRadius: 3,
              background: alpha(theme.palette.background.paper, 0.8),
              backdropFilter: 'blur(10px)',
              border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
            }}
          >
            <Section title="1. Introduction">
              <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                CommentIQ ("we", "us", or "our") is committed to protecting your privacy. This Privacy Policy
                explains how we collect, use, disclose, and safeguard your information when you use our
                AI-powered social media comment analysis service ("the Service").
              </Typography>
            </Section>

            <Section title="2. Information We Collect">
              <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8, mb: 2 }}>
                <strong>Account Information:</strong> When you create an account, we collect your name, email
                address, and password (stored securely via Supabase authentication).
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8, mb: 2 }}>
                <strong>Payment Information:</strong> When you purchase tokens, payment processing is handled
                by Stripe. We do not store your credit card details. We receive only transaction confirmations
                and purchase history.
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8, mb: 2 }}>
                <strong>Analysis Data:</strong> When you perform analyses, we store the video URLs you submit,
                the comments we analyze (which are publicly available), and the AI-generated insights.
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                <strong>Usage Data:</strong> We automatically collect information about how you interact with
                the Service, including access times, pages viewed, and features used.
              </Typography>
            </Section>

            <Section title="3. How We Use Your Information">
              <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8, mb: 2 }}>
                We use your information to:
              </Typography>
              <Box component="ul" sx={{ pl: 3, color: 'text.secondary' }}>
                <li>Provide, maintain, and improve the Service</li>
                <li>Process transactions and send related information</li>
                <li>Send you technical notices, updates, and support messages</li>
                <li>Respond to your comments and questions</li>
                <li>Monitor and analyze trends, usage, and activities</li>
                <li>Detect, investigate, and prevent fraudulent or unauthorized activity</li>
              </Box>
            </Section>

            <Section title="4. Third-Party Services">
              <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8, mb: 2 }}>
                We use the following third-party services to operate the Service:
              </Typography>
              <Box component="ul" sx={{ pl: 3, color: 'text.secondary', mb: 2 }}>
                <li><strong>Supabase:</strong> Authentication and database hosting</li>
                <li><strong>Stripe:</strong> Payment processing</li>
                <li><strong>OpenAI:</strong> AI analysis and natural language processing</li>
                <li><strong>YouTube API:</strong> Fetching public video data and comments</li>
                <li><strong>TikTok:</strong> Fetching public video data and comments</li>
              </Box>
              <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                Each of these services has their own privacy policy governing their use of your data.
              </Typography>
            </Section>

            <Section title="5. Data Retention">
              <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                We retain your account information for as long as your account is active. Analysis data is
                retained to provide you with historical insights and account scoring features. You may request
                deletion of your data at any time by contacting us or deleting your account through the
                Settings page.
              </Typography>
            </Section>

            <Section title="6. Data Security">
              <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                We implement appropriate technical and organizational security measures to protect your
                information. This includes encryption in transit (HTTPS), secure password hashing, and
                access controls. However, no method of transmission over the Internet is 100% secure,
                and we cannot guarantee absolute security.
              </Typography>
            </Section>

            <Section title="7. Your Rights">
              <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8, mb: 2 }}>
                You have the right to:
              </Typography>
              <Box component="ul" sx={{ pl: 3, color: 'text.secondary' }}>
                <li><strong>Access:</strong> Request a copy of the data we hold about you</li>
                <li><strong>Correction:</strong> Update or correct inaccurate information</li>
                <li><strong>Deletion:</strong> Request deletion of your account and associated data</li>
                <li><strong>Export:</strong> Download your analysis history in CSV format</li>
                <li><strong>Opt-out:</strong> Unsubscribe from marketing communications</li>
              </Box>
            </Section>

            <Section title="8. Cookies">
              <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                We use essential cookies required for authentication and session management.
                We do not use advertising cookies or third-party tracking cookies.
                Your authentication state is managed securely through Supabase.
              </Typography>
            </Section>

            <Section title="9. Children's Privacy">
              <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                The Service is not intended for users under 13 years of age. We do not knowingly collect
                personal information from children under 13. If we become aware that we have collected
                personal information from a child under 13, we will take steps to delete that information.
              </Typography>
            </Section>

            <Section title="10. International Data Transfers">
              <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                Your information may be transferred to and processed in countries other than your own.
                We ensure appropriate safeguards are in place to protect your information in accordance
                with this Privacy Policy.
              </Typography>
            </Section>

            <Section title="11. Changes to This Policy">
              <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                We may update this Privacy Policy from time to time. We will notify you of any material
                changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
                Your continued use of the Service after such changes constitutes acceptance of the updated policy.
              </Typography>
            </Section>

            <Section title="12. Contact Us">
              <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                If you have any questions about this Privacy Policy or our data practices, please contact us at:{' '}
                <Link href="mailto:privacy@getcommentiq.com">privacy@getcommentiq.com</Link>
              </Typography>
            </Section>
          </Box>

          {/* Footer */}
          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              <Link component={RouterLink} to="/terms" sx={{ mr: 2 }}>
                Terms of Service
              </Link>
              <Link component={RouterLink} to="/">
                Back to Home
              </Link>
            </Typography>
          </Box>
        </MotionBox>
      </Container>
    </Box>
  );
};

export default PrivacyPolicy;
