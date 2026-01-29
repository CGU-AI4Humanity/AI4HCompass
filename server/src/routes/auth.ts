import { Router, Request, Response } from 'express';
import { db } from '../db/index';
import { users, otpCodes, passkeys } from '../db/schema';
import { eq, and, gt } from 'drizzle-orm';
import { seedExampleProject } from '../db/init';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';

declare module 'express-session' {
  interface SessionData {
    userId?: number;
    email?: string;
    challenge?: string;
  }
}

const router = Router();

const rpName = 'AI for Humanity Compass';
const rpID = process.env.REPL_SLUG ? `${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co` : 'localhost';
const origin = process.env.REPL_SLUG ? `https://${rpID}` : 'http://localhost:5000';

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

router.post('/request-otp', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await db.insert(otpCodes).values({
      email: email.toLowerCase(),
      code,
      expiresAt,
      used: false
    });

    console.log(`[DEV MODE] OTP for ${email}: ${code}`);

    res.json({ 
      success: true, 
      message: 'OTP sent to your email',
      devCode: process.env.NODE_ENV !== 'production' ? code : undefined
    });
  } catch (error) {
    console.error('OTP request error:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

router.post('/verify-otp', async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body;
    
    if (!email || !code) {
      return res.status(400).json({ error: 'Email and code are required' });
    }

    const emailLower = email.toLowerCase();
    const now = new Date();

    const validOtp = await db.query.otpCodes.findFirst({
      where: and(
        eq(otpCodes.email, emailLower),
        eq(otpCodes.code, code),
        eq(otpCodes.used, false),
        gt(otpCodes.expiresAt, now)
      )
    });

    if (!validOtp) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    await db.update(otpCodes)
      .set({ used: true })
      .where(eq(otpCodes.id, validOtp.id));

    let user = await db.query.users.findFirst({
      where: eq(users.email, emailLower)
    });

    if (!user) {
      const [newUser] = await db.insert(users).values({
        email: emailLower
      }).returning();
      user = newUser;
      
      await seedExampleProject(user.id);
    }

    req.session.userId = user.id;
    req.session.email = user.email;

    res.json({ 
      success: true, 
      user: { id: user.id, email: user.email }
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

router.post('/passkey/register-options', async (req: Request, res: Response) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Must be logged in to register passkey' });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, req.session.userId)
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userPasskeys = await db.query.passkeys.findMany({
      where: eq(passkeys.userId, user.id)
    });

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: new TextEncoder().encode(user.id.toString()),
      userName: user.email,
      attestationType: 'none',
      excludeCredentials: userPasskeys.map(pk => ({
        id: pk.credentialId,
        transports: pk.transports ? JSON.parse(pk.transports) : undefined
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred'
      }
    });

    req.session.challenge = options.challenge;

    res.json(options);
  } catch (error) {
    console.error('Passkey registration options error:', error);
    res.status(500).json({ error: 'Failed to generate registration options' });
  }
});

router.post('/passkey/register-verify', async (req: Request, res: Response) => {
  try {
    if (!req.session.userId || !req.session.challenge) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    const verification = await verifyRegistrationResponse({
      response: req.body,
      expectedChallenge: req.session.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID
    });

    if (!verification.verified || !verification.registrationInfo) {
      return res.status(400).json({ error: 'Verification failed' });
    }

    const { credentialID, credentialPublicKey, counter } = verification.registrationInfo;

    await db.insert(passkeys).values({
      userId: req.session.userId,
      credentialId: credentialID,
      publicKey: Buffer.from(credentialPublicKey).toString('base64'),
      counter: counter,
      transports: req.body.response?.transports ? JSON.stringify(req.body.response.transports) : null
    });

    delete req.session.challenge;

    res.json({ success: true });
  } catch (error) {
    console.error('Passkey registration verify error:', error);
    res.status(500).json({ error: 'Registration verification failed' });
  }
});

router.post('/passkey/auth-options', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    
    let userPasskeys: any[] = [];
    
    if (email) {
      const user = await db.query.users.findFirst({
        where: eq(users.email, email.toLowerCase())
      });
      
      if (user) {
        userPasskeys = await db.query.passkeys.findMany({
          where: eq(passkeys.userId, user.id)
        });
      }
    }

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: userPasskeys.map(pk => ({
        id: pk.credentialId,
        transports: pk.transports ? JSON.parse(pk.transports) : undefined
      })),
      userVerification: 'preferred'
    });

    req.session.challenge = options.challenge;
    if (email) req.session.email = email.toLowerCase();

    res.json(options);
  } catch (error) {
    console.error('Passkey auth options error:', error);
    res.status(500).json({ error: 'Failed to generate authentication options' });
  }
});

router.post('/passkey/auth-verify', async (req: Request, res: Response) => {
  try {
    if (!req.session.challenge) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    const passkey = await db.query.passkeys.findFirst({
      where: eq(passkeys.credentialId, req.body.id)
    });

    if (!passkey) {
      return res.status(400).json({ error: 'Passkey not found' });
    }

    const verification = await verifyAuthenticationResponse({
      response: req.body,
      expectedChallenge: req.session.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      authenticator: {
        credentialID: passkey.credentialId,
        credentialPublicKey: new Uint8Array(Buffer.from(passkey.publicKey, 'base64')),
        counter: passkey.counter
      }
    });

    if (!verification.verified) {
      return res.status(400).json({ error: 'Verification failed' });
    }

    await db.update(passkeys)
      .set({ counter: verification.authenticationInfo.newCounter })
      .where(eq(passkeys.id, passkey.id));

    const user = await db.query.users.findFirst({
      where: eq(users.id, passkey.userId)
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    req.session.userId = user.id;
    req.session.email = user.email;
    delete req.session.challenge;

    res.json({ 
      success: true, 
      user: { id: user.id, email: user.email }
    });
  } catch (error) {
    console.error('Passkey auth verify error:', error);
    res.status(500).json({ error: 'Authentication verification failed' });
  }
});

router.get('/me', async (req: Request, res: Response) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, req.session.userId)
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userPasskeys = await db.query.passkeys.findMany({
      where: eq(passkeys.userId, user.id)
    });

    res.json({ 
      user: { id: user.id, email: user.email },
      hasPasskey: userPasskeys.length > 0
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

router.post('/logout', (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ success: true });
  });
});

export default router;
