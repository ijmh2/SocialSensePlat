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

const TermsOfService = () => {
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
              Terms of Service
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
            <Section title="1. Acceptance of Terms">
              <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                By accessing or using CommentIQ ("the Service"), you agree to be bound by these Terms of Service.
                If you do not agree to these terms, please do not use the Service. We reserve the right to modify
                these terms at any time, and your continued use of the Service constitutes acceptance of any changes.
              </Typography>
            </Section>

            <Section title="2. Description of Service">
              <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                CommentIQ provides AI-powered social media comment analysis for YouTube and TikTok content.
                Our Service analyzes public comments to provide insights about audience sentiment, engagement patterns,
                and content performance. The Service operates on a token-based billing system where users purchase
                tokens to perform analyses.
              </Typography>
            </Section>

            <Section title="3. User Accounts and Tokens">
              <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8, mb: 2 }}>
                To use the Service, you must create an account and maintain accurate account information.
                You are responsible for maintaining the confidentiality of your account credentials.
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                <strong>Token Policy:</strong> Tokens are purchased through our payment system and are used to
                perform analyses. Tokens are non-refundable and non-transferable. Token prices and costs may
                change at any time. Unused tokens do not expire but may be forfeited if your account is terminated
                for violation of these terms.
              </Typography>
            </Section>

            <Section title="4. Acceptable Use">
              <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8, mb: 2 }}>
                You agree not to:
              </Typography>
              <Box component="ul" sx={{ pl: 3, color: 'text.secondary' }}>
                <li>Use the Service for any unlawful purpose</li>
                <li>Attempt to gain unauthorized access to any part of the Service</li>
                <li>Use automated systems to access the Service beyond intended functionality</li>
                <li>Interfere with or disrupt the Service or servers</li>
                <li>Reverse engineer or attempt to extract source code from the Service</li>
                <li>Use the Service to harass, abuse, or harm others</li>
                <li>Violate any third-party terms of service (including YouTube and TikTok)</li>
              </Box>
            </Section>

            <Section title="5. Intellectual Property">
              <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                The Service, including its original content, features, and functionality, is owned by CommentIQ
                and is protected by copyright, trademark, and other intellectual property laws. You retain ownership
                of your analysis results and data. By using the Service, you grant us a limited license to process
                your data solely for the purpose of providing the Service.
              </Typography>
            </Section>

            <Section title="6. Third-Party Services">
              <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                The Service accesses publicly available data from YouTube and TikTok through their respective APIs
                and public interfaces. Your use of the Service is also subject to the terms of service of these
                platforms. We are not responsible for the availability, accuracy, or policies of third-party services.
              </Typography>
            </Section>

            <Section title="7. Disclaimer of Warranties">
              <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS
                OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
                PARTICULAR PURPOSE, AND NON-INFRINGEMENT. We do not guarantee that the Service will be uninterrupted,
                secure, or error-free, or that the results of analyses will be accurate or complete.
              </Typography>
            </Section>

            <Section title="8. Limitation of Liability">
              <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, SOCIALSENSE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL,
                SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED
                DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES RESULTING FROM
                YOUR USE OF THE SERVICE. Our total liability shall not exceed the amount you paid to us in the twelve
                months preceding the claim.
              </Typography>
            </Section>

            <Section title="9. Trademark Disclaimer">
              <Box
                sx={{
                  p: 3,
                  borderRadius: 2,
                  background: alpha(theme.palette.warning.main, 0.1),
                  border: `1px solid ${alpha(theme.palette.warning.main, 0.3)}`,
                }}
              >
                <Typography variant="body1" sx={{ lineHeight: 1.8 }}>
                  <strong>YouTube</strong> is a trademark of Google LLC.<br />
                  <strong>TikTok</strong> is a registered trademark of ByteDance Ltd.<br /><br />
                  CommentIQ is an independent service and is <strong>not affiliated with, endorsed by,
                  sponsored by, or in any way officially connected with Google LLC, YouTube, ByteDance Ltd,
                  TikTok, or any of their subsidiaries or affiliates</strong>.<br /><br />
                  The official YouTube website can be found at{' '}
                  <Link href="https://www.youtube.com" target="_blank" rel="noopener noreferrer">
                    youtube.com
                  </Link>. The official TikTok website can be found at{' '}
                  <Link href="https://www.tiktok.com" target="_blank" rel="noopener noreferrer">
                    tiktok.com
                  </Link>.
                </Typography>
              </Box>
            </Section>

            <Section title="10. Changes to Terms">
              <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                We reserve the right to modify these Terms of Service at any time. We will notify users of
                significant changes by posting a notice on our website or sending an email. Your continued use
                of the Service after such modifications constitutes acceptance of the updated terms.
              </Typography>
            </Section>

            <Section title="11. Termination">
              <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                We may terminate or suspend your account and access to the Service immediately, without prior
                notice, for conduct that we believe violates these Terms of Service or is harmful to other users,
                us, or third parties, or for any other reason at our sole discretion.
              </Typography>
            </Section>

            <Section title="12. Contact Information">
              <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                If you have any questions about these Terms of Service, please contact us at:{' '}
                <Link href="mailto:support@getcommentiq.com">support@getcommentiq.com</Link>
              </Typography>
            </Section>
          </Box>

          {/* Footer */}
          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              <Link component={RouterLink} to="/privacy" sx={{ mr: 2 }}>
                Privacy Policy
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

export default TermsOfService;
