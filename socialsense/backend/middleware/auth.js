import { supabaseAdmin } from '../config/supabase.js';

/**
 * Middleware to verify JWT token from Supabase
 */
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization token provided' });
    }

    const token = authHeader.split(' ')[1];

    // Verify the JWT with Supabase
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      console.error('[AUTH] Verification failed:', error?.message || 'No user found');
      return res.status(401).json({ error: 'Invalid or expired token', code: 'AUTH_FAILED' });
    }

    // Attach user to request
    req.user = user;
    req.token = token;

    // Get user profile with token balance
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      // Profile might not exist yet for new users
      req.profile = null;
    } else {
      req.profile = profile;
    }

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
};

/**
 * Optional authentication - doesn't fail if no token
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      req.profile = null;
      return next();
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      req.user = null;
      req.profile = null;
      return next();
    }

    req.user = user;
    req.token = token;

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    req.profile = profile || null;
    next();
  } catch (error) {
    req.user = null;
    req.profile = null;
    next();
  }
};

export default authenticate;
