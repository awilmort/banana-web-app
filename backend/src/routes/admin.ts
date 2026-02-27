import express, { Request, Response } from 'express';
import User from '../models/User';
import Role from '../models/Role';
import Room from '../models/Room';
import Reservation from '../models/Reservation';
import Contact from '../models/Contact';
import Media from '../models/Media';
import WristbandDelivery from '../models/WristbandDelivery';
import { authenticate, authorize, authorizePermission } from '../middleware/auth';
import { getSortObject } from '../utils/helpers';

const router = express.Router();

// Permission catalog to support role management UIs
// Exposes all known permission keys used across the backend
// @route   GET /api/admin/permissions
// @desc    List known permissions (admin only)
// @access  Private (Admin or roles with admin.access)
router.get('/permissions', authenticate, authorizePermission('admin.access'), async (req: Request, res: Response) => {
  try {
    const permissions = [
      // Core admin
      'admin.access',
      'admin.dashboard',
      'admin.analytics',
      'admin.backup',
      // Users and roles
      'admin.users',
      'admin.roles',
      // Reservations
      'admin.reservations',
      'admin.reservations.assignRoom',
      'admin.reservations.managePayments',
      'admin.reservations.priceUpdate',
      'admin.reservations.amountUpdate',
      'admin.reservations.cancel',
      // Revenue/Commissions
      'admin.revenue',
      'admin.commissions',
      // Wristbands (view/manage split)
      'admin.wristbands.view',
      'admin.wristbands.manage',
      // Salesman (used in commissions)
      'salesman'
    ];
    res.status(200).json({ success: true, data: permissions });
  } catch (error: any) {
    console.error('List permissions error:', error);
    res.status(500).json({ success: false, message: 'Server error while listing permissions' });
  }
});

// @route   GET /api/admin/dashboard
// @desc    Get admin dashboard statistics
// @access  Private (Admin or roles with dashboard/access permission)
router.get('/dashboard', authenticate, authorizePermission('admin.dashboard', 'admin.access'), async (req, res) => {
  try {
    // Get basic counts
    const totalUsers = await User.countDocuments({ role: 'customer' });
    const totalRooms = await Room.countDocuments();
    const totalReservations = await Reservation.countDocuments();
    const pendingContacts = await Contact.countDocuments({ status: 'new' });

    // Get revenue statistics
    const revenueData = await Reservation.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(new Date().getFullYear(), 0, 1) } // This year
        }
      },
      {
        $match: {
          $expr: { $gte: ['$totalPayments', '$totalPrice'] }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalPrice' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Get monthly reservation statistics
    const monthlyReservations = await Reservation.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(new Date().getFullYear(), 0, 1) }
        }
      },
      {
        $group: {
          _id: {
            month: { $month: '$createdAt' },
            year: { $year: '$createdAt' }
          },
          count: { $sum: 1 },
          revenue: {
            $sum: {
              $cond: [
                { $gte: ['$totalPayments', '$totalPrice'] },
                '$totalPrice',
                0
              ]
            }
          }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Get room occupancy rates
    const roomOccupancy = await Room.aggregate([
      {
        $lookup: {
          from: 'reservations',
          localField: '_id',
          foreignField: 'room',
          as: 'reservations'
        }
      },
      {
        $project: {
          name: 1,
          type: 1,
          status: 1,
          totalReservations: { $size: '$reservations' },
          confirmedReservations: {
            $size: {
              $filter: {
                input: '$reservations',
                cond: { $eq: ['$$this.status', 'confirmed'] }
              }
            }
          }
        }
      }
    ]);

    // Get recent activities
    const recentReservations = await Reservation.find()
      .populate('user', 'firstName lastName email')
      .populate('room', 'name status')
      .sort('-createdAt')
      .limit(5);

    const recentContacts = await Contact.find()
      .sort('-createdAt')
      .limit(5)
      .select('name email subject status priority createdAt');

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalUsers,
          totalRooms,
          totalReservations,
          pendingContacts,
          totalRevenue: revenueData[0]?.totalRevenue || 0,
          paidReservations: revenueData[0]?.count || 0
        },
        charts: {
          monthlyReservations,
          roomOccupancy
        },
        recentActivity: {
          reservations: recentReservations,
          contacts: recentContacts
        }
      }
    });
  } catch (error: any) {
    console.error('Get dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching dashboard data'
    });
  }
});

// @route   GET /api/admin/revenue
// @desc    Get revenue and guest totals by category for a date range, plus pending payments
// @access  Private (permission: admin.revenue)
router.get('/revenue', authenticate, authorizePermission('admin.revenue', 'admin.access'), async (req: Request, res: Response) => {
  try {
    const { from, to } = req.query as { from?: string; to?: string };

    // Default to today for both from and to
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    // Parse YYYY-MM-DD as local date to avoid UTC offset issues
    const parseLocalDate = (s: string) => {
      const parts = s.split('-');
      if (parts.length === 3) {
        const y = Number(parts[0]);
        const m = Number(parts[1]);
        const d = Number(parts[2]);
        // Construct using local timezone at midnight
        return new Date(y, (m - 1), d, 0, 0, 0, 0);
      }
      // Fallback to native parsing
      return new Date(s);
    };

    let fromDate = from ? parseLocalDate(from) : todayStart;
    let toDate = to ? parseLocalDate(to) : todayEnd;

    // Clamp to not exceed current date (no future payments)
    if (fromDate.getTime() > todayEnd.getTime()) fromDate = todayStart;
    if (toDate.getTime() > todayEnd.getTime()) toDate = todayEnd;

    // Normalize to day boundaries
    fromDate.setHours(0, 0, 0, 0);
    toDate.setHours(23, 59, 59, 999);

    // 1) Revenue by reservation type (sum of payments in date range)
    const revenueByType = await Reservation.aggregate([
      { $unwind: '$payments' },
      { $match: { 'payments.createdAt': { $gte: fromDate, $lte: toDate } } },
      { $group: { _id: '$type', revenue: { $sum: '$payments.amount' } } }
    ]);

    // 2) Revenue by payment method
    const revenueByMethod = await Reservation.aggregate([
      { $unwind: '$payments' },
      { $match: { 'payments.createdAt': { $gte: fromDate, $lte: toDate } } },
      { $group: { _id: '$payments.method', revenue: { $sum: '$payments.amount' } } }
    ]);

    // 3) Guest totals by type from unique reservations that have a payment in range
    const guestsByType = await Reservation.aggregate([
      { $unwind: '$payments' },
      { $match: { 'payments.createdAt': { $gte: fromDate, $lte: toDate } } },
      {
        $group: {
          _id: '$_id',
          type: { $first: '$type' },
          adults: { $first: '$guestDetails.adults' },
          children: { $first: '$guestDetails.children' },
          guests: { $first: '$guests' }
        }
      },
      { $group: { _id: '$type', adults: { $sum: '$adults' }, children: { $sum: '$children' }, guests: { $sum: '$guests' } } }
    ]);

    // 4) Individual reservation details per type (for breakdown lists)
    const reservationDetailAgg = await Reservation.aggregate([
      { $unwind: '$payments' },
      { $match: { 'payments.createdAt': { $gte: fromDate, $lte: toDate } } },
      {
        $group: {
          _id: '$_id',
          type: { $first: '$type' },
          guestName: { $first: '$guestName' },
          userId: { $first: '$user' },
          adults: { $first: '$guestDetails.adults' },
          children: { $first: '$guestDetails.children' },
          adultPrice: { $first: '$adultPrice' },
          childrenPrice: { $first: '$childrenPrice' },
          totalPrice: { $first: '$totalPrice' },
        }
      }
    ]);

    // Build category map
    const getCat = (type: string) => {
      const key = type === 'PasaTarde' ? 'pasatarde' : type; // normalize key
      return key as 'room' | 'daypass' | 'event' | 'pasatarde';
    };

    const categories: Record<'room' | 'daypass' | 'event' | 'pasatarde', { adults: number; children: number; guests: number; revenue: number }> = {
      room: { adults: 0, children: 0, guests: 0, revenue: 0 },
      daypass: { adults: 0, children: 0, guests: 0, revenue: 0 },
      event: { adults: 0, children: 0, guests: 0, revenue: 0 },
      pasatarde: { adults: 0, children: 0, guests: 0, revenue: 0 },
    };

    for (const r of revenueByType) {
      const key = getCat(r._id);
      categories[key].revenue = r.revenue || 0;
    }
    for (const g of guestsByType) {
      const key = getCat(g._id);
      categories[key].adults = g.adults || 0;
      categories[key].children = g.children || 0;
      categories[key].guests = g.guests || 0;
    }

    // Build per-type reservation lists for UI breakdown
    const missingDetailUserIds = reservationDetailAgg
      .filter((r: any) => !r.guestName?.firstName && r.userId)
      .map((r: any) => r.userId);
    const detailUsers = missingDetailUserIds.length > 0
      ? await User.find({ _id: { $in: missingDetailUserIds } }).select('firstName lastName')
      : [];
    const detailUserMap = new Map((detailUsers as any[]).map((u: any) => [String(u._id), u]));

    type ReservationEntry = { id: string; guest: string; adults: number; children: number; adultPrice: number; childrenPrice: number; totalPrice: number };
    const reservations: Record<'room' | 'daypass' | 'event' | 'pasatarde', ReservationEntry[]> = { room: [], daypass: [], event: [], pasatarde: [] };

    for (const r of reservationDetailAgg) {
      const key = getCat(r.type);
      let guest = 'Guest';
      if (r.guestName?.firstName) {
        guest = `${r.guestName.firstName} ${r.guestName.lastName || ''}`.trim();
      } else if (r.userId) {
        const u = detailUserMap.get(String(r.userId));
        if (u) guest = `${(u as any).firstName} ${(u as any).lastName}`.trim();
      }
      reservations[key].push({
        id: String(r._id),
        guest,
        adults: r.adults || 0,
        children: r.children || 0,
        adultPrice: r.adultPrice || 0,
        childrenPrice: r.childrenPrice || 0,
        totalPrice: r.totalPrice || 0,
      });
    }

    // Payment method totals
    const income = { total: 0, cash: 0, transfer: 0, card: 0 };
    for (const rm of revenueByMethod) {
      const method = rm._id as 'cash' | 'transfer' | 'card';
      const amount = rm.revenue || 0;
      if (method === 'cash') income.cash = amount;
      else if (method === 'transfer') income.transfer = amount;
      else if (method === 'card') income.card = amount;
      income.total += amount;
    }

    // Pending payments: all past reservations with balance due, up to the selected end date (no future reservations)
    const pendingFilter: any = {
      $and: [
        // Exclude cancelled reservations from pending payments
        { status: { $ne: 'cancelled' } },
        {
          $or: [
            {
              type: { $in: ['room', 'event'] },
              $or: [
                { checkOutDate: { $lte: toDate } },
                { actualCheckOutAt: { $lte: toDate } }
              ]
            },
            {
              type: { $in: ['daypass', 'PasaTarde'] },
              checkInDate: { $lte: toDate }
            }
          ]
        },
        { $expr: { $lt: ['$totalPayments', '$totalPrice'] } }
      ]
    };

    const pendingReservations = await Reservation.find(pendingFilter)
      .select('guestName user type checkInDate checkOutDate actualCheckOutAt totalPrice totalPayments')
      .sort({ checkOutDate: -1, checkInDate: -1 })
      .limit(100)
      .populate('user', 'firstName lastName email');

    res.status(200).json({
      success: true,
      data: {
        filters: { from: fromDate, to: toDate },
        categories,
        income,
        pending: pendingReservations.map(r => ({
          id: r._id,
          type: r.type,
          // Prefer the actual reservation guest; fallback to user only if guest name is unavailable
          guest:
            r.guestName?.firstName
              ? `${r.guestName.firstName} ${r.guestName.lastName || ''}`.trim()
              : (r.user && typeof r.user === 'object'
                ? `${(r.user as any).firstName} ${(r.user as any).lastName}`
                : 'Guest'),
          endedOn:
            r.type === 'room' || r.type === 'event'
              ? (r.actualCheckOutAt || r.checkOutDate)
              : r.checkInDate,
          balanceDue: Math.max((r.totalPrice || 0) - (r.totalPayments || 0), 0),
          totalPrice: r.totalPrice,
          totalPayments: r.totalPayments
        })),
        reservations
      }
    });
  } catch (error: any) {
    console.error('Get revenue error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching revenue data' });
  }
});

// @route   GET /api/admin/commissions
// @desc    List users with Salesman permission and total guests on reservations they created within a date range; supports name/email filters
// @access  Private (permission: admin.commissions or admin.access)
router.get('/commissions', authenticate, authorizePermission('admin.commissions', 'admin.access'), async (req: Request, res: Response) => {
  try {
    const { from, to, name, email } = req.query as { from?: string; to?: string; name?: string; email?: string };

    // Parse local dates and clamp
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const parseLocalDate = (s?: string) => {
      if (!s) return undefined;
      const parts = s.split('-');
      if (parts.length === 3) {
        const y = Number(parts[0]); const m = Number(parts[1]); const d = Number(parts[2]);
        return new Date(y, m - 1, d, 0, 0, 0, 0);
      }
      return new Date(s);
    };
    let fromDate = parseLocalDate(from) || todayStart;
    let toDate = parseLocalDate(to) || todayEnd;
    if (fromDate.getTime() > todayEnd.getTime()) fromDate = todayStart;
    if (toDate.getTime() > todayEnd.getTime()) toDate = todayEnd;
    fromDate.setHours(0, 0, 0, 0);
    toDate.setHours(23, 59, 59, 999);

    // Find roles that have the 'salesman' permission
    const salesmanRoles = await Role.find({ permissions: 'salesman' }).select('name');
    const roleNames = salesmanRoles.map((r: any) => String(r.name).toLowerCase());

    // Find users with those roles, applying optional name/email filters
    const userFilter: any = { role: { $in: roleNames } };
    if (name && name.trim()) {
      const n = name.trim();
      userFilter.$or = [
        { firstName: { $regex: n, $options: 'i' } },
        { lastName: { $regex: n, $options: 'i' } }
      ];
    }
    if (email && email.trim()) {
      userFilter.email = { $regex: email.trim(), $options: 'i' };
    }

    const users = await User.find(userFilter).select('firstName lastName email role');

    // Aggregate reservations per user within date range based on PAYMENT date
    // Include only fully paid reservations
    const userIds = users.map(u => u._id);
    const agg = await Reservation.aggregate([
      { $unwind: '$payments' },
      {
        $match: {
          user: { $in: userIds },
          'payments.createdAt': { $gte: fromDate, $lte: toDate }
        }
      },
      // De-duplicate reservations that have multiple payments within the range
      {
        $group: {
          _id: '$_id',
          user: { $first: '$user' },
          guests: { $first: '$guests' },
          totalPayments: { $first: '$totalPayments' },
          totalPrice: { $first: '$totalPrice' },
        }
      },
      // Filter to fully paid only
      {
        $match: {
          $expr: {
            $gte: [
              { $ifNull: ['$totalPayments', 0] },
              { $ifNull: ['$totalPrice', 0] }
            ]
          }
        }
      },
      // Group by user to compute totals
      {
        $group: {
          _id: '$user',
          totalGuests: { $sum: '$guests' },
          bookings: { $sum: 1 }
        }
      }
    ]);

    const statsByUser: Record<string, { totalGuests: number; bookings: number }> = {};
    for (const a of agg) {
      statsByUser[String(a._id)] = { totalGuests: a.totalGuests || 0, bookings: a.bookings || 0 };
    }

    const result = users.map(u => ({
      id: u._id,
      name: `${u.firstName} ${u.lastName}`,
      email: u.email,
      role: u.role,
      totalGuests: statsByUser[String(u._id)]?.totalGuests || 0,
      bookings: statsByUser[String(u._id)]?.bookings || 0,
    }));

    res.status(200).json({
      success: true,
      data: {
        filters: { from: fromDate, to: toDate, name: name || '', email: email || '' },
        salesmen: result
      }
    });
  } catch (error: any) {
    console.error('Get commissions error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching commissions data' });
  }
});

// @route   GET /api/admin/users
// @desc    Get all users with pagination
// @access  Private (Admin only)

    // Wristband Control
    // @route   POST /api/admin/wristbands/deliveries
    // @desc    Register a wristband delivery for a given date with counts per category
    // @access  Private (permission: admin.wristbands.manage or admin.access)
    router.post('/wristbands/deliveries', authenticate, authorizePermission('admin.wristbands.manage', 'admin.access'), async (req: Request, res: Response) => {
      try {
        const { date, recipient, counts, notes, type } = req.body as {
          date?: string | Date;
          recipient?: string;
          counts?: { daypassAdults?: number; daypassChildren?: number; accommodations?: number; pasatarde?: number };
          notes?: string;
          type?: 'delivery' | 'collection';
        };

        const parseLocalDate = (s?: string | Date) => {
          if (!s) return null;
          if (s instanceof Date) return s;
          const str = String(s);
          const strict = /^\d{4}-\d{2}-\d{2}$/.test(str);
          if (strict) {
            const [y, m, d] = str.split('-').map(Number);
            return new Date(y, m - 1, d, 0, 0, 0, 0);
          }
          const d2 = new Date(str);
          return isNaN(d2.getTime()) ? null : d2;
        };

        const deliveryDate = parseLocalDate(date) || new Date();
        if (!deliveryDate || isNaN(deliveryDate.getTime())) {
          return res.status(400).json({ success: false, message: 'Invalid or missing delivery date' });
        }

        const payload = {
          date: deliveryDate,
          deliveredBy: (req as any).user?._id,
          recipient: recipient ? String(recipient).trim() : undefined,
          counts: {
            daypassAdults: Number(counts?.daypassAdults ?? 0),
            daypassChildren: Number(counts?.daypassChildren ?? 0),
            accommodations: Number(counts?.accommodations ?? 0),
            pasatarde: Number(counts?.pasatarde ?? 0),
          },
          notes: notes ? String(notes).trim() : undefined,
          type: type || 'delivery',
        };

        const created = await WristbandDelivery.create(payload as any);
        res.status(201).json({ success: true, message: 'Wristband delivery registered', data: created });
      } catch (error: any) {
        console.error('Create wristband delivery error:', error);
        if (error?.name === 'ValidationError') {
          const messages = Object.values(error.errors || {}).map((e: any) => e?.message || 'Validation error');
          return res.status(400).json({ success: false, message: 'Validation failed', errors: messages });
        }
        res.status(500).json({ success: false, message: 'Server error while creating wristband delivery' });
      }
    });

    // @route   GET /api/admin/wristbands/deliveries
    // @desc    List all wristband deliveries/collections (no date filter)
    // @access  Private (permission: admin.wristbands.view or admin.access)
    router.get('/wristbands/deliveries', authenticate, authorizePermission('admin.wristbands.view', 'admin.access'), async (req: Request, res: Response) => {
      try {
        const deliveries = await WristbandDelivery.find().sort({ date: -1 }).exec();
        res.status(200).json({ success: true, count: deliveries.length, data: deliveries });
      } catch (error: any) {
        console.error('List wristband deliveries error:', error);
        res.status(500).json({ success: false, message: 'Server error while retrieving wristband deliveries' });
      }
    });

    // @route   PUT /api/admin/wristbands/deliveries/:id
    // @desc    Update a wristband delivery
    // @access  Private (permission: admin.wristbands.manage or admin.access)
    router.put('/wristbands/deliveries/:id', authenticate, authorizePermission('admin.wristbands.manage', 'admin.access'), async (req: Request, res: Response) => {
      try {
        const { date, recipient, counts, notes, type } = req.body as {
          date?: string | Date;
          recipient?: string;
          counts?: { daypassAdults?: number; daypassChildren?: number; accommodations?: number; pasatarde?: number };
          notes?: string;
          type?: 'delivery' | 'collection';
        };

        const parseLocalDate = (s?: string | Date) => {
          if (!s) return null;
          if (s instanceof Date) return s;
          const str = String(s);
          const strict = /^\d{4}-\d{2}-\d{2}$/.test(str);
          if (strict) {
            const [y, m, d] = str.split('-').map(Number);
            return new Date(y, m - 1, d, 0, 0, 0, 0);
          }
          const d2 = new Date(str);
          return isNaN(d2.getTime()) ? null : d2;
        };

        const update: any = {};
        if (date) {
          const deliveryDate = parseLocalDate(date);
          if (!deliveryDate || isNaN(deliveryDate.getTime())) {
            return res.status(400).json({ success: false, message: 'Invalid delivery date' });
          }
          update.date = deliveryDate;
        }
        if (recipient !== undefined) update.recipient = recipient ? String(recipient).trim() : undefined;
        if (notes !== undefined) update.notes = notes ? String(notes).trim() : undefined;
        if (type !== undefined) update.type = type;
        if (counts) {
          update.counts = {
            daypassAdults: Number(counts.daypassAdults ?? 0),
            daypassChildren: Number(counts.daypassChildren ?? 0),
            accommodations: Number(counts.accommodations ?? 0),
            pasatarde: Number(counts.pasatarde ?? 0),
          };
        }

        const updated = await WristbandDelivery.findByIdAndUpdate(
          req.params.id,
          { $set: update },
          { new: true, runValidators: true }
        );

        if (!updated) {
          return res.status(404).json({ success: false, message: 'Wristband delivery not found' });
        }

        res.status(200).json({ success: true, message: 'Wristband delivery updated', data: updated });
      } catch (error: any) {
        console.error('Update wristband delivery error:', error);
        if (error?.name === 'ValidationError') {
          const messages = Object.values(error.errors || {}).map((e: any) => e?.message || 'Validation error');
          return res.status(400).json({ success: false, message: 'Validation failed', errors: messages });
        }
        if (error?.name === 'CastError') {
          return res.status(400).json({ success: false, message: 'Invalid delivery ID' });
        }
        res.status(500).json({ success: false, message: 'Server error while updating wristband delivery' });
      }
    });

    // @route   GET /api/admin/wristbands/usage
    // @desc    Get wristband usage counts by category for a date range
    //          - accommodations: room reservations with actualCheckInAt in range (arrived)
    //          - daypass: fully paid daypass reservations in range
    //          - pasatarde: fully paid PasaTarde reservations in range
    // @access  Private (permission: admin.wristbands.view or admin.access)
    router.get('/wristbands/usage', authenticate, authorizePermission('admin.wristbands.view', 'admin.access'), async (req: Request, res: Response) => {
      try {
        const { from, to } = req.query as { from?: string; to?: string };
        const parseLocalDate = (s?: string) => {
          if (!s) return null;
          const [y, m, d] = s.split('-').map(Number);
          if (!y || !m || !d) return null;
          // Normalize to start of day UTC to avoid TZ drift
          return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
        };
        // Use half-open [from, toNext) interval to include full days reliably
        const today = new Date();
        const utcStart = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0));
        const fromDate = parseLocalDate(from) || utcStart;
        const toBase = parseLocalDate(to) || utcStart; // end bound is computed as next day
        const toNextDay = new Date(toBase.getTime() + 24 * 60 * 60 * 1000);

        // Rooms: count guests for reservations that have checked in
        const roomsAgg = await Reservation.aggregate([
          { $match: { type: 'room', actualCheckInAt: { $gte: fromDate, $lt: toNextDay } } },
          { $group: { _id: null, guests: { $sum: '$guests' } } }
        ]);
        const accommodations = roomsAgg[0]?.guests || 0;

        // DayPass: fully paid reservations within range (by check-in date)
        const daypassResAgg = await Reservation.aggregate([
          { $match: { type: 'daypass', checkInDate: { $gte: fromDate, $lt: toNextDay }, $expr: { $gte: ['$totalPayments', '$totalPrice'] } } },
          { $group: { _id: null, adults: { $sum: '$guestDetails.adults' }, children: { $sum: '$guestDetails.children' } } }
        ]);
        const daypassAdults = daypassResAgg[0]?.adults || 0;
        const daypassChildren = daypassResAgg[0]?.children || 0;

        // PasaTarde: fully paid within range
        const pasatardeAgg = await Reservation.aggregate([
          { $match: { type: 'PasaTarde', checkInDate: { $gte: fromDate, $lt: toNextDay }, $expr: { $gte: ['$totalPayments', '$totalPrice'] } } },
          { $group: { _id: null, guests: { $sum: '$guests' } } }
        ]);
        const pasatarde = pasatardeAgg[0]?.guests || 0;

        res.status(200).json({ success: true, data: { accommodations, daypassAdults, daypassChildren, pasatarde } });
      } catch (error) {
        console.error('Get wristband usage error:', error);
        res.status(500).json({ success: false, message: 'Server error while fetching wristband usage' });
      }
    });

    // @route   DELETE /api/admin/wristbands/deliveries/:id
    // @desc    Delete a wristband delivery
    // @access  Private (permission: admin.wristbands.manage or admin.access)
    router.delete('/wristbands/deliveries/:id', authenticate, authorizePermission('admin.wristbands.manage', 'admin.access'), async (req: Request, res: Response) => {
      try {
        const deleted = await WristbandDelivery.findByIdAndDelete(req.params.id);
        if (!deleted) {
          return res.status(404).json({ success: false, message: 'Wristband delivery not found' });
        }
        res.status(200).json({ success: true, message: 'Wristband delivery deleted' });
      } catch (error: any) {
        console.error('Delete wristband delivery error:', error);
        if (error?.name === 'CastError') {
          return res.status(400).json({ success: false, message: 'Invalid delivery ID' });
        }
        res.status(500).json({ success: false, message: 'Server error while deleting wristband delivery' });
      }
    });
router.get('/users', authenticate, authorizePermission('admin.users'), async (req, res) => {
  try {
    const {
      role,
      isActive,
      search,
      page = 1,
      limit = 20,
      sort = '-createdAt'
    } = req.query;

    // Build filter object
    const filter: any = {};

    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const users = await User.find(filter)
      .sort(getSortObject(sort))
      .limit(limitNum)
      .skip(skip)
      .select('-password');

    const total = await User.countDocuments(filter);
    const totalPages = Math.ceil(total / limitNum);

    res.status(200).json({
      success: true,
      data: users,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalUsers: total,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1
      }
    });
  } catch (error: any) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching users'
    });
  }
});

// @route   POST /api/admin/users
// @desc    Create a new user (admin only)
// @access  Private (Admin only)
router.post('/users', authenticate, authorizePermission('admin.users'), async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, email, phone, role = 'customer', password } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ success: false, message: 'Email already in use' });
    }

    const user = new User({ firstName, lastName, email, phone, role, password });
    await user.save();

    const userSafe = await User.findById(user._id).select('-password');
    res.status(201).json({ success: true, message: 'User created successfully', data: userSafe });
  } catch (error: any) {
    console.error('Create user error:', error);
    res.status(500).json({ success: false, message: 'Server error while creating user' });
  }
});

// @route   PUT /api/admin/users/:id
// @desc    Update user details (admin only)
// @access  Private (Admin only)
router.put('/users/:id', authenticate, authorizePermission('admin.users'), async (req, res) => {
  try {
    const { firstName, lastName, email, phone, role, isActive, emailVerified } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (email) user.email = email;
    if (phone) user.phone = phone;
    if (role) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;
    if (emailVerified !== undefined) user.emailVerified = emailVerified;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: user
    });
  } catch (error: any) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating user'
    });
  }
});

// @route   PATCH /api/admin/users/:id/role
// @desc    Update a user's role (admin only)
// @access  Private (Admin only)
router.patch('/users/:id/role', authenticate, authorizePermission('admin.users'), async (req: Request, res: Response) => {
  try {
    const { role } = req.body;
    if (!role) {
      return res.status(400).json({ success: false, message: 'Role is required' });
    }

    const normalizedRole = String(role).toLowerCase();

    // Update role without revalidating required fields like password
    const updated = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { role: normalizedRole } },
      { new: true, runValidators: false, projection: { password: 0 } }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({ success: true, message: 'User role updated', data: updated });
  } catch (error: any) {
    console.error('Update user role error:', error);
    res.status(500).json({ success: false, message: error?.message || 'Server error while updating user role' });
  }
});

// @route   DELETE /api/admin/users/:id
// @desc    Delete user (admin only)
// @access  Private (Admin only)
router.delete('/users/:id', authenticate, authorizePermission('admin.users'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent deleting admin users
    if (user.role === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete admin users'
      });
    }

    // Check if user has active reservations
    const activeReservations = await Reservation.countDocuments({
      user: req.params.id,
      status: { $in: ['pending', 'confirmed'] }
    });

    if (activeReservations > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete user with active reservations'
      });
    }

    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error: any) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting user'
    });
  }
});

// @route   GET /api/admin/analytics
// @desc    Get detailed analytics data
// @access  Private (Admin only)
router.get('/analytics', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { startDate, endDate, period = 'month' } = req.query;

    let matchCondition: any = {};

    if (startDate && endDate) {
      matchCondition.createdAt = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string)
      };
    }

    // Revenue analytics
    const revenueAnalytics = await Reservation.aggregate([
      { $match: matchCondition },
      { $match: { $expr: { $gte: ['$totalPayments', '$totalPrice'] } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            ...(period === 'day' && { day: { $dayOfMonth: '$createdAt' } })
          },
          totalRevenue: { $sum: '$totalPrice' },
          totalReservations: { $sum: 1 },
          averageBookingValue: { $avg: '$totalPrice' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    // Room type analytics removed

    // Customer analytics
    const customerAnalytics = await User.aggregate([
      { $match: { role: 'customer', ...matchCondition } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          newCustomers: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        revenue: revenueAnalytics,
        roomTypes: [],
        customers: customerAnalytics
      }
    });
  } catch (error: any) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching analytics'
    });
  }
});

// @route   POST /api/admin/backup
// @desc    Create database backup (admin only)
// @access  Private (Admin only)
router.post('/backup', authenticate, authorize('admin'), async (req, res) => {
  try {
    // This is a placeholder for backup functionality
    // In a real application, you would implement database backup logic here

    res.status(200).json({
      success: true,
      message: 'Backup functionality not implemented yet',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Backup error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating backup'
    });
  }
});

export default router;
