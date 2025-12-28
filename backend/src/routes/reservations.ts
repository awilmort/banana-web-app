import express, { Request, Response } from 'express';
import Reservation from '../models/Reservation';
import Room from '../models/Room';
import Role from '../models/Role';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { validateReservation } from '../middleware/validation';
import { getSortObject } from '../utils/helpers';
import { sendReservationConfirmationEmail } from '../utils/email';
import EventType from '../models/EventType';
import { findApplicablePricing } from '../utils/pricing';

const router = express.Router();

// @route   GET /api/reservations
// @desc    Get user's reservations or all reservations (admin)
// @access  Private
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const {
      status,
      type,
      search,
      dateFrom,
      dateTo,
      page = 1,
      limit = 10,
      sort = '-createdAt'
    } = req.query;

    // Build filter object
    const filter: any = {};

    // Determine if user has privilege to view all reservations
    let canViewAll = false;
    if (req.user) {
      const roleName = String(req.user.role).toLowerCase();
      if (['admin', 'staff', 'maintenance'].includes(roleName)) {
        canViewAll = true;
      } else {
        try {
          const roleDoc = await Role.findOne({ name: roleName });
          const perms = roleDoc?.permissions || [];
          // Roles with any of these permissions can view all reservations
          canViewAll = perms.includes('admin.reservations') || perms.includes('admin.access') || perms.includes('admin.dashboard');
        } catch (permErr) {
          console.error('Permission check failed:', permErr);
        }
      }
    }

    // If not privileged, show only the user's own reservations
    if (req.user && !canViewAll) {
      filter.$or = [
        { user: req.user.id }, // Reservations made while logged in
        { 'contactInfo.email': req.user.email } // Reservations made with same email (guest bookings)
      ];
    }

    if (status) filter.status = status;
    if (type) filter.type = type;

    // Date filtering
    if (dateFrom || dateTo) {
      const toStartOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
      const toEndOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
      const parseLocalDate = (s: string) => {
        const parts = s.split('-');
        if (parts.length === 3) {
          const y = Number(parts[0]);
          const m = Number(parts[1]);
          const d = Number(parts[2]);
          return new Date(y, (m - 1), d, 0, 0, 0, 0);
        }
        // Fallback to native parsing
        return new Date(s);
      };

      let occupancyCondition: any = null;
      const rawFrom = (dateFrom && typeof dateFrom === 'string') ? parseLocalDate(dateFrom) : null;
      const rawTo = (dateTo && typeof dateTo === 'string') ? parseLocalDate(dateTo) : null;

      if (rawFrom && rawTo) {
        // Both From + To: include stays overlapping range, and daypass only if check-in within range
        const fromStart = toStartOfDay(rawFrom);
        const toEnd = toEndOfDay(rawTo);
        occupancyCondition = {
          $or: [
            { $and: [ { checkInDate: { $lte: toEnd } }, { checkOutDate: { $gte: fromStart } } ] },
            { $and: [ { $or: [ { checkOutDate: { $exists: false } }, { checkOutDate: null } ] }, { checkInDate: { $gte: fromStart, $lte: toEnd } } ] }
          ]
        };
      } else if (rawFrom) {
        // Only From selected
        const fromStart = toStartOfDay(rawFrom);
        const fromEnd = toEndOfDay(rawFrom);
        occupancyCondition = {
          $or: [
            // Starts on the date
            { checkInDate: { $gte: fromStart, $lte: fromEnd } },
            // Ends on the date (rooms/events with checkOutDate)
            { checkOutDate: { $gte: fromStart, $lte: fromEnd } },
            // Started before and ends after the date
            { $and: [ { checkInDate: { $lt: fromStart } }, { checkOutDate: { $gt: fromEnd } } ] },
            // Starts after the selected date
            { checkInDate: { $gt: fromEnd } }
          ]
        };
      } else if (rawTo) {
        // Only To selected
        const toStart = toStartOfDay(rawTo);
        const toEnd = toEndOfDay(rawTo);
        occupancyCondition = {
          $or: [
            { checkInDate: { $gte: toStart, $lte: toEnd } },
            { checkOutDate: { $gte: toStart, $lte: toEnd } },
            { $and: [ { checkInDate: { $lt: toStart } }, { checkOutDate: { $gte: toStart } } ] }
          ]
        };
      }

      if (occupancyCondition) {
        if (filter.$and) filter.$and.push(occupancyCondition);
        else filter.$and = [occupancyCondition];
      }
    }

    // Basic text search across guest name, contact email, event description, event type, room type, reservation code
    if (search && typeof search === 'string' && search.trim()) {
      const s = search.trim();
      filter.$or = (filter.$or || []).concat([
        { 'guestName.firstName': { $regex: s, $options: 'i' } },
        { 'guestName.lastName': { $regex: s, $options: 'i' } },
        { 'contactInfo.email': { $regex: s, $options: 'i' } },
        { eventDescription: { $regex: s, $options: 'i' } },
        { eventType: { $regex: s, $options: 'i' } },
        { roomType: { $regex: s, $options: 'i' } },
        { reservationCode: { $regex: s, $options: 'i' } }
      ]);
    }

    const pageNumber = parseInt(page as string);
    const limitNumber = parseInt(limit as string);
    const sortObject = getSortObject(sort as string);

    const reservations = await Reservation.find(filter)
      .populate('user', 'firstName lastName email')
      .populate('room', 'name type')
      .sort(sortObject)
      .limit(limitNumber * 1)
      .skip((pageNumber - 1) * limitNumber)
      .exec();

    const total = await Reservation.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: reservations.length,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        totalPages: Math.ceil(total / limitNumber)
      },
      data: reservations
    });
  } catch (error: any) {
    console.error('Get reservations error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while retrieving reservations'
    });
  }
});

// @route   GET /api/reservations/:id
// @desc    Get single reservation
// @access  Private
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const reservation = await Reservation.findById(req.params.id)
      .populate('user', 'firstName lastName email')
      .populate('room', 'name type amenities');

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found'
      });
    }

    // If not admin, only allow access to own reservations
    if (req.user && req.user.role !== 'admin') {
      // For guest reservations (no user), check email match
      if (!reservation.user) {
        if (reservation.contactInfo.email !== req.user.email) {
          return res.status(403).json({
            success: false,
            message: 'Access denied'
          });
        }
      } else if (reservation.user._id.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    res.status(200).json({
      success: true,
      data: reservation
    });
  } catch (error: any) {
    console.error('Get reservation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while retrieving reservation'
    });
  }
});

// @route   POST /api/reservations
// @desc    Create new reservation (room, daypass, or event) - No login required
// @access  Public
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      type,
      roomType,
      eventType,
      eventDescription,
      expectedAttendees,
      checkInDate,
      checkOutDate,
      guestDetails,
      guestName, // firstName, lastName for guest bookings
      contactInfo,
      services,
      specialRequests
    } = req.body;

    let authenticatedUser: any = null;

    // Check if user is authenticated (optional for all reservation types)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        // Apply authentication middleware
        await new Promise<void>((resolve, reject) => {
          authenticate(req as AuthRequest, res, (err: any) => {
            if (err || !(req as AuthRequest).user) {
              reject(new Error('Authentication failed'));
            } else {
              authenticatedUser = (req as AuthRequest).user;
              resolve();
            }
          });
        });
      } catch (authError) {
        // Authentication failed - treat as guest booking
        authenticatedUser = null;
      }
    }

    // Validate required guest information for non-authenticated bookings
    if (!authenticatedUser) {
      if (!guestName || !guestName.firstName || !guestName.lastName) {
        return res.status(400).json({
          success: false,
          message: 'First name and last name are required for guest bookings'
        });
      }
      if (!contactInfo || !contactInfo.email || !contactInfo.phone) {
        return res.status(400).json({
          success: false,
          message: 'Email and phone number are required for all reservations'
        });
      }
    }

    const checkIn = new Date(checkInDate);
    const checkOut = checkOutDate ? new Date(checkOutDate) : null;

    // Validation based on reservation type
    if (type === 'room') {
      if (!checkOut) {
        return res.status(400).json({
          success: false,
          message: 'Check-out date is required for room reservations'
        });
      }

      if (checkIn >= checkOut) {
        return res.status(400).json({
          success: false,
          message: 'Check-out date must be after check-in date'
        });
      }
    }

    if (type === 'event') {
      if (!eventType || !eventDescription || !expectedAttendees) {
        return res.status(400).json({
          success: false,
          message: 'Event type, description, and expected attendees are required for event reservations'
        });
      }

      // Validate against EventType configuration
      const eventConfig = await EventType.findOne({ type: String(eventType).toLowerCase() });
      if (!eventConfig) {
        return res.status(400).json({ success: false, message: 'Selected event type is not available' });
      }
      if (expectedAttendees > eventConfig.maxGuests) {
        return res.status(400).json({ success: false, message: `Expected attendees exceed maximum allowed (${eventConfig.maxGuests})` });
      }
      // Enforce children limit only if configured on the event type
      if (
        guestDetails &&
        typeof guestDetails.children === 'number' &&
        eventConfig.maxChildren !== undefined &&
        eventConfig.maxChildren !== null &&
        guestDetails.children > eventConfig.maxChildren
      ) {
        return res.status(400).json({ success: false, message: `Children exceed maximum allowed (${eventConfig.maxChildren}) for this event type` });
      }

      // Enforce adults limit only if configured on the event type
      if (
        guestDetails &&
        typeof guestDetails.adults === 'number' &&
        eventConfig.maxAdults !== undefined &&
        eventConfig.maxAdults !== null &&
        guestDetails.adults > (eventConfig as any).maxAdults
      ) {
        return res.status(400).json({ success: false, message: `Adults exceed maximum allowed (${(eventConfig as any).maxAdults}) for this event type` });
      }
      // Optional: ensure breakdown does not exceed total
      if (guestDetails) {
        const totalBreakdown = (guestDetails.adults || 0) + (guestDetails.children || 0) + (guestDetails.infants || 0);
        if (totalBreakdown > expectedAttendees) {
          return res.status(400).json({ success: false, message: 'Attendee breakdown exceeds expected attendees' });
        }
      }
    }

    // Check if check-in date is not before today (allow same-day)
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (checkIn < startOfToday) {
      return res.status(400).json({
        success: false,
        message: 'Event/check-in date cannot be in the past'
      });
    }

    // Calculate pricing based on reservation type
    let totalPrice = 0;
    let nights = 0;
    let days = 1;
    let appliedAdultPrice: number | undefined;
    let appliedChildrenPrice: number | undefined;

    if (type === 'room') {
      // Room reservation pricing
      nights = Math.ceil((checkOut!.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
      // Try pricing rules for hospedaje
      const pricing = await findApplicablePricing('hospedaje', checkIn);
      if (pricing) {
        appliedAdultPrice = pricing.adultPrice;
        appliedChildrenPrice = pricing.childrenPrice;
        const perNight = (guestDetails.adults * pricing.adultPrice) + (guestDetails.children * pricing.childrenPrice);
        totalPrice = nights * perNight;
      } else {
        // Fallback to legacy room type prices
        const roomTypePrices = {
          standard: 150,
          deluxe: 200,
          suite: 300,
          villa: 500
        };
        const basePrice = roomTypePrices[roomType as keyof typeof roomTypePrices] || 150;
        totalPrice = nights * basePrice;
      }
    } else if (type === 'daypass' || type === 'PasaTarde') {
      // Day pass pricing via rules
      const pricing = await findApplicablePricing(type === 'PasaTarde' ? 'pasatarde' : 'daypass', checkIn);
      const adultP = pricing?.adultPrice ?? 30;
      const childP = pricing?.childrenPrice ?? 20;
      appliedAdultPrice = adultP;
      appliedChildrenPrice = childP;
      totalPrice = (guestDetails.adults * adultP) + (guestDetails.children * childP);
    } else if (type === 'event') {
      // Event pricing based on type
      const eventTypePrices = {
        wedding: 2500,
        conference: 1200,
        birthday: 800,
        corporate: 1000,
        other: 600
      };
      totalPrice = eventTypePrices[eventType as keyof typeof eventTypePrices] || 600;

      // Calculate days for multi-day events
      if (checkOut) {
        days = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        totalPrice *= days;
      }
    }

    // Calculate total guests
    const totalGuests = guestDetails.adults + guestDetails.children + guestDetails.infants;

    // Add service costs (common for all types)
    if (services?.breakfast) totalPrice += 25 * (nights || days) * totalGuests;
    if (services?.airportTransfer) totalPrice += 50;
    if (services?.spa) totalPrice += 100 * guestDetails.adults;
    if (services?.aquaPark) totalPrice += 30 * (guestDetails.adults + guestDetails.children);

    // Event-specific services
    if (services?.catering) totalPrice += 50 * (expectedAttendees || totalGuests);
    if (services?.decoration) totalPrice += 300;
    if (services?.photography) totalPrice += 500;
    if (services?.musicSystem) totalPrice += 200;

    // Create reservation data
    const reservationData: any = {
      type,
      checkInDate: checkIn,
      guests: expectedAttendees || totalGuests,
      guestDetails,
      contactInfo,
      services: services || {},
      totalPrice,
      totalPayments: 0,
      specialRequests: specialRequests || '',
      status: (type === 'daypass' || type === 'PasaTarde') ? 'confirmed' : 'pending', // Auto-confirm day passes
      paymentStatus: (type === 'daypass' || type === 'PasaTarde') ? 'paid' : 'pending' // Auto-mark day passes as paid for now
    };

    if (appliedAdultPrice !== undefined) reservationData.adultPrice = appliedAdultPrice;
    if (appliedChildrenPrice !== undefined) reservationData.childrenPrice = appliedChildrenPrice;

    // Persist the guest name from the form regardless of auth status
    const nameFromRequest = (guestName && guestName.firstName && guestName.lastName)
      ? guestName
      : (contactInfo && (contactInfo as any).firstName && (contactInfo as any).lastName)
        ? { firstName: (contactInfo as any).firstName, lastName: (contactInfo as any).lastName }
        : null;

    if (nameFromRequest) {
      reservationData.guestName = nameFromRequest;
    }

    // Set user if authenticated, with Salesman-specific rules
    if (authenticatedUser) {
      let isSalesman = false;
      try {
        const roleDoc = await Role.findOne({ name: String(authenticatedUser.role).toLowerCase() });
        const perms = roleDoc?.permissions || [];
        isSalesman = perms.includes('salesman');
      } catch (permErr) {
        console.error('Salesman permission check failed:', permErr);
      }

      // Determine if check-in is today (local)
      const nowLocal = new Date();
      const startOfToday = new Date(nowLocal.getFullYear(), nowLocal.getMonth(), nowLocal.getDate(), 0, 0, 0, 0);
      const endOfToday = new Date(nowLocal.getFullYear(), nowLocal.getMonth(), nowLocal.getDate(), 23, 59, 59, 999);

      const isToday = reservationData.checkInDate >= startOfToday && reservationData.checkInDate <= endOfToday;

      if (isSalesman) {
        // If starts today, do NOT attribute to salesman; otherwise, attribute
        if (!isToday) {
          reservationData.user = authenticatedUser.id;
        }
      } else {
        reservationData.user = authenticatedUser.id;
      }
    }

    // Always generate a confirmation token for deep-link viewing (guest or authenticated)
    if (!reservationData.confirmationToken) {
      reservationData.confirmationToken = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    // Generate human-friendly reservation code
    reservationData.reservationCode = generateReservationCode();

    // Add type-specific fields
    if (type === 'room') {
      reservationData.roomType = roomType;
      reservationData.checkOutDate = checkOut;
      reservationData.totalNights = nights;
    } else if (type === 'event') {
      reservationData.eventType = eventType;
      reservationData.eventDescription = eventDescription;
      reservationData.expectedAttendees = expectedAttendees;
      reservationData.totalDays = days;
      if (checkOut) reservationData.checkOutDate = checkOut;
    } else if (type === 'daypass' || type === 'PasaTarde') {
      reservationData.totalDays = 1;
    }

    // Create reservation
    const reservation = await Reservation.create(reservationData);

    // Populate the reservation before sending response and email
    const populatedReservation = await Reservation.findById(reservation._id)
      .populate('user', 'firstName lastName email')
      .populate('room', 'name type price'); // room may be null

    // Send confirmation email (don't wait for it to complete)
    sendReservationConfirmationEmail(populatedReservation)
      .catch(err => console.error('Failed to send confirmation email:', err));

    res.status(201).json({
      success: true,
      message: 'Reservation created successfully. A confirmation email has been sent.',
      data: populatedReservation
    });
  } catch (error: any) {
    console.error('Create reservation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating reservation'
    });
  }
});

// @route   PUT /api/reservations/:id
// @desc    Update reservation
// @access  Private
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const reservation = await Reservation.findById(req.params.id);

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found'
      });
    }

    // Authorization: allow admin or roles with 'admin.reservations' permission to update any.
    // Otherwise, enforce ownership (user can only update their own reservations).
    let privileged = false;
    if (req.user) {
      if (req.user.role === 'admin') {
        privileged = true;
      } else {
        const roleDoc = await Role.findOne({ name: req.user.role.toLowerCase() });
        const perms = roleDoc?.permissions || [];
        privileged = perms.includes('admin.reservations');
      }

      if (!privileged) {
        // For guest reservations (no user), check email match
        if (!reservation.user) {
          if (reservation.contactInfo.email !== req.user.email) {
            return res.status(403).json({
              success: false,
              message: 'Access denied'
            });
          }
        } else if (reservation.user.toString() !== req.user.id) {
          return res.status(403).json({
            success: false,
            message: 'Access denied'
          });
        }
      }
    }

    // Only allow certain fields to be updated (admins may edit pricing and amount fields)
    const allowedUpdates = ['checkInDate', 'checkOutDate', 'guestDetails', 'specialRequests', 'services', 'contactInfo'];
    // Price updates only for admin or roles with admin.reservations.priceUpdate
    let canUpdatePrice = false;
    if (req.user) {
      if (req.user.role === 'admin') {
        canUpdatePrice = true;
      } else {
        const roleDoc = await Role.findOne({ name: req.user.role.toLowerCase() });
        const perms = roleDoc?.permissions || [];
        canUpdatePrice = perms.includes('admin.reservations.priceUpdate');
      }
    }
    if (canUpdatePrice) {
      allowedUpdates.push('adultPrice', 'childrenPrice');
    }

    // Total price updates only for admin or roles with admin.reservations.amountUpdate
    let canUpdateAmount = false;
    if (req.user) {
      if (req.user.role === 'admin') {
        canUpdateAmount = true;
      } else {
        const roleDoc = await Role.findOne({ name: req.user.role.toLowerCase() });
        const perms = roleDoc?.permissions || [];
        canUpdateAmount = perms.includes('admin.reservations.amountUpdate');
      }
    }
    if (canUpdateAmount) {
      allowedUpdates.push('totalPrice');
    }
    const updates = Object.keys(req.body);
    const isValidOperation = updates.every(update => allowedUpdates.includes(update));

    if (!isValidOperation) {
      return res.status(400).json({
        success: false,
        message: 'Invalid updates. Only checkInDate, checkOutDate, guestDetails, specialRequests, services, and contactInfo can be updated'
      });
    }

    // If reservation is already completed or cancelled, don't allow updates
    if (reservation.status === 'completed' || reservation.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update reservation that is already completed or cancelled'
      });
    }

    const { checkInDate, checkOutDate, guestDetails, specialRequests, services, contactInfo, adultPrice, childrenPrice, totalPrice: totalPriceUpdate } = req.body;

    // If dates are being updated, validate them
    if (checkInDate || checkOutDate) {
      // Parse local date strings (YYYY-MM-DD) to avoid timezone drift
      const parseLocalDate = (s: string | Date) => {
        if (s instanceof Date) return s;
        const str = String(s);
        const parts = str.split('-');
        if (parts.length === 3) {
          const y = Number(parts[0]);
          const m = Number(parts[1]);
          const d = Number(parts[2]);
          return new Date(y, m - 1, d, 0, 0, 0, 0);
        }
        return new Date(str);
      };

      const checkIn = checkInDate ? parseLocalDate(checkInDate) : new Date(reservation.checkInDate);
      const checkOut = checkOutDate
        ? parseLocalDate(checkOutDate)
        : (reservation.checkOutDate ? new Date(reservation.checkOutDate) : new Date(checkIn.getTime() + 24 * 60 * 60 * 1000));

      if (checkIn >= checkOut) {
        return res.status(400).json({
          success: false,
          message: 'Check-out date must be after check-in date'
        });
      }

      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      if (checkIn < startOfToday) {
        return res.status(400).json({
          success: false,
          message: 'Check-in date cannot be in the past'
        });
      }

      // Check for overlapping reservations (excluding current reservation)
      const overlappingReservation = await Reservation.findOne({
        _id: { $ne: reservation._id },
        room: reservation.room,
        status: { $in: ['confirmed'] },
        $or: [
          {
            checkInDate: { $lte: checkIn },
            checkOutDate: { $gt: checkIn }
          },
          {
            checkInDate: { $lt: checkOut },
            checkOutDate: { $gte: checkOut }
          },
          {
            checkInDate: { $gte: checkIn },
            checkOutDate: { $lte: checkOut }
          }
        ]
      });

      if (overlappingReservation) {
        return res.status(400).json({
          success: false,
          message: 'Room is not available for the selected dates'
        });
      }

      // Update dates and recalculate price
      reservation.checkInDate = checkIn;
      reservation.checkOutDate = checkOut;

      const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
      reservation.totalNights = nights;

      // Flag for recalculation based on new nights
      // Recalculation will use adult/children prices and services
      // handled below via needsRecalc
    }

    // Track whether a recalculation is needed
    let needsRecalc = false;
    // Recalc if dates changed
    if (checkInDate || checkOutDate) {
      needsRecalc = true;
    }

    // Update price fields if permitted and provided
    if (canUpdatePrice) {
      if (adultPrice !== undefined) {
        reservation.adultPrice = Number(adultPrice);
        needsRecalc = true;
      }
      if (childrenPrice !== undefined) {
        reservation.childrenPrice = Number(childrenPrice);
        needsRecalc = true;
      }
    } else {
      // If price fields were attempted without permission, reject
      if (('adultPrice' in req.body) || ('childrenPrice' in req.body)) {
        return res.status(403).json({ success: false, message: 'Access denied. Missing price update permission.' });
      }
    }

    // Update totalPrice if permitted and provided
    if (canUpdateAmount) {
      if (totalPriceUpdate !== undefined) {
        reservation.totalPrice = Number(totalPriceUpdate);
      }
    } else {
      if (("totalPrice" in req.body)) {
        return res.status(403).json({ success: false, message: 'Access denied. Missing amount update permission.' });
      }
    }

    // Update guest details if provided
    if (guestDetails !== undefined) {
      const totalGuests = guestDetails.adults + guestDetails.children + guestDetails.infants;
      reservation.guestDetails = guestDetails;
      reservation.guests = totalGuests;
      needsRecalc = true;
    }

    // Update other fields if provided
    if (specialRequests !== undefined) {
      reservation.specialRequests = specialRequests;
    }

    if (services !== undefined) {
      reservation.services = { ...reservation.services, ...services };
    }

    if (contactInfo !== undefined) {
      reservation.contactInfo = { ...reservation.contactInfo, ...contactInfo };
    }

    // If a manual override for totalPrice was provided and permitted, apply it and skip auto calc
    let manualTotalApplied = false;
    if (canUpdateAmount && totalPriceUpdate !== undefined) {
      reservation.totalPrice = Number(totalPriceUpdate);
      manualTotalApplied = true;
    }

    // Auto-recalculate totalPrice when appropriate
    if (!manualTotalApplied && needsRecalc) {
      try {
        let newTotal = reservation.totalPrice;
        const totalGuests = (reservation.guestDetails?.adults || 0) + (reservation.guestDetails?.children || 0) + (reservation.guestDetails?.infants || 0);
        if (reservation.type === 'room') {
          const checkIn = new Date(reservation.checkInDate);
          const checkOut = reservation.checkOutDate ? new Date(reservation.checkOutDate) : new Date(checkIn.getTime() + 24 * 60 * 60 * 1000);
          const nights = Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));
          const perNight = (reservation.guestDetails?.adults || 0) * (reservation.adultPrice || 0)
            + (reservation.guestDetails?.children || 0) * (reservation.childrenPrice || 0);
          newTotal = nights * perNight;
          // Add service costs similar to creation logic
          if (reservation.services?.breakfast) newTotal += 25 * nights * totalGuests;
          if (reservation.services?.airportTransfer) newTotal += 50;
          if (reservation.services?.spa) newTotal += 100 * (reservation.guestDetails?.adults || 0);
          if (reservation.services?.aquaPark) newTotal += 30 * ((reservation.guestDetails?.adults || 0) + (reservation.guestDetails?.children || 0));
        } else if (reservation.type === 'daypass') {
          newTotal = (reservation.guestDetails?.adults || 0) * (reservation.adultPrice || 0)
            + (reservation.guestDetails?.children || 0) * (reservation.childrenPrice || 0);
          // Include service extras (1 day)
          if (reservation.services?.airportTransfer) newTotal += 50;
          if (reservation.services?.spa) newTotal += 100 * (reservation.guestDetails?.adults || 0);
          if (reservation.services?.aquaPark) newTotal += 30 * ((reservation.guestDetails?.adults || 0) + (reservation.guestDetails?.children || 0));
          if (reservation.services?.breakfast) newTotal += 25 * 1 * totalGuests;
        }
        // For events, keep existing total unless manually overridden
        reservation.totalPrice = newTotal;
      } catch (calcErr) {
        console.error('Auto-recalc totalPrice failed:', calcErr);
      }
    }

    await reservation.save();

    // Populate the reservation before sending response
    const populatedReservation = await Reservation.findById(reservation._id)
      .populate('user', 'firstName lastName email')
      .populate('room', 'name type status');

    res.status(200).json({
      success: true,
      message: 'Reservation updated successfully',
      data: populatedReservation
    });
  } catch (error: any) {
    console.error('Update reservation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating reservation'
    });
  }
});

// @route   DELETE /api/reservations/:id
// @desc    Remove reservation (hard delete)
// @access  Private (Admin only)
router.delete('/:id', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Reservation not found' });
    }

    await Reservation.findByIdAndDelete(reservation._id);

    res.status(200).json({ success: true, message: 'Reservation removed successfully' });
  } catch (error: any) {
    console.error('Delete reservation error:', error);
    res.status(500).json({ success: false, message: 'Server error while removing reservation' });
  }
});

// @route   PATCH /api/reservations/:id/status
// @desc    Update reservation status (Admin only)
// @access  Private (Admin)
router.patch('/:id/status', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;

    const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Valid statuses are: ${validStatuses.join(', ')}`
      });
    }

    const reservation = await Reservation.findById(req.params.id);

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found'
      });
    }

    reservation.status = status;
    await reservation.save();

    // Populate the reservation before sending response
    const populatedReservation = await Reservation.findById(reservation._id)
      .populate('user', 'firstName lastName email')
      .populate('room', 'name type price');

    res.status(200).json({
      success: true,
      message: 'Reservation status updated successfully',
      data: populatedReservation
    });
  } catch (error: any) {
    console.error('Update reservation status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating reservation status'
    });
  }
});

// @route   PUT /api/reservations/:id/assign-room
// @desc    Assign room to reservation (Admin only)
// @access  Private/Admin
router.put('/:id/assign-room', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { roomId } = req.body;
    const reservationId = req.params.id;

    // Find the reservation
    const reservation = await Reservation.findById(reservationId);
    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found'
      });
    }

    // If roomId is null/empty, clear existing assignment
    if (!roomId) {
      const previousRoomId = reservation.room as any;
      reservation.room = undefined as any;
      reservation.assignedBy = undefined as any;
      reservation.assignedAt = undefined as any;
      // Do not change totalPrice or status here; admin may update separately
      await reservation.save();

      // If there was a previously assigned room, mark it available
      if (previousRoomId) {
        const prevRoom = await Room.findById(previousRoomId);
        if (prevRoom) {
          prevRoom.status = 'available';
          await prevRoom.save();
        }
      }

      const populatedReservation = await Reservation.findById(reservation._id)
        .populate('user', 'firstName lastName email')
        .populate('room', 'name type status')
        .populate('assignedBy', 'firstName lastName email');

      return res.status(200).json({
        success: true,
        message: 'Room assignment cleared successfully',
        data: populatedReservation
      });
    }

    // At this point, roomId is provided and we are assigning/reassigning

    // Check if room exists and is available
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    if (room.status !== 'available') {
      return res.status(400).json({
        success: false,
        message: 'Room is not available'
      });
    }

    // Check if room type matches reservation preference
    if (reservation.roomType && room.type !== reservation.roomType) {
      return res.status(400).json({
        success: false,
        message: `Room type mismatch. Customer requIested ${reservation.roomType} but selected room is ${room.type}`
      });
    }

    // Check room capacity
    // Capacity logic removed

    // Check for overlapping reservations on this specific room
    const overlappingReservation = await Reservation.findOne({
      _id: { $ne: reservationId },
      room: roomId,
      status: { $in: ['confirmed'] },
      $or: [
        {
          checkInDate: { $lte: reservation.checkInDate },
          checkOutDate: { $gt: reservation.checkInDate }
        },
        {
          checkInDate: { $lt: reservation.checkOutDate },
          checkOutDate: { $gte: reservation.checkOutDate }
        },
        {
          checkInDate: { $gte: reservation.checkInDate },
          checkOutDate: { $lte: reservation.checkOutDate }
        }
      ]
    });

    if (overlappingReservation) {
      return res.status(400).json({
        success: false,
        message: 'Room is not available for the selected dates'
      });
    }

    // Track previous room to free if reassigning
    const previousRoomId = reservation.room as any;

    // Update reservation with room assignment
    reservation.room = roomId as any;
    reservation.assignedBy = req.user!.id as any;
    reservation.assignedAt = new Date();

    // Update total price based on actual room price
    const nights = reservation.totalNights || 1;
    // Recalculate total using adult/children pricing and services
    const perNight = (reservation.guestDetails?.adults || 0) * (reservation.adultPrice || 0)
      + (reservation.guestDetails?.children || 0) * (reservation.childrenPrice || 0);
    let newTotalPrice = nights * perNight;
    const totalGuests = reservation.guests || ((reservation.guestDetails?.adults || 0) + (reservation.guestDetails?.children || 0) + (reservation.guestDetails?.infants || 0));
    if (reservation.services?.breakfast) newTotalPrice += 25 * nights * totalGuests;
    if (reservation.services?.airportTransfer) newTotalPrice += 50;
    if (reservation.services?.spa) newTotalPrice += 100 * (reservation.guestDetails?.adults || 0);
    if (reservation.services?.aquaPark) newTotalPrice += 30 * ((reservation.guestDetails?.adults || 0) + (reservation.guestDetails?.children || 0));
    reservation.totalPrice = newTotalPrice;
    reservation.status = 'confirmed'; // Automatically confirm when room is assigned

    await reservation.save();

    // Update room ops: mark selected room as booked/unavailable
    room.status = 'booked';
    await room.save();

    // If there was a previously assigned room different from selected, free it
    if (previousRoomId && previousRoomId.toString() !== roomId.toString()) {
      const prevRoom = await Room.findById(previousRoomId);
      if (prevRoom) {
        prevRoom.status = 'available';
        await prevRoom.save();
      }
    }

    // Populate the updated reservation
    const populatedReservation = await Reservation.findById(reservation._id)
      .populate('user', 'firstName lastName email')
      .populate('room', 'name type status')
      .populate('assignedBy', 'firstName lastName email');

    res.status(200).json({
      success: true,
      message: 'Room assigned successfully',
      data: populatedReservation
    });
  } catch (error: any) {
    console.error('Assign room error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while assigning room'
    });
  }
});

// @route   GET /api/reservations/public/:confirmationToken
// @desc    Get reservation by confirmation token (public access for guests)
// @access  Public
router.get('/public/:confirmationToken', async (req: Request, res: Response) => {
  try {
    const { confirmationToken } = req.params;

    const reservation = await Reservation.findOne({ confirmationToken })
      .populate('user', 'firstName lastName email')
      .populate('room', 'name type status amenities');

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found'
      });
    }

    res.status(200).json({
      success: true,
      data: reservation
    });
  } catch (error: any) {
    console.error('Get public reservation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while retrieving reservation'
    });
  }
});

// @route   GET /api/reservations/public/code/:reservationCode
// @desc    Get reservation by reservation code (public access for guests)
// @access  Public
router.get('/public/code/:reservationCode', async (req: Request, res: Response) => {
  try {
    const { reservationCode } = req.params;

    const reservation = await Reservation.findOne({ reservationCode })
      .populate('user', 'firstName lastName email')
      .populate('room', 'name type status amenities');

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found'
      });
    }

    res.status(200).json({
      success: true,
      data: reservation
    });
  } catch (error: any) {
    console.error('Get public reservation by code error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while retrieving reservation'
    });
  }
});

// @route   PUT /api/reservations/public/:confirmationToken/cancel
// @desc    Cancel reservation by confirmation token (public access for guests)
// @access  Public
router.put('/public/:confirmationToken/cancel', async (req: Request, res: Response) => {
  try {
    const { confirmationToken } = req.params;
    const { cancellationReason } = req.body;

    const reservation = await Reservation.findOne({ confirmationToken });

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found'
      });
    }

    // Check if already cancelled
    if (reservation.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Reservation is already cancelled'
      });
    }

    // Check if reservation can be cancelled (24 hours before check-in)
    const now = new Date();
    const checkInDate = new Date(reservation.checkInDate);
    const hoursDifference = (checkInDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursDifference < 24) {
      return res.status(400).json({
        success: false,
        message: 'Reservations must be cancelled at least 24 hours in advance'
      });
    }

    // Update reservation status
    reservation.status = 'cancelled';
    reservation.cancellationReason = cancellationReason || 'Cancelled by guest';
    await reservation.save();

    const populatedReservation = await Reservation.findById(reservation._id)
      .populate('user', 'firstName lastName email')
      .populate('room', 'name type price');

    res.status(200).json({
      success: true,
      message: 'Reservation cancelled successfully',
      data: populatedReservation
    });
  } catch (error: any) {
    console.error('Cancel public reservation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while cancelling reservation'
    });
  }
});

// @route   PUT /api/reservations/public/code/:reservationCode/cancel
// @desc    Cancel reservation by reservation code (public access for guests)
// @access  Public
router.put('/public/code/:reservationCode/cancel', async (req: Request, res: Response) => {
  try {
    const { reservationCode } = req.params;
    const { cancellationReason } = req.body;

    const reservation = await Reservation.findOne({ reservationCode });

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found'
      });
    }

    // Check if already cancelled
    if (reservation.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Reservation is already cancelled'
      });
    }

    // Check if reservation can be cancelled (24 hours before check-in)
    const now = new Date();
    const checkInDate = new Date(reservation.checkInDate);
    const hoursDifference = (checkInDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursDifference < 24) {
      return res.status(400).json({
        success: false,
        message: 'Reservations must be cancelled at least 24 hours in advance'
      });
    }

    // Update reservation status
    reservation.status = 'cancelled';
    reservation.cancellationReason = cancellationReason || 'Cancelled by guest';
    await reservation.save();

    const populatedReservation = await Reservation.findById(reservation._id)
      .populate('user', 'firstName lastName email')
      .populate('room', 'name type price');

    res.status(200).json({
      success: true,
      message: 'Reservation cancelled successfully',
      data: populatedReservation
    });
  } catch (error: any) {
    console.error('Cancel public reservation by code error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while cancelling reservation'
    });
  }
});

// Utility: Generate reservation code (B + YY + 4 alphanumeric uppercase)
const generateReservationCode = (): string => {
  const prefix = 'B';
  const year = '25'; // Fixed per requirement; adjust annually if needed
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let rand = '';
  for (let i = 0; i < 4; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}${year}${rand}`;
};

// Operational actions: Check-In / Check-Out
// @route   PATCH /api/reservations/:id/check-in
// @desc    Perform check-in for a room reservation; requires identification document; marks room as occupied
// @access  Private (Admin, Staff, Maintenance)
router.patch('/:id/check-in', authenticate, authorize('admin', 'staff', 'maintenance'), async (req: AuthRequest, res: Response) => {
  try {
    const { identificationDocument, checkInAt } = req.body as { identificationDocument?: string; checkInAt?: string | Date };

    if (!identificationDocument || !String(identificationDocument).trim()) {
      return res.status(400).json({ success: false, message: 'Identification document is required for check-in' });
    }

    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Reservation not found' });
    }

    if (reservation.type !== 'room') {
      return res.status(400).json({ success: false, message: 'Check-in is only applicable to room reservations' });
    }

    if (!reservation.room) {
      return res.status(400).json({ success: false, message: 'Reservation has no room assigned' });
    }

    // Record operational fields
    const when = checkInAt ? new Date(checkInAt) : new Date();
    reservation.actualCheckInAt = when;
    reservation.identificationDocument = String(identificationDocument).trim();

    // Update room status to occupied
    const room = await Room.findById(reservation.room);
    if (!room) {
      return res.status(404).json({ success: false, message: 'Assigned room not found' });
    }
    room.status = 'occupied';
    await room.save();

    await reservation.save();

    const populatedReservation = await Reservation.findById(reservation._id)
      .populate('user', 'firstName lastName email')
      .populate('room', 'name type status');

    res.status(200).json({ success: true, message: 'Check-in completed', data: populatedReservation });
  } catch (error: any) {
    console.error('Check-in error:', error);
    res.status(500).json({ success: false, message: 'Server error during check-in' });
  }
});

// @route   PATCH /api/reservations/:id/check-out
// @desc    Perform check-out for a room reservation; marks room as available & pending clean up; sets reservation completed
// @access  Private (Admin, Staff, Maintenance)
router.patch('/:id/check-out', authenticate, authorize('admin', 'staff', 'maintenance'), async (req: AuthRequest, res: Response) => {
  try {
    const { checkOutAt } = req.body as { checkOutAt?: string | Date };

    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Reservation not found' });
    }

    if (reservation.type !== 'room') {
      return res.status(400).json({ success: false, message: 'Check-out is only applicable to room reservations' });
    }

    if (!reservation.room) {
      return res.status(400).json({ success: false, message: 'Reservation has no room assigned' });
    }

    // Record operational fields
    const when = checkOutAt ? new Date(checkOutAt) : new Date();
    reservation.actualCheckOutAt = when;
    // Mark reservation as completed
    reservation.status = 'completed';

    // Update room status and condition
    const room = await Room.findById(reservation.room);
    if (!room) {
      return res.status(404).json({ success: false, message: 'Assigned room not found' });
    }
    room.status = 'available';
    room.condition = 'pending_cleanup';
    await room.save();

    await reservation.save();

    const populatedReservation = await Reservation.findById(reservation._id)
      .populate('user', 'firstName lastName email')
      .populate('room', 'name type status condition');

    res.status(200).json({ success: true, message: 'Check-out completed', data: populatedReservation });
  } catch (error: any) {
    console.error('Check-out error:', error);
    res.status(500).json({ success: false, message: 'Server error during check-out' });
  }
});

export default router;

// Payments: Add payment to reservation (Admin only)
// @route   POST /api/reservations/:id/payments
// @desc    Record a payment against a reservation and update totals
// @access  Private (Admin)
router.post('/:id/payments', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { amount, method, note } = req.body as { amount?: number; method?: 'card' | 'cash' | 'transfer'; note?: string };

    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Reservation not found' });
    }

    if (reservation.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Cannot add payment to a cancelled reservation' });
    }

    const amt = Number(amount);
    if (!amt || isNaN(amt) || amt <= 0) {
      return res.status(400).json({ success: false, message: 'Payment amount must be a positive number' });
    }

    const allowedMethods = ['card', 'cash', 'transfer'];
    if (!method || !allowedMethods.includes(String(method))) {
      return res.status(400).json({ success: false, message: 'Payment method is required and must be one of card, cash, or transfer' });
    }

    // Calculate current sum of payments and pending balance
    const currentSum = (reservation.payments || []).reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
    const pending = Math.max(0, reservation.totalPrice - currentSum);
    if (amt > pending) {
      return res.status(400).json({ success: false, message: `Amount exceeds pending balance (${pending})` });
    }

    // Append payment record
    reservation.payments = reservation.payments || [];
    reservation.payments.push({ amount: amt, method, note: note || undefined, createdBy: req.user?.id as any, createdAt: new Date() });

    // Update totals by recalculating from records
    reservation.totalPayments = currentSum + amt;
    // Update payment status when fully paid
    reservation.paymentStatus = reservation.totalPayments >= reservation.totalPrice ? 'paid' : 'pending';

    // Optionally record latest payment method (simple tracking)
    if (method) {
      reservation.paymentMethod = method;
    }

    // Persist
    await reservation.save();

    const populated = await Reservation.findById(reservation._id)
      .populate('user', 'firstName lastName email')
      .populate('room', 'name type status');

    res.status(200).json({ success: true, message: 'Payment recorded successfully', data: populated });
  } catch (error: any) {
    console.error('Add payment error:', error);
    res.status(500).json({ success: false, message: 'Server error while recording payment' });
  }
});

// @route   PATCH /api/reservations/:id/payments/:paymentId
// @desc    Edit a payment record and update totals
// @access  Private (Admin)
router.patch('/:id/payments/:paymentId', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { amount, method, note } = req.body as { amount?: number; method?: 'card' | 'cash' | 'transfer'; note?: string };
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) return res.status(404).json({ success: false, message: 'Reservation not found' });

    const payment = (reservation.payments || []).find((p: any) => String(p._id) === String(req.params.paymentId));
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });

    if (reservation.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Cannot edit payment on a cancelled reservation' });
    }

    const allowedMethods = ['card', 'cash', 'transfer'];
    if (method && !allowedMethods.includes(String(method))) {
      return res.status(400).json({ success: false, message: 'Invalid payment method' });
    }

    // Validate amount and ensure totals are recalculated from records
    let newAmount = payment.amount;
    const currentSum = (reservation.payments || []).reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
    if (amount !== undefined) {
      const amt = Number(amount);
      if (!amt || isNaN(amt) || amt <= 0) {
        return res.status(400).json({ success: false, message: 'Payment amount must be a positive number' });
      }
      // Compute future sum after applying the change
      const futureSum = currentSum - (Number(payment.amount) || 0) + amt;
      if (futureSum > reservation.totalPrice) {
        const pending = Math.max(0, reservation.totalPrice - currentSum);
        return res.status(400).json({ success: false, message: `Amount change exceeds pending balance (${pending})` });
      }
      newAmount = amt;
      // Defer totalPayments update until after fields are set using recalculation
    }

    // Update payment fields
    payment.amount = newAmount;
    if (method) payment.method = method;
    if (note !== undefined) payment.note = note || undefined;

    // Recalculate totals from records and update payment status
    const newSum = (reservation.payments || []).reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
    reservation.totalPayments = newSum;
    reservation.paymentStatus = reservation.totalPayments >= reservation.totalPrice ? 'paid' : 'pending';

    await reservation.save();

    const populated = await Reservation.findById(reservation._id)
      .populate('user', 'firstName lastName email')
      .populate('room', 'name type status');
    res.status(200).json({ success: true, message: 'Payment updated successfully', data: populated });
  } catch (error: any) {
    console.error('Edit payment error:', error);
    res.status(500).json({ success: false, message: 'Server error while updating payment' });
  }
});

// @route   DELETE /api/reservations/:id/payments/:paymentId
// @desc    Delete a payment record and update totals
// @access  Private (Admin)
router.delete('/:id/payments/:paymentId', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) return res.status(404).json({ success: false, message: 'Reservation not found' });

    const idx = (reservation.payments || []).findIndex((p: any) => String(p._id) === String(req.params.paymentId));
    if (idx === -1) return res.status(404).json({ success: false, message: 'Payment not found' });

    // Remove payment and update totals by recalculating from records
    reservation.payments!.splice(idx, 1);
    const newSum = (reservation.payments || []).reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
    reservation.totalPayments = newSum;
    reservation.paymentStatus = reservation.totalPayments >= reservation.totalPrice ? 'paid' : 'pending';

    await reservation.save();

    const populated = await Reservation.findById(reservation._id)
      .populate('user', 'firstName lastName email')
      .populate('room', 'name type status');
    res.status(200).json({ success: true, message: 'Payment deleted successfully', data: populated });
  } catch (error: any) {
    console.error('Delete payment error:', error);
    res.status(500).json({ success: false, message: 'Server error while deleting payment' });
  }
});
