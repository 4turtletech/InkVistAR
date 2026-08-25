const PRIVILEGED_ROLES = new Set(['admin']);
const STAFF_ROLES = new Set(['admin', 'manager']);

const normalizePath = (req) => String(req.path || req.originalUrl || '').split('?')[0];
const asPositiveInteger = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const deny = (res, message = 'You do not have permission to access this resource.') =>
  res.status(403).json({ success: false, message });

const notFound = (res, resource = 'Resource') =>
  res.status(404).json({ success: false, message: `${resource} not found.` });

async function runAuthentication(authenticate, req, res) {
  let passed = false;
  let middlewareError;
  await authenticate(req, res, (error) => {
    middlewareError = error;
    passed = !error;
  });
  if (middlewareError) throw middlewareError;
  return passed;
}

function extractIdentityPath(path) {
  const patterns = [
    /^\/api\/customer\/(?:profile\/|dashboard\/|aftercare\/)?(\d+)(?:\/|$)/,
    /^\/api\/reports\/customer\/(\d+)(?:\/|$)/,
    /^\/api\/notifications\/(\d+)\/read-all$/,
    /^\/api\/users\/(\d+)\/push-token$/,
  ];
  for (const pattern of patterns) {
    const match = path.match(pattern);
    if (match) return asPositiveInteger(match[1]);
  }
  return null;
}

function extractArtistPath(path) {
  const match = path.match(/^\/api\/artist\/(?:dashboard\/|profile\/)?(\d+)(?:\/|$)/);
  return match ? asPositiveInteger(match[1]) : null;
}

function extractAppointmentId(req, path) {
  const pathMatch = path.match(/^\/api\/(?:customer\/)?appointments\/(\d+)(?:\/|$)/)
    || path.match(/^\/api\/artist\/appointments\/(\d+)(?:\/|$)/)
    || path.match(/^\/api\/health-screenings\/appointment\/(\d+)$/);
  return pathMatch
    ? asPositiveInteger(pathMatch[1])
    : asPositiveInteger(req.body?.appointmentId || req.query?.appointmentId);
}

function classifyRequest(req) {
  const path = normalizePath(req);
  const method = String(req.method || 'GET').toUpperCase();

  if (!path.startsWith('/api/')) return null;

  // Authentication, verification, public browsing, guest consultation booking,
  // webhook delivery, and the public chatbot are intentionally outside Task 3.
  const publicExact = new Set([
    '/api/test', '/api/login', '/api/send-otp',
    '/api/verify-otp', '/api/verify', '/api/register', '/api/resend-verification',
    '/api/gallery/categories', '/api/gallery/works', '/api/gallery/art-of-the-day',
    '/api/customer/artists', '/api/public/calendar-availability',
    '/api/inventory/jewelry', '/api/testimonials', '/api/ar/config',
    '/api/contact', '/api/chat', '/api/payments/webhook',
  ]);
  if (path.startsWith('/api/auth/') || path.startsWith('/api/password-recovery/') || publicExact.has(path)) return null;
  if (method === 'GET' && /^\/api\/artist\/\d+\/availability$/.test(path)) return null;
  if (method === 'GET' && /^\/api\/artists\/\d+\/(?:public|reviews)$/.test(path)) return null;
  if (method === 'GET' && path === '/api/reviews') return null;
  if (method === 'GET' && path === '/api/services') return null;
  if (method === 'POST' && path === '/api/customer/appointments') return { optional: true, kind: 'new-appointment' };
  if (method === 'POST' && path === '/api/admin/appointments' && req.body?.isFromWizard === true) {
    return { optional: true, kind: 'new-appointment' };
  }

  if (path.startsWith('/api/debug/')) return { roles: ['admin'], kind: 'role' };

  if (path.startsWith('/api/admin/')) {
    const managerRead = method === 'GET' && /^\/api\/admin\/appointments(?:\/\d+)?$/.test(path);
    const managerInventory = /^\/api\/admin\/(?:inventory|service-kits)(?:\/|$)/.test(path)
      && !path.endsWith('/permanent');
    const artistSessionSupplyRead = method === 'GET'
      && (path === '/api/admin/inventory' || path === '/api/admin/service-kits');
    const roles = artistSessionSupplyRead
      ? ['admin', 'manager', 'artist']
      : managerRead || managerInventory
        ? ['admin', 'manager']
        : ['admin'];
    return { roles, kind: 'role' };
  }
  if (path.startsWith('/api/manager/')) return { roles: ['admin', 'manager'], kind: 'role' };

  if (['/api/customer/change-password', '/api/artist/change-password', '/api/request-email-change', '/api/confirm-email-change'].includes(path)) {
    const roles = path.includes('/artist/') ? ['artist'] : path.includes('/customer/') ? ['customer'] : ['admin', 'manager', 'artist', 'customer'];
    return { roles, kind: 'self-body' };
  }
  if (path === '/api/push/register') return { roles: ['admin', 'manager', 'artist', 'customer'], kind: 'self-body' };
  if (/^\/api\/users\/\d+\/push-token$/.test(path)) return { roles: ['admin', 'manager', 'artist', 'customer'], kind: 'self-path' };

  if (/^\/api\/customer\/(?:profile\/|dashboard\/|aftercare\/)?\d+(?:\/appointments|\/transactions|\/favorites|\/my-tattoos)?$/.test(path)) {
    return { roles: ['admin', 'manager', 'customer'], kind: 'identity-path' };
  }
  if (path === '/api/customer/favorites' && method === 'POST') return { roles: ['customer'], kind: 'self-body' };
  if (/^\/api\/customer\/\d+\/consent$/.test(path)) {
    return { roles: ['admin', 'manager', 'artist', 'customer'], kind: 'customer-consent' };
  }
  if (/^\/api\/customer\/appointments\/\d+\/(?:reschedule|reschedule-request|cancel)$/.test(path)) {
    return { roles: ['customer'], kind: 'appointment' };
  }

  if (/^\/api\/artist\/(?:dashboard\/|profile\/)?\d+(?:\/(?:appointments|clients|portfolio|earnings-ledger))?$/.test(path)) {
    return { roles: ['admin', 'artist'], kind: 'artist-path' };
  }
  if (path === '/api/artist/appointments' && method === 'POST') return { roles: ['admin', 'artist'], kind: 'role' };
  if (path === '/api/artist/portfolio' && method === 'POST') return { roles: ['admin', 'artist'], kind: 'artist-body' };
  if (path === '/api/artist/clients' && method === 'POST') return { roles: ['admin'], kind: 'role' };
  if (/^\/api\/artist\/clients\/\d+$/.test(path)) return { roles: ['admin'], kind: 'role' };
  if (/^\/api\/artist\/portfolio\/\d+(?:\/visibility)?$/.test(path)) return { roles: ['admin', 'artist'], kind: 'portfolio-work' };
  if (/^\/api\/artist\/appointments\/\d+\/(?:accept|reject|draft)$/.test(path)) return { roles: ['admin', 'artist'], kind: 'appointment' };

  if (/^\/api\/appointments\/\d+\/(?:project-timeline|materials|release-material|status|details|after-photo|payment-status|transactions)$/.test(path)) {
    const customerReadable = /\/(?:project-timeline|payment-status|transactions)$/.test(path) && method === 'GET';
    return { roles: customerReadable ? ['admin', 'manager', 'artist', 'customer'] : ['admin', 'manager', 'artist'], kind: 'appointment' };
  }
  if (/^\/api\/health-screenings\/appointment\/\d+$/.test(path) && method === 'GET') {
    return { roles: ['admin', 'manager', 'artist', 'customer'], kind: 'appointment' };
  }
  if (path === '/api/payments/create-checkout-session') return { roles: ['admin', 'customer'], kind: 'appointment' };
  if (path === '/api/payments/status') return { roles: ['admin', 'manager', 'customer'], kind: 'payment' };

  if (path === '/api/projects' && method === 'POST') return { roles: ['admin', 'manager', 'artist'], kind: 'new-project' };
  if (path === '/api/projects' && method === 'GET') return { roles: ['admin', 'manager', 'artist', 'customer'], kind: 'project-list' };
  if (/^\/api\/projects\/\d+(?:\/(?:complete|link-session|complete-early))?$/.test(path)) {
    const readOnly = method === 'GET';
    return { roles: readOnly ? ['admin', 'manager', 'artist', 'customer'] : ['admin', 'manager', 'artist'], kind: 'project' };
  }

  if (/^\/api\/notifications\/\d+(?:\/(?:read|read-all))?$/.test(path)) {
    const isUserCollection = method === 'GET' || path.endsWith('/read-all');
    return { roles: ['admin', 'manager', 'artist', 'customer'], kind: isUserCollection ? 'self-path' : 'notification' };
  }

  if (path === '/api/reports' && method === 'POST') return { roles: ['customer'], kind: 'self-body' };
  if (/^\/api\/reports\/customer\/\d+$/.test(path)) return { roles: ['customer'], kind: 'identity-path' };
  if (/^\/api\/reports\/RPT-\d+$/.test(path)) return { roles: ['admin', 'customer'], kind: 'report-code' };
  if (/^\/api\/reports\/\d+\/reply$/.test(path)) return { roles: ['admin', 'customer'], kind: 'report' };

  if (path === '/api/reviews' && method === 'POST') return { roles: ['customer'], kind: 'appointment' };
  if (/^\/api\/reviews\/check\/\d+$/.test(path)) return { roles: ['customer'], kind: 'appointment' };

  if (path === '/api/services' && method !== 'GET') return { roles: ['admin'], kind: 'role' };
  if (/^\/api\/invoices\/(?:by-number\/[^/]+|[^/]+)$/.test(path)) return { roles: ['admin', 'manager', 'customer'], kind: 'invoice' };
  if (/^\/api\/chat\/[^/]+$/.test(path)) return { roles: ['admin', 'manager', 'customer'], kind: 'chat-room' };
  if (path === '/api/chat/report-abuse') return { roles: ['customer'], kind: 'self-body' };

  return null;
}

function createHighRiskProtection({ authenticate, pool }) {
  const database = pool.promise();

  const loadAppointment = async (appointmentId) => {
    const [rows] = await database.query(
      `SELECT id, customer_id, artist_id, secondary_artist_id
       FROM appointments WHERE id = ? AND is_deleted = 0 LIMIT 1`,
      [appointmentId]
    );
    return rows[0];
  };

  const ownsAppointment = (auth, appointment) => {
    if (STAFF_ROLES.has(auth.role)) return true;
    if (auth.role === 'customer') return Number(appointment.customer_id) === Number(auth.userId);
    if (auth.role === 'artist') {
      return Number(appointment.artist_id) === Number(auth.userId)
        || Number(appointment.secondary_artist_id) === Number(auth.userId);
    }
    return false;
  };

  return async function protectHighRiskRoute(req, res, next) {
    const policy = classifyRequest(req);
    if (!policy) return next();

    if (policy.optional && !String(req.headers.authorization || '').startsWith('Bearer ')) return next();

    try {
      const authenticated = await runAuthentication(authenticate, req, res);
      if (!authenticated || res.headersSent) return;

      if (policy.roles && !policy.roles.includes(req.auth.role)) return deny(res);
      const path = normalizePath(req);

      if (policy.kind === 'role') return next();

      if (policy.kind === 'identity-path') {
        const requestedId = extractIdentityPath(path);
        if (PRIVILEGED_ROLES.has(req.auth.role) || Number(requestedId) === Number(req.auth.userId)) return next();
        return deny(res, 'You may only access your own account data.');
      }

      if (policy.kind === 'self-path') {
        const requestedId = extractIdentityPath(path);
        return Number(requestedId) === Number(req.auth.userId)
          ? next()
          : deny(res, 'You may only access your own account data.');
      }

      if (policy.kind === 'self-body') {
        const suppliedId = asPositiveInteger(
          req.body?.userId || req.body?.user_id || req.body?.customer_id || req.body?.customerId || req.body?.artistId
        );
        if (suppliedId && suppliedId !== Number(req.auth.userId)) return deny(res, 'The supplied account does not match the authenticated account.');
        return next();
      }

      if (policy.kind === 'new-appointment') {
        const suppliedId = asPositiveInteger(req.body?.customerId || req.body?.customer_id);
        if (suppliedId && suppliedId !== Number(req.auth.userId)) return deny(res, 'You may only create appointments for your own account.');
        return next();
      }

      if (policy.kind === 'artist-path') {
        const artistId = extractArtistPath(path);
        if (PRIVILEGED_ROLES.has(req.auth.role) || artistId === Number(req.auth.userId)) return next();
        return deny(res, 'Artists may only access their own records.');
      }

      if (policy.kind === 'artist-body') {
        const suppliedArtistId = asPositiveInteger(req.body?.artistId || req.body?.artist_id);
        if (PRIVILEGED_ROLES.has(req.auth.role) || !suppliedArtistId || suppliedArtistId === Number(req.auth.userId)) return next();
        return deny(res, 'Artists may only modify their own portfolio.');
      }

      if (policy.kind === 'portfolio-work') {
        if (PRIVILEGED_ROLES.has(req.auth.role)) return next();
        const workId = asPositiveInteger(path.match(/^\/api\/artist\/portfolio\/(\d+)/)?.[1]);
        const [rows] = await database.query('SELECT artist_id FROM portfolio_works WHERE id = ? AND is_deleted = 0 LIMIT 1', [workId]);
        if (!rows[0]) return notFound(res, 'Portfolio work');
        return Number(rows[0].artist_id) === Number(req.auth.userId) ? next() : deny(res);
      }

      if (policy.kind === 'appointment') {
        const appointmentId = extractAppointmentId(req, path)
          || asPositiveInteger(path.match(/^\/api\/reviews\/(?:check\/)?(\d+)/)?.[1])
          || asPositiveInteger(req.body?.appointment_id);
        if (!appointmentId) return res.status(400).json({ success: false, message: 'A valid appointment ID is required.' });
        const appointment = await loadAppointment(appointmentId);
        if (!appointment) return notFound(res, 'Appointment');
        if (!ownsAppointment(req.auth, appointment)) return deny(res);
        req.authorizationResource = { type: 'appointment', ...appointment };
        return next();
      }

      if (policy.kind === 'customer-consent') {
        const customerId = asPositiveInteger(path.match(/^\/api\/customer\/(\d+)\/consent$/)?.[1]);
        if (STAFF_ROLES.has(req.auth.role) || Number(customerId) === Number(req.auth.userId)) return next();
        const [rows] = await database.query(
          `SELECT id FROM appointments
           WHERE customer_id = ? AND (artist_id = ? OR secondary_artist_id = ?) AND is_deleted = 0 LIMIT 1`,
          [customerId, req.auth.userId, req.auth.userId]
        );
        return rows[0] ? next() : deny(res, 'The artist is not assigned to this customer.');
      }

      if (policy.kind === 'payment') {
        if (STAFF_ROLES.has(req.auth.role)) return next();
        let appointmentId = asPositiveInteger(req.query?.appointmentId);
        if (!appointmentId && req.query?.sessionId) {
          const [paymentRows] = await database.query('SELECT appointment_id FROM payments WHERE session_id = ? LIMIT 1', [String(req.query.sessionId)]);
          appointmentId = asPositiveInteger(paymentRows[0]?.appointment_id);
        }
        const appointment = appointmentId ? await loadAppointment(appointmentId) : null;
        if (!appointment) return notFound(res, 'Payment');
        return ownsAppointment(req.auth, appointment) ? next() : deny(res);
      }

      if (policy.kind === 'notification') {
        const notificationId = asPositiveInteger(path.match(/^\/api\/notifications\/(\d+)/)?.[1]);
        const [rows] = await database.query('SELECT user_id FROM notifications WHERE id = ? LIMIT 1', [notificationId]);
        if (!rows[0]) return notFound(res, 'Notification');
        return Number(rows[0].user_id) === Number(req.auth.userId) ? next() : deny(res);
      }

      if (policy.kind === 'report-code' || policy.kind === 'report') {
        const byCode = policy.kind === 'report-code';
        const identifier = byCode ? path.split('/').pop() : asPositiveInteger(path.match(/^\/api\/reports\/(\d+)/)?.[1]);
        const [rows] = await database.query(
          `SELECT customer_id FROM customer_reports WHERE ${byCode ? 'report_code' : 'id'} = ? LIMIT 1`,
          [identifier]
        );
        if (!rows[0]) return notFound(res, 'Report');
        if (PRIVILEGED_ROLES.has(req.auth.role) || Number(rows[0].customer_id) === Number(req.auth.userId)) return next();
        return deny(res);
      }

      if (policy.kind === 'project-list') {
        if (STAFF_ROLES.has(req.auth.role)) return next();
        const requestedId = asPositiveInteger(req.query?.customer_id || req.query?.artist_id);
        return requestedId === Number(req.auth.userId) ? next() : deny(res, 'You may only list your own projects.');
      }

      if (policy.kind === 'project' || policy.kind === 'new-project') {
        if (STAFF_ROLES.has(req.auth.role)) return next();
        let project;
        if (policy.kind === 'project') {
          const projectId = asPositiveInteger(path.match(/^\/api\/projects\/(\d+)/)?.[1]);
          const [rows] = await database.query('SELECT customer_id, artist_id FROM tattoo_projects WHERE id = ? LIMIT 1', [projectId]);
          project = rows[0];
        } else {
          const seedId = asPositiveInteger(req.body?.seed_appointment_id);
          project = seedId ? await loadAppointment(seedId) : null;
        }
        if (!project) return notFound(res, policy.kind === 'project' ? 'Project' : 'Seed appointment');
        const isParticipant = Number(project.customer_id) === Number(req.auth.userId)
          || Number(project.artist_id) === Number(req.auth.userId)
          || Number(project.secondary_artist_id) === Number(req.auth.userId);
        if (!isParticipant) return deny(res);

        if (policy.kind === 'project' && path.endsWith('/link-session')) {
          const appointmentId = asPositiveInteger(req.body?.appointment_id);
          const appointment = appointmentId ? await loadAppointment(appointmentId) : null;
          if (!appointment || !ownsAppointment(req.auth, appointment)) return deny(res, 'The session is not assigned to the authenticated artist.');
          if (Number(appointment.customer_id) !== Number(project.customer_id)) {
            return deny(res, 'The session customer does not match the project customer.');
          }
        }

        req.authorizationResource = { type: policy.kind, ...project };
        return next();
      }

      if (policy.kind === 'invoice') {
        if (STAFF_ROLES.has(req.auth.role)) return next();
        const byNumber = path.includes('/by-number/');
        const identifier = decodeURIComponent(path.split('/').pop());
        const [rows] = await database.query(
          `SELECT customer_id FROM invoices WHERE ${byNumber ? 'invoice_number' : 'id'} = ? LIMIT 1`,
          [identifier]
        );
        if (!rows[0]) return notFound(res, 'Invoice');
        return Number(rows[0].customer_id) === Number(req.auth.userId) ? next() : deny(res);
      }

      if (policy.kind === 'chat-room') {
        if (STAFF_ROLES.has(req.auth.role)) return next();
        const room = decodeURIComponent(path.split('/').pop());
        return room === `customer_${req.auth.userId}` ? next() : deny(res, 'You may only access your own support room.');
      }

      return next();
    } catch (error) {
      if (res.headersSent) return;
      console.error('[AUTHZ] Route protection failed:', error.message);
      return res.status(503).json({ success: false, message: 'Authorization service is temporarily unavailable.' });
    }
  };
}

module.exports = {
  classifyRequest,
  createHighRiskProtection,
  extractAppointmentId,
};
